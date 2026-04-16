/**
 * Cookie Exporter Pro+ - Popup Script
 * Optimized for security and performance
 */

// ============================================================================
// SECURITY: API Compatibility Wrapper (defensive coding)
// ============================================================================
const API = Object.freeze({
  runtime: browser.runtime || chrome.runtime,
  storage: browser.storage?.local || chrome.storage.local,
  i18n: browser.i18n || chrome.i18n
});

// ============================================================================
// PERFORMANCE: Caching for i18n messages
// ============================================================================
const i18nCache = new Map();

function i18n(key, substitutions = []) {
  // Cache hit
  if (i18nCache.has(key)) {
    let msg = i18nCache.get(key);
    if (substitutions.length > 0) {
      substitutions.forEach((sub, i) => {
        msg = msg.replace(new RegExp(`\\$${i + 1}`, 'g'), sub);
      });
    }
    return msg;
  }
  
  // Cache miss - fetch and cache
  try {
    const message = API.i18n.getMessage(key, substitutions);
    const result = message || key;
    i18nCache.set(key, result);
    return result;
  } catch (e) {
    console.warn('i18n error:', key);
    return key;
  }
}

// Pre-warm cache on load
function warmI18nCache() {
  const keys = [
    'tab_manual', 'tab_auto', 'tab_settings',
    'status_settingsLoaded', 'status_success', 'status_error',
    'status_inactive', 'status_never', 'status_copied',
    'confirm_resetAll', 'error_loadSettings'
  ];
  keys.forEach(key => i18n(key));
}

// ============================================================================
// PERFORMANCE: DOM Query Caching
// ============================================================================
const DOM = Object.freeze({
  get: (id) => document.getElementById(id),
  query: (selector) => document.querySelector(selector),
  queryAll: (selector) => document.querySelectorAll(selector)
});

// Cache frequently accessed elements
const elements = {};

function cacheElements() {
  // Tabs
  elements.tabs = DOM.queryAll('.tab');
  elements.tabContents = DOM.queryAll('.tab-content');
  
  // Status
  elements.statusMessage = DOM.get('statusMessage');
  
  // Quick / Clipboard Mode
  elements.quickDomainFilter = DOM.get('quickDomainFilter');
  elements.quickFormat = DOM.get('quickFormat');
  elements.getCookiesQuickBtn = DOM.get('getCookiesQuick');
  elements.quickCopyJsonBtn = DOM.get('quickCopyJson');
  elements.quickCopyNetscapeBtn = DOM.get('quickCopyNetscape');
  elements.importFromClipboardBtn = DOM.get('importFromClipboard');
  elements.clipboardWatch = DOM.get('clipboardWatch');
  elements.importMode = DOM.get('importMode');
  elements.quickResultArea = DOM.get('quickResultArea');
  elements.quickResultText = DOM.get('quickResultText');
  
  // Manual Export
  elements.domainFilter = DOM.get('domainFilter');
  elements.cookieType = DOM.get('cookieType');
  elements.getCookiesBtn = DOM.get('getCookies');
  elements.copyBtn = DOM.get('copyToClipboard');
  elements.saveBtn = DOM.get('saveToFile');
  elements.sendBtn = DOM.get('sendToServer');
  elements.resultArea = DOM.get('resultArea');
  elements.resultText = DOM.get('resultText');
  elements.cookieCount = DOM.get('cookieCount');
  elements.exportFormatRadios = DOM.queryAll('input[name="exportFormat"]');
  
  // Automation
  elements.enableAutoExport = DOM.get('enableAutoExport');
  elements.autoSettings = DOM.get('autoSettings');
  elements.autoTrigger = DOM.get('autoTrigger');
  elements.scheduleSettings = DOM.get('scheduleSettings');
  elements.intervalSettings = DOM.get('intervalSettings');
  elements.scheduleTime = DOM.get('scheduleTime');
  elements.intervalMinutes = DOM.get('intervalMinutes');
  elements.autoAction = DOM.get('autoAction');
  elements.serverUrl = DOM.get('serverUrl');
  elements.autoDomainFilter = DOM.get('autoDomainFilter');
  elements.saveAutoSettingsBtn = DOM.get('saveAutoSettings');
  elements.testAutoExportBtn = DOM.get('testAutoExport');
  elements.autoStatus = DOM.get('autoStatus');
  elements.lastRun = DOM.get('lastRun');
  
  // Settings
  elements.languageSelect = DOM.get('languageSelect');
  elements.saveFolder = DOM.get('saveFolder');
  elements.filenamePattern = DOM.get('filenamePattern');
  elements.addTimestamp = DOM.get('addTimestamp');
  elements.compressFiles = DOM.get('compressFiles');
  elements.saveAllSettingsBtn = DOM.get('saveAllSettings');
  elements.exportSettingsBtn = DOM.get('exportSettings');
  elements.importSettingsBtn = DOM.get('importSettings');
  elements.resetAllBtn = DOM.get('resetAll');
}

function translatePage() {
  // PERFORMANCE: Batch DOM updates using DocumentFragment or single pass
  DOM.queryAll('[data-i18n]').forEach(el => {
    el.textContent = i18n(el.getAttribute('data-i18n'));
  });
  
  DOM.queryAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = i18n(el.getAttribute('data-i18n-placeholder'));
  });
}

// ============================================================================
// SECURITY: Input Validation & Sanitization
// ============================================================================
const Validator = {
  // Sanitize domain filter - prevent XSS
  sanitizeDomain(domain) {
    if (!domain || typeof domain !== 'string') return '';
    return domain.trim().replace(/[<>'";&]/g, '').slice(0, 500);
  },
  
  // Validate filename pattern
  validateFilename(pattern) {
    if (!pattern || typeof pattern !== 'string') return '{date}_{time}';
    // Only allow safe characters
    return pattern.replace(/[<>:"/\\|?*]/g, '_').slice(0, 200);
  },
  
  // Validate URL
  validateUrl(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      // Only allow http/https
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch (e) {}
    return null;
  },
  
  // Validate number in range
  validateNumber(value, min, max, defaultVal) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(max, num));
  }
};

// ============================================================================
// PERFORMANCE: Debounce Utility
// ============================================================================
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const state = Object.freeze({
  cookies: [],
  format: 'json',
  settings: {}
});

// Mutable state (carefully controlled)
let currentCookies = [];
let currentFormat = 'json';
let settings = {};
let statusTimeout = null;

// ============================================================================
// UI FUNCTIONS
// ============================================================================
function showStatus(message, type, timeout = 3000) {
  // Clear previous timeout
  if (statusTimeout) clearTimeout(statusTimeout);
  
  const el = elements.statusMessage;
  el.textContent = message;
  el.className = `status ${type}`;
  el.style.display = 'block';
  
  if (timeout > 0) {
    statusTimeout = setTimeout(() => {
      el.style.display = 'none';
    }, timeout);
  }
}

function setRadioValue(name, value) {
  DOM.queryAll(`input[name="${name}"]`).forEach(radio => {
    radio.checked = (radio.value === value);
  });
}

// Toggle functions with early returns
function toggleAutoSettings() {
  if (elements.autoSettings) {
    elements.autoSettings.classList.toggle('hidden', !elements.enableAutoExport.checked);
  }
}

function updateTriggerSettings() {
  const trigger = elements.autoTrigger?.value;
  if (elements.scheduleSettings) {
    elements.scheduleSettings.classList.toggle('hidden', trigger !== 'schedule');
  }
  if (elements.intervalSettings) {
    elements.intervalSettings.classList.toggle('hidden', trigger !== 'interval');
  }
}

// ============================================================================
// COOKIE EXPORT FUNCTIONS
// ============================================================================
function displayCookies(cookies) {
  if (currentFormat === 'netscape') {
    elements.resultText.value = convertToNetscape(cookies);
  } else {
    elements.resultText.value = JSON.stringify({
      metadata: {
        exportedAt: new Date().toISOString(),
        browser: navigator.userAgent,
        domainFilter: elements.domainFilter?.value || 'all',
        cookieType: elements.cookieType?.value || 'all',
        count: cookies.length,
        format: 'json'
      },
      cookies: cookies
    }, null, 2);
  }
  
  if (elements.cookieCount) elements.cookieCount.textContent = cookies.length;
  if (elements.resultArea) elements.resultArea.style.display = 'block';
  
  // Enable buttons
  elements.copyBtn.disabled = false;
  elements.saveBtn.disabled = false;
  elements.sendBtn.disabled = false;
}

function convertToNetscape(cookies) {
  // PERFORMANCE: Use array join instead of string concatenation
  const lines = [
    '# Netscape HTTP Cookie File',
    '# http://curl.haxx.se/rfc/cookie_spec.html',
    '# Generated by Cookie Exporter Pro',
    '# Domain\tHttpOnly\tPath\tSecure\tExpiration\tName\tValue',
    ''
  ];
  
  const now = Math.floor(Date.now() / 1000) + 86400;
  
  for (const cookie of cookies) {
    lines.push([
      cookie.domain || '',
      cookie.httpOnly ? 'TRUE' : 'FALSE',
      cookie.path || '/',
      cookie.secure ? 'TRUE' : 'FALSE',
      cookie.expirationDate ? Math.floor(cookie.expirationDate) : now,
      cookie.name || '',
      cookie.value || ''
    ].join('\t'));
  }
  
  return lines.join('\n');
}

function generateFilename() {
  let filename = Validator.validateFilename(
    elements.filenamePattern?.value || '{date}_{time}'
  );
  const now = new Date();
  
  filename = filename
    .replace(/{date}/g, now.toISOString().slice(0, 10))
    .replace(/{time}/g, now.toTimeString().slice(0, 8).replace(/:/g, '-'))
    .replace(/{domain}/g, Validator.sanitizeDomain(elements.domainFilter?.value) || 'all')
    .replace(/{count}/g, currentCookies.length);
  
  return filename + (currentFormat === 'json' ? '.json' : '.txt');
}

// ============================================================================
// QUICK / CLIPBOARD MODE FUNCTIONS
// ============================================================================

// Format detection for import
function detectFormat(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  
  // Try JSON (array of cookies or {cookies: [...]})
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch (e) {}
  }
  
  // Netscape format
  if (trimmed.includes('# Netscape HTTP Cookie File') || 
      trimmed.includes('# HTTP Cookie File')) {
    return 'netscape';
  }
  
  // cURL command
  if (trimmed.includes('curl') && 
      (trimmed.includes('--cookie') || trimmed.includes('-b '))) {
    return 'curl';
  }
  
  return null;
}

// Parse cookies from different formats
function parseCookies(text, format) {
  try {
    switch (format) {
      case 'json':
        const data = JSON.parse(text);
        // Handle {cookies: [...]} or plain array
        return Array.isArray(data) ? data : (data.cookies || []);
        
      case 'netscape':
        return parseNetscapeCookies(text);
        
      case 'curl':
        return parseCurlCookies(text);
        
      default:
        return [];
    }
  } catch (e) {
    console.error('Parse error:', e);
    return [];
  }
}

function parseNetscapeCookies(text) {
  const cookies = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) continue;
    
    const parts = line.split('\t');
    if (parts.length >= 7) {
      cookies.push({
        domain: parts[0],
        httpOnly: parts[1] === 'TRUE',
        path: parts[2],
        secure: parts[3] === 'TRUE',
        expirationDate: parseInt(parts[4], 10) || null,
        name: parts[5],
        value: parts[6]
      });
    }
  }
  return cookies;
}

function parseCurlCookies(text) {
  const cookies = [];
  
  // Handle --cookie "name=value; name2=value2" format
  const cookieStringRegex = /--cookie\s+["']([^"']+)["']/g;
  let match;
  
  while ((match = cookieStringRegex.exec(text)) !== null) {
    const pairs = match[1].split(';').map(s => s.trim());
    for (const pair of pairs) {
      const [name, ...valueParts] = pair.split('=');
      if (name && valueParts.length > 0) {
        cookies.push({
          domain: '',
          httpOnly: false,
          path: '/',
          secure: false,
          expirationDate: null,
          name: name.trim(),
          value: valueParts.join('=').trim()
        });
      }
    }
  }
  
  // Handle -b "name=value" or -b name=value format
  const bareRegex = /-b\s+(["']?)([^"'=\s]+)=([^"';\s]+)\1/g;
  while ((match = bareRegex.exec(text)) !== null) {
    cookies.push({
      domain: '',
      httpOnly: false,
      path: '/',
      secure: false,
      expirationDate: null,
      name: match[2],
      value: match[3]
    });
  }
  
  return cookies;
}

// Generate cURL command
function generateCurlCommand(cookies) {
  const parts = [];
  for (const cookie of cookies) {
    parts.push(`--cookie "${cookie.name}=${cookie.value}"`);
  }
  return `curl ${parts.join(' ')} "URL"`;
}

// Quick get cookies and copy to clipboard
async function quickGetAndCopy() {
  try {
    showStatus(i18n('status_gettingCookies'), 'info');
    
    const filter = {};
    const domainValue = elements.quickDomainFilter?.value;
    if (domainValue) {
      const sanitized = Validator.sanitizeDomain(domainValue);
      if (sanitized) filter.domain = sanitized;
    }
    
    const format = elements.quickFormat?.value || 'json';
    
    const response = await API.runtime.sendMessage({
      action: 'getCookies',
      filter: filter,
      cookieType: 'all',
      format: format
    });
    
    if (response?.success) {
      currentCookies = response.cookies || [];
      let text;
      
      switch (format) {
        case 'netscape':
          text = convertToNetscape(currentCookies);
          break;
        case 'curl':
          text = generateCurlCommand(currentCookies);
          break;
        default:
          text = JSON.stringify(currentCookies, null, 2);
      }
      
      await navigator.clipboard.writeText(text);
      
      // Show preview
      if (elements.quickResultArea && elements.quickResultText) {
        elements.quickResultText.textContent = text.slice(0, 500) + (text.length > 500 ? '\n...' : '');
        elements.quickResultArea.classList.remove('hidden');
      }
      
      showStatus(i18n('status_copied_to_clipboard', [currentCookies.length]), 'success');
    } else {
      showStatus(i18n('status_saveError', [response?.error || 'Unknown error']), 'error');
    }
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

// Quick copy as JSON
async function quickCopyAsJson() {
  if (currentCookies.length === 0) {
    showStatus(i18n('error_no_cookies'), 'error');
    return;
  }
  
  try {
    const text = JSON.stringify(currentCookies, null, 2);
    await navigator.clipboard.writeText(text);
    showStatus(i18n('status_copied'), 'success');
  } catch (error) {
    showStatus(i18n('error_copy', [error.message]), 'error');
  }
}

// Quick copy as Netscape
async function quickCopyAsNetscape() {
  if (currentCookies.length === 0) {
    showStatus(i18n('error_no_cookies'), 'error');
    return;
  }
  
  try {
    const text = convertToNetscape(currentCookies);
    await navigator.clipboard.writeText(text);
    showStatus(i18n('status_copied'), 'success');
  } catch (error) {
    showStatus(i18n('error_copy', [error.message]), 'error');
  }
}

// Import cookies from clipboard
async function importFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const format = detectFormat(text);
    
    if (!format) {
      showStatus(i18n('error_invalid_format'), 'error');
      return;
    }
    
    const cookies = parseCookies(text, format);
    
    if (cookies.length === 0) {
      showStatus(i18n('error_no_cookies_found'), 'error');
      return;
    }
    
    const mode = elements.importMode?.value || 'merge';
    const result = await API.runtime.sendMessage({
      action: 'importCookies',
      cookies: cookies,
      mode: mode
    });
    
    if (result?.success) {
      showStatus(i18n('status_imported', [cookies.length]), 'success');
    } else {
      showStatus(i18n('status_saveError', [result?.error || 'Import failed']), 'error');
    }
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

// Handle paste event for auto-import
function handlePasteEvent(e) {
  const clipboardWatch = elements.clipboardWatch?.checked;
  if (!clipboardWatch) return;
  
  // Skip if already in quick tab or handling
  if (e.target.closest('#quick-tab')) return;
  
  const text = e.clipboardData?.getData('text');
  if (!text) return;
  
  const format = detectFormat(text);
  if (!format) return;
  
  // Show notification instead of auto-import (safer)
  showStatus(i18n('status_clipboard_detected'), 'info', 5000);
}

// ============================================================================
// DATA LOADING
// ============================================================================
async function loadLastExportInfo() {
  try {
    const result = await API.storage.get('lastExport');
    const lastExport = result?.lastExport || {};
    
    if (lastExport.time) {
      elements.lastRun.textContent = new Date(lastExport.time).toLocaleString();
      elements.autoStatus.textContent = lastExport.success 
        ? i18n('status_success') 
        : i18n('status_error');
      elements.autoStatus.style.color = lastExport.success ? 'green' : 'red';
    } else {
      elements.autoStatus.textContent = i18n('status_inactive');
      elements.lastRun.textContent = i18n('status_never');
      elements.autoStatus.style.color = '';
    }
  } catch (error) {
    console.error('Error loading last export info:', error);
  }
}

async function loadSettings() {
  try {
    const result = await API.storage.get(['settings', 'autoSettings', 'lastExport', 'language']);
    
    settings = result.settings || {};
    const auto = result.autoSettings || {};
    
    // Apply settings with null checks
    if (elements.saveFolder && settings.saveFolder) {
      elements.saveFolder.value = settings.saveFolder;
    }
    if (elements.filenamePattern && settings.filenamePattern) {
      elements.filenamePattern.value = settings.filenamePattern;
    }
    if (elements.addTimestamp !== undefined && settings.addTimestamp !== undefined) {
      elements.addTimestamp.checked = settings.addTimestamp;
    }
    if (elements.compressFiles && settings.compressFiles !== undefined) {
      elements.compressFiles.checked = settings.compressFiles;
    }
    
    // Automation settings
    if (elements.enableAutoExport && auto.enabled !== undefined) {
      elements.enableAutoExport.checked = auto.enabled;
    }
    if (elements.autoTrigger && auto.trigger) {
      elements.autoTrigger.value = auto.trigger;
    }
    if (elements.scheduleTime && auto.scheduleTime) {
      elements.scheduleTime.value = auto.scheduleTime;
    }
    if (elements.intervalMinutes && auto.intervalMinutes) {
      elements.intervalMinutes.value = auto.intervalMinutes;
    }
    if (elements.autoAction && auto.action) {
      elements.autoAction.value = auto.action;
    }
    if (auto.format) {
      setRadioValue('autoFormat', auto.format);
    }
    if (elements.serverUrl && auto.serverUrl) {
      elements.serverUrl.value = auto.serverUrl;
    }
    if (elements.autoDomainFilter && auto.domainFilter) {
      elements.autoDomainFilter.value = auto.domainFilter;
    }
    
    // Load last export info with i18n
    await loadLastExportInfo();
    
    showStatus(i18n('status_settingsLoaded'), 'success', 2000);
  } catch (error) {
    console.error(i18n('error_loadSettings'), error);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
async function handleGetCookies() {
  try {
    showStatus(i18n('status_gettingCookies'), 'info');
    
    const filter = {};
    const domainValue = elements.domainFilter?.value;
    if (domainValue) {
      const sanitized = Validator.sanitizeDomain(domainValue);
      if (sanitized) filter.domain = sanitized;
    }
    
    const format = DOM.query('input[name="exportFormat"]:checked')?.value || 'json';
    
    const response = await API.runtime.sendMessage({
      action: 'getCookies',
      filter: filter,
      cookieType: elements.cookieType?.value || 'all',
      format: format
    });
    
    if (response?.success) {
      currentCookies = response.cookies || [];
      currentFormat = format;
      displayCookies(currentCookies);
      showStatus(i18n('status_cookiesReceived', [currentCookies.length]), 'success');
    } else {
      showStatus(i18n('status_saveError', [response?.error || 'Unknown error']), 'error');
    }
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

async function handleCopyToClipboard() {
  try {
    await navigator.clipboard.writeText(elements.resultText?.value || '');
    showStatus(i18n('status_copied'), 'success');
  } catch (error) {
    showStatus(i18n('error_copy', [error.message]), 'error');
  }
}

async function handleSaveToFile() {
  try {
    const filename = generateFilename();
    const content = elements.resultText?.value || '';
    
    await API.runtime.sendMessage({
      action: 'saveToFile',
      filename: filename,
      content: content,
      format: currentFormat
    });
    
    showStatus(i18n('status_fileSaved', [filename]), 'success');
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

async function handleSendToServer() {
  try {
    showStatus(i18n('status_sendingToServer'), 'info');
    
    // SECURITY: Validate URL before sending
    const server = settings.serverUrl 
      ? Validator.validateUrl(settings.serverUrl)
      : null;
    
    if (!server) {
      showStatus(i18n('status_sendError', ['Invalid server URL']), 'error');
      return;
    }
    
    const response = await fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        format: currentFormat,
        count: currentCookies.length,
        data: currentFormat === 'json' 
          ? JSON.parse(elements.resultText?.value || '{}') 
          : elements.resultText?.value
      })
    });
    
    if (response.ok) {
      showStatus(i18n('status_sentToServer'), 'success');
    } else {
      showStatus(i18n('status_serverError', [response.status]), 'error');
    }
  } catch (error) {
    showStatus(i18n('status_sendError', [error.message]), 'error');
  }
}

async function saveAutoSettings() {
  try {
    const autoSettings = {
      enabled: elements.enableAutoExport?.checked || false,
      trigger: elements.autoTrigger?.value || 'startup',
      scheduleTime: elements.scheduleTime?.value || '09:00',
      intervalMinutes: Validator.validateNumber(
        elements.intervalMinutes?.value, 1, 1440, 60
      ),
      action: elements.autoAction?.value || 'save',
      format: DOM.query('input[name="autoFormat"]:checked')?.value || 'json',
      serverUrl: Validator.validateUrl(elements.serverUrl?.value) || '',
      domainFilter: Validator.sanitizeDomain(elements.autoDomainFilter?.value)
    };
    
    await API.storage.set({ autoSettings });
    await API.runtime.sendMessage({
      action: 'updateAutoSettings',
      settings: autoSettings
    });
    
    showStatus(i18n('status_autoSettingsSaved'), 'success');
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

async function testAutoExport() {
  try {
    showStatus(i18n('status_testRun'), 'info');
    
    const response = await API.runtime.sendMessage({ action: 'autoExport' });
    
    if (response?.success) {
      showStatus(i18n('status_testSuccess'), 'success');
    } else {
      showStatus(i18n('status_saveError', [response?.error || 'Unknown error']), 'error');
    }
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

async function saveAllSettings() {
  try {
    settings = {
      saveFolder: elements.saveFolder?.value || 'cookies_exports',
      filenamePattern: Validator.validateFilename(elements.filenamePattern?.value),
      addTimestamp: elements.addTimestamp?.checked ?? true,
      compressFiles: elements.compressFiles?.checked ?? false
    };
    
    await API.storage.set({ settings });
    showStatus(i18n('status_allSettingsSaved'), 'success');
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

async function exportSettings() {
  try {
    const allSettings = await API.storage.get(null);
    const dataStr = JSON.stringify(allSettings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookie_exporter_settings_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus(i18n('status_settingsExported'), 'success');
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

// SECURITY: Safe import with validation
async function importSettings() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // SECURITY: Validate imported JSON structure
          const data = JSON.parse(e.target.result);
          
          // Basic structure validation
          if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid settings format');
          }
          
          await API.storage.clear();
          await API.storage.set(data);
          await loadSettings();
          showStatus(i18n('status_settingsImported'), 'success');
        } catch (error) {
          showStatus(i18n('error_import', [error.message]), 'error');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  } catch (error) {
    showStatus(i18n('status_saveError', [error.message]), 'error');
  }
}

async function resetAll() {
  // SECURITY: Use custom confirm to avoid browser native
  if (confirm(i18n('confirm_resetAll'))) {
    try {
      await API.storage.clear();
      await loadSettings();
      showStatus(i18n('status_resetConfirmed'), 'success');
    } catch (error) {
      showStatus(i18n('status_saveError', [error.message]), 'error');
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================
async function initI18n() {
  try {
    const result = await API.storage.get('language');
    const savedLang = result?.language || 'en';
    
    if (elements.languageSelect) {
      elements.languageSelect.value = savedLang;
    }
    
    warmI18nCache();
    translatePage();
  } catch (error) {
    console.error('Error initializing i18n:', error);
    translatePage();
  }
}

function init() {
  // Cache DOM elements first
  cacheElements();
  
  // Initialize i18n
  initI18n();
  
  // Load saved settings
  loadSettings();
  
  // Tab switching - use event delegation for better performance
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      DOM.get(`${tabId}-tab`)?.classList.add('active');
    });
  });
  
  // Quick / Clipboard Mode event listeners
  elements.getCookiesQuickBtn?.addEventListener('click', quickGetAndCopy);
  elements.quickCopyJsonBtn?.addEventListener('click', quickCopyAsJson);
  elements.quickCopyNetscapeBtn?.addEventListener('click', quickCopyAsNetscape);
  elements.importFromClipboardBtn?.addEventListener('click', importFromClipboard);
  
  // Paste event for clipboard detection (works across all tabs)
  document.addEventListener('paste', handlePasteEvent);
  
  // Manual Export event listeners
  elements.getCookiesBtn?.addEventListener('click', handleGetCookies);
  elements.copyBtn?.addEventListener('click', handleCopyToClipboard);
  elements.saveBtn?.addEventListener('click', handleSaveToFile);
  elements.sendBtn?.addEventListener('click', handleSendToServer);
  
  elements.enableAutoExport?.addEventListener('change', toggleAutoSettings);
  elements.autoTrigger?.addEventListener('change', updateTriggerSettings);
  elements.saveAutoSettingsBtn?.addEventListener('click', saveAutoSettings);
  elements.testAutoExportBtn?.addEventListener('click', testAutoExport);
  
  // Language selector with debounce
  elements.languageSelect?.addEventListener('change', debounce(async (e) => {
    const newLang = e.target.value;
    await API.storage.set({ language: newLang });
    translatePage();
    await loadLastExportInfo();
  }, 100));
  
  elements.saveAllSettingsBtn?.addEventListener('click', saveAllSettings);
  elements.exportSettingsBtn?.addEventListener('click', exportSettings);
  elements.importSettingsBtn?.addEventListener('click', importSettings);
  elements.resetAllBtn?.addEventListener('click', resetAll);
  
  // Initialize UI state
  updateTriggerSettings();
  toggleAutoSettings();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);