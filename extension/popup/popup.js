// 팝업 스크립트
class VideoSaverPopup {
  constructor() {
    this.serverUrl = 'http://localhost:3000';
    this.init();
  }

  async init() {
    console.log('🚀 팝업 초기화 시작');
    
    // 설정을 먼저 로드한 후 이벤트 리스너 설정
    await this.loadSettings();
    this.setupEventListeners();
    
    // 서버 상태와 통계는 병렬로 처리
    await Promise.all([
      this.checkServerStatus(),
      this.loadStats()
    ]);
    
    console.log('📋 팝업 초기화 완료');
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
    // 디바운스 타이머들을 인스턴스 변수로 관리
    this.debounceTimers = {};
    
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

    // 설정 토글 - 개별 디바운싱 (AI 분석 토글 추가)
    const toggles = ['useAI', 'autoAnalyze', 'autoSave', 'batchMode', 'showNotifications'];
    toggles.forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        // 해당 ID의 이전 타이머 취소
        if (this.debounceTimers[id]) {
          clearTimeout(this.debounceTimers[id]);
        }
        
        // 즉시 시각적 피드백
        const element = e.target;
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.15s ease';
        setTimeout(() => {
          element.style.transform = 'scale(1)';
        }, 150);
        
        console.log(`${id} 토글: ${e.target.checked}`); // 디버그용
        
        // 200ms 후 실제 저장 (더 빠르게)
        this.debounceTimers[id] = setTimeout(() => {
          this.saveSetting(id, e.target.checked);
        }, 200);
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
      
      // 구글 시트 연결 테스트
      const sheetsResponse = await fetch(`${this.serverUrl}/api/test-sheets`);

      let message = '연결 테스트 결과:\n';
      message += `서버: ${serverResponse.ok ? '✅' : '❌'}\n`;
      message += `구글 시트: ${sheetsResponse.ok ? '✅' : '❌'}`;

      this.showNotification(message);
    } catch (error) {
      this.showNotification('연결 테스트 실패: ' + error.message);
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  async loadSettings() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['videosaverSettings'], resolve);
      });
      
      const settings = result.videosaverSettings || {};
      console.log('📋 로드된 설정:', settings);
      
      // DOM 요소가 준비되었는지 확인
      const useAI = document.getElementById('useAI');
      const autoAnalyze = document.getElementById('autoAnalyze');
      const autoSave = document.getElementById('autoSave');
      const batchMode = document.getElementById('batchMode');
      const showNotifications = document.getElementById('showNotifications');
      
      if (!useAI || !autoAnalyze || !autoSave || !batchMode || !showNotifications) {
        console.warn('⚠️ DOM 요소가 아직 준비되지 않음');
        return;
      }
      
      // 명시적으로 저장된 값 사용 (undefined인 경우만 기본값)
      useAI.checked = settings.useAI !== undefined ? settings.useAI : true; // AI 분석은 기본적으로 켜짐
      autoAnalyze.checked = settings.autoAnalysis !== undefined ? settings.autoAnalysis : false;
      autoSave.checked = settings.autoSave !== undefined ? settings.autoSave : true;
      batchMode.checked = settings.batchMode !== undefined ? settings.batchMode : false; // 배치 모드는 기본적으로 꺼짐
      showNotifications.checked = settings.showNotifications !== undefined ? settings.showNotifications : true;
      
      // 설정 로드 완료 후 설정 영역을 부드럽게 표시
      const settingsContainer = document.getElementById('settingsContainer');
      if (settingsContainer) {
        settingsContainer.style.opacity = '1';
      }
      
      console.log('✅ UI 반영 완료');
      
    } catch (error) {
      console.error('❌ 설정 로드 실패:', error);
      
      // 에러 발생 시에도 설정 영역 표시 (기본값으로)
      const settingsContainer = document.getElementById('settingsContainer');
      if (settingsContainer) {
        settingsContainer.style.opacity = '1';
      }
    }
  }

  async saveSetting(key, value) {
    try {
      console.log(`💾 설정 저장 시작: ${key} = ${value}`);
      
      // 현재 설정 가져오기
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['videosaverSettings'], resolve);
      });
      
      const currentSettings = result.videosaverSettings || {};
      console.log('📋 현재 저장된 설정:', currentSettings);
      
      let settingKey = key;
      // autoAnalyze를 autoAnalysis로 매핑
      if (key === 'autoAnalyze') {
        settingKey = 'autoAnalysis';
      }
      // useAI는 그대로 useAI로 저장
      
      const updatedSettings = {
        ...currentSettings,
        [settingKey]: value
      };
      
      console.log('🔄 업데이트될 설정:', updatedSettings);
      
      // 설정 저장
      await new Promise((resolve) => {
        chrome.storage.sync.set({ 
          videosaverSettings: updatedSettings 
        }, resolve);
      });
      
      console.log(`✅ 설정 저장 완료: ${settingKey} = ${value}`);
      
      // 간단한 시각적 피드백 (알림 대신 체크마크)
      this.showQuickFeedback(settingKey);
      
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
      this.showNotification(`❌ 설정 저장에 실패했습니다`);
    }
  }

  showQuickFeedback(settingKey) {
    // 토글 옆에 간단한 체크마크 표시 (1초만)
    let elementId = settingKey;
    if (settingKey === 'autoAnalysis') {
      elementId = 'autoAnalyze';
    }
    const settingElement = document.getElementById(elementId);
    if (settingElement && settingElement.parentElement) {
      const feedback = document.createElement('span');
      feedback.textContent = '✓';
      feedback.style.cssText = `
        color: #4caf50;
        font-weight: bold;
        margin-left: 5px;
        animation: fadeOut 1s ease-out forwards;
      `;
      
      // CSS 애니메이션 추가
      if (!document.getElementById('feedback-animation')) {
        const style = document.createElement('style');
        style.id = 'feedback-animation';
        style.textContent = `
          @keyframes fadeOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      settingElement.parentElement.appendChild(feedback);
      
      setTimeout(() => {
        if (feedback.parentElement) {
          feedback.parentElement.removeChild(feedback);
        }
      }, 1000);
    }
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