const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ServerLogger } = require('./logger');
const { YOUTUBE_API_LIMITS, GEMINI_API_LIMITS } = require('../config/api-constants');

/**
 * Gemini API 사용량 추적 시스템
 */
class UsageTracker {
    static instances = new Map(); // 싱글톤 인스턴스 저장

    constructor(apiKey = null) {
        const key = apiKey || this.getDefaultApiKey();

        // 이미 동일한 API 키로 인스턴스가 있으면 반환
        if (UsageTracker.instances.has(key)) {
            return UsageTracker.instances.get(key);
        }
        this.usageFilePath = path.join(
            __dirname,
            '../../config/gemini-usage.json',
        );
        // this.quotasFilePath - 환경변수 기반으로 변경되어 불필요
        this.apiKey = apiKey || this.getDefaultApiKey();
        this.currentApiKeyHash = this.apiKey
            ? this.hashApiKey(this.apiKey)
            : null;

        // 현재 API 키 자동 등록
        // this.autoRegisterCurrentApiKey(); // 환경변수 기반으로 변경되어 불필요

        // API 키 기반 할당량 로드
        this.quotas = this.loadQuotasForCurrentApiKey();

        // API 엔드포인트 설정 초기화
        this.initializeApiEndpoints();

        this.dailyUsage = this.loadTodayUsage();

        // 싱글톤 인스턴스로 저장
        UsageTracker.instances.set(key, this);
    }

    /**
     * 기본 API 키 조회 (ApiKeyManager → 환경변수 폴백)
     * @returns {string|null} API 키
     */
    static getDefaultApiKey() {
        try {
            // 동기적으로 첫 번째 키만 조회 (비동기 초기화 없이)
            const apiKeysData = require('../data/api-keys.json');

            // 방어적 프로그래밍: apiKeysData가 배열인지 확인
            if (!Array.isArray(apiKeysData)) {
                throw new Error('API 키 데이터 형식이 올바르지 않습니다');
            }

            const activeKeys = apiKeysData.filter(key => key && key.status === 'active');
            if (activeKeys.length > 0) {
                return activeKeys[0].apiKey;
            }
        } catch (error) {
            // api-keys.json 파일이 없거나 읽기 실패
            ServerLogger.warn('API 키 파일 로드 실패:', error.message, 'USAGE-TRACKER');
        }
        throw new Error('활성 API 키를 찾을 수 없습니다. ApiKeyManager에 키를 추가하세요.');
    }

    /**
     * 인스턴스 메서드로 기본 API 키 조회
     * @returns {string|null} API 키
     */
    getDefaultApiKey() {
        return UsageTracker.getDefaultApiKey();
    }

    /**
     * 싱글톤 인스턴스 생성/반환
     * @param {string} apiKey - API 키
     * @returns {UsageTracker} 인스턴스
     */
    static getInstance(apiKey = null) {
        const key = apiKey || UsageTracker.getDefaultApiKey();

        if (!UsageTracker.instances.has(key)) {
            new UsageTracker(key); // constructor에서 instances에 저장됨
        }

        return UsageTracker.instances.get(key);
    }

    /**
     * API 엔드포인트 설정 초기화
     */
    initializeApiEndpoints() {
        this.apiEndpoints = {
            // Gemini API 엔드포인트
            'gemini-2.5-pro': { cost: 1, enabled: true, category: 'gemini' },
            'gemini-2.5-flash': { cost: 1, enabled: true, category: 'gemini' },
            'gemini-2.5-flash-lite': {
                cost: 1,
                enabled: true,
                category: 'gemini',
            },

            // YouTube Data API 엔드포인트
            'youtube-videos': { cost: 1, enabled: true, category: 'YOUTUBE' },
            'youtube-search': { cost: 100, enabled: true, category: 'YOUTUBE' },
            'youtube-channels': { cost: 1, enabled: true, category: 'YOUTUBE' },
            'youtube-comments': { cost: 1, enabled: true, category: 'YOUTUBE' },
            'youtube-playlists': {
                cost: 1,
                enabled: false,
                category: 'YOUTUBE',
            }, // 미래 확장용
            'youtube-captions': {
                cost: 200,
                enabled: false,
                category: 'YOUTUBE',
            }, // 미래 확장용
        };

        // ServerLogger.info('🔧 API 엔드포인트 설정 초기화 완료', {
        //   total: Object.keys(this.apiEndpoints).length,
        //   enabled: Object.values(this.apiEndpoints).filter(ep => ep.enabled).length,
        //   gemini: Object.values(this.apiEndpoints).filter(ep => ep.category === 'gemini' && ep.enabled).length,
        //   youtube: Object.values(this.apiEndpoints).filter(ep => ep.category === 'YOUTUBE' && ep.enabled).length
        // }, 'USAGE');
    }

    /**
     * API 키 해시 생성 (보안을 위해)
     */
    hashApiKey(apiKey) {
        if (!apiKey) return null;
        return crypto
            .createHash('sha256')
            .update(apiKey)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * 환경변수 기반 할당량 로드 (실무 표준)
     */
    loadQuotasForCurrentApiKey() {
        try {
            // 환경변수 기반 통합 할당량
            const quotas = {
                'gemini-2.5-pro': GEMINI_API_LIMITS.PRO,
                'gemini-2.5-flash': GEMINI_API_LIMITS.FLASH,
                'gemini-2.5-flash-lite': GEMINI_API_LIMITS.FLASH_LITE,
                'youtube-data-api': { rpd: YOUTUBE_API_LIMITS.SAFETY_MARGIN }, // 환경변수 기반
            };

            ServerLogger.info(
                '📊 환경변수 기반 할당량 로드 완료',
                { youtubeMargin: YOUTUBE_API_LIMITS.SAFETY_MARGIN },
                'USAGE',
            );

            return quotas;
        } catch (error) {
            ServerLogger.warn(
                `할당량 설정 로드 실패: ${error.message}, 기본값 사용`,
                null,
                'USAGE',
            );
            return {
                'gemini-2.5-pro': GEMINI_API_LIMITS.PRO,
                'gemini-2.5-flash': GEMINI_API_LIMITS.FLASH,
                'gemini-2.5-flash-lite': GEMINI_API_LIMITS.FLASH_LITE,
                'youtube-data-api': { rpd: 8000 }, // 하드코딩 폴백
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
                quotaConfig = JSON.parse(
                    fs.readFileSync(this.quotasFilePath, 'utf8'),
                );
            }

            // 기본 구조 초기화
            if (!quotaConfig.default) {
                quotaConfig.default = {
                    'gemini-2.5-pro': GEMINI_API_LIMITS.PRO,
                    'gemini-2.5-flash': GEMINI_API_LIMITS.FLASH,
                    'gemini-2.5-flash-lite': GEMINI_API_LIMITS.FLASH_LITE,
                    'youtube-data-api': { rpd: YOUTUBE_API_LIMITS.SAFETY_MARGIN }, // 상수 파일 기반 안전 마진
                };
            }

            if (!quotaConfig.api_keys) {
                quotaConfig.api_keys = {};
            }

            // 현재 API 키가 등록되어 있지 않으면 자동 등록, 등록되어 있어도 할당량은 강제 업데이트
            const needsUpdate = !quotaConfig.api_keys[this.currentApiKeyHash] || 
                                quotaConfig.api_keys[this.currentApiKeyHash]['youtube-data-api'].rpd !== YOUTUBE_API_LIMITS.SAFETY_MARGIN;
            
            if (needsUpdate) {
                const existingName = quotaConfig.api_keys[this.currentApiKeyHash]?.name || `자동등록 API 키 (${this.currentApiKeyHash})`;
                
                quotaConfig.api_keys[this.currentApiKeyHash] = {
                    name: existingName,
                    'gemini-2.5-pro': GEMINI_API_LIMITS.PRO,
                    'gemini-2.5-flash': GEMINI_API_LIMITS.FLASH,
                    'gemini-2.5-flash-lite': GEMINI_API_LIMITS.FLASH_LITE,
                    'youtube-data-api': { rpd: YOUTUBE_API_LIMITS.SAFETY_MARGIN }, // 상수 파일 기반 안전 마진
                };

                // 설정 파일에 저장
                const configDir = path.dirname(this.quotasFilePath);
                if (!fs.existsSync(configDir)) {
                    fs.mkdirSync(configDir, { recursive: true });
                }

                fs.writeFileSync(
                    this.quotasFilePath,
                    JSON.stringify(quotaConfig, null, 2),
                );
                ServerLogger.info(`📊 API 키 할당량 강제 업데이트: ${this.currentApiKeyHash} (YouTube: ${YOUTUBE_API_LIMITS.SAFETY_MARGIN})`, null, 'USAGE');
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
                const data = JSON.parse(
                    fs.readFileSync(this.usageFilePath, 'utf8'),
                );
                const today = this.getTodayString();

                // 키별 섹션 구조 확인
                if (
                    data.keys &&
                    data.keys[this.currentApiKeyHash] &&
                    data.keys[this.currentApiKeyHash][today]
                ) {
                    const keyData = data.keys[this.currentApiKeyHash][today];
                    // ServerLogger.info(`📊 오늘 사용량 로드 (키: ${this.currentApiKeyHash}): Pro ${keyData.pro}/${this.quotas['gemini-2.5-pro'].rpd}, Flash ${keyData.flash}/${this.quotas['gemini-2.5-flash'].rpd}, Flash-Lite ${keyData.flashLite || 0}/${this.quotas['gemini-2.5-flash-lite'].rpd}`, null, 'USAGE');

                    // 기존 구조와 호환되도록 변환
                    const compatibleData = {};
                    compatibleData[today] = keyData;
                    return compatibleData;
                }

                // 기존 구조 (하위 호환성)
                if (data[today]) {
                    ServerLogger.info(
                        `📊 오늘 사용량 로드 (기존 구조): Pro ${
                            data[today].pro
                        }/${this.quotas['gemini-2.5-pro'].rpd}, Flash ${
                            data[today].flash
                        }/${this.quotas['gemini-2.5-flash'].rpd}, Flash-Lite ${
                            data[today].flashLite || 0
                        }/${this.quotas['gemini-2.5-flash-lite'].rpd}`,
                        null,
                        'USAGE',
                    );
                    return data;
                }
            }
        } catch (error) {
            ServerLogger.warn(
                '사용량 파일 로드 실패, 새로 시작:',
                error.message,
                'USAGE',
            );
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
                lastUpdated: new Date().toISOString(),
            },
        };

        // ServerLogger.info('📊 새로운 일일 사용량 초기화', null, 'USAGE');
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
                lastUpdated: new Date().toISOString(),
            };
        }

        // YouTube 필드 초기화 (기존 데이터 호환성)
        if (this.dailyUsage[today].youtubeVideos === undefined)
            this.dailyUsage[today].youtubeVideos = 0;
        if (this.dailyUsage[today].youtubeSearch === undefined)
            this.dailyUsage[today].youtubeSearch = 0;
        if (this.dailyUsage[today].youtubeChannels === undefined)
            this.dailyUsage[today].youtubeChannels = 0;
        if (this.dailyUsage[today].youtubeComments === undefined)
            this.dailyUsage[today].youtubeComments = 0;
        if (this.dailyUsage[today].youtubeErrors === undefined)
            this.dailyUsage[today].youtubeErrors = 0;

        // 사용량 증가
        if (success) {
            if (modelType === 'pro') {
                this.dailyUsage[today].pro++;
            } else if (modelType === 'flash') {
                this.dailyUsage[today].flash++;
            } else if (
                modelType === 'flash-lite' ||
                modelType === 'flashLite'
            ) {
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
            } else if (
                modelType === 'flash-lite' ||
                modelType === 'flashLite'
            ) {
                this.dailyUsage[today].flashLiteErrors++;
            } else if (modelType.startsWith('youtube-')) {
                this.dailyUsage[today].youtubeErrors++;
            }
        }

        this.dailyUsage[today].lastUpdated = new Date().toISOString();
        this.saveTodayUsage();

        // 로깅 (10번마다만 출력하여 노이즈 감소)
        const todayData = this.dailyUsage[today];
        const totalYouTube =
            (todayData.youtubeVideos || 0) +
            (todayData.youtubeSearch || 0) +
            (todayData.youtubeChannels || 0) +
            (todayData.youtubeComments || 0);
        
        // 10번마다 또는 에러 발생시만 로그 출력
        const totalCalls = todayData.pro + todayData.flash + (todayData.flashLite || 0) + totalYouTube;
        if (totalCalls % 10 === 0 || !success || process.env.NODE_ENV === 'development') {
            ServerLogger.info(
                `📊 사용량 업데이트: Pro ${todayData.pro}/${
                    this.quotas['gemini-2.5-pro'].rpd
                } (에러:${todayData.proErrors}), Flash ${todayData.flash}/${
                    this.quotas['gemini-2.5-flash'].rpd
                } (에러:${todayData.flashErrors}), Flash-Lite ${
                    todayData.flashLite || 0
                }/${this.quotas['gemini-2.5-flash-lite'].rpd} (에러:${
                    todayData.flashLiteErrors || 0
                }), YouTube ${totalYouTube}/${
                    this.quotas['youtube-data-api'].rpd
                } (에러:${todayData.youtubeErrors || 0})`,
                null,
                'USAGE',
            );
        }
    }

    /**
     * 특정 모델의 남은 할당량 확인
     */
    getRemainingQuota(modelType) {
        const today = this.getTodayString();
        const todayData = this.dailyUsage[today] || {
            pro: 0,
            flash: 0,
            flashLite: 0,
            youtubeVideos: 0,
            youtubeSearch: 0,
            youtubeChannels: 0,
            youtubeComments: 0,
        };

        if (modelType === 'pro') {
            return Math.max(
                0,
                this.quotas['gemini-2.5-pro'].rpd - todayData.pro,
            );
        } else if (modelType === 'flash') {
            return Math.max(
                0,
                this.quotas['gemini-2.5-flash'].rpd - todayData.flash,
            );
        } else if (modelType === 'flash-lite' || modelType === 'flashLite') {
            return Math.max(
                0,
                this.quotas['gemini-2.5-flash-lite'].rpd -
                    (todayData.flashLite || 0),
            );
        } else if (
            modelType === 'YOUTUBE' ||
            modelType === 'youtube-data-api'
        ) {
            const totalYouTube =
                (todayData.youtubeVideos || 0) +
                (todayData.youtubeSearch || 0) +
                (todayData.youtubeChannels || 0) +
                (todayData.youtubeComments || 0);
            return Math.max(
                0,
                this.quotas['youtube-data-api'].rpd - totalYouTube,
            );
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
                existingData = JSON.parse(
                    fs.readFileSync(this.usageFilePath, 'utf8'),
                );
            }

            // 7일 이전 데이터 정리 (용량 절약)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

            // 키별 섹션 구조 초기화
            if (!existingData.keys) {
                existingData.keys = {};
            }
            if (!existingData.keys[this.currentApiKeyHash]) {
                existingData.keys[this.currentApiKeyHash] = {};
            }

            // 7일 이전 데이터 정리 (키별로)
            Object.keys(existingData.keys).forEach((keyHash) => {
                Object.keys(existingData.keys[keyHash]).forEach((date) => {
                    if (date < cutoffDate) {
                        delete existingData.keys[keyHash][date];
                    }
                });
            });

            // 기존 구조 데이터도 정리 (하위 호환성)
            Object.keys(existingData).forEach((key) => {
                if (key !== 'keys' && key < cutoffDate) {
                    delete existingData[key];
                }
            });

            // 현재 키의 오늘 데이터 업데이트
            const today = this.getTodayString();
            if (this.dailyUsage[today]) {
                existingData.keys[this.currentApiKeyHash][today] =
                    this.dailyUsage[today];
            }

            fs.writeFileSync(
                this.usageFilePath,
                JSON.stringify(existingData, null, 2),
                'utf8',
            );
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
        const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

        // KST 시간에서 시간 추출 (getUTCHours를 사용해야 올바른 KST 시간 추출)
        const kstHour = kstTime.getUTCHours();

        // 오후 4시 이전이면 전날로 계산 (Google API 할당량 기준)
        if (kstHour < 16) {
            kstTime.setUTCDate(kstTime.getUTCDate() - 1);
        }

        const resultDate = kstTime.toISOString().split('T')[0];
        // ServerLogger.info(`🗓️ [DEBUG] getTodayString 반환값: ${resultDate} (현재 KST 시간: ${kstHour}시, API키: ${this.currentApiKeyHash})`, null, 'USAGE');
        return resultDate;
    }

    /**
     * 사용량 통계 반환
     */
    getUsageStats() {
        const today = this.getTodayString();
        const todayData = this.dailyUsage[today] || {
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
        };

        return {
            date: today,
            pro: {
                used: todayData.pro,
                quota: this.quotas['gemini-2.5-pro'].rpd,
                remaining: this.getRemainingQuota('pro'),
                errors: todayData.proErrors || 0,
                percentage: Math.round(
                    (todayData.pro / this.quotas['gemini-2.5-pro'].rpd) * 100,
                ),
            },
            flash: {
                used: todayData.flash,
                quota: this.quotas['gemini-2.5-flash'].rpd,
                remaining: this.getRemainingQuota('flash'),
                errors: todayData.flashErrors || 0,
                percentage: Math.round(
                    (todayData.flash / this.quotas['gemini-2.5-flash'].rpd) *
                        100,
                ),
            },
            flashLite: {
                used: todayData.flashLite || 0,
                quota: this.quotas['gemini-2.5-flash-lite'].rpd,
                remaining: this.getRemainingQuota('flash-lite'),
                errors: todayData.flashLiteErrors || 0,
                percentage: Math.round(
                    ((todayData.flashLite || 0) /
                        this.quotas['gemini-2.5-flash-lite'].rpd) *
                        100,
                ),
            },
            youtube: {
                used: {
                    videos: todayData.youtubeVideos || 0,
                    search: todayData.youtubeSearch || 0,
                    channels: todayData.youtubeChannels || 0,
                    comments: todayData.youtubeComments || 0,
                    total:
                        (todayData.youtubeVideos || 0) +
                        (todayData.youtubeSearch || 0) +
                        (todayData.youtubeChannels || 0) +
                        (todayData.youtubeComments || 0),
                },
                quota: this.quotas['youtube-data-api'].rpd,
                remaining: this.getRemainingQuota('YOUTUBE'),
                errors: todayData.youtubeErrors || 0,
                percentage: Math.round(
                    (((todayData.youtubeVideos || 0) +
                        (todayData.youtubeSearch || 0) +
                        (todayData.youtubeChannels || 0) +
                        (todayData.youtubeComments || 0)) /
                        this.quotas['youtube-data-api'].rpd) *
                        100,
                ),
            },
            total: {
                used:
                    todayData.pro +
                    todayData.flash +
                    (todayData.flashLite || 0),
                quota:
                    this.quotas['gemini-2.5-pro'].rpd +
                    this.quotas['gemini-2.5-flash'].rpd +
                    this.quotas['gemini-2.5-flash-lite'].rpd,
                percentage: Math.round(
                    ((todayData.pro +
                        todayData.flash +
                        (todayData.flashLite || 0)) /
                        (this.quotas['gemini-2.5-pro'].rpd +
                            this.quotas['gemini-2.5-flash'].rpd +
                            this.quotas['gemini-2.5-flash-lite'].rpd)) *
                        100,
                ),
            },
            lastUpdated: todayData.lastUpdated,
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
            return 'gemini-2.5-pro'; // Pro 우선
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
            'RATE_LIMIT_EXCEEDED',
        ];

        const errorMessage = error.message || error.toString() || '';
        const errorCode = error.code || error.status || 0;

        return (
            quotaErrorPatterns.some((pattern) =>
                errorMessage.toLowerCase().includes(pattern.toLowerCase()),
            ) || errorCode === 429
        );
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
                stats.pro.percentage > 90
                    ? '⚠️ Pro 모델 할당량 90% 초과'
                    : null,
                stats.flash.percentage > 90
                    ? '⚠️ Flash 모델 할당량 90% 초과'
                    : null,
                stats.flashLite.percentage > 90
                    ? '⚠️ Flash-Lite 모델 할당량 90% 초과'
                    : null,
                stats.youtube.percentage > 90
                    ? '⚠️ YouTube API 할당량 90% 초과'
                    : null,
                !recommendedModel ? '🚨 모든 모델 할당량 소진' : null,
            ].filter(Boolean),
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
            currentQuotas: this.quotas,
        };
    }

    /**
     * 특정 API 키의 할당량 업데이트
     */
    updateApiKeyQuotas(apiKeyHash, quotas) {
        try {
            let quotaConfig = {};

            if (fs.existsSync(this.quotasFilePath)) {
                quotaConfig = JSON.parse(
                    fs.readFileSync(this.quotasFilePath, 'utf8'),
                );
            }

            if (!quotaConfig.api_keys) {
                quotaConfig.api_keys = {};
            }

            quotaConfig.api_keys[apiKeyHash] = {
                ...quotaConfig.api_keys[apiKeyHash],
                ...quotas,
            };

            fs.writeFileSync(
                this.quotasFilePath,
                JSON.stringify(quotaConfig, null, 2),
            );
            ServerLogger.info(
                `📊 API 키 할당량 업데이트: ${apiKeyHash}`,
                null,
                'USAGE',
            );

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
            ServerLogger.warn(
                `⚠️ 알 수 없는 API 엔드포인트: ${endpoint}`,
                null,
                'USAGE',
            );
            return this;
        }

        if (!config.enabled) {
            ServerLogger.info(
                `🚫 비활성화된 API 엔드포인트: ${endpoint}`,
                null,
                'USAGE',
            );
            return this;
        }

        // 설정된 비용만큼 추적
        for (let i = 0; i < config.cost; i++) {
            this.increment(this.getTrackingKey(endpoint), success);
        }

        ServerLogger.info(
            `📊 ${endpoint} API 추적: ${config.cost} quota (성공: ${success})`,
            null,
            'USAGE',
        );
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
            'youtube-captions': 'youtube-captions',
        };

        return mapping[endpoint] || endpoint;
    }

    /**
     * 편의 메서드들 (기존 코드 호환성)
     */
    trackYouTubeVideos(success = true) {
        return this.trackAPI('youtube-videos', success);
    }
    trackYouTubeSearch(success = true) {
        return this.trackAPI('youtube-search', success);
    }
    trackYouTubeChannels(success = true) {
        return this.trackAPI('youtube-channels', success);
    }
    trackYouTubeComments(success = true) {
        return this.trackAPI('youtube-comments', success);
    }
    trackYouTubePlaylists(success = true) {
        return this.trackAPI('youtube-playlists', success);
    }
    trackYouTubeCaptions(success = true) {
        return this.trackAPI('youtube-captions', success);
    }

    /**
     * API 엔드포인트 설정 관리
     */

    /**
     * API 엔드포인트 활성화/비활성화
     */
    enableAPI(endpoint, enabled = true) {
        if (this.apiEndpoints[endpoint]) {
            this.apiEndpoints[endpoint].enabled = enabled;
            ServerLogger.info(
                `🔄 ${endpoint} API ${enabled ? '활성화' : '비활성화'}`,
                null,
                'USAGE',
            );
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
            ServerLogger.info(
                `💰 ${endpoint} API 비용 변경: ${oldCost} → ${cost}`,
                null,
                'USAGE',
            );
        }
        return this;
    }

    /**
     * 새로운 API 엔드포인트 추가
     */
    addAPI(endpoint, config) {
        const { cost = 1, enabled = true, category = 'custom' } = config;
        this.apiEndpoints[endpoint] = { cost, enabled, category };
        ServerLogger.info(
            `➕ 새로운 API 추가: ${endpoint} (${cost} quota, ${category})`,
            null,
            'USAGE',
        );
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

        // 실시간으로 파일에서 데이터 읽기 (키별 섹션 지원)
        let todayData = {
            youtubeVideos: 0,
            youtubeSearch: 0,
            youtubeChannels: 0,
            youtubeComments: 0,
            youtubeErrors: 0,
        };
        let dataSource = 'default';

        try {
            if (fs.existsSync(this.usageFilePath)) {
                const data = JSON.parse(
                    fs.readFileSync(this.usageFilePath, 'utf8'),
                );

                // 키별 섹션에서 데이터 읽기
                if (
                    data.keys &&
                    data.keys[this.currentApiKeyHash] &&
                    data.keys[this.currentApiKeyHash][today]
                ) {
                    todayData = data.keys[this.currentApiKeyHash][today];
                    dataSource = 'key-section';
                    ServerLogger.info(
                        `📊 [DEBUG] 키별 섹션에서 데이터 로드 (${
                            this.currentApiKeyHash
                        }): ${JSON.stringify(todayData)}`,
                        null,
                        'USAGE',
                    );
                }
                // 기존 구조 지원 (하위 호환성)
                else if (data[today]) {
                    todayData = data[today];
                    dataSource = 'legacy';
                    ServerLogger.warn(
                        `⚠️ [DEBUG] 기존 구조에서 데이터 로드 (${
                            this.currentApiKeyHash
                        }): ${JSON.stringify(todayData)}`,
                        null,
                        'USAGE',
                    );
                } else {
                    ServerLogger.info(
                        `📊 [DEBUG] 파일에 데이터 없음 (${this.currentApiKeyHash}), 기본값 사용`,
                        null,
                        'USAGE',
                    );
                }
            }
        } catch (error) {
            // 파일 읽기 실패 시 메모리 데이터 사용
            todayData = this.dailyUsage[today] || todayData;
            dataSource = 'memory';
            ServerLogger.error(
                `🚨 [DEBUG] 파일 읽기 실패, 메모리 사용 (${this.currentApiKeyHash}): ${error.message}`,
                null,
                'USAGE',
            );
        }

        // 실제 사용량 데이터 반환
        const youtubeUsage = {
            videos: todayData?.youtubeVideos || 0,
            search: todayData?.youtubeSearch || 0,
            channels: todayData?.youtubeChannels || 0,
            comments: todayData?.youtubeComments || 0,
            errors: todayData?.youtubeErrors || 0,
        };

        youtubeUsage.total =
            youtubeUsage.videos +
            youtubeUsage.search +
            youtubeUsage.channels +
            youtubeUsage.comments;
        youtubeUsage.remaining = this.getRemainingQuota('YOUTUBE');
        youtubeUsage.quota = this.quotas['youtube-data-api'].rpd;

        return youtubeUsage;
    }

    /**
     * YouTube API 할당량 초과 여부 확인
     */
    isYouTubeQuotaExceeded() {
        return this.isQuotaExceeded('YOUTUBE');
    }
}

module.exports = UsageTracker;
