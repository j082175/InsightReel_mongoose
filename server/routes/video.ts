import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES, API_MESSAGES } from '../config/api-messages';
import { IVideo } from '../types/models';
import VideoModel from '../models/Video';

// Import TypeScript VideoController
import { VideoController } from '../controllers/video-controller';
const videoController = new VideoController();

const router = Router();

// 비디오 처리 메인 엔드포인트
router.post('/process-video', videoController.processVideo);

// 비디오 목록 조회
router.get('/videos', async (req: Request, res: Response) => {
    try {
        ServerLogger.info('📋 비디오 목록 조회 요청 시작');

        // 쿼리 파라미터 파싱
        const {
            limit = '15',
            platform,
            sortBy = 'uploadDate',
            order = 'desc'
        } = req.query;

        const limitNum = parseInt(limit as string, 10);
        const sortOrder = order as 'desc' | 'asc';

        let videos;
        let total = 0;

        if (platform && ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'].includes(platform as string)) {
            // 플랫폼별 조회
            videos = await VideoModel.findByPlatform(
                platform as 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK',
                sortBy as any,
                sortOrder,
                limitNum
            );
            total = await VideoModel.countDocuments({ platform });
        } else {
            // 전체 비디오 조회
            videos = await VideoModel.getRecentVideos(limitNum, sortBy as any, sortOrder);
            total = await VideoModel.countDocuments();
        }

        ServerLogger.info(`✅ 비디오 목록 조회 완료: ${videos.length}개 (전체: ${total}개)`);

        ResponseHandler.success(res, videos, null, {
            total,
            count: videos.length,
            limit: limitNum,
            platform: platform || 'all'
        });
    } catch (error) {
        ServerLogger.error('❌ 비디오 목록 조회 실패:', error);
        ResponseHandler.serverError(res, error, 'Failed to fetch videos');
    }
});

// 업로드 처리 엔드포인트
const upload = require('../middleware/upload');
router.post('/upload', upload.default.single('video'), videoController.processVideoBlob);

// 비디오 통계
router.get('/stats', videoController.getStats);

// 헤더 업데이트
router.post('/update-headers', videoController.updateHeaders);

// 비디오 상세 조회
router.get('/videos/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // TODO: 비디오 상세 조회 로직 구현
        const video: Partial<IVideo> = { _id: id } as any;
        ResponseHandler.success(res, { video });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch video');
    }
});

export default router;