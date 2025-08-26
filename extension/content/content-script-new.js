// 리팩토링된 Content Script - 모듈화된 버전
import { Utils } from './utils.js';
import { VideoSaver } from './video-saver.js';

/**
 * 콘텐츠 스크립트 메인 실행부
 */
class ContentScriptMain {
  constructor() {
    this.videoSaver = null;
    this.init();
  }

  /**
   * 초기화
   */
  init() {
    Utils.log('info', 'Content Script 로딩 시작', {
      domain: window.location.hostname,
      url: window.location.href
    });

    const platform = Utils.detectPlatform();
    if (!platform) {
      Utils.log('warn', '지원되지 않는 플랫폼', window.location.hostname);
      return;
    }

    Utils.log('success', `지원되는 플랫폼에서 VideoSaver 초기화: ${platform}`);
    
    try {
      this.videoSaver = new VideoSaver();
      this.setupGlobalMethods();
    } catch (error) {
      Utils.log('error', 'VideoSaver 초기화 실패', error);
    }
  }

  /**
   * 글로벌 메소드 설정 (디버깅 및 확장프로그램 통신용)
   */
  setupGlobalMethods() {
    if (typeof window === 'undefined') return;

    // 글로벌 접근 (개발용)
    window.videoSaver = this.videoSaver;
    
    // 수동 새로고침 함수
    window.refreshVideoSaver = () => {
      if (this.videoSaver) {
        this.videoSaver.refresh();
      } else {
        Utils.log('warn', 'VideoSaver가 초기화되지 않음');
      }
    };
    
    // 통계 조회 함수
    window.getVideoSaverStats = async () => {
      if (this.videoSaver) {
        return await this.videoSaver.getStats();
      }
      return { error: 'VideoSaver not initialized' };
    };
    
    // 설정 업데이트 함수
    window.updateVideoSaverSettings = (settings) => {
      if (this.videoSaver) {
        this.videoSaver.updateSettings(settings);
      }
    };

    Utils.log('info', '글로벌 메소드 설정 완료', {
      methods: ['videoSaver', 'refreshVideoSaver', 'getVideoSaverStats', 'updateVideoSaverSettings']
    });
  }
}

// Content Script 실행
if (window.location.hostname.includes('instagram.com') || 
    window.location.hostname.includes('tiktok.com')) {
  new ContentScriptMain();
}