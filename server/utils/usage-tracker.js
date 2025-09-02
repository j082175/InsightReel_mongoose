const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('./logger');

/**
 * Gemini API 사용량 추적 시스템
 */
class UsageTracker {
  constructor() {
    this.usageFilePath = path.join(__dirname, '../../config/gemini-usage.json');
    this.quotas = {
      'gemini-2.5-pro': {
        rpm: 5,
        tpm: 250000,
        rpd: 100
      },
      'gemini-2.5-flash': {
        rpm: 10,
        tpm: 250000,
        rpd: 250
      }
    };
    
    this.dailyUsage = this.loadTodayUsage();
  }

  /**
   * 오늘 사용량 로드
   */
  loadTodayUsage() {
    try {
      if (fs.existsSync(this.usageFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.usageFilePath, 'utf8'));
        const today = this.getTodayString();
        
        // 오늘 데이터가 있으면 반환, 없으면 초기화
        if (data[today]) {
          ServerLogger.info(`📊 오늘 사용량 로드: Pro ${data[today].pro}/${this.quotas['gemini-2.5-pro'].rpd}, Flash ${data[today].flash}/${this.quotas['gemini-2.5-flash'].rpd}`, null, 'USAGE');
          return data;
        }
      }
    } catch (error) {
      ServerLogger.warn('사용량 파일 로드 실패, 새로 시작:', error.message, 'USAGE');
    }
    
    // 기본값 반환
    return this.initializeTodayUsage();
  }

  /**
   * 오늘 사용량 초기화
   */
  initializeTodayUsage() {
    const today = this.getTodayString();
    const usage = {
      [today]: {
        pro: 0,
        flash: 0,
        proErrors: 0,
        flashErrors: 0,
        lastUpdated: new Date().toISOString()
      }
    };
    
    ServerLogger.info('📊 새로운 일일 사용량 초기화', null, 'USAGE');
    return usage;
  }

  /**
   * 사용량 증가
   */
  increment(modelType, success = true) {
    const today = this.getTodayString();
    
    // 오늘 데이터 없으면 초기화
    if (!this.dailyUsage[today]) {
      this.dailyUsage[today] = {
        pro: 0,
        flash: 0,
        proErrors: 0,
        flashErrors: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    // 사용량 증가
    if (success) {
      if (modelType === 'pro') {
        this.dailyUsage[today].pro++;
      } else if (modelType === 'flash') {
        this.dailyUsage[today].flash++;
      }
    } else {
      // 에러 카운트
      if (modelType === 'pro') {
        this.dailyUsage[today].proErrors++;
      } else if (modelType === 'flash') {
        this.dailyUsage[today].flashErrors++;
      }
    }

    this.dailyUsage[today].lastUpdated = new Date().toISOString();
    this.saveTodayUsage();

    // 로깅
    const todayData = this.dailyUsage[today];
    ServerLogger.info(`📊 사용량 업데이트: Pro ${todayData.pro}/${this.quotas['gemini-2.5-pro'].rpd} (에러:${todayData.proErrors}), Flash ${todayData.flash}/${this.quotas['gemini-2.5-flash'].rpd} (에러:${todayData.flashErrors})`, null, 'USAGE');
  }

  /**
   * 특정 모델의 남은 할당량 확인
   */
  getRemainingQuota(modelType) {
    const today = this.getTodayString();
    const todayData = this.dailyUsage[today] || { pro: 0, flash: 0 };
    
    if (modelType === 'pro') {
      return Math.max(0, this.quotas['gemini-2.5-pro'].rpd - todayData.pro);
    } else if (modelType === 'flash') {
      return Math.max(0, this.quotas['gemini-2.5-flash'].rpd - todayData.flash);
    }
    
    return 0;
  }

  /**
   * 할당량 초과 여부 확인
   */
  isQuotaExceeded(modelType) {
    return this.getRemainingQuota(modelType) <= 0;
  }

  /**
   * 오늘 사용량 저장
   */
  saveTodayUsage() {
    try {
      // config 디렉토리 생성 (없는 경우)
      const configDir = path.dirname(this.usageFilePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 이전 데이터 유지하면서 오늘 데이터만 업데이트
      let existingData = {};
      if (fs.existsSync(this.usageFilePath)) {
        existingData = JSON.parse(fs.readFileSync(this.usageFilePath, 'utf8'));
      }

      // 7일 이전 데이터 정리 (용량 절약)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

      Object.keys(existingData).forEach(date => {
        if (date < cutoffDate) {
          delete existingData[date];
        }
      });

      // 오늘 데이터 업데이트
      const mergedData = { ...existingData, ...this.dailyUsage };
      
      fs.writeFileSync(this.usageFilePath, JSON.stringify(mergedData, null, 2), 'utf8');
    } catch (error) {
      ServerLogger.error('사용량 파일 저장 실패:', error, 'USAGE');
    }
  }

  /**
   * Google API 할당량 기준 오늘 날짜 문자열 (YYYY-MM-DD)
   * Google API는 한국시간 오후 4시(16:00)에 할당량이 리셋됨
   */
  getTodayString() {
    const now = new Date();
    
    // 한국시간으로 변환 (UTC+9)
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    // KST 시간에서 시간 추출 (getUTCHours를 사용해야 올바른 KST 시간 추출)
    const kstHour = kstTime.getUTCHours();
    
    // 오후 4시 이전이면 전날로 계산 (Google API 할당량 기준)
    if (kstHour < 16) {
      kstTime.setUTCDate(kstTime.getUTCDate() - 1);
    }
    
    return kstTime.toISOString().split('T')[0];
  }

  /**
   * 사용량 통계 반환
   */
  getUsageStats() {
    const today = this.getTodayString();
    const todayData = this.dailyUsage[today] || { pro: 0, flash: 0, proErrors: 0, flashErrors: 0 };

    return {
      date: today,
      pro: {
        used: todayData.pro,
        quota: this.quotas['gemini-2.5-pro'].rpd,
        remaining: this.getRemainingQuota('pro'),
        errors: todayData.proErrors || 0,
        percentage: Math.round((todayData.pro / this.quotas['gemini-2.5-pro'].rpd) * 100)
      },
      flash: {
        used: todayData.flash,
        quota: this.quotas['gemini-2.5-flash'].rpd,
        remaining: this.getRemainingQuota('flash'),
        errors: todayData.flashErrors || 0,
        percentage: Math.round((todayData.flash / this.quotas['gemini-2.5-flash'].rpd) * 100)
      },
      total: {
        used: todayData.pro + todayData.flash,
        quota: this.quotas['gemini-2.5-pro'].rpd + this.quotas['gemini-2.5-flash'].rpd,
        percentage: Math.round(((todayData.pro + todayData.flash) / (this.quotas['gemini-2.5-pro'].rpd + this.quotas['gemini-2.5-flash'].rpd)) * 100)
      },
      lastUpdated: todayData.lastUpdated
    };
  }

  /**
   * 최적 모델 추천
   */
  getRecommendedModel() {
    const proRemaining = this.getRemainingQuota('pro');
    const flashRemaining = this.getRemainingQuota('flash');

    if (proRemaining > 0) {
      return 'gemini-2.5-pro';  // Pro 우선
    } else if (flashRemaining > 0) {
      return 'gemini-2.5-flash'; // Pro 소진시 Flash
    } else {
      return null; // 둘 다 소진
    }
  }

  /**
   * 할당량 초과 에러 감지
   */
  isQuotaExceededError(error) {
    const quotaErrorPatterns = [
      'Resource exhausted',
      'Quota exceeded',
      'Rate limit exceeded',
      'User quota exhausted',
      'Too Many Requests',
      'RESOURCE_EXHAUSTED',
      'RATE_LIMIT_EXCEEDED'
    ];

    const errorMessage = error.message || error.toString() || '';
    const errorCode = error.code || error.status || 0;

    return quotaErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    ) || errorCode === 429;
  }

  /**
   * 헬스체크
   */
  healthCheck() {
    const stats = this.getUsageStats();
    const recommendedModel = this.getRecommendedModel();

    return {
      status: recommendedModel ? 'healthy' : 'quota_exhausted',
      recommendedModel,
      stats,
      warnings: [
        stats.pro.percentage > 90 ? '⚠️ Pro 모델 할당량 90% 초과' : null,
        stats.flash.percentage > 90 ? '⚠️ Flash 모델 할당량 90% 초과' : null,
        !recommendedModel ? '🚨 모든 모델 할당량 소진' : null
      ].filter(Boolean)
    };
  }
}

module.exports = UsageTracker;