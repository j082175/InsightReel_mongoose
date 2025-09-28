import { Response } from 'express';
import { BaseController } from './base/BaseController';
const ErrorHandler = require('../middleware/error-handler');

import type {
    VideoProcessRequest,
    AnalysisResult
} from '../types/controller-types';

/**
 * 디버그 및 테스트 전용 컨트롤러
 * 책임: 파일 업로드 테스트, 디버깅 도구
 */
export class DebugController extends BaseController {

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
}