import * as ytdl from '@distube/ytdl-core';
import { ServerLogger } from '../../../utils/logger';
import { Platform } from '../../../types/video-types';

interface YouTubeVideoInfo {
    id: string;
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    views: number;
    likes: number;
    comments: number;
    duration: string;
    uploadDate: string;
    thumbnailUrl: string;
    categoryId: string;
}

interface YouTubeProcessingOptions {
    useYtdlFirst?: boolean;
    maxRetries?: number;
}

export class YouTubeProcessor {
    private hybridExtractor: any;
    private youtubeApiKey: string | null = null;

    constructor() {
        this.initializeExtractor();
    }

    private async initializeExtractor() {
        try {
            const HybridYouTubeExtractor = require('../../youtube/HybridYouTubeExtractor');
            this.hybridExtractor = new HybridYouTubeExtractor();
            await this.hybridExtractor.initialize();
        } catch (error) {
            ServerLogger.error('하이브리드 YouTube 추출기 초기화 실패:', error);
        }
    }

    async downloadVideo(videoUrl: string, filePath: string, startTime?: Date): Promise<boolean> {
        try {
            const videoId = this.extractYouTubeId(videoUrl);
            if (!videoId) {
                throw new Error('유효하지 않은 YouTube URL');
            }

            ServerLogger.info(`YouTube 비디오 다운로드 시작: ${videoId}`);

            // ytdl-core를 사용한 다운로드
            const info = await ytdl.getInfo(videoUrl);
            const format = ytdl.chooseFormat(info.formats, {
                quality: 'highestvideo',
                filter: 'audioandvideo'
            });

            if (!format) {
                throw new Error('적절한 비디오 형식을 찾을 수 없습니다');
            }

            const stream = ytdl.downloadFromInfo(info, { format });
            const fs = require('fs');
            const writeStream = fs.createWriteStream(filePath);

            return new Promise((resolve, reject) => {
                stream.pipe(writeStream);

                writeStream.on('finish', () => {
                    ServerLogger.success(`YouTube 비디오 다운로드 완료: ${filePath}`);
                    resolve(true);
                });

                writeStream.on('error', (error: Error) => {
                    ServerLogger.error('YouTube 다운로드 오류:', error);
                    reject(error);
                });
            });

        } catch (error) {
            ServerLogger.error('YouTube 비디오 다운로드 실패:', error);
            return false;
        }
    }

    async getVideoInfo(videoUrl: string, options: YouTubeProcessingOptions = {}): Promise<YouTubeVideoInfo | null> {
        try {
            if (options.useYtdlFirst === false && this.hybridExtractor) {
                // 하이브리드 추출기 우선 사용
                const result = await this.hybridExtractor.extractVideoData(videoUrl);
                if (result.success) {
                    return this.normalizeVideoInfo(result.data);
                }
            }

            // 기본 YouTube API 사용
            return await this.getVideoInfoLegacy(videoUrl);

        } catch (error) {
            ServerLogger.error('YouTube 비디오 정보 조회 실패:', error);
            return null;
        }
    }

    private async getVideoInfoLegacy(videoUrl: string): Promise<YouTubeVideoInfo | null> {
        try {
            const videoId = this.extractYouTubeId(videoUrl);
            if (!videoId) return null;

            const apiKey = await this.getApiKey();
            if (!apiKey) {
                throw new Error('YouTube API 키가 없습니다');
            }

            const axios = require('axios');
            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'snippet,statistics,contentDetails',
                    id: videoId,
                    key: apiKey
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('비디오를 찾을 수 없습니다');
            }

            const item = response.data.items[0];
            return this.parseVideoData(item);

        } catch (error) {
            ServerLogger.error('YouTube Legacy API 조회 실패:', error);
            return null;
        }
    }

    private parseVideoData(item: any): YouTubeVideoInfo {
        const snippet = item.snippet || {};
        const statistics = item.statistics || {};
        const contentDetails = item.contentDetails || {};

        return {
            id: item.id,
            title: snippet.title || '',
            description: snippet.description || '',
            channelId: snippet.channelId || '',
            channelTitle: snippet.channelTitle || '',
            views: parseInt(statistics.viewCount || '0'),
            likes: parseInt(statistics.likeCount || '0'),
            comments: parseInt(statistics.commentCount || '0'),
            duration: contentDetails.duration || '',
            uploadDate: snippet.publishedAt || '',
            thumbnailUrl: snippet.thumbnails?.high?.url || '',
            categoryId: snippet.categoryId || ''
        };
    }

    private normalizeVideoInfo(data: any): YouTubeVideoInfo {
        return {
            id: data.id || data.videoId || '',
            title: data.title || '',
            description: data.description || '',
            channelId: data.channelId || '',
            channelTitle: data.channelName || data.channelTitle || '',
            views: parseInt(data.views || data.viewCount || '0'),
            likes: parseInt(data.likes || data.likeCount || '0'),
            comments: parseInt(data.commentsCount || data.commentCount || '0'),
            duration: data.duration || '',
            uploadDate: data.uploadDate || data.publishedAt || '',
            thumbnailUrl: data.thumbnailUrl || '',
            categoryId: data.categoryId || ''
        };
    }

    extractYouTubeId(url: string): string | null {
        if (!url || typeof url !== 'string') return null;

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    isYouTubeUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url);
    }

    private async getApiKey(): Promise<string | null> {
        if (!this.youtubeApiKey) {
            try {
                const ApiKeyManager = require('../../ApiKeyManager');
                const apiKeyManager = new ApiKeyManager();
                const activeKeys = await apiKeyManager.getActiveApiKeys();

                if (activeKeys.length === 0) {
                    ServerLogger.warn('사용 가능한 YouTube API 키가 없습니다');
                    return null;
                }

                this.youtubeApiKey = activeKeys[0].key;
            } catch (error) {
                ServerLogger.error('API 키 로드 실패:', error);
                return null;
            }
        }
        return this.youtubeApiKey;
    }

    async fetchComments(videoId: string, maxResults: number = 100): Promise<string[]> {
        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) return [];

            const axios = require('axios');
            const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
                params: {
                    part: 'snippet',
                    videoId: videoId,
                    maxResults: Math.min(maxResults, 100),
                    order: 'relevance',
                    key: apiKey
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                return [];
            }

            return response.data.items.map((item: any) => {
                const comment = item.snippet?.topLevelComment?.snippet;
                return comment?.textDisplay || '';
            }).filter((text: string) => text.length > 0);

        } catch (error) {
            ServerLogger.error('YouTube 댓글 조회 실패:', error);
            return [];
        }
    }

    parseYouTubeDuration(duration: string): number {
        if (!duration || typeof duration !== 'string') return 0;

        // ISO 8601 duration format (PT#M#S)
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return hours * 3600 + minutes * 60 + seconds;
    }

    clearApiKeyCache(): void {
        this.youtubeApiKey = null;
    }
}

export default YouTubeProcessor;