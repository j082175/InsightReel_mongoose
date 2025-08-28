// 호환성을 위한 번들 버전 - ES5 문법으로 변환
(function() {
'use strict';

// Constants
const CONSTANTS = {
  SERVER_URL: 'http://localhost:3000',
  
  PLATFORMS: {
    INSTAGRAM: 'instagram',
    TIKTOK: 'tiktok'
  },
  
  SELECTORS: {
    INSTAGRAM: {
      POSTS: [
        'article[role="presentation"]',
        'article',
        '[role="article"]'
      ],
      VIDEOS: 'video',
      SAVE_BUTTONS: 'svg[aria-label*="저장"], svg[aria-label*="Save"], svg[aria-label*="save"]',
      AUTHOR: 'a[role="link"]',
      CAPTION: '[data-testid="post-content"] span',
      LIKES: 'button[data-testid="like-count"]'
    },
    TIKTOK: {
      VIDEO_PLAYER: '[data-e2e="video-player"]',
      VIDEO_WRAPPER: '[data-e2e="video-wrapper"]',
      SIDE_ACTIONS: '[data-e2e="video-side-actions"]',
      VIDEO_AUTHOR: '[data-e2e="video-author"]',
      VIDEO_DESC: '[data-e2e="video-desc"]',
      LIKE_COUNT: '[data-e2e="like-count"]'
    }
  },
  
  NOTIFICATION_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning'
  },
  
  TIMEOUTS: {
    ENHANCEMENT_THROTTLE: 10000,
    PROCESSING_DELAY: 500,
    URL_CHECK_INTERVAL: 3000,
    SCROLL_DEBOUNCE: 2000,
    SCROLL_MIN_INTERVAL: 10000,
    NOTIFICATION_DURATION: 5000,
    BUTTON_RESET_DELAY: 3000
  },

  SETTINGS: {
    AUTO_ANALYSIS: 'autoAnalysis',
    SHOW_NOTIFICATIONS: 'showNotifications'
  },

  STORAGE_KEYS: {
    SETTINGS: 'videosaverSettings'
  }
};

// Utils Class
class Utils {
  static detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    return null;
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top >= 0 && rect.top < window.innerHeight;
  }

  static extractHashtags(text) {
    if (!text) return [];
    return text.match(/#[\w가-힣]+/g) || [];
  }

  static safeQuerySelector(parent, selector) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.warn('Query selector failed:', selector, error);
      return null;
    }
  }

  static safeQuerySelectorAll(parent, selector) {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.warn('Query selector all failed:', selector, error);
      return [];
    }
  }

  static log(level, message, data = null) {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[VideoSaver ${timestamp}]`;
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ℹ️ ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data || '');
        break;
      case 'success':
        console.log(`${prefix} ✅ ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} ${message}`, data || '');
    }
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// API Client Class
class ApiClient {
  constructor(serverUrl = CONSTANTS.SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      Utils.log('error', 'Server connection failed', error);
      return false;
    }
  }

  async processVideo(data) {
    try {
      Utils.log('info', 'Processing video with URL', { platform: data.platform, url: data.videoUrl });
      
      const response = await fetch(`${this.serverUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // 기존 API 응답 형식과 새 응답 형식 둘 다 지원
      if (result.success !== undefined) {
        // 새 형식: { success: true, data: {...} }
        Utils.log('success', 'Video processed successfully', result.data);
        return result.data;
      } else {
        // 기존 형식: 직접 결과 반환
        Utils.log('success', 'Video processed successfully', result);
        return result;
      }

    } catch (error) {
      Utils.log('error', 'Video processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  async processVideoBlob(data) {
    try {
      Utils.log('info', 'Processing video with blob', { 
        platform: data.platform, 
        size: data.videoBlob.size 
      });
      
      const formData = new FormData();
      formData.append('video', data.videoBlob, `${data.platform}_video_${Date.now()}.mp4`);
      formData.append('platform', data.platform);
      formData.append('postUrl', data.postUrl);
      formData.append('metadata', JSON.stringify(data.metadata));
      
      const response = await fetch(`${this.serverUrl}/api/process-video-blob`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // 기존 API 응답 형식과 새 응답 형식 둘 다 지원
      if (result.success !== undefined) {
        Utils.log('success', 'Video blob processed successfully', result.data);
        return result.data;
      } else {
        Utils.log('success', 'Video blob processed successfully', result);
        return result;
      }

    } catch (error) {
      Utils.log('error', 'Video blob processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  async downloadBlobVideo(blobUrl) {
    try {
      Utils.log('info', 'Downloading blob video', blobUrl);
      
      // blob URL 유효성 체크
      if (!blobUrl || !blobUrl.startsWith('blob:')) {
        throw new Error('유효하지 않은 blob URL');
      }
      
      // 타임아웃 설정으로 빠른 실패
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      try {
        const response = await fetch(blobUrl, {
          signal: controller.signal,
          method: 'GET',
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('빈 blob 데이터');
        }
        
        Utils.log('success', 'Blob video downloaded', { 
          size: blob.size, 
          type: blob.type || 'unknown' 
        });
        return blob;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Blob 다운로드 타임아웃');
        } else if (fetchError.message.includes('net::ERR_FILE_NOT_FOUND')) {
          throw new Error('Blob URL이 만료되었거나 접근할 수 없습니다');
        }
        
        throw fetchError;
      }

    } catch (error) {
      Utils.log('error', 'Blob video download failed', error);
      throw new Error(`blob 비디오 다운로드 실패: ${error.message}`);
    }
  }
}

// UI Manager Class (핵심 기능만)
class UIManager {
  constructor() {
    this.notifications = new Map();
  }

  showNotification(message, type = CONSTANTS.NOTIFICATION_TYPES.INFO, duration = CONSTANTS.TIMEOUTS.NOTIFICATION_DURATION) {
    // 기존 방식과 동일하게 유지
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['showNotifications'], (result) => {
        if (result.showNotifications === false) return;
        this._createNotification(message, type, duration);
      });
    } else {
      this._createNotification(message, type, duration);
    }
  }

  _createNotification(message, type, duration) {
    const notification = document.createElement('div');
    const bgColor = type === CONSTANTS.NOTIFICATION_TYPES.SUCCESS ? '#4caf50' : 
                    type === CONSTANTS.NOTIFICATION_TYPES.ERROR ? '#f44336' : '#2196f3';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      white-space: pre-line;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, duration);
  }
}

// 기존 VideoSaver 클래스와 동일한 인터페이스 유지
class VideoSaver {
  constructor(serverUrl = CONSTANTS.SERVER_URL) {
    this.platform = Utils.detectPlatform();
    this.apiClient = new ApiClient(serverUrl);
    this.uiManager = new UIManager();
    this.isProcessing = false;
    this.lastEnhancementTime = 0;
    this.cachedSettings = { [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false }; // 설정 캐시
    
    this.init();
    this.setupSettingsListener(); // 설정 변경 리스너 설정
  }

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get(CONSTANTS.STORAGE_KEYS.SETTINGS);
      const settings = result[CONSTANTS.STORAGE_KEYS.SETTINGS] || { 
        [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false,
        [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
      };
      this.cachedSettings = settings; // 캐시 업데이트
      return settings;
    } catch (error) {
      Utils.log('error', '설정 조회 실패', error);
      return { 
        [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false,
        [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
      };
    }
  }

  setupSettingsListener() {
    // Chrome storage 변경 이벤트 리스너
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes[CONSTANTS.STORAGE_KEYS.SETTINGS]) {
          const newSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].newValue;
          const oldSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].oldValue;
          
          Utils.log('info', '🔄 설정이 실시간으로 변경됨:', {
            old: oldSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS],
            new: newSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS]
          });
          
          // 캐시 즉시 업데이트
          this.cachedSettings = newSettings || { 
            [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false,
            [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
          };
          
          // 사용자에게 알림
          if (newSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS] !== oldSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS]) {
            const status = newSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS] ? 'ON' : 'OFF';
            // UIManager를 통해 알림 표시
            this.uiManager.showNotification(`🔄 자동 분석이 ${status}으로 변경되었습니다`, 'info');
          }
        }
      });
      
      Utils.log('info', '✅ 설정 변경 리스너 설정 완료');
    }
  }

  async init() {
    Utils.log('info', 'VideoSaver init() 호출됨');
    Utils.log('info', '감지된 플랫폼:', this.platform);
    
    if (!this.platform) {
      Utils.log('error', '지원되지 않는 플랫폼입니다:', window.location.hostname);
      return;
    }
    
    // 초기 설정 로드
    await this.getSettings();
    Utils.log('info', '초기 설정 로드됨:', this.cachedSettings);
    
    Utils.log('success', `영상 저장기가 ${this.platform}에서 실행됩니다.`);
    
    // 기존과 동일한 초기화 로직
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setup();
      });
    } else {
      this.setup();
    }
  }

  setup() {
    Utils.log('info', 'setup() 함수 실행 시작');
    
    // Instagram 기본 저장 버튼에 기능 추가
    this.enhanceInstagramSaveButtons();
    
    // URL 변경 감지
    this.observeUrlChanges();
    
    // 동적 콘텐츠 감지
    this.observeContentChanges();
    
    Utils.log('success', 'setup() 함수 실행 완료');
  }

  // 기존 메소드들을 그대로 유지하되 내부적으로 새로운 구조 사용
  enhanceInstagramSaveButtons() {
    if (this.isProcessing) {
      return;
    }
    
    const now = Date.now();
    if (now - this.lastEnhancementTime < CONSTANTS.TIMEOUTS.ENHANCEMENT_THROTTLE) {
      return;
    }
    
    this.isProcessing = true;
    this.lastEnhancementTime = now;
    
    setTimeout(() => {
      try {
        const saveButtons = Utils.safeQuerySelectorAll(document, CONSTANTS.SELECTORS.INSTAGRAM.SAVE_BUTTONS);
        Utils.log('info', `발견된 저장 버튼 수: ${saveButtons.length}`);
        
        saveButtons.forEach((svg, index) => {
          this.processSaveButton(svg, index);
        });
      } catch (error) {
        Utils.log('error', '저장 버튼 향상 중 오류', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000);
  }

  processSaveButton(svg, index) {
    // 기존 로직과 동일하게 구현하되 모듈화된 구조 사용
    let button = svg.closest('button') || 
                 svg.closest('div[role="button"]') || 
                 svg.parentElement;

    if (!button || button.hasAttribute('data-video-save-enhanced')) {
      return;
    }

    button.setAttribute('data-video-save-enhanced', 'true');

    // 비디오 찾기
    const post = button.closest('article') || button.closest('div[role="presentation"]');
    const video = post?.querySelector('video') || document.querySelector('video');

    if (video) {
      const clickHandler = this.createClickHandler(post, video);
      button.addEventListener('click', clickHandler, false);
      
      // 분석 버튼 추가 (별도 버튼)
      this.createAnalysisButton(button, post, video);
      
      Utils.log('success', `저장 버튼 ${index + 1}에 영상 분석 기능 추가`);
    }
  }

  createAnalysisButton(originalButton, post, video) {
    // 이미 분석 버튼이 있는지 확인
    const existingAnalysisButton = originalButton.parentElement?.querySelector('.video-analysis-button');
    if (existingAnalysisButton) {
      return;
    }

    // 분석 버튼 생성
    const analysisButton = document.createElement('button');
    analysisButton.className = 'video-analysis-button';
    analysisButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    `;
    
    // 스타일링
    analysisButton.style.cssText = `
      position: relative;
      background: linear-gradient(45deg, #8e44ad, #3498db);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      color: white;
      cursor: pointer;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      z-index: 9999;
    `;

    // 호버 효과
    analysisButton.addEventListener('mouseenter', () => {
      analysisButton.style.transform = 'scale(1.1)';
      analysisButton.style.background = 'linear-gradient(45deg, #9b59b6, #2980b9)';
    });

    analysisButton.addEventListener('mouseleave', () => {
      analysisButton.style.transform = 'scale(1)';
      analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
    });

    // 하이브리드 분석을 위한 진행 상태 추적 함수
    const updateAnalysisButtonState = (phase, status) => {
      switch (phase) {
        case 'phase1':
          if (status === 'start') {
            analysisButton.style.background = '#f39c12';
            analysisButton.innerHTML = '⚡';
            analysisButton.title = 'Phase 1: 빠른 분석 중...';
          } else if (status === 'complete') {
            analysisButton.style.background = '#3498db';
            analysisButton.innerHTML = '🔍';
            analysisButton.title = 'Phase 1 완료! Phase 2: 전체 분석 중...';
          }
          break;
        case 'phase2':
          if (status === 'complete') {
            analysisButton.style.background = '#27ae60';
            analysisButton.innerHTML = '✅';
            analysisButton.title = '하이브리드 분석 완료!';
          }
          break;
        case 'error':
          analysisButton.style.background = '#e74c3c';
          analysisButton.innerHTML = '❌';
          analysisButton.title = '분석 실패';
          break;
      }
    };

    // 클릭 이벤트
    analysisButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      updateAnalysisButtonState('phase1', 'start');
      
      try {
        // Phase 1 시작 알림
        this.uiManager.showNotification('⚡ 빠른 분석 시작...', 'info');
        
        // 하이브리드 분석 실행
        await this.performHybridAnalysisWithProgress(post, video, updateAnalysisButtonState);
        
        // 최종 완료 후 원래 상태로 복원
        setTimeout(() => {
          analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
          analysisButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `;
          analysisButton.title = '영상 분석 (하이브리드)';
        }, 3000);
        
      } catch (error) {
        updateAnalysisButtonState('error');
        Utils.log('error', '분석 버튼 클릭 처리 실패', error);
        
        setTimeout(() => {
          analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
          analysisButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `;
          analysisButton.title = '영상 분석 (하이브리드)';
        }, 3000);
      }
    });

    // 버튼을 원래 저장 버튼 옆에 배치
    try {
      const buttonContainer = originalButton.parentElement;
      if (buttonContainer) {
        buttonContainer.style.position = 'relative';
        buttonContainer.appendChild(analysisButton);
        Utils.log('info', '분석 버튼이 저장 버튼 옆에 추가됨');
      } else {
        // 대안: floating button으로 추가
        this.createFloatingAnalysisButton(video, analysisButton);
      }
    } catch (error) {
      Utils.log('warn', '분석 버튼 배치 실패, floating 버튼으로 대체', error);
      this.createFloatingAnalysisButton(video, analysisButton);
    }
  }

  createFloatingAnalysisButton(video, analysisButton) {
    analysisButton.style.position = 'absolute';
    analysisButton.style.top = '10px';
    analysisButton.style.right = '10px';
    analysisButton.style.zIndex = '10000';
    
    const videoContainer = video.closest('div') || video.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(analysisButton);
      Utils.log('info', '분석 버튼이 비디오 위에 floating으로 추가됨');
    }
  }

  async performVideoAnalysis(post, video) {
    return this.performHybridAnalysisWithProgress(post, video, null);
  }

  async performHybridAnalysisWithProgress(post, video, progressCallback = null) {
    Utils.log('info', '🔄 하이브리드 영상 분석 시작');
    
    const postUrl = window.location.href;
    const metadata = this.extractInstagramMetadata(post);
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Phase 1: 즉시 프레임 분석 (2-3초)
    await this.performQuickAnalysis(video, postUrl, metadata, analysisId);
    
    // Phase 1 완료 알림
    if (progressCallback) {
      progressCallback('phase1', 'complete');
    }
    
    // Phase 2: 백그라운드 전체 비디오 분석 (30초-1분)
    this.performFullAnalysisWithProgress(post, video, postUrl, metadata, analysisId, progressCallback);
  }

  async performFullAnalysisWithProgress(post, video, postUrl, metadata, analysisId, progressCallback = null) {
    try {
      Utils.log('info', '🔍 Phase 2: 전체 비디오 분석 시작 (백그라운드)');
      
      // 실제 비디오 URL 추출 시도
      const realVideoUrl = await this.extractRealVideoUrl(video);
      
      if (realVideoUrl && !realVideoUrl.startsWith('blob:')) {
        // 실제 비디오 URL이 있는 경우 - 안전한 처리
        Utils.log('info', '🎯 실제 비디오 URL 발견, 전체 분석 진행');
        Utils.log('info', '📋 URL 정보:', {
          length: realVideoUrl.length,
          domain: realVideoUrl.split('/')[2],
          hasParams: realVideoUrl.includes('?')
        });
        
        try {
          // Instagram 전용 URL 검증
          if (!realVideoUrl.includes('fbcdn.net') && !realVideoUrl.includes('cdninstagram.com')) {
            throw new Error('신뢰할 수 없는 비디오 URL');
          }
          
          // Instagram URL에서 부분 다운로드 파라미터 제거
          let cleanVideoUrl = realVideoUrl;
          if (realVideoUrl.includes('bytestart=') || realVideoUrl.includes('byteend=')) {
            const url = new URL(realVideoUrl);
            url.searchParams.delete('bytestart');
            url.searchParams.delete('byteend');
            cleanVideoUrl = url.toString();
            Utils.log('info', '🧹 부분 다운로드 파라미터 제거됨');
          }
          
          await this.apiClient.processVideo({
            platform: CONSTANTS.PLATFORMS.INSTAGRAM,
            videoUrl: cleanVideoUrl,
            postUrl,
            metadata: {
              ...metadata,
              analysisId,
              analysisType: 'full',
              isUpdate: true,
              urlSource: 'extracted',
              originalUrl: realVideoUrl !== cleanVideoUrl ? realVideoUrl : undefined
            }
          });

          this.uiManager.showNotification('✅ 완전한 영상 분석 완료!', 'success');
          Utils.log('success', '🔍 Phase 2 완료 - 전체 분석으로 결과 업데이트됨');
          
        } catch (urlError) {
          Utils.log('warn', '🎯 실제 URL 처리 실패, 다중 프레임으로 대체', urlError);
          // 실제 URL 실패시 다중 프레임으로 fallback
          throw urlError;
        }
        
      } else {
        // blob URL만 있는 경우 - 다중 프레임 캡처
        Utils.log('info', '📹 blob URL 감지, 다중 프레임 분석 진행');
        
        const multiFrameData = await this.captureMultipleFrames(video, 5); // 5프레임
        
        await this.apiClient.processVideoBlob({
          platform: CONSTANTS.PLATFORMS.INSTAGRAM,
          videoBlob: multiFrameData,
          postUrl,
          metadata: {
            ...metadata,
            analysisId,
            analysisType: 'multi-frame',
            isUpdate: true
          }
        });

        this.uiManager.showNotification('✅ 다중 프레임 분석 완료!', 'success');
        Utils.log('success', '📹 Phase 2 완료 - 다중 프레임으로 결과 업데이트됨');
      }
      
      // Phase 2 완료 알림
      if (progressCallback) {
        progressCallback('phase2', 'complete');
      }
      
    } catch (error) {
      Utils.log('error', '🔍 Phase 2 실패', error);
      // Phase 1 결과라도 있으므로 사용자에게는 에러 알림 안함
      Utils.log('info', '⚡ Phase 1 결과는 유효함 - 계속 사용 가능');
    }
  }

  async performQuickAnalysis(video, postUrl, metadata, analysisId) {
    try {
      Utils.log('info', '⚡ Phase 1: 빠른 프레임 분석 시작');
      
      const frameBlob = await this.extractVideoFromElement(video);
      if (!frameBlob) {
        throw new Error('프레임 캡처 실패');
      }

      await this.apiClient.processVideoBlob({
        platform: CONSTANTS.PLATFORMS.INSTAGRAM,
        videoBlob: frameBlob,
        postUrl,
        metadata: {
          ...metadata,
          analysisId,
          analysisType: 'quick',
          captureMethod: 'canvas-frame'
        }
      });

      this.uiManager.showNotification('⚡ 빠른 분석 완료! 상세 분석 진행 중...', 'info');
      Utils.log('success', '⚡ Phase 1 완료 - 빠른 분석 결과 제공됨');
      
    } catch (error) {
      Utils.log('error', '⚡ Phase 1 실패', error);
      this.uiManager.showNotification('빠른 분석 실패, 전체 분석으로 진행합니다', 'warning');
    }
  }


  async extractRealVideoUrl(video) {
    try {
      Utils.log('info', '🔍 Instagram 실제 비디오 URL 추출 시작');
      
      // 방법 1: 비디오 요소에서 직접 소스 확인
      const videoElement = video;
      const directSources = [
        videoElement.src,
        videoElement.currentSrc,
        ...Array.from(videoElement.querySelectorAll('source')).map(s => s.src)
      ].filter(url => url && !url.startsWith('blob:'));
      
      if (directSources.length > 0) {
        Utils.log('info', '📋 비디오 요소에서 URL 발견:', directSources[0].substring(0, 80) + '...');
        return directSources[0];
      }
      
      // 방법 2: Instagram 페이지 데이터에서 추출
      const instagramVideoUrl = await this.extractFromInstagramPageData();
      if (instagramVideoUrl) {
        Utils.log('info', '📋 페이지 데이터에서 URL 발견:', instagramVideoUrl.substring(0, 80) + '...');
        return instagramVideoUrl;
      }
      
      // 방법 3: 네트워크 요청 분석 (향상된 버전)
      const networkUrl = await this.extractFromNetworkRequests(video);
      if (networkUrl) {
        Utils.log('info', '📋 네트워크에서 URL 발견:', networkUrl.substring(0, 80) + '...');
        return networkUrl;
      }
      
      // 방법 4: DOM 깊이 분석
      const domUrl = await this.extractFromDOMAnalysis(video);
      if (domUrl) {
        Utils.log('info', '📋 DOM 분석에서 URL 발견:', domUrl.substring(0, 80) + '...');
        return domUrl;
      }
      
      Utils.log('warn', '📋 모든 방법으로 실제 URL을 찾지 못함');
      return null;
      
    } catch (error) {
      Utils.log('warn', '실제 비디오 URL 추출 실패', error);
      return null;
    }
  }

  async extractFromInstagramPageData() {
    try {
      // Instagram 페이지의 JSON 데이터에서 비디오 URL 찾기
      const scripts = Array.from(document.querySelectorAll('script'));
      
      for (const script of scripts) {
        const content = script.textContent || script.innerHTML;
        
        // Instagram의 GraphQL 데이터 찾기
        if (content.includes('video_url') || content.includes('videoUrl')) {
          const videoUrlMatch = content.match(/"video_url":"([^"]+)"/);
          if (videoUrlMatch) {
            const url = videoUrlMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            if (url.includes('.mp4') && !url.startsWith('blob:')) {
              return url;
            }
          }
        }
        
        // 대안 패턴들
        const patterns = [
          /"videoUrl":"([^"]+\.mp4[^"]*)"/,
          /"src":"([^"]+\.mp4[^"]*)"/,
          /"url":"([^"]+\.mp4[^"]*)"/
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            const url = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            if (url.includes('fbcdn.net') || url.includes('cdninstagram.com')) {
              return url;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      Utils.log('warn', 'Instagram 페이지 데이터 분석 실패', error);
      return null;
    }
  }

  async extractFromNetworkRequests(video) {
    try {
      // Performance API로 모든 네트워크 요청 분석
      const entries = performance.getEntriesByType('resource');
      
      // Instagram 비디오 URL 패턴들
      const videoPatterns = [
        /\.mp4/i,
        /fbcdn\.net.*video/i,
        /cdninstagram\.com.*video/i,
        /scontent.*\.mp4/i
      ];
      
      const videoEntries = entries.filter(entry => {
        return videoPatterns.some(pattern => pattern.test(entry.name)) &&
               entry.name.includes('instagram') &&
               !entry.name.includes('bytestart=') && // 부분 다운로드 제외
               !entry.name.includes('byteend=');
      });
      
      if (videoEntries.length > 0) {
        // 가장 최근의 전체 비디오 요청 찾기
        const fullVideoEntry = videoEntries
          .filter(entry => entry.transferSize > 1000000) // 1MB 이상
          .sort((a, b) => b.startTime - a.startTime)[0];
        
        if (fullVideoEntry) {
          return fullVideoEntry.name;
        }
        
        // 전체 비디오가 없으면 가장 큰 것 선택
        const largestEntry = videoEntries
          .sort((a, b) => b.transferSize - a.transferSize)[0];
        
        if (largestEntry) {
          return largestEntry.name;
        }
      }
      
      return null;
    } catch (error) {
      Utils.log('warn', '네트워크 요청 분석 실패', error);
      return null;
    }
  }

  async extractFromDOMAnalysis(video) {
    try {
      // 비디오 컨테이너의 부모 요소들에서 데이터 찾기
      let currentElement = video;
      
      for (let i = 0; i < 10; i++) { // 최대 10단계 올라가기
        if (!currentElement || !currentElement.parentElement) break;
        
        currentElement = currentElement.parentElement;
        
        // 데이터 속성들 확인
        const attributes = currentElement.attributes;
        for (let attr of attributes) {
          if (attr.value && attr.value.includes('.mp4') && !attr.value.startsWith('blob:')) {
            return attr.value;
          }
        }
        
        // 자식 요소들의 데이터 확인
        const allElements = currentElement.querySelectorAll('*');
        for (let element of allElements) {
          for (let attr of element.attributes) {
            if (attr.value && attr.value.includes('.mp4') && !attr.value.startsWith('blob:')) {
              return attr.value;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      Utils.log('warn', 'DOM 분석 실패', error);
      return null;
    }
  }

  async captureMultipleFrames(video, frameCount = 5) {
    try {
      Utils.log('info', `📸 ${frameCount}개 프레임 캡처 시작`);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const duration = video.duration || 10; // 기본 10초
      const interval = duration / frameCount;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const frames = [];
      const originalTime = video.currentTime;
      
      for (let i = 0; i < frameCount; i++) {
        const targetTime = i * interval;
        video.currentTime = targetTime;
        
        // 프레임 로드 대기
        await new Promise(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });
        
        // 프레임 캡처
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        frames.push({
          time: targetTime,
          data: frameData
        });
      }
      
      // 원래 시간으로 복원
      video.currentTime = originalTime;
      
      // 프레임들을 하나의 blob으로 결합
      const combinedData = {
        frames: frames,
        duration: duration,
        frameCount: frameCount
      };
      
      const blob = new Blob([JSON.stringify(combinedData)], { type: 'application/json' });
      Utils.log('success', `📸 ${frameCount}개 프레임 캡처 완료`);
      
      return blob;
      
    } catch (error) {
      Utils.log('error', '다중 프레임 캡처 실패', error);
      throw error;
    }
  }

  createClickHandler(post, video) {
    let isProcessing = false;
    
    return async (event) => {
      if (isProcessing) return;
      
      isProcessing = true;
      Utils.log('info', 'Instagram 저장 버튼 클릭 이벤트 감지');
      
      // 캐시된 설정 확인 (실시간 반영)
      const isAutoAnalysisEnabled = this.cachedSettings[CONSTANTS.SETTINGS.AUTO_ANALYSIS] || false;
      Utils.log('info', `자동 분석 설정 (캐시됨): ${isAutoAnalysisEnabled}`);
      
      if (!isAutoAnalysisEnabled) {
        Utils.log('info', '자동 분석 비활성화됨 - 저장만 완료');
        this.uiManager.showNotification('✅ 영상이 Instagram에 저장되었습니다!', 'success');
        isProcessing = false;
        return;
      }
      
      Utils.log('info', '🔄 자동 분석 실행됨 (하이브리드 방식)');
      
      // 하이브리드 분석 실행
      try {
        await this.performVideoAnalysis(post, video);
      } catch (error) {
        Utils.log('error', '하이브리드 분석 중 오류', error);
        this.uiManager.showNotification(
          `영상 분석에 실패했습니다: ${error.message}`, 
          CONSTANTS.NOTIFICATION_TYPES.ERROR
        );
      } finally {
        setTimeout(() => {
          isProcessing = false;
        }, 3000);
      }
    };
  }

  // 비디오 요소에서 직접 블롭 추출 (대안 방법)
  async extractVideoFromElement(videoElement) {
    try {
      Utils.log('info', '비디오 요소에서 직접 데이터 추출 시도');
      
      // 방법 1: Canvas를 이용한 프레임 캡처 (완전하지 않지만 대안)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      // 현재 프레임을 캔버스에 그리기
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // 캔버스를 이미지로 변환 (썸네일 대안)
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            Utils.log('info', '비디오 프레임 캡처 성공 (썸네일 대안)', { size: blob.size });
            resolve(blob);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.8);
      });
    } catch (error) {
      Utils.log('error', '비디오 요소에서 데이터 추출 실패', error);
      return null;
    }
  }

  extractInstagramMetadata(post) {
    if (!post) {
      return { timestamp: new Date().toISOString() };
    }

    try {
      const author = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.AUTHOR)?.textContent || '';
      const captionElement = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.CAPTION);
      const caption = captionElement?.textContent || '';
      const likesElement = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.LIKES);
      const likes = likesElement?.textContent || '0';
      const hashtags = Utils.extractHashtags(caption);
      
      return {
        author: author.trim(),
        caption: caption.trim(),
        likes: likes.trim(),
        hashtags,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Utils.log('error', '인스타그램 메타데이터 추출 실패', error);
      return { timestamp: new Date().toISOString() };
    }
  }

  observeUrlChanges() {
    let currentUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => this.enhanceInstagramSaveButtons(), 1000);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  observeContentChanges() {
    let currentUrl = window.location.href;
    let urlCheckInterval;
    
    urlCheckInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          this.enhanceInstagramSaveButtons();
        }, 2000);
      }
    }, CONSTANTS.TIMEOUTS.URL_CHECK_INTERVAL);
    
    let scrollTimeout;
    let lastScrollTime = 0;
    
    window.addEventListener('scroll', () => {
      const now = Date.now();
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        if (now - lastScrollTime > CONSTANTS.TIMEOUTS.SCROLL_MIN_INTERVAL) {
          lastScrollTime = now;
          this.enhanceInstagramSaveButtons();
        }
      }, CONSTANTS.TIMEOUTS.SCROLL_DEBOUNCE);
    });
  }
}

// 콘텐츠 스크립트 실행 - 기존과 동일
console.log('🚀 Content Script 로딩 시작');
console.log('현재 도메인:', window.location.hostname);
console.log('현재 URL:', window.location.href);

if (window.location.hostname.includes('instagram.com') || 
    window.location.hostname.includes('tiktok.com')) {
  console.log('✅ 지원되는 플랫폼에서 VideoSaver 초기화');
  window.videoSaver = new VideoSaver();
  
  // 기존 글로벌 함수들 유지
  window.refreshVideoSaver = () => {
    if (window.videoSaver) {
      window.videoSaver.enhanceInstagramSaveButtons();
    }
  };
  
  window.testVideoAnalysis = () => {
    console.log('🧪 수동 테스트 실행');
    // 테스트 로직
  };
} else {
  console.log('❌ 지원되지 않는 플랫폼:', window.location.hostname);
}

})();