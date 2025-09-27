import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES, API_MESSAGES } from '../config/api-messages';
import { IVideo } from '../types/models';

// Import existing JavaScript VideoController
const VideoController = require('../controllers/video-controller');
const videoController = new VideoController();

const router = Router();

// 비디오 처리 메인 엔드포인트
router.post('/process-video', videoController.processVideo);

// 비디오 목록 조회
router.get('/videos', async (req: Request, res: Response) => {
    try {
        // TODO: 비디오 목록 조회 로직 구현 (MongoDB Video 모델 사용)
        const videos: IVideo[] = [];
        ResponseHandler.success(res, { videos });
    } catch (error) {
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