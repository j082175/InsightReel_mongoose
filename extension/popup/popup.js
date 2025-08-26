// 팝업 스크립트
class VideoSaverPopup {
  constructor() {
    this.serverUrl = 'http://localhost:3000';
    this.init();
  }

  async init() {
    await this.checkServerStatus();
    await this.loadStats();
    this.setupEventListeners();
    this.loadSettings();
  }

  async checkServerStatus() {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        statusElement.className = 'status connected';
        statusText.textContent = '✅ 서버 연결됨';
      } else {
        throw new Error('서버 응답 오류');
      }
    } catch (error) {
      statusElement.className = 'status error';
      statusText.textContent = '❌ 서버 연결 안됨 (로컬 서버를 시작해주세요)';
    }
  }

  async loadStats() {
    try {
      const response = await fetch(`${this.serverUrl}/api/stats`);
      if (response.ok) {
        const stats = await response.json();
        document.getElementById('totalVideos').textContent = stats.total || 0;
        document.getElementById('todayVideos').textContent = stats.today || 0;
      }
    } catch (error) {
      console.log('통계 로드 실패:', error);
    }
  }

  setupEventListeners() {
    // 스프레드시트 열기
    document.getElementById('openSheets').addEventListener('click', async () => {
      try {
        // 서버에서 스프레드시트 정보 가져오기
        const response = await fetch(`${this.serverUrl}/api/test-sheets`);
        if (response.ok) {
          const data = await response.json();
          if (data.result && data.result.spreadsheetUrl) {
            chrome.tabs.create({ url: data.result.spreadsheetUrl });
            return;
          }
        }
      } catch (error) {
        console.log('서버에서 스프레드시트 정보 가져오기 실패:', error);
      }
      
      // 백업: Chrome storage에서 확인
      chrome.storage.sync.get(['spreadsheetUrl'], (result) => {
        if (result.spreadsheetUrl) {
          chrome.tabs.create({ url: result.spreadsheetUrl });
        } else {
          // 고정 URL 사용 (환경변수에서 설정한 스프레드시트)
          const fallbackUrl = 'https://docs.google.com/spreadsheets/d/1UkGu6HObPNo6cPojBzhYeFxNVMkTksrsANTuSGKloJA';
          chrome.tabs.create({ url: fallbackUrl });
        }
      });
    });

    // 연결 테스트
    document.getElementById('testConnection').addEventListener('click', async () => {
      await this.testConnection();
    });

    // 설정 토글
    const toggles = ['autoAnalyze', 'autoSave', 'showNotifications'];
    toggles.forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        this.saveSetting(id, e.target.checked);
      });
    });
  }

  async testConnection() {
    const button = document.getElementById('testConnection');
    const originalText = button.textContent;
    button.textContent = '테스트 중...';
    button.disabled = true;

    try {
      // 서버 연결 테스트
      const serverResponse = await fetch(`${this.serverUrl}/health`);
      
      // Ollama 연결 테스트
      const ollamaResponse = await fetch(`${this.serverUrl}/api/test-ollama`);
      
      // 구글 시트 연결 테스트
      const sheetsResponse = await fetch(`${this.serverUrl}/api/test-sheets`);

      let message = '연결 테스트 결과:\n';
      message += `서버: ${serverResponse.ok ? '✅' : '❌'}\n`;
      message += `AI (Ollama): ${ollamaResponse.ok ? '✅' : '❌'}\n`;
      message += `구글 시트: ${sheetsResponse.ok ? '✅' : '❌'}`;

      this.showNotification(message);
    } catch (error) {
      this.showNotification('연결 테스트 실패: ' + error.message);
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  loadSettings() {
    chrome.storage.sync.get([
      'autoAnalyze', 'autoSave', 'showNotifications'
    ], (result) => {
      document.getElementById('autoAnalyze').checked = result.autoAnalyze !== false;
      document.getElementById('autoSave').checked = result.autoSave !== false;
      document.getElementById('showNotifications').checked = result.showNotifications !== false;
    });
  }

  saveSetting(key, value) {
    chrome.storage.sync.set({ [key]: value });
  }

  showNotification(message) {
    // 간단한 알림 표시
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: #333;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      font-size: 12px;
      white-space: pre-line;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }
}

// 팝업이 로드되면 초기화
document.addEventListener('DOMContentLoaded', () => {
  new VideoSaverPopup();
});