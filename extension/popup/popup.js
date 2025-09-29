// Alpine.js popup controller
function popupController() {
  return {
    // Server URL configuration
    serverUrl: 'http://localhost:3000',

    // Reactive state
    serverStatus: {
      class: '',
      text: '연결 확인 중...',
      loading: true
    },

    stats: {
      total: 0,
      today: 0
    },

    settings: {
      useAI: true,
      autoAnalyze: false,
      autoSave: true,
      batchMode: false,
      showNotifications: true
    },

    buttons: {
      testConnection: {
        text: '🔧 연결 테스트',
        disabled: false
      },
      collectChannel: {
        text: '📊 채널 수집',
        disabled: false,
        style: ''
      },
      syncCookies: {
        text: '🍪 Instagram 쿠키 동기화',
        disabled: false
      }
    },

    notification: {
      visible: false,
      message: ''
    },

    feedback: {
      useAI: false,
      autoAnalyze: false,
      autoSave: false,
      batchMode: false,
      showNotifications: false
    },

    settingsVisible: false,

    // Debounce timers
    debounceTimers: {},

    // Initialization
    async init() {
      console.log('🚀 Alpine.js 팝업 초기화 시작');

      // Load settings first
      await this.loadSettings();

      // Show settings container
      this.settingsVisible = true;

      // Check server status and load stats in parallel
      await Promise.all([
        this.checkServerStatus(),
        this.loadStats()
      ]);

      console.log('📋 Alpine.js 팝업 초기화 완료');
    },

    // Server status check
    async checkServerStatus() {
      try {
        const response = await fetch(`${this.serverUrl}/health`);
        if (response.ok) {
          this.serverStatus = {
            class: 'connected',
            text: '✅ 서버 연결됨',
            loading: false
          };
        } else {
          throw new Error('서버 응답 오류');
        }
      } catch (error) {
        this.serverStatus = {
          class: 'error',
          text: '❌ 서버 연결 안됨 (로컬 서버를 시작해주세요)',
          loading: false
        };
      }
    },

    // Load statistics
    async loadStats() {
      try {
        const response = await fetch(`${this.serverUrl}/api/stats`);
        if (response.ok) {
          const stats = await response.json();
          this.stats.total = stats.total || 0;
          this.stats.today = stats.today || 0;
        }
      } catch (error) {
        console.log('통계 로드 실패:', error);
      }
    },

    // Load settings from Chrome storage
    async loadSettings() {
      try {
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(['videosaverSettings'], resolve);
        });

        const savedSettings = result.videosaverSettings || {};
        console.log('📋 로드된 설정:', savedSettings);

        // Apply saved settings with defaults
        this.settings.useAI = savedSettings.useAI !== undefined ? savedSettings.useAI : true;
        this.settings.autoAnalyze = savedSettings.autoAnalysis !== undefined ? savedSettings.autoAnalysis : false;
        this.settings.autoSave = savedSettings.autoSave !== undefined ? savedSettings.autoSave : true;
        this.settings.batchMode = savedSettings.batchMode !== undefined ? savedSettings.batchMode : false;
        this.settings.showNotifications = savedSettings.showNotifications !== undefined ? savedSettings.showNotifications : true;

        console.log('✅ UI 반영 완료');

      } catch (error) {
        console.error('❌ 설정 로드 실패:', error);
      }
    },

    // Save individual setting with debouncing
    async saveSetting(key, value) {
      try {
        console.log(`💾 설정 저장 시작: ${key} = ${value}`);

        // Visual feedback immediately
        this.showQuickFeedback(key);

        // Cancel previous timer for this setting
        if (this.debounceTimers[key]) {
          clearTimeout(this.debounceTimers[key]);
        }

        // Debounce the actual save operation
        this.debounceTimers[key] = setTimeout(async () => {
          try {
            // Get current settings
            const result = await new Promise((resolve) => {
              chrome.storage.sync.get(['videosaverSettings'], resolve);
            });

            const currentSettings = result.videosaverSettings || {};

            // Map autoAnalyze to autoAnalysis for storage
            let settingKey = key;
            if (key === 'autoAnalyze') {
              settingKey = 'autoAnalysis';
            }

            const updatedSettings = {
              ...currentSettings,
              [settingKey]: value
            };

            console.log('🔄 업데이트될 설정:', updatedSettings);

            // Save settings
            await new Promise((resolve) => {
              chrome.storage.sync.set({
                videosaverSettings: updatedSettings
              }, resolve);
            });

            console.log(`✅ 설정 저장 완료: ${settingKey} = ${value}`);

          } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
            this.showNotification('❌ 설정 저장에 실패했습니다');
          }
        }, 200);

      } catch (error) {
        console.error('❌ 설정 저장 실패:', error);
        this.showNotification('❌ 설정 저장에 실패했습니다');
      }
    },

    // Show quick visual feedback for settings
    showQuickFeedback(settingKey) {
      this.feedback[settingKey] = true;
      setTimeout(() => {
        this.feedback[settingKey] = false;
      }, 1000);
    },

    // Open spreadsheet
    async openSpreadsheet() {
      try {
        // Try to get spreadsheet info from server first
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

      // Fallback: Check Chrome storage
      chrome.storage.sync.get(['spreadsheetUrl'], (result) => {
        if (result.spreadsheetUrl) {
          chrome.tabs.create({ url: result.spreadsheetUrl });
        } else {
          // Use fallback URL
          const fallbackUrl = 'https://docs.google.com/spreadsheets/d/1UkGu6HObPNo6cPojBzhYeFxNVMkTksrsANTuSGKloJA';
          chrome.tabs.create({ url: fallbackUrl });
        }
      });
    },

    // Test connection
    async testConnection() {
      const originalText = this.buttons.testConnection.text;
      this.buttons.testConnection.text = '테스트 중...';
      this.buttons.testConnection.disabled = true;

      try {
        // Test server connection
        const serverResponse = await fetch(`${this.serverUrl}/health`);

        // Test Google Sheets connection
        const sheetsResponse = await fetch(`${this.serverUrl}/api/test-sheets`);

        let message = '연결 테스트 결과:\n';
        message += `서버: ${serverResponse.ok ? '✅' : '❌'}\n`;
        message += `구글 시트: ${sheetsResponse.ok ? '✅' : '❌'}`;

        this.showNotification(message);
      } catch (error) {
        this.showNotification('연결 테스트 실패: ' + error.message);
      } finally {
        this.buttons.testConnection.text = originalText;
        this.buttons.testConnection.disabled = false;
      }
    },

    // Collect channel
    async collectChannel() {
      const originalText = this.buttons.collectChannel.text;

      try {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check if it's a YouTube channel page
        const isChannelPage = tab.url.includes('/channel/') ||
                             tab.url.includes('/@') ||
                             tab.url.includes('/c/') ||
                             tab.url.includes('/user/');

        if (!isChannelPage) {
          this.showNotification('❌ YouTube 채널 페이지에서만 사용할 수 있습니다.');
          return;
        }

        // Update button state
        this.buttons.collectChannel.text = '수집 중...';
        this.buttons.collectChannel.disabled = true;

        // Send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'showChannelCollectModal'
        });

        if (response && response.success) {
          // Close popup to let user work with modal
          window.close();
        } else {
          throw new Error(response?.error || '채널 수집 기능을 찾을 수 없습니다.');
        }

      } catch (error) {
        console.error('채널 수집 실패:', error);
        this.showNotification('❌ 채널 수집 실패: ' + error.message);

        // Restore button state with error indication
        this.buttons.collectChannel.text = '실패';
        this.buttons.collectChannel.style = 'background: #f44336;';
        setTimeout(() => {
          this.buttons.collectChannel.text = originalText;
          this.buttons.collectChannel.style = '';
          this.buttons.collectChannel.disabled = false;
        }, 2000);
      }
    },

    // Sync Instagram cookies (placeholder)
    async syncInstagramCookies() {
      console.log('🍪 Instagram 쿠키 동기화 버튼 클릭됨 - 현재 비활성화됨');

      this.buttons.syncCookies.text = '🚧 준비 중';
      this.buttons.syncCookies.disabled = true;

      setTimeout(() => {
        this.buttons.syncCookies.text = '🍪 Instagram 쿠키 동기화';
        this.buttons.syncCookies.disabled = false;
      }, 2000);
    },

    // Show notification
    showNotification(message) {
      this.notification.message = message;
      this.notification.visible = true;

      setTimeout(() => {
        this.notification.visible = false;
      }, 3000);
    }
  };
}