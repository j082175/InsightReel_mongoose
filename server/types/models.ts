import type { CategoryInfo, UploadFrequency } from "./channel.types";
import mongoose, { Document } from "mongoose";
import { FinalVideoData } from "./video-types"; // VideoModel.ts에서 참조하던 타입

// IVideo 인터페이스 (FinalVideoData를 확장하여 Mongoose Document 속성 포함)
export interface IVideo extends FinalVideoData, Document {}

// IChannel 인터페이스 (ChannelModel.js의 스키마를 기반으로 정의)
export interface IChannel extends Document {
    // ChannelCore
    platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK";
    channelId: string; // YouTube channel ID, Instagram username, TikTok username
    name: string;
    url: string;
    thumbnailUrl?: string;
    description?: string;
    country?: string;
    language?: string;
    customUrl?: string;
    publishedAt?: Date;
    defaultLanguage?: string;
    contentType?: "auto" | "shortform" | "longform" | "mixed";
    // ChannelStats
    subscribers: number;
    totalViews: number;
    totalVideos: number;
    averageViewsPerVideo?: number;
    last7DaysViews?: number;
    uploadFrequency?: UploadFrequency; // 예: 'daily', 'weekly', 'monthly'
    mostViewedVideo?: {
        videoId: string;
        title: string;
        views: number;
    };
    // ChannelAIAnalysis
    categoryInfo?: CategoryInfo;
    keywords: string[];
    aiTags: string[];
    deepInsightTags: string[];
    targetAudience: string;
    contentStyle: string;
    uniqueFeatures: string[];
    channelPersonality: string;
    allTags: string[];
    analysisStatus?: "pending" | "processing" | "completed" | "failed";
    lastAnalyzedAt?: Date;
    // ChannelClusterInfo
    clusterId?: string;
    clusterIds: string[];
    suggestedClusters: any[];
    clusterScore?: number;
    // ChannelMetadata
    status?: "active" | "inactive" | "suspended";
    createdAt: Date;
    updatedAt: Date;
}

// IChannelUrl 인터페이스 (ChannelUrl.js의 스키마를 기반으로 정의)
export interface IChannelUrl extends Document {
    normalizedChannelId: string;
    originalChannelIdentifier: string;
    platform: "INSTAGRAM" | "YOUTUBE" | "TIKTOK";
    status: "processing" | "completed" | "failed";
    channelInfo?: {
        name?: string;
        handle?: string;
        subscriberCount?: number;
        description?: string;
        thumbnailUrl?: string;
    };
    analysisJob?: {
        jobId?: string;
        queuePosition?: number;
        estimatedTime?: number;
    };
    processedAt?: Date;
    discoveredAt: Date;
    lastAnalyzedAt?: string;
}

// IVideoUrl 인터페이스 (VideoUrl.js의 스키마를 기반으로 정의)
export interface IVideoUrl extends Document {
    normalizedUrl: string;
    originalUrl: string;
    platform: "INSTAGRAM" | "YOUTUBE" | "TIKTOK";
    videoId?: string;
    channelId?: string;
    status: "processing" | "completed" | "failed";
    sheetLocation?: {
        sheetName?: string;
        column?: string;
        row?: number;
    };
    originalPublishDate?: Date | null;
    processedAt?: Date;
    createdAt: Date;
}

// IChannelGroup 인터페이스 (ChannelGroup.js의 스키마를 기반으로 정의)
export interface IChannelGroup extends Document {
    name: string;
    description?: string;
    color: string;
    channels: {
        channelId: string;
        name: string;
    }[];
    keywords: string[];
    isActive: boolean;
    lastCollectedAt?: Date;
    createdAt: string;
    updatedAt: string;
}

// ICollectionBatch 인터페이스 (CollectionBatch.js의 스키마를 기반으로 정의)
export interface ICollectionBatch extends Document {
    name: string;
    description?: string;
    collectionType: "group" | "channels";
    targetGroups: (mongoose.Schema.Types.ObjectId | IChannelGroup)[];
    targetChannels: string[];
    criteria: {
        daysBack: number;
        minViews: number;
        maxViews?: number;
        includeShorts: boolean;
        includeMidform: boolean;
        includeLongForm: boolean;
        keywords: string[];
        excludeKeywords: string[];
    };
    status: "pending" | "running" | "completed" | "failed";
    startedAt?: Date;
    completedAt?: Date;
    totalVideosFound: number;
    totalVideosSaved: number;
    failedChannels: {
        channelName?: string;
        error?: string;
    }[];
    quotaUsed: number;
    stats: {
        byPlatform: {
            YOUTUBE: number;
            INSTAGRAM: number;
            TIKTOK: number;
        };
        byDuration: {
            SHORT: number;
            MID: number;
            LONG: number;
        };
        avgViews: number;
        totalViews: number;
    };
    errorMessage?: string;
    errorDetails?: string;
    createdAt: string;
    updatedAt: string;
    // Virtuals
    durationMinutes?: number;
    successRate?: number;
}

// ITrendingVideo 인터페이스 (TrendingVideo.js의 스키마를 기반으로 정의)
export interface ITrendingVideo extends Document {
    videoId: string;
    title: string;
    url: string;
    platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK";
    channelName: string;
    channelId: string;
    channelUrl?: string;
    groupId?: mongoose.Schema.Types.ObjectId | IChannelGroup;
    groupName: string;
    batchId?: mongoose.Schema.Types.ObjectId | ICollectionBatch;
    collectionDate: Date;
    collectedFrom: "trending" | "individual";
    views: number;
    likes: number;
    commentsCount: number;
    shares: number;
    uploadDate?: Date;
    duration?: "SHORT" | "MID" | "LONG";
    durationSeconds?: number;
    thumbnailUrl?: string;
    description?: string;
    keywords: string[];
    hashtags: string[];
    createdAt: string;
    updatedAt: string;
}
