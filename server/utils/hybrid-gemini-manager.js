const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ServerLogger } = require('./logger');
const UsageTracker = require('./usage-tracker');

/**
 * 하이브리드 Gemini 관리자
 * Pro 모델 우선 사용 → 할당량 초과시 Flash로 자동 폴백
 */
class HybridGeminiManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.usageTracker = new UsageTracker();
    
    // 모델 인스턴스 생성
    this.models = {
      'gemini-2.5-pro': this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }),
      'gemini-2.5-flash': this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    };

    // 설정
    this.primaryModel = 'gemini-2.5-pro';
    this.fallbackModel = 'gemini-2.5-flash';
    this.enableFallback = process.env.ENABLE_GEMINI_FALLBACK !== 'false'; // 기본값: 활성화

    ServerLogger.success('🤖 하이브리드 Gemini 관리자 초기화 완료', {
      primaryModel: this.primaryModel,
      fallbackModel: this.fallbackModel,
      fallbackEnabled: this.enableFallback
    }, 'HYBRID');
  }

  /**
   * 메인 쿼리 메소드 - 스마트 폴백 포함
   */
  async generateContent(prompt, imageBase64 = null, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    // 1단계: Primary 모델(Pro) 시도
    try {
      ServerLogger.info(`🚀 ${this.primaryModel} 모델로 분석 시작`, null, 'HYBRID');
      
      const result = await this.queryWithModel(this.primaryModel, prompt, imageBase64, options);
      const duration = Date.now() - startTime;
      
      // 성공시 사용량 기록
      this.usageTracker.increment('pro', true);
      
      ServerLogger.success(`✅ ${this.primaryModel} 분석 완료 (${duration}ms)`, null, 'HYBRID');
      
      return {
        ...result,
        modelUsed: this.primaryModel,
        fallbackUsed: false,
        duration: duration,
        usageStats: this.usageTracker.getUsageStats()
      };

    } catch (error) {
      lastError = error;
      const duration = Date.now() - startTime;
      
      ServerLogger.warn(`⚠️ ${this.primaryModel} 분석 실패 (${duration}ms): ${error.message}`, null, 'HYBRID');
      
      // Pro 모델 에러 기록
      this.usageTracker.increment('pro', false);

      // 할당량 초과 에러가 아니거나 폴백 비활성화시 에러 전파
      if (!this.usageTracker.isQuotaExceededError(error) || !this.enableFallback) {
        throw error;
      }
    }

    // 2단계: Fallback 모델(Flash) 시도
    if (this.enableFallback && this.usageTracker.isQuotaExceededError(lastError)) {
      try {
        ServerLogger.info(`🔄 ${this.fallbackModel} 모델로 폴백 시도`, null, 'HYBRID');
        
        const result = await this.queryWithModel(this.fallbackModel, prompt, imageBase64, options);
        const totalDuration = Date.now() - startTime;
        
        // 성공시 사용량 기록
        this.usageTracker.increment('flash', true);
        
        ServerLogger.success(`✅ ${this.fallbackModel} 폴백 성공 (${totalDuration}ms)`, null, 'HYBRID');
        
        return {
          ...result,
          modelUsed: this.fallbackModel,
          fallbackUsed: true,
          duration: totalDuration,
          usageStats: this.usageTracker.getUsageStats()
        };

      } catch (fallbackError) {
        const totalDuration = Date.now() - startTime;
        
        // Flash 모델 에러 기록
        this.usageTracker.increment('flash', false);
        
        ServerLogger.error(`❌ ${this.fallbackModel} 폴백도 실패 (${totalDuration}ms): ${fallbackError.message}`, fallbackError, 'HYBRID');
        
        // 폴백도 실패시 마지막 에러 전파
        throw fallbackError;
      }
    }

    // 폴백 비활성화되어 있으면 원래 에러 전파
    throw lastError;
  }

  /**
   * 특정 모델로 직접 쿼리
   */
  async queryWithModel(modelName, prompt, imageBase64 = null, options = {}) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`지원되지 않는 모델: ${modelName}`);
    }

    // 요청 구성
    const parts = [{ text: prompt }];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      });
    }

    // API 호출
    const result = await model.generateContent(parts, options);
    const response = result.response;
    
    if (!response) {
      throw new Error(`${modelName}에서 응답을 받지 못했습니다`);
    }

    return {
      text: response.text(),
      response: response,
      modelName: modelName
    };
  }

  /**
   * 사용량 통계 조회
   */
  getUsageStats() {
    return this.usageTracker.getUsageStats();
  }

  /**
   * 헬스체크
   */
  healthCheck() {
    const usageHealth = this.usageTracker.healthCheck();
    
    return {
      status: usageHealth.status,
      hybridManager: {
        primaryModel: this.primaryModel,
        fallbackModel: this.fallbackModel,
        fallbackEnabled: this.enableFallback,
        apiKeyConfigured: !!this.apiKey
      },
      ...usageHealth
    };
  }

  /**
   * 최적 모델 추천
   */
  getRecommendedModel() {
    return this.usageTracker.getRecommendedModel();
  }

  /**
   * 강제로 특정 모델 사용 (테스트용)
   */
  async queryWithSpecificModel(modelName, prompt, imageBase64 = null, options = {}) {
    ServerLogger.info(`🎯 강제 모델 사용: ${modelName}`, null, 'HYBRID');
    
    const result = await this.queryWithModel(modelName, prompt, imageBase64, options);
    
    // 사용량 기록
    const modelType = modelName.includes('pro') ? 'pro' : 'flash';
    this.usageTracker.increment(modelType, true);
    
    return {
      ...result,
      modelUsed: modelName,
      forcedModel: true,
      usageStats: this.usageTracker.getUsageStats()
    };
  }

  /**
   * 설정 업데이트 (런타임)
   */
  updateConfig(config) {
    if (config.enableFallback !== undefined) {
      this.enableFallback = config.enableFallback;
      ServerLogger.info(`🔧 폴백 설정 변경: ${this.enableFallback}`, null, 'HYBRID');
    }
    
    if (config.primaryModel && this.models[config.primaryModel]) {
      this.primaryModel = config.primaryModel;
      ServerLogger.info(`🔧 기본 모델 변경: ${this.primaryModel}`, null, 'HYBRID');
    }
    
    if (config.fallbackModel && this.models[config.fallbackModel]) {
      this.fallbackModel = config.fallbackModel;
      ServerLogger.info(`🔧 폴백 모델 변경: ${this.fallbackModel}`, null, 'HYBRID');
    }
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      config: {
        primaryModel: this.primaryModel,
        fallbackModel: this.fallbackModel,
        enableFallback: this.enableFallback,
        apiKeyLength: this.apiKey ? this.apiKey.length : 0
      },
      availableModels: Object.keys(this.models),
      usageStats: this.getUsageStats(),
      recommendedModel: this.getRecommendedModel()
    };
  }
}

module.exports = HybridGeminiManager;