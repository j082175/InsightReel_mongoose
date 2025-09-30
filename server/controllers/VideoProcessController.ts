import { BaseController } from './base/BaseController';
import { VideoUtils } from '../services/video/utils/VideoUtils';
import { ServerLogger } from '../utils/logger';
import { PLATFORMS } from '../config/api-messages';
import { VideoPipelineOrchestrator } from '../services/pipeline/VideoPipelineOrchestrator';
import ErrorHandler from '../middleware/error-handler';
import { DuplicateChecker } from '../shared/utils/DuplicateChecker';
import * as fs from 'fs';

import type {
    VideoProcessRequest,
    VideoProcessResponse,
    VideoMetadata,
    PipelineOptions,
    PipelineResult,
    VideoProcessingResult,
    AnalysisType
} from '../types/controller-types';
import type { Platform } from '../types/video-types';
import { Request, Response } from 'express';

/**
 * 비디오 처리 전용 컨트롤러
 * 책임: URL/파일을 통한 비디오 다운로드, 처리 파이프라인 실행
 */
export class VideoProcessController extends BaseController {

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

        // Map Android analysis types to internal types
        let internalAnalysisType = analysisType;
        if (analysisType === 'video_only' || analysisType === 'both') {
            internalAnalysisType = 'multi-frame';
        }

        // URL 우선순위 처리: videoUrl > postUrl > url
        const finalUrl = videoUrl || postUrl || url;

        ServerLogger.info(
            `Processing ${platform} video: ${finalUrl}`,
            null,
            'VIDEO',
        );
        ServerLogger.info(
            `Analysis type: ${analysisType} (mapped to: ${internalAnalysisType}), AI 분석: ${useAI ? '활성화' : '비활성화'}`,
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

                // 🎯 EARLY DUPLICATE CHECK - Save resources by checking before processing
                if (finalUrl) {
                    const isDuplicate = await DuplicateChecker.checkVideo(finalUrl);
                    if (isDuplicate) {
                        const existingVideo = await DuplicateChecker.getExistingVideo(finalUrl);
                        ServerLogger.info(`⚠️ Video duplicate detected, returning early: ${finalUrl}`, null, 'VIDEO');

                        return {
                            message: 'Video already exists in database',
                            isDuplicate: true,
                            existingVideo: {
                                _id: existingVideo?._id,
                                title: existingVideo?.title,
                                channelName: existingVideo?.channelName,
                                views: existingVideo?.views,
                                platform: existingVideo?.platform,
                                createdAt: existingVideo?.createdAt
                            }
                        };
                    }
                }

                const result = await this.executeVideoProcessingPipeline({
                    platform: detectedPlatform as Platform,
                    videoUrl: finalUrl || '',
                    postUrl: finalUrl || '',
                    metadata,
                    analysisType: internalAnalysisType,
                    useAI,
                    isBlob: false,
                });

                this.updateStats();

                // Debug: API 응답 전 결과 확인
                ServerLogger.info('🔍 API 응답 result 디버그:');
                ServerLogger.info(`analysisContent in result: "${result.analysisContent}"`);
                ServerLogger.info(`duration in result: ${result.duration}`);
                ServerLogger.info(`Full result keys: ${Object.keys(result).join(', ')}`);

                // 메시지를 result 객체에 직접 포함시켜 반환
                return {
                    message: '비디오가 성공적으로 처리되었습니다.',
                    ...result  // Spread the result directly instead of nesting under 'data'
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

        // Map Android analysis types to internal types
        let internalAnalysisType = analysisType;
        if (analysisType === 'video_only' || analysisType === 'both') {
            internalAnalysisType = 'multi-frame';
        }

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
            `🔍 Analysis type: ${analysisType} (mapped to: ${internalAnalysisType}), AI 분석: ${useAI ? '활성화' : '비활성화'}`,
        );

        try {
            const result = await this.executeVideoProcessingPipeline({
                platform: platform as Platform,
                videoPath: file.path,
                postUrl: postUrl || '',
                metadata,
                analysisType: internalAnalysisType,
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
     * 새로운 서비스 기반 아키텍처를 사용하여 체계적으로 처리
     */
    async executeVideoProcessingPipeline(options: PipelineOptions): Promise<VideoProcessingResult> {
        ServerLogger.info('🚀 VideoProcessController: 새로운 파이프라인 아키텍처 실행');

        try {
            // 새로운 파이프라인 오케스트레이터를 통해 처리
            const result = await this.pipelineOrchestrator.execute(options);

            ServerLogger.info('✅ 새로운 파이프라인 아키텍처 완료');
            return result;
        } catch (error) {
            ServerLogger.error('❌ 새로운 파이프라인 실행 실패:', error);
            throw error;
        }
    }

    /**
     * 실패한 파이프라인 정리
     */
    async cleanupFailedPipeline(pipeline: PipelineResult): Promise<void> {
        try {
            // fs is already imported at the top

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