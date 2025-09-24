/**
 * 🚀 Channel TypeScript 인터페이스 정의
 * JavaScript channel-types.js의 TypeScript 버전
 *
 * ⚠️ 주의사항:
 * - 대부분의 세부 인터페이스는 현재 사용되지 않음 (0 references)
 * - 주로 ChannelData와 YouTubeChannelData만 실제 사용
 * - JavaScript 모듈과의 경계에서 타입 체크가 완전하지 않음
 *
 * 📝 TODO:
 * - 사용하지 않는 인터페이스 정리 필요
 * - JavaScript 모듈을 TypeScript로 마이그레이션 시 활용 예정
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

// ===== AI 분석 결과 (필수/옵셔널 명확히 구분) =====
export interface CategoryInfo {
  majorCategory: string;
  middleCategory: string;
  subCategory: string;
  fullCategoryPath: string;
  categoryDepth: number;
  categoryConfidence: number;
  consistencyLevel: ConsistencyLevel;
  consistencyReason: string;
}

export interface ChannelAIAnalysis {
  // 필수 필드들 (절대 빠지면 안 되는 것들)
  keywords: string[];
  aiTags: string[];
  deepInsightTags: string[];
  allTags: string[];

  // channelIdentity 필수 필드들 (빈 값이라도 반드시 존재)
  targetAudience: string;      // 빈 문자열 허용, undefined 불허
  contentStyle: string;         // 빈 문자열 허용, undefined 불허
  uniqueFeatures: string[];    // 빈 배열 허용, undefined 불허
  channelPersonality: string;  // 빈 문자열 허용, undefined 불허

  // 옵셔널 필드
  categoryInfo?: CategoryInfo;
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

// ===== 전체 Channel 인터페이스 ===== [✅ 실제 사용중]
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

// ===== YouTube API 응답 타입들 (실제 API 응답과 일치) ===== [✅ 실제 사용중]
export interface YouTubeChannelData {
  // 필수 필드
  id: string;
  channelName: string;
  channelUrl: string;

  // 옵셔널 필드들 (API가 실제로 반환할 수도, 안 할 수도 있는 것들)
  subscribers?: number;
  subscriberCount?: number;  // API가 두 가지 형식으로 반환 가능
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  publishedAt?: string;       // undefined는 허용, 빈 문자열 불허
  defaultLanguage?: string;
  country?: string;
}

// ===== 함수 매개변수 타입들 =====
export interface CreateOrUpdateOptions {
  includeAnalysis?: boolean;
  skipAIAnalysis?: boolean;
  queueNormalizedChannelId?: string;
}

// ===== 분석 결과 타입 (analyzeChannelEnhanced 반환값) ===== [✅ 실제 사용중]
export interface ChannelAnalysisResult {
  analysis: AnalysisDataCore & {
    videoAnalyses?: any[];  // 개별 영상 분석 데이터
    enhancedAnalysis?: {    // 롱폼 채널용 (analysis 안에 있음)
      channelIdentity: {
        targetAudience: string;
        contentStyle: string;
        uniqueFeatures: string[];
        channelPersonality: string;
        channelTags: string[];
      };
    };
  };
  enhancedAnalysis?: {      // 숏폼 채널용 (최상위에 있음)
    channelIdentity: {
      targetAudience: string;
      contentStyle: string;
      uniqueFeatures: string[];
      channelPersonality: string;
      channelTags: string[];
    };
    videoAnalyses?: any[];
    analysisMethod?: string;
    analyzedVideos?: number;
  };
  videosCount?: number;
}

export interface EnhancedChannelAnalysisResult {
  targetAudience: string;
  contentStyle: string;
  uniqueFeatures: string[];
  channelPersonality: string;
  categoryInfo: CategoryInfo;
  channelTags: string[];
}