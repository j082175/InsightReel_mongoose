import { ServerLogger } from "../../utils/logger";
import { UnifiedCategoryManager } from "../UnifiedCategoryManager";
import { FrameAnalyzer } from "./analyzers/FrameAnalyzer";
import { GeminiAnalyzer } from "./analyzers/GeminiAnalyzer";
import { ResponseParser } from "./managers/ResponseParser";

interface AnalysisOptions {
    analysisType?: "single" | "multi-frame" | "dynamic";
    useDynamicCategories?: boolean;
    maxRetries?: number;
    fallbackToSingle?: boolean;
}

interface AnalysisResult {
    success: boolean;
    mainCategory?: string;
    middleCategory?: string;
    subCategory?: string;
    detailCategory?: string;  // 4번째 레벨 추가
    keywords?: string[];
    summary?: string;
    analysisContent?: string; // AI 분석 상세 내용
    confidence?: number;
    analysisType?: string;
    error?: string;
    metadata?: any;
}

export class AIAnalyzer {
    private geminiAnalyzer: GeminiAnalyzer;
    private categoryManager: any;
    private useDynamicCategories: boolean = false;

    constructor() {
        this.geminiAnalyzer = new GeminiAnalyzer();
        this.initializeCategoryManager();
    }

    private initializeCategoryManager(): void {
        try {
            const categoryMode =
                process.env.USE_DYNAMIC_CATEGORIES === "true"
                    ? "dynamic"
                    : process.env.USE_FLEXIBLE_CATEGORIES === "true"
                    ? "flexible"
                    : "basic";

            this.categoryManager = UnifiedCategoryManager.getInstance({ mode: categoryMode });
            this.useDynamicCategories = categoryMode !== "basic";

            ServerLogger.info(`카테고리 관리자 초기화 완료 (모드: ${categoryMode})`);
        } catch (error) {
            ServerLogger.error("카테고리 관리자 초기화 실패:", error);
            this.useDynamicCategories = false;
        }
    }

    /**
     * 연결 테스트
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.geminiAnalyzer.isReady()) {
                return { success: false, error: "Gemini Analyzer가 초기화되지 않았습니다" };
            }

            const result = await this.geminiAnalyzer.testConnection();
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
            ServerLogger.error("연결 테스트 실패:", error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * 자가 학습 통계 조회
     */
    getSelfLearningStats(): any {
        try {
            if (this.categoryManager && typeof this.categoryManager.getSelfLearningStats === 'function') {
                return this.categoryManager.getSelfLearningStats();
            }

            // Fallback: 기본 통계 반환
            return {
                totalCategories: 0,
                learnedPatterns: 0,
                confidenceLevel: 0,
                lastUpdate: new Date().toISOString(),
                analysisCount: 0,
                successRate: 0
            };
        } catch (error) {
            ServerLogger.error('자가 학습 통계 조회 실패:', error);
            return {
                totalCategories: 0,
                learnedPatterns: 0,
                confidenceLevel: 0,
                lastUpdate: new Date().toISOString(),
                analysisCount: 0,
                successRate: 0,
                error: error instanceof Error ? error.message : '통계 조회 실패'
            };
        }
    }

    /**
     * 시스템 통계 조회
     */
    getSystemStats(): any {
        try {
            if (this.categoryManager && typeof this.categoryManager.getSystemStats === 'function') {
                return this.categoryManager.getSystemStats();
            }

            // Fallback: 기본 시스템 통계 반환
            return {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                categoryMode: this.useDynamicCategories ? 'dynamic' : 'basic',
                analyzerStatus: this.geminiAnalyzer.isReady() ? 'ready' : 'not_ready',
                lastAnalysis: new Date().toISOString(),
                totalAnalyses: 0
            };
        } catch (error) {
            ServerLogger.error('시스템 통계 조회 실패:', error);
            return {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                categoryMode: 'unknown',
                analyzerStatus: 'error',
                lastAnalysis: new Date().toISOString(),
                totalAnalyses: 0,
                error: error instanceof Error ? error.message : '시스템 통계 조회 실패'
            };
        }
    }

    /**
     * 메인 비디오 분석 함수
     */
    async analyzeVideo(
        thumbnailPaths: string | string[],
        metadata: any,
        options: AnalysisOptions = {}
    ): Promise<AnalysisResult> {
        try {
            ServerLogger.info("비디오 분석 시작");

            if (!this.geminiAnalyzer.isReady()) {
                throw new Error("Gemini Analyzer가 준비되지 않았습니다");
            }

            // 분석 유형 결정
            const analysisType = options.analysisType || "multi-frame";

            // 동적 카테고리 사용 여부 결정
            const useDynamic = options.useDynamicCategories ?? this.useDynamicCategories;

            if (useDynamic) {
                return await this.analyzeDynamicCategories(thumbnailPaths, metadata, options);
            } else {
                return await this.analyzeWithBasicCategories(thumbnailPaths, metadata, options);
            }
        } catch (error) {
            ServerLogger.error("비디오 분석 실패:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "알 수 없는 오류",
            };
        }
    }

    /**
     * 동적 카테고리 분석
     */
    private async analyzeDynamicCategories(
        thumbnailPaths: string | string[],
        metadata: any,
        options: AnalysisOptions
    ): Promise<AnalysisResult> {
        try {
            ServerLogger.info("동적 카테고리 분석 시작");

            // 프레임 분석
            const frameResult = await FrameAnalyzer.analyzeDynamicFrames(thumbnailPaths, metadata, {
                analysisType: options.analysisType,
                fallbackToSingle: options.fallbackToSingle,
            });

            if (!frameResult.success || !frameResult.frameData) {
                throw new Error(`프레임 분석 실패: ${frameResult.error}`);
            }

            // 동적 프롬프트 생성
            const prompt = this.generateDynamicPrompt(metadata, frameResult.analysisType);

            // Gemini 분석 실행
            let analysisResult;
            if (frameResult.frameData.length === 1 && frameResult.frameData[0].base64) {
                // 단일 프레임
                analysisResult = await this.geminiAnalyzer.queryGeminiWithImage(
                    prompt,
                    frameResult.frameData[0].base64
                );
            } else {
                // 다중 프레임
                const validFrames = frameResult.frameData
                    .filter((frame) => frame.base64)
                    .map((frame) => frame.base64!);

                if (validFrames.length === 0) {
                    throw new Error("유효한 프레임 데이터가 없습니다");
                }

                analysisResult = await this.geminiAnalyzer.queryGeminiWithMultipleImages(
                    prompt,
                    validFrames
                );
            }

            // 항상 Gemini 응답 내용을 로깅
            ServerLogger.info("🔍 Gemini 분석 결과 디버깅:", {
                success: analysisResult.success,
                error: analysisResult.error,
                hasResponse: !!analysisResult.response,
                responseType: typeof analysisResult.response,
                responseLength: analysisResult.response ? analysisResult.response.length : 0,
                responsePreview: analysisResult.response
                    ? analysisResult.response.substring(0, 300)
                    : "null",
                fullResult: JSON.stringify(analysisResult, null, 2).substring(0, 1000),
            });

            if (!analysisResult.success) {
                const errorMsg = analysisResult.error || "알 수 없는 Gemini 분석 오류";
                ServerLogger.error("❌ Gemini 분석 실패:", errorMsg);
                throw new Error(`Gemini 분석 실패: ${errorMsg}`);
            }

            // 성공한 경우에도 응답 내용 로깅
            ServerLogger.info("✅ Gemini 분석 성공, 응답 내용 확인:", {
                hasResponse: !!analysisResult.response,
                responseLength: analysisResult.response ? analysisResult.response.length : 0,
                responsePreview: analysisResult.response
                    ? analysisResult.response.substring(0, 200) + "..."
                    : "null",
            });

            // 응답 파싱
            const parsedResult = ResponseParser.parseAIResponse(
                analysisResult.response!,
                metadata,
                { analysisType: frameResult.analysisType }
            );

            if (!parsedResult.success) {
                throw new Error(`응답 파싱 실패: ${parsedResult.error}`);
            }

            return {
                success: true,
                mainCategory: parsedResult.mainCategory,
                middleCategory: parsedResult.middleCategory,
                subCategory: parsedResult.subCategory,
                detailCategory: parsedResult.detailCategory,
                keywords: parsedResult.keywords,
                summary: parsedResult.summary,
                analysisContent: parsedResult.summary || parsedResult.analysisContent || '상세 분석 내용',
                confidence: parsedResult.confidence,
                analysisType: frameResult.analysisType,
                metadata: {
                    frameCount: frameResult.frameData.length,
                    model: analysisResult.model,
                    rawResponse: parsedResult.rawResponse,
                },
            };
        } catch (error) {
            ServerLogger.error("동적 카테고리 분석 실패:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "알 수 없는 오류",
                analysisType: "dynamic",
            };
        }
    }

    /**
     * 기본 카테고리 분석
     */
    private async analyzeWithBasicCategories(
        thumbnailPaths: string | string[],
        metadata: any,
        options: AnalysisOptions
    ): Promise<AnalysisResult> {
        try {
            ServerLogger.info("기본 카테고리 분석 시작");

            // URL 기반 카테고리 추정
            const urlBasedCategory =
                this.categoryManager?.analyzeBasedOnUrl?.(metadata.url) || null;

            // 프레임 분석
            const frameResult = await FrameAnalyzer.analyzeDynamicFrames(thumbnailPaths, metadata, {
                analysisType: options.analysisType,
                fallbackToSingle: options.fallbackToSingle,
            });

            if (!frameResult.success || !frameResult.frameData) {
                throw new Error(`프레임 분석 실패: ${frameResult.error}`);
            }

            // 기본 프롬프트 생성
            const prompt = this.generateBasicPrompt(
                metadata,
                urlBasedCategory,
                frameResult.analysisType
            );

            // Gemini 분석 실행
            let analysisResult;
            if (frameResult.frameData.length === 1 && frameResult.frameData[0].base64) {
                analysisResult = await this.geminiAnalyzer.queryGeminiWithImage(
                    prompt,
                    frameResult.frameData[0].base64
                );
            } else {
                const validFrames = frameResult.frameData
                    .filter((frame) => frame.base64)
                    .map((frame) => frame.base64!);

                if (validFrames.length === 0) {
                    throw new Error("유효한 프레임 데이터가 없습니다");
                }

                analysisResult = await this.geminiAnalyzer.queryGeminiWithMultipleImages(
                    prompt,
                    validFrames
                );
            }

            // 항상 Gemini 응답 내용을 로깅
            ServerLogger.info("🔍 Gemini 분석 결과 디버깅:", {
                success: analysisResult.success,
                error: analysisResult.error,
                hasResponse: !!analysisResult.response,
                responseType: typeof analysisResult.response,
                responseLength: analysisResult.response ? analysisResult.response.length : 0,
                responsePreview: analysisResult.response
                    ? analysisResult.response.substring(0, 300)
                    : "null",
                fullResult: JSON.stringify(analysisResult, null, 2).substring(0, 1000),
            });

            if (!analysisResult.success) {
                const errorMsg = analysisResult.error || "알 수 없는 Gemini 분석 오류";
                ServerLogger.error("❌ Gemini 분석 실패:", errorMsg);
                throw new Error(`Gemini 분석 실패: ${errorMsg}`);
            }

            // 성공한 경우에도 응답 내용 로깅
            ServerLogger.info("✅ Gemini 분석 성공, 응답 내용 확인:", {
                hasResponse: !!analysisResult.response,
                responseLength: analysisResult.response ? analysisResult.response.length : 0,
                responsePreview: analysisResult.response
                    ? analysisResult.response.substring(0, 200) + "..."
                    : "null",
            });

            // 응답 파싱 및 카테고리 결합
            const parsedResult = ResponseParser.parseAIResponse(
                analysisResult.response!,
                metadata,
                { analysisType: frameResult.analysisType, urlBasedCategory }
            );

            if (!parsedResult.success) {
                throw new Error(`응답 파싱 실패: ${parsedResult.error}`);
            }

            // URL 기반 카테고리와 AI 분석 결과 결합
            const combinedResult = this.combineAnalysisResults(
                parsedResult,
                urlBasedCategory,
                metadata
            );

            return {
                success: true,
                ...combinedResult,
                analysisType: frameResult.analysisType,
                metadata: {
                    frameCount: frameResult.frameData.length,
                    model: analysisResult.model,
                    urlBasedCategory,
                    rawResponse: parsedResult.rawResponse,
                },
            };
        } catch (error) {
            ServerLogger.error("기본 카테고리 분석 실패:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "알 수 없는 오류",
                analysisType: "basic",
            };
        }
    }

    /**
     * 동적 프롬프트 생성
     */
    private generateDynamicPrompt(metadata: any, analysisType: string): string {
        const basePrompt = `
이 비디오의 내용을 분석하고 다음 정보를 JSON 형식으로 제공해주세요:

{
  "mainCategory": "대카테고리",
  "middleCategory": "중카테고리",
  "subCategory": "소카테고리",
  "detailCategory": "세부카테고리",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "summary": "내용 요약",
  "analysisContent": "상세 분석 내용 및 설명",
  "confidence": 0.85
}

비디오 정보:
- 제목: ${metadata.title || "제목 없음"}
- 설명: ${metadata.description || "설명 없음"}
- 플랫폼: ${metadata.platform || "알 수 없음"}
- 분석 방식: ${analysisType}

카테고리는 구체적이고 의미있게 분류해주세요.
`;

        return basePrompt.trim();
    }

    /**
     * 기본 프롬프트 생성
     */
    private generateBasicPrompt(
        metadata: any,
        urlBasedCategory: any,
        analysisType: string
    ): string {
        let categoryInfo = "";
        if (urlBasedCategory) {
            categoryInfo = `\n- URL 기반 추정 카테고리: ${
                urlBasedCategory.middleCategory || "없음"
            } > ${urlBasedCategory.middleCategory || "없음"}`;
        }

        const basePrompt = `
이 비디오의 내용을 분석하고 다음 정보를 JSON 형식으로 제공해주세요:

{
  "mainCategory": "게임|과학·기술|교육|How-to & 라이프스타일|뉴스·시사|사회·공익|스포츠|동물|엔터테인먼트|여행·이벤트|음악|키즈|기타",
  "middleCategory": "세부 중카테고리",
  "subCategory": "더 구체적인 소카테고리",
  "keywords": ["관련", "키워드", "목록"],
  "summary": "내용 요약",
  "confidence": 0.85
}

비디오 정보:
- 제목: ${metadata.title || "제목 없음"}
- 설명: ${metadata.description || "설명 없음"}
- 플랫폼: ${metadata.platform || "알 수 없음"}
- 분석 방식: ${analysisType}${categoryInfo}

제공된 대카테고리 중에서 가장 적합한 것을 선택해주세요.
`;

        return basePrompt.trim();
    }

    /**
     * 분석 결과 결합
     */
    private combineAnalysisResults(parsedResult: any, urlBasedCategory: any, metadata: any): any {
        const result: any = {
            mainCategory: parsedResult.mainCategory,
            middleCategory: parsedResult.middleCategory,
            subCategory: parsedResult.subCategory,
            keywords: parsedResult.keywords,
            summary: parsedResult.summary,
            confidence: parsedResult.confidence,
        };

        // URL 기반 카테고리가 있고 AI 결과의 신뢰도가 낮은 경우 보완
        if (urlBasedCategory && parsedResult.confidence < 0.7) {
            if (!result.mainCategory && urlBasedCategory.mainCategory) {
                result.mainCategory = urlBasedCategory.mainCategory;
                result.confidence = Math.max(result.confidence, 0.6);
            }

            if (!result.middleCategory && urlBasedCategory.middleCategory) {
                result.middleCategory = urlBasedCategory.middleCategory;
                result.confidence = Math.max(result.confidence, 0.6);
            }
        }

        return result;
    }

    /**
     * 다중 분석 실행 (신뢰도 향상을 위해)
     */
    async performMultipleAnalysis(
        thumbnailPaths: string | string[],
        metadata: any,
        count: number = 3
    ): Promise<AnalysisResult> {
        try {
            ServerLogger.info(`다중 분석 시작 (${count}회)`);

            const results: AnalysisResult[] = [];

            for (let i = 0; i < count; i++) {
                const result = await this.analyzeVideo(thumbnailPaths, metadata, {
                    analysisType: "multi-frame",
                });

                if (result.success) {
                    results.push(result);
                }

                // 분석 간 간격
                if (i < count - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            if (results.length === 0) {
                return {
                    success: false,
                    error: "모든 분석이 실패했습니다",
                };
            }

            // 결과 통합
            return this.consolidateMultipleResults(results);
        } catch (error) {
            ServerLogger.error("다중 분석 실패:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "알 수 없는 오류",
            };
        }
    }

    /**
     * 다중 분석 결과 통합
     */
    private consolidateMultipleResults(results: AnalysisResult[]): AnalysisResult {
        if (results.length === 1) {
            return results[0];
        }

        // 가장 높은 신뢰도를 가진 결과 찾기
        const bestResult = results.reduce((best, current) => {
            const bestConfidence = best.confidence || 0;
            const currentConfidence = current.confidence || 0;
            return currentConfidence > bestConfidence ? current : best;
        });

        // 공통 키워드 추출
        const allKeywords = results.filter((r) => r.keywords).flatMap((r) => r.keywords!);

        const keywordCounts = allKeywords.reduce((counts, keyword) => {
            counts[keyword] = (counts[keyword] || 0) + 1;
            return counts;
        }, {} as { [key: string]: number });

        const consolidatedKeywords = Object.entries(keywordCounts)
            .filter(([, count]) => count >= Math.ceil(results.length / 2))
            .map(([keyword]) => keyword)
            .slice(0, 20);

        return {
            ...bestResult,
            keywords: consolidatedKeywords.length > 0 ? consolidatedKeywords : bestResult.keywords,
            confidence: Math.min((bestResult.confidence || 0) + 0.1, 1.0),
            metadata: {
                ...bestResult.metadata,
                analysisCount: results.length,
                consolidatedFrom: "multiple-analysis",
            },
        };
    }

    /**
     * Gemini 건강 상태 확인
     */
    async getGeminiHealthCheck(): Promise<any> {
        return await this.geminiAnalyzer.getHealthCheck();
    }
}

export default AIAnalyzer;
