import axios from 'axios';
import { ServerLogger } from '../../../utils/logger';
import { ChannelInfo } from '../types/channel-types';
import MultiKeyManager from '../../../utils/multi-key-manager';
import UsageTracker from '../../../utils/usage-tracker';

export class ChannelInfoCollector {
    private multiKeyManager: any;
    private usageTracker: any;
    private readonly baseURL = 'https://www.googleapis.com/youtube/v3';

    constructor() {
        this.multiKeyManager = null;
        this.usageTracker = UsageTracker.getInstance();
    }

    /**
     * 초기화
     */
    async initialize(): Promise<void> {
        if (!this.multiKeyManager) {
            this.multiKeyManager = await MultiKeyManager.getInstance();
        }
    }

    /**
     * 채널 기본 정보 수집
     */
    async getChannelInfo(channelId: string): Promise<ChannelInfo | null> {
        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다');
            }

            ServerLogger.debug('채널 정보 조회 시작:', { channelId });

            const response = await axios.get(`${this.baseURL}/channels`, {
                params: {
                    key: availableKey.key,
                    part: 'snippet,statistics,contentDetails',
                    id: channelId,
                },
                timeout: 30000,
            });

            // API 사용량 추적
            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);
            this.usageTracker.increment('youtube-channels', true);

            if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                const channelInfo = this.transformChannelData(channel);

                ServerLogger.success('채널 정보 수집 완료:', {
                    channelId: channelInfo.channelId,
                    title: channelInfo.title,
                    subscriberCount: channelInfo.statistics.subscriberCount,
                    videoCount: channelInfo.statistics.videoCount
                });

                return channelInfo;
            }

            ServerLogger.warn('채널을 찾을 수 없음:', { channelId });
            return null;

        } catch (error) {
            ServerLogger.error('채널 정보 수집 실패:', error);
            this.usageTracker.increment('youtube-channels', false);
            throw error;
        }
    }

    /**
     * 여러 채널 정보 일괄 수집
     */
    async getMultipleChannelsInfo(channelIds: string[]): Promise<ChannelInfo[]> {
        if (channelIds.length === 0) {
            return [];
        }

        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다');
            }

            // 최대 50개씩 처리
            const chunks = this.chunkArray(channelIds, 50);
            const allChannels: ChannelInfo[] = [];

            for (const chunk of chunks) {
                const response = await axios.get(`${this.baseURL}/channels`, {
                    params: {
                        key: availableKey.key,
                        part: 'snippet,statistics,contentDetails',
                        id: chunk.join(','),
                    },
                    timeout: 30000,
                });

                this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);
                this.usageTracker.increment('youtube-channels', true);

                if (response.data.items) {
                    const channels = response.data.items.map((channel: any) =>
                        this.transformChannelData(channel)
                    );
                    allChannels.push(...channels);
                }
            }

            ServerLogger.success('다중 채널 정보 수집 완료:', {
                requestedCount: channelIds.length,
                foundCount: allChannels.length
            });

            return allChannels;

        } catch (error) {
            ServerLogger.error('다중 채널 정보 수집 실패:', error);
            this.usageTracker.increment('youtube-channels', false);
            throw error;
        }
    }

    /**
     * 채널 데이터 변환
     */
    private transformChannelData(channel: any): ChannelInfo {
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
    }

    /**
     * 채널 존재 여부 확인
     */
    async checkChannelExists(channelId: string): Promise<boolean> {
        try {
            const channelInfo = await this.getChannelInfo(channelId);
            return channelInfo !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * 채널 통계만 간단히 조회
     */
    async getChannelStats(channelId: string): Promise<{
        subscriberCount: number;
        videoCount: number;
        viewCount: number;
    } | null> {
        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다');
            }

            const response = await axios.get(`${this.baseURL}/channels`, {
                params: {
                    key: availableKey.key,
                    part: 'statistics',
                    id: channelId,
                },
                timeout: 15000,
            });

            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);

            if (response.data.items && response.data.items.length > 0) {
                const statistics = response.data.items[0].statistics || {};
                return {
                    subscriberCount: parseInt(statistics.subscriberCount) || 0,
                    videoCount: parseInt(statistics.videoCount) || 0,
                    viewCount: parseInt(statistics.viewCount) || 0,
                };
            }

            return null;

        } catch (error) {
            ServerLogger.warn('채널 통계 조회 실패:', error);
            return null;
        }
    }

    /**
     * 배열을 청크로 나누기
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

export default ChannelInfoCollector;