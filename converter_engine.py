#!/usr/bin/env python3
"""CapZone Universal Image & Document Conversion Engine.

Handles raster/vector image conversions, multi-image to PDF, PDF to DOCX/images/text,
Office documents (DOCX/XLSX/PPTX/ODT/RTF), structured data (CSV/JSON/XML),
HTML/Markdown/TXT/SRT/VTT conversions, and multi-page ZIP packaging.
"""

import csv
import html as html_lib
import io
import json
import os
import re
import sys
import zipfile
from xml.sax.saxutils import escape as xml_escape

import pymupdf
from PIL import Image, ImageOps

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass


def _find_unicode_font_rule():
    candidates = [
        ("CapZoneSinhala", "C:/Windows/Fonts", "iskpota.ttf"),
        ("CapZoneSinhala", "C:/Windows/Fonts", "Nirmala.ttf"),
        ("CapZoneSans", "C:/Windows/Fonts", "segoeui.ttf"),
        ("CapZoneSans", "C:/Windows/Fonts", "arial.ttf"),
        ("CapZoneSinhala", "/usr/share/fonts/truetype/noto", "NotoSansSinhala-Regular.ttf"),
        ("CapZoneSinhala", "/usr/share/fonts/truetype/sinhala", "lklug.ttf"),
        ("CapZoneSans", "/usr/share/fonts/truetype/dejavu", "DejaVuSans.ttf"),
    ]
    css = []
    families = []
    dirs = []
    for fam, fdir, fname in candidates:
        fpath = os.path.join(fdir, fname)
        if os.path.exists(fpath):
            css.append(f"@font-face {{ font-family: '{fam}'; src: url('{fname}'); }}")
            if fam not in families:
                families.append(f"'{fam}'")
            if fdir not in dirs:
                dirs.append(fdir)
    if not families:
        families = ["sans-serif"]
    else:
        families.append("sans-serif")
    archive = pymupdf.Archive(dirs[0]) if dirs else None
    if archive and len(dirs) > 1:
        for d in dirs[1:]:
            try:
                archive.add(d)
            except Exception:
                pass
    return "\n".join(css), ", ".join(families), archive


def _html_to_pdf_pymupdf(html_content: str, output_pdf: str, landscape: bool = False):
    font_css, font_family, archive = _find_unicode_font_rule()
    styled_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{font_css}
body {{
    font-family: {font_family};
    font-size: 11pt;
    line-height: 1.5;
    color: #1e293b;
    margin: 0;
    padding: 0;
}}
h1 {{ font-size: 20pt; color: #0f172a; margin: 0 0 10pt 0; border-bottom: 1.5pt solid #cbd5e1; padding-bottom: 4pt; }}
h2 {{ font-size: 15pt; color: #1e293b; margin: 14pt 0 6pt 0; }}
h3 {{ font-size: 12.5pt; color: #334155; margin: 10pt 0 4pt 0; }}
p {{ margin: 0 0 8pt 0; }}
pre, code {{ font-family: monospace; background: #f1f5f9; padding: 4pt 6pt; border-radius: 4pt; font-size: 9.5pt; white-space: pre-wrap; }}
table {{ border-collapse: collapse; width: 100%; margin: 8pt 0 12pt 0; font-size: 9.5pt; }}
th, td {{ border: 0.75pt solid #cbd5e1; padding: 5pt 7pt; text-align: left; vertical-align: top; }}
th {{ background-color: #f1f5f9; font-weight: bold; color: #0f172a; }}
ul, ol {{ margin: 4pt 0 8pt 16pt; }}
li {{ margin: 2pt 0; }}
.slide-card {{
    border: 1pt solid #cbd5e1;
    border-radius: 6pt;
    padding: 18pt;
    margin-bottom: 16pt;
    background: #ffffff;
    page-break-after: always;
}}
.slide-badge {{
    font-size: 8.5pt;
    color: #6366f1;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 6pt;
}}
</style>
</head>
<body>
{html_content}
</body>
</html>"""

    mediabox = pymupdf.paper_rect("a4-l") if landscape else pymupdf.paper_rect("a4")
    where = mediabox + (36, 36, -36, -36)
    story = pymupdf.Story(html=styled_html, archive=archive) if archive else pymupdf.Story(html=styled_html)
    writer = pymupdf.DocumentWriter(output_pdf)
    more = True
    page_count = 0
    while more and page_count < 2000:
        dev = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(dev, None)
        writer.end_page()
        page_count += 1
    writer.close()
    return page_count


def _extract_images_to_pdf(input_paths, output_pdf):
    """Convert one or multiple images (including HEIC, WEBP, PNG, JPG, SVG, etc.) to a crisp multi-page PDF."""
    doc = pymupdf.open()
    for p in input_paths:
        ext = os.path.splitext(p)[1].lower()
        if ext == ".svg":
            svg_doc = pymupdf.open(p)
            page_pdf = svg_doc.convert_to_pdf()
            img_doc = pymupdf.open("pdf", page_pdf)
            doc.insert_pdf(img_doc)
            img_doc.close()
            svg_doc.close()
            continue

        with Image.open(p) as im:
            im = ImageOps.exif_transpose(im)
            if im.mode in ("RGBA", "LA", "P"):
                bg = Image.new("RGB", im.size, (255, 255, 255))
                if im.mode == "P":
                    im = im.convert("RGBA")
                bg.paste(im, mask=im.split()[-1] if im.mode in ("RGBA", "LA") else None)
                im = bg
            elif im.mode != "RGB":
                im = im.convert("RGB")

            buf = io.BytesIO()
            im.save(buf, format="PNG")
            w, h = im.size
            # Scale large pixels nicely while preserving aspect ratio (72pt per inch ~ max width 842pt if huge)
            rect = pymupdf.Rect(0, 0, w, h)
            page = doc.new_page(width=w, height=h)
            page.insert_image(rect, stream=buf.getvalue())

    doc.save(output_pdf, garbage=3, deflate=True)
    pages = len(doc)
    doc.close()
    return {"pages": pages}


def _convert_image_pil(input_paths, output_path, target_fmt, quality=90, dpi=150):
    target_fmt = target_fmt.lower()
    src = input_paths[0]
    src_ext = os.path.splitext(src)[1].lower()

    if target_fmt == "pdf":
        return _extract_images_to_pdf(input_paths, output_path)

    # SVG -> raster using PyMuPDF if Node sharp didn't handle it
    if src_ext == ".svg" and target_fmt in ("png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "gif", "ico", "tga"):
        svg_doc = pymupdf.open(src)
        page = svg_doc[0]
        pix = page.get_pixmap(dpi=dpi, alpha=(target_fmt in ("png", "webp", "ico", "tiff", "tif", "gif")))
        im = Image.frombytes("RGBA" if pix.alpha else "RGB", [pix.width, pix.height], pix.samples)
        svg_doc.close()
    else:
        im = Image.open(src)
        im = ImageOps.exif_transpose(im)

    if target_fmt == "svg":
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        import base64
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        w, h = im.size
        svg = (
            f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n'
            f'  <image width="{w}" height="{h}" href="data:image/png;base64,{b64}" />\n'
            f'</svg>\n'
        )
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(svg)
        return {"width": w, "height": h}

    w, h = im.size
    if target_fmt in ("jpg", "jpeg", "bmp"):
        if im.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", im.size, (255, 255, 255))
            if im.mode == "P":
                im = im.convert("RGBA")
            bg.paste(im, mask=im.split()[-1] if im.mode in ("RGBA", "LA") else None)
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")
    elif target_fmt == "ico":
        if im.mode != "RGBA":
            im = im.convert("RGBA")
        sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
        im.save(output_path, format="ICO", sizes=sizes)
        return {"width": w, "height": h}

    pil_map = {
        "png": "PNG",
        "jpg": "JPEG",
        "jpeg": "JPEG",
        "webp": "WEBP",
        "bmp": "BMP",
        "gif": "GIF",
        "tiff": "TIFF",
        "tif": "TIFF",
        "tga": "TGA",
        "avif": "AVIF",
    }
    pil_fmt = pil_map.get(target_fmt, target_fmt.upper())
    save_kwargs = {}
    if pil_fmt in ("JPEG", "WEBP", "AVIF"):
        save_kwargs["quality"] = int(quality)
    if pil_fmt == "PNG":
        save_kwargs["optimize"] = True
    im.save(output_path, format=pil_fmt, **save_kwargs)
    return {"width": w, "height": h}


def _read_docx_structured(docx_path):
    from docx import Document
    doc = Document(docx_path)
    blocks = []
    for p in doc.paragraphs:
        txt = p.text.strip()
        if not txt:
            continue
        style_name = (p.style.name or "").lower() if p.style else ""
        if "heading 1" in style_name or style_name == "title":
            blocks.append(("h1", txt))
        elif "heading 2" in style_name or style_name == "subtitle":
            blocks.append(("h2", txt))
        elif "heading" in style_name:
            blocks.append(("h3", txt))
        elif "list" in style_name or txt.startswith(("• ", "- ", "* ")):
            blocks.append(("li", txt.lstrip("•-* ")))
        else:
            blocks.append(("p", txt))

    for tbl in doc.tables:
        rows = []
        for row in tbl.rows:
            rows.append([cell.text.strip().replace("\n", " ") for cell in row.cells])
        if rows:
            blocks.append(("table", rows))
    return blocks


def _read_odt_structured(odt_path):
    from odf.opendocument import load
    from odf import text as odf_text, teletype, table as odf_table

    doc = load(odt_path)
    blocks = []
    for el in doc.text.childNodes:
        qname = el.qname[1] if hasattr(el, "qname") else ""
        if qname == "h":
            txt = teletype.extractText(el).strip()
            if txt:
                lvl = el.getAttribute("outlinelevel") or "1"
                tag = "h1" if lvl == "1" else ("h2" if lvl == "2" else "h3")
                blocks.append((tag, txt))
        elif qname == "p":
            txt = teletype.extractText(el).strip()
            if txt:
                blocks.append(("p", txt))
        elif qname == "list":
            for item in el.getElementsByType(odf_text.ListItem):
                txt = teletype.extractText(item).strip()
                if txt:
                    blocks.append(("li", txt))
        elif qname == "table":
            rows = []
            for row in el.getElementsByType(odf_table.TableRow):
                cells = [teletype.extractText(c).strip() for c in row.getElementsByType(odf_table.TableCell)]
                if cells:
                    rows.append(cells)
            if rows:
                blocks.append(("table", rows))
    return blocks


def _read_pptx_structured(pptx_path):
    from pptx import Presentation
    prs = Presentation(pptx_path)
    slides = []
    for idx, slide in enumerate(prs.slides, 1):
        title_text = ""
        body_items = []
        tables = []
        if slide.shapes.title and slide.shapes.title.text:
            title_text = slide.shapes.title.text.strip()
        for shape in slide.shapes:
            if shape == slide.shapes.title:
                continue
            if shape.has_text_frame:
                for p in shape.text_frame.paragraphs:
                    t = p.text.strip()
                    if t:
                        body_items.append(t)
            if shape.has_table:
                rows = []
                for row in shape.table.rows:
                    rows.append([c.text.strip() for c in row.cells])
                if rows:
                    tables.append(rows)
        notes = ""
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            notes = slide.notes_slide.notes_text_frame.text.strip()
        slides.append({
            "num": idx,
            "title": title_text or f"Slide {idx}",
            "items": body_items,
            "tables": tables,
            "notes": notes,
        })
    return slides


def _read_spreadsheet_rows(file_path, ext):
    """Returns dict of {sheet_name: list_of_rows}."""
    ext = ext.lower()
    if ext in (".xlsx", ".xlsm"):
        import openpyxl
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheets = {}
        for name in wb.sheetnames:
            ws = wb[name]
            rows = []
            for r in ws.iter_rows(values_only=True):
                row_vals = ["" if v is None else str(v) for v in r]
                if any(v != "" for v in row_vals):
                    rows.append(row_vals)
            sheets[name] = rows
        return sheets
    elif ext == ".csv":
        rows = []
        with open(file_path, "r", encoding="utf-8-sig", errors="replace", newline="") as f:
            reader = csv.reader(f)
            for r in reader:
                rows.append(r)
        return {"Sheet1": rows}
    elif ext == ".json":
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
        rows = []
        if isinstance(data, list) and data and isinstance(data[0], dict):
            headers = []
            for item in data:
                if isinstance(item, dict):
                    for k in item.keys():
                        if k not in headers:
                            headers.append(k)
            rows.append(headers)
            for item in data:
                if isinstance(item, dict):
                    rows.append([str(item.get(h, "")) for h in headers])
        elif isinstance(data, list):
            for item in data:
                rows.append(list(map(str, item)) if isinstance(item, list) else [str(item)])
        elif isinstance(data, dict):
            rows.append(["Key", "Value"])
            for k, v in data.items():
                val = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
                rows.append([str(k), val])
        return {"Data": rows}
    elif ext == ".xml":
        import xml.etree.ElementTree as ET
        tree = ET.parse(file_path)
        root = tree.getroot()
        rows = []
        children = list(root)
        if children:
            headers = []
            for ch in children:
                sub = list(ch)
                if sub:
                    for s in sub:
                        if s.tag not in headers:
                            headers.append(s.tag)
            if headers:
                rows.append(headers)
                for ch in children:
                    sub_map = {s.tag: (s.text or "").strip() for s in list(ch)}
                    rows.append([sub_map.get(h, "") for h in headers])
            else:
                rows.append(["Tag", "Text"])
                for ch in children:
                    rows.append([ch.tag, (ch.text or "").strip()])
        else:
            rows.append(["Tag", "Text"])
            rows.append([root.tag, (root.text or "").strip()])
        return {root.tag or "XMLData": rows}
    elif ext in (".html", ".htm"):
        from bs4 import BeautifulSoup
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
        sheets = {}
        for idx, tbl in enumerate(soup.find_all("table"), 1):
            rows = []
            for tr in tbl.find_all("tr"):
                cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
                if cells:
                    rows.append(cells)
            if rows:
                sheets[f"Table_{idx}"] = rows
        if not sheets:
            lines = [[line.strip()] for line in soup.get_text("\n").splitlines() if line.strip()]
            sheets["Content"] = lines
        return sheets
    return {}


def _blocks_to_html(blocks):
    parts = []
    in_list = False
    for kind, content in blocks:
        if kind != "li" and in_list:
            parts.append("</ul>")
            in_list = False
        if kind in ("h1", "h2", "h3"):
            parts.append(f"<{kind}>{html_lib.escape(content)}</{kind}>")
        elif kind == "p":
            parts.append(f"<p>{html_lib.escape(content)}</p>")
        elif kind == "pre":
            parts.append(f"<pre>{html_lib.escape(content)}</pre>")
        elif kind == "li":
            if not in_list:
                parts.append("<ul>")
                in_list = True
            parts.append(f"<li>{html_lib.escape(content)}</li>")
        elif kind == "table":
            parts.append("<table>")
            for idx, r in enumerate(content):
                tag = "th" if idx == 0 else "td"
                row_html = "".join(f"<{tag}>{html_lib.escape(str(c))}</{tag}>" for c in r)
                parts.append(f"<tr>{row_html}</tr>")
            parts.append("</table>")
    if in_list:
        parts.append("</ul>")
    return "\n".join(parts)


def _blocks_to_markdown(blocks):
    out = []
    for kind, content in blocks:
        if kind == "h1":
            out.append(f"# {content}\n")
        elif kind == "h2":
            out.append(f"## {content}\n")
        elif kind == "h3":
            out.append(f"### {content}\n")
        elif kind == "li":
            out.append(f"- {content}")
        elif kind == "p":
            out.append(f"{content}\n")
        elif kind == "pre":
            out.append(f"```\n{content}\n```\n")
        elif kind == "table" and content:
            cols = max(len(r) for r in content)
            for idx, r in enumerate(content):
                padded = r + [""] * (cols - len(r))
                out.append("| " + " | ".join(str(c).replace("|", "\\|") for c in padded) + " |")
                if idx == 0:
                    out.append("| " + " | ".join(["---"] * cols) + " |")
            out.append("")
    return "\n".join(out)


def _blocks_to_text(blocks):
    out = []
    for kind, content in blocks:
        if kind == "table":
            for r in content:
                out.append("\t".join(str(c) for c in r))
            out.append("")
        else:
            out.append(str(content))
    return "\n\n".join(out)


def _write_docx_from_blocks(blocks, output_path):
    from docx import Document
    doc = Document()
    for kind, content in blocks:
        if kind == "h1":
            doc.add_heading(content, level=1)
        elif kind == "h2":
            doc.add_heading(content, level=2)
        elif kind == "h3":
            doc.add_heading(content, level=3)
        elif kind == "li":
            doc.add_paragraph(content, style="List Bullet")
        elif kind == "table" and content:
            cols = max((len(r) for r in content), default=1)
            tbl = doc.add_table(rows=len(content), cols=cols)
            tbl.style = "Table Grid"
            for r_i, row in enumerate(content):
                for c_i, val in enumerate(row):
                    if c_i < cols:
                        tbl.cell(r_i, c_i).text = str(val)
        else:
            for line in str(content).splitlines():
                doc.add_paragraph(line)
    doc.save(output_path)


def _write_odt_from_blocks(blocks, output_path):
    from odf.opendocument import OpenDocumentText
    from odf.text import H, P

    doc = OpenDocumentText()
    for kind, content in blocks:
        if kind in ("h1", "h2", "h3"):
            lvl = 1 if kind == "h1" else (2 if kind == "h2" else 3)
            doc.text.addElement(H(outlinelevel=lvl, text=str(content)))
        elif kind == "table":
            for r in content:
                doc.text.addElement(P(text=" | ".join(str(c) for c in r)))
        elif kind == "li":
            doc.text.addElement(P(text=f"• {content}"))
        else:
            for line in str(content).splitlines():
                doc.text.addElement(P(text=line))
    doc.save(output_path)


def _rtf_escape(s):
    out = []
    for ch in str(s):
        code = ord(ch)
        if ch in ("\\", "{", "}"):
            out.append("\\" + ch)
        elif ch == "\n":
            out.append("\\par\n")
        elif 32 <= code <= 126:
            out.append(ch)
        else:
            signed = code if code < 32768 else code - 65536
            out.append(f"\\u{signed}?")
    return "".join(out)


def _write_rtf_from_blocks(blocks, output_path):
    parts = [r"{\rtf1\ansi\deff0{\fonttbl{\f0 Arial;}}\fs22"]
    for kind, content in blocks:
        if kind == "h1":
            parts.append(r"\pard\b\fs34 " + _rtf_escape(content) + r"\b0\fs22\par")
        elif kind in ("h2", "h3"):
            parts.append(r"\pard\b\fs28 " + _rtf_escape(content) + r"\b0\fs22\par")
        elif kind == "li":
            parts.append(r"\pard\li360 \bullet\tab " + _rtf_escape(content) + r"\par")
        elif kind == "table":
            for r in content:
                parts.append(r"\pard " + _rtf_escape(" | ".join(str(c) for c in r)) + r"\par")
        else:
            parts.append(r"\pard " + _rtf_escape(content) + r"\par")
    parts.append("}")
    with open(output_path, "w", encoding="ascii", errors="ignore") as f:
        f.write("\n".join(parts))


def _write_xlsx_from_sheets(sheets, output_path):
    import openpyxl
    from openpyxl.styles import Font, PatternFill

    wb = openpyxl.Workbook()
    first = True
    for name, rows in sheets.items():
        ws = wb.active if first else wb.create_sheet()
        first = False
        safe_title = re.sub(r"[\[\]:*?/\\]", "_", str(name))[:31] or "Sheet1"
        ws.title = safe_title
        for r_idx, row in enumerate(rows, 1):
            for c_idx, val in enumerate(row, 1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                if r_idx == 1:
                    cell.font = Font(bold=True, color="0F172A")
                    cell.fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    wb.save(output_path)


def _html_to_blocks(html_str):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_str, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    blocks = []
    body = soup.body or soup
    for el in body.descendants:
        name = getattr(el, "name", None)
        if not name:
            continue
        # Only process direct container blocks so we don't duplicate descendants
        if name in ("h1", "h2", "h3", "h4"):
            t = el.get_text(" ", strip=True)
            if t:
                blocks.append((name if name in ("h1", "h2", "h3") else "h3", t))
        elif name == "p":
            if el.find_parent("table") or el.find_parent("li"):
                continue
            t = el.get_text(" ", strip=True)
            if t:
                blocks.append(("p", t))
        elif name == "li":
            if el.find_parent("table"):
                continue
            t = el.get_text(" ", strip=True)
            if t:
                blocks.append(("li", t))
        elif name == "pre":
            t = el.get_text()
            if t.strip():
                blocks.append(("pre", t))
        elif name == "table" and not el.find_parent("table"):
            rows = []
            for tr in el.find_all("tr"):
                cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
                if cells:
                    rows.append(cells)
            if rows:
                blocks.append(("table", rows))
    if not blocks:
        plain = body.get_text("\n")
        for line in plain.splitlines():
            if line.strip():
                blocks.append(("p", line.strip()))
    return blocks


def _markdown_to_blocks(md_text):
    blocks = []
    lines = md_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1
            continue
        if s.startswith("### "):
            blocks.append(("h3", s[4:].strip()))
        elif s.startswith("## "):
            blocks.append(("h2", s[3:].strip()))
        elif s.startswith("# "):
            blocks.append(("h1", s[2:].strip()))
        elif s.startswith(("- ", "* ", "+ ")):
            blocks.append(("li", s[2:].strip()))
        elif s.startswith("|"):
            tbl_rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row_str = lines[i].strip().strip("|")
                cells = [c.strip() for c in row_str.split("|")]
                if not all(re.match(r"^:?-+:?$", c) for c in cells if c):
                    tbl_rows.append(cells)
                i += 1
            if tbl_rows:
                blocks.append(("table", tbl_rows))
            continue
        elif s.startswith("```"):
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            blocks.append(("pre", "\n".join(code_lines)))
        else:
            blocks.append(("p", s))
        i += 1
    return blocks


def _srt_to_vtt(srt_text):
    normalized = srt_text.replace("\r\n", "\n").strip()
    lines = []
    for line in normalized.split("\n"):
        if re.match(r"^\d+$", line.strip()):
            continue
        if "-->" in line:
            line = re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", line)
        lines.append(line)
    return "WEBVTT\n\n" + "\n".join(lines).strip() + "\n"


def _vtt_to_srt(vtt_text):
    normalized = re.sub(r"^WEBVTT[^\n]*\n+", "", vtt_text.replace("\r\n", "\n")).strip()
    blocks = [b.strip() for b in re.split(r"\n\s*\n", normalized) if b.strip()]
    out = []
    idx = 1
    for b in blocks:
        b_lines = b.splitlines()
        if not b_lines:
            continue
        if re.match(r"^\d+$", b_lines[0].strip()):
            b_lines = b_lines[1:]
        if not b_lines:
            continue
        b_lines[0] = re.sub(r"(\d{2}:\d{2}:?\d{0,2})\.(\d{3})", r"\1,\2", b_lines[0])
        out.append(f"{idx}\n" + "\n".join(b_lines))
        idx += 1
    return "\n\n".join(out) + "\n"


def _render_pdf_pages(pdf_path, target_fmt, output_path, preview_out_path=None, dpi=150, quality=90):
    doc = pymupdf.open(pdf_path)
    total = len(doc)
    ext = target_fmt.lower()
    if ext == "jpeg":
        ext = "jpg"

    if total == 0:
        doc.close()
        raise ValueError("PDF contains zero pages.")

    if total == 1:
        pix = doc[0].get_pixmap(dpi=dpi)
        im = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        buf_kwargs = {"quality": int(quality)} if ext in ("jpg", "webp", "avif") else {}
        im.save(output_path, **buf_kwargs)
        doc.close()
        return {"pages": 1, "isZip": False}

    # Multiple pages -> save into ZIP + write page 1 to preview_out_path
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for i, page in enumerate(doc, 1):
            pix = page.get_pixmap(dpi=dpi)
            im = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img_bytes = io.BytesIO()
            fmt_name = "JPEG" if ext == "jpg" else ext.upper()
            buf_kwargs = {"quality": int(quality)} if fmt_name in ("JPEG", "WEBP", "AVIF") else {}
            im.save(img_bytes, format=fmt_name, **buf_kwargs)
            if i == 1 and preview_out_path:
                with open(preview_out_path, "wb") as pf:
                    pf.write(img_bytes.getvalue())
            zf.writestr(f"page_{i:03d}_CapZone.{ext}", img_bytes.getvalue())
    doc.close()
    return {"pages": total, "isZip": True}


def convert(payload):
    input_paths = payload.get("inputPaths") or []
    if not input_paths and payload.get("inputPath"):
        input_paths = [payload["inputPath"]]
    if not input_paths:
        raise ValueError("No input file provided.")

    src = input_paths[0]
    src_ext = os.path.splitext(src)[1].lower()
    target_fmt = (payload.get("targetFormat") or "").lower().lstrip(".")
    output_path = payload["outputPath"]
    preview_path = payload.get("previewPath")
    quality = int(payload.get("quality") or 90)
    dpi = int(payload.get("dpi") or 150)

    image_exts = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".heic", ".heif", ".tiff", ".tif", ".bmp", ".gif", ".ico", ".tga", ".svg"}
    raster_targets = {"png", "jpg", "jpeg", "webp", "avif", "tiff", "tif", "bmp", "gif", "ico", "tga", "svg"}

    # 1. Image(s) -> Image / PDF
    if src_ext in image_exts and (target_fmt in raster_targets or target_fmt == "pdf"):
        meta = _convert_image_pil(input_paths, output_path, target_fmt, quality=quality, dpi=dpi)
        return {"success": True, "meta": meta}

    # 2. PDF -> DOCX / Raster Images / TXT / MD / HTML / RTF / ODT / XLSX / CSV / JSON
    if src_ext == ".pdf":
        if target_fmt in ("png", "jpg", "jpeg", "webp", "tiff", "tif", "bmp", "gif"):
            meta = _render_pdf_pages(src, target_fmt, output_path, preview_out_path=preview_path, dpi=dpi, quality=quality)
            return {"success": True, "meta": meta}

        if target_fmt == "docx":
            try:
                from pdf2docx import Converter
                cv = Converter(src)
                cv.convert(output_path)
                cv.close()
                return {"success": True, "meta": {"engine": "pdf2docx"}}
            except Exception:
                doc = pymupdf.open(src)
                blocks = []
                for idx, page in enumerate(doc, 1):
                    txt = page.get_text("text").strip()
                    if txt:
                        if idx > 1:
                            blocks.append(("h3", f"Page {idx}"))
                        for line in txt.splitlines():
                            if line.strip():
                                blocks.append(("p", line.strip()))
                doc.close()
                _write_docx_from_blocks(blocks, output_path)
                return {"success": True, "meta": {"engine": "pymupdf-fallback"}}

        if target_fmt == "pdf":
            doc = pymupdf.open(src)
            doc.save(output_path, garbage=4, deflate=True)
            pages = len(doc)
            doc.close()
            return {"success": True, "meta": {"pages": pages, "compressed": True}}

        doc = pymupdf.open(src)
        blocks = []
        raw_pages_html = []
        raw_pages_txt = []
        for idx, page in enumerate(doc, 1):
            t = page.get_text("text")
            raw_pages_txt.append(t)
            raw_pages_html.append(page.get_text("html"))
            if idx > 1:
                blocks.append(("h3", f"Page {idx}"))
            for line in t.splitlines():
                if line.strip():
                    blocks.append(("p", line.strip()))
        pages = len(doc)
        doc.close()

        if target_fmt == "txt":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write("\n\n".join(raw_pages_txt))
            return {"success": True, "meta": {"pages": pages}}
        if target_fmt == "html":
            body_html = f"<h1>Extracted PDF ({pages} pages)</h1>" + "<hr/>".join(raw_pages_html)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{{font-family:sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;}}</style></head><body>{body_html}</body></html>")
            return {"success": True, "meta": {"pages": pages}}
        if target_fmt == "md":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(_blocks_to_markdown(blocks))
            return {"success": True, "meta": {"pages": pages}}
        if target_fmt == "rtf":
            _write_rtf_from_blocks(blocks, output_path)
            return {"success": True, "meta": {"pages": pages}}
        if target_fmt == "odt":
            _write_odt_from_blocks(blocks, output_path)
            return {"success": True, "meta": {"pages": pages}}
        if target_fmt in ("csv", "xlsx", "json", "xml"):
            rows = [[line.strip()] for txt in raw_pages_txt for line in txt.splitlines() if line.strip()]
            return _export_tabular({"PDF_Lines": rows}, target_fmt, output_path)

    # 3. Spreadsheets & Tabular Formats (XLSX, CSV, JSON, XML)
    if src_ext in (".xlsx", ".xlsm", ".csv", ".json", ".xml"):
        sheets = _read_spreadsheet_rows(src, src_ext)
        if target_fmt in ("xlsx", "csv", "json", "xml", "html", "md", "txt", "pdf", "docx", "rtf", "odt", "png", "jpg", "jpeg", "webp"):
            return _export_tabular(sheets, target_fmt, output_path, preview_path=preview_path, dpi=dpi, quality=quality)

    # 4. PowerPoint Presentations (PPTX)
    if src_ext == ".pptx":
        slides = _read_pptx_structured(src)
        slide_html = []
        blocks = []
        for s in slides:
            blocks.append(("h2", f"Slide {s['num']}: {s['title']}"))
            items_html = "".join(f"<li>{html_lib.escape(it)}</li>" for it in s["items"])
            tbl_html = ""
            for t in s["tables"]:
                blocks.append(("table", t))
                tbl_html += _blocks_to_html([("table", t)])
            for it in s["items"]:
                blocks.append(("li", it))
            notes_html = ""
            if s["notes"]:
                blocks.append(("p", f"Notes: {s['notes']}"))
                notes_html = f"<p style='color:#64748b;font-size:9pt;margin-top:10pt;'><b>Speaker Notes:</b> {html_lib.escape(s['notes'])}</p>"
            slide_html.append(
                f"<div class='slide-card'><div class='slide-badge'>Slide {s['num']}</div>"
                f"<h1>{html_lib.escape(s['title'])}</h1>"
                f"<ul>{items_html}</ul>{tbl_html}{notes_html}</div>"
            )
        combined_html = "\n".join(slide_html)
        if target_fmt == "pdf":
            pages = _html_to_pdf_pymupdf(combined_html, output_path, landscape=True)
            return {"success": True, "meta": {"slides": len(slides), "pages": pages}}
        if target_fmt in ("png", "jpg", "jpeg", "webp"):
            tmp_pdf = output_path + ".tmp.pdf"
            _html_to_pdf_pymupdf(combined_html, tmp_pdf, landscape=True)
            meta = _render_pdf_pages(tmp_pdf, target_fmt, output_path, preview_out_path=preview_path, dpi=dpi, quality=quality)
            try:
                os.remove(tmp_pdf)
            except Exception:
                pass
            return {"success": True, "meta": meta}
        if target_fmt == "html":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{{font-family:sans-serif;background:#f8fafc;max-width:960px;margin:2rem auto;padding:0 1rem;}}.slide-card{{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px;box-shadow:0 4px 12px rgba(0,0,0,0.04);}}.slide-badge{{color:#6366f1;font-weight:700;font-size:12px;text-transform:uppercase;margin-bottom:8px;}}</style></head><body>{combined_html}</body></html>")
            return {"success": True, "meta": {"slides": len(slides)}}
        if target_fmt == "md":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(_blocks_to_markdown(blocks))
            return {"success": True, "meta": {"slides": len(slides)}}
        if target_fmt == "txt":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(_blocks_to_text(blocks))
            return {"success": True, "meta": {"slides": len(slides)}}
        if target_fmt == "docx":
            _write_docx_from_blocks(blocks, output_path)
            return {"success": True, "meta": {"slides": len(slides)}}
        if target_fmt == "rtf":
            _write_rtf_from_blocks(blocks, output_path)
            return {"success": True, "meta": {"slides": len(slides)}}
        if target_fmt == "odt":
            _write_odt_from_blocks(blocks, output_path)
            return {"success": True, "meta": {"slides": len(slides)}}

    # 5. Text / Rich Text / OpenDoc / Word / HTML / Markdown / Subtitle Documents
    blocks = []
    if src_ext == ".docx":
        blocks = _read_docx_structured(src)
    elif src_ext == ".odt":
        blocks = _read_odt_structured(src)
    elif src_ext == ".rtf":
        from striprtf.striprtf import rtf_to_text
        with open(src, "r", encoding="utf-8", errors="replace") as f:
            txt = rtf_to_text(f.read())
        blocks = [("p", line.strip()) for line in txt.splitlines() if line.strip()]
    elif src_ext in (".html", ".htm"):
        if target_fmt in ("xlsx", "csv", "json", "xml"):
            sheets = _read_spreadsheet_rows(src, src_ext)
            return _export_tabular(sheets, target_fmt, output_path, preview_path=preview_path, dpi=dpi, quality=quality)
        with open(src, "r", encoding="utf-8", errors="replace") as f:
            blocks = _html_to_blocks(f.read())
    elif src_ext in (".md", ".markdown"):
        with open(src, "r", encoding="utf-8", errors="replace") as f:
            blocks = _markdown_to_blocks(f.read())
    elif src_ext in (".txt", ".srt", ".vtt", ".log", ".ini"):
        with open(src, "r", encoding="utf-8-sig", errors="replace") as f:
            raw_text = f.read()
        if src_ext == ".srt" and target_fmt == "vtt":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(_srt_to_vtt(raw_text))
            return {"success": True, "meta": {"converted": "SRT->VTT"}}
        if src_ext == ".vtt" and target_fmt == "srt":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(_vtt_to_srt(raw_text))
            return {"success": True, "meta": {"converted": "VTT->SRT"}}
        blocks = [("p", line) for line in raw_text.splitlines() if line.strip() != ""]
        if not blocks:
            blocks = [("p", raw_text)]
    else:
        raise ValueError(f"Unsupported source extension: {src_ext}")

    if target_fmt == "pdf":
        body_html = _blocks_to_html(blocks)
        pages = _html_to_pdf_pymupdf(body_html, output_path)
        return {"success": True, "meta": {"pages": pages}}
    if target_fmt in ("png", "jpg", "jpeg", "webp"):
        body_html = _blocks_to_html(blocks)
        tmp_pdf = output_path + ".tmp.pdf"
        _html_to_pdf_pymupdf(body_html, tmp_pdf)
        meta = _render_pdf_pages(tmp_pdf, target_fmt, output_path, preview_out_path=preview_path, dpi=dpi, quality=quality)
        try:
            os.remove(tmp_pdf)
        except Exception:
            pass
        return {"success": True, "meta": meta}
    if target_fmt == "docx":
        _write_docx_from_blocks(blocks, output_path)
        return {"success": True, "meta": {"blocks": len(blocks)}}
    if target_fmt == "odt":
        _write_odt_from_blocks(blocks, output_path)
        return {"success": True, "meta": {"blocks": len(blocks)}}
    if target_fmt == "rtf":
        _write_rtf_from_blocks(blocks, output_path)
        return {"success": True, "meta": {"blocks": len(blocks)}}
    if target_fmt == "html":
        body_html = _blocks_to_html(blocks)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{{font-family:system-ui,sans-serif;max-width:860px;margin:2.5rem auto;padding:0 1.25rem;line-height:1.65;color:#1e293b;}}table{{border-collapse:collapse;width:100%;margin:1rem 0;}}th,td{{border:1px solid #cbd5e1;padding:8px 10px;}}th{{background:#f1f5f9;}}</style></head><body>{body_html}</body></html>")
        return {"success": True, "meta": {"blocks": len(blocks)}}
    if target_fmt == "md":
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(_blocks_to_markdown(blocks))
        return {"success": True, "meta": {"blocks": len(blocks)}}
    if target_fmt == "txt":
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(_blocks_to_text(blocks))
        return {"success": True, "meta": {"blocks": len(blocks)}}
    if target_fmt in ("xlsx", "csv", "json", "xml"):
        tbls = [c for k, c in blocks if k == "table"]
        if tbls:
            sheets = {f"Table_{i+1}": r for i, r in enumerate(tbls)}
        else:
            sheets = {"Document": [[str(c)] for _, c in blocks]}
        return _export_tabular(sheets, target_fmt, output_path)

    raise ValueError(f"Unsupported conversion: {src_ext} -> {target_fmt}")


def _export_tabular(sheets, target_fmt, output_path, preview_path=None, dpi=150, quality=90):
    first_sheet_rows = next(iter(sheets.values()), []) if sheets else []
    if target_fmt == "xlsx":
        _write_xlsx_from_sheets(sheets, output_path)
        return {"success": True, "meta": {"sheets": len(sheets)}}
    if target_fmt == "csv":
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            for row in first_sheet_rows:
                writer.writerow(row)
        return {"success": True, "meta": {"rows": len(first_sheet_rows)}}
    if target_fmt == "json":
        out_obj = {}
        if len(sheets) == 1:
            rows = first_sheet_rows
            if len(rows) >= 2:
                headers = [str(h or f"col_{i+1}") for i, h in enumerate(rows[0])]
                data_list = [dict(zip(headers, r)) for r in rows[1:]]
                out_json = data_list
            else:
                out_json = rows
        else:
            for sname, rows in sheets.items():
                if len(rows) >= 2:
                    headers = [str(h or f"col_{i+1}") for i, h in enumerate(rows[0])]
                    out_obj[sname] = [dict(zip(headers, r)) for r in rows[1:]]
                else:
                    out_obj[sname] = rows
            out_json = out_obj
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(out_json, f, indent=2, ensure_ascii=False)
        return {"success": True, "meta": {"rows": len(first_sheet_rows)}}
    if target_fmt == "xml":
        lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<Workbook>"]
        for sname, rows in sheets.items():
            lines.append(f'  <Sheet name="{xml_escape(str(sname))}">')
            headers = rows[0] if rows else []
            data_rows = rows[1:] if len(rows) > 1 else rows
            for row in data_rows:
                lines.append("    <Row>")
                for idx, val in enumerate(row):
                    tag = re.sub(r"[^a-zA-Z0-9_]", "_", str(headers[idx])) if idx < len(headers) and headers[idx] else f"Col_{idx+1}"
                    if tag and tag[0].isdigit():
                        tag = "F_" + tag
                    lines.append(f"      <{tag}>{xml_escape(str(val))}</{tag}>")
                lines.append("    </Row>")
            lines.append("  </Sheet>")
        lines.append("</Workbook>")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        return {"success": True, "meta": {"sheets": len(sheets)}}

    blocks = []
    for sname, rows in sheets.items():
        if len(sheets) > 1:
            blocks.append(("h2", sname))
        if rows:
            blocks.append(("table", rows[:1500]))
    if target_fmt == "html":
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{{font-family:system-ui,sans-serif;padding:24px;}}table{{border-collapse:collapse;width:100%;font-size:13px;}}th,td{{border:1px solid #cbd5e1;padding:6px 10px;}}th{{background:#f1f5f9;font-weight:700;}}</style></head><body>{_blocks_to_html(blocks)}</body></html>")
        return {"success": True, "meta": {"sheets": len(sheets)}}
    if target_fmt == "md":
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(_blocks_to_markdown(blocks))
        return {"success": True, "meta": {"sheets": len(sheets)}}
    if target_fmt == "txt":
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(_blocks_to_text(blocks))
        return {"success": True, "meta": {"sheets": len(sheets)}}
    if target_fmt == "pdf":
        pages = _html_to_pdf_pymupdf(_blocks_to_html(blocks), output_path, landscape=(len(first_sheet_rows[0]) > 5 if first_sheet_rows else False))
        return {"success": True, "meta": {"pages": pages}}
    if target_fmt in ("png", "jpg", "jpeg", "webp"):
        tmp_pdf = output_path + ".tmp.pdf"
        _html_to_pdf_pymupdf(_blocks_to_html(blocks), tmp_pdf, landscape=(len(first_sheet_rows[0]) > 5 if first_sheet_rows else False))
        meta = _render_pdf_pages(tmp_pdf, target_fmt, output_path, preview_out_path=preview_path, dpi=dpi, quality=quality)
        try:
            os.remove(tmp_pdf)
        except Exception:
            pass
        return {"success": True, "meta": meta}
    if target_fmt == "docx":
        _write_docx_from_blocks(blocks, output_path)
        return {"success": True, "meta": {"sheets": len(sheets)}}
    if target_fmt == "rtf":
        _write_rtf_from_blocks(blocks, output_path)
        return {"success": True, "meta": {"sheets": len(sheets)}}
    if target_fmt == "odt":
        _write_odt_from_blocks(blocks, output_path)
        return {"success": True, "meta": {"sheets": len(sheets)}}

    raise ValueError(f"Unsupported tabular target format: {target_fmt}")


if __name__ == "__main__":
    real_stdout = sys.stdout
    try:
        raw_payload = sys.stdin.read()
        req = json.loads(raw_payload)
        sys.stdout = sys.stderr
        res = convert(req)
        sys.stdout = real_stdout
        print(json.dumps(res))
    except Exception as exc:
        sys.stdout = real_stdout
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)
