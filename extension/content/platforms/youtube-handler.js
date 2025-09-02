import { CONSTANTS } from '../constants.js';
import { Utils, StringUtils, TimeUtils, DOMUtils } from '../utils.js';
import { BasePlatformHandler } from './base-handler.js';
import { ErrorHandler } from '../error-handler.js';

/**
 * YouTube 플랫폼 핸들러
 */
export class YouTubeHandler extends BasePlatformHandler {
  constructor(apiClient, uiManager) {
    super(apiClient, uiManager, 'youtube');
    
    // YouTube 특화 설정
    this.isShorts = false;
    this.videoId = null;
    this.setupPageDetection();
  }

  /**
   * 페이지 타입 감지 (일반 영상 vs Shorts)
   */
  setupPageDetection() {
    this.detectPageType();
    
    // YouTube SPA 네비게이션 감지
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(() => {
          this.detectPageType();
          this.enhancePage();
        }, 1000); // 페이지 로딩 대기
      }
    }, CONSTANTS.TIMEOUTS.URL_CHECK_INTERVAL);
  }

  /**
   * 현재 페이지 타입 감지
   */
  detectPageType() {
    const url = window.location.href;
    this.isShorts = url.includes('/shorts/');
    this.videoId = this.extractVideoId(url);
    
    this.log('info', `페이지 타입 감지: ${this.isShorts ? 'Shorts' : '일반 영상'}`, {
      url,
      videoId: this.videoId
    });
  }

  /**
   * URL에서 비디오 ID 추출
   */
  extractVideoId(url) {
    const patterns = [
      CONSTANTS.PLATFORM_URLS.YOUTUBE.VIDEO_PATTERN,
      CONSTANTS.PLATFORM_URLS.YOUTUBE.SHORTS_PATTERN,
      CONSTANTS.PLATFORM_URLS.YOUTUBE.EMBED_PATTERN,
      CONSTANTS.PLATFORM_URLS.YOUTUBE.SHORT_URL_PATTERN
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * YouTube 저장 버튼 기능 향상
   */
  enhanceSaveButtons() {
    if (this.shouldSkipEnhancement()) {
      return;
    }

    this.startProcessing();
    this.log('info', 'YouTube 저장 버튼 기능 향상 시작');
    
    setTimeout(() => {
      ErrorHandler.safeExecute(async () => {
        this.addAnalysisButtons();
      }, 'YouTube 저장 버튼 향상').finally(() => {
        this.endProcessing();
      });
    }, 1000);
  }

  /**
   * 페이지 향상 (SPA 네비게이션 대응)
   */
  enhancePage() {
    if (!this.videoId) {
      this.log('warn', '비디오 ID를 찾을 수 없음');
      return;
    }

    this.enhanceSaveButtons();
  }

  /**
   * 분석 버튼 추가
   */
  addAnalysisButtons() {
    if (this.isShorts) {
      this.addShortsAnalysisButton();
    } else {
      this.addVideoAnalysisButton();
    }
  }

  /**
   * Shorts용 분석 버튼 추가
   */
  addShortsAnalysisButton() {
    const shortsContainer = document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.SHORTS_CONTAINER);
    if (!shortsContainer) {
      this.log('warn', 'Shorts 컨테이너를 찾을 수 없음');
      return;
    }

    // 기존 버튼 확인
    if (shortsContainer.querySelector('.youtube-analysis-button')) {
      return;
    }

    const button = this.createAnalysisButton('YouTube Shorts 분석');
    
    // Shorts 액션 버튼 영역에 추가
    const actionsArea = shortsContainer.querySelector('#actions') || 
                       shortsContainer.querySelector('.ytd-shorts-video-actions');
    
    if (actionsArea) {
      button.style.cssText = `
        position: relative !important;
        margin: 8px 0 !important;
        width: 48px !important;
        height: 48px !important;
        border-radius: 24px !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
        padding: 2px !important;
        background: rgba(0, 0, 0, 0.8) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        backdrop-filter: blur(10px) !important;
      `;
      
      actionsArea.appendChild(button);
      this.log('success', 'Shorts 분석 버튼 추가됨');
    }
  }

  /**
   * 일반 영상용 분석 버튼 추가
   */
  addVideoAnalysisButton() {
    // 기존 액션 버튼들 찾기 (좋아요, 공유 등)
    const actionButtons = document.querySelector('#top-level-buttons-computed') ||
                         document.querySelector('#menu-container') ||
                         document.querySelector('.ytd-menu-renderer');

    if (!actionButtons) {
      this.log('warn', '액션 버튼 영역을 찾을 수 없음');
      return;
    }

    // 기존 버튼 확인
    if (actionButtons.querySelector('.youtube-analysis-button')) {
      return;
    }

    const button = this.createAnalysisButton('영상 분석');
    
    button.style.cssText = `
      position: relative !important;
      margin: 0 8px !important;
      padding: 8px 16px !important;
      font-size: 14px !important;
      background: #ff0000 !important;
      color: white !important;
      border: none !important;
      border-radius: 18px !important;
      cursor: pointer !important;
      font-weight: 500 !important;
      transition: all 0.2s ease !important;
      white-space: nowrap !important;
    `;

    // 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.background = '#cc0000 !important';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = '#ff0000 !important';
    });

    actionButtons.appendChild(button);
    this.log('success', '일반 영상 분석 버튼 추가됨');
  }

  /**
   * 분석 버튼 생성
   */
  createAnalysisButton(text) {
    const button = document.createElement('button');
    button.className = 'youtube-analysis-button';
    button.textContent = text;
    button.title = 'YouTube 영상을 AI로 분석하여 저장합니다';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleAnalysisButtonClick(button);
    });

    return button;
  }

  /**
   * 분석 버튼 클릭 처리
   */
  async handleAnalysisButtonClick(button) {
    if (!this.videoId) {
      this.uiManager.showNotification('비디오 ID를 찾을 수 없습니다.', 'error');
      return;
    }

    const originalText = button.textContent;
    button.textContent = '분석 중...';
    button.disabled = true;

    try {
      const metadata = this.extractMetadata();
      const videoUrl = this.getCurrentVideoUrl();
      
      this.log('info', 'YouTube 영상 분석 시작', {
        videoId: this.videoId,
        videoUrl,
        isShorts: this.isShorts,
        metadata
      });

      const result = await this.apiClient.processVideo({
        platform: 'youtube',
        videoUrl: videoUrl,
        postUrl: window.location.href,
        metadata: metadata,
        analysisType: 'quick'
      });

      this.log('success', 'YouTube 영상 분석 완료', result);
      this.uiManager.showNotification(
        `분석 완료: ${result.analysis?.category || '카테고리 분석됨'}`, 
        'success'
      );

    } catch (error) {
      this.log('error', 'YouTube 영상 분석 실패', error);
      this.uiManager.showNotification('분석 실패: ' + error.message, 'error');
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  /**
   * 현재 영상 URL 생성
   */
  getCurrentVideoUrl() {
    if (this.isShorts) {
      return `https://www.youtube.com/shorts/${this.videoId}`;
    } else {
      return `https://www.youtube.com/watch?v=${this.videoId}`;
    }
  }

  /**
   * 메타데이터 추출
   */
  extractMetadata() {
    const metadata = {
      platform: 'youtube',
      isShorts: this.isShorts,
      videoId: this.videoId
    };

    try {
      // 제목 추출
      const titleElement = document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.VIDEO_TITLE) ||
                          document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.VIDEO_TITLE_ALT) ||
                          document.querySelector('h1.ytd-watch-metadata') ||
                          document.querySelector('#title h1');
      
      if (titleElement) {
        metadata.title = titleElement.textContent?.trim();
      }

      // 채널명 추출  
      const channelElement = document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.CHANNEL_NAME) ||
                           document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.CHANNEL_NAME_ALT) ||
                           document.querySelector('#channel-name a') ||
                           document.querySelector('#owner-name a');
      
      if (channelElement) {
        metadata.author = channelElement.textContent?.trim();
      }

      // 조회수 추출 (가능한 경우)
      const viewElement = document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.VIEW_COUNT) ||
                         document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.VIEW_COUNT_ALT) ||
                         document.querySelector('#info-text .view-count');
      
      if (viewElement) {
        metadata.views = viewElement.textContent?.trim();
      }

      // 설명 추출 (일부)
      const descElement = document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.DESCRIPTION) ||
                         document.querySelector(CONSTANTS.SELECTORS.YOUTUBE.DESCRIPTION_ALT);
      
      if (descElement) {
        metadata.description = descElement.textContent?.trim().substring(0, 200);
      }

      this.log('info', 'YouTube 메타데이터 추출됨', metadata);
      
    } catch (error) {
      this.log('warn', 'YouTube 메타데이터 추출 중 오류', error);
    }

    return metadata;
  }

  /**
   * 향상 스킵 여부 확인
   */
  shouldSkipEnhancement() {
    if (!this.videoId) {
      return true;
    }

    const now = Date.now();
    if (now - this.lastEnhancementTime < CONSTANTS.TIMEOUTS.ENHANCEMENT_THROTTLE) {
      return true;
    }

    if (this.isProcessing) {
      return true;
    }

    return false;
  }

  /**
   * 처리 시작
   */
  startProcessing() {
    this.isProcessing = true;
    this.lastEnhancementTime = Date.now();
  }

  /**
   * 처리 종료
   */
  endProcessing() {
    this.isProcessing = false;
  }
}