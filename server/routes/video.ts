import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES, API_MESSAGES, ERROR_CODES, PLATFORMS } from '../config/api-messages';
import { IVideo } from '../types/models';
import VideoModel from '../models/Video';
import TrendingVideoModel from '../models/TrendingVideo';
import { VideoProcessor } from '../services/video/VideoProcessor';
import { AIAnalyzer } from '../services/ai/AIAnalyzer';
import { SheetsManager } from '../services/sheets/SheetsManager';
import UnifiedVideoSaver from '../services/UnifiedVideoSaver';
import { DuplicateChecker } from '../shared/utils/DuplicateChecker';
import upload from '../middleware/upload';

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
router.post('/upload', upload.single('video'), videoProcessController.processVideoBlob);

// 비디오 통계
router.get('/stats', systemStatsController.getStats);

// 헤더 업데이트
router.post('/update-headers', adminController.updateHeaders);

// 비디오 상세 조회
router.get('/videos/:id', videoQueryController.getVideoById);

// URL로 영상 직접 추가
router.post('/add-url', async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, platform, metadata = {}, saveToTrending = false, groupId = null } = req.body;

        // URL 검증
        if (!url || !url.trim()) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.INVALID_VIDEO_URL,
                message: 'URL은 필수입니다.'
            });
            return;
        }

        // 플랫폼 자동 감지
        const detectedPlatform = platform || (
            url.includes('youtube.com') || url.includes('youtu.be') ? PLATFORMS.YOUTUBE :
            url.includes('instagram.com') ? PLATFORMS.INSTAGRAM :
            url.includes('tiktok.com') ? PLATFORMS.TIKTOK :
            null
        );

        if (!detectedPlatform) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.UNSUPPORTED_PLATFORM,
                message: '지원하지 않는 플랫폼의 URL입니다.'
            });
            return;
        }

        ServerLogger.info(`📥 URL로 영상 추가 시작: ${url} (${detectedPlatform})`);

        // 🎯 SIMPLE DUPLICATE CHECK - Use new unified system
        const isDuplicate = await DuplicateChecker.checkVideo(url);
        if (isDuplicate) {
            const existingVideo = await DuplicateChecker.getExistingVideo(url);
            res.status(HTTP_STATUS_CODES.CONFLICT).json({
                success: false,
                error: ERROR_CODES.CONFLICT,
                message: `이미 처리된 URL입니다.`,
                existingVideo: {
                    _id: existingVideo?._id,
                    title: existingVideo?.title,
                    channelName: existingVideo?.channelName,
                    platform: existingVideo?.platform,
                    createdAt: existingVideo?.createdAt
                }
            });
            return;
        }

        // 비디오 처리
        const videoProcessor = new VideoProcessor();
        await videoProcessor.initialize();
        const aiAnalyzer = new AIAnalyzer();
        const unifiedSaver = new UnifiedVideoSaver();

        // 메타데이터 수집
        const videoInfo = await videoProcessor.processVideo(url, {
            downloadVideo: false,
            generateThumbnail: true,
            analysisType: 'multi-frame'
        });

        if (!videoInfo.success || !videoInfo.videoData) {
            throw new Error('비디오 정보 수집 실패');
        }

        // AI 분석
        const analysis = await aiAnalyzer.analyzeVideo(
            videoInfo.thumbnailPath || '',
            videoInfo.videoData,
            { analysisType: 'multi-frame' }
        );

        // 데이터 병합
        const enrichedData = {
            ...videoInfo.videoData,
            ...analysis,
            platform: detectedPlatform,
            url,
            collectionTime: new Date().toISOString()
        };

        // 저장 처리
        let savedData = null;

        if (saveToTrending && groupId) {
            // TrendingVideo로 저장
            const trendingVideo = new TrendingVideoModel({
                videoId: (enrichedData as any).videoId || url.split('/').pop(),
                title: enrichedData.title,
                url: url,
                platform: detectedPlatform,
                channelName: enrichedData.channelName,
                channelId: enrichedData.channelId,
                channelUrl: enrichedData.channelUrl,
                groupId: groupId,
                groupName: 'Direct Add',
                collectionDate: new Date(),
                collectedFrom: 'individual',
                views: parseInt(enrichedData.views?.toString() || '0') || 0,
                likes: parseInt(enrichedData.likes?.toString() || '0') || 0,
                commentsCount: parseInt(enrichedData.commentsCount?.toString() || '0') || 0,
                shares: parseInt(enrichedData.shares?.toString() || '0') || 0,
                uploadDate: enrichedData.uploadDate ? new Date(enrichedData.uploadDate) : null,
                duration: enrichedData.duration,
                durationSeconds: parseInt((enrichedData as any).durationSeconds?.toString() || '0') || 0,
                thumbnailUrl: enrichedData.thumbnailUrl,
                description: enrichedData.description,
                keywords: enrichedData.keywords || [],
                hashtags: enrichedData.hashtags || []
            });

            savedData = await trendingVideo.save();
            ServerLogger.info(`✅ 트렌딩 영상으로 저장 완료: ${savedData._id}`);

        } else {
            // 기존 프로세스 (Sheets + MongoDB)
            const saveResult = await unifiedSaver.saveVideoData(detectedPlatform as any, enrichedData);
            savedData = saveResult;
            ServerLogger.info(`✅ 일반 영상으로 저장 완료`);
        }

        res.status(HTTP_STATUS_CODES.CREATED).json({
            success: true,
            data: savedData,
            message: '영상이 성공적으로 추가되었습니다.'
        });

    } catch (error: any) {
        ServerLogger.error('URL로 영상 추가 실패:', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.VIDEO_PROCESSING_FAILED,
            message: '영상 추가에 실패했습니다.',
            details: error.message
        });
    }
});

// 비디오 업데이트
router.put('/videos/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            keywords,
            hashtags,
            platform,
            channelName,
            channelId,
            channelUrl,
            views,
            likes,
            commentsCount,
            shares,
            duration,
            thumbnailUrl,
            uploadDate
        } = req.body;

        // ID 유효성 검사
        if (!id || id === 'undefined' || id === 'null') {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Invalid video ID'
            });
            return;
        }

        const video = await VideoModel.findById(id);
        if (!video) {
            res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'Video not found'
            });
            return;
        }

        // 필드 업데이트 (undefined가 아닌 값만)
        if (title !== undefined) video.title = title;
        if (description !== undefined) video.description = description;
        if (keywords !== undefined) video.keywords = keywords;
        if (hashtags !== undefined) video.hashtags = hashtags;
        if (platform !== undefined) video.platform = platform;
        if (channelName !== undefined) video.channelName = channelName;
        if (channelId !== undefined) video.channelId = channelId;
        if (channelUrl !== undefined) video.channelUrl = channelUrl;
        if (views !== undefined) video.views = parseInt(views.toString()) || 0;
        if (likes !== undefined) video.likes = parseInt(likes.toString()) || 0;
        if (commentsCount !== undefined) video.commentsCount = parseInt(commentsCount.toString()) || 0;
        if (shares !== undefined) video.shares = parseInt(shares.toString()) || 0;
        if (duration !== undefined) video.duration = duration;
        if (thumbnailUrl !== undefined) video.thumbnailUrl = thumbnailUrl;
        if (uploadDate !== undefined) video.uploadDate = uploadDate;

        // Set updatedAt using Mongoose's built-in timestamps
        video.set('updatedAt', new Date());

        const updatedVideo = await video.save();

        ResponseHandler.success(res, {
            data: updatedVideo,
            message: 'Video updated successfully'
        });

    } catch (error: any) {
        ServerLogger.error('Failed to update video:', error);
        ResponseHandler.serverError(res, error, 'Failed to update video');
    }
});

// 비디오 삭제
router.delete('/videos/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // ID 유효성 검사
        if (!id || id === 'undefined' || id === 'null') {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Invalid video ID'
            });
            return;
        }

        const video = await VideoModel.findByIdAndDelete(id);

        if (!video) {
            res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'Video not found'
            });
            return;
        }

        ServerLogger.info(`✅ Video deleted: ${video.title} (${id})`, null, 'VIDEO_DELETE');

        ResponseHandler.success(res, {
            message: 'Video deleted successfully',
            data: { id, title: video.title }
        });

    } catch (error: any) {
        ServerLogger.error('Failed to delete video:', error);
        ResponseHandler.serverError(res, error, 'Failed to delete video');
    }
});

export default router;