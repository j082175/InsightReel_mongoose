import { google } from 'googleapis';
import { ServerLogger } from '../../../utils/logger';
import { ChannelInfo, VideoDetailedInfo } from '../types/channel-types';

const MultiKeyManager = require('../../../utils/multi-key-manager').default || require('../../../utils/multi-key-manager');
const UsageTracker = require('../../../utils/usage-tracker');

export interface ChannelAnalysisData {
    channelInfo: ChannelInfo;
    videos: VideoDetailedInfo[];
    analysis: ChannelBasicAnalysis;
    collectedAt: string;
}

export interface ChannelBasicAnalysis {
    channel: {
        averageViewsPerVideo: number;
        subscribersPerVideo: number;
    };
    videos: {
        total: number;
        averageViews: number;
        averageLikes: number;
        averageComments: number;
    };
    tags: Array<{ tag: string; count: number }>;
    uploadPattern: {
        last7Days: number;
        last30Days: number;
        dailyAverage: number;
    };
    durationAnalysis: {
        averageSeconds: number;
        shortFormRatio: number;
        totalVideos: number;
    };
}

export class ChannelDataCollector {
    private multiKeyManager: any;
    private usageTracker: any;
    private youtube: any;
    private readonly maxVideos = 30;

    constructor() {
        this.multiKeyManager = null;
        this.usageTracker = UsageTracker.getInstance();
        this.youtube = null;
    }

    async initialize(): Promise<void> {
        if (!this.multiKeyManager) {
            this.multiKeyManager = await MultiKeyManager.getInstance();
            const availableKey = this.multiKeyManager.getAvailableKey();
            if (availableKey) {
                this.youtube = google.youtube({
                    version: 'v3',
                    auth: availableKey.key
                });
            }
        }
    }

    async collectChannelData(channelInfo: any): Promise<ChannelAnalysisData> {
        ServerLogger.info('🎬 YouTube 채널 데이터 수집 시작:', channelInfo);

        try {
            await this.initialize();

            const channelId = await this.resolveChannelId(channelInfo);
            if (!channelId) {
                throw new Error('채널 ID를 확정할 수 없습니다');
            }

            const channelDetails = await this.getChannelDetails(channelId);
            const recentVideos = await this.getRecentVideos(channelDetails.uploadsPlaylistId);
            const videosWithDetails = await this.getVideoDetails(recentVideos);

            const analysisData: ChannelAnalysisData = {
                channelInfo: channelDetails,
                videos: videosWithDetails,
                analysis: this.generateBasicAnalysis(channelDetails, videosWithDetails),
                collectedAt: new Date().toISOString()
            };

            ServerLogger.info(`✅ 채널 데이터 수집 완료 - 영상 ${videosWithDetails.length}개`, {
                channelName: channelDetails.title,
                subscriberCount: channelDetails.statistics.subscriberCount
            });

            return analysisData;

        } catch (error) {
            ServerLogger.error('❌ 채널 데이터 수집 실패:', error);
            throw error;
        }
    }

    private async resolveChannelId(channelInfo: any): Promise<string | null> {
        try {
            if (channelInfo.channelId) {
                return channelInfo.channelId;
            }

            if (channelInfo.channelHandle) {
                ServerLogger.info(`🔍 @handle 조회 (최적화): @${channelInfo.channelHandle}`);
                const response = await this.youtube.channels.list({
                    part: 'id',
                    forHandle: channelInfo.channelHandle.replace('@', '')
                });

                if (response.data.items && response.data.items.length > 0) {
                    ServerLogger.info(`✅ @handle 조회 성공 (1 할당량)`);
                    return response.data.items[0].id;
                }
            }

            if (channelInfo.username) {
                ServerLogger.info(`🔍 username 조회 (최적화): ${channelInfo.username}`);
                const response = await this.youtube.channels.list({
                    part: 'id',
                    forUsername: channelInfo.username
                });

                if (response.data.items && response.data.items.length > 0) {
                    ServerLogger.info(`✅ username 조회 성공 (1 할당량)`);
                    return response.data.items[0].id;
                }
            }

            ServerLogger.warn(`⚠️ 채널 ID 확정 실패 - 지원되지 않는 형태:`, channelInfo);
            return null;

        } catch (error) {
            ServerLogger.error('❌ 채널 ID 확정 실패:', error);
            return null;
        }
    }

    private async getChannelDetails(channelId: string): Promise<ChannelInfo> {
        try {
            const response = await this.youtube.channels.list({
                part: ['snippet', 'statistics', 'brandingSettings', 'contentDetails'],
                id: channelId
            });

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('채널을 찾을 수 없습니다');
            }

            const channel = response.data.items[0];
            const snippet = channel.snippet || {};
            const statistics = channel.statistics || {};
            const contentDetails = channel.contentDetails || {};

            return {
                channelId: channel.id,
                title: snippet.title || '',
                description: snippet.description || '',
                customUrl: snippet.customUrl,
                publishedAt: snippet.publishedAt || '',
                country: snippet.country,
                defaultLanguage: snippet.defaultLanguage,
                uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads || '',
                statistics: {
                    viewCount: parseInt(statistics.viewCount) || 0,
                    subscriberCount: parseInt(statistics.subscriberCount) || 0,
                    videoCount: parseInt(statistics.videoCount) || 0,
                },
                thumbnails: {
                    default: snippet.thumbnails?.default,
                    medium: snippet.thumbnails?.medium,
                    high: snippet.thumbnails?.high,
                },
            };

        } catch (error) {
            ServerLogger.error('❌ 채널 상세 정보 수집 실패:', error);
            throw error;
        }
    }

    private async getRecentVideos(uploadsPlaylistId: string): Promise<any[]> {
        try {
            if (!uploadsPlaylistId) {
                ServerLogger.warn('⚠️ uploads 플레이리스트 ID가 없습니다.');
                return [];
            }

            const videos: any[] = [];
            let nextPageToken: string | null = null;
            const maxResults = 50;
            const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

            while (videos.length < this.maxVideos) {
                const params: any = {
                    part: 'snippet',
                    playlistId: uploadsPlaylistId,
                    maxResults: Math.min(maxResults, this.maxVideos - videos.length)
                };

                if (nextPageToken) {
                    params.pageToken = nextPageToken;
                }

                const response = await this.youtube.playlistItems.list(params);

                if (!response.data.items || response.data.items.length === 0) {
                    break;
                }

                const recentItems = response.data.items.filter((item: any) => {
                    const publishedDate = new Date(item.snippet.publishedAt);
                    return publishedDate >= threeMonthsAgo;
                });

                const formattedVideos = recentItems.map((item: any) => ({
                    videoId: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    publishedAt: item.snippet.publishedAt,
                    thumbnails: item.snippet.thumbnails
                }));

                videos.push(...formattedVideos);

                if (recentItems.length < response.data.items.length) {
                    break;
                }

                nextPageToken = response.data.nextPageToken;
                if (!nextPageToken) break;

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            ServerLogger.info(`📺 영상 목록 수집 완료: ${videos.length}개 (playlistItems 방식 - 95% 할당량 절약!)`);
            return videos.slice(0, this.maxVideos);

        } catch (error) {
            ServerLogger.error('❌ 최근 영상 목록 수집 실패:', error);
            throw error;
        }
    }

    private async getVideoDetails(videos: any[]): Promise<VideoDetailedInfo[]> {
        try {
            if (!videos || videos.length === 0) {
                return [];
            }

            const videoIds = videos.map(video => video.videoId).slice(0, this.maxVideos);

            const batches: string[][] = [];
            for (let i = 0; i < videoIds.length; i += 50) {
                batches.push(videoIds.slice(i, i + 50));
            }

            const detailedVideos: VideoDetailedInfo[] = [];

            for (const batch of batches) {
                const response = await this.youtube.videos.list({
                    part: ['snippet', 'statistics', 'contentDetails'],
                    id: batch.join(',')
                });

                if (response.data.items) {
                    for (const item of response.data.items) {
                        detailedVideos.push({
                            videoId: item.id,
                            title: item.snippet.title,
                            description: item.snippet.description,
                            publishedAt: item.snippet.publishedAt,
                            thumbnails: item.snippet.thumbnails,
                            duration: item.contentDetails.duration,
                            categoryId: item.snippet.categoryId,
                            tags: item.snippet.tags || [],
                            statistics: {
                                viewCount: parseInt(item.statistics.viewCount || 0),
                                likeCount: parseInt(item.statistics.likeCount || 0),
                                commentCount: parseInt(item.statistics.commentCount || 0),
                            },
                            contentDetails: {
                                duration: item.contentDetails.duration,
                                definition: item.contentDetails.definition,
                                caption: item.contentDetails.caption === 'true',
                            },
                            snippet: {
                                liveBroadcastContent: item.snippet.liveBroadcastContent,
                                defaultLanguage: item.snippet.defaultLanguage,
                                defaultAudioLanguage: item.snippet.defaultAudioLanguage,
                            },
                        });
                    }
                }

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

    private generateBasicAnalysis(channelDetails: ChannelInfo, videos: VideoDetailedInfo[]): ChannelBasicAnalysis {
        try {
            const analysis: ChannelBasicAnalysis = {
                channel: {
                    averageViewsPerVideo: Math.round(channelDetails.statistics.viewCount / channelDetails.statistics.videoCount),
                    subscribersPerVideo: Math.round(channelDetails.statistics.subscriberCount / channelDetails.statistics.videoCount),
                },
                videos: {
                    total: videos.length,
                    averageViews: Math.round(videos.reduce((sum, v) => sum + v.statistics.viewCount, 0) / videos.length),
                    averageLikes: Math.round(videos.reduce((sum, v) => sum + (v.statistics.likeCount || 0), 0) / videos.length),
                    averageComments: Math.round(videos.reduce((sum, v) => sum + (v.statistics.commentCount || 0), 0) / videos.length),
                },
                tags: this.analyzeTopTags(videos),
                uploadPattern: this.analyzeUploadPattern(videos),
                durationAnalysis: this.analyzeDuration(videos)
            };

            return analysis;

        } catch (error) {
            ServerLogger.error('❌ 기본 분석 생성 실패:', error);
            return {
                channel: { averageViewsPerVideo: 0, subscribersPerVideo: 0 },
                videos: { total: 0, averageViews: 0, averageLikes: 0, averageComments: 0 },
                tags: [],
                uploadPattern: { last7Days: 0, last30Days: 0, dailyAverage: 0 },
                durationAnalysis: { averageSeconds: 0, shortFormRatio: 0, totalVideos: 0 }
            };
        }
    }

    private analyzeTopTags(videos: VideoDetailedInfo[]): Array<{ tag: string; count: number }> {
        const tagCount: { [key: string]: number } = {};

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

    private analyzeUploadPattern(videos: VideoDetailedInfo[]): { last7Days: number; last30Days: number; dailyAverage: number } {
        const now = new Date();
        const last7Days = videos.filter(v => new Date(v.publishedAt) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length;
        const last30Days = videos.filter(v => new Date(v.publishedAt) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)).length;

        return {
            last7Days,
            last30Days,
            dailyAverage: Math.round(last30Days / 30 * 10) / 10
        };
    }

    private analyzeDuration(videos: VideoDetailedInfo[]): { averageSeconds: number; shortFormRatio: number; totalVideos: number } {
        const durations = videos.map(video => this.parseDuration(video.duration)).filter(d => d > 0);

        if (durations.length === 0) return { averageSeconds: 0, shortFormRatio: 0, totalVideos: 0 };

        const averageSeconds = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const shortFormCount = durations.filter(d => d < 60).length;
        const shortFormRatio = Math.round(shortFormCount / durations.length * 100);

        return {
            averageSeconds,
            shortFormRatio,
            totalVideos: durations.length
        };
    }

    private parseDuration(duration: string): number {
        if (!duration) return 0;

        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    async getChannelData(channelIdOrHandle: string): Promise<any> {
        try {
            await this.initialize();

            const params: any = {
                part: 'snippet,statistics'
            };

            if (channelIdOrHandle.startsWith('@')) {
                params.forHandle = channelIdOrHandle.replace('@', '');
            } else {
                params.id = channelIdOrHandle;
            }

            const response = await this.youtube.channels.list(params);

            if (response.data.items && response.data.items.length > 0) {
                return response.data.items[0];
            }

            return null;
        } catch (error: any) {
            ServerLogger.error(`YouTube 채널 정보 조회 실패: ${error.message}`);
            return null;
        }
    }

    clearApiKeyCache(): void {
        this.multiKeyManager = null;
        this.youtube = null;
        ServerLogger.info('🔄 ChannelDataCollector API 키 캐시 클리어');
    }
}

export default ChannelDataCollector;