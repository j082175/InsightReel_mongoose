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
     * 채널 정체성 분석 (YouTube 채널의 기본 정보로부터)
     */
    async analyzeChannelIdentity(params: {
        channelId: string;
        videoTitles: string[];
        videoDescriptions: string[];
        videoComments?: any[];
        videoFramePaths?: string[];
        basicStats: any;
    }): Promise<{
        targetAudience: string;
        contentStyle: string;
        uniqueFeatures: string[];
        channelPersonality: string;
        channelTags: string[];
    }> {
        try {
            ServerLogger.info(`🤖 채널 정체성 분석 시작: ${params.channelId}`);

            // 기본 정보로부터 채널 정체성 분석 프롬프트 구성
            const commentSection = params.videoComments && params.videoComments.length > 0
                ? `\n시청자 댓글 샘플 (${params.videoComments.length}개):\n${params.videoComments.slice(0, 20).map((comment: any, i: number) => `${i + 1}. ${typeof comment === 'string' ? comment : comment.text || comment.textDisplay || ''}`).join('\n')}\n`
                : '';

            const prompt = `다음 YouTube 채널의 메타데이터를 분석하여 채널의 정체성을 파악해주세요.

채널 정보:
- 채널 ID: ${params.channelId}
- 영상 개수: ${params.videoTitles.length}개

최근 영상 제목들:
${params.videoTitles.slice(0, 10).map((title, i) => `${i + 1}. ${title}`).join('\n')}

영상 설명 샘플:
${params.videoDescriptions.slice(0, 3).map((desc, i) => `${i + 1}. ${desc.slice(0, 150)}...`).join('\n')}
${commentSection}
기본 통계:
- 평균 조회수: ${params.basicStats?.videos?.averageViews?.toLocaleString() || '알 수 없음'}회
- 평균 좋아요: ${params.basicStats?.videos?.averageLikes?.toLocaleString() || '알 수 없음'}개
- 업로드 패턴: 최근 7일 ${params.basicStats?.uploadPattern?.last7Days || 0}개, 최근 30일 ${params.basicStats?.uploadPattern?.last30Days || 0}개

위의 메타데이터${params.videoFramePaths && params.videoFramePaths.length > 0 ? '와 첨부된 영상 프레임 이미지들' : ''}을 종합적으로 분석하여 이 채널의 실제 정체성을 파악해주세요.
제목의 패턴, 콘텐츠 성격, 시청자층, 댓글에서 드러나는 시청자 반응${params.videoFramePaths && params.videoFramePaths.length > 0 ? ', 그리고 이미지에서 보이는 비주얼 콘텐츠의 특징' : ''}을 고려해주세요.

**중요 지침:**
- channelTags는 10-15개 정도로 제한하여 핵심 주제에만 집중
- 실제로 반복되는 키워드와 주제만 포함
- 일회성 주제보다는 채널의 일관된 테마 우선

반드시 아래 JSON 형식으로만 응답하세요:

{
  "targetAudience": "주요 타겟층",
  "contentStyle": "콘텐츠 특징과 스타일",
  "uniqueFeatures": ["채널만의 특색 1", "특색 2"],
  "channelPersonality": "전반적 성격과 지향점",
  "channelTags": ["핵심적이고", "일관된", "채널태그", "10-15개"]
}`;

            // Gemini로 분석 수행 (프레임이 있으면 이미지와 함께 전송)
            let analysisResult;

            if (params.videoFramePaths && params.videoFramePaths.length > 0) {
                ServerLogger.info(`🎬 ${params.videoFramePaths.length}개 프레임과 함께 채널 분석 수행`);

                // 프레임을 base64로 변환
                const fs = await import('fs');
                const imageBase64Array: string[] = [];

                for (const framePath of params.videoFramePaths) {
                    try {
                        if (fs.existsSync(framePath)) {
                            const imageBuffer = fs.readFileSync(framePath);
                            const base64 = imageBuffer.toString('base64');
                            imageBase64Array.push(base64);
                        }
                    } catch (error) {
                        ServerLogger.warn(`프레임 로드 실패: ${framePath}`, error);
                    }
                }

                if (imageBase64Array.length > 0) {
                    ServerLogger.info(`✅ ${imageBase64Array.length}개 프레임을 base64로 변환 완료`);
                    analysisResult = await this.geminiAnalyzer.queryGeminiWithMultipleImages(
                        prompt,
                        imageBase64Array,
                        { model: 'flash' }
                    );
                } else {
                    ServerLogger.warn('⚠️ 프레임 변환 실패, 텍스트 전용 분석으로 전환');
                    analysisResult = await this.geminiAnalyzer.queryGemini(
                        prompt,
                        { model: 'flash' }
                    );
                }
            } else {
                // 프레임 없음 - 텍스트 전용 분석
                analysisResult = await this.geminiAnalyzer.queryGemini(
                    prompt,
                    { model: 'flash' }
                );
            }

            if (!analysisResult.success || !analysisResult.response) {
                throw new Error('Gemini 분석 실패');
            }

            // JSON 응답 파싱
            let responseText = analysisResult.response;

            // JSON 부분만 추출
            let cleanedResponse = responseText.trim();
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse.split('```json')[1].split('```')[0].trim();
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse.split('```')[1].split('```')[0].trim();
            }

            const result = JSON.parse(cleanedResponse);

            // 기본값 설정 및 검증
            const channelIdentity = {
                targetAudience: result.targetAudience || '일반 시청자',
                contentStyle: result.contentStyle || '다양한 콘텐츠',
                uniqueFeatures: Array.isArray(result.uniqueFeatures) ? result.uniqueFeatures : [],
                channelPersonality: result.channelPersonality || '정보 전달형',
                channelTags: Array.isArray(result.channelTags) ? result.channelTags.slice(0, 15) : []
            };

            ServerLogger.success(`✅ 채널 정체성 분석 완료: ${channelIdentity.channelTags.length}개 태그 생성`);

            return channelIdentity;

        } catch (error) {
            ServerLogger.error(`❌ 채널 정체성 분석 실패: ${error}`);

            // 실패 시 기본값 반환
            return {
                targetAudience: '일반 시청자',
                contentStyle: '분석 실패',
                uniqueFeatures: [],
                channelPersonality: '분석 실패',
                channelTags: []
            };
        }
    }

    /**
     * 🔄 AI 재해석: 사용자 카테고리를 기반으로 기존 AI 태그 재분석 (Legacy Compatible)
     */
    async reinterpretWithUserCategory(
        userKeywords: string[],
        existingAiTags: string[],
        videoAnalyses: any[],
        channelInfo: any
    ): Promise<string[]> {
        if (!userKeywords || userKeywords.length === 0) {
            ServerLogger.warn("⚠️ 사용자 카테고리가 없어 재해석 건너뜀");
            return [];
        }

        try {
            const userCategory = userKeywords[0]; // 주요 사용자 카테고리

            // 개별 영상 분석에서 댓글 데이터 추출
            const commentsSample: string[] = [];
            if (videoAnalyses && Array.isArray(videoAnalyses)) {
                videoAnalyses.forEach((analysis: any, i: number) => {
                    if (analysis.comments && Array.isArray(analysis.comments)) {
                        commentsSample.push(
                            `영상${i + 1} 댓글: ${analysis.comments.slice(0, 3).join(", ")}`
                        );
                    }
                });
            }

            const prompt = `다음 YouTube 채널 분석에서 사용자가 특별한 관점으로 분류한 이유를 파악하고,
사용자 관점에서 채널의 진짜 성격을 재해석해주세요.

채널 정보:
- 이름: ${channelInfo?.title || channelInfo?.name || "알 수 없음"}
- 설명: ${channelInfo?.description || "설명 없음"}

기존 AI 분석 결과:
- AI 태그: ${existingAiTags.join(", ")}

사용자 분류: "${userCategory}"

영상 반응 샘플:
${commentsSample.slice(0, 5).join("\n")}

**중요**: 사용자가 "${userCategory}"로 분류한 이유를 깊이 있게 분석하고,
표면적인 주제가 아닌 시청자들의 진짜 만족 요소나 숨겨진 콘텐츠 성격을 파악하세요.

예: "권투 영상"이지만 사용자가 "참교육"으로 분류했다면,
실제로는 "정의구현", "악인징벌", "통쾌함" 같은 심리적 만족이 핵심일 것입니다.

10개 이내의 재해석된 태그를 JSON 배열 형태로만 응답하세요:
["태그1", "태그2", "태그3", ...]`;

            ServerLogger.info(`🔄 AI 재해석 시작: 사용자 카테고리 "${userCategory}" 기반`);

            const result = await this.geminiAnalyzer.queryGemini(prompt, { model: 'flash' });

            if (!result.success) {
                ServerLogger.error(`❌ AI 재해석 실패: ${result.error}`);
                return [];
            }

            // JSON 파싱
            let cleanedResponse = (result.response || '').trim();
            if (cleanedResponse.includes("```json")) {
                cleanedResponse = cleanedResponse.split("```json")[1].split("```")[0].trim();
            } else if (cleanedResponse.includes("```")) {
                cleanedResponse = cleanedResponse.split("```")[1].split("```")[0].trim();
            }

            const reinterpretedTags = JSON.parse(cleanedResponse);

            if (Array.isArray(reinterpretedTags)) {
                const limitedTags = reinterpretedTags.slice(0, 10); // 최대 10개로 제한
                ServerLogger.info(`✅ AI 재해석 완료: ${limitedTags.length}개 태그 생성`);
                ServerLogger.info(`🏷️ 재해석 태그: ${limitedTags.join(", ")}`);
                return limitedTags;
            } else {
                throw new Error("재해석 결과가 배열이 아님");
            }

        } catch (error) {
            ServerLogger.error(`❌ AI 재해석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            return [];
        }
    }

    /**
     * 채널 정체성 응답 파싱
     */
    private parseChannelIdentityResponse(response: string): {
        targetAudience: string;
        contentStyle: string;
        uniqueFeatures: string[];
        channelPersonality: string;
        channelTags: string[];
    } {
        try {
            let cleanedResponse = response.trim();

            // Remove markdown code blocks if present
            if (cleanedResponse.startsWith("```json")) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.includes("```")) {
                cleanedResponse = cleanedResponse.split("```")[1].split("```")[0].trim();
            }

            const parsed = JSON.parse(cleanedResponse);

            return {
                targetAudience: parsed.targetAudience || '분석 실패',
                contentStyle: parsed.contentStyle || '분석 실패',
                uniqueFeatures: parsed.uniqueFeatures || [],
                channelPersonality: parsed.channelPersonality || '분석 실패',
                channelTags: parsed.channelTags || []
            };

        } catch (error) {
            ServerLogger.error('채널 정체성 응답 파싱 실패:', error);
            return {
                targetAudience: '분석 실패',
                contentStyle: '분석 실패',
                uniqueFeatures: [],
                channelPersonality: '분석 실패',
                channelTags: []
            };
        }
    }

    /**
     * Gemini 건강 상태 확인
     */
    async getGeminiHealthCheck(): Promise<any> {
        return await this.geminiAnalyzer.getHealthCheck();
    }
}

export default AIAnalyzer;
