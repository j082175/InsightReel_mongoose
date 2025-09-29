// Vanilla JavaScript popup controller
console.log('🚀 POPUP: Script loaded');

const serverUrl = 'http://localhost:3000';

// UI element references
let statusEl, testButtonEl, openSpreadsheetEl, testConnectionEl, collectChannelEl, syncCookiesEl, notificationEl;

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 POPUP: DOM loaded');

  // Get UI elements
  statusEl = document.getElementById('status');
  testButtonEl = document.getElementById('testButton');
  openSpreadsheetEl = document.getElementById('openSpreadsheet');
  testConnectionEl = document.getElementById('testConnection');
  collectChannelEl = document.getElementById('collectChannel');
  syncCookiesEl = document.getElementById('syncCookies');
  notificationEl = document.getElementById('notification');

  // Add event listeners
  if (testButtonEl) {
    testButtonEl.addEventListener('click', handleTestButton);
    console.log('✅ POPUP: Test button listener added');
  }

  if (openSpreadsheetEl) {
    openSpreadsheetEl.addEventListener('click', handleOpenSpreadsheet);
    console.log('✅ POPUP: Spreadsheet button listener added');
  }

  if (testConnectionEl) {
    testConnectionEl.addEventListener('click', handleTestConnection);
    console.log('✅ POPUP: Test connection listener added');
  }

  if (collectChannelEl) {
    collectChannelEl.addEventListener('click', handleCollectChannel);
    console.log('✅ POPUP: Collect channel listener added');
  }

  if (syncCookiesEl) {
    syncCookiesEl.addEventListener('click', handleSyncCookies);
    console.log('✅ POPUP: Sync cookies listener added');
  }

  // Initialize settings from storage
  loadSettings();

  // Initialize server status check
  checkServerStatus();

  console.log('✅ POPUP: All initialization complete');
});

// Utility functions
function showNotification(message) {
  console.log('📢 POPUP: Notification:', message);
  if (notificationEl) {
    notificationEl.textContent = message;
    notificationEl.style.display = 'block';
    setTimeout(() => {
      notificationEl.style.display = 'none';
    }, 3000);
  }
}

function updateStatus(text, className = '') {
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + className;
  }
}

function setButtonState(button, text, disabled = false) {
  if (button) {
    button.textContent = text;
    button.disabled = disabled;
  }
}

// Server status check
async function checkServerStatus() {
  updateStatus('연결 확인 중...');

  try {
    const response = await fetch(`${serverUrl}/health`);
    if (response.ok) {
      updateStatus('✅ 서버 연결됨', 'connected');
    } else {
      throw new Error('서버 응답 오류');
    }
  } catch (error) {
    updateStatus('❌ 서버 연결 안됨 (로컬 서버를 시작해주세요)', 'error');
  }
}

// Event handlers
function handleTestButton() {
  console.log('🧪 POPUP: Test button clicked!');
  showNotification('✅ 버튼이 정상적으로 작동합니다!');
}

async function handleOpenSpreadsheet() {
  console.log('📊 POPUP: Spreadsheet button clicked');

  try {
    // Try to get spreadsheet info from server first
    const response = await fetch(`${serverUrl}/api/test-sheets`);
    if (response.ok) {
      const data = await response.json();
      if (data.result && data.result.spreadsheetUrl) {
        chrome.tabs.create({ url: data.result.spreadsheetUrl });
        return;
      }
    }
  } catch (error) {
    console.log('Server request failed:', error);
  }

  // Fallback URL
  const fallbackUrl = 'https://docs.google.com/spreadsheets/d/1UkGu6HObPNo6cPojBzhYeFxNVMkTksrsANTuSGKloJA';
  chrome.tabs.create({ url: fallbackUrl });
}

async function handleTestConnection() {
  console.log('🔧 POPUP: Test connection clicked');
  const originalText = testConnectionEl.textContent;

  setButtonState(testConnectionEl, '테스트 중...', true);

  try {
    const serverResponse = await fetch(`${serverUrl}/health`);
    const sheetsResponse = await fetch(`${serverUrl}/api/test-sheets`);

    let message = '연결 테스트 결과:\n';
    message += `서버: ${serverResponse.ok ? '✅' : '❌'}\n`;
    message += `구글 시트: ${sheetsResponse.ok ? '✅' : '❌'}`;

    showNotification(message);
  } catch (error) {
    showNotification('연결 테스트 실패: ' + error.message);
  } finally {
    setButtonState(testConnectionEl, originalText, false);
  }
}

async function handleCollectChannel() {
  console.log('📊 POPUP: Channel collection clicked');

  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if it's a YouTube channel page
    const isChannelPage = tab.url.includes('/channel/') ||
                         tab.url.includes('/@') ||
                         tab.url.includes('/c/') ||
                         tab.url.includes('/user/');

    if (!isChannelPage) {
      showNotification('❌ YouTube 채널 페이지에서만 사용할 수 있습니다.');
      return;
    }

    setButtonState(collectChannelEl, '수집 중...', true);

    // Get selected settings from popup
    const settings = getSelectedSettings();
    console.log('📋 POPUP: Selected settings:', settings);

    // Send message to content script with settings
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'showChannelCollectModal',
      settings: settings
    });

    if (response && response.success) {
      window.close();
    } else {
      throw new Error(response?.error || '채널 수집 기능을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('채널 수집 실패:', error);
    showNotification('❌ 채널 수집 실패: ' + error.message);

    setButtonState(collectChannelEl, '실패', false);
    setTimeout(() => {
      setButtonState(collectChannelEl, '📊 채널 수집', false);
    }, 2000);
  }
}

function handleSyncCookies() {
  console.log('🍪 POPUP: Cookie sync clicked');
  setButtonState(syncCookiesEl, '🚧 준비 중', true);
  showNotification('🚧 Instagram 쿠키 동기화 기능 준비 중');

  setTimeout(() => {
    setButtonState(syncCookiesEl, '🍪 Instagram 쿠키 동기화', false);
  }, 2000);
}

// Settings management
async function loadSettings() {
  try {
    const result = await new Promise((resolve) => {
      chrome.storage.sync.get(['contentType', 'aiAnalysis'], resolve);
    });

    const contentTypeSelect = document.getElementById('contentType');
    const aiAnalysisSelect = document.getElementById('aiAnalysis');

    if (contentTypeSelect && result.contentType) {
      contentTypeSelect.value = result.contentType;
    }

    if (aiAnalysisSelect && result.aiAnalysis) {
      aiAnalysisSelect.value = result.aiAnalysis;
    }

    // Add change listeners
    if (contentTypeSelect) {
      contentTypeSelect.addEventListener('change', saveSettings);
    }

    if (aiAnalysisSelect) {
      aiAnalysisSelect.addEventListener('change', saveSettings);
    }

    console.log('✅ POPUP: Settings loaded');
  } catch (error) {
    console.error('❌ POPUP: Failed to load settings:', error);
  }
}

async function saveSettings() {
  try {
    const contentTypeSelect = document.getElementById('contentType');
    const aiAnalysisSelect = document.getElementById('aiAnalysis');

    const settings = {
      contentType: contentTypeSelect?.value || 'auto',
      aiAnalysis: aiAnalysisSelect?.value || 'full'
    };

    await new Promise((resolve) => {
      chrome.storage.sync.set(settings, resolve);
    });

    console.log('✅ POPUP: Settings saved:', settings);
  } catch (error) {
    console.error('❌ POPUP: Failed to save settings:', error);
  }
}

function getSelectedSettings() {
  const contentTypeSelect = document.getElementById('contentType');
  const aiAnalysisSelect = document.getElementById('aiAnalysis');

  return {
    contentType: contentTypeSelect?.value || 'auto',
    aiAnalysis: aiAnalysisSelect?.value || 'full'
  };
}

// Test Chrome API availability
if (typeof chrome !== 'undefined') {
  console.log('✅ POPUP: Chrome APIs available');
  if (chrome.tabs) {
    console.log('✅ POPUP: chrome.tabs available');
  } else {
    console.log('❌ POPUP: chrome.tabs NOT available');
  }
} else {
  console.log('❌ POPUP: Chrome APIs NOT available');
}