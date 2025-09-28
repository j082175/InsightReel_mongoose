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