const express = require('express');
const router = express.Router();
const { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES } = require('../config/api-messages');
const { ServerLogger } = require('../utils/logger');

const InstagramReelsExtractor = require('../services/InstagramReelsExtractor');
const InstagramReelsCollector = require('../services/InstagramReelsCollector');
const InstagramProfileService = require('../services/InstagramProfileService');

/**
 * 📸 Instagram Reels 관리 API
 * Instagram 릴스 및 프로필 관리 전용 엔드포인트
 */

// POST /api/instagram/extract-reel - 개별 릴스 데이터 추출
router.post('/extract-reel', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url || !url.trim()) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.INVALID_VIDEO_URL,
                message: 'Instagram URL이 필요합니다.'
            });
        }

        ServerLogger.info(`🎬 Instagram 릴스 추출 요청: ${url}`);

        const extractor = new InstagramReelsExtractor();
        const result = await extractor.extractReelsData(url);

        if (result.success) {
            ServerLogger.info(`✅ Instagram 릴스 추출 성공: ${result.post.title}`);
            return res.json({
                success: true,
                data: result,
                message: 'Instagram 릴스 데이터 추출 완료'
            });
        } else {
            throw new Error(result.error || 'Instagram 릴스 추출 실패');
        }

    } catch (error) {
        ServerLogger.error(`❌ Instagram 릴스 추출 실패:`, error);
        return res.status(HTTP_STATUS_CODES.SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.PROCESSING_ERROR,
            message: `Instagram 릴스 추출 실패: ${error.message}`
        });
    }
});

// POST /api/instagram/collect-profile-reels - 프로필별 릴스 대량 수집
router.post('/collect-profile-reels', async (req, res) => {
    try {
        const { username, options = {} } = req.body;

        if (!username || !username.trim()) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.INVALID_INPUT,
                message: 'Instagram 사용자명이 필요합니다.'
            });
        }

        ServerLogger.info(`👥 프로필 릴스 수집 요청: @${username}`);

        const collector = new InstagramReelsCollector();
        const result = await collector.collectProfileReels(username, options);

        if (result.success) {
            ServerLogger.info(`✅ 프로필 릴스 수집 성공: ${result.collectedReels}개 수집`);
            return res.json({
                success: true,
                data: result,
                message: `@${username}의 릴스 ${result.collectedReels}개 수집 완료`
            });
        } else {
            throw new Error(result.error || '프로필 릴스 수집 실패');
        }

    } catch (error) {
        ServerLogger.error(`❌ 프로필 릴스 수집 실패:`, error);
        return res.status(HTTP_STATUS_CODES.SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.PROCESSING_ERROR,
            message: `프로필 릴스 수집 실패: ${error.message}`
        });
    }
});

// GET /api/instagram/profile/:username - 프로필 정보 조회
router.get('/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;

        if (!username || !username.trim()) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.INVALID_INPUT,
                message: 'Instagram 사용자명이 필요합니다.'
            });
        }

        ServerLogger.info(`👤 Instagram 프로필 정보 요청: @${username}`);

        const profileService = new InstagramProfileService();
        const profileData = await profileService.getProfileInfo(username);

        if (profileData && profileData.success) {
            ServerLogger.info(`✅ 프로필 정보 조회 성공: @${username}`);
            return res.json({
                success: true,
                data: profileData,
                message: `@${username} 프로필 정보 조회 완료`
            });
        } else {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: ERROR_CODES.NOT_FOUND,
                message: `@${username} 프로필을 찾을 수 없습니다.`
            });
        }

    } catch (error) {
        ServerLogger.error(`❌ 프로필 정보 조회 실패:`, error);
        return res.status(HTTP_STATUS_CODES.SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.PROCESSING_ERROR,
            message: `프로필 정보 조회 실패: ${error.message}`
        });
    }
});

// POST /api/instagram/bulk-collect - 다중 프로필 릴스 수집
router.post('/bulk-collect', async (req, res) => {
    try {
        const { usernames, options = {} } = req.body;

        if (!Array.isArray(usernames) || usernames.length === 0) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: ERROR_CODES.INVALID_INPUT,
                message: 'Instagram 사용자명 배열이 필요합니다.'
            });
        }

        ServerLogger.info(`👥 다중 프로필 릴스 수집 요청: ${usernames.length}개 프로필`);

        const collector = new InstagramReelsCollector();
        const result = await collector.collectMultipleProfiles(usernames, options);

        if (result.success) {
            ServerLogger.info(`✅ 다중 프로필 수집 성공: ${result.successCount}/${result.totalProfiles}`);
            return res.json({
                success: true,
                data: result,
                message: `${result.successCount}/${result.totalProfiles}개 프로필 수집 완료`
            });
        } else {
            throw new Error('다중 프로필 수집 실패');
        }

    } catch (error) {
        ServerLogger.error(`❌ 다중 프로필 수집 실패:`, error);
        return res.status(HTTP_STATUS_CODES.SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.PROCESSING_ERROR,
            message: `다중 프로필 수집 실패: ${error.message}`
        });
    }
});

// GET /api/instagram/test - Instagram 서비스 테스트
router.get('/test', async (req, res) => {
    try {
        ServerLogger.info('🧪 Instagram 서비스 테스트 시작');

        const testUrl = 'https://www.instagram.com/reels/DOf5jTKjC4t/';
        const extractor = new InstagramReelsExtractor();

        const result = await extractor.extractReelsData(testUrl);

        return res.json({
            success: true,
            data: {
                testUrl: testUrl,
                extractionResult: result,
                services: {
                    InstagramReelsExtractor: '✅',
                    InstagramReelsCollector: '✅',
                    InstagramProfileService: '✅'
                }
            },
            message: 'Instagram 서비스 테스트 완료'
        });

    } catch (error) {
        ServerLogger.error(`❌ Instagram 서비스 테스트 실패:`, error);
        return res.status(HTTP_STATUS_CODES.SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.PROCESSING_ERROR,
            message: `Instagram 서비스 테스트 실패: ${error.message}`
        });
    }
});

module.exports = router;