const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ServerLogger } = require('./logger');

/**
 * Gemini API 사용량 추적 시스템
 */
class UsageTracker {
  constructor(apiKey = null) {
    this.usageFilePath = path.join(__dirname, '../../config/gemini-usage.json');
    this.quotasFilePath = path.join(__dirname, '../../config/api-quotas.json');
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY;
    this.currentApiKeyHash = this.apiKey ? this.hashApiKey(this.apiKey) : null;
    
    // 현재 API 키 자동 등록
    this.autoRegisterCurrentApiKey();
    
    // API 키 기반 할당량 로드
    this.quotas = this.loadQuotasForCurrentApiKey();
    
    // API 엔드포인트 설정 초기화
    this.initializeApiEndpoints();
    
    this.dailyUsage = this.loadTodayUsage();
  }

  /**
   * API 엔드포인트 설정 초기화
   */
  initializeApiEndpoints() {
    this.apiEndpoints = {
      // Gemini API 엔드포인트
      'gemini-2.5-pro': { cost: 1, enabled: true, category: 'gemini' },
      'gemini-2.5-flash': { cost: 1, enabled: true, category: 'gemini' },
      'gemini-2.5-flash-lite': { cost: 1, enabled: true, category: 'gemini' },
      
      // YouTube Data API 엔드포인트
      'youtube-videos': { cost: 1, enabled: true, category: 'youtube' },
      'youtube-search': { cost: 100, enabled: true, category: 'youtube' },
      'youtube-channels': { cost: 1, enabled: true, category: 'youtube' },
      'youtube-comments': { cost: 1, enabled: true, category: 'youtube' },
      'youtube-playlists': { cost: 1, enabled: false, category: 'youtube' }, // 미래 확장용
      'youtube-captions': { cost: 200, enabled: false, category: 'youtube' }  // 미래 확장용
    };

    ServerLogger.info('🔧 API 엔드포인트 설정 초기화 완료', {
      total: Object.keys(this.apiEndpoints).length,
      enabled: Object.values(this.apiEndpoints).filter(ep => ep.enabled).length,
      gemini: Object.values(this.apiEndpoints).filter(ep => ep.category === 'gemini' && ep.enabled).length,
      youtube: Object.values(this.apiEndpoints).filter(ep => ep.category === 'youtube' && ep.enabled).length
    }, 'USAGE');
  }

  /**
   * API 키 해시 생성 (보안을 위해)
   */
  hashApiKey(apiKey) {
    if (!apiKey) return null;
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  /**
   * 현재 API 키에 맞는 할당량 로드
   */
  loadQuotasForCurrentApiKey() {
    try {
      // 기본 할당량
      const defaultQuotas = {
        'gemini-2.5-pro': { rpm: 5, tpm: 250000, rpd: 50 },
        'gemini-2.5-flash': { rpm: 10, tpm: 250000, rpd: 250 },
        'gemini-2.5-flash-lite': { rpm: 15, tpm: 250000, rpd: 1000 },
        'youtube-data-api': { rpd: 9500 } // 안전 마진: 실제 10,000에서 500 차감
      };

      // 할당량 파일이 없으면 기본값 반환
      if (!fs.existsSync(this.quotasFilePath)) {
        ServerLogger.info('📊 할당량 설정 파일이 없어 기본값 사용', null, 'USAGE');
        return defaultQuotas;
      }

      const quotaConfig = JSON.parse(fs.readFileSync(this.quotasFilePath, 'utf8'));
      
      // API 키 해시가 있고 해당 설정이 있으면 사용
      if (this.currentApiKeyHash && quotaConfig.api_keys && quotaConfig.api_keys[this.currentApiKeyHash]) {
        const customQuotas = quotaConfig.api_keys[this.currentApiKeyHash];
        ServerLogger.info(`📊 API 키별 할당량 로드: ${customQuotas.name || 'Unknown'}`, null, 'USAGE');
        return {
          'gemini-2.5-pro': customQuotas['gemini-2.5-pro'] || defaultQuotas['gemini-2.5-pro'],
          'gemini-2.5-flash': customQuotas['gemini-2.5-flash'] || defaultQuotas['gemini-2.5-flash'],
          'gemini-2.5-flash-lite': customQuotas['gemini-2.5-flash-lite'] || defaultQuotas['gemini-2.5-flash-lite'],
          'youtube-data-api': customQuotas['youtube-data-api'] || defaultQuotas['youtube-data-api']
        };
      }

      // 기본 설정이 있으면 사용 (누락된 YouTube API 추가)
      if (quotaConfig.default) {
        ServerLogger.info('📊 기본 할당량 설정 사용', null, 'USAGE');
        const mergedDefault = {
          ...defaultQuotas,
          ...quotaConfig.default
        };
        return mergedDefault;
      }

      // 모든 경우가 실패하면 하드코드된 기본값
      ServerLogger.info('📊 하드코드된 기본 할당량 사용', null, 'USAGE');
      return defaultQuotas;

    } catch (error) {
      ServerLogger.warn(`할당량 설정 로드 실패: ${error.message}, 기본값 사용`, null, 'USAGE');
      return {
        'gemini-2.5-pro': { rpm: 5, tpm: 250000, rpd: 50 },
        'gemini-2.5-flash': { rpm: 10, tpm: 250000, rpd: 250 },
        'gemini-2.5-flash-lite': { rpm: 15, tpm: 250000, rpd: 1000 },
        'youtube-data-api': { rpd: 9500 } // 안전 마진: 실제 10,000에서 500 차감
      };
    }
  }

  /**
   * 현재 API 키를 할당량 설정에 자동 등록
   */
  autoRegisterCurrentApiKey() {
    if (!this.currentApiKeyHash || !this.apiKey) return;

    try {
      let quotaConfig = {};
      
      // 기존 설정 파일 읽기
      if (fs.existsSync(this.quotasFilePath)) {
        quotaConfig = JSON.parse(fs.readFileSync(this.quotasFilePath, 'utf8'));
      }

      // 기본 구조 초기화
      if (!quotaConfig.default) {
        quotaConfig.default = {
          'gemini-2.5-pro': { rpm: 5, tpm: 250000, rpd: 50 },
          'gemini-2.5-flash': { rpm: 10, tpm: 250000, rpd: 250 },
          'gemini-2.5-flash-lite': { rpm: 15, tpm: 250000, rpd: 1000 },
          'youtube-data-api': { rpd: 9500 } // 안전 마진: 실제 10,000에서 500 차감
        };
      }
      
      if (!quotaConfig.api_keys) {
        quotaConfig.api_keys = {};
      }

      // 현재 API 키가 등록되어 있지 않으면 자동 등록
      if (!quotaConfig.api_keys[this.currentApiKeyHash]) {
        quotaConfig.api_keys[this.currentApiKeyHash] = {
          name: `자동등록 API 키 (${this.currentApiKeyHash})`,
          'gemini-2.5-pro': { rpm: 5, tpm: 250000, rpd: 50 },
          'gemini-2.5-flash': { rpm: 10, tpm: 250000, rpd: 250 },
          'gemini-2.5-flash-lite': { rpm: 15, tpm: 250000, rpd: 1000 },
          'youtube-data-api': { rpd: 9500 } // 안전 마진: 실제 10,000에서 500 차감
        };

        // 설정 파일에 저장
        const configDir = path.dirname(this.quotasFilePath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(this.quotasFilePath, JSON.stringify(quotaConfig, null, 2));
        ServerLogger.info(`📊 새로운 API 키 자동 등록: ${this.currentApiKeyHash}`, null, 'USAGE');
      }

    } catch (error) {
      ServerLogger.error('API 키 자동 등록 실패:', error, 'USAGE');
    }
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
          ServerLogger.info(`📊 오늘 사용량 로드: Pro ${data[today].pro}/${this.quotas['gemini-2.5-pro'].rpd}, Flash ${data[today].flash}/${this.quotas['gemini-2.5-flash'].rpd}, Flash-Lite ${data[today].flashLite || 0}/${this.quotas['gemini-2.5-flash-lite'].rpd}`, null, 'USAGE');
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
        flashLite: 0,
        proErrors: 0,
        flashErrors: 0,
        flashLiteErrors: 0,
        youtubeVideos: 0,
        youtubeSearch: 0,
        youtubeChannels: 0,
        youtubeComments: 0,
        youtubeErrors: 0,
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
        flashLite: 0,
        proErrors: 0,
        flashErrors: 0,
        flashLiteErrors: 0,
        youtubeVideos: 0,
        youtubeSearch: 0,
        youtubeChannels: 0,
        youtubeComments: 0,
        youtubeErrors: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    // YouTube 필드 초기화 (기존 데이터 호환성)
    if (this.dailyUsage[today].youtubeVideos === undefined) this.dailyUsage[today].youtubeVideos = 0;
    if (this.dailyUsage[today].youtubeSearch === undefined) this.dailyUsage[today].youtubeSearch = 0;
    if (this.dailyUsage[today].youtubeChannels === undefined) this.dailyUsage[today].youtubeChannels = 0;
    if (this.dailyUsage[today].youtubeComments === undefined) this.dailyUsage[today].youtubeComments = 0;
    if (this.dailyUsage[today].youtubeErrors === undefined) this.dailyUsage[today].youtubeErrors = 0;

    // 사용량 증가
    if (success) {
      if (modelType === 'pro') {
        this.dailyUsage[today].pro++;
      } else if (modelType === 'flash') {
        this.dailyUsage[today].flash++;
      } else if (modelType === 'flash-lite' || modelType === 'flashLite') {
        this.dailyUsage[today].flashLite++;
      } else if (modelType === 'youtube-videos') {
        this.dailyUsage[today].youtubeVideos++;
      } else if (modelType === 'youtube-search') {
        this.dailyUsage[today].youtubeSearch++;
      } else if (modelType === 'youtube-channels') {
        this.dailyUsage[today].youtubeChannels++;
      } else if (modelType === 'youtube-comments') {
        this.dailyUsage[today].youtubeComments++;
      }
    } else {
      // 에러 카운트
      if (modelType === 'pro') {
        this.dailyUsage[today].proErrors++;
      } else if (modelType === 'flash') {
        this.dailyUsage[today].flashErrors++;
      } else if (modelType === 'flash-lite' || modelType === 'flashLite') {
        this.dailyUsage[today].flashLiteErrors++;
      } else if (modelType.startsWith('youtube-')) {
        this.dailyUsage[today].youtubeErrors++;
      }
    }

    this.dailyUsage[today].lastUpdated = new Date().toISOString();
    this.saveTodayUsage();

    // 로깅
    const todayData = this.dailyUsage[today];
    const totalYouTube = (todayData.youtubeVideos || 0) + (todayData.youtubeSearch || 0) + (todayData.youtubeChannels || 0) + (todayData.youtubeComments || 0);
    ServerLogger.info(`📊 사용량 업데이트: Pro ${todayData.pro}/${this.quotas['gemini-2.5-pro'].rpd} (에러:${todayData.proErrors}), Flash ${todayData.flash}/${this.quotas['gemini-2.5-flash'].rpd} (에러:${todayData.flashErrors}), Flash-Lite ${todayData.flashLite || 0}/${this.quotas['gemini-2.5-flash-lite'].rpd} (에러:${todayData.flashLiteErrors || 0}), YouTube ${totalYouTube}/${this.quotas['youtube-data-api'].rpd} (에러:${todayData.youtubeErrors || 0})`, null, 'USAGE');
  }

  /**
   * 특정 모델의 남은 할당량 확인
   */
  getRemainingQuota(modelType) {
    const today = this.getTodayString();
    const todayData = this.dailyUsage[today] || { pro: 0, flash: 0, flashLite: 0, youtubeVideos: 0, youtubeSearch: 0, youtubeChannels: 0, youtubeComments: 0 };
    
    if (modelType === 'pro') {
      return Math.max(0, this.quotas['gemini-2.5-pro'].rpd - todayData.pro);
    } else if (modelType === 'flash') {
      return Math.max(0, this.quotas['gemini-2.5-flash'].rpd - todayData.flash);
    } else if (modelType === 'flash-lite' || modelType === 'flashLite') {
      return Math.max(0, this.quotas['gemini-2.5-flash-lite'].rpd - (todayData.flashLite || 0));
    } else if (modelType === 'youtube' || modelType === 'youtube-data-api') {
      const totalYouTube = (todayData.youtubeVideos || 0) + (todayData.youtubeSearch || 0) + (todayData.youtubeChannels || 0) + (todayData.youtubeComments || 0);
      return Math.max(0, this.quotas['youtube-data-api'].rpd - totalYouTube);
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
    const todayData = this.dailyUsage[today] || { pro: 0, flash: 0, flashLite: 0, proErrors: 0, flashErrors: 0, flashLiteErrors: 0, youtubeVideos: 0, youtubeSearch: 0, youtubeChannels: 0, youtubeComments: 0, youtubeErrors: 0 };

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
      flashLite: {
        used: todayData.flashLite || 0,
        quota: this.quotas['gemini-2.5-flash-lite'].rpd,
        remaining: this.getRemainingQuota('flash-lite'),
        errors: todayData.flashLiteErrors || 0,
        percentage: Math.round(((todayData.flashLite || 0) / this.quotas['gemini-2.5-flash-lite'].rpd) * 100)
      },
      youtube: {
        used: {
          videos: todayData.youtubeVideos || 0,
          search: todayData.youtubeSearch || 0,
          channels: todayData.youtubeChannels || 0,
          comments: todayData.youtubeComments || 0,
          total: (todayData.youtubeVideos || 0) + (todayData.youtubeSearch || 0) + (todayData.youtubeChannels || 0) + (todayData.youtubeComments || 0)
        },
        quota: this.quotas['youtube-data-api'].rpd,
        remaining: this.getRemainingQuota('youtube'),
        errors: todayData.youtubeErrors || 0,
        percentage: Math.round((((todayData.youtubeVideos || 0) + (todayData.youtubeSearch || 0) + (todayData.youtubeChannels || 0) + (todayData.youtubeComments || 0)) / this.quotas['youtube-data-api'].rpd) * 100)
      },
      total: {
        used: todayData.pro + todayData.flash + (todayData.flashLite || 0),
        quota: this.quotas['gemini-2.5-pro'].rpd + this.quotas['gemini-2.5-flash'].rpd + this.quotas['gemini-2.5-flash-lite'].rpd,
        percentage: Math.round(((todayData.pro + todayData.flash + (todayData.flashLite || 0)) / (this.quotas['gemini-2.5-pro'].rpd + this.quotas['gemini-2.5-flash'].rpd + this.quotas['gemini-2.5-flash-lite'].rpd)) * 100)
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
    const flashLiteRemaining = this.getRemainingQuota('flash-lite');

    if (proRemaining > 0) {
      return 'gemini-2.5-pro';  // Pro 우선
    } else if (flashRemaining > 0) {
      return 'gemini-2.5-flash'; // Pro 소진시 Flash
    } else if (flashLiteRemaining > 0) {
      return 'gemini-2.5-flash-lite'; // Flash 소진시 Flash-Lite
    } else {
      return null; // 모든 모델 소진
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
        stats.flashLite.percentage > 90 ? '⚠️ Flash-Lite 모델 할당량 90% 초과' : null,
        stats.youtube.percentage > 90 ? '⚠️ YouTube API 할당량 90% 초과' : null,
        !recommendedModel ? '🚨 모든 모델 할당량 소진' : null
      ].filter(Boolean)
    };
  }

  /**
   * API 키 정보 조회 (디버그용)
   */
  getApiKeyInfo() {
    return {
      hasApiKey: !!this.apiKey,
      apiKeyHash: this.currentApiKeyHash,
      quotasFile: fs.existsSync(this.quotasFilePath),
      currentQuotas: this.quotas
    };
  }

  /**
   * 특정 API 키의 할당량 업데이트
   */
  updateApiKeyQuotas(apiKeyHash, quotas) {
    try {
      let quotaConfig = {};
      
      if (fs.existsSync(this.quotasFilePath)) {
        quotaConfig = JSON.parse(fs.readFileSync(this.quotasFilePath, 'utf8'));
      }

      if (!quotaConfig.api_keys) {
        quotaConfig.api_keys = {};
      }

      quotaConfig.api_keys[apiKeyHash] = {
        ...quotaConfig.api_keys[apiKeyHash],
        ...quotas
      };

      fs.writeFileSync(this.quotasFilePath, JSON.stringify(quotaConfig, null, 2));
      ServerLogger.info(`📊 API 키 할당량 업데이트: ${apiKeyHash}`, null, 'USAGE');

      // 현재 사용 중인 API 키면 할당량 다시 로드
      if (apiKeyHash === this.currentApiKeyHash) {
        this.quotas = this.loadQuotasForCurrentApiKey();
      }

      return true;
    } catch (error) {
      ServerLogger.error('API 키 할당량 업데이트 실패:', error, 'USAGE');
      return false;
    }
  }

  /**
   * 통합 API 추적 시스템
   */
  
  /**
   * 설정 기반 API 호출 추적
   * @param {string} endpoint - API 엔드포인트 이름
   * @param {boolean} success - 성공 여부
   */
  trackAPI(endpoint, success = true) {
    const config = this.apiEndpoints[endpoint];
    
    if (!config) {
      ServerLogger.warn(`⚠️ 알 수 없는 API 엔드포인트: ${endpoint}`, null, 'USAGE');
      return this;
    }
    
    if (!config.enabled) {
      ServerLogger.info(`🚫 비활성화된 API 엔드포인트: ${endpoint}`, null, 'USAGE');
      return this;
    }
    
    // 설정된 비용만큼 추적
    for (let i = 0; i < config.cost; i++) {
      this.increment(this.getTrackingKey(endpoint), success);
    }
    
    ServerLogger.info(`📊 ${endpoint} API 추적: ${config.cost} quota (성공: ${success})`, null, 'USAGE');
    return this;
  }
  
  /**
   * API 엔드포인트 이름을 추적 키로 변환
   */
  getTrackingKey(endpoint) {
    const mapping = {
      'gemini-2.5-pro': 'pro',
      'gemini-2.5-flash': 'flash', 
      'gemini-2.5-flash-lite': 'flash-lite',
      'youtube-videos': 'youtube-videos',
      'youtube-search': 'youtube-search',
      'youtube-channels': 'youtube-channels',
      'youtube-comments': 'youtube-comments',
      'youtube-playlists': 'youtube-playlists',
      'youtube-captions': 'youtube-captions'
    };
    
    return mapping[endpoint] || endpoint;
  }

  /**
   * 편의 메서드들 (기존 코드 호환성)
   */
  trackYouTubeVideos(success = true) { return this.trackAPI('youtube-videos', success); }
  trackYouTubeSearch(success = true) { return this.trackAPI('youtube-search', success); }
  trackYouTubeChannels(success = true) { return this.trackAPI('youtube-channels', success); }
  trackYouTubeComments(success = true) { return this.trackAPI('youtube-comments', success); }
  trackYouTubePlaylists(success = true) { return this.trackAPI('youtube-playlists', success); }
  trackYouTubeCaptions(success = true) { return this.trackAPI('youtube-captions', success); }

  /**
   * API 엔드포인트 설정 관리
   */
  
  /**
   * API 엔드포인트 활성화/비활성화
   */
  enableAPI(endpoint, enabled = true) {
    if (this.apiEndpoints[endpoint]) {
      this.apiEndpoints[endpoint].enabled = enabled;
      ServerLogger.info(`🔄 ${endpoint} API ${enabled ? '활성화' : '비활성화'}`, null, 'USAGE');
    }
    return this;
  }
  
  /**
   * API 엔드포인트 비용 수정
   */
  setAPICost(endpoint, cost) {
    if (this.apiEndpoints[endpoint]) {
      const oldCost = this.apiEndpoints[endpoint].cost;
      this.apiEndpoints[endpoint].cost = cost;
      ServerLogger.info(`💰 ${endpoint} API 비용 변경: ${oldCost} → ${cost}`, null, 'USAGE');
    }
    return this;
  }
  
  /**
   * 새로운 API 엔드포인트 추가
   */
  addAPI(endpoint, config) {
    const { cost = 1, enabled = true, category = 'custom' } = config;
    this.apiEndpoints[endpoint] = { cost, enabled, category };
    ServerLogger.info(`➕ 새로운 API 추가: ${endpoint} (${cost} quota, ${category})`, null, 'USAGE');
    return this;
  }
  
  /**
   * API 엔드포인트 설정 조회
   */
  getAPIConfig(endpoint) {
    return this.apiEndpoints[endpoint] || null;
  }
  
  /**
   * 모든 API 엔드포인트 설정 조회
   */
  getAllAPIConfigs() {
    return { ...this.apiEndpoints };
  }
  
  /**
   * 카테고리별 API 엔드포인트 조회
   */
  getAPIsByCategory(category) {
    return Object.entries(this.apiEndpoints)
      .filter(([, config]) => config.category === category)
      .reduce((acc, [endpoint, config]) => {
        acc[endpoint] = config;
        return acc;
      }, {});
  }

  /**
   * YouTube API 전체 사용량 조회
   */
  getYouTubeUsage() {
    const today = this.getTodayString();
    const todayData = this.dailyUsage[today] || { youtubeVideos: 0, youtubeSearch: 0, youtubeChannels: 0, youtubeComments: 0, youtubeErrors: 0 };
    
    return {
      videos: todayData.youtubeVideos || 0,
      search: todayData.youtubeSearch || 0,
      channels: todayData.youtubeChannels || 0,
      comments: todayData.youtubeComments || 0,
      total: (todayData.youtubeVideos || 0) + (todayData.youtubeSearch || 0) + (todayData.youtubeChannels || 0) + (todayData.youtubeComments || 0),
      errors: todayData.youtubeErrors || 0,
      remaining: this.getRemainingQuota('youtube'),
      quota: this.quotas['youtube-data-api'].rpd
    };
  }

  /**
   * YouTube API 할당량 초과 여부 확인
   */
  isYouTubeQuotaExceeded() {
    return this.isQuotaExceeded('youtube');
  }
}

module.exports = UsageTracker;