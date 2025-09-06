const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ServerLogger } = require('./logger');
const UsageTracker = require('./usage-tracker');
const { AI } = require('../config/constants');

/**
 * 통합 Gemini API 관리자
 * 기존 3개 클래스의 모든 기능을 통합:
 * - EnhancedMultiApiManager: 다중 키 관리
 * - MultiApiManager: 폴백 전략
 * - HybridGeminiManager: 재시도 로직
 */
class UnifiedGeminiManager {
  constructor(options = {}) {
    // 설정 로드
    this.fallbackStrategy = options.strategy || process.env.GEMINI_FALLBACK_STRATEGY || 'flash';
    this.enableFallback = process.env.ENABLE_GEMINI_FALLBACK !== 'false';
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
    
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
      
      // 각 키별로 Pro/Flash 모델 인스턴스 생성
      this.models.set(`${trackerId}_pro`, genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }));
      this.models.set(`${trackerId}_flash`, genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }));
    });
    
    // 현재 활성 API 키 인덱스
    this.currentKeyIndex = 0;
    
    ServerLogger.success('🤖 통합 Gemini 관리자 초기화 완료', {
      apiKeys: this.apiKeys.length,
      strategy: this.fallbackStrategy,
      fallbackEnabled: this.enableFallback
    }, 'UNIFIED');
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
   * 메인 콘텐츠 생성 메소드 - 모든 폴백 전략 통합
   */
  async generateContent(prompt, imageBase64 = null, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    // 재시도 로직 with 다양한 전략
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // 현재 키로 시도
        const result = await this.tryWithCurrentStrategy(prompt, imageBase64, options);
        
        if (result) {
          const duration = Date.now() - startTime;
          ServerLogger.success(`✅ AI 분석 성공 (${attempt}/${this.retryAttempts}회 시도, ${duration}ms)`, null, 'UNIFIED');
          return result;
        }
        
      } catch (error) {
        lastError = error;
        ServerLogger.warn(`⚠️ 시도 ${attempt}/${this.retryAttempts} 실패: ${error.message}`, null, 'UNIFIED');
        
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
    ServerLogger.error(`❌ 모든 AI 분석 시도 실패 (총 ${duration}ms)`, lastError, 'UNIFIED');
    throw lastError || new Error('AI 분석에 실패했습니다.');
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

    // API 호출
    const result = await model.generateContent(requestData);
    const response = await result.response;
    
    return {
      text: response.text(),
      model: modelId,
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
}

module.exports = UnifiedGeminiManager;