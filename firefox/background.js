/**
 * Cookie Exporter Pro+ - Background Script (Firefox)
 * Security and Performance Optimized
 */

'use strict';

console.log('[CookieExporterPro] Background script loaded');

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const CONFIG = Object.freeze({
  ALARM_NAME: 'autoCookieExport',
  MAX_COOKIES: 10000,
  MAX_CONTENT_SIZE: 10 * 1024 * 1024, // 10MB
  EXPORT_FOLDER: 'cookies_exports'
});

// ============================================================================
// STATE
// ============================================================================
let autoSettings = null;

// ============================================================================
// SECURITY: Input Validation
// ============================================================================
const Validator = {
  isValidDomain(domain) {
    if (!domain || typeof domain !== 'string') return false;
    // Basic domain validation - allow empty or proper domain pattern
    if (domain.length > 253) return false;
    return /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/.test(domain) || domain === '';
  },
  
  isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  },
  
  sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') return 'cookies_export';
    return filename.replace(/[<>:"|?*]/g, '_').slice(0, 200);
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================
async function init() {
  try {
    const result = await browser.storage.local.get('autoSettings');
    autoSettings = result.autoSettings;
    
    if (autoSettings?.enabled) {
      setupAutoExport();
    }
    
    console.log('Cookie Exporter Pro+ initialized (Firefox)');
  } catch (error) {
    console.error('Init error:', error);
  }
}

// ============================================================================
// AUTO EXPORT SETUP
// ============================================================================
function setupAutoExport() {
  // Clear previous alarms
  browser.alarms.clear(CONFIG.ALARM_NAME);
  
  if (!autoSettings?.enabled) {
    return;
  }
  
  const { trigger, scheduleTime, intervalMinutes } = autoSettings;
  
  switch (trigger) {
    case 'schedule':
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const delayInMinutes = Math.round((scheduledTime - now) / 60000);
        
        browser.alarms.create(CONFIG.ALARM_NAME, {
          delayInMinutes: Math.max(1, delayInMinutes),
          periodInMinutes: 24 * 60
        });
      }
      break;
      
    case 'interval':
      if (intervalMinutes && intervalMinutes >= 1) {
        browser.alarms.create(CONFIG.ALARM_NAME, {
          periodInMinutes: Math.min(intervalMinutes, 1440)
        });
      }
      break;
      
    case 'startup':
    case 'browserClose':
    default:
      // Handled by respective event listeners
      break;
  }
}

// ============================================================================
// ALARM HANDLER
// ============================================================================
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CONFIG.ALARM_NAME) {
    await performAutoExport();
  }
});

// ============================================================================
// BROWSER EVENT HANDLERS
// ============================================================================
browser.runtime.onStartup.addListener(init);
browser.runtime.onInstalled.addListener(init);

// Firefox-specific: onSuspend for browser close
browser.runtime.onSuspend.addListener(async () => {
  if (autoSettings?.enabled && autoSettings.trigger === 'browserClose') {
    await performAutoExport();
  }
});

// ============================================================================
// CORE EXPORT FUNCTION
// ============================================================================
async function performAutoExport() {
  // SECURITY: Load fresh settings to ensure validity
  try {
    const result = await browser.storage.local.get('autoSettings');
    autoSettings = result.autoSettings;
    
    if (!autoSettings?.enabled) {
      return { success: false, error: 'Auto export disabled' };
    }
    
    // Get cookies with validation
    const filter = {};
    if (autoSettings.domainFilter) {
      const sanitized = autoSettings.domainFilter.trim();
      if (Validator.isValidDomain(sanitized)) {
        filter.domain = sanitized;
      }
    }
    
    // SECURITY: Limit cookie count
    const allCookies = await browser.cookies.getAll(filter);
    const cookies = allCookies.slice(0, CONFIG.MAX_COOKIES);
    
    // Prepare content
    let content, filename, mimeType;
    
    if (autoSettings.format === 'netscape') {
      content = convertToNetscape(cookies);
      filename = `cookies_auto_${new Date().toISOString().slice(0, 10)}.txt`;
      mimeType = 'text/plain';
    } else {
      // SECURITY: Validate content size
      const jsonContent = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          trigger: autoSettings.trigger,
          domainFilter: autoSettings.domainFilter || 'all',
          count: cookies.length,
          format: 'json'
        },
        cookies: cookies
      }, null, 2);
      
      if (jsonContent.length > CONFIG.MAX_CONTENT_SIZE) {
        throw new Error('Content too large to export');
      }
      
      content = jsonContent;
      filename = `cookies_auto_${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = 'application/json';
    }
    
    // Execute actions
    const actions = (autoSettings.action || 'save').split(',');
    
    for (const action of actions) {
      switch (action.trim()) {
        case 'save':
          await saveCookieFile(content, filename, mimeType);
          break;
          
        case 'send':
          if (Validator.isValidUrl(autoSettings.serverUrl)) {
            await sendToServer(content, autoSettings.serverUrl, autoSettings.format);
          }
          break;
      }
    }
    
    // Save last export status
    await browser.storage.local.set({
      lastExport: {
        time: Date.now(),
        success: true,
        count: cookies.length
      }
    });
    
    console.log('Auto export completed');
    return { success: true, count: cookies.length };
    
  } catch (error) {
    console.error('Auto export error:', error);
    
    await browser.storage.local.set({
      lastExport: {
        time: Date.now(),
        success: false,
        error: error.message
      }
    });
    
    return { success: false, error: error.message };
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================
async function saveCookieFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  try {
    await browser.downloads.download({
      url: url,
      filename: `${CONFIG.EXPORT_FOLDER}/${Validator.sanitizeFilename(filename)}`,
      saveAs: false,
      conflictAction: 'uniquify'
    });
  finally {
    // SECURITY: Always revoke object URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function sendToServer(content, serverUrl, format) {
  // SECURITY: Validate URL before sending
  if (!Validator.isValidUrl(serverUrl)) {
    throw new Error('Invalid server URL');
  }
  
  const payload = format === 'json' 
    ? JSON.parse(content)
    : { data: content, format: 'netscape' };
  
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json().catch(() => ({}));
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================
function convertToNetscape(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# http://curl.haxx.se/rfc/cookie_spec.html',
    '# Auto-generated by Cookie Exporter Pro',
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

// ============================================================================
// MESSAGE HANDLER
// ============================================================================
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // SECURITY: Validate request structure
  if (!request || typeof request.action !== 'string') {
    sendResponse({ success: false, error: 'Invalid request' });
    return true;
  }
  
  switch (request.action) {
    case 'getCookies':
      handleGetCookies(request, sendResponse).catch(err => {
        console.error('[CookieExporterPro] getCookies error:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true;
      
    case 'saveToFile':
      handleSaveToFile(request, sendResponse).catch(err => {
        console.error('[CookieExporterPro] saveToFile error:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true;
      
    case 'updateAutoSettings':
      handleUpdateAutoSettings(request, sendResponse);
      return true;
      
    case 'autoExport':
      performAutoExport().then(sendResponse).catch(err => {
        console.error('[CookieExporterPro] autoExport error:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true;
      
    case 'importCookies':
      handleImportCookies(request, sendResponse).catch(err => {
        console.error('[CookieExporterPro] importCookies error:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return true;
  }
});

// ============================================================================
// REQUEST HANDLERS
// ============================================================================
async function handleGetCookies(request, sendResponse) {
  try {
    const filter = request.filter || {};
    
    // SECURITY: Validate filter
    if (filter.domain && !Validator.isValidDomain(filter.domain)) {
      throw new Error('Invalid domain filter');
    }
    
    let cookies = await browser.cookies.getAll(filter);
    
    // SECURITY: Limit results
    cookies = cookies.slice(0, CONFIG.MAX_COOKIES);
    
    // Filter by type
    if (request.cookieType === 'session') {
      cookies = cookies.filter(c => c.session);
    } else if (request.cookieType === 'persistent') {
      cookies = cookies.filter(c => !c.session);
    }
    
    sendResponse({ 
      success: true, 
      cookies: cookies,
      format: request.format 
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveToFile(request, sendResponse) {
  try {
    // SECURITY: Validate request
    if (!request.filename || !request.content) {
      throw new Error('Invalid save request');
    }
    
    const mimeType = request.format === 'json' ? 'application/json' : 'text/plain';
    await saveCookieFile(request.content, request.filename, mimeType);
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function handleUpdateAutoSettings(request, sendResponse) {
  try {
    // SECURITY: Validate settings
    if (!request.settings || typeof request.settings !== 'object') {
      throw new Error('Invalid settings');
    }
    
    autoSettings = request.settings;
    setupAutoExport();
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ============================================================================
// IMPORT HANDLER
// ============================================================================
async function handleImportCookies(request, sendResponse) {
  try {
    const { cookies, mode } = request;
    
    if (!Array.isArray(cookies) || cookies.length === 0) {
      throw new Error('Invalid cookies array');
    }
    
    // SECURITY: Validate and sanitize each cookie
    const validCookies = cookies.filter(c => c && c.name).map(c => ({
      url: c.url || getUrlFromDomain(c.domain),
      domain: c.domain || '',
      name: c.name,
      value: c.value || '',
      path: c.path || '/',
      secure: c.secure || false,
      httpOnly: c.httpOnly || false,
      expirationDate: c.expirationDate || null,
      session: c.session || false
    }));
    
    if (validCookies.length === 0) {
      throw new Error('No valid cookies to import');
    }
    
    // Get existing cookies if merging/updating
    let existingCookies = [];
    if (mode === 'merge' || mode === 'update') {
      try {
        existingCookies = await browser.cookies.getAll({});
      } catch (e) {
        existingCookies = [];
      }
    }
    
    // Clear existing if replace mode
    if (mode === 'replace') {
      for (const cookie of existingCookies) {
        try {
          await browser.cookies.remove({
            url: getUrlFromDomain(cookie.domain),
            name: cookie.name
          });
        } catch (e) {
          // Ignore individual removal errors
        }
      }
    }
    
    // Import new cookies
    let imported = 0;
    const duplicates = [];
    
    for (const cookie of validCookies) {
      // Check for duplicates in update mode
      if (mode === 'update') {
        const exists = existingCookies.find(
          c => c.name === cookie.name && c.domain === cookie.domain
        );
        if (exists) {
          // Remove existing first
          try {
            await browser.cookies.remove({
              url: cookie.url,
              name: cookie.name
            });
          } catch (e) {}
        }
      }
      
      try {
        await browser.cookies.set(cookie);
        imported++;
      } catch (e) {
        console.warn('Failed to import cookie:', cookie.name, e.message);
      }
    }
    
    sendResponse({ 
      success: true, 
      imported: imported,
      total: validCookies.length 
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Helper: Get URL from domain
function getUrlFromDomain(domain) {
  if (!domain) return 'http://localhost';
  // Handle domain starting with .
  const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
  return `https://${cleanDomain}`;
}