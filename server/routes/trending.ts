import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES } from '../config/api-messages';
import { ITrendingVideo } from '../types/models';
import { Platform } from '../types/video-types';
import TrendingVideo from '../models/TrendingVideo';
import GroupTrendingCollector from '../services/trending/GroupTrendingCollector';

const router = Router();

/**
 * 🎯 트렌딩 영상 관리 API
 * 수집된 트렌딩 영상들을 조회하고 관리하는 기능
 */

// POST /api/trending/collect-trending - 트렌딩 수집 시작
router.post('/collect-trending', async (req: Request, res: Response) => {
    try {
        const { channelIds = [], options = {} } = req.body;

        if (!channelIds || channelIds.length === 0) {
            return ResponseHandler.badRequest(res, '채널 ID가 필요합니다.');
        }

        ServerLogger.info(`🚀 트렌딩 수집 시작: ${channelIds.length}개 채널`);
        ServerLogger.info(`📋 수집 옵션:`, options);

        // GroupTrendingCollector 초기화 및 수집 시작
        const collector = new GroupTrendingCollector();
        await collector.initialize();

        // collectFromChannels 메서드는 { channels, ...options } 형식을 기대함
        const collectionOptions = {
            channels: channelIds,
            ...options
        };

        // 개별 채널 수집 실행
        const result = await collector.collectFromChannels(collectionOptions);

        ServerLogger.info(`✅ 트렌딩 수집 완료: ${result.totalVideosSaved}개 영상 저장됨`);

        ResponseHandler.success(res, {
            message: 'Trending collection completed',
            result: {
                totalChannels: result.totalChannels,
                totalVideosFound: result.totalVideosFound,
                totalVideosSaved: result.totalVideosSaved,
                quotaUsed: result.quotaUsed,
                stats: result.stats
            }
        });
    } catch (error) {
        ServerLogger.error('❌ 트렌딩 수집 실패:', error);
        ResponseHandler.serverError(res, error, 'Failed to start trending collection');
    }
});

// GET /api/trending/videos - 수집된 트렌딩 영상 목록 조회
router.get('/videos', async (req: Request, res: Response) => {
    try {
        const {
            limit = '50',
            offset = '0',
            groupId,
            duration,
            platform,
            minViews,
            maxViews,
            keyword,
            sortBy = 'collectionDate',
            order = 'desc',
            dateFrom,
            dateTo
        } = req.query;

        ServerLogger.info('📋 트렌딩 영상 조회 요청 시작');

        // 쿼리 빌드
        const query: any = {};

        // 그룹 필터
        if (groupId && groupId !== 'all') {
            query.groupId = groupId;
        }

        // 플랫폼 필터
        if (platform && ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'].includes(platform as string)) {
            query.platform = platform;
        }

        // 영상 길이 필터
        if (duration && ['SHORT', 'MID', 'LONG'].includes(duration as string)) {
            query.duration = duration;
        }

        // 조회수 범위 필터
        if (minViews || maxViews) {
            query.views = {};
            if (minViews) query.views.$gte = parseInt(minViews as string);
            if (maxViews) query.views.$lte = parseInt(maxViews as string);
        }

        // 키워드 검색
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { channelName: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ];
        }

        // 날짜 범위 필터
        if (dateFrom || dateTo) {
            query.collectionDate = {};
            if (dateFrom) query.collectionDate.$gte = new Date(dateFrom as string);
            if (dateTo) query.collectionDate.$lte = new Date(dateTo as string);
        }

        // 정렬 옵션
        const sortOptions: any = {};
        sortOptions[sortBy as string] = order === 'desc' ? -1 : 1;

        const videos = await TrendingVideo.find(query)
            .sort(sortOptions)
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string))
            .lean();

        const totalCount = await TrendingVideo.countDocuments(query);

        // 트렌딩 비디오에 source 정보 추가, _id 유지
        const videosWithSource = videos.map(video => {
            const { __v, batchId, collectionDate, ...cleanVideo } = video;
            return {
                ...cleanVideo,
                // MongoDB _id 그대로 사용 (변환 없음)
                views: cleanVideo.views || 0,
                thumbnailUrl: cleanVideo.thumbnailUrl || '',
                // 배치 관련 필드
                batchIds: batchId ? [batchId] : [],
                collectedAt: collectionDate,
                // API 메타 정보
                source: 'trending',
                isFromTrending: true
            };
        });

        ServerLogger.info(`📋 트렌딩 영상 조회: ${videos.length}개 (총 ${totalCount}개)`);

        ResponseHandler.success(res, videosWithSource, null, {
            pagination: {
                total: totalCount,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                hasMore: (parseInt(offset as string) + videos.length) < totalCount
            }
        });

    } catch (error) {
        ServerLogger.error('❌ 트렌딩 영상 조회 실패:', error);
        ResponseHandler.serverError(res, error, 'Failed to fetch trending videos');
    }
});

// GET /api/trending/videos/:id - 특정 트렌딩 영상 상세 조회
router.get('/videos/:id', async (req: Request, res: Response) => {
    try {
        const video = await TrendingVideo.findById(req.params.id);

        if (!video) {
            return ResponseHandler.notFound(res, '트렌딩 영상을 찾을 수 없습니다.');
        }

        // 조회수 정보 추가
        const videoWithMeta = {
            ...video.toObject(),
            source: 'trending',
            isFromTrending: true
        };

        ResponseHandler.success(res, videoWithMeta);
    } catch (error) {
        ServerLogger.error('❌ 트렌딩 영상 상세 조회 실패:', error);
        ResponseHandler.serverError(res, error, 'Failed to fetch trending video');
    }
});

// DELETE /api/trending/videos/:id - 트렌딩 영상 삭제
router.delete('/videos/:id', async (req: Request, res: Response) => {
    try {
        const deleted = await TrendingVideo.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return ResponseHandler.notFound(res, '삭제할 트렌딩 영상을 찾을 수 없습니다.');
        }

        ResponseHandler.success(res, { message: '트렌딩 영상이 삭제되었습니다.' });
    } catch (error) {
        ServerLogger.error('❌ 트렌딩 영상 삭제 실패:', error);
        ResponseHandler.serverError(res, error, 'Failed to delete trending video');
    }
});

// GET /api/trending/stats - 트렌딩 영상 통계
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await TrendingVideo.aggregate([
            {
                $group: {
                    _id: null,
                    totalVideos: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    avgViews: { $avg: '$views' },
                    platformBreakdown: {
                        $push: '$platform'
                    }
                }
            }
        ]);

        const platformStats = await TrendingVideo.aggregate([
            {
                $group: {
                    _id: '$platform',
                    count: { $sum: 1 },
                    totalViews: { $sum: '$views' }
                }
            }
        ]);

        ResponseHandler.success(res, {
            overview: stats[0] || { totalVideos: 0, totalViews: 0, avgViews: 0 },
            platforms: platformStats
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to get trending stats');
    }
});

// PUT /api/trending/videos/:id - 트렌딩 영상 업데이트
router.put('/videos/:id', async (req: Request, res: Response) => {
    try {
        const updated = await TrendingVideo.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return ResponseHandler.notFound(res, '업데이트할 트렌딩 영상을 찾을 수 없습니다.');
        }

        ResponseHandler.success(res, updated);
    } catch (error) {
        ServerLogger.error('❌ 트렌딩 영상 업데이트 실패:', error);
        ResponseHandler.serverError(res, error, 'Failed to update trending video');
    }
});

// GET /api/trending/status - 트렌딩 수집 상태 조회
router.get('/status', async (req: Request, res: Response) => {
    try {
        // TODO: 실제 수집 상태 로직 구현
        ResponseHandler.success(res, {
            status: 'idle',
            lastCollection: null,
            isRunning: false
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to get trending status');
    }
});

// POST /api/trending/stop - 트렌딩 수집 중지
router.post('/stop', async (req: Request, res: Response) => {
    try {
        // TODO: 수집 중지 로직 구현
        ResponseHandler.success(res, { message: 'Trending collection stopped' });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to stop trending collection');
    }
});

// GET /api/trending/config - 트렌딩 수집 설정 조회
router.get('/config', async (req: Request, res: Response) => {
    try {
        // TODO: 설정 조회 로직 구현
        ResponseHandler.success(res, {
            interval: 3600,
            platforms: ['YOUTUBE', 'INSTAGRAM'],
            filters: {}
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to get trending config');
    }
});

// PUT /api/trending/config - 트렌딩 수집 설정 업데이트
router.put('/config', async (req: Request, res: Response) => {
    try {
        // TODO: 설정 업데이트 로직 구현
        ResponseHandler.success(res, { message: 'Trending config updated' });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to update trending config');
    }
});

export default router;