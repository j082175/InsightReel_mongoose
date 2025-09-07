const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ServerLogger } = require('./logger');
const UsageTracker = require('./usage-tracker');
const { AI } = require('../config/constants');

/**
 * 통합 Gemini API 관리자
 * 2가지 폴백 모드 지원:
 * - multi-key: 여러 API 키 간 전환 폴백
 * - model-priority: 단일 키에서 모델 우선순위 폴백 (pro → flash → flash-lite)
 */
class UnifiedGeminiManager {
  constructor(options = {}) {
    // 폴백 모드 결정 (multi-key 또는 model-priority)
    this.fallbackMode = process.env.GEMINI_FALLBACK_MODE || 'multi-key';
    this.enableFallback = process.env.ENABLE_GEMINI_FALLBACK !== 'false';
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
    
    if (this.fallbackMode === 'multi-key') {
      this.initMultiKeyMode(options);
    } else if (this.fallbackMode === 'model-priority') {
      this.initModelPriorityMode(options);
    } else if (this.fallbackMode === 'single-model') {
      this.initSingleModelMode(options);
    } else {
      throw new Error(`지원하지 않는 폴백 모드입니다: ${this.fallbackMode}`);
    }
    
    ServerLogger.success(`🤖 통합 Gemini 관리자 초기화 완료 (모드: ${this.fallbackMode})`, null, 'UNIFIED');
  }

  /**
   * Multi-Key 모드 초기화 (기존 방식)
   */
  initMultiKeyMode(options) {
    this.fallbackStrategy = options.strategy || process.env.GEMINI_FALLBACK_STRATEGY || 'flash';
    
    // API 키들 로드
    this.apiKeys = this.loadAllApiKeys();
    
    if (this.apiKeys.length === 0) {
      throw new Error('API 키가 설정되지 않았습니다. GOOGLE_API_KEY 환경변수를 확인해주세요.');
    }
    
    // 각 API 키별 사용량 추적기 및 모델 인스턴스
    this.usageTrackers = new Map();
    this.genAIInstances = new Map();
    this.models = new Map();
    
    this.apiKeys.forEach((keyInfo, index) => {
      const trackerId = `key_${index}`;
      this.usageTrackers.set(trackerId, new UsageTracker());
      
      const genAI = new GoogleGenerativeAI(keyInfo.key);
      this.genAIInstances.set(trackerId, genAI);
      
      // 각 키별로 Pro/Flash/Flash-lite 모델 인스턴스 생성
      this.models.set(`${trackerId}_pro`, genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }));
      this.models.set(`${trackerId}_flash`, genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }));
      this.models.set(`${trackerId}_flash_lite`, genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }));
    });
    
    // 현재 활성 API 키 인덱스
    this.currentKeyIndex = 0;
  }

  /**
   * Model-Priority 모드 초기화 (신규 방식)
   */
  initModelPriorityMode(options) {
    // 단일 API 키만 사용
    this.singleApiKey = process.env.GOOGLE_API_KEY;
    
    if (!this.singleApiKey) {
      throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.');
    }
    
    // 모델 우선순위 설정
    this.modelPriority = (process.env.GEMINI_MODEL_PRIORITY || 'pro,flash,flash-lite').split(',');
    this.autoRecovery = process.env.GEMINI_AUTO_RECOVERY !== 'false';
    this.quotaRecoveryInterval = parseInt(process.env.GEMINI_QUOTA_RECOVERY_INTERVAL || '3600000'); // 1시간
    this.overloadRecoveryInterval = parseInt(process.env.GEMINI_OVERLOAD_RECOVERY_INTERVAL || '10000'); // 10초
    
    // 단일 API 키로 모든 모델 인스턴스 생성
    const genAI = new GoogleGenerativeAI(this.singleApiKey);
    this.models = new Map();
    this.models.set('pro', genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }));
    this.models.set('flash', genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }));
    this.models.set('flash-lite', genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }));
    
    // 모델별 상태 추적
    this.modelStatus = {
      'pro': { 
        available: true, 
        lastError: null, 
        quotaExhausted: false,
        lastQuotaError: null,
        disabledUntil: null
      },
      'flash': { 
        available: true, 
        lastError: null, 
        quotaExhausted: false,
        lastQuotaError: null,
        disabledUntil: null
      },
      'flash-lite': { 
        available: true, 
        lastError: null, 
        quotaExhausted: false,
        lastQuotaError: null,
        disabledUntil: null
      }
    };
    
    // 사용량 추적기
    this.usageTracker = new UsageTracker();
    
    // 자동 복구 타이머 시작
    if (this.autoRecovery) {
      this.startAutoRecovery();
    }
  }

  /**
   * Single-Model 모드 초기화 (신규 방식)
   */
  initSingleModelMode(options) {
    // 단일 API 키만 사용
    this.singleApiKey = process.env.GOOGLE_API_KEY;
    
    if (!this.singleApiKey) {
      throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.');
    }
    
    // 단일 모델 설정
    this.singleModel = process.env.GEMINI_SINGLE_MODEL || 'gemini-2.5-pro-lite';
    this.retryAttempts = options.retryAttempts || 5; // 단일 모델이므로 재시도 횟수 증가
    
    // 단일 API 키로 단일 모델 인스턴스 생성
    const genAI = new GoogleGenerativeAI(this.singleApiKey);
    this.singleModelInstance = genAI.getGenerativeModel({ model: this.singleModel });
    
    // 사용량 추적기
    this.usageTracker = new UsageTracker();
    
    ServerLogger.info(`📍 Single-Model 설정: ${this.singleModel}`, null, 'UNIFIED');
  }

  /**
   * 환경 변수에서 모든 API 키 로드 (통합된 로직)
   */
  loadAllApiKeys() {
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
        ServerLogger.info(`📍 보조 API 키 ${i} 로드됨`, null, 'UNIFIED');
      }
    }
    
    ServerLogger.info(`📊 총 ${keys.length}개 API 키 로드됨`, null, 'UNIFIED');
    return keys;
  }

  /**
   * 메인 콘텐츠 생성 메소드 - 폴백 모드에 따라 분기
   */
  async generateContent(prompt, imageBase64 = null, options = {}) {
    if (this.fallbackMode === 'multi-key') {
      return await this.generateContentMultiKey(prompt, imageBase64, options);
    } else if (this.fallbackMode === 'model-priority') {
      return await this.generateContentModelPriority(prompt, imageBase64, options);
    } else if (this.fallbackMode === 'single-model') {
      // Single-model은 다중 이미지만 지원
      const imageContents = imageBase64 ? [{
        inlineData: {
          mimeType: 'image/jpeg', 
          data: imageBase64
        }
      }] : [];
      return await this.generateContentWithImagesSingleModel(prompt, imageContents, options);
    }
  }

  /**
   * Multi-Key 모드 콘텐츠 생성 (기존 로직)
   */
  async generateContentMultiKey(prompt, imageBase64 = null, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    // 재시도 로직 with 다양한 전략
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // 현재 키로 시도
        const result = await this.tryWithCurrentStrategy(prompt, imageBase64, options);
        
        if (result) {
          const duration = Date.now() - startTime;
          ServerLogger.success(`✅ Multi-Key AI 분석 성공 (${attempt}/${this.retryAttempts}회 시도, ${duration}ms)`, null, 'UNIFIED');
          return result;
        }
        
      } catch (error) {
        lastError = error;
        ServerLogger.warn(`⚠️ Multi-Key 시도 ${attempt}/${this.retryAttempts} 실패: ${error.message}`, null, 'UNIFIED');
        
        // 할당량 오류인 경우 폴백 전략 적용
        if (this.isQuotaError(error)) {
          const fallbackResult = await this.handleQuotaExceeded(prompt, imageBase64, options);
          if (fallbackResult) {
            return fallbackResult;
          }
        }
        
        // 마지막 시도가 아니면 잠시 대기
        if (attempt < this.retryAttempts) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }
    
    // 모든 시도 실패
    const duration = Date.now() - startTime;
    ServerLogger.error(`❌ Multi-Key 모든 AI 분석 시도 실패 (총 ${duration}ms)`, lastError, 'UNIFIED');
    throw lastError || new Error('Multi-Key AI 분석에 실패했습니다.');
  }

  /**
   * Model-Priority 모드 콘텐츠 생성 (신규 로직)
   * pro → flash → flash-lite → flash-lite 반복
   */
  async generateContentModelPriority(prompt, imageBase64 = null, options = {}) {
    const startTime = Date.now();
    let lastError = null;
    let attemptCount = 0;
    const maxAttempts = 50; // 최대 50번 시도 (무한루프 방지)

    while (attemptCount < maxAttempts) {
      attemptCount++;
      
      // 사용 가능한 모델 찾기 (우선순위대로)
      for (const modelType of this.modelPriority) {
        const status = this.modelStatus[modelType];
        
        // 모델이 비활성화되어 있으면 건너뛰기
        if (!status.available || (status.disabledUntil && Date.now() < status.disabledUntil)) {
          ServerLogger.info(`⏭️ 모델 ${modelType} 건너뛰기 (비활성화됨, 시도 ${attemptCount})`, null, 'UNIFIED');
          continue;
        }

        try {
          ServerLogger.info(`🔄 모델 ${modelType}로 시도 (${attemptCount}번째)`, null, 'UNIFIED');
          const result = await this.queryWithModelPriority(modelType, prompt, imageBase64, options);
          
          if (result) {
            const duration = Date.now() - startTime;
            this.usageTracker.increment(modelType, true);
            ServerLogger.success(`✅ Model-Priority AI 분석 성공 (모델: ${modelType}, 시도: ${attemptCount}, ${duration}ms)`, null, 'UNIFIED');
            return result;
          }
          
        } catch (error) {
          lastError = error;
          this.usageTracker.increment(modelType, false);
          
          if (this.isQuotaError(error)) {
            // 할당량 초과 → 다음날 오후 4시까지 비활성화
            const nextReset = this.getNextQuotaResetTime();
            status.available = false;
            status.quotaExhausted = true;
            status.disabledUntil = nextReset;
            status.lastQuotaError = new Date().toISOString();
            const resetDate = new Date(nextReset).toLocaleString('ko-KR');
            ServerLogger.warn(`🚫 모델 ${modelType} 할당량 초과로 비활성화 (복구 예정: ${resetDate})`, null, 'UNIFIED');
            
          } else if (this.isOverloadError(error)) {
            // 과부하 → 모델 임시 비활성화 (3초)
            status.disabledUntil = Date.now() + this.overloadRecoveryInterval;
            ServerLogger.warn(`⏳ 모델 ${modelType} 과부하로 임시 비활성화 (3초)`, null, 'UNIFIED');
            
            // flash-lite가 과부하일 때만 3초 대기 후 재시도
            if (modelType === 'flash-lite') {
              ServerLogger.info(`⏰ flash-lite 과부하 - 3초 대기 후 재시도...`, null, 'UNIFIED');
              await this.sleep(this.overloadRecoveryInterval);
            }
            
          } else {
            ServerLogger.warn(`⚠️ 모델 ${modelType} 일반 오류: ${error.message}`, null, 'UNIFIED');
          }
          
          status.lastError = error.message;
        }
      }
      
      // 모든 모델이 비활성화된 경우 짧은 대기 후 재시도
      const availableModels = this.modelPriority.filter(modelType => {
        const status = this.modelStatus[modelType];
        return status.available && (!status.disabledUntil || Date.now() >= status.disabledUntil);
      });
      
      if (availableModels.length === 0) {
        ServerLogger.info(`⏰ 모든 모델 비활성화 - 5초 대기 후 재시도... (시도 ${attemptCount})`, null, 'UNIFIED');
        await this.sleep(5000);
      }
    }
    
    // 최대 시도 횟수 초과
    const duration = Date.now() - startTime;
    ServerLogger.error(`❌ Model-Priority 최대 시도 횟수 초과 (${maxAttempts}회, 총 ${duration}ms)`, lastError, 'UNIFIED');
    throw lastError || new Error(`Model-Priority 최대 시도 횟수(${maxAttempts}) 초과`);
  }


  /**
   * 현재 전략에 따른 시도
   */
  async tryWithCurrentStrategy(prompt, imageBase64, options) {
    const trackerId = `key_${this.currentKeyIndex}`;
    const usageTracker = this.usageTrackers.get(trackerId);
    
    // 1단계: Pro 모델 시도
    try {
      const result = await this.queryWithModel(`${trackerId}_pro`, prompt, imageBase64, options);
      usageTracker.increment('pro', true);
      return result;
      
    } catch (error) {
      usageTracker.increment('pro', false);
      
      if (this.isQuotaError(error) && this.enableFallback) {
        // 2단계: Flash 모델 폴백 (현재 키)
        try {
          ServerLogger.info('🔄 Flash 모델로 폴백 시도', null, 'UNIFIED');
          const result = await this.queryWithModel(`${trackerId}_flash`, prompt, imageBase64, options);
          usageTracker.increment('flash', true);
          return result;
          
        } catch (flashError) {
          usageTracker.increment('flash', false);
          throw flashError;
        }
      }
      
      throw error;
    }
  }

  /**
   * 할당량 초과 시 폴백 전략 처리
   */
  async handleQuotaExceeded(prompt, imageBase64, options) {
    if (this.fallbackStrategy === 'multi-pro' && this.apiKeys.length > 1) {
      // 다른 API 키로 전환
      for (let i = 1; i < this.apiKeys.length; i++) {
        const nextKeyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
        
        try {
          ServerLogger.info(`🔄 API 키 ${nextKeyIndex}로 전환하여 Pro 모델 재시도`, null, 'UNIFIED');
          
          const trackerId = `key_${nextKeyIndex}`;
          const result = await this.queryWithModel(`${trackerId}_pro`, prompt, imageBase64, options);
          
          this.usageTrackers.get(trackerId).increment('pro', true);
          this.currentKeyIndex = nextKeyIndex; // 성공한 키를 현재 키로 설정
          
          return result;
          
        } catch (error) {
          this.usageTrackers.get(`key_${nextKeyIndex}`).increment('pro', false);
          ServerLogger.warn(`⚠️ API 키 ${nextKeyIndex} Pro 모델도 실패`, null, 'UNIFIED');
        }
      }
    }
    
    return null; // 모든 폴백 실패
  }

  /**
   * 특정 모델로 쿼리 실행
   */
  async queryWithModel(modelId, prompt, imageBase64, options) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`모델을 찾을 수 없습니다: ${modelId}`);
    }

    // 요청 구성
    const requestData = [];
    
    if (imageBase64) {
      requestData.push({
        text: prompt
      });
      requestData.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    } else {
      requestData.push({ text: prompt });
    }

    // API 호출 (thinking 모드 지원)
    const generationConfig = {};
    
    // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
    const thinkingBudget = options.thinkingBudget ?? 
                          (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);
    
    if (thinkingBudget !== undefined && modelId.includes('flash')) {
      generationConfig.thinkingBudget = thinkingBudget;
    }
    
    const result = await model.generateContent(requestData, generationConfig);
    const response = await result.response;
    
    return {
      text: response.text(),
      model: modelId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Model-Priority 모드에서 모델별 쿼리 실행
   */
  async queryWithModelPriority(modelType, prompt, imageBase64, options) {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`모델을 찾을 수 없습니다: ${modelType}`);
    }

    // 요청 구성
    const requestData = [];
    
    if (imageBase64) {
      requestData.push({
        text: prompt
      });
      requestData.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    } else {
      requestData.push({ text: prompt });
    }

    // API 호출 (thinking 모드 지원)
    const generationConfig = {};
    
    // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
    const thinkingBudget = options.thinkingBudget ?? 
                          (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);
    
    if (thinkingBudget !== undefined && modelType.includes('flash')) {
      generationConfig.thinkingBudget = thinkingBudget;
    }
    
    const result = await model.generateContent(requestData, generationConfig);
    const response = await result.response;
    
    return {
      text: response.text(),
      model: `${modelType} (single-key)`,
      timestamp: new Date().toISOString()
    };
  }


  /**
   * 할당량 오류 체크
   */
  isQuotaError(error) {
    const message = error.message?.toLowerCase() || '';
    return message.includes('quota') || 
           message.includes('rate limit') || 
           message.includes('resource_exhausted') ||
           error.status === 429;
  }

  /**
   * 과부하 오류 체크 (신규)
   */
  isOverloadError(error) {
    const message = error.message?.toLowerCase() || '';
    return message.includes('overload') ||
           message.includes('temporarily unavailable') ||
           message.includes('service unavailable') ||
           error.status === 503 ||
           error.status === 502;
  }

  /**
   * 자동 복구 타이머 시작 (신규)
   */
  startAutoRecovery() {
    setInterval(() => {
      const now = Date.now();
      let recovered = false;
      
      Object.keys(this.modelStatus).forEach(modelType => {
        const status = this.modelStatus[modelType];
        
        // 임시 비활성화된 모델 복구 체크
        if (status.disabledUntil && now >= status.disabledUntil) {
          status.disabledUntil = null;
          
          // 할당량 초과로 비활성화된 모델인 경우 다시 활성화
          if (status.quotaExhausted) {
            status.available = true;
            status.quotaExhausted = false;
            ServerLogger.info(`🔄 모델 ${modelType} 할당량 리셋으로 복구됨`, null, 'UNIFIED');
          } else {
            ServerLogger.info(`🔄 모델 ${modelType} 과부하 해제로 복구됨`, null, 'UNIFIED');
          }
          
          recovered = true;
        }
      });
      
      if (recovered) {
        ServerLogger.success('✅ 일부 모델이 자동 복구되었습니다', null, 'UNIFIED');
      }
    }, 60000); // 1분마다 체크
  }

  /**
   * 헬스 체크 - 모든 API 키 상태 확인
   */
  async healthCheck() {
    const results = {};
    
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyInfo = this.apiKeys[i];
      const trackerId = `key_${i}`;
      
      try {
        // 간단한 테스트 쿼리
        await this.queryWithModel(`${trackerId}_flash`, 'test', null, {});
        results[keyInfo.name] = {
          status: 'ok',
          usage: this.usageTrackers.get(trackerId).getTodayUsage()
        };
      } catch (error) {
        results[keyInfo.name] = {
          status: 'error',
          error: error.message,
          usage: this.usageTrackers.get(trackerId).getTodayUsage()
        };
      }
    }
    
    return {
      strategy: this.fallbackStrategy,
      currentKey: this.currentKeyIndex,
      keys: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 사용량 통계 조회
   */
  getUsageStats() {
    const stats = {
      strategy: this.fallbackStrategy,
      currentKey: this.currentKeyIndex,
      totalKeys: this.apiKeys.length,
      keys: {}
    };
    
    this.apiKeys.forEach((keyInfo, index) => {
      const trackerId = `key_${index}`;
      const usage = this.usageTrackers.get(trackerId).getTodayUsage();
      
      stats.keys[keyInfo.name] = {
        ...usage,
        index: index,
        active: index === this.currentKeyIndex
      };
    });
    
    return stats;
  }

  /**
   * 대기 함수
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 다음 할당량 리셋 시간 계산 (다음날 오후 4시)
   */
  getNextQuotaResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0); // 오후 4시 (UTC+9 기준)
    
    return tomorrow.getTime();
  }

  /**
   * 🖼️ 다중 이미지 지원 콘텐츠 생성 - 폴백 모드에 따라 분기
   * @param {string} prompt - 텍스트 프롬프트
   * @param {Array} imageContents - 이미지 콘텐츠 배열
   * @param {Object} options - 추가 옵션
   */
  async generateContentWithImages(prompt, imageContents = [], options = {}) {
    if (this.fallbackMode === 'multi-key') {
      return await this.generateContentWithImagesMultiKey(prompt, imageContents, options);
    } else if (this.fallbackMode === 'model-priority') {
      return await this.generateContentWithImagesModelPriority(prompt, imageContents, options);
    } else if (this.fallbackMode === 'single-model') {
      return await this.generateContentWithImagesSingleModel(prompt, imageContents, options);
    }
  }

  /**
   * Multi-Key 모드 다중 이미지 분석 (기존 로직)
   */
  async generateContentWithImagesMultiKey(prompt, imageContents = [], options = {}) {
    const startTime = Date.now();
    let lastError = null;

    // 재시도 로직
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.tryWithImagesStrategy(prompt, imageContents, options);
        
        if (result) {
          const duration = Date.now() - startTime;
          ServerLogger.success(`✅ Multi-Key 다중 이미지 분석 성공 (${duration}ms, 시도: ${attempt}/${this.retryAttempts})`, null, 'UNIFIED');
          return {
            text: result.text,
            model: result.model,
            timestamp: result.timestamp,
            duration
          };
        }
      } catch (error) {
        lastError = error;
        ServerLogger.warn(`⚠️ Multi-Key 다중 이미지 분석 실패 (시도 ${attempt}/${this.retryAttempts}): ${error.message}`, null, 'UNIFIED');
        
        if (attempt < this.retryAttempts) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    ServerLogger.error(`❌ Multi-Key 다중 이미지 분석 최종 실패 (${duration}ms)`, lastError, 'UNIFIED');
    throw lastError || new Error('Multi-Key 다중 이미지 분석 실패');
  }

  /**
   * Model-Priority 모드 다중 이미지 분석 (신규 로직)
   */
  async generateContentWithImagesModelPriority(prompt, imageContents = [], options = {}) {
    const startTime = Date.now();
    let lastError = null;

    // 사용 가능한 모델 찾기 (우선순위대로)
    for (const modelType of this.modelPriority) {
      const status = this.modelStatus[modelType];
      
      // 모델이 비활성화되어 있으면 건너뛰기
      if (!status.available || (status.disabledUntil && Date.now() < status.disabledUntil)) {
        ServerLogger.info(`⏭️ 다중 이미지: 모델 ${modelType} 건너뛰기 (비활성화됨)`, null, 'UNIFIED');
        continue;
      }

      try {
        ServerLogger.info(`🔄 다중 이미지: 모델 ${modelType}로 시도`, null, 'UNIFIED');
        const result = await this.queryWithModelImagesPriority(modelType, prompt, imageContents, options);
        
        if (result) {
          const duration = Date.now() - startTime;
          this.usageTracker.increment(modelType, true);
          ServerLogger.success(`✅ Model-Priority 다중 이미지 분석 성공 (모델: ${modelType}, ${duration}ms)`, null, 'UNIFIED');
          return {
            text: result.text,
            model: result.model,
            timestamp: result.timestamp,
            duration
          };
        }
        
      } catch (error) {
        lastError = error;
        this.usageTracker.increment(modelType, false);
        
        if (this.isQuotaError(error)) {
          // 할당량 초과 → 다음날 오후 4시까지 비활성화
          const nextReset = this.getNextQuotaResetTime();
          status.available = false;
          status.quotaExhausted = true;
          status.disabledUntil = nextReset;
          status.lastQuotaError = new Date().toISOString();
          const resetDate = new Date(nextReset).toLocaleString('ko-KR');
          ServerLogger.warn(`🚫 다중 이미지: 모델 ${modelType} 할당량 초과로 비활성화 (복구 예정: ${resetDate})`, null, 'UNIFIED');
          
        } else if (this.isOverloadError(error)) {
          // 과부하 → 모델 임시 비활성화 (3초)
          status.disabledUntil = Date.now() + this.overloadRecoveryInterval;
          ServerLogger.warn(`⏳ 다중 이미지: 모델 ${modelType} 과부하로 임시 비활성화 (3초)`, null, 'UNIFIED');
          
        } else {
          ServerLogger.warn(`⚠️ 다중 이미지: 모델 ${modelType} 일반 오류: ${error.message}`, null, 'UNIFIED');
        }
        
        status.lastError = error.message;
      }
    }
    
    // 모든 모델 실패
    const duration = Date.now() - startTime;
    ServerLogger.error(`❌ Model-Priority 다중 이미지 모든 모델 실패 (총 ${duration}ms)`, lastError, 'UNIFIED');
    throw lastError || new Error('Model-Priority 다중 이미지: 모든 모델이 사용 불가능합니다.');
  }

  /**
   * Single-Model 모드 다중 이미지 분석 (신규 로직)
   */
  async generateContentWithImagesSingleModel(prompt, imageContents = [], options = {}) {
    const startTime = Date.now();
    let lastError = null;

    if (!this.singleModelInstance) {
      throw new Error('Single model이 초기화되지 않았습니다');
    }

    // 단일 모델로 재시도
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        ServerLogger.info(`🔄 Single-Model 다중 이미지 (${this.singleModel}) 시도 (${attempt}번째)`, null, 'UNIFIED');
        
        // API 호출 로직을 직접 포함 (thinking 모드 지원)
        const requestData = [prompt, ...imageContents];
        
        const generationConfig = {};
        
        // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
        const thinkingBudget = options.thinkingBudget ?? 
                              (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);
        
        if (thinkingBudget !== undefined && this.singleModel.includes('flash')) {
          generationConfig.thinkingBudget = thinkingBudget;
        }
        
        const apiResult = await this.singleModelInstance.generateContent(requestData, generationConfig);
        const response = await apiResult.response;
        
        const result = {
          text: response.text(),
          model: `${this.singleModel} (single-model)`,
          timestamp: new Date().toISOString()
        };
        
        if (result) {
          const duration = Date.now() - startTime;
          this.usageTracker.increment('single', true);
          ServerLogger.success(`✅ Single-Model 다중 이미지 분석 성공 (모델: ${this.singleModel}, 시도: ${attempt}, ${duration}ms)`, null, 'UNIFIED');
          return {
            text: result.text,
            model: result.model,
            timestamp: result.timestamp,
            duration
          };
        }
        
      } catch (error) {
        lastError = error;
        this.usageTracker.increment('single', false);
        
        ServerLogger.error(`Single-Model 다중 이미지 처리 실패: ${error.message}`, error, 'UNIFIED');
        ServerLogger.warn(`⚠️ Single-Model 다중 이미지 시도 ${attempt}/${this.retryAttempts} 실패: ${error.message}`, null, 'UNIFIED');
        
        // 마지막 시도가 아니면 잠시 대기
        if (attempt < this.retryAttempts) {
          const delayTime = this.retryDelay * attempt;
          ServerLogger.info(`⏳ ${delayTime}ms 대기 후 재시도...`, null, 'UNIFIED');
          await this.sleep(delayTime);
        }
      }
    }
    
    // 모든 시도 실패
    const duration = Date.now() - startTime;
    ServerLogger.error(`❌ Single-Model 다중 이미지 모든 시도 실패 (총 ${duration}ms)`, lastError, 'UNIFIED');
    throw lastError || new Error(`Single-Model (${this.singleModel}) 다중 이미지 모든 시도 실패`);
  }

  /**
   * 다중 이미지를 위한 전략별 시도
   */
  async tryWithImagesStrategy(prompt, imageContents, options) {
    const trackerId = `key_${this.currentKeyIndex}`;
    const usageTracker = this.usageTrackers.get(trackerId);

    try {
      // 전략별 모델 선택
      const modelType = this.fallbackStrategy === 'pro' ? 'pro' : 'flash';
      const result = await this.queryWithModelImages(`${trackerId}_${modelType}`, prompt, imageContents, options);
      
      usageTracker.increment(modelType, true);
      return result;
      
    } catch (error) {
      if (this.isQuotaError(error)) {
        // 할당량 오류 시 폴백
        return await this.handleQuotaExceededImages(prompt, imageContents, options);
      }
      
      // 일반 오류 시 다른 모델로 폴백
      if (this.enableFallback && this.fallbackStrategy !== 'pro') {
        try {
          ServerLogger.info('🔄 다중 이미지 Pro 모델로 폴백 시도', null, 'UNIFIED');
          const result = await this.queryWithModelImages(`${trackerId}_pro`, prompt, imageContents, options);
          usageTracker.increment('pro', true);
          return result;
          
        } catch (proError) {
          usageTracker.increment('pro', false);
          throw proError;
        }
      }
      
      throw error;
    }
  }

  /**
   * 다중 이미지 할당량 초과 시 폴백
   */
  async handleQuotaExceededImages(prompt, imageContents, options) {
    if (this.apiKeys.length > 1) {
      // 다른 API 키로 전환
      for (let i = 1; i < this.apiKeys.length; i++) {
        const nextKeyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
        
        try {
          ServerLogger.info(`🔄 다중 이미지: API 키 ${nextKeyIndex}로 전환`, null, 'UNIFIED');
          
          const trackerId = `key_${nextKeyIndex}`;
          const modelType = this.fallbackStrategy === 'pro' ? 'pro' : 'flash';
          const result = await this.queryWithModelImages(`${trackerId}_${modelType}`, prompt, imageContents, options);
          
          this.usageTrackers.get(trackerId).increment(modelType, true);
          this.currentKeyIndex = nextKeyIndex;
          
          return result;
          
        } catch (error) {
          this.usageTrackers.get(`key_${nextKeyIndex}`).increment('flash', false);
          ServerLogger.warn(`⚠️ API 키 ${nextKeyIndex} 다중 이미지도 실패`, null, 'UNIFIED');
        }
      }
    }
    
    return null;
  }

  /**
   * 특정 모델로 다중 이미지 쿼리 실행 (Multi-Key 모드용)
   */
  async queryWithModelImages(modelId, prompt, imageContents, options) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`모델을 찾을 수 없습니다: ${modelId}`);
    }

    // 요청 데이터 구성: 프롬프트 + 이미지들
    const requestData = [prompt, ...imageContents];

    // API 호출 (thinking 모드 지원)
    const generationConfig = {};
    
    // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
    const thinkingBudget = options.thinkingBudget ?? 
                          (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);
    
    if (thinkingBudget !== undefined && modelId.includes('flash')) {
      generationConfig.thinkingBudget = thinkingBudget;
    }
    
    const result = await model.generateContent(requestData, generationConfig);
    const response = await result.response;
    
    return {
      text: response.text(),
      model: modelId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Model-Priority 모드용 다중 이미지 쿼리 실행
   */
  async queryWithModelImagesPriority(modelType, prompt, imageContents, options) {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`모델을 찾을 수 없습니다: ${modelType}`);
    }

    // 요청 데이터 구성: 프롬프트 + 이미지들
    const requestData = [prompt, ...imageContents];

    // API 호출 (thinking 모드 지원)
    const generationConfig = {};
    
    // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
    const thinkingBudget = options.thinkingBudget ?? 
                          (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);
    
    if (thinkingBudget !== undefined && modelType.includes('flash')) {
      generationConfig.thinkingBudget = thinkingBudget;
    }
    
    const result = await model.generateContent(requestData, generationConfig);
    const response = await result.response;
    
    return {
      text: response.text(),
      model: `${modelType} (single-key)`,
      timestamp: new Date().toISOString()
    };
  }

}

module.exports = UnifiedGeminiManager;