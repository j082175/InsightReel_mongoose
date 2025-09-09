import { CONSTANTS } from '../constants.js';
import { Utils, StringUtils, TimeUtils, DOMUtils } from '../utils.js';
import { BasePlatformHandler } from './base-handler.js';
import { FieldMapper } from '../../utils/field-mapper.js';

/**
 * TikTok 플랫폼 핸들러
 */
export class TikTokHandler extends BasePlatformHandler {
  constructor(apiClient, uiManager) {
    super(apiClient, uiManager, 'tiktok');
  }

  /**
   * TikTok 저장 버튼 추가
   */
  addSaveButtons() {
    this.log('info', '저장 버튼 추가 시작');
    
    const videoContainers = Utils.safeQuerySelectorAll(
      document, 
      CONSTANTS.SELECTORS.TIKTOK.VIDEO_PLAYER
    );
    
    this.log('info', `발견된 비디오: ${videoContainers.length}개`);
    
    videoContainers.forEach((container, index) => {
      try {
        this.processVideoContainer(container, index);
      } catch (error) {
        this.log('error', `비디오 ${index + 1} 처리 실패`, error);
      }
    });
  }

  /**
   * 비디오 컨테이너 처리
   * @param {Element} videoContainer 비디오 컨테이너
   * @param {number} index 인덱스
   */
  processVideoContainer(videoContainer, index) {
    const videoId = this.generateUniqueId(videoContainer, 'tiktok_video');
    
    // 이미 처리된 비디오는 스킵
    if (this.isProcessed(videoId, 'video')) {
      this.log('info', `비디오 ${index + 1}: 이미 처리됨`);
      return;
    }

    // 기존 버튼 확인
    if (videoContainer.querySelector('.video-save-button')) {
      this.log('info', `비디오 ${index + 1}: 이미 버튼이 존재함`);
      this.markAsProcessed(videoId, 'video');
      return;
    }
    
    const videoElement = Utils.safeQuerySelector(
      videoContainer, 
      'video'
    );
    
    if (!videoElement) {
      this.log('warn', `비디오 ${index + 1}: video 요소를 찾을 수 없음`);
      return;
    }
    
    const sideActions = this.findSideActions(videoContainer);
    if (!sideActions) {
      this.log('warn', `비디오 ${index + 1}: 사이드 액션 영역을 찾을 수 없음`);
      return;
    }
    
    this.addSaveButtonToSideActions(sideActions, videoContainer, videoElement, index);
    this.markAsProcessed(videoId, 'video');
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
      this.log('success', `TikTok 비디오 ${index + 1}: 저장 버튼 추가 완료`);
    } catch (error) {
      this.log('error', `TikTok 비디오 ${index + 1}: 버튼 추가 실패`, error);
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
    
    // innerHTML 대신 안전한 DOM 조작 사용
    const iconDiv = document.createElement('div');
    iconDiv.style.fontSize = '16px';
    iconDiv.textContent = '💾';
    
    const textDiv = document.createElement('div');
    textDiv.style.fontSize = '8px';
    textDiv.style.marginTop = '2px';
    textDiv.textContent = '분석';
    
    button.appendChild(iconDiv);
    button.appendChild(textDiv);
    
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
      
      this.log('info', 'TikTok 비디오 처리 시작', { videoUrl, postUrl });
      
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
      this.log('error', 'TikTok 비디오 처리 실패', error);
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
    this.log('info', 'TikTok blob URL 처리 중');
    
    try {
      const videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
      
      await this.apiClient.processVideoBlob({
        platform: CONSTANTS.PLATFORMS.TIKTOK,
        videoBlob,
        postUrl,
        metadata
      });
    } catch (error) {
      this.log('warn', 'TikTok blob URL 다운로드 실패, Canvas 프레임 캡처로 대체', error);
      
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
    const result = await this.callApiWithDuplicateCheck(
      this.apiClient.processVideo,
      {
        platform: CONSTANTS.PLATFORMS.TIKTOK,
        videoUrl,
        postUrl,
        metadata
      }
    );
    
    if (result === null) {
      // 중복 URL로 인한 처리 중단
      this.log('info', '중복 URL로 인해 TikTok 처리 중단됨');
      return;
    }
    
    this.log('success', 'TikTok 영상 처리 완료', result);
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
      
      // 업로드 날짜 추출
      const uploadDate = this.extractUploadDate();
      
      // TikTok 특화 정보
      const duration = this.getVideoDuration(videoContainer);
      const isLive = this.checkIfLive(videoContainer);
      
      // FieldMapper 표준을 사용한 메타데이터 구조
      return {
        [FieldMapper.get('CHANNEL_NAME')]: author.trim(),
        [FieldMapper.get('DESCRIPTION')]: caption.trim(),
        [FieldMapper.get('LIKES')]: likes.trim(),
        [FieldMapper.get('COMMENTS_COUNT')]: '0', // TikTok은 댓글수 추출 어려움
        [FieldMapper.get('HASHTAGS')]: hashtags,
        [FieldMapper.get('UPLOAD_DATE')]: uploadDate,
        duration,
        isLive,
        [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
        [FieldMapper.get('PLATFORM')]: CONSTANTS.PLATFORMS.TIKTOK
      };
    } catch (error) {
      this.log('error', 'TikTok 메타데이터 추출 실패', error);
      return { 
        [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
        [FieldMapper.get('PLATFORM')]: CONSTANTS.PLATFORMS.TIKTOK
      };
    }
  }

  /**
   * TikTok 업로드 날짜 추출
   * @returns {string|null} ISO 날짜 문자열 또는 null
   */
  extractUploadDate() {
    try {
      // TikTok 날짜 표시 위치들
      const dateSelectors = [
        'time[datetime]',
        'time[title]',
        '[data-e2e="video-desc"] time',
        '[data-e2e="browse-video-desc"] time',
        'div[data-e2e="video-meta"] time',
        'span[data-e2e="video-publish-date"]'
      ];

      // 방법 1: datetime 속성이 있는 time 요소
      for (const selector of dateSelectors) {
        const timeElement = document.querySelector(selector);
        if (timeElement) {
          // datetime 속성 우선
          if (timeElement.dateTime || timeElement.getAttribute('datetime')) {
            const datetime = timeElement.dateTime || timeElement.getAttribute('datetime');
            const uploadDate = new Date(datetime).toISOString();
            this.log('info', `TikTok 업로드 날짜 추출 성공 (datetime): ${datetime} -> ${uploadDate}`);
            return uploadDate;
          }
          
          // title 속성 확인
          if (timeElement.title) {
            try {
              const parsedDate = new Date(timeElement.title);
              if (!isNaN(parsedDate.getTime())) {
                const uploadDate = parsedDate.toISOString();
                this.log('info', `TikTok 업로드 날짜 추출 성공 (title): ${timeElement.title} -> ${uploadDate}`);
                return uploadDate;
              }
            } catch (e) {}
          }

          // innerText에서 상대적 시간 파싱
          const timeText = timeElement.innerText.trim();
          const parsedDate = this.parseRelativeDate(timeText);
          if (parsedDate) {
            const uploadDate = parsedDate.toISOString();
            this.log('info', `TikTok 업로드 날짜 추출 성공 (상대시간): ${timeText} -> ${uploadDate}`);
            return uploadDate;
          }
        }
      }

      // 방법 2: 상대적 시간 텍스트를 전체 문서에서 검색
      const relativeTimeSelectors = [
        'span', 'div', 'a'
      ];

      for (const selector of relativeTimeSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.innerText.trim();
          // "1일 전", "2주 전", "3개월 전" 패턴 확인
          if (this.isRelativeTimePattern(text)) {
            const parsedDate = this.parseRelativeDate(text);
            if (parsedDate) {
              const uploadDate = parsedDate.toISOString();
              this.log('info', `TikTok 업로드 날짜 추출 성공 (패턴매칭): ${text} -> ${uploadDate}`);
              return uploadDate;
            }
          }
        }
      }

      this.log('warn', 'TikTok 업로드 날짜를 찾을 수 없음');
      return null;

    } catch (error) {
      this.log('error', 'TikTok 업로드 날짜 추출 실패', error);
      return null;
    }
  }

  /**
   * 상대적 시간 패턴 확인
   */
  isRelativeTimePattern(text) {
    const patterns = [
      /^\d+분\s*전$/,
      /^\d+시간\s*전$/,
      /^\d+일\s*전$/,
      /^\d+주\s*전$/,
      /^\d+개월\s*전$/,
      /^\d+년\s*전$/,
      /^\d+\s*minutes?\s*ago$/i,
      /^\d+\s*hours?\s*ago$/i,
      /^\d+\s*days?\s*ago$/i,
      /^\d+\s*weeks?\s*ago$/i,
      /^\d+\s*months?\s*ago$/i,
      /^\d+\s*years?\s*ago$/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * 상대적 시간 텍스트를 Date 객체로 변환
   */
  parseRelativeDate(timeText) {
    try {
      const now = new Date();
      
      // 한국어 패턴
      const koreanPatterns = [
        { pattern: /(\d+)분\s*전/, unit: 'minutes' },
        { pattern: /(\d+)시간\s*전/, unit: 'hours' },
        { pattern: /(\d+)일\s*전/, unit: 'days' },
        { pattern: /(\d+)주\s*전/, unit: 'weeks' },
        { pattern: /(\d+)개월\s*전/, unit: 'months' },
        { pattern: /(\d+)년\s*전/, unit: 'years' }
      ];

      // 영어 패턴
      const englishPatterns = [
        { pattern: /(\d+)\s*minutes?\s*ago/i, unit: 'minutes' },
        { pattern: /(\d+)\s*hours?\s*ago/i, unit: 'hours' },
        { pattern: /(\d+)\s*days?\s*ago/i, unit: 'days' },
        { pattern: /(\d+)\s*weeks?\s*ago/i, unit: 'weeks' },
        { pattern: /(\d+)\s*months?\s*ago/i, unit: 'months' },
        { pattern: /(\d+)\s*years?\s*ago/i, unit: 'years' }
      ];

      const allPatterns = [...koreanPatterns, ...englishPatterns];

      for (const { pattern, unit } of allPatterns) {
        const match = timeText.match(pattern);
        if (match) {
          const amount = parseInt(match[1]);
          const date = new Date(now);
          
          switch (unit) {
            case 'minutes':
              date.setMinutes(date.getMinutes() - amount);
              break;
            case 'hours':
              date.setHours(date.getHours() - amount);
              break;
            case 'days':
              date.setDate(date.getDate() - amount);
              break;
            case 'weeks':
              date.setDate(date.getDate() - (amount * 7));
              break;
            case 'months':
              date.setMonth(date.getMonth() - amount);
              break;
            case 'years':
              date.setFullYear(date.getFullYear() - amount);
              break;
          }
          
          return date;
        }
      }

      return null;
    } catch (error) {
      this.log('error', 'TikTok 상대적 시간 파싱 실패', { timeText, error });
      return null;
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
      this.log('warn', '비디오 길이 추출 실패', error);
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
      this.log('warn', '라이브 방송 확인 실패', error);
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
        this.log('info', 'TikTok 페이지 변경 감지');
        
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
    
    this.log('info', 'TikTok 페이지 변경 관찰 시작');
  }

  /**
   * 스크롤 기반 새 비디오 감지 (무한 스크롤)
   */
  observeScrollChanges() {
    const scrollHandler = Utils.debounce(() => {
      this.log('info', 'TikTok 스크롤 기반 새 비디오 검색');
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
    this.log('info', 'TikTok 스크롤 기반 비디오 감지 시작');
  }
}