/**
 * 🚀 Channel TypeScript 인터페이스 정의
 * JavaScript channel-types.js의 TypeScript 버전
 */

// ===== 기본 플랫폼 타입 =====
export type Platform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
export type ContentType = 'auto' | 'shortform' | 'longform' | 'mixed';
export type ConsistencyLevel = 'high' | 'medium' | 'low';
export type UploadPattern = 'daily' | 'weekly' | 'bi_weekly' | 'multiple_per_week' | 'irregular';

// ===== 기본 채널 정보 =====
export interface ChannelCore {
  channelId: string;
  name: string;
  url?: string;
  platform: Platform;
  subscribers?: number;
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  contentType?: ContentType;
  defaultLanguage?: string;
  country?: string;
  publishedAt?: string;
}

// ===== AI 분석 결과 =====
export interface CategoryInfo {
  majorCategory?: string;
  middleCategory?: string;
  subCategory?: string;
  fullCategoryPath?: string;
  categoryDepth?: number;
  categoryConfidence?: number;
  consistencyLevel?: ConsistencyLevel;
  consistencyReason?: string;
}

export interface ChannelAIAnalysis {
  keywords: string[];
  aiTags: string[];
  deepInsightTags: string[];
  allTags: string[];
  categoryInfo?: CategoryInfo;

  // channelIdentity 추가 정보 (오늘 문제가 된 필드들!)
  targetAudience: string;
  contentStyle: string;
  uniqueFeatures: string[];
  channelPersonality: string;
}

// ===== 클러스터 정보 =====
export interface ChannelClusterInfo {
  clusterIds: string[];
  suggestedClusters: any[];
}

// ===== 성과 통계 =====
export interface ViewsByPeriod {
  last7Days?: number;
  last30Days?: number;
  last90Days?: number;
  lastYear?: number;
}

export interface UploadFrequency {
  pattern?: UploadPattern;
  avgDaysBetweenUploads?: number;
  consistency?: number;
}

export interface MostViewedVideo {
  videoId?: string;
  title?: string;
  publishedAt?: Date;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  duration?: string;
  durationSeconds?: number;
  tags?: string[];
  categoryId?: string;
}

export interface ChannelStats {
  dailyUploadRate?: number;
  last7DaysViews?: number;
  avgDurationSeconds?: number;
  avgDurationFormatted?: string;
  shortFormRatio?: number;
  viewsByPeriod?: ViewsByPeriod;
  totalVideos?: number;
  totalViews?: number;
  averageViewsPerVideo?: number;
  uploadFrequency?: UploadFrequency;
  mostViewedVideo?: MostViewedVideo;
}

// ===== 메타데이터 =====
export interface ChannelMetadata {
  lastAnalyzedAt?: string;
  analysisVersion?: string;
  collectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

// ===== 전체 Channel 인터페이스 =====
export interface ChannelData extends
  ChannelCore,
  ChannelAIAnalysis,
  ChannelClusterInfo,
  ChannelStats,
  ChannelMetadata {}

// ===== AI 분석 관련 타입들 =====
export interface AnalysisDataCore {
  dailyUploadRate?: number;
  last7DaysViews?: number;
  avgDurationSeconds?: number;
  avgDurationFormatted?: string;
  shortFormRatio?: number;
  viewsByPeriod?: ViewsByPeriod;
  totalVideos?: number;
  totalViews?: number;
  averageViewsPerVideo?: number;
  uploadFrequency?: UploadFrequency;
  mostViewedVideo?: MostViewedVideo;
}

export interface EnhancedAnalysisData {
  channelIdentity?: {
    targetAudience: string;
    contentStyle: string;
    uniqueFeatures: string[];
    channelPersonality: string;
    channelTags?: string[];
    primaryCategory?: string;
    secondaryCategories?: string[];
  };
}

export interface AnalysisData extends AnalysisDataCore {
  enhancedAnalysis?: EnhancedAnalysisData;
}

// ===== YouTube API 응답 타입들 =====
export interface YouTubeChannelData {
  id: string;
  channelName: string;
  channelUrl: string;
  subscribers?: number;
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  publishedAt?: string;
  defaultLanguage?: string;
  country?: string;
}

// ===== 함수 매개변수 타입들 =====
export interface CreateOrUpdateOptions {
  includeAnalysis?: boolean;
  skipAIAnalysis?: boolean;
  queueNormalizedChannelId?: string;
}

// ===== 분석 결과 타입 (analyzeChannelEnhanced 반환값) =====
export interface ChannelAnalysisResult {
  analysis: AnalysisDataCore;
  enhancedAnalysis?: EnhancedAnalysisData;
  videosCount: number;
}

export interface EnhancedChannelAnalysisResult {
  targetAudience: string;
  contentStyle: string;
  uniqueFeatures: string[];
  channelPersonality: string;
  categoryInfo: CategoryInfo;
  channelTags: string[];
}