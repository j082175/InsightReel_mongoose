/**
 * 🚀 Channel 타입 정의 (server/types/channel-types.js 기반)
 * 백엔드 ChannelCore, ChannelAIAnalysis, ChannelClusterInfo, ChannelStats, ChannelMetadata와 동일한 구조
 */

import { Platform } from './video';

// ===== 기본 채널 정보 (ChannelCore) =====
export interface ChannelCore {
  id: string;
  name: string;
  url?: string;
  platform: Platform;
  subscribers?: number;
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  contentType?: 'shortform' | 'longform' | 'mixed';
}

// ===== AI 분석 결과 (ChannelAIAnalysis) =====
export interface ChannelAIAnalysis {
  keywords?: string[];
  aiTags?: string[];
  deepInsightTags?: string[];
  allTags?: string[];
  
  categoryInfo?: {
    majorCategory?: string;
    middleCategory?: string;
    subCategory?: string;
    fullCategoryPath?: string;
    categoryDepth?: number;
    categoryConfidence?: number;
    consistencyLevel?: 'high' | 'medium' | 'low';
    consistencyReason?: string;
  };
}

// ===== 클러스터 정보 (ChannelClusterInfo) =====
export interface ChannelClusterInfo {
  clusterIds?: string[];
  suggestedClusters?: Array<{
    id: string;
    name: string;
    similarity?: number;
    tags?: string[];
    description?: string;
  }>;
}

// ===== 성과 통계 (ChannelStats) =====
export interface ChannelStats {
  dailyUploadRate?: number;
  last7DaysViews?: number;
  avgDurationSeconds?: number;
  avgDurationFormatted?: string;
  shortFormRatio?: number;
  
  // 기간별 조회수
  viewsByPeriod?: {
    last7Days?: number;
    last30Days?: number;
    last90Days?: number;
    lastYear?: number;
  };
  
  totalVideos?: number;
  totalViews?: number;
  averageViewsPerVideo?: number;
  
  uploadFrequency?: {
    pattern?: 'daily' | 'weekly' | 'bi_weekly' | 'multiple_per_week' | 'irregular';
    avgDaysBetweenUploads?: number;
    consistency?: number;
  };
  
  mostViewedVideo?: {
    videoId?: string;
    title?: string;
    publishedAt?: string;
    thumbnailUrl?: string;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    duration?: string;
    durationSeconds?: number;
    tags?: string[];
    categoryId?: string;
  };
}

// ===== 메타데이터 (ChannelMetadata) =====
export interface ChannelMetadata {
  lastAnalyzedAt?: string;
  analysisVersion?: string;
  collectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  _id?: string;
}

// ===== 전체 Channel 인터페이스 조합 =====
export interface Channel extends ChannelCore, ChannelAIAnalysis, ChannelClusterInfo, ChannelStats, ChannelMetadata {
  // UI 전용 필드 (레거시 호환)
  videoCount?: number;          // totalVideos와 동일
  subscriberCount?: number;     // subscribers와 동일
  category?: string;            // categoryInfo.majorCategory와 동일
  avatarUrl?: string;           // thumbnailUrl과 동일
  channelUrl?: string;          // url과 동일
  avgUploadsPerDay?: number;    // dailyUploadRate와 동일
  viewsLast7Days?: number;      // last7DaysViews와 동일
  avgVideoDuration?: number;    // avgDurationSeconds와 동일
  
  // 차트 데이터 (UI용)
  dailyViewsLast7Days?: number[];
  dailyViewsLast30d?: number[];
  dailyViewsLast3m?: number[];
  dailyViewsLast1y?: number[];
}