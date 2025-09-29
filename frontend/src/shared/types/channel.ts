/**
 * 🚀 Channel 타입 정의 (server/types/channel-types.js 기반)
 * 백엔드 ChannelCore, ChannelAIAnalysis, ChannelClusterInfo, ChannelStats, ChannelMetadata와 동일한 구조
 */

import { Platform } from './video';

// ===== 기본 채널 정보 (ChannelCore) =====
export interface ChannelCore {
  _id: string; // MongoDB ObjectId (표준 ID)
  channelId: string; // YouTube/Instagram/TikTok 실제 채널 ID
  name: string; // 필수 → 모든 채널은 이름이 있어야 함
  platform: Platform; // 필수 → 모든 채널은 플랫폼이 있어야 함

  // 선택적 필드들
  id?: string; // 임시 호환용 (향후 제거 예정)
  url?: string;
  subscribers?: number;
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  contentType?: 'shortform' | 'longform' | 'mixed';

  // 언어 및 지역 정보 (DB에 있지만 타입에 누락된 필드들)
  defaultLanguage?: string;
  country?: string;
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

  // 채널 정체성 정보 (DB에 있지만 UI에 없던 필드들)
  targetAudience?: string;
  contentStyle?: string;
  uniqueFeatures?: string[];
  channelPersonality?: string;
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
    pattern?:
      | 'daily'
      | 'weekly'
      | 'bi_weekly'
      | 'multiple_per_week'
      | 'irregular';
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
  publishedAt?: string; // 채널 실제 생성일
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

// ===== 전체 Channel 인터페이스 조합 =====
export interface Channel
  extends ChannelCore,
    ChannelAIAnalysis,
    ChannelClusterInfo,
    ChannelStats,
    ChannelMetadata {
  // UI 전용 필드 (하위 호환성을 위한 임시 유지)
  videoCount?: number; // totalVideos와 동일 (향후 제거 예정)
  subscriberCount?: number; // subscribers와 동일 (향후 제거 예정)
  category?: string; // categoryInfo.majorCategory와 동일 (향후 제거 예정)
  avatarUrl?: string; // thumbnailUrl과 동일 (향후 제거 예정)
  channelUrl?: string; // url과 동일 (향후 제거 예정)

  // 분석 상태 (UI용)
  analysisStatus?:
    | 'pending'
    | 'analyzing'
    | 'completed'
    | 'error'
    | 'active'
    | 'inactive';

  // 차트 데이터 (UI용)
  dailyViewsLast7Days?: number[];
  dailyViewsLast30d?: number[];
  dailyViewsLast3m?: number[];
  dailyViewsLast1y?: number[];
}
