export interface BatchItem {
    id: string;
    videoUrl: string;
    videoId: string;
    addedAt: string;
    priority: 'high' | 'normal' | 'low';
    clientInfo: Record<string, any>;
    metadata: Record<string, any>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BatchProcessorConfig {
    maxBatchSize: number;
    batchTimeout: number;
    batchFile: string;
    apiTimeout: number;
}

export interface BatchStats {
    totalProcessed: number;
    totalBatches: number;
    quotaSaved: number;
    avgProcessingTime: number;
}

export interface BatchResult {
    success: boolean;
    processed: number;
    total: number;
    processingTime: number;
    quotaSaved: number;
    results: ProcessedVideoData[];
}

export interface ProcessedVideoData {
    videoId: string;
    title: string;
    description: string;
    channelName: string;
    channelId: string;
    uploadDate: string;
    thumbnailUrl: string;
    youtubeCategory: string;
    categoryId: string;
    duration: number;
    isShortForm: boolean;
    tags: string[];
    views: string;
    likes: string;
    commentsCount: string;
    subscribers: string;
    channelVideos: string;
    channelViews: string;
    channelCountry: string;
    channelDescription: string;
    youtubeHandle: string;
    channelUrl: string;
    quality: string;
    language: string;
    liveBroadcast: string;
    hashtags: string[];
    mentions: string[];
    topComments: string;
}

export interface AddToBatchOptions {
    priority?: 'high' | 'normal' | 'low';
    clientInfo?: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface AddToBatchResult {
    batchId: string;
    status: 'queued' | 'processing';
    queuePosition: number;
    estimatedWaitTime: number;
    message: string;
}

export interface BatchStatus {
    queueLength: number;
    maxBatchSize: number;
    isProcessing: boolean;
    nextProcessTime: string | null;
    stats: BatchStats;
    estimatedQuotaSaving: string;
}

export interface ChunkResult {
    videos: ProcessedVideoData[];
    channelMap: Record<string, any>;
}

export interface QueueState {
    queue: BatchItem[];
    stats: BatchStats;
    savedAt: string;
}

export interface CategoryMapping {
    [key: string]: string;
}