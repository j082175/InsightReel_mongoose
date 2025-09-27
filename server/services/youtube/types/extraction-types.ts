export interface VideoExtractionConfig {
    useYtdlFirst: boolean;
    ytdlTimeout: number;
}

export interface VideoThumbnail {
    url: string;
    width?: number;
    height?: number;
}

export interface VideoComment {
    author: string;
    text: string;
    likeCount: number;
}

export interface ChannelData {
    subscriberCount: number;
    channelVideoCount: number;
    channelViewCount: number;
    channelCountry: string;
    channelDescription: string;
    channelCustomUrl: string;
    channelPublishedAt: string;
}

export interface YtdlVideoData {
    title: string;
    description: string;
    duration: number;
    uploadDate: string;
    channelName: string;
    channelId: string;
    channelUrl: string;
    category: string;
    keywords: string[];
    tags: string[];
    thumbnails: VideoThumbnail[];
    thumbnail: VideoThumbnail | null;
    viewCount: number;
    isLiveContent: boolean;
    isLive: boolean;
    source: string;
}

export interface APIVideoData {
    title: string;
    description: string;
    channelName: string;
    channelId: string;
    duration: number;
    category: string;
    keywords: string[];
    tags: string[];
    viewCount: number;
    likeCount: number;
    commentCount: number;
    publishedAt: string;
    uploadDate: string;
    thumbnails: VideoThumbnail[];
    categoryId: string;
    youtubeCategoryId: string;
    channelTitle: string;
    channelUrl: string;
    subscribers: number;
    channelVideos: number;
    channelViews: number;
    channelCountry: string;
    channelDescription: string;
    channelCustomUrl: string;
    youtubeHandle: string;
    hashtags: string[];
    mentions: string[];
    topComments: VideoComment[];
    defaultLanguage: string;
    language: string;
    isLiveContent: boolean;
    isLive: boolean;
    liveBroadcast: string;
    privacyStatus: string;
    embeddable: boolean;
    source: string;
}

export interface MergedVideoData extends Partial<YtdlVideoData>, Partial<APIVideoData> {
    platform: string;
    url: string;
    dataSources: {
        primary: string;
        ytdl: boolean;
        api: boolean;
        hybrid: boolean;
    };
    likes?: number;
    commentsCount?: number;
    originalPublishDate?: Date;
}

export interface ExtractionResult {
    success: boolean;
    data?: MergedVideoData;
    error?: string;
    sources?: {
        ytdl: boolean;
        api: boolean;
    };
    extractionTime: number;
}

export interface ExtractorStatus {
    available: {
        ytdl: boolean;
        api: boolean;
    };
    config: {
        ytdlFirst: boolean;
        timeout: number;
    };
    capabilities: {
        basicInfo: boolean;
        statistics: boolean;
        realTimeViews: boolean;
        thumbnails: boolean;
        batchProcessing: boolean;
    };
}