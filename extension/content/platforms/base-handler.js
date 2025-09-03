import { Utils, StringUtils, TimeUtils } from '../utils.js';
import { SettingsManager } from '../settings-manager.js';

/**
 * 플랫폼 핸들러 기본 클래스
 * Instagram, TikTok 등 모든 플랫폼 핸들러의 공통 기능을 제공
 */
export class BasePlatformHandler {
  constructor(apiClient, uiManager, platformName = 'unknown') {
    this.apiClient = apiClient;
    this.uiManager = uiManager;
    this.platformName = platformName;
    this.settingsManager = new SettingsManager();
    
    // 공통 상태 관리
    this.isProcessing = false;
    this.lastEnhancementTime = 0;
    this.processedVideos = new Set();
    this.processedButtons = new Set(); // Instagram 등에서 사용
    
    this.log('info', `${platformName} 핸들러 초기화 완료`);
  }

  /**
   * 플랫폼별 로깅 (플랫폼 이름 포함)
   * @param {string} level - 로그 레벨 (info, warn, error)
   * @param {string} message - 로그 메시지
   * @param {*} data - 추가 데이터
   */
  log(level, message, data = null) {
    Utils.log(level, `[${this.platformName.toUpperCase()}] ${message}`, data);
  }

  /**
   * 고유 ID 생성 (위치 기반)
   * @param {Element} element - 대상 요소
   * @param {string} prefix - ID 접두사
   * @returns {string} 고유 ID
   */
  generateUniqueId(element, prefix = 'item') {
    if (!element) {
      return StringUtils.generateUniqueId(prefix);
    }
    
    const rect = element.getBoundingClientRect();
    const timestamp = TimeUtils.getCurrentUnixTimestamp();
    return `${prefix}_${Math.round(rect.top)}_${Math.round(rect.left)}_${timestamp}`;
  }

  /**
   * 처리 상태 확인
   * @param {string} id - 확인할 ID
   * @param {string} type - 타입 ('video' 또는 'button')
   * @returns {boolean} 처리 여부
   */
  isProcessed(id, type = 'video') {
    const set = type === 'video' ? this.processedVideos : this.processedButtons;
    return set.has(id);
  }

  /**
   * 처리 완료로 표시
   * @param {string} id - 표시할 ID
   * @param {string} type - 타입 ('video' 또는 'button')
   */
  markAsProcessed(id, type = 'video') {
    const set = type === 'video' ? this.processedVideos : this.processedButtons;
    set.add(id);
    this.log('info', `${type} 처리 완료 표시: ${id}`);
  }

  /**
   * 처리 상태 초기화
   * @param {string} type - 초기화할 타입 ('video', 'button', 'all')
   */
  clearProcessedItems(type = 'all') {
    switch(type) {
      case 'video':
        this.processedVideos.clear();
        this.log('info', '비디오 처리 상태 초기화');
        break;
      case 'button':
        this.processedButtons.clear();
        this.log('info', '버튼 처리 상태 초기화');
        break;
      case 'all':
      default:
        this.processedVideos.clear();
        this.processedButtons.clear();
        this.log('info', '모든 처리 상태 초기화');
        break;
    }
  }

  /**
   * 안전한 에러 처리를 위한 래퍼
   * @param {Function} operation - 실행할 작업
   * @param {string} context - 작업 설명
   * @param {*} fallback - 실패 시 반환값
   * @returns {Promise<*>} 작업 결과
   */
  async safeExecute(operation, context = '작업', fallback = null) {
    try {
      return await operation();
    } catch (error) {
      this.log('error', `${context} 실패`, error);
      return fallback;
    }
  }

  /**
   * 처리 빈도 제한 (너무 자주 실행되는 것 방지)
   * @param {number} minInterval - 최소 간격 (밀리초)
   * @returns {boolean} 실행 가능 여부
   */
  shouldSkipEnhancement(minInterval = 1000) {
    const now = TimeUtils.getCurrentUnixTimestamp();
    if (this.isProcessing || (now - this.lastEnhancementTime) < minInterval) {
      return true;
    }
    return false;
  }

  /**
   * 처리 시작 표시
   */
  startProcessing() {
    this.isProcessing = true;
    this.lastEnhancementTime = TimeUtils.getCurrentUnixTimestamp();
    this.log('info', '처리 시작');
  }

  /**
   * 처리 완료 표시
   */
  endProcessing() {
    this.isProcessing = false;
    this.log('info', '처리 완료');
  }

  /**
   * 🚨 중복 URL 처리 공통 메소드
   * @param {Object} result API 응답 결과
   * @returns {boolean} 중복 여부
   */
  handleDuplicateCheck(result) {
    if (result && result.isDuplicate) {
      this.log('warn', '중복 URL 발견', result.duplicate_info);
      
      return true; // 중복임을 반환
    }
    
    return false; // 중복 아님을 반환
  }

  /**
   * 🎯 API 호출 공통 래퍼 (중복 검사 포함)
   * @param {Function} apiCallFn API 호출 함수
   * @param {Object} params API 파라미터
   * @returns {Promise<Object|null>} 처리 결과 (중복일 경우 null)
   */
  async callApiWithDuplicateCheck(apiCallFn, params) {
    try {
      const result = await apiCallFn.call(this.apiClient, params);
      
      // 중복 검사 처리
      if (this.handleDuplicateCheck(result)) {
        return null; // 중복일 경우 null 반환
      }
      
      return result;
      
    } catch (error) {
      this.log('error', 'API 호출 실패', error.message);
      this.uiManager.showNotification(`처리 실패: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 정리 작업 (메모리 해제 등)
   */
  cleanup() {
    this.clearProcessedItems('all');
    this.log('info', '핸들러 정리 완료');
  }
}