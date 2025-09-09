const { ServerLogger } = require('./logger');
const UsageTracker = require('./usage-tracker');

/**
 * 향상된 다중 API 키 관리자
 * Pro 할당량 소진 시 두 가지 전략 지원:
 * 1. 'flash': Flash 모델로 전환 (기존)
 * 2. 'multi-pro': 다른 API 키의 Pro 모델로 전환 (신규)
 */
class EnhancedMultiApiManager {
  constructor() {
    // 환경 변수에서 설정 로드
    this.fallbackStrategy = process.env.GEMINI_FALLBACK_STRATEGY || 'flash';
    
    // API 키들 로드
    this.apiKeys = this.loadApiKeys();
    
    // 각 API 키별 개별 사용량 추적기 (키별로 분리된 할당량)
    this.usageTrackers = new Map();
    this.apiKeys.forEach((keyInfo, index) => {
      this.usageTrackers.set(`key_${index}`, UsageTracker.getInstance());
    });
    
    ServerLogger.info(`🔧 Enhanced Multi API Manager 초기화`, null, 'MULTIAPI');
    ServerLogger.info(`📊 로드된 API 키: ${this.apiKeys.length}개`, null, 'MULTIAPI');
    ServerLogger.info(`🎯 폴백 전략: ${this.fallbackStrategy}`, null, 'MULTIAPI');
  }

  /**
   * 환경 변수에서 모든 API 키 로드
   */
  loadApiKeys() {
    const keys = [];
    
    // 기본 키
    if (process.env.GOOGLE_API_KEY) {
      keys.push({
        key: process.env.GOOGLE_API_KEY,
        name: 'primary',
        index: 0
      });
    }
    
    // 보조 키들 (GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, ...)
    for (let i = 2; i <= 10; i++) {
      const key = process.env[`GOOGLE_API_KEY_${i}`];
      if (key) {
        keys.push({
          key: key,
          name: `secondary_${i}`,
          index: keys.length
        });
        ServerLogger.info(`📍 API 키 ${i} 로드됨`, null, 'MULTIAPI');
      }
    }
    
    if (keys.length === 0) {
      throw new Error('최소 하나의 Google API 키가 필요합니다.');
    }
    
    return keys;
  }

  /**
   * 최적의 API 설정 반환
   */
  getBestApiConfig() {
    if (this.fallbackStrategy === 'flash') {
      return this.getFlashFallbackConfig();
    } else if (this.fallbackStrategy === 'multi-pro') {
      return this.getMultiProConfig();
    }
    
    // 기본값
    return this.getDefaultConfig();
  }

  /**
   * Flash 폴백 전략 (기존 하이브리드 방식)
   */
  getFlashFallbackConfig() {
    const primaryTracker = this.usageTrackers.get('key_0');
    const primaryKey = this.apiKeys[0];
    
    // 1. Primary Pro 체크
    if (!primaryTracker.isQuotaExceeded('pro')) {
      return {
        apiKey: primaryKey.key,
        model: 'gemini-2.5-pro',
        keyName: primaryKey.name,
        keyIndex: 0,
        usageTracker: primaryTracker,
        reason: 'primary_pro_available',
        strategy: 'flash'
      };
    }
    
    // 2. Primary Flash 체크
    if (!primaryTracker.isQuotaExceeded('flash')) {
      return {
        apiKey: primaryKey.key,
        model: 'gemini-2.5-flash',
        keyName: primaryKey.name,
        keyIndex: 0,
        usageTracker: primaryTracker,
        reason: 'pro_exhausted_using_flash',
        strategy: 'flash'
      };
    }
    
    // 3. 모든 할당량 소진
    return {
      apiKey: null,
      model: null,
      keyName: null,
      keyIndex: null,
      usageTracker: null,
      reason: 'all_quotas_exhausted',
      strategy: 'flash'
    };
  }

  /**
   * 멀티 Pro 전략 (여러 API 키로 Pro 모델 계속 사용)
   */
  getMultiProConfig() {
    // 1. 모든 키의 Pro 모델 체크 (순서대로)
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyInfo = this.apiKeys[i];
      const tracker = this.usageTrackers.get(`key_${i}`);
      
      if (!tracker.isQuotaExceeded('pro')) {
        return {
          apiKey: keyInfo.key,
          model: 'gemini-2.5-pro',
          keyName: keyInfo.name,
          keyIndex: i,
          usageTracker: tracker,
          reason: `${keyInfo.name}_pro_available`,
          strategy: 'multi-pro'
        };
      }
    }

    // 2. 모든 Pro 소진 시, 첫 번째 키의 Flash로 폴백
    const primaryTracker = this.usageTrackers.get('key_0');
    const primaryKey = this.apiKeys[0];
    
    if (!primaryTracker.isQuotaExceeded('flash')) {
      return {
        apiKey: primaryKey.key,
        model: 'gemini-2.5-flash',
        keyName: primaryKey.name,
        keyIndex: 0,
        usageTracker: primaryTracker,
        reason: 'all_pro_exhausted_using_flash',
        strategy: 'multi-pro'
      };
    }

    // 3. 완전 소진
    return {
      apiKey: null,
      model: null,
      keyName: null,
      keyIndex: null,
      usageTracker: null,
      reason: 'all_quotas_exhausted',
      strategy: 'multi-pro'
    };
  }

  /**
   * 기본 설정
   */
  getDefaultConfig() {
    const primaryTracker = this.usageTrackers.get('key_0');
    const primaryKey = this.apiKeys[0];
    
    return {
      apiKey: primaryKey.key,
      model: 'gemini-2.5-pro',
      keyName: primaryKey.name,
      keyIndex: 0,
      usageTracker: primaryTracker,
      reason: 'default',
      strategy: this.fallbackStrategy
    };
  }

  /**
   * API 사용량 기록
   */
  recordUsage(keyIndex, modelType, success = true) {
    const tracker = this.usageTrackers.get(`key_${keyIndex}`);
    if (tracker) {
      const model = modelType.includes('pro') ? 'pro' : 'flash';
      tracker.increment(model, success);
      
      const keyName = this.apiKeys[keyIndex]?.name || `unknown_${keyIndex}`;
      ServerLogger.info(`📊 [${keyName}] ${model} ${success ? '성공' : '실패'} 기록`, null, 'MULTIAPI');
    }
  }

  /**
   * 전체 시스템 상태
   */
  getSystemStatus() {
    const bestConfig = this.getBestApiConfig();
    
    const status = {
      strategy: this.fallbackStrategy,
      totalApiKeys: this.apiKeys.length,
      currentConfig: bestConfig,
      allKeyStatus: {},
      summary: {
        availableProKeys: 0,
        availableFlashKeys: 0,
        totalProQuota: 0,
        totalFlashQuota: 0,
        usedProQuota: 0,
        usedFlashQuota: 0
      }
    };

    // 각 키별 상태 수집
    this.apiKeys.forEach((keyInfo, index) => {
      const tracker = this.usageTrackers.get(`key_${index}`);
      const keyStats = tracker.getUsageStats();
      
      status.allKeyStatus[keyInfo.name] = {
        ...keyStats,
        proAvailable: !tracker.isQuotaExceeded('pro'),
        flashAvailable: !tracker.isQuotaExceeded('flash')
      };
      
      // 요약 통계 계산
      if (!tracker.isQuotaExceeded('pro')) status.summary.availableProKeys++;
      if (!tracker.isQuotaExceeded('flash')) status.summary.availableFlashKeys++;
      
      status.summary.totalProQuota += keyStats.pro.quota;
      status.summary.totalFlashQuota += keyStats.flash.quota;
      status.summary.usedProQuota += keyStats.pro.used;
      status.summary.usedFlashQuota += keyStats.flash.used;
    });

    return status;
  }

  /**
   * 헬스체크
   */
  healthCheck() {
    const systemStatus = this.getSystemStatus();
    const currentConfig = systemStatus.currentConfig;
    
    return {
      status: currentConfig.apiKey ? 'healthy' : 'no_quota_available',
      strategy: this.fallbackStrategy,
      totalKeys: this.apiKeys.length,
      availableProKeys: systemStatus.summary.availableProKeys,
      availableFlashKeys: systemStatus.summary.availableFlashKeys,
      currentModel: currentConfig.model,
      currentKey: currentConfig.keyName,
      reason: currentConfig.reason,
      quotaSummary: systemStatus.summary
    };
  }

  /**
   * 전략 변경
   */
  setFallbackStrategy(strategy) {
    if (['flash', 'multi-pro'].includes(strategy)) {
      const oldStrategy = this.fallbackStrategy;
      this.fallbackStrategy = strategy;
      ServerLogger.info(`🔄 폴백 전략 변경: ${oldStrategy} → ${strategy}`, null, 'MULTIAPI');
      return true;
    }
    return false;
  }

  /**
   * 특정 키의 사용량 리셋 (테스트용)
   */
  resetKeyUsage(keyIndex) {
    const tracker = this.usageTrackers.get(`key_${keyIndex}`);
    if (tracker) {
      // 새로운 추적기로 교체
      this.usageTrackers.set(`key_${keyIndex}`, new UsageTracker());
      const keyName = this.apiKeys[keyIndex]?.name || `key_${keyIndex}`;
      ServerLogger.info(`🔄 [${keyName}] 사용량 리셋`, null, 'MULTIAPI');
      return true;
    }
    return false;
  }
}

module.exports = EnhancedMultiApiManager;