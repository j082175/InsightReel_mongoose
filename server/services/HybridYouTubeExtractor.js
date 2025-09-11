const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const MultiKeyManager = require('../utils/multi-key-manager');

/**
 * 🚀 하이브리드 YouTube 데이터 추출기
 * ytdl-core (기본 데이터) + YouTube Data API (추가 통계) 조합
 *
 * 전략:
 * 1. ytdl-core: 제목, 설명, 채널정보, 썸네일, 태그, 업로드날짜 등
 * 2. YouTube Data API: 댓글수, 정확한 좋아요수, 구독자수 등
 */
class HybridYouTubeExtractor {
    constructor() {
        this.useYtdlFirst = process.env.USE_YTDL_FIRST !== 'false'; // 기본값: true
        this.ytdlTimeout = 10000; // 10초 타임아웃

        // 멀티 키 매니저 초기화
        this.multiKeyManager = MultiKeyManager.getInstance();

        ServerLogger.info('🔧 하이브리드 YouTube 추출기 초기화', {
            keyCount: this.multiKeyManager.keys.length,
            ytdlFirst: this.useYtdlFirst,
            timeout: this.ytdlTimeout,
        });
    }

    /**
     * 모든 API 키의 사용량 현황 조회
     */
    getUsageStatus() {
        return this.multiKeyManager.getAllUsageStatus();
    }

    /**
     * 사용량 현황 로그 출력
     */
    logUsageStatus() {
        this.multiKeyManager.logUsageStatus();
    }

    /**
     * YouTube URL에서 비디오 ID 추출
     */
    extractVideoId(url) {
        if (!url) return null;

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
            /^[a-zA-Z0-9_-]{11}$/, // 직접 비디오 ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1] || match[0];
        }

        return null;
    }

    /**
     * 🎯 메인 추출 메서드 - 하이브리드 방식
     */
    async extractVideoData(url) {
        const startTime = Date.now();

        try {
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                throw new Error('유효하지 않은 YouTube URL');
            }

            ServerLogger.info('🔍 하이브리드 데이터 추출 시작', { videoId });

            // 📊 데이터 수집 전략
            const results = {};

            // 1단계: ytdl-core로 기본 데이터 추출 (빠르고 상세함)
            if (this.useYtdlFirst) {
                try {
                    const ytdlData = await this.extractWithYtdl(url);
                    results.ytdl = ytdlData;
                    ServerLogger.info('✅ ytdl-core 데이터 추출 완료', {
                        title: ytdlData.title?.substring(0, 50),
                    });
                } catch (error) {
                    ServerLogger.warn('⚠️ ytdl-core 추출 실패', error.message);
                    results.ytdl = null;
                }
            } else {
                ServerLogger.info(
                    '🚫 ytdl-core 비활성화됨 (USE_YTDL_FIRST=false)',
                );
                results.ytdl = null;
            }

            // 2단계: YouTube Data API로 추가 통계 데이터
            try {
                const apiData = await this.extractWithYouTubeAPI(videoId);
                results.api = apiData;
                ServerLogger.info('✅ YouTube Data API 데이터 추출 완료');
            } catch (error) {
                ServerLogger.warn(
                    '⚠️ YouTube Data API 추출 실패',
                    error.message,
                );
                results.api = null;
            }

            // 3단계: 데이터 병합 및 최적화
            const mergedData = this.mergeData(results.ytdl, results.api);

            const duration = Date.now() - startTime;
            ServerLogger.info('🎉 하이브리드 추출 완료', {
                duration: `${duration}ms`,
                ytdlSuccess: !!results.ytdl,
                apiSuccess: !!results.api,
                title: mergedData.title?.substring(0, 50),
            });

            return {
                success: true,
                data: mergedData,
                sources: {
                    ytdl: !!results.ytdl,
                    api: !!results.api,
                },
                extractionTime: duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            ServerLogger.error('❌ 하이브리드 추출 실패', error.message);

            return {
                success: false,
                error: error.message,
                extractionTime: duration,
            };
        }
    }

    /**
     * 🔧 ytdl-core를 이용한 데이터 추출
     */
    async extractWithYtdl(url) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('ytdl-core 타임아웃'));
            }, this.ytdlTimeout);

            try {
                const info = await ytdl.getInfo(url);
                clearTimeout(timeout);

                const details = info.videoDetails;

                ServerLogger.info(
                    `🔍 ytdl-core description 확인: "${details.description?.substring(
                        0,
                        100,
                    )}${details.description?.length > 100 ? '...' : ''}" (${
                        details.description?.length || 0
                    }자)`,
                );

                resolve({
                    // 기본 정보 (ytdl-core 강점)
                    title: details.title,
                    description: details.description,
                    duration: parseInt(details.lengthSeconds) || 0,
                    uploadDate: details.uploadDate,

                    // 채널 정보 (ytdl-core 강점)
                    channelName: details.author?.name,
                    channelId: details.author?.id,
                    channelUrl: details.author?.channel_url,

                    // 메타데이터 (ytdl-core 강점)
                    category: details.category,
                    keywords: details.keywords || [],
                    tags: details.keywords || [], // 별칭

                    // 썸네일 (ytdl-core 강점)
                    thumbnails: details.thumbnails || [],
                    thumbnail: this.getBestThumbnail(details.thumbnails),

                    // 실시간 통계 (ytdl-core 장점)
                    viewCount: parseInt(details.viewCount) || 0,

                    // 스트림 정보
                    isLiveContent: details.isLiveContent || false,
                    isLive: details.isLive || false,

                    // 소스 표시
                    source: 'ytdl-core',
                });
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * 📊 YouTube Data API를 이용한 추가 데이터 추출
     */
    async extractWithYouTubeAPI(videoId) {
        // 사용 가능한 키 찾기
        const availableKey = this.multiKeyManager.getAvailableKey();

        // 1. 비디오 정보 가져오기
        const videoResponse = await axios.get(
            'https://www.googleapis.com/youtube/v3/videos',
            {
                params: {
                    part: 'statistics,snippet,contentDetails,status,localizations',
                    id: videoId,
                    key: availableKey.key,
                },
                timeout: 8000,
            },
        );

        // YouTube Videos API 사용량 추적 (멀티키 방식)
        this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', true);

        if (
            !videoResponse.data.items ||
            videoResponse.data.items.length === 0
        ) {
            throw new Error('비디오를 찾을 수 없습니다');
        }

        const item = videoResponse.data.items[0];
        const snippet = item.snippet;
        const statistics = item.statistics;
        const contentDetails = item.contentDetails;
        const status = item.status;

        // 2. 채널 정보 가져오기 (구독자수, 채널 비디오수 등)
        let channelData = {};
        try {
            const channelResponse = await axios.get(
                'https://www.googleapis.com/youtube/v3/channels',
                {
                    params: {
                        part: 'statistics,snippet,contentDetails',
                        id: snippet.channelId,
                        key: availableKey.key,
                    },
                    timeout: 8000,
                },
            );

            // YouTube Channels API 사용량 추적 (멀티키 방식)
            this.multiKeyManager.trackAPI(
                availableKey.key,
                'youtube-channels',
                true,
            );

            if (
                channelResponse.data.items &&
                channelResponse.data.items.length > 0
            ) {
                const channel = channelResponse.data.items[0];
                channelData = {
                    subscriberCount:
                        parseInt(channel.statistics.subscriberCount) || 0,
                    channelVideoCount:
                        parseInt(channel.statistics.videoCount) || 0,
                    channelViewCount:
                        parseInt(channel.statistics.viewCount) || 0,
                    channelCountry: channel.snippet.country || '',
                    channelDescription: channel.snippet.description || '',
                    channelCustomUrl: channel.snippet.customUrl || '',
                    channelPublishedAt: channel.snippet.publishedAt,
                };

                ServerLogger.info('📺 채널 정보 추출 완료', {
                    channelTitle: snippet.channelTitle,
                    subscribers: channelData.subscriberCount,
                    videos: channelData.channelVideoCount,
                });
            }
        } catch (error) {
            ServerLogger.warn('⚠️ 채널 정보 추출 실패', error.message);
            // 채널 API 에러 추적 (멀티키 방식)
            this.multiKeyManager.trackAPI(
                availableKey.key,
                'youtube-channels',
                false,
            );
        }

        // 3. 댓글 가져오기 (상위 3개)
        let topComments = [];
        try {
            const commentsResponse = await axios.get(
                'https://www.googleapis.com/youtube/v3/commentThreads',
                {
                    params: {
                        part: 'snippet',
                        videoId: videoId,
                        order: 'relevance',
                        maxResults: 3,
                        key: availableKey.key,
                    },
                    timeout: 8000,
                },
            );

            // YouTube CommentThreads API 사용량 추적 (멀티키 방식)
            this.multiKeyManager.trackAPI(
                availableKey.key,
                'youtube-comments',
                true,
            );

            if (commentsResponse.data.items) {
                topComments = commentsResponse.data.items.map((item) => ({
                    author: item.snippet.topLevelComment.snippet
                        .authorDisplayName,
                    text: item.snippet.topLevelComment.snippet.textDisplay,
                    likeCount: item.snippet.topLevelComment.snippet.likeCount,
                }));

                ServerLogger.info('💬 댓글 추출 완료', {
                    count: topComments.length,
                });
            }
        } catch (error) {
            ServerLogger.warn(
                '⚠️ 댓글 추출 실패 (비활성화된 댓글일 수 있음)',
                error.message,
            );
            // 댓글 API 에러 추적 (멀티키 방식)
            this.multiKeyManager.trackAPI(
                availableKey.key,
                'youtube-comments',
                false,
            );
        }

        // 4. 해시태그와 멘션 추출 (설명에서)
        const hashtags = this.extractHashtags(snippet.description || '');
        const mentions = this.extractMentions(snippet.description || '');

        // API 응답 디버깅
        ServerLogger.info('📊 YouTube API 전체 데이터 디버그', {
            title: snippet.title,
            hasDescription: !!snippet.description,
            descriptionLength: snippet.description?.length || 0,
            subscribers: channelData.subscriberCount || 0,
            channelVideos: channelData.channelVideoCount || 0,
            topCommentsCount: topComments.length,
            hashtagsCount: hashtags.length,
            mentionsCount: mentions.length,
        });

        return {
            // 기본 정보 (ytdl-core 대체)
            title: snippet.title || '',
            description: snippet.description || '',
            channelName: snippet.channelTitle || '',
            channelId: snippet.channelId || '',

            // 영상 메타데이터
            duration: this.parseDuration(contentDetails.duration) || 0,
            category: snippet.categoryId || '',
            keywords: snippet.tags || [],
            tags: snippet.tags || [],

            // 통계 정보 (API 강점)
            viewCount: parseInt(statistics.viewCount) || 0,
            likeCount: parseInt(statistics.likeCount) || 0,
            commentCount: parseInt(statistics.commentCount) || 0,

            // 날짜 정보
            publishedAt: snippet.publishedAt,
            uploadDate: snippet.publishedAt,

            // 썸네일 정보
            thumbnails: snippet.thumbnails
                ? Object.values(snippet.thumbnails)
                : [],

            // 카테고리 및 메타데이터
            categoryId: snippet.categoryId,
            youtubeCategoryId: snippet.categoryId,

            // 채널 정보
            channelTitle: snippet.channelTitle,
            channelUrl: `https://www.youtube.com/channel/${snippet.channelId}`,
            subscribers: channelData.subscriberCount || 0,
            channelVideos: channelData.channelVideoCount || 0,
            channelViews: channelData.channelViewCount || 0,
            channelCountry: channelData.channelCountry || '',
            channelDescription: channelData.channelDescription || '',
            channelCustomUrl: channelData.channelCustomUrl || '',
            youtubeHandle: channelData.channelCustomUrl || '',

            // 해시태그와 멘션
            hashtags: hashtags,
            mentions: mentions,

            // 댓글
            topComments: topComments,

            // 언어 및 추가 정보
            defaultLanguage:
                snippet.defaultLanguage || snippet.defaultAudioLanguage || '',
            language:
                snippet.defaultLanguage || snippet.defaultAudioLanguage || '',

            // 라이브 스트림 정보
            isLiveContent:
                contentDetails.contentRating?.ytRating === 'ytAgeRestricted' ||
                false,
            isLive: snippet.liveBroadcastContent === 'live',
            liveBroadcast: snippet.liveBroadcastContent || 'none',

            // 상태 정보
            privacyStatus: status?.privacyStatus || 'public',
            embeddable: status?.embeddable || true,

            // 소스 표시
            source: 'youtube-api',
        };
    }

    /**
     * 해시태그 추출
     */
    extractHashtags(description) {
        if (!description) return [];
        const hashtags = description.match(/#[\w가-힣]+/g) || [];
        return [...new Set(hashtags)]; // 중복 제거
    }

    /**
     * 멘션 추출
     */
    extractMentions(description) {
        if (!description) return [];
        const mentions = description.match(/@[\w가-힣.-]+/g) || [];
        return [...new Set(mentions)]; // 중복 제거
    }

    /**
     * ISO 8601 duration을 초로 변환 (PT15M33S -> 933초)
     */
    parseDuration(isoDuration) {
        if (!isoDuration) return 0;

        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * 🔧 최적 썸네일 선택
     */
    getBestThumbnail(thumbnails) {
        if (!thumbnails || thumbnails.length === 0) return null;

        // 가장 큰 해상도 선택
        return thumbnails.reduce((best, current) => {
            if (!best) return current;
            const bestSize = (best.width || 0) * (best.height || 0);
            const currentSize = (current.width || 0) * (current.height || 0);
            return currentSize > bestSize ? current : best;
        });
    }

    /**
     * 🚀 데이터 병합 및 우선순위 적용
     */
    mergeData(ytdlData, apiData) {
        // 기본값: 빈 객체
        const merged = {};

        ServerLogger.info('🔄 데이터 병합 시작', {
            hasYtdl: !!ytdlData,
            hasApi: !!apiData,
            ytdlTitle: ytdlData?.title,
            apiTitle: apiData?.title,
        });

        // 1단계: ytdl-core 데이터를 기반으로 (더 상세함)
        if (ytdlData) {
            Object.assign(merged, ytdlData);
            ServerLogger.info('✅ ytdl 데이터 병합 완료', {
                title: merged.title,
            });
        }

        // 2단계: API 데이터로 보강/덮어쓰기
        if (apiData) {
            // ytdl 데이터가 없으면 API 데이터를 기본 데이터로 사용
            if (!ytdlData) {
                ServerLogger.info('📊 API 전용 모드: 모든 API 데이터 사용');
                Object.assign(merged, apiData);
                ServerLogger.info('✅ API 데이터 병합 완료', {
                    title: merged.title,
                    views: merged.viewCount,
                    duration: merged.duration,
                });
            } else {
                // 하이브리드 모드: API가 더 정확한 데이터들만 덮어쓰기
                if (apiData.likeCount !== undefined) {
                    merged.likeCount = apiData.likeCount;
                    merged.likes = apiData.likeCount; // 별칭
                }

                if (apiData.commentCount !== undefined) {
                    merged.commentCount = apiData.commentCount;
                    merged.commentsCount = apiData.commentCount; // 별칭
                }

                if (apiData.publishedAt) {
                    merged.publishedAt = apiData.publishedAt;
                    merged.originalPublishDate = new Date(apiData.publishedAt);
                }

                if (apiData.categoryId) {
                    merged.youtubeCategoryId = apiData.categoryId;
                }

                // 채널명 일치 확인
                if (apiData.channelTitle && !merged.channelName) {
                    merged.channelName = apiData.channelTitle;
                }
            }
        }

        // 3단계: 데이터 소스 추적
        merged.dataSources = {
            primary: ytdlData ? 'ytdl-core' : 'youtube-api',
            ytdl: !!ytdlData,
            api: !!apiData,
            hybrid: !!(ytdlData && apiData),
        };

        // 4단계: 필수 필드 보장
        merged.platform = 'YOUTUBE';
        merged.url =
            merged.url ||
            `https://youtube.com/watch?v=${this.extractVideoId(merged.url)}`;

        return merged;
    }

    /**
     * 📊 추출기 상태 및 통계
     */
    getStatus() {
        return {
            available: {
                ytdl: true,
                api: !!this.youtubeApiKey,
            },
            config: {
                ytdlFirst: this.useYtdlFirst,
                timeout: this.ytdlTimeout,
            },
            capabilities: {
                basicInfo: true,
                statistics: !!this.youtubeApiKey,
                realTimeViews: true,
                thumbnails: true,
                batchProcessing: !!this.youtubeApiKey,
            },
        };
    }
}

module.exports = HybridYouTubeExtractor;
