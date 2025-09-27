export interface ChannelInfo {
    channelId: string;
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    country?: string;
    defaultLanguage?: string;
    uploadsPlaylistId: string;
    statistics: {
        viewCount: number;
        subscriberCount: number;
        videoCount: number;
    };
    thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
    };
}

export interface VideoBasicInfo {
    videoId: string;
    title: string;
    publishedAt: string;
    thumbnails: any;
}

export interface VideoDetailedInfo extends VideoBasicInfo {
    description: string;
    duration: string;
    categoryId: string;
    tags?: string[];
    statistics: {
        viewCount: number;
        likeCount?: number;
        commentCount?: number;
    };
    contentDetails: {
        duration: string;
        definition: string;
        caption: boolean;
    };
    snippet: {
        liveBroadcastContent: string;
        defaultLanguage?: string;
        defaultAudioLanguage?: string;
    };
}

// VideoComment은 extraction-types.ts에서 import
import { VideoComment } from './extraction-types';

export interface VideoAnalysis {
    videoId: string;
    title: string;
    aiAnalysis?: {
        majorCategory?: string;
        middleCategory?: string;
        subCategory?: string;
        keywords?: string[];
        summary?: string;
        sentiment?: string;
        topics?: string[];
    };
    contentFeatures?: {
        hasMusic?: boolean;
        hasText?: boolean;
        hasVoice?: boolean;
        visualStyle?: string;
        complexity?: string;
    };
    engagement?: {
        viewCount: number;
        likeCount: number;
        commentCount: number;
        engagementRate?: number;
    };
}

export interface ChannelAnalysisResult {
    channelInfo: ChannelInfo;
    videosCount: number;
    analysis: {
        overallStats: ChannelStatistics;
        contentPatterns: ContentPatterns;
        audienceEngagement: AudienceEngagement;
        channelIdentity: ChannelIdentity;
        recommendations: string[];
    };
    videos: VideoDetailedInfo[];
}

export interface ChannelStatistics {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    averageViews: number;
    averageLikes: number;
    averageComments: number;
    uploadFrequency: {
        videosPerWeek: number;
        videosPerMonth: number;
        consistencyScore: number;
    };
    performanceMetrics: {
        topPerformingVideo: {
            videoId: string;
            title: string;
            views: number;
        };
        averageEngagementRate: number;
        viewsDistribution: {
            under1K: number;
            under10K: number;
            under100K: number;
            over100K: number;
        };
    };
}

export interface ContentPatterns {
    dominantCategories: Array<{
        category: string;
        count: number;
        percentage: number;
    }>;
    contentTypes: {
        shorts: number;
        regular: number;
        long: number;
    };
    uploadTiming: {
        preferredDays: string[];
        preferredHours: number[];
        timezonePattern: string;
    };
    titlePatterns: {
        averageLength: number;
        commonWords: string[];
        questionTitles: number;
        seriesTitles: number;
    };
    thumbnailStyle: {
        colorScheme: string[];
        hasText: boolean;
        hasFaces: boolean;
        style: string;
    };
}

export interface AudienceEngagement {
    engagementTrends: {
        period: string;
        views: number;
        likes: number;
        comments: number;
    }[];
    commentSentiment: {
        positive: number;
        neutral: number;
        negative: number;
    };
    loyaltyMetrics: {
        subscriberGrowthRate: number;
        viewsFromSubscribers: number;
        repeatViewerRate: number;
    };
    peakEngagementTimes: {
        dayOfWeek: string;
        hour: number;
        avgEngagement: number;
    }[];
}

export interface ChannelIdentity {
    primaryNiche: string;
    targetAudience: string;
    contentThemes: string[];
    uniqueSellingPoints: string[];
    brandPersonality: {
        tone: string;
        style: string;
        approach: string;
    };
    competitorAnalysis: {
        similarChannels: string[];
        differentiationFactors: string[];
        marketPosition: string;
    };
    contentStrategy: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
}

export interface ChannelAnalysisConfig {
    maxVideos: number;
    includeComments: boolean;
    includeAIAnalysis: boolean;
    analysisDepth: 'basic' | 'standard' | 'comprehensive';
    timeRange?: {
        startDate: string;
        endDate: string;
    };
}

export interface FrameAnalysisResult {
    frameIndex: number;
    timestamp: number;
    features: {
        hasText: boolean;
        hasFaces: boolean;
        dominantColors: string[];
        objects: string[];
        scenes: string[];
    };
    quality: {
        resolution: string;
        clarity: number;
        brightness: number;
    };
}

export interface VideoFrame {
    timestamp: number;
    imageData: string; // base64
    width: number;
    height: number;
}