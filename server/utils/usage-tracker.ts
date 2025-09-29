import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ServerLogger } from './logger';
import { YOUTUBE_API_LIMITS, GEMINI_API_LIMITS } from '../config/api-constants';

// Type definitions
export type ModelType = 'pro' | 'flash' | 'flash-lite' | 'flashLite' | 'youtube-videos' | 'youtube-search' | 'youtube-channels' | 'youtube-comments' | 'youtube-playlists' | 'youtube-captions' | 'single';

export type ApiCategory = 'gemini' | 'YOUTUBE' | 'custom';

export interface ApiEndpointConfig {
    cost: number;
    enabled: boolean;
    category: ApiCategory;
}

export interface DailyUsageData {
    pro: number;
    flash: number;
    flashLite: number;
    proErrors: number;
    flashErrors: number;
    flashLiteErrors: number;
    youtubeVideos: number;
    youtubeSearch: number;
    youtubeChannels: number;
    youtubeComments: number;
    youtubeErrors: number;
    lastUpdated: string;
    _resetAt16?: boolean;
}

export interface QuotaConfig {
    rpd: number; // requests per day
}

export interface UsageStats {
    date: string;
    pro: ModelUsageStats;
    flash: ModelUsageStats;
    flashLite: ModelUsageStats;
    youtube: YouTubeUsageStats;
    total: TotalUsageStats;
    lastUpdated?: string;
}

export interface ModelUsageStats {
    used: number;
    quota: number;
    remaining: number;
    errors: number;
    percentage: number;
}

export interface YouTubeUsageStats {
    used: {
        videos: number;
        search: number;
        channels: number;
        comments: number;
        total: number;
    };
    quota: number;
    remaining: number;
    errors: number;
    percentage: number;
}

export interface TotalUsageStats {
    used: number;
    quota: number;
    percentage: number;
}

export interface YouTubeUsageDetails {
    videos: number;
    search: number;
    channels: number;
    comments: number;
    errors: number;
    total: number;
    remaining: number;
    quota: number;
}

export interface HealthCheckResult {
    status: 'healthy' | 'quota_exhausted';
    recommendedModel: string | null;
    stats: UsageStats;
    warnings: string[];
}

export interface ApiKeyInfo {
    hasApiKey: boolean;
    apiKeyHash: string | null;
    quotasFile: boolean;
    currentQuotas: Record<string, QuotaConfig>;
}

/**
 * Gemini API 사용량 추적 시스템
 */
class UsageTracker {
    private static instances = new Map<string, UsageTracker>(); // 싱글톤 인스턴스 저장
    private static fileWatcher: any = null; // 파일 감시자 저장
    private static maxInstances = 50; // 최대 인스턴스 수 제한

    private usageFilePath!: string;
    private apiKey!: string | null;
    private currentApiKeyHash!: string | null;
    private quotas!: Record<string, QuotaConfig>;
    private apiEndpoints!: Record<string, ApiEndpointConfig>;
    private dailyUsage!: Record<string, DailyUsageData>;

    constructor(apiKey: string | null = null) {
        const key = apiKey || this.getDefaultApiKey();

        // 이미 동일한 API 키로 인스턴스가 있으면 반환
        if (UsageTracker.instances.has(key)) {
            return UsageTracker.instances.get(key)!;
        }

        // 인스턴스 수 제한 - 오래된 것부터 정리
        if (UsageTracker.instances.size >= UsageTracker.maxInstances) {
            const oldestKey = UsageTracker.instances.keys().next().value;
            if (oldestKey) {
                const oldestInstance = UsageTracker.instances.get(oldestKey);
                if (oldestInstance) {
                    oldestInstance.destroy();
                }
                UsageTracker.instances.delete(oldestKey);
            }
        }

        this.usageFilePath = path.join(
            __dirname,
            '../../config/gemini-usage.json',
        );

        this.apiKey = apiKey || this.getDefaultApiKey();
        this.currentApiKeyHash = this.apiKey
            ? this.hashApiKey(this.apiKey)
            : null;

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
     */
    static getDefaultApiKey(): string {
        try {
            // 동기적으로 첫 번째 키만 조회 (비동기 초기화 없이)
            const apiKeysData = require('../data/api-keys.json');

            // 방어적 프로그래밍: apiKeysData가 배열인지 확인
            if (!Array.isArray(apiKeysData)) {
                throw new Error('API 키 데이터 형식이 올바르지 않습니다');
            }

            const activeKeys = apiKeysData.filter((key: any) => key && key.status === 'active');
            if (activeKeys.length > 0) {
                return activeKeys[0].apiKey;
            }
        } catch (error: any) {
            // api-keys.json 파일이 없거나 읽기 실패
            ServerLogger.warn('API 키 파일 로드 실패:', error.message, 'USAGE-TRACKER');
        }
        throw new Error('활성 API 키를 찾을 수 없습니다. ApiKeyManager에 키를 추가하세요.');
    }

    /**
     * 인스턴스 메서드로 기본 API 키 조회
     */
    getDefaultApiKey(): string {
        return UsageTracker.getDefaultApiKey();
    }

    /**
     * 싱글톤 인스턴스 생성/반환
     */
    static getInstance(apiKey: string | null = null): UsageTracker {
        const key = apiKey || UsageTracker.getDefaultApiKey();

        if (!UsageTracker.instances.has(key)) {
            new UsageTracker(key); // constructor에서 instances에 저장됨
        }

        return UsageTracker.instances.get(key)!;
    }

    /**
     * API 엔드포인트 설정 초기화
     */
    private initializeApiEndpoints(): void {
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
    }

    /**
     * API 키 해시 생성 (보안을 위해)
     */
    private hashApiKey(apiKey: string): string | null {
        if (!apiKey) return null;

        // Convert to string if it's an object (defensive programming)
        const keyString = typeof apiKey === 'string' ? apiKey : String(apiKey);

        return crypto
            .createHash('sha256')
            .update(keyString)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * 환경변수 기반 할당량 로드 (실무 표준)
     */
    private loadQuotasForCurrentApiKey(): Record<string, QuotaConfig> {
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
        } catch (error: any) {
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
     * 오늘 사용량 로드
     */
    private loadTodayUsage(): Record<string, DailyUsageData> {
        try {
            if (fs.existsSync(this.usageFilePath)) {
                const data = JSON.parse(
                    fs.readFileSync(this.usageFilePath, 'utf8'),
                );
                const today = this.getTodayString();

                // 키별 섹션 구조 확인
                if (
                    data.keys &&
                    data.keys[this.currentApiKeyHash!] &&
                    data.keys[this.currentApiKeyHash!][today]
                ) {
                    const keyData = data.keys[this.currentApiKeyHash!][today];

                    // 기존 구조와 호환되도록 변환
                    const compatibleData: Record<string, DailyUsageData> = {};
                    compatibleData[today] = keyData;
                    return compatibleData;
                }

                // 오늘 데이터가 없으면 전날 데이터 이어받기
                const yesterday = this.getYesterdayString();
                if (
                    data.keys &&
                    data.keys[this.currentApiKeyHash!] &&
                    data.keys[this.currentApiKeyHash!][yesterday]
                ) {
                    const yesterdayData = data.keys[this.currentApiKeyHash!][yesterday];
                    ServerLogger.info(
                        `🔄 자정 전날 데이터 이어받기: ${yesterday} → ${today}`,
                        null,
                        'USAGE',
                    );

                    // 전날 데이터를 오늘로 복사 (lastUpdated는 현재 시간으로)
                    const inheritedData = {
                        ...yesterdayData,
                        lastUpdated: new Date().toISOString()
                    };

                    const compatibleData: Record<string, DailyUsageData> = {};
                    compatibleData[today] = inheritedData;

                    // 파일에도 즉시 저장
                    this.saveInheritedData(today, inheritedData);

                    return compatibleData;
                }

                // 기존 구조 (하위 호환성)
                if (data[today]) {
                    return data;
                }
            }
        } catch (error: any) {
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
    private initializeTodayUsage(): Record<string, DailyUsageData> {
        const today = this.getTodayString();
        const usage: Record<string, DailyUsageData> = {
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

        return usage;
    }

    /**
     * 사용량 증가
     */
    increment(modelType: ModelType, success: boolean = true): void {
        const today = this.getTodayString();

        // 오후 4시 리셋 체크 (Google API 할당량 리셋 시간)
        this.checkAndResetQuota();

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
    getRemainingQuota(modelType: ModelType | 'YOUTUBE' | 'youtube-data-api'): number {
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
    isQuotaExceeded(modelType: ModelType | 'YOUTUBE' | 'youtube-data-api'): boolean {
        return this.getRemainingQuota(modelType) <= 0;
    }

    /**
     * 오늘 사용량 저장
     */
    private saveTodayUsage(): void {
        try {
            // config 디렉토리 생성 (없는 경우)
            const configDir = path.dirname(this.usageFilePath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // 이전 데이터 유지하면서 오늘 데이터만 업데이트
            let existingData: any = {};
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
            if (!existingData.keys[this.currentApiKeyHash!]) {
                existingData.keys[this.currentApiKeyHash!] = {};
            }

            // 7일 이전 데이터 정리 (키별로)
            Object.keys(existingData.keys).forEach((keyHash: string) => {
                Object.keys(existingData.keys[keyHash]).forEach((date: string) => {
                    if (date < cutoffDate) {
                        delete existingData.keys[keyHash][date];
                    }
                });
            });

            // 기존 구조 데이터도 정리 (하위 호환성)
            Object.keys(existingData).forEach((key: string) => {
                if (key !== 'keys' && key < cutoffDate) {
                    delete existingData[key];
                }
            });

            // 현재 키의 오늘 데이터 업데이트
            const today = this.getTodayString();
            if (this.dailyUsage[today]) {
                existingData.keys[this.currentApiKeyHash!][today] =
                    this.dailyUsage[today];
            }

            fs.writeFileSync(
                this.usageFilePath,
                JSON.stringify(existingData, null, 2),
                'utf8',
            );
        } catch (error: any) {
            ServerLogger.error('사용량 파일 저장 실패:', error, 'USAGE');
        }
    }

    /**
     * 실제 날짜 기준 문자열 반환 (YYYY-MM-DD)
     * 자정(00:00)에 전날 데이터 이어받기, 오후 4시(16:00)에 0으로 리셋
     */
    getTodayString(): string {
        const now = new Date();
        // 한국시간으로 변환 (UTC+9)
        const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        return kstTime.toISOString().split('T')[0];
    }

    /**
     * 전날 날짜 문자열 반환 (YYYY-MM-DD)
     */
    getYesterdayString(): string {
        const now = new Date();
        // 한국시간으로 변환 (UTC+9)
        const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        // 하루 빼기
        kstTime.setUTCDate(kstTime.getUTCDate() - 1);
        return kstTime.toISOString().split('T')[0];
    }

    /**
     * 전날 데이터를 오늘로 저장
     */
    private saveInheritedData(today: string, inheritedData: DailyUsageData): void {
        try {
            let existingData: any = { keys: {} };
            if (fs.existsSync(this.usageFilePath)) {
                existingData = JSON.parse(
                    fs.readFileSync(this.usageFilePath, 'utf8'),
                );
            }

            // 키별 섹션 구조 생성
            if (!existingData.keys) {
                existingData.keys = {};
            }
            if (!existingData.keys[this.currentApiKeyHash!]) {
                existingData.keys[this.currentApiKeyHash!] = {};
            }

            // 오늘 데이터 저장
            existingData.keys[this.currentApiKeyHash!][today] = inheritedData;

            fs.writeFileSync(
                this.usageFilePath,
                JSON.stringify(existingData, null, 2),
                'utf8',
            );

            ServerLogger.info(
                `💾 전날 데이터 이어받기 저장 완료: ${today}`,
                null,
                'USAGE',
            );
        } catch (error: any) {
            ServerLogger.error('전날 데이터 저장 실패:', error, 'USAGE');
        }
    }

    /**
     * 오후 4시 할당량 리셋 체크 및 실행
     */
    private checkAndResetQuota(): void {
        const now = new Date();
        const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const kstHour = kstTime.getUTCHours();

        // 오후 4시 이후인지 체크
        if (kstHour >= 16) {
            const today = this.getTodayString();

            // 오늘 데이터가 있고, 아직 리셋되지 않았는지 확인
            if (this.dailyUsage[today] && !this.dailyUsage[today]._resetAt16) {
                ServerLogger.info(
                    `🔄 오후 4시 할당량 리셋 실행: ${today}`,
                    null,
                    'USAGE',
                );

                // 모든 사용량을 0으로 리셋 (에러 카운트는 유지)
                const resetData: DailyUsageData = {
                    pro: 0,
                    flash: 0,
                    flashLite: 0,
                    proErrors: this.dailyUsage[today].proErrors || 0,
                    flashErrors: this.dailyUsage[today].flashErrors || 0,
                    flashLiteErrors: this.dailyUsage[today].flashLiteErrors || 0,
                    youtubeVideos: 0,
                    youtubeSearch: 0,
                    youtubeChannels: 0,
                    youtubeComments: 0,
                    youtubeErrors: this.dailyUsage[today].youtubeErrors || 0,
                    lastUpdated: new Date().toISOString(),
                    _resetAt16: true  // 리셋 완료 표시
                };

                this.dailyUsage[today] = resetData;
                this.saveTodayUsage();

                ServerLogger.info(
                    `✅ 할당량 리셋 완료 - 모든 사용량 0으로 초기화`,
                    null,
                    'USAGE',
                );
            }
        }
    }

    /**
     * 사용량 통계 반환
     */
    getUsageStats(): UsageStats {
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
            lastUpdated: new Date().toISOString(),
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
    getRecommendedModel(): string | null {
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
    isQuotaExceededError(error: any): boolean {
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
    healthCheck(): HealthCheckResult {
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
            ].filter(Boolean) as string[],
        };
    }

    /**
     * API 키 정보 조회 (디버그용)
     */
    getApiKeyInfo(): ApiKeyInfo {
        return {
            hasApiKey: !!this.apiKey,
            apiKeyHash: this.currentApiKeyHash,
            quotasFile: false, // TypeScript에서는 사용하지 않음
            currentQuotas: this.quotas,
        };
    }

    /**
     * 통합 API 추적 시스템
     */

    /**
     * 설정 기반 API 호출 추적
     */
    trackAPI(endpoint: string, success: boolean = true): UsageTracker {
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
            this.increment(this.getTrackingKey(endpoint) as ModelType, success);
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
    private getTrackingKey(endpoint: string): string {
        const mapping: Record<string, string> = {
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
    trackYouTubeVideos(success: boolean = true): UsageTracker {
        return this.trackAPI('youtube-videos', success);
    }

    trackYouTubeSearch(success: boolean = true): UsageTracker {
        return this.trackAPI('youtube-search', success);
    }

    trackYouTubeChannels(success: boolean = true): UsageTracker {
        return this.trackAPI('youtube-channels', success);
    }

    trackYouTubeComments(success: boolean = true): UsageTracker {
        return this.trackAPI('youtube-comments', success);
    }

    trackYouTubePlaylists(success: boolean = true): UsageTracker {
        return this.trackAPI('youtube-playlists', success);
    }

    trackYouTubeCaptions(success: boolean = true): UsageTracker {
        return this.trackAPI('youtube-captions', success);
    }

    /**
     * API 엔드포인트 설정 관리
     */

    /**
     * API 엔드포인트 활성화/비활성화
     */
    enableAPI(endpoint: string, enabled: boolean = true): UsageTracker {
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
    setAPICost(endpoint: string, cost: number): UsageTracker {
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
    addAPI(endpoint: string, config: Partial<ApiEndpointConfig>): UsageTracker {
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
    getAPIConfig(endpoint: string): ApiEndpointConfig | null {
        return this.apiEndpoints[endpoint] || null;
    }

    /**
     * 모든 API 엔드포인트 설정 조회
     */
    getAllAPIConfigs(): Record<string, ApiEndpointConfig> {
        return { ...this.apiEndpoints };
    }

    /**
     * 카테고리별 API 엔드포인트 조회
     */
    getAPIsByCategory(category: ApiCategory): Record<string, ApiEndpointConfig> {
        return Object.entries(this.apiEndpoints)
            .filter(([, config]) => config.category === category)
            .reduce((acc, [endpoint, config]) => {
                acc[endpoint] = config;
                return acc;
            }, {} as Record<string, ApiEndpointConfig>);
    }

    /**
     * YouTube API 전체 사용량 조회
     */
    getYouTubeUsage(): YouTubeUsageDetails {
        const today = this.getTodayString();

        // 실시간으로 파일에서 데이터 읽기 (키별 섹션 지원)
        let todayData: DailyUsageData = {
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

        try {
            if (fs.existsSync(this.usageFilePath)) {
                const data = JSON.parse(
                    fs.readFileSync(this.usageFilePath, 'utf8'),
                );

                // 키별 섹션에서 데이터 읽기
                if (
                    data.keys &&
                    data.keys[this.currentApiKeyHash!] &&
                    data.keys[this.currentApiKeyHash!][today]
                ) {
                    todayData = data.keys[this.currentApiKeyHash!][today];
                }
                // 기존 구조 지원 (하위 호환성)
                else if (data[today]) {
                    todayData = data[today];
                }
            }
        } catch (error: any) {
            // 파일 읽기 실패 시 메모리 데이터 사용
            todayData = this.dailyUsage[today] || todayData;
        }

        // 실제 사용량 데이터 반환
        const youtubeUsage: YouTubeUsageDetails = {
            videos: todayData?.youtubeVideos || 0,
            search: todayData?.youtubeSearch || 0,
            channels: todayData?.youtubeChannels || 0,
            comments: todayData?.youtubeComments || 0,
            errors: todayData?.youtubeErrors || 0,
            total: 0,
            remaining: 0,
            quota: 0,
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
    isYouTubeQuotaExceeded(): boolean {
        return this.isQuotaExceeded('YOUTUBE');
    }

    /**
     * 모든 캐시 클리어 (API 키 변경 시 사용)
     */
    static clearAllCaches(): boolean {
        try {
            // 1. require 캐시 클리어
            const apiKeysPath = require.resolve('../data/api-keys.json');
            delete require.cache[apiKeysPath];

            // 2. 싱글톤 인스턴스 클리어
            UsageTracker.instances.clear();

            // 3. ApiKeyManager 캐시 클리어
            const apiKeyManager = require('../services/ApiKeyManager');
            apiKeyManager.clearCacheAndReinitialize();

            // 4. 모든 등록된 서비스의 API 키 캐시 클리어
            const serviceRegistry = require('./service-registry');
            const result = serviceRegistry.clearAllServiceCaches();

            ServerLogger.info(`🔄 API 키 캐시 완전 클리어 완료 - UsageTracker + ApiKeyManager + ${result.cleared}개 서비스`, null, 'USAGE-TRACKER');
            return true;
        } catch (error: any) {
            ServerLogger.error('❌ 캐시 클리어 실패:', error, 'USAGE-TRACKER');
            return false;
        }
    }

    /**
     * API 키 파일 자동 감지 시스템 시작
     */
    static startFileWatcher(): void {
        if (UsageTracker.fileWatcher) {
            return; // 이미 실행 중
        }

        try {
            const apiKeysPath = path.join(__dirname, '../data/api-keys.json');
            let reloadTimeout: NodeJS.Timeout;

            // 파일 변경 감지 (디바운싱 적용)
            UsageTracker.fileWatcher = fs.watchFile(apiKeysPath, (curr, prev) => {
                // 파일이 실제로 변경되었는지 확인
                if (curr.mtime !== prev.mtime) {
                    clearTimeout(reloadTimeout);

                    // 1000ms 디바운싱 (임시 저장 등 무시, 안정성 향상)
                    reloadTimeout = setTimeout(() => {
                        ServerLogger.info('📁 API 키 파일 변경 감지 - 자동 리로드 시작', null, 'API-WATCHER');

                        const success = UsageTracker.clearAllCaches();
                        if (success) {
                            ServerLogger.info('✅ API 키 자동 리로드 완료', null, 'API-WATCHER');
                        } else {
                            ServerLogger.error('❌ API 키 자동 리로드 실패', null, 'API-WATCHER');
                        }
                    }, 1000);
                }
            });

            ServerLogger.info('👀 API 키 파일 자동 감지 시스템 시작', { path: apiKeysPath }, 'API-WATCHER');
        } catch (error: any) {
            ServerLogger.error('❌ 파일 감시자 시작 실패:', error, 'API-WATCHER');
        }
    }

    /**
     * API 키 파일 감지 시스템 중지
     */
    static stopFileWatcher(): void {
        if (UsageTracker.fileWatcher) {
            const apiKeysPath = path.join(__dirname, '../data/api-keys.json');
            fs.unwatchFile(apiKeysPath);
            UsageTracker.fileWatcher = null;
            ServerLogger.info('🛑 API 키 파일 자동 감지 시스템 중지', null, 'API-WATCHER');
        }
    }

    /**
     * 수동 캐시 리로드 (디버깅/강제 갱신용)
     */
    static forceReload(): boolean {
        ServerLogger.info('🔄 수동 API 키 캐시 리로드 요청', null, 'USAGE-TRACKER');
        return UsageTracker.clearAllCaches();
    }

    /**
     * 특정 API 키의 사용량 파일 삭제
     */
    static deleteUsageFile(apiKey: string): boolean {
        if (!apiKey) {
            ServerLogger.warn('API 키가 제공되지 않아 사용량 파일을 삭제할 수 없습니다', null, 'USAGE-TRACKER');
            return false;
        }

        try {
            // API 키 해시 생성
            const hash = crypto.createHash('sha256')
                .update(apiKey)
                .digest('hex')
                .substring(0, 16);

            // 사용량 파일 경로들
            const dataDir = path.join(__dirname, '../data/usage');
            const usageFilePath = path.join(dataDir, `usage-${hash}.json`);

            // 파일 존재 확인 후 삭제
            if (fs.existsSync(usageFilePath)) {
                fs.unlinkSync(usageFilePath);
                ServerLogger.info(`🗑️ 사용량 파일 삭제됨: usage-${hash}.json`, null, 'USAGE-TRACKER');

                // 메모리 캐시에서도 제거
                UsageTracker.instances.delete(apiKey);

                return true;
            } else {
                ServerLogger.info(`📁 삭제할 사용량 파일이 없음: usage-${hash}.json`, null, 'USAGE-TRACKER');
                return true; // 파일이 없어도 성공으로 간주
            }
        } catch (error: any) {
            ServerLogger.error('사용량 파일 삭제 중 오류 발생', error, 'USAGE-TRACKER');
            return false;
        }
    }

    /**
     * 인스턴스 메모리 해제
     */
    destroy(): void {
        try {
            // 파일 감시자 정리
            if (UsageTracker.fileWatcher) {
                const apiKeysPath = path.join(__dirname, '../data/api-keys.json');
                fs.unwatchFile(apiKeysPath);
                UsageTracker.fileWatcher = null;
            }

            // 인스턴스에서 제거
            const instanceEntries = Array.from(UsageTracker.instances.entries());
            for (const [key, instance] of instanceEntries) {
                if (instance === this) {
                    UsageTracker.instances.delete(key);
                    break;
                }
            }

            ServerLogger.info('🧹 UsageTracker 인스턴스 메모리 정리 완료', null, 'USAGE-TRACKER');
        } catch (error: any) {
            ServerLogger.error('UsageTracker 정리 중 오류', error, 'USAGE-TRACKER');
        }
    }

    /**
     * 모든 인스턴스 정리
     */
    static destroyAll(): void {
        try {
            // 파일 감시자 정리
            if (UsageTracker.fileWatcher) {
                const apiKeysPath = path.join(__dirname, '../data/api-keys.json');
                fs.unwatchFile(apiKeysPath);
                UsageTracker.fileWatcher = null;
            }

            // 모든 인스턴스 정리
            const instanceValues = Array.from(UsageTracker.instances.values());
            for (const instance of instanceValues) {
                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }
            }

            UsageTracker.instances.clear();
            ServerLogger.info('🧹 모든 UsageTracker 인스턴스 정리 완료', null, 'USAGE-TRACKER');
        } catch (error: any) {
            ServerLogger.error('UsageTracker 전체 정리 중 오류', error, 'USAGE-TRACKER');
        }
    }
}

export { UsageTracker };
export default UsageTracker;

// CommonJS 호환성을 위한 module.exports
module.exports = UsageTracker;
module.exports.default = UsageTracker;
module.exports.UsageTracker = UsageTracker;