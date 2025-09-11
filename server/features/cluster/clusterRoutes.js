const express = require('express');
const ClusterManager = require('./ClusterManager');
const ChannelAnalysisService = require('./ChannelAnalysisService');
const ClusterModel = require('./ClusterModel');
const { ServerLogger } = require('../../utils/logger');
const { HTTP_STATUS_CODES, ERROR_CODES } = require('../../config/api-messages');

const router = express.Router();

/**
 * 🎯 채널 클러스터 관련 API 라우트
 */

// 클러스터 매니저 인스턴스
let clusterManager = null;

// 초기화
function initializeManager() {
    if (!clusterManager) {
        clusterManager = new ClusterManager();
    }
    return clusterManager;
}

/**
 * 📊 채널 수집 API (기존 "채널 분석" 버튼 재활용)
 */
router.post('/collect-channel', async (req, res) => {
    try {
        const {
            channelData,
            keywords = [],
            contentType = 'longform',
        } = req.body;

        if (!channelData || !channelData.name) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: '채널 데이터가 필요합니다',
            });
        }

        const manager = initializeManager();
        const result = await manager.collectChannel(
            channelData,
            keywords,
            contentType,
        );

        res.json(result);
    } catch (error) {
        ServerLogger.error('❌ 채널 수집 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🏷️ 최근 키워드 제안 API
 */
router.get('/recent-keywords', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const manager = initializeManager();
        const keywords = await manager.getRecentKeywords(limit);

        res.json({
            success: true,
            keywords,
        });
    } catch (error) {
        ServerLogger.error('❌ 키워드 조회 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 📊 전체 채널 목록 조회
 */
router.get('/channels', async (req, res) => {
    try {
        const { platform, clustered, limit, sortBy } = req.query;

        const filters = {};
        if (platform) filters.platform = platform;
        if (clustered !== undefined) filters.clustered = clustered === 'true';
        if (limit) filters.limit = parseInt(limit);
        if (sortBy) filters.sortBy = sortBy;

        const channels = await ChannelAnalysisService.search(filters);

        res.json({
            success: true,
            channels,
            count: channels.length,
        });
    } catch (error) {
        ServerLogger.error('❌ 채널 목록 조회 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🔍 채널 상세 조회
 */
router.get('/channels/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const mongoose = require('mongoose');

        // ObjectId 여부 확인 후 적절한 검색 방법 선택
        let channel;
        if (mongoose.Types.ObjectId.isValid(channelId)) {
            // MongoDB ObjectId인 경우
            channel = await ChannelAnalysisService.findById(channelId);
        } else {
            // YouTube 핸들(@handle) 또는 채널명인 경우
            channel = await ChannelAnalysisService.findOne({
                $or: [
                    { customUrl: channelId },
                    { name: channelId },
                    {
                        customUrl:
                            channelId.startsWith('@')
                                ? channelId
                                : `@${channelId}`,
                    },
                ],
            });
        }

        if (!channel) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: ERROR_CODES.RESOURCE_NOT_FOUND,
                message: '채널을 찾을 수 없습니다',
            });
        }

        res.json({
            success: true,
            channel,
        });
    } catch (error) {
        ServerLogger.error('❌ 채널 상세 조회 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🎯 클러스터 목록 조회
 */
router.get('/clusters', async (req, res) => {
    try {
        const { active, sortBy, limit } = req.query;

        const filters = {};
        if (active !== undefined) filters.isActive = active === 'true';
        if (sortBy) filters.sortBy = sortBy;
        if (limit) filters.limit = parseInt(limit);

        const clusters = await ClusterModel.search(filters);

        res.json({
            success: true,
            clusters,
            count: clusters.length,
        });
    } catch (error) {
        ServerLogger.error('❌ 클러스터 목록 조회 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🆕 클러스터 생성
 */
router.post('/clusters', async (req, res) => {
    try {
        const {
            name,
            description,
            channelIds = [],
            commonTags = [],
        } = req.body;

        if (!name) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: '클러스터 이름이 필요합니다',
            });
        }

        const cluster = await ClusterModel.create({
            name,
            description,
            channelIds,
            commonTags,
            createdBy: 'user',
        });

        // 채널들을 클러스터에 할당
        for (const channelId of channelIds) {
            await ChannelAnalysisService.getInstance().assignToCluster(
                channelId,
                cluster.id,
            );
        }

        res.json({
            success: true,
            cluster,
        });
    } catch (error) {
        ServerLogger.error('❌ 클러스터 생성 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🔄 클러스터 수정
 */
router.put('/clusters/:clusterId', async (req, res) => {
    try {
        const { clusterId } = req.params;
        const updateData = req.body;

        const cluster = await ClusterModel.getInstance().update(
            clusterId,
            updateData,
        );

        res.json({
            success: true,
            cluster,
        });
    } catch (error) {
        ServerLogger.error('❌ 클러스터 수정 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * ➕ 클러스터에 채널 추가
 */
router.post('/clusters/:clusterId/channels', async (req, res) => {
    try {
        const { clusterId } = req.params;
        const { channelId } = req.body;

        if (!channelId) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: '채널 ID가 필요합니다',
            });
        }

        await ClusterModel.getInstance().addChannel(clusterId, channelId);
        await ChannelAnalysisService.getInstance().assignToCluster(
            channelId,
            clusterId,
        );

        res.json({
            success: true,
            message: '채널이 클러스터에 추가되었습니다',
        });
    } catch (error) {
        ServerLogger.error('❌ 채널 추가 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * ➖ 클러스터에서 채널 제거
 */
router.delete('/clusters/:clusterId/channels/:channelId', async (req, res) => {
    try {
        const { clusterId, channelId } = req.params;

        await ClusterModel.getInstance().removeChannel(clusterId, channelId);
        await ChannelAnalysisService.getInstance().removeFromCluster(
            channelId,
            clusterId,
        );

        res.json({
            success: true,
            message: '채널이 클러스터에서 제거되었습니다',
        });
    } catch (error) {
        ServerLogger.error('❌ 채널 제거 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🤖 자동 클러스터 제안
 */
router.get('/suggestions/clusters', async (req, res) => {
    try {
        const manager = initializeManager();
        const suggestions = await manager.suggestNewClusters();

        res.json({
            success: true,
            suggestions,
            count: suggestions.length,
        });
    } catch (error) {
        ServerLogger.error('❌ 클러스터 제안 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🔍 채널 검색
 */
router.get('/search/channels', async (req, res) => {
    try {
        const { q, tag, platform } = req.query;

        let results = [];

        if (q) {
            // 이름으로 검색
            results = await ChannelAnalysisService.getInstance().findByName(q);
        } else if (tag) {
            // 태그로 검색
            results = await ChannelAnalysisService.getInstance().findByTag(tag);
        } else {
            // 필터 검색
            const filters = {};
            if (platform) filters.platform = platform;
            results = await ChannelAnalysisService.search(filters);
        }

        res.json({
            success: true,
            results,
            count: results.length,
            query: { q, tag, platform },
        });
    } catch (error) {
        ServerLogger.error('❌ 채널 검색 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 📊 통계 조회
 */
router.get('/statistics', async (req, res) => {
    try {
        const manager = initializeManager();
        const [clusterStats, channelStats, keywordStats, platformStats] =
            await Promise.all([
                manager.getStatistics(),
                ChannelAnalysisService.getInstance().getTotalCount(),
                ChannelAnalysisService.getInstance().getKeywordStatistics(),
                ChannelAnalysisService.getInstance().getPlatformStatistics(),
            ]);

        res.json({
            success: true,
            statistics: {
                clusters: clusterStats,
                totalChannels: channelStats,
                topKeywords: keywordStats,
                platforms: platformStats,
            },
        });
    } catch (error) {
        ServerLogger.error('❌ 통계 조회 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🗑️ 채널 삭제
 */
router.delete('/channels/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;

        // 모든 클러스터에서 제거
        const clusters = await ClusterModel.getAll();
        for (const cluster of clusters) {
            if (cluster.channelIds.includes(channelId)) {
                await ClusterModel.getInstance().removeChannel(
                    cluster.id,
                    channelId,
                );
            }
        }

        // 채널 삭제
        const deleted = await ChannelAnalysisService.getInstance().delete(
            channelId,
        );

        if (deleted) {
            res.json({
                success: true,
                message: '채널이 삭제되었습니다',
            });
        } else {
            res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: ERROR_CODES.RESOURCE_NOT_FOUND,
                message: '채널을 찾을 수 없습니다',
            });
        }
    } catch (error) {
        ServerLogger.error('❌ 채널 삭제 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🗑️ 클러스터 삭제
 */
router.delete('/clusters/:clusterId', async (req, res) => {
    try {
        const { clusterId } = req.params;

        // 클러스터의 모든 채널에서 연결 해제
        const cluster = await ClusterModel.findById(clusterId);
        if (cluster) {
            for (const channelId of cluster.channelIds) {
                await ChannelAnalysisService.getInstance().removeFromCluster(
                    channelId,
                    clusterId,
                );
            }
        }

        // 클러스터 삭제
        const deleted = await ClusterModel.getInstance().delete(clusterId);

        if (deleted) {
            res.json({
                success: true,
                message: '클러스터가 삭제되었습니다',
            });
        } else {
            res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: ERROR_CODES.RESOURCE_NOT_FOUND,
                message: '클러스터를 찾을 수 없습니다',
            });
        }
    } catch (error) {
        ServerLogger.error('❌ 클러스터 삭제 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🔗 클러스터 병합
 */
router.post('/clusters/:targetId/merge/:sourceId', async (req, res) => {
    try {
        const { targetId, sourceId } = req.params;
        const { newName } = req.body;

        const mergedCluster = await ClusterModel.getInstance().merge(
            sourceId,
            targetId,
            newName,
        );

        res.json({
            success: true,
            cluster: mergedCluster,
            message: '클러스터가 병합되었습니다',
        });
    } catch (error) {
        ServerLogger.error('❌ 클러스터 병합 API 오류', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 🏥 헬스 체크
 */
router.get('/health', async (req, res) => {
    try {
        const [channelCount, clusterCount] = await Promise.all([
            ChannelAnalysisService.getTotalCount(),
            ClusterModel.getTotalCount(),
        ]);

        res.json({
            success: true,
            status: 'healthy',
            version: '1.0.0',
            data: {
                channels: channelCount,
                clusters: clusterCount,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: 'unhealthy',
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

module.exports = router;
