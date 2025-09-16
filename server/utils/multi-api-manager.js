const { ServerLogger } = require('./logger');
const UsageTracker = require('./usage-tracker');

/**
 * 다중 API 키 관리자
 * Pro 할당량 소진 시 옵션에 따라 Flash 모델 또는 다른 API 키의 Pro 모델로 전환
 */
class MultiApiManager {
  constructor() {
    // 환경 변수에서 설정 로드
    this.fallbackStrategy = process.env.GEMINI_FALLBACK_STRATEGY || 'flash'; // 'flash' 또는 'multi-pro'

    // API 키들 초기화
    this.primaryApiKey = null;
    this.secondaryApiKeys = [];
    this._initialized = false;
    
    this.usageTrackers = new Map();

    if (this.primaryApiKey) {
      this.usageTrackers.set('primary', UsageTracker.getInstance());
    }

    // 보조 키들도 추적기 생성
    this.secondaryApiKeys.forEach((key, index) => {
      this.usageTrackers.set(`secondary_${index}`, UsageTracker.getInstance());
    });
    
    // 현재 활성 API 키 상태
    this.currentApiKeyType = 'primary';

    // 서비스 레지스트리에 등록
    const serviceRegistry = require('./service-registry');
    serviceRegistry.register(this);
    this.currentApiKeyIndex = 0;
    
    ServerLogger.info(`🔧 Multi API Manager 초기화: 전략=${this.fallbackStrategy}, 보조키=${this.secondaryApiKeys.length}개`, null, 'MULTIAPI');
  }

  /**
   * 비동기 초기화
   */
  async initialize() {
    if (this._initialized) return this;

    try {
      const apiKeys = await this.loadApiKeys();
      this.primaryApiKey = apiKeys[0] || null;
      this.secondaryApiKeys = apiKeys.slice(1);

      // 사용량 추적기 초기화
      this.initializeTrackers();

      this._initialized = true;
      ServerLogger.info(`🔧 Multi API Manager 초기화: 전략=${this.fallbackStrategy}, 보조키=${this.secondaryApiKeys.length}개`, null, 'MULTIAPI');
      return this;
    } catch (error) {
      ServerLogger.error('Multi API Manager 초기화 실패:', error, 'MULTIAPI');
      throw error;
    }
  }

  /**
   * ApiKeyManager에서 API 키들 로드
   */
  async loadApiKeys() {
    try {
      const ApiKeyManager = require('../services/ApiKeyManager');
      await ApiKeyManager.initialize();
      const activeApiKeys = await ApiKeyManager.getActiveApiKeys();

      if (activeApiKeys.length > 0) {
        ServerLogger.info(`📍 ${activeApiKeys.length}개 API 키 로드됨 (ApiKeyManager)`, null, 'MULTIAPI');
        return activeApiKeys;
      } else {
        throw new Error('ApiKeyManager에 활성 API 키가 없습니다.');
      }
    } catch (error) {
      ServerLogger.error('🚨 ApiKeyManager 로드 실패, API 키가 없습니다.', error, 'MULTIAPI');
      throw new Error('ApiKeyManager에서 API 키를 로드할 수 없습니다.');
    }

    return [];
  }

  /**
   * 사용량 추적기 초기화
   */
  initializeTrackers() {

  /**
   * 현재 사용할 최적의 API 키와 모델 반환
   */
  getCurrentApiConfig() {
    if (this.fallbackStrategy === 'flash') {
      return this.getFlashFallbackConfig();
    } else if (this.fallbackStrategy === 'multi-pro') {
      return this.getMultiProConfig();
    }
    
    // 기본값: 기본 키의 Pro 모델
    return {
      apiKey: this.primaryApiKey,
      model: 'gemini-2.5-pro',
      keyType: 'primary',
      keyIndex: 0,
      usageTracker: this.usageTrackers.get('primary')
    };
  }

  /**
   * Flash 폴백 전략 (기존 하이브리드 방식)
   */
  getFlashFallbackConfig() {
    const primaryTracker = this.usageTrackers.get('primary');
    
    // Pro 할당량 체크
    if (!primaryTracker.isQuotaExceeded('pro')) {
      return {
        apiKey: this.primaryApiKey,
        model: 'gemini-2.5-pro',
        keyType: 'primary',
        keyIndex: 0,
        usageTracker: primaryTracker,
        reason: 'pro_available'
      };
    }
    
    // Pro 소진, Flash 체크
    if (!primaryTracker.isQuotaExceeded('flash')) {
      return {
        apiKey: this.primaryApiKey,
        model: 'gemini-2.5-flash',
        keyType: 'primary',
        keyIndex: 0,
        usageTracker: primaryTracker,
        reason: 'pro_exhausted_fallback_flash'
      };
    }
    
    // 모든 할당량 소진
    return {
      apiKey: null,
      model: null,
      keyType: null,
      keyIndex: null,
      usageTracker: null,
      reason: 'all_quotas_exhausted'
    };
  }

  /**
   * 멀티 Pro 전략 (여러 API 키로 Pro 모델 계속 사용)
   */
  getMultiProConfig() {
    // 1. 기본 키의 Pro 모델 체크
    const primaryTracker = this.usageTrackers.get('primary');
    if (!primaryTracker.isQuotaExceeded('pro')) {
      return {
        apiKey: this.primaryApiKey,
        model: 'gemini-2.5-pro',
        keyType: 'primary',
        keyIndex: 0,
        usageTracker: primaryTracker,
        reason: 'primary_pro_available'
      };
    }

    // 2. 보조 키들의 Pro 모델 체크
    for (let i = 0; i < this.secondaryApiKeys.length; i++) {
      const trackerKey = `secondary_${i}`;
      const tracker = this.usageTrackers.get(trackerKey);
      
      if (!tracker.isQuotaExceeded('pro')) {
        return {
          apiKey: this.secondaryApiKeys[i],
          model: 'gemini-2.5-pro',
          keyType: 'secondary',
          keyIndex: i,
          usageTracker: tracker,
          reason: `secondary_${i}_pro_available`
        };
      }
    }

    // 3. 모든 Pro 할당량 소진 시 기본 키의 Flash로 폴백
    if (!primaryTracker.isQuotaExceeded('flash')) {
      return {
        apiKey: this.primaryApiKey,
        model: 'gemini-2.5-flash',
        keyType: 'primary',
        keyIndex: 0,
        usageTracker: primaryTracker,
        reason: 'all_pro_exhausted_fallback_flash'
      };
    }

    // 4. 모든 할당량 완전 소진
    return {
      apiKey: null,
      model: null,
      keyType: null,
      keyIndex: null,
      usageTracker: null,
      reason: 'all_quotas_exhausted'
    };
  }

  /**
   * API 호출 성공/실패 기록
   */
  recordUsage(keyType, keyIndex, modelType, success = true) {
    let trackerKey;
    
    if (keyType === 'primary') {
      trackerKey = 'primary';
    } else if (keyType === 'secondary') {
      trackerKey = `secondary_${keyIndex}`;
    }
    
    const tracker = this.usageTrackers.get(trackerKey);
    if (tracker) {
      const model = modelType === 'gemini-2.5-pro' ? 'pro' : 'flash';
      tracker.increment(model, success);
      
      ServerLogger.info(`📊 사용량 기록: ${keyType}_${keyIndex} ${model} ${success ? '성공' : '실패'}`, null, 'MULTIAPI');
    }
  }

  /**
   * 전체 시스템 상태 조회
   */
  getSystemStatus() {
    const status = {
      strategy: this.fallbackStrategy,
      totalApiKeys: 1 + this.secondaryApiKeys.length,
      currentConfig: this.getCurrentApiConfig(),
      allTrackers: {}
    };

    // 모든 추적기 상태 수집
    this.usageTrackers.forEach((tracker, key) => {
      status.allTrackers[key] = tracker.getUsageStats();
    });

    return status;
  }

  /**
   * 헬스체크
   */
  healthCheck() {
    const currentConfig = this.getCurrentApiConfig();
    const systemStatus = this.getSystemStatus();
    
    return {
      status: currentConfig.apiKey ? 'healthy' : 'no_quota_available',
      strategy: this.fallbackStrategy,
      currentModel: currentConfig.model,
      currentKeyType: currentConfig.keyType,
      currentKeyIndex: currentConfig.keyIndex,
      reason: currentConfig.reason,
      totalAvailableKeys: systemStatus.totalApiKeys,
      systemStatus: systemStatus.allTrackers
    };
  }

  /**
   * 전략 변경 (런타임에서)
   */
  setFallbackStrategy(strategy) {
    if (['flash', 'multi-pro'].includes(strategy)) {
      this.fallbackStrategy = strategy;
      ServerLogger.info(`🔄 폴백 전략 변경: ${strategy}`, null, 'MULTIAPI');
      return true;
    }
    return false;
  }

  // API 키 캐시 클리어 (파일 변경 시 호출)
  clearApiKeyCache() {
    this.primaryApiKey = null;
    this.secondaryApiKeys = [];
    this._initialized = false;
    this.usageTrackers.clear();
    ServerLogger.info('🔄 MultiApiManager API 키 캐시 클리어', null, 'MULTI-API');
  }
}

module.exports = MultiApiManager;