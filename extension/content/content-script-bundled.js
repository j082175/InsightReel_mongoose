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
      
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      Utils.log('success', 'Blob video downloaded', { size: blob.size });
      return blob;

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
    
    this.init();
  }

  init() {
    Utils.log('info', 'VideoSaver init() 호출됨');
    Utils.log('info', '감지된 플랫폼:', this.platform);
    
    if (!this.platform) {
      Utils.log('error', '지원되지 않는 플랫폼입니다:', window.location.hostname);
      return;
    }
    
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
      Utils.log('success', `저장 버튼 ${index + 1}에 영상 분석 기능 추가`);
    }
  }

  createClickHandler(post, video) {
    let isProcessing = false;
    
    return async (event) => {
      if (isProcessing) return;
      
      isProcessing = true;
      Utils.log('info', 'Instagram 저장 버튼 클릭 이벤트 감지');
      
      try {
        await Utils.delay(CONSTANTS.TIMEOUTS.PROCESSING_DELAY);
        
        const videoUrl = video.src || video.currentSrc;
        const postUrl = window.location.href;
        const metadata = this.extractInstagramMetadata(post);
        
        if (videoUrl && videoUrl.startsWith('blob:')) {
          const videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
          await this.apiClient.processVideoBlob({
            platform: CONSTANTS.PLATFORMS.INSTAGRAM,
            videoBlob,
            postUrl,
            metadata
          });
        } else {
          await this.apiClient.processVideo({
            platform: CONSTANTS.PLATFORMS.INSTAGRAM,
            videoUrl,
            postUrl,
            metadata
          });
        }
        
        this.uiManager.showNotification(
          '✅ 영상이 Instagram에 저장되고 AI 분석도 완료되었습니다!', 
          CONSTANTS.NOTIFICATION_TYPES.SUCCESS
        );
        
      } catch (error) {
        Utils.log('error', '클릭 처리 중 오류', error);
        this.uiManager.showNotification(
          `Instagram 저장은 완료되었지만 AI 분석에 실패했습니다: ${error.message}`, 
          CONSTANTS.NOTIFICATION_TYPES.WARNING
        );
      } finally {
        setTimeout(() => {
          isProcessing = false;
        }, 5000);
      }
    };
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