import { Request, Response } from 'express';
import { Platform } from './video-types';

// Express 요청/응답 확장 타입
export interface VideoProcessRequest extends Request {
    body: {
        platform?: Platform;
        videoUrl?: string;
        postUrl?: string;
        url?: string;           // 안드로이드 앱이 보내는 키
        metadata?: VideoMetadata;
        analysisType?: AnalysisType;
        useAI?: boolean;
    };
    file?: Express.Multer.File;
}

export interface VideoProcessResponse extends Response {
    json(body: ApiResponse): this;
}

// API 응답 타입
export interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

// 비디오 메타데이터 타입
export interface VideoMetadata {
    title?: string;
    description?: string;
    channelName?: string;
    channelUrl?: string;
    channelId?: string;
    likes?: number;
    views?: number;
    commentsCount?: number;
    uploadDate?: string;
    duration?: number;
    thumbnailUrl?: string;
    youtubeHandle?: string;
    subscribers?: number;
    channelVideos?: number;
    contentType?: string;
    topComments?: string;
    comments?: string;
    youtubeCategory?: string;
    monetized?: string;
    quality?: string;
    license?: string;
    hashtags?: string[];
    mentions?: string[];
    keywords?: string[];

    // Instagram 특화 필드
    _instagramAuthor?: string;
    instagramAuthor?: string;

    // AI 분석 결과
    mainCategory?: string;
    middleCategory?: string;
    subCategory?: string;
    detailCategory?: string;
    fullCategoryPath?: string;
    categoryDepth?: number;
    analysisContent?: string;
    confidence?: string;
    analysisStatus?: string;
    processedAt?: string;
    categoryMatchRate?: string;
    matchType?: string;
    matchReason?: string;
}

// 분석 타입
export type AnalysisType = 'none' | 'quick' | 'single' | 'multi-frame' | 'full';

// 파이프라인 결과 타입
export interface PipelineResult {
    videoPath: string | null;
    thumbnailPaths: string[] | string | null;
    analysis: AnalysisResult | null;
}

// AI 분석 결과 타입
export interface AnalysisResult {
    category?: string;
    mainCategory?: string;
    middleCategory?: string;
    subCategory?: string;
    detailCategory?: string;
    fullCategoryPath?: string;
    categoryDepth?: number;
    keywords?: string[];
    hashtags?: string[];
    mentions?: string[];
    analysisContent?: string;
    confidence?: number | string;
    analysisStatus?: string;
    processedAt?: string;
    frameCount?: number;
    source?: string;
    categoryMatch?: {
        matchScore: number;
        matchType: string;
        matchReason: string;
    };
}

// 파이프라인 실행 옵션
export interface PipelineOptions {
    platform: Platform;
    videoUrl?: string;
    videoPath?: string;
    postUrl: string;
    metadata?: VideoMetadata;
    analysisType?: AnalysisType;
    useAI?: boolean;
    isBlob?: boolean;
}

// 컨트롤러 통계 타입
export interface ControllerStats {
    total: number;
    today: number;
    lastReset: string;
}

// 헬스 체크 응답 타입
export interface HealthCheckResponse {
    status: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    services: {
        videoProcessor: string;
        aiAnalyzer: string;
        sheetsManager: string;
    };
}

// 비디오 처리 파이프라인 결과
export interface VideoProcessingResult {
    category?: string;
    mainCategory?: string;
    middleCategory?: string;
    subCategory?: string;
    detailCategory?: string;
    keywords?: string[];
    hashtags?: string[];
    confidence?: number | string;
    frameCount?: number;
    analysisType: AnalysisType;
    videoPath?: string;
    thumbnailPath?: string;
    thumbnailPaths?: string[] | string;
}