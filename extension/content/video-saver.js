import { CONSTANTS } from './constants.js';
import { Utils, TimeUtils } from './utils.js';
import { ApiClient } from './api-client.js';
import { UIManager } from './ui-manager.js';
import { InstagramHandler } from './platforms/instagram-handler.js';
import { TikTokHandler } from './platforms/tiktok-handler.js';
import { YouTubeHandler } from './platforms/youtube-handler.js';

/**
 * 메인 VideoSaver 클래스 - 리팩토링된 버전
 */
export class VideoSaver {
  constructor(serverUrl = CONSTANTS.SERVER_URL) {
    this.platform = Utils.detectPlatform();
    this.apiClient = new ApiClient(serverUrl);
    this.uiManager = new UIManager();
    
    // 플랫폼별 핸들러
    this.platformHandlers = {
      [CONSTANTS.PLATFORMS.INSTAGRAM]: new InstagramHandler(this.apiClient, this.uiManager),
      [CONSTANTS.PLATFORMS.TIKTOK]: new TikTokHandler(this.apiClient, this.uiManager),
      [CONSTANTS.PLATFORMS.YOUTUBE]: new YouTubeHandler(this.apiClient, this.uiManager)
    };
    
    this.currentHandler = null;
    this.isInitialized = false;
    
    this.init();
  }

  /**
   * VideoSaver 초기화
   */
  init() {
    Utils.log('info', 'VideoSaver 초기화 시작', {
      platform: this.platform,
      url: window.location.href
    });
    
    if (!this.platform) {
      Utils.log('warn', '지원되지 않는 플랫폼', window.location.hostname);
      return;
    }
    
    this.currentHandler = this.platformHandlers[this.platform];
    if (!this.currentHandler) {
      Utils.log('error', '플랫폼 핸들러를 찾을 수 없음', this.platform);
      return;
    }
    
    Utils.log('success', `VideoSaver가 ${this.platform}에서 실행됩니다`);
    
    // 페이지 로드 대기 후 설정
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * 설정 및 이벤트 리스너 등록
   */
  setup() {
    if (this.isInitialized) {
      Utils.log('info', '이미 초기화됨');
      return;
    }
    
    Utils.log('info', 'VideoSaver 설정 시작');
    
    try {
      // 서버 연결 확인
      this.checkServerConnection();
      
      // 플랫폼별 초기화
      this.initializePlatformSpecific();
      
      // 페이지 변경 감지 설정
      this.setupPageChangeDetection();
      
      // 설정 완료
      this.isInitialized = true;
      Utils.log('success', 'VideoSaver 설정 완료');
      
    } catch (error) {
      Utils.log('error', 'VideoSaver 설정 중 오류', error);
    }
  }

  /**
   * 서버 연결 확인 (비동기)
   */
  async checkServerConnection() {
    try {
      const isConnected = await this.apiClient.checkConnection();
      if (isConnected) {
        Utils.log('success', '서버 연결 확인됨');
      } else {
        Utils.log('warn', '서버 연결 실패 - 기본 모드로 실행');
        this.uiManager.showNotification(
          '로컬 서버에 연결할 수 없습니다. 서버를 시작해주세요.', 
          CONSTANTS.NOTIFICATION_TYPES.WARNING
        );
      }
    } catch (error) {
      Utils.log('error', '서버 연결 확인 중 오류', error);
    }
  }

  /**
   * 플랫폼별 초기화
   */
  initializePlatformSpecific() {
    switch (this.platform) {
      case CONSTANTS.PLATFORMS.INSTAGRAM:
        this.initializeInstagram();
        break;
      
      case CONSTANTS.PLATFORMS.TIKTOK:
        this.initializeTikTok();
        break;
      
      default:
        Utils.log('warn', '알 수 없는 플랫폼', this.platform);
    }
  }

  /**
   * Instagram 초기화
   */
  initializeInstagram() {
    Utils.log('info', 'Instagram 플랫폼 초기화');
    
    // 초기 저장 버튼 향상
    setTimeout(() => {
      this.currentHandler.enhanceSaveButtons();
    }, 2000);
    
    // 콘텐츠 변경 감지 설정
    this.setupInstagramContentObserver();
  }

  /**
   * TikTok 초기화
   */
  initializeTikTok() {
    Utils.log('info', 'TikTok 플랫폼 초기화');
    
    // 초기 저장 버튼 추가
    setTimeout(() => {
      this.currentHandler.addSaveButtons();
    }, 2000);
    
    // TikTok 특화 관찰자 설정
    this.currentHandler.observePageChanges();
    this.currentHandler.observeScrollChanges();
  }

  /**
   * 페이지 변경 감지 설정
   */
  setupPageChangeDetection() {
    let currentUrl = window.location.href;
    
    // URL 변경 감지 (SPA 네비게이션)
    const urlCheckInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        Utils.log('info', 'URL 변경 감지', currentUrl);
        
        // 플랫폼이 변경되었는지 확인
        const newPlatform = Utils.detectPlatform();
        if (newPlatform !== this.platform) {
          Utils.log('info', '플랫폼 변경 감지', { from: this.platform, to: newPlatform });
          this.handlePlatformChange(newPlatform);
          return;
        }
        
        // 같은 플랫폼 내에서 페이지 변경
        setTimeout(() => {
          this.handlePageChange();
        }, 2000);
      }
    }, CONSTANTS.TIMEOUTS.URL_CHECK_INTERVAL);
    
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
      clearInterval(urlCheckInterval);
      this.cleanup();
    });
  }

  /**
   * Instagram 콘텐츠 관찰자 설정
   */
  setupInstagramContentObserver() {
    let lastScrollTime = 0;
    
    const scrollHandler = Utils.debounce(() => {
      const now = Date.now();
      if (now - lastScrollTime > CONSTANTS.TIMEOUTS.SCROLL_MIN_INTERVAL) {
        lastScrollTime = now;
        Utils.log('info', 'Instagram 스크롤 기반 새 콘텐츠 스캔');
        this.currentHandler.enhanceSaveButtons();
      }
    }, CONSTANTS.TIMEOUTS.SCROLL_DEBOUNCE);
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  /**
   * 플랫폼 변경 처리
   * @param {string} newPlatform 새로운 플랫폼
   */
  handlePlatformChange(newPlatform) {
    Utils.log('info', '플랫폼 변경 처리 시작', { from: this.platform, to: newPlatform });
    
    // 기존 상태 정리
    this.cleanup();
    
    // 새 플랫폼으로 재초기화
    this.platform = newPlatform;
    this.currentHandler = this.platformHandlers[newPlatform];
    this.isInitialized = false;
    
    if (this.currentHandler) {
      setTimeout(() => {
        this.setup();
      }, 1000);
    }
  }

  /**
   * 페이지 변경 처리 (같은 플랫폼 내)
   */
  handlePageChange() {
    if (!this.currentHandler) return;
    
    Utils.log('info', '페이지 변경 처리');
    
    switch (this.platform) {
      case CONSTANTS.PLATFORMS.INSTAGRAM:
        this.currentHandler.enhanceSaveButtons();
        break;
      
      case CONSTANTS.PLATFORMS.TIKTOK:
        this.currentHandler.addSaveButtons();
        break;
    }
  }

  /**
   * 수동 새로고침 트리거
   */
  refresh() {
    Utils.log('info', '수동 새로고침 실행');
    
    if (this.currentHandler) {
      switch (this.platform) {
        case CONSTANTS.PLATFORMS.INSTAGRAM:
          this.currentHandler.enhanceSaveButtons();
          // 커스텀 버튼도 추가 (대안 방법)
          this.currentHandler.addCustomSaveButtons();
          break;
        
        case CONSTANTS.PLATFORMS.TIKTOK:
          this.currentHandler.addSaveButtons();
          break;
      }
    }
    
    this.uiManager.showNotification(
      '페이지를 새로고침했습니다', 
      CONSTANTS.NOTIFICATION_TYPES.INFO
    );
  }

  /**
   * 설정 업데이트
   * @param {Object} newSettings 새 설정
   */
  updateSettings(newSettings) {
    Utils.log('info', '설정 업데이트', newSettings);
    
    // API 클라이언트 업데이트
    if (newSettings.serverUrl && newSettings.serverUrl !== this.apiClient.serverUrl) {
      this.apiClient = new ApiClient(newSettings.serverUrl);
      
      // 핸들러들에 새 API 클라이언트 적용
      Object.values(this.platformHandlers).forEach(handler => {
        handler.apiClient = this.apiClient;
      });
    }
    
    // UI 설정 업데이트
    if (newSettings.showNotifications !== undefined) {
      chrome.storage.sync.set({ showNotifications: newSettings.showNotifications });
    }
  }

  /**
   * 통계 조회
   * @returns {Promise<Object>} 통계 정보
   */
  async getStats() {
    try {
      const serverStats = await this.apiClient.getStats();
      const localStats = {
        platform: this.platform,
        isInitialized: this.isInitialized,
        currentUrl: window.location.href,
        timestamp: new Date().toISOString()
      };
      
      return { ...serverStats, local: localStats };
    } catch (error) {
      Utils.log('error', '통계 조회 실패', error);
      return {
        local: {
          platform: this.platform,
          isInitialized: this.isInitialized,
          error: error.message
        }
      };
    }
  }

  /**
   * 정리 작업
   */
  cleanup() {
    Utils.log('info', 'VideoSaver 정리 작업 시작');
    
    // 알림 정리
    this.uiManager.clearAllNotifications();
    
    // 플랫폼별 정리
    if (this.currentHandler && typeof this.currentHandler.cleanup === 'function') {
      this.currentHandler.cleanup();
    }
    
    this.isInitialized = false;
    Utils.log('info', 'VideoSaver 정리 작업 완료');
  }

  /**
   * 오류 보고
   * @param {Error} error 오류 객체
   * @param {Object} context 컨텍스트 정보
   */
  reportError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      platform: this.platform,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      context
    };
    
    Utils.log('error', 'VideoSaver 오류 보고', errorInfo);
    
    // 사용자에게 오류 알림
    this.uiManager.showNotification(
      `오류가 발생했습니다: ${error.message}`, 
      CONSTANTS.NOTIFICATION_TYPES.ERROR
    );
  }
}

// 글로벌 접근을 위한 윈도우 객체에 등록 (개발 및 디버깅용)
if (typeof window !== 'undefined') {
  window.VideoSaver = VideoSaver;
}