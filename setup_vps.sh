#!/usr/bin/env bash
# ==============================================================================
# CapZone Video & Subtitle Studio - Linux VPS One-Click Setup Script
# Works on: Ubuntu 20.04/22.04/24.04, Debian 11/12
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 [CapZone VPS Installer] Starting Automated Environment Setup..."
echo "=========================================================="

# 1. System packages & build tools
echo "📦 [1/6] Updating system packages & installing core tools..."
sudo apt update -y
sudo apt install -y curl wget git ffmpeg python3 python3-pip python3-venv build-essential

# 1.1 Install standalone latest yt-dlp binary
echo "📦 [1.1/6] Installing official yt-dlp binary to /usr/local/bin..."
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# 2. Node.js LTS (v20)
if ! command -v node &> /dev/null; then
    echo "📦 [2/6] Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ [2/6] Node.js is already installed: $(node -v)"
fi

# 3. PM2 Process Manager
if ! command -v pm2 &> /dev/null; then
    echo "📦 [3/6] Installing PM2 process manager globally..."
    sudo npm install -g pm2
else
    echo "✅ [3/6] PM2 is already installed: $(pm2 -v)"
fi

# 4. Project Node Dependencies
echo "📦 [4/6] Installing Node.js dependencies..."
npm install

# 5. Meta MMS, Speech Recognition & Universal Converter Python Engines
echo "📦 [5/6] Installing torch, torchaudio, uroman, faster-whisper & converter libraries..."
python3 -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --break-system-packages || pip3 install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
python3 -m pip install uroman faster-whisper pytubefix --break-system-packages || pip3 install uroman faster-whisper pytubefix
python3 -m pip install pymupdf python-docx reportlab openpyxl python-pptx pillow pillow-heif striprtf beautifulsoup4 pdf2docx odfpy --break-system-packages || pip3 install pymupdf python-docx reportlab openpyxl python-pptx pillow pillow-heif striprtf beautifulsoup4 pdf2docx odfpy
sudo apt install -y fonts-noto-core fonts-lklug-sinhala || true

echo "📥 [5.1] Pre-downloading Meta MMS & Speech Recognition Neural Models..."
if [ -f "download_models.py" ]; then
    python3 download_models.py
fi

# 6. Optional UFW Firewall Port Opening (Port 6039)
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "🛡️ [6/6] Allowing Port 6039 in UFW Firewall..."
        sudo ufw allow 6039/tcp
    else
        echo "🛡️ [6/6] UFW firewall is inactive, Port 6039 is open."
    fi
fi

echo "=========================================================="
echo "🎉 CapZone Studio VPS Setup Complete!"
echo "=========================================================="
echo ""
echo "▶️ To start the server in background (Production PM2):"
echo "   npm run daemon"
echo ""
echo "📊 To view live logs:"
echo "   pm2 logs capzone"
echo ""
echo "🔄 To restart the server:"
echo "   npm run restart"
echo ""
echo "🛑 To stop the server:"
echo "   npm run stop"
echo ""
echo "⚡ To auto-restart on VPS reboot:"
echo "   pm2 startup && pm2 save"
echo "=========================================================="
