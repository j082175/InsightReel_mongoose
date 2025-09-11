/**
 * Content Script Entry Point
 * content-script-bundled.js를 대체하는 모듈화된 엔트리 포인트
 */

// 모듈화된 유틸리티 및 클래스들 import
import { Utils, DOMUtils, TimeUtils } from './utils.js';
import { CONSTANTS } from './constants.js';
import { ApiClient } from './api-client.js';
import { VideoSaver } from './video-saver.js';
import { UIManager } from './ui-manager.js';

// 환경 설정
import environment from '../config/environment.js';

/**
 * Content Script 메인 클래스
 */
class ContentScriptMain {
  constructor() {
    this.platform = Utils.detectPlatform();
    this.videoSaver = null;
    this.uiManager = new UIManager();
    
    this.init();
  }

  /**
   * 초기화
   */
  init() {
    Utils.log('info', 'Content Script 시작', {
      platform: this.platform,
      url: window.location.href,
      environment: environment.NODE_ENV
    });

    if (!this.platform) {
      Utils.log('warn', '지원되지 않는 플랫폼', window.location.hostname);
      return;
    }

    // 페이지 로드 완료 후 VideoSaver 초기화
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeVideoSaver());
    } else {
      this.initializeVideoSaver();
    }

    // Chrome Extension 메시지 리스너 등록
    this.setupMessageListeners();
  }

  /**
   * VideoSaver 초기화
   */
  initializeVideoSaver() {
    try {
      this.videoSaver = new VideoSaver(environment.SERVER_URL);
      Utils.log('success', 'VideoSaver 초기화 완료', this.platform);
    } catch (error) {
      Utils.log('error', 'VideoSaver 초기화 실패', error.message);
    }
  }

  /**
   * Chrome Extension 메시지 리스너 설정
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 비동기 응답 허용
    });
  }

  /**
   * 메시지 처리
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'saveCurrentVideo':
          await this.handleSaveCurrentVideo(request.url);
          sendResponse({ success: true });
          break;

        case 'refresh':
          if (this.videoSaver) {
            this.videoSaver.refresh();
          }
          sendResponse({ success: true });
          break;

        case 'getStats':
          const stats = this.videoSaver ? await this.videoSaver.getStats() : null;
          sendResponse({ success: true, data: stats });
          break;

        default:
          sendResponse({ error: '알 수 없는 액션입니다.' });
      }
    } catch (error) {
      Utils.log('error', '메시지 처리 실패', error.message);
      sendResponse({ error: error.message });
    }
  }

  /**
   * 현재 비디오 저장 처리
   */
  async handleSaveCurrentVideo(videoUrl) {
    if (!this.videoSaver) {
      throw new Error('VideoSaver가 초기화되지 않았습니다.');
    }

    Utils.log('info', '현재 비디오 저장 요청', videoUrl);
    
    // 플랫폼별 처리는 VideoSaver 내부에서 담당
    return await this.videoSaver.processCurrentVideo(videoUrl);
  }
}

// Content Script 실행
try {
  const contentScript = new ContentScriptMain();
  
  // 글로벌 접근을 위한 윈도우 객체 등록 (디버깅용)
  if (environment.isDevelopment) {
    window.ContentScript = contentScript;
    window.Utils = Utils;
    window.CONSTANTS = CONSTANTS;
  }
  
} catch (error) {
  console.error('❌ Content Script 실행 오류:', error);
  console.error('오류 위치:', error.stack);
}