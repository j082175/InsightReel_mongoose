// Service Worker - 백그라운드 작업 처리
// 환경별 서버 URL 설정
class BackgroundService {
  constructor() {
    // 환경별 서버 URL (실제 배포 시 수정 가능)
    this.serverUrl = this.getServerUrl();
    this.init();
  }

  /**
   * 환경별 서버 URL 결정
   */
  getServerUrl() {
    // Chrome Extension에서는 location을 직접 사용할 수 없으므로
    // chrome.management API를 통해 개발 모드 확인
    return chrome.runtime.getManifest().version.includes('dev') || 
           chrome.runtime.getManifest().name.includes('개발') ? 
           'http://localhost:3000' : 
           'https://api.yourdomain.com'; // 프로덕션 URL로 변경
  }

  init() {
    // 확장프로그램 설치 시 (정말 설치일 때만!)
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Service Worker 시작, 이유:', details.reason);
      
      if (details.reason === 'install') {
        console.log('⚡ 실제 설치: 기본 설정 초기화');
        this.handleInstall();
      } else if (details.reason === 'update') {
        console.log('⚡ 업데이트: 설정 유지');
        this.handleUpdate(details.previousVersion);
      } else {
        console.log('⚡ 재시작: 설정 그대로 유지');
        // 재시작 시에는 설정을 건드리지 않음
      }
    });

    // 메시지 수신
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 비동기 응답을 위해 필요
    });

    // 컨텍스트 메뉴 생성
    this.createContextMenus();

    // 주기적 작업 스케줄링
    this.schedulePeriodicTasks();
  }

  handleInstall() {
    console.log('InsightReel이 설치되었습니다.');
    
    // 올바른 설정 키와 구조 사용
    chrome.storage.sync.set({
      videosaverSettings: {
        autoAnalysis: false,    // 기본값 false (팝업과 일치)
        autoSave: true,
        showNotifications: true
      },
      serverUrl: this.serverUrl
    });

    // 환영 페이지 표시 (선택사항)
    // chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }

  handleUpdate(previousVersion) {
    console.log(`확장프로그램이 ${previousVersion}에서 업데이트되었습니다.`);
    // 업데이트 로직
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'downloadVideo':
          await this.downloadVideo(request.data, sendResponse);
          break;
          
        case 'testServer':
          await this.testServerConnection(sendResponse);
          break;
          
        case 'getSettings':
          await this.getSettings(sendResponse);
          break;
          
        case 'saveSettings':
          await this.saveSettings(request.data, sendResponse);
          break;

        default:
          sendResponse({ error: '알 수 없는 액션입니다.' });
      }
    } catch (error) {
      console.error('메시지 처리 실패:', error);
      sendResponse({ error: error.message });
    }
  }

  createContextMenus() {
    chrome.contextMenus.create({
      id: 'saveVideo',
      title: '이 영상 저장 및 분석',
      contexts: ['video'],
      documentUrlPatterns: [
        'https://www.instagram.com/*',
        'https://www.tiktok.com/*'
      ]
    });

    chrome.contextMenus.create({
      id: 'openSpreadsheet',
      title: '분석 결과 스프레드시트 열기',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://www.instagram.com/*',
        'https://www.tiktok.com/*'
      ]
    });

    // 컨텍스트 메뉴 클릭 처리
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  async handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'saveVideo':
        // 현재 탭의 content script에 메시지 전송
        chrome.tabs.sendMessage(tab.id, {
          action: 'saveCurrentVideo',
          url: info.srcUrl
        });
        break;
        
      case 'openSpreadsheet':
        const settings = await this.getStoredSettings();
        if (settings.spreadsheetUrl) {
          chrome.tabs.create({ url: settings.spreadsheetUrl });
        } else {
          this.showNotification('스프레드시트가 아직 생성되지 않았습니다.');
        }
        break;
    }
  }

  async downloadVideo(data, sendResponse) {
    try {
      const response = await fetch(`${this.serverUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.ok) {
        // 성공 알림
        this.showNotification(`✅ 영상이 저장되었습니다!\n카테고리: ${result.mainCategory}`);
        
        // 스프레드시트 URL 저장
        if (result.spreadsheetUrl) {
          chrome.storage.sync.set({ spreadsheetUrl: result.spreadsheetUrl });
        }
      }
      
      sendResponse(result);
    } catch (error) {
      const errorResult = { error: error.message };
      sendResponse(errorResult);
    }
  }

  async testServerConnection(sendResponse) {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      const result = {
        connected: response.ok,
        status: response.status,
        timestamp: new Date().toISOString()
      };
      
      sendResponse(result);
    } catch (error) {
      sendResponse({ 
        connected: false, 
        error: error.message,
        suggestion: '로컬 서버가 실행 중인지 확인해주세요.'
      });
    }
  }

  async getSettings(sendResponse) {
    try {
      const settings = await this.getStoredSettings();
      sendResponse(settings);
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async saveSettings(settings, sendResponse) {
    try {
      await chrome.storage.sync.set(settings);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'videosaverSettings', 'serverUrl', 'spreadsheetUrl'
      ], (result) => {
        // 올바른 설정 구조로 반환
        const settings = result.videosaverSettings || {};
        resolve({
          ...settings,
          serverUrl: result.serverUrl,
          spreadsheetUrl: result.spreadsheetUrl
        });
      });
    });
  }

  showNotification(message, type = 'basic') {
    chrome.storage.sync.get(['videosaverSettings'], (result) => {
      const settings = result.videosaverSettings || {};
      if (settings.showNotifications === false) return;
      
      chrome.notifications.create({
        type: type,
        iconUrl: 'icons/icon48.png',
        title: 'InsightReel',
        message: message
      });
    });
  }

  schedulePeriodicTasks() {
    // 1시간마다 서버 연결 상태 확인
    setInterval(async () => {
      try {
        await fetch(`${this.serverUrl}/health`);
        chrome.storage.local.set({ lastServerCheck: Date.now() });
      } catch (error) {
        console.log('서버 연결 확인 실패:', error);
      }
    }, 60 * 60 * 1000); // 1시간

    // 매일 오래된 데이터 정리 알림
    setInterval(() => {
      this.checkDataCleanup();
    }, 24 * 60 * 60 * 1000); // 24시간
  }

  async checkDataCleanup() {
    try {
      const response = await fetch(`${this.serverUrl}/api/cleanup-old-files`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('오래된 파일 정리 완료');
      }
    } catch (error) {
      console.log('파일 정리 확인 실패:', error);
    }
  }


  // 웹 요청 수정 (필요시)
  modifyWebRequests() {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        // 필요시 헤더 수정
        return { requestHeaders: details.requestHeaders };
      },
      { urls: ['https://www.instagram.com/*', 'https://www.tiktok.com/*'] },
      ['blocking', 'requestHeaders']
    );
  }
}

// Service Worker 초기화
new BackgroundService();