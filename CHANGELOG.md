# Changelog

All notable changes to this fork are documented in this file.

## [1.3.0] - 2025-04-17

### Added
- **Quick/Clipboard Mode** - New dedicated tab for fast operations
  - One-click "Get & Copy to Clipboard" button
  - Support for JSON, Netscape, and cURL formats
  - Quick copy buttons for JSON and Netscape formats
- **Import from Clipboard** - Import cookies from clipboard
  - Auto-detect format (JSON, Netscape, cURL)
  - Import modes: Merge, Replace, Update
  - Paste detection with notification
- **Background Import Handler** - Handle cookie imports in background script
- **Format Detection** - Automatically detect cookie format from clipboard

### Changed
- **Version Bump**: Updated to version 1.3
- **Tab Order**: Quick tab is now first tab

---

## [1.2.0] - 2025-04-17

### Added
- **Multilingual Support**: Added support for English, Russian (Русский), and Thai (ไทย) languages
- **Language Switcher**: Dropdown in Settings tab to switch languages instantly
- **Chrome Version**: Full Chrome/Chromium support with Manifest V3

### Changed
- **Version Bump**: Updated to version 1.2
- **i18n System**: Implemented browser.i18n API with message files

### Security (v1.2)
- Input validation with `Validator` object
- URL validation (only http/https allowed)
- Domain sanitization to prevent XSS
- Content size limits (max 10MB, 10,000 cookies)
- Filename sanitization
- Import JSON structure validation

### Performance (v1.2)
- DOM element caching (`elements` object)
- i18n message caching (`i18nCache` Map)
- Pre-warming common i18n keys
- Array join instead of string concatenation
- Debounced language selector (100ms)
- Optional chaining throughout

---

## [1.1.0] - Original Release

### Original Developer: D3x

### Features
- Manual cookie export with domain filter
- Cookie type filtering (all/session/persistent)
- JSON and Netscape format export
- Automatic export (startup/schedule/interval)
- Save to file / copy to clipboard / send to server
- Settings import/export
- Settings reset

### Technical Details
- Firefox WebExtension (Manifest V2)
- Uses browser.storage.local for settings
- Background script for automation
- Alarms API for scheduling
- Downloads API for file saving

---

## Notes

- This fork maintains backward compatibility with the original extension
- Both Firefox (MV2) and Chrome (MV3) versions are provided
- All original features are preserved and enhanced
- Security and performance improvements are applied to both versions
- Quick/Clipboard Mode enables seamless integration with CLI/AI tools