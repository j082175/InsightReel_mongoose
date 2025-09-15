const { google } = require('googleapis');
const { ServerLogger } = require('../utils/logger');

/**
 * YouTube 채널 데이터 수집기 - 2단계 분석용
 * 채널 정보, 영상 목록, 태그, 설명 등을 수집
 */
class YouTubeChannelDataCollector {
    constructor() {
        this.maxVideos = 30; // 분석할 최대 영상 수 (2단계)
        this.apiKey = null; // ApiKeyManager에서 동적으로 로드
        this.youtube = null; // 나중에 초기화
    }

    async getApiKey() {
        if (!this.apiKey) {
            const apiKeyManager = require('./ApiKeyManager');
            await apiKeyManager.initialize();
            const activeKeys = await apiKeyManager.getActiveApiKeys();
            if (activeKeys.length === 0) {
                throw new Error('활성화된 API 키가 없습니다. ApiKeyManager에 키를 추가해주세요.');
            }
            this.apiKey = activeKeys[0];

            // YouTube 클라이언트 초기화
            this.youtube = google.youtube({
                version: 'v3',
                auth: this.apiKey
            });
        }
        return this.apiKey;
    }

    /**
     * 채널 전체 데이터 수집
     * @param {Object} channelInfo 채널 기본 정보
     * @returns {Object} 수집된 채널 데이터
     */
    async collectChannelData(channelInfo) {
        ServerLogger.info('🎬 YouTube 채널 데이터 수집 시작:', channelInfo);

        try {
            // API 키 초기화
            await this.getApiKey();
            // 1단계: 채널 ID 확정
            const channelId = await this.resolveChannelId(channelInfo);
            if (!channelId) {
                throw new Error('채널 ID를 확정할 수 없습니다');
            }

            // 2단계: 채널 기본 정보 수집
            const channelDetails = await this.getChannelDetails(channelId);

            // 3단계: 최근 영상 목록 수집
            const recentVideos = await this.getRecentVideos(channelId);

            // 4단계: 영상 상세 정보 수집 (태그, 설명 포함)
            const videosWithDetails = await this.getVideoDetails(recentVideos);

            // 5단계: 데이터 통합
            const channelData = {
                channelInfo: channelDetails,
                videos: videosWithDetails,
                analysis: this.generateBasicAnalysis(channelDetails, videosWithDetails),
                collectedAt: new Date().toISOString()
            };

            ServerLogger.info(`✅ 채널 데이터 수집 완료 - 영상 ${videosWithDetails.length}개`, {
                channelName: channelDetails.title,
                subscriberCount: channelDetails.subscriberCount
            });

            return channelData;

        } catch (error) {
            ServerLogger.error('❌ 채널 데이터 수집 실패:', error);
            throw error;
        }
    }

    /**
     * 채널 ID 확정 (다양한 URL 형태 처리)
     */
    async resolveChannelId(channelInfo) {
        try {
            // 이미 채널 ID가 있는 경우
            if (channelInfo.channelId) {
                return channelInfo.channelId;
            }

            // @handle 형태 처리
            if (channelInfo.channelHandle) {
                const response = await this.youtube.search.list({
                    part: 'snippet',
                    q: `@${channelInfo.channelHandle}`,
                    type: 'channel',
                    maxResults: 1
                });

                if (response.data.items && response.data.items.length > 0) {
                    return response.data.items[0].snippet.channelId;
                }
            }

            // custom URL 또는 username 처리
            if (channelInfo.customUrl || channelInfo.username) {
                const query = channelInfo.customUrl || channelInfo.username;
                const response = await this.youtube.search.list({
                    part: 'snippet',
                    q: query,
                    type: 'channel',
                    maxResults: 5
                });

                // 가장 일치하는 채널 찾기
                for (const item of response.data.items) {
                    const customUrl = item.snippet.customUrl?.toLowerCase();
                    if (customUrl && customUrl.includes(query.toLowerCase())) {
                        return item.snippet.channelId;
                    }
                }

                // 정확한 매치를 못 찾은 경우 첫 번째 결과 반환
                if (response.data.items && response.data.items.length > 0) {
                    return response.data.items[0].snippet.channelId;
                }
            }

            return null;

        } catch (error) {
            ServerLogger.error('❌ 채널 ID 확정 실패:', error);
            return null;
        }
    }

    /**
     * 채널 상세 정보 수집
     */
    async getChannelDetails(channelId) {
        try {
            const response = await this.youtube.channels.list({
                part: ['snippet', 'statistics', 'brandingSettings'],
                id: channelId
            });

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('채널을 찾을 수 없습니다');
            }

            const channel = response.data.items[0];
            
            // channel-types.js 인터페이스 표준 채널 정보 구조
            return {
                channelId: channel.id,
                title: channel.snippet.title,
                description: channel.snippet.description,
                customUrl: channel.snippet.customUrl,
                publishedAt: channel.snippet.publishedAt,
                thumbnailUrl: channel.snippet.thumbnails,
                channelCountry: channel.snippet.country,
                language: channel.snippet.defaultLanguage,
                
                // 통계
                statistics: {
                    channelViews: parseInt(channel.statistics.viewCount || 0),
                    subscribers: parseInt(channel.statistics.subscriberCount || 0),
                    channelVideos: parseInt(channel.statistics.videoCount || 0)
                },

                // 브랜딩 정보
                keywords: channel.brandingSettings?.channel?.keywords || [],
                bannerUrl: channel.brandingSettings?.image?.bannerExternalUrl,
                
                // 추가 정보
                uploadsPlaylist: channel.contentDetails?.relatedPlaylists?.uploads
            };

        } catch (error) {
            ServerLogger.error('❌ 채널 상세 정보 수집 실패:', error);
            throw error;
        }
    }

    /**
     * 최근 영상 목록 수집
     */
    async getRecentVideos(channelId) {
        try {
            const response = await this.youtube.search.list({
                part: 'snippet',
                channelId: channelId,
                order: 'date',
                type: 'video',
                maxResults: this.maxVideos,
                publishedAfter: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 최근 3개월
            });

            // video-types.js 인터페이스 표준 영상 목록 구조
            return response.data.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                uploadDate: item.snippet.publishedAt,
                thumbnailUrl: item.snippet.thumbnails
            }));

        } catch (error) {
            ServerLogger.error('❌ 최근 영상 목록 수집 실패:', error);
            throw error;
        }
    }

    /**
     * 영상 상세 정보 수집 (태그, 상세 설명 포함)
     */
    async getVideoDetails(videos) {
        try {
            if (!videos || videos.length === 0) {
                return [];
            }

            const videoIds = videos.map(video => video.videoId).slice(0, this.maxVideos);
            
            // 50개씩 배치로 처리 (API 제한)
            const batches = [];
            for (let i = 0; i < videoIds.length; i += 50) {
                batches.push(videoIds.slice(i, i + 50));
            }

            const detailedVideos = [];

            for (const batch of batches) {
                const response = await this.youtube.videos.list({
                    part: ['snippet', 'statistics', 'contentDetails'],
                    id: batch.join(',')
                });

                if (response.data.items) {
                    for (const item of response.data.items) {
                        // video-types.js 인터페이스 표준 영상 상세 정보 구조
                        detailedVideos.push({
                            videoId: item.id,
                            title: item.snippet.title,
                            description: item.snippet.description,
                            tags: item.snippet.tags || [],
                            uploadDate: item.snippet.publishedAt,
                            thumbnailUrl: item.snippet.thumbnails,
                            categoryId: item.snippet.categoryId,
                            language: item.snippet.defaultLanguage,
                            
                            // 통계
                            statistics: {
                                views: parseInt(item.statistics.viewCount || 0),
                                likes: parseInt(item.statistics.likeCount || 0),
                                commentsCount: parseInt(item.statistics.commentCount || 0)
                            },

                            // 콘텐츠 정보
                            duration: item.contentDetails.duration,
                            quality: item.contentDetails.definition
                        });
                    }
                }

                // API 제한 고려한 딜레이
                if (batches.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            ServerLogger.info(`📊 영상 상세 정보 수집 완료: ${detailedVideos.length}개`);
            return detailedVideos;

        } catch (error) {
            ServerLogger.error('❌ 영상 상세 정보 수집 실패:', error);
            throw error;
        }
    }

    /**
     * 기본 분석 데이터 생성
     */
    generateBasicAnalysis(channelDetails, videos) {
        try {
            const analysis = {
                // 채널 기본 분석
                channel: {
                    averageViewsPerVideo: Math.round(channelDetails.statistics.channelViews / channelDetails.statistics.channelVideos),
                    subscribersPerVideo: Math.round(channelDetails.statistics.subscribers / channelDetails.statistics.channelVideos),
                },

                // 영상 분석
                videos: {
                    total: videos.length,
                    averageViews: Math.round(videos.reduce((sum, v) => sum + v.statistics.views, 0) / videos.length),
                    averageLikes: Math.round(videos.reduce((sum, v) => sum + v.statistics.likes, 0) / videos.length),
                    averageComments: Math.round(videos.reduce((sum, v) => sum + v.statistics.commentsCount, 0) / videos.length),
                },

                // 태그 분석
                tags: this.analyzeTopTags(videos),

                // 업로드 패턴
                uploadPattern: this.analyzeUploadPattern(videos),

                // 콘텐츠 길이 분석
                durationAnalysis: this.analyzeDuration(videos)
            };

            return analysis;

        } catch (error) {
            ServerLogger.error('❌ 기본 분석 생성 실패:', error);
            return {};
        }
    }

    /**
     * 인기 태그 분석
     */
    analyzeTopTags(videos) {
        const tagCount = {};
        
        videos.forEach(video => {
            if (video.tags) {
                video.tags.forEach(tag => {
                    tagCount[tag] = (tagCount[tag] || 0) + 1;
                });
            }
        });

        return Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));
    }

    /**
     * 업로드 패턴 분석
     */
    analyzeUploadPattern(videos) {
        const now = new Date();
        const last7Days = videos.filter(v => new Date(v.uploadDate) > new Date(now - 7 * 24 * 60 * 60 * 1000)).length;
        const last30Days = videos.filter(v => new Date(v.uploadDate) > new Date(now - 30 * 24 * 60 * 60 * 1000)).length;

        return {
            last7Days,
            last30Days,
            dailyAverage: Math.round(last30Days / 30 * 10) / 10
        };
    }

    /**
     * 영상 길이 분석
     */
    analyzeDuration(videos) {
        const durations = videos.map(video => this.parseDuration(video.duration)).filter(d => d > 0);
        
        if (durations.length === 0) return { averageSeconds: 0, shortFormRatio: 0 };

        const averageSeconds = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const shortFormCount = durations.filter(d => d < 60).length;
        const shortFormRatio = Math.round(shortFormCount / durations.length * 100);

        return {
            averageSeconds,
            shortFormRatio,
            totalVideos: durations.length
        };
    }

    /**
     * YouTube duration 파싱 (PT1M30S -> 90초)
     */
    parseDuration(duration) {
        if (!duration) return 0;
        
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * 채널 기본 정보만 조회하는 간단한 메서드
     * channels.js에서 사용하는 getChannelData 메서드
     */
    async getChannelData(channelIdOrHandle) {
        try {
            // API 키 초기화
            await this.getApiKey();

            // 매개변수를 조건에 따라 동적으로 구성
            const params = {
                part: 'snippet,statistics'
            };

            if (channelIdOrHandle.startsWith('@')) {
                // @ 핸들인 경우
                params.forHandle = channelIdOrHandle.replace('@', '');
            } else {
                // 일반 채널 ID인 경우
                params.id = channelIdOrHandle;
            }

            const response = await this.youtube.channels.list(params);

            if (response.data.items && response.data.items.length > 0) {
                return response.data.items[0];
            }

            return null;
        } catch (error) {
            ServerLogger.error(`YouTube 채널 정보 조회 실패: ${error.message}`);
            console.error('🚨 YouTube API 에러 상세:', {
                message: error.message,
                status: error.status,
                code: error.code,
                response: error.response?.data
            });
            return null; // 에러 시 null 반환하도록 수정
        }
    }
}

module.exports = YouTubeChannelDataCollector;