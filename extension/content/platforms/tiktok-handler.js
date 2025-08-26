import { CONSTANTS } from '../constants.js';
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
        await this.processBlobVideo(videoUrl, postUrl, metadata);
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
   */
  async processBlobVideo(videoUrl, postUrl, metadata) {
    Utils.log('info', 'TikTok blob URL 처리 중');
    const videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
    
    await this.apiClient.processVideoBlob({
      platform: CONSTANTS.PLATFORMS.TIKTOK,
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
}