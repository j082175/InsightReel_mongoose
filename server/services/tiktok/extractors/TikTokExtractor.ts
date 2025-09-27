import { ServerLogger } from '../../../utils/logger';
import {
    TikTokVideoInfo,
    TikTokExtractResult,
    TikTokTrendAnalysis,
    TikTokDownloadResult
} from '../types/tiktok-types';

export class TikTokExtractor {
    private tikTokAPI: any;

    constructor() {
        this.initializeAPI();
    }

    private initializeAPI() {
        try {
            const TikTokAPI = require('@tobyg74/tiktok-api-dl');
            this.tikTokAPI = TikTokAPI;
        } catch (error) {
            ServerLogger.error('TikTok API 초기화 실패:', error);
        }
    }

    async downloadVideo(videoUrl: string, filePath: string, startTime?: Date): Promise<boolean> {
        try {
            const videoInfo = await this.getVideoInfo(videoUrl);
            if (!videoInfo || !videoInfo.videoUrl) {
                throw new Error('TikTok 비디오 URL을 가져올 수 없습니다');
            }

            return await this.downloadFromDirectUrl(videoInfo.videoUrl, filePath);

        } catch (error) {
            ServerLogger.error('TikTok 비디오 다운로드 실패:', error);
            return false;
        }
    }

    private async downloadFromDirectUrl(directUrl: string, filePath: string): Promise<boolean> {
        try {
            const axios = require('axios');
            const fs = require('fs');

            const response = await axios({
                method: 'GET',
                url: directUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://www.tiktok.com/'
                }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    ServerLogger.success(`TikTok 비디오 다운로드 완료: ${filePath}`);
                    resolve(true);
                });

                writer.on('error', (error: Error) => {
                    ServerLogger.error('TikTok 다운로드 스트림 오류:', error);
                    reject(error);
                });
            });

        } catch (error) {
            ServerLogger.error('TikTok 직접 다운로드 실패:', error);
            return false;
        }
    }

    async getVideoInfo(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            // 여러 버전의 API를 시도
            let result = await this.getVideoInfoV1(videoUrl);
            if (result) return result;

            result = await this.getVideoInfoV2(videoUrl);
            if (result) return result;

            result = await this.getVideoInfoV3(videoUrl);
            if (result) return result;

            // 대체 방법
            return await this.getVideoInfoFallback(videoUrl);

        } catch (error) {
            ServerLogger.error('TikTok 비디오 정보 조회 실패:', error);
            return null;
        }
    }

    private async getVideoInfoV1(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            if (!this.tikTokAPI) return null;

            const apiResult = await this.tikTokAPI.downloader(videoUrl, {
                version: "v1"
            });

            if (apiResult && apiResult.status === "success") {
                return this.parseV1TikTokData(apiResult.result, videoUrl);
            }

            return null;

        } catch (error) {
            ServerLogger.warn('TikTok API v1 실패:', error);
            return null;
        }
    }

    private async getVideoInfoV2(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            if (!this.tikTokAPI) return null;

            const apiResult = await this.tikTokAPI.downloader(videoUrl, {
                version: "v2"
            });

            if (apiResult && apiResult.status === "success") {
                return this.parseV2TikTokData(apiResult.result, videoUrl);
            }

            return null;

        } catch (error) {
            ServerLogger.warn('TikTok API v2 실패:', error);
            return null;
        }
    }

    private async getVideoInfoV3(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            if (!this.tikTokAPI) return null;

            const apiResult = await this.tikTokAPI.downloader(videoUrl, {
                version: "v3"
            });

            if (apiResult && apiResult.status === "success") {
                return this.parseV3TikTokData(apiResult.result, videoUrl);
            }

            return null;

        } catch (error) {
            ServerLogger.warn('TikTok API v3 실패:', error);
            return null;
        }
    }

    private async getVideoInfoFallback(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            // yt-dlp를 사용한 대체 방법
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const command = `yt-dlp --dump-json "${videoUrl}"`;
            const { stdout } = await execAsync(command);

            const data = JSON.parse(stdout);
            return this.parseYtDlpTikTokData(data);

        } catch (error) {
            ServerLogger.error('TikTok 대체 방법 실패:', error);
            return null;
        }
    }

    private parseV1TikTokData(videoData: any, videoUrl: string): TikTokVideoInfo {
        const hashtags = this.extractHashtags(videoData.desc || '');
        const mentions = this.extractMentions(videoData.desc || '');

        return {
            videoId: this.extractTikTokId(videoUrl),
            title: videoData.desc || 'TikTok Video',
            description: videoData.desc || '',
            channelName: videoData.author?.nickname || videoData.author?.uniqueId || '',
            views: parseInt(videoData.stats?.viewCount || '0'),
            likes: parseInt(videoData.stats?.likeCount || '0'),
            comments: parseInt(videoData.stats?.commentCount || '0'),
            shares: parseInt(videoData.stats?.shareCount || '0'),
            uploadDate: videoData.createTime ? new Date(videoData.createTime * 1000).toISOString() : new Date().toISOString(),
            thumbnailUrl: videoData.video?.cover || '',
            videoUrl: videoData.video?.playAddr || videoData.video?.downloadAddr,
            duration: videoData.video?.duration,
            hashtags,
            mentions,
            platform: 'TIKTOK' as const
        };
    }

    private parseV2TikTokData(videoData: any, videoUrl: string): TikTokVideoInfo {
        return {
            videoId: this.extractTikTokId(videoUrl),
            title: videoData.title || videoData.desc || 'TikTok Video',
            description: videoData.desc || videoData.title || '',
            channelName: videoData.author?.nickname || videoData.music?.authorName || '',
            views: parseInt(videoData.play_count || videoData.viewCount || '0'),
            likes: parseInt(videoData.digg_count || videoData.likeCount || '0'),
            comments: parseInt(videoData.comment_count || videoData.commentCount || '0'),
            shares: parseInt(videoData.share_count || videoData.shareCount || '0'),
            uploadDate: videoData.created_at || new Date().toISOString(),
            thumbnailUrl: videoData.origin_cover || videoData.cover || '',
            videoUrl: videoData.play || videoData.wmplay || videoData.hdplay,
            duration: videoData.duration,
            platform: 'TIKTOK' as const
        };
    }

    private parseV3TikTokData(videoData: any, videoUrl: string): TikTokVideoInfo {
        return {
            videoId: this.extractTikTokId(videoUrl),
            title: videoData.title || 'TikTok Video',
            description: videoData.title || '',
            channelName: videoData.author_name || videoData.author || '',
            views: parseInt(videoData.view_count || '0'),
            likes: parseInt(videoData.like_count || '0'),
            comments: parseInt(videoData.comment_count || '0'),
            shares: parseInt(videoData.share_count || '0'),
            uploadDate: videoData.create_time || new Date().toISOString(),
            thumbnailUrl: videoData.cover || '',
            videoUrl: videoData.video_url || videoData.download_url,
            duration: videoData.duration,
            platform: 'TIKTOK' as const
        };
    }

    private parseYtDlpTikTokData(data: any): TikTokVideoInfo {
        return {
            videoId: data.id || '',
            title: data.title || data.description || 'TikTok Video',
            description: data.description || data.title || '',
            channelName: data.uploader || data.channel || '',
            views: parseInt(data.view_count || '0'),
            likes: parseInt(data.like_count || '0'),
            comments: parseInt(data.comment_count || '0'),
            shares: parseInt(data.repost_count || '0'),
            uploadDate: data.upload_date || new Date().toISOString(),
            thumbnailUrl: data.thumbnail || '',
            videoUrl: data.url,
            duration: data.duration,
            platform: 'TIKTOK' as const
        };
    }

    extractTikTokId(url: string): string {
        if (!url || typeof url !== 'string') return '';

        const patterns = [
            /tiktok\.com\/@[^\/]+\/video\/(\d+)/,
            /tiktok\.com\/v\/(\d+)/,
            /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
            /vt\.tiktok\.com\/([A-Za-z0-9]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // URL에서 숫자만 추출
        const numbers = url.match(/\d{10,}/);
        if (numbers) {
            return numbers[0];
        }

        return '';
    }

    isTikTokUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        return /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/.test(url);
    }

    extractHashtags(description: string): string[] {
        if (!description) return [];

        const hashtags = description.match(/#[\w가-힣]+/g);
        return hashtags ? hashtags.map(tag => tag.substring(1)) : [];
    }

    extractMentions(description: string): string[] {
        if (!description) return [];

        const mentions = description.match(/@[\w.가-힣]+/g);
        return mentions ? mentions.map(mention => mention.substring(1)) : [];
    }

    // TikTok 특화 분석
    analyzeTrends(description: string, hashtags: string[]): {
        trendingHashtags: string[];
        viralPotential: number;
        contentType: string;
    } {
        const trendingKeywords = ['fyp', 'viral', 'trending', 'challenge', 'dance', 'comedy', 'trend'];
        const trendingHashtags = hashtags.filter(tag =>
            trendingKeywords.some(keyword => tag.toLowerCase().includes(keyword))
        );

        const viralPotential = this.calculateViralPotential(description, hashtags);
        const contentType = this.detectContentType(description, hashtags);

        return {
            trendingHashtags,
            viralPotential,
            contentType
        };
    }

    private calculateViralPotential(description: string, hashtags: string[]): number {
        let score = 0;

        // 바이럴 키워드 체크
        const viralKeywords = ['fyp', 'viral', 'trending', 'challenge', 'funny'];
        viralKeywords.forEach(keyword => {
            if (description.toLowerCase().includes(keyword) ||
                hashtags.some(tag => tag.toLowerCase().includes(keyword))) {
                score += 20;
            }
        });

        // 해시태그 개수 (적당한 개수가 좋음)
        if (hashtags.length >= 3 && hashtags.length <= 8) {
            score += 15;
        }

        return Math.min(score, 100);
    }

    private detectContentType(description: string, hashtags: string[]): string {
        const contentTypes = {
            'dance': ['dance', 'dancing', 'choreography', 'moves'],
            'comedy': ['funny', 'comedy', 'humor', 'laugh', 'joke'],
            'education': ['learn', 'education', 'tutorial', 'howto', 'tips'],
            'lifestyle': ['lifestyle', 'daily', 'vlog', 'routine'],
            'food': ['food', 'cooking', 'recipe', 'eat', 'delicious'],
            'beauty': ['makeup', 'beauty', 'skincare', 'fashion'],
            'pet': ['pet', 'dog', 'cat', 'animal', 'cute']
        };

        const text = (description + ' ' + hashtags.join(' ')).toLowerCase();

        for (const [type, keywords] of Object.entries(contentTypes)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return type;
            }
        }

        return 'entertainment';
    }
}

export default TikTokExtractor;