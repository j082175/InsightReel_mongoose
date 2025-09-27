import { ServerLogger } from '../../utils/logger';
import { ReelsExtractor } from './extractors/ReelsExtractor';
import { ProfileService } from './services/ProfileService';
import { ReelsCollector } from './services/ReelsCollector';
import {
    InstagramProfile,
    InstagramProfileResult,
    InstagramReelInfo,
    InstagramReelExtracted,
    InstagramCollectionConfig,
    InstagramCollectionResult,
    InstagramAnalytics
} from './types/instagram-types';

export class InstagramManager {
    private reelsExtractor: ReelsExtractor;
    private profileService: ProfileService;
    private reelsCollector: ReelsCollector;
    private initialized: boolean = false;

    constructor() {
        this.reelsExtractor = new ReelsExtractor();
        this.profileService = new ProfileService();
        this.reelsCollector = new ReelsCollector();

        // 서비스 레지스트리에 등록
        this.registerToServiceRegistry();

        ServerLogger.success('📱 Instagram 통합 매니저 초기화 완료');
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        ServerLogger.info('📱 Instagram 매니저 초기화 완료');
    }

    // ===== Reels 추출 관련 메서드 =====

    async extractReel(url: string): Promise<InstagramReelExtracted> {
        await this.initialize();
        return await this.reelsExtractor.extractReelInfo(url);
    }

    async extractMultipleReels(urls: string[]): Promise<InstagramReelExtracted[]> {
        await this.initialize();
        return await this.reelsExtractor.extractMultipleReels(urls);
    }

    extractShortcode(url: string): string {
        return this.reelsExtractor.extractShortcode(url);
    }

    // ===== 프로필 관련 메서드 =====

    async getProfile(username: string): Promise<InstagramProfileResult> {
        await this.initialize();
        return await this.profileService.getProfileInfo(username);
    }

    async getMultipleProfiles(usernames: string[]): Promise<InstagramProfileResult[]> {
        await this.initialize();
        return await this.profileService.getMultipleProfiles(usernames);
    }

    async checkProfileExists(username: string): Promise<boolean> {
        await this.initialize();
        return await this.profileService.checkProfileExists(username);
    }

    async getProfileStats(username: string): Promise<{
        followers: number;
        following: number;
        posts: number;
    } | null> {
        await this.initialize();
        return await this.profileService.getProfileStats(username);
    }

    // ===== Reels 수집 관련 메서드 =====

    async collectProfileReels(
        username: string,
        options?: Partial<InstagramCollectionConfig>
    ): Promise<InstagramCollectionResult> {
        await this.initialize();
        return await this.reelsCollector.collectProfileReels(username, options);
    }

    async collectTrendingReels(
        usernames: string[],
        config?: Partial<InstagramCollectionConfig>
    ): Promise<InstagramCollectionResult[]> {
        await this.initialize();
        return await this.reelsCollector.collectTrendingReels(usernames, config);
    }

    filterHighEngagementReels(
        reels: InstagramReelInfo[],
        minEngagementRate?: number
    ): InstagramReelInfo[] {
        return this.reelsCollector.filterHighEngagementReels(reels, minEngagementRate);
    }

    sortReels(
        reels: InstagramReelInfo[],
        sortBy?: 'views' | 'likes' | 'comments' | 'date'
    ): InstagramReelInfo[] {
        return this.reelsCollector.sortReels(reels, sortBy);
    }

    // ===== 분석 관련 메서드 =====

    calculateEngagementRate(reel: InstagramReelInfo): number {
        if (reel.viewCount === 0) return 0;
        return (reel.likeCount + reel.commentCount) / reel.viewCount;
    }

    analyzeReels(reels: InstagramReelInfo[]): InstagramAnalytics {
        if (reels.length === 0) {
            return {
                engagementRate: 0,
                averageViews: 0,
                averageLikes: 0,
                averageComments: 0,
                topHashtags: [],
                postingPattern: {
                    hourlyDistribution: new Array(24).fill(0),
                    dailyDistribution: new Array(7).fill(0),
                    averagePostsPerDay: 0
                }
            };
        }

        const totalViews = reels.reduce((sum, r) => sum + r.viewCount, 0);
        const totalLikes = reels.reduce((sum, r) => sum + r.likeCount, 0);
        const totalComments = reels.reduce((sum, r) => sum + r.commentCount, 0);

        // 해시태그 분석
        const hashtagCount: { [key: string]: number } = {};
        reels.forEach(reel => {
            reel.hashtags.forEach(hashtag => {
                hashtagCount[hashtag] = (hashtagCount[hashtag] || 0) + 1;
            });
        });

        const topHashtags = Object.entries(hashtagCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([hashtag, count]) => ({ hashtag, count }));

        // 포스팅 패턴 분석
        const hourlyDistribution = new Array(24).fill(0);
        const dailyDistribution = new Array(7).fill(0);

        reels.forEach(reel => {
            const date = new Date(reel.uploadDate);
            hourlyDistribution[date.getHours()]++;
            dailyDistribution[date.getDay()]++;
        });

        // 날짜 범위 계산
        const dates = reels.map(r => new Date(r.uploadDate).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;

        return {
            engagementRate: (totalLikes + totalComments) / totalViews,
            averageViews: totalViews / reels.length,
            averageLikes: totalLikes / reels.length,
            averageComments: totalComments / reels.length,
            topHashtags,
            postingPattern: {
                hourlyDistribution,
                dailyDistribution,
                averagePostsPerDay: reels.length / daysDiff
            }
        };
    }

    // ===== 통합 기능 =====

    async getProfileWithRecentReels(
        username: string,
        reelCount: number = 10
    ): Promise<{
        profile: InstagramProfile | null;
        recentReels: InstagramReelInfo[];
        analytics: InstagramAnalytics | null;
    }> {
        await this.initialize();

        // 프로필 정보 가져오기
        const profileResult = await this.profileService.getProfileInfo(username);

        if (!profileResult.success || !profileResult.profile) {
            return {
                profile: null,
                recentReels: [],
                analytics: null
            };
        }

        // 최근 릴스 수집
        const reelsResult = await this.reelsCollector.collectProfileReels(username, {
            maxCount: reelCount,
            daysBack: 30,
            minViews: 0
        });

        // 분석 실행
        const analytics = reelsResult.reels.length > 0
            ? this.analyzeReels(reelsResult.reels)
            : null;

        return {
            profile: profileResult.profile,
            recentReels: reelsResult.reels,
            analytics
        };
    }

    // ===== 유틸리티 메서드 =====

    formatReelUrl(shortcode: string): string {
        return `https://instagram.com/p/${shortcode}/`;
    }

    formatProfileUrl(username: string): string {
        return `https://instagram.com/${username}/`;
    }

    isValidInstagramUrl(url: string): boolean {
        const patterns = [
            /instagram\.com\/reels?\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/p\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/tv\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/[a-zA-Z0-9._]+\/?$/
        ];

        return patterns.some(pattern => pattern.test(url));
    }

    // ===== 서비스 상태 =====

    getServiceStatus(): {
        reelsExtractor: string;
        profileService: string;
        reelsCollector: string;
        initialized: boolean;
    } {
        return {
            reelsExtractor: 'ready',
            profileService: 'ready',
            reelsCollector: 'ready',
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

    private static instance: InstagramManager | null = null;

    static async getInstance(): Promise<InstagramManager> {
        if (!this.instance) {
            this.instance = new InstagramManager();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static resetInstance(): void {
        this.instance = null;
    }
}

export default InstagramManager;