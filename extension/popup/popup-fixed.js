// Fixed popup JavaScript
console.log('🚀 FIXED: External script loaded');

const logDiv = document.getElementById('log');

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  if (logDiv) {
    logDiv.innerHTML += logMessage + '<br>';
    logDiv.scrollTop = logDiv.scrollHeight;
  }
}

function testClick(buttonNumber) {
  addLog(`✅ Button ${buttonNumber} clicked!`);

  if (buttonNumber === 2) {
    addLog('📊 Opening Google Sheets...');
    try {
      chrome.tabs.create({
        url: 'https://docs.google.com/spreadsheets/d/1UkGu6HObPNo6cPojBzhYeFxNVMkTksrsANTuSGKloJA'
      });
      addLog('✅ Tab creation initiated');
    } catch (error) {
      addLog(`❌ Tab creation failed: ${error.message}`);
    }
  }

  if (buttonNumber === 3) {
    addLog('🔧 Testing server connection...');
    fetch('http://localhost:3000/health')
      .then(response => {
        addLog(`Server response: ${response.status}`);
        return response.text();
      })
      .then(data => {
        addLog(`Server data: ${data.substring(0, 50)}...`);
      })
      .catch(error => {
        addLog(`Server error: ${error.message}`);
      });
  }
}

// Make function global
window.testClick = testClick;

// Document ready
document.addEventListener('DOMContentLoaded', function() {
  addLog('📋 DOM loaded');
});

// Window loaded
window.addEventListener('load', function() {
  addLog('🎯 Window loaded');
});

// Initial setup
addLog('🚀 Script execution started');

// Test chrome API availability
if (typeof chrome !== 'undefined') {
  addLog('✅ Chrome APIs available');
  if (chrome.tabs) {
    addLog('✅ chrome.tabs available');
  } else {
    addLog('❌ chrome.tabs NOT available');
  }
} else {
  addLog('❌ Chrome APIs NOT available');
}

// Test basic functionality
setTimeout(() => {
  addLog('⏰ 1 second timer test');
}, 1000);