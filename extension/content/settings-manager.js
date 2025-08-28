import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';

/**
 * 설정 관리 클래스
 */
export class SettingsManager {
  constructor() {
    this.defaultSettings = {
      [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false, // 기본값: 수동 분석
      [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
    };
  }

  /**
   * 설정 초기화
   */
  async init() {
    try {
      const settings = await this.getSettings();
      Utils.log('info', '설정 초기화 완료', settings);
    } catch (error) {
      Utils.log('error', '설정 초기화 실패', error);
    }
  }

  /**
   * 모든 설정 조회
   * @returns {Promise<Object>} 설정 객체
   */
  async getSettings() {
    try {
      const result = await chrome.storage.sync.get(CONSTANTS.STORAGE_KEYS.SETTINGS);
      const savedSettings = result[CONSTANTS.STORAGE_KEYS.SETTINGS] || {};
      
      // 기본값과 저장된 설정 병합
      const settings = { ...this.defaultSettings, ...savedSettings };
      
      return settings;
    } catch (error) {
      Utils.log('error', '설정 조회 실패', error);
      return this.defaultSettings;
    }
  }

  /**
   * 특정 설정 조회
   * @param {string} key 설정 키
   * @returns {Promise<any>} 설정 값
   */
  async getSetting(key) {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * 설정 저장
   * @param {Object} newSettings 새로운 설정
   */
  async saveSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      await chrome.storage.sync.set({
        [CONSTANTS.STORAGE_KEYS.SETTINGS]: updatedSettings
      });
      
      Utils.log('info', '설정 저장 완료', updatedSettings);
      return updatedSettings;
    } catch (error) {
      Utils.log('error', '설정 저장 실패', error);
      throw error;
    }
  }

  /**
   * 특정 설정 업데이트
   * @param {string} key 설정 키
   * @param {any} value 설정 값
   */
  async setSetting(key, value) {
    return await this.saveSettings({ [key]: value });
  }

  /**
   * 자동 분석 설정 토글
   * @returns {Promise<boolean>} 새로운 자동 분석 설정값
   */
  async toggleAutoAnalysis() {
    const currentValue = await this.getSetting(CONSTANTS.SETTINGS.AUTO_ANALYSIS);
    const newValue = !currentValue;
    await this.setSetting(CONSTANTS.SETTINGS.AUTO_ANALYSIS, newValue);
    Utils.log('info', `자동 분석 설정 변경: ${currentValue} → ${newValue}`);
    return newValue;
  }

  /**
   * 자동 분석 활성화 여부 확인
   * @returns {Promise<boolean>} 자동 분석 활성화 여부
   */
  async isAutoAnalysisEnabled() {
    return await this.getSetting(CONSTANTS.SETTINGS.AUTO_ANALYSIS);
  }

  /**
   * 알림 표시 여부 확인
   * @returns {Promise<boolean>} 알림 표시 여부
   */
  async isNotificationsEnabled() {
    return await this.getSetting(CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS);
  }

  /**
   * 설정 리셋
   */
  async resetSettings() {
    try {
      await chrome.storage.sync.remove(CONSTANTS.STORAGE_KEYS.SETTINGS);
      Utils.log('info', '설정이 초기화되었습니다');
      return this.defaultSettings;
    } catch (error) {
      Utils.log('error', '설정 초기화 실패', error);
      throw error;
    }
  }

  /**
   * 설정 변경 이벤트 리스너 추가
   * @param {Function} callback 콜백 함수
   */
  onSettingsChanged(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes[CONSTANTS.STORAGE_KEYS.SETTINGS]) {
        const newSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].newValue;
        const oldSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].oldValue;
        callback(newSettings, oldSettings);
      }
    });
  }
}