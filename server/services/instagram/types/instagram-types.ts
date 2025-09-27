export interface InstagramProfile {
    username: string;
    fullName: string;
    biography: string;
    followers: number;
    following: number;
    mediacount: number;
    isPrivate: boolean;
    isVerified: boolean;
    profilePicUrl: string;
    externalUrl?: string;
}

export interface InstagramReelInfo {
    shortcode: string;
    url: string;
    caption: string;
    timestamp: number;
    uploadDate: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    isVideo: boolean;
    videoDuration?: number;
    videoUrl?: string;
    thumbnailUrl: string;
    hashtags: string[];
    mentions: string[];
    location?: {
        name: string;
        id: string;
    };
    owner: {
        username: string;
        fullName: string;
        isVerified: boolean;
        profilePicUrl: string;
    };
    platform: 'INSTAGRAM';
}

export interface InstagramReelExtracted {
    success: boolean;
    data?: InstagramReelInfo;
    error?: string;
    extractedAt: string;
}

export interface InstagramCollectionConfig {
    daysBack: number;
    minViews: number;
    maxCount: number;
    includeStories?: boolean;
    includeHighlights?: boolean;
}

export interface InstagramCollectionResult {
    success: boolean;
    username: string;
    totalReels: number;
    collectedReels: number;
    reels: InstagramReelInfo[];
    collectionTime: number;
    config: InstagramCollectionConfig;
    error?: string;
}

export interface InstagramProfileResult {
    success: boolean;
    profile?: InstagramProfile;
    error?: string;
    extractedAt: string;
}

export interface PythonScriptResult {
    success: boolean;
    data?: any;
    error?: string;
    stderr?: string;
    exitCode?: number;
}

export interface ReelsBulkCollectionOptions extends InstagramCollectionConfig {
    outputFormat?: 'json' | 'csv';
    downloadMedia?: boolean;
    skipExisting?: boolean;
}

export interface InstagramMetadata {
    extractedBy: string;
    extractedAt: string;
    instaloaderVersion?: string;
    platform: 'INSTAGRAM';
    originalUrl: string;
}

export interface InstagramAnalytics {
    engagementRate: number;
    averageViews: number;
    averageLikes: number;
    averageComments: number;
    topHashtags: Array<{ hashtag: string; count: number }>;
    postingPattern: {
        hourlyDistribution: number[];
        dailyDistribution: number[];
        averagePostsPerDay: number;
    };
}