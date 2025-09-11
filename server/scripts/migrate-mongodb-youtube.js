/**
 * MongoDB에서 YouTube 데이터에 핸들명 정보 추가 마이그레이션 스크립트
 *
 * 실행 방법:
 * node server/scripts/migrate-mongodb-youtube.js
 */

// 환경 변수 로드
require('dotenv').config();

const mongoose = require('mongoose');
const axios = require('axios');
const { ServerLogger } = require('../utils/logger');

class MongoDBYouTubeMigration {
    constructor() {
        this.youtubeApiKey = process.env.GOOGLE_API_KEY;
        this.processedCount = 0;
        this.updatedCount = 0;
        this.errors = [];
        this.cache = new Map(); // channelId -> handle 캐시
    }

    /**
     * YouTube customUrl에서 핸들명 추출 (VideoProcessor와 동일)
     */
    extractYouTubeHandle(customUrl) {
        if (!customUrl) return '';

        try {
            if (customUrl.startsWith('@')) {
                return customUrl.substring(1);
            }

            if (customUrl.startsWith('/c/')) {
                return customUrl.substring(3);
            }

            if (customUrl.startsWith('/user/')) {
                return customUrl.substring(6);
            }

            return customUrl.replace(/^\/+/, '');
        } catch (error) {
            ServerLogger.warn('YouTube 핸들명 추출 실패:', error.message);
            return '';
        }
    }

    /**
     * YouTube 채널 URL 생성 (VideoProcessor와 동일)
     */
    buildChannelUrl(customUrl, channelId) {
        try {
            if (customUrl) {
                if (customUrl.startsWith('@')) {
                    return `https://www.youtube.com/${customUrl}`;
                } else if (customUrl.startsWith('/')) {
                    return `https://www.youtube.com${customUrl}`;
                } else {
                    return `https://www.youtube.com/@${customUrl}`;
                }
            }

            if (channelId) {
                return `https://www.youtube.com/channel/${channelId}`;
            }

            return '';
        } catch (error) {
            ServerLogger.warn('YouTube 채널 URL 생성 실패:', error.message);
            return channelId
                ? `https://www.youtube.com/channel/${channelId}`
                : '';
        }
    }

    /**
     * YouTube URL에서 비디오 ID 추출
     */
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    /**
     * YouTube API를 통해 채널 정보 조회
     */
    async getChannelInfo(videoId) {
        if (this.cache.has(videoId)) {
            return this.cache.get(videoId);
        }

        try {
            // 1단계: 비디오 정보로 채널 ID 조회
            const videoResponse = await axios.get(
                `https://www.googleapis.com/youtube/v3/videos`,
                {
                    params: {
                        part: 'snippet',
                        id: videoId,
                        key: this.youtubeApiKey,
                    },
                },
            );

            if (
                !videoResponse.data.items ||
                videoResponse.data.items.length === 0
            ) {
                return { handle: '', channelUrl: '', customUrl: '' };
            }

            const channelId = videoResponse.data.items[0].snippet.channelId;

            // 2단계: 채널 정보 조회
            const channelResponse = await axios.get(
                `https://www.googleapis.com/youtube/v3/channels`,
                {
                    params: {
                        part: 'snippet',
                        id: channelId,
                        key: this.youtubeApiKey,
                    },
                },
            );

            if (
                channelResponse.data.items &&
                channelResponse.data.items.length > 0
            ) {
                const channelInfo = channelResponse.data.items[0];
                const customUrl = channelInfo.snippet?.customUrl;
                const handle = this.extractYouTubeHandle(customUrl);
                const channelUrl = this.buildChannelUrl(customUrl, channelId);

                const result = { handle, channelUrl, customUrl, channelId };
                this.cache.set(videoId, result);

                ServerLogger.info(
                    `📋 채널 정보 수집: ${channelInfo.snippet.title} (@${handle})`,
                );
                return result;
            }

            return { handle: '', channelUrl: '', customUrl: '', channelId };
        } catch (error) {
            ServerLogger.warn(
                `⚠️ 채널 정보 수집 실패 (${videoId}):`,
                error.message,
            );
            return { handle: '', channelUrl: '', customUrl: '', channelId: '' };
        }
    }

    /**
     * 마이그레이션 실행
     */
    async migrate() {
        try {
            ServerLogger.info('🚀 MongoDB YouTube 핸들명 마이그레이션 시작');

            if (!this.youtubeApiKey) {
                throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.');
            }

            // MongoDB 연결
            await mongoose.connect(process.env.MONGODB_URI);
            ServerLogger.info('🔗 MongoDB Atlas 연결 성공');

            // Video 모델 불러오기
            const Video = require('../models/VideoModel');

            // 핸들명이 없는 YouTube 비디오들 찾기
            const query = {
                platform: 'YOUTUBE',
                $or: [
                    { youtubeHandle: { $exists: false } },
                    { youtubeHandle: null },
                    { youtubeHandle: '' },
                ],
            };

            const youtubeVideos = await Video.find(query).sort({
                createdAt: -1,
            });

            ServerLogger.info(
                `🔍 업데이트 대상: ${youtubeVideos.length}개 YouTube 비디오`,
            );

            if (youtubeVideos.length === 0) {
                ServerLogger.info(
                    '✅ 모든 YouTube 데이터에 이미 핸들명이 있습니다.',
                );
                return;
            }

            // 각 비디오에 대해 핸들명 추가
            for (let i = 0; i < youtubeVideos.length; i++) {
                const video = youtubeVideos[i];

                try {
                    // URL에서 비디오 ID 추출
                    const videoId = this.extractVideoId(
                        video.url || video.originalUrl || '',
                    );

                    if (!videoId) {
                        ServerLogger.warn(
                            `⚠️ [${i + 1}/${
                                youtubeVideos.length
                            }] 비디오 ID 추출 실패: ${
                                video.channelName || 'N/A'
                            }`,
                        );
                        continue;
                    }

                    // 채널 정보 가져오기
                    const channelInfo = await this.getChannelInfo(videoId);

                    if (channelInfo.handle || channelInfo.channelUrl) {
                        // MongoDB 업데이트
                        const updateData = {
                            youtubeHandle: channelInfo.handle || '',
                            channelUrl: channelInfo.channelUrl || '',
                        };

                        await Video.findByIdAndUpdate(video._id, updateData);

                        this.updatedCount++;
                        ServerLogger.info(
                            `✅ [${i + 1}/${youtubeVideos.length}] ${
                                video.title || video.channelName || 'N/A'
                            } → @${channelInfo.handle}`,
                        );
                    } else {
                        ServerLogger.warn(
                            `⚠️ [${i + 1}/${youtubeVideos.length}] ${
                                video.title || video.channelName || 'N/A'
                            } → 핸들명 없음`,
                        );
                    }

                    this.processedCount++;

                    // API 할당량 보호를 위한 딜레이
                    if (i % 5 === 4) {
                        ServerLogger.info(
                            '⏳ API 할당량 보호를 위해 2초 대기...',
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, 2000),
                        );
                    }
                } catch (error) {
                    this.errors.push(`비디오 ${video._id}: ${error.message}`);
                    ServerLogger.error(
                        `❌ [${i + 1}/${youtubeVideos.length}] ${
                            video.title || video.channelName || 'N/A'
                        } → 실패: ${error.message}`,
                    );
                }
            }

            // 결과 요약
            ServerLogger.info('🎉 MongoDB YouTube 핸들명 마이그레이션 완료');
            ServerLogger.info(`📊 처리된 항목: ${this.processedCount}개`);
            ServerLogger.info(`✅ 업데이트된 항목: ${this.updatedCount}개`);
            ServerLogger.info(`❌ 실패한 항목: ${this.errors.length}개`);

            if (this.errors.length > 0) {
                ServerLogger.warn('실패한 항목들:');
                this.errors.forEach((error) =>
                    ServerLogger.warn(`  - ${error}`),
                );
            }
        } catch (error) {
            ServerLogger.error('마이그레이션 실패:', error);
            throw error;
        } finally {
            await mongoose.disconnect();
            ServerLogger.info('🔌 MongoDB 연결 종료');
        }
    }
}

// 스크립트 실행
async function main() {
    const migration = new MongoDBYouTubeMigration();

    try {
        await migration.migrate();
        process.exit(0);
    } catch (error) {
        ServerLogger.error('마이그레이션 실패:', error);
        process.exit(1);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = MongoDBYouTubeMigration;
