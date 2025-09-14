/**
 * 🎯 Channel Entity - Domain Model Types (FSD Layer)
 *
 * entities 레이어의 channel 도메인 모델
 * - 채널 중심의 비즈니스 도메인 모델
 * - 플랫폼별 채널 특성 및 분석 결과 포함
 * - UI에 독립적인 순수 도메인 모델
 */

import { Platform } from '../../../entities/video/model/types';

// ===== Core Channel Domain Model =====
export interface ChannelCore {
  // 필수 식별자 및 기본 정보
  id: string;
  name: string;
  url: string;
  platform: Platform;

  // 채널 메타데이터
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  subscribers?: number;
  contentType?: 'shortform' | 'longform' | 'mixed';
}

// ===== Channel AI Analysis =====
export interface ChannelAIAnalysis {
  // 키워드 및 태그
  keywords?: string[];
  aiTags?: string[];
  deepInsightTags?: string[];
  allTags?: string[];

  // 카테고리 분석 결과
  categoryInfo?: {
    majorCategory: string;
    middleCategory?: string;
    subCategory?: string;
    fullCategoryPath: string;
    categoryDepth: number;
    categoryConfidence: number;
    consistencyLevel: 'high' | 'medium' | 'low';
    consistencyReason?: string;
  };
}

// ===== Channel Statistics =====
export interface ChannelStatistics {
  // 기본 통계
  totalVideos?: number;
  totalViews?: number;
  averageViewsPerVideo?: number;

  // 업로드 패턴
  dailyUploadRate?: number;
  uploadFrequency?: {
    pattern: 'daily' | 'weekly' | 'bi_weekly' | 'multiple_per_week' | 'irregular';
    avgDaysBetweenUploads: number;
    consistency: number; // 0-1 일관성 점수
  };

  // 성과 지표
  viewsByPeriod?: {
    last7Days?: number;
    last30Days?: number;
    last90Days?: number;
    lastYear?: number;
  };

  // 콘텐츠 특성
  avgDurationSeconds?: number;
  avgDurationFormatted?: string;
  shortFormRatio?: number; // 0-1 숏폼 비율

  // 대표 영상
  mostViewedVideo?: {
    videoId: string;
    title: string;
    publishedAt: string;
    thumbnailUrl?: string;
    viewCount: number;
    likeCount?: number;
    commentCount?: number;
    duration?: string;
    durationSeconds?: number;
    tags?: string[];
    categoryId?: string;
  };
}

// ===== Channel Clustering =====
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

// ===== Channel System Metadata =====
export interface ChannelSystemMetadata {
  // 분석 메타데이터
  lastAnalyzedAt?: string;
  analysisVersion?: string;
  analysisStatus?: 'pending' | 'analyzing' | 'completed' | 'error' | 'active' | 'inactive';

  // 수집 메타데이터
  collectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

// ===== Main Channel Entity =====
/**
 * Channel 도메인 엔티티 - 모든 채널 관련 데이터의 중심
 * 비즈니스 로직에서 사용되는 완전한 채널 모델
 */
export interface ChannelEntity
  extends ChannelCore,
          ChannelAIAnalysis,
          ChannelStatistics,
          ChannelClusterInfo,
          ChannelSystemMetadata {

  // 차트 데이터 (분석용)
  dailyViewsLast7Days?: number[];
  dailyViewsLast30d?: number[];
  dailyViewsLast3m?: number[];
  dailyViewsLast1y?: number[];
}

// ===== Channel Group Entity =====
export interface ChannelGroupEntity {
  id: string;
  name: string;
  description?: string;
  channels: string[]; // 채널 ID 배열
  color?: string;
  createdAt: string;
  updatedAt: string;

  // 그룹 통계
  totalChannels: number;
  totalVideos?: number;
  totalViews?: number;
  averageSubscribers?: number;

  // 수집 설정
  collectionSettings?: {
    minViews?: number;
    daysSince?: number;
    contentTypes?: string[];
    enabled: boolean;
  };
}

// ===== Domain Value Objects =====

/**
 * 채널 성과 지표 값 객체
 */
export interface ChannelMetrics {
  subscribers: number;
  totalViews: number;
  totalVideos: number;
  averageViewsPerVideo: number;

  // 계산된 지표
  growthRate?: number;
  engagementRate?: number;
  uploadConsistency?: number;
}

/**
 * 채널 콘텐츠 특성 값 객체
 */
export interface ChannelContentProfile {
  contentType: 'shortform' | 'longform' | 'mixed';
  avgDurationSeconds: number;
  shortFormRatio: number;
  mainTopics: string[];
  consistencyLevel: 'high' | 'medium' | 'low';
}

/**
 * 채널 업로드 패턴 값 객체
 */
export interface ChannelUploadPattern {
  pattern: 'daily' | 'weekly' | 'bi_weekly' | 'multiple_per_week' | 'irregular';
  frequency: number; // 주당 업로드 수
  consistency: number; // 0-1 일관성 점수
  avgDaysBetweenUploads: number;
  bestUploadDays?: string[]; // 요일
  bestUploadTimes?: string[]; // 시간대
}

/**
 * 채널 카테고리 분류 값 객체
 */
export interface ChannelCategory {
  majorCategory: string;
  middleCategory?: string;
  subCategory?: string;
  fullCategoryPath: string;
  confidence: number;
  tags: string[];
}

// ===== Domain Events (Future) =====
export interface ChannelAnalyzedEvent {
  channelId: string;
  analysisResult: ChannelAIAnalysis;
  timestamp: string;
}

export interface ChannelGroupCreatedEvent {
  groupId: string;
  name: string;
  channelIds: string[];
  timestamp: string;
}

export interface ChannelStatsUpdatedEvent {
  channelId: string;
  newStats: ChannelStatistics;
  timestamp: string;
}