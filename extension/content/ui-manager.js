import { CONSTANTS } from './constants.js';
import { Utils, TimeUtils, DOMUtils, StringUtils } from './utils.js';

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
}