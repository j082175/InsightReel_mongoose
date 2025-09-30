/**
 * 📺 Channel Queue Routes
 * Extension compatibility routes for channel duplicate checking
 */

import express from 'express';
import { DuplicateChecker } from '../shared/utils/DuplicateChecker';
import { ServerLogger } from '../utils/logger';

const router = express.Router();

/**
 * 🔍 채널 중복 검사 (Extension 호환성)
 * POST /api/channel-queue/check-duplicate
 */
router.post('/check-duplicate', async (req, res) => {
    try {
        const { channelIdentifier } = req.body;

        if (!channelIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'channelIdentifier is required'
            });
        }

        ServerLogger.info(`🔍 Extension 채널 중복 검사 요청: ${channelIdentifier}`, null, 'CHANNEL_QUEUE');

        // Try to extract channelId from the identifier
        // Could be: @username, UC123abc, or full URL
        let channelId = channelIdentifier.trim();

        // If it's a URL, extract the channel ID or handle
        if (channelIdentifier.includes('youtube.com') || channelIdentifier.includes('youtu.be')) {
            // Try UC... format first
            const ucMatch = channelIdentifier.match(/UC[\w-]{22}/);
            if (ucMatch) {
                channelId = ucMatch[0];
            } else {
                // Try @handle format
                const handleMatch = channelIdentifier.match(/@[\w-]+/);
                if (handleMatch) {
                    channelId = handleMatch[0];
                }
            }
        }

        // 🎯 Check for duplicate - DuplicateChecker now checks both channelId AND customUrl (case-insensitive)
        const isDuplicate = await DuplicateChecker.checkChannel(channelId);

        if (isDuplicate) {
            const existingChannel = await DuplicateChecker.getExistingChannel(channelId);
            ServerLogger.info(`✅ 중복 채널 발견: ${channelId}`, null, 'CHANNEL_QUEUE');

            return res.json({
                success: true,
                isDuplicate: true,
                existingChannel: existingChannel ? {
                    channelId: existingChannel.channelId,
                    name: existingChannel.name,
                    url: existingChannel.url,
                    subscribers: existingChannel.subscribers
                } : null
            });
        }

        ServerLogger.info(`✅ 새 채널 확인: ${channelId}`, null, 'CHANNEL_QUEUE');

        return res.json({
            success: true,
            isDuplicate: false
        });

    } catch (error: any) {
        ServerLogger.error('채널 중복 검사 실패', { error: error.message }, 'CHANNEL_QUEUE');
        return res.status(500).json({
            success: false,
            error: '채널 중복 검사 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

/**
 * 🎯 채널 분석 큐 추가 (Extension 호환성)
 * POST /api/channel-queue/add
 */
router.post('/add', async (req, res) => {
    try {
        // Extension sends "keywords", but service expects "userKeywords"
        const { channelIdentifier, keywords = [], userKeywords } = req.body;

        // Use keywords if userKeywords not provided (backwards compatibility)
        const finalKeywords = userKeywords || keywords || [];

        if (!channelIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'channelIdentifier is required'
            });
        }

        // 실제 채널 분석 수행
        ServerLogger.info(`📋 채널 분석 시작: ${channelIdentifier}, 키워드: ${finalKeywords.join(', ')}`, null, 'CHANNEL_QUEUE');

        try {
            // ChannelAnalysisService를 사용하여 실제 AI 분석 포함 수행
            const channelAnalysisService = await import('../features/channel-analysis/ChannelAnalysisService');

            const result = await channelAnalysisService.createOrUpdateWithAnalysis(
                channelIdentifier,
                finalKeywords,  // Use finalKeywords instead of userKeywords
                true,  // includeAnalysis = true (AI 분석 포함)
                false, // skipAIAnalysis = false (AI 분석 실행)
                null   // queueNormalizedChannelId
            );

            ServerLogger.info(`✅ 채널 분석 완료: ${channelIdentifier}`, null, 'CHANNEL_QUEUE');

            return res.json({
                success: true,
                message: '채널 분석이 완료되었습니다.',
                data: {
                    channelIdentifier,
                    keywords: finalKeywords,  // Return finalKeywords for consistency
                    analysis: result,
                    status: 'completed'
                }
            });

        } catch (analysisError: any) {
            ServerLogger.error(`❌ 채널 분석 실패: ${channelIdentifier}`, analysisError, 'CHANNEL_QUEUE');

            return res.json({
                success: true,
                message: '채널 분석 요청이 접수되었습니다. (백그라운드 처리)',
                data: {
                    channelIdentifier,
                    keywords: finalKeywords,  // Return finalKeywords for consistency
                    status: 'queued',
                    error: analysisError.message
                }
            });
        }

    } catch (error: any) {
        ServerLogger.error('채널 큐 추가 실패', { error: error.message }, 'CHANNEL_QUEUE');
        return res.status(500).json({
            success: false,
            error: '채널 큐 추가 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

export default router;