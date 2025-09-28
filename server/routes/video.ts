import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES, API_MESSAGES } from '../config/api-messages';
import { IVideo } from '../types/models';
import VideoModel from '../models/Video';

// Import new focused controllers
import { VideoProcessController } from '../controllers/VideoProcessController';
import { VideoQueryController } from '../controllers/VideoQueryController';
import { SystemStatsController } from '../controllers/SystemStatsController';
import { AdminController } from '../controllers/AdminController';

// Initialize controllers
const videoProcessController = new VideoProcessController();
const videoQueryController = new VideoQueryController();
const systemStatsController = new SystemStatsController();
const adminController = new AdminController();

const router = Router();

// 비디오 처리 메인 엔드포인트
router.post('/process-video', videoProcessController.processVideo);

// 비디오 목록 조회 (새로운 VideoQueryController 사용)
router.get('/videos', videoQueryController.getVideos);

// 업로드 처리 엔드포인트
const upload = require('../middleware/upload');
router.post('/upload', upload.default.single('video'), videoProcessController.processVideoBlob);

// 비디오 통계
router.get('/stats', systemStatsController.getStats);

// 헤더 업데이트
router.post('/update-headers', adminController.updateHeaders);

// 비디오 상세 조회
router.get('/videos/:id', videoQueryController.getVideoById);

export default router;