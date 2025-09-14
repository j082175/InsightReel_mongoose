/**
 * 🎯 Video Entity - Domain Model Types (FSD Layer)
 *
 * entities 레이어의 video 도메인 모델
 * - 비즈니스 도메인 중심의 타입 정의
 * - UI나 특정 페이지에 종속되지 않는 순수한 도메인 모델
 * - 백엔드 API와 프론트엔드 간의 계약 역할
 */

// ===== 플랫폼 및 기본 타입 =====
export type Platform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
export type ContentType = 'shortform' | 'longform' | 'mixed';

// ===== Core Video Domain Model =====
export interface VideoCore {
  // 필수 식별자 및 기본 정보
  id: string;
  title: string;
  url: string;
  platform: Platform;
  uploadDate: string;

  // 콘텐츠 메타데이터
  description?: string;
  thumbnailUrl?: string;

  // 성과 지표
  views: number;
  likes?: number;
  commentsCount?: number;
  shares?: number;

  // 콘텐츠 분석
  keywords?: string[];
  hashtags?: string[];
  mentions?: string[];
}

// ===== Channel Domain Model =====
export interface VideoChannelInfo {
  channelName: string;
  channelUrl?: string;
  subscribers?: number;
  channelVideos?: number;
}

// ===== AI Analysis Domain Model =====
export interface VideoAIAnalysis {
  mainCategory?: string;
  middleCategory?: string;
  fullCategoryPath?: string;
  categoryDepth?: number;
  confidence?: string;
  analysisStatus?: 'pending' | 'analyzing' | 'completed' | 'error';

  // AI 분석 결과 세부 정보
  analysisResult?: {
    category: string;
    keywords: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    confidence: number;
    processingTime: number;
  };
}

// ===== YouTube Specific Domain =====
export interface YouTubeSpecificData {
  youtubeHandle?: string;
  duration?: string;
  contentType?: ContentType;
  monetized?: string;
  youtubeCategory?: string;
  language?: string;
  quality?: string;
  license?: string;
}

// ===== System Metadata =====
export interface VideoSystemMetadata {
  collectionTime?: string;
  timestamp?: string;
  processedAt?: string;
  createdAt?: string;
  updatedAt?: string;

  // 데이터 출처 정보
  source?: 'videos' | 'trending';
  isFromTrending?: boolean;

  // Google Sheets 동기화 정보
  sheetsRowData?: {
    rowNumber?: number;
    columnData?: Record<string, string | number | boolean>;
    lastUpdated?: string;
    status?: 'pending' | 'synced' | 'error';
  };
}

// ===== Main Video Entity =====
/**
 * Video 도메인 엔티티 - 모든 비디오 관련 데이터의 중심
 * 비즈니스 로직에서 사용되는 완전한 비디오 모델
 */
export interface VideoEntity
  extends VideoCore,
          VideoChannelInfo,
          VideoAIAnalysis,
          YouTubeSpecificData,
          VideoSystemMetadata {

  // 배치 수집 정보
  batchIds?: string[];
  collectedAt?: string;
  isCollected?: boolean;

  // 아카이브 정보
  archivedAt?: string;
  tags?: string[];
  notes?: string;
}

// ===== Collection Batch Entity =====
export interface CollectionBatchEntity {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  collectedAt: string;
  videoCount: number;
  channels: string[];
}

// ===== Domain Value Objects =====

/**
 * 비디오 성과 지표 값 객체
 */
export interface VideoMetrics {
  views: number;
  likes: number;
  commentsCount: number;
  shares: number;

  // 계산된 지표
  engagementRate?: number;
  likesPerView?: number;
}

/**
 * 비디오 콘텐츠 정보 값 객체
 */
export interface VideoContent {
  title: string;
  description: string;
  thumbnailUrl: string;
  duration?: string;
  aspectRatio?: '16:9' | '9:16';
}

/**
 * 비디오 분류 정보 값 객체
 */
export interface VideoCategory {
  mainCategory: string;
  middleCategory?: string;
  fullCategoryPath: string;
  categoryDepth: number;
  confidence: string;
}

// ===== Domain Events (Future) =====
export interface VideoAnalyzedEvent {
  videoId: string;
  analysisResult: VideoAIAnalysis['analysisResult'];
  timestamp: string;
}

export interface VideoCollectedEvent {
  videoId: string;
  batchId: string;
  collectedAt: string;
}