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

        // 중복 채널 에러인 경우 409 Conflict 반환
        if (error.message.includes('이미 분석되었습니다')) {
            return res.status(409).json({
                success: false,
                error: 'DUPLICATE_CHANNEL',
                message: error.message,
            });
        }

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

        // 전용 중복 검사 모델 사용 (성능 최적화)
        const ChannelUrl = require('../models/ChannelUrl');
        const DuplicateCheckManager = require('../models/DuplicateCheckManager');

        let duplicateInfo = null;
        let normalizedChannelId = null; // 스코프 밖에서도 사용할 수 있도록

        try {
            // 1. 채널 식별자 정규화 (@ 추가 처리 + 소문자 변환)
            normalizedChannelId = (decodedChannelIdentifier.startsWith('@')
                ? decodedChannelIdentifier
                : `@${decodedChannelIdentifier}`).toLowerCase();

            ServerLogger.info(`🔧 정규화된 채널 ID: ${normalizedChannelId}`);

            // 2. 전용 중복 검사 컬렉션에서 초고속 검색
            const duplicateResult = await DuplicateCheckManager.checkChannelDuplicate(normalizedChannelId);
            
            if (duplicateResult.isDuplicate) {
                // 중복 채널 발견 (전용 DB에서)
                duplicateInfo = {
                    isDuplicate: true,
                    existingChannel: duplicateResult.existingData,
                    message: `채널은 이미 분석 대기열에 있습니다.`,
                };
                ServerLogger.warn(`⚠️ 중복 채널 발견 (전용 DB): ${normalizedChannelId}`);
            } else {
                // 3. 전용 DB에 없으면 메인 channels 컬렉션도 확인 (기존 데이터 호환)
                const Channel = require('../models/ChannelModel');
                const existingChannel = await Channel.findOne({
                    $or: [
                        { customUrl: channelIdentifier },
                        { customUrl: decodedChannelIdentifier },
                        { customUrl: normalizedChannelId },
                        { name: channelIdentifier },
                        { name: decodedChannelIdentifier },
                    ],
                }).lean();

                if (existingChannel) {
                    // 메인 DB에서 발견된 경우, 전용 DB에도 등록 (동기화)
                    try {
                        await DuplicateCheckManager.registerChannel(
                            normalizedChannelId,
                            decodedChannelIdentifier,
                            'YOUTUBE',
                            { 
                                name: existingChannel.name,
                                url: existingChannel.url,
                                subscribers: existingChannel.subscribers 
                            }
                        );
                        ServerLogger.info(`🔄 전용 DB 동기화 완료: ${normalizedChannelId}`);
                    } catch (syncError) {
                        ServerLogger.warn(`⚠️ 동기화 실패 (무시): ${syncError.message}`);
                    }

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
                        `⚠️ 중복 채널 발견 (메인 DB): ${existingChannel.name}`,
                    );
                } else {
                    // 완전히 새로운 채널 - 수집 완료 후에만 DB 등록
                    duplicateInfo = {
                        isDuplicate: false,
                        message: '새로운 채널입니다. "수집하기" 버튼을 눌러 채널 정보를 수집하세요.',
                    };

                    ServerLogger.info(`✅ 새로운 채널: ${normalizedChannelId}`);
                }
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
            normalizedChannelId: normalizedChannelId || decodedChannelIdentifier, // 정규화된 ID
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

/**
 * 영상 URL에서 채널명 추출 (Android용)
 * POST /api/channel-queue/extract-channel-name
 */
router.post('/extract-channel-name', async (req, res) => {
    try {
        const { videoUrl } = req.body;

        if (!videoUrl) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: 'videoUrl이 필요합니다.',
            });
        }

        ServerLogger.info(`🎥 영상 URL에서 채널명 추출 요청: ${videoUrl}`);

        // VideoProcessor로 채널 정보 추출
        const VideoProcessor = require('../services/VideoProcessor');
        const videoProcessor = new VideoProcessor();

        const videoInfo = await videoProcessor.getYouTubeVideoInfo(videoUrl);

        if (!videoInfo || !videoInfo.channelName) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: ERROR_CODES.RESOURCE_NOT_FOUND,
                message: '영상에서 채널 정보를 찾을 수 없습니다.',
            });
        }

        ServerLogger.success(`✅ 채널명 추출 성공: ${videoInfo.channelName}`);

        res.json({
            success: true,
            data: {
                channelName: videoInfo.channelName,
                channelId: videoInfo.channelId,
                channelUrl: videoInfo.channelUrl,
            },
        });
    } catch (error) {
        ServerLogger.error('❌ 채널명 추출 실패', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

module.exports = router;
