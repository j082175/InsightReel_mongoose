const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const UsageTracker = require('../utils/usage-tracker');
const AIAnalyzer = require('./AIAnalyzer');
const UnifiedCategoryManager = require('./UnifiedCategoryManager');

/**
 * YouTube 채널 상세 분석 서비스
 * 채널의 영상 데이터를 분석하여 상세 통계 제공
 */
class YouTubeChannelAnalyzer {
    constructor() {
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
        this.usageTracker = UsageTracker.getInstance();
        this.aiAnalyzer = new AIAnalyzer();
        this.categoryManager = UnifiedCategoryManager.getInstance({
            mode: 'dynamic',
        });
        this.apiKey = null; // ApiKeyManager에서 동적으로 로드

        // 서비스 레지스트리에 등록
        const serviceRegistry = require('../utils/service-registry');
        serviceRegistry.register(this);

        ServerLogger.success('🔧 YouTube 채널 분석 서비스 초기화 완료');
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
        }
        return this.apiKey;
    }

    /**
     * 채널의 상세 분석 정보 수집
     */
    async analyzeChannel(channelId, maxVideos = 200) {
        try {
            ServerLogger.info(`📊 채널 상세 분석 시작: ${channelId}`);

            // 1. 채널 기본 정보 및 업로드 플레이리스트 ID 가져오기
            const channelInfo = await this.getChannelInfo(channelId);
            if (!channelInfo) {
                throw new Error('채널 정보를 찾을 수 없습니다.');
            }

            // 2. 채널의 모든 영상 목록 가져오기
            const videos = await this.getChannelVideos(
                channelInfo.uploadsPlaylistId,
                maxVideos,
            );

            // 3. 영상들의 상세 정보 가져오기
            const detailedVideos = await this.getVideosDetails(videos);

            // 4. 분석 수행
            const analysis = this.performAnalysis(detailedVideos);

            ServerLogger.success(
                `✅ 채널 분석 완료: ${detailedVideos.length}개 영상 분석`,
            );

            return {
                channelInfo,
                videosCount: detailedVideos.length,
                analysis,
                videos: detailedVideos,
            };
        } catch (error) {
            ServerLogger.error(`❌ 채널 분석 실패: ${channelId}`, error);
            throw error;
        }
    }

    /**
     * 채널 기본 정보 및 업로드 플레이리스트 ID 가져오기
     */
    async getChannelInfo(channelId) {
        try {
            const response = await axios.get(`${this.baseURL}/channels`, {
                params: {
                    key: await this.getApiKey(),
                    part: 'snippet,statistics,contentDetails',
                    id: channelId,
                },
            });

            this.usageTracker.increment('youtube-channels', true);

            if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                return {
                    id: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    uploadsPlaylistId:
                        channel.contentDetails.relatedPlaylists.uploads,
                    totalVideos: parseInt(channel.statistics.videoCount) || 0,
                    totalViews: parseInt(channel.statistics.viewCount) || 0,
                    subscribers:
                        parseInt(channel.statistics.subscriberCount) || 0,
                    // 추가된 필드들
                    defaultLanguage: channel.snippet.defaultLanguage || '',
                    country: channel.snippet.country || '',
                    customUrl: channel.snippet.customUrl || '',
                    publishedAt: channel.snippet.publishedAt || '',
                };
            }

            return null;
        } catch (error) {
            this.usageTracker.increment('youtube-channels', false);
            throw error;
        }
    }

    /**
     * 채널의 업로드 영상 목록 가져오기 (최대 maxVideos개)
     */
    async getChannelVideos(uploadsPlaylistId, maxVideos = 200) {
        try {
            const videos = [];
            let nextPageToken = null;
            const maxResults = 50; // YouTube API 최대값

            while (videos.length < maxVideos) {
                const params = {
                    key: await this.getApiKey(),
                    part: 'snippet',
                    playlistId: uploadsPlaylistId,
                    maxResults: Math.min(maxResults, maxVideos - videos.length),
                };

                if (nextPageToken) {
                    params.pageToken = nextPageToken;
                }

                const response = await axios.get(
                    `${this.baseURL}/playlistItems`,
                    { params },
                );
                this.usageTracker.increment('youtube-channels', true);

                if (response.data.items) {
                    response.data.items.forEach((item) => {
                        videos.push({
                            videoId: item.snippet.resourceId.videoId,
                            title: item.snippet.title,
                            publishedAt: item.snippet.publishedAt,
                            thumbnailUrl:
                                item.snippet.thumbnails?.medium?.url || '',
                        });
                    });
                }

                nextPageToken = response.data.nextPageToken;
                if (!nextPageToken) break;

                // API 호출 간격
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            ServerLogger.info(`📺 영상 목록 수집 완료: ${videos.length}개`);
            return videos;
        } catch (error) {
            this.usageTracker.increment('youtube-channels', false);
            throw error;
        }
    }

    /**
     * 영상들의 상세 정보 가져오기 (조회수, 길이 등)
     */
    async getVideosDetails(videos) {
        try {
            const detailedVideos = [];
            const batchSize = 50; // YouTube API 최대값

            for (let i = 0; i < videos.length; i += batchSize) {
                const batch = videos.slice(i, i + batchSize);
                const videoIds = batch.map((v) => v.videoId).join(',');

                const response = await axios.get(`${this.baseURL}/videos`, {
                    params: {
                        key: await this.getApiKey(),
                        part: 'snippet,statistics,contentDetails',
                        id: videoIds,
                    },
                });

                this.usageTracker.increment('youtube-channels', true);

                if (response.data.items) {
                    response.data.items.forEach((video) => {
                        const originalVideo = batch.find(
                            (v) => v.videoId === video.id,
                        );
                        if (originalVideo) {
                            detailedVideos.push({
                                ...originalVideo,
                                viewCount:
                                    parseInt(video.statistics.viewCount) || 0,
                                likeCount:
                                    parseInt(video.statistics.likeCount) || 0,
                                commentCount:
                                    parseInt(video.statistics.commentCount) ||
                                    0,
                                duration: video.contentDetails.duration,
                                durationSeconds: this.parseDuration(
                                    video.contentDetails.duration,
                                ),
                                tags: video.snippet.tags || [],
                                categoryId: video.snippet.categoryId,
                            });
                        }
                    });
                }

                // API 호출 간격
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            ServerLogger.info(
                `📊 영상 상세정보 수집 완료: ${detailedVideos.length}개`,
            );
            return detailedVideos;
        } catch (error) {
            this.usageTracker.increment('youtube-channels', false);
            throw error;
        }
    }

    /**
     * YouTube 시간 형식(PT4M13S)을 초로 변환
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
     * 영상 데이터 분석 수행
     */
    performAnalysis(videos) {
        ServerLogger.info(`🔍 performAnalysis 호출: ${videos?.length || 0}개 비디오`);

        if (!videos || videos.length === 0) {
            ServerLogger.warn('⚠️ 비디오 데이터 없음 - 빈 분석 반환');
            return this.getEmptyAnalysis();
        }

        const now = new Date();
        const periods = {
            week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };

        // 1. 채널 설명은 이미 기본 정보에서 가져옴

        // 2. 일평균 업로드 (최근 30일 기준)
        const recentVideos = videos.filter(
            (v) => new Date(v.publishedAt) > periods.month,
        );
        const dailyUploadRate = recentVideos.length / 30;

        // 3. 최근 7일 조회수
        const last7DaysVideos = videos.filter(
            (v) => new Date(v.publishedAt) > periods.week,
        );
        const last7DaysViews = last7DaysVideos.reduce(
            (sum, v) => sum + v.viewCount,
            0,
        );

        // 4. 영상 평균시간
        const totalDuration = videos.reduce(
            (sum, v) => sum + v.durationSeconds,
            0,
        );
        const avgDurationSeconds =
            videos.length > 0 ? totalDuration / videos.length : 0;

        // 5. 숏폼 비율 (60초 이하)
        const shortVideos = videos.filter((v) => v.durationSeconds <= 60);
        const shortFormRatio =
            videos.length > 0 ? (shortVideos.length / videos.length) * 100 : 0;

        // 6. 채널 일별 조회수 (기간별)
        const viewsByPeriod = {
            last7Days: this.calculateViewsInPeriod(videos, periods.week),
            last30Days: this.calculateViewsInPeriod(videos, periods.month),
            last90Days: this.calculateViewsInPeriod(videos, periods.quarter),
            lastYear: this.calculateViewsInPeriod(videos, periods.year),
        };

        // 추가 통계
        // 계산된 통계 (분석된 비디오 기준)
        const calculatedTotalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
        const calculatedTotalVideos = videos.length;

        const additionalStats = {
            // YouTube API 통계가 있으면 우선 사용, 없으면 계산된 값 사용
            totalVideos: this.channelStats?.channelVideos || calculatedTotalVideos,
            totalViews: this.channelStats?.channelViews || calculatedTotalViews,

            // 평균은 API 통계 기준으로 계산 (더 정확함)
            averageViewsPerVideo: this.channelStats?.channelViews && this.channelStats?.channelVideos
                ? Math.round(this.channelStats.channelViews / this.channelStats.channelVideos)
                : (calculatedTotalVideos > 0 ? Math.round(calculatedTotalViews / calculatedTotalVideos) : 0),

            mostViewedVideo: videos.reduce(
                (max, v) => (v.viewCount > max.viewCount ? v : max),
                videos[0] || {},
            ),
            uploadFrequency: this.calculateUploadFrequency(videos),
        };

        return {
            // 요청된 6가지 정보
            dailyUploadRate: Math.round(dailyUploadRate * 100) / 100,
            last7DaysViews,
            avgDurationSeconds: Math.round(avgDurationSeconds),
            avgDurationFormatted: this.formatDuration(avgDurationSeconds),
            shortFormRatio: Math.round(shortFormRatio * 100) / 100,
            viewsByPeriod,

            // 추가 통계
            ...additionalStats,
        };
    }

    /**
     * 특정 기간 내 영상들의 조회수 합계
     */
    calculateViewsInPeriod(videos, startDate) {
        return videos
            .filter((v) => new Date(v.publishedAt) > startDate)
            .reduce((sum, v) => sum + v.viewCount, 0);
    }

    /**
     * 업로드 빈도 분석
     */
    calculateUploadFrequency(videos) {
        if (videos.length < 2) return { pattern: 'insufficient_data' };

        // 업로드 간격 계산
        const sortedVideos = videos
            .map((v) => ({ ...v, date: new Date(v.publishedAt) }))
            .sort((a, b) => b.date - a.date);

        const intervals = [];
        for (let i = 0; i < sortedVideos.length - 1; i++) {
            const daysDiff =
                (sortedVideos[i].date - sortedVideos[i + 1].date) /
                (1000 * 60 * 60 * 24);
            intervals.push(daysDiff);
        }

        const avgInterval =
            intervals.reduce((sum, interval) => sum + interval, 0) /
            intervals.length;

        let pattern;
        if (avgInterval <= 1) pattern = 'daily';
        else if (avgInterval <= 3) pattern = 'multiple_per_week';
        else if (avgInterval <= 7) pattern = 'weekly';
        else if (avgInterval <= 15) pattern = 'bi_weekly';
        else if (avgInterval <= 31) pattern = 'monthly';
        else pattern = 'irregular';

        return {
            pattern,
            avgDaysBetweenUploads: Math.round(avgInterval * 100) / 100,
            consistency: this.calculateConsistency(intervals),
        };
    }

    /**
     * 업로드 일관성 계산 (0-100점)
     */
    calculateConsistency(intervals) {
        if (intervals.length < 3) return 0;

        const mean =
            intervals.reduce((sum, interval) => sum + interval, 0) /
            intervals.length;
        const variance =
            intervals.reduce(
                (sum, interval) => sum + Math.pow(interval - mean, 2),
                0,
            ) / intervals.length;
        const standardDeviation = Math.sqrt(variance);

        // 표준편차가 작을수록 일관성이 높음 (100점 만점)
        const consistencyScore = Math.max(
            0,
            100 - (standardDeviation / mean) * 100,
        );
        return Math.round(consistencyScore);
    }

    /**
     * 초를 "4분 13초" 형식으로 변환
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}시간 ${minutes}분 ${secs}초`;
        } else if (minutes > 0) {
            return `${minutes}분 ${secs}초`;
        } else {
            return `${secs}초`;
        }
    }

    /**
     * 영상의 댓글 가져오기
     */
    async getVideoComments(videoId, maxComments = 20) {
        try {
            const response = await axios.get(`${this.baseURL}/commentThreads`, {
                params: {
                    key: await this.getApiKey(),
                    part: 'snippet',
                    videoId: videoId,
                    maxResults: maxComments,
                    order: 'relevance',
                },
            });

            this.usageTracker.increment('youtube-comments', true);

            if (response.data.items) {
                return response.data.items.map((item) => ({
                    text: item.snippet.topLevelComment.snippet.textDisplay,
                    author: item.snippet.topLevelComment.snippet
                        .authorDisplayName,
                    likeCount:
                        item.snippet.topLevelComment.snippet.likeCount || 0,
                    publishedAt:
                        item.snippet.topLevelComment.snippet.publishedAt,
                }));
            }

            return [];
        } catch (error) {
            this.usageTracker.increment('youtube-comments', false);
            ServerLogger.warn(
                `⚠️ 댓글 수집 실패 (${videoId}): ${error.message}`,
            );
            return [];
        }
    }

    /**
     * 개별 영상 콘텐츠 분석 (Flash Lite)
     */
    async analyzeVideoContent(video, comments = []) {
        try {
            const videoData = {
                title: video.title,
                description: video.description || '',
                tags: video.tags || [],
                duration: video.durationSeconds,
                viewCount: video.viewCount,
                comments: comments.slice(0, 10).map((c) => c.text), // 상위 10개 댓글만
            };

            const prompt = `다음 YouTube 영상을 분석하여 핵심 콘텐츠 성격을 파악해주세요.

영상 정보:
- 제목: ${videoData.title}
- 설명: ${videoData.description}
- 태그: ${videoData.tags.join(', ')}
- 길이: ${videoData.duration}초
- 조회수: ${videoData.viewCount}회

주요 댓글들:
${videoData.comments.map((comment, i) => `${i + 1}. ${comment}`).join('\n')}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:

{
  "contentType": "실제 영상의 주요 주제",
  "subCategory": "세부 카테고리",
  "keywords": ["관련", "키워드", "목록"],
  "audience": "대상 시청자",
  "tone": "콘텐츠 톤앤매너"
}`;

            const analysis =
                await this.aiAnalyzer.geminiManager.generateContent(
                    prompt,
                    null, // 이미지 없음 (텍스트만)
                    { modelType: 'flash-lite' },
                );

            // UnifiedGeminiManager 응답 처리
            let responseText;
            if (typeof analysis === 'object' && analysis.text) {
                responseText = analysis.text; // UnifiedGeminiManager 응답 형태
            } else if (typeof analysis === 'string') {
                responseText = analysis; // 직접 문자열
            } else {
                throw new Error('Unexpected response format');
            }

            // JSON 파싱 처리
            let cleanedResponse = responseText.trim();
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse
                    .split('```json')[1]
                    .split('```')[0]
                    .trim();
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse
                    .split('```')[1]
                    .split('```')[0]
                    .trim();
            }

            return JSON.parse(cleanedResponse);
        } catch (error) {
            ServerLogger.warn(`⚠️ 영상 콘텐츠 분석 실패: ${error.message}`);
            return {
                contentType: '기타',
                subCategory: '분석 실패',
                keywords: [],
                audience: '알 수 없음',
                tone: '알 수 없음',
            };
        }
    }

    /**
     * 채널 종합 분석 (Pro) - 카테고리 시스템 통합
     */
    async synthesizeChannelIdentity(videoAnalyses, channelInfo) {
        try {
            // 1. 기존 채널 정체성 분석 수행
            const identityPrompt = `다음은 YouTube 채널 "${
                channelInfo.title
            }"의 최근 5개 영상 분석 결과입니다.

영상 분석 결과:
${videoAnalyses
    .map(
        (analysis, i) =>
            `영상 ${i + 1}: ${analysis.contentType} - ${
                analysis.subCategory
            } (${(analysis.keywords || []).join(', ')})`,
    )
    .join('\n')}

채널 정보:
- 구독자: ${channelInfo.subscribers?.toLocaleString()}명
- 설명: ${channelInfo.description}

위의 5개 영상 분석 결과에서 공통적으로 나타나는 패턴을 찾아 채널의 핵심 정체성을 파악하세요.
중복되거나 일회성 주제는 제외하고, 채널의 일관된 콘텐츠 방향성을 중심으로 분석하세요.

**중요 지침:**
- channelTags는 10-15개 정도로 제한하여 핵심 주제에만 집중
- 각 영상에서 나타나는 개별적 주제보다는 채널 전체의 일관된 테마 우선
- 실제로 반복되는 키워드와 주제만 포함

반드시 아래 JSON 형식으로만 응답하세요:

{
  "primaryCategory": "채널의 핵심 카테고리",
  "secondaryCategories": ["보조 카테고리 1-2개"],
  "channelTags": ["핵심적이고", "일관된", "채널태그", "10-15개"],
  "targetAudience": "주요 타겟층",
  "contentStyle": "콘텐츠 특징",
  "uniqueFeatures": ["채널만의 특색"],
  "channelPersonality": "전반적 성격"
}`;

            // 2. 카테고리 분석을 위한 추가 프롬프트 생성 (일관성 검증 포함)
            const categoryPrompt =
                this.categoryManager.buildDynamicCategoryPrompt('YOUTUBE') +
                `

**분석할 채널 정보:**
- 채널명: ${channelInfo.title}
- 구독자: ${channelInfo.subscribers?.toLocaleString()}명
- 설명: ${channelInfo.description}

**채널의 주요 콘텐츠 패턴:**
${videoAnalyses
    .map(
        (analysis, i) =>
            `${i + 1}. ${analysis.contentType} - ${analysis.subCategory}`,
    )
    .join('\n')}

**채널 태그들:**
${videoAnalyses
    .flatMap((a) => a.keywords || [])
    .slice(0, 20)
    .join(', ')}

**🎯 일관성 검증 지침:**
위 5개 영상을 분석했을 때, 콘텐츠가 **일관된 주제**를 다루고 있나요?
- ✅ **일관성 높음**: 모든 영상이 비슷한 주제/장르 → 세부 카테고리까지 생성
- ⚠️ **일관성 중간**: 2-3개 주제가 섞여있음 → 대카테고리 + 중카테고리까지만
- ❌ **일관성 부족**: 완전히 다른 주제들이 섞여있음 → 대카테고리만 지정

응답 형식에 일관성 평가를 포함하세요:

{
  "consistency_level": "high|medium|low",
  "consistency_reason": "일관성 판단 이유",
  "full_path": "대카테고리 > 중카테고리 > 소카테고리 [또는 더 짧게]",
  "main_category": "대카테고리",
  "depth": 3,
  "confidence": 0.85,
  "keywords": ["키워드1", "키워드2"],
  "hashtags": ["#태그1", "#태그2"],
  "content": "콘텐츠 요약"
}`;

            // 병렬로 두 분석 수행
            const [identityAnalysis, categoryAnalysis] = await Promise.all([
                this.aiAnalyzer.geminiManager.generateContent(
                    identityPrompt,
                    null, // 이미지 없음 (텍스트만)
                    { modelType: 'pro' },
                ),
                this.aiAnalyzer.geminiManager.generateContent(
                    categoryPrompt,
                    null, // 이미지 없음 (텍스트만)
                    { modelType: 'flash-lite' },
                ),
            ]);

            // 1. 채널 정체성 분석 결과 파싱
            let identityResponseText;
            if (typeof identityAnalysis === 'object' && identityAnalysis.text) {
                identityResponseText = identityAnalysis.text;
            } else if (typeof identityAnalysis === 'string') {
                identityResponseText = identityAnalysis;
            } else {
                throw new Error('Identity analysis response format error');
            }

            let cleanedIdentityResponse = identityResponseText.trim();
            if (cleanedIdentityResponse.includes('```json')) {
                cleanedIdentityResponse = cleanedIdentityResponse
                    .split('```json')[1]
                    .split('```')[0]
                    .trim();
            } else if (cleanedIdentityResponse.includes('```')) {
                cleanedIdentityResponse = cleanedIdentityResponse
                    .split('```')[1]
                    .split('```')[0]
                    .trim();
            }

            const identity = JSON.parse(cleanedIdentityResponse);

            // 2. 카테고리 분석 결과 파싱
            const metadata = { platform: 'YOUTUBE', title: channelInfo.title };
            const categoryResult =
                this.categoryManager.processDynamicCategoryResponse(
                    categoryAnalysis,
                    metadata,
                    'flash-lite',
                );

            // 3. 통합 결과 반환
            const result = {
                ...identity,
                // 카테고리 정보 추가 (일관성 정보 포함)
                categoryInfo: {
                    majorCategory: categoryResult.mainCategory,
                    middleCategory: categoryResult.middleCategory,
                    fullCategoryPath: categoryResult.fullPath,
                    categoryDepth: categoryResult.depth,
                    categoryConfidence: categoryResult.confidence,
                    consistencyLevel: categoryResult.consistencyLevel,
                    consistencyReason: categoryResult.consistencyReason,
                },
                // 기존 필드들 유지하면서 카테고리 관련 키워드 병합
                channelTags: [
                    ...(identity.channelTags || []),
                    ...(categoryResult.keywords || []),
                ].slice(0, 15),
            };

            ServerLogger.success(
                `✅ 채널 종합 분석 완료: ${result.categoryInfo.fullCategoryPath} (${result.categoryInfo.categoryDepth}단계)`,
            );

            return result;
        } catch (error) {
            ServerLogger.error(`❌ 채널 종합 분석 실패: ${error.message}`);
            return {
                primaryCategory: '기타',
                secondaryCategories: [],
                channelTags: [],
                targetAudience: '분석 실패',
                contentStyle: '분석 실패',
                uniqueFeatures: [],
                channelPersonality: '분석 실패',
            };
        }
    }

    /**
     * 향상된 채널 분석 (콘텐츠 + 댓글 분석 포함)
     */
    async analyzeChannelEnhanced(
        channelId,
        maxVideos = 200,
        includeContentAnalysis = false,
        channelStats = null, // YouTube API 채널 통계
    ) {
        // YouTube API 통계 저장 (performAnalysis에서 사용)
        this.channelStats = channelStats;
        try {
            ServerLogger.info(`🔍 향상된 채널 분석 시작: ${channelId}`);
            ServerLogger.info(
                `🔍 DEBUG: includeContentAnalysis = ${includeContentAnalysis}`,
            );

            // 기본 분석 수행
            const basicAnalysis = await this.analyzeChannel(
                channelId,
                maxVideos,
            );
            ServerLogger.info(
                `🔍 DEBUG: basicAnalysis 결과 - videos: ${basicAnalysis.videos?.length || 0}개, shortFormRatio: ${basicAnalysis.analysis.shortFormRatio}`,
            );

            // 콘텐츠 분석이 활성화된 경우 분석 수행
            if (!includeContentAnalysis) {
                ServerLogger.info('📊 기본 분석만 수행 (콘텐츠 분석 비활성화)');
                return basicAnalysis;
            }

            // 숏폼 vs 롱폼 분석 전략 선택
            if (basicAnalysis.analysis.shortFormRatio < 50) {
                ServerLogger.info('📚 롱폼 채널 - 메타데이터 기반 분석 시작');

                // 롱폼 채널 분석
                const longformAnalysis = await this.analyzeLongformChannel(
                    basicAnalysis.videos,
                    basicAnalysis.channelInfo,
                );

                // 디버깅: 롱폼 분석 결과 확인
                ServerLogger.info(
                    '🔍 롱폼 분석 결과:',
                    JSON.stringify(longformAnalysis, null, 2),
                );

                const result = {
                    ...basicAnalysis,
                    analysis: {
                        ...basicAnalysis.analysis,
                        // 롱폼 채널의 경우 enhancedAnalysis 구조에 channelIdentity 포함
                        enhancedAnalysis: {
                            channelIdentity: {
                                channelTags: longformAnalysis.channelTags || [],
                                primaryCategory:
                                    longformAnalysis.primaryCategory,
                                secondaryCategories:
                                    longformAnalysis.secondaryCategories || [],
                                targetAudience: longformAnalysis.targetAudience,
                                contentStyle: longformAnalysis.contentStyle,
                                uniqueFeatures:
                                    longformAnalysis.uniqueFeatures || [],
                                channelPersonality:
                                    longformAnalysis.channelPersonality,
                            },
                        },
                    },
                };

                // 디버깅: 최종 결과 확인
                ServerLogger.info(
                    '🔍 최종 결과 aiTags:',
                    JSON.stringify(
                        result.analysis.enhancedAnalysis?.channelIdentity
                            ?.channelTags,
                    ),
                );

                return result;
            }

            ServerLogger.info('🎬 숏폼 채널 - 콘텐츠 분석 시작');

            // 최신 5개 영상 선택
            const recentVideos = basicAnalysis.videos.slice(0, 5);

            // 각 영상의 댓글 수집 및 콘텐츠 분석
            const videoAnalyses = [];
            for (const video of recentVideos) {
                ServerLogger.info(`🔍 영상 분석 중: ${video.title}`);

                const comments = await this.getVideoComments(video.videoId, 15);
                const contentAnalysis = await this.analyzeVideoContent(
                    video,
                    comments,
                );

                videoAnalyses.push(contentAnalysis);

                // API 호출 간격 (상수 사용)
                const UnifiedGeminiManager = require('../utils/unified-gemini-manager');
                await new Promise((resolve) => setTimeout(resolve, UnifiedGeminiManager.VIDEO_ANALYSIS_DELAY));
            }

            // 채널 종합 분석
            const channelIdentity = await this.synthesizeChannelIdentity(
                videoAnalyses,
                basicAnalysis.channelInfo,
            );

            ServerLogger.success(
                `✅ 향상된 채널 분석 완료: AI 태그 ${channelIdentity.channelTags.length}개 생성`,
            );

            return {
                ...basicAnalysis,
                enhancedAnalysis: {
                    videoAnalyses,
                    channelIdentity,
                    analysisMethod: 'content_and_comments',
                    analyzedVideos: recentVideos.length,
                },
            };
        } catch (error) {
            ServerLogger.error(`❌ 향상된 채널 분석 실패: ${channelId}`, error);
            throw error;
        }
    }

    /**
     * 빈 분석 결과 반환
     */
    getEmptyAnalysis() {
        return {
            dailyUploadRate: 0,
            last7DaysViews: 0,
            avgDurationSeconds: 0,
            avgDurationFormatted: '0초',
            shortFormRatio: 0,
            viewsByPeriod: {
                last7Days: 0,
                last30Days: 0,
                last90Days: 0,
                lastYear: 0,
            },
            totalVideos: 0,
            totalViews: 0,
            averageViewsPerVideo: 0,
            uploadFrequency: { pattern: 'no_data' },
        };
    }

    /**
     * 롱폼 채널 메타데이터 기반 분석
     */
    async analyzeLongformChannel(videos, channelInfo) {
        try {
            // 1. 메타데이터 집계
            const metadata = this.aggregateMetadata(videos, channelInfo);

            // 2. Gemini로 종합 분석 (1회 호출)
            const analysis = await this.synthesizeLongformChannelIdentity(
                metadata,
            );

            ServerLogger.success(
                `✅ 롱폼 채널 분석 완료: ${
                    analysis.channelTags?.length || 0
                }개 태그 생성`,
            );
            return analysis;
        } catch (error) {
            ServerLogger.error('❌ 롱폼 채널 분석 실패', error);
            return {
                primaryCategory: '일반',
                channelTags: [],
                targetAudience: '일반 시청자',
                contentStyle: '롱폼 콘텐츠',
                channelPersonality: '정보 전달형',
            };
        }
    }

    /**
     * 메타데이터 집계 (제목, 설명, 태그 등)
     */
    aggregateMetadata(videos, channelInfo) {
        // 모든 제목 수집
        const allTitles = videos
            .map((v) => v.title)
            .filter((t) => t && t.length > 0);

        // 모든 설명 수집 (비어있지 않은 것만)
        const allDescriptions = videos
            .map((v) => v.description)
            .filter((d) => d && d.length > 10);

        // 모든 태그 수집
        const allTags = videos
            .flatMap((v) => v.tags || [])
            .filter((t) => t && t.length > 0);

        // 카테고리 ID 집계
        const categoryIds = videos.map((v) => v.categoryId).filter((c) => c);
        const categoryFreq = {};
        categoryIds.forEach(
            (c) => (categoryFreq[c] = (categoryFreq[c] || 0) + 1),
        );

        // 조회수 통계
        const viewCounts = videos.map((v) => v.viewCount || 0);
        const totalViews = viewCounts.reduce((sum, v) => sum + v, 0);
        const avgViews = totalViews / viewCounts.length;

        // 영상 길이 통계
        const durations = videos.map((v) => v.durationSeconds || 0);
        const avgDuration =
            durations.reduce((sum, d) => sum + d, 0) / durations.length;

        return {
            channelInfo,
            videoCount: videos.length,
            titles: {
                all: allTitles,
                sample: allTitles.slice(0, 20), // 최신 20개만 샘플로
            },
            descriptions: {
                all: allDescriptions,
                sample: allDescriptions.slice(0, 10), // 최신 10개만 샘플로
            },
            tags: {
                all: allTags,
                frequency: this.getTagFrequency(allTags),
                top20: this.getTopTags(allTags, 20),
            },
            categories: {
                frequency: categoryFreq,
                mostCommon: Object.keys(categoryFreq).sort(
                    (a, b) => categoryFreq[b] - categoryFreq[a],
                )[0],
            },
            statistics: {
                totalViews,
                avgViews: Math.round(avgViews),
                avgDuration: Math.round(avgDuration),
            },
        };
    }

    /**
     * 태그 빈도 계산
     */
    getTagFrequency(tags) {
        const freq = {};
        tags.forEach((tag) => {
            const normalizedTag = tag.toLowerCase().trim();
            freq[normalizedTag] = (freq[normalizedTag] || 0) + 1;
        });
        return freq;
    }

    /**
     * 상위 태그 추출
     */
    getTopTags(tags, limit = 20) {
        const freq = this.getTagFrequency(tags);
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tag, count]) => ({ tag, count }));
    }

    /**
     * 롱폼 채널 종합 분석 (Gemini 1회 호출) - 카테고리 시스템 통합
     */
    async synthesizeLongformChannelIdentity(metadata) {
        // 1. 기존 채널 정체성 분석 프롬프트
        const identityPrompt = `다음 YouTube 롱폼 채널의 메타데이터를 분석하여 채널의 정체성을 파악해주세요.

채널 정보:
- 이름: ${metadata.channelInfo.title || metadata.channelInfo.name}
- 구독자: ${metadata.channelInfo.subscribers?.toLocaleString()}명
- 설명: ${metadata.channelInfo.description}
- 총 영상: ${metadata.videoCount}개

영상 제목 샘플 (최신 20개):
${metadata.titles.sample.map((title, i) => `${i + 1}. ${title}`).join('\n')}

영상 설명 샘플 (최신 10개):
${metadata.descriptions.sample
    .slice(0, 5)
    .map((desc, i) => `${i + 1}. ${desc.slice(0, 100)}...`)
    .join('\n')}

상위 태그 (빈도순):
${metadata.tags.top20
    .slice(0, 15)
    .map((item) => `- ${item.tag} (${item.count}회)`)
    .join('\n')}

통계:
- 평균 조회수: ${metadata.statistics.avgViews.toLocaleString()}회
- 평균 영상 길이: ${Math.floor(metadata.statistics.avgDuration / 60)}분 ${
            metadata.statistics.avgDuration % 60
        }초

위의 메타데이터를 종합적으로 분석하여 이 채널의 실제 정체성을 파악해주세요.
제목의 패턴, 태그의 주제, 채널 설명의 취지를 모두 고려해주세요.

반드시 아래 JSON 형식으로만 응답하세요:

{
  "primaryCategory": "채널의 주요 카테고리",
  "secondaryCategories": ["관련 부가 카테고리들"],
  "channelTags": ["실제 콘텐츠를 반영한 핵심 태그들"],
  "targetAudience": "주요 시청자층",
  "contentStyle": "콘텐츠 스타일과 특징",
  "uniqueFeatures": ["채널의 독특한 특징들"],
  "channelPersonality": "채널의 전반적 성격과 지향점"
}`;

        // 2. 카테고리 분석을 위한 추가 프롬프트 생성 (일관성 검증 포함)
        const categoryPrompt =
            this.categoryManager.buildDynamicCategoryPrompt('YOUTUBE') +
            `

**분석할 채널 정보:**
- 채널명: ${metadata.channelInfo.title || metadata.channelInfo.name}
- 구독자: ${metadata.channelInfo.subscribers?.toLocaleString()}명
- 총 영상: ${metadata.videoCount}개

**채널의 주요 콘텐츠 패턴:**
${metadata.titles.sample
    .slice(0, 10)
    .map((title, i) => `${i + 1}. ${title}`)
    .join('\n')}

**상위 태그들:**
${metadata.tags.top20
    .slice(0, 10)
    .map((item) => item.tag)
    .join(', ')}

**🎯 일관성 검증 지침:**
위 영상 제목들과 태그들을 분석했을 때, 채널이 **일관된 주제**를 다루고 있나요?
- ✅ **일관성 높음**: 모든 영상이 비슷한 주제/장르 → 세부 카테고리까지 생성
- ⚠️ **일관성 중간**: 2-3개 주제가 섞여있음 → 대카테고리 + 중카테고리까지만
- ❌ **일관성 부족**: 완전히 다른 주제들이 섞여있음 → 대카테고리만 지정

응답 형식에 일관성 평가를 포함하세요:

{
  "consistency_level": "high|medium|low",
  "consistency_reason": "일관성 판단 이유",
  "full_path": "대카테고리 > 중카테고리 > 소카테고리 [또는 더 짧게]",
  "main_category": "대카테고리",
  "depth": 3,
  "confidence": 0.85,
  "keywords": ["키워드1", "키워드2"],
  "hashtags": ["#태그1", "#태그2"],
  "content": "콘텐츠 요약"
}`;

        // 병렬로 두 분석 수행
        const [identityAnalysis, categoryAnalysis] = await Promise.all([
            this.aiAnalyzer.geminiManager.generateContent(
                identityPrompt,
                null, // 이미지 없음 (텍스트만)
                { modelType: 'pro' },
            ),
            this.aiAnalyzer.geminiManager.generateContent(
                categoryPrompt,
                null, // 이미지 없음 (텍스트만)
                { modelType: 'flash-lite' },
            ),
        ]);

        try {
            // 1. 채널 정체성 분석 결과 파싱
            let identityResponseText;
            if (identityAnalysis && identityAnalysis.text) {
                identityResponseText = identityAnalysis.text;
            } else if (
                identityAnalysis &&
                typeof identityAnalysis === 'string'
            ) {
                identityResponseText = identityAnalysis;
            } else {
                throw new Error('Identity 분석 응답을 받지 못했습니다');
            }

            const identityJsonMatch = identityResponseText.match(/\{[\s\S]*\}/);
            if (!identityJsonMatch) {
                throw new Error('Identity JSON 형식을 찾을 수 없습니다');
            }

            const identity = JSON.parse(identityJsonMatch[0]);

            // 2. 카테고리 분석 결과 파싱
            const channelMetadata = {
                platform: 'YOUTUBE',
                title: metadata.channelInfo.title || metadata.channelInfo.name,
            };
            const categoryResult =
                this.categoryManager.processDynamicCategoryResponse(
                    categoryAnalysis,
                    channelMetadata,
                    'flash-lite',
                );

            // 3. 통합 결과 반환
            const result = {
                primaryCategory: identity.primaryCategory || '일반',
                secondaryCategories: Array.isArray(identity.secondaryCategories)
                    ? identity.secondaryCategories
                    : [],
                channelTags: Array.isArray(identity.channelTags)
                    ? identity.channelTags.slice(0, 10)
                    : [],
                targetAudience: identity.targetAudience || '일반 시청자',
                contentStyle: identity.contentStyle || '롱폼 콘텐츠',
                uniqueFeatures: Array.isArray(identity.uniqueFeatures)
                    ? identity.uniqueFeatures
                    : [],
                channelPersonality:
                    identity.channelPersonality || '정보 전달형',
                // 카테고리 정보 추가 (일관성 정보 포함)
                categoryInfo: {
                    majorCategory: categoryResult.mainCategory,
                    middleCategory: categoryResult.middleCategory,
                    fullCategoryPath: categoryResult.fullPath,
                    categoryDepth: categoryResult.depth,
                    categoryConfidence: categoryResult.confidence,
                    consistencyLevel: categoryResult.consistencyLevel,
                    consistencyReason: categoryResult.consistencyReason,
                },
            };

            // 카테고리 관련 키워드를 channelTags에 병합 (중복 제거)
            const allTags = [
                ...result.channelTags,
                ...(categoryResult.keywords || []),
            ];
            result.channelTags = [...new Set(allTags)].slice(0, 15);

            ServerLogger.success(
                `✅ 롱폼 채널 종합 분석 완료: ${result.categoryInfo.fullCategoryPath} (${result.categoryInfo.categoryDepth}단계)`,
            );

            return result;
        } catch (error) {
            ServerLogger.error('❌ 롱폼 채널 분석 파싱 실패', error);

            // 파싱 실패 시 기본값 반환 (카테고리 정보 포함)
            const fallbackResult = {
                primaryCategory: '일반',
                secondaryCategories: [],
                channelTags: metadata.tags.top20
                    .slice(0, 8)
                    .map((item) => item.tag),
                targetAudience: '일반 시청자',
                contentStyle: '롱폼 콘텐츠',
                uniqueFeatures: [],
                channelPersonality: '정보 전달형',
                categoryInfo: {
                    majorCategory: '엔터테인먼트',
                    middleCategory: '일반',
                    fullCategoryPath: '엔터테인먼트 > 일반 > 기본',
                    categoryDepth: 3,
                    categoryConfidence: 0.3,
                },
            };

            return fallbackResult;
        }
    }

    /**
     * 🔄 AI 재해석: 사용자 카테고리를 기반으로 기존 AI 태그 재분석
     */
    async reinterpretWithUserCategory(
        userKeywords,
        existingAiTags,
        videoAnalyses,
        channelInfo,
    ) {
        if (!userKeywords || userKeywords.length === 0) {
            ServerLogger.warn('⚠️ 사용자 카테고리가 없어 재해석 건너뜀');
            return [];
        }

        try {
            const userCategory = userKeywords[0]; // 주요 사용자 카테고리

            // 개별 영상 분석에서 댓글 데이터 추출
            const commentsSample = [];
            if (videoAnalyses && Array.isArray(videoAnalyses)) {
                videoAnalyses.forEach((analysis, i) => {
                    if (analysis.comments && Array.isArray(analysis.comments)) {
                        commentsSample.push(
                            `영상${i + 1} 댓글: ${analysis.comments
                                .slice(0, 3)
                                .join(', ')}`,
                        );
                    }
                });
            }

            const prompt = `다음 YouTube 채널 분석에서 사용자가 특별한 관점으로 분류한 이유를 파악하고, 
사용자 관점에서 채널의 진짜 성격을 재해석해주세요.

채널 정보:
- 이름: ${channelInfo?.title || '알 수 없음'}
- 설명: ${channelInfo?.description || '설명 없음'}

기존 AI 분석 결과:
- AI 태그: ${existingAiTags.join(', ')}

사용자 분류: "${userCategory}"

영상 반응 샘플:
${commentsSample.slice(0, 5).join('\n')}

**중요**: 사용자가 "${userCategory}"로 분류한 이유를 깊이 있게 분석하고,
표면적인 주제가 아닌 시청자들의 진짜 만족 요소나 숨겨진 콘텐츠 성격을 파악하세요.

예: "권투 영상"이지만 사용자가 "참교육"으로 분류했다면, 
실제로는 "정의구현", "악인징벌", "통쾌함" 같은 심리적 만족이 핵심일 것입니다.

10개 이내의 재해석된 태그를 JSON 배열 형태로만 응답하세요:
["태그1", "태그2", "태그3", ...]`;

            ServerLogger.info(
                `🔄 AI 재해석 시작: 사용자 카테고리 "${userCategory}" 기반`,
            );

            const reinterpretation =
                await this.aiAnalyzer.geminiManager.generateContent(
                    prompt,
                    null,
                    { modelType: 'flash-lite' },
                );

            // 응답 파싱
            let responseText;
            if (typeof reinterpretation === 'object' && reinterpretation.text) {
                responseText = reinterpretation.text;
            } else if (typeof reinterpretation === 'string') {
                responseText = reinterpretation;
            } else {
                throw new Error('Unexpected response format');
            }

            // JSON 파싱
            let cleanedResponse = responseText.trim();
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse
                    .split('```json')[1]
                    .split('```')[0]
                    .trim();
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse
                    .split('```')[1]
                    .split('```')[0]
                    .trim();
            }

            const reinterpretedTags = JSON.parse(cleanedResponse);

            if (Array.isArray(reinterpretedTags)) {
                ServerLogger.success(
                    `✅ AI 재해석 완료: ${reinterpretedTags.length}개 태그 생성`,
                );
                ServerLogger.info(
                    `🏷️ 재해석 태그: ${reinterpretedTags.join(', ')}`,
                );
                return reinterpretedTags.slice(0, 10); // 최대 10개로 제한
            } else {
                throw new Error('재해석 결과가 배열이 아님');
            }
        } catch (error) {
            ServerLogger.warn(`⚠️ AI 재해석 실패: ${error.message}`);
            return []; // 실패 시 빈 배열 반환
        }
    }

    // API 키 캐시 클리어 (파일 변경 시 호출)
    clearApiKeyCache() {
        this.apiKey = null;
        ServerLogger.info('🔄 YouTubeChannelAnalyzer API 키 캐시 클리어', null, 'YT-ANALYZER');
    }
}

module.exports = YouTubeChannelAnalyzer;
