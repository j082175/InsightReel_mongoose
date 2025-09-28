import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES } from '../config/api-messages';
import { ITrendingVideo } from '../types/models';
import { Platform } from '../types/video-types';
import TrendingVideo from '../models/TrendingVideo';

const router = Router();

// 트렌딩 수집 시작
router.post('/collect-trending', async (req: Request, res: Response) => {
    try {
        // TODO: 트렌딩 수집 로직 구현
        ResponseHandler.success(res, { message: 'Trending collection started' });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to start trending collection');
    }
});

// 트렌딩 비디오 목록 조회
router.get('/videos', async (req: Request, res: Response) => {
    try {
        const {
            platform,
            limit = 50,
            offset = 0,
            sortBy = 'views',
            sortOrder = 'desc',
            dateFrom,
            dateTo,
            groupId,
            duration
        } = req.query;

        // TrendingVideo model is already imported at the top

        // 쿼리 조건 구성
        const query: any = {};

        if (platform) {
            query.platform = platform;
        }

        if (groupId) {
            query.groupId = groupId;
        }

        if (duration) {
            query.duration = duration;
        }

        if (dateFrom || dateTo) {
            query.collectionDate = {};
            if (dateFrom) {
                query.collectionDate.$gte = new Date(dateFrom as string);
            }
            if (dateTo) {
                query.collectionDate.$lte = new Date(dateTo as string);
            }
        }

        // 정렬 조건 구성
        const sortOptions: any = {};
        const validSortFields = ['views', 'likes', 'collectionDate', 'uploadDate', 'commentsCount'];
        const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'views';
        sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

        // 데이터 조회
        const total = await TrendingVideo.countDocuments(query);
        const videos = await TrendingVideo.find(query)
            .sort(sortOptions)
            .skip(Number(offset))
            .limit(Number(limit))
            .populate('groupId', 'name color')
            .populate('batchId', 'name');

        // 응답 데이터 변환 (frontend TrendingVideo 형식에 맞춤)
        const transformedVideos = videos.map((video: any) => ({
            _id: video._id?.toString() || video._id,
            videoId: video.videoId,
            title: video.title,
            url: video.url,
            platform: video.platform,
            channelName: video.channelName,
            channelId: video.channelId,
            channelUrl: video.channelUrl,
            views: video.views,
            likes: video.likes,
            commentsCount: video.commentsCount,
            shares: video.shares,
            uploadDate: video.uploadDate?.toISOString(),
            duration: video.duration,
            durationSeconds: video.durationSeconds,
            thumbnailUrl: video.thumbnailUrl,
            description: video.description,
            keywords: video.keywords || [],
            hashtags: video.hashtags || [],
            // TrendingVideo 특별 필드
            trendingScore: video.views / 1000, // 간단한 트렌딩 스코어 계산
            collectionDate: video.collectionDate?.toISOString(),
            isPopular: video.views > 100000, // 10만 조회수 이상을 인기 영상으로 분류
            // 시스템 메타데이터
            source: 'trending',
            isFromTrending: true,
            createdAt: video.createdAt?.toISOString(),
            // 그룹 정보 (populated)
            groupName: video.groupName || '개별 채널 수집',
            // UI 호환성 필드
            id: video._id?.toString() || video._id, // 임시 호환용
        }));

        ResponseHandler.success(res, {
            videos: transformedVideos,
            pagination: {
                limit: Number(limit),
                offset: Number(offset),
                total,
                hasMore: Number(offset) + Number(limit) < total
            },
            filters: {
                platform,
                groupId,
                duration,
                dateFrom,
                dateTo
            }
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch trending videos');
    }
});

// 트렌딩 수집 상태 조회
router.get('/status', async (req: Request, res: Response) => {
    try {
        // TODO: 트렌딩 수집 상태 조회 로직 구현
        ResponseHandler.success(res, {
            status: 'idle',
            lastRun: null,
            progress: 0
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch trending status');
    }
});

// 트렌딩 수집 중지
router.post('/stop', async (req: Request, res: Response) => {
    try {
        // TODO: 트렌딩 수집 중지 로직 구현
        ResponseHandler.success(res, { message: 'Trending collection stopped' });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to stop trending collection');
    }
});

// 트렌딩 설정 조회
router.get('/config', async (req: Request, res: Response) => {
    try {
        // TODO: 트렌딩 설정 조회 로직 구현
        ResponseHandler.success(res, {
            config: {
                platforms: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'],
                minViews: 1000,
                maxAge: 7 // days
            }
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch trending config');
    }
});

// 트렌딩 설정 업데이트
router.put('/config', async (req: Request, res: Response) => {
    try {
        const config = req.body;
        // TODO: 트렌딩 설정 업데이트 로직 구현
        ResponseHandler.success(res, { message: 'Trending config updated' });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to update trending config');
    }
});

export default router;