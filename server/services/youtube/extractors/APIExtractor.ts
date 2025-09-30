import axios from 'axios';
import { ServerLogger } from '../../../utils/logger';
import { APIVideoData, VideoComment, ChannelData } from '../types/extraction-types';
import { MetadataProcessor } from '../utils/MetadataProcessor';
import { API_TIMEOUTS } from '../../../config/api-constants';

import MultiKeyManager from '../../../utils/multi-key-manager';

export class APIExtractor {
    private multiKeyManager: any;

    constructor() {
        this.multiKeyManager = null;
    }

    /**
     * 초기화
     */
    async initialize(): Promise<void> {
        if (!this.multiKeyManager) {
            this.multiKeyManager = await MultiKeyManager.getInstance();
            ServerLogger.info('🔑 YouTube API 추출기 초기화 완료:', {
                keyCount: this.multiKeyManager.keys.length
            });
        }
    }

    /**
     * YouTube Data API를 이용한 비디오 데이터 추출
     */
    async extractVideoData(videoId: string): Promise<APIVideoData> {
        await this.initialize();

        const availableKey = this.multiKeyManager.getAvailableKey();
        if (!availableKey) {
            throw new Error('사용 가능한 YouTube API 키가 없습니다');
        }

        try {
            ServerLogger.info('📊 YouTube Data API 추출 시작:', { videoId });

            // 1. 비디오 기본 정보 및 통계
            const videoData = await this.fetchVideoData(videoId, availableKey.key);

            // 2. 채널 정보 (병렬 처리)
            const [channelData, topComments] = await Promise.allSettled([
                this.fetchChannelData(videoData.snippet.channelId, availableKey.key),
                this.fetchTopComments(videoId, availableKey.key)
            ]);

            // 결과 처리
            const channelInfo = channelData.status === 'fulfilled' ? channelData.value : {
                subscriberCount: '0',
                channelVideoCount: '0',
                channelViewCount: '0',
                channelCountry: '',
                channelDescription: '',
                channelThumbnailUrl: '',
                channelBannerUrl: ''
            } as unknown as ChannelData;
            const comments = topComments.status === 'fulfilled' ? topComments.value : [];

            // 데이터 통합
            const extractedData = this.buildAPIVideoData(videoData, channelInfo, comments);

            ServerLogger.success('✅ YouTube Data API 추출 완료:', {
                title: extractedData.title?.substring(0, 50),
                viewCount: extractedData.viewCount,
                likeCount: extractedData.likeCount,
                commentCount: extractedData.commentCount,
                channelSubscribers: extractedData.subscribers
            });

            return extractedData;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            ServerLogger.error('❌ YouTube Data API 추출 실패:', {
                videoId,
                error: errorMessage
            });

            // API 키 에러 트래킹
            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', false);
            throw new Error(`YouTube API 추출 실패: ${errorMessage}`);
        }
    }

    /**
     * 비디오 데이터 가져오기
     */
    private async fetchVideoData(videoId: string, apiKey: string): Promise<any> {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'statistics,snippet,contentDetails,status,localizations',
                id: videoId,
                key: apiKey,
            },
            timeout: API_TIMEOUTS.YOUTUBE_API_REQUEST,
        });

        // API 사용량 트래킹
        this.multiKeyManager.trackAPI(apiKey, 'youtube-videos', true);

        if (!response.data.items || response.data.items.length === 0) {
            throw new Error('비디오를 찾을 수 없습니다');
        }

        return response.data.items[0];
    }

    /**
     * 채널 데이터 가져오기
     */
    private async fetchChannelData(channelId: string, apiKey: string): Promise<ChannelData> {
        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                params: {
                    part: 'statistics,snippet,contentDetails',
                    id: channelId,
                    key: apiKey,
                },
                timeout: API_TIMEOUTS.YOUTUBE_API_REQUEST,
            });

            // API 사용량 트래킹
            this.multiKeyManager.trackAPI(apiKey, 'youtube-channels', true);

            if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];

                const channelData: ChannelData = {
                    subscriberCount: MetadataProcessor.safeParseInt(channel.statistics.subscriberCount),
                    channelVideoCount: MetadataProcessor.safeParseInt(channel.statistics.videoCount),
                    channelViewCount: MetadataProcessor.safeParseInt(channel.statistics.viewCount),
                    channelCountry: MetadataProcessor.safeString(channel.snippet.country),
                    channelDescription: MetadataProcessor.safeString(channel.snippet.description),
                    channelCustomUrl: MetadataProcessor.safeString(channel.snippet.customUrl),
                    channelPublishedAt: MetadataProcessor.safeString(channel.snippet.publishedAt),
                };

                ServerLogger.debug('📺 채널 데이터 추출 완료:', {
                    subscribers: channelData.subscriberCount,
                    videos: channelData.channelVideoCount,
                    views: channelData.channelViewCount
                });

                return channelData;
            }
        } catch (error) {
            ServerLogger.warn('⚠️ 채널 데이터 추출 실패:', error);
            this.multiKeyManager.trackAPI(apiKey, 'youtube-channels', false);
        }

        return {} as ChannelData;
    }

    /**
     * 상위 댓글 가져오기
     */
    private async fetchTopComments(videoId: string, apiKey: string): Promise<VideoComment[]> {
        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
                params: {
                    part: 'snippet',
                    videoId: videoId,
                    order: 'relevance',
                    maxResults: 3,
                    key: apiKey,
                },
                timeout: API_TIMEOUTS.YOUTUBE_API_REQUEST,
            });

            // API 사용량 트래킹
            this.multiKeyManager.trackAPI(apiKey, 'youtube-comments', true);

            if (response.data.items) {
                const comments: VideoComment[] = response.data.items.map((item: any) => ({
                    author: MetadataProcessor.safeString(item.snippet.topLevelComment.snippet.authorDisplayName),
                    text: MetadataProcessor.safeString(item.snippet.topLevelComment.snippet.textDisplay),
                    likeCount: MetadataProcessor.safeParseInt(item.snippet.topLevelComment.snippet.likeCount),
                }));

                ServerLogger.debug('💬 댓글 추출 완료:', { count: comments.length });
                return comments;
            }
        } catch (error) {
            ServerLogger.warn('⚠️ 댓글 추출 실패 (비활성화된 댓글일 수 있음):', error);
            this.multiKeyManager.trackAPI(apiKey, 'youtube-comments', false);
        }

        return [];
    }

    /**
     * API 응답 데이터를 표준 형식으로 변환
     */
    private buildAPIVideoData(
        videoItem: any,
        channelData: ChannelData,
        comments: VideoComment[]
    ): APIVideoData {
        const snippet = videoItem.snippet;
        const statistics = videoItem.statistics;
        const contentDetails = videoItem.contentDetails;
        const status = videoItem.status;

        // 해시태그와 멘션 추출
        const hashtags = MetadataProcessor.extractHashtags(snippet.description || '');
        const mentions = MetadataProcessor.extractMentions(snippet.description || '');

        return {
            // 기본 정보
            title: MetadataProcessor.safeString(snippet.title),
            description: MetadataProcessor.safeString(snippet.description),
            channelName: MetadataProcessor.safeString(snippet.channelTitle),
            channelId: MetadataProcessor.safeString(snippet.channelId),

            // 영상 메타데이터
            duration: MetadataProcessor.parseDuration(contentDetails.duration),
            category: MetadataProcessor.getCategoryName(snippet.categoryId),
            keywords: MetadataProcessor.safeArray<string>(snippet.tags),
            tags: MetadataProcessor.safeArray<string>(snippet.tags),

            // 통계 정보
            viewCount: MetadataProcessor.safeParseInt(statistics.viewCount),
            likeCount: MetadataProcessor.safeParseInt(statistics.likeCount),
            commentCount: MetadataProcessor.safeParseInt(statistics.commentCount),

            // 날짜 정보
            publishedAt: MetadataProcessor.normalizeDate(snippet.publishedAt),
            uploadDate: MetadataProcessor.normalizeDate(snippet.publishedAt),

            // 썸네일 정보
            thumbnails: snippet.thumbnails ? Object.values(snippet.thumbnails) : [],

            // 카테고리 정보
            categoryId: MetadataProcessor.safeString(snippet.categoryId),
            youtubeCategoryId: MetadataProcessor.safeString(snippet.categoryId),

            // 채널 정보
            channelTitle: MetadataProcessor.safeString(snippet.channelTitle),
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
            topComments: comments,

            // 언어 정보
            defaultLanguage: MetadataProcessor.normalizeLanguage(
                snippet.defaultLanguage || snippet.defaultAudioLanguage || ''
            ),
            language: MetadataProcessor.normalizeLanguage(
                snippet.defaultLanguage || snippet.defaultAudioLanguage || ''
            ),

            // 라이브 스트림 정보
            isLiveContent: snippet.liveBroadcastContent !== 'none',
            isLive: snippet.liveBroadcastContent === 'live',
            liveBroadcast: MetadataProcessor.safeString(snippet.liveBroadcastContent, 'none'),

            // 상태 정보
            privacyStatus: MetadataProcessor.safeString(status?.privacyStatus, 'public'),
            embeddable: MetadataProcessor.safeBoolean(status?.embeddable, true),

            // 소스 표시
            source: 'youtube-api',
        };
    }

    /**
     * API 키 사용량 현황 조회
     */
    getUsageStatus(): any {
        return this.multiKeyManager?.getAllUsageStatus() || {};
    }

    /**
     * API 가용성 확인
     */
    async checkAvailability(): Promise<boolean> {
        try {
            await this.initialize();
            const availableKey = this.multiKeyManager.getAvailableKey();

            if (!availableKey) {
                ServerLogger.warn('⚠️ 사용 가능한 YouTube API 키가 없습니다');
                return false;
            }

            // 간단한 채널 조회로 API 테스트
            const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                params: {
                    part: 'snippet',
                    id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', // YouTube 공식 채널
                    key: availableKey.key,
                },
                timeout: 5000,
            });

            const isAvailable = response.status === 200 && response.data.items?.length > 0;

            if (isAvailable) {
                ServerLogger.success('✅ YouTube Data API 사용 가능');
            } else {
                ServerLogger.warn('⚠️ YouTube Data API 응답 이상');
            }

            return isAvailable;
        } catch (error) {
            ServerLogger.warn('⚠️ YouTube Data API 사용 불가:', error);
            return false;
        }
    }
}

export default APIExtractor;