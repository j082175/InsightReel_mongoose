import { ServerLogger } from '../../utils/logger';
import { ChannelInfoCollector } from './analyzers/ChannelInfoCollector';
import {
    ChannelInfo,
    ChannelAnalysisResult,
    ChannelAnalysisConfig,
    VideoDetailedInfo
} from './types/channel-types';

// 기존 JavaScript 모듈들을 임시로 사용
const AIAnalyzer = require('../ai/AIAnalyzer');
const UnifiedCategoryManager = require('../UnifiedCategoryManager');

export class YouTubeChannelAnalyzer {
    private channelInfoCollector: ChannelInfoCollector;
    private aiAnalyzer: any;
    private categoryManager: any;
    private initialized: boolean = false;

    constructor() {
        this.channelInfoCollector = new ChannelInfoCollector();

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

            // 기존 모듈들 초기화
            this.aiAnalyzer = AIAnalyzer.getInstance ? await AIAnalyzer.getInstance() : new AIAnalyzer();
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
     * 채널의 상세 분석 (기존 JavaScript 모듈 활용)
     */
    async analyzeChannel(channelId: string, config?: ChannelAnalysisConfig): Promise<any> {
        try {
            await this.initialize();

            ServerLogger.info('📊 채널 상세 분석 시작:', { channelId, config });

            // 기존 JavaScript 모듈의 분석 메서드 호출
            const legacyAnalyzer = require('../YouTubeChannelAnalyzer');
            const result = await legacyAnalyzer.analyzeChannel(channelId, config?.maxVideos || 200);

            ServerLogger.success('✅ 채널 상세 분석 완료:', {
                channelId,
                videosAnalyzed: result.videosCount
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
        try {
            const serviceRegistry = require('../../utils/service-registry');
            serviceRegistry.register(this);
        } catch (error) {
            ServerLogger.warn('서비스 레지스트리 등록 실패:', error);
        }
    }

    /**
     * API 키 캐시 클리어 (호환성)
     */
    clearApiKeyCache(): void {
        ServerLogger.info('🔄 YouTubeChannelAnalyzer API 키 캐시 클리어');
        // 새 아키텍처에서는 MultiKeyManager가 자동으로 처리
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