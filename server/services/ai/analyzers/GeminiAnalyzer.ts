import { ServerLogger } from '../../../utils/logger';

interface GeminiQueryOptions {
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
    model?: string;
}

interface GeminiQueryResult {
    success: boolean;
    response?: string;
    model?: string;
    error?: string;
    retryCount?: number;
}

export class GeminiAnalyzer {
    private geminiManager: any;
    private isInitialized: boolean = false;

    constructor() {
        this.initializeGemini();
    }

    private async initializeGemini(): Promise<void> {
        try {
            const UnifiedGeminiManagerModule = await import('../../../utils/unified-gemini-manager');
            const UnifiedGeminiManager = UnifiedGeminiManagerModule.default || UnifiedGeminiManagerModule.UnifiedGeminiManager;

            const mode = process.env.GEMINI_FALLBACK_MODE || 'single-model';
            const strategy = process.env.GEMINI_FALLBACK_STRATEGY || 'flash';

            this.geminiManager = UnifiedGeminiManager.getInstance({
                strategy: strategy as any,
                retryAttempts: 3,
                retryDelay: 2000
            });

            this.isInitialized = true;
            ServerLogger.info('GeminiAnalyzer 초기화 완료');

        } catch (error) {
            ServerLogger.error('GeminiAnalyzer 초기화 실패:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Gemini 연결 테스트
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.isInitialized || !this.geminiManager) {
                return { success: false, error: 'Gemini가 초기화되지 않았습니다' };
            }

            const testPrompt = "안녕하세요. 연결 테스트입니다. '테스트 성공'이라고 답변해주세요.";
            const result = await this.queryGemini(testPrompt);

            if (result.success) {
                ServerLogger.info('Gemini 연결 테스트 성공');
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            ServerLogger.error('Gemini 연결 테스트 실패:', error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * 기본 Gemini 쿼리 (텍스트 전용)
     */
    async queryGemini(
        prompt: string,
        options: GeminiQueryOptions = {}
    ): Promise<GeminiQueryResult> {
        try {
            if (!this.isInitialized || !this.geminiManager) {
                return {
                    success: false,
                    error: 'Gemini가 초기화되지 않았습니다'
                };
            }

            if (!prompt || typeof prompt !== 'string') {
                return {
                    success: false,
                    error: '유효하지 않은 프롬프트입니다'
                };
            }

            const startTime = Date.now();
            ServerLogger.info(`Gemini 쿼리 시작: ${prompt.substring(0, 100)}...`);

            const result = await this.geminiManager.generateContent(prompt, null, { modelType: options.model || 'flash' });

            const duration = Date.now() - startTime;

            if (result.success) {
                ServerLogger.info(`Gemini 쿼리 성공 (${duration}ms)`);
                return {
                    success: true,
                    response: result.response,
                    model: result.model
                };
            } else {
                ServerLogger.error(`Gemini 쿼리 실패 (${duration}ms):`, result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            ServerLogger.error('Gemini 쿼리 예외 발생:', error);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * 이미지와 함께 Gemini 쿼리
     */
    async queryGeminiWithImage(
        prompt: string,
        imageBase64: string,
        options: GeminiQueryOptions = {}
    ): Promise<GeminiQueryResult> {
        try {
            if (!this.isInitialized || !this.geminiManager) {
                return {
                    success: false,
                    error: 'Gemini가 초기화되지 않았습니다'
                };
            }

            if (!prompt || typeof prompt !== 'string') {
                return {
                    success: false,
                    error: '유효하지 않은 프롬프트입니다'
                };
            }

            if (!imageBase64 || typeof imageBase64 !== 'string') {
                return {
                    success: false,
                    error: '유효하지 않은 이미지 데이터입니다'
                };
            }

            const startTime = Date.now();
            ServerLogger.info(`Gemini 이미지 쿼리 시작: ${prompt.substring(0, 100)}...`);

            const result = await this.geminiManager.generateContent(prompt, imageBase64);

            const duration = Date.now() - startTime;

            if (result.success) {
                ServerLogger.info(`Gemini 이미지 쿼리 성공 (${duration}ms)`);
                return {
                    success: true,
                    response: result.response,
                    model: result.model
                };
            } else {
                ServerLogger.error(`Gemini 이미지 쿼리 실패 (${duration}ms):`, result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            ServerLogger.error('Gemini 이미지 쿼리 예외 발생:', error);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * 다중 이미지와 함께 Gemini 쿼리
     */
    async queryGeminiWithMultipleImages(
        prompt: string,
        imageBase64Array: string[],
        options: GeminiQueryOptions = {}
    ): Promise<GeminiQueryResult> {
        try {
            if (!this.isInitialized || !this.geminiManager) {
                return {
                    success: false,
                    error: 'Gemini가 초기화되지 않았습니다'
                };
            }

            if (!prompt || typeof prompt !== 'string') {
                return {
                    success: false,
                    error: '유효하지 않은 프롬프트입니다'
                };
            }

            if (!Array.isArray(imageBase64Array) || imageBase64Array.length === 0) {
                return {
                    success: false,
                    error: '유효하지 않은 이미지 배열입니다'
                };
            }

            // 유효한 Base64 데이터만 필터링
            const validImages = imageBase64Array.filter(img =>
                img && typeof img === 'string' && img.length > 0
            );

            if (validImages.length === 0) {
                return {
                    success: false,
                    error: '유효한 이미지 데이터가 없습니다'
                };
            }

            const startTime = Date.now();
            ServerLogger.info(`Gemini 다중 이미지 쿼리 시작: ${validImages.length}개 이미지`);

            // 단일 이미지인 경우 단일 이미지 메서드 사용
            if (validImages.length === 1) {
                return await this.queryGeminiWithImage(prompt, validImages[0], options);
            }

            // 다중 이미지 처리 (UnifiedGeminiManager에 해당 메서드가 있다고 가정)
            let result;
            ServerLogger.info(`🔍 GeminiAnalyzer DEBUG: queryGeminiWithMultipleImages 존재 여부: ${!!this.geminiManager.queryGeminiWithMultipleImages}`);
            if (this.geminiManager.queryGeminiWithMultipleImages) {
                ServerLogger.info('🔍 GeminiAnalyzer DEBUG: queryGeminiWithMultipleImages 호출 시작');
                result = await this.geminiManager.queryGeminiWithMultipleImages(prompt, validImages);
                ServerLogger.info('🔍 GeminiAnalyzer DEBUG: queryGeminiWithMultipleImages 호출 완료:', result);
            } else {
                // 폴백: 첫 번째 이미지만 사용
                ServerLogger.warn('다중 이미지 지원 없음, 첫 번째 이미지 사용');
                result = await this.geminiManager.generateContent(prompt, validImages[0]);
            }

            const duration = Date.now() - startTime;

            if (result.success) {
                ServerLogger.info(`Gemini 다중 이미지 쿼리 성공 (${duration}ms)`);
                return {
                    success: true,
                    response: result.response,
                    model: result.model
                };
            } else {
                ServerLogger.error(`Gemini 다중 이미지 쿼리 실패 (${duration}ms):`, result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            ServerLogger.error('Gemini 다중 이미지 쿼리 예외 발생:', error);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Gemini 건강 상태 확인
     */
    async getHealthCheck(): Promise<{
        success: boolean;
        status: string;
        details?: any;
        error?: string;
    }> {
        try {
            if (!this.isInitialized || !this.geminiManager) {
                return {
                    success: false,
                    status: 'disconnected',
                    error: 'Gemini가 초기화되지 않았습니다'
                };
            }

            // 간단한 연결 테스트
            const testResult = await this.testConnection();

            if (testResult.success) {
                return {
                    success: true,
                    status: 'healthy',
                    details: {
                        initialized: this.isInitialized,
                        lastTest: new Date().toISOString()
                    }
                };
            } else {
                return {
                    success: false,
                    status: 'unhealthy',
                    error: testResult.error
                };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            return {
                success: false,
                status: 'error',
                error: errorMessage
            };
        }
    }

    /**
     * 재시도 로직이 포함된 강화된 쿼리
     */
    async queryWithRetry(
        prompt: string,
        imageBase64?: string,
        options: GeminiQueryOptions = {}
    ): Promise<GeminiQueryResult> {
        const maxRetries = options.retryAttempts || 3;
        const retryDelay = options.retryDelay || 2000;

        let lastError = '';

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                ServerLogger.info(`Gemini 쿼리 시도 ${attempt}/${maxRetries}`);

                let result: GeminiQueryResult;

                if (imageBase64) {
                    result = await this.queryGeminiWithImage(prompt, imageBase64, options);
                } else {
                    result = await this.queryGemini(prompt, options);
                }

                if (result.success) {
                    if (attempt > 1) {
                        ServerLogger.info(`${attempt}번째 시도에서 성공`);
                    }
                    return {
                        ...result,
                        retryCount: attempt - 1
                    };
                }

                lastError = result.error || '알 수 없는 오류';

                if (attempt < maxRetries) {
                    ServerLogger.warn(`시도 ${attempt} 실패, ${retryDelay}ms 후 재시도: ${lastError}`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }

            } catch (error) {
                lastError = error instanceof Error ? error.message : '알 수 없는 오류';

                if (attempt < maxRetries) {
                    ServerLogger.warn(`시도 ${attempt} 예외 발생, ${retryDelay}ms 후 재시도:`, error);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }

        ServerLogger.error(`모든 재시도 실패 (${maxRetries}회): ${lastError}`);
        return {
            success: false,
            error: `모든 재시도 실패: ${lastError}`,
            retryCount: maxRetries
        };
    }

    /**
     * 초기화 상태 확인
     */
    isReady(): boolean {
        return this.isInitialized && !!this.geminiManager;
    }
}

export default GeminiAnalyzer;