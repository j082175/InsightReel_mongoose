import axios from 'axios';
import { ServerLogger } from '../../utils/logger';
import { ChannelInfoCollector } from './analyzers/ChannelInfoCollector';
import {
    ChannelInfo,
    ChannelAnalysisResult,
    ChannelAnalysisConfig,
    VideoDetailedInfo
} from './types/channel-types';

// TypeScript 모듈들 ES6 import 사용
import AIAnalyzer from '../ai/AIAnalyzer';
import UnifiedCategoryManager from '../UnifiedCategoryManager';
import UsageTracker from '../../utils/usage-tracker';
// VideoProcessor import - remove unused dependency
// const VideoProcessor = require('../../../dist/server/services/video/VideoProcessor');

interface YouTubeChannelInfo {
    id: string;
    title: string;
    description: string;
    uploadsPlaylistId: string;
    statistics: {
        subscriberCount: number;
        videoCount: number;
        viewCount: number;
    };
    thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
    };
    customUrl?: string;
    publishedAt: string;
    defaultLanguage?: string;
    country?: string;
}

interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    duration: string;
    statistics: {
        viewCount: number;
        likeCount: number;
        commentCount: number;
    };
    thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
    };
}

export class YouTubeChannelAnalyzer {
    private channelInfoCollector: ChannelInfoCollector;
    private aiAnalyzer: any;
    private categoryManager: any;
    // private videoProcessor: any; // Removed unused dependency
    private usageTracker: any;
    private initialized: boolean = false;
    private baseURL: string = 'https://www.googleapis.com/youtube/v3';
    private apiKey: string | null = null;
    private channelStats: any = null; // YouTube API 채널 통계 저장

    constructor() {
        this.channelInfoCollector = new ChannelInfoCollector();
        this.usageTracker = UsageTracker.getInstance();
        // this.videoProcessor = new VideoProcessor(); // Removed unused dependency

        // 서비스 레지스트리에 등록
        this.registerToServiceRegistry();

        ServerLogger.success('🔧 YouTube 채널 분석 서비스 초기화 완료');
    }

    /**
     * 초기화
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            await this.channelInfoCollector.initialize();

            // AI 분석기 및 카테고리 매니저 초기화
            this.aiAnalyzer = new AIAnalyzer();
            this.categoryManager = UnifiedCategoryManager.getInstance({
                mode: 'dynamic',
            });

            this.initialized = true;
            ServerLogger.info('YouTube 채널 분석기 초기화 완료');

        } catch (error) {
            ServerLogger.error('YouTube 채널 분석기 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * API 키 가져오기
     */
    private async getApiKey(): Promise<string> {
        if (!this.apiKey) {
            const { getInstance } = await import('../ApiKeyManager');
            const apiKeyManager = getInstance();
            await apiKeyManager.initialize();
            const activeKeys = await apiKeyManager.getActiveApiKeys();
            if (activeKeys.length === 0) {
                throw new Error('활성화된 API 키가 없습니다. ApiKeyManager에 키를 추가해주세요.');
            }
            this.apiKey = activeKeys[0].apiKey;
        }
        return this.apiKey!; // Assert non-null since we check for activeKeys length above
    }

    /**
     * 채널 기본 분석 (간소화된 버전)
     */
    async analyzeChannelBasic(channelId: string): Promise<ChannelAnalysisResult> {
        try {
            await this.initialize();

            ServerLogger.info('📊 채널 기본 분석 시작:', { channelId });

            // 1. 채널 기본 정보 수집
            const channelInfo = await this.channelInfoCollector.getChannelInfo(channelId);
            if (!channelInfo) {
                throw new Error('채널 정보를 찾을 수 없습니다');
            }

            // 2. 기본 통계 분석
            const basicStats = this.generateBasicStats(channelInfo);

            // 3. 기본 결과 구성
            const result: ChannelAnalysisResult = {
                channelInfo,
                videosCount: channelInfo.statistics.videoCount,
                analysis: {
                    overallStats: basicStats,
                    contentPatterns: this.generateEmptyContentPatterns(),
                    audienceEngagement: this.generateEmptyAudienceEngagement(),
                    channelIdentity: this.generateBasicChannelIdentity(channelInfo),
                    recommendations: [
                        '더 상세한 분석을 위해 영상 데이터를 수집하세요',
                        '정기적인 업로드 스케줄을 유지하세요',
                        '채널 브랜딩을 일관성 있게 유지하세요'
                    ]
                },
                videos: [] // 기본 분석에서는 개별 영상 데이터 제외
            };

            ServerLogger.success('✅ 채널 기본 분석 완료:', {
                channelId,
                title: channelInfo.title,
                subscriberCount: channelInfo.statistics.subscriberCount
            });

            return result;

        } catch (error) {
            ServerLogger.error('❌ 채널 분석 실패:', error);
            throw error;
        }
    }

    /**
     * 채널의 상세 분석 (완전한 TypeScript 구현)
     */
    async analyzeChannel(channelId: string, config?: ChannelAnalysisConfig): Promise<any> {
        try {
            await this.initialize();

            const maxVideos = config?.maxVideos || 200;
            const enableContentAnalysis = config?.enableContentAnalysis || false;
            const youtubeChannelData = config?.youtubeChannelData;

            // YouTube API 통계 저장
            this.channelStats = youtubeChannelData;

            ServerLogger.info('📊 채널 상세 분석 시작:', { channelId, maxVideos, enableContentAnalysis });

            // 1. 채널 기본 정보 및 업로드 플레이리스트 ID 가져오기
            const channelInfo = await this.getChannelInfo(channelId);
            if (!channelInfo) {
                throw new Error('채널 정보를 찾을 수 없습니다.');
            }

            // 2. 채널의 모든 영상 목록 가져오기
            const videos = await this.getChannelVideos(channelInfo.uploadsPlaylistId, maxVideos);

            // 3. 영상들의 상세 정보 가져오기
            const detailedVideos = await this.getVideosDetails(videos);

            // 4. 기본 분석 수행
            const analysis = this.performAnalysis(detailedVideos);

            let result: any = {
                channelInfo,
                videosCount: detailedVideos.length,
                analysis,
                videos: detailedVideos,
            };

            // 5. 향상된 분석 (레거시 로직 적용: 숏폼 vs 롱폼 분석 전략 선택)
            if (enableContentAnalysis) {
                ServerLogger.info(`📊 shortFormRatio: ${analysis.shortFormRatio}%`);

                if (analysis.shortFormRatio < 50) {
                    ServerLogger.info("📚 롱폼 채널 - 메타데이터 기반 분석 시작 (이미지 추출 없음)");

                    // 롱폼 채널: 메타데이터만 사용하는 분석
                    const longformAnalysis = await this.analyzeLongformChannel(
                        detailedVideos,
                        channelInfo
                    );

                    result.enhancedAnalysis = {
                        channelIdentity: longformAnalysis,
                        analysisMethod: "metadata_only",
                        analyzedVideos: detailedVideos.length
                    };

                } else {
                    ServerLogger.info("🎬 숏폼 채널 - 콘텐츠 분석 시작 (최신 5개 영상 다운로드)");

                    // 숏폼 채널: 실제 영상 다운로드 + 콘텐츠 분석
                    const shortformAnalysis = await this.analyzeShortformChannel(
                        channelId,
                        detailedVideos.slice(0, 5), // 최신 5개 영상
                        channelInfo
                    );

                    result.enhancedAnalysis = shortformAnalysis;
                }
            }

            ServerLogger.success('✅ 채널 상세 분석 완료:', {
                channelId,
                videosAnalyzed: detailedVideos.length,
                hasEnhancedAnalysis: !!result.enhancedAnalysis
            });

            return result;

        } catch (error) {
            ServerLogger.error('❌ 채널 상세 분석 실패:', error);
            throw error;
        }
    }

    /**
     * 채널 존재 여부 확인
     */
    async checkChannelExists(channelId: string): Promise<boolean> {
        try {
            await this.initialize();
            return await this.channelInfoCollector.checkChannelExists(channelId);
        } catch (error) {
            ServerLogger.warn('채널 존재 확인 실패:', error);
            return false;
        }
    }

    /**
     * 채널 통계만 조회
     */
    async getChannelStats(channelId: string): Promise<{
        subscriberCount: number;
        videoCount: number;
        viewCount: number;
    } | null> {
        try {
            await this.initialize();
            return await this.channelInfoCollector.getChannelStats(channelId);
        } catch (error) {
            ServerLogger.warn('채널 통계 조회 실패:', error);
            return null;
        }
    }

    /**
     * 기본 통계 생성
     */
    private generateBasicStats(channelInfo: ChannelInfo): any {
        return {
            totalVideos: channelInfo.statistics.videoCount,
            totalViews: channelInfo.statistics.viewCount,
            totalLikes: 0, // 기본 분석에서는 수집하지 않음
            totalComments: 0,
            averageViews: channelInfo.statistics.videoCount > 0
                ? Math.floor(channelInfo.statistics.viewCount / channelInfo.statistics.videoCount)
                : 0,
            averageLikes: 0,
            averageComments: 0,
            uploadFrequency: {
                videosPerWeek: 0,
                videosPerMonth: 0,
                consistencyScore: 0
            },
            performanceMetrics: {
                topPerformingVideo: {
                    videoId: '',
                    title: '',
                    views: 0
                },
                averageEngagementRate: 0,
                viewsDistribution: {
                    under1K: 0,
                    under10K: 0,
                    under100K: 0,
                    over100K: 0
                }
            }
        };
    }

    /**
     * 빈 콘텐츠 패턴 생성
     */
    private generateEmptyContentPatterns(): any {
        return {
            dominantCategories: [],
            contentTypes: { shorts: 0, regular: 0, long: 0 },
            uploadTiming: { preferredDays: [], preferredHours: [], timezonePattern: '' },
            titlePatterns: { averageLength: 0, commonWords: [], questionTitles: 0, seriesTitles: 0 },
            thumbnailStyle: { colorScheme: [], hasText: false, hasFaces: false, style: '' }
        };
    }

    /**
     * 빈 오디언스 참여도 생성
     */
    private generateEmptyAudienceEngagement(): any {
        return {
            engagementTrends: [],
            commentSentiment: { positive: 0, neutral: 0, negative: 0 },
            loyaltyMetrics: { subscriberGrowthRate: 0, viewsFromSubscribers: 0, repeatViewerRate: 0 },
            peakEngagementTimes: []
        };
    }

    /**
     * 기본 채널 정체성 생성
     */
    private generateBasicChannelIdentity(channelInfo: ChannelInfo): any {
        return {
            primaryNiche: '분석 필요',
            targetAudience: '분석 필요',
            contentThemes: [],
            uniqueSellingPoints: [],
            brandPersonality: {
                tone: '분석 필요',
                style: '분석 필요',
                approach: '분석 필요'
            },
            competitorAnalysis: {
                similarChannels: [],
                differentiationFactors: [],
                marketPosition: '분석 필요'
            },
            contentStrategy: {
                strengths: ['구독자 ' + channelInfo.statistics.subscriberCount + '명 보유'],
                weaknesses: [],
                opportunities: [],
                threats: []
            }
        };
    }

    /**
     * 서비스 레지스트리 등록
     */
    private registerToServiceRegistry(): void {
        import('../../utils/service-registry').then(module => {
            const serviceRegistry = module.default;
            serviceRegistry.register(this);
        }).catch(error => {
            ServerLogger.warn('서비스 레지스트리 등록 실패:', error);
        });
    }

    /**
     * 채널 기본 정보 및 업로드 플레이리스트 ID 가져오기
     */
    private async getChannelInfo(channelId: string): Promise<YouTubeChannelInfo | null> {
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
                    uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
                    statistics: {
                        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
                        videoCount: parseInt(channel.statistics.videoCount) || 0,
                        viewCount: parseInt(channel.statistics.viewCount) || 0,
                    },
                    thumbnails: channel.snippet.thumbnails || {},
                    customUrl: channel.snippet.customUrl,
                    publishedAt: channel.snippet.publishedAt,
                    defaultLanguage: channel.snippet.defaultLanguage,
                    country: channel.snippet.country,
                };
            }

            return null;
        } catch (error) {
            ServerLogger.error('채널 정보 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 채널의 모든 영상 목록 가져오기 (플레이리스트 방식)
     */
    private async getChannelVideos(uploadsPlaylistId: string, maxVideos: number = 200): Promise<string[]> {
        try {
            const videos: string[] = [];
            let nextPageToken: string | undefined;
            let totalFetched = 0;

            while (totalFetched < maxVideos) {
                const remainingVideos = maxVideos - totalFetched;
                const pageSize = Math.min(remainingVideos, 50); // YouTube API 최대 50개

                const response = await axios.get(`${this.baseURL}/playlistItems`, {
                    params: {
                        key: await this.getApiKey(),
                        part: 'contentDetails',
                        playlistId: uploadsPlaylistId,
                        maxResults: pageSize,
                        ...(nextPageToken && { pageToken: nextPageToken }),
                    },
                });

                this.usageTracker.increment('youtube-playlistItems', true);

                if (response.data.items && response.data.items.length > 0) {
                    const videoIds = response.data.items.map(
                        (item: any) => item.contentDetails.videoId
                    );
                    videos.push(...videoIds);
                    totalFetched += videoIds.length;
                }

                nextPageToken = response.data.nextPageToken;
                if (!nextPageToken || response.data.items.length === 0) {
                    break;
                }

                // API 호출 간격 (Rate Limit 방지)
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            ServerLogger.info(`📊 채널 영상 목록 수집 완료: ${videos.length}개`);
            return videos;
        } catch (error) {
            ServerLogger.error('채널 영상 목록 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 영상들의 상세 정보 가져오기
     */
    private async getVideosDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
        try {
            const videos: YouTubeVideo[] = [];
            const batchSize = 50; // YouTube API 최대 50개

            for (let i = 0; i < videoIds.length; i += batchSize) {
                const batch = videoIds.slice(i, i + batchSize);
                const idsParam = batch.join(',');

                const response = await axios.get(`${this.baseURL}/videos`, {
                    params: {
                        key: await this.getApiKey(),
                        part: 'snippet,statistics,contentDetails',
                        id: idsParam,
                    },
                });

                this.usageTracker.increment('youtube-videos', true);

                if (response.data.items && response.data.items.length > 0) {
                    const batchVideos = response.data.items.map((video: any) => ({
                        id: video.id,
                        title: video.snippet.title,
                        description: video.snippet.description,
                        publishedAt: video.snippet.publishedAt,
                        duration: video.contentDetails.duration,
                        statistics: {
                            viewCount: parseInt(video.statistics.viewCount) || 0,
                            likeCount: parseInt(video.statistics.likeCount) || 0,
                            commentCount: parseInt(video.statistics.commentCount) || 0,
                        },
                        thumbnails: video.snippet.thumbnails || {},
                    }));
                    videos.push(...batchVideos);
                }

                // API 호출 간격 (Rate Limit 방지)
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            ServerLogger.info(`📊 영상 상세 정보 수집 완료: ${videos.length}개`);
            return videos;
        } catch (error) {
            ServerLogger.error('영상 상세 정보 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 기본 분석 수행
     */
    private performAnalysis(videos: YouTubeVideo[]): any {
        try {
            // 기본 통계 계산
            const totalViews = videos.reduce((sum, video) => sum + video.statistics.viewCount, 0);
            const totalLikes = videos.reduce((sum, video) => sum + video.statistics.likeCount, 0);
            const totalComments = videos.reduce((sum, video) => sum + video.statistics.commentCount, 0);

            const averageViews = videos.length > 0 ? Math.floor(totalViews / videos.length) : 0;
            const averageLikes = videos.length > 0 ? Math.floor(totalLikes / videos.length) : 0;
            const averageComments = videos.length > 0 ? Math.floor(totalComments / videos.length) : 0;

            // 영상 길이별 분류
            const shortFormVideos = videos.filter(video => this.parseDuration(video.duration) <= 60);
            const shortFormRatio = videos.length > 0 ? (shortFormVideos.length / videos.length) * 100 : 0;

            // 최고 조회수 영상
            const mostViewedVideo = videos.reduce((prev, current) =>
                prev.statistics.viewCount > current.statistics.viewCount ? prev : current
            , videos[0] || null);

            // 업로드 빈도 계산
            const uploadFrequency = this.calculateUploadFrequency(videos);

            // 기간별 조회수 분석
            const viewsByPeriod = this.analyzeViewsByPeriod(videos);

            // 최근 7일 조회수 (근사치)
            const last7DaysViews = this.calculateLast7DaysViews(videos);

            // 평균 영상 길이
            const avgDurationSeconds = this.calculateAverageDuration(videos);
            const avgDurationFormatted = this.formatDuration(avgDurationSeconds);

            return {
                totalVideos: videos.length,
                totalViews,
                totalLikes,
                totalComments,
                averageViews,
                averageLikes,
                averageComments,
                shortFormRatio,
                mostViewedVideo: mostViewedVideo ? {
                    videoId: mostViewedVideo.id,
                    title: mostViewedVideo.title,
                    views: mostViewedVideo.statistics.viewCount
                } : null,
                uploadFrequency,
                viewsByPeriod,
                last7DaysViews,
                avgDurationSeconds,
                avgDurationFormatted,
                dailyUploadRate: uploadFrequency.videosPerDay || 0,
                averageViewsPerVideo: averageViews,
                videoAnalyses: videos.map(video => ({
                    videoId: video.id,
                    title: video.title,
                    views: video.statistics.viewCount,
                    likes: video.statistics.likeCount,
                    comments: video.statistics.commentCount,
                    publishedAt: video.publishedAt,
                    duration: video.duration
                }))
            };
        } catch (error) {
            ServerLogger.error('분석 수행 실패:', error);
            throw error;
        }
    }

    /**
     * 향상된 AI 분석 수행
     */
    private async performEnhancedAnalysis(channelId: string, videos: YouTubeVideo[], basicAnalysis: any): Promise<any> {
        try {
            ServerLogger.info('🤖 AI 향상 분석 시작');

            // 채널 정체성 분석을 위한 영상 샘플 준비
            const sampleVideos = videos.slice(0, 20); // 최근 20개 영상
            const videoTitles = sampleVideos.map(v => v.title);
            const videoDescriptions = sampleVideos.map(v => v.description).filter(d => d && d.length > 50);

            // AI 분석 수행
            const channelIdentity = await this.aiAnalyzer.analyzeChannelIdentity({
                channelId,
                videoTitles,
                videoDescriptions: videoDescriptions.slice(0, 5), // 상위 5개 설명만
                basicStats: basicAnalysis
            });

            ServerLogger.success('✅ AI 향상 분석 완료');

            return {
                channelIdentity
            };
        } catch (error) {
            ServerLogger.warn('⚠️ AI 향상 분석 실패:', error);
            return {
                channelIdentity: {
                    targetAudience: '',
                    contentStyle: '',
                    uniqueFeatures: [],
                    channelPersonality: '',
                    channelTags: []
                }
            };
        }
    }

    /**
     * 사용자 카테고리 기반 재해석
     */
    async reinterpretWithUserCategory(
        userKeywords: string[],
        aiTags: string[],
        videoAnalyses: any[],
        channelInfo: { id: string; channelName: string }
    ): Promise<string[]> {
        try {
            ServerLogger.info('🔄 사용자 카테고리 기반 재해석 시작');

            const deepInsightTags = await this.aiAnalyzer.reinterpretWithUserCategory(
                userKeywords,
                aiTags,
                videoAnalyses,
                channelInfo
            );

            return deepInsightTags || [];
        } catch (error) {
            ServerLogger.warn('⚠️ 재해석 실패:', error);
            return [];
        }
    }

    // 유틸리티 메서드들
    private parseDuration(duration: string): number {
        // PT4M13S -> 253 seconds
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return hours * 3600 + minutes * 60 + seconds;
    }

    private calculateUploadFrequency(videos: YouTubeVideo[]): any {
        if (videos.length === 0) return { videosPerDay: 0, videosPerWeek: 0, videosPerMonth: 0 };

        const sortedVideos = videos.sort((a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

        const latest = new Date(sortedVideos[0].publishedAt);
        const earliest = new Date(sortedVideos[sortedVideos.length - 1].publishedAt);
        const daysDiff = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff === 0) return { videosPerDay: 0, videosPerWeek: 0, videosPerMonth: 0 };

        const videosPerDay = videos.length / daysDiff;
        return {
            videosPerDay,
            videosPerWeek: videosPerDay * 7,
            videosPerMonth: videosPerDay * 30
        };
    }

    private analyzeViewsByPeriod(videos: YouTubeVideo[]): any {
        const now = new Date();
        const last30Days = videos.filter(v => {
            const publishedDate = new Date(v.publishedAt);
            const daysDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
        });

        const last30DaysViews = last30Days.reduce((sum, v) => sum + v.statistics.viewCount, 0);

        return {
            last30Days: last30DaysViews,
            total: videos.reduce((sum, v) => sum + v.statistics.viewCount, 0)
        };
    }

    private calculateLast7DaysViews(videos: YouTubeVideo[]): number {
        const now = new Date();
        const last7Days = videos.filter(v => {
            const publishedDate = new Date(v.publishedAt);
            const daysDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        });

        return last7Days.reduce((sum, v) => sum + v.statistics.viewCount, 0);
    }

    private calculateAverageDuration(videos: YouTubeVideo[]): number {
        if (videos.length === 0) return 0;
        const totalSeconds = videos.reduce((sum, v) => sum + this.parseDuration(v.duration), 0);
        return Math.floor(totalSeconds / videos.length);
    }

    private formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * API 키 캐시 클리어 (호환성)
     */
    clearApiKeyCache(): void {
        ServerLogger.info('🔄 YouTubeChannelAnalyzer API 키 캐시 클리어');
        this.apiKey = null;
    }

    /**
     * 롱폼 채널 메타데이터 + 썸네일 기반 분석
     */
    private async analyzeLongformChannel(videos: YouTubeVideo[], channelInfo: YouTubeChannelInfo): Promise<any> {
        try {
            ServerLogger.info('📚 롱폼 채널 메타데이터 + 썸네일 기반 분석 시작');

            // 1. 메타데이터 집계
            const metadata = this.aggregateMetadata(videos, channelInfo);

            // 2. 썸네일 URL 수집 (최신 20개 영상)
            const thumbnailUrls = videos
                .slice(0, 20)
                .map(video => {
                    const thumbnails = video.thumbnails;
                    return thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url;
                })
                .filter(url => url) as string[];

            ServerLogger.info(`📊 수집된 썸네일: ${thumbnailUrls.length}개`);

            // 3. AI 분석 수행 (메타데이터 + 썸네일)
            const videoTitles = metadata.titles.sample;
            const videoDescriptions = metadata.descriptions.sample;
            const basicStats = {
                subscriberCount: channelInfo.statistics?.subscriberCount || 0,
                videoCount: videos.length,
                totalViews: metadata.views.total,
                avgViews: metadata.views.average
            };

            const channelIdentity = await this.aiAnalyzer.analyzeChannelIdentity({
                channelId: channelInfo.id,
                videoTitles,
                videoDescriptions: videoDescriptions.slice(0, 5),
                videoFramePaths: thumbnailUrls, // 썸네일 URL 전달
                basicStats
            });

            ServerLogger.success(`✅ 롱폼 채널 분석 완료: ${channelIdentity.channelTags?.length || 0}개 태그 생성`);
            return channelIdentity;

        } catch (error) {
            ServerLogger.error('❌ 롱폼 채널 분석 실패', error);
            return {
                targetAudience: '',
                contentStyle: '',
                uniqueFeatures: [],
                channelPersonality: '',
                channelTags: []
            };
        }
    }

    /**
     * 숏폼 채널 썸네일 기반 분석 (최신 20개 영상의 썸네일 + 메타데이터)
     */
    private async analyzeShortformChannel(channelId: string, recentVideos: YouTubeVideo[], channelInfo: YouTubeChannelInfo): Promise<any> {
        try {
            ServerLogger.info('🎬 숏폼 채널 썸네일 기반 분석 시작 (최신 20개 영상)');

            // 최신 20개 영상으로 확장 (중복 제거)
            const uniqueVideos = Array.from(
                new Map(recentVideos.map(v => [v.id, v])).values()
            );
            const videosToAnalyze = uniqueVideos.slice(0, 20);

            if (uniqueVideos.length < recentVideos.length) {
                ServerLogger.info(`🔍 중복 영상 제거: ${recentVideos.length}개 → ${uniqueVideos.length}개`);
            }

            // 1. 썸네일 URL 수집
            const thumbnailUrls = videosToAnalyze
                .map(video => {
                    const thumbnails = video.thumbnails;
                    return thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url;
                })
                .filter(url => url) as string[];

            ServerLogger.info(`📊 수집된 썸네일: ${thumbnailUrls.length}개`);

            // 2. 댓글 수집 (첫 5개 영상에서만)
            const videoComments = [];
            const videosForComments = videosToAnalyze.slice(0, 5);
            ServerLogger.info(`🔍 댓글 수집 시작: ${videosForComments.length}개 영상`);

            for (let i = 0; i < videosForComments.length; i++) {
                const video = videosForComments[i];
                try {
                    ServerLogger.info(`📝 [${i + 1}/${videosForComments.length}] 댓글 수집 중: ${video.title.substring(0, 30)}... (ID: ${video.id})`);
                    const comments = await this.getVideoComments(video.id, 15);
                    videoComments.push(...comments);
                    ServerLogger.info(`✅ 댓글 수집 완료: ${video.title} (${comments.length}개)`);
                } catch (commentError) {
                    ServerLogger.warn(`⚠️ 댓글 수집 실패: ${video.title}`, commentError);
                }
                await new Promise(resolve => setTimeout(resolve, 500)); // API rate limit
            }

            // 3. 메타데이터 준비
            const videoTitles = videosToAnalyze.map(v => v.title);
            const videoDescriptions = videosToAnalyze.map(v => v.description).filter(d => d && d.length > 50);

            const basicStats = {
                subscriberCount: channelInfo.statistics?.subscriberCount || 0,
                videoCount: videosToAnalyze.length,
                shortFormAnalysis: true
            };

            // 4. AI 분석 수행 (썸네일 + 메타데이터 + 댓글)
            const channelIdentity = await this.aiAnalyzer.analyzeChannelIdentity({
                channelId,
                videoTitles,
                videoDescriptions: videoDescriptions.slice(0, 10),
                videoComments, // 댓글 추가
                videoFramePaths: thumbnailUrls, // 썸네일 URL 전달
                basicStats
            });

            ServerLogger.success(`✅ 숏폼 채널 분석 완료: ${channelIdentity.channelTags?.length || 0}개 태그 생성`);

            return {
                channelIdentity,
                analysisMethod: "thumbnail_and_metadata",
                analyzedVideos: videosToAnalyze.length,
                thumbnailsUsed: thumbnailUrls.length,
                commentsCollected: videoComments.length
            };

        } catch (error) {
            ServerLogger.error('❌ 숏폼 채널 분석 실패', error);
            throw error;
        }
    }

    /**
     * 영상의 댓글 가져오기 (레거시 호환)
     */
    private async getVideoComments(videoId: string, maxComments: number = 20): Promise<any[]> {
        try {
            const response = await axios.get(`${this.baseURL}/commentThreads`, {
                params: {
                    key: await this.getApiKey(),
                    part: 'snippet',
                    videoId: videoId,
                    maxResults: maxComments,
                    order: 'relevance'
                }
            });

            if (response.data && response.data.items) {
                return response.data.items.map((item: any) => ({
                    text: item.snippet.topLevelComment.snippet.textDisplay,
                    author: item.snippet.topLevelComment.snippet.authorDisplayName,
                    publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
                    likeCount: item.snippet.topLevelComment.snippet.likeCount || 0
                }));
            }

            return [];
        } catch (error) {
            ServerLogger.warn(`⚠️ 댓글 수집 실패: ${videoId}`, error);
            return [];
        }
    }

    /**
     * 메타데이터 집계 (제목, 설명, 태그 등)
     */
    private aggregateMetadata(videos: YouTubeVideo[], channelInfo: YouTubeChannelInfo): any {
        // 모든 제목 수집
        const allTitles = videos.map(v => v.title).filter(t => t && t.length > 0);

        // 모든 설명 수집 (비어있지 않은 것만)
        const allDescriptions = videos.map(v => v.description).filter(d => d && d.length > 10);

        // 조회수 통계
        const viewCounts = videos.map(v => v.statistics.viewCount || 0);
        const totalViews = viewCounts.reduce((sum, v) => sum + v, 0);
        const avgViews = totalViews / viewCounts.length;

        // 영상 길이 통계
        const durations = videos.map(v => this.parseDuration(v.duration));
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

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
            views: {
                total: totalViews,
                average: avgViews,
                counts: viewCounts
            },
            duration: {
                average: avgDuration,
                all: durations
            }
        };
    }

    /**
     * 싱글톤 인스턴스
     */
    private static instance: YouTubeChannelAnalyzer | null = null;

    static async getInstance(): Promise<YouTubeChannelAnalyzer> {
        if (!this.instance) {
            this.instance = new YouTubeChannelAnalyzer();
            await this.instance.initialize();
        }
        return this.instance;
    }

    /**
     * 인스턴스 재설정 (테스트용)
     */
    static resetInstance(): void {
        this.instance = null;
    }
}

export default YouTubeChannelAnalyzer;