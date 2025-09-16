const UsageTracker = require('./usage-tracker');
const { ServerLogger } = require('./logger');
const { YOUTUBE_API_LIMITS } = require('../config/api-constants');
const fs = require('fs');
const path = require('path');

// .env 파일 로드
require('dotenv').config();

/**
 * 여러 YouTube API 키 관리자 (싱글톤)
 */
class MultiKeyManager {
  static instance = null;
  
  constructor() {
    // 싱글톤 패턴: 이미 인스턴스가 있으면 반환
    if (MultiKeyManager.instance) {
      return MultiKeyManager.instance;
    }
    this.keys = []; // 초기값으로 빈 배열
    this.trackers = new Map();

    // 안전 마진 설정 (상수 파일에서 로드)
    this.safetyMargin = YOUTUBE_API_LIMITS.SAFETY_MARGIN;

    // 비동기 초기화는 별도 메서드에서 처리
    this._initialized = false;

    // 서비스 레지스트리에 등록
    const serviceRegistry = require('./service-registry');
    serviceRegistry.register(this);

    ServerLogger.info('🔑 MultiKeyManager 생성됨 (초기화 필요)', null, 'MULTI-KEY');

    // 싱글톤 인스턴스 저장
    MultiKeyManager.instance = this;
  }
  
  /**
   * 싱글톤 인스턴스 반환 (비동기 초기화)
   */
  static async getInstance() {
    if (!MultiKeyManager.instance) {
      MultiKeyManager.instance = new MultiKeyManager();
      await MultiKeyManager.instance.initialize();
    }
    return MultiKeyManager.instance;
  }
  
  /**
   * 키 목록 로드 (ApiKeyManager + 폴백)
   */
  async loadKeys() {
    const keys = [];
    const keySet = new Set(); // 중복 제거용
    
    // 1. ApiKeyManager에서 활성 키 로드
    const safetyMargin = YOUTUBE_API_LIMITS.SAFETY_MARGIN;
    const ApiKeyManager = require('../services/ApiKeyManager');

    try {
      await ApiKeyManager.initialize();
      const activeApiKeys = await ApiKeyManager.getActiveApiKeys();

      const managerKeys = activeApiKeys
        .filter(key => !keySet.has(key)) // 중복 제거
        .map((key, index) => {
          keySet.add(key);
          return {
            name: `API Key ${index + 1} (Manager)`,
            key: key,
            quota: safetyMargin
          };
        });

      keys.push(...managerKeys);
      ServerLogger.info(`🔑 ApiKeyManager에서 ${managerKeys.length}개 키 로드 완료`, null, 'MULTI-KEY');
    } catch (error) {
      ServerLogger.warn('ApiKeyManager 로드 실패, 파일 기반 키만 사용합니다.', error.message, 'MULTI-KEY');
      // ❌ throw 제거: ApiKeyManager 실패해도 파일 기반 키는 로드 시도
    }
    
    // 2. API 키 파일에서 추가 로드 (active 상태만)
    try {
      const apiKeysPath = path.join(__dirname, '../data/api-keys.json');
      if (fs.existsSync(apiKeysPath)) {
        const apiKeys = JSON.parse(fs.readFileSync(apiKeysPath, 'utf8'));
        const activeApiKeys = apiKeys
          .filter(k => k.status === 'active')
          .filter(k => k.apiKey && !keySet.has(k.apiKey)) // 중복 제거
          .map(k => {
            keySet.add(k.apiKey);
            return {
              name: k.name,
              key: k.apiKey,
              quota: safetyMargin
            };
          });
        keys.push(...activeApiKeys);
        ServerLogger.info(`📁 API 키 파일에서 ${activeApiKeys.length}개 활성화 키 로드됨`, null, 'MULTI-KEY');
      }
    } catch (error) {
      ServerLogger.warn('API 키 파일 로드 실패', error.message, 'MULTI-KEY');
    }

    // 최소 1개 키는 보장 (환경변수 fallback)
    if (keys.length === 0) {
      const envKey = process.env.YOUTUBE_API_KEY;
      if (envKey) {
        keys.push({
          name: 'Environment Key (Fallback)',
          key: envKey,
          quota: safetyMargin
        });
        ServerLogger.info('🔑 환경변수 키 fallback 사용', null, 'MULTI-KEY');
      } else {
        ServerLogger.error('⚠️ 사용 가능한 API 키가 없습니다!', null, 'MULTI-KEY');
      }
    }

    return keys;
  }
  
  /**
   * 각 키별 UsageTracker 초기화
   */
  initializeTrackers() {
    this.keys.forEach((keyInfo, index) => {
      const tracker = UsageTracker.getInstance(keyInfo.key);
      this.trackers.set(keyInfo.key, {
        tracker,
        info: keyInfo,
        index
      });
    });
  }
  
  /**
   * 사용 가능한 키 찾기 (안전 마진 적용)
   */
  getAvailableKey() {
    ServerLogger.info(`🔍 [DEBUG] getAvailableKey 호출됨, 안전마진: ${this.safetyMargin}, 키 개수: ${this.keys.length}`, null, 'MULTI-KEY');

    for (const [index, keyInfo] of this.keys.entries()) {
      const keyData = this.trackers.get(keyInfo.key);
      const usage = keyData.tracker.getYouTubeUsage();

      ServerLogger.info(`🔍 [DEBUG] 키 ${index} (${keyInfo.name}) 검사 중: usage.total=${usage.total}, usage.quota=${usage.quota}, safetyMargin=${this.safetyMargin}`, null, 'MULTI-KEY');

      // 안전 마진 체크 (API 호출 전 사전 차단) - 수정된 로직
      if (usage.total >= this.safetyMargin) {
        ServerLogger.warn(`⚠️ 키 ${keyInfo.name} 안전 마진 초과: ${usage.total}/${this.safetyMargin} - 다음 키로 전환`, null, 'MULTI-KEY');
        continue; // 다음 키 확인
      }

      // 추가 안전장치: isYouTubeQuotaExceeded 체크 (선택적)
      const isExceeded = keyData.tracker.isYouTubeQuotaExceeded();
      ServerLogger.info(`🔍 [DEBUG] 키 ${keyInfo.name} isYouTubeQuotaExceeded: ${isExceeded}`, null, 'MULTI-KEY');

      if (!isExceeded) {
        ServerLogger.info(`✅ 사용 가능한 키 발견: ${keyInfo.name} (사용량: ${usage.total}/${this.safetyMargin}, 실제할당량: ${usage.quota})`, null, 'MULTI-KEY');
        return {
          key: keyInfo.key,
          tracker: keyData.tracker,
          name: keyInfo.name
        };
      } else {
        ServerLogger.warn(`⚠️ 키 ${keyInfo.name} isYouTubeQuotaExceeded=true - 다음 키로 전환`, null, 'MULTI-KEY');
      }
    }

    ServerLogger.error(`🚨 모든 YouTube API 키의 할당량이 소진됨 (안전마진: ${this.safetyMargin})`, null, 'MULTI-KEY');
    throw new Error(`🚨 모든 YouTube API 키의 할당량이 소진되었습니다 (${this.safetyMargin} 안전 마진 적용)`);
  }
  
  /**
   * API 호출 후 사용량 추적
   */
  trackAPI(apiKey, endpoint, success = true) {
    const keyData = this.trackers.get(apiKey);
    if (keyData) {
      keyData.tracker.trackAPI(endpoint, success);
    }
  }
  
  /**
   * 모든 키의 사용량 현황
   */
  getAllUsageStatus() {
    const status = [];
    
    ServerLogger.info(`🔍 [DEBUG] getAllUsageStatus 호출됨, 키 개수: ${this.keys.length}`, null, 'MULTI-KEY');
    
    this.keys.forEach((keyInfo, index) => {
      const keyData = this.trackers.get(keyInfo.key);
      const usage = keyData.tracker.getYouTubeUsage();
      
      ServerLogger.info(`🔍 [DEBUG] 키 ${index}: ${keyInfo.name}, 사용량: ${usage.total}/${usage.quota}`, null, 'MULTI-KEY');
      
      status.push({
        name: keyInfo.name,
        usage: `${usage.total}/${usage.quota}`,
        percentage: Math.round((usage.total / usage.quota) * 100),
        remaining: usage.remaining,
        exceeded: keyData.tracker.isYouTubeQuotaExceeded()
      });
    });
    
    return status;
  }
  
  /**
   * 사용량 현황 로그 (안전 마진 기준)
   */
  logUsageStatus() {
    const status = this.getAllUsageStatus();
    
    ServerLogger.info(`📊 YouTube API 키별 사용량 (${this.safetyMargin} 안전 마진):`, null, 'MULTI-KEY');
    status.forEach(s => {
      const safetyUsage = `${s.usage.split('/')[0]}/${this.safetyMargin}`;
      const safetyPercentage = Math.round((parseInt(s.usage.split('/')[0]) / this.safetyMargin) * 100);
      const icon = safetyPercentage >= 100 ? '🚨' : safetyPercentage > 85 ? '⚠️' : '✅';
      ServerLogger.info(`  ${icon} ${s.name}: ${safetyUsage} (${safetyPercentage}%)`, null, 'MULTI-KEY');
    });
  }

  /**
   * MultiKeyManager 비동기 초기화
   */
  async initialize() {
    if (this._initialized) return this;

    try {
      this.keys = await this.loadKeys();
      this.initializeTrackers();
      this._initialized = true;

      ServerLogger.info(`🔑 MultiKeyManager 초기화 완료: ${this.keys.length}개 키 로드`, null, 'MULTI-KEY');
      return this;
    } catch (error) {
      ServerLogger.error('MultiKeyManager 초기화 실패:', error, 'MULTI-KEY');
      throw error;
    }
  }

  /**
   * ApiKeyManager에서 키 목록을 다시 로드하여 동기화
   */
  async initializeFromApiKeyManager() {
    try {
      // 기존 trackers 정리
      this.trackers.clear();
      
      // 키 목록 다시 로드
      this.keys = await this.loadKeys();
      
      // 새로운 trackers 초기화
      this.initializeTrackers();
      
      ServerLogger.info(`🔄 MultiKeyManager 재초기화 완료: ${this.keys.length}개 키 로드`, null, 'MULTI-KEY');
    } catch (error) {
      ServerLogger.error('MultiKeyManager 재초기화 실패:', error, 'MULTI-KEY');
      throw error;
    }
  }

  // API 키 캐시 클리어 (파일 변경 시 호출)
  clearApiKeyCache() {
    this.keys = [];
    this._initialized = false;
    this.trackers.clear();
    ServerLogger.info('🔄 MultiKeyManager API 키 캐시 클리어', null, 'MULTI-KEY-MANAGER');
  }
}

module.exports = MultiKeyManager;