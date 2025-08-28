import { CONSTANTS } from '../constants.js';
import { Utils } from '../utils.js';

/**
 * Instagram 플랫폼 핸들러
 */
export class InstagramHandler {
  constructor(apiClient, uiManager) {
    this.apiClient = apiClient;
    this.uiManager = uiManager;
    this.isProcessing = false;
    this.lastEnhancementTime = 0;
    this.processedButtons = new Set();
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
      
      try {
        await Utils.delay(CONSTANTS.TIMEOUTS.PROCESSING_DELAY);
        await this.processVideoFromSaveAction(post, video);
      } catch (error) {
        Utils.log('error', '클릭 처리 중 오류', error);
        this.uiManager.showNotification(
          `Instagram 저장은 완료되었지만 AI 분석에 실패했습니다: ${error.message}`, 
          CONSTANTS.NOTIFICATION_TYPES.WARNING
        );
      } finally {
        // 5초 후 처리 플래그 해제
        setTimeout(() => {
          isProcessing = false;
        }, 5000);
      }
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
}