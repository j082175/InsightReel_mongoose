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
    
    button.textContent = '💾 저장 & 분석';
    
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
    indicator.textContent = '🤖';
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

  /**
   * 🚨 중복 URL 발견 알림 표시 (특별 UI)
   * @param {Object} duplicateInfo 중복 정보
   * @param {string} duplicateInfo.platform 플랫폼
   * @param {number} duplicateInfo.row 행 번호  
   * @param {string} duplicateInfo.column 컬럼
   * @param {string} duplicateInfo.normalized_url 정규화된 URL
   * @param {number} duration 표시 지속 시간
   */

  /**
   * 🎨 중복 알림 전용 UI 요소 생성
   * @param {Object} duplicateInfo 중복 정보
   * @returns {HTMLDivElement} 중복 알림 요소
   */
  createDuplicateNotificationElement(duplicateInfo) {
    // 기존 알림 애니메이션 사용
    this.addNotificationAnimation();
    
    const notification = document.createElement('div');
    
    // 플랫폼별 색상 및 아이콘
    const platformStyles = {
      instagram: { color: '#E4405F', icon: '📷', name: 'Instagram' },
      youtube: { color: '#FF0000', icon: '🎬', name: 'YouTube' },
      tiktok: { color: '#000000', icon: '🎵', name: 'TikTok' }
    };
    
    const platform = duplicateInfo.platform.toLowerCase();
    const style = platformStyles[platform] || { color: '#666666', icon: '📺', name: '알 수 없음' };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
      color: #333;
      padding: 20px;
      border-radius: 12px;
      border-left: 5px solid ${style.color};
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      max-width: 380px;
      min-width: 320px;
      animation: slideInRight 0.4s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // 닫기 버튼
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 12px;
      background: none;
      border: none;
      font-size: 20px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeButton.addEventListener('click', () => {
      notification.remove();
    });
    
    // 알림 내용
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 24px; line-height: 1;">${style.icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${style.color};">
            ⚠️ 중복된 영상입니다
          </div>
          <div style="margin-bottom: 6px; font-size: 13px; color: #666;">
            이 영상은 이미 <strong>${style.name}</strong> 시트에 저장되어 있습니다.
          </div>
          <div style="background: #f0f8ff; padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
            <div style="font-size: 12px; color: #0066cc; font-weight: 500;">
              📍 위치: <strong>${duplicateInfo.column}${duplicateInfo.row}행</strong>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #888; line-height: 1.3;">
            💡 동일한 영상은 중복으로 저장되지 않습니다.
          </div>
        </div>
      </div>
    `;
    
    notification.appendChild(closeButton);
    
    // 호버 효과
    notification.addEventListener('mouseenter', () => {
      notification.style.transform = 'translateX(-5px)';
      notification.style.boxShadow = '0 12px 48px rgba(0,0,0,0.18)';
    });
    
    notification.addEventListener('mouseleave', () => {
      notification.style.transform = 'translateX(0)';
      notification.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
    });
    
    return notification;
  }

  // ===== YouTube 전용 안정적인 DOM 조작 메서드들 =====

  /**
   * YouTube 페이지에서 안정적인 컨테이너 찾기 (ImprovedTube 패턴)
   * @param {Array<string>} selectors - 후보 셀렉터들
   * @param {string} context - 컨텍스트 (로깅용)
   * @returns {HTMLElement|null} 찾은 컨테이너 또는 null
   */
  findStableYouTubeContainer(selectors, context = 'YouTube Container') {
    for (const selector of selectors) {
      try {
        const container = document.querySelector(selector);
        if (container && this.isElementVisible(container)) {
          Utils.log('success', `${context} 컨테이너 발견`, selector);
          return container;
        }
      } catch (error) {
        Utils.log('warn', `${context} 셀렉터 실패: ${selector}`, error.message);
      }
    }
    
    Utils.log('warn', `${context} 컨테이너를 찾을 수 없음`, selectors);
    return null;
  }

  /**
   * 요소가 실제로 화면에 보이는지 확인
   * @param {HTMLElement} element - 확인할 요소
   * @returns {boolean} 표시 여부
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * YouTube 채널 페이지에 안정적으로 버튼 추가
   * @param {HTMLButtonElement} button - 추가할 버튼
   * @param {string} buttonClass - 중복 방지용 클래스명
   * @returns {boolean} 성공 여부
   */
  injectYouTubeChannelButton(button, buttonClass = 'insightreel-channel-button') {
    // 중복 방지: 기존 버튼이 있으면 제거
    const existing = document.querySelector(`.${buttonClass}`);
    if (existing) {
      existing.remove();
      Utils.log('info', '기존 버튼 제거됨', buttonClass);
    }

    // 채널 페이지 컨테이너 후보들 (ImprovedTube 패턴)
    const channelContainers = [
      'ytd-channel-sub-menu-renderer #primary-items', // 주요 위치
      'ytd-two-column-browse-results-renderer #chips-content', // 대체 위치
      '#channel-header ytd-subscribe-button-renderer', // 구독 버튼 근처
      '.ytd-c4-tabbed-header-renderer #subscribe-button', // 헤더 영역
      'ytd-channel-header-renderer #buttons' // 버튼 그룹 영역
    ];

    const container = this.findStableYouTubeContainer(channelContainers, 'Channel Page');
    
    if (container) {
      button.classList.add(buttonClass);
      
      // 적절한 위치에 삽입 (기존 요소들과 조화)
      if (container.id === 'primary-items' || container.id === 'chips-content') {
        container.appendChild(button);
      } else {
        container.insertAdjacentElement('afterend', button);
      }
      
      Utils.log('success', '채널 페이지 버튼 주입 성공', container.tagName);
      return true;
    }

    return false;
  }

  /**
   * YouTube 비디오 페이지에 안정적으로 버튼 추가 (ImprovedTube 방식으로 완전 개선)
   * @param {HTMLButtonElement} button - 추가할 버튼
   * @param {string} buttonClass - 중복 방지용 클래스명
   * @returns {boolean} 성공 여부
   */
  injectYouTubeVideoButton(button, buttonClass = 'insightreel-video-button') {
    Utils.log('info', '🔍 영상 분석 버튼 주입 시도 시작', window.location.href);
    
    // 중복 방지
    const existing = document.querySelector(`.${buttonClass}`);
    if (existing) {
      Utils.log('info', '🗑️ 기존 영상 버튼 제거');
      existing.remove();
    }

    // 현재 페이지의 DOM 구조 로깅
    Utils.log('info', '📊 현재 비디오 페이지 DOM 구조 분석:');
    Utils.log('info', '- ytd-watch-flexy:', !!document.querySelector('ytd-watch-flexy'));
    Utils.log('info', '- actions:', !!document.querySelector('#actions'));
    Utils.log('info', '- top-level-buttons:', !!document.querySelector('#top-level-buttons-computed'));
    Utils.log('info', '- video elements:', document.querySelectorAll('[id*="video"], [class*="video"]').length);

    // ImprovedTube 패턴: 비디오 페이지 컨테이너 후보들 (우선순위별, 25+ 셀렉터)
    const videoContainers = [
      // 1순위: 최신 YouTube Watch 페이지 구조 (2024/2025)
      'ytd-watch-flexy #actions #top-level-buttons-computed',
      'ytd-watch-metadata #actions-inner',
      'ytd-video-primary-info-renderer #menu-container',
      
      // 2순위: 기존 액션 버튼 영역
      '#actions ytd-menu-renderer',
      '#top-level-buttons-computed',
      'ytd-video-primary-info-renderer #menu',
      '#actions-inner',
      
      // 3순위: 좋아요/싫어요 버튼 근처
      'ytd-segmented-like-dislike-button-renderer',
      'ytd-toggle-button-renderer[class*="like"]',
      '#segmented-like-dislike-button',
      
      // 4순위: 공유/저장 버튼 근처  
      'ytd-button-renderer[class*="share"]',
      'ytd-download-button-renderer',
      'ytd-playlist-add-to-option-renderer',
      
      // 5순위: Watch 헤더 영역
      '#watch-header [role="button"]',
      'ytd-watch-flexy #primary-inner',
      '.ytd-watch-flexy #actions',
      
      // 6순위: 2024/2025 새로운 구조
      '[class*="watch-active-metadata"] #actions',
      'ytd-watch-metadata #actions',
      '[data-target-id*="watch"] #buttons',
      
      // 7순위: 메타데이터 영역
      '#meta-contents #actions',
      'ytd-video-owner-renderer #subscribe-button',
      '.ytd-video-secondary-info-renderer #actions',
      
      // 8순위: Generic 버튼 컨테이너들
      '[role="main"] [role="button"]',
      '#primary [class*="button"]',
      'ytd-app [class*="action"]',
      
      // 9순위: 최후의 수단
      '#columns #primary',
      '#primary-inner',
      'ytd-watch-flexy'
    ];

    Utils.log('info', `🔍 ${videoContainers.length}개 셀렉터로 비디오 컨테이너 검색 시작`);

    for (let i = 0; i < videoContainers.length; i++) {
      const selector = videoContainers[i];
      try {
        Utils.log('info', `🔍 시도 ${i + 1}/${videoContainers.length}: ${selector}`);
        const container = document.querySelector(selector);
        
        if (container) {
          const isVisible = this.isElementVisible(container);
          Utils.log('info', `   📋 요소 발견! 가시성: ${isVisible ? '✅' : '❌'}`);
          Utils.log('info', `   📐 크기: ${container.offsetWidth}x${container.offsetHeight}`);
          
          if (isVisible) {
            Utils.log('success', `🎯 비디오 컨테이너 선택됨: ${selector}`);
            return this.createAndInjectVideoButton(container, selector, button, buttonClass);
          }
        } else {
          Utils.log('info', `   ❌ 요소 없음`);
        }
      } catch (error) {
        Utils.log('warn', `⚠️ 셀렉터 오류 ${selector}:`, error.message);
      }
    }
    
    // 모든 셀렉터 실패시 추가 디버깅
    Utils.log('warn', '🔍 모든 비디오 셀렉터 실패 - 추가 DOM 분석:');
    const allVideoElements = document.querySelectorAll('*[id*="video"], *[class*="video"], *[id*="watch"], *[class*="watch"], *[id*="action"], *[class*="action"]');
    Utils.log('info', `📋 비디오/액션 관련 요소 ${allVideoElements.length}개 발견:`);
    allVideoElements.forEach((el, index) => {
      if (index < 10) {
        Utils.log('info', `   ${index + 1}. ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''}`);
      }
    });

    return false;
  }

  /**
   * 비디오 컨테이너에 따라 적절한 위치에 버튼 생성 및 주입
   * @param {HTMLElement} container - 컨테이너
   * @param {string} selector - 사용된 셀렉터
   * @param {HTMLButtonElement} button - 버튼
   * @param {string} buttonClass - 클래스
   * @returns {boolean} 성공 여부
   */
  createAndInjectVideoButton(container, selector, button, buttonClass) {
    Utils.log('info', `🎨 비디오 버튼 생성 및 주입: ${selector}`);
    
    try {
      button.classList.add(buttonClass);
      
      // 컨테이너 타입에 따라 주입 방식 결정
      if (selector.includes('top-level-buttons') || selector.includes('actions-inner')) {
        Utils.log('info', '📍 액션 버튼 그룹에 추가');
        container.appendChild(button);
        
        // YouTube 액션 버튼 스타일
        button.style.cssText = `
          background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
          color: white !important;
          border: none !important;
          border-radius: 18px !important;
          padding: 8px 16px !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          cursor: pointer !important;
          margin: 0 8px !important;
          display: inline-flex !important;
          align-items: center !important;
          transition: all 0.2s ease !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
          height: 36px !important;
        `;
        
      } else if (selector.includes('like-dislike') || selector.includes('toggle-button')) {
        Utils.log('info', '📍 좋아요/싫어요 버튼 근처에 추가');
        container.insertAdjacentElement('afterend', button);
        
        // 좋아요 버튼 스타일과 유사하게
        button.style.cssText = `
          background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
          color: white !important;
          border: none !important;
          border-radius: 18px !important;
          padding: 8px 16px !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          cursor: pointer !important;
          margin-left: 8px !important;
          display: inline-flex !important;
          align-items: center !important;
          transition: all 0.2s ease !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
          height: 36px !important;
        `;
        
      } else if (selector.includes('subscribe-button') || selector.includes('owner-renderer')) {
        Utils.log('info', '📍 구독자 영역에 추가');
        container.insertAdjacentElement('afterend', button);
        
        // 구독 버튼 스타일과 조화
        button.style.cssText = `
          background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
          color: white !important;
          border: none !important;
          border-radius: 20px !important;
          padding: 10px 20px !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          cursor: pointer !important;
          margin-left: 12px !important;
          display: inline-flex !important;
          align-items: center !important;
          transition: all 0.3s ease !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
        `;
        
      } else {
        Utils.log('info', '📍 일반 컨테이너에 플로팅 스타일로 추가');
        container.appendChild(button);
        
        // 플로팅 스타일
        const containerStyle = window.getComputedStyle(container);
        if (containerStyle.position === 'static') {
          container.style.position = 'relative';
        }
        
        button.style.cssText = `
          background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
          color: white !important;
          border: none !important;
          border-radius: 20px !important;
          padding: 10px 18px !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          cursor: pointer !important;
          position: absolute !important;
          top: 10px !important;
          right: 10px !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3) !important;
        `;
      }
      
      Utils.log('success', '✅ 비디오 버튼 주입 성공!');
      return true;
      
    } catch (error) {
      Utils.log('error', '⚠️ 비디오 버튼 주입 중 오류:', error);
      return false;
    }
  }

  /**
   * YouTube Shorts 페이지에 안정적으로 버튼 추가 (ImprovedTube 방식으로 완전 개선)
   * @param {HTMLButtonElement} button - 추가할 버튼
   * @param {string} buttonClass - 중복 방지용 클래스명
   * @returns {boolean} 성공 여부
   */
  injectYouTubeShortsButton(button, buttonClass = 'insightreel-shorts-button') {
    Utils.log('info', '🔍 Shorts 분석 버튼 주입 시도 시작', window.location.href);
    
    // 중복 방지
    const existing = document.querySelector(`.${buttonClass}`);
    if (existing) {
      Utils.log('info', '🗑️ 기존 Shorts 버튼 제거');
      existing.remove();
    }

    // 현재 페이지의 DOM 구조 로깅
    Utils.log('info', '📊 현재 Shorts 페이지 DOM 구조 분석:');
    Utils.log('info', '- ytd-shorts:', !!document.querySelector('ytd-shorts'));
    Utils.log('info', '- actions:', !!document.querySelector('#actions'));
    Utils.log('info', '- shorts-player:', !!document.querySelector('#shorts-player'));
    Utils.log('info', '- shorts elements:', document.querySelectorAll('[id*="shorts"], [class*="shorts"]').length);

    // ImprovedTube 패턴: Shorts 페이지 컨테이너 후보들 (우선순위별, 20+ 셀렉터)
    const shortsContainers = [
      // 1순위: 최신 YouTube Shorts 구조 (2024/2025)
      'ytd-shorts #actions ytd-like-button-view-model',
      'ytd-reel-video-renderer #actions',
      'ytd-shorts-video-actions #actions',
      
      // 2순위: 기존 Shorts 액션 영역
      '#actions', 
      '.ytd-shorts-video-actions',
      'ytd-shorts-player-controls #actions',
      '#shorts-inner-container #actions',
      
      // 3순위: Shorts 플레이어 영역
      '#shorts-player #actions-bar',
      'ytd-shorts-player-controls #buttons',
      '#shorts-player ytd-like-button-renderer',
      
      // 4순위: 좋아요/댓글 버튼 근처
      'ytd-toggle-button-renderer[aria-label*="like" i]',
      'ytd-button-renderer[class*="like"]',
      '#like-button-view-model',
      
      // 5순위: 공유/저장 버튼 근처
      'ytd-button-renderer[aria-label*="Share" i]',
      'ytd-button-renderer[aria-label*="공유" i]',
      '[data-target-id*="share"]',
      
      // 6순위: Shorts 컨테이너 영역
      'ytd-shorts-video-renderer',
      'ytd-reel-video-renderer',
      '#shorts-container',
      
      // 7순위: 2024/2025 새로운 Shorts 구조
      '[class*="shorts-video-actions"]',
      '[id*="reel-video"] #actions',
      'ytd-shorts [role="button"]',
      
      // 8순위: Generic Shorts 컨테이너들
      'ytd-shorts [class*="action"]',
      '#shorts [class*="button"]',
      '.shorts-player-controls',
      
      // 9순위: 최후의 수단
      'ytd-shorts',
      '#shorts',
      '.shorts-container'
    ];

    Utils.log('info', `🔍 ${shortsContainers.length}개 셀렉터로 Shorts 컨테이너 검색 시작`);

    for (let i = 0; i < shortsContainers.length; i++) {
      const selector = shortsContainers[i];
      try {
        Utils.log('info', `🔍 시도 ${i + 1}/${shortsContainers.length}: ${selector}`);
        const container = document.querySelector(selector);
        
        if (container) {
          const isVisible = this.isElementVisible(container);
          Utils.log('info', `   📋 요소 발견! 가시성: ${isVisible ? '✅' : '❌'}`);
          Utils.log('info', `   📐 크기: ${container.offsetWidth}x${container.offsetHeight}`);
          
          if (isVisible) {
            Utils.log('success', `🎯 Shorts 컨테이너 선택됨: ${selector}`);
            return this.createAndInjectShortsButton(container, selector, button, buttonClass);
          }
        } else {
          Utils.log('info', `   ❌ 요소 없음`);
        }
      } catch (error) {
        Utils.log('warn', `⚠️ 셀렉터 오류 ${selector}:`, error.message);
      }
    }
    
    // 모든 셀렉터 실패시 추가 디버깅
    Utils.log('warn', '🔍 모든 Shorts 셀렉터 실패 - 추가 DOM 분석:');
    const allShortsElements = document.querySelectorAll('*[id*="shorts"], *[class*="shorts"], *[id*="reel"], *[class*="reel"], *[id*="action"], *[class*="action"]');
    Utils.log('info', `📋 Shorts/액션 관련 요소 ${allShortsElements.length}개 발견:`);
    allShortsElements.forEach((el, index) => {
      if (index < 10) {
        Utils.log('info', `   ${index + 1}. ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''}`);
      }
    });

    return false;
  }

  /**
   * Shorts 컨테이너에 따라 적절한 위치에 버튼 생성 및 주입
   * @param {HTMLElement} container - 컨테이너
   * @param {string} selector - 사용된 셀렉터
   * @param {HTMLButtonElement} button - 버튼
   * @param {string} buttonClass - 클래스
   * @returns {boolean} 성공 여부
   */
  createAndInjectShortsButton(container, selector, button, buttonClass) {
    Utils.log('info', `🎨 Shorts 버튼 생성 및 주입: ${selector}`);
    
    try {
      button.classList.add(buttonClass);
      
      // 컨테이너 타입에 따라 주입 방식 결정
      if (selector.includes('#actions') && !selector.includes('ytd-shorts ')) {
        Utils.log('info', '📍 Shorts 액션 영역에 세로로 추가');
        container.appendChild(button);
        
        // Shorts 세로 액션 버튼 스타일 (좋아요/댓글 버튼과 유사)
        button.style.cssText = `
          position: relative !important;
          margin: 8px 0 !important;
          width: 48px !important;
          height: 48px !important;
          border-radius: 24px !important;
          font-size: 10px !important;
          line-height: 1.2 !important;
          padding: 4px !important;
          background: rgba(0, 0, 0, 0.8) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          backdrop-filter: blur(10px) !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        `;
        
      } else if (selector.includes('like-button') || selector.includes('toggle-button')) {
        Utils.log('info', '📍 좋아요 버튼 근처에 추가');
        container.insertAdjacentElement('afterend', button);
        
        // 좋아요 버튼과 유사한 스타일
        button.style.cssText = `
          position: relative !important;
          margin: 8px 0 !important;
          width: 48px !important;
          height: 48px !important;
          border-radius: 24px !important;
          font-size: 10px !important;
          line-height: 1.2 !important;
          padding: 4px !important;
          background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
          color: white !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3) !important;
        `;
        
      } else if (selector.includes('share') || selector.includes('공유')) {
        Utils.log('info', '📍 공유 버튼 근처에 추가');
        container.insertAdjacentElement('afterend', button);
        
        // 공유 버튼과 유사한 스타일
        button.style.cssText = `
          position: relative !important;
          margin: 8px 0 !important;
          width: 48px !important;
          height: 48px !important;
          border-radius: 24px !important;
          font-size: 10px !important;
          line-height: 1.2 !important;
          padding: 4px !important;
          background: rgba(0, 0, 0, 0.8) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          backdrop-filter: blur(10px) !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        `;
        
      } else {
        Utils.log('info', '📍 일반 Shorts 컨테이너에 플로팅 스타일로 추가');
        container.appendChild(button);
        
        // 플로팅 스타일 (Shorts 전용)
        const containerStyle = window.getComputedStyle(container);
        if (containerStyle.position === 'static') {
          container.style.position = 'relative';
        }
        
        button.style.cssText = `
          position: absolute !important;
          top: 20px !important;
          right: 20px !important;
          width: 64px !important;
          height: 64px !important;
          border-radius: 32px !important;
          font-size: 11px !important;
          line-height: 1.2 !important;
          padding: 8px !important;
          background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
          color: white !important;
          border: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          z-index: 1000 !important;
          white-space: nowrap !important;
          box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4) !important;
          backdrop-filter: blur(10px) !important;
        `;
      }
      
      // 호버 효과 추가
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 8px 20px rgba(255, 107, 107, 0.5)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = button.style.boxShadow.replace('0.5', '0.3');
      });
      
      Utils.log('success', '✅ Shorts 버튼 주입 성공!');
      return true;
      
    } catch (error) {
      Utils.log('error', '⚠️ Shorts 버튼 주입 중 오류:', error);
      return false;
    }
  }

  /**
   * 타이밍 문제 해결을 위한 지연 실행 버튼 주입
   * @param {Function} injectionFunction - 주입 함수
   * @param {HTMLButtonElement} button - 버튼
   * @param {string} buttonClass - 클래스명
   * @param {number} maxRetries - 최대 재시도 횟수
   * @param {number} retryDelay - 재시도 간격 (ms)
   * @returns {Promise<boolean>} 성공 여부
   */
  async injectButtonWithRetry(injectionFunction, button, buttonClass, maxRetries = 5, retryDelay = 200) {
    for (let i = 0; i < maxRetries; i++) {
      const success = injectionFunction.call(this, button, buttonClass);
      
      if (success) {
        Utils.log('success', `버튼 주입 성공 (${i + 1}번째 시도)`, buttonClass);
        return true;
      }
      
      if (i < maxRetries - 1) {
        Utils.log('info', `버튼 주입 재시도 ${i + 1}/${maxRetries}`, buttonClass);
        await this.delay(retryDelay);
      }
    }
    
    Utils.log('error', `버튼 주입 실패 (${maxRetries}회 시도 후)`, buttonClass);
    return false;
  }

  /**
   * Promise 기반 지연
   * @param {number} ms - 지연 시간 (밀리초)
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
}