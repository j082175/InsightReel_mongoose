import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';

/**
 * 설정 관리 클래스
 */
export class SettingsManager {
  constructor() {
    this.defaultSettings = {
      [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false, // 기본값: 수동 분석
      [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
    };
  }

  /**
   * 설정 초기화
   */
  async init() {
    try {
      const settings = await this.getSettings();
      Utils.log('info', '설정 초기화 완료', settings);
    } catch (error) {
      Utils.log('error', '설정 초기화 실패', error);
    }
  }

  /**
   * 모든 설정 조회
   * @returns {Promise<Object>} 설정 객체
   */
  async getSettings() {
    try {
      const result = await chrome.storage.sync.get(CONSTANTS.STORAGE_KEYS.SETTINGS);
      const savedSettings = result[CONSTANTS.STORAGE_KEYS.SETTINGS] || {};
      
      // 기본값과 저장된 설정 병합
      const settings = { ...this.defaultSettings, ...savedSettings };
      
      return settings;
    } catch (error) {
      Utils.log('error', '설정 조회 실패', error);
      return this.defaultSettings;
    }
  }

  /**
   * 특정 설정 조회
   * @param {string} key 설정 키
   * @returns {Promise<any>} 설정 값
   */
  async getSetting(key) {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * 설정 저장
   * @param {Object} newSettings 새로운 설정
   */
  async saveSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      await chrome.storage.sync.set({
        [CONSTANTS.STORAGE_KEYS.SETTINGS]: updatedSettings
      });
      
      Utils.log('info', '설정 저장 완료', updatedSettings);
      return updatedSettings;
    } catch (error) {
      Utils.log('error', '설정 저장 실패', error);
      throw error;
    }
  }

  /**
   * 특정 설정 업데이트
   * @param {string} key 설정 키
   * @param {any} value 설정 값
   */
  async setSetting(key, value) {
    return await this.saveSettings({ [key]: value });
  }

  /**
   * 자동 분석 설정 토글
   * @returns {Promise<boolean>} 새로운 자동 분석 설정값
   */
  async toggleAutoAnalysis() {
    const currentValue = await this.getSetting(CONSTANTS.SETTINGS.AUTO_ANALYSIS);
    const newValue = !currentValue;
    await this.setSetting(CONSTANTS.SETTINGS.AUTO_ANALYSIS, newValue);
    Utils.log('info', `자동 분석 설정 변경: ${currentValue} → ${newValue}`);
    return newValue;
  }

  /**
   * 자동 분석 활성화 여부 확인
   * @returns {Promise<boolean>} 자동 분석 활성화 여부
   */
  async isAutoAnalysisEnabled() {
    return await this.getSetting(CONSTANTS.SETTINGS.AUTO_ANALYSIS);
  }

  /**
   * 알림 표시 여부 확인
   * @returns {Promise<boolean>} 알림 표시 여부
   */
  async isNotificationsEnabled() {
    return await this.getSetting(CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS);
  }

  /**
   * 설정 리셋
   */
  async resetSettings() {
    try {
      await chrome.storage.sync.remove(CONSTANTS.STORAGE_KEYS.SETTINGS);
      Utils.log('info', '설정이 초기화되었습니다');
      return this.defaultSettings;
    } catch (error) {
      Utils.log('error', '설정 초기화 실패', error);
      throw error;
    }
  }

  /**
   * 설정 변경 이벤트 리스너 추가
   * @param {Function} callback 콜백 함수
   */
  onSettingsChanged(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes[CONSTANTS.STORAGE_KEYS.SETTINGS]) {
        const newSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].newValue;
        const oldSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].oldValue;
        callback(newSettings, oldSettings);
      }
    });
  }
}// 상수 정의
export const CONSTANTS = {
  SERVER_URL: 'http://localhost:3000',
  
  PLATFORMS: {
    INSTAGRAM: 'instagram',
    TIKTOK: 'tiktok'
  },

  SETTINGS: {
    AUTO_ANALYSIS: 'autoAnalysis',
    SHOW_NOTIFICATIONS: 'showNotifications'
  },

  STORAGE_KEYS: {
    SETTINGS: 'videosaverSettings'
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
      CAPTION: [
        '[data-testid="post-content"] span',
        'article h1',
        'article span[dir="auto"]',
        '.x1lliihq span',
        'h1 span'
      ],
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
};// 유틸리티 함수들
export class Utils {
  /**
   * 플랫폼 감지
   * @returns {string|null} 플랫폼 이름 또는 null
   */
  static detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    return null;
  }

  /**
   * 디바운스 함수
   * @param {Function} func 실행할 함수
   * @param {number} wait 대기 시간 (ms)
   * @returns {Function} 디바운스된 함수
   */
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

  /**
   * 쓰로틀 함수
   * @param {Function} func 실행할 함수
   * @param {number} limit 제한 시간 (ms)
   * @returns {Function} 쓰로틀된 함수
   */
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

  /**
   * 요소가 뷰포트에 보이는지 확인
   * @param {HTMLElement} element 확인할 요소
   * @returns {boolean} 보이면 true
   */
  static isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top >= 0 && rect.top < window.innerHeight;
  }

  /**
   * URL에서 해시태그 추출
   * @param {string} text 텍스트
   * @returns {Array<string>} 해시태그 배열
   */
  static extractHashtags(text) {
    if (!text) return [];
    return text.match(/#[\w가-힣]+/g) || [];
  }

  /**
   * 안전한 DOM 쿼리 선택
   * @param {HTMLElement|Document} parent 부모 요소
   * @param {string} selector 선택자
   * @returns {HTMLElement|null} 찾은 요소 또는 null
   */
  static safeQuerySelector(parent, selector) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.warn('Query selector failed:', selector, error);
      return null;
    }
  }

  /**
   * 안전한 DOM 쿼리 선택 (모든 요소)
   * @param {HTMLElement|Document} parent 부모 요소
   * @param {string} selector 선택자
   * @returns {NodeList} 찾은 요소들
   */
  static safeQuerySelectorAll(parent, selector) {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.warn('Query selector all failed:', selector, error);
      return [];
    }
  }

  /**
   * 로그 출력 (개발 환경에서만)
   * @param {string} level 로그 레벨
   * @param {string} message 메시지
   * @param {any} data 추가 데이터
   */
  static log(level, message, data = null) {
    if (process.env.NODE_ENV === 'production') return;
    
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

  /**
   * 비동기 지연 실행
   * @param {number} ms 지연 시간 (ms)
   * @returns {Promise} 지연 Promise
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 파일 크기를 사람이 읽기 좋은 형태로 변환
   * @param {number} bytes 바이트 수
   * @returns {string} 변환된 문자열
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';

/**
 * UI 및 DOM 조작 관리자
 */
export class UIManager {
  constructor() {
    this.notifications = new Map();
  }

  /**
   * 저장 버튼 생성
   * @returns {HTMLButtonElement} 생성된 버튼
   */
  createSaveButton() {
    const button = document.createElement('button');
    button.className = 'video-save-button';
    button.style.cssText = `
      all: unset !important;
      position: relative !important;
      z-index: 9999 !important;
      display: inline-block !important;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
      color: white !important;
      padding: 10px 15px !important;
      border-radius: 25px !important;
      border: 2px solid white !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: bold !important;
      text-align: center !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
      transition: all 0.3s ease !important;
      margin: 8px !important;
      min-width: 140px !important;
      white-space: nowrap !important;
    `;
    
    button.innerHTML = '💾 저장 & 분석';
    
    // 호버 효과
    this.addButtonHoverEffects(button);
    
    Utils.log('success', '저장 버튼 생성 완료');
    return button;
  }

  /**
   * 버튼 호버 효과 추가
   * @param {HTMLButtonElement} button 버튼 요소
   */
  addButtonHoverEffects(button) {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1) !important';
      button.style.background = 'linear-gradient(45deg, #ff5252, #26c6da) !important';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1) !important';  
      button.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4) !important';
    });
  }

  /**
   * 버튼 상태 업데이트
   * @param {HTMLButtonElement} button 버튼 요소
   * @param {string} state 상태 ('loading', 'success', 'error', 'reset')
   * @param {string} message 메시지
   */
  updateButtonState(button, state, message = '') {
    if (!button) return;

    const originalContent = button.getAttribute('data-original-content') || button.innerHTML;
    button.setAttribute('data-original-content', originalContent);

    switch (state) {
      case 'loading':
        button.innerHTML = `
          <div style="padding: 8px 12px; background: #666; color: white; border-radius: 20px;">
            ⏳ 처리중...
          </div>
        `;
        button.disabled = true;
        break;

      case 'success':
        button.innerHTML = `
          <div style="padding: 8px 12px; background: #4caf50; color: white; border-radius: 20px;">
            ✅ 완료!
          </div>
        `;
        this.resetButtonAfterDelay(button, originalContent);
        break;

      case 'error':
        button.innerHTML = `
          <div style="padding: 8px 12px; background: #f44336; color: white; border-radius: 20px;">
            ❌ 실패
          </div>
        `;
        this.resetButtonAfterDelay(button, originalContent);
        break;

      case 'reset':
        button.innerHTML = originalContent;
        button.disabled = false;
        break;
    }
  }

  /**
   * 지연 후 버튼 상태 리셋
   * @param {HTMLButtonElement} button 버튼 요소
   * @param {string} originalContent 원본 콘텐츠
   */
  resetButtonAfterDelay(button, originalContent) {
    setTimeout(() => {
      if (button && document.body.contains(button)) {
        button.innerHTML = originalContent;
        button.disabled = false;
      }
    }, CONSTANTS.TIMEOUTS.BUTTON_RESET_DELAY);
  }

  /**
   * 액션 영역 생성 (비디오 위에 오버레이)
   * @param {HTMLVideoElement} video 비디오 요소
   * @returns {HTMLDivElement} 생성된 액션 영역
   */
  createActionArea(video) {
    const actionArea = document.createElement('div');
    actionArea.className = 'video-save-action-area';
    actionArea.style.cssText = `
      position: absolute !important;
      top: 15px !important;
      right: 15px !important;
      z-index: 10000 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 8px !important;
      pointer-events: auto !important;
    `;
    
    // 비디오의 부모에 relative position 추가
    const videoParent = video.parentElement;
    if (videoParent) {
      const currentPosition = getComputedStyle(videoParent).position;
      if (currentPosition === 'static') {
        videoParent.style.position = 'relative';
        Utils.log('info', '부모 요소에 relative position 추가');
      }
      
      videoParent.appendChild(actionArea);
      Utils.log('info', '액션 영역이 비디오 부모에 추가됨');
    }
    
    return actionArea;
  }

  /**
   * 플로팅 버튼 생성
   * @param {HTMLVideoElement} video 비디오 요소
   * @param {HTMLButtonElement} saveButton 저장 버튼
   */
  createFloatingButton(video, saveButton) {
    const rect = video.getBoundingClientRect();
    
    const floatingContainer = document.createElement('div');
    floatingContainer.className = 'video-save-floating-container';
    floatingContainer.style.cssText = `
      position: fixed !important;
      top: ${rect.top + 20}px !important;
      right: 20px !important;
      z-index: 99999 !important;
      pointer-events: auto !important;
    `;
    
    // 기존 버튼을 플로팅 컨테이너로 이동
    if (saveButton.parentElement) {
      saveButton.parentElement.removeChild(saveButton);
    }
    
    floatingContainer.appendChild(saveButton);
    document.body.appendChild(floatingContainer);
    
    Utils.log('info', '플로팅 버튼이 body에 추가됨');
    
    // 스크롤 및 가시성 관리
    this.setupFloatingButtonTracking(video, floatingContainer);
  }

  /**
   * 플로팅 버튼 추적 설정
   * @param {HTMLVideoElement} video 비디오 요소
   * @param {HTMLDivElement} floatingContainer 플로팅 컨테이너
   */
  setupFloatingButtonTracking(video, floatingContainer) {
    const updatePosition = Utils.throttle(() => {
      if (!document.body.contains(video)) return;
      const newRect = video.getBoundingClientRect();
      floatingContainer.style.top = `${newRect.top + 20}px`;
    }, 100);
    
    window.addEventListener('scroll', updatePosition);
    
    // Intersection Observer로 비디오 가시성 관리
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && document.body.contains(floatingContainer)) {
          document.body.removeChild(floatingContainer);
          window.removeEventListener('scroll', updatePosition);
          observer.disconnect();
          Utils.log('info', '플로팅 버튼 제거됨 (비디오 비가시성)');
        }
      });
    });
    
    observer.observe(video);
  }

  /**
   * AI 기능 표시기 추가
   * @param {HTMLButtonElement} button 대상 버튼
   */
  addEnhancementIndicator(button) {
    if (button.querySelector('.ai-indicator')) {
      Utils.log('warn', 'AI 표시기가 이미 존재함');
      return;
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'ai-indicator';
    indicator.style.cssText = `
      position: absolute !important;
      top: -8px !important;
      right: -8px !important;
      width: 16px !important;
      height: 16px !important;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
      border-radius: 50% !important;
      font-size: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: white !important;
      font-weight: bold !important;
      z-index: 1000 !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
    `;
    indicator.innerHTML = '🤖';
    indicator.title = 'AI 분석 기능이 추가된 저장 버튼';
    
    // 부모 요소에 relative position 추가
    const currentPosition = button.style.position;
    if (currentPosition === '' || currentPosition === 'static') {
      button.style.position = 'relative';
    }
    
    button.appendChild(indicator);
    Utils.log('success', 'AI 표시기 추가 완료');
  }

  /**
   * 알림 표시
   * @param {string} message 알림 메시지
   * @param {string} type 알림 타입
   * @param {number} duration 표시 시간 (ms)
   */
  showNotification(message, type = CONSTANTS.NOTIFICATION_TYPES.INFO, duration = CONSTANTS.TIMEOUTS.NOTIFICATION_DURATION) {
    // 설정 확인
    chrome.storage.sync.get(['showNotifications'], (result) => {
      if (result.showNotifications === false) return;
      
      const notification = this.createNotificationElement(message, type);
      document.body.appendChild(notification);
      
      // 알림 추적
      const notificationId = Date.now().toString();
      this.notifications.set(notificationId, notification);
      
      // 자동 제거
      setTimeout(() => {
        this.removeNotification(notificationId);
      }, duration);
      
      Utils.log('info', `알림 표시: ${type}`, message);
    });
  }

  /**
   * 알림 요소 생성
   * @param {string} message 메시지
   * @param {string} type 타입
   * @returns {HTMLDivElement} 알림 요소
   */
  createNotificationElement(message, type) {
    const notification = document.createElement('div');
    const bgColor = this.getNotificationColor(type);
    
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
      animation: slideInRight 0.3s ease-out;
    `;
    
    // 슬라이드 애니메이션 추가
    this.addNotificationAnimation();
    
    notification.textContent = message;
    return notification;
  }

  /**
   * 알림 타입에 따른 색상 반환
   * @param {string} type 알림 타입
   * @returns {string} 색상 코드
   */
  getNotificationColor(type) {
    switch (type) {
      case CONSTANTS.NOTIFICATION_TYPES.SUCCESS:
        return '#4caf50';
      case CONSTANTS.NOTIFICATION_TYPES.ERROR:
        return '#f44336';
      case CONSTANTS.NOTIFICATION_TYPES.WARNING:
        return '#ff9800';
      default:
        return '#2196f3';
    }
  }

  /**
   * 알림 애니메이션 스타일 추가
   */
  addNotificationAnimation() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 알림 제거
   * @param {string} notificationId 알림 ID
   */
  removeNotification(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (notification && document.body.contains(notification)) {
      document.body.removeChild(notification);
      this.notifications.delete(notificationId);
    }
  }

  /**
   * 모든 알림 제거
   */
  clearAllNotifications() {
    this.notifications.forEach((notification, id) => {
      this.removeNotification(id);
    });
  }
}import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';

/**
 * API 통신 클라이언트
 */
export class ApiClient {
  constructor(serverUrl = CONSTANTS.SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  /**
   * 서버 연결 상태 확인
   * @returns {Promise<boolean>} 연결 성공 여부
   */
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

  /**
   * 비디오 처리 요청 (URL 방식)
   * @param {Object} data 비디오 데이터
   * @returns {Promise<Object>} 처리 결과
   */
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
      Utils.log('success', 'Video processed successfully', result);
      return result;

    } catch (error) {
      Utils.log('error', 'Video processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  /**
   * 비디오 처리 요청 (Blob 방식)
   * @param {Object} data 비디오 데이터 (blob 포함)
   * @returns {Promise<Object>} 처리 결과
   */
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
      Utils.log('success', 'Video blob processed successfully', result);
      return result;

    } catch (error) {
      Utils.log('error', 'Video blob processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  /**
   * Video element에서 직접 데이터 추출 (Canvas 방식)
   * @param {HTMLVideoElement} videoElement 비디오 요소
   * @returns {Promise<Blob>} 캡처된 프레임 블롭
   */
  async captureVideoFrame(videoElement) {
    try {
      Utils.log('info', 'Video element에서 직접 데이터 추출 시도');
      
      if (!videoElement || videoElement.tagName !== 'VIDEO') {
        throw new Error('유효한 video element가 아닙니다.');
      }

      // 비디오 재생 대기
      await this.ensureVideoReady(videoElement);

      // Canvas 생성 및 프레임 캡처
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth || videoElement.clientWidth || 640;
      canvas.height = videoElement.videoHeight || videoElement.clientHeight || 360;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Canvas를 Blob으로 변환
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob 변환 실패'));
          }
        }, 'image/jpeg', 0.8);
      });
      
      Utils.log('success', '비디오 프레임 캡처 성공 (썸네일 대안)', { size: blob.size });
      return blob;

    } catch (error) {
      Utils.log('error', 'Video frame capture failed', error);
      throw new Error(`비디오 프레임 캡처 실패: ${error.message}`);
    }
  }

  /**
   * 비디오 준비 상태 확인
   * @param {HTMLVideoElement} videoElement 비디오 요소
   */
  async ensureVideoReady(videoElement) {
    if (videoElement.readyState >= 2) {
      return; // 이미 준비됨
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('비디오 로딩 타임아웃'));
      }, 5000);

      const onReady = () => {
        clearTimeout(timeout);
        videoElement.removeEventListener('loadeddata', onReady);
        videoElement.removeEventListener('error', onError);
        resolve();
      };

      const onError = (e) => {
        clearTimeout(timeout);
        videoElement.removeEventListener('loadeddata', onReady);
        videoElement.removeEventListener('error', onError);
        reject(new Error(`비디오 로딩 실패: ${e.message}`));
      };

      videoElement.addEventListener('loadeddata', onReady);
      videoElement.addEventListener('error', onError);
    });
  }

  /**
   * Blob URL에서 비디오 다운로드 (폴백용)
   * @param {string} blobUrl Blob URL
   * @returns {Promise<Blob>} 다운로드된 블롭
   */
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

  /**
   * 서버 통계 조회
   * @returns {Promise<Object>} 서버 통계
   */
  async getStats() {
    try {
      const response = await fetch(`${this.serverUrl}/api/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      Utils.log('error', 'Failed to get server stats', error);
      throw error;
    }
  }

  /**
   * 저장된 비디오 목록 조회
   * @returns {Promise<Array>} 비디오 목록
   */
  async getVideos() {
    try {
      const response = await fetch(`${this.serverUrl}/api/videos`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      Utils.log('error', 'Failed to get videos', error);
      throw error;
    }
  }
}import { CONSTANTS } from '../constants.js';
import { Utils } from '../utils.js';
import { SettingsManager } from '../settings-manager.js';

/**
 * Instagram 플랫폼 핸들러
 */
export class InstagramHandler {
  constructor(apiClient, uiManager) {
    this.apiClient = apiClient;
    this.uiManager = uiManager;
    this.settingsManager = new SettingsManager();
    this.isProcessing = false;
    this.lastEnhancementTime = 0;
    this.processedButtons = new Set();
    this.processedVideos = new Set();
  }

  /**
   * Instagram 저장 버튼 기능 향상
   */
  enhanceSaveButtons() {
    if (this.shouldSkipEnhancement()) {
      return;
    }

    this.isProcessing = true;
    Utils.log('info', 'Instagram 저장 버튼 기능 향상 시작');
    this.lastEnhancementTime = Date.now();
    
    setTimeout(() => {
      try {
        this.processExistingSaveButtons();
        this.addAnalysisButtons();
      } catch (error) {
        Utils.log('error', '저장 버튼 향상 중 오류', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000);
  }

  /**
   * 현재 포스트의 메타데이터 추출
   */
  extractPostMetadata() {
    try {
      const metadata = {
        author: '',
        caption: '',
        likes: '0',
        hashtags: []
      };

      // 작성자 추출
      const authorElements = [
        'header a[role="link"]', 
        '[data-testid="user-avatar"] + a',
        'article header a'
      ];
      
      for (const selector of authorElements) {
        const authorElement = document.querySelector(selector);
        if (authorElement) {
          metadata.author = authorElement.innerText.trim() || authorElement.href.split('/').filter(x => x)[2] || '';
          break;
        }
      }

      // 캡션 추출
      const captionElements = [
        '[data-testid="post-content"] span',
        'article div[data-testid="media-content"] + div span',
        '.x1lliihq span'
      ];
      
      for (const selector of captionElements) {
        const captionElement = document.querySelector(selector);
        if (captionElement) {
          metadata.caption = captionElement.innerText.trim().substring(0, 200); // 200자 제한
          break;
        }
      }

      // 좋아요 수 추출
      const likesElements = [
        '[aria-label*="좋아요"] span',
        'button[data-testid="like"] + span',
        '.x1lliihq[role="button"] span'
      ];
      
      for (const selector of likesElements) {
        const likesElement = document.querySelector(selector);
        if (likesElement) {
          const likesText = likesElement.innerText.trim();
          const likesMatch = likesText.match(/[\d,]+/);
          if (likesMatch) {
            metadata.likes = likesMatch[0];
            break;
          }
        }
      }

      // 해시태그 추출
      if (metadata.caption) {
        const hashtagMatches = metadata.caption.match(/#[\w가-힣]+/g);
        if (hashtagMatches) {
          metadata.hashtags = hashtagMatches;
        }
      }

      Utils.log('info', '메타데이터 추출 완료', metadata);
      return metadata;
      
    } catch (error) {
      Utils.log('error', '메타데이터 추출 실패', error);
      return { author: '', caption: '', likes: '0', hashtags: [] };
    }
  }

  /**
   * 향상 작업을 건너뛸지 확인
   * @returns {boolean} 건너뛸지 여부
   */
  shouldSkipEnhancement() {
    if (this.isProcessing) {
      Utils.log('info', '이미 처리 중이므로 스킵');
      return true;
    }
    
    const now = Date.now();
    if (now - this.lastEnhancementTime < CONSTANTS.TIMEOUTS.ENHANCEMENT_THROTTLE) {
      Utils.log('info', '쓰로틀링으로 인해 스킵');
      return true;
    }
    
    return false;
  }

  /**
   * 기존 저장 버튼들 처리
   */
  processExistingSaveButtons() {
    const saveButtons = Utils.safeQuerySelectorAll(document, CONSTANTS.SELECTORS.INSTAGRAM.SAVE_BUTTONS);
    Utils.log('info', `발견된 저장 버튼 수: ${saveButtons.length}`);
    
    let newButtonsEnhanced = 0;
    
    saveButtons.forEach((svg, index) => {
      try {
        if (this.enhanceSingleButton(svg, index)) {
          newButtonsEnhanced++;
        }
      } catch (error) {
        Utils.log('error', `버튼 ${index + 1} 향상 실패`, error);
      }
    });
    
    Utils.log('info', `새로 향상된 저장 버튼: ${newButtonsEnhanced}개`);
  }

  /**
   * 단일 저장 버튼 향상
   * @param {Element} svg SVG 요소
   * @param {number} index 버튼 인덱스
   * @returns {boolean} 성공 여부
   */
  enhanceSingleButton(svg, index) {
    const button = this.findButtonElement(svg);
    if (!button) {
      Utils.log('warn', `버튼 ${index + 1}: 버튼 요소를 찾을 수 없음`);
      return false;
    }

    const buttonId = this.generateButtonId(button);
    if (this.processedButtons.has(buttonId)) {
      Utils.log('info', `버튼 ${index + 1}: 이미 처리된 버튼`);
      return false;
    }

    const { post, video } = this.findPostAndVideo(button);
    if (!video) {
      Utils.log('warn', `버튼 ${index + 1}: 연결된 비디오를 찾을 수 없음`);
      return false;
    }

    this.enhanceButtonWithVideoAnalysis(button, post, video, index);
    this.processedButtons.add(buttonId);
    return true;
  }

  /**
   * 버튼 요소 찾기
   * @param {Element} svg SVG 요소
   * @returns {Element|null} 버튼 요소
   */
  findButtonElement(svg) {
    return svg.closest('button') || 
           svg.closest('div[role="button"]') || 
           svg.parentElement ||
           svg.parentElement?.parentElement;
  }

  /**
   * 버튼 고유 ID 생성
   * @param {Element} button 버튼 요소
   * @returns {string} 버튼 ID
   */
  generateButtonId(button) {
    // 버튼의 위치와 부모 요소를 조합해서 고유 ID 생성
    const rect = button.getBoundingClientRect();
    const parentClass = button.parentElement?.className || '';
    return `btn_${Math.round(rect.top)}_${Math.round(rect.left)}_${parentClass.substring(0, 10)}`;
  }

  /**
   * 게시물과 비디오 찾기
   * @param {Element} button 버튼 요소
   * @returns {Object} {post, video} 객체
   */
  findPostAndVideo(button) {
    let post = this.findPostContainer(button);
    let video = post?.querySelector(CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS);
    
    // 게시물에서 비디오를 찾지 못하면 다른 방법 시도
    if (!video) {
      video = this.findVideoByVisibility();
    }
    
    return { post, video };
  }

  /**
   * 게시물 컨테이너 찾기
   * @param {Element} button 버튼 요소
   * @returns {Element|null} 게시물 컨테이너
   */
  findPostContainer(button) {
    // 여러 방법으로 게시물 컨테이너 찾기
    let post = button.closest('article');
    
    if (!post) {
      post = button.closest('div[role="presentation"]');
    }
    
    if (!post) {
      // 상위 10개 요소까지 탐색
      let current = button;
      for (let i = 0; i < 10; i++) {
        current = current.parentElement;
        if (!current) break;
        if (current.tagName === 'ARTICLE' || current.hasAttribute('role')) {
          post = current;
          break;
        }
      }
    }
    
    return post;
  }

  /**
   * 가시성으로 비디오 찾기 (릴스 등)
   * @returns {Element|null} 비디오 요소
   */
  findVideoByVisibility() {
    const allVideos = Utils.safeQuerySelectorAll(document, CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS);
    
    // 현재 뷰포트에 보이는 비디오 찾기
    for (const video of allVideos) {
      if (Utils.isElementVisible(video)) {
        return video;
      }
    }
    
    // 첫 번째 비디오 반환 (fallback)
    return allVideos[0] || null;
  }

  /**
   * 버튼에 비디오 분석 기능 추가
   * @param {Element} button 버튼 요소
   * @param {Element} post 게시물 요소
   * @param {Element} video 비디오 요소
   * @param {number} index 버튼 인덱스
   */
  enhanceButtonWithVideoAnalysis(button, post, video, index) {
    Utils.log('info', `저장 버튼 ${index + 1}에 영상 분석 기능 추가`);
    
    const clickHandler = this.createClickHandler(post, video);
    button.addEventListener('click', clickHandler, false);
    
    this.uiManager.addEnhancementIndicator(button);
    
    // 글로벌 테스트 함수 (개발 중에만)
    if (typeof window !== 'undefined') {
      window.testVideoAnalysis = () => {
        Utils.log('info', '수동 테스트 실행');
        clickHandler({ type: 'manual_test' });
      };
    }
  }

  /**
   * 클릭 핸들러 생성
   * @param {Element} post 게시물 요소
   * @param {Element} video 비디오 요소
   * @returns {Function} 클릭 핸들러
   */
  createClickHandler(post, video) {
    let isProcessing = false;
    
    return async (event) => {
      if (isProcessing) {
        Utils.log('info', '이미 처리 중이므로 스킵');
        return;
      }
      
      isProcessing = true;
      Utils.log('info', 'Instagram 저장 버튼 클릭 이벤트 감지');
      
      // 자동 분석 설정 확인
      const isAutoAnalysisEnabled = await this.settingsManager.isAutoAnalysisEnabled();
      Utils.log('info', `자동 분석 설정: ${isAutoAnalysisEnabled}`);
      
      if (isAutoAnalysisEnabled) {
        Utils.log('info', '자동 분석 실행됨');
        try {
          await Utils.delay(CONSTANTS.TIMEOUTS.PROCESSING_DELAY);
          await this.processVideoFromSaveAction(post, video);
        } catch (error) {
          Utils.log('error', '자동 분석 실패', error);
          this.uiManager.showNotification(
            `Instagram 저장은 완료되었지만 AI 분석에 실패했습니다: ${error.message}`, 
            CONSTANTS.NOTIFICATION_TYPES.WARNING
          );
        }
      } else {
        // 자동 분석이 비활성화된 경우 저장만 완료 알림
        Utils.log('info', '자동 분석 비활성화됨 - 저장만 완료');
        this.uiManager.showNotification(
          '✅ 영상이 Instagram에 저장되었습니다!', 
          CONSTANTS.NOTIFICATION_TYPES.SUCCESS
        );
      }
      
      // 5초 후 처리 플래그 해제
      setTimeout(() => {
        isProcessing = false;
      }, 5000);
    };
  }

  /**
   * 저장 액션에서 비디오 처리
   * @param {Element} post 게시물 요소
   * @param {Element} video 비디오 요소
   */
  async processVideoFromSaveAction(post, video) {
    const videoUrl = video.src || video.currentSrc;
    const postUrl = window.location.href;
    const metadata = this.extractMetadata(post);
    
    Utils.log('info', '저장된 영상 분석 시작', { videoUrl, postUrl });
    
    if (!videoUrl) {
      throw new Error('비디오 URL을 찾을 수 없습니다.');
    }
    
    // blob URL 처리
    if (videoUrl.startsWith('blob:')) {
      await this.processBlobVideo(videoUrl, postUrl, metadata, video);
    } else {
      await this.processRegularVideo(videoUrl, postUrl, metadata);
    }
    
    this.uiManager.showNotification(
      '✅ 영상이 Instagram에 저장되고 AI 분석도 완료되었습니다!', 
      CONSTANTS.NOTIFICATION_TYPES.SUCCESS
    );
  }

  /**
   * Blob 비디오 처리 (Video Element 방식)
   * @param {string} videoUrl Blob URL (참조용)
   * @param {string} postUrl 게시물 URL
   * @param {Object} metadata 메타데이터
   * @param {HTMLVideoElement} videoElement 비디오 요소
   */
  async processBlobVideo(videoUrl, postUrl, metadata, videoElement = null) {
    Utils.log('info', 'blob URL 감지 - Video Element에서 직접 캡처 시도');
    
    let videoBlob;
    
    try {
      // 먼저 blob URL로 다운로드 시도
      videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
    } catch (blobError) {
      Utils.log('warn', 'Blob URL 다운로드 실패, Video Element 방식으로 대체', blobError);
      
      // 실패 시 Video Element에서 프레임 캡처
      if (videoElement) {
        videoBlob = await this.apiClient.captureVideoFrame(videoElement);
        Utils.log('info', 'Video Element에서 프레임 캡처 성공');
      } else {
        throw new Error('Video Element를 찾을 수 없어 프레임 캡처 불가');
      }
    }
    
    await this.apiClient.processVideoBlob({
      platform: CONSTANTS.PLATFORMS.INSTAGRAM,
      videoBlob,
      postUrl,
      metadata
    });
  }

  /**
   * 일반 비디오 처리
   * @param {string} videoUrl 비디오 URL
   * @param {string} postUrl 게시물 URL
   * @param {Object} metadata 메타데이터
   */
  async processRegularVideo(videoUrl, postUrl, metadata) {
    await this.apiClient.processVideo({
      platform: CONSTANTS.PLATFORMS.INSTAGRAM,
      videoUrl,
      postUrl,
      metadata
    });
  }

  /**
   * Instagram 메타데이터 추출
   * @param {Element} post 게시물 요소
   * @returns {Object} 메타데이터
   */
  extractMetadata(post) {
    if (!post) {
      return { timestamp: new Date().toISOString() };
    }

    try {
      // 작성자
      const authorElement = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.AUTHOR);
      const author = authorElement?.textContent || '';
      
      // 캡션 (여러 선택자 시도)
      let caption = '';
      const captionSelectors = CONSTANTS.SELECTORS.INSTAGRAM.CAPTION;
      Utils.log('info', '캡션 추출 시도', { selectors: captionSelectors });
      
      for (const selector of captionSelectors) {
        const captionElement = Utils.safeQuerySelector(post, selector);
        if (captionElement && captionElement.textContent.trim()) {
          caption = captionElement.textContent.trim();
          Utils.log('info', '캡션 추출 성공', { selector, caption: caption.substring(0, 100) });
          break;
        }
      }
      
      if (!caption) {
        Utils.log('warn', '캡션을 찾을 수 없음');
      }
      
      // 좋아요 수
      const likesElement = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.LIKES);
      const likes = likesElement?.textContent || '0';
      
      // 해시태그 추출
      const hashtags = Utils.extractHashtags(caption);
      Utils.log('info', '해시태그 추출 결과', { hashtags, captionLength: caption.length });
      
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

  /**
   * 수동으로 저장 버튼 추가 (대안 방법)
   */
  addCustomSaveButtons() {
    Utils.log('info', 'Instagram 커스텀 저장 버튼 추가 시도');
    
    const videos = Utils.safeQuerySelectorAll(document, CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS);
    Utils.log('info', `전체 비디오 요소 수: ${videos.length}`);
    
    videos.forEach((video, index) => {
      try {
        this.addCustomButtonToVideo(video, index);
      } catch (error) {
        Utils.log('error', `비디오 ${index + 1} 커스텀 버튼 추가 실패`, error);
      }
    });
  }

  /**
   * 비디오에 커스텀 버튼 추가
   * @param {Element} video 비디오 요소
   * @param {number} index 인덱스
   */
  addCustomButtonToVideo(video, index) {
    // 이미 버튼이 있는지 확인
    const existingButton = video.closest('div').querySelector('.video-save-button');
    if (existingButton) {
      Utils.log('info', `비디오 ${index + 1}: 이미 버튼이 있음`);
      return;
    }
    
    const container = video.closest('article') || video.parentElement;
    if (!container) {
      Utils.log('warn', `비디오 ${index + 1}: 적절한 컨테이너를 찾을 수 없음`);
      return;
    }
    
    // 액션 영역 찾기 또는 생성
    let actionArea = container.querySelector('section') || 
                    container.querySelector('[role="toolbar"]');
                    
    if (!actionArea) {
      actionArea = this.uiManager.createActionArea(video);
    }
    
    // 저장 버튼 생성 및 추가
    const saveButton = this.uiManager.createSaveButton();
    saveButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleCustomButtonClick(container, video);
    };
    
    try {
      actionArea.appendChild(saveButton);
      Utils.log('success', `비디오 ${index + 1}: 커스텀 저장 버튼 추가 완료`);
      
      // 가시성 확인
      setTimeout(() => {
        if (!Utils.isElementVisible(saveButton)) {
          Utils.log('info', `버튼 ${index + 1}이 보이지 않음. 플로팅 버튼으로 변경`);
          this.uiManager.createFloatingButton(video, saveButton);
        }
      }, 500);
      
    } catch (error) {
      Utils.log('error', `버튼 ${index + 1} 추가 실패`, error);
      this.uiManager.createFloatingButton(video, saveButton);
    }
  }

  /**
   * 커스텀 버튼 클릭 처리
   * @param {Element} container 컨테이너
   * @param {Element} video 비디오 요소
   */
  async handleCustomButtonClick(container, video) {
    try {
      const videoUrl = video.src || video.currentSrc;
      const postUrl = window.location.href;
      const metadata = this.extractMetadata(container);
      
      if (videoUrl?.startsWith('blob:')) {
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
        '✅ 영상이 저장되고 분석되었습니다!', 
        CONSTANTS.NOTIFICATION_TYPES.SUCCESS
      );
      
    } catch (error) {
      Utils.log('error', '커스텀 버튼 처리 실패', error);
      this.uiManager.showNotification(
        '영상 처리에 실패했습니다. 서버 연결을 확인해주세요.', 
        CONSTANTS.NOTIFICATION_TYPES.ERROR
      );
    }
  }

  /**
   * 분석 전용 버튼 추가
   */
  addAnalysisButtons() {
    Utils.log('info', 'Instagram 분석 버튼 추가 시작');
    
    const posts = Utils.safeQuerySelectorAll(document, CONSTANTS.SELECTORS.INSTAGRAM.POSTS);
    Utils.log('info', `발견된 게시물: ${posts.length}개`);
    
    posts.forEach((post, index) => {
      try {
        this.addAnalysisButtonToPost(post, index);
      } catch (error) {
        Utils.log('error', `게시물 ${index + 1} 분석 버튼 추가 실패`, error);
      }
    });
  }

  /**
   * 게시물에 분석 버튼 추가
   * @param {Element} post 게시물 요소
   * @param {number} index 인덱스
   */
  addAnalysisButtonToPost(post, index) {
    const video = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS);
    if (!video) {
      Utils.log('info', `게시물 ${index + 1}: 비디오 없음, 스킵`);
      return; // 비디오가 없는 게시물은 스킵
    }

    // 기존 분석 버튼이 있는지 확인
    if (post.querySelector('.analysis-button')) {
      Utils.log('info', `게시물 ${index + 1}: 이미 분석 버튼 존재`);
      return;
    }

    // 다양한 방법으로 저장 버튼 찾기
    let saveButton = null;
    let buttonContainer = null;

    // 방법 1: 일반적인 저장 버튼 선택자
    for (const selector of CONSTANTS.SELECTORS.INSTAGRAM.SAVE_BUTTONS) {
      saveButton = Utils.safeQuerySelector(post, selector);
      if (saveButton) {
        Utils.log('info', `게시물 ${index + 1}: 저장 버튼 발견 (선택자: ${selector})`);
        break;
      }
    }

    // 방법 2: 액션 버튼들이 있는 영역 찾기
    if (!saveButton) {
      const actionArea = Utils.safeQuerySelector(post, 'section');
      if (actionArea) {
        // 좋아요, 댓글, 공유, 저장 버튼들이 있는 영역
        const buttons = actionArea.querySelectorAll('[role="button"]');
        if (buttons.length >= 4) {
          saveButton = buttons[buttons.length - 1]; // 보통 마지막이 저장 버튼
          Utils.log('info', `게시물 ${index + 1}: 액션 영역에서 저장 버튼 추정`);
        }
      }
    }

    if (!saveButton) {
      Utils.log('warn', `게시물 ${index + 1}: 저장 버튼을 찾을 수 없음`);
      // 저장 버튼이 없어도 비디오가 있으면 플로팅 버튼으로 추가
      this.addFloatingAnalysisButton(post, video, index);
      return;
    }

    // 버튼 컨테이너 찾기
    buttonContainer = saveButton.closest('[role="button"]') || saveButton.parentElement;
    
    // 분석 버튼 생성
    const analysisButton = this.createAnalysisButton();
    
    // 클릭 이벤트 추가
    analysisButton.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.handleAnalysisButtonClick(post, video, analysisButton);
    };

    try {
      // 저장 버튼과 같은 레벨에 분석 버튼 추가
      const parentContainer = buttonContainer.parentElement;
      if (parentContainer) {
        // 저장 버튼 바로 다음에 삽입
        if (buttonContainer.nextSibling) {
          parentContainer.insertBefore(analysisButton, buttonContainer.nextSibling);
        } else {
          parentContainer.appendChild(analysisButton);
        }
        Utils.log('success', `게시물 ${index + 1}: 분석 버튼 추가 완료`);
      } else {
        // 플로팅 버튼으로 폴백
        this.addFloatingAnalysisButton(post, video, index);
      }
    } catch (error) {
      Utils.log('error', `게시물 ${index + 1}: 분석 버튼 배치 실패`, error);
      // 플로팅 버튼으로 폴백
      this.addFloatingAnalysisButton(post, video, index);
    }
  }

  /**
   * 플로팅 분석 버튼 추가 (폴백 방법)
   * @param {Element} post 게시물 요소
   * @param {Element} video 비디오 요소
   * @param {number} index 인덱스
   */
  addFloatingAnalysisButton(post, video, index) {
    const analysisButton = this.createFloatingAnalysisButton();
    
    // 클릭 이벤트 추가
    analysisButton.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.handleAnalysisButtonClick(post, video, analysisButton);
    };

    try {
      // 비디오 위에 플로팅 버튼 추가
      const videoContainer = video.parentElement;
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(analysisButton);
      Utils.log('success', `게시물 ${index + 1}: 플로팅 분석 버튼 추가 완료`);
    } catch (error) {
      Utils.log('error', `게시물 ${index + 1}: 플로팅 분석 버튼 추가 실패`, error);
    }
  }

  /**
   * 플로팅 분석 버튼 생성
   * @returns {HTMLButtonElement} 플로팅 분석 버튼
   */
  createFloatingAnalysisButton() {
    const button = document.createElement('button');
    button.className = 'analysis-button floating-analysis-button';
    button.style.cssText = `
      all: unset !important;
      position: absolute !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 36px !important;
      height: 36px !important;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: bold !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      transition: all 0.2s ease !important;
    `;
    
    button.innerHTML = `🔍`;
    button.title = '영상 AI 분석하기';
    
    // 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1) !important';
      button.style.background = 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%) !important';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1) !important';
      button.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important';
    });
    
    return button;
  }

  /**
   * 분석 전용 버튼 생성
   * @returns {HTMLButtonElement} 분석 버튼
   */
  createAnalysisButton() {
    const button = document.createElement('button');
    button.className = 'analysis-button';
    button.style.cssText = `
      all: unset !important;
      position: relative !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 24px !important;
      height: 24px !important;
      margin-left: 12px !important;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      font-weight: bold !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
      transition: all 0.2s ease !important;
    `;
    
    button.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="font-size: 10px;">🔍</div>
      </div>
    `;
    
    button.title = '영상 AI 분석하기';
    
    // 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1) !important';
      button.style.background = 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%) !important';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1) !important';
      button.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important';
    });
    
    return button;
  }

  /**
   * 분석 버튼 클릭 처리
   * @param {Element} post 게시물 요소
   * @param {Element} video 비디오 요소
   * @param {Element} button 클릭된 버튼
   */
  async handleAnalysisButtonClick(post, video, button) {
    // 버튼 상태를 로딩으로 변경
    const originalHTML = button.innerHTML;
    button.innerHTML = '<div style="font-size: 10px;">⏳</div>';
    button.style.pointerEvents = 'none';

    try {
      Utils.log('info', '수동 분석 버튼 클릭됨');
      
      // 동일한 분석 로직 사용
      await this.processVideoFromSaveAction(post, video);
      
      // 성공 상태로 변경
      button.innerHTML = '<div style="font-size: 10px;">✅</div>';
      
      this.uiManager.showNotification(
        '✅ 영상 AI 분석이 완료되었습니다!', 
        CONSTANTS.NOTIFICATION_TYPES.SUCCESS
      );
      
    } catch (error) {
      Utils.log('error', '수동 분석 실패', error);
      
      // 에러 상태로 변경
      button.innerHTML = '<div style="font-size: 10px;">❌</div>';
      
      this.uiManager.showNotification(
        `영상 분석에 실패했습니다: ${error.message}`, 
        CONSTANTS.NOTIFICATION_TYPES.ERROR
      );
    }

    // 3초 후 원래 상태로 복원
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.pointerEvents = 'auto';
    }, 3000);
  }
}import { CONSTANTS } from '../constants.js';
import { Utils } from '../utils.js';

/**
 * TikTok 플랫폼 핸들러
 */
export class TikTokHandler {
  constructor(apiClient, uiManager) {
    this.apiClient = apiClient;
    this.uiManager = uiManager;
    this.processedVideos = new Set();
  }

  /**
   * TikTok 저장 버튼 추가
   */
  addSaveButtons() {
    Utils.log('info', 'TikTok 저장 버튼 추가 시작');
    
    const videoContainers = Utils.safeQuerySelectorAll(
      document, 
      CONSTANTS.SELECTORS.TIKTOK.VIDEO_PLAYER
    );
    
    Utils.log('info', `발견된 TikTok 비디오: ${videoContainers.length}개`);
    
    videoContainers.forEach((container, index) => {
      try {
        this.processVideoContainer(container, index);
      } catch (error) {
        Utils.log('error', `TikTok 비디오 ${index + 1} 처리 실패`, error);
      }
    });
  }

  /**
   * 비디오 컨테이너 처리
   * @param {Element} videoContainer 비디오 컨테이너
   * @param {number} index 인덱스
   */
  processVideoContainer(videoContainer, index) {
    const videoId = this.generateVideoId(videoContainer);
    
    // 이미 처리된 비디오는 스킵
    if (this.processedVideos.has(videoId)) {
      Utils.log('info', `TikTok 비디오 ${index + 1}: 이미 처리됨`);
      return;
    }

    // 기존 버튼 확인
    if (videoContainer.querySelector('.video-save-button')) {
      Utils.log('info', `TikTok 비디오 ${index + 1}: 이미 버튼이 존재함`);
      this.processedVideos.add(videoId);
      return;
    }
    
    const videoElement = Utils.safeQuerySelector(
      videoContainer, 
      'video'
    );
    
    if (!videoElement) {
      Utils.log('warn', `TikTok 비디오 ${index + 1}: video 요소를 찾을 수 없음`);
      return;
    }
    
    const sideActions = this.findSideActions(videoContainer);
    if (!sideActions) {
      Utils.log('warn', `TikTok 비디오 ${index + 1}: 사이드 액션 영역을 찾을 수 없음`);
      return;
    }
    
    this.addSaveButtonToSideActions(sideActions, videoContainer, videoElement, index);
    this.processedVideos.add(videoId);
  }

  /**
   * 비디오 고유 ID 생성
   * @param {Element} videoContainer 비디오 컨테이너
   * @returns {string} 비디오 ID
   */
  generateVideoId(videoContainer) {
    const rect = videoContainer.getBoundingClientRect();
    const videoSrc = videoContainer.querySelector('video')?.src || '';
    return `tiktok_${Math.round(rect.top)}_${Math.round(rect.left)}_${videoSrc.substring(0, 20)}`;
  }

  /**
   * 사이드 액션 영역 찾기
   * @param {Element} videoContainer 비디오 컨테이너
   * @returns {Element|null} 사이드 액션 영역
   */
  findSideActions(videoContainer) {
    // TikTok 비디오 래퍼에서 사이드 액션 찾기
    const videoWrapper = videoContainer.closest(CONSTANTS.SELECTORS.TIKTOK.VIDEO_WRAPPER);
    if (videoWrapper) {
      const sideActions = Utils.safeQuerySelector(
        videoWrapper, 
        CONSTANTS.SELECTORS.TIKTOK.SIDE_ACTIONS
      );
      if (sideActions) return sideActions;
    }
    
    // 대안: 비디오 컨테이너 주변에서 액션 버튼들 찾기
    let current = videoContainer.parentElement;
    for (let i = 0; i < 5; i++) {
      if (!current) break;
      
      const potentialSideActions = current.querySelector('[class*="side"], [class*="action"], [class*="button"]');
      if (potentialSideActions) {
        return potentialSideActions.parentElement || potentialSideActions;
      }
      
      current = current.parentElement;
    }
    
    return null;
  }

  /**
   * 사이드 액션에 저장 버튼 추가
   * @param {Element} sideActions 사이드 액션 영역
   * @param {Element} videoContainer 비디오 컨테이너
   * @param {Element} videoElement 비디오 요소
   * @param {number} index 인덱스
   */
  addSaveButtonToSideActions(sideActions, videoContainer, videoElement, index) {
    const saveButton = this.createTikTokSaveButton();
    
    saveButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSaveButtonClick(videoContainer, videoElement);
    };
    
    try {
      sideActions.appendChild(saveButton);
      Utils.log('success', `TikTok 비디오 ${index + 1}: 저장 버튼 추가 완료`);
    } catch (error) {
      Utils.log('error', `TikTok 비디오 ${index + 1}: 버튼 추가 실패`, error);
      // 실패 시 플로팅 버튼으로 대체
      this.uiManager.createFloatingButton(videoElement, saveButton);
    }
  }

  /**
   * TikTok 전용 저장 버튼 생성
   * @returns {HTMLButtonElement} 저장 버튼
   */
  createTikTokSaveButton() {
    const button = document.createElement('button');
    button.className = 'video-save-button tiktok-save-button';
    button.style.cssText = `
      all: unset !important;
      position: relative !important;
      z-index: 9999 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      width: 48px !important;
      height: 48px !important;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
      color: white !important;
      border-radius: 50% !important;
      border: 2px solid white !important;
      cursor: pointer !important;
      font-size: 20px !important;
      font-weight: bold !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
      transition: all 0.3s ease !important;
      margin: 12px 0 !important;
    `;
    
    button.innerHTML = `
      <div style="font-size: 16px;">💾</div>
      <div style="font-size: 8px; margin-top: 2px;">분석</div>
    `;
    
    // TikTok 스타일 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1) !important';
      button.style.background = 'linear-gradient(45deg, #ff5252, #26c6da) !important';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1) !important';
      button.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4) !important';
    });
    
    return button;
  }

  /**
   * 저장 버튼 클릭 처리
   * @param {Element} videoContainer 비디오 컨테이너
   * @param {Element} videoElement 비디오 요소
   */
  async handleSaveButtonClick(videoContainer, videoElement) {
    const button = videoContainer.querySelector('.video-save-button');
    
    this.uiManager.updateButtonState(button, 'loading');
    
    try {
      const videoUrl = videoElement.src || videoElement.currentSrc;
      const postUrl = window.location.href;
      const metadata = this.extractMetadata(videoContainer);
      
      Utils.log('info', 'TikTok 비디오 처리 시작', { videoUrl, postUrl });
      
      if (!videoUrl) {
        throw new Error('비디오 URL을 찾을 수 없습니다.');
      }
      
      // TikTok은 대부분 blob URL 사용
      if (videoUrl.startsWith('blob:')) {
        await this.processBlobVideo(videoUrl, postUrl, metadata, videoElement);
      } else {
        await this.processRegularVideo(videoUrl, postUrl, metadata);
      }
      
      this.uiManager.updateButtonState(button, 'success');
      this.uiManager.showNotification(
        '✅ TikTok 영상이 저장되고 분석되었습니다!', 
        CONSTANTS.NOTIFICATION_TYPES.SUCCESS
      );
      
    } catch (error) {
      Utils.log('error', 'TikTok 비디오 처리 실패', error);
      this.uiManager.updateButtonState(button, 'error');
      this.uiManager.showNotification(
        '영상 처리에 실패했습니다. 서버 연결을 확인해주세요.', 
        CONSTANTS.NOTIFICATION_TYPES.ERROR
      );
    }
  }

  /**
   * Blob 비디오 처리
   * @param {string} videoUrl Blob URL
   * @param {string} postUrl 게시물 URL
   * @param {Object} metadata 메타데이터
   * @param {Element} videoElement 비디오 요소
   */
  async processBlobVideo(videoUrl, postUrl, metadata, videoElement) {
    Utils.log('info', 'TikTok blob URL 처리 중');
    
    try {
      const videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
      
      await this.apiClient.processVideoBlob({
        platform: CONSTANTS.PLATFORMS.TIKTOK,
        videoBlob,
        postUrl,
        metadata
      });
    } catch (error) {
      Utils.log('warn', 'TikTok blob URL 다운로드 실패, Canvas 프레임 캡처로 대체', error);
      
      if (!videoElement) {
        throw new Error('비디오 요소가 없어서 Canvas 프레임 캡처를 할 수 없습니다.');
      }
      
      // Canvas를 사용한 프레임 캡처 대안
      const frameBlob = await this.apiClient.captureVideoFrame(videoElement);
      
      await this.apiClient.processVideoBlob({
        platform: CONSTANTS.PLATFORMS.TIKTOK,
        videoBlob: frameBlob,
        postUrl,
        metadata: {
          ...metadata,
          captureMethod: 'canvas-frame'
        }
      });
    }
  }

  /**
   * 일반 비디오 처리
   * @param {string} videoUrl 비디오 URL
   * @param {string} postUrl 게시물 URL
   * @param {Object} metadata 메타데이터
   */
  async processRegularVideo(videoUrl, postUrl, metadata) {
    await this.apiClient.processVideo({
      platform: CONSTANTS.PLATFORMS.TIKTOK,
      videoUrl,
      postUrl,
      metadata
    });
  }

  /**
   * TikTok 메타데이터 추출
   * @param {Element} videoContainer 비디오 컨테이너
   * @returns {Object} 메타데이터
   */
  extractMetadata(videoContainer) {
    try {
      // 작성자
      const authorElement = Utils.safeQuerySelector(
        document, 
        CONSTANTS.SELECTORS.TIKTOK.VIDEO_AUTHOR
      );
      const author = authorElement?.textContent || '';
      
      // 캡션/설명
      const captionElement = Utils.safeQuerySelector(
        document, 
        CONSTANTS.SELECTORS.TIKTOK.VIDEO_DESC
      );
      const caption = captionElement?.textContent || '';
      
      // 좋아요 수
      const likesElement = Utils.safeQuerySelector(
        document, 
        CONSTANTS.SELECTORS.TIKTOK.LIKE_COUNT
      );
      const likes = likesElement?.textContent || '0';
      
      // 해시태그 추출
      const hashtags = Utils.extractHashtags(caption);
      
      // TikTok 특화 정보
      const duration = this.getVideoDuration(videoContainer);
      const isLive = this.checkIfLive(videoContainer);
      
      return {
        author: author.trim(),
        caption: caption.trim(),
        likes: likes.trim(),
        hashtags,
        duration,
        isLive,
        timestamp: new Date().toISOString(),
        platform: CONSTANTS.PLATFORMS.TIKTOK
      };
    } catch (error) {
      Utils.log('error', 'TikTok 메타데이터 추출 실패', error);
      return { 
        timestamp: new Date().toISOString(),
        platform: CONSTANTS.PLATFORMS.TIKTOK
      };
    }
  }

  /**
   * 비디오 길이 추출
   * @param {Element} videoContainer 비디오 컨테이너
   * @returns {number} 비디오 길이 (초)
   */
  getVideoDuration(videoContainer) {
    try {
      const videoElement = Utils.safeQuerySelector(videoContainer, 'video');
      return videoElement?.duration || 0;
    } catch (error) {
      Utils.log('warn', '비디오 길이 추출 실패', error);
      return 0;
    }
  }

  /**
   * 라이브 방송 여부 확인
   * @param {Element} videoContainer 비디오 컨테이너
   * @returns {boolean} 라이브 방송 여부
   */
  checkIfLive(videoContainer) {
    try {
      // TikTok 라이브 방송 표시기 찾기
      const liveIndicators = [
        '[class*="live"]',
        '[data-e2e*="live"]',
        'span:contains("LIVE")',
        'div:contains("라이브")'
      ];
      
      for (const selector of liveIndicators) {
        if (Utils.safeQuerySelector(document, selector)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      Utils.log('warn', '라이브 방송 확인 실패', error);
      return false;
    }
  }

  /**
   * TikTok 페이지 변경 감지
   */
  observePageChanges() {
    let currentPath = window.location.pathname;
    
    const checkPageChange = Utils.throttle(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        Utils.log('info', 'TikTok 페이지 변경 감지');
        
        // 새 페이지 로드 후 버튼 추가
        setTimeout(() => {
          this.addSaveButtons();
        }, 2000);
      }
    }, 1000);
    
    // URL 변경 감지
    const observer = new MutationObserver(checkPageChange);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // popstate 이벤트도 감지 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', checkPageChange);
    
    Utils.log('info', 'TikTok 페이지 변경 관찰 시작');
  }

  /**
   * 스크롤 기반 새 비디오 감지 (무한 스크롤)
   */
  observeScrollChanges() {
    const scrollHandler = Utils.debounce(() => {
      Utils.log('info', 'TikTok 스크롤 기반 새 비디오 검색');
      this.addSaveButtons();
    }, CONSTANTS.TIMEOUTS.SCROLL_DEBOUNCE);
    
    let lastScrollTime = 0;
    const throttledScrollHandler = () => {
      const now = Date.now();
      if (now - lastScrollTime > CONSTANTS.TIMEOUTS.SCROLL_MIN_INTERVAL) {
        lastScrollTime = now;
        scrollHandler();
      }
    };
    
    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    Utils.log('info', 'TikTok 스크롤 기반 비디오 감지 시작');
  }
}import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';
import { ApiClient } from './api-client.js';
import { UIManager } from './ui-manager.js';
import { InstagramHandler } from './platforms/instagram-handler.js';
import { TikTokHandler } from './platforms/tiktok-handler.js';

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
      [CONSTANTS.PLATFORMS.TIKTOK]: new TikTokHandler(this.apiClient, this.uiManager)
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