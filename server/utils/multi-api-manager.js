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
    
    // 기본 API 키
    this.primaryApiKey = process.env.GOOGLE_API_KEY;
    
    // 추가 API 키들 (multi-pro 전략용)
    this.secondaryApiKeys = this.loadSecondaryApiKeys();
    
    // 각 API 키별 사용량 추적기
    this.usageTrackers = new Map();
    this.usageTrackers.set('primary', new UsageTracker());
    
    // 보조 키들도 추적기 생성
    this.secondaryApiKeys.forEach((key, index) => {
      this.usageTrackers.set(`secondary_${index}`, new UsageTracker());
    });
    
    // 현재 활성 API 키 상태
    this.currentApiKeyType = 'primary';
    this.currentApiKeyIndex = 0;
    
    ServerLogger.info(`🔧 Multi API Manager 초기화: 전략=${this.fallbackStrategy}, 보조키=${this.secondaryApiKeys.length}개`, null, 'MULTIAPI');
  }

  /**
   * 보조 API 키들 로드
   */
  loadSecondaryApiKeys() {
    const keys = [];
    
    // GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, ... 형태로 환경변수에서 로드
    for (let i = 2; i <= 10; i++) {
      const key = process.env[`GOOGLE_API_KEY_${i}`];
      if (key) {
        keys.push(key);
        ServerLogger.info(`📍 보조 API 키 ${i} 로드됨`, null, 'MULTIAPI');
      }
    }
    
    return keys;
  }

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
}

module.exports = MultiApiManager;