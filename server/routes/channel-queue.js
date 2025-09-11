const express = require('express');
const { ServerLogger } = require('../utils/logger');
const { HTTP_STATUS_CODES, ERROR_CODES } = require('../config/api-messages');

const router = express.Router();

// 테스트 라우트 (라우트 등록 확인용)
router.get('/test', (req, res) => {
    ServerLogger.info('🧪 테스트 라우트 호출됨');
    res.json({
        success: true,
        message: '채널 큐 라우트가 정상적으로 등록되었습니다.',
        timestamp: new Date().toISOString(),
    });
});

// 큐 매니저를 동적으로 로드하여 의존성 오류 방지
function getQueueManager() {
    try {
        const ChannelAnalysisQueueManager = require('../services/ChannelAnalysisQueue');
        return ChannelAnalysisQueueManager.getInstance();
    } catch (error) {
        throw new Error(`큐 매니저 초기화 실패: ${error.message}`);
    }
}

/**
 * 채널 분석 작업 추가
 * POST /api/channel-queue/add
 */
router.post('/add', async (req, res) => {
    try {
        const { channelIdentifier, keywords = [], options = {} } = req.body;

        if (!channelIdentifier) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: 'channelIdentifier is required',
            });
        }

        const queue = getQueueManager();
        const jobId = await queue.addJob(channelIdentifier, keywords, options);

        ServerLogger.info(`📋 채널 분석 작업 추가 요청: ${channelIdentifier}`);

        res.json({
            success: true,
            jobId,
            message: '채널 분석 작업이 큐에 추가되었습니다',
        });
    } catch (error) {
        ServerLogger.error('❌ 채널 분석 작업 추가 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 작업 상태 조회
 * GET /api/channel-queue/job/:jobId
 */
router.get('/job/:jobId', (req, res) => {
    try {
        const { jobId } = req.params;
        const queue = getQueueManager();
        const jobStatus = queue.getJobStatus(jobId);

        if (!jobStatus) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: ERROR_CODES.RESOURCE_NOT_FOUND,
                message: 'Job not found',
            });
        }

        res.json({
            success: true,
            job: jobStatus,
        });
    } catch (error) {
        ServerLogger.error('❌ 작업 상태 조회 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 큐 상태 조회
 * GET /api/channel-queue/status
 */
router.get('/status', (req, res) => {
    ServerLogger.info('🔍 채널 큐 상태 조회 요청 시작');

    try {
        ServerLogger.info('🔍 큐 매니저 가져오는 중...');
        const queue = getQueueManager();
        ServerLogger.info('✅ 큐 매니저 가져옴');

        const queueStatus = queue.getQueueStatus();
        ServerLogger.info('✅ 큐 상태 조회 성공:', queueStatus);

        res.json({
            success: true,
            queue: queueStatus,
        });
    } catch (error) {
        ServerLogger.error('❌ 큐 상태 조회 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: error.message,
            stack: error.stack,
        });
    }
});

/**
 * 모든 작업 목록 조회
 * GET /api/channel-queue/jobs
 */
router.get('/jobs', (req, res) => {
    try {
        const queue = getQueueManager();
        const jobs = queue.getAllJobs();

        res.json({
            success: true,
            jobs: jobs.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            ), // 최신순 정렬
        });
    } catch (error) {
        ServerLogger.error('❌ 작업 목록 조회 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 작업 취소
 * DELETE /api/channel-queue/job/:jobId
 */
router.delete('/job/:jobId', (req, res) => {
    try {
        const { jobId } = req.params;
        const queue = getQueueManager();
        const cancelled = queue.cancelJob(jobId);

        if (cancelled) {
            res.json({
                success: true,
                message: '작업이 취소되었습니다',
            });
        } else {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.OPERATION_FAILED,
                message: '작업을 취소할 수 없습니다. (이미 처리 중이거나 완료됨)',
            });
        }
    } catch (error) {
        ServerLogger.error('❌ 작업 취소 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 큐 초기화
 * DELETE /api/channel-queue/clear
 */
router.delete('/clear', (req, res) => {
    try {
        const queue = getQueueManager();
        const cancelledJobs = queue.clearQueue();

        res.json({
            success: true,
            message: `큐가 초기화되었습니다. ${cancelledJobs}개 작업이 취소되었습니다.`,
        });
    } catch (error) {
        ServerLogger.error('❌ 큐 초기화 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 완료된 작업 정리
 * POST /api/channel-queue/cleanup
 */
router.post('/cleanup', (req, res) => {
    try {
        const { olderThanHours = 24 } = req.body;
        const queue = getQueueManager();
        const cleaned = queue.cleanupCompletedJobs(olderThanHours);

        res.json({
            success: true,
            message: `${cleaned}개의 완료된 작업을 정리했습니다.`,
        });
    } catch (error) {
        ServerLogger.error('❌ 작업 정리 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

/**
 * 채널 중복 검사
 * POST /api/channel-queue/check-duplicate
 */
router.post('/check-duplicate', async (req, res) => {
    try {
        const { channelIdentifier } = req.body;

        if (!channelIdentifier) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: 'channelIdentifier is required',
            });
        }

        // URL 디코딩 처리 (한글 채널명 지원)
        const decodedChannelIdentifier = decodeURIComponent(channelIdentifier);
        
        ServerLogger.info(`🔍 채널 중복 검사 요청: ${channelIdentifier}`);
        if (channelIdentifier !== decodedChannelIdentifier) {
            ServerLogger.info(`📝 URL 디코딩 적용: ${decodedChannelIdentifier}`);
        }

        // Channel 모델을 동적으로 로드
        const Channel = require('../models/ChannelModel');
        const YouTubeChannelService = require('../services/YouTubeChannelService');

        let duplicateInfo = null;

        try {
            // 1. 먼저 MongoDB에서 채널 식별자로 직접 검색 시도 (API 호출 없이)
            const mongoose = require('mongoose');
            let existingChannel = null;

            if (mongoose.Types.ObjectId.isValid(decodedChannelIdentifier)) {
                // MongoDB ObjectId인 경우
                existingChannel = await Channel.findOne({ id: decodedChannelIdentifier }).lean();
            } else {
                // YouTube 핸들이나 채널명인 경우 다른 필드로 검색 (원본과 디코딩된 것 모두 확인)
                existingChannel = await Channel.findOne({
                    $or: [
                        { customUrl: channelIdentifier },
                        { customUrl: decodedChannelIdentifier },
                        { name: channelIdentifier },
                        { name: decodedChannelIdentifier },
                        {
                            customUrl: channelIdentifier.startsWith('@')
                                ? channelIdentifier
                                : `@${channelIdentifier}`,
                        },
                        {
                            customUrl: decodedChannelIdentifier.startsWith('@')
                                ? decodedChannelIdentifier
                                : `@${decodedChannelIdentifier}`,
                        },
                    ],
                }).lean();
            }

            // 2. MongoDB에서 찾았으면 중복으로 처리 (API 호출 없이)

            if (existingChannel) {
                duplicateInfo = {
                    isDuplicate: true,
                    existingChannel: {
                        id: existingChannel.id,
                        name: existingChannel.name,
                        url: existingChannel.url,
                        subscribers: existingChannel.subscribers,
                        platform: existingChannel.platform,
                        collectedAt: existingChannel.collectedAt,
                        lastAnalyzedAt: existingChannel.lastAnalyzedAt,
                    },
                    message: `채널 "${existingChannel.name}"은 이미 분석되었습니다.`,
                };

                ServerLogger.warn(
                    `⚠️ 중복 채널 발견: ${existingChannel.name} (${existingChannel.id})`,
                );
            } else {
                // 3. MongoDB에 없는 경우 - 새로운 채널로 간주 (API 호출은 실제 수집 시에만)
                duplicateInfo = {
                    isDuplicate: false,
                    message:
                        '새로운 채널입니다. "수집하기" 버튼을 눌러 채널 정보를 수집하세요.',
                    note: '중복 검사에서는 API를 호출하지 않아 할당량을 절약합니다.',
                };

                ServerLogger.info(
                    `✅ 새로운 채널 (API 호출 없음): ${decodedChannelIdentifier}`,
                );
            }
        } catch (searchError) {
            ServerLogger.warn(`⚠️ 채널 정보 조회 실패: ${searchError.message}`);

            // 검색 실패 시에도 처리 계속 진행 (graceful degradation)
            duplicateInfo = {
                isDuplicate: false,
                message:
                    '중복 검사를 완전히 수행할 수 없었지만 처리를 계속합니다.',
                warning: searchError.message,
            };
        }

        res.json({
            success: true,
            channelIdentifier: decodedChannelIdentifier, // 디코딩된 버전 반환
            originalChannelIdentifier: channelIdentifier, // 원본도 함께 반환
            duplicate: duplicateInfo,
        });
    } catch (error) {
        ServerLogger.error('❌ 채널 중복 검사 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

module.exports = router;
