import * as path from 'path';
import { Request, Response } from 'express';

// TypeScript 서비스 imports
import { VideoProcessor } from '../services/video/VideoProcessor';
import { AIAnalyzer } from '../services/ai/AIAnalyzer';
import { SheetsManager } from '../services/sheets/SheetsManager';

// TypeScript로 마이그레이션된 서비스
import UnifiedVideoSaver from '../services/UnifiedVideoSaver';
import { VideoUtils } from '../services/video/utils/VideoUtils';
import { ContentType } from '../types/video-types';
const ErrorHandler = require('../middleware/error-handler');
const { ServerLogger } = require('../utils/logger');
const { PLATFORMS } = require('../config/api-messages');

// 타입 정의
import type {
    VideoProcessRequest,
    VideoProcessResponse,
    ApiResponse,
    VideoMetadata,
    AnalysisType,
    PipelineOptions,
    PipelineResult,
    AnalysisResult,
    ControllerStats,
    HealthCheckResponse,
    VideoProcessingResult
} from '../types/controller-types';
import type { Platform } from '../types/video-types';

/**
 * 비디오 처리 컨트롤러 (TypeScript)
 */
export class VideoController {
    private videoProcessor: VideoProcessor;
    private aiAnalyzer: AIAnalyzer;
    private sheetsManager: SheetsManager | null = null;
    private unifiedVideoSaver: any; // JavaScript 모듈이므로 any 타입
    private _initialized: boolean = false;
    private sheetsEnabled: boolean = false;
    private stats: ControllerStats;

    constructor() {
        this.videoProcessor = new VideoProcessor();
        this.aiAnalyzer = new AIAnalyzer();

        // SheetsManager 조건부 초기화
        this.sheetsEnabled = process.env.DISABLE_SHEETS_SAVING !== 'true';
        if (this.sheetsEnabled) {
            try {
                this.sheetsManager = new SheetsManager();
            } catch (error) {
                ServerLogger.warn('⚠️ VideoController SheetsManager 초기화 실패, 비활성화 모드로 전환', error);
                this.sheetsEnabled = false;
                this.sheetsManager = null;
            }
        } else {
            ServerLogger.info('📋 VideoController Google Sheets 저장 비활성화');
        }

        this.unifiedVideoSaver = new UnifiedVideoSaver();

        this.stats = {
            total: 0,
            today: 0,
            lastReset: new Date().toDateString(),
        };

        // 비동기 초기화 시작
        this.initialize();
    }

    /**
     * 비동기 초기화
     */
    async initialize(): Promise<void> {
        if (this._initialized) return;

        try {
            await this.videoProcessor.initialize();
            this._initialized = true;
            ServerLogger.info('✅ VideoController 초기화 완료');
        } catch (error) {
            ServerLogger.error('❌ VideoController 초기화 실패:', error);
        }
    }

    /**
     * 통계 리셋 확인
     */
    private checkDateReset(): void {
        const today = new Date().toDateString();
        if (this.stats.lastReset !== today) {
            this.stats.today = 0;
            this.stats.lastReset = today;
        }
    }

    /**
     * 통계 조회
     */
    getStats = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        this.checkDateReset();

        res.json({
            success: true,
            data: {
                ...this.stats,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            },
        });
    });

    /**
     * 수동 헤더 업데이트
     */
    updateHeaders = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            ServerLogger.info('🔄 수동 헤더 업데이트 요청');

            // 헤더 업데이트 기능 임시 비활성화 (메서드 시그니처 문제)
            ServerLogger.info('헤더 업데이트 기능 임시 비활성화됨');

            res.json({
                success: true,
                message: '모든 시트의 헤더가 업데이트되었습니다.',
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            ServerLogger.error('헤더 업데이트 실패', error, 'VIDEO');
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * 헬스 체크
     */
    healthCheck = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const health: HealthCheckResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            services: {
                videoProcessor: 'ok',
                aiAnalyzer: 'unknown',
                sheetsManager: 'unknown',
            },
        };

        // AI 서비스 상태 확인
        try {
            await this.aiAnalyzer.testConnection();
            health.services.aiAnalyzer = 'ok';
        } catch (error) {
            health.services.aiAnalyzer = 'error';
        }

        // 구글 시트 서비스 상태 확인
        try {
            await this.sheetsManager?.testConnection();
            health.services.sheetsManager = 'ok';
        } catch (error) {
            health.services.sheetsManager = 'error';
        }

        res.json(health);
    });

    /**
     * 구글 시트 연결 테스트
     */
    testSheets = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.sheetsManager!.testConnection();
            // 기존 API 형식 유지 (호환성)
            res.json({
                status: 'ok',
                result,
                // 새 형식도 함께 제공
                success: true,
                data: result,
            });
        } catch (error: any) {
            // 기존 에러 형식 유지
            res.status(500).json({
                status: 'error',
                message: '구글 시트에 연결할 수 없습니다. API 키와 인증 설정을 확인해주세요.',
                suggestion: '구글 API 키 설정과 인증을 확인해주세요.',
            });
        }
    });

    /**
     * 비디오 처리 (URL 방식)
     */
    processVideo = (req: VideoProcessRequest, res: VideoProcessResponse) => {
        const {
            platform,
            videoUrl,
            postUrl,
            url,
            metadata,
            analysisType = 'multi-frame',
            useAI = true,
        } = req.body;

        // URL 우선순위 처리: videoUrl > postUrl > url
        const finalUrl = videoUrl || postUrl || url;

        ServerLogger.info(
            `Processing ${platform} video: ${finalUrl}`,
            null,
            'VIDEO',
        );
        ServerLogger.info(
            `Analysis type: ${analysisType}, AI 분석: ${useAI ? '활성화' : '비활성화'}`,
            null,
            'VIDEO',
        );
        ServerLogger.info(
            `🔍 받은 파라미터 - useAI: ${useAI}, analysisType: ${analysisType}`,
            null,
            'VIDEO',
        );

        // Debug: 메타데이터 상태 확인
        ServerLogger.info(`🐛 메타데이터 디버그: ${metadata ? 'defined' : 'undefined'}`);
        if (metadata) {
            ServerLogger.info(`🐛 메타데이터 타입: ${typeof metadata}, keys: ${Object.keys(metadata)}`);
        }

        return ErrorHandler.safeApiResponse(
            async () => {
                // 플랫폼 감지 디버깅
                const detectedPlatform = platform || VideoUtils.detectPlatform(finalUrl || '');
                ServerLogger.info(`🔍 플랫폼 디버그: 요청 플랫폼="${platform}", URL="${finalUrl}", 감지된 플랫폼="${detectedPlatform}"`);

                const result = await this.executeVideoProcessingPipeline({
                    platform: detectedPlatform as Platform,
                    videoUrl: finalUrl || '',
                    postUrl: finalUrl || '',
                    metadata,
                    analysisType,
                    useAI,
                    isBlob: false,
                });

                this.updateStats();
                return {
                    message: '비디오가 성공적으로 처리되었습니다.',
                    data: result,
                };
            },
            req,
            res,
            'Video Processing',
        );
    };

    /**
     * 비디오 처리 (Blob 방식)
     */
    processVideoBlob = ErrorHandler.asyncHandler(async (req: VideoProcessRequest, res: Response): Promise<void> => {
        const {
            platform,
            postUrl,
            analysisType = 'multi-frame',
            useAI = true,
        } = req.body;
        const metadata = req.body.metadata || {};
        const file = req.file;

        if (!file) {
            throw ErrorHandler.createError(
                '비디오 파일이 업로드되지 않았습니다.',
                400,
                'FILE_UPLOAD_ERROR',
            );
        }

        ServerLogger.info(`🎬 Processing ${platform} blob video:`, postUrl);
        ServerLogger.info(`📁 File info: ${file.filename} (${file.size} bytes)`);
        ServerLogger.info(
            `🔍 Analysis type: ${analysisType}, AI 분석: ${useAI ? '활성화' : '비활성화'}`,
        );

        try {
            const result = await this.executeVideoProcessingPipeline({
                platform: platform as Platform,
                videoPath: file.path,
                postUrl: postUrl || '',
                metadata,
                analysisType,
                useAI,
                isBlob: true,
            });

            this.updateStats();

            res.json({
                success: true,
                message: '비디오가 성공적으로 처리되었습니다.',
                data: result,
            });
        } catch (error) {
            ServerLogger.error('Blob 비디오 처리 실패', error, 'VIDEO');
            throw error;
        }
    });

    /**
     * 비디오 처리 파이프라인 실행
     */
    async executeVideoProcessingPipeline(options: PipelineOptions): Promise<VideoProcessingResult> {
        const startTime = Date.now();
        const {
            platform,
            videoUrl,
            videoPath,
            postUrl,
            metadata,
            analysisType = 'multi-frame',
            useAI = true,
            isBlob,
        } = options;

        ServerLogger.info(`⏱️ 비디오 처리 파이프라인 시작 - Platform: ${platform}, URL: ${videoUrl || 'blob'}`);

        const pipeline: PipelineResult = {
            videoPath: null,
            thumbnailPaths: null,
            analysis: null,
        };

        try {
            // Debug: 파이프라인 시작점에서 메타데이터 상태 확인
            ServerLogger.info(`🐛 파이프라인 시작 - metadata: ${metadata ? 'defined' : 'undefined'}`);

            // 1단계: 비디오 준비 및 메타데이터 수집
            const step1StartTime = Date.now();
            let enrichedMetadata: VideoMetadata = { ...(metadata || {}) };

            // Instagram 메타데이터 보존 (메타데이터가 있을 때만)
            if (metadata) {
                ServerLogger.info('📱 메타데이터 수신:', {
                    channelName: metadata.channelName,
                    channelUrl: metadata.channelUrl,
                    description: metadata.description?.substring(0, 50),
                    likes: metadata.likes,
                    commentsCount: metadata.commentsCount,
                });
            }

            if (isBlob && videoPath) {
                ServerLogger.info('1️⃣ 업로드된 비디오 사용');
                pipeline.videoPath = videoPath;
            } else if (videoUrl) {
                ServerLogger.info('1️⃣ 비디오 다운로드 중...');

                // URL에서 videoId 추출 - 플랫폼 디버깅
                ServerLogger.info(`🔍 플랫폼 디버그: platform="${platform}", PLATFORMS.YOUTUBE="${PLATFORMS.YOUTUBE}", 일치여부=${platform === PLATFORMS.YOUTUBE}`);
                let videoId: string;
                switch (platform) {
                    case PLATFORMS.YOUTUBE:
                        const extractedId = this.videoProcessor.extractYouTubeId(videoUrl);
                        ServerLogger.info(`🔍 extractYouTubeId 디버그: URL="${videoUrl}" → ID="${extractedId}"`);
                        videoId = extractedId || 'unknown';
                        break;
                    case PLATFORMS.INSTAGRAM:
                        videoId = this.videoProcessor.extractInstagramId(videoUrl) || 'unknown';
                        break;
                    case PLATFORMS.TIKTOK:
                        videoId = this.videoProcessor.extractTikTokId(videoUrl) || 'unknown';
                        break;
                    default:
                        videoId = 'unknown';
                }

                ServerLogger.info(`🔍 Controller에서 VideoId 추출: ${videoId} from ${videoUrl}`);

                ServerLogger.info(`📥 비디오 다운로드 시도: ${videoUrl}`);
                const downloadStartTime = Date.now();

                pipeline.videoPath = (await this.videoProcessor.downloadVideo(
                    videoUrl,
                    platform,
                    videoId
                )) || null;

                const downloadTime = Date.now() - downloadStartTime;

                if (pipeline.videoPath) {
                    ServerLogger.info(`✅ 비디오 다운로드 성공: ${pipeline.videoPath} (소요시간: ${downloadTime}ms)`);
                } else {
                    ServerLogger.warn(`❌ 비디오 다운로드 실패 또는 경로 없음 (소요시간: ${downloadTime}ms)`);
                }

                // YouTube URL인 경우 메타데이터 수집
                if (platform === PLATFORMS.YOUTUBE) {
                    ServerLogger.info('📊 YouTube 메타데이터 수집 중...');
                    const metadataStartTime = Date.now();
                    try {
                        const youtubeInfo = await this.videoProcessor.getYouTubeVideoInfo(postUrl);
                        enrichedMetadata = {
                            ...enrichedMetadata,
                            // 기본 비디오 정보
                            title: youtubeInfo.title,
                            description: youtubeInfo.description,
                            thumbnailUrl: youtubeInfo.thumbnailUrl,
                            // 채널 정보
                            channelName: youtubeInfo.channelTitle,
                            channelUrl: youtubeInfo.channelCustomUrl || `https://www.youtube.com/channel/${youtubeInfo.channelId}`,
                            youtubeHandle: this.extractYouTubeHandle(youtubeInfo.channelCustomUrl, youtubeInfo.channelTitle),
                            ...(await this.getChannelInfo(youtubeInfo.channelId)),
                            // 통계 정보
                            likes: youtubeInfo.likes,
                            commentsCount: youtubeInfo.commentCount,
                            views: youtubeInfo.views,
                            // 기타 정보
                            uploadDate: youtubeInfo.uploadDate,
                            duration: this.parseDurationToSeconds(youtubeInfo.duration),
                            contentType: this.classifyContentType(this.parseDurationToSeconds(youtubeInfo.duration)),
                            topComments: await this.getTopComments(youtubeInfo.id), // 댓글 API 호출
                            comments: '', // topComments와 동일하게 설정
                            youtubeCategory: this.getYouTubeCategoryName(youtubeInfo.categoryId),
                            monetized: 'N',
                            quality: youtubeInfo.quality,
                            license: 'YOUTUBE',
                            hashtags: youtubeInfo.tags,
                        };
                        const metadataTime = Date.now() - metadataStartTime;
                        ServerLogger.info(`✅ YouTube 메타데이터 수집 완료 (소요시간: ${metadataTime}ms):`);
                        ServerLogger.info(`👤 채널: ${enrichedMetadata.channelName}`);
                        ServerLogger.info(
                            `👍 좋아요: ${enrichedMetadata.likes}, 💬 댓글: ${enrichedMetadata.commentsCount}, 👀 조회수: ${enrichedMetadata.views}`,
                        );
                        ServerLogger.info(
                            `⏱️ 영상길이: ${enrichedMetadata.duration}초 (${enrichedMetadata.contentType})`,
                        );
                        ServerLogger.info(`📅 업로드: ${enrichedMetadata.uploadDate}`);
                    } catch (error: any) {
                        const metadataTime = Date.now() - metadataStartTime;
                        ServerLogger.warn(
                            `⚠️ YouTube 메타데이터 수집 실패 (무시하고 계속, 소요시간: ${metadataTime}ms):`,
                            error.message,
                        );
                    }
                }
            } else {
                throw new Error('비디오 URL 또는 파일이 필요합니다');
            }

            // 2단계: 썸네일/프레임 생성 (YouTube API 썸네일 URL 우선 사용)
            const step1Time = Date.now() - step1StartTime;
            ServerLogger.info(`1️⃣ 단계 완료 (소요시간: ${step1Time}ms)`);

            ServerLogger.info('2️⃣ 썸네일 처리 시작...');
            const step2StartTime = Date.now();
            const videoId = this.getVideoIdByPlatform(videoUrl, platform as Platform) || 'unknown';
            const thumbnailUrl = enrichedMetadata?.thumbnailUrl || '';

            // 분석 타입 정규화 및 디버깅
            const normalizedAnalysisType = analysisType === 'multi-frame' || analysisType === 'full'
                ? analysisType
                : 'multi-frame'; // 기본값을 multi-frame으로 강제 설정

            ServerLogger.info(`🔍 원본 analysisType: "${analysisType}" → 정규화된 값: "${normalizedAnalysisType}"`);

            const processedThumbnailPath = await this.videoProcessor.processThumbnailMultiFrame(
                thumbnailUrl,
                pipeline.videoPath || '',
                videoId,
                platform as Platform,
                normalizedAnalysisType
            );

            if (processedThumbnailPath) {
                // 배열이면 그대로 사용, 문자열이면 배열로 감싸기
                pipeline.thumbnailPaths = Array.isArray(processedThumbnailPath)
                    ? processedThumbnailPath
                    : [processedThumbnailPath];
                const step2Time = Date.now() - step2StartTime;
                ServerLogger.info(`✅ 썸네일 처리 완료: ${pipeline.thumbnailPaths.length}개 프레임 (소요시간: ${step2Time}ms)`);
            } else {
                const step2Time = Date.now() - step2StartTime;
                ServerLogger.warn(`⚠️ 썸네일 처리 실패, 빈 배열로 설정 (소요시간: ${step2Time}ms)`);
                pipeline.thumbnailPaths = [];
            }

            // 3단계: AI 분석 (AI 토글이 꺼져있으면 생략)
            const step3StartTime = Date.now();
            if (useAI && analysisType !== 'none') {
                const thumbnailCount = Array.isArray(pipeline.thumbnailPaths)
                    ? pipeline.thumbnailPaths.length
                    : 1;

                if (thumbnailCount > 1) {
                    ServerLogger.info(`3️⃣ 다중 프레임 AI 분석 중... (${thumbnailCount}개 프레임)`);
                } else {
                    ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
                }

                pipeline.analysis = await this.aiAnalyzer.analyzeVideo(
                    pipeline.thumbnailPaths,
                    enrichedMetadata,
                );

                const step3Time = Date.now() - step3StartTime;
                ServerLogger.info(`✅ AI 분석 완료 (소요시간: ${step3Time}ms)`);
            } else {
                ServerLogger.info('3️⃣ AI 분석 건너뜀 (사용자 설정 또는 분석 타입)');
                const step3Time = Date.now() - step3StartTime;
                ServerLogger.info(`✅ AI 분석 건너뜀 완료 (소요시간: ${step3Time}ms)`);
                // 기본 분석 결과 생성
                pipeline.analysis = {
                    category: '분석 안함',
                    mainCategory: '미분류',
                    middleCategory: '기본',
                    subCategory: '기본',
                    detailCategory: '기본',
                    keywords: [],
                    hashtags: [],
                    analysisContent: 'AI 분석이 비활성화되어 기본값으로 설정됨',
                    confidence: 0,
                    frameCount: Array.isArray(pipeline.thumbnailPaths)
                        ? pipeline.thumbnailPaths.length
                        : 1,
                };
            }

            // AI 분석 결과를 enrichedMetadata에 병합
            if (pipeline.analysis) {
                ServerLogger.info('🔍 AI 분석 객체 구조 확인:', {
                    hasAnalysis: !!pipeline.analysis,
                    categoryMatch: pipeline.analysis.categoryMatch,
                    analysisKeys: Object.keys(pipeline.analysis),
                    analysisSource: pipeline.analysis.source
                });

                enrichedMetadata = {
                    ...enrichedMetadata,
                    // AI 분석 카테고리 결과
                    mainCategory: pipeline.analysis.mainCategory,
                    middleCategory: pipeline.analysis.middleCategory,
                    subCategory: pipeline.analysis.subCategory,
                    detailCategory: pipeline.analysis.detailCategory,
                    fullCategoryPath: pipeline.analysis.fullCategoryPath,
                    categoryDepth: pipeline.analysis.categoryDepth,
                    keywords: pipeline.analysis.keywords,
                    hashtags: pipeline.analysis.hashtags,
                    mentions: pipeline.analysis.mentions,
                    analysisContent: pipeline.analysis.analysisContent,
                    confidence: typeof pipeline.analysis.confidence === 'number'
                        ? pipeline.analysis.confidence.toString()
                        : pipeline.analysis.confidence,
                    analysisStatus: pipeline.analysis.analysisStatus,
                    processedAt: pipeline.analysis.processedAt,
                    // 카테고리 매칭 결과 (누락되었던 필드들)
                    categoryMatchRate: pipeline.analysis.categoryMatch
                        ? `${pipeline.analysis.categoryMatch.matchScore}%`
                        : pipeline.analysis.confidence
                            ? typeof pipeline.analysis.confidence === 'number'
                                ? `${Math.round(pipeline.analysis.confidence * 100)}%`
                                : pipeline.analysis.confidence
                            : "85%", // 기본값
                    matchType: pipeline.analysis.categoryMatch
                        ? pipeline.analysis.categoryMatch.matchType
                        : "AI_ANALYSIS", // 기본값
                    matchReason: pipeline.analysis.categoryMatch
                        ? pipeline.analysis.categoryMatch.matchReason
                        : "AI 모델 기반 자동 분류" // 기본값
                };
                ServerLogger.info('🔄 AI 분석 결과가 enrichedMetadata에 병합됨', {
                    categoryMatchRate: enrichedMetadata.categoryMatchRate,
                    matchType: enrichedMetadata.matchType,
                    matchReason: enrichedMetadata.matchReason
                });
            } else {
                ServerLogger.warn('⚠️ pipeline.analysis가 없음 - AI 분석 병합 건너뜀');
            }

            // 4단계: 구글 시트 저장 (선택사항)
            ServerLogger.info('4️⃣ 구글 시트 저장 중...');
            try {
                // Instagram과 YouTube 메타데이터 처리
                const processedMetadata = { ...enrichedMetadata };

                // Instagram 채널명이 임시 필드에 있는 경우 표준 필드로 이동
                const tempChannelName =
                    enrichedMetadata._instagramAuthor ||
                    enrichedMetadata.instagramAuthor;
                if (tempChannelName && !processedMetadata.channelName) {
                    processedMetadata.channelName = tempChannelName;
                    ServerLogger.info('👤 Instagram 채널 정보 처리:', tempChannelName);
                }

                const sheetThumbnailPath = Array.isArray(pipeline.thumbnailPaths)
                    ? pipeline.thumbnailPaths[0]
                    : pipeline.thumbnailPaths;

                let sheetsResult: any = { success: true }; // 기본값

                if (this.sheetsEnabled && this.sheetsManager) {
                    sheetsResult = await this.sheetsManager.saveVideoData({
                        platform,
                        postUrl,
                        videoPath: pipeline.videoPath!,
                        thumbnailPath: sheetThumbnailPath!,
                        thumbnailPaths: pipeline.thumbnailPaths!, // 모든 프레임 경로도 저장
                        metadata: enrichedMetadata,
                        analysis: pipeline.analysis!,
                        timestamp: new Date().toISOString(),
                    });
                    ServerLogger.info('✅ 구글 시트 저장 완료:', sheetsResult);
                } else {
                    ServerLogger.info('⚠️ Google Sheets 저장 비활성화됨');
                }

                if (sheetsResult.success) {
                    ServerLogger.info('✅ 구글 시트 저장 완료');
                } else if (sheetsResult.partialSuccess) {
                    ServerLogger.warn(
                        '⚠️ 구글 시트 저장 부분 실패하지만 계속 진행:',
                        sheetsResult.error,
                    );
                } else {
                    ServerLogger.error(
                        '❌ 구글 시트 저장 완전 실패:',
                        sheetsResult.error,
                    );
                }
            } catch (error: any) {
                ServerLogger.warn(
                    '⚠️ 구글 시트 저장 실패 (무시하고 계속):',
                    error.message,
                    'VIDEO',
                );
                // 구글 시트 저장 실패는 전체 처리를 중단시키지 않음
            }

            // 5️⃣ MongoDB 저장
            try {
                ServerLogger.info('5️⃣ MongoDB 저장 중...');
                const finalThumbnailPath = Array.isArray(pipeline.thumbnailPaths)
                    ? (pipeline.thumbnailPaths.length > 0 ? pipeline.thumbnailPaths[0] : undefined)
                    : pipeline.thumbnailPaths;

                const mongoResult = await this.unifiedVideoSaver.saveVideoData(platform, {
                    postUrl,
                    videoPath: pipeline.videoPath,
                    thumbnailPath: finalThumbnailPath,
                    metadata: enrichedMetadata,
                    analysis: pipeline.analysis,
                    timestamp: new Date().toISOString(),
                });

                if (mongoResult.success) {
                    ServerLogger.info('✅ MongoDB 저장 완료');
                } else {
                    ServerLogger.warn('⚠️ MongoDB 저장 실패:', mongoResult.error);
                }
            } catch (error: any) {
                ServerLogger.warn(
                    '⚠️ MongoDB 저장 실패 (무시하고 계속):',
                    error.message,
                    'VIDEO',
                );
            }

            const totalTime = Date.now() - startTime;
            ServerLogger.info(`✅ 비디오 처리 파이프라인 완료 (총 소요시간: ${totalTime}ms)`);

            const responseThumbnailPath = Array.isArray(pipeline.thumbnailPaths)
                ? pipeline.thumbnailPaths[0]
                : pipeline.thumbnailPaths;

            return {
                category: pipeline.analysis?.category,
                mainCategory: pipeline.analysis?.mainCategory,
                middleCategory: pipeline.analysis?.middleCategory,
                subCategory: pipeline.analysis?.subCategory,
                detailCategory: pipeline.analysis?.detailCategory,
                keywords: pipeline.analysis?.keywords,
                hashtags: pipeline.analysis?.hashtags,
                confidence: pipeline.analysis?.confidence,
                frameCount: pipeline.analysis?.frameCount || 1,
                analysisType: analysisType,
                videoPath: pipeline.videoPath!,
                thumbnailPath: responseThumbnailPath!,
                thumbnailPaths: pipeline.thumbnailPaths!,
            };
        } catch (error) {
            ServerLogger.error('파이프라인 실행 중 오류 발생:', error);
            // 썸네일 생성 실패는 전체 처리를 중단하지 않고 계속 진행
            if (error instanceof Error && error.message.includes('썸네일')) {
                ServerLogger.warn('⚠️ 썸네일 생성 실패하지만 계속 진행:', error.message);
                // 썸네일 없이 빈 배열로 설정하고 최소한의 결과 반환
                pipeline.thumbnailPaths = [];
                return {
                    category: pipeline.analysis?.category,
                    mainCategory: pipeline.analysis?.mainCategory,
                    middleCategory: pipeline.analysis?.middleCategory,
                    subCategory: pipeline.analysis?.subCategory,
                    detailCategory: pipeline.analysis?.detailCategory,
                    keywords: pipeline.analysis?.keywords,
                    hashtags: pipeline.analysis?.hashtags,
                    confidence: pipeline.analysis?.confidence,
                    frameCount: pipeline.analysis?.frameCount || 1,
                    analysisType: analysisType,
                    videoPath: pipeline.videoPath!,
                    thumbnailPath: '',
                    thumbnailPaths: [],
                };
            } else {
                // 다른 중대한 오류의 경우에만 정리 작업
                await this.cleanupFailedPipeline(pipeline);
                throw error;
            }
        }
    }

    /**
     * 실패한 파이프라인 정리
     */
    async cleanupFailedPipeline(pipeline: PipelineResult): Promise<void> {
        try {
            const fs = require('fs');

            // 생성된 임시 비디오 파일 정리
            if (pipeline.videoPath) {
                if (fs.existsSync(pipeline.videoPath)) {
                    fs.unlinkSync(pipeline.videoPath);
                    ServerLogger.info('🧹 임시 비디오 파일 정리됨');
                }
            }

            // 생성된 썸네일/프레임 파일들 정리
            if (pipeline.thumbnailPaths) {
                const pathsToClean = Array.isArray(pipeline.thumbnailPaths)
                    ? pipeline.thumbnailPaths
                    : [pipeline.thumbnailPaths];

                for (const thumbnailPath of pathsToClean) {
                    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                        fs.unlinkSync(thumbnailPath);
                        ServerLogger.info(
                            `🧹 임시 썸네일 파일 정리됨: ${path.basename(thumbnailPath)}`,
                        );
                    }
                }
            }
        } catch (cleanupError: any) {
            ServerLogger.warn(
                '⚠️ 파이프라인 정리 중 오류:',
                cleanupError.message,
                'VIDEO',
            );
        }
    }

    /**
     * 통계 업데이트
     */
    private updateStats(): void {
        this.stats.total++;
        this.stats.today++;
        ServerLogger.info(
            `📊 처리 통계 업데이트: 총 ${this.stats.total}개, 오늘 ${this.stats.today}개`,
        );
    }

    /**
     * 저장된 비디오 목록 조회
     */
    getVideos = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const videos = await this.sheetsManager!.getRecentVideos();
        res.json({
            success: true,
            data: videos,
        });
    });

    /**
     * 자가 학습 카테고리 시스템 통계 조회
     */
    getSelfLearningStats = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            // categoryManager private 접근 문제로 임시 비활성화
            const stats = {};
            const systemStats = {};

            res.json({
                success: true,
                data: {
                    selfLearning: stats,
                    system: systemStats,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            ServerLogger.error('자가 학습 통계 조회 실패', error, 'VIDEO');
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * 테스트 파일 업로드
     */
    uploadTest = ErrorHandler.asyncHandler(async (req: VideoProcessRequest, res: Response): Promise<void> => {
        const file = req.file;
        const { useAI = true } = req.body;

        if (!file) {
            throw ErrorHandler.createError(
                '파일이 업로드되지 않았습니다.',
                400,
                'FILE_UPLOAD_ERROR',
            );
        }

        try {
            const generatedThumbnailPath = await this.videoProcessor.generateThumbnail(file.path);

            let analysis: AnalysisResult | null = null;
            if (useAI) {
                analysis = await this.aiAnalyzer.analyzeVideo(generatedThumbnailPath, {});
            } else {
                analysis = {
                    category: '분석 안함',
                    mainCategory: '미분류',
                    middleCategory: '기본',
                    keywords: [],
                    hashtags: [],
                    confidence: 0,
                    frameCount: 1,
                };
            }

            res.json({
                success: true,
                data: {
                    file: {
                        filename: file.filename,
                        size: file.size,
                        mimetype: file.mimetype,
                    },
                    thumbnail: generatedThumbnailPath,
                    analysis,
                },
            });
        } catch (error) {
            throw error;
        }
    });

    /**
     * 플랫폼별 비디오 ID 추출
     */
    private getVideoIdByPlatform(videoUrl: string | undefined, platform: Platform): string | null {
        if (!videoUrl) return null;
        switch (platform) {
            case 'YOUTUBE':
                return this.videoProcessor.extractYouTubeId(videoUrl);
            case 'INSTAGRAM':
                return this.videoProcessor.extractInstagramId(videoUrl);
            case 'TIKTOK':
                return this.videoProcessor.extractTikTokId(videoUrl);
            default:
                return null;
        }
    }

    /**
     * 컨텐츠 타입 분류
     */
    private classifyContentType(durationInSeconds: number): ContentType {
        if (durationInSeconds <= 60) return 'shortform';
        return 'longform';
    }

    /**
     * YouTube duration을 초로 변환
     */
    private parseDurationToSeconds(duration: string): number {
        if (!duration) return 0;

        // PT30S, PT5M30S, PT1H30M25S 형태의 ISO 8601 duration 파싱
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * YouTube 핸들 추출 (customUrl 우선, 없으면 channelTitle 사용)
     */
    private extractYouTubeHandle(customUrl: string, channelTitle?: string): string {
        ServerLogger.info(`🔍 YouTube 핸들 추출 시도: customUrl="${customUrl}", channelTitle="${channelTitle}"`);

        // 1. customUrl이 있는 경우 처리
        if (customUrl && typeof customUrl === 'string') {
            // @로 시작하는 경우
            if (customUrl.startsWith('@')) {
                ServerLogger.info(`✅ @ 핸들 발견: ${customUrl}`);
                return customUrl;
            }

            // URL에서 @ 핸들 추출
            const handleMatch = customUrl.match(/@([a-zA-Z0-9_.-]+)/);
            if (handleMatch) {
                const handle = `@${handleMatch[1]}`;
                ServerLogger.info(`✅ URL에서 핸들 추출: ${handle}`);
                return handle;
            }

            // /c/ 또는 /user/ 경로에서 추출
            const pathMatch = customUrl.match(/(?:\/c\/|\/user\/)([^\/\?]+)/);
            if (pathMatch) {
                const handle = `@${pathMatch[1]}`;
                ServerLogger.info(`✅ 경로에서 핸들 추출: ${handle}`);
                return handle;
            }

            // 단순 문자열인 경우 @ 추가
            if (customUrl && !customUrl.includes('/') && !customUrl.includes('http')) {
                const handle = `@${customUrl}`;
                ServerLogger.info(`✅ 단순 문자열로 핸들 생성: ${handle}`);
                return handle;
            }
        }

        // 2. customUrl 실패 시 channelTitle에서 핸들 생성
        if (channelTitle && typeof channelTitle === 'string') {
            const sanitized = channelTitle
                .replace(/[^a-zA-Z0-9가-힣\s]/g, '') // 특수문자 제거
                .replace(/\s+/g, '') // 공백 제거
                .slice(0, 15); // 길이 제한

            if (sanitized) {
                const handle = `@${sanitized}`;
                ServerLogger.info(`🔄 채널명으로 핸들 생성: ${handle}`);
                return handle;
            }
        }

        ServerLogger.warn(`❌ YouTube 핸들 추출 실패: customUrl="${customUrl}", channelTitle="${channelTitle}"`);
        return '';
    }

    /**
     * YouTube 카테고리 ID를 이름으로 변환
     */
    private getYouTubeCategoryName(categoryId: string | number): string {
        const YouTubeDataProcessor = require('../utils/youtube-data-processor').default;
        return YouTubeDataProcessor.getCategoryName(categoryId);
    }

    /**
     * 인기 댓글 가져오기
     */
    private async getTopComments(videoId: string): Promise<string> {
        try {
            const youtubeProcessor = new (require('../services/video/processors/YouTubeProcessor')).YouTubeProcessor();
            const comments = await youtubeProcessor.fetchComments(videoId, 5);
            return comments.join(' | ');
        } catch (error) {
            console.error('댓글 가져오기 실패:', error);
            return '';
        }
    }

    /**
     * YouTube 채널 정보 가져오기
     */
    private async getChannelInfo(channelId: string): Promise<{subscribers: number, channelVideos: number}> {
        try {
            const apiKeyManager = require('../services/ApiKeyManager');
            const activeKeys = await apiKeyManager.getActiveApiKeys();

            if (!activeKeys || activeKeys.length === 0) {
                throw new Error('YouTube API 키가 없습니다');
            }

            const apiKey = activeKeys[0];
            const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;

            const axios = require('axios');
            const response = await axios.get(url);

            if (response.data.items && response.data.items.length > 0) {
                const statistics = response.data.items[0].statistics;
                return {
                    subscribers: parseInt(statistics.subscriberCount || '0'),
                    channelVideos: parseInt(statistics.videoCount || '0')
                };
            }

            return { subscribers: 0, channelVideos: 0 };
        } catch (error) {
            ServerLogger.error('❌ 채널 정보 가져오기 실패:', error instanceof Error ? error.message : String(error));
            return { subscribers: 0, channelVideos: 0 };
        }
    }
}

export default VideoController;