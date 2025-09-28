import { ServerLogger } from '../../utils/logger';
import { VideoProcessor } from '../video/VideoProcessor';
import { AIAnalyzer } from '../ai/AIAnalyzer';
import { SheetsManager } from '../sheets/SheetsManager';
import UnifiedVideoSaver from '../UnifiedVideoSaver';

import type {
    PipelineOptions,
    PipelineResult,
    VideoProcessingResult,
    VideoMetadata
} from '../../types/controller-types';

/**
 * 비디오 처리 파이프라인 서비스
 * 책임: 4단계 비디오 처리 플로우 관리
 */
export class VideoPipelineService {
    private videoProcessor: VideoProcessor;
    private aiAnalyzer: AIAnalyzer;
    private sheetsManager: SheetsManager | null;
    private unifiedVideoSaver: any;
    private sheetsEnabled: boolean;

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
            // 1단계: 비디오 준비 및 메타데이터 수집
            const { videoPath: preparedVideoPath, metadata: collectedMetadata } =
                await this.executeStage1_VideoPreparation({
                    platform,
                    videoUrl,
                    videoPath,
                    postUrl,
                    isBlob,
                    metadata: enrichedMetadata
                });

            pipeline.videoPath = preparedVideoPath;
            enrichedMetadata = collectedMetadata;

            // 2단계: 썸네일/프레임 생성
            const thumbnailPaths = await this.executeStage2_ThumbnailGeneration({
                platform,
                videoPath: pipeline.videoPath,
                analysisType,
                metadata: enrichedMetadata
            });

            pipeline.thumbnailPaths = thumbnailPaths;

            // 3단계: AI 분석
            const analysisResult = await this.executeStage3_AIAnalysis({
                useAI,
                analysisType,
                thumbnailPaths: pipeline.thumbnailPaths,
                metadata: enrichedMetadata
            });

            pipeline.analysis = analysisResult;

            // 4단계: 데이터 저장
            await this.executeStage4_DataSaving({
                pipeline,
                metadata: enrichedMetadata,
                platform
            });

            // 최종 결과 생성
            const result = this.buildFinalResult({
                pipeline,
                metadata: enrichedMetadata,
                analysisType,
                startTime
            });

            ServerLogger.info(`✅ 비디오 처리 파이프라인 완료 (소요시간: ${Date.now() - startTime}ms)`);
            return result;

        } catch (error) {
            ServerLogger.error('❌ 비디오 처리 파이프라인 실패:', error);
            await this.cleanupFailedPipeline(pipeline);
            throw error;
        }
    }

    /**
     * 1단계: 비디오 준비 및 메타데이터 수집
     */
    private async executeStage1_VideoPreparation(options: {
        platform: string;
        videoUrl?: string;
        videoPath?: string;
        postUrl: string;
        isBlob?: boolean;
        metadata: VideoMetadata;
    }): Promise<{ videoPath: string | null; metadata: VideoMetadata }> {
        // 이 메서드는 원본 코드의 1단계 로직을 구현할 예정
        // 현재는 임시 구현
        throw new Error('Stage 1 구현 예정');
    }

    /**
     * 2단계: 썸네일/프레임 생성
     */
    private async executeStage2_ThumbnailGeneration(options: {
        platform: string;
        videoPath: string | null;
        analysisType: string;
        metadata: VideoMetadata;
    }): Promise<string[] | string | null> {
        // 이 메서드는 원본 코드의 2단계 로직을 구현할 예정
        throw new Error('Stage 2 구현 예정');
    }

    /**
     * 3단계: AI 분석
     */
    private async executeStage3_AIAnalysis(options: {
        useAI: boolean;
        analysisType: string;
        thumbnailPaths: string[] | string | null;
        metadata: VideoMetadata;
    }): Promise<any> {
        // 이 메서드는 원본 코드의 3단계 로직을 구현할 예정
        throw new Error('Stage 3 구현 예정');
    }

    /**
     * 4단계: 데이터 저장
     */
    private async executeStage4_DataSaving(options: {
        pipeline: PipelineResult;
        metadata: VideoMetadata;
        platform: string;
    }): Promise<void> {
        // 이 메서드는 원본 코드의 4단계 로직을 구현할 예정
        throw new Error('Stage 4 구현 예정');
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
        // 이 메서드는 최종 결과 객체를 생성할 예정
        throw new Error('Final result 구현 예정');
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