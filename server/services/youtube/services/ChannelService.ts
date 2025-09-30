import axios from 'axios';
import { google } from 'googleapis';
import { ServerLogger } from '../../../utils/logger';
import { ChannelInfo } from '../types/channel-types';

import MultiKeyManager from '../../../utils/multi-key-manager';
import UsageTracker from '../../../utils/usage-tracker';

export class ChannelService {
    private multiKeyManager: any;
    private usageTracker: any;
    private youtube: any;
    private readonly baseURL = 'https://www.googleapis.com/youtube/v3';
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

    async getChannelInfo(channelIdentifier: string): Promise<ChannelInfo | null> {
        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다');
            }

            ServerLogger.info(`🔍 YouTube 채널 정보 검색: ${channelIdentifier}`);

            let channelData = null;

            if (
                channelIdentifier.startsWith('@') ||
                channelIdentifier.startsWith('UC') ||
                channelIdentifier.length === 24
            ) {
                channelData = await this.getChannelById(channelIdentifier);
            }

            if (!channelData) {
                channelData = await this.searchChannelByName(channelIdentifier);
            }

            if (channelData) {
                ServerLogger.success(`✅ 채널 정보 수집 성공: ${channelData.title}`);
                return channelData;
            } else {
                ServerLogger.warn(`⚠️ 채널을 찾을 수 없음: ${channelIdentifier}`);
                return null;
            }
        } catch (error) {
            ServerLogger.error(`❌ 채널 정보 수집 실패: ${channelIdentifier}`, error);
            this.usageTracker.increment('youtube-channels', false);
            throw error;
        }
    }

    async getChannelById(channelId: string): Promise<ChannelInfo | null> {
        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다');
            }

            const cleanId = channelId.replace('@', '');

            const response = await axios.get(`${this.baseURL}/channels`, {
                params: {
                    key: availableKey.key,
                    part: 'snippet,statistics,contentDetails',
                    id: cleanId,
                    maxResults: 1,
                },
                timeout: 30000,
            });

            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);
            this.usageTracker.increment('youtube-channels', true);

            if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                return this.formatChannelData(channel);
            }

            return null;
        } catch (error: any) {
            if (error.response?.status === 403) {
                ServerLogger.error('❌ YouTube API 할당량 초과 또는 권한 없음');
            }
            throw error;
        }
    }

    async searchChannelByName(channelName: string): Promise<ChannelInfo | null> {
        try {
            await this.initialize();

            ServerLogger.info(`🔍 채널명 검색 최적화 시작: ${channelName}`);

            let channelData = await this.getChannelByHandle(channelName);
            if (channelData) {
                ServerLogger.success(`✅ forHandle로 채널 발견: ${channelData.title}`);
                return channelData;
            }

            channelData = await this.getChannelByUsername(channelName);
            if (channelData) {
                ServerLogger.success(`✅ forUsername으로 채널 발견: ${channelData.title}`);
                return channelData;
            }

            ServerLogger.warn(`⚠️ 고비용 search.list API 사용: ${channelName} (100 units 소모)`);
            return await this.fallbackSearch(channelName);

        } catch (error: any) {
            if (error.response?.status === 403) {
                ServerLogger.error('❌ YouTube API 할당량 초과 또는 권한 없음');
            }
            throw error;
        }
    }

    async getChannelByHandle(handle: string): Promise<ChannelInfo | null> {
        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                return null;
            }

            const cleanHandle = handle.replace('@', '');

            const response = await axios.get(`${this.baseURL}/channels`, {
                params: {
                    key: availableKey.key,
                    part: 'snippet,statistics,contentDetails',
                    forHandle: cleanHandle,
                    maxResults: 1,
                },
                timeout: 30000,
            });

            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);
            this.usageTracker.increment('youtube-channels', true);

            if (response.data.items && response.data.items.length > 0) {
                return this.formatChannelData(response.data.items[0]);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getChannelByUsername(username: string): Promise<ChannelInfo | null> {
        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                return null;
            }

            const response = await axios.get(`${this.baseURL}/channels`, {
                params: {
                    key: availableKey.key,
                    part: 'snippet,statistics,contentDetails',
                    forUsername: username,
                    maxResults: 1,
                },
                timeout: 30000,
            });

            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);
            this.usageTracker.increment('youtube-channels', true);

            if (response.data.items && response.data.items.length > 0) {
                return this.formatChannelData(response.data.items[0]);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async fallbackSearch(channelName: string): Promise<ChannelInfo | null> {
        try {
            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다');
            }

            const searchResponse = await axios.get(`${this.baseURL}/search`, {
                params: {
                    key: availableKey.key,
                    part: 'snippet',
                    q: channelName,
                    type: 'channel',
                    maxResults: 1,
                },
                timeout: 30000,
            });

            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-search', true);
            this.usageTracker.increment('youtube-search', true);

            if (
                searchResponse.data.items &&
                searchResponse.data.items.length > 0
            ) {
                const searchResult = searchResponse.data.items[0];
                const channelId = searchResult.snippet.channelId;

                return await this.getChannelById(channelId);
            }

            return null;
        } catch (error: any) {
            ServerLogger.error('❌ 최후의 search.list API도 실패:', error.message);
            throw error;
        }
    }

    private formatChannelData(channelData: any): ChannelInfo {
        const snippet = channelData.snippet || {};
        const statistics = channelData.statistics || {};
        const contentDetails = channelData.contentDetails || {};

        return {
            channelId: channelData.id,
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

    async getMultipleChannels(channelIds: string[]): Promise<ChannelInfo[]> {
        try {
            if (!Array.isArray(channelIds) || channelIds.length === 0) {
                return [];
            }

            await this.initialize();

            const availableKey = this.multiKeyManager.getAvailableKey();
            if (!availableKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다');
            }

            ServerLogger.info(`🔍 여러 채널 정보 수집 시작: ${channelIds.length}개`);

            const batchSize = 50;
            const results: ChannelInfo[] = [];

            for (let i = 0; i < channelIds.length; i += batchSize) {
                const batch = channelIds.slice(i, i + batchSize);
                const cleanIds = batch.map((id) => id.replace('@', ''));

                const response = await axios.get(`${this.baseURL}/channels`, {
                    params: {
                        key: availableKey.key,
                        part: 'snippet,statistics,contentDetails',
                        id: cleanIds.join(','),
                        maxResults: batchSize,
                    },
                    timeout: 30000,
                });

                this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);
                this.usageTracker.increment('youtube-channels', true);

                if (response.data.items) {
                    response.data.items.forEach((channel: any) => {
                        results.push(this.formatChannelData(channel));
                    });
                }

                if (i + batchSize < channelIds.length) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            ServerLogger.success(`✅ 여러 채널 정보 수집 완료: ${results.length}개`);
            return results;
        } catch (error) {
            ServerLogger.error('❌ 여러 채널 정보 수집 실패', error);
            throw error;
        }
    }

    getQuotaStatus(): any {
        return this.usageTracker.getYouTubeUsage();
    }

    clearApiKeyCache(): void {
        this.multiKeyManager = null;
        this.youtube = null;
        ServerLogger.info('🔄 ChannelService API 키 캐시 클리어');
    }
}

export default ChannelService;