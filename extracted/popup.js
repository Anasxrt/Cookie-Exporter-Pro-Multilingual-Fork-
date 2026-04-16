// Internationalization helper functions
function i18n(key, substitutions = []) {
  try {
    const message = browser.i18n.getMessage(key, substitutions);
    return message || key;
  } catch (e) {
    console.warn('i18n error for key:', key);
    return key;
  }
}

function translatePage() {
  // Translate elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18n(key);
  });
  
  // Translate placeholders with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = i18n(key);
  });
}

async function initI18n() {
  // Load saved language preference
  try {
    const result = await browser.storage.local.get('language');
    const savedLang = result.language || 'en';
    
    // Set the language dropdown
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
      langSelect.value = savedLang;
    }
    
    // Translate page on load
    translatePage();
  } catch (error) {
    console.error('Error initializing i18n:', error);
    translatePage(); // Fallback to English
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize i18n first
  await initI18n();
  
  // Элементы интерфейса
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const statusMessage = document.getElementById('statusMessage');
  
  // Ручной экспорт
  const domainFilter = document.getElementById('domainFilter');
  const cookieType = document.getElementById('cookieType');
  const getCookiesBtn = document.getElementById('getCookies');
  const copyToClipboardBtn = document.getElementById('copyToClipboard');
  const saveToFileBtn = document.getElementById('saveToFile');
  const sendToServerBtn = document.getElementById('sendToServer');
  const resultArea = document.getElementById('resultArea');
  const resultText = document.getElementById('resultText');
  const cookieCount = document.getElementById('cookieCount');
  const exportFormatRadios = document.querySelectorAll('input[name="exportFormat"]');
  
  // Автоматизация
  const enableAutoExport = document.getElementById('enableAutoExport');
  const autoSettings = document.getElementById('autoSettings');
  const autoTrigger = document.getElementById('autoTrigger');
  const scheduleSettings = document.getElementById('scheduleSettings');
  const intervalSettings = document.getElementById('intervalSettings');
  const scheduleTime = document.getElementById('scheduleTime');
  const intervalMinutes = document.getElementById('intervalMinutes');
  const autoAction = document.getElementById('autoAction');
  const autoFormatRadios = document.querySelectorAll('input[name="autoFormat"]');
  const serverUrl = document.getElementById('serverUrl');
  const autoDomainFilter = document.getElementById('autoDomainFilter');
  const saveAutoSettingsBtn = document.getElementById('saveAutoSettings');
  const testAutoExportBtn = document.getElementById('testAutoExport');
  const autoStatus = document.getElementById('autoStatus');
  const lastRun = document.getElementById('lastRun');
  
  // Настройки
  const languageSelect = document.getElementById('languageSelect');
  const saveFolder = document.getElementById('saveFolder');
  const filenamePattern = document.getElementById('filenamePattern');
  const addTimestamp = document.getElementById('addTimestamp');
  const compressFiles = document.getElementById('compressFiles');
  const saveAllSettingsBtn = document.getElementById('saveAllSettings');
  const exportSettingsBtn = document.getElementById('exportSettings');
  const importSettingsBtn = document.getElementById('importSettings');
  const resetAllBtn = document.getElementById('resetAll');
  
  let currentCookies = [];
  let currentFormat = 'json';
  let settings = {};
  
  // Инициализация
  init();
  
  async function init() {
    // Загрузка настроек
    await loadSettings();
    
    // Табы
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });
    
    // Ручной экспорт
    getCookiesBtn.addEventListener('click', handleGetCookies);
    copyToClipboardBtn.addEventListener('click', handleCopyToClipboard);
    saveToFileBtn.addEventListener('click', handleSaveToFile);
    sendToServerBtn.addEventListener('click', handleSendToServer);
    
    exportFormatRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        currentFormat = e.target.value;
        if (currentCookies.length > 0) {
          displayCookies(currentCookies);
        }
      });
    });
    
    // Автоматизация
    enableAutoExport.addEventListener('change', toggleAutoSettings);
    autoTrigger.addEventListener('change', updateTriggerSettings);
    saveAutoSettingsBtn.addEventListener('click', saveAutoSettings);
    testAutoExportBtn.addEventListener('click', testAutoExport);
    
    // Настройки - Language selector
    languageSelect.addEventListener('change', async (e) => {
      const newLang = e.target.value;
      await browser.storage.local.set({ language: newLang });
      translatePage();
      // Re-display last run info with new language
      await loadLastExportInfo();
    });
    
    saveAllSettingsBtn.addEventListener('click', saveAllSettings);
    exportSettingsBtn.addEventListener('click', exportSettings);
    importSettingsBtn.addEventListener('click', importSettings);
    resetAllBtn.addEventListener('click', resetAll);
    
    // Инициализация значений
    updateTriggerSettings();
    toggleAutoSettings();
  }
  
  async function loadLastExportInfo() {
    try {
      const result = await browser.storage.local.get('lastExport');
      const lastExport = result.lastExport || {};
      
      if (lastExport.time) {
        lastRun.textContent = new Date(lastExport.time).toLocaleString();
        autoStatus.textContent = lastExport.success ? i18n('status_success') : i18n('status_error');
        autoStatus.style.color = lastExport.success ? 'green' : 'red';
      } else {
        autoStatus.textContent = i18n('status_inactive');
        lastRun.textContent = i18n('status_never');
        autoStatus.style.color = '';
      }
    } catch (error) {
      console.error('Error loading last export info:', error);
    }
  }
  
  async function loadSettings() {
    try {
      const result = await browser.storage.local.get([
        'settings',
        'autoSettings',
        'lastExport',
        'language'
      ]);
      
      settings = result.settings || {};
      const auto = result.autoSettings || {};
      const lastExport = result.lastExport || {};
      
      // Применяем настройки
      if (settings.saveFolder) saveFolder.value = settings.saveFolder;
      if (settings.filenamePattern) filenamePattern.value = settings.filenamePattern;
      if (settings.addTimestamp !== undefined) addTimestamp.checked = settings.addTimestamp;
      if (settings.compressFiles !== undefined) compressFiles.checked = settings.compressFiles;
      
      // Автоматизация
      if (auto.enabled !== undefined) enableAutoExport.checked = auto.enabled;
      if (auto.trigger) autoTrigger.value = auto.trigger;
      if (auto.scheduleTime) scheduleTime.value = auto.scheduleTime;
      if (auto.intervalMinutes) intervalMinutes.value = auto.intervalMinutes;
      if (auto.action) autoAction.value = auto.action;
      if (auto.format) setRadioValue('autoFormat', auto.format);
      if (auto.serverUrl) serverUrl.value = auto.serverUrl;
      if (auto.domainFilter) autoDomainFilter.value = auto.domainFilter;
      
      // Статус - load with i18n
      await loadLastExportInfo();
      
      showStatus(i18n('status_settingsLoaded'), 'success', 2000);
    } catch (error) {
      console.error(i18n('error_loadSettings'), error);
    }
  }
  
  async function handleGetCookies() {
    try {
      showStatus(i18n('status_gettingCookies'), 'info');
      
      const filter = {};
      if (domainFilter.value.trim()) {
        filter.domain = domainFilter.value.trim();
      }
      
      const format = document.querySelector('input[name="exportFormat"]:checked').value;
      
      const response = await browser.runtime.sendMessage({
        action: 'getCookies',
        filter: filter,
        cookieType: cookieType.value,
        format: format
      });
      
      if (response.success) {
        currentCookies = response.cookies;
        currentFormat = format;
        displayCookies(currentCookies);
        showStatus(i18n('status_cookiesReceived', [currentCookies.length]), 'success');
      } else {
        showStatus(i18n('status_saveError', [response.error]), 'error');
      }
    } catch (error) {
      showStatus(i18n('status_saveError', [error.message]), 'error');
    }
  }
  
  function displayCookies(cookies) {
    if (currentFormat === 'netscape') {
      resultText.value = convertToNetscape(cookies);
    } else {
      resultText.value = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          browser: navigator.userAgent,
          domainFilter: domainFilter.value || 'all',
          cookieType: cookieType.value,
          count: cookies.length,
          format: 'json'
        },
        cookies: cookies
      }, null, 2);
    }
    
    cookieCount.textContent = cookies.length;
    resultArea.style.display = 'block';
    copyToClipboardBtn.disabled = false;
    saveToFileBtn.disabled = false;
    sendToServerBtn.disabled = false;
  }
  
  function convertToNetscape(cookies) {
    let netscape = '# Netscape HTTP Cookie File\n';
    netscape += '# http://curl.haxx.se/rfc/cookie_spec.html\n';
    netscape += '# Generated by Cookie Exporter Pro\n';
    netscape += '# Domain\tHttpOnly\tPath\tSecure\tExpiration\tName\tValue\n\n';
    
    cookies.forEach(cookie => {
      const domain = cookie.domain || '';
      const httpOnly = cookie.httpOnly ? 'TRUE' : 'FALSE';
      const path = cookie.path || '/';
      const secure = cookie.secure ? 'TRUE' : 'FALSE';
      const expiration = cookie.expirationDate 
        ? Math.floor(cookie.expirationDate)
        : Math.floor(Date.now() / 1000) + 86400; // +1 день если нет expiration
      const name = cookie.name || '';
      const value = cookie.value || '';
      
      netscape += `${domain}\t${httpOnly}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
    });
    
    return netscape;
  }
  
  async function handleCopyToClipboard() {
    try {
      await navigator.clipboard.writeText(resultText.value);
      showStatus(i18n('status_copied'), 'success');
    } catch (error) {
      showStatus(i18n('error_copy', [error.message]), 'error');
    }
  }
  
  async function handleSaveToFile() {
    try {
      const filename = generateFilename();
      const content = resultText.value;
      
      await browser.runtime.sendMessage({
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
      
      // В реальном приложении здесь будет URL из настроек
      const server = settings.serverUrl || 'http://localhost:3000/cookies';
      
      const response = await fetch(server, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          format: currentFormat,
          count: currentCookies.length,
          data: currentFormat === 'json' ? JSON.parse(resultText.value) : resultText.value
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
  
  function generateFilename() {
    let filename = filenamePattern.value || '{date}_{time}';
    const now = new Date();
    
    filename = filename
      .replace(/{date}/g, now.toISOString().slice(0, 10))
      .replace(/{time}/g, now.toTimeString().slice(0, 8).replace(/:/g, '-'))
      .replace(/{domain}/g, domainFilter.value || 'all')
      .replace(/{count}/g, currentCookies.length);
    
    filename += currentFormat === 'json' ? '.json' : '.txt';
    
    return filename;
  }
  
  function toggleAutoSettings() {
    autoSettings.classList.toggle('hidden', !enableAutoExport.checked);
  }
  
  function updateTriggerSettings() {
    const trigger = autoTrigger.value;
    scheduleSettings.classList.toggle('hidden', trigger !== 'schedule');
    intervalSettings.classList.toggle('hidden', trigger !== 'interval');
  }
  
  async function saveAutoSettings() {
    try {
      const autoSettings = {
        enabled: enableAutoExport.checked,
        trigger: autoTrigger.value,
        scheduleTime: scheduleTime.value,
        intervalMinutes: parseInt(intervalMinutes.value) || 60,
        action: autoAction.value,
        format: document.querySelector('input[name="autoFormat"]:checked').value,
        serverUrl: serverUrl.value,
        domainFilter: autoDomainFilter.value
      };
      
      await browser.storage.local.set({ autoSettings });
      await browser.runtime.sendMessage({
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
      
      const response = await browser.runtime.sendMessage({
        action: 'autoExport'
      });
      
      if (response.success) {
        showStatus(i18n('status_testSuccess'), 'success');
      } else {
        showStatus(i18n('status_saveError', [response.error]), 'error');
      }
    } catch (error) {
      showStatus(i18n('status_saveError', [error.message]), 'error');
    }
  }
  
  async function saveAllSettings() {
    try {
      settings = {
        saveFolder: saveFolder.value,
        filenamePattern: filenamePattern.value,
        addTimestamp: addTimestamp.checked,
        compressFiles: compressFiles.checked
      };
      
      await browser.storage.local.set({ settings });
      showStatus(i18n('status_allSettingsSaved'), 'success');
    } catch (error) {
      showStatus(i18n('status_saveError', [error.message]), 'error');
    }
  }
  
  async function exportSettings() {
    try {
      const allSettings = await browser.storage.local.get(null);
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
  
  async function importSettings() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            const settings = JSON.parse(e.target.result);
            await browser.storage.local.clear();
            await browser.storage.local.set(settings);
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
    if (confirm(i18n('confirm_resetAll'))) {
      try {
        await browser.storage.local.clear();
        await loadSettings();
        showStatus(i18n('status_resetConfirmed'), 'success');
      } catch (error) {
        showStatus(i18n('status_saveError', [error.message]), 'error');
      }
    }
  }
  
  function setRadioValue(name, value) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
      radio.checked = (radio.value === value);
    });
  }
  
  function showStatus(message, type, timeout = 3000) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
    
    if (timeout > 0) {
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, timeout);
    }
  }
});
