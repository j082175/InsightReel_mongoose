import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';
import { ServerLogger } from './logger';
import { AI } from '../config/constants';
import { getInstance as getApiKeyManager, ApiKey } from '../services/ApiKeyManager';

import UsageTracker from './usage-tracker';

// Type definitions for the unified Gemini manager
export type FallbackMode = 'multi-key' | 'model-priority' | 'single-model';
export type ModelType = 'pro' | 'flash' | 'flash-lite' | 'single';
export type FallbackStrategy = 'pro' | 'flash' | 'multi-pro';

export interface GeminiManagerOptions {
    retryAttempts?: number;
    retryDelay?: number;
    strategy?: FallbackStrategy;
    thinkingBudget?: number;
}

export interface ApiKeyInfo {
    key: string;
    name: string;
    index: number;
}

export interface ModelStatus {
    available: boolean;
    lastError: string | null;
    quotaExhausted: boolean;
    lastQuotaError: string | null;
    disabledUntil: number | null;
}

export interface ContentGenerationResult {
    success: boolean;
    response?: string;
    model?: string;
    timestamp?: string;
    duration?: number;
    error?: string;
}

export interface ImageContent {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

export interface QueryResult {
    text: string;
    model: string;
    timestamp: string;
}

export interface HealthCheckResult {
    strategy: string;
    currentKey: number;
    keys: Record<string, {
        status: string;
        error?: string;
        usage: any;
    }>;
    timestamp: string;
}

export interface UsageStats {
    strategy?: string;
    currentKey?: number;
    totalKeys?: number;
    keys?: Record<string, any>;
    pro?: { used: number; limit: number };
    flash?: { used: number; limit: number };
    flashLite?: { used: number; limit: number };
}

/**
 * 통합 Gemini API 관리자 (싱글톤)
 * 3가지 폴백 모드 지원:
 * - multi-key: 여러 API 키 간 전환 폴백
 * - model-priority: 단일 키에서 모델 우선순위 폴백 (pro → flash → flash-lite)
 * - single-model: 단일 모델 사용
 */
class UnifiedGeminiManager {
    private static instance: UnifiedGeminiManager | null = null;

    // API 타임아웃 상수 - 제한시간 해제
    public static readonly VIDEO_ANALYSIS_DELAY = 5000; // 영상 분석 간 딜레이: 5초

    // Instance properties
    private fallbackMode!: FallbackMode;
    private enableFallback!: boolean;
    private retryAttempts!: number;
    private retryDelay!: number;
    private initPromise!: Promise<void>;

    // Multi-key mode properties
    private fallbackStrategy?: FallbackStrategy;
    private apiKeys!: ApiKeyInfo[];
    private usageTrackers!: Map<string, any>;
    private genAIInstances!: Map<string, GoogleGenerativeAI>;
    private models!: Map<string, GenerativeModel>;
    private currentKeyIndex!: number;

    // Model-priority mode properties
    private singleApiKey?: string;
    private modelPriority!: ModelType[];
    private autoRecovery?: boolean;
    private quotaRecoveryInterval?: number;
    private overloadRecoveryInterval!: number;
    private modelStatus!: Record<string, ModelStatus>;
    private usageTracker?: any;

    // Single-model mode properties
    private singleModel!: string;
    private singleModelInstance?: GenerativeModel;

    /**
     * 모델별 적절한 타임아웃 반환 (제한시간 없음)
     */
    public static getTimeoutForModel(modelName: string): number | null {
        // 타임아웃 제한 해제 - 자연스러운 처리 시간 허용
        return null;
    }

    constructor(options: GeminiManagerOptions = {}) {
        // 싱글톤 패턴: 이미 인스턴스가 있으면 반환
        if (UnifiedGeminiManager.instance) {
            return UnifiedGeminiManager.instance;
        }

        // 폴백 모드 결정 (multi-key 또는 model-priority)
        this.fallbackMode = (process.env.GEMINI_FALLBACK_MODE as FallbackMode) || 'multi-key';
        this.enableFallback = process.env.ENABLE_GEMINI_FALLBACK !== 'false';
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 2000;

        // 비동기 초기화를 위해 init 메서드 호출 필요
        this.initPromise = this.init(options);

        // 서비스 레지스트리에 등록 - 동적으로 로드하여 순환 참조 방지
        import('./service-registry').then(module => {
            const serviceRegistry = module.default;
            serviceRegistry.register(this);
        }).catch(error => {
            ServerLogger.warn('서비스 레지스트리 등록 실패:', error);
        });

        ServerLogger.success(`🤖 통합 Gemini 관리자 초기화 완료 (모드: ${this.fallbackMode})`, null, 'UNIFIED');

        // 싱글톤 인스턴스 저장
        UnifiedGeminiManager.instance = this;
    }

    /**
     * 싱글톤 인스턴스 반환
     */
    public static getInstance(options: GeminiManagerOptions = {}): UnifiedGeminiManager {
        if (!UnifiedGeminiManager.instance) {
            new UnifiedGeminiManager(options);
        }
        return UnifiedGeminiManager.instance!;
    }

    /**
     * 비동기 초기화 메서드
     */
    private async init(options: GeminiManagerOptions): Promise<void> {
        try {
            if (this.fallbackMode === 'multi-key') {
                await this.initMultiKeyMode(options);
            } else if (this.fallbackMode === 'model-priority') {
                await this.initModelPriorityMode(options);
            } else if (this.fallbackMode === 'single-model') {
                await this.initSingleModelMode(options);
            } else {
                throw new Error(`지원하지 않는 폴백 모드입니다: ${this.fallbackMode}`);
            }
        } catch (error: any) {
            ServerLogger.error(`❌ 통합 Gemini 관리자 초기화 실패: ${error.message}`, null, 'UNIFIED');
            throw error;
        }
    }

    /**
     * Multi-Key 모드 초기화 (기존 방식)
     */
    private async initMultiKeyMode(options: GeminiManagerOptions): Promise<void> {
        this.fallbackStrategy = options.strategy || (process.env.GEMINI_FALLBACK_STRATEGY as FallbackStrategy) || 'flash';

        // API 키들 로드
        this.apiKeys = await this.loadAllApiKeys();

        if (this.apiKeys.length === 0) {
            throw new Error('활성화된 API 키가 없습니다. ApiKeyManager에 키를 추가해주세요.');
        }

        // 각 API 키별 사용량 추적기 및 모델 인스턴스
        this.usageTrackers = new Map();
        this.genAIInstances = new Map();
        this.models = new Map();

        this.apiKeys.forEach((keyInfo, index) => {
            const trackerId = `key_${index}`;
            this.usageTrackers!.set(trackerId, UsageTracker.getInstance());

            const genAI = new GoogleGenerativeAI(keyInfo.key);
            this.genAIInstances!.set(trackerId, genAI);

            // 각 키별로 Pro/Flash/Flash-lite 모델 인스턴스 생성
            this.models!.set(`${trackerId}_pro`, genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }));
            this.models!.set(`${trackerId}_flash`, genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }));
            this.models!.set(`${trackerId}_flash_lite`, genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }));
        });

        // 현재 활성 API 키 인덱스
        this.currentKeyIndex = 0;
    }

    /**
     * Model-Priority 모드 초기화 (신규 방식)
     */
    private async initModelPriorityMode(options: GeminiManagerOptions): Promise<void> {
        // ApiKeyManager에서 API 키 로드
        const apiKeyManager = getApiKeyManager();
        await apiKeyManager.initialize();
        const activeApiKeys: ApiKey[] = await apiKeyManager.getActiveApiKeys();
        const activeKeys: string[] = activeApiKeys.map(key => key.apiKey);

        if (activeKeys.length === 0) {
            throw new Error('활성화된 API 키가 없습니다. ApiKeyManager에 키를 추가해주세요.');
        }

        // 첫 번째 활성 키를 사용
        this.singleApiKey = activeKeys[0];

        // 모델 우선순위 설정
        this.modelPriority = (process.env.GEMINI_MODEL_PRIORITY || 'pro,flash,flash-lite').split(',') as ModelType[];
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
        this.usageTracker = UsageTracker.getInstance();

        // 자동 복구 타이머 시작
        if (this.autoRecovery) {
            this.startAutoRecovery();
        }
    }

    /**
     * Single-Model 모드 초기화 (신규 방식)
     */
    private async initSingleModelMode(options: GeminiManagerOptions): Promise<void> {
        // ApiKeyManager에서 API 키 로드
        const apiKeyManager = getApiKeyManager();
        await apiKeyManager.initialize();
        const activeApiKeys: ApiKey[] = await apiKeyManager.getActiveApiKeys();
        const activeKeys: string[] = activeApiKeys.map(key => key.apiKey);

        if (activeKeys.length === 0) {
            throw new Error('활성화된 API 키가 없습니다. ApiKeyManager에 키를 추가해주세요.');
        }

        this.singleApiKey = activeKeys[0];

        // 단일 모델 설정
        this.singleModel = process.env.GEMINI_SINGLE_MODEL || 'gemini-2.5-pro-lite';
        this.retryAttempts = options.retryAttempts || 5; // 단일 모델이므로 재시도 횟수 증가

        // 단일 API 키로 단일 모델 인스턴스 생성
        const genAI = new GoogleGenerativeAI(this.singleApiKey);
        this.singleModelInstance = genAI.getGenerativeModel({ model: this.singleModel });

        // 사용량 추적기
        this.usageTracker = UsageTracker.getInstance();

        ServerLogger.info(`📍 Single-Model 설정: ${this.singleModel}`, null, 'UNIFIED');
    }

    /**
     * 환경 변수에서 모든 API 키 로드 (통합된 로직)
     */
    private async loadAllApiKeys(): Promise<ApiKeyInfo[]> {
        // ApiKeyManager에서 모든 API 키 로드
        const apiKeyManager = getApiKeyManager();
        await apiKeyManager.initialize();
        const activeApiKeys: ApiKey[] = await apiKeyManager.getActiveApiKeys();
        const activeKeys: string[] = activeApiKeys.map(key => key.apiKey);

        const keys: ApiKeyInfo[] = activeKeys.map((key, index) => ({
            key: key,
            name: `managed_key_${index}`,
            index: index
        }));

        ServerLogger.info(`📊 ApiKeyManager에서 ${keys.length}개 API 키 로드됨`, null, 'UNIFIED');
        return keys;
    }

    /**
     * 메인 콘텐츠 생성 메소드 - 폴백 모드에 따라 분기
     */
    public async generateContent(prompt: string, imageBase64: string | null = null, options: GeminiManagerOptions = {}): Promise<ContentGenerationResult> {
        ServerLogger.info('🔥 generateContent ENTRY DEBUG - 메서드 호출됨');
        try {
            let result: any;

            // 🎯 조건부 모델 선택: 특정 모델 지정 시 직접 사용
            const modelType = options.strategy as ModelType;
            if (modelType && ['pro', 'flash', 'flash-lite'].includes(modelType)) {
                result = await this.generateContentWithSpecificModel(modelType, prompt, imageBase64, options);
            } else if (this.fallbackMode === 'multi-key') {
                result = await this.generateContentMultiKey(prompt, imageBase64, options);
            } else if (this.fallbackMode === 'model-priority') {
                result = await this.generateContentModelPriority(prompt, imageBase64, options);
            } else if (this.fallbackMode === 'single-model') {
                // Single-model은 다중 이미지만 지원
                const imageContents: ImageContent[] = imageBase64 ? [{
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: imageBase64
                    }
                }] : [];
                result = await this.generateContentWithImagesSingleModel(prompt, imageContents, options);
            }

            // GeminiAnalyzer가 기대하는 형식으로 변환
            ServerLogger.info('🔍 generateContent DEBUG - 변환 전 result 구조:', {
                hasResult: !!result,
                resultType: typeof result,
                hasText: !!(result && result.text),
                hasResponse: !!(result && result.response),
                resultKeys: result ? Object.keys(result) : [],
                resultPreview: result ? JSON.stringify(result, null, 2).substring(0, 500) : 'null'
            });

            if (result && result.text) {
                return {
                    success: true,
                    response: result.text,
                    model: result.model,
                    timestamp: result.timestamp,
                    duration: result.duration
                };
            } else {
                return {
                    success: false,
                    error: 'Gemini 응답이 비어있습니다',
                    response: undefined
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                response: undefined
            };
        }
    }

    /**
     * 특정 모델로 직접 콘텐츠 생성
     */
    private async generateContentWithSpecificModel(modelType: ModelType, prompt: string, imageBase64: string | null = null, options: GeminiManagerOptions = {}): Promise<any> {
        const startTime = Date.now();

        // 할당량 폴백 순서 정의
        const fallbackOrder: Record<ModelType, ModelType[]> = {
            'pro': ['pro', 'flash', 'flash-lite'],
            'flash': ['flash', 'flash-lite'],
            'flash-lite': ['flash-lite'],
            'single': ['single']
        };

        const modelsToTry = fallbackOrder[modelType] || [modelType];
        let lastError: Error | null = null;

        for (const currentModel of modelsToTry) {
            try {
                // 개발 환경에서만 개별 분석 로그 출력
                if (process.env.NODE_ENV === 'development') {
                    ServerLogger.debug(`🎯 모델 시도: ${currentModel} (원본: ${modelType})`, null, 'UNIFIED');
                }

                // API 키 선택 (폴백 모드에 따라 다른 키 사용)
                let apiKey: string | undefined;
                if (this.fallbackMode === 'model-priority' || this.fallbackMode === 'single-model') {
                    apiKey = this.singleApiKey;
                } else {
                    apiKey = this.apiKeys?.[0]?.key;
                }

                if (!apiKey) {
                    throw new Error('API 키를 찾을 수 없습니다. 초기화가 완료되지 않았을 수 있습니다.');
                }

                const genAI = new GoogleGenerativeAI(apiKey);

                // 모델명 매핑
                const modelMap: Record<string, string> = {
                    'pro': 'gemini-2.5-pro',
                    'flash': 'gemini-2.5-flash',
                    'flash-lite': 'gemini-2.5-flash-lite'
                };

                const modelName = modelMap[currentModel] || currentModel;
                const model = genAI.getGenerativeModel({ model: modelName });

                // 요청 데이터 구성
                const requestData = imageBase64 ? [
                    prompt,
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: imageBase64
                        }
                    }
                ] : prompt;

                // Generation Config 설정
                const generationConfig: any = {
                    maxOutputTokens: 8192,
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40
                };

                // Deep Thinking 설정 (Flash 계열 모델만)
                const thinkingBudget = options.thinkingBudget ??
                                      (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);

                if (thinkingBudget !== undefined && modelName.includes('flash')) {
                    generationConfig.thinkingBudget = thinkingBudget;
                }

                // 타임아웃 설정 - null이면 제외
                const requestOptions = { ...generationConfig };
                const timeout = UnifiedGeminiManager.getTimeoutForModel(modelName);
                if (timeout !== null) {
                    requestOptions.timeout = timeout;
                }

                const result = await model.generateContent(requestData, requestOptions);
                const response = result.response;
                const text = response.text();

                const duration = Date.now() - startTime;
                this.usageTracker?.increment(currentModel, true);
                // 개발 환경에서만 개별 성공 로그 출력
                if (process.env.NODE_ENV === 'development') {
                    ServerLogger.debug(`✅ 폴백 모델 분석 성공 (${currentModel}, ${duration}ms)`, null, 'UNIFIED');
                }

                return {
                    success: true,
                    response: text,
                    model: currentModel,
                    timestamp: new Date().toISOString()
                };

            } catch (error: any) {
                lastError = error;

                // 할당량 에러나 503 에러면 다음 모델 시도
                const isQuotaError = error.message?.includes('quota') ||
                                    error.message?.includes('429') ||
                                    error.message?.includes('503');

                if (isQuotaError) {
                    ServerLogger.warn(`⚠️ 모델 ${currentModel} 할당량 초과, 다음 모델 시도`, null, 'UNIFIED');
                    continue; // 다음 모델로 계속
                } else {
                    // 할당량 문제가 아니면 즉시 실패
                    const duration = Date.now() - startTime;
                    this.usageTracker?.increment(currentModel, false);
                    ServerLogger.error(`❌ 모델 ${currentModel} 분석 실패 (${duration}ms)`, error, 'UNIFIED');
                    throw error;
                }
            }
        }

        // 모든 모델 시도 실패
        const duration = Date.now() - startTime;
        ServerLogger.error(`❌ 모든 폴백 모델 실패 (원본: ${modelType}, ${duration}ms)`, lastError, 'UNIFIED');
        throw lastError;
    }

    // Implementation continues with remaining methods...
    // [Additional methods would follow the same pattern, properly typed]


    /**
     * 자동 복구 타이머 시작 (신규)
     */
    private startAutoRecovery(): void {
        setInterval(() => {
            const now = Date.now();
            let recovered = false;

            if (this.modelStatus) {
                Object.keys(this.modelStatus).forEach(modelType => {
                    const status = this.modelStatus![modelType];

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
            }

            if (recovered) {
                ServerLogger.success('✅ 일부 모델이 자동 복구되었습니다', null, 'UNIFIED');
            }
        }, 60000); // 1분마다 체크
    }

    /**
     * 사용량 통계 조회
     */
    public async getUsageStats(): Promise<UsageStats> {
        // API 키가 초기화되지 않은 경우 기본값 반환
        if (!this.apiKeys || this.apiKeys.length === 0) {
            const { GEMINI_API_LIMITS } = await import('../config/api-constants');
            return {
                pro: { used: 0, limit: GEMINI_API_LIMITS.PRO.rpd },
                flash: { used: 0, limit: GEMINI_API_LIMITS.FLASH.rpd },
                flashLite: { used: 0, limit: GEMINI_API_LIMITS.FLASH_LITE.rpd }
            };
        }

        const stats: UsageStats = {
            strategy: this.fallbackStrategy,
            currentKey: this.currentKeyIndex,
            totalKeys: this.apiKeys.length,
            keys: {}
        };

        this.apiKeys.forEach((keyInfo, index) => {
            const trackerId = `key_${index}`;
            const usage = this.usageTrackers!.get(trackerId).getTodayUsage();

            stats.keys![keyInfo.name] = {
                ...usage,
                index: index,
                active: index === this.currentKeyIndex
            };
        });

        return stats;
    }

    // Note: Additional methods from the original file would continue here
    // For brevity, I'm including the key methods that establish the TypeScript structure
    // The remaining methods would follow the same typing patterns

    /**
     * API 키 캐시 클리어 (파일 변경 시 호출)
     */
    public clearApiKeyCache(): void {
        this.apiKeys = [];
        if (this.usageTracker) {
            // UsageTracker는 전역 싱글톤이므로 별도 클리어 불필요
        }
        ServerLogger.info('🔄 UnifiedGeminiManager API 키 캐시 클리어', null, 'UNIFIED-GEMINI');
    }

    // Remaining implementation methods
    private async generateContentMultiKey(prompt: string, imageBase64: string | null, options: GeminiManagerOptions): Promise<any> {
        const startTime = Date.now();
        let lastError: Error | null = null;

        // 재시도 로직 with 다양한 전략
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                // 현재 키로 시도
                const result = await this.tryWithCurrentStrategy(prompt, imageBase64, options);

                if (result) {
                    const duration = Date.now() - startTime;
                    ServerLogger.success(`✅ Multi-Key AI 분석 성공 (${attempt}/${this.retryAttempts}회 시도, ${duration}ms)`, null, 'UNIFIED');
                    // 일관된 형태로 반환
                    return {
                        text: result.text || result.response || result,
                        model: result.model || 'multi-key',
                        timestamp: result.timestamp || new Date().toISOString(),
                        duration
                    };
                }

            } catch (error) {
                lastError = error as Error;
                ServerLogger.warn(`⚠️ Multi-Key 시도 ${attempt}/${this.retryAttempts} 실패: ${lastError.message}`, null, 'UNIFIED');

                // 할당량 오류인 경우 폴백 전략 적용
                if (this.isQuotaError(lastError)) {
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

    private async generateContentModelPriority(prompt: string, imageBase64: string | null, options: GeminiManagerOptions): Promise<any> {
        const startTime = Date.now();
        let lastError: Error | null = null;
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
                        return {
                            text: result.text || result.response || result,
                            model: result.model || modelType,
                            timestamp: result.timestamp || new Date().toISOString(),
                            duration
                        };
                    }

                } catch (error) {
                    lastError = error as Error;
                    this.usageTracker.increment(modelType, false);

                    if (this.isQuotaError(lastError)) {
                        // 할당량 초과 → 다음날 오후 4시까지 비활성화
                        const nextReset = this.getNextQuotaResetTime();
                        status.available = false;
                        status.quotaExhausted = true;
                        status.disabledUntil = nextReset;
                        status.lastQuotaError = new Date().toISOString();
                        const resetDate = new Date(nextReset!).toLocaleString('ko-KR');
                        ServerLogger.warn(`🚫 모델 ${modelType} 할당량 초과로 비활성화 (복구 예정: ${resetDate})`, null, 'UNIFIED');

                    } else if (this.isOverloadError(lastError)) {
                        // 과부하 → 모델 임시 비활성화 (3초)
                        status.disabledUntil = Date.now() + this.overloadRecoveryInterval!;
                        ServerLogger.warn(`⏳ 모델 ${modelType} 과부하로 임시 비활성화 (3초)`, null, 'UNIFIED');

                        // flash-lite가 과부하일 때만 3초 대기 후 재시도
                        if (modelType === 'flash-lite') {
                            ServerLogger.info(`⏰ flash-lite 과부하 - 3초 대기 후 재시도...`, null, 'UNIFIED');
                            await this.sleep(this.overloadRecoveryInterval!);
                        }

                    } else {
                        ServerLogger.warn(`⚠️ 모델 ${modelType} 일반 오류: ${lastError.message}`, null, 'UNIFIED');
                    }

                    status.lastError = lastError.message;
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

    private async generateContentWithImagesSingleModel(prompt: string, imageContents: ImageContent[], options: GeminiManagerOptions): Promise<any> {
        const startTime = Date.now();
        let lastError: Error | null = null;

        if (!this.singleModelInstance) {
            throw new Error('Single model이 초기화되지 않았습니다');
        }

        // 단일 모델로 재시도
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                ServerLogger.info(`🔄 Single-Model 다중 이미지 (${this.singleModel}) 시도 (${attempt}번째)`, null, 'UNIFIED');

                // API 호출 로직을 직접 포함 (thinking 모드 지원)
                const requestData: any[] = [prompt, ...imageContents];

                const generationConfig: any = {};

                // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
                const thinkingBudget = options.thinkingBudget ??
                    (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);

                if (thinkingBudget !== undefined && this.singleModel.includes('flash')) {
                    generationConfig.thinkingBudget = thinkingBudget;
                }

                // 타임아웃 설정 - null이면 제외
                const requestOptions = { ...generationConfig };
                const timeout = UnifiedGeminiManager.getTimeoutForModel(this.singleModel);
                if (timeout !== null) {
                    requestOptions.timeout = timeout;
                }

                const apiResult = await this.singleModelInstance.generateContent(requestData, requestOptions);
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
                lastError = error as Error;
                this.usageTracker.increment('single', false);

                ServerLogger.error(`Single-Model 다중 이미지 처리 실패: ${lastError.message}`, lastError, 'UNIFIED');
                ServerLogger.warn(`⚠️ Single-Model 다중 이미지 시도 ${attempt}/${this.retryAttempts} 실패: ${lastError.message}`, null, 'UNIFIED');

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

    // Helper methods
    private async tryWithCurrentStrategy(prompt: string, imageBase64: string | null, options: GeminiManagerOptions): Promise<any> {
        const trackerId = `key_${this.currentKeyIndex}`;
        const usageTracker = this.usageTrackers.get(trackerId);
        if (!usageTracker) throw new Error(`Usage tracker not found for ${trackerId}`);

        // 1단계: Pro 모델 시도
        try {
            const result = await this.queryWithModel(`${trackerId}_pro`, prompt, imageBase64, options);
            usageTracker.increment('pro', true);
            return result;

        } catch (error) {
            usageTracker.increment('pro', false);

            if (this.isQuotaError(error as Error) && this.enableFallback) {
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

    private async handleQuotaExceeded(prompt: string, imageBase64: string | null, options: GeminiManagerOptions): Promise<any> {
        if (this.fallbackStrategy === 'multi-pro' && this.apiKeys.length > 1) {
            // 다른 API 키로 전환
            for (let i = 1; i < this.apiKeys.length; i++) {
                const nextKeyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;

                try {
                    ServerLogger.info(`🔄 API 키 ${nextKeyIndex}로 전환하여 Pro 모델 재시도`, null, 'UNIFIED');

                    const trackerId = `key_${nextKeyIndex}`;
                    const result = await this.queryWithModel(`${trackerId}_pro`, prompt, imageBase64, options);

                    const tracker = this.usageTrackers.get(trackerId);
                    if (tracker) tracker.increment('pro', true);
                    this.currentKeyIndex = nextKeyIndex; // 성공한 키를 현재 키로 설정

                    return result;

                } catch (error) {
                    const tracker2 = this.usageTrackers.get(`key_${nextKeyIndex}`);
                    if (tracker2) tracker2.increment('pro', false);
                    ServerLogger.warn(`⚠️ API 키 ${nextKeyIndex} Pro 모델도 실패`, null, 'UNIFIED');
                }
            }
        }

        return null; // 모든 폴백 실패
    }

    private async queryWithModel(modelId: string, prompt: string, imageBase64: string | null, options: GeminiManagerOptions): Promise<any> {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`모델을 찾을 수 없습니다: ${modelId}`);
        }

        // 요청 구성
        const requestData: any[] = [];

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
        const generationConfig: any = {};

        // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
        const thinkingBudget = options.thinkingBudget ??
            (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);

        if (thinkingBudget !== undefined && modelId.includes('flash')) {
            generationConfig.thinkingBudget = thinkingBudget;
        }

        // 타임아웃 설정 - null이면 제외
        const requestOptions = { ...generationConfig };
        const timeout = UnifiedGeminiManager.getTimeoutForModel(modelId || 'flash');
        if (timeout !== null) {
            requestOptions.timeout = timeout;
        }

        const result = await model.generateContent(requestData, requestOptions);
        const response = await result.response;

        return {
            text: response.text(),
            model: modelId,
            timestamp: new Date().toISOString()
        };
    }

    private async queryWithModelPriority(modelType: string, prompt: string, imageBase64: string | null, options: GeminiManagerOptions): Promise<any> {
        const model = this.models.get(modelType);
        if (!model) {
            throw new Error(`모델을 찾을 수 없습니다: ${modelType}`);
        }

        // 요청 구성
        const requestData: any[] = [];

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
        const generationConfig: any = {};

        // thinking budget 설정 (환경변수 또는 옵션에서 가져오기)
        const thinkingBudget = options.thinkingBudget ??
            (process.env.GEMINI_THINKING_BUDGET ? parseInt(process.env.GEMINI_THINKING_BUDGET) : undefined);

        if (thinkingBudget !== undefined && modelType.includes('flash')) {
            generationConfig.thinkingBudget = thinkingBudget;
        }

        // 타임아웃 설정 - null이면 제외
        const requestOptions = { ...generationConfig };
        const timeout = UnifiedGeminiManager.getTimeoutForModel(modelType || 'flash');
        if (timeout !== null) {
            requestOptions.timeout = timeout;
        }

        const result = await model.generateContent(requestData, requestOptions);
        const response = await result.response;

        return {
            text: response.text(),
            model: `${modelType} (single-key)`,
            timestamp: new Date().toISOString()
        };
    }

    private isQuotaError(error: Error): boolean {
        const message = error.message?.toLowerCase() || '';
        return message.includes('quota') ||
            message.includes('rate limit') ||
            message.includes('resource_exhausted') ||
            (error as any).status === 429;
    }

    private isOverloadError(error: Error): boolean {
        const message = error.message?.toLowerCase() || '';
        return message.includes('overload') ||
            message.includes('temporarily unavailable') ||
            message.includes('service unavailable') ||
            (error as any).status === 503 ||
            (error as any).status === 502;
    }

    private getNextQuotaResetTime(): number {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(16, 0, 0, 0); // 오후 4시 (UTC+9 기준)

        return tomorrow.getTime();
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 다중 이미지와 함께 Gemini 쿼리 실행 (GeminiAnalyzer 호환성을 위한 메서드)
     */
    public async queryGeminiWithMultipleImages(prompt: string, imageBase64Array: string[], options: GeminiManagerOptions = {}): Promise<ContentGenerationResult> {
        ServerLogger.info(`🔍 queryGeminiWithMultipleImages 호출됨: ${imageBase64Array.length}개 이미지`, null, 'UNIFIED');

        // 단일 이미지인 경우 기존 메서드 사용
        if (imageBase64Array.length === 1) {
            return await this.generateContent(prompt, imageBase64Array[0], options);
        }

        // single-model 모드가 아닌 경우 첫 번째 이미지만 사용
        if (this.fallbackMode !== 'single-model') {
            ServerLogger.warn(`다중 이미지는 single-model 모드에서만 지원됩니다. 현재 모드: ${this.fallbackMode}`, null, 'UNIFIED');
            return await this.generateContent(prompt, imageBase64Array[0], options);
        }

        // Base64 문자열 배열을 ImageContent 배열로 변환
        const imageContents: ImageContent[] = imageBase64Array.map(base64 => ({
            inlineData: {
                mimeType: 'image/jpeg', // 기본값으로 jpeg 사용
                data: base64
            }
        }));

        // 기존 다중 이미지 메서드 호출
        const result = await this.generateContentWithImagesSingleModel(prompt, imageContents, options);

        return {
            success: true,
            response: result.text || result,
            model: this.singleModel || 'unknown'
        };
    }
}

export { UnifiedGeminiManager };
export default UnifiedGeminiManager;