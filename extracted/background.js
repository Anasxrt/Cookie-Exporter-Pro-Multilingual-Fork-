// Фоновый скрипт для управления автоматическим экспортом
let autoSettings = null;
let alarmName = 'autoCookieExport';

// Инициализация
browser.runtime.onStartup.addListener(init);
browser.runtime.onInstalled.addListener(init);

async function init() {
  // Загрузка настроек
  const result = await browser.storage.local.get('autoSettings');
  autoSettings = result.autoSettings;
  
  if (autoSettings && autoSettings.enabled) {
    setupAutoExport();
  }
  
  console.log('Cookie Exporter Pro+ инициализирован');
}

// Настройка автоматического экспорта
function setupAutoExport() {
  // Очищаем предыдущие alarms
  browser.alarms.clear(alarmName);
  
  if (!autoSettings || !autoSettings.enabled) {
    return;
  }
  
  const trigger = autoSettings.trigger;
  
  switch (trigger) {
    case 'startup':
      // Уже обрабатывается в onStartup
      break;
      
    case 'browserClose':
      // Обрабатывается в onSuspend (не надежно)
      break;
      
    case 'schedule':
      if (autoSettings.scheduleTime) {
        const [hours, minutes] = autoSettings.scheduleTime.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const delayInMinutes = Math.round((scheduledTime - now) / 60000);
        
        browser.alarms.create(alarmName, {
          delayInMinutes: delayInMinutes,
          periodInMinutes: 24 * 60 // Каждые 24 часа
        });
      }
      break;
      
    case 'interval':
      if (autoSettings.intervalMinutes) {
        browser.alarms.create(alarmName, {
          periodInMinutes: autoSettings.intervalMinutes
        });
      }
      break;
  }
}

// Обработчик alarms
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === alarmName) {
    await performAutoExport();
  }
});

// Обработка закрытия браузера (не надежно, но лучше чем ничего)
browser.runtime.onSuspend.addListener(async () => {
  if (autoSettings && autoSettings.enabled && autoSettings.trigger === 'browserClose') {
    await performAutoExport();
  }
});

// Основная функция автоэкспорта
async function performAutoExport() {
  try {
    console.log('Запуск автоматического экспорта...');
    
    // Получаем настройки на случай, если они изменились
    const result = await browser.storage.local.get('autoSettings');
    autoSettings = result.autoSettings;
    
    if (!autoSettings || !autoSettings.enabled) {
      return { success: false, error: 'Автоэкспорт отключен' };
    }
    
    // Получаем куки
    const filter = {};
    if (autoSettings.domainFilter) {
      filter.domain = autoSettings.domainFilter.trim();
    }
    
    const cookies = await browser.cookies.getAll(filter);
    
    // Фильтруем по типу если нужно
    let filteredCookies = cookies;
    // (здесь можно добавить фильтрацию по cookieType как в ручном режиме)
    
    // Форматируем
    let content, filename, mimeType;
    
    if (autoSettings.format === 'netscape') {
      content = convertToNetscape(filteredCookies);
      filename = `cookies_auto_${new Date().toISOString().slice(0, 10)}.txt`;
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          trigger: autoSettings.trigger,
          domainFilter: autoSettings.domainFilter || 'all',
          count: filteredCookies.length,
          format: 'json'
        },
        cookies: filteredCookies
      }, null, 2);
      filename = `cookies_auto_${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = 'application/json';
    }
    
    // Выполняем действие
    const actions = autoSettings.action.split(','); // Для значения "both"
    
    for (const action of actions) {
      switch (action) {
        case 'save':
          await saveCookieFile(content, filename, mimeType);
          break;
          
        case 'send':
          if (autoSettings.serverUrl) {
            await sendToServer(content, autoSettings.serverUrl, autoSettings.format);
          }
          break;
      }
    }
    
    // Сохраняем время последнего запуска
    await browser.storage.local.set({
      lastExport: {
        time: Date.now(),
        success: true,
        count: filteredCookies.length
      }
    });
    
    console.log('Автоэкспорт успешно завершен');
    return { success: true, count: filteredCookies.length };
    
  } catch (error) {
    console.error('Ошибка автоэкспорта:', error);
    
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

// Сохранение файла
async function saveCookieFile(content, filename, mimeType) {
  // Создаем Blob
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  // Используем downloads API
  await browser.downloads.download({
    url: url,
    filename: `cookies_exports/${filename}`,
    saveAs: false,
    conflictAction: 'uniquify'
  });
  
  // Освобождаем URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Отправка на сервер
async function sendToServer(content, serverUrl, format) {
  const payload = format === 'json' 
    ? JSON.parse(content)
    : { data: content, format: 'netscape' };
  
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
}

// Конвертация в Netscape формат
function convertToNetscape(cookies) {
  let netscape = '# Netscape HTTP Cookie File\n';
  netscape += '# http://curl.haxx.se/rfc/cookie_spec.html\n';
  netscape += '# Auto-generated by Cookie Exporter Pro\n';
  netscape += '# Domain\tHttpOnly\tPath\tSecure\tExpiration\tName\tValue\n\n';
  
  cookies.forEach(cookie => {
    const domain = cookie.domain || '';
    const httpOnly = cookie.httpOnly ? 'TRUE' : 'FALSE';
    const path = cookie.path || '/';
    const secure = cookie.secure ? 'TRUE' : 'FALSE';
    const expiration = cookie.expirationDate 
      ? Math.floor(cookie.expirationDate)
      : Math.floor(Date.now() / 1000) + 86400;
    const name = cookie.name || '';
    const value = cookie.value || '';
    
    netscape += `${domain}\t${httpOnly}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
  });
  
  return netscape;
}

// Обработчик сообщений от popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getCookies':
      handleGetCookies(request, sendResponse);
      return true;
      
    case 'saveToFile':
      handleSaveToFile(request, sendResponse);
      return true;
      
    case 'updateAutoSettings':
      autoSettings = request.settings;
      setupAutoExport();
      sendResponse({ success: true });
      return true;
      
    case 'autoExport':
      performAutoExport().then(sendResponse);
      return true;
  }
});

async function handleGetCookies(request, sendResponse) {
  try {
    const cookies = await browser.cookies.getAll(request.filter || {});
    
    // Фильтрация по типу
    let filteredCookies = cookies;
    if (request.cookieType === 'session') {
      filteredCookies = cookies.filter(cookie => cookie.session);
    } else if (request.cookieType === 'persistent') {
      filteredCookies = cookies.filter(cookie => !cookie.session);
    }
    
    sendResponse({ 
      success: true, 
      cookies: filteredCookies,
      format: request.format 
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveToFile(request, sendResponse) {
  try {
    await saveCookieFile(
      request.content,
      request.filename,
      request.format === 'json' ? 'application/json' : 'text/plain'
    );
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}