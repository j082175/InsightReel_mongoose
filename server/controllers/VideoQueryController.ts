import { Request, Response } from 'express';
import { BaseController } from './base/BaseController';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import VideoModel from '../models/Video';
import { IVideo } from '../types/models';
const ErrorHandler = require('../middleware/error-handler');

/**
 * 비디오 조회 전용 컨트롤러
 * 책임: 비디오 목록 조회, 검색, 페이지네이션
 */
export class VideoQueryController extends BaseController {

    /**
     * 비디오 목록 조회 (페이지네이션 포함)
     */
    getVideos = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            ServerLogger.info('📋 비디오 목록 조회 요청 시작');

            // 쿼리 파라미터 파싱
            const {
                limit = '50',
                offset = '0',
                platform,
                sortBy = 'uploadDate',
                order = 'desc'
            } = req.query;

            const limitNum = parseInt(limit as string, 10);
            const offsetNum = parseInt(offset as string, 10);
            const sortOrder = order as 'desc' | 'asc';

            let query: any = {};
            if (platform && ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'].includes(platform as string)) {
                query.platform = platform;
            }

            // 전체 개수 조회
            const total = await VideoModel.countDocuments(query);

            // 페이지네이션 적용하여 비디오 조회
            const sortOptions: any = {};
            sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

            const videos = await VideoModel.find(query)
                .sort(sortOptions)
                .skip(offsetNum)
                .limit(limitNum)
                .lean();

            ServerLogger.info(`✅ 비디오 목록 조회 완료: ${videos.length}개 (오프셋: ${offsetNum}, 전체: ${total}개)`);

            // 프론트엔드가 기대하는 형식으로 응답
            const hasMore = offsetNum + videos.length < total;

            ResponseHandler.success(res, { videos }, null, {
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore
                }
            });
        } catch (error) {
            ServerLogger.error('❌ 비디오 목록 조회 실패:', error);
            ResponseHandler.serverError(res, error, 'Failed to fetch videos');
        }
    });

    /**
     * 비디오 상세 조회
     */
    getVideoById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            ServerLogger.info(`📋 비디오 상세 조회 요청: ${id}`);

            const video = await VideoModel.findById(id).lean();

            if (!video) {
                return ResponseHandler.clientError(res, 'Video not found', 404);
            }

            ResponseHandler.success(res, { video });
        } catch (error) {
            ServerLogger.error('❌ 비디오 상세 조회 실패:', error);
            ResponseHandler.serverError(res, error, 'Failed to fetch video');
        }
    });

    /**
     * 최근 비디오 목록 조회 (Sheets 연동)
     */
    getRecentVideos = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const videos = await this.sheetsManager!.getRecentVideos();
        res.json({
            success: true,
            data: videos,
        });
    });
}