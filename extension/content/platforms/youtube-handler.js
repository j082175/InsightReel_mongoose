import { CONSTANTS } from '../constants.js';
import { Utils, StringUtils, TimeUtils, DOMUtils } from '../utils.js';
import { BasePlatformHandler } from './base-handler.js';
import { ErrorHandler } from '../error-handler.js';

/**
 * YouTube 플랫폼 핸들러
 */
export class YouTubeHandler extends BasePlatformHandler {
  constructor(apiClient, uiManager) {
    super(apiClient, uiManager, 'YOUTUBE');
    
    // YouTube 특화 설정
    this.isShorts = false;
    this.videoId = null;
    this.buttonMonitorInterval = null; // 버튼 모니터링 인터벌
    this.setupPageDetection();
    this.startButtonMonitoring(); // 지속적인 버튼 모니터링 시작
  }

  /**
   * 페이지 타입 감지 (일반 영상 vs Shorts)
   */
  setupPageDetection() {
    this.detectPageType();
    
    // YouTube 공식 SPA 네비게이션 이벤트 감지 (ImprovedTube 패턴)
    window.addEventListener('yt-navigate-finish', () => {
      this.log('info', 'YouTube 페이지 네비게이션 감지됨', window.location.href);
      
      // 페이지 변경 후 적절한 지연을 두고 재초기화
      setTimeout(() => {
        this.detectPageType();
        this.enhancePage();
      }, 500); // 더 짧은 지연으로 반응성 개선
    });
    
    // 백업: URL 변화 감지 (기존 방식 유지)
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.log('info', 'URL 변화 감지 (백업 방식)', lastUrl);
        setTimeout(() => {
          this.detectPageType();
          this.enhancePage();
        }, 1000);
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
    
    // 정확한 페이지 타입 판단
    let pageType = '';
    if (this.isShorts) {
      pageType = 'Shorts';
    } else if (this.isChannelPage()) {
      pageType = '채널';
    } else if (this.videoId) {
      pageType = '일반 영상';
    } else {
      pageType = '기타';
    }
    
    this.log('info', `페이지 타입 감지: ${pageType}`, {
      url,
      videoId: this.videoId,
      isShorts: this.isShorts,
      isChannel: this.isChannelPage()
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
   * 페이지 향상 (SPA 네비게이션 대응, ImprovedTube 패턴)
   */
  async enhancePage() {
    // DOM Ready 상태 확인 (ImprovedTube 방식)
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }
    
    // YouTube 페이지가 완전히 로드될 때까지 추가 대기
    await this.waitForYouTubeReady();
    
    if (!this.videoId && !this.isChannelPage()) {
      this.log('warn', '비디오 ID를 찾을 수 없음 (채널 페이지 아님)');
      return;
    }

    // 순차적으로 기능 적용
    this.enhanceSaveButtons();
    await this.addAnalysisButtons();
  }

  /**
   * YouTube가 완전히 로드될 때까지 대기
   */
  async waitForYouTubeReady(maxWait = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // YouTube 기본 요소들이 로드되었는지 확인
      const ytdApp = document.querySelector('ytd-app');
      const masthead = document.querySelector('#masthead');
      
      if (ytdApp && masthead) {
        this.log('info', 'YouTube 기본 구조 로드 완료');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.log('warn', 'YouTube 로드 대기 시간 초과');
  }

  /**
   * 채널 페이지인지 확인
   */
  isChannelPage() {
    const path = window.location.pathname;
    return path.includes('/channel/') || path.includes('/c/') || path.includes('/@');
  }

  /**
   * 분석 버튼 추가 (페이지 타입에 따라 적절한 버튼만 추가)
   */
  async addAnalysisButtons() {
    const url = window.location.href;
    const isChannel = this.isChannelPage();
    const hasVideoId = !!this.videoId;
    
    this.log('info', '🔍 분석 버튼 추가 결정:', {
      url,
      isShorts: this.isShorts,
      isChannel,
      hasVideoId,
      videoId: this.videoId
    });
    
    if (this.isShorts) {
      this.log('info', '📱 Shorts 분석 버튼 추가 선택');
      await this.addShortsAnalysisButton();
    } else if (isChannel) {
      this.log('info', '📊 채널 분석 버튼 추가 선택');
      await this.addChannelAnalysisButton();
    } else if (hasVideoId) {
      this.log('info', '🎬 영상 분석 버튼 추가 선택');
      await this.addVideoAnalysisButton();
    } else {
      this.log('warn', '❓ 알 수 없는 페이지 타입 - 버튼 추가 스킵');
    }
  }

  /**
   * 현재 페이지가 채널 페이지인지 확인
   * @returns {boolean} 채널 페이지 여부
   */
  isChannelPage() {
    const url = window.location.href;
    return url.includes('/channel/') || 
           url.includes('/@') || 
           url.includes('/c/') ||
           url.includes('/user/');
  }

  /**
   * Shorts용 분석 버튼 추가 (ImprovedTube 방식으로 완전 개선)
   */
  async addShortsAnalysisButton() {
    const button = this.createAnalysisButton('📱 Shorts 분석');
    
    // UI Manager의 새로운 Shorts 전용 주입 메서드 사용
    const success = await this.uiManager.injectButtonWithRetry(
      this.uiManager.injectYouTubeShortsButton,
      button,
      'youtube-shorts-analysis-button'
    );

    if (success) {
      this.log('success', '✅ ImprovedTube 방식 Shorts 분석 버튼 추가 완료');
    } else {
      this.log('error', '❌ Shorts 분석 버튼 추가 실패 - 모든 재시도 후');
    }
  }

  /**
   * 일반 영상용 분석 버튼 추가 (ImprovedTube 방식으로 완전 개선)
   */
  async addVideoAnalysisButton() {
    const button = this.createAnalysisButton('🎬 영상 분석');
    
    // UI Manager의 향상된 비디오 버튼 주입 사용 (이미 스타일링 포함)
    const success = await this.uiManager.injectButtonWithRetry(
      this.uiManager.injectYouTubeVideoButton,
      button,
      'youtube-video-analysis-button'
    );

    if (success) {
      this.log('success', '✅ ImprovedTube 방식 영상 분석 버튼 추가 완료');
    } else {
      this.log('error', '❌ 영상 분석 버튼 추가 실패 - 모든 재시도 후');
    }
  }

  /**
   * 채널 페이지용 분석 버튼 추가 (신규)
   */
  async addChannelAnalysisButton() {
    // 채널 페이지인지 확인
    if (!window.location.pathname.includes('/channel/') && !window.location.pathname.includes('/c/') && !window.location.pathname.includes('/@')) {
      return; // 채널 페이지가 아니면 스킵
    }

    const button = this.createAnalysisButton('📊 채널 분석');
    
    // UI Manager의 안정적인 채널 버튼 주입 사용
    const success = await this.uiManager.injectButtonWithRetry(
      this.uiManager.injectYouTubeChannelButton,
      button,
      'youtube-channel-analysis-button'
    );

    if (success) {
      // 채널 페이지에 적합한 스타일
      button.style.cssText = `
        position: relative !important;
        margin: 0 12px !important;
        padding: 10px 20px !important;
        font-size: 14px !important;
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
        color: white !important;
        border: none !important;
        border-radius: 25px !important;
        cursor: pointer !important;
        font-weight: 600 !important;
        transition: all 0.3s ease !important;
        white-space: nowrap !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
        z-index: 1000 !important;
      `;

      // 호버 효과
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px) !important';
        button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4) !important';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0) !important';
        button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3) !important';
      });

      this.log('success', '채널 분석 버튼 추가됨 (안정적 방식)');
    } else {
      this.log('error', '채널 분석 버튼 추가 실패');
    }
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

    this.log('info', 'YouTube 분석 버튼 클릭됨');
    
    // 🎯 새로운 안전한 버튼 처리 사용
    const success = await this.safeButtonProcessing(
      button,
      this.processYouTubeVideoSafe,
      {}
    );

    if (success) {
      this.log('info', 'YouTube 분석 완료');
    }
  }

  /**
   * 안전한 YouTube 비디오 분석 처리
   * @returns {Promise<boolean>} 성공 여부
   */
  async processYouTubeVideoSafe() {
    try {
      const metadata = this.extractMetadata();
      const videoUrl = this.getCurrentVideoUrl();
      
      this.log('info', 'YouTube 영상 분석 시작', {
        videoId: this.videoId,
        videoUrl,
        isShorts: this.isShorts,
        metadata
      });

      // 서버 전송 데이터 생성
      const requestData = {
        platform: CONSTANTS.PLATFORMS.YOUTUBE,
        videoUrl,
        url: videoUrl,
        metadata
      };
      
      const result = await this.callApiWithDuplicateCheck(
        this.apiClient.processVideo,
        requestData
      );

      if (result === null) {
        // 중복 URL로 인한 처리 중단
        this.log('info', '중복 URL로 인해 YouTube 처리 중단됨');
        throw new Error('🔄 이미 처리 중인 영상이거나 중복된 URL입니다');
      }

      this.log('success', 'YouTube 영상 분석 완료', result);
      return true;

    } catch (error) {
      this.log('error', 'YouTube 영상 분석 실패', error);
      throw error;
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
      platform: CONSTANTS.PLATFORMS.YOUTUBE,
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
        metadata.channelName = channelElement.textContent?.trim();
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

  /**
   * 지속적인 버튼 모니터링 시작 (ImprovedTube 방식)
   */
  startButtonMonitoring() {
    this.log('info', '👀 YouTube 버튼 지속 모니터링 시작');
    
    // 기존 모니터링 정리
    if (this.buttonMonitorInterval) {
      clearInterval(this.buttonMonitorInterval);
    }
    
    // 5초마다 버튼 상태 체크
    this.buttonMonitorInterval = setInterval(() => {
      this.checkAndRestoreButtons();
    }, 5000);
  }

  /**
   * 버튼 상태 체크 및 복원
   */
  checkAndRestoreButtons() {
    const url = window.location.href;
    const isChannel = this.isChannelPage();
    const hasVideoId = !!this.videoId;
    
    // 현재 페이지 타입에 따라 해당 버튼이 있는지 체크
    if (this.isShorts) {
      // Shorts 페이지: Shorts 분석 버튼 체크
      if (!document.querySelector('.youtube-shorts-analysis-button')) {
        this.log('info', '🔄 Shorts 분석 버튼이 사라짐 - 재생성 시도');
        this.addShortsAnalysisButton();
      }
    } else if (isChannel) {
      // 채널 페이지: 채널 수집 버튼 체크 (이미 별도 모니터링 있음)
      // youtube-channel-analyzer.js에서 처리
    } else if (hasVideoId) {
      // 일반 영상 페이지: 영상 분석 버튼 체크
      if (!document.querySelector('.youtube-video-analysis-button')) {
        this.log('info', '🔄 영상 분석 버튼이 사라짐 - 재생성 시도');
        this.addVideoAnalysisButton();
      }
    }
  }

  /**
   * 소멸자 - 모니터링 정리
   */
  destroy() {
    if (this.buttonMonitorInterval) {
      clearInterval(this.buttonMonitorInterval);
      this.buttonMonitorInterval = null;
    }
  }
}