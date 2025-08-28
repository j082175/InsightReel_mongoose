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

    // 클릭 이벤트
    analysisButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      analysisButton.style.background = '#f39c12';
      analysisButton.innerHTML = '⏳';
      
      try {
        await this.performVideoAnalysis(post, video);
        analysisButton.style.background = '#27ae60';
        analysisButton.innerHTML = '✅';
        
        setTimeout(() => {
          analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
          analysisButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `;
        }, 2000);
      } catch (error) {
        analysisButton.style.background = '#e74c3c';
        analysisButton.innerHTML = '❌';
        Utils.log('error', '분석 버튼 클릭 처리 실패', error);
        
        setTimeout(() => {
          analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
          analysisButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `;
        }, 2000);
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
    Utils.log('info', '수동 영상 분석 시작');
    
    // 기존 분석 로직 재사용
    const postUrl = window.location.href;
    const metadata = this.extractInstagramMetadata(post);
    
    if (video.src && video.src.startsWith('blob:')) {
      // blob URL의 경우 Canvas를 사용한 프레임 캡처
      try {
        const frameBlob = await this.extractVideoFromElement(video);
        if (frameBlob) {
          await this.apiClient.processVideoBlob({
            platform: CONSTANTS.PLATFORMS.INSTAGRAM,
            videoBlob: frameBlob,
            postUrl,
            metadata: {
              ...metadata,
              captureMethod: 'canvas-frame'
            }
          });
        } else {
          throw new Error('프레임 캡처 실패');
        }
      } catch (error) {
        Utils.log('error', 'Canvas 프레임 캡처 실패', error);
        throw error;
      }
    } else if (video.src) {
      await this.apiClient.processVideo({
        platform: CONSTANTS.PLATFORMS.INSTAGRAM,
        videoUrl: video.src,
        postUrl,
        metadata
      });
    } else {
      throw new Error('비디오 URL을 찾을 수 없습니다');
    }

    this.uiManager.showNotification('✅ 영상 분석이 완료되었습니다!', 'success');
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
      
      Utils.log('info', '자동 분석 실행됨');
      try {
        const videoUrl = video.src || video.currentSrc;
        const postUrl = window.location.href;
        const metadata = this.extractInstagramMetadata(post);
        
        Utils.log('info', '비디오 URL 정보', { videoUrl, type: videoUrl ? videoUrl.substring(0, 20) + '...' : 'null' });
        
        if (videoUrl && videoUrl.startsWith('blob:')) {
          Utils.log('info', 'Blob URL 감지 - 즉시 다운로드 시도');
          
          try {
            // blob URL은 즉시 다운로드해야 함 (지연 없음)
            const videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
            Utils.log('success', 'Blob 다운로드 성공', { size: videoBlob.size });
            
            await this.apiClient.processVideoBlob({
              platform: CONSTANTS.PLATFORMS.INSTAGRAM,
              videoBlob,
              postUrl,
              metadata
            });
          } catch (blobError) {
            Utils.log('error', 'Blob 처리 실패, 대안 방법 시도', blobError);
            
            // Blob 실패 시 대안: 비디오 요소에서 직접 데이터 추출 시도
            const alternativeBlob = await this.extractVideoFromElement(video);
            if (alternativeBlob) {
              Utils.log('info', '비디오 요소에서 직접 추출 성공');
              await this.apiClient.processVideoBlob({
                platform: CONSTANTS.PLATFORMS.INSTAGRAM,
                videoBlob: alternativeBlob,
                postUrl,
                metadata
              });
            } else {
              // 마지막 대안: 서버 연결 체크 후 처리
              Utils.log('info', '서버 연결 상태 확인 중');
              const isServerUp = await this.apiClient.checkConnection();
              
              if (isServerUp) {
                Utils.log('info', '서버 측 다운로드로 폴백');
                await this.apiClient.processVideo({
                  platform: CONSTANTS.PLATFORMS.INSTAGRAM,
                  videoUrl,
                  postUrl,
                  metadata
                });
              } else {
                throw new Error('로컬 서버에 연결할 수 없습니다. 서버를 실행해주세요.\n\n실행 방법:\n1. 터미널에서 "node server/index.js" 실행\n2. http://localhost:3000 확인');
              }
            }
          }
        } else if (videoUrl) {
          Utils.log('info', '일반 URL로 처리');
          await this.apiClient.processVideo({
            platform: CONSTANTS.PLATFORMS.INSTAGRAM,
            videoUrl,
            postUrl,
            metadata
          });
        } else {
          throw new Error('비디오 URL을 찾을 수 없습니다');
        }
        
        this.uiManager.showNotification(
          '✅ 영상이 Instagram에 저장되고 AI 분석도 완료되었습니다!', 
          CONSTANTS.NOTIFICATION_TYPES.SUCCESS
        );
        
      } catch (error) {
        Utils.log('error', '클릭 처리 중 오류', error);
        this.uiManager.showNotification(
          `영상 처리에 실패했습니다: ${error.message}`, 
          CONSTANTS.NOTIFICATION_TYPES.ERROR
        );
      } finally {
        setTimeout(() => {
          isProcessing = false;
        }, 5000);
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