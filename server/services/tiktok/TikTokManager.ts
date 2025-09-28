import { ServerLogger } from '../../utils/logger';
import { TikTokExtractor } from './extractors/TikTokExtractor';
import {
    TikTokVideoInfo,
    TikTokExtractResult,
    TikTokTrendAnalysis,
    TikTokDownloadResult
} from './types/tiktok-types';

export class TikTokManager {
    private extractor: TikTokExtractor;
    private initialized: boolean = false;

    constructor() {
        this.extractor = new TikTokExtractor();

        // 서비스 레지스트리에 등록
        this.registerToServiceRegistry();

        ServerLogger.success('🎵 TikTok 통합 매니저 초기화 완료');
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        ServerLogger.info('🎵 TikTok 매니저 초기화 완료');
    }

    // ===== 비디오 정보 추출 =====

    async extractVideoInfo(videoUrl: string): Promise<TikTokExtractResult> {
        await this.initialize();

        try {
            const videoInfo = await this.extractor.getVideoInfo(videoUrl);

            if (videoInfo) {
                return {
                    success: true,
                    data: videoInfo,
                    extractedAt: new Date().toISOString()
                };
            } else {
                return {
                    success: false,
                    error: '비디오 정보를 추출할 수 없습니다',
                    extractedAt: new Date().toISOString()
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Unknown error',
                extractedAt: new Date().toISOString()
            };
        }
    }

    // ===== 비디오 다운로드 =====

    async downloadVideo(videoUrl: string, filePath: string): Promise<TikTokDownloadResult> {
        await this.initialize();

        const startTime = Date.now();

        try {
            const success = await this.extractor.downloadVideo(videoUrl, filePath);
            const videoInfo = await this.extractor.getVideoInfo(videoUrl);

            return {
                success,
                filePath: success ? filePath : undefined,
                videoInfo: videoInfo || undefined,
                downloadTime: Date.now() - startTime
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Download failed',
                downloadTime: Date.now() - startTime
            };
        }
    }

    // ===== 트렌드 분석 =====

    analyzeTrends(videoInfo: TikTokVideoInfo): TikTokTrendAnalysis {
        const hashtags = videoInfo.hashtags || [];
        const description = videoInfo.description || '';

        return this.extractor.analyzeTrends(description, hashtags);
    }

    // ===== 유틸리티 메서드 =====

    extractVideoId(url: string): string {
        return this.extractor.extractTikTokId(url);
    }

    isTikTokUrl(url: string): boolean {
        return this.extractor.isTikTokUrl(url);
    }

    extractHashtags(text: string): string[] {
        return this.extractor.extractHashtags(text);
    }

    extractMentions(text: string): string[] {
        return this.extractor.extractMentions(text);
    }

    formatTikTokUrl(videoId: string): string {
        return `https://www.tiktok.com/@user/video/${videoId}`;
    }

    // ===== 통계 분석 =====

    calculateEngagementRate(videoInfo: TikTokVideoInfo): number {
        if (videoInfo.views === 0) return 0;
        return (videoInfo.likes + videoInfo.comments + videoInfo.shares) / videoInfo.views;
    }

    analyzePerformance(videos: TikTokVideoInfo[]): {
        averageViews: number;
        averageLikes: number;
        averageComments: number;
        averageShares: number;
        topHashtags: Array<{ hashtag: string; count: number }>;
    } {
        if (videos.length === 0) {
            return {
                averageViews: 0,
                averageLikes: 0,
                averageComments: 0,
                averageShares: 0,
                topHashtags: []
            };
        }

        const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
        const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
        const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);
        const totalShares = videos.reduce((sum, v) => sum + v.shares, 0);

        // 해시태그 분석
        const hashtagCount: { [key: string]: number } = {};
        videos.forEach(video => {
            (video.hashtags || []).forEach(hashtag => {
                hashtagCount[hashtag] = (hashtagCount[hashtag] || 0) + 1;
            });
        });

        const topHashtags = Object.entries(hashtagCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([hashtag, count]) => ({ hashtag, count }));

        return {
            averageViews: totalViews / videos.length,
            averageLikes: totalLikes / videos.length,
            averageComments: totalComments / videos.length,
            averageShares: totalShares / videos.length,
            topHashtags
        };
    }

    // ===== 서비스 상태 =====

    getServiceStatus(): {
        extractor: string;
        initialized: boolean;
    } {
        return {
            extractor: 'ready',
            initialized: this.initialized
        };
    }

    private registerToServiceRegistry(): void {
        try {
            const serviceRegistry = require('../../utils/service-registry');
            serviceRegistry.register(this);
        } catch (error) {
            ServerLogger.warn('서비스 레지스트리 등록 실패:', error);
        }
    }

    // ===== 싱글톤 패턴 =====

    private static instance: TikTokManager | null = null;

    static async getInstance(): Promise<TikTokManager> {
        if (!this.instance) {
            this.instance = new TikTokManager();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static resetInstance(): void {
        this.instance = null;
    }
}

export default TikTokManager;