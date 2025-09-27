export interface TikTokVideoInfo {
    videoId: string;
    title: string;
    description: string;
    channelName: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    uploadDate: string;
    thumbnailUrl: string;
    videoUrl?: string;
    duration?: number;
    hashtags?: string[];
    mentions?: string[];
    platform: 'TIKTOK';
}

export interface TikTokExtractResult {
    success: boolean;
    data?: TikTokVideoInfo;
    error?: string;
    extractedAt: string;
}

export interface TikTokTrendAnalysis {
    trendingHashtags: string[];
    viralPotential: number;
    contentType: string;
}

export interface TikTokDownloadResult {
    success: boolean;
    filePath?: string;
    videoInfo?: TikTokVideoInfo;
    error?: string;
    downloadTime?: number;
}

export interface TikTokAPIVersion {
    version: 'v1' | 'v2' | 'v3';
    endpoint: string;
    supported: boolean;
}

export interface TikTokProfile {
    username: string;
    displayName: string;
    followers: number;
    following: number;
    likes: number;
    videos: number;
    verified: boolean;
    profilePicUrl?: string;
    bio?: string;
}

export interface TikTokCollectionConfig {
    maxVideos?: number;
    daysBack?: number;
    minViews?: number;
    sortBy?: 'views' | 'likes' | 'comments' | 'date';
}

export interface TikTokCollectionResult {
    success: boolean;
    username: string;
    videos: TikTokVideoInfo[];
    totalCollected: number;
    config: TikTokCollectionConfig;
    error?: string;
}