import { ServerLogger } from '../../utils/logger';
import { VideoProcessor } from '../video/VideoProcessor';
import { AIAnalyzer } from '../ai/AIAnalyzer';
import { SheetsManager } from '../sheets/SheetsManager';
import UnifiedVideoSaver from '../UnifiedVideoSaver';

// Pipeline Services
import { VideoPreparationService } from './preparation/VideoPreparationService';
import { MetadataCollectionService } from './metadata/MetadataCollectionService';
import { ThumbnailProcessingService } from './thumbnail/ThumbnailProcessingService';

import type {
    PipelineOptions,
    PipelineResult,
    VideoProcessingResult,
    VideoMetadata,
    AnalysisResult
} from '../../types/controller-types';

/**
 * 비디오 처리 파이프라인 오케스트레이터
 * 책임: 4단계 파이프라인 조율, 서비스 간 데이터 흐름 관리
 */
export class VideoPipelineOrchestrator {
    private videoProcessor: VideoProcessor;
    private aiAnalyzer: AIAnalyzer;
    private sheetsManager: SheetsManager | null;
    private unifiedVideoSaver: any;
    private sheetsEnabled: boolean;

    // Pipeline Services
    private videoPreparationService: VideoPreparationService;
    private metadataCollectionService: MetadataCollectionService;
    private thumbnailProcessingService: ThumbnailProcessingService;

    constructor(
        videoProcessor: VideoProcessor,
        aiAnalyzer: AIAnalyzer,
        sheetsManager: SheetsManager | null,
        unifiedVideoSaver: any,
        sheetsEnabled: boolean
    ) {
        this.videoProcessor = videoProcessor;
        this.aiAnalyzer = aiAnalyzer;
        this.sheetsManager = sheetsManager;
        this.unifiedVideoSaver = unifiedVideoSaver;
        this.sheetsEnabled = sheetsEnabled;

        // Initialize pipeline services
        this.videoPreparationService = new VideoPreparationService(videoProcessor);
        this.metadataCollectionService = new MetadataCollectionService(videoProcessor);
        this.thumbnailProcessingService = new ThumbnailProcessingService(videoProcessor);
    }

    /**
     * 전체 비디오 처리 파이프라인 실행
     */
    async execute(options: PipelineOptions): Promise<VideoProcessingResult> {
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

        let enrichedMetadata: VideoMetadata = { ...(metadata || {}) };

        try {
            // Debug: 파이프라인 시작점에서 메타데이터 상태 확인
            ServerLogger.info(`🐛 파이프라인 시작 - metadata: ${metadata ? 'defined' : 'undefined'}`);

            // 1단계: 비디오 준비
            const stage1Result = await this.executeStage1_VideoPreparation({
                isBlob,
                videoPath,
                videoUrl,
                postUrl,
                platform,
                metadata: enrichedMetadata
            });

            pipeline.videoPath = stage1Result.videoPath;
            enrichedMetadata = stage1Result.metadata;

            // 2단계: 썸네일 처리 (비디오 다운로드 실패 시에만)
            let stage2Result: { thumbnailPaths: string | string[] | null };

            if (pipeline.videoPath) {
                // 비디오 다운로드 성공: 썸네일 처리 건너뛰기 (AI 분석에서 직접 비디오 사용)
                ServerLogger.info('✅ 비디오 다운로드 성공 - 썸네일 처리 건너뛰기 (비디오에서 직접 분석)');
                stage2Result = { thumbnailPaths: null };
            } else {
                // 비디오 다운로드 실패: 썸네일 처리로 폴백
                ServerLogger.info('❌ 비디오 다운로드 실패 - 썸네일 처리로 폴백');
                stage2Result = await this.executeStage2_ThumbnailProcessing({
                    videoPath: pipeline.videoPath,
                    videoId: stage1Result.videoId,
                    analysisType,
                    metadata: enrichedMetadata,
                    platform
                });
            }

            pipeline.thumbnailPaths = stage2Result.thumbnailPaths;

            // 3단계: AI 분석
            const stage3Result = await this.executeStage3_AIAnalysis({
                useAI,
                analysisType,
                thumbnailPaths: pipeline.thumbnailPaths,
                videoPath: pipeline.videoPath,
                metadata: enrichedMetadata
            });

            pipeline.analysis = stage3Result.analysis;

            // 4단계: 데이터 저장
            await this.executeStage4_DataSaving({
                pipeline,
                metadata: enrichedMetadata,
                platform,
                postUrl
            });

            // 최종 결과 생성
            const result = this.buildFinalResult({
                pipeline,
                metadata: enrichedMetadata,
                analysisType,
                startTime
            });

            const totalTime = Date.now() - startTime;
            ServerLogger.info(`✅ 비디오 처리 파이프라인 완료 (총 소요시간: ${totalTime}ms)`);

            return result;

        } catch (error) {
            const totalTime = Date.now() - startTime;
            ServerLogger.error(`❌ 비디오 처리 파이프라인 실패 (소요시간: ${totalTime}ms):`, error);
            await this.cleanupFailedPipeline(pipeline);
            throw error;
        }
    }

    /**
     * 1단계: 비디오 준비 및 메타데이터 수집
     */
    private async executeStage1_VideoPreparation(options: {
        isBlob?: boolean;
        videoPath?: string;
        videoUrl?: string;
        postUrl: string;
        platform: string;
        metadata: VideoMetadata;
    }): Promise<{ videoPath: string | null; metadata: VideoMetadata; videoId: string }> {
        const stage1StartTime = Date.now();

        // Instagram 메타데이터 보존 (메타데이터가 있을 때만)
        if (options.metadata) {
            ServerLogger.info('📱 메타데이터 수신:', {
                channelName: options.metadata.channelName,
                channelUrl: options.metadata.channelUrl,
                description: options.metadata.description?.substring(0, 50),
                likes: options.metadata.likes,
                commentsCount: options.metadata.commentsCount,
            });
        }

        // 비디오 준비 (다운로드 또는 업로드된 파일 사용)
        const { videoPath, videoId } = await this.videoPreparationService.prepareVideo({
            isBlob: options.isBlob,
            videoPath: options.videoPath,
            videoUrl: options.videoUrl,
            platform: options.platform as any
        });

        // 메타데이터 수집 (URL이 있는 경우에만)
        let enrichedMetadata = options.metadata;
        if (options.videoUrl) {
            enrichedMetadata = await this.metadataCollectionService.collectMetadata({
                platform: options.platform as any,
                postUrl: options.postUrl,
                existingMetadata: options.metadata
            });
        }

        const stage1Time = Date.now() - stage1StartTime;
        ServerLogger.info(`1️⃣ 단계 완료 (소요시간: ${stage1Time}ms)`);

        return {
            videoPath,
            metadata: enrichedMetadata,
            videoId
        };
    }

    /**
     * 2단계: 썸네일 처리
     */
    private async executeStage2_ThumbnailProcessing(options: {
        videoPath: string | null;
        videoId: string;
        analysisType: string;
        metadata: VideoMetadata;
        platform: string;
    }): Promise<{ thumbnailPaths: string | string[] | null }> {
        const stage2StartTime = Date.now();

        const thumbnailPaths = await this.thumbnailProcessingService.processThumbnails({
            videoPath: options.videoPath,
            videoId: options.videoId,
            analysisType: options.analysisType as any,
            metadata: options.metadata,
            platform: options.platform as any
        });

        const stage2Time = Date.now() - stage2StartTime;
        ServerLogger.info(`2️⃣ 단계 완료 (소요시간: ${stage2Time}ms)`);

        return { thumbnailPaths };
    }

    /**
     * 3단계: AI 분석
     */
    private async executeStage3_AIAnalysis(options: {
        useAI: boolean;
        analysisType: string;
        thumbnailPaths: string | string[] | null;
        videoPath: string | null;
        metadata: VideoMetadata;
    }): Promise<{ analysis: AnalysisResult | null }> {
        const stage3StartTime = Date.now();

        if (!options.useAI) {
            ServerLogger.info('3️⃣ AI 분석 건너뛰기 (useAI=false)');
            const defaultAnalysis: AnalysisResult = {
                category: '분석 안함',
                mainCategory: '미분류',
                middleCategory: '기본',
                keywords: [],
                hashtags: [],
                confidence: 0,
                frameCount: 1,
            };
            return { analysis: defaultAnalysis };
        }

        // 비디오 파일 또는 썸네일 중 하나는 있어야 함
        if (!options.thumbnailPaths && !options.videoPath) {
            throw new Error('AI 분석을 위한 썸네일 또는 비디오 파일이 없습니다');
        }

        ServerLogger.info('3️⃣ AI 분석 시작...');

        try {
            let analysisInput: string | string[];

            if (options.videoPath && !options.thumbnailPaths) {
                // 비디오 파일이 있고 썸네일이 없는 경우: 비디오에서 직접 프레임 추출
                ServerLogger.info('🎬 비디오 파일에서 직접 프레임 추출하여 AI 분석');

                // VideoProcessor를 통해 프레임 추출 (analysis type 전달)
                const extractedFrames = await this.videoProcessor.generateThumbnail(options.videoPath, options.analysisType);
                if (!extractedFrames) {
                    throw new Error('비디오 파일에서 프레임 추출 실패');
                }
                analysisInput = extractedFrames;
            } else {
                // 썸네일이 있는 경우 (기존 로직)
                analysisInput = options.thumbnailPaths!;
            }

            const analysis = await this.aiAnalyzer.analyzeVideo(
                analysisInput,
                options.metadata,
                options.analysisType as any
            );

            const stage3Time = Date.now() - stage3StartTime;
            ServerLogger.info(`✅ AI 분석 완료 (소요시간: ${stage3Time}ms)`);

            return { analysis };
        } catch (error) {
            const stage3Time = Date.now() - stage3StartTime;
            ServerLogger.error(`❌ AI 분석 실패 (소요시간: ${stage3Time}ms):`, error);
            throw error;
        }
    }

    /**
     * 4단계: 데이터 저장
     */
    private async executeStage4_DataSaving(options: {
        pipeline: PipelineResult;
        metadata: VideoMetadata;
        platform: string;
        postUrl?: string;
    }): Promise<void> {
        const stage4StartTime = Date.now();
        const { pipeline, metadata, platform, postUrl } = options;

        ServerLogger.info('4️⃣ 데이터 저장 시작...');

        try {
            // Google Sheets 저장 (선택사항)
            await this.saveToGoogleSheets(pipeline, metadata, platform, postUrl);

            // MongoDB 저장
            await this.saveToMongoDB(pipeline, metadata, platform, postUrl);

            const stage4Time = Date.now() - stage4StartTime;
            ServerLogger.info(`✅ 데이터 저장 완료 (소요시간: ${stage4Time}ms)`);
        } catch (error) {
            const stage4Time = Date.now() - stage4StartTime;
            ServerLogger.error(`❌ 데이터 저장 실패 (소요시간: ${stage4Time}ms):`, error);
            throw error;
        }
    }

    /**
     * Google Sheets 데이터 저장
     */
    private async saveToGoogleSheets(
        pipeline: PipelineResult,
        metadata: VideoMetadata,
        platform: string,
        postUrl?: string
    ): Promise<void> {
        ServerLogger.info('📊 구글 시트 저장 중...');

        try {
            // Instagram과 YouTube 메타데이터 처리
            const processedMetadata = { ...metadata };

            // Instagram 채널명이 임시 필드에 있는 경우 표준 필드로 이동
            const tempChannelName = (metadata as any)._instagramAuthor || (metadata as any).instagramAuthor;
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
                    postUrl: postUrl || '',
                    videoPath: pipeline.videoPath!,
                    thumbnailPath: sheetThumbnailPath!,
                    thumbnailPaths: pipeline.thumbnailPaths!,
                    metadata: processedMetadata,
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
                ServerLogger.warn('⚠️ 구글 시트 저장 부분 실패하지만 계속 진행:', sheetsResult.error);
            } else {
                ServerLogger.error('❌ 구글 시트 저장 완전 실패:', sheetsResult.error);
            }
        } catch (error: any) {
            ServerLogger.warn('⚠️ 구글 시트 저장 실패 (무시하고 계속):', error.message, 'VIDEO');
            // 구글 시트 저장 실패는 전체 처리를 중단시키지 않음
        }
    }

    /**
     * MongoDB 데이터 저장
     */
    private async saveToMongoDB(
        pipeline: PipelineResult,
        metadata: VideoMetadata,
        platform: string,
        postUrl?: string
    ): Promise<void> {
        try {
            ServerLogger.info('🗄️ MongoDB 저장 중...');

            const finalThumbnailPath = Array.isArray(pipeline.thumbnailPaths)
                ? (pipeline.thumbnailPaths.length > 0 ? pipeline.thumbnailPaths[0] : undefined)
                : pipeline.thumbnailPaths;

            const mongoResult = await this.unifiedVideoSaver.saveVideoData(platform, {
                postUrl: postUrl || '',
                videoPath: pipeline.videoPath,
                thumbnailPath: finalThumbnailPath,
                metadata: metadata,
                analysis: pipeline.analysis,
                timestamp: new Date().toISOString(),
            });

            if (mongoResult.success) {
                ServerLogger.info('✅ MongoDB 저장 완료');
            } else {
                ServerLogger.warn('⚠️ MongoDB 저장 실패:', mongoResult.error);
            }
        } catch (error: any) {
            ServerLogger.warn('⚠️ MongoDB 저장 실패 (무시하고 계속):', error.message, 'VIDEO');
        }
    }

    /**
     * 최종 결과 생성
     */
    private buildFinalResult(options: {
        pipeline: PipelineResult;
        metadata: VideoMetadata;
        analysisType: string;
        startTime: number;
    }): VideoProcessingResult {
        const { pipeline, metadata, analysisType } = options;

        // 썸네일 경로 정규화
        let thumbnailPath: string | undefined;
        if (pipeline.thumbnailPaths) {
            if (Array.isArray(pipeline.thumbnailPaths)) {
                thumbnailPath = pipeline.thumbnailPaths[0];
            } else {
                thumbnailPath = pipeline.thumbnailPaths;
            }
        }

        // AI 분석 결과에서 필드 추출
        const analysis = pipeline.analysis;
        const originalHashtags = metadata?.hashtags || [];

        const result: VideoProcessingResult = {
            category: analysis?.category || metadata?.mainCategory || '미분류',
            mainCategory: analysis?.mainCategory || metadata?.mainCategory || '기본',
            middleCategory: analysis?.middleCategory || metadata?.middleCategory || '카테고리',
            subCategory: analysis?.subCategory || metadata?.subCategory || '하위',
            detailCategory: analysis?.detailCategory || metadata?.detailCategory || '상세',
            keywords: (analysis?.keywords && analysis.keywords.length > 0) ? analysis.keywords : metadata?.keywords || [],
            hashtags: (analysis?.hashtags && analysis.hashtags.length > 0) ? analysis.hashtags : originalHashtags,
            confidence: typeof analysis?.confidence === 'number' ? Math.round(analysis.confidence * 100) : analysis?.confidence || 0,
            frameCount: analysis?.frameCount || 1,
            analysisType: analysisType as any,
            videoPath: pipeline.videoPath || undefined,
            thumbnailPath: thumbnailPath,
            duration: metadata?.duration || 0,
            analysisContent: analysis?.analysisContent || ''
        };

        // Debug: API 응답 전 결과 확인
        ServerLogger.info('🔍 최종 결과 디버그:');
        ServerLogger.info(`analysisContent: "${result.analysisContent}"`);
        ServerLogger.info(`duration: ${result.duration}`);
        ServerLogger.info(`Full result keys: ${Object.keys(result).join(', ')}`);

        return result;
    }

    /**
     * 실패한 파이프라인 정리
     */
    private async cleanupFailedPipeline(pipeline: PipelineResult): Promise<void> {
        try {
            const fs = require('fs');

            if (pipeline.videoPath && fs.existsSync(pipeline.videoPath)) {
                await fs.promises.unlink(pipeline.videoPath);
                ServerLogger.info(`🗑️ 비디오 파일 정리: ${pipeline.videoPath}`);
            }

            if (pipeline.thumbnailPaths) {
                const paths = Array.isArray(pipeline.thumbnailPaths)
                    ? pipeline.thumbnailPaths
                    : [pipeline.thumbnailPaths];

                for (const path of paths) {
                    if (typeof path === 'string' && fs.existsSync(path)) {
                        await fs.promises.unlink(path);
                        ServerLogger.info(`🗑️ 썸네일 파일 정리: ${path}`);
                    }
                }
            }
        } catch (error) {
            ServerLogger.error('정리 작업 중 오류:', error);
        }
    }
}