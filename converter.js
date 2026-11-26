const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let sharp = null;
let mammoth = null;
let marked = null;
try { sharp = require('sharp'); } catch (e) {}
try { mammoth = require('mammoth'); } catch (e) {}
try { ({ marked } = require('marked')); } catch (e) {}

const MIME_MAP = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    bmp: 'image/bmp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    tga: 'image/x-tga',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text',
    rtf: 'application/rtf',
    txt: 'text/plain; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    html: 'text/html; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    json: 'application/json; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    srt: 'text/plain; charset=utf-8',
    vtt: 'text/vtt; charset=utf-8',
    zip: 'application/zip'
};

let resolvedConverterPython = null;
function resolveConverterPython() {
    if (resolvedConverterPython) return resolvedConverterPython;
    const { execFileSync } = require('child_process');
    const venvCandidates = process.platform === 'win32'
        ? [
            path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
            path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
            'python', 'py', 'python3'
        ]
        : [
            path.join(__dirname, '.venv', 'bin', 'python'),
            path.join(__dirname, '.venv', 'bin', 'python3'),
            path.join(__dirname, 'venv', 'bin', 'python'),
            'python3', 'python'
        ];
    for (const cmd of venvCandidates) {
        if ((cmd.includes('/') || cmd.includes('\\')) && !fs.existsSync(cmd)) continue;
        try {
            execFileSync(cmd, ['-c', 'import pymupdf, PIL'], {
                stdio: 'ignore',
                timeout: 4000,
                windowsHide: true
            });
            resolvedConverterPython = cmd;
            return cmd;
        } catch (e) {}
    }
    const existingVenv = venvCandidates.find(c => (c.includes('/') || c.includes('\\')) && fs.existsSync(c));
    resolvedConverterPython = existingVenv || (process.platform === 'win32' ? 'python' : 'python3');
    return resolvedConverterPython;
}

function runPythonConverter(payload) {
    return new Promise((resolve, reject) => {
        const pyCmd = resolveConverterPython();
        const scriptPath = path.join(__dirname, 'converter_engine.py');
        const child = spawn(pyCmd, [scriptPath], { windowsHide: true });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.on('error', err => reject(err));
        child.on('close', code => {
            try {
                const lines = stdout.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const jsonLine = [...lines].reverse().find(l => l.startsWith('{') && l.endsWith('}')) || '{}';
                const parsed = JSON.parse(jsonLine);
                if (code !== 0 || !parsed.success) {
                    return reject(new Error(parsed.error || stderr || `Python converter exited with code ${code}`));
                }
                resolve(parsed);
            } catch (e) {
                reject(new Error(stderr || `Converter parse error: ${stdout}`));
            }
        });
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
    });
}

function sanitizeBaseName(originalName) {
    const rawBase = path.basename(originalName || 'CapZone_File', path.extname(originalName || ''));
    const cleaned = rawBase
        .replace(/_?CapZone$/i, '')
        .replace(/[^\w\s\u0D80-\u0DFF.-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 65);
    return cleaned || 'Document';
}

async function convertFiles({ files, targetFormat, quality = 90, dpi = 150, uploadDir }) {
    if (!files || !files.length) {
        throw new Error('Please upload at least one file to convert.');
    }
    let fmt = String(targetFormat || '').toLowerCase().replace(/^\./, '').trim();
    if (fmt === 'jpeg') fmt = 'jpg';
    if (fmt === 'tif') fmt = 'tiff';
    if (fmt === 'markdown') fmt = 'md';
    if (!fmt) throw new Error('Target format is required.');

    const firstFile = files[0];
    const srcExt = path.extname(firstFile.originalname || firstFile.path).toLowerCase().replace(/^\./, '');
    const cleanBase = sanitizeBaseName(firstFile.originalname);
    const totalInputSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    const ts = Date.now();
    const outDiskName = `conv_${ts}_${cleanBase}_www.capzone.top.${fmt}`;
    const outPath = path.join(uploadDir, outDiskName);
    const previewDiskName = `conv_prev_${ts}.png`;
    const previewPath = path.join(uploadDir, previewDiskName);

    const sharpInputs = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'tif', 'gif', 'svg']);
    const sharpOutputs = new Set(['png', 'jpg', 'webp', 'avif', 'tiff', 'gif']);

    // Fast path 1: Node sharp for single standard/SVG image -> raster image (fallback cleanly to Python Pillow on codec/edge failure)
    if (sharp && files.length === 1 && sharpInputs.has(srcExt) && sharpOutputs.has(fmt)) {
        try {
            const inputOpt = srcExt === 'svg' ? { density: Math.max(72, Math.min(300, Number(dpi) || 150)) } : {};
            let pipeline = sharp(firstFile.path, inputOpt).rotate();
            const q = Math.max(10, Math.min(100, Number(quality) || 90));
            if (fmt === 'jpg') {
                pipeline = pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: q, mozjpeg: true });
            } else if (fmt === 'png') {
                pipeline = pipeline.png({ compressionLevel: 9 });
            } else if (fmt === 'webp') {
                pipeline = pipeline.webp({ quality: q });
            } else if (fmt === 'avif') {
                pipeline = pipeline.avif({ quality: Math.max(20, Math.min(90, q)) });
            } else if (fmt === 'tiff') {
                pipeline = pipeline.tiff({ quality: q });
            } else if (fmt === 'gif') {
                pipeline = pipeline.gif();
            }
            const info = await pipeline.toFile(outPath);
            const stat = fs.statSync(outPath);
            return {
                success: true,
                downloadUrl: `/uploads/${outDiskName}`,
                previewUrl: `/uploads/${outDiskName}`,
                downloadFileName: `${cleanBase}_www.capzone.top.${fmt}`,
                mimeType: MIME_MAP[fmt] || 'application/octet-stream',
                fileSize: stat.size,
                inputSize: totalInputSize,
                isImage: true,
                isPdf: false,
                isZip: false,
                meta: { width: info.width, height: info.height, engine: 'sharp' }
            };
        } catch (sharpErr) {
            try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (e) {}
            console.warn('[Universal Converter] sharp fallback to Python:', sharpErr.message);
        }
    }

    // Fast path 2: Mammoth for DOCX -> clean HTML/MD (using CSS layout)
    if (mammoth && files.length === 1 && srcExt === 'docx' && (fmt === 'html' || fmt === 'md')) {
        if (fmt === 'html') {
            const result = await mammoth.convertToHtml({ path: firstFile.path });
            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cleanBase}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:860px;margin:2.5rem auto;padding:0 1.25rem;line-height:1.65;color:#1e293b;}table{border-collapse:collapse;width:100%;margin:1rem 0;}th,td{border:1px solid #cbd5e1;padding:8px 10px;}th{background:#f1f5f9;}img{max-width:100%;height:auto;border-radius:8px;}</style></head><body>${result.value}</body></html>`;
            fs.writeFileSync(outPath, fullHtml, 'utf8');
        } else {
            const result = await mammoth.convertToMarkdown({ path: firstFile.path });
            fs.writeFileSync(outPath, result.value, 'utf8');
        }
        const stat = fs.statSync(outPath);
        return {
            success: true,
            downloadUrl: `/uploads/${outDiskName}`,
            previewUrl: fmt === 'html' ? `/uploads/${outDiskName}` : null,
            downloadFileName: `${cleanBase}_www.capzone.top.${fmt}`,
            mimeType: MIME_MAP[fmt],
            fileSize: stat.size,
            inputSize: totalInputSize,
            isImage: false,
            isPdf: false,
            isZip: false,
            meta: { engine: 'mammoth' }
        };
    }

    // Fast path 3: Marked for MD -> HTML
    if (marked && files.length === 1 && (srcExt === 'md' || srcExt === 'markdown') && fmt === 'html') {
        const mdStr = fs.readFileSync(firstFile.path, 'utf8');
        const rendered = marked.parse(mdStr);
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cleanBase}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:860px;margin:2.5rem auto;padding:0 1.25rem;line-height:1.65;color:#1e293b;}pre,code{background:#f1f5f9;padding:2px 6px;border-radius:5px;}pre{padding:12px;overflow:auto;}table{border-collapse:collapse;width:100%;margin:1rem 0;}th,td{border:1px solid #cbd5e1;padding:8px 10px;}th{background:#f1f5f9;}</style></head><body>${rendered}</body></html>`;
        fs.writeFileSync(outPath, fullHtml, 'utf8');
        const stat = fs.statSync(outPath);
        return {
            success: true,
            downloadUrl: `/uploads/${outDiskName}`,
            previewUrl: `/uploads/${outDiskName}`,
            downloadFileName: `${cleanBase}_www.capzone.top.${fmt}`,
            mimeType: MIME_MAP[fmt],
            fileSize: stat.size,
            inputSize: totalInputSize,
            isImage: false,
            isPdf: false,
            isZip: false,
            meta: { engine: 'marked' }
        };
    }

    // Check if PDF/Office/PPTX -> raster image might produce multi-page ZIP
    const isMultiPageCandidate = ['pdf', 'pptx', 'docx', 'odt', 'rtf', 'xlsx', 'csv', 'json', 'xml', 'html', 'htm', 'md', 'markdown', 'txt'].includes(srcExt) && ['png', 'jpg', 'webp', 'avif', 'tiff', 'bmp', 'gif', 'ico', 'tga', 'svg'].includes(fmt);

    const pyResult = await runPythonConverter({
        inputPaths: files.map(f => f.path),
        targetFormat: fmt,
        outputPath: outPath,
        previewPath: isMultiPageCandidate ? previewPath : null,
        quality: Number(quality) || 90,
        dpi: Number(dpi) || 150
    });

    const isZip = !!(pyResult.meta && pyResult.meta.isZip);
    let finalDiskName = outDiskName;
    let finalPath = outPath;
    let finalDownloadName = `${cleanBase}_www.capzone.top.${fmt}`;
    let finalFmt = fmt;

    if (isZip) {
        finalFmt = 'zip';
        const zipDiskName = `conv_${ts}_${cleanBase}_Pages_www.capzone.top.zip`;
        const zipPath = path.join(uploadDir, zipDiskName);
        fs.renameSync(outPath, zipPath);
        finalDiskName = zipDiskName;
        finalPath = zipPath;
        finalDownloadName = `${cleanBase}_Pages_www.capzone.top.zip`;
    }

    const stat = fs.statSync(finalPath);
    const hasPreviewImg = isZip && fs.existsSync(previewPath);
    const isImgOut = !isZip && ['png', 'jpg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(finalFmt);

    return {
        success: true,
        downloadUrl: `/uploads/${finalDiskName}`,
        previewUrl: hasPreviewImg
            ? `/uploads/${previewDiskName}`
            : (isImgOut || finalFmt === 'pdf' || finalFmt === 'html' ? `/uploads/${finalDiskName}` : null),
        downloadFileName: finalDownloadName,
        mimeType: MIME_MAP[finalFmt] || 'application/octet-stream',
        fileSize: stat.size,
        inputSize: totalInputSize,
        isImage: isImgOut,
        isPdf: finalFmt === 'pdf',
        isZip,
        meta: pyResult.meta || {}
    };
}

module.exports = { convertFiles, MIME_MAP };
