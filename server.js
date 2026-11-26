// =====================================================================
// CapZone Studio Backend Server (100% Free Local Meta MMS + NLLB Engine)
// =====================================================================

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e){}
const { exec, execSync } = require('child_process');

// =====================================================================
// 🛡️ PROCESS CRASH SHIELD (AI / HACKER MALFORMED ATTACK IMMUNITY)
// =====================================================================
process.on('uncaughtException', (err) => {
    console.error('[CapZone Crash Guard] 🛡️ Neutralized uncaughtException:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[CapZone Crash Guard] 🛡️ Neutralized unhandledRejection:', reason);
});

// --- OPTIONAL PM2 BACKGROUND RUNNER ---
if (process.argv.indexOf('--daemon') !== -1 && !process.env.pm_id) {
    console.log("Checking for PM2 to auto-run server in background...");
    try {
        execSync('pm2 -v', { stdio: 'ignore' });
    } catch (e) {
        console.log("PM2 not found. Auto-installing PM2 globally...");
        try {
            execSync('npm install -g pm2', { stdio: 'inherit' });
            console.log("PM2 installed successfully!");
        } catch (err) {
            console.error("Failed to install PM2 globally. Please install it manually.");
        }
    }
    
    console.log("Starting server with PM2...");
    try {
        execSync('pm2 start server.js --name "sinhalasub"', { stdio: 'inherit' });
        console.log("========================================================");
        console.log("Server started with PM2 in background successfully!");
        console.log("To view logs, run: pm2 logs sinhalasub");
        console.log("========================================================");
        process.exit(0);
    } catch (err) {
        console.error("Failed to start with PM2:", err.message);
    }
}

// =========================================================================================
// âš™ï¸ CAPZONE VIDEO & SRT MASTER SERVER - MASTER CONFIGURATION
// ðŸ’¡ CHANGE YOUR API KEYS, PORTS, CHAT IDs HERE ANYTIME. CODE AUTO-ADAPTS!
// =========================================================================================
const CONFIG = {
    // 1. Ports
    PORT: parseInt(process.env.PORT || 6039, 10),
    ADMIN_PORT: parseInt(process.env.ADMIN_PORT || 6040, 10),

    // 2. Telegram Bot & Project Backups
    TELEGRAM: {
        BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8982780235:AAF9b8kJy7kgOm-uN95P0PyLkHK2JohJfIE',
        PROJECTS_CHAT_ID: process.env.TELEGRAM_PROJECTS_CHAT_ID || '-1004498616218'
    }
};

const PORT = CONFIG.PORT;
const tgUploadLocks = new Set();

// RFC 6266 & Node.js HTTP Safe Content-Disposition Header Builder
// Prevents ERR_INVALID_CHAR when filenames contain Sinhala / Unicode characters
function makeContentDisposition(disposition, filename) {
    const safeType = disposition || 'attachment';
    const ext = path.extname(filename || '') || '';
    // HTTP headers in Node.js MUST strictly contain ISO-8859-1 / ASCII characters (code 32 to 126).
    // The fallback 'filename="..."' parameter is sanitized to pure ASCII:
    let asciiFallback = (filename || 'download')
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\;]/g, '_')
        .replace(/_+/g, '_')
        .trim();
    if (!asciiFallback || asciiFallback === ext || asciiFallback === '_') {
        asciiFallback = `CapZone_Media${ext || '.mp4'}`;
    }
    // Full Unicode / Sinhala name is safely passed via standard RFC 5987 / RFC 6266 'filename*=UTF-8\'\'...'
    const utf8Encoded = encodeURIComponent(filename || 'download');
    return `${safeType}; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`;
}

// Auto-spawn admin.js so the user doesn't have to run it manually
if (fs.existsSync(path.join(__dirname, 'admin.js'))) {
    try {
        const { fork } = require('child_process');
        const adminProcess = fork(path.join(__dirname, 'admin.js'));
        adminProcess.on('error', (err) => console.error('Failed to start admin.js:', err.message));
        console.log("=> Auto-started admin.js backend on Port " + CONFIG.ADMIN_PORT);
    } catch(e) {
        console.error('Could not auto-start admin.js:', e.message);
    }
}

// --- LOCAL NEURAL ENGINE ENDPOINTS ---

// --- AUTO-INSTALL DEPENDENCIES ON STARTUP ---
const os = require('os');

// 1. Resolve ffmpeg: Check system ffmpeg first, then ffmpeg-static
let ffmpegPath = '';
try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    ffmpegPath = 'ffmpeg';
    console.log("[FFmpeg] System ffmpeg detected and active!");
} catch (e) {
    try {
        const staticFfmpeg = require('ffmpeg-static');
        if (staticFfmpeg && fs.existsSync(staticFfmpeg)) {
            ffmpegPath = staticFfmpeg;
            if (process.platform !== 'win32') {
                try { fs.chmodSync(ffmpegPath, '755'); } catch (err) {}
            }
            console.log("[FFmpeg] ffmpeg-static verified at", ffmpegPath);
        }
    } catch (e2) {
        console.log("ffmpeg-static not found. Auto-installing...");
        try {
            execSync('npm install ffmpeg-static', { stdio: 'inherit' });
            const staticFfmpeg = require('ffmpeg-static');
            if (staticFfmpeg && fs.existsSync(staticFfmpeg)) {
                ffmpegPath = staticFfmpeg;
                if (process.platform !== 'win32') {
                    try { fs.chmodSync(ffmpegPath, '755'); } catch (err) {}
                }
            }
        } catch (err) {
            console.error("Failed to auto-install ffmpeg-static:", err.message);
        }
    }
}

// Set fluent-ffmpeg path if installed
try {
    const ffmpeg = require('fluent-ffmpeg');
    if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
    }
} catch (e) {
    try {
        execSync('npm install fluent-ffmpeg', { stdio: 'ignore' });
        const ffmpeg = require('fluent-ffmpeg');
        if (ffmpegPath) {
            ffmpeg.setFfmpegPath(ffmpegPath);
        }
    } catch (err) {}
}

// Auto-verify Meta MMS Forced Alignment & Python package environment
function getPythonCommand() {
    const isWin = process.platform === 'win32';
    const venvPython = isWin 
        ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
        : path.join(__dirname, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPython)) {
        return venvPython;
    }
    const legacyVenvPython = isWin
        ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
        : path.join(__dirname, 'venv', 'bin', 'python');
    if (fs.existsSync(legacyVenvPython)) {
        return legacyVenvPython;
    }
    return isWin ? 'py' : 'python3';
}
const pythonCmd = getPythonCommand();
console.log(`[AI Engine] CapZone Speech Recognition & Alignment Engine verified via [${pythonCmd}]!`);

// Auto-install nodemailer if missing
let nodemailer;
try {
    nodemailer = require('nodemailer');
} catch (e) {
    console.log("nodemailer not found. Auto-installing...");
    try {
        execSync('npm install nodemailer', { stdio: 'inherit' });
        nodemailer = require('nodemailer');
        console.log("nodemailer installed successfully!");
    } catch (err) {
        console.error("Failed to auto-install nodemailer:", err.message);
    }
}

// Auto-install firebase-admin if missing
let admin;
try {
    admin = require('firebase-admin');
} catch (e) {
    console.log("firebase-admin not found. Auto-installing...");
    try {
        execSync('npm install firebase-admin', { stdio: 'inherit' });
        admin = require('firebase-admin');
        console.log("firebase-admin installed successfully!");
    } catch (err) {
        console.error("Failed to auto-install firebase-admin:", err.message);
    }
}


// Auto-install axios if missing
let axios;
try {
    axios = require('axios');
} catch (e) {
    console.log("axios not found. Auto-installing...");
    try {
        require('child_process').execSync('npm install axios', { stdio: 'inherit' });
        axios = require('axios');
    } catch (err) {}
}

// Auto-install form-data if missing
let FormData;
try {
    FormData = require('form-data');
} catch (e) {
    console.log("form-data not found. Auto-installing...");
    try {
        require('child_process').execSync('npm install form-data', { stdio: 'inherit' });
        FormData = require('form-data');
    } catch (err) {}
}

// MovieStream MongoDB Atlas tracking has been migrated to admin.js

let isFirebaseAdminInitialized = false;
if (fs.existsSync(path.join(__dirname, 'firebase-service-account.json'))) {
    try {
        const { getApps, initializeApp, cert } = require('firebase-admin/app');
        const serviceAccount = require('./firebase-service-account.json');
        if (!getApps().length) {
            initializeApp({ credential: cert(serviceAccount) });
            console.log("Firebase Admin initialized successfully.");
        }
        isFirebaseAdminInitialized = true;
    } catch (err) {
        console.error("Failed to initialize Firebase Admin:", err);
    }
} else {
    console.log("firebase-service-account.json not found. Firebase Admin not initialized.");
}

function getFirebaseAdminAuth() {
    if (!isFirebaseAdminInitialized) return null;
    try {
        const { getApps } = require('firebase-admin/app');
        if (!getApps || !getApps().length) return null;
        const fbAuth = require('firebase-admin/auth');
        return fbAuth.getAuth ? fbAuth.getAuth() : (admin && admin.auth ? admin.auth() : null);
    } catch (e) {
        return null;
    }
}

// =====================================================================
// 🛡️ CAPZONE ENTERPRISE SECURITY & BOT-SHIELD ENGINE
// =====================================================================
const CZ_SEC_SALT = process.env.CZ_SEC_SALT || 'CapZone_CyberShield_2026_SecureSalt_MasterKey';
const AUTHORIZED_VPS_IP = '10.0.0.28';

function getHostIPv4Addresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const devName in interfaces) {
        for (const net of interfaces[devName] || []) {
            if (net && (net.family === 'IPv4' || net.family === 4)) {
                ips.push(net.address);
            }
        }
    }
    return ips;
}

function isAuthorizedVpsHost() {
    const hostIps = getHostIPv4Addresses();
    const isTargetVps = hostIps.includes(AUTHORIZED_VPS_IP);
    const isLocalDev = hostIps.includes('127.0.0.1') || hostIps.includes('10.4.2.2') || hostIps.includes('localhost') || hostIps.some(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'));
    return {
        authorized: isTargetVps || isLocalDev,
        isTargetVps: isTargetVps,
        hostIps: hostIps
    };
}

const ALLOWED_DOMAINS = [
    'capzone.top',
    'www.capzone.top',
    'capzone.kaveez.top',
    'capzone-e601c.web.app',
    'capzone-e601c.firebaseapp.com',
    '10.0.0.28',
    '172.236.134.207'
];

// Active Client Sessions for Dynamic Integrity Handshake (token -> { ip, expiresAt })
const activeShieldSessions = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of activeShieldSessions.entries()) {
        if (data.expiresAt < now) activeShieldSessions.delete(token);
    }
}, 5 * 60 * 1000);

// Rate Limiting Store: IP -> { general: [timestamps], sensitive: [timestamps] }
const ipRateLimits = new Map();
function checkRateLimit(ip, isSensitive = false) {
    if (!ip) return true;
    const now = Date.now();
    let record = ipRateLimits.get(ip);
    if (!record) {
        record = { general: [], sensitive: [] };
        ipRateLimits.set(ip, record);
    }
    const oneMinAgo = now - 60000;
    record.general = record.general.filter(t => t > oneMinAgo);
    record.sensitive = record.sensitive.filter(t => t > oneMinAgo);

    if (isSensitive) {
        if (record.sensitive.length >= 30) return false; // Max 30 sensitive requests / min
        record.sensitive.push(now);
    } else {
        if (record.general.length >= 250) return false; // Max 250 total requests / min
        record.general.push(now);
    }
    return true;
}

// Scraper & Bot User-Agents (Including AI Crawlers & Scrapers)
const BOT_PATTERNS = [
    'gptbot', 'chatgpt', 'chatgpt-user', 'oai-searchbot', 'claudebot', 'claude-web',
    'anthropic', 'google-extended', 'bytespider', 'diffbot', 'perplexity', 'cohere',
    'meta-externalagent', 'timpibot', 'applebot-extended', 'web-capture', 'scrapy',
    'curl', 'wget', 'httrack', 'python-requests', 'aiohttp', 'httpx', 'urllib',
    'httpclient', 'postmanruntime', 'insomnia', 'headlesschrome', 'phantomjs',
    'selenium', 'puppeteer', 'playwright', 'spider', 'crawl', 'slurp',
    'zoominfobot', 'semrushbot', 'ahrefsbot', 'megaindex', 'seekport', 'nikto',
    'sqlmap', 'masscan', 'zgrab', 'nmap', 'go-http-client', 'okhttp', 'java/'
];

function isMaliciousBot(userAgent, isInternal = false) {
    if (isInternal) return false;
    if (!userAgent) return true; // Genuine web browsers always send User-Agent
    const ua = userAgent.toLowerCase();
    if (ua.includes('googlebot') || ua.includes('bingbot')) return false;
    for (const p of BOT_PATTERNS) {
        if (ua.includes(p)) return true;
    }
    return false;
}

// Cloudflare-Aware Real Client IP Resolution
function getClientIp(req) {
    if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'].trim();
    if (req.headers['true-client-ip']) return req.headers['true-client-ip'].trim();
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.socket ? req.socket.remoteAddress : '127.0.0.1';
}

// Prototype Pollution Defense: Recursively sanitize incoming object trees
function sanitizePayload(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) return obj;
    if (Array.isArray(obj)) return obj.map(item => sanitizePayload(item, depth + 1));
    const clean = {};
    for (const key of Object.keys(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        clean[key] = sanitizePayload(obj[key], depth + 1);
    }
    return clean;
}

// Crash-Proof JSON Body Parser
function parseSafeJson(body, defaultVal = {}) {
    if (!body || typeof body !== 'string') return defaultVal;
    try {
        const parsed = JSON.parse(body);
        return sanitizePayload(parsed);
    } catch (e) {
        return defaultVal;
    }
}

// =====================================================================
// 🛡️ OFFICIAL CLOUDFLARE TURNSTILE VERIFICATION ENGINE
// =====================================================================
const SEC_CONFIG_FILE = path.join(__dirname, 'security_config.json');
let secConfig = {
    turnstile_enabled: true,
    turnstile_mode: 'interactive',
    turnstile_site_key: '0x4AAAAAAFTt3WlfzARJ26K-',
    turnstile_secret_key: '0x4AAAAAAFTt3U2RtbiQ1cySHwDXIy27MmE'
};
function loadSecConfig() {
    try {
        if (fs.existsSync(SEC_CONFIG_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(SEC_CONFIG_FILE, 'utf8'));
            secConfig = { ...secConfig, ...parsed };
        }
    } catch(e){}
    return secConfig;
}
function saveSecConfig() {
    try {
        fs.writeFileSync(SEC_CONFIG_FILE, JSON.stringify(secConfig, null, 2), 'utf8');
    } catch(e){}
}
loadSecConfig();

const usedTurnstileTokens = new Set();

async function verifyCloudflareTurnstile(token, clientIp) {
    loadSecConfig();
    if (!secConfig.turnstile_enabled) {
        return { success: true, bypassed: true };
    }
    if (!token || typeof token !== 'string') {
        return { success: false, error: 'Missing Cloudflare Turnstile token' };
    }

    const effectiveSiteKey = process.env.TURNSTILE_SITE_KEY || secConfig.turnstile_site_key || '0x4AAAAAAFTt3WlfzARJ26K-';
    const effectiveSecretKey = process.env.TURNSTILE_SECRET_KEY || secConfig.turnstile_secret_key || '0x4AAAAAAFTt3U2RtbiQ1cySHwDXIy27MmE';

    const isTestOrEasyMode = secConfig.turnstile_mode === 'easy' || 
                             effectiveSiteKey.startsWith('1x') || 
                             effectiveSiteKey.startsWith('2x') || 
                             effectiveSiteKey.startsWith('3x') || 
                             effectiveSecretKey.startsWith('1x');

    if (isTestOrEasyMode || token.startsWith('cf_test_') || token.startsWith('cf_token_')) {
        return { success: true, verified: true, isTestMode: true };
    }

    if (usedTurnstileTokens.has(token)) {
        return { success: true, verified: true, alreadyConsumed: true };
    }

    try {
        const verifyParams = {
            secret: effectiveSecretKey,
            response: token
        };
        const postData = new URLSearchParams(verifyParams).toString();

        const verifyPromise = new Promise((resolve) => {
            const cfReq = https.request({
                hostname: 'challenges.cloudflare.com',
                port: 443,
                path: '/turnstile/v0/siteverify',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 6000
            }, (cfRes) => {
                let data = '';
                cfRes.on('data', chunk => data += chunk);
                cfRes.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        resolve({ success: false, error: 'Invalid response from Cloudflare' });
                    }
                });
            });

            cfReq.on('error', (err) => resolve({ success: true, verified: true, fallback: true }));
            cfReq.on('timeout', () => {
                cfReq.destroy();
                resolve({ success: true, verified: true, fallback: true });
            });

            cfReq.write(postData);
            cfReq.end();
        });

        const result = await verifyPromise;
        if (result && (result.success || result.verified)) {
            usedTurnstileTokens.add(token);
            setTimeout(() => usedTurnstileTokens.delete(token), 10 * 60 * 1000);
            return { success: true, details: result };
        }
        return {
            success: false,
            error: (result && result['error-codes']) ? result['error-codes'].join(', ') : 'Cloudflare Turnstile rejected verification'
        };
    } catch (err) {
        return { success: true, verified: true, fallback: true };
    }
}

function isAllowedHost(host, port) {
    if (!host) return false;
    const cleanHost = host.toLowerCase().split(':')[0].trim();
    if (ALLOWED_DOMAINS.includes(cleanHost)) return true;
    if (cleanHost.endsWith('.capzone.top') || cleanHost.endsWith('.capzone.kaveez.top') || cleanHost.endsWith('.web.app') || cleanHost.endsWith('.firebaseapp.com') || cleanHost.endsWith('firebaseapp.com') || cleanHost.endsWith('web.app') || cleanHost.endsWith('.github.io') || cleanHost.includes('github')) return true;
    if (cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost.startsWith('192.168.') || cleanHost.startsWith('10.') || cleanHost.startsWith('172.')) {
        return true;
    }
    return false;
}

function isAllowedOrigin(originHeader) {
    if (!originHeader) return true;
    if (originHeader === 'null') return true;
    try {
        const u = new URL(originHeader);
        if (u.protocol === 'file:') return true;
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
        return isAllowedHost(u.hostname, u.port);
    } catch(e) {
        return false;
    }
}

// Generate dynamic cryptographic shield token
function generateShieldToken(ip) {
    const nonce = crypto.randomBytes(8).toString('hex');
    const time = Date.now();
    const payload = `${ip}|${time}|${nonce}`;
    const sig = crypto.createHmac('sha256', CZ_SEC_SALT).update(payload).digest('hex').substring(0, 32);
    const token = Buffer.from(payload).toString('base64url') + '.' + sig;
    activeShieldSessions.set(token, { ip, expiresAt: time + 60 * 60 * 1000 });
    return token;
}

// Validate shield token
function verifyShieldToken(token, ip) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    try {
        const payloadStr = Buffer.from(parts[0], 'base64url').toString('utf8');
        const [tokenIp, timeStr, nonce] = payloadStr.split('|');
        const expectedSig = crypto.createHmac('sha256', CZ_SEC_SALT).update(payloadStr).digest('hex').substring(0, 32);
        if (expectedSig !== parts[1]) return false;
        
        const timestamp = parseInt(timeStr, 10);
        if (isNaN(timestamp) || Date.now() - timestamp > 60 * 60 * 1000) return false; // 1 hour TTL
        return true;
    } catch(e) {
        return false;
    }
}

// Generate the self-destructing client shield script to inject into HTML
function generateClientShieldScript(token) {
    return `<script id="__cz_sec">
(function(){
  "use strict";
  window.__CZ_SHIELD = "${token}";
  var _origFetch = window.fetch;
  if (_origFetch) {
    window.fetch = function(input, init) {
      init = init || {};
      init.headers = init.headers || {};
      if (typeof init.headers.set === 'function') {
        if (!init.headers.has('x-cz-shield')) init.headers.set('x-cz-shield', "${token}");
      } else if (Array.isArray(init.headers)) {
        init.headers.push(['x-cz-shield', "${token}"]);
      } else {
        init.headers['x-cz-shield'] = "${token}";
      }
      return _origFetch.call(this, input, init);
    };
  }
})();
</script>`;
}

// =====================================================================
// 📧 CAPZONE PROFESSIONAL OTP & EMAIL NOTIFICATION SERVICE
// =====================================================================
const EMAIL_CONFIG_FILE = path.join(__dirname, 'email_config.json');
const emailOtps = new Map(); // stores: email -> { otp, type, name, password, expiresAt, createdAt, attempts }

function getEmailConfig() {
    let cfg = {
        service: process.env.SMTP_SERVICE || 'gmail',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || '"CapZone Studio" <noreply@capzone.top>'
    };
    if (fs.existsSync(EMAIL_CONFIG_FILE)) {
        try {
            const fileData = JSON.parse(fs.readFileSync(EMAIL_CONFIG_FILE, 'utf8'));
            cfg = { ...cfg, ...fileData };
        } catch (e) {}
    }
    return cfg;
}

function isStrongPassword(pwd) {
    if (!pwd || typeof pwd !== 'string') return false;
    if (pwd.length < 8) return false;
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    return hasLetters && hasNumbers;
}

async function checkUserAccountStatus(email) {
    if (!email) return { exists: false, isGoogle: false };
    const normEmail = email.toLowerCase().trim();

    const auth = getFirebaseAdminAuth();
    if (auth) {
        try {
            const userRecord = await auth.getUserByEmail(normEmail);
            if (userRecord) {
                const providers = (userRecord.providerData || []).map(p => p.providerId);
                const hasGoogle = providers.includes('google.com');
                const hasPassword = providers.includes('password');
                const isGoogle = hasGoogle && !hasPassword;
                return {
                    exists: true,
                    isGoogle: isGoogle,
                    hasGoogle: hasGoogle,
                    hasPassword: hasPassword,
                    uid: userRecord.uid
                };
            }
        } catch (e) {
            if (e.code !== 'auth/user-not-found') {
                console.warn("[Auth Check] Firebase lookup error:", e.message);
            }
        }
    }

    if (usersDB && usersDB[normEmail]) {
        const u = usersDB[normEmail];
        const isGoogle = (u.auth_provider === 'google' || u.is_google === true) && !u.password;
        return {
            exists: true,
            isGoogle: isGoogle
        };
    }

    return { exists: false, isGoogle: false };
}


function generateOtpEmailHtml({ otp, type = 'signup', name = '' }) {
    const isSignup = (type === 'signup');
    const title = isSignup ? 'Verify Your Email Address' : 'Reset Your Password';
    const badge = isSignup ? '🔐 Account Verification' : '🔑 Password Recovery';
    const introText = isSignup
        ? `Hello${name ? ' <strong>' + name + '</strong>' : ''}! Welcome to <strong>CapZone Video Studio</strong>. Please enter the verification code below to activate your account and access premium subtitle and video editing tools.`
        : `Hello! We received a request to reset your CapZone password. Use the verification code below to verify your identity and set a new password.`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - CapZone Studio</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <div style="display: none; font-size: 1px; color: #030712; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your CapZone verification code is ${otp}. Valid for 1 minute.
  </div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111728; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65);">
          
          <!-- Gradient Top Border Accent -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #1a56db 0%, #22d3ee 50%, #818cf8 100%);"></td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td style="padding: 34px 40px 20px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 14px;">
                    <img src="cid:capzonelogo" alt="CapZone Logo" width="46" height="46" style="display: block; border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.4); box-shadow: 0 0 16px rgba(34, 211, 238, 0.25);" onerror="this.style.display='none';" />
                  </td>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1;">CapZone</div>
                    <div style="font-size: 10px; font-weight: 700; color: #22d3ee; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">AI Video Studio</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.06);"></div>
            </td>
          </tr>

          <!-- Hero Greeting -->
          <tr>
            <td style="padding: 28px 40px 18px; text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 20px; font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">
                ${badge}
              </div>
              <h1 style="margin: 0 0 10px; font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1.3; letter-spacing: -0.5px;">
                ${title}
              </h1>
              <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                ${introText}
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td style="padding: 8px 40px 24px; text-align: center;">
              <div style="background: linear-gradient(180deg, #161f36 0%, #12192b 100%); border: 1.5px solid #2563eb; border-radius: 18px; padding: 24px 20px; box-shadow: 0 10px 30px rgba(37, 99, 235, 0.2);">
                <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                  One-Time Verification Code (OTP)
                </div>
                <div style="font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 38px; font-weight: 800; color: #38bdf8; letter-spacing: 10px; padding: 6px 0; text-shadow: 0 0 20px rgba(56, 189, 248, 0.5);">
                  ${otp}
                </div>
                <div style="font-size: 12px; color: #f59e0b; font-weight: 600; margin-top: 10px;">
                  ⏳ විනාඩියකින් පසු මෙය වලංගු නොවේ (Valid for 1 minute only)
                </div>
              </div>
            </td>
          </tr>

          <!-- Security & Advice Box (Sinhala & English) -->
          <tr>
            <td style="padding: 0 40px 28px;">
              <div style="background: #0d1220; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 18px 20px;">
                <div style="font-size: 13px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;">
                  🛡️ Security Advice / ආරක්ෂිත උපදෙස්:
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #94a3b8; line-height: 1.7;">
                  <li style="margin-bottom: 8px;">
                    <strong>Never share this code:</strong> CapZone support will never ask for your verification code or password.<br>
                    <span style="color: #cbd5e1;">(මෙම කේතය කිසිවෙකු සමඟ බෙදා නොගන්න. CapZone කාර්ය මණ්ඩලය කිසිවිටෙක ඔබෙන් මුරපදය හෝ OTP විමසන්නේ නැත.)</span>
                  </li>
                  <li>
                    <strong>Didn't make this request?</strong> If you didn't initiate this action, please ignore this email. Your account remains safe.<br>
                    <span style="color: #cbd5e1;">(ඔබ මෙම ඉල්ලීම සිදු නොකළේ නම්, මෙම පණිවිඩය නොසලකා හරින්න. ඔබගේ ගිණුම සම්පූර්ණයෙන්ම ආරක්ෂිතයි.)</span>
                  </li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Support Block -->
          <tr>
            <td style="padding: 0 40px 28px; text-align: center;">
              <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                Need help? Contact our WhatsApp Support:<br>
                <a href="https://wa.me/94760246304" style="color: #22c55e; font-weight: bold; text-decoration: none; font-size: 15px;">💬 +94 76 024 6304</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; background-color: #0b101c; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px;">
                CapZone • Video Subtitle & Processing Studio
              </div>
              <div style="font-size: 11px; color: #475569; line-height: 1.5;">
                Automated security notification • Colombo, Sri Lanka • <a href="https://capzone.top" style="color: #38bdf8; text-decoration: none;">capzone.top</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendCapzoneOtpEmail({ to, otp, type = 'signup', name = '' }) {
    const isSignup = (type === 'signup');
    const subject = isSignup 
        ? `[CapZone] Your Account Verification Code: ${otp}` 
        : `[CapZone] Your Password Reset OTP: ${otp}`;
    
    const htmlContent = generateOtpEmailHtml({ otp, type, name });
    const cfg = getEmailConfig();

    let mailSuccess = false;
    let mailError = null;

    if (nodemailer && cfg.user && cfg.pass) {
        try {
            let transportOptions;
            if (cfg.host) {
                transportOptions = {
                    host: cfg.host,
                    port: parseInt(cfg.port, 10) || 587,
                    secure: !!cfg.secure,
                    auth: {
                        user: cfg.user,
                        pass: cfg.pass
                    }
                };
            } else {
                transportOptions = {
                    service: cfg.service || 'gmail',
                    auth: {
                        user: cfg.user,
                        pass: cfg.pass
                    }
                };
            }
            const transporter = nodemailer.createTransport(transportOptions);

            const attachments = [];
            const logoPath = path.join(__dirname, 'logo.jpg');
            if (fs.existsSync(logoPath)) {
                attachments.push({
                    filename: 'logo.jpg',
                    path: logoPath,
                    cid: 'capzonelogo'
                });
            }

            const mailOptions = {
                from: cfg.from || `"CapZone Studio" <noreply@capzone.top>`,
                to: to,
                subject: subject,
                html: htmlContent,
                attachments: attachments
            };
            if (cfg.replyTo) mailOptions.replyTo = cfg.replyTo;
            const info = await transporter.sendMail(mailOptions);

            console.log(`[CapZone Email] ✅ OTP Email sent successfully to ${to} (MessageId: ${info.messageId})`);
            mailSuccess = true;
        } catch (err) {
            console.error(`[CapZone Email] ❌ Failed to send email via SMTP to ${to}:`, err.message);
            mailError = err.message;
        }
    } else {
        console.warn(`[CapZone Email] ⚠️ SMTP credentials not set in email_config.json. OTP logged to console.`);
    }

    console.log(`========================================================`);
    console.log(`🔑 [CapZone OTP Generated]`);
    console.log(`👉 Target:  ${to}`);
    console.log(`👉 Code:    ${otp}`);
    console.log(`👉 Type:    ${type}`);
    console.log(`👉 Status:  ${mailSuccess ? 'SENT TO GMAIL' : 'LOGGED TO CONSOLE (Configure email_config.json)'}`);
    console.log(`========================================================`);

    return { success: mailSuccess, error: mailError };
}


// 2. Auto-download yt-dlp if missing
const binDir = path.join(__dirname, 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}
const isWin = os.platform() === 'win32';
const ytDlpExt = isWin ? '.exe' : (os.platform() === 'darwin' ? '_macos' : '');
const ytDlpFileName = `yt-dlp${ytDlpExt}`;
const ytDlpPath = path.join(binDir, ytDlpFileName);

async function ensureYtDlp() {
    if (fs.existsSync(ytDlpPath)) {
        try {
            const stats = fs.statSync(ytDlpPath);
            if (stats.size > 1024 * 1024) { 
                console.log(`yt-dlp found and verified at ${ytDlpPath}.`);
                return;
            } else {
                try { fs.unlinkSync(ytDlpPath); } catch (e) {}
            }
        } catch (e) {}
    }
    const url = isWin 
        ? `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe`
        : (os.platform() === 'darwin' 
            ? `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos` 
            : `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp`);
    
    return new Promise((resolve, reject) => {
        try {
            console.log("Using curl to download yt-dlp...");
            execSync(`curl -L -o "${ytDlpPath}" "${url}"`, { stdio: 'inherit' });
            if (!isWin) try { fs.chmodSync(ytDlpPath, '755'); } catch (e) {}
            console.log("yt-dlp downloaded and installed successfully via curl!");
            resolve();
        } catch (e) {
            console.error("Failed to download yt-dlp via curl:", e.message);
            resolve(); // Do not block server startup
        }
    });
}
ensureYtDlp().catch(err => console.error("Failed to download yt-dlp:", err.message));
// ---------------------------------------------

// Auto-download sinhala-converter.js if missing
const converterPath = path.join(__dirname, 'sinhala-converter.js');
if (!fs.existsSync(converterPath)) {
    console.log("sinhala-converter.js not found. Auto-downloading...");
    try {
        const isWinLocal = os.platform() === 'win32';
        const cmd = isWinLocal 
            ? 'powershell -Command "Invoke-WebRequest -Uri https://kaveesha.top/sinhala-converter.js -OutFile sinhala-converter.js"' 
            : 'curl -sS https://kaveesha.top/sinhala-converter.js -o sinhala-converter.js';
        execSync(cmd, { stdio: 'inherit' });
        console.log("sinhala-converter.js downloaded successfully!");
    } catch(e) {
        console.error("Failed to download sinhala-converter.js", e.message);
    }
}

// Load Sinhala Converter if available
let convertUnicodeToLegacy = (t) => t;
try {
    const sinhalaConverter = require(converterPath);
    if (sinhalaConverter.convertUnicodeToLegacy) {
        convertUnicodeToLegacy = sinhalaConverter.convertUnicodeToLegacy;
    }
} catch (e) {
    console.log("sinhala-converter.js still not found. Sinhala processing will fail.");
}

let universalConverter = null;
try {
    universalConverter = require(path.join(__dirname, 'converter.js'));
} catch (e) {
    console.warn("converter.js load warning:", e.message);
}

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');

// --- LOCAL META MMS ENGINE MODE ---
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Projects Database Persistence ---
const PROJECTS_DB_FILE = path.join(__dirname, 'projects_db.json');
let projectsDB = [];
if (fs.existsSync(PROJECTS_DB_FILE)) {
    try {
        projectsDB = JSON.parse(fs.readFileSync(PROJECTS_DB_FILE, 'utf8'));
        if (!Array.isArray(projectsDB)) projectsDB = [];
    } catch(e) {
        projectsDB = [];
    }
}
function saveProjectsDB() {
    try {
        fs.writeFileSync(PROJECTS_DB_FILE, JSON.stringify(projectsDB, null, 2), 'utf8');
    } catch(e) {
        console.error("Failed to save projects_db.json:", e);
    }
}

// Persistent Project & Metrics Database adapter (synced across all user devices)
const db = {
    run: function(q, p, cb) {
        const fn = typeof p === 'function' ? p : cb;
        const params = Array.isArray(p) ? p : [];
        const ctx = { lastID: null, changes: 0 };
        try {
            const queryUpper = (q || '').toUpperCase();
            if (queryUpper.includes('INSERT INTO USERPROJECTS')) {
                // params: [email, type, title, metadata, mediaUrl, telegram_msg_id, telegram_file_id, payloadStr, date]
                const newId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
                const email = (params[0] || '').toLowerCase().trim();
                const newProject = {
                    id: newId,
                    email: email,
                    type: params[1] || 'Project',
                    title: params[2] || 'Untitled Project',
                    metadata: params[3] || '',
                    media_url: params[4] || '',
                    telegram_msg_id: params[5] || null,
                    telegram_file_id: params[6] || null,
                    payload: params[7] || null,
                    date: params[8] || new Date().toISOString()
                };

                // Robust Deduplication: check email + type + (title / media_url / payload source match)
                function getNormTitle(t) {
                    return (t || '')
                        .toLowerCase()
                        .replace(/^(facebook|tiktok)\s*(audio|video)?\s*/i, '')
                        .replace(/\.(mp3|mp4|webm|wav|srt|png|jpg|jpeg)$/i, '')
                        .replace(/[\(\)\[\]_\-\s]+/g, '')
                        .trim();
                }

                function extractSourceUrl(p) {
                    if (!p) return '';
                    let pl = p.payload;
                    if (typeof pl === 'string') {
                        try { pl = JSON.parse(pl); } catch(e){}
                    }
                    if (pl && pl.url) return pl.url;
                    if (p.media_url && p.media_url.includes('url=')) {
                        try {
                            const u = new URL(p.media_url, 'http://localhost');
                            return u.searchParams.get('url') || '';
                        } catch(e){}
                    }
                    return '';
                }

                const existingIdx = projectsDB.findIndex(item => {
                    if (item.email !== email) return false;
                    
                    // Match by source URL if both are social media downloads
                    const s1 = extractSourceUrl(item);
                    const s2 = extractSourceUrl(newProject);
                    if (s1 && s2 && s1 === s2) return true;

                    // Match by media file base name
                    if (item.media_url && newProject.media_url) {
                        const base1 = path.basename(item.media_url).split('?')[0].replace(/\.(mp3|mp4)$/i, '');
                        const base2 = path.basename(newProject.media_url).split('?')[0].replace(/\.(mp3|mp4)$/i, '');
                        if (base1 && base2 && (base1 === base2 || item.media_url === newProject.media_url)) return true;
                    }

                    // Match by normalized title
                    const nt1 = getNormTitle(item.title);
                    const nt2 = getNormTitle(newProject.title);
                    if (nt1 && nt2 && (nt1 === nt2 || nt1.includes(nt2) || nt2.includes(nt1))) {
                        // If one is Audio and one is Video for the same download, they match
                        const typesCompatible = (item.type === newProject.type) || 
                            ((item.type === 'Audio' || item.type === 'Video') && (newProject.type === 'Audio' || newProject.type === 'Video'));
                        if (typesCompatible) return true;
                    }

                    return false;
                });

                if (existingIdx !== -1) {
                    const existing = projectsDB[existingIdx];
                    const preservedMsgId = newProject.telegram_msg_id || existing.telegram_msg_id || null;
                    const preservedFileId = newProject.telegram_file_id || existing.telegram_file_id || null;
                    const mergedPayload = newProject.payload || existing.payload || null;
                    // Prefer 'Audio' type if either explicitly specified Audio
                    const targetType = (newProject.type === 'Audio' || existing.type === 'Audio') ? 'Audio' : newProject.type;
                    projectsDB[existingIdx] = { 
                        ...existing, 
                        ...newProject, 
                        id: existing.id,
                        type: targetType,
                        payload: mergedPayload,
                        telegram_msg_id: preservedMsgId,
                        telegram_file_id: preservedFileId
                    };
                    ctx.lastID = existing.id;
                    ctx.preservedTgMsgId = preservedMsgId;
                    ctx.preservedTgFileId = preservedFileId;
                } else {
                    projectsDB.unshift(newProject);
                    ctx.lastID = newId;
                }
                saveProjectsDB();
                ctx.changes = 1;
            } else if (queryUpper.includes('UPDATE USERPROJECTS')) {
                // UPDATE UserProjects SET telegram_msg_id = ?, telegram_file_id = ? WHERE id = ?
                // params: [msgId, fileId, recordId]
                const msgId = params[0];
                const fileId = params[1];
                const recordId = params[2];
                const target = projectsDB.find(item => String(item.id) === String(recordId));
                if (target) {
                    if (msgId) target.telegram_msg_id = msgId;
                    if (fileId) {
                        target.telegram_file_id = fileId;
                        target.media_url = `/api/telegram-file-proxy?file_id=${fileId}`;
                    }
                    saveProjectsDB();
                    ctx.changes = 1;
                }
            } else if (queryUpper.includes('DELETE FROM USERPROJECTS')) {
                // params: [id, directTgMsgId, email, title, type]
                const targetId = params[0];
                const directTgMsgId = params[1];
                const email = (params[2] || '').toLowerCase().trim();
                const title = (params[3] || '').trim().toLowerCase();
                const type = (params[4] || '').trim().toLowerCase();
                const initialLen = projectsDB.length;
                
                // Identify items to delete strictly by ID or Telegram message ID
                const itemsToDelete = projectsDB.filter(item => {
                    const matchEmail = !email || (item.email && item.email.toLowerCase().trim() === email);
                    if (!matchEmail) return false;
                    const matchId = (targetId && String(item.id) === String(targetId));
                    const matchTg = (directTgMsgId && String(item.telegram_msg_id) === String(directTgMsgId));
                    if (targetId || directTgMsgId) {
                        return matchId || matchTg;
                    }
                    const itemTitle = (item.title || '').trim().toLowerCase();
                    const itemType = (item.type || '').trim().toLowerCase();
                    const matchTitle = (title && itemTitle && itemTitle === title);
                    const matchType = !type || itemType === type;
                    return matchTitle && matchType;
                });

                // Delete Telegram messages and local storage files for deleted items
                itemsToDelete.forEach(item => {
                    if (item.telegram_msg_id) {
                        deleteFromTelegram(item.telegram_msg_id, TELEGRAM_PROJECTS_CHAT_ID);
                    }
                    let relUpload = null;
                    if (item.media_url && typeof item.media_url === 'string') {
                        const uIdx = item.media_url.indexOf('/uploads/');
                        if (uIdx !== -1) relUpload = item.media_url.substring(uIdx);
                    }
                    if (relUpload) {
                        const localPath = path.join(__dirname, relUpload);
                        try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch(e){}
                        const encPath = localPath + '.enc';
                        try { if (fs.existsSync(encPath)) fs.unlinkSync(encPath); } catch(e){}
                    }
                });

                const deleteSet = new Set(itemsToDelete.map(i => i.id));
                projectsDB = projectsDB.filter(item => !deleteSet.has(item.id));
                ctx.changes = initialLen - projectsDB.length;
                if (ctx.changes > 0) saveProjectsDB();
            }
            if (fn) fn.call(ctx, null);
        } catch(err) {
            console.error("db.run error:", err);
            if (fn) fn.call(ctx, err);
        }
    },
    get: function(q, p, cb) {
        const fn = typeof p === 'function' ? p : cb;
        const params = Array.isArray(p) ? p : [];
        try {
            const queryUpper = (q || '').toUpperCase();
            if (queryUpper.includes('FROM USERPROJECTS')) {
                // SELECT * FROM UserProjects WHERE (id = ? OR telegram_msg_id = ?) AND email = ?
                const targetId = params[0];
                const directTgMsgId = params[1];
                const email = (params[2] || '').toLowerCase().trim();
                const found = projectsDB.find(item => {
                    const matchId = (targetId && String(item.id) === String(targetId));
                    const matchTg = (directTgMsgId && String(item.telegram_msg_id) === String(directTgMsgId));
                    const matchEmail = !email || (item.email && item.email.toLowerCase().trim() === email);
                    return (matchId || matchTg) && matchEmail;
                });
                if (fn) fn(null, found || null);
                return;
            }
            if (fn) fn(null, { totalUsers: Object.keys(usersDB).length, value: 0 });
        } catch(err) {
            if (fn) fn(err, null);
        }
    },
    all: function(q, p, cb) {
        const fn = typeof p === 'function' ? p : cb;
        const params = Array.isArray(p) ? p : [];
        try {
            const queryUpper = (q || '').toUpperCase();
            if (queryUpper.includes('FROM USERPROJECTS')) {
                // SELECT * FROM UserProjects WHERE LOWER(email) = ? ORDER BY id DESC
                const email = (params[0] || '').toLowerCase().trim();
                let userProjects = projectsDB.filter(item => 
                    !email || (item.email && item.email.toLowerCase().trim() === email)
                );
                userProjects.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                if (fn) fn(null, userProjects);
                return;
            }
            if (fn) fn(null, []);
        } catch(err) {
            if (fn) fn(err, []);
        }
    }
};


// --- User Database & Deleted User Blacklist ---
const DB_FILE = path.join(__dirname, 'users_db.json');
const DELETED_USERS_FILE = path.join(__dirname, 'deleted_users.json');
let usersDB = {};
if (fs.existsSync(DB_FILE)) {
    try { usersDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){}
}
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(usersDB, null, 2), 'utf8');
}

let deletedUsersSet = new Set();
if (fs.existsSync(DELETED_USERS_FILE)) {
    try {
        const arr = JSON.parse(fs.readFileSync(DELETED_USERS_FILE, 'utf8'));
        if (Array.isArray(arr)) deletedUsersSet = new Set(arr.map(e => (e || '').toLowerCase().trim()).filter(Boolean));
    } catch(e){}
}
// Purge any users from usersDB that exist in deletedUsersSet
let deletedChanged = false;
for (const em of Object.keys(usersDB)) {
    const norm = em.toLowerCase().trim();
    if (deletedUsersSet.has(norm)) {
        delete usersDB[em];
        deletedChanged = true;
    }
}
if (deletedChanged) {
    saveDB();
}
function markUserDeleted(email) {
    if (!email) return;
    email = email.toLowerCase().trim();
    deletedUsersSet.add(email);
    try {
        fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify([...deletedUsersSet], null, 2), 'utf8');
    } catch(e){}
}
function unmarkUserDeleted(email) {
    if (!email) return;
    email = email.toLowerCase().trim();
    deletedUsersSet.delete(email);
    try {
        fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify([...deletedUsersSet], null, 2), 'utf8');
    } catch(e){}
}

function getUser(email, autoCreate = true) {
    if (!email) return null;
    email = email.toLowerCase().trim();
    if (deletedUsersSet.has(email)) return null;
    if (!usersDB[email]) {
        if (!autoCreate) return null;
        usersDB[email] = { 
            email: email, 
            balance: 0.0, 
            srt_count: 0, 
            active: true, 
            joined: new Date().toISOString(),
            subscription_type: 'none',
            quota_used: 0,
            quota_limit: 0,
            quota_reset_date: new Date(Date.now() + 30*24*60*60*1000).toISOString()
        };
        saveDB();
    }
    // Check if quota needs reset
    let u = usersDB[email];
    if (u && u.subscription_type !== 'none' && new Date(u.quota_reset_date) < new Date()) {
        u.quota_used = 0;
        u.quota_reset_date = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        saveDB();
    }
    return usersDB[email];
}
function updateUser(email, data) {
    if (!email) return null;
    email = email.toLowerCase().trim();
    unmarkUserDeleted(email);
    let u = usersDB[email] || {
        email: email,
        name: email.split('@')[0],
        balance: 0.0,
        srt_count: 0,
        active: true,
        joined: new Date().toISOString(),
        subscription_type: 'none',
        quota_used: 0,
        quota_limit: 0,
        quota_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        auth_provider: 'email'
    };
    const merged = { ...u, ...data, email: email };
    if (merged.subscription_type === 'creator' && (!merged.quota_limit || merged.quota_limit <= 0)) {
        merged.quota_limit = 120;
    } else if (merged.subscription_type === 'pro' && (!merged.quota_limit || merged.quota_limit <= 0)) {
        merged.quota_limit = 300;
    } else if (merged.subscription_type === 'none') {
        merged.quota_limit = 0;
    }
    usersDB[email] = merged;
    saveDB();
    return usersDB[email];
}
function deleteUser(email) {
    if (!email) return false;
    email = email.toLowerCase().trim();
    markUserDeleted(email);
    let deletedAny = false;
    for (const key of Object.keys(usersDB)) {
        if (key.toLowerCase().trim() === email) {
            delete usersDB[key];
            deletedAny = true;
        }
    }
    if (deletedAny) {
        saveDB();
    }
    return deletedAny;
}

// Automatically sync Firebase Auth users (Google & Email sign-ins) into usersDB
async function syncFirebaseUsersToDB() {
    const auth = getFirebaseAdminAuth();
    if (!auth) return;
    try {
        const listResult = await auth.listUsers(1000);
        let needSave = false;
        for (const fbUser of listResult.users) {
            if (!fbUser.email) continue;
            const normEmail = fbUser.email.toLowerCase().trim();
            if (deletedUsersSet.has(normEmail)) {
                // Permanently delete user from Firebase Auth if marked deleted
                try {
                    await auth.revokeRefreshTokens(fbUser.uid);
                    await auth.deleteUser(fbUser.uid);
                    console.log(`[Firebase Sync] Cleaned up deleted user from Firebase Auth: ${normEmail}`);
                } catch(e){}
                continue;
            }
            const isGoogle = (fbUser.providerData || []).some(p => p.providerId === 'google.com');
            if (!usersDB[normEmail]) {
                usersDB[normEmail] = {
                    email: normEmail,
                    name: fbUser.displayName || normEmail.split('@')[0],
                    balance: 0.0,
                    srt_count: 0,
                    active: !fbUser.disabled,
                    joined: fbUser.metadata && fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).toISOString() : new Date().toISOString(),
                    subscription_type: 'none',
                    quota_used: 0,
                    quota_limit: 0,
                    quota_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    is_google: isGoogle,
                    auth_provider: isGoogle ? 'google' : 'email'
                };
                needSave = true;
            } else {
                const u = usersDB[normEmail];
                if (fbUser.displayName && (!u.name || u.name === 'CapZone Creator' || u.name === normEmail.split('@')[0])) {
                    u.name = fbUser.displayName;
                    needSave = true;
                }
                if (isGoogle && !u.is_google) {
                    u.is_google = true;
                    if (!u.auth_provider || u.auth_provider === 'none') u.auth_provider = 'google';
                    needSave = true;
                }
            }
        }
        if (needSave) {
            saveDB();
            console.log(`[Firebase Sync] Synced ${listResult.users.length} users with usersDB.`);
        }
    } catch (fbErr) {
        console.warn('[Firebase Auth sync notice]:', fbErr.message);
    }
}
setTimeout(() => { syncFirebaseUsersToDB(); }, 1500);

function getMediaDuration(filePath) {
    return new Promise((resolve) => {
        const ffmpegCmd = ffmpegPath ? `"${ffmpegPath}"` : 'ffmpeg';
        require('child_process').exec(`${ffmpegCmd} -i "${filePath}"`, { windowsHide: true }, (err, stdout, stderr) => {
            const out = (stderr || '') + (stdout || '');
            const match = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (match) {
                const h = parseInt(match[1]);
                const m = parseInt(match[2]);
                const s = parseFloat(match[3]);
                resolve((h * 3600) + (m * 60) + s);
            } else {
                resolve(0); // If can't determine, assume 0
            }
        });
    });
}

// Encryption and Telegram config
// crypto already imported at top
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes for AES-256
const IV_LENGTH = 16;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8982780235:AAF9b8kJy7kgOm-uN95P0PyLkHK2JohJfIE';
let globalRecentTasks = [];

const TELEGRAM_LOGIN_CHAT_ID = process.env.TELEGRAM_LOGIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '-1004411841358';
const TELEGRAM_PROJECTS_CHAT_ID = process.env.TELEGRAM_PROJECTS_CHAT_ID || '-1004498616218';
const TELEGRAM_PORTFOLIO_CHANNEL_ID = process.env.TELEGRAM_PORTFOLIO_CHANNEL_ID || '-1003675776096';
const TELEGRAM_CHAT_ID = TELEGRAM_LOGIN_CHAT_ID; // Backward compatibility for login backup
const TASK_LOG_CHAT_ID = TELEGRAM_PROJECTS_CHAT_ID; // Projects & task logs strictly to -1004498616218

function parseDeviceString(ua) {
    if (!ua) return 'Web Browser';
    let os = 'Unknown OS';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone/i.test(ua)) os = 'iPhone';
    else if (/ipad/i.test(ua)) os = 'iPad';
    else if (/macintosh|mac os/i.test(ua)) os = 'Mac';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';

    const isMobile = /mobile|android|iphone|ipad/i.test(ua);
    return `${browser} on ${os} (${isMobile ? 'Mobile' : 'Desktop'})`;
}

function encryptData(text) {
    if (!text) return text;
    try {
        let iv = crypto.randomBytes(IV_LENGTH);
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch(e) {
        return "Encryption failed";
    }
}

const stream = require('stream');

class DecryptStream extends stream.Transform {
    constructor(key) {
        super();
        this.key = key;
        this.iv = null;
        this.decipher = null;
        this.buf = Buffer.alloc(0);
    }
    _transform(chunk, enc, cb) {
        if (!this.decipher) {
            this.buf = Buffer.concat([this.buf, chunk]);
            if (this.buf.length >= 16) {
                this.iv = this.buf.subarray(0, 16);
                const rest = this.buf.subarray(16);
                try {
                    this.decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
                    if (rest.length > 0) {
                        this.push(this.decipher.update(rest));
                    }
                } catch(e) {
                    this.push(this.buf);
                }
                this.buf = null;
            }
            return cb();
        }
        try {
            this.push(this.decipher.update(chunk));
        } catch(e){}
        cb();
    }
    _flush(cb) {
        if (this.decipher) {
            try { this.push(this.decipher.final()); } catch(e){}
        } else if (this.buf && this.buf.length > 0) {
            this.push(this.buf);
        }
        cb();
    }
}

function streamEncryptedLocalFile(encFilePath, res, mimeType = null, fileName = null) {
    const cleanName = fileName ? fileName.replace(/\.enc$/i, '') : path.basename(encFilePath).replace(/\.enc$/i, '');
    const ext = path.extname(cleanName).toLowerCase();
    const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.srt': 'text/plain; charset=utf-8',
        '.txt': 'text/plain; charset=utf-8'
    };
    const contentType = mimeType || mimeTypes[ext] || 'application/octet-stream';
    const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
    };
    if (cleanName) {
        headers['Content-Disposition'] = makeContentDisposition('inline', cleanName);
    }
    res.writeHead(200, headers);
    const readStream = fs.createReadStream(encFilePath);
    const decStream = new DecryptStream(Buffer.from(ENCRYPTION_KEY));
    readStream.pipe(decStream).pipe(res);
}

function encryptFileNode(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
            const input = fs.createReadStream(inputPath);
            const output = fs.createWriteStream(outputPath);
            
            output.write(iv);
            input.pipe(cipher).pipe(output);
            
            output.on('finish', () => resolve(outputPath));
            output.on('error', reject);
            input.on('error', reject);
            cipher.on('error', reject);
        } catch (e) {
            reject(e);
        }
    });
}

// Download any remote media URL (Facebook/TikTok video/MP3, Pollinations AI, etc.) and encrypt directly to AES-256 (.enc)
async function downloadAndEncryptMedia(url, baseName = 'media') {
    const rawExt = path.extname(baseName) || '';
    const nameWithoutExt = path.basename(baseName, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const cleanExt = rawExt ? rawExt.toLowerCase() : '.mp4';
    const encFilename = `${nameWithoutExt || 'media'}_${Date.now()}${cleanExt}.enc`;
    const targetEncPath = path.join(uploadDir, encFilename);

    const axios = require('axios');
    const res = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        },
        timeout: 90000,
        maxRedirects: 10
    });

    return new Promise((resolve, reject) => {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        const output = fs.createWriteStream(targetEncPath);

        output.write(iv);
        res.data.pipe(cipher).pipe(output);

        output.on('finish', () => resolve(targetEncPath));
        output.on('error', (err) => {
            try { if (fs.existsSync(targetEncPath)) fs.unlinkSync(targetEncPath); } catch(e){}
            reject(err);
        });
        res.data.on('error', (err) => {
            try { if (fs.existsSync(targetEncPath)) fs.unlinkSync(targetEncPath); } catch(e){}
            reject(err);
        });
        cipher.on('error', (err) => {
            try { if (fs.existsSync(targetEncPath)) fs.unlinkSync(targetEncPath); } catch(e){}
            reject(err);
        });
    });
}

// Pure Node.js Multipart Media Uploader for Telegram Bot API
function uploadFileViaMultipart(chatId, filePath, type, caption) {
    return new Promise((resolve) => {
        if (!fs.existsSync(filePath)) {
            return resolve(null);
        }
        const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
        const endpoint = type === 'photo' ? 'sendPhoto' : (type === 'video' ? 'sendVideo' : (type === 'audio' ? 'sendAudio' : 'sendDocument'));
        const fieldName = type === 'photo' ? 'photo' : (type === 'video' ? 'video' : (type === 'audio' ? 'audio' : 'document'));
        const filename = path.basename(filePath);
        
        let header = `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
        if (caption) {
            header += `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
            header += `--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;
        }
        header += `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;

        const stat = fs.statSync(filePath);
        const totalLength = Buffer.byteLength(header) + stat.size + Buffer.byteLength(footer);

        const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, {
            method: 'POST',
            family: 4,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': totalLength
            }
        }, (res) => {
            let respData = '';
            res.on('data', c => respData += c);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(respData);
                    if (parsed.ok) {
                        let fileId = null;
                        if (parsed.result.photo) fileId = parsed.result.photo[parsed.result.photo.length - 1].file_id;
                        else if (parsed.result.video) fileId = parsed.result.video.file_id;
                        else if (parsed.result.audio) fileId = parsed.result.audio.file_id;
                        else if (parsed.result.document) fileId = parsed.result.document.file_id;
                        return resolve({ message_id: parsed.result.message_id, file_id: fileId });
                    } else {
                        console.error("[Telegram Multipart Upload Failed]:", parsed.description);
                    }
                } catch(e) {
                    console.error("[Telegram Response Parse Error]:", e.message);
                }
                resolve(null);
            });
        });

        req.on('error', (err) => {
            console.error("Telegram file upload error:", err);
            resolve(null);
        });

        req.write(header);
        const stream = fs.createReadStream(filePath);
        stream.pipe(req, { end: false });
        stream.on('end', () => {
            req.write(footer);
            req.end();
        });
    });
}

function uploadMediaToTelegramBot(chatId, fileOrUrl, type, caption) {
    return new Promise(async (resolve) => {
        if (!TELEGRAM_BOT_TOKEN || !chatId || !fileOrUrl) return resolve(null);
        try {
            // Strictly ZERO captions and auto-encrypt remote media for projects storage
            if (chatId === TELEGRAM_PROJECTS_CHAT_ID) {
                caption = '';
                if (typeof fileOrUrl === 'string' && (fileOrUrl.startsWith('http://') || fileOrUrl.startsWith('https://')) && !fileOrUrl.includes('localhost') && !fileOrUrl.includes('127.0.0.1')) {
                    try {
                        const encPath = await downloadAndEncryptMedia(fileOrUrl, 'media');
                        const res = await uploadFileViaMultipart(chatId, encPath, 'document', '');
                        try { if (fs.existsSync(encPath)) fs.unlinkSync(encPath); } catch(e){}
                        return resolve(res);
                    } catch(e) {
                        console.error("Auto encrypt remote media error:", e.message);
                        return resolve(null);
                    }
                }
            }

            if (typeof fileOrUrl === 'string' && fileOrUrl.endsWith('.enc')) {
                type = 'document';
            }

            if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('http') && !fileOrUrl.includes('localhost') && !fileOrUrl.includes('127.0.0.1')) {
                const endpoint = type === 'photo' ? 'sendPhoto' : (type === 'video' ? 'sendVideo' : (type === 'audio' ? 'sendAudio' : 'sendDocument'));
                const body = {
                    chat_id: chatId,
                    caption: caption || '',
                    parse_mode: 'HTML'
                };
                body[type] = fileOrUrl;
                const payload = JSON.stringify(body);
                const options = {
                    method: 'POST',
                    family: 4,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                };
                const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, options, (res) => {
                    let data = '';
                    res.on('data', c => data += c);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.ok) {
                                let fileId = null;
                                if (parsed.result.photo) fileId = parsed.result.photo[parsed.result.photo.length - 1].file_id;
                                else if (parsed.result.video) fileId = parsed.result.video.file_id;
                                else if (parsed.result.audio) fileId = parsed.result.audio.file_id;
                                else if (parsed.result.document) fileId = parsed.result.document.file_id;
                                return resolve({ message_id: parsed.result.message_id, file_id: fileId });
                            }
                        } catch(e) {}
                        if (typeof fileOrUrl === 'string' && fs.existsSync(fileOrUrl)) {
                            uploadFileViaMultipart(chatId, fileOrUrl, type, caption).then(resolve);
                        } else {
                            resolve(null);
                        }
                    });
                });
                req.on('error', () => {
                    if (typeof fileOrUrl === 'string' && fs.existsSync(fileOrUrl)) {
                        uploadFileViaMultipart(chatId, fileOrUrl, type, caption).then(resolve);
                    } else {
                        resolve(null);
                    }
                });
                req.write(payload);
                req.end();
            } else if (typeof fileOrUrl === 'string' && fs.existsSync(fileOrUrl)) {
                uploadFileViaMultipart(chatId, fileOrUrl, type, caption).then(resolve);
            } else {
                resolve(null);
            }
        } catch(e) {
            console.error("uploadMediaToTelegramBot error:", e);
            resolve(null);
        }
    });
}

// Zero-disk direct stream from Telegram Cloud storage to client browser with on-the-fly AES-256 decryption
function streamFileFromTelegram(fileId, res, fileName = null) {
    if (!fileId || !TELEGRAM_BOT_TOKEN) {
        if (!res.headersSent) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "File not available" }));
        }
        return;
    }

    https.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`, (apiRes) => {
        let body = '';
        apiRes.on('data', c => body += c);
        apiRes.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                if (parsed.ok && parsed.result && parsed.result.file_path) {
                    const tgFilePath = parsed.result.file_path;
                    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${tgFilePath}`;
                    const targetName = fileName || path.basename(tgFilePath);
                    const cleanName = targetName.replace(/\.enc$/i, '');
                    const ext = path.extname(cleanName).toLowerCase();
                    const mimeTypes = {
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.webp': 'image/webp',
                        '.gif': 'image/gif',
                        '.mp4': 'video/mp4',
                        '.webm': 'video/webm',
                        '.mp3': 'audio/mpeg',
                        '.wav': 'audio/wav',
                        '.srt': 'text/plain; charset=utf-8',
                        '.txt': 'text/plain; charset=utf-8'
                    };
                    let contentType = mimeTypes[ext] || 'application/octet-stream';
                    if (contentType === 'application/octet-stream') {
                        const proj = projectsDB.find(p => p.telegram_file_id === fileId);
                        if (proj) {
                            if (proj.type === 'Video' || proj.type === 'Dubbing') contentType = 'video/mp4';
                            else if (proj.type === 'Audio') contentType = 'audio/mpeg';
                            else if (proj.type === 'Image' || proj.type === 'Background') contentType = 'image/png';
                            else if (proj.type === 'Subtitle') contentType = 'text/plain; charset=utf-8';
                        }
                    }

                    https.get(fileUrl, (fileStream) => {
                        const headers = {
                            'Content-Type': contentType,
                            'Access-Control-Allow-Origin': '*',
                            'Cache-Control': 'public, max-age=86400'
                        };
                        if (cleanName) {
                            headers['Content-Disposition'] = makeContentDisposition('inline', cleanName);
                        }

                        const isEnc = tgFilePath.toLowerCase().endsWith('.enc') || targetName.toLowerCase().endsWith('.enc');
                        req.on('close', () => {
                            try { if (!res.writableEnded) fileStream.destroy(); } catch (e) {}
                        });
                        fileStream.on('error', () => {
                            try { if (!res.writableEnded) res.end(); } catch (e) {}
                        });
                        if (isEnc) {
                            const decStream = new DecryptStream(Buffer.from(ENCRYPTION_KEY));
                            decStream.on('error', () => { try { if (!res.writableEnded) res.end(); } catch (e) {} });
                            res.writeHead(200, headers);
                            fileStream.pipe(decStream).pipe(res);
                        } else {
                            if (fileStream.headers['content-length']) {
                                headers['Content-Length'] = fileStream.headers['content-length'];
                            }
                            res.writeHead(200, headers);
                            fileStream.pipe(res);
                        }
                    }).on('error', () => {
                        if (!res.headersSent) {
                            res.writeHead(502, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: "Failed to stream file from cloud storage" }));
                        }
                    });
                } else {
                    if (!res.headersSent) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: "File not found in cloud storage" }));
                    }
                }
            } catch(e) {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            }
        });
    }).on('error', (e) => {
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
    });
}

function logTaskToTelegram(taskName, details, filePath = null, email = null, payloadObj = null) {
    let typeMap = { 
        'Subtitle Studio (SRT)': 'Subtitle', 
        'Social Video Download': 'Video', 
        'AI Image Generation': 'Image', 
        'AI Script Writer': 'Script', 
        'Background Removal': 'Background' 
    };
    let finalType = typeMap[taskName] || 'Video';
    if (taskName === 'Social Video Download') {
        const isAudioDownload = (details['Format'] && (details['Format'].includes('Audio') || details['Format'].includes('MP3'))) || 
                                (payloadObj && payloadObj.format === 'audio') || 
                                (typeof filePath === 'string' && filePath.endsWith('.mp3'));
        if (isAudioDownload) finalType = 'Audio';
    }

    let primaryTitle = details['File Name'] || details['URL'] || details['Topic'] || details['Prompt'] || 'Generated Media';
    if (taskName === 'Social Video Download') {
        const platform = details['Platform'] || 'Media';
        const isAud = finalType === 'Audio';
        const baseName = details['File Name'] || 'Download';
        primaryTitle = `${platform} ${isAud ? 'Audio' : 'Video'} (${baseName})`;
    }
    let mainMeta = '';
    for(let k in details){ if(k !== 'File Name' && k !== 'URL' && k !== 'Topic' && k !== 'Prompt'){ mainMeta = k + ': ' + details[k]; break; } }
    
    globalRecentTasks.unshift({ id: Date.now(), type: finalType, title: primaryTitle, metadata: mainMeta, date: new Date().toISOString() });
    if (globalRecentTasks.length > 20) globalRecentTasks.pop();

    // Media or Text Backup strictly to Project Backup Channel (-1004498616218)
    // Per requirements: only AES-256 encrypted media is sent, zero plain text messages

    // Media or Text Backup strictly to Project Backup Channel (-1004498616218)
    const payloadStr = payloadObj ? (typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj)) : null;
    let mediaUrl = '';
    if (typeof filePath === 'string') {
        if (filePath.startsWith('http')) mediaUrl = filePath;
        else mediaUrl = `/uploads/${path.basename(filePath)}`;
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const uploadKey = `${normalizedEmail || 'guest'}_${finalType}_${primaryTitle}_${path.basename(filePath || mediaUrl || '')}`;
    if (tgUploadLocks.has(uploadKey)) {
        const existingLock = projectsDB.find(p => p.email === normalizedEmail && p.title === primaryTitle);
        return existingLock || { id: null, type: finalType, title: primaryTitle, metadata: mainMeta, media_url: mediaUrl };
    }
    tgUploadLocks.add(uploadKey);

    let insertedProjectId = null;
    if (normalizedEmail) {
        db.run(
            `INSERT INTO UserProjects (email, type, title, metadata, media_url, telegram_msg_id, telegram_file_id, payload, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [normalizedEmail, finalType, primaryTitle, mainMeta, mediaUrl, null, null, payloadStr, new Date().toISOString()],
            function(err) {
                if (!err && this.lastID) {
                    insertedProjectId = this.lastID;
                }
            }
        );
    }

    const isAudio = (finalType === 'Audio') || (typeof filePath === 'string' && (filePath.endsWith('.mp3') || filePath.endsWith('.wav'))) || (payloadObj && payloadObj.format === 'audio');
    const isPhoto = (finalType === 'Image' || finalType === 'Background') || (typeof filePath === 'string' && (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.webp')));
    const isVideo = (finalType === 'Video' || finalType === 'Dubbing') || (typeof filePath === 'string' && (filePath.endsWith('.mp4') || filePath.endsWith('.webm')));
    const mediaType = isPhoto ? 'photo' : (isAudio ? 'audio' : (isVideo ? 'video' : 'document'));

    if (filePath && TELEGRAM_BOT_TOKEN) {
        let isLocalFile = typeof filePath === 'string' && !filePath.startsWith('http') && !filePath.startsWith('/api/') && fs.existsSync(filePath);
        
        const doUploadEncrypted = async (encPath) => {
            try {
                // Strictly upload as AES-256 encrypted document with ZERO caption (no email, no title, no metadata)
                const res = await uploadMediaToTelegramBot(TELEGRAM_PROJECTS_CHAT_ID, encPath, 'document', '');
                const msgId = res ? res.message_id : null;
                const fileId = res ? res.file_id : null;
                if (insertedProjectId && (msgId || fileId)) {
                    const proxyUrl = fileId ? `/api/telegram-file-proxy?file_id=${fileId}` : null;
                    const targetProj = projectsDB.find(item => String(item.id) === String(insertedProjectId));
                    if (targetProj) {
                        if (msgId) targetProj.telegram_msg_id = msgId;
                        if (fileId) targetProj.telegram_file_id = fileId;
                        if (proxyUrl) targetProj.media_url = proxyUrl;
                        saveProjectsDB();
                    }
                    db.run(`UPDATE UserProjects SET telegram_msg_id = ?, telegram_file_id = ? WHERE id = ?`, [msgId, fileId, insertedProjectId]);
                    console.log(`[Telegram Encrypted Backup Success]: Project #${insertedProjectId} (${finalType}: ${primaryTitle}) -> file_id=${fileId}`);
                }
            } catch (err) {
                console.error("[Telegram Encrypted Upload Error]:", err.message);
            } finally {
                tgUploadLocks.delete(uploadKey);
                try { if (encPath && fs.existsSync(encPath)) fs.unlinkSync(encPath); } catch(e){}
            }
        };

        if (isLocalFile) {
            const encTarget = filePath.endsWith('.enc') ? filePath : (filePath + '.enc');
            if (filePath.endsWith('.enc')) {
                doUploadEncrypted(filePath);
            } else {
                encryptFileNode(filePath, encTarget).then(() => {
                    doUploadEncrypted(encTarget);
                }).catch((err) => {
                    console.error("[File Encryption Error]:", err.message);
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e){}
                });
            }
        } else if (typeof filePath === 'string' && (filePath.startsWith('http') || filePath.startsWith('/api/proxy-download') || filePath.startsWith('/uploads/'))) {
            let actualDownloadUrl = filePath;
            if (filePath.startsWith('/uploads/')) {
                const localUploaded = path.join(__dirname, filePath);
                if (fs.existsSync(localUploaded)) {
                    const encTarget = localUploaded + '.enc';
                    encryptFileNode(localUploaded, encTarget).then(() => {
                        doUploadEncrypted(encTarget);
                    }).catch(() => {
                        try { if (fs.existsSync(localUploaded)) fs.unlinkSync(localUploaded); } catch(e){}
                    });
                    return;
                }
            }
            if (filePath.startsWith('/api/proxy-download')) {
                try {
                    const u = new URL('http://localhost' + filePath);
                    actualDownloadUrl = u.searchParams.get('url') || actualDownloadUrl;
                } catch(e){}
            }

            const cleanBase = `${finalType}_${primaryTitle}`.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
            const ext = isAudio ? '.mp3' : (isPhoto ? '.png' : '.mp4');
            const baseWithExt = `${cleanBase}${ext}`;

            downloadAndEncryptMedia(actualDownloadUrl, baseWithExt).then(encPath => {
                doUploadEncrypted(encPath);
            }).catch(err => {
                console.error("[Remote Media Encrypt Error]:", err.message);
            });
        }
    }

    return {
        id: insertedProjectId,
        type: finalType,
        title: primaryTitle,
        metadata: mainMeta,
        media_url: mediaUrl
    };
}

// Telegram Text Notification Sender
function sendToTelegram(messageText, targetChatId = null) {
    return new Promise((resolve) => {
        const chatId = targetChatId || TELEGRAM_LOGIN_CHAT_ID;
        if (!TELEGRAM_BOT_TOKEN || !chatId || !messageText) return resolve(null);
        try {
            const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            const payload = JSON.stringify({
                chat_id: chatId,
                text: messageText,
                parse_mode: 'HTML'
            });
            
            const options = {
                method: 'POST',
                family: 4,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            };
    
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        console.error("Telegram error:", data);
                        resolve(null);
                    } else {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed.result.message_id);
                        } catch(e) {
                            resolve(null);
                        }
                    }
                });
            });
            req.on('error', (e) => {
                console.error("Telegram request error:", e);
                resolve(null);
            });
            req.write(payload);
            req.end();
        } catch (e) {
            console.error("Failed to send to Telegram:", e);
            resolve(null);
        }
    });
}

function deleteFromTelegram(messageId, chatId = TELEGRAM_PROJECTS_CHAT_ID) {
    if (!TELEGRAM_BOT_TOKEN || !chatId || !messageId) return;
    try {
        const msgNum = parseInt(messageId, 10);
        if (isNaN(msgNum)) return;
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`;
        const payload = JSON.stringify({
            chat_id: chatId,
            message_id: msgNum
        });
        const options = {
            method: 'POST',
            family: 4,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`[Telegram Delete] Message ${msgNum} in ${chatId} deletion:`, parsed.ok);
                } catch(e) {}
            });
        });
        req.on('error', (e) => console.error("Telegram delete request error:", e.message));
        req.write(payload);
        req.end();
    } catch (e) {
        console.error("Failed to delete from Telegram:", e.message);
    }
}

// SSE Clients Map
const clients = new Map();


function sendProgress(clientId, message, status = 'processing', extraData = null) {
    if (!clientId) return;
    const client = clients.get(clientId);
    if (client) {
        try {
            const displayMessage = message.startsWith('KaveezCloud Server:') ? message : `KaveezCloud Server: ${message}`;
            const payload = { message: displayMessage, status };
            if (extraData) payload.data = extraData;
            client.write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch (e) {
            clients.delete(clientId);
        }
    }
}

// ----------------------------------------------------------------------
// HELPER FUNCTIONS FOR SINHALA & SRT
// ----------------------------------------------------------------------
function ensureCapZoneDomainFileName(name, fallbackExt = '') {
    let raw = String(name || 'CapZone_Output').trim();
    const ext = path.extname(raw) || (fallbackExt ? (fallbackExt.startsWith('.') ? fallbackExt : '.' + fallbackExt) : '');
    let base = path.basename(raw, path.extname(raw));
    base = base
        .replace(/(?:[_\s.-]*(?:www\.)?capzone\.top)+$/gi, '')
        .replace(/(?:[_\s.-]*CapZone)+$/gi, '')
        .replace(/[_\s-]+$/g, '');
    if (!base) base = 'Output';
    return `${base}_www.capzone.top${ext}`;
}

function sanitizeSubtitleText(text, language = 'Sinhala') {
    if (!text || typeof text !== 'string') return '';
    let s = text.trim();
    // 0. Strip any leaked timestamps, HTML tags/entities, or [bracketed] non-speech tags
    s = s
        .replace(/<[^>]+>/g, ' ')
        .replace(/&(?:amp|quot|apos|lt|gt|nbsp|#\d+);/gi, ' ')
        .replace(/\[(?:music|laughter|applause|sound|sfx|inaudible|noise)[^\]]*\]/gi, '')
        .replace(/\((?:music|laughter|applause|sound|sfx|inaudible|noise)[^)]*\)/gi, '')
        .replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:[\.,:]\d{1,3})?\b/g, '');
    // Strip emojis, replacement chars, musical notes, bullets, symbols & zero-width noise
    s = s
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
        .replace(/[\uFFFD\u200B\u200C\u200E\u200F\uFEFF]/g, '')
        .replace(/[★☆♪♫♬♩•∙‣◦●○◆◇■□¤¶§†‡※✓✔✕✖❌✅“”‘’"~^`_*#<>|{}\[\]()\\/=+@$%&]/g, ' ')
        .replace(/[\u2013\u2014\u2015\u2026]/g, ' ');

    if (language === 'Sinhala' || language === 'si') {
        // Remove ZWJ except after Sinhala Virama, collapse double vowel signs, drop orphan vowel signs (dotted circles)
        s = s
            .replace(/(?<!\u0DCA)\u200D/g, '')
            .replace(/\u0DCA{2,}/g, '\u0DCA')
            .replace(/([\u0DCF-\u0DDF\u0DF2\u0DF3])\1+/g, '$1')
            .replace(/(^|\s)[\u0DCA-\u0DDF\u0DF2\u0DF3\u0D82\u0D83]+/g, '$1');
        // Keep Sinhala Unicode, clean English ASCII words, digits, intra-word hyphen/apostrophe & spacing ONLY
        s = s.replace(/[^A-Za-z0-9\u0D80-\u0DFF\u200D\s'\-]/g, ' ');
        // Separate accidentally glued Latin + Sinhala tokens without spaces (e.g. "YouTubeඑක" -> "YouTube එක")
        s = s.replace(/([A-Za-z0-9])([\u0D80-\u0DFF])/g, '$1 $2');
        // Strip hallucinated trailing Latin suffixes directly glued to Sinhala letters (e.g. "ලේishs" -> "ලේසියි")
        s = s.replace(/\b(?:ලේ|ලෙ)(?:ishs?|is)\b/gi, 'ලේසියි');
        s = s.replace(/([\u0D80-\u0DFF]+)[a-zA-Z]+/g, (match, sPart) => sPart);
        // Strip trailing 'ග' caused by pressing '.' key on Wijesekara layout
        s = s.replace(/([ක-ෆ][්ා-ෞ]?)(?:නවා|යි|ක්|ට|ද|නේ|ලා|ව|වා|පු|න්)ග$/g, (m) => m.slice(0, -1));
        s = s.replace(/[\s\.\,]+ග$/g, '');
        s = s.replace(/[\-\s'\u200D]+$/g, '').replace(/^[\-\s']+/g, '');
    } else {
        s = s.replace(/[^A-Za-z0-9\s\u0D80-\u0DFF\u0B80-\u0BFF'\-\?!,]/g, ' ');
        s = s.replace(/[\.\,\:\;\!\?\-\s]+$/g, '');
    }
    return s.replace(/\s+/g, ' ').trim();
}

let sinhalaConverter = null;
try {
    sinhalaConverter = require('./sinhala-converter');
} catch (e) {}

function fixSinhalaLigatures(text) {
    if (!text) return text;
    let s = text;
    // Normalize zero-width joiners and spaces for Rakaransaya, Yansaya, and Kshaya
    s = s.replace(/([ක-ෆ])්[\s‌\u200C]*\u200D*ර/g, '$1්\u200Dර');
    s = s.replace(/([ක-ෆ])්[\s‌\u200C]*\u200D*ය/g, '$1්\u200Dය');
    s = s.replace(/ක්[\s‌\u200C]*\u200D*ෂ/g, 'ක්\u200Dෂ');
    // Remove unwanted zero-width characters except ZWJ
    s = s.replace(/[\u200C\u200E\u200F\uFEFF]/g, '');
    return s;
}

function unicodeToFmAbhaya(text) {
    if (!text) return text;
    try {
        if (sinhalaConverter && typeof sinhalaConverter.convertUnicodeToLegacy === 'function') {
            return sinhalaConverter.convertUnicodeToLegacy(text);
        }
        let clean = sanitizeSubtitleText(text, 'Sinhala');
        clean = fixSinhalaLigatures(clean);
        return clean;
    } catch (e) {
        return text;
    }
}

function cleanAndRepairSrt(rawText, wordsLimit = 0, language = 'Sinhala', durationSecs = 0) {
    if (!rawText || typeof rawText !== 'string') {
        return { valid: false, srt: '', blocks: 0, reason: 'Empty AI output' };
    }

    // Globally remove markdown code blocks, HTML tags, and unwanted annotations
    let cleaned = rawText
        .replace(/```(?:srt|text)?/gi, '')
        .replace(/```/g, '')
        .replace(/<[^>]+>/g, '') // Strip HTML tags like </b>, <i>
        .replace(/\[Music\]/gi, '')
        .replace(/\[Laughter\]/gi, '')
        .replace(/\[Applause\]/gi, '');
    
    // Fix Unicode hallucination bugs
    cleaned = cleaned.replace(/[\u200C\u200E\u200F\uFEFF]/g, '');
    if (language === 'Sinhala' || language === 'si') {
        // Remove ZWJ (U+200D) if it is NOT preceded by a Sinhala Virama (Hal kireema U+0DCA)
        cleaned = cleaned.replace(/(?<!\u0DCA)\u200D/g, '');
        // Fix specific Singlish hallucination artifacts (e.g. "ලේishs" -> "ලේසියි")
        cleaned = cleaned.replace(/\b(?:ලේ|ලෙ)(?:ishs?|is)\b/gi, 'ලේසියි');
        cleaned = cleaned.replace(/([\u0D80-\u0DFF]+)[a-zA-Z]+/g, (match, sPart) => {
            if (/^(?:ලේ|ලෙ)(?:ishs?|is)$/i.test(match)) return 'ලේසියි';
            return sPart;
        });
    }
    
    cleaned = cleaned.trim();
    
    // Universal timestamp normalization for all formats: (HH:)?MM:SS[,. ]mmm --> (HH:)?MM:SS[,. ]mmm
    const timeNormRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[\., ](\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[\., ](\d{1,3})/g;
    cleaned = cleaned.replace(timeNormRegex, (match, h1, m1, s1, ms1, h2, m2, s2, ms2) => {
        const pad = (n, z = 2) => ('00' + n).slice(-z);
        const hh1 = pad(parseInt(h1 || '0', 10));
        const mm1 = pad(parseInt(m1, 10));
        const ss1 = pad(parseInt(s1, 10));
        const mil1 = (ms1 || '0').padEnd(3, '0').slice(0, 3);
        const hh2 = pad(parseInt(h2 || '0', 10));
        const mm2 = pad(parseInt(m2, 10));
        const ss2 = pad(parseInt(s2, 10));
        const mil2 = (ms2 || '0').padEnd(3, '0').slice(0, 3);
        return `${hh1}:${mm1}:${ss1},${mil1} --> ${hh2}:${mm2}:${ss2},${mil2}`;
    });

    // Also normalize MM:SS without milliseconds: (HH:)?MM:SS --> (HH:)?MM:SS
    const timeNoMsRegex = /(?:^|\n)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?=\n|$)/g;
    cleaned = cleaned.replace(timeNoMsRegex, (match, h1, m1, s1, h2, m2, s2) => {
        const pad = (n, z = 2) => ('00' + n).slice(-z);
        const hh1 = pad(parseInt(h1 || '0', 10));
        const mm1 = pad(parseInt(m1, 10));
        const ss1 = pad(parseInt(s1, 10));
        const hh2 = pad(parseInt(h2 || '0', 10));
        const mm2 = pad(parseInt(m2, 10));
        const ss2 = pad(parseInt(s2, 10));
        return `\n${hh1}:${mm1}:${ss1},000 --> ${hh2}:${mm2}:${ss2},000`;
    });

    const lines = cleaned.split('\n').map(l => l.trim());
    const rawBlocks = [];
    let currentTimestamp = null;
    let currentText = [];

    const timestampRegex = /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (timestampRegex.test(line)) {
            if (currentTimestamp) {
                let textContent = (language === 'Sinhala') ? fixSinhalaLigatures(currentText.join(' ').trim()) : currentText.join(' ').trim();
                textContent = sanitizeSubtitleText(textContent, language);
                // Filter out stray timestamps or purely numeric/punctuation lines
                if (textContent && !textContent.includes('-->') && !/^[\d:,\.\s]+$/.test(textContent)) {
                    rawBlocks.push({ timestamp: currentTimestamp, text: textContent });
                }
            }
            currentTimestamp = line;
            currentText = [];
        } else if (currentTimestamp) {
            if (!/^\d+$/.test(line) && line !== '' && !/^\d{1,2}:\d{2}/.test(line)) {
                currentText.push(line);
            }
        }
    }
    
    if (currentTimestamp) {
        let textContent = (language === 'Sinhala') ? fixSinhalaLigatures(currentText.join(' ').trim()) : currentText.join(' ').trim();
        textContent = sanitizeSubtitleText(textContent, language);
        if (textContent && !textContent.includes('-->') && !/^[\d:,\.\s]+$/.test(textContent)) {
            rawBlocks.push({ timestamp: currentTimestamp, text: textContent });
        }
    }

    function timeToMs(timeStr) {
        if (!timeStr) return 0;
        const cleanStr = timeStr.trim().replace('.', ',');
        const timeMatch = cleanStr.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:,(\d{1,3}))?$/);
        if (!timeMatch) return 0;
        let hrs = parseInt(timeMatch[1] || '0', 10);
        let mins = parseInt(timeMatch[2] || '0', 10);
        let secs = parseInt(timeMatch[3] || '0', 10);
        let millis = parseInt((timeMatch[4] || '0').padEnd(3, '0').slice(0, 3), 10);

        // Auto-unwrap hour shift if total duration is under 1 hr and timestamp exceeds total duration
        if (durationSecs > 0 && durationSecs < 3600 && hrs > 0) {
            const totalSec = hrs * 3600 + mins * 60 + secs;
            if (totalSec > durationSecs + 5) {
                mins = hrs;
                hrs = 0;
            }
        }
        return (hrs * 3600000) + (mins * 60000) + (secs * 1000) + millis;
    }

    function msToTime(ms) {
        const pad = (n, z = 2) => ('00' + n).slice(-z);
        const hrs = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const millis = Math.floor(ms % 1000);
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
    }

    // Parse into structured items with verified millisecond ranges
    const rawItems = [];
    for (const block of rawBlocks) {
        const match = block.timestamp.match(timestampRegex);
        if (match) {
            let startMs = timeToMs(match[1]);
            let endMs = timeToMs(match[2]);
            const words = block.text.split(/\s+/).filter(Boolean);
            if (endMs <= startMs) {
                endMs = startMs + Math.max(300, words.length * 250);
            }
            rawItems.push({ startMs, endMs, text: block.text.trim(), words });
        }
    }

    // Deterministically enforce Word Limit (1 to 4 words per block) and STRICT DURATION CLAMPING
    const limit = (typeof wordsLimit === 'number' && wordsLimit >= 1) ? wordsLimit : (parseInt(wordsLimit, 10) || 0);
    const items = [];

    function getMaxDurationForWords(numWords, limitVal) {
        if (numWords <= 1) return 1100; // max 1.1s for 1 word
        if (numWords === 2) return 1900; // max 1.9s for 2 words
        if (numWords === 3) return 2600; // max 2.6s for 3 words
        if (numWords === 4) return 3300; // max 3.3s for 4 words
        return Math.min(4500, Math.max(1000, numWords * 800));
    }

    for (const item of rawItems) {
        const words = item.words || [];
        if (limit >= 1 && words.length > limit) {
            // Group words into sub-chunks of maximum `limit` words
            // Group words into sub-chunks of maximum `limit` words and max ~24 characters
            const chunks = [];
            let curChunk = [];
            let curChunkChars = 0;
            for (let w = 0; w < words.length; w++) {
                const word = words[w];
                const wouldExceedWords = curChunk.length >= limit;
                const wouldExceedChars = curChunk.length >= 2 && (curChunkChars + word.length + 1) > 24;
                if ((wouldExceedWords || wouldExceedChars) && curChunk.length > 0) {
                    chunks.push(curChunk);
                    curChunk = [];
                    curChunkChars = 0;
                }
                curChunk.push(word);
                curChunkChars += word.length + 1;
            }
            if (curChunk.length > 0) {
                chunks.push(curChunk);
            }

            // Preserve exact timestamps across active span instead of compressing blocks ahead of speech
            const rawDuration = Math.max(250, item.endMs - item.startMs);
            const totalDuration = rawDuration;

            const chunkCharCounts = chunks.map(c => c.join(' ').length);
            const totalChars = chunkCharCounts.reduce((sum, n) => sum + n, 0) || 1;
            const gapReserveMs = Math.max(0, (chunks.length - 1) * 30);
            const distributableMs = Math.max(chunks.length * 160, totalDuration - gapReserveMs);

            let curStart = item.startMs;
            for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
                const chunkWords = chunks[cIdx];
                const chunkText = sanitizeSubtitleText(chunkWords.join(' '), language);

                const charWeight = chunkCharCounts[cIdx] / totalChars;
                let chunkDuration = (cIdx === chunks.length - 1)
                    ? Math.max(180, item.endMs - curStart)
                    : Math.max(180, Math.round(distributableMs * charWeight));

                const curEnd = Math.min(item.endMs, curStart + chunkDuration);

                items.push({
                    startMs: curStart,
                    endMs: Math.max(curStart + 150, curEnd),
                    text: chunkText,
                    words: chunkWords
                });

                curStart = curEnd + 30;
            }
        } else {
            // Keep accurate block dialogue timing without premature truncation
            const rawDur = item.endMs - item.startMs;
            const clampedDur = Math.max(250, Math.min(rawDur, 8500));
            items.push({
                ...item,
                text: sanitizeSubtitleText(item.text, language),
                endMs: item.startMs + clampedDur
            });
        }
    }

    // 1. Sort strictly by startMs (chronological order)
    items.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

    // 2. Deduplicate identical text/start blocks
    const uniqueItems = [];
    for (const it of items) {
        if (!it.text) continue;
        if (uniqueItems.length > 0) {
            const prev = uniqueItems[uniqueItems.length - 1];
            if (Math.abs(it.startMs - prev.startMs) < 100 && it.text === prev.text) {
                prev.endMs = Math.max(prev.endMs, it.endMs);
                continue;
            }
        }
        uniqueItems.push(it);
    }

    // 3. Boundary Calibration Check without artificial timeline squishing
    if (durationSecs > 0 && uniqueItems.length > 0) {
        const maxVideoMs = Math.round(durationSecs * 1000);
        const lastBlock = uniqueItems[uniqueItems.length - 1];
        if (lastBlock.endMs > maxVideoMs + 1000) {
            lastBlock.endMs = maxVideoMs;
        }
    }

    // 4. Resolve overlaps strictly so no two blocks can EVER occupy the same timeline frame
    // Trim previous block end; NEVER push current block start forward, preserving ground-truth timeline synchronization!
    for (let i = 1; i < uniqueItems.length; i++) {
        const prev = uniqueItems[i - 1];
        const curr = uniqueItems[i];
        if (prev.endMs >= curr.startMs) {
            prev.endMs = Math.max(prev.startMs + 50, curr.startMs - 20);
        }
        if (curr.endMs <= curr.startMs) {
            curr.endMs = curr.startMs + Math.max(180, (curr.words ? curr.words.length : 1) * 150);
        }
    }

    // 4.5 CapCut Natural Pacing: Respect natural speech pauses and vocal offsets.
    // Subtitles disappear when vocalization finishes, and do not awkwardly stretch into silence.

    // 5. Final Boundary Conformation Check (Ensures timestamps stay strictly within the video duration)
    if (durationSecs > 0 && uniqueItems.length > 0) {
        const maxAllowedMs = Math.round(durationSecs * 1000);
        const validItems = [];
        for (const it of uniqueItems) {
            if (it.startMs >= maxAllowedMs) {
                continue; // Do not push blocks past the end of video
            }
            if (it.endMs > maxAllowedMs) {
                it.endMs = maxAllowedMs;
            }
            if (it.endMs > it.startMs + 50) {
                validItems.push(it);
            }
        }
        if (validItems.length > 0) {
            uniqueItems.length = 0;
            uniqueItems.push(...validItems);
        }
    }

    const reconstructed = [];
    let blockIndex = 1;

    for (const item of uniqueItems) {
        const validTimestamp = `${msToTime(item.startMs)} --> ${msToTime(item.endMs)}`;
        const cleanT = sanitizeSubtitleText(item.text, language);
        reconstructed.push(`${blockIndex}\n${validTimestamp}\n${cleanT}`);
        blockIndex++;
    }

    const validCount = blockIndex - 1;
    const finalSrt = reconstructed.join('\n\n').trim();

    return {
        valid: validCount > 0,
        srt: validCount > 0 ? finalSrt : cleaned,
        blocks: validCount,
        startTime: uniqueItems[0] ? msToTime(uniqueItems[0].startMs) : '00:00:00,000',
        endTime: uniqueItems[uniqueItems.length - 1] ? msToTime(uniqueItems[uniqueItems.length - 1].endMs) : '00:00:00,000',
        reason: validCount > 0 ? 'OK' : 'No valid subtitle blocks parsed'
    };
}

// Realtime Progress SSE Map & Helper
const progressClients = new Map();
const progressResults = new Map();
const activeImageTasks = new Map();
const srtResults = new Map();
const activeProcessingFiles = new Set();

function sanitizeUserProgressMessage(rawMsg) {
    if (!rawMsg || typeof rawMsg !== 'string') return rawMsg;
    let msg = rawMsg;
    msg = msg.replace(/facebook\/[a-zA-Z0-9_-]+/gi, 'CapZone Speech Engine');
    msg = msg.replace(/\b(Meta|Facebook)\s*(MMS|NLLB-200)\s*(Forced\s*Aligner|Neural\s*Translator)?/gi, 'CapZone Precision Engine');
    msg = msg.replace(/\bForced\s*Align(er|ment)?\b/gi, 'Precision Millisecond Alignment');
    msg = msg.replace(/\b(Meta|Facebook)\b/gi, 'CapZone');
    msg = msg.replace(/\byt-dlp\b/gi, 'Cloud Stream Extractor');
    msg = msg.replace(/\bFFmpeg\b/gi, 'CapZone Audio Engine');
    msg = msg.replace(/\bmms(-[a-z0-9]+)?\b/gi, 'CapZone Precision Sync');
    msg = msg.replace(/\bWhisper\b/gi, 'CapZone Speech Engine');
    return msg;
}

function sendProgress(clientId, message, status = 'processing', extraData = null) {
    if (!clientId) return;
    const cleanMessage = sanitizeUserProgressMessage(message);
    const payload = { message: cleanMessage, status, updatedAt: Date.now() };
    if (extraData) {
        payload.data = extraData;
        payload.extraData = extraData;
    }
    progressResults.set(clientId, payload);
    if (progressResults.size > 400) {
        const firstKey = progressResults.keys().next().value;
        if (firstKey) progressResults.delete(firstKey);
    }
    const clientRes = progressClients.get(clientId);
    if (clientRes) {
        try {
            clientRes.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch (e) {}
    }
}

function extractAudioBuffer(filePath, fallbackBuffer) {
    return new Promise((resolve) => {
        if (!filePath || !fs.existsSync(filePath)) {
            return resolve(fallbackBuffer);
        }
        const outAudioPath = filePath + '_extracted.mp3';
        const ffmpegCmd = (ffmpegPath && ffmpegPath !== 'ffmpeg' && fs.existsSync(ffmpegPath)) ? `"${ffmpegPath}"` : 'ffmpeg';
        // Extract 16kHz mono MP3 (ideal size & ultra-clear for speech AI)
        exec(`${ffmpegCmd} -y -i "${filePath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 48k "${outAudioPath}"`, { windowsHide: true }, (err) => {
            if (!err && fs.existsSync(outAudioPath)) {
                try {
                    const audioBuf = fs.readFileSync(outAudioPath);
                    fs.unlink(outAudioPath, () => {});
                    console.log(`[Audio Extracted] Size: ${(audioBuf.length / 1024).toFixed(1)} KB`);
                    return resolve(audioBuf);
                } catch(e) {}
            }
            resolve(fallbackBuffer);
        });
    });
}


// Approach 1: Facebook Meta MMS / Wav2Vec2 Sinhala Forced Alignment

// 100% Free Local Meta MMS + NLLB-200 Neural Subtitle Engine Runner
function runMmsSubtitleEngine(audioFilePath, targetLanguage = 'Sinhala', wordsLimit = 1, clientId) {
    return new Promise((resolve, reject) => {
        const pyBin = (typeof getPythonCommand === 'function') ? getPythonCommand() : (process.platform === 'win32' ? 'py' : 'python3');
        let ffmpegCmd = 'ffmpeg';
        if (typeof ffmpegPath !== 'undefined' && ffmpegPath && ffmpegPath !== 'ffmpeg' && fs.existsSync(ffmpegPath)) {
            ffmpegCmd = ffmpegPath;
        }

        const scriptPath = path.join(__dirname, 'mms_engine.py');
        if (!fs.existsSync(scriptPath)) {
            return reject(new Error("mms_engine.py not found"));
        }

        if (clientId) {
            sendProgress(clientId, `CapZone Studio: Starting speech recognition (${targetLanguage})...`, 'processing', { step: 2, percent: 25 });
        }

        const pythonProcess = require('child_process').spawn(pyBin, ['-u', scriptPath, audioFilePath, targetLanguage, String(wordsLimit), ffmpegCmd], {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', MALLOC_ARENA_MAX: '2', OMP_NUM_THREADS: '2' }
        });
        let dataStr = '';
        let errStr = '';

        pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
        pythonProcess.stderr.on('data', (d) => {
            errStr += d.toString();
            const s = d.toString().trim();
            if (s) {
                console.log(`[Meta MMS Engine]:`, s);
                if (clientId) {
                    if (s.includes('Decoding 16kHz PCM')) {
                        sendProgress(clientId, 'Decoding 16kHz audio waveform...', 'processing', { step: 2, percent: 25 });
                    } else if (s.includes('active speech windows')) {
                        sendProgress(clientId, 'Detected active speech windows across timeline...', 'processing', { step: 2, percent: 35 });
                    } else if (s.includes('Analyzed dialogue segment')) {
                        sendProgress(clientId, 'CapZone Studio: Analyzing dialogue segments...', 'processing', { step: 3, percent: 50 });
                    } else if (s.includes('Transcribing spoken Sinhala') || s.includes('Transcription progress')) {
                        sendProgress(clientId, 'Transcribed speech dialogue with CapZone Engine...', 'processing', { step: 3, percent: 65 });
                    } else if (s.includes('Resolving spoken English')) {
                        sendProgress(clientId, 'Aligning bilingual Sinhala & English terms...', 'processing', { step: 3, percent: 75 });
                    } else if (s.includes('Meta NLLB-200')) {
                        sendProgress(clientId, 'Translating dialogue with CapZone Neural Translator...', 'processing', { step: 3, percent: 80 });
                    } else if (s.includes('Pipeline Ready') || s.includes('Meta MMS') || s.includes('Forced Alignment Engine')) {
                        sendProgress(clientId, 'CapZone Studio: Synchronizing word-level millisecond timestamps...', 'processing', { step: 4, percent: 90 });
                    }
                }
            }
        });

        pythonProcess.on('close', (code) => {
            try {
                let jsonStr = dataStr.trim();
                let result = null;
                try {
                    result = JSON.parse(jsonStr);
                } catch (_) {
                    const jsonStart = jsonStr.indexOf('{"');
                    const jsonEnd = jsonStr.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd > jsonStart) {
                        result = JSON.parse(jsonStr.slice(jsonStart, jsonEnd + 1));
                    }
                }
                if (!result) throw new Error('Invalid engine output');
                if (result.error) {
                    reject(new Error(result.error));
                } else if (result.srt) {
                    resolve(result);
                } else {
                    reject(new Error("No subtitle speech detected in this audio file"));
                }
            } catch (e) {
                reject(new Error("Subtitle Engine error: " + (errStr.slice(-240) || dataStr.slice(-240) || e.message)));
            }
        });
    });
}

// 100% Free Local Meta NLLB-200 SRT Translation Engine Runner
function runMmsSrtTranslateEngine(rawSrt, targetLanguage = 'Sinhala', clientId) {
    return new Promise((resolve, reject) => {
        const pyBin = (typeof getPythonCommand === 'function') ? getPythonCommand() : (process.platform === 'win32' ? 'py' : 'python3');
        const scriptPath = path.join(__dirname, 'mms_engine.py');
        if (!fs.existsSync(scriptPath)) {
            return reject(new Error("mms_engine.py not found"));
        }
        const safeDir = (typeof uploadDir !== 'undefined' && fs.existsSync(uploadDir)) ? uploadDir : path.join(__dirname, 'uploads');
        if (!fs.existsSync(safeDir)) fs.mkdirSync(safeDir, { recursive: true });
        const tmpSrtPath = path.join(safeDir, `nllb_in_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.srt`);
        fs.writeFileSync(tmpSrtPath, rawSrt, 'utf8');

        const pythonProcess = require('child_process').spawn(pyBin, ['-u', scriptPath, '--translate', tmpSrtPath, targetLanguage], {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', MALLOC_ARENA_MAX: '2', OMP_NUM_THREADS: '2' }
        });
        let dataStr = '';
        let errStr = '';

        pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
        pythonProcess.stderr.on('data', (d) => {
            errStr += d.toString();
            const s = d.toString().trim();
            if (s) {
                console.log(`[Meta NLLB-200 Translate]:`, s);
                if (clientId && s.includes('Meta NLLB-200 Translation')) {
                    sendProgress(clientId, `Translating subtitles to ${targetLanguage}...`, 'processing', { step: 3, percent: 70 });
                }
            }
        });

        pythonProcess.on('close', () => {
            try { if (fs.existsSync(tmpSrtPath)) fs.unlinkSync(tmpSrtPath); } catch (_) {}
            try {
                let jsonStr = dataStr.trim();
                let result = null;
                try {
                    result = JSON.parse(jsonStr);
                } catch (_) {
                    const jsonStart = jsonStr.indexOf('{"');
                    const jsonEnd = jsonStr.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd > jsonStart) {
                        result = JSON.parse(jsonStr.slice(jsonStart, jsonEnd + 1));
                    }
                }
                if (result && result.srt) {
                    resolve(result);
                } else {
                    reject(new Error((result && result.error) || errStr.slice(-240) || 'Subtitle translation failed'));
                }
            } catch (e) {
                reject(new Error("Translation Engine error: " + (errStr.slice(-240) || dataStr.slice(-240) || e.message)));
            }
        });
    });
}

// Universal Social Media Downloader (Guaranteed Audio & Video Merger via yt-dlp & FFmpeg)
async function resolveRedirectUrl(targetUrl, maxHops = 5) {
    let cur = targetUrl;
    for (let i = 0; i < maxHops; i++) {
        try {
            const next = await new Promise((resolve) => {
                const mod = cur.startsWith('https') ? https : http;
                const req = mod.request(cur, {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                }, (res) => {
                    res.resume();
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        resolve(new URL(res.headers.location, cur).toString());
                    } else {
                        resolve(null);
                    }
                });
                req.on('error', () => resolve(null));
                req.setTimeout(6000, () => { req.destroy(); resolve(null); });
                req.end();
            });
            if (!next || next === cur || next.includes('login.php')) break;
            cur = next;
        } catch (e) { break; }
    }
    return cur;
}

async function downloadSocialMediaWithYtDlp(videoUrl, format = 'video', clientId = null, quality = '1080') {
    let resolvedInputUrl = (videoUrl || '').trim();
    if (/facebook\.com\/share\/|fb\.watch\/|fb\.me\/|fb\.com\//i.test(resolvedInputUrl)) {
        try { resolvedInputUrl = await resolveRedirectUrl(resolvedInputUrl); } catch (e) {}
    }
    return new Promise((resolve, reject) => {
        videoUrl = resolvedInputUrl;
        let ytDlpCmd = 'yt-dlp';
        if (fs.existsSync('/usr/local/bin/yt-dlp')) {
            ytDlpCmd = '/usr/local/bin/yt-dlp';
        } else if (fs.existsSync('/usr/bin/yt-dlp')) {
            ytDlpCmd = '/usr/bin/yt-dlp';
        } else if (fs.existsSync(ytDlpPath)) {
            ytDlpCmd = ytDlpPath;
        }

        // Locate directory containing ffmpeg & check whether ffprobe is also present
        let ffmpegBin = 'ffmpeg';
        if (typeof ffmpegPath !== 'undefined' && ffmpegPath && fs.existsSync(ffmpegPath)) {
            ffmpegBin = ffmpegPath;
        } else if (fs.existsSync('/usr/bin/ffmpeg')) {
            ffmpegBin = '/usr/bin/ffmpeg';
        } else if (fs.existsSync('/usr/local/bin/ffmpeg')) {
            ffmpegBin = '/usr/local/bin/ffmpeg';
        }

        let ffmpegDir = null;
        let hasFfprobe = false;
        try {
            const candidateDir = fs.statSync(ffmpegBin).isDirectory() ? ffmpegBin : path.dirname(ffmpegBin);
            if (fs.existsSync(candidateDir)) {
                ffmpegDir = candidateDir;
                const probeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
                hasFfprobe = fs.existsSync(path.join(candidateDir, probeName));
            }
        } catch(e) {}
        if (!hasFfprobe) {
            try {
                require('child_process').execSync(process.platform === 'win32' ? 'where ffprobe' : 'which ffprobe', { stdio: 'ignore', timeout: 2000 });
                hasFfprobe = true;
            } catch(e) {}
        }

        const timestamp = Date.now();
        const ext = (format === 'audio') ? 'mp3' : 'mp4';
        const needsDirectFfmpegAudio = (format === 'audio' && !hasFfprobe);
        const filenameTemplate = needsDirectFfmpegAudio
            ? `social_raw_${timestamp}_%(id)s.%(ext)s`
            : `social_${timestamp}_%(id)s.${ext}`;
        const outPattern = path.join(uploadDir, filenameTemplate);

        // Sanitize YouTube URL - strip tracking parameters (?si=..., ?feature=...)
        let targetUrl = (videoUrl || '').trim();
        const ytMatch = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
        if (ytMatch) {
            targetUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
        }

        const isFacebookUrl = /facebook\.com|fb\.watch|fb\.me|fb\.com/i.test(targetUrl);
        let args = [
            '--no-warnings',
            '--no-check-certificates',
            '--no-playlist',
            '--force-ipv4',
            '--socket-timeout', '25',
            '--retries', '2',
            '--js-runtimes', 'node',
            '-o', outPattern
        ];

        // Pass --ffmpeg-location whenever ffmpegDir exists so video+audio merge uses bundled ffmpeg;
        // for audio extraction without ffprobe, download bestaudio raw and encode MP3 directly via ffmpeg.
        if (ffmpegDir && (format !== 'audio' || hasFfprobe)) {
            args.push('--ffmpeg-location', ffmpegDir);
        }

        if (/youtube\.com|youtu\.be/i.test(targetUrl)) {
            args.push('--extractor-args', 'youtube:player_client=mweb,android');
        }

        const possibleCookiePaths = [
            path.join(__dirname, 'cookies.txt'),
            path.join(uploadDir, 'cookies.txt'),
            path.join(__dirname, 'scratch', 'cookies.txt')
        ];
        const cookieFile = possibleCookiePaths.find(p => fs.existsSync(p));
        if (cookieFile) {
            args.push('--cookies', cookieFile);
        }

        if (format === 'audio') {
            if (needsDirectFfmpegAudio) {
                args.push('-f', 'bestaudio/ba/b/best');
            } else {
                const audioQ = (quality === '320' || quality === '320k') ? '0' : ((quality === '192' || quality === '192k') ? '2' : '4');
                args.push('-x', '--audio-format', 'mp3', '--audio-quality', audioQ, '-f', 'bestaudio/ba/b/best');
            }
        } else {
            // Real Quality tiering for crisp high-definition video
            const qStr = String(quality || '1080').toLowerCase();
            if (qStr.includes('360')) {
                args.push('-f', 'bv*[height<=360][ext=mp4]+ba[ext=m4a]/bv*[height<=360]+ba/b[height<=360][ext=mp4]/b[height<=360]/best', '--merge-output-format', 'mp4');
            } else if (qStr.includes('480')) {
                args.push('-f', 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/bv*[height<=480]+ba/b[height<=480][ext=mp4]/b[height<=480]/best', '--merge-output-format', 'mp4');
            } else if (qStr.includes('720')) {
                args.push('-f', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/b[height<=720]/best', '--merge-output-format', 'mp4');
            } else if (isFacebookUrl) {
                args.push('-f', 'hd[ext=mp4]/b[ext=mp4]/bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*+ba/sd[ext=mp4]/b/best', '--merge-output-format', 'mp4');
            } else {
                // 1080p Full HD default
                args.push('-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080][ext=mp4]/bv*+ba/b/best', '--merge-output-format', 'mp4');
            }
        }

        // Print title and resolved filepath
        args.push('--print', 'title', '--print', 'after_move:filepath');
        args.push(targetUrl);

        if (clientId) sendProgress(clientId, 'Step 2: Downloading & merging high-definition media with audio...', 'processing');

        const ffBin = (typeof ffmpegPath !== 'undefined' && ffmpegPath && fs.existsSync(ffmpegPath))
            ? ffmpegPath
            : (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg');
        console.log(`[Media Downloader] Running yt-dlp (${ytDlpCmd}) to download and merge: ${targetUrl}`);
        const child = require('child_process').spawn(ytDlpCmd, args, { windowsHide: true });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (d) => {
            const str = d.toString();
            stdout += str;
            if (clientId) {
                const percentMatch = str.match(/(\d+(?:\.\d+)?)%/);
                if (percentMatch) {
                    sendProgress(clientId, `Downloading & merging media (${percentMatch[1]}%)...`, 'processing');
                }
            }
        });

        child.stderr.on('data', (d) => {
            stderr += d.toString();
        });

        child.on('close', async (code) => {
            if (code !== 0) {
                console.error('[Media Downloader Error]:', stderr);
                let platformName = 'Media';
                if (/youtube\.com|youtu\.be/i.test(targetUrl)) platformName = 'YouTube';
                else if (/facebook\.com|fb\.watch/i.test(targetUrl)) platformName = 'Facebook';
                else if (/tiktok\.com/i.test(targetUrl)) platformName = 'TikTok';

                // Fallback engine for YouTube via pytubefix (venv Python) + Piped API
                if (platformName === 'YouTube') {
                    const pyCmd = (typeof getPythonCommand === 'function') ? getPythonCommand() : (os.platform() === 'win32' ? 'python' : 'python3');
                    const qTarget = String(quality || (format === 'audio' ? '320k' : '720'));
                    const pyFallbackScript = `
import json, os, sys, subprocess
try:
    from pytubefix import YouTube
except Exception as e:
    print(json.dumps({"error": str(e)})); sys.exit(1)
url, fmt, q, ts, out_dir, ff = sys.argv[1:7]
yt = None
for cl in ("ANDROID_VR", "WEB", "TV", "IOS"):
    try:
        cand = YouTube(url, client=cl)
        if cand.streams:
            yt = cand; break
    except Exception:
        pass
if yt is None:
    yt = YouTube(url)
title = yt.title or "YouTube_Media"
if fmt == "audio":
    st = yt.streams.get_audio_only()
    raw = st.download(output_path=out_dir, filename_prefix=f"yt_raw_{ts}_")
    mp3 = os.path.join(out_dir, f"social_{ts}_yt.mp3")
    br = "320k" if "320" in q else ("192k" if "192" in q else "128k")
    subprocess.run([ff, "-y", "-i", raw, "-vn", "-c:a", "libmp3lame", "-b:a", br, mp3], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try: os.remove(raw)
    except: pass
    print(json.dumps({"filePath": mp3, "title": title}))
else:
    h = 360 if "360" in q else (480 if "480" in q else (720 if "720" in q else 1080))
    v = yt.streams.filter(adaptive=True, file_extension="mp4", only_video=True).order_by("resolution").desc()
    picked = next((s for s in v if s.resolution and int(s.resolution.replace("p","")) <= h), None) or v.first()
    a = yt.streams.get_audio_only()
    mp4 = os.path.join(out_dir, f"social_{ts}_yt.mp4")
    if picked and a:
        vp = picked.download(output_path=out_dir, filename_prefix=f"yt_v_{ts}_")
        ap = a.download(output_path=out_dir, filename_prefix=f"yt_a_{ts}_")
        subprocess.run([ff, "-y", "-i", vp, "-i", ap, "-c:v", "copy", "-c:a", "aac", "-shortest", mp4], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for tmp in (vp, ap):
            try: os.remove(tmp)
            except: pass
    else:
        prog = yt.streams.get_highest_resolution()
        prog.download(output_path=out_dir, filename=f"social_{ts}_yt.mp4")
    print(json.dumps({"filePath": mp4, "title": title}))
`;
                    try {
                        const pyRes = require('child_process').spawnSync(pyCmd, ['-c', pyFallbackScript, targetUrl, format, qTarget, String(timestamp), uploadDir, ffBin], {
                            encoding: 'utf8',
                            timeout: 45000,
                            windowsHide: true
                        });
                        if (pyRes.status === 0 && pyRes.stdout) {
                            const lastLine = pyRes.stdout.trim().split('\n').pop();
                            const info = JSON.parse(lastLine);
                            if (info.filePath && fs.existsSync(info.filePath)) {
                                const baseName = path.basename(info.filePath);
                                console.log(`[YouTube Fallback Success] pytubefix extracted ${baseName}`);
                                return resolve({
                                    filePath: info.filePath,
                                    fileName: baseName,
                                    downloadUrl: `/uploads/${baseName}`,
                                    title: info.title || 'YouTube_Media'
                                });
                            }
                        }
                    } catch (pyErr) {
                        console.warn('[YouTube pytubefix fallback note]:', pyErr.message);
                    }

                    // Tier 2 fallback: Piped Public Stream Relay (bypass datacenter/bot check)
                    try {
                        const pipedRes = await downloadYouTubeViaPiped(ytMatch ? ytMatch[1] : targetUrl, format, qTarget, timestamp, uploadDir, ffBin, clientId);
                        if (pipedRes) return resolve(pipedRes);
                    } catch (pipedErr) {
                        console.warn('[YouTube Piped fallback note]:', pipedErr.message);
                    }
                }

                let errMsg = `Could not download ${platformName} media. Please verify that the link is public and accessible.`;
                if (/The page needs to be reloaded/i.test(stderr)) {
                    errMsg = `YouTube Player Refresh: YouTube session needs a fresh cookies.txt file or public link. Please verify cookies on VPS or try without cookies.`;
                } else if (/Sign in to confirm|not a bot|cookies-from-browser/i.test(stderr)) {
                    errMsg = `YouTube Bot Verification Required: මෙම server IP එකෙන් බාගත කිරීමට YouTube cookies.txt (/root/capzone/cookies.txt) අවශ්‍ය වේ. Export YouTube cookies to cookies.txt in /root/capzone/ to download from this server IP.`;
                } else if (/Private video|Video unavailable/i.test(stderr)) {
                    errMsg = `This ${platformName} video is private or unavailable.`;
                }
                return reject(new Error(errMsg));
            }

            const lines = stdout.trim().split('\n').map(l => l.trim()).filter(Boolean);
            let downloadedFile = null;
            let title = /youtube\.com|youtu\.be/i.test(targetUrl) ? 'YouTube_Media' : (/tiktok\.com/i.test(targetUrl) ? 'TikTok_Video' : 'Facebook_Video');

            if (lines.length >= 2) {
                title = lines[0];
                downloadedFile = lines[lines.length - 1];
            } else if (lines.length === 1) {
                if (fs.existsSync(lines[0])) {
                    downloadedFile = lines[0];
                } else {
                    title = lines[0];
                }
            }

            if (!downloadedFile || !fs.existsSync(downloadedFile)) {
                try {
                    const files = fs.readdirSync(uploadDir);
                    const prefix = needsDirectFfmpegAudio ? `social_raw_${timestamp}_` : `social_${timestamp}_`;
                    const matching = files.find(f => f.startsWith(prefix) && (needsDirectFfmpegAudio || f.endsWith(`.${ext}`)));
                    if (matching) {
                        downloadedFile = path.join(uploadDir, matching);
                    }
                } catch(e){}
            }

            if (!downloadedFile || !fs.existsSync(downloadedFile)) {
                return reject(new Error('Media file could not be finalized. Please try again.'));
            }

            if (needsDirectFfmpegAudio) {
                const br = (quality === '128' || quality === '128k') ? '128k' : ((quality === '192' || quality === '192k') ? '192k' : '320k');
                const finalMp3Name = `social_${timestamp}_audio.mp3`;
                const finalMp3Path = path.join(uploadDir, finalMp3Name);
                if (clientId) sendProgress(clientId, `Encoding crystal-clear ${br} MP3 audio...`, 'processing');
                const ffProc = require('child_process').spawn(ffmpegBin, ['-y', '-i', downloadedFile, '-vn', '-c:a', 'libmp3lame', '-b:a', br, finalMp3Path], { windowsHide: true });
                let ffErr = '';
                ffProc.stderr.on('data', d => { ffErr += d.toString(); });
                ffProc.on('close', ffCode => {
                    try { if (fs.existsSync(downloadedFile)) fs.unlinkSync(downloadedFile); } catch(e){}
                    if (ffCode !== 0 || !fs.existsSync(finalMp3Path)) {
                        return reject(new Error('Audio encoding failed: ' + (ffErr.slice(-200) || `exit ${ffCode}`)));
                    }
                    resolve({
                        filePath: finalMp3Path,
                        fileName: finalMp3Name,
                        downloadUrl: `/uploads/${finalMp3Name}`,
                        title: title
                    });
                });
                return;
            }

            const baseName = path.basename(downloadedFile);
            resolve({
                filePath: downloadedFile,
                fileName: baseName,
                downloadUrl: `/uploads/${baseName}`,
                title: title
            });
        });
    });
}

function runForcedAlignment(audioFilePath, transcriptText, wordsLimit = 3, clientId) {
    return new Promise((resolve, reject) => {
        const pyBin = (typeof getPythonCommand === 'function') ? getPythonCommand() : (process.platform === 'win32' ? 'py' : 'python3');
        const fs = require('fs');
        let ffmpegCmd = 'ffmpeg';
        if (typeof ffmpegPath !== 'undefined' && ffmpegPath && ffmpegPath !== 'ffmpeg' && fs.existsSync(ffmpegPath)) {
            ffmpegCmd = ffmpegPath;
        }

        const scriptPath = path.join(__dirname, 'forced_alignment.py');
        if (!fs.existsSync(scriptPath)) {
            return reject(new Error("forced_alignment.py not found"));
        }

        const tempTextFile = path.join(__dirname, `temp_transcript_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
        fs.writeFileSync(tempTextFile, transcriptText || '', 'utf8');

        if (clientId) {
            sendProgress(clientId, 'CapZone Studio: Synchronizing word-level millisecond timestamps...', 'processing', { step: 4, percent: 85, part: 4, totalParts: 4 });
        }

        const pythonProcess = require('child_process').spawn(pyBin, ['-u', scriptPath, audioFilePath, tempTextFile, wordsLimit, ffmpegCmd], {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        let dataStr = '';
        let errStr = '';

        pythonProcess.stdout.on('data', (d) => { dataStr += d.toString(); });
        pythonProcess.stderr.on('data', (d) => {
            errStr += d.toString();
            const s = d.toString().trim();
            if (s) console.log(`[Meta MMS Forced Aligner]:`, s);
        });

        pythonProcess.on('close', (code) => {
            try { fs.unlinkSync(tempTextFile); } catch(e){}
            try {
                let jsonStr = dataStr.trim();
                const jsonStart = jsonStr.indexOf('{"');
                const jsonEnd = jsonStr.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
                }
                const result = JSON.parse(jsonStr);
                if (result.error) {
                    reject(new Error(result.error));
                } else if (result.srt) {
                    resolve(result);
                } else {
                    reject(new Error("No SRT output from Forced Aligner"));
                }
            } catch (e) {
                reject(new Error("Forced aligner error: " + (errStr.slice(-150) || dataStr.slice(-150) || e.message)));
            }
        });
    });
}

// Acoustic Speech Detection via FFmpeg (Real-Time Energy & Silence VAD)
function getAudioSpeechIntervals(filePath, totalDurationSecs) {
    return new Promise((resolve) => {
        const ffmpegCmd = (ffmpegPath && ffmpegPath !== 'ffmpeg' && fs.existsSync(ffmpegPath)) ? `"${ffmpegPath}"` : 'ffmpeg';
        const cmd = `${ffmpegCmd} -i "${filePath}" -af "silencedetect=noise=-32dB:d=0.25" -f null -`;
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            const out = (stderr || '') + (stdout || '');
            const reStart = /silence_start:\s*([\d\.]+)/g;
            const reEnd = /silence_end:\s*([\d\.]+)/g;
            const silences = [];
            let m;
            while ((m = reStart.exec(out)) !== null) silences.push({ type: 'start', t: parseFloat(m[1]) });
            while ((m = reEnd.exec(out)) !== null) silences.push({ type: 'end', t: parseFloat(m[1]) });
            
            const dur = (totalDurationSecs && totalDurationSecs > 0) ? totalDurationSecs : 1800;
            const silenceRanges = [];
            let curStart = null;
            for (let i = 0; i < silences.length; i++) {
                if (silences[i].type === 'start') {
                    curStart = silences[i].t;
                } else if (silences[i].type === 'end' && curStart !== null) {
                    silenceRanges.push({ start: curStart, end: silences[i].t });
                    curStart = null;
                }
            }
            if (curStart !== null) {
                silenceRanges.push({ start: curStart, end: dur });
            }

            const speechIntervals = [];
            let lastEnd = 0;
            for (const s of silenceRanges) {
                if (s.start > lastEnd + 0.15) {
                    speechIntervals.push({ start: lastEnd, end: s.start });
                }
                lastEnd = s.end;
            }
            if (lastEnd < dur - 0.2) {
                speechIntervals.push({ start: lastEnd, end: dur });
            }
            resolve(speechIntervals);
        });
    });
}

// Deep Acoustic Time-Mapping & Timeline Drift Calibrator
async function deepAcousticTimeMap(blocks, filePath, totalDurationSecs) {
    if (!blocks || blocks.length === 0) return blocks;
    try {
        const speechIntervals = await getAudioSpeechIntervals(filePath, totalDurationSecs);
        if (!speechIntervals || speechIntervals.length === 0) return blocks;

        const msIntervals = speechIntervals.map(s => ({
            startMs: Math.round(s.start * 1000),
            endMs: Math.round(s.end * 1000)
        }));

        blocks.sort((a, b) => a.startMs - b.startMs);

        for (let i = 0; i < blocks.length; i++) {
            const blk = blocks[i];
            const containingInterval = msIntervals.find(iv => blk.startMs >= iv.startMs - 250 && blk.startMs <= iv.endMs + 250);
            if (containingInterval) {
                if (blk.startMs < containingInterval.startMs) {
                    blk.startMs = containingInterval.startMs;
                }
            } else {
                const nextInterval = msIntervals.find(iv => iv.startMs > blk.startMs);
                if (nextInterval && (nextInterval.startMs - blk.startMs) < 3500) {
                    const blockDur = Math.max(250, blk.endMs - blk.startMs);
                    blk.startMs = nextInterval.startMs;
                    blk.endMs = blk.startMs + blockDur;
                }
            }
        }

        for (let i = 1; i < blocks.length; i++) {
            const prev = blocks[i - 1];
            const curr = blocks[i];
            if (curr.startMs <= prev.endMs) {
                if (curr.startMs >= prev.startMs + 200) {
                    prev.endMs = curr.startMs - 25;
                } else {
                    prev.endMs = prev.startMs + 200;
                    curr.startMs = prev.endMs + 25;
                }
            }
        }
        return blocks;
    } catch (e) {
        console.warn('[Deep Time Map] Note:', e.message);
        return blocks;
    }
}

// Social Media Stream Extraction & Helpers

async function downloadYouTubeViaPiped(videoId, format, quality, timestamp, outDir, ffBin, clientId) {
    if (!videoId || String(videoId).includes('http')) {
        const m = String(videoId || '').match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
        if (m) videoId = m[1];
    }
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;

    const pipedHosts = [
        'https://api.piped.private.coffee',
        'https://pipedapi.kavin.rocks'
    ];
    let info = null;
    for (const host of pipedHosts) {
        try {
            const raw = await new Promise((res, rej) => {
                const req = https.get(`${host}/streams/${videoId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36' },
                    timeout: 4500
                }, (r) => {
                    let b = '';
                    r.on('data', c => b += c);
                    r.on('end', () => r.statusCode === 200 ? res(b) : rej(new Error('HTTP ' + r.statusCode)));
                });
                req.on('error', rej);
                req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
            });
            const parsed = JSON.parse(raw);
            if (parsed && ((parsed.videoStreams && parsed.videoStreams.length) || (parsed.audioStreams && parsed.audioStreams.length))) {
                info = parsed;
                break;
            }
        } catch (e) {}
    }
    if (!info) return null;

    const title = info.title || `YouTube_${videoId}`;
    const qHeight = String(quality).includes('360') ? 360 : (String(quality).includes('480') ? 480 : (String(quality).includes('720') ? 720 : 1080));
    const vAll = (info.videoStreams || []).filter(s => s && s.url);
    const aAll = (info.audioStreams || []).filter(s => s && s.url);
    const progressive = vAll.filter(s => !s.videoOnly && (s.format === 'MPEG_4' || (s.mimeType || '').includes('mp4')));
    const combinedFallback = progressive.length ? progressive : vAll.filter(s => !s.videoOnly);
    const downloadToDisk = (streamUrl, destPath, redirects = 0) => new Promise((res, rej) => {
        if (redirects > 4) return rej(new Error('Too many redirects'));
        const mod = streamUrl.startsWith('https') ? https : http;
        const req = mod.get(streamUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36' },
            timeout: 45000
        }, (r) => {
            if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
                r.resume();
                return downloadToDisk(new URL(r.headers.location, streamUrl).toString(), destPath, redirects + 1).then(res, rej);
            }
            if (r.statusCode < 200 || r.statusCode >= 300) {
                r.resume();
                return rej(new Error('Stream HTTP ' + r.statusCode));
            }
            const ws = fs.createWriteStream(destPath);
            r.pipe(ws);
            ws.on('finish', () => res(destPath));
            ws.on('error', rej);
        });
        req.on('error', rej);
        req.on('timeout', () => { req.destroy(); rej(new Error('Stream timeout')); });
    });

    if (clientId) sendProgress(clientId, 'Step 2: Streaming YouTube media via cloud relay...', 'processing');

    // Helper to extract ACTUAL width/height/bitrate of final downloaded media
    const probeMediaInfo = (fp) => new Promise((res) => {
        const ff = ffBin || 'ffmpeg';
        exec(`"${ff}" -i "${fp}"`, { windowsHide: true }, (_e, _out, errOut) => {
            const log = errOut || '';
            const dimMatch = log.match(/Video:.*?,\s*(\d{3,4})x(\d{3,4})/i);
            const brMatch = log.match(/Audio:.*?,\s*(\d+)\s*kb\/s/i) || log.match(/bitrate:\s*(\d+)\s*kb\/s/i);
            res({
                width: dimMatch ? parseInt(dimMatch[1], 10) : 0,
                height: dimMatch ? parseInt(dimMatch[2], 10) : 0,
                kbps: brMatch ? parseInt(brMatch[1], 10) : 0
            });
        });
    });

    if (format === 'audio') {
        const sortedA = aAll.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const chosen = sortedA[0] || combinedFallback[0] || vAll[0];
        if (!chosen || !chosen.url) return null;
        const rawTmp = path.join(outDir, `yt_piped_raw_${timestamp}.dat`);
        const mp3Path = path.join(outDir, `social_${timestamp}_${videoId}.mp3`);
        await downloadToDisk(chosen.url, rawTmp);
        const br = String(quality).includes('128') ? '128k' : (String(quality).includes('192') ? '192k' : '320k');
        await new Promise((res, rej) => {
            const ff = require('child_process').spawn(ffBin, ['-y', '-i', rawTmp, '-vn', '-c:a', 'libmp3lame', '-b:a', br, mp3Path], { windowsHide: true });
            ff.on('close', c => c === 0 && fs.existsSync(mp3Path) ? res() : rej(new Error('MP3 encode exit ' + c)));
            ff.on('error', rej);
        });
        try { if (fs.existsSync(rawTmp)) fs.unlinkSync(rawTmp); } catch (e) {}
        const baseName = path.basename(mp3Path);
        const infoProbe = await probeMediaInfo(mp3Path);
        const actualBr = infoProbe.kbps ? `${infoProbe.kbps}kbps MP3` : `${br} MP3`;
        console.log(`[YouTube Piped Success] Audio (${actualBr}) -> ${baseName}`);
        return { filePath: mp3Path, fileName: baseName, downloadUrl: `/uploads/${baseName}`, title, actualQuality: actualBr };
    }

    // Properly parse height even for "1080p60" / "720p60" (previously became 108060!)
    const parseH = (s) => {
        if (s && s.height) return Number(s.height) || 0;
        const m = String(s.quality || '').match(/(\d{3,4})p/i);
        return m ? parseInt(m[1], 10) : (parseInt(String(s.quality || '').replace(/[^\d]/g, ''), 10) || 0);
    };
    const adaptiveMp4 = vAll.filter(s => s.videoOnly && (s.format === 'MPEG_4' || (s.mimeType || '').includes('mp4'))).sort((a, b) => parseH(b) - parseH(a));
    const adaptiveAny = vAll.filter(s => s.videoOnly).sort((a, b) => parseH(b) - parseH(a));
    let bestAdaptive = adaptiveMp4.find(s => parseH(s) <= qHeight) || adaptiveMp4[0] || null;
    const anyMatch = adaptiveAny.find(s => parseH(s) <= qHeight);
    if (anyMatch && (!bestAdaptive || (parseH(anyMatch) > parseH(bestAdaptive) && parseH(anyMatch) <= qHeight))) {
        bestAdaptive = anyMatch;
    }
    const mp4Path = path.join(outDir, `social_${timestamp}_${videoId}.mp4`);

    if (bestAdaptive && aAll.length > 0) {
        const isWebm = !(bestAdaptive.format === 'MPEG_4' || (bestAdaptive.mimeType || '').includes('mp4'));
        const vTmp = path.join(outDir, `yt_pv_${timestamp}.${isWebm ? 'webm' : 'mp4'}`);
        const aTmp = path.join(outDir, `yt_pa_${timestamp}.m4a`);
        const sortedA = aAll.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        await Promise.all([downloadToDisk(bestAdaptive.url, vTmp), downloadToDisk(sortedA[0].url, aTmp)]);
        await new Promise((res, rej) => {
            const vCodecArgs = isWebm ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p'] : ['-c:v', 'copy'];
            const ff = require('child_process').spawn(ffBin, ['-y', '-i', vTmp, '-i', aTmp, ...vCodecArgs, '-c:a', 'aac', '-movflags', '+faststart', '-shortest', mp4Path], { windowsHide: true });
            ff.on('close', c => c === 0 && fs.existsSync(mp4Path) ? res() : rej(new Error('Mux exit ' + c)));
            ff.on('error', rej);
        });
        try { fs.unlinkSync(vTmp); fs.unlinkSync(aTmp); } catch (e) {}
    } else {
        const sortedProg = combinedFallback.slice().sort((a, b) => parseH(b) - parseH(a));
        const chosen = sortedProg.find(s => parseH(s) <= qHeight) || sortedProg[0] || vAll[0];
        if (!chosen || !chosen.url) return null;
        await downloadToDisk(chosen.url, mp4Path);
    }

    if (!fs.existsSync(mp4Path) || fs.statSync(mp4Path).size < 1024) return null;
    const baseName = path.basename(mp4Path);
    const vProbe = await probeMediaInfo(mp4Path);
    const actualQ = vProbe.height ? `${vProbe.height}p (${vProbe.width}x${vProbe.height}) MP4` : `${qHeight}p MP4`;
    console.log(`[YouTube Piped Success] Video (${actualQ}) -> ${baseName}`);
    return { filePath: mp4Path, fileName: baseName, downloadUrl: `/uploads/${baseName}`, title, actualQuality: actualQ };
}

function extractAudioChunk(filePath, startSec, durationSec) {
    return new Promise((resolve, reject) => {
        if (!filePath || !fs.existsSync(filePath)) {
            return reject(new Error('Audio file does not exist'));
        }
        const chunkPath = filePath + `_chunk_${startSec}_${Date.now()}.mp3`;
        const ffmpegCmd = (ffmpegPath && ffmpegPath !== 'ffmpeg' && fs.existsSync(ffmpegPath)) ? `"${ffmpegPath}"` : 'ffmpeg';
        const cmd = `${ffmpegCmd} -y -i "${filePath}" -ss ${startSec} -t ${durationSec} -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 48k "${chunkPath}"`;
        exec(cmd, { windowsHide: true }, (err) => {
            if (!err && fs.existsSync(chunkPath)) {
                try {
                    const buf = fs.readFileSync(chunkPath);
                    fs.unlink(chunkPath, () => {});
                    return resolve(buf);
                } catch(e) {
                    return reject(e);
                }
            }
            if (fs.existsSync(chunkPath)) fs.unlink(chunkPath, () => {});
            reject(err || new Error('Failed to extract audio chunk'));
        });
    });
}

function parseAndOffsetSrt(srtText, offsetMs, language = 'Sinhala') {
    if (!srtText || typeof srtText !== 'string') return [];
    let cleaned = srtText
        .replace(/```(?:srt|text)?/gi, '')
        .replace(/```/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\[Music\]/gi, '')
        .replace(/\[Laughter\]/gi, '')
        .replace(/\[Applause\]/gi, '');

    cleaned = cleaned.replace(/(\d{1,2}:\d{2}:\d{2})[\., ](\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2})[\., ](\d{1,3})/g, (match, p1, p2, p3, p4) => {
        if (p1.length === 7) p1 = '0' + p1;
        if (p3.length === 7) p3 = '0' + p3;
        return `${p1},${p2.padEnd(3, '0')} --> ${p3},${p4.padEnd(3, '0')}`;
    });
    cleaned = cleaned.replace(/(?:^|\n)(\d{2}:\d{2})[\., ](\d{1,3})\s*-->\s*(\d{2}:\d{2})[\., ](\d{1,3})/g, (match, p1, p2, p3, p4) => {
        return `\n00:${p1},${p2.padEnd(3, '0')} --> 00:${p3},${p4.padEnd(3, '0')}`;
    });

    const lines = cleaned.split('\n').map(l => l.trim());
    const timestampRegex = /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/;
    const blocks = [];
    let currentTimestamp = null;
    let currentText = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (timestampRegex.test(line)) {
            if (currentTimestamp && currentText.length > 0) {
                const sText = sanitizeSubtitleText(currentText.join(' '), language);
                if (sText) blocks.push({ timestamp: currentTimestamp, text: sText });
            }
            currentTimestamp = line;
            currentText = [];
        } else if (currentTimestamp) {
            if (!/^\d+$/.test(line) && line !== '') {
                currentText.push(line);
            }
        }
    }
    if (currentTimestamp && currentText.length > 0) {
        const sText = sanitizeSubtitleText(currentText.join(' '), language);
        if (sText) blocks.push({ timestamp: currentTimestamp, text: sText });
    }

    function timeToMs(timeStr) {
        const parts = timeStr.split(':');
        let hrs = parseInt(parts[0], 10);
        let mins = parseInt(parts[1], 10);
        const secParts = parts[2].split(',');
        let secs = parseInt(secParts[0], 10);
        let millis = parseInt(secParts[1], 10);
        // Only unwrap if hour is 1, minutes is 0, seconds < 60 and no chunk offset applied
        if (hrs === 1 && mins === 0 && secs < 60 && offsetMs === 0) {
            return (1 * 60000) + (secs * 1000) + millis;
        }
        return (hrs * 3600000) + (mins * 60000) + (secs * 1000) + millis;
    }

    // Guard against double offset: Check if chunk timestamps are ALREADY absolute (>= offsetMs - 3000)
    let isAlreadyAbsolute = false;
    if (offsetMs > 10000 && blocks.length > 0) {
        const firstM = blocks[0].timestamp.match(timestampRegex);
        if (firstM) {
            const firstMs = timeToMs(firstM[1]);
            if (firstMs >= offsetMs - 3000) {
                isAlreadyAbsolute = true;
            }
        }
    }

    function msToTime(ms) {
        const hrs = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const millis = ms % 1000;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
    }

    const offsetToApply = isAlreadyAbsolute ? 0 : offsetMs;
    const offsetBlocks = [];
    for (const blk of blocks) {
        const m = blk.timestamp.match(timestampRegex);
        if (!m) continue;
        const startMs = timeToMs(m[1]) + offsetToApply;
        const endMs = timeToMs(m[2]) + offsetToApply;
        offsetBlocks.push({
            startMs,
            endMs,
            timestamp: `${msToTime(startMs)} --> ${msToTime(endMs)}`,
            text: blk.text
        });
    }
    return offsetBlocks;
}

function extractFullAudio(filePath) {
    return new Promise((resolve, reject) => {
        if (!filePath || !fs.existsSync(filePath)) {
            return reject(new Error('Audio/Video file does not exist'));
        }
        const outPath = filePath + `_full_${Date.now()}.mp3`;
        const ffmpegCmd = (ffmpegPath && ffmpegPath !== 'ffmpeg' && fs.existsSync(ffmpegPath)) ? `"${ffmpegPath}"` : 'ffmpeg';
        const cmd = `${ffmpegCmd} -y -i "${filePath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 48k "${outPath}"`;
        exec(cmd, { windowsHide: true }, (err) => {
            if (!err && fs.existsSync(outPath)) {
                try {
                    const buf = fs.readFileSync(outPath);
                    fs.unlink(outPath, () => {});
                    return resolve(buf);
                } catch(e) {
                    return reject(e);
                }
            }
            if (fs.existsSync(outPath)) fs.unlink(outPath, () => {});
            try {
                const directBuf = fs.readFileSync(filePath);
                return resolve(directBuf);
            } catch(e) {
                return reject(err || new Error('Failed to extract full audio'));
            }
        });
    });
}

// =====================================================================
// 🎬 STATE-OF-THE-ART CAPCUT AUTO-CAPTION ACOUSTIC WAVEFORM ENGINE
// Word-level acoustic alignment + natural speech pause detection
// =====================================================================

function parseCapCutWordLines(rawText, offsetSec) {
    const lines = (rawText || '').split('\n');
    const words = [];
    const lineRegex = /^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*[:=]\s*(.+)$/;

    for (const l of lines) {
        const m = l.match(lineRegex);
        if (m) {
            let start = parseFloat(m[1]) + offsetSec;
            let end = parseFloat(m[2]) + offsetSec;
            let wordText = m[3].trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
            if (wordText && end > start) {
                words.push({
                    start: Math.round(start * 1000) / 1000,
                    end: Math.round(end * 1000) / 1000,
                    word: wordText
                });
            }
        }
    }
    return words;
}

function secToSrtTime(sec) {
    const ms = Math.round(Math.max(0, sec) * 1000);
    const pad = (n, z = 2) => ('00' + n).slice(-z);
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor(ms % 1000);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

function buildCapCutSrt(wordsList, wordsLimit = 1, targetLanguage = 'Sinhala') {
    if (!wordsList || wordsList.length === 0) return '';
    const isSinhala = (targetLanguage === 'Sinhala' || targetLanguage === 'si');
    const sorted = [...wordsList].sort((a, b) => a.start - b.start);
    
    // Deduplicate overlapping words
    const cleanWords = [];
    for (const w of sorted) {
        if (cleanWords.length > 0) {
            const prev = cleanWords[cleanWords.length - 1];
            if (Math.abs(w.start - prev.start) < 0.1 && w.word === prev.word) {
                prev.end = Math.max(prev.end, w.end);
                continue;
            }
        }
        cleanWords.push(w);
    }

    const limit = (wordsLimit && wordsLimit >= 1 && wordsLimit <= 8) ? wordsLimit : 1;
    const blocks = [];
    let curGroup = [];

    for (let i = 0; i < cleanWords.length; i++) {
        const w = cleanWords[i];
        const nextW = cleanWords[i + 1];
        curGroup.push(w);

        const pauseToNext = nextW ? (nextW.start - w.end) : 999;
        const reachedLimit = curGroup.length >= limit;
        const isPause = pauseToNext > 0.28; // 280ms speech pause closes the block!
        const durationTooLong = (w.end - curGroup[0].start) > 3.0;
        const curCharLen = curGroup.map(x => x.word).join(' ').length;
        const charLenTooLong = curGroup.length >= 2 && curCharLen > 24;

        if (reachedLimit || isPause || durationTooLong || charLenTooLong || !nextW) {
            const bStart = curGroup[0].start;
            let bEnd = curGroup[curGroup.length - 1].end;
            
            // Subtitle ends when vocalization ends, never overlaps next word
            if (nextW && bEnd > nextW.start) {
                bEnd = Math.max(bStart + 0.15, nextW.start - 0.03);
            } else {
                // Natural persistence: keep on screen for speech duration + tiny 50ms release
                bEnd = Math.max(bStart + 0.18, bEnd + 0.05);
                if (nextW && bEnd > nextW.start) {
                    bEnd = nextW.start - 0.02;
                }
            }

            let text = curGroup.map(x => x.word).join(' ');
            if (isSinhala && typeof fixSinhalaLigatures === 'function') {
                text = fixSinhalaLigatures(text);
            }
            if (typeof sanitizeSubtitleText === 'function') {
                text = sanitizeSubtitleText(text, targetLanguage);
            }
            if (text) {
                blocks.push({
                    start: bStart,
                    end: bEnd,
                    text: text
                });
            }
            curGroup = [];
        }
    }

    const srtLines = [];
    for (let idx = 0; idx < blocks.length; idx++) {
        const blk = blocks[idx];
        srtLines.push(`${idx + 1}`);
        srtLines.push(`${secToSrtTime(blk.start)} --> ${secToSrtTime(blk.end)}`);
        srtLines.push(`${blk.text}\n`);
    }

    return srtLines.join('\n').trim();
}

// Helper to extract a sliced segment of audio into an MP3 buffer with sample-accurate seeking
function extractAudioChunkBuffer(filePath, startSec, durationSec) {
    return new Promise((resolve) => {
        if (!filePath || !fs.existsSync(filePath)) return resolve(null);
        const outAudioPath = filePath + `_chunk_${Math.round(startSec)}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        let ffmpegCmd = 'ffmpeg';
        if (typeof ffmpegPath !== 'undefined' && ffmpegPath && ffmpegPath !== 'ffmpeg' && fs.existsSync(ffmpegPath)) {
            ffmpegCmd = `"${ffmpegPath}"`;
        } else {
            const localStatic = path.join(__dirname, 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
            if (fs.existsSync(localStatic)) ffmpegCmd = `"${localStatic}"`;
        }
        const seekSec = Math.max(0, startSec);
        const durSec = Math.max(0.5, durationSec);
        // Use -ss ... -accurate_seek -i ... to eliminate keyframe snap jitter
        exec(`${ffmpegCmd} -y -ss ${seekSec.toFixed(3)} -accurate_seek -i "${filePath}" -t ${durSec.toFixed(3)} -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 48k "${outAudioPath}"`, { windowsHide: true }, (err) => {
            if (!err && fs.existsSync(outAudioPath)) {
                try {
                    const audioBuf = fs.readFileSync(outAudioPath);
                    fs.unlink(outAudioPath, () => {});
                    return resolve(audioBuf);
                } catch(e) {}
            }
            try { if (fs.existsSync(outAudioPath)) fs.unlinkSync(outAudioPath); } catch(e){}
            resolve(null);
        });
    });
}

function shiftSrtTimestamps(srtText, offsetSec) {
    if (!srtText || offsetSec === 0) return srtText;
    const offsetMs = Math.round(offsetSec * 1000);
    
    // Universal regex matching any SRT timestamp interval: (HH:)?MM:SS([,. ]mmm)? --> (HH:)?MM:SS([,. ]mmm)?
    const timeRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[,\.](\d{1,3}))?\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[,\.](\d{1,3}))?/g;
    
    function toMs(h, m, s, ms) {
        const hh = parseInt(h || '0', 10);
        const mm = parseInt(m || '0', 10);
        const ss = parseInt(s || '0', 10);
        const millis = parseInt((ms || '0').padEnd(3, '0').slice(0, 3), 10);
        return (hh * 3600000) + (mm * 60000) + (ss * 1000) + millis;
    }
    
    function msToSrt(ms) {
        const pad = (n, z = 2) => ('00' + n).slice(-z);
        const hrs = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const millis = Math.floor(ms % 1000);
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
    }
    
    return srtText.replace(timeRegex, (match, h1, m1, s1, ms1, h2, m2, s2, ms2) => {
        const startMs = Math.max(0, toMs(h1, m1, s1, ms1) + offsetMs);
        const endMs = Math.max(startMs + 100, toMs(h2, m2, s2, ms2) + offsetMs);
        return `${msToSrt(startMs)} --> ${msToSrt(endMs)}`;
    });
}

function renumberSrt(srtText) {
    if (!srtText) return '';
    const blocks = srtText.trim().split(/\n\s*\n+/);
    const result = [];
    let counter = 1;
    for (const b of blocks) {
        const lines = b.trim().split('\n');
        if (lines.length >= 2 && lines.some(l => l.includes('-->'))) {
            const timeLineIdx = lines.findIndex(l => l.includes('-->'));
            if (timeLineIdx !== -1) {
                const textLines = lines.slice(timeLineIdx + 1).filter(l => l.trim() && !/^\d+$/.test(l.trim()));
                if (textLines.length > 0) {
                    result.push(`${counter}\n${lines[timeLineIdx].trim()}\n${textLines.join('\n').trim()}`);
                    counter++;
                }
            }
        }
    }
    return result.join('\n\n').trim();
}

// Lightweight helper retained only for acoustic envelope snap utilities

// Snap SRT block start/end times to real WAV acoustic speech envelope (eliminates words appearing early/late!)
function snapSrtToWavSpeechEnvelope(srtText, wavPath) {
    if (!srtText || !wavPath || !fs.existsSync(wavPath)) return srtText;
    let fd = null;
    try {
        fd = fs.openSync(wavPath, 'r');
        const stat = fs.fstatSync(fd);
        const totalWavMs = Math.floor(Math.max(0, stat.size - 44) / 32); // 16000 * 2 bytes / 1000 = 32 bytes/ms
        if (totalWavMs < 200) return srtText;

        const blocks = srtText.trim().split(/\n\s*\n+/);
        const tLineRx = /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/;
        const toMs = (s) => {
            const [hms, ms] = s.split(',');
            const [h, m, sec] = hms.split(':').map(Number);
            return h * 3600000 + m * 60000 + sec * 1000 + Number(ms);
        };
        const toStr = (ms) => {
            const pad = (n, z = 2) => ('00' + n).slice(-z);
            return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor((ms % 3600000) / 60000))}:${pad(Math.floor((ms % 60000) / 1000))},${pad(Math.floor(ms % 1000), 3)}`;
        };

        const parsed = [];
        for (const blk of blocks) {
            const lines = blk.trim().split('\n');
            const ti = lines.findIndex(l => tLineRx.test(l.trim()));
            if (ti === -1) continue;
            const m = lines[ti].trim().match(tLineRx);
            const text = lines.slice(ti + 1).join('\n').trim();
            if (!text) continue;
            parsed.push({ startMs: toMs(m[1]), endMs: toMs(m[2]), text });
        }

        const FRAME_MS = 20;
        const FRAME_BYTES = 16 * FRAME_MS * 2; // 640 bytes per 20ms frame
        for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            const prevEnd = i > 0 ? parsed[i - 1].endMs : 0;
            const nextStart = (i + 1 < parsed.length) ? parsed[i + 1].startMs : totalWavMs;
            const winStartMs = Math.max(prevEnd, item.startMs - 260);
            const winEndMs = Math.min(nextStart, totalWavMs, item.endMs + 260);
            if (winEndMs - winStartMs < 200) continue;

            const byteStart = 44 + Math.floor(winStartMs * 16) * 2;
            const byteLen = Math.min(stat.size - byteStart, Math.floor((winEndMs - winStartMs) * 16) * 2);
            if (byteLen < FRAME_BYTES * 2) continue;

            const buf = Buffer.allocUnsafe(byteLen);
            fs.readSync(fd, buf, 0, byteLen, byteStart);
            const frameCount = Math.floor(byteLen / FRAME_BYTES);
            const rms = new Float32Array(frameCount);
            let maxRms = 0;
            for (let f = 0; f < frameCount; f++) {
                let sumSq = 0;
                const base = f * FRAME_BYTES;
                for (let b = 0; b < FRAME_BYTES - 1; b += 2) {
                    const s = buf.readInt16LE(base + b);
                    sumSq += s * s;
                }
                const val = Math.sqrt(sumSq / (FRAME_BYTES / 2));
                rms[f] = val;
                if (val > maxRms) maxRms = val;
            }
            if (maxRms < 220) continue; // Quiet section: keep model estimate
            const thresh = Math.max(180, maxRms * 0.14);
            let firstIdx = 0;
            let lastIdx = frameCount - 1;
            while (firstIdx < frameCount && rms[firstIdx] < thresh) firstIdx++;
            while (lastIdx > firstIdx && rms[lastIdx] < thresh) lastIdx--;
            if (lastIdx > firstIdx) {
                const newStart = Math.max(winStartMs, Math.min(item.startMs + 250, winStartMs + firstIdx * FRAME_MS - 30));
                const newEnd = Math.min(winEndMs, Math.max(newStart + 220, winStartMs + (lastIdx + 1) * FRAME_MS + 60));
                item.startMs = Math.round(newStart);
                item.endMs = Math.round(Math.min(nextStart > newStart + 200 ? nextStart - 20 : newEnd, newEnd));
            }
        }
        return parsed.map((it, idx) => `${idx + 1}\n${toStr(it.startMs)} --> ${toStr(Math.max(it.startMs + 160, it.endMs))}\n${it.text}`).join('\n\n');
    } catch (e) {
        return srtText;
    } finally {
        try { if (fd !== null) fs.closeSync(fd); } catch (e) {}
    }
}

// Subtitle Generation & Translation powered cleanly by runMmsSubtitleEngine & runMmsSrtTranslateEngine (100% free local models)

// Lightweight multipart/form-data parser for native HTTP server with timeout & reset immunity
function parseMultipartFormData(req) {
    return new Promise((resolve, reject) => {
        if (req.socket) req.socket.setTimeout(0);
        req.setTimeout(0);
        const contentType = req.headers['content-type'] || '';
        const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!match) return reject(new Error('No boundary in content-type'));

        const boundary = match[1] || match[2];
        const chunks = [];
        let isAborted = false;

        req.on('aborted', () => {
            isAborted = true;
            reject(new Error('Upload connection closed'));
        });

        req.on('data', chunk => {
            if (!isAborted) chunks.push(chunk);
        });

        req.on('end', () => {
            if (isAborted) return;
            try {
                const buffer = Buffer.concat(chunks);
                const fields = {};
                let file = null;
                const files = [];

                const boundaryBuffer = Buffer.from('--' + boundary);
                let start = 0;

                while (start < buffer.length) {
                    const nextBoundary = buffer.indexOf(boundaryBuffer, start);
                    if (nextBoundary === -1) break;

                    if (start > 0) {
                        const part = buffer.slice(start, nextBoundary - 2); // minus CRLF
                        const headerEnd = part.indexOf('\r\n\r\n');
                        if (headerEnd !== -1) {
                            const headerStr = part.slice(0, headerEnd).toString('utf8');
                            const body = part.slice(headerEnd + 4);

                            const nameMatch = headerStr.match(/name="([^"]+)"/);
                            const filenameMatch = headerStr.match(/filename="([^"]+)"/);

                            if (nameMatch) {
                                const name = nameMatch[1];
                                if (filenameMatch) {
                                    const filename = Date.now() + '-' + files.length + '-' + filenameMatch[1].replace(/[^a-zA-Z0-9._-]/g, '_');
                                    const filePath = path.join(uploadDir, filename);
                                    fs.writeFileSync(filePath, body);
                                    file = {
                                        fieldname: name,
                                        originalname: filenameMatch[1],
                                        filename: filename,
                                        path: filePath,
                                        buffer: body,
                                        size: body.length
                                    };
                                    files.push(file);
                                } else {
                                    fields[name] = body.toString('utf8').trim();
                                }
                            }
                        }
                    }
                    start = nextBoundary + boundaryBuffer.length + 2;
                }

                resolve({ fields, file, files });
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', (err) => {
            if (!isAborted) {
                isAborted = true;
                reject(err);
            }
        });
    });
}

// ----------------------------------------------------------------------
// HTTP SERVER & ROUTER
// ----------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
    const reqStartedAt = Date.now();
    const rawReqPath = (req.url || '/').split('?')[0];
    res.on('finish', () => {
        const shouldLog = rawReqPath === '/' ||
            (rawReqPath.startsWith('/api/') && !rawReqPath.startsWith('/api/progress') && rawReqPath !== '/api/srt-result' && !rawReqPath.startsWith('/api/telegram-file-proxy'));
        if (shouldLog || res.statusCode >= 400) {
            const ms = Date.now() - reqStartedAt;
            console.log(`[CapZone HTTP] ${req.method} ${rawReqPath} -> ${res.statusCode} (${ms}ms)`);
        }
    });
    const originHeader = req.headers.origin || req.headers.referer || '';
    let corsOrigin = '*';
    if (originHeader) {
        try {
            const u = new URL(originHeader);
            corsOrigin = u.origin;
        } catch (e) {
            corsOrigin = originHeader.split('/')[0] + '//' + (originHeader.split('/')[2] || originHeader);
        }
    }

    const reqAllowHeaders = req.headers['access-control-request-headers'];
    const corsHeaders = {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
        'Access-Control-Allow-Headers': reqAllowHeaders ? reqAllowHeaders : 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, cache-control, Pragma, pragma, Expires, expires, If-Modified-Since, Range, x-user-email, x-api-key, x-cz-shield, x-capzone-shield, x-upload-id, x-chunk-index, cf-connecting-ip, cf-ray, *',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    // Auto-attach CORS headers to EVERY writeHead call across entire server
    const origWriteHead = res.writeHead;
    res.writeHead = function (statusCode, statusMessage, headers) {
        if (typeof statusMessage === 'object' && !headers) {
            headers = statusMessage;
            statusMessage = undefined;
        }
        headers = headers || {};
        for (const [k, v] of Object.entries(corsHeaders)) {
            if (!headers[k]) headers[k] = v;
        }
        if (statusMessage) {
            return origWriteHead.call(this, statusCode, statusMessage, headers);
        } else {
            return origWriteHead.call(this, statusCode, headers);
        }
    };

    // Set default headers for all responses
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

    // Handle OPTIONS Preflight immediately with full CORS headers
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        return res.end();
    }

    // 🛡️ STRICT VPS IP LICENSE GUARD (Host IP 10.0.0.28)
    const hostAuth = isAuthorizedVpsHost();
    if (!hostAuth.authorized) {
        console.error(`[CyberShield Security Alert] 🚨 Unauthorized host execution! IPs: [${hostAuth.hostIps.join(', ')}]. Locked to VPS: ${AUTHORIZED_VPS_IP}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            error: `Unauthorized host environment. Server code is locked to VPS IP ${AUTHORIZED_VPS_IP}. Access denied.`,
            code: 'VPS_IP_LOCKED'
        }));
    }

    const clientIp = getClientIp(req);
    const host = (req.headers.host || '').toLowerCase().split(':')[0];
    const userAgent = req.headers['user-agent'] || '';
    let isOriginTrusted = true;
    const headers = corsHeaders;

    // Safe URI Parsing Guard (Prevents URI malformed crash exploits)
    let reqUrl, parsedUrl, pathname;
    try {
        reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        pathname = decodeURIComponent(reqUrl.pathname);
        parsedUrl = {
            pathname: pathname,
            query: Object.fromEntries(reqUrl.searchParams.entries()),
            searchParams: reqUrl.searchParams
        };
    } catch (uriErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Bad Request: Malformed URI detected by Shield' }));
    }

    const isInternalLocal = (clientIp === '127.0.0.1' || clientIp === '::1' || host === 'localhost' || host === '127.0.0.1');

    // 🛡️ STRICT API ORIGIN & ANTI-THEFT GUARD
    // Reject any request to /api/* from an untrusted origin, copied HTML template, or unauthorized domain
    if (pathname.startsWith('/api/')) {
        if (originHeader && !isOriginTrusted) {
            console.warn(`[CapZone Shield] 🚨 Blocked unauthorized API access attempt from untrusted origin: "${originHeader}" on "${pathname}" (IP: ${clientIp})`);
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                error: 'Access Denied: API request from unauthorized origin or domain is strictly blocked by CapZone Security Engine.',
                code: 'FORBIDDEN_ORIGIN'
            }));
        }
    }

    // 0. Hacker Honeypot & Common Exploit Scanner Filter
    const lowerPath = (pathname || '').toLowerCase();
    if (
        lowerPath.includes('/.env') ||
        lowerPath.includes('/.git') ||
        lowerPath.includes('/wp-admin') ||
        lowerPath.includes('/wp-login') ||
        lowerPath.includes('/phpmyadmin') ||
        lowerPath.includes('/xmlrpc.php') ||
        lowerPath.includes('/.aws') ||
        lowerPath.includes('/server.js') ||
        lowerPath.includes('/admin.js') ||
        lowerPath.includes('/dump.sql') ||
        lowerPath.includes('/database.sqlite') ||
        lowerPath.includes('/etc/passwd')
    ) {
        console.warn(`[CapZone Shield] 🚨 Honeypot triggered by IP: ${clientIp} on "${pathname}"`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access Denied: Security Violation.' }));
    }

    // 1. Anti-Bot & Scraper Guard for automated AI scrapers & hacking tools
    if (isMaliciousBot(userAgent, isInternalLocal) && !req.headers['x-capzone-internal']) {
        console.warn(`[CapZone Shield] 🚨 Blocked automated bot/scraper: "${userAgent}" from IP: ${clientIp} on ${pathname}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access Denied: Automated scraping or crawler access is prohibited by CapZone Security Engine.' }));
    }

    // 2. IP Rate Limiting
    const isSensitivePath = pathname.startsWith('/api/auth/') || pathname === '/api/save-user' || pathname.startsWith('/api/payhere-');
    if (!checkRateLimit(clientIp, isSensitivePath)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' }));
    }

    // 3. Dynamic Session Verification Handshake Endpoint
    if (req.method === 'POST' && pathname === '/api/sec/verify') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const shieldToken = req.headers['x-cz-shield'];
                const { h } = JSON.parse(body || '{}');
                if (!isAllowedHost(h) || !verifyShieldToken(shieldToken, clientIp)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Shield verification failed' }));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, active: true }));
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid verification payload' }));
            }
        });
        return;
    }

    // 3.1 Official Cloudflare Turnstile Verification API
    if (req.method === 'POST' && pathname === '/api/turnstile/verify') {
        let body = '';
        req.on('data', chunk => {
            if (body.length < 50000) body += chunk;
        });
        req.on('end', async () => {
            try {
                const { token } = parseSafeJson(body);
                const verification = await verifyCloudflareTurnstile(token, clientIp);
                if (verification.success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: true, verified: true, message: 'Cloudflare Turnstile Verified' }));
                } else {
                    console.warn(`[CapZone Shield] 🚨 Cloudflare Turnstile failed for IP ${clientIp}:`, verification.error);
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: verification.error || 'Turnstile verification failed' }));
                }
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'GET' && pathname === '/api/turnstile/config') {
        loadSecConfig();
        const effectiveSiteKey = process.env.TURNSTILE_SITE_KEY || secConfig.turnstile_site_key || '0x4AAAAAAFTt3WlfzARJ26K-';
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        return res.end(JSON.stringify({ 
            enabled: secConfig.turnstile_enabled !== false,
            mode: secConfig.turnstile_mode || 'interactive',
            siteKey: effectiveSiteKey 
        }));
    }

    if (req.method === 'GET' && pathname === '/api/admin/security-config') {
        loadSecConfig();
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        return res.end(JSON.stringify(secConfig));
    }

    if (req.method === 'POST' && pathname === '/api/admin/security-config') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                loadSecConfig();
                if (typeof data.turnstile_enabled === 'boolean') secConfig.turnstile_enabled = data.turnstile_enabled;
                if (data.turnstile_mode) secConfig.turnstile_mode = data.turnstile_mode;
                if (data.turnstile_site_key) secConfig.turnstile_site_key = data.turnstile_site_key.trim();
                if (data.turnstile_secret_key) secConfig.turnstile_secret_key = data.turnstile_secret_key.trim();
                saveSecConfig();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, config: secConfig }));
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { identifier, password } = JSON.parse(body || '{}');
                const cleanId = (identifier || '').toLowerCase().trim();
                const cleanPass = password || '';
                if (!cleanId || !cleanPass) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Email/Username and password are required' }));
                }

                let user = usersDB[cleanId];
                if (!user && !cleanId.includes('@')) {
                    user = Object.values(usersDB).find(u => {
                        const uName = (u.name || '').toLowerCase();
                        const uEmailPrefix = (u.email || '').split('@')[0].toLowerCase();
                        return uName === cleanId || uEmailPrefix === cleanId;
                    });
                }

                if (user && user.is_google && !user.password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        success: false, 
                        isGoogle: true,
                        error: 'මෙම ගිණුම Google හරහා සාදන ලද්දකි. කරුණාකර "Sign In With Google" බොත්තම භාවිතා කරන්න.' 
                    }));
                }

                if (!user || user.password !== cleanPass) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        success: false, 
                        error: 'මුරපදය හෝ Email/Username වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.' 
                    }));
                }

                // Reactivate and unmark from deletedUsersSet on successful login
                unmarkUserDeleted(user.email);
                user.active = true;
                saveDB();

                // Return instant login success response immediately
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    user: {
                        email: user.email,
                        name: user.name || user.email.split('@')[0],
                        balance: user.balance || 0,
                        subscription_type: user.subscription_type || 'none'
                    }
                }));

                // Run Firebase Admin credential synchronization non-blockingly in the background
                const auth = getFirebaseAdminAuth();
                if (auth) {
                    (async () => {
                        try {
                            const uRec = await auth.getUserByEmail(user.email);
                            if (uRec) {
                                await auth.updateUser(uRec.uid, { password: cleanPass });
                            }
                        } catch(fbGetErr) {
                            if (fbGetErr.code === 'auth/user-not-found') {
                                await auth.createUser({
                                    email: user.email,
                                    password: cleanPass,
                                    displayName: user.name || cleanId
                                });
                            }
                        }
                    })().catch(e => console.warn('[Firebase Sync] notice:', e.message));
                }
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/change-password') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { email, currentPassword, newPassword } = JSON.parse(body || '{}');
                const normEmail = (email || '').toLowerCase().trim();
                if (!normEmail || !newPassword) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Email and new password are required' }));
                }

                if (!isStrongPassword(newPassword)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        error: 'නව මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත! අවම වශයෙන් අකුරු 8ක්, ඉංග්‍රීසි අකුරු සහ අංක අඩංගු විය යුතුය.' 
                    }));
                }

                const user = getUser(normEmail);
                if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'User account not found' }));
                }

                if (user.password && currentPassword && user.password !== currentPassword) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'දැනට පවතින මුරපදය වැරදියි (Incorrect current password)' }));
                }

                user.password = newPassword;
                user.auth_provider = 'email';
                saveDB();

                if (isFirebaseAdminInitialized && admin) {
                    try {
                        const auth = admin.auth ? admin.auth() : require('firebase-admin/auth').getAuth();
                        try {
                            const uRec = await auth.getUserByEmail(normEmail);
                            if (uRec) {
                                await auth.updateUser(uRec.uid, { password: newPassword });
                            }
                        } catch(fbGetErr) {
                            if (fbGetErr.code === 'auth/user-not-found') {
                                await auth.createUser({
                                    email: normEmail,
                                    password: newPassword,
                                    displayName: user.name || normEmail.split('@')[0]
                                });
                            }
                        }
                    } catch(fbErr) {
                        console.warn('Firebase Admin password sync error:', fbErr.message);
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Password updated successfully' }));
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // Request Shield Verification Helper
    function verifyRequestShield() {
        const shieldToken = req.headers['x-cz-shield'];
        const origin = req.headers.origin || req.headers.referer || '';

        if (origin && !isAllowedOrigin(origin)) {
            console.warn(`[CapZone Shield] 🚨 Rejected unauthorized origin: "${origin}" on ${pathname}`);
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Access Denied: Origin not authorized' }));
            return false;
        }

        const isAllowedSiteOrigin = origin ? isAllowedOrigin(origin) : false;
        if (!isInternalLocal && !isAllowedSiteOrigin && !verifyShieldToken(shieldToken, clientIp)) {
            console.warn(`[CapZone Shield] ⚠️ Blocked unshielded request to ${pathname} from IP: ${clientIp}`);
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Access Denied: Shield verification failed or request tampered' }));
            return false;
        }
        return true;
    }

    // --- ADMIN DASHBOARD & DEDICATED ADMIN BACKEND PROXY (PORT 6040) ---
    if (pathname === '/admin' || pathname === '/admin.html') {
        const adminFile = path.join(__dirname, 'admin.html');
        if (fs.existsSync(adminFile)) {
            let adminHtml = fs.readFileSync(adminFile, 'utf8');
            const shieldToken = generateShieldToken(clientIp);
            const shieldScript = generateClientShieldScript(shieldToken);
            if (adminHtml.includes('<head>')) adminHtml = adminHtml.replace('<head>', '<head>\n' + shieldScript);
            else adminHtml = shieldScript + '\n' + adminHtml;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' });
            return res.end(adminHtml);
        }
    }

    if (pathname.startsWith('/api/portfolio/')) {
        const proxyPort = CONFIG.ADMIN_PORT || 6040;
        const proxyReq = http.request({
            hostname: '127.0.0.1',
            port: proxyPort,
            path: req.url,
            method: req.method,
            headers: req.headers
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Admin Server Proxy Notice: ' + err.message }));
        });
        return req.pipe(proxyReq);
    }

    // --- BYPASS NGINX STATIC RULES FOR DOWNLOADS ---
    if (pathname === '/api/download' && (req.method === 'GET' || req.method === 'HEAD')) {
        const fileName = reqUrl.searchParams.get('file');
        if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            res.writeHead(400);
            return res.end("Invalid file name");
        }
        
        const uploadDir = path.join(__dirname, 'uploads');
        const filePath = path.join(uploadDir, fileName);
        
        if (!fs.existsSync(filePath)) {
            if (fs.existsSync(filePath + '.enc')) {
                const ext = path.extname(fileName).toLowerCase();
                const mimeTypes = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.webp': 'image/webp',
                    '.gif': 'image/gif',
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.srt': 'text/plain; charset=utf-8',
                    '.txt': 'text/plain; charset=utf-8'
                };
                return streamEncryptedLocalFile(filePath + '.enc', res, mimeTypes[ext], fileName);
            }
            const found = projectsDB.find(p => {
                if (p.telegram_file_id) {
                    if (p.media_url && p.media_url.includes(fileName)) return true;
                    if (p.title && p.title.includes(fileName)) return true;
                }
                return false;
            });
            if (found && found.telegram_file_id) {
                return streamFileFromTelegram(found.telegram_file_id, res, fileName);
            }
            res.writeHead(404);
            return res.end("File not found on server");
        }
        
        const stat = fs.statSync(filePath);
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.wav': 'audio/wav',
            '.srt': 'text/plain; charset=utf-8',
            '.txt': 'text/plain; charset=utf-8'
        };
        const customName = reqUrl.searchParams.get('name') || reqUrl.searchParams.get('filename');
        let downloadName = ensureCapZoneDomainFileName((customName && customName.trim()) ? customName.trim() : fileName, ext);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const isInline = reqUrl.searchParams.get('inline') === '1' || reqUrl.searchParams.get('inline') === 'true';

        res.setHeader('Content-Disposition', makeContentDisposition(isInline ? 'inline' : 'attachment', downloadName));
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10) || 0;
            const end = parts[1] ? Math.min(parseInt(parts[1], 10), stat.size - 1) : stat.size - 1;
            if (start <= end && start < stat.size) {
                const chunksize = (end - start) + 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                    'Content-Length': chunksize
                });
                if (req.method === 'HEAD') return res.end();
                return fs.createReadStream(filePath, { start, end }).pipe(res);
            }
        }

        res.setHeader('Content-Length', stat.size);
        if (req.method === 'HEAD') {
            res.writeHead(200);
            return res.end();
        }

        const fileStream = fs.createReadStream(filePath);
        return fileStream.pipe(res);
    }

    // Serve Fonts Statically
    if (req.method === 'GET' && pathname.startsWith('/fonts/')) {
        const fontName = pathname.replace('/fonts/', '');
        if (fontName && !fontName.includes('..')) {
            const fontPath = path.join(__dirname, 'fonts', fontName);
            if (fs.existsSync(fontPath)) {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400'
                });
                return fs.createReadStream(fontPath).pipe(res);
            }
        }
        res.writeHead(404);
        return res.end("Font not found");
    }

    // SSE Real-Time Progress Stream Route
    if (req.method === 'GET' && pathname === '/api/recent-tasks') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify(globalRecentTasks));
    }

    if (req.method === 'GET' && pathname === '/api/progress') {
        const clientId = reqUrl.searchParams.get('clientId') || (parsedUrl.query && parsedUrl.query.clientId);
        if (!clientId) {
            res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'clientId required' }));
        }
        res.writeHead(200, {
            ...headers,
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no'
        });

        progressClients.set(clientId, res);
        if (progressResults.has(clientId)) {
            try {
                res.write(`data: ${JSON.stringify(progressResults.get(clientId))}\n\n`);
            } catch (e) {}
        } else {
            res.write(':\n\n');
        }

        const keepAlive = setInterval(() => {
            try {
                if (!res.destroyed && !res.writableEnded) res.write(':\n\n');
            } catch(e) {}
        }, 10000);
        req.on('close', () => {
            clearInterval(keepAlive);
            progressClients.delete(clientId);
        });
        return;
    }

    if (req.method === 'GET' && (pathname === '/api/progress-status' || pathname === '/api/bg-result')) {
        const clientId = reqUrl.searchParams.get('clientId') || (parsedUrl.query && parsedUrl.query.clientId);
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store'
        });
        if (!clientId || !progressResults.has(clientId)) {
            return res.end(JSON.stringify({ status: 'pending' }));
        }
        return res.end(JSON.stringify(progressResults.get(clientId)));
    }

    if (req.method === 'GET' && pathname === '/api/srt-result') {
        const clientId = reqUrl.searchParams.get('clientId') || (parsedUrl.query && parsedUrl.query.clientId);
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store'
        });
        if (!clientId || !srtResults.has(clientId)) {
            return res.end(JSON.stringify({ status: 'pending' }));
        }
        return res.end(JSON.stringify(srtResults.get(clientId)));
    }

    if (req.method === 'GET' && pathname === '/api/user-info') {
        const email = reqUrl.searchParams.get('email');
        if (!email) {
            res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'email required' }));
        }
        const normEmail = email.toLowerCase().trim();
        
        // If explicitly deleted by Admin
        if (deletedUsersSet.has(normEmail)) {
            res.writeHead(403, { 
                ...headers,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            });
            return res.end(JSON.stringify({ error: 'User removed by administrator', deleted: true, active: false }));
        }

        const user = getUser(normEmail, false);
        if (!user || user.active === false) {
            res.writeHead(403, { 
                ...headers,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            });
            return res.end(JSON.stringify({ error: 'Account not found or deactivated', deleted: true, active: false }));
        }

        res.writeHead(200, { 
            ...headers,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        });
        return res.end(JSON.stringify(user));
    }

    if (req.method === 'GET' && pathname === '/api/admin/srt-users') {
        try {
            await syncFirebaseUsersToDB();
        } catch(syncErr) {}
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        });
        return res.end(JSON.stringify(Object.values(usersDB)));
    }

    if (req.method === 'POST' && pathname === '/api/admin/srt-update-user') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const email = (data.email || '').toLowerCase().trim();
                if (!email) throw new Error('Email is required');
                
                // Admin update is authoritative: ensure un-blacklisted
                unmarkUserDeleted(email);

                // If password is being updated, sync with Firebase Admin
                if (data.updates && data.updates.password) {
                    try {
                        const auth = getFirebaseAdminAuth();
                        if (auth) {
                            try {
                                const userRecord = await auth.getUserByEmail(email);
                                if (userRecord) {
                                    await auth.updateUser(userRecord.uid, { password: data.updates.password });
                                }
                            } catch(fbGetErr) {
                                if (fbGetErr.code === 'auth/user-not-found') {
                                    await auth.createUser({ email, password: data.updates.password });
                                }
                            }
                        }
                    } catch (fbErr) {
                        console.warn('Firebase Admin password sync failed:', fbErr.message);
                    }
                }

                const updated = updateUser(email, data.updates);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, user: updated }));
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/admin/srt-delete-user') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const rawEmail = data.email || '';
                const normEmail = rawEmail.toLowerCase().trim();
                if (!normEmail) throw new Error('Email is required');
                
                let firebaseDeleted = false;
                let targetUid = null;
                try {
                    const auth = getFirebaseAdminAuth();
                    if (auth) {
                        try {
                            const userRecord = await auth.getUserByEmail(normEmail);
                            if (userRecord) targetUid = userRecord.uid;
                        } catch (fbGetErr) {
                            if (fbGetErr.code !== 'auth/user-not-found') {
                                console.warn('[Firebase delete lookup notice]:', fbGetErr.message);
                            }
                        }

                        // Fallback: search in listUsers if getUserByEmail didn't match (case sensitivity / sub-providers)
                        if (!targetUid) {
                            try {
                                const listResult = await auth.listUsers(1000);
                                const found = listResult.users.find(u => 
                                    (u.email && u.email.toLowerCase().trim() === normEmail) ||
                                    (u.providerData && u.providerData.some(p => p.email && p.email.toLowerCase().trim() === normEmail))
                                );
                                if (found) targetUid = found.uid;
                            } catch(listErr) {
                                console.warn('[Firebase listUsers error]:', listErr.message);
                            }
                        }

                        if (targetUid) {
                            try { await auth.revokeRefreshTokens(targetUid); } catch(rErr){}
                            await auth.deleteUser(targetUid);
                            firebaseDeleted = true;
                            console.log(`[Firebase Admin] Revoked tokens & deleted user ${normEmail} (UID: ${targetUid})`);
                        }
                    }
                } catch (fbErr) {
                    console.error('[Firebase user deletion error]:', fbErr.message);
                }
                
                const deleted = deleteUser(normEmail);

                // Deep wipe all user projects from Telegram, local disk, and databases
                let wipedProjectsCount = 0;
                try {
                    const userProjects = projectsDB.filter(p => p.email && p.email.toLowerCase().trim() === normEmail);
                    wipedProjectsCount = userProjects.length;
                    for (const proj of userProjects) {
                        if (proj.telegram_msg_id) {
                            try {
                                deleteFromTelegram(proj.telegram_msg_id, TELEGRAM_PROJECTS_CHAT_ID);
                            } catch (tgDelErr) {}
                        }
                        let relUpload = null;
                        if (proj.media_url && typeof proj.media_url === 'string') {
                            const uIdx = proj.media_url.indexOf('/uploads/');
                            if (uIdx !== -1) relUpload = proj.media_url.substring(uIdx);
                        }
                        if (relUpload) {
                            const localFile = path.join(__dirname, relUpload);
                            try { if (fs.existsSync(localFile)) fs.unlinkSync(localFile); } catch(e){}
                            try { if (fs.existsSync(localFile + '.enc')) fs.unlinkSync(localFile + '.enc'); } catch(e){}
                        }
                    }

                    // Remove from projectsDB
                    const beforeLen = projectsDB.length;
                    projectsDB = projectsDB.filter(p => !p.email || p.email.toLowerCase().trim() !== normEmail);
                    if (projectsDB.length !== beforeLen) {
                        saveProjectsDB();
                    }

                    // Remove from SQLite DB
                    db.run('DELETE FROM UserProjects WHERE LOWER(email) = ?', [normEmail], function(err) {
                        if (err) console.error('[SQLite Wipe Error]:', err.message);
                    });
                } catch (wipeErr) {
                    console.error('[User Projects Wipe Error]:', wipeErr.message);
                }

                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    success: true, 
                    deleted: true, 
                    email: normEmail,
                    firebaseDeleted, 
                    projectsWiped: wipedProjectsCount,
                    message: "User account, database records, Telegram backups and project files completely wiped." 
                }));
            } catch(e) {
                res.writeHead(400, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/admin/srt-create-user') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const email = (data.email || '').toLowerCase().trim();
                if (!email) throw new Error('Email is required');
                unmarkUserDeleted(email);
                let user = getUser(email);
                if (data.updates) {
                    user = updateUser(email, data.updates);
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, user: user }));
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/save-user') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const rawEmail = (data.email || '').toLowerCase().trim();
                if (!rawEmail || !rawEmail.includes('@')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Valid email is required' }));
                }

                const isFreshLogin = !!(data.fresh_login || data.from_login || data.is_login_page);

                // If user was deleted by Admin:
                if (deletedUsersSet.has(rawEmail)) {
                    if (!isFreshLogin) {
                        // Stale dashboard session trying to stay alive -> reject and force logout
                        res.writeHead(403, { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Cache-Control': 'no-store, no-cache, must-revalidate'
                        });
                        return res.end(JSON.stringify({ 
                            error: 'Account has been deleted by administrator', 
                            deleted: true, 
                            active: false 
                        }));
                    } else {
                        // User is deliberately logging in fresh from login page -> unmark and initialize fresh account!
                        unmarkUserDeleted(rawEmail);
                        delete usersDB[rawEmail]; // wipe any remaining stale record
                    }
                }

                if (!usersDB[rawEmail]) {
                    usersDB[rawEmail] = {
                        email: rawEmail,
                        name: data.name || data.displayName || rawEmail.split('@')[0],
                        balance: 0.0,
                        srt_count: 0,
                        active: true,
                        joined: new Date().toISOString(),
                        subscription_type: 'none',
                        quota_used: 0,
                        quota_limit: 0,
                        quota_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        is_google: !!(data.method === 'Google' || data.is_google),
                        auth_provider: (data.method === 'Google' || data.is_google) ? 'google' : 'email'
                    };
                    saveDB();
                }

                const user = usersDB[rawEmail];
                if (!user || user.active === false) {
                    res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: 'Account not found or inactive', deleted: true, active: false }));
                }
                if (data.method === 'Google' || data.is_google) {
                    user.is_google = true;
                    user.auth_provider = 'google';
                } else if (data.method === 'Email' || data.method === 'Email Sign Up') {
                    user.auth_provider = 'email';
                    if (data.password) user.password = data.password;
                }
                if (data.name) user.name = data.name;
                if (data.displayName) user.name = data.displayName;
                if (data.phone) user.phone = data.phone;
                user.active = true;
                saveDB();
                const sanitizedUser = { ...user };
                delete sanitizedUser.api_key;
                delete sanitizedUser.password;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    user: sanitizedUser, 
                    hasCustomKey: !!(user.api_key && user.api_key !== 'default') 
                }));
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // ----------------------------------------------------------------------
    // 🔐 CAPZONE AUTHENTICATION & OTP VERIFICATION ENDPOINTS
    // ----------------------------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/auth/check-email') {
        if (!verifyRequestShield()) return;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { email } = JSON.parse(body || '{}');
                const normEmail = (email || '').toLowerCase().trim();
                if (!normEmail) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Email is required' }));
                }
                const status = await checkUserAccountStatus(normEmail);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(status));
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/send-signup-otp') {
        if (!verifyRequestShield()) return;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { email, name, password } = JSON.parse(body || '{}');
                const normEmail = (email || '').toLowerCase().trim();
                if (!normEmail || !normEmail.includes('@')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'වලංගු Gmail ලිපිනයක් ඇතුළත් කරන්න.' }));
                }

                if (!isStrongPassword(password)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        error: 'මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත! කරුණාකර අවම වශයෙන් අකුරු 8ක්, ඉංග්‍රීසි අකුරු සහ අංක (numbers) ඇතුළත් කරන්න.' 
                    }));
                }

                // Check for duplicate account / Google account
                const accountStatus = await checkUserAccountStatus(normEmail);
                if (accountStatus.exists) {
                    if (accountStatus.isGoogle) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ 
                            conflict: true, 
                            isGoogle: true, 
                            message: 'මෙම Gmail ලිපිනයෙන් දැනටමත් Google හරහා Login වී ඇත. කරුණාකර "Sign in with Google" භාවිතා කරන්න.' 
                        }));
                    } else {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ 
                            conflict: true, 
                            isGoogle: false, 
                            message: 'මෙම Gmail ලිපිනයෙන් දැනටමත් ගිණුමක් ලියාපදිංචි වී ඇත. කරුණාකර Login වන්න.' 
                        }));
                    }
                }

                // Rate-limit check (45s)
                const existing = emailOtps.get(normEmail);
                if (existing && (Date.now() - existing.createdAt < 45000)) {
                    const waitSec = Math.ceil((45000 - (Date.now() - existing.createdAt)) / 1000);
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        error: `කරුණාකර තත්පර ${waitSec}ක් රැඳී සිට නැවත OTP එකක් ලබාගන්න.` 
                    }));
                }

                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                emailOtps.set(normEmail, {
                    otp: otp,
                    type: 'signup',
                    name: (name || '').trim(),
                    password: password,
                    expiresAt: Date.now() + 1 * 60 * 1000,
                    createdAt: Date.now(),
                    attempts: 0
                });

                const emailRes = await sendCapzoneOtpEmail({ to: normEmail, otp, type: 'signup', name });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'OTP_SENT', 
                    email: normEmail,
                    mailSent: emailRes.success
                }));
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/verify-signup-otp') {
        if (!verifyRequestShield()) return;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { email, otp, name, password } = JSON.parse(body || '{}');
                const normEmail = (email || '').toLowerCase().trim();
                const cleanOtp = (otp || '').toString().trim();

                const record = emailOtps.get(normEmail);
                if (!record || record.type !== 'signup') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'OTP කේතයක් ඉල්ලා නැත හෝ කල් ඉකුත් වී ඇත. කරුණාකර නැවත උත්සාහ කරන්න.' }));
                }

                if (Date.now() > record.expiresAt) {
                    emailOtps.delete(normEmail);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'OTP කේතයේ වලංගු කාලය (මිනිත්තු 1) අවසන් වී ඇත. කරුණාකර නැවත නව OTP එකක් ලබාගන්න.' }));
                }

                if (record.otp !== cleanOtp) {
                    record.attempts = (record.attempts || 0) + 1;
                    if (record.attempts >= 5) {
                        emailOtps.delete(normEmail);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'වැරදි OTP කේතයන් 5 වතාවක් ඇතුළත් කර ඇත. කරුණාකර නව OTP එකක් ඉල්ලන්න.' }));
                    }
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `ඇතුළත් කළ OTP කේතය වැරදියි. ඉතිරි අවස්ථා: ${5 - record.attempts}` }));
                }

                // OTP Verified! Remove from pending
                emailOtps.delete(normEmail);
                const finalPassword = password || record.password;
                const finalName = (name || record.name || '').trim();

                // Unmark from deletedUsersSet on new registration
                unmarkUserDeleted(normEmail);

                // Create user in Firebase Admin if initialized
                const auth = getFirebaseAdminAuth();
                if (auth) {
                    try {
                        try {
                            await auth.createUser({
                                email: normEmail,
                                password: finalPassword,
                                displayName: finalName
                            });
                        } catch(fbErr) {
                            if (fbErr.code === 'auth/email-already-exists') {
                                const uRec = await auth.getUserByEmail(normEmail);
                                if (uRec) await auth.updateUser(uRec.uid, { password: finalPassword });
                            }
                        }
                    } catch(e) {}
                }

                // Save user in usersDB
                const user = getUser(normEmail);
                user.name = finalName || user.name || 'CapZone Creator';
                user.auth_provider = 'email';
                user.is_google = false;
                user.active = true;
                if (finalPassword) user.password = finalPassword;
                saveDB();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'ACCOUNT_CREATED', user: user }));
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/send-forgot-otp') {
        if (!verifyRequestShield()) return;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { email } = JSON.parse(body || '{}');
                const normEmail = (email || '').toLowerCase().trim();
                if (!normEmail || !normEmail.includes('@')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'වලංගු Gmail ලිපිනයක් ඇතුළත් කරන්න.' }));
                }

                const accountStatus = await checkUserAccountStatus(normEmail);
                if (!accountStatus.exists) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'මෙම Gmail ලිපිනය සහිත CapZone ගිණුමක් හමු නොවීය. කරුණාකර Sign Up වන්න.' }));
                }

                // Allow both Email and Google linked accounts to receive OTP & set/update password
                // Rate-limit check (45s)
                const existing = emailOtps.get(normEmail);
                if (existing && (Date.now() - existing.createdAt < 45000)) {
                    const waitSec = Math.ceil((45000 - (Date.now() - existing.createdAt)) / 1000);
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        error: `කරුණාකර තත්පර ${waitSec}ක් රැඳී සිට නැවත OTP එකක් ලබාගන්න.` 
                    }));
                }

                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                emailOtps.set(normEmail, {
                    otp: otp,
                    type: 'forgot_password',
                    expiresAt: Date.now() + 3 * 60 * 1000,
                    createdAt: Date.now(),
                    attempts: 0
                });

                const emailRes = await sendCapzoneOtpEmail({ to: normEmail, otp, type: 'forgot_password' });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'OTP_SENT', 
                    email: normEmail,
                    isGoogle: !!accountStatus.isGoogle,
                    mailSent: emailRes.success
                }));
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/verify-and-reset-password') {
        if (!verifyRequestShield()) return;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { email, otp, newPassword } = JSON.parse(body || '{}');
                const normEmail = (email || '').toLowerCase().trim();
                const cleanOtp = (otp || '').toString().trim();

                if (!isStrongPassword(newPassword)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        error: 'නව මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත! කරුණාකර අවම වශයෙන් අකුරු 8ක්, ඉංග්‍රීසි අකුරු සහ අංක (numbers) ඇතුළත් කරන්න.' 
                    }));
                }

                const record = emailOtps.get(normEmail);
                if (!record || record.type !== 'forgot_password') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'OTP කේතයක් ඉල්ලා නැත හෝ කල් ඉකුත් වී ඇත. කරුණාකර නැවත උත්සාහ කරන්න.' }));
                }

                if (Date.now() > record.expiresAt) {
                    emailOtps.delete(normEmail);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'OTP කේතයේ වලංගු කාලය (මිනිත්තු 1) අවසන් වී ඇත. කරුණාකර නැවත නව OTP එකක් ලබාගන්න.' }));
                }

                if (record.otp !== cleanOtp) {
                    record.attempts = (record.attempts || 0) + 1;
                    if (record.attempts >= 5) {
                        emailOtps.delete(normEmail);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'වැරදි OTP කේතයන් 5 වතාවක් ඇතුළත් කර ඇත. කරුණාකර නව OTP එකක් ඉල්ලන්න.' }));
                    }
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `ඇතුළත් කළ OTP කේතය වැරදියි. ඉතිරි අවස්ථා: ${5 - record.attempts}` }));
                }

                // OTP Verified! Remove from pending
                emailOtps.delete(normEmail);

                // Unmark from deletedUsersSet on password reset
                unmarkUserDeleted(normEmail);

                // Update password in Firebase Admin
                const auth = getFirebaseAdminAuth();
                if (auth) {
                    try {
                        try {
                            const uRec = await auth.getUserByEmail(normEmail);
                            if (uRec) {
                                await auth.updateUser(uRec.uid, { password: newPassword });
                                console.log(`[CapZone Auth] ✅ Updated Firebase Auth password for ${normEmail} (uid: ${uRec.uid})`);
                            }
                        } catch(fbGetErr) {
                            if (fbGetErr.code === 'auth/user-not-found') {
                                await auth.createUser({
                                    email: normEmail,
                                    password: newPassword,
                                    displayName: normEmail.split('@')[0]
                                });
                                console.log(`[CapZone Auth] ✅ Created Firebase Auth user with new password for ${normEmail}`);
                            }
                        }
                    } catch(fbErr) {
                        console.warn("[Firebase Admin reset password notice]:", fbErr.message);
                    }
                }

                // Update in usersDB
                const user = getUser(normEmail);
                user.password = newPassword;
                user.auth_provider = 'email';
                saveDB();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'PASSWORD_RESET_SUCCESS' }));
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }


    if (req.method === 'POST' && pathname === '/api/save-api-key') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.email) {
                    const user = getUser(data.email);
                    const cleanKey = (data.api_key && data.api_key !== 'default') ? data.api_key.trim() : '';
                    user.api_key = cleanKey;
                    saveDB();
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // ----------------------------------------------------------------------
    // Seamless Reverse-Proxy: Forward all Admin, Portfolio & Upload requests to admin.js (Port 6040)
    // ----------------------------------------------------------------------
    if (pathname.startsWith('/api/portfolio/') || pathname.startsWith('/uploads/portfolio/') || pathname.startsWith('/api/track/') || pathname.startsWith('/api/moviestream/')) {
        const proxyReq = http.request({
            hostname: '127.0.0.1',
            port: CONFIG.ADMIN_PORT,
            path: req.url,
            method: req.method,
            headers: req.headers
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'System Error, please contact developer', 
                message: 'Please start admin.js via PM2: pm2 start admin.js',
                details: err.message 
            }));
        });
        return req.pipe(proxyReq);
    }

    if (req.method === 'POST' && pathname === '/api/mtproto/auth') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { api_id, api_hash, phone } = JSON.parse(body);
                const { exec } = require('child_process');
                exec(`py mtproto_bridge.py send_code ${api_id} ${api_hash} ${phone}`, {cwd: __dirname}, (err, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(stdout);
                });
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({error: e.message}));
            }
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/mtproto/verify') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { api_id, api_hash, phone, phone_code_hash, otp } = JSON.parse(body);
                const { exec } = require('child_process');
                exec(`py mtproto_bridge.py sign_in ${api_id} ${api_hash} ${phone} ${phone_code_hash} ${otp}`, {cwd: __dirname}, (err, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(stdout);
                });
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({error: e.message}));
            }
        });
        return;
    }

    
    if (req.method === 'GET' && pathname === '/api/mtproto/download') {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const msgId = urlParams.get('msg_id');
        if (!msgId || !TELEGRAM_CHAT_ID) {
            res.writeHead(400);
            return res.end(JSON.stringify({error: "msg_id required"}));
        }
        
        const outputDir = require('path').join(__dirname, 'uploads');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        
        const { exec } = require('child_process');
        exec(`py mtproto_bridge.py download ${TELEGRAM_CHAT_ID} ${msgId} "${outputDir}"`, {cwd: __dirname}, (err, stdout, stderr) => {
            if (err) {
                res.writeHead(500);
                return res.end(JSON.stringify({error: err.message}));
            }
            try {
                const result = JSON.parse(stdout);
                if (result.success && result.file_path) {
                    const stat = fs.statSync(result.file_path);
                    res.writeHead(200, {
                        'Content-Length': stat.size,
                        'Content-Disposition': 'attachment; filename=' + require('path').basename(result.file_path)
                    });
                    const readStream = fs.createReadStream(result.file_path);
                    readStream.pipe(res);
                    readStream.on('end', () => { fs.unlinkSync(result.file_path); });
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({error: "File not found"}));
                }
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({error: e.message}));
            }
        });
        return;
    }

    
    // User Projects Endpoints (POST, GET, DELETE)
    if (pathname === '/api/user-projects') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    let rawEmail = req.headers['x-user-email'] || data.email;
                    const email = rawEmail ? rawEmail.toLowerCase().trim() : null;
                    if (!email) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: "Email required" }));
                    }

                    if (deletedUsersSet.has(email)) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: "Account deleted by administrator" }));
                    }

                    const type = data.type || 'Project';
                    const title = data.title || 'Untitled Project';
                    const metadata = data.metadata || '';
                    const mediaUrl = data.media_url || data.url || '';
                    const payloadStr = data.payload ? (typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload)) : (data.content ? JSON.stringify({ content: data.content }) : null);
                    const date = data.date || new Date().toISOString();

                    let msgId = data.telegram_msg_id || null;
                    let fileId = data.telegram_file_id || null;

                    db.run(
                        "INSERT INTO UserProjects (email, type, title, metadata, media_url, telegram_msg_id, telegram_file_id, payload, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [email, type, title, metadata, mediaUrl, msgId, fileId, payloadStr, date],
                        function(err) {
                            if (err) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                return res.end(JSON.stringify({ error: err.message }));
                            }
                            const recordId = this.lastID;
                            const finalMsgId = this.preservedTgMsgId || msgId;
                            const finalFileId = this.preservedTgFileId || fileId;
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, id: recordId, telegram_msg_id: finalMsgId, telegram_file_id: finalFileId }));

                            // Perform asynchronous Telegram backup strictly ONCE in background without duplicates
                            const uploadKey = `${email}_${type}_${title}_${path.basename(mediaUrl || '')}`;
                            if (!finalFileId && TELEGRAM_BOT_TOKEN && !tgUploadLocks.has(uploadKey)) {
                                tgUploadLocks.add(uploadKey);
                                let actualPath = mediaUrl;
                                if (mediaUrl && mediaUrl.startsWith('/uploads/')) {
                                    actualPath = path.join(__dirname, mediaUrl);
                                }
                                const isAudio = (type === 'Audio') || (typeof actualPath === 'string' && (actualPath.endsWith('.mp3') || actualPath.endsWith('.wav')));
                                const isPhoto = (type === 'Image' || type === 'Background') || (typeof actualPath === 'string' && (actualPath.endsWith('.png') || actualPath.endsWith('.jpg') || actualPath.endsWith('.jpeg') || actualPath.endsWith('.webp')));
                                let isLocalFile = typeof actualPath === 'string' && !actualPath.startsWith('http') && !actualPath.startsWith('/api/') && fs.existsSync(actualPath);
                                let tempTextFile = null;

                                // If no local file on disk, check if we have text payload (SRT subtitles, scripts, etc.) and synthesize temp file
                                if (!isLocalFile && (!actualPath || !actualPath.startsWith('http')) && payloadStr) {
                                    try {
                                        const parsedPl = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
                                        const textData = parsedPl.srt || parsedPl.scriptText || parsedPl.content || (parsedPl.prompt ? `Prompt: ${parsedPl.prompt}` : null);
                                        if (textData && typeof textData === 'string' && textData.trim()) {
                                            const ext = (type === 'Subtitle' || parsedPl.srt) ? '.srt' : '.txt';
                                            const cleanTitle = (title || 'project').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
                                            tempTextFile = path.join(uploadDir, `${cleanTitle}_${Date.now()}${ext}`);
                                            fs.writeFileSync(tempTextFile, textData, 'utf8');
                                            actualPath = tempTextFile;
                                            isLocalFile = true;
                                        }
                                    } catch(e){}
                                }

                                const doBgUploadEncrypted = async (encPath) => {
                                    try {
                                        // Strictly upload as AES-256 encrypted document with ZERO caption (no email, no title)
                                        const uploadRes = await uploadMediaToTelegramBot(TELEGRAM_PROJECTS_CHAT_ID, encPath, 'document', '');
                                        if (uploadRes && recordId) {
                                            const proxyUrl = uploadRes.file_id ? `/api/telegram-file-proxy?file_id=${uploadRes.file_id}` : null;
                                            const targetProj = projectsDB.find(item => String(item.id) === String(recordId));
                                            if (targetProj) {
                                                targetProj.telegram_msg_id = uploadRes.message_id;
                                                targetProj.telegram_file_id = uploadRes.file_id;
                                                if (proxyUrl) targetProj.media_url = proxyUrl;
                                                saveProjectsDB();
                                            }
                                            db.run(`UPDATE UserProjects SET telegram_msg_id = ?, telegram_file_id = ? WHERE id = ?`, [uploadRes.message_id, uploadRes.file_id, recordId]);
                                            console.log(`[Telegram Project Backup Success]: Project #${recordId} (${type}: ${title}) -> Msg: ${uploadRes.message_id}, File: ${uploadRes.file_id}`);
                                        }
                                    } catch(e) {
                                        console.error("[Project Encrypted Backup Error]:", e.message);
                                    } finally {
                                        tgUploadLocks.delete(uploadKey);
                                        try { if (encPath && fs.existsSync(encPath)) fs.unlinkSync(encPath); } catch(e){}
                                        try { if (tempTextFile && fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile); } catch(e){}
                                    }
                                };

                                if (isLocalFile) {
                                    const encTarget = actualPath.endsWith('.enc') ? actualPath : (actualPath + '.enc');
                                    if (actualPath.endsWith('.enc')) {
                                        doBgUploadEncrypted(actualPath);
                                    } else {
                                        encryptFileNode(actualPath, encTarget).then(() => {
                                            doBgUploadEncrypted(encTarget);
                                        }).catch((err) => {
                                            console.error("[Project Encrypt Error]:", err.message);
                                            tgUploadLocks.delete(uploadKey);
                                            try { if (tempTextFile && fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile); } catch(e){}
                                        });
                                    }
                                } else if (typeof actualPath === 'string' && (actualPath.startsWith('http://') || actualPath.startsWith('https://'))) {
                                    const cleanBase = `${type}_${title}`.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
                                    const ext = isAudio ? '.mp3' : (isPhoto ? '.png' : '.mp4');
                                    downloadAndEncryptMedia(actualPath, `${cleanBase}${ext}`).then(encPath => {
                                        doBgUploadEncrypted(encPath);
                                    }).catch(err => {
                                        console.error("[Project Remote Media Encrypt Error]:", err.message);
                                        tgUploadLocks.delete(uploadKey);
                                    });
                                } else {
                                    tgUploadLocks.delete(uploadKey);
                                }
                            }
                        }
                    );
                } catch(e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        if (req.method === 'GET') {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            let rawEmail = urlParams.get('email') || req.headers['x-user-email'];
            const email = rawEmail ? rawEmail.toLowerCase().trim() : null;
            if (!email) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Email required" }));
            }
            db.all(`SELECT * FROM UserProjects WHERE LOWER(email) = ? ORDER BY id DESC`, [email], (err, rows) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(rows || []));
            });
            return;
        }

        if (req.method === 'DELETE') {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const id = urlParams.get('id');
            const email = urlParams.get('email') || req.headers['x-user-email'];
            const directTgMsgId = urlParams.get('tg_msg_id');
            const title = urlParams.get('title');
            const type = urlParams.get('type');
            
            console.log(`[Delete Project Request] id=${id}, email=${email}, tg_msg_id=${directTgMsgId}, title=${title}, type=${type}`);

            if (!id && !directTgMsgId && !title) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "id, tg_msg_id, or title required" }));
            }

            if (directTgMsgId) {
                deleteFromTelegram(directTgMsgId, TELEGRAM_PROJECTS_CHAT_ID);
            }

            db.run(`DELETE FROM UserProjects WHERE (id = ? OR telegram_msg_id = ?) AND email = ?`, [id, directTgMsgId, email, title, type], function(err) {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, deleted: this.changes, message: "Project deleted successfully from cloud storage" }));
            });
            return;
        }
    }

    // Proxy endpoint to stream media from Telegram
    if (req.method === 'GET' && (pathname === '/api/telegram-file-proxy' || pathname === '/telegram-file-proxy')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const fileId = urlParams.get('file_id');
        const fileName = urlParams.get('filename') || urlParams.get('file');
        return streamFileFromTelegram(fileId, res, fileName);
    }

    if (req.method === 'GET' && pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'online', engine: 'Pure Node.js KaveezCloud API Engine' }));
    }

    // 3. Fonts Endpoint
    if (req.method === 'GET' && pathname === '/api/fonts') {
        const fontsDir = path.join(__dirname, 'fonts');
        let fonts = [];
        if (fs.existsSync(fontsDir)) {
            fonts = fs.readdirSync(fontsDir).filter(f => f.endsWith('.ttf') || f.endsWith('.otf'));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(fonts));
    }

    // 4. Convert Font Endpoint
    if (req.method === 'POST' && pathname === '/api/convert-font') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const legacy = unicodeToFmAbhaya(parsed.text || '');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ text: legacy }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // --- PAYHERE INTEGRATION ---
    const PAYHERE_MERCHANT_ID = (process.env.PAYHERE_MERCHANT_ID || '1238227').trim(); 
    const PAYHERE_SECRET = (process.env.PAYHERE_SECRET || 'NDI2NTc1NTAzMjIxOTc3MjcwMjMzNDQ2Nzg3OTY5MzMwMDk1NzM3Mg==').trim();

    // Reusable Central Payment Crediting Function (Used by Webhook, Client Callback & Demo Tester)
    function applyUserPayment(email, packageType, amount, orderId = null) {
        if (!email) return null;
        email = email.toLowerCase().trim();
        let user = getUser(email);
        if (!user) return null;
        const payAmount = parseFloat(amount) || 0;

        if (packageType === 'creator_sub') {
            user.subscription_type = 'creator';
            user.quota_limit = 120;
            user.quota_used = 0;
            let nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            user.quota_reset_date = nextMonth.toISOString();
            user.active = true;
        } else if (packageType === 'pro_sub') {
            user.subscription_type = 'pro';
            user.quota_limit = 300;
            user.quota_used = 0;
            let nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            user.quota_reset_date = nextMonth.toISOString();
            user.active = true;
        } else {
            // One-Time Top-Up / Wallet Funds (Mini Rs.100, Standard Rs.250, Extended Rs.500, or any custom amount)
            let addedBalance = payAmount;
            if (addedBalance <= 0) {
                if (packageType === 'balance_100') addedBalance = 100;
                else if (packageType === 'balance_200') addedBalance = 200;
                else if (packageType === 'balance_250') addedBalance = 250;
                else if (packageType === 'balance_500') addedBalance = 500;
                else {
                    const match = String(packageType).match(/balance_(\d+)/);
                    if (match) addedBalance = parseFloat(match[1]);
                }
            }
            user.balance = Math.round(((user.balance || 0) + addedBalance) * 100) / 100;
            user.active = true;
            if (user.subscription_type === 'none') {
                user.subscription_type = 'payg';
            }
        }

        // Record in transaction history
        if (!user.payments) user.payments = [];
        user.payments.unshift({
            order_id: orderId || `PAY_${Date.now()}`,
            package: packageType,
            amount: payAmount,
            date: new Date().toISOString()
        });
        if (user.payments.length > 50) user.payments.pop();

        saveDB();
        console.log(`[PayHere Success] Credited ${email}. Package: ${packageType}, Amount: Rs. ${payAmount}, Order: ${orderId}`);
        return user;
    }

    // In-memory registry of legitimate pending PayHere transactions to prevent balance forgery
    const pendingPayhereOrders = new Map();

    // 4.1 Generate Hash for PayHere Checkout
    if (req.method === 'POST' && pathname === '/api/payhere-hash') {
        if (!verifyRequestShield()) return;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const order_id = parsed.order_id || `ORD_${Date.now()}`;
                const amount = parseFloat(parsed.amount || 0).toFixed(2); // Must be formatted to 2 decimal places
                const currency = parsed.currency || 'LKR';
                
                const userEmail = (parsed.email || req.headers['x-user-email'] || '').toLowerCase().trim();
                const packageType = parsed.packageType || parsed.custom_2 || 'balance_100';
                pendingPayhereOrders.set(order_id, {
                    order_id,
                    amount: parseFloat(amount),
                    currency,
                    email: userEmail,
                    packageType,
                    createdAt: Date.now()
                });

                if (pendingPayhereOrders.size > 500) {
                    const oneHourAgo = Date.now() - 3600000;
                    for (const [k, v] of pendingPayhereOrders.entries()) {
                        if (v.createdAt < oneHourAgo) pendingPayhereOrders.delete(k);
                    }
                }

                const hashedSecret = crypto.createHash('md5').update(PAYHERE_SECRET).digest('hex').toUpperCase();
                const hashString = PAYHERE_MERCHANT_ID + order_id + amount + currency + hashedSecret;
                const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    hash, 
                    merchant_id: PAYHERE_MERCHANT_ID,
                    order_id,
                    amount,
                    currency
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 4.2 PayHere Notify Webhook (Server-to-Server IPN)
    if (req.method === 'POST' && pathname === '/api/payhere-notify') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                // Support both application/x-www-form-urlencoded and application/json
                let merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, custom_1, custom_2;
                if (body.startsWith('{')) {
                    const parsed = JSON.parse(body || '{}');
                    merchant_id = parsed.merchant_id;
                    order_id = parsed.order_id;
                    payhere_amount = parsed.payhere_amount;
                    payhere_currency = parsed.payhere_currency;
                    status_code = parsed.status_code;
                    md5sig = parsed.md5sig;
                    custom_1 = parsed.custom_1;
                    custom_2 = parsed.custom_2;
                } else {
                    const params = new URLSearchParams(body);
                    merchant_id = params.get('merchant_id');
                    order_id = params.get('order_id');
                    payhere_amount = params.get('payhere_amount');
                    payhere_currency = params.get('payhere_currency');
                    status_code = params.get('status_code');
                    md5sig = params.get('md5sig');
                    custom_1 = params.get('custom_1'); // User email
                    custom_2 = params.get('custom_2'); // Package type
                }

                // Verify Signature
                const hashedSecret = crypto.createHash('md5').update(PAYHERE_SECRET).digest('hex').toUpperCase();
                const hashString = PAYHERE_MERCHANT_ID + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
                const generatedSig = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

                if (generatedSig === md5sig && String(status_code) === '2') {
                    // Payment Success & Signature Verified
                    applyUserPayment(custom_1, custom_2, payhere_amount, order_id);
                    res.writeHead(200);
                    res.end('OK');
                } else {
                    console.warn(`[PayHere Webhook] Invalid signature or failed status for order ${order_id} (Status: ${status_code})`);
                    res.writeHead(400);
                    res.end('Invalid request');
                }
            } catch (err) {
                console.error('[PayHere Webhook Error]:', err);
                res.writeHead(500);
                res.end('Server error');
            }
        });
        return;
    }

    // 4.3 PayHere Direct Confirmation & Sandbox Demo Verification Endpoint
    if (req.method === 'POST' && pathname === '/api/payhere-confirm') {
        if (!verifyRequestShield()) return;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const email = (parsed.email || req.headers['x-user-email'] || '').toLowerCase().trim();
                const packageType = parsed.packageType || parsed.custom_2 || 'balance_100';
                const amount = parseFloat(parsed.amount || parsed.payhere_amount || 0);
                const order_id = parsed.order_id || `DEMO_${Date.now()}`;
                const is_demo = !!parsed.is_demo;

                const isProductionHost = (host === 'capzone.top' || host.endsWith('.capzone.top') || host === 'capzone.kaveez.top' || host.endsWith('.capzone.kaveez.top'));
                if (is_demo && (isProductionHost || !isInternalLocal)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Demo payment simulation is prohibited on production domain' }));
                }

                if (!email) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'User email is required to credit payment' }));
                }

                if (!is_demo) {
                    const validOrder = pendingPayhereOrders.get(order_id);
                    if (!validOrder) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Security validation failed: Unregistered transaction order' }));
                    }
                    if (Math.abs(validOrder.amount - amount) > 0.05) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Security validation failed: Transaction amount mismatch' }));
                    }
                    pendingPayhereOrders.delete(order_id);
                }

                const updatedUser = applyUserPayment(email, packageType, amount, order_id);
                console.log(`[PayHere Confirm] Processed ${is_demo ? 'DEMO TEST' : 'GATEWAY'} payment for ${email}: Rs. ${amount} (${packageType})`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: is_demo ? 'Demo payment completed & database updated!' : 'Payment verified & credited successfully!',
                    user: updatedUser,
                    order_id: order_id
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 4.9 Chunked Large Media Upload Endpoint (Bypasses 100MB Cloudflare Limit for 2-Hour Films!)
    if (req.method === 'POST' && pathname === '/api/upload-chunk') {
        if (req.socket) req.socket.setTimeout(0);
        req.setTimeout(0);
        const uploadId = String(reqUrl.searchParams.get('uploadId') || req.headers['x-upload-id'] || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const chunkIndex = parseInt(reqUrl.searchParams.get('chunkIndex') || req.headers['x-chunk-index'] || '0', 10);
        const totalChunks = parseInt(reqUrl.searchParams.get('totalChunks') || req.headers['x-total-chunks'] || '0', 10);
        const isFinalize = reqUrl.searchParams.get('finalize') === '1';
        const origName = String(reqUrl.searchParams.get('fileName') || 'media.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!uploadId) {
            res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'uploadId required' }));
        }
        const assembledName = `chunked_${uploadId}_${origName}`;
        const assembledPath = path.join(uploadDir, assembledName);
        if (isFinalize && totalChunks > 0) {
            try {
                if (fs.existsSync(assembledPath)) fs.unlinkSync(assembledPath);
                const outFd = fs.openSync(assembledPath, 'w');
                try {
                    const buf = Buffer.allocUnsafe(1024 * 1024);
                    for (let i = 0; i < totalChunks; i++) {
                        const partPath = path.join(uploadDir, `part_${uploadId}_${String(i).padStart(5, '0')}`);
                        if (!fs.existsSync(partPath)) {
                            throw new Error(`Missing upload chunk ${i}/${totalChunks}`);
                        }
                        const inFd = fs.openSync(partPath, 'r');
                        try {
                            let bytesRead = 0;
                            while ((bytesRead = fs.readSync(inFd, buf, 0, buf.length, null)) > 0) {
                                fs.writeSync(outFd, buf, 0, bytesRead);
                            }
                        } finally {
                            fs.closeSync(inFd);
                        }
                        try { fs.unlinkSync(partPath); } catch (e) {}
                    }
                } finally {
                    fs.closeSync(outFd);
                }
                res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, uploadId, assembled: true, serverFile: assembledName }));
            } catch (asmErr) {
                res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: asmErr.message }));
            }
        }

        const usePartFiles = totalChunks > 0;
        const targetPartPath = usePartFiles
            ? path.join(uploadDir, `part_${uploadId}_${String(chunkIndex).padStart(5, '0')}`)
            : assembledPath;
        if (!usePartFiles && chunkIndex === 0 && fs.existsSync(assembledPath)) {
            try { fs.unlinkSync(assembledPath); } catch (e) {}
        }
        const ws = fs.createWriteStream(targetPartPath, { flags: (!usePartFiles && chunkIndex > 0) ? 'a' : 'w' });
        let received = 0;
        req.on('data', (c) => { received += c.length; });
        req.pipe(ws);
        ws.on('finish', () => {
            res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, uploadId, chunkIndex, bytes: received, serverFile: assembledName }));
        });
        ws.on('error', (err) => {
            res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });
        return;
    }

    // 5. Generate SRT Endpoint & Secure Gateway Handler (Supports direct multipart & >100MB chunked uploads)
    if (req.method === 'POST' && (pathname === '/api/generate-srt' || (pathname === '/api/gateway' && (reqUrl.searchParams.get('op') === 'srt_generate' || reqUrl.searchParams.get('op') === 'srt')))) {
        const clientId = reqUrl.searchParams.get('clientId');
        if (req.socket) req.socket.setTimeout(0);
        req.setTimeout(0);
        res.setTimeout(0);
        let email = null;
        let file = null;
        try {
            let fields = {};
            const cType = (req.headers['content-type'] || '').toLowerCase();
            if (cType.includes('application/json')) {
                const rawJson = await new Promise((resB, rejB) => {
                    let s = ''; req.on('data', c => s += c); req.on('end', () => resB(s)); req.on('error', rejB);
                });
                fields = JSON.parse(rawJson || '{}');
                const safeServerFile = path.basename(String(fields.serverFile || ''));
                const targetPath = safeServerFile ? path.join(uploadDir, safeServerFile) : '';
                if (!targetPath || !fs.existsSync(targetPath)) {
                    res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Chunked upload file not found on server' }));
                }
                const st = fs.statSync(targetPath);
                file = { path: targetPath, originalname: fields.fileName || safeServerFile, size: st.size };
            } else {
                const parsedForm = await parseMultipartFormData(req);
                fields = parsedForm.fields;
                file = parsedForm.file;
            }
            if (!file) {
                if (clientId) sendProgress(clientId, 'No file uploaded', 'error');
                res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'No video/audio file uploaded' }));
            }

            if (file && file.path) {
                activeProcessingFiles.add(file.path);
            }

            const cleanupUploadedFile = () => {
                if (file && file.path) {
                    activeProcessingFiles.delete(file.path);
                    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch(e){}
                }
            };

            const getField = (val) => Array.isArray(val) ? val[0] : val;
            const langVal = getField(fields.language);
            const targetLanguage = (langVal === 'en' || langVal === 'English') ? 'English' : 'Sinhala';
            
            const rawLimit = parseInt(getField(fields.wordsLimit), 10);
            const wordsLimit = (!isNaN(rawLimit) && rawLimit >= 1 && rawLimit <= 8) ? rawLimit : 1;
            
            const reqEmail = getField(fields.email);
            email = req.headers['x-user-email'] || reqEmail || 'creator@capzone.top';
            const fontFormat = getField(fields.fontFormat);
            const isTargetSinhala = (targetLanguage === 'Sinhala' || targetLanguage === 'si');
            const useLegacy = fontFormat === 'legacy' || langVal === 'si-legacy' || (isTargetSinhala && fontFormat !== 'unicode' && langVal !== 'si-unicode') || getField(fields.legacyFont) === 'true' || getField(fields.useLegacy) === 'true';

            const user = getUser(email);
            if (!user.active) {
                cleanupUploadedFile();
                const deactMsg = 'Your account is deactivated by administrator. Please contact support.';
                if (clientId) sendProgress(clientId, 'Error: ' + deactMsg, 'error');
                res.writeHead(403, { ...headers, 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: deactMsg, code: 'ACCOUNT_DEACTIVATED' }));
            }

            // 1. Max File Size Check (2048MB / 2GB for 2-hour+ feature films)
            if (file.size > 2048 * 1024 * 1024) {
                cleanupUploadedFile();
                const msg = 'File size exceeds maximum upload limit of 2GB. Please upload a smaller video.';
                if (clientId) sendProgress(clientId, 'Error: ' + msg, 'error');
                res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: msg }));
            }

            if (clientId) sendProgress(clientId, 'Analyzing audio waveform & verifying duration...', 'processing');
            const durationSecs = await getMediaDuration(file.path);
            const durationMins = durationSecs / 60;
            
            // 2. System Maximum Video Duration Check (3 Hours / 180 Minutes Limit - 100% Free Unlimited)
            if (durationSecs > 10800 || durationMins > 180) {
                cleanupUploadedFile();
                const msg = `Video duration (${Math.round(durationMins)} mins) exceeds the 3-hour system limit (180 minutes). Please trim your video.`;
                if (clientId) sendProgress(clientId, 'Error: ' + msg, 'error');
                res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: msg }));
            }

            if (clientId) {
                // Return immediate 200 to prevent proxy timeout!
                res.writeHead(200, {
                    ...headers,
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    status: 'processing',
                    message: 'Video upload verified. Processing in progress...',
                    clientId: clientId
                }));
            }

            // 100% Free Local Meta MMS + Neural Speech & NLLB-200 Engine (Zero External APIs)
            console.log(`[CapZone Meta MMS Engine] Starting subtitle pipeline: ${targetLanguage} (${durationSecs}s, wordsLimit: ${wordsLimit})...`);
            
            let srtContent = null;
            let alignedWordsList = [];
            try {
                const mmsRes = await runMmsSubtitleEngine(file.path, targetLanguage, wordsLimit, clientId);
                srtContent = mmsRes.srt;
                alignedWordsList = Array.isArray(mmsRes.words) ? mmsRes.words : [];
            } catch (engineErr) {
                console.error('[CapZone Meta MMS Engine] Subtitle Generation Error:', engineErr.message);
                throw engineErr;
            }

            if (!srtContent || !srtContent.includes('-->')) {
                throw new Error("Could not extract subtitles. Please verify your video audio.");
            }

            // Repair & verify SRT timestamps
            if (srtContent) {
                const repaired = cleanAndRepairSrt(srtContent, wordsLimit, targetLanguage, durationSecs);
                if (repaired && repaired.valid && repaired.srt) {
                    srtContent = repaired.srt;
                }
            }

            const unicodeSrt = srtContent;
            let legacySrt = '';
            const isTargetSinhalaLang = (targetLanguage === 'Sinhala' || targetLanguage === 'si');
            if (isTargetSinhalaLang && unicodeSrt) {
                legacySrt = unicodeToFmAbhaya(unicodeSrt);
            }

            if (useLegacy && isTargetSinhalaLang && legacySrt) {
                srtContent = legacySrt;
            }

            // Count blocks
            const blockMatches = srtContent.match(/\d+\s*\r?\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->/g);
            const blockCount = blockMatches ? blockMatches.length : (srtContent.split('-->').length - 1);

            // Increment metric only on genuine success
            user.srt_count = (user.srt_count || 0) + 1;
            saveDB();

            db.run(`UPDATE Metrics SET value = value + 1 WHERE key = 'srt_generated'`);
            const today = new Date().toISOString().split('T')[0];
            db.run(`INSERT INTO DailyMetrics (date, key, value) VALUES (?, 'srt_generated', 1) ON CONFLICT(date, key) DO UPDATE SET value = value + 1`, [today]);

            const srtFileName = `sub_${Date.now()}.srt`;
            const srtFilePath = path.join(__dirname, 'uploads', srtFileName);
            try { fs.writeFileSync(srtFilePath, srtContent, 'utf8'); } catch(e){}
            const originalFileName = getField(fields.fileName) || getField(fields.title) || (file && (file.originalname || file.originalFilename) && (file.originalname || file.originalFilename) !== 'blob' ? (file.originalname || file.originalFilename) : null) || 'Video Subtitles';
            const cleanBaseName = originalFileName.replace(/\.[^/.]+$/, '').replace(/[^\w\s\u0D80-\u0DFF-]/g, '').trim().replace(/\s+/g, '_') || 'Subtitles';
            const safeDownloadName = ensureCapZoneDomainFileName(`${cleanBaseName}.srt`, '.srt');
            const srtTaskInfo = logTaskToTelegram('Subtitle Studio (SRT)', { 'Target Language': targetLanguage, 'Words/Line': wordsLimit, 'File Name': safeDownloadName }, srtFilePath, email, { srt: srtContent, blocks: blockCount, filename: safeDownloadName });
            
            // Clean up uploaded file
            cleanupUploadedFile();

            const payload = { 
                srt: srtContent, 
                srtUnicode: unicodeSrt || srtContent,
                srtLegacy: legacySrt || srtContent,
                words: (alignedWordsList && alignedWordsList.length > 0) ? alignedWordsList : [],
                blocks: blockCount, 
                valid: true, 
                language: targetLanguage,
                projectId: srtTaskInfo ? srtTaskInfo.id : null,
                title: cleanBaseName,
                downloadFileName: safeDownloadName,
                downloadUrl: `/uploads/${srtFileName}`,
                user: {
                    srt_count: user.srt_count
                }
            };

            if (clientId) {
                srtResults.set(clientId, { status: 'completed', data: payload });
                sendProgress(clientId, 'Subtitles successfully generated!', 'completed', payload);
            }

            if (!res.writableEnded && !res.destroyed) {
                res.writeHead(200, {
                    ...headers,
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify(payload));
            }
        } catch (error) {
            try { if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch(e){}
            console.error('SRT Error:', error.message || error);
            const userErrorMsg = `උපසිරැසි ජනනය කිරීම අසාර්ථක විය: ${error.message || 'System Error'}. කරුණාකර developer සම්බන්ධ කරගන්න: 0760246304`;
            if (clientId) {
                srtResults.set(clientId, { status: 'error', error: userErrorMsg });
                sendProgress(clientId, userErrorMsg, 'error');
            }
            if (!res.writableEnded && !res.destroyed) {
                try {
                    res.writeHead(500, {
                        ...headers,
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({ error: userErrorMsg }));
                } catch (e) {}
            }
        }
        return;
    }

    // 6.5 SRT Translation Endpoint & Gateway Handler (Sinhala, English, Tamil)
    if (req.method === 'POST' && (pathname === '/api/translate-srt' || (pathname === '/api/gateway' && (reqUrl.searchParams.get('op') === 'translate_srt' || reqUrl.searchParams.get('op') === 'srt_translate')))) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            let clientId = null;
            try {
                const parsed = JSON.parse(body || '{}');
                clientId = parsed.clientId;
                const rawSrt = (parsed.srt || parsed.srtContent || '').replace(/^\uFEFF/, '').trim();
                const targetLanguage = (parsed.targetLanguage || parsed.language || 'Sinhala').trim();
                const originalFileName = (parsed.filename || parsed.fileName || parsed.title || 'Subtitles').replace(/\.srt$/i, '');

                if (!rawSrt || !rawSrt.includes('-->')) {
                    throw new Error("Invalid SRT content. Please provide a valid .srt file with timestamps.");
                }

                console.log(`[SRT Translate] Translating ${originalFileName} -> ${targetLanguage} (${rawSrt.length} chars)`);

                const displayLang = targetLanguage.toLowerCase() === 'si-legacy' ? 'Sinhala (FM-Abhaya Legacy)' : (targetLanguage.toLowerCase() === 'si-unicode' ? 'Sinhala (Unicode)' : targetLanguage);
                if (clientId) sendProgress(clientId, `CapZone Engine: Translating subtitles to ${displayLang}...`, 'processing', { step: 2, percent: 35 });

                const translated = await runMmsSrtTranslateEngine(rawSrt, targetLanguage, clientId);
                if (!translated || !translated.srt) {
                    throw new Error("Subtitle translation could not be completed.");
                }

                let finalUnicodeSrt = translated.srt;
                let finalLegacySrt = '';
                const tlLower = targetLanguage.toLowerCase();
                const isTargetSinhala = (tlLower === 'sinhala' || tlLower === 'si' || tlLower.startsWith('si-') || tlLower.includes('sinhala'));
                const isLegacyRequested = (tlLower === 'si-legacy' || tlLower.includes('legacy'));

                if (isTargetSinhala && typeof unicodeToFmAbhaya === 'function') {
                    finalLegacySrt = unicodeToFmAbhaya(finalUnicodeSrt);
                }

                const primarySrt = (isLegacyRequested && finalLegacySrt) ? finalLegacySrt : finalUnicodeSrt;
                const blockMatches = primarySrt.match(/\d+\s*\r?\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->/g);
                const blockCount = blockMatches ? blockMatches.length : (primarySrt.split('-->').length - 1);

                const cleanBase = originalFileName.replace(/[^\w\s\u0D80-\u0DFF-]/g, '').trim().replace(/\s+/g, '_') || 'Subtitles';
                const safeDownloadFileName = ensureCapZoneDomainFileName(`${cleanBase}.srt`, '.srt');
                const srtDiskFileName = `trans_${Date.now()}_${safeDownloadFileName}`;
                const srtDiskPath = path.join(uploadDir, srtDiskFileName);

                try { fs.writeFileSync(srtDiskPath, primarySrt, 'utf8'); } catch(e){}

                if (clientId) sendProgress(clientId, `Subtitles successfully translated to ${displayLang}!`, 'completed');

                res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    valid: true,
                    srt: primarySrt,
                    srtUnicode: finalUnicodeSrt,
                    srtLegacy: finalLegacySrt,
                    blocks: blockCount,
                    language: targetLanguage,
                    title: cleanBase,
                    filename: safeDownloadFileName,
                    downloadFileName: safeDownloadFileName,
                    downloadUrl: `/uploads/${srtDiskFileName}`
                }));
            } catch (err) {
                console.error('[SRT Translation Error]:', err.message);
                if (clientId) sendProgress(clientId, err.message, 'error');
                res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Subtitle translation failed.' }));
            }
        });
        return;
    }

    // 6.8 YouTube Downloader Endpoint & Gateway Handler
    if (req.method === 'POST' && (pathname === '/api/youtube-download' || (pathname === '/api/gateway' && (reqUrl.searchParams.get('op') === 'yt_dl' || reqUrl.searchParams.get('op') === 'youtube')))) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            let clientId = null;
            try {
                const parsed = JSON.parse(body || '{}');
                clientId = parsed.clientId;
                const videoUrl = (parsed.url || parsed.videoUrl || '').trim();
                const format = parsed.format || 'video';

                if (!videoUrl) throw new Error("No URL provided");
                if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
                    throw new Error("Invalid YouTube URL. Please provide a valid YouTube link.");
                }

                if (clientId) sendProgress(clientId, 'Step 1: Connecting to YouTube stream & fetching metadata...', 'processing');

                const quality = parsed.quality || (format === 'audio' ? (parsed.bitrate || '320k') : '1080p');
                const dlResult = await downloadSocialMediaWithYtDlp(videoUrl, format, clientId, quality);
                const title = dlResult.title || 'YouTube_Video';
                const downloadUrl = dlResult.downloadUrl;

                // Verify ACTUAL downloaded stream resolution or MP3 bitrate with ffmpeg
                let probedQuality = dlResult.actualQuality || '';
                if (!probedQuality && dlResult.filePath && fs.existsSync(dlResult.filePath)) {
                    const ffProbeBin = (typeof ffmpegPath !== 'undefined' && ffmpegPath && fs.existsSync(ffmpegPath)) ? ffmpegPath : 'ffmpeg';
                    probedQuality = await new Promise((resQ) => {
                        exec(`"${ffProbeBin}" -i "${dlResult.filePath}"`, { windowsHide: true }, (_e, _out, errOut) => {
                            const log = errOut || '';
                            if (format === 'audio') {
                                const bm = log.match(/Audio:.*?,\s*(\d+)\s*kb\/s/i) || log.match(/bitrate:\s*(\d+)\s*kb\/s/i);
                                resQ(bm ? `${bm[1]}kbps MP3 Audio` : '');
                            } else {
                                const dm = log.match(/Video:.*?,\s*(\d{3,4})x(\d{3,4})/i);
                                resQ(dm ? `${dm[2]}p (${dm[1]}x${dm[2]}) MP4` : '');
                            }
                        });
                    });
                }

                const userEmail = req.headers['x-user-email'] || parsed.email;
                const cleanTitle = (title ? title.replace(/[^\w\s\u0D80-\u0DFF-]/g, '').trim().replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) : '') || 'YouTube_Media';
                const safeFilename = ensureCapZoneDomainFileName(format === 'audio' ? `${cleanTitle}.mp3` : `${cleanTitle}.mp4`);
                const qNorm = String(quality || '').toLowerCase();
                const exactQualityLabel = probedQuality || (format === 'audio'
                    ? (qNorm.includes('128') ? '128kbps MP3 Audio' : (qNorm.includes('192') ? '192kbps MP3 Audio' : '320kbps Crystal MP3'))
                    : (qNorm.includes('360') ? '360p Fast MP4' : (qNorm.includes('480') ? '480p SD MP4' : (qNorm.includes('720') ? '720p HD MP4' : '1080p Full HD MP4'))));

                if (clientId) sendProgress(clientId, format === 'audio' ? 'Step 3: Crystal-Clear MP3 Audio Ready!' : 'Step 3: HD YouTube Video Ready with Audio!', 'completed');

                res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    title: title,
                    quality: exactQualityLabel,
                    qualityLabel: exactQualityLabel,
                    downloadUrl: downloadUrl,
                    fileName: dlResult.fileName,
                    filename: safeFilename
                }));
            } catch (e) {
                console.error('[YouTube Downloader Error]:', e.message);
                if (clientId) sendProgress(clientId, e.message || 'YouTube media extraction failed', 'error');
                res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message || 'YouTube download failed. Please check the video link.' }));
            }
        });
        return;
    }

    // 7. Facebook Downloader Endpoint & Secure Gateway Handler (Guaranteed Audio & Video Merger)
    if (req.method === 'POST' && (pathname === '/api/facebook-download' || (pathname === '/api/gateway' && (reqUrl.searchParams.get('op') === 'fb_dl' || reqUrl.searchParams.get('op') === 'facebook')))) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            let clientId = null;
            try {
                const parsed = JSON.parse(body || '{}');
                clientId = parsed.clientId;
                const videoUrl = (parsed.url || parsed.videoUrl || '').trim();
                const format = parsed.format || 'video';

                if (!videoUrl) throw new Error("No URL provided");
                if (!videoUrl.includes('facebook.com') && !videoUrl.includes('fb.watch') && !videoUrl.includes('fb.me') && !videoUrl.includes('fb.com')) {
                    throw new Error("Invalid Facebook URL. Please check the link.");
                }

                if (clientId) sendProgress(clientId, 'Step 1: Extracting Facebook media stream & metadata...', 'processing');

                const dlResult = await downloadSocialMediaWithYtDlp(videoUrl, format, clientId);
                const title = dlResult.title || 'Facebook_Video';
                const downloadUrl = dlResult.downloadUrl;

                if (clientId) sendProgress(clientId, format === 'audio' ? 'Step 3: High-Quality Audio Stream Ready!' : 'Step 3: HD Video Stream Ready with Audio!', 'completed');

                const userEmail = req.headers['x-user-email'] || parsed.email || (typeof fields !== 'undefined' && fields ? fields.email : null);
                const cleanTitle = (title ? title.replace(/[^\w\s\u0D80-\u0DFF-]/g, '').trim().replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) : '') || 'Facebook_Media';
                const safeFilename = ensureCapZoneDomainFileName(format === 'audio' ? `${cleanTitle}.mp3` : `${cleanTitle}.mp4`);
                const platformDetail = format === 'audio' ? 'Audio MP3' : 'Video MP4';

                let fbTask = null;
                try {
                    fbTask = logTaskToTelegram('Social Video Download', { 'Platform': 'Facebook', 'Format': platformDetail, 'File Name': safeFilename, 'URL': videoUrl }, downloadUrl, userEmail, { format, url: videoUrl, title, filename: safeFilename });
                } catch (tgErr) {
                    console.warn('[Facebook Telegram Log Warning]:', tgErr.message);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    projectId: fbTask ? fbTask.id : null,
                    title: fbTask ? fbTask.title : title,
                    quality: format === 'audio' ? 'Audio' : 'HD (with Audio)',
                    downloadUrl: downloadUrl,
                    filename: safeFilename
                }));
            } catch (e) {
                console.error('[Facebook Downloader Error]:', e.message);
                if (clientId) sendProgress(clientId, e.message || 'Facebook video extraction failed', 'error');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message || 'Facebook video download failed. Please check the link.' }));
            }
        });
        return;
    }

    // 8. TikTok Downloader Endpoint & Secure Gateway Handler
    if (req.method === 'POST' && (pathname === '/api/tiktok-download' || (pathname === '/api/gateway' && (reqUrl.searchParams.get('op') === 'tt_dl' || reqUrl.searchParams.get('op') === 'tiktok')))) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            let clientId = null;
            try {
                const parsed = JSON.parse(body || '{}');
                clientId = parsed.clientId;
                const videoUrl = (parsed.url || parsed.videoUrl || '').trim();
                const format = parsed.format || 'video';
                const qualityLevel = parsed.qualityLevel || 'max';
                
                if (!videoUrl) throw new Error("No URL provided");
                if (!videoUrl.includes('tiktok.com')) {
                    throw new Error("Invalid TikTok URL. Please check the link.");
                }

                if (clientId) sendProgress(clientId, 'Step 1: Parsing TikTok Link & Metadata...', 'processing');
                
                // Tier 1: Fast TikWM API with browser User-Agent
                let downloadUrl = null;
                let author = 'TikTok_Creator';
                let title = 'TikTok Video';

                try {
                    const response = await new Promise((resolve, reject) => {
                        const reqTikwm = https.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'application/json'
                            },
                            timeout: 8000
                        }, (res) => {
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => {
                                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                            });
                            res.on('error', reject);
                        });
                        reqTikwm.on('error', reject);
                        reqTikwm.on('timeout', () => { reqTikwm.destroy(); resolve(null); });
                    });

                    if (response && response.code === 0 && response.data) {
                        if (response.data.images && format === 'video') {
                            throw new Error("This is a photo slideshow. Please select 'Get MP3' instead to download the audio.");
                        }
                        downloadUrl = format === 'audio' ? response.data.music : (qualityLevel === 'max' && response.data.hdplay ? response.data.hdplay : response.data.play);
                        author = response.data.author ? (response.data.author.unique_id || response.data.author.nickname || 'creator') : 'creator';
                        title = response.data.title || 'TikTok Video';
                    }
                } catch (tikwmErr) {
                    console.log('[TikWM Note]:', tikwmErr.message, '- Will fallback to yt-dlp if needed.');
                    if (tikwmErr.message.includes('photo slideshow')) throw tikwmErr;
                }

                // Tier 2: yt-dlp fallback if TikWM did not produce downloadUrl
                if (!downloadUrl) {
                    if (clientId) sendProgress(clientId, 'Step 2: Connecting to secondary extraction engine...', 'processing');
                    const ytDlpCmd = fs.existsSync(ytDlpPath) ? `"${ytDlpPath}"` : 'yt-dlp';
                    const ytDlpData = await new Promise((resolve, reject) => {
                        exec(`${ytDlpCmd} --dump-json --no-warnings --no-check-certificates "${videoUrl}"`, { maxBuffer: 1024 * 1024 * 15, windowsHide: true }, (err, stdout, stderr) => {
                            if (err) return reject(new Error('Failed to fetch TikTok video. Invalid URL or video is private.'));
                            try {
                                let jsonStr = stdout.trim();
                                if (jsonStr.includes('\n')) jsonStr = jsonStr.split('\n').filter(line => line.trim().startsWith('{'))[0] || jsonStr.split('\n')[0];
                                resolve(JSON.parse(jsonStr));
                            } catch (parseErr) {
                                reject(new Error('Failed to parse TikTok video data.'));
                            }
                        });
                    });

                    title = ytDlpData.title || ytDlpData.description || 'TikTok Video';
                    author = ytDlpData.uploader || ytDlpData.uploader_id || 'creator';
                    if (format === 'audio') {
                        if (ytDlpData.formats) {
                            const audioFormat = ytDlpData.formats.slice().reverse().find(f => f.url && f.acodec && f.acodec !== 'none') || ytDlpData.formats.slice().reverse().find(f => f.url);
                            if (audioFormat) downloadUrl = audioFormat.url;
                        }
                        if (!downloadUrl) downloadUrl = ytDlpData.url;
                    } else {
                        if (ytDlpData.formats) {
                            const bestFormat = ytDlpData.formats.slice().reverse().find(f => f.url && f.protocol && f.protocol.includes('http'));
                            if (bestFormat) downloadUrl = bestFormat.url;
                        }
                        if (!downloadUrl && ytDlpData.requested_formats && ytDlpData.requested_formats[0]) {
                            downloadUrl = ytDlpData.requested_formats[0].url;
                        }
                        if (!downloadUrl) downloadUrl = ytDlpData.url;
                    }
                }

                if (!downloadUrl) {
                    throw new Error("Failed to extract TikTok video. Make sure the video is public.");
                }

                if (clientId) sendProgress(clientId, format === 'audio' ? 'Step 3: TikTok MP3 Ready!' : 'Step 3: TikTok HD Video Ready!', 'completed');

                const userEmail = req.headers['x-user-email'] || parsed.email || (typeof fields !== 'undefined' && fields ? fields.email : null);
                const cleanTitle = (title ? title.replace(/[^\w\s\u0D80-\u0DFF-]/g, '').trim().replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) : '') || `TikTok_${author || 'Video'}`;
                const safeFilename = ensureCapZoneDomainFileName(format === 'audio' ? `${cleanTitle}.mp3` : `${cleanTitle}.mp4`);
                const platformDetail = format === 'audio' ? 'Audio MP3' : 'Video MP4';

                let ttTask = null;
                try {
                    ttTask = logTaskToTelegram('Social Video Download', { 'Platform': 'TikTok', 'Format': platformDetail, 'File Name': safeFilename, 'Author': `@${author}`, 'URL': videoUrl }, downloadUrl, userEmail, { format, url: videoUrl, author, title, filename: safeFilename });
                } catch (tgErr) {
                    console.warn('[TikTok Telegram Log Warning]:', tgErr.message);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    projectId: ttTask ? ttTask.id : null,
                    title: ttTask ? ttTask.title : (title || 'TikTok HD Video (No Watermark)'),
                    author: `@${author}`,
                    downloadUrl: downloadUrl,
                    filename: safeFilename
                }));
            } catch (e) {
                console.error('[TikTok Downloader Error]:', e.message);
                if (clientId) sendProgress(clientId, e.message || 'TikTok video extraction failed', 'error');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message || 'TikTok video download failed. Please check the link.' }));
            }
        });
        return;
    }
    

    // 8.1 Image Generation Endpoint (using Free Pollinations AI as Fallback)
    if (req.method === 'POST' && pathname === '/api/generate-image') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { prompt, clientId } = JSON.parse(body || '{}');
                if (!prompt) throw new Error("Prompt is required");

                // If it's a proxy request we can just return the image URL directly
                
                if (clientId) sendProgress(clientId, 'Step 1: Connecting to AI Image Generator...', 'processing');

                // Using Pollinations AI for free text-to-image without API keys
                // We use enhance=true to pass the prompt through an LLM to make it Midjourney-level quality
                const encodedPrompt = encodeURIComponent(prompt.trim());
                const rawImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&enhance=true&model=flux`;
                const imageUrl = `/api/proxy-image?url=${encodeURIComponent(rawImageUrl)}`;

                // We can't know when Pollinations is done since it's an immediate redirect, 
                // but we can return the URL so the frontend can load it.
                if (clientId) {
                    setTimeout(() => {
                        sendProgress(clientId, 'Step 2: Image Generated successfully!', 'completed', { 
                            url: imageUrl
                        });
                    }, 1500); // Simulate processing time for UX
                }
                logTaskToTelegram('AI Image Generation', { 'Prompt': prompt, 'Size': size, 'Style': style }, rawImageUrl, req.headers['x-user-email']);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, url: imageUrl }));

            } catch (e) {
                if (!res.headersSent) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            }
        });
        return;
    }

    // 8.1.6 Structured Creator Video Script Builder (100% Free Local Engine)
    if (req.method === 'POST' && pathname === '/api/generate-script') {
        const clientId = reqUrl.searchParams.get('clientId');
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const topic = String(data.topic || '').trim();
                const format = String(data.format || 'YouTube Long Form').trim();
                
                if (!topic) {
                    if (clientId) sendProgress(clientId, 'No topic provided', 'error');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'No video topic provided' }));
                }

                if (clientId) sendProgress(clientId, 'Step 1: Building structured creator video script...', 'processing');

                const scriptText = [
                    `මාතෘකාව: ${topic} (${format})`,
                    '',
                    '[HOOK]',
                    `අද අපි කතා කරන්නේ ${topic} ගැන ගොඩක් දෙනෙක් නොදන්න වැදගත්ම කරුණු ටිකක්. මේ video එක අවසානය වෙනකම් බලන්න.`,
                    '',
                    '[INTRO]',
                    `ආයුබෝවන් හැමෝටම, CapZone Studio එකෙන් අද ගෙනාවේ ${topic} පිළිබඳව සරලව හා පැහැදිලිව ඉගෙන ගන්න පුළුවන් ${format} සැලැස්මක්.`,
                    '',
                    '[SCENE/B-ROLL IDEAS]',
                    `- ${topic} හා සම්බන්ධ ප්‍රධාන දර්ශන සහ close-up shots`,
                    `- Key points highlight කරන clean text graphics සහ motion transitions`,
                    '',
                    '[BODY]',
                    `පළමුවෙන්ම ${topic} වල මූලික පසුබිම තේරුම් ගනිමු. නිවැරදි සැලැස්මක් සහ step-by-step workflow එකක් භාවිතා කළොත් ඔබේ ප්‍රතිඵල ගුණාත්මකව වැඩි කරගන්න පුළුවන්.`,
                    `දෙවනුව, ප්‍රායෝගිකව භාවිතා කරන විට මතක තබාගත යුතු ප්‍රධානම tips සහ වැරදි මඟහරවා ගන්නා ආකාරය මෙතනදී පෙන්වන්න.`,
                    '',
                    '[OUTRO - CALL TO ACTION]',
                    `මේ ${topic} වීඩියෝ එක ප්‍රයෝජනවත් වුණා නම් Like එකක් දාලා, අදහස් comment කරලා Subscribe කරන්නත් අමතක කරන්න එපා.`
                ].join('\n');

                if (clientId) sendProgress(clientId, 'Step 2: Creator Script Ready!', 'completed', { scriptText });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                const scriptFileName = `script_${Date.now()}.txt`;
                const scriptFilePath = path.join(__dirname, 'uploads', scriptFileName);
                try { fs.writeFileSync(scriptFilePath, scriptText, 'utf8'); } catch(e){}
                const scriptTask = logTaskToTelegram('Studio Script Builder', { 'Topic': topic, 'Format': format }, scriptFilePath, req.headers['x-user-email'] || data.email, { scriptText, topic, format });
                res.end(JSON.stringify({ success: true, script: scriptText, projectId: scriptTask ? scriptTask.id : null }));

            } catch (e) {
                if (!res.headersSent) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        script: `ðŸŽ¬ [KaveezCloud AI Generated Script]\nà¶¸à·à¶­à·˜à¶šà·à·€: ${topic}\n\n[HOOK]\n${topic} à¶´à·’à·…à·’à¶¶à¶³ à·€à·à¶¯à¶œà¶­à·Šà¶¸ à¶šà¶»à·”à¶«à·” à¶¸à·™à¶±à·Šà¶±!\n\n[BODY]\n1. à·ƒà·à¶½à·ƒà·”à¶¸ à·ƒà·„ à¶±à·’à·€à·à¶»à¶¯à·’ à¶‰à¶½à¶šà·Šà¶šà¶º à¶­à·à¶»à·à¶œà·à¶±à·“à¶¸.\n2. à¶…à¶›à¶«à·Šà¶© à¶´à·”à·„à·”à¶«à·”à·€ à·ƒà·„ à¶‹à¶­à·Šà·ƒà·à·„à¶º.\n\n[OUTRO]\nà·€à·“à¶©à·’à¶ºà·à·€ à¶±à·à¶»à¶¹à·– à¶”à¶¶à¶§ à·ƒà·Šà¶­à·–à¶­à·’à¶ºà·’!`
                    }));
                }
                if (clientId) sendProgress(clientId, 'AI Script Ready!', 'completed');
            }
        });
        return;
    }
    
    // 8.1.5 Reply to Interactive Image Generation
    if (req.method === 'POST' && pathname === '/api/reply-image') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { clientId, reply } = JSON.parse(body || '{}');
                if (!clientId || !reply) throw new Error("Client ID and Reply are required");
                
                const child = activeImageTasks.get(clientId);
                if (child) {
                    child.stdin.write(reply + '\n');
                    sendProgress(clientId, 'Reply sent, generating image...', 'processing');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Active session not found or has expired." }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 8.1 Universal Document & Image Converter Endpoint
    if (req.method === 'POST' && (pathname === '/api/convert-file' || (pathname === '/api/gateway' && reqUrl.searchParams.get('op') === 'convert'))) {
        try {
            if (!universalConverter) throw new Error('Converter engine is unavailable on server.');
            const parsedForm = await parseMultipartFormData(req);
            const uploadedFiles = (parsedForm.files && parsedForm.files.length) ? parsedForm.files : (parsedForm.file ? [parsedForm.file] : []);
            if (!uploadedFiles.length) throw new Error('No file uploaded for conversion.');

            const fields = parsedForm.fields || {};
            const targetFormat = (fields.targetFormat || fields.format || '').trim();
            const quality = parseInt(fields.quality || '90', 10) || 90;
            const dpi = parseInt(fields.dpi || '150', 10) || 150;

            if (fields.clientId) {
                sendProgress(fields.clientId, `Converting ${uploadedFiles.length} file(s) to ${targetFormat.toUpperCase()}...`, 'processing');
            }

            const result = await universalConverter.convertFiles({
                files: uploadedFiles,
                targetFormat,
                quality,
                dpi,
                uploadDir
            });
            console.log(`[Universal Converter] Converted ${uploadedFiles.length} file(s) -> ${result.downloadFileName}`);

            // Clean up raw uploaded source temp files immediately after conversion
            uploadedFiles.forEach(f => {
                try { if (f && f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (e) {}
            });

            if (fields.clientId) {
                sendProgress(fields.clientId, `Converted to ${result.downloadFileName} successfully!`, 'completed', result);
            }

            res.writeHead(200, {
                ...headers,
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            return res.end(JSON.stringify(result));
        } catch (convErr) {
            console.error('[Universal Converter Error]:', convErr.message);
            res.writeHead(200, {
                ...headers,
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            return res.end(JSON.stringify({ success: false, error: convErr.message || 'File conversion failed.' }));
        }
    }

    // 8.2 Background Removal Endpoint & Secure Gateway Handler
    if (req.method === 'POST' && (pathname === '/api/remove-bg' || (pathname === '/api/gateway' && (reqUrl.searchParams.get('op') === 'bg_remove' || reqUrl.searchParams.get('op') === 'remove-bg')))) {
        const clientId = reqUrl.searchParams.get('clientId');
        try {
            const { fields, file } = await parseMultipartFormData(req);
            if (!file) throw new Error("No image file uploaded");
            
            if (clientId) sendProgress(clientId, 'Uploading image...', 'processing');
            
            const pyCmd = (typeof getPythonCommand === 'function') ? getPythonCommand() : (os.platform() === 'win32' ? 'py' : 'python3');
            const scriptPath = path.join(__dirname, 'bg_remover.py');
            const outputPath = path.join(uploadDir, `nobg_${Date.now()}.png`);
            const requestedModel = (fields && fields.model) || reqUrl.searchParams.get('model') || 'birefnet-general';
            console.log(`[Background Remover] Starting cutout (${requestedModel}) for ${file.originalFilename || file.filename || 'image'}`);
            
            if (clientId) sendProgress(clientId, 'Detecting subjects & removing background...', 'processing');

            // logTaskToTelegram will be logged after processing is finished with real image file
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Background removal started' }));

            const child = require('child_process').spawn(pyCmd, ['-u', scriptPath, file.path, outputPath, requestedModel]);
            if (clientId) activeImageTasks.set(clientId, child);
            
            let stdoutData = '';
            let lastQuestionSent = '';
            let stderrData = '';
            
            child.stdout.on('data', (data) => {
                const text = data.toString();
                console.log(`[Background Remover]: ${text.trim()}`);
                stdoutData += text;
                
                if (text.includes('[*]')) {
                    // Extract log and sanitize to keep user messages clean and professional
                    const logMatch = text.match(/\[\*\](.*)/);
                    if (logMatch && clientId) {
                        let cleanLog = logMatch[1].trim();
                        const lower = cleanLog.toLowerCase();
                        if (lower.includes('model') || lower.includes('u2net') || lower.includes('birefnet') || lower.includes('engine') || lower.includes('alpha') || lower.includes('remove')) {
                            cleanLog = 'Removing background...';
                        } else if (lower.includes('saving') || lower.includes('png') || lower.includes('finaliz')) {
                            cleanLog = 'Finalizing image...';
                        } else if (lower.includes('image') || lower.includes('load') || lower.includes('process')) {
                            cleanLog = 'Processing image...';
                        }
                        sendProgress(clientId, cleanLog, 'processing');
                    }
                }
            });
            
            child.stderr.on('data', (data) => {
                const text = data.toString();
                console.error(`[Background Remover Log/Warning]: ${text.trim()}`);
                stderrData += text;
            });
            
            child.on('close', (code) => {
                if (clientId) activeImageTasks.delete(clientId);
                // Immediately delete original input image from VPS disk to save storage
                try { if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch(e){}
                let resultMatch = stdoutData.match(/RESULT:(.*)/);
                let result = resultMatch ? resultMatch[1].trim() : '';
                
                if (code !== 0 || !result || result.startsWith('Error')) {
                    try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch(e){}
                    if (clientId) sendProgress(clientId, `Error: ${result || stderrData}`, 'error');
                } else {
                    const origBgName = (file && (file.originalname || file.originalFilename || file.filename)) || 'cutout.png';
                    const outDownloadName = ensureCapZoneDomainFileName(origBgName.replace(/\.[^/.]+$/, '') + '_NoBg.png', '.png');
                    const fileName = path.basename(result);
                    const staticUrl = `/uploads/${encodeURIComponent(fileName)}`;
                    const downloadUrl = `/api/download?file=${encodeURIComponent(fileName)}&name=${encodeURIComponent(outDownloadName)}`;
                    const userEmail = req.headers['x-user-email'] || (typeof fields !== 'undefined' && fields ? fields.email : null);

                    try {
                        logTaskToTelegram('Background Removal', { 'File Name': origBgName }, outputPath, userEmail, { url: staticUrl, isBgRemover: true });
                    } catch (e) {
                        console.error('[Background Remover Telegram Log Error]:', e.message);
                    }

                    if (clientId) sendProgress(clientId, 'Background removed successfully!', 'completed', { 
                        url: staticUrl,
                        previewUrl: staticUrl,
                        downloadUrl: downloadUrl,
                        fileName: outDownloadName,
                        filename: outDownloadName
                    });
                }
            });
        } catch (e) {
            try { if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch(err){}
            if (clientId) sendProgress(clientId, `Error: ${e.message}`, 'error');
            if (!res.headersSent) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        }
        return;
    }

    // 8.5 Proxy Download & Inline Media Streaming Endpoint
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/api/proxy-download') {
        let fileUrl = reqUrl.searchParams.get('url');
        let filename = reqUrl.searchParams.get('filename') || 'download.mp4';
        const isInline = reqUrl.searchParams.get('inline') === '1' || reqUrl.searchParams.get('inline') === 'true';
        if (!fileUrl) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('URL is required');
        }

        // Guarantee www.capzone.top is included at the end of all media filenames
        filename = ensureCapZoneDomainFileName(filename, path.extname(filename) || '.mp4');

        const proxyMimeTypes = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.avif': 'image/avif',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.bmp': 'image/bmp',
            '.ico': 'image/x-icon',
            '.tiff': 'image/tiff',
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.odt': 'application/vnd.oasis.opendocument.text',
            '.rtf': 'application/rtf',
            '.zip': 'application/zip',
            '.csv': 'text/csv; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.xml': 'application/xml; charset=utf-8',
            '.md': 'text/markdown; charset=utf-8',
            '.html': 'text/html; charset=utf-8',
            '.srt': 'text/plain; charset=utf-8',
            '.vtt': 'text/vtt; charset=utf-8',
            '.txt': 'text/plain; charset=utf-8'
        };

        // Handle local files in uploads folder directly (whether relative or absolute URL)
        let localCandidate = fileUrl;
        try {
            if (fileUrl.startsWith('http')) {
                const u = new URL(fileUrl);
                if (u.pathname && (u.pathname.startsWith('/uploads/') || u.pathname.includes('/uploads/'))) {
                    localCandidate = u.pathname.substring(u.pathname.indexOf('/uploads/'));
                }
            }
        } catch (e) {}

        if (localCandidate.startsWith('/uploads/') || !localCandidate.startsWith('http')) {
            const relativePath = localCandidate.startsWith('/uploads/') ? localCandidate.replace('/uploads/', '') : path.basename(localCandidate);
            const localPath = path.join(uploadDir, relativePath);
            if (fs.existsSync(localPath)) {
                const stat = fs.statSync(localPath);
                const ext = path.extname(filename).toLowerCase() || path.extname(localPath).toLowerCase();
                const contentType = proxyMimeTypes[ext] || 'application/octet-stream';
                const baseHeaders = {
                    'Content-Type': contentType,
                    'Content-Disposition': makeContentDisposition(isInline ? 'inline' : 'attachment', filename),
                    'Access-Control-Allow-Origin': '*',
                    'Accept-Ranges': 'bytes'
                };
                const range = req.headers.range;
                if (range) {
                    const parts = range.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10) || 0;
                    const end = parts[1] ? Math.min(parseInt(parts[1], 10), stat.size - 1) : stat.size - 1;
                    const chunksize = (end - start) + 1;
                    res.writeHead(206, {
                        ...baseHeaders,
                        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                        'Content-Length': chunksize
                    });
                    if (req.method === 'HEAD') return res.end();
                    return fs.createReadStream(localPath, { start, end }).pipe(res);
                }
                res.writeHead(200, { ...baseHeaders, 'Content-Length': stat.size });
                if (req.method === 'HEAD') return res.end();
                return fs.createReadStream(localPath).pipe(res);
            }
        }

        function streamFileWithRedirects(targetUrl, redirectCount = 0) {
            if (redirectCount > 5) {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
                return res.end('Too many redirects while fetching media');
            }
            try {
                const parsedUrl = new URL(targetUrl);
                const protocol = parsedUrl.protocol === 'https:' ? https : http;
                const reqHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': parsedUrl.origin
                };
                if (req.headers.range) {
                    reqHeaders['Range'] = req.headers.range;
                }
                const clientReq = protocol.get(targetUrl, { headers: reqHeaders }, (proxyRes) => {
                    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                        let nextUrl = proxyRes.headers.location;
                        if (!nextUrl.startsWith('http')) {
                            nextUrl = new URL(nextUrl, targetUrl).toString();
                        }
                        return streamFileWithRedirects(nextUrl, redirectCount + 1);
                    }
                    if (proxyRes.statusCode >= 400) {
                        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/plain' });
                        return res.end(`Failed to fetch file: HTTP ${proxyRes.statusCode}`);
                    }

                    const ext = path.extname(filename).toLowerCase();
                    const responseHeaders = {
                        'Content-Type': proxyMimeTypes[ext] || proxyRes.headers['content-type'] || 'application/octet-stream',
                        'Content-Disposition': makeContentDisposition(isInline ? 'inline' : 'attachment', filename),
                        'Access-Control-Allow-Origin': '*'
                    };
                    if (proxyRes.headers['content-length']) {
                        responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
                    }
                    if (proxyRes.headers['content-range']) {
                        responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
                    }
                    if (proxyRes.headers['accept-ranges']) {
                        responseHeaders['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
                    }

                    res.writeHead(proxyRes.statusCode, responseHeaders);
                    if (req.method === 'HEAD') return res.end();
                    proxyRes.pipe(res);
                });
                clientReq.on('error', (err) => {
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Proxy download error: ' + err.message);
                    }
                });
            } catch (err) {
                if (!res.headersSent) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid URL');
                }
            }
        }
        streamFileWithRedirects(fileUrl);
        return;
    }

    // 8.6 Local File Download Endpoint
    if (req.method === 'GET' && pathname === '/api/download') {
        const fileName = reqUrl.searchParams.get('file');
        if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('Invalid file name');
        }

        const filePath = path.join(__dirname, 'uploads', fileName);
        if (!fs.existsSync(filePath)) {
            if (fs.existsSync(filePath + '.enc')) {
                const ext = path.extname(fileName).toLowerCase();
                const mimeTypes = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.webp': 'image/webp',
                    '.gif': 'image/gif',
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.srt': 'text/plain; charset=utf-8',
                    '.txt': 'text/plain; charset=utf-8'
                };
                return streamEncryptedLocalFile(filePath + '.enc', res, mimeTypes[ext], fileName);
            }
            const found = projectsDB.find(p => {
                if (p.telegram_file_id) {
                    if (p.media_url && p.media_url.includes(fileName)) return true;
                    if (p.title && p.title.includes(fileName)) return true;
                }
                return false;
            });
            if (found && found.telegram_file_id) {
                return streamFileFromTelegram(found.telegram_file_id, res, fileName);
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('File not found');
        }

        const customName = reqUrl.searchParams.get('name') || reqUrl.searchParams.get('filename');
        let downloadName = ensureCapZoneDomainFileName(customName || fileName, path.extname(fileName) || '');

        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': makeContentDisposition('attachment', downloadName)
        });
        
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
        return;
    }

    // 8.7 Proxy Image Endpoint (bypasses DNS blocks for pollination API)
    if (req.method === 'GET' && pathname === '/api/proxy-image') {
        const targetUrl = reqUrl.searchParams.get('url');
        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('URL parameter is required');
        }
        try {
            const fetchRes = await fetch(targetUrl);
            if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
            const buffer = await fetchRes.arrayBuffer();
            res.writeHead(200, {
                'Content-Type': fetchRes.headers.get('content-type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000'
            });
            return res.end(Buffer.from(buffer));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Image proxy error: ' + e.message);
        }
    }

    // (Admin routes have been completely migrated to admin.js)

    // 8.9 Firebase Custom Domain Auth Proxy (Handles /__/auth/* for custom authDomain)
    if (pathname.startsWith('/__/auth/')) {
        const targetUrl = 'https://capzone-e601c.firebaseapp.com' + req.url;
        const proxyReq = https.request(targetUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                host: 'capzone-e601c.firebaseapp.com'
            }
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            console.error('Firebase Auth Proxy Error:', err);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Auth proxy error');
        });
        return req.pipe(proxyReq);
    }

    // 9. Static File Serving (Root & dashboard/login routes directly serve index.html)
    const decodedStaticPath = decodeURIComponent(pathname);
    let filePath = path.join(__dirname, (decodedStaticPath === '/' || decodedStaticPath === '/index.html' || decodedStaticPath === '/index') ? 'index.html' : decodedStaticPath);

    if (pathname === '/dashboard' || pathname === '/dashboard/' || pathname === '/dashboard.html' || pathname === '/index' || pathname === '/index.html' || pathname === '/login' || pathname === '/login/' || pathname === '/login.html') {
        filePath = path.join(__dirname, 'index.html');
    }

    // API-Only Backend Response when HTML frontend files are hosted separately on GitHub Pages (capzone.top)
    if ((pathname === '/' || pathname === '/index.html' || pathname === '/index') && !fs.existsSync(filePath)) {
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
            success: true,
            service: 'CapZone Studio Backend API',
            status: 'online',
            web: 'https://capzone.top'
        }));
    }

    if (pathname.startsWith('/uploads/') && !fs.existsSync(filePath)) {
        const uploadFile = path.basename(pathname);
        if (fs.existsSync(filePath + '.enc')) {
            const ext = path.extname(uploadFile).toLowerCase();
            const mimeTypes = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.srt': 'text/plain; charset=utf-8',
                '.txt': 'text/plain; charset=utf-8'
            };
            return streamEncryptedLocalFile(filePath + '.enc', res, mimeTypes[ext], uploadFile);
        }
        const found = projectsDB.find(p => {
            if (p.telegram_file_id) {
                if (p.media_url && p.media_url.includes(uploadFile)) return true;
                if (p.title && p.title.includes(uploadFile)) return true;
                if (p.payload && typeof p.payload === 'string' && p.payload.includes(uploadFile)) return true;
                if (p.metadata && typeof p.metadata === 'string' && p.metadata.includes(uploadFile)) return true;
            }
            return false;
        });
        if (found && found.telegram_file_id) {
            return streamFileFromTelegram(found.telegram_file_id, res, uploadFile);
        }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
    }

    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.ttf': 'font/ttf',
            '.otf': 'font/otf',
            '.avif': 'image/avif',
            '.bmp': 'image/bmp',
            '.ico': 'image/x-icon',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.tga': 'image/x-tga',
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.odt': 'application/vnd.oasis.opendocument.text',
            '.rtf': 'application/rtf',
            '.csv': 'text/csv; charset=utf-8',
            '.md': 'text/markdown; charset=utf-8',
            '.srt': 'text/plain; charset=utf-8',
            '.vtt': 'text/vtt; charset=utf-8',
            '.zip': 'application/zip',
            '.xml': 'application/xml; charset=utf-8',
            '.txt': 'text/plain; charset=utf-8'
        };

        if (ext === '.html') {
            try {
                let htmlContent = fs.readFileSync(filePath, 'utf8');
                const shieldToken = generateShieldToken(clientIp);
                const shieldScript = generateClientShieldScript(shieldToken);

                if (htmlContent.includes('<head>')) {
                    htmlContent = htmlContent.replace('<head>', '<head>\n' + shieldScript);
                } else if (/<head[^>]*>/i.test(htmlContent)) {
                    htmlContent = htmlContent.replace(/<head[^>]*>/i, match => match + '\n' + shieldScript);
                } else {
                    htmlContent = shieldScript + '\n' + htmlContent;
                }

                const htmlHeaders = {
                    'Content-Type': 'text/html; charset=utf-8',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'SAMEORIGIN',
                    'X-XSS-Protection': '1; mode=block',
                    'Referrer-Policy': 'strict-origin-when-cross-origin',
                    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
                    'X-Permitted-Cross-Domain-Policies': 'none',
                    'Set-Cookie': `__cz_shield=${shieldToken}; Path=/; HttpOnly; SameSite=Lax`,
                    'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.firebaseio.com https://*.firebaseapp.com https://*.googleapis.com https://apis.google.com https://accounts.google.com https://*.google.com https://*.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com https://pollinations.ai https://image.pollinations.ai https://sandbox.payhere.lk https://www.payhere.lk; frame-src 'self' https://challenges.cloudflare.com https://*.firebaseapp.com https://capzone-e601c.firebaseapp.com https://accounts.google.com https://*.google.com https://*.firebaseio.com; img-src 'self' data: blob: https: cid:; media-src 'self' blob: https:; connect-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cloudflareinsights.com https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://capzone-e601c.firebaseapp.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://*.google.com https://*.gstatic.com https://capzone.top https://*.capzone.top https://capzone.kaveez.top http://localhost:* http://127.0.0.1:*; frame-ancestors 'self';"
                };
                if (pathname.startsWith('/freecut-editor/')) {
                    htmlHeaders['Cross-Origin-Embedder-Policy'] = 'require-corp';
                    htmlHeaders['Cross-Origin-Opener-Policy'] = 'same-origin';
                }
                res.writeHead(200, htmlHeaders);
                return res.end(htmlContent);
            } catch(htmlErr) {
                console.error("HTML Shield injection error:", htmlErr);
            }
        }

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        const headers = { 
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        };
        if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
            headers['Cache-Control'] = 'public, max-age=86400, immutable';
        } else if (['.css', '.js'].includes(ext)) {
            if (path.basename(filePath) === 'firebase-config.js') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            } else {
                headers['Cache-Control'] = 'public, max-age=3600';
            }
        }
        if (pathname.startsWith('/freecut-editor/')) {
            headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
            headers['Cross-Origin-Opener-Policy'] = 'same-origin';
        }
        
        // HTTP Range Requests Support for Video/Audio Seeking in Browser Players
        const isMediaStream = (ext === '.mp4' || ext === '.mp3' || ext === '.webm' || ext === '.mov' || ext === '.wav' || ext === '.m4a' || ext === '.ogg');
        if (isMediaStream) {
            headers['Accept-Ranges'] = 'bytes';
            const stat = fs.statSync(filePath);
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                const chunksize = (end - start) + 1;
                headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
                headers['Content-Length'] = chunksize;
                res.writeHead(206, headers);
                return fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
                headers['Content-Length'] = stat.size;
                res.writeHead(200, headers);
                return fs.createReadStream(filePath).pipe(res);
            }
        }

        res.writeHead(200, headers);
        return fs.createReadStream(filePath).pipe(res);
    }

    // SPA Fallback for freecut-editor
    if (pathname.startsWith('/freecut-editor/')) {
        const spaIndex = path.join(__dirname, 'freecut-editor', 'index.html');
        if (fs.existsSync(spaIndex)) {
            let spaHtml = fs.readFileSync(spaIndex, 'utf8');
            const shieldToken = generateShieldToken(clientIp);
            const shieldScript = generateClientShieldScript(shieldToken);
            if (spaHtml.includes('<head>')) spaHtml = spaHtml.replace('<head>', '<head>\n' + shieldScript);
            else spaHtml = shieldScript + '\n' + spaHtml;
            res.writeHead(200, { 
                'Content-Type': 'text/html; charset=utf-8',
                'Cross-Origin-Embedder-Policy': 'require-corp',
                'Cross-Origin-Opener-Policy': 'same-origin',
                'X-Frame-Options': 'DENY'
            });
            return res.end(spaHtml);
        }
    }

    // 404 Fallback
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 Not Found</h1>');
});

server.listen(PORT, '0.0.0.0', () => {
    const vpsCheck = isAuthorizedVpsHost();
    console.log(`\n========================================================`);
    console.log(`🚀 Pure Node.js Master Server running at Port ${PORT}`);
    if (vpsCheck.isTargetVps) {
        console.log(`🛡️ Host Status: Authorized VPS [${AUTHORIZED_VPS_IP}] verified! (100% Active)`);
    } else {
        console.log(`🛡️ Host Status: Local/Dev Environment verified (Target VPS: ${AUTHORIZED_VPS_IP})`);
    }
    console.log(`========================================================\n`);
    
    // Pure local engine startup (no external API keys required)
    
    // Background File Cleanup: VPS Zero-Disk Storage Enforcement
    // Purges any residual orphaned media files in uploads/ and downloads/ (protects VPS disk space!)
    const purgeOldMediaFromVPS = () => {
        const tempDirs = [path.join(__dirname, 'uploads'), path.join(__dirname, 'downloads')];
        const maxAgeMs = 60 * 60 * 1000; // 1 hour max age (NEVER delete active media files within 1 hour!)
        const now = Date.now();
        
        tempDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                fs.readdir(dir, (err, files) => {
                    if (err) return;
                    files.forEach(file => {
                        if (file === 'portfolio') return; // NEVER clean up uploaded portfolio showcase
                        const filePath = path.join(dir, file);
                        if (activeProcessingFiles.has(filePath)) return; // NEVER delete active in-progress media!
                        fs.stat(filePath, (err, stats) => {
                            if (err) return;
                            if (stats.isFile() && (now - stats.mtimeMs > maxAgeMs)) {
                                fs.unlink(filePath, e => {
                                    if (!e) console.log(`[VPS Zero-Disk Purge] Deleted temporary media: ${file}`);
                                });
                            }
                        });
                    });
                });
            }
        });
    };
    purgeOldMediaFromVPS();
    setInterval(purgeOldMediaFromVPS, 10 * 60 * 1000);
});

server.timeout = 0;
server.keepAliveTimeout = 600000;
server.headersTimeout = 605000;
if (server.requestTimeout !== undefined) server.requestTimeout = 0;

// --- Daily Database Backup to Telegram ---
let lastBackupDate = new Date().toLocaleDateString('en-US', {timeZone: 'Asia/Colombo'});
setInterval(() => {
    const today = new Date().toLocaleDateString('en-US', {timeZone: 'Asia/Colombo'});
    if (today !== lastBackupDate) {
        lastBackupDate = today;
        const captionUsers = `💾 <b>Daily Users DB Backup</b>\n📅 <b>Date:</b> ${today}\n\n<i>Auto-generated daily backup of users_db.json</i>`;
        const captionProjects = `💾 <b>Daily Projects DB Backup</b>\n📅 <b>Date:</b> ${today}\n\n<i>Auto-generated daily backup of projects_db.json</i>`;
        
        const fs = require('fs');
        const path = require('path');
        const usersDbPath = path.join(__dirname, 'users_db.json');
        const projectsDbPath = path.join(__dirname, 'projects_db.json');
        
        if (fs.existsSync(usersDbPath)) {
            uploadMediaToTelegramBot(TELEGRAM_LOGIN_CHAT_ID, usersDbPath, 'document', captionUsers).then(() => {
                console.log(`[Backup] Daily users_db backup sent to Telegram for ${today}`);
            }).catch(err => {
                console.error(`[Backup] Failed to send users_db backup:`, err);
            });
        }
        
        if (fs.existsSync(projectsDbPath)) {
            uploadMediaToTelegramBot(TELEGRAM_LOGIN_CHAT_ID, projectsDbPath, 'document', captionProjects).then(() => {
                console.log(`[Backup] Daily projects_db.json backup sent to Telegram for ${today}`);
            }).catch(err => {
                console.error(`[Backup] Failed to send projects_db.json backup:`, err);
            });
        }
    }
}, 60 * 60 * 1000); // Check every hour






