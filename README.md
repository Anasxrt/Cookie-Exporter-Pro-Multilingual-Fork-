# Cookie Exporter Pro+ (Multilingual Fork)

<p align="center">
  <img src="firefox/icon48.png" alt="Cookie Exporter Pro+ Icon" width="48" height="48">
</p>

> Export browser cookies in JSON or Netscape format for backup, transfer, or automation workflows.

[![Mozilla Add-on](https://img.shields.io/amo/v/cookieexporterpro)](https://addons.mozilla.org/en-US/firefox/addon/cookieexporterpro/)
[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](https://www.mozilla.org/MPL/2.0/)

## ⭐ Features

- **Quick Mode** - One-click export to clipboard (JSON/Netscape/cURL)
- **Manual Export** - Export cookies on demand with domain filtering
- **Multiple Formats** - Export as JSON, Netscape, or cURL commands
- **Import from Clipboard** - Import cookies from clipboard (auto-detect format)
- **Automation** - Schedule automatic exports (on startup, schedule, or intervals)
- **Multiple Output Options** - Save to file, copy to clipboard, or send to server
- **Multilingual UI** - English, Russian (Русский), and Thai (ไทย)
- **Security Enhanced** - Input validation, URL sanitization, content size limits
- **Performance Optimized** - DOM caching, i18n caching, debouncing

## 📋 Supported Browsers

| Browser | Manifest Version | Directory |
|---------|-----------------|-----------|
| Firefox | MV2 | `firefox/` |
| Chrome/Chromium | MV3 | `chrome/` |

## 🚀 Installation

### Download Release

Download the latest version from the [GitHub Releases](https://github.com/Anasxrt/Cookie-Exporter-Pro-Multilingual-Fork-/releases/tag/v1.3.0):

- **Firefox:** `cookie-exporter-pro-firefox-v1.3.zip` → Extract to get `.xpi` file
- **Chrome:** `cookie-exporter-pro-chrome-v1.3.zip` → Extract to get folder

### Firefox (Permanent)
1. Download `cookie-exporter-pro-firefox-v1.3.zip` from [releases](https://github.com/Anasxrt/Cookie-Exporter-Pro-Multilingual-Fork-/releases/tag/v1.3.0)
2. Rename the extracted file from `.zip` to `.xpi`
3. Open `about:addons` → "Extensions"
4. Click the gear icon → "Install Add-on From File"
5. Select the `.xpi` file

### Firefox (Temporary - for testing)
1. Open `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select any file in the `firefox/` folder

### Chrome
1. Download `cookie-exporter-pro-chrome-v1.3.zip` from [releases](https://github.com/Anasxrt/Cookie-Exporter-Pro-Multilingual-Fork-/releases/tag/v1.3.0)
2. Extract the zip file
3. Open `chrome://extensions`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted `chrome/` folder

## 📖 Usage

### Quick Tab (Recommended for CLI/AI)
1. Enter domain filter (optional)
2. Select format (JSON/Netscape/cURL)
3. Click "Get & Copy to Clipboard"
4. Paste directly into your CLI/AI tool

### Quick Copy Buttons
- **Copy JSON** - Copy all cookies as JSON array
- **Copy Netscape** - Copy in Netscape format (for wget, curl, aria2)

### Import from Clipboard
1. Copy cookie data from any source
2. Click "Import Cookies from Clipboard"
3. Choose import mode (Merge/Replace/Update)

### Manual Export Tab
1. Enter domain filter (optional)
2. Select cookie type (all/session/persistent)
3. Choose export format (JSON/Netscape)
4. Click "Get Cookies"
5. Use buttons: Copy | Save File | Send to Server

### Automation Tab
1. Enable "Automatic export"
2. Configure trigger (startup/schedule/interval)
3. Set action (save to file/send to server/both)
4. Click "Save Settings"

### Settings Tab
- Customize save folder and filename pattern
- Switch language (EN/RU/TH)
- Export/Import/Reset settings

## 🔧 Filename Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{date}` | Export date | 2025-01-15 |
| `{time}` | Export time | 09-30-00 |
| `{domain}` | Filtered domain | example.com |
| `{count}` | Cookie count | 42 |

Example: `cookies_{date}_{time}.json`

## 🤖 CLI/AI Integration

Quick mode is designed for seamless integration with CLI tools and AI agents:

```bash
# Copy cookies in terminal
# Use cURL format for direct use:
curl --cookie "session=abc123" "https://example.com"

# Use with Puppeteer/Playwright
# Export as JSON and pass to browser automation
```

## 📜 License

This extension is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.

See [LICENSE](LICENSE) or https://www.mozilla.org/MPL/2.0/

## 👥 Credits

### Original Developer
- **D3x** - Original author of Cookie Exporter Pro+

### Fork & Enhancement
- **Montri Udomariyah** - Multilingual support (EN/RU/TH), Chrome MV3 port, security & performance improvements, Quick/Clipboard mode

---

<p align="center">
  Made with ❤️ for the open source community
</p>