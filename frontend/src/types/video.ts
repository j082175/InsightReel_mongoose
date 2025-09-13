/**
 * 🚀 Video 타입 정의 (server/types/video-types.js 기반)
 * 백엔드 VideoCore, ChannelInfo, AIAnalysis, YouTubeSpecific, SystemMetadata와 동일한 구조
 */

// ===== 플랫폼 타입 =====
export type Platform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
export type ContentType = 'shortform' | 'longform' | 'mixed';

// ===== 기본 비디오 정보 (VideoCore) =====
export interface VideoCore {
  // 자동 생성 필드
  rowNumber?: number;
  
  // 기본 메타데이터
  uploadDate: string;
  platform: Platform;
  
  // 콘텐츠 분석 필드
  keywords?: string[];
  hashtags?: string[];
  mentions?: string[];
  description?: string;
  analysisContent?: string;
  
  // 성과 지표 (선택적)
  likes?: number;
  commentsCount?: number;
  
  // URL 정보
  url: string;
  thumbnailUrl?: string;
  
  // 제목 (필수)
  title: string;
  
  // 레거시 호환성 필드
  shares?: number;
  videoUrl?: string;
  topComments?: string;
}

// ===== 채널 정보 (ChannelInfo) =====
export interface ChannelInfo {
  channelName: string;
  channelUrl?: string;
  subscribers?: number;
  channelVideos?: number;
}

// ===== AI 분석 결과 (AIAnalysis) =====
export interface AIAnalysis {
  mainCategory?: string;
  middleCategory?: string;
  fullCategoryPath?: string;
  categoryDepth?: number;
  confidence?: string;
  analysisStatus?: string;
  categoryMatchRate?: string;
  matchType?: string;
  matchReason?: string;
}

// ===== YouTube 전용 필드 (YouTubeSpecific) =====
export interface YouTubeSpecific {
  youtubeHandle?: string;
  comments?: string;
  views?: number;
  duration?: string;
  contentType?: ContentType;
  monetized?: string;
  youtubeCategory?: string;
  license?: string;
  quality?: string;
  language?: string;
}

// ===== 시스템 메타데이터 (SystemMetadata) =====
export interface SystemMetadata {
  collectionTime?: string;
  timestamp?: string;
  processedAt?: string;
  sheetsRowData?: {
    rowNumber?: number;
    columnData?: Record<string, string | number | boolean>;
    lastUpdated?: string;
    status?: 'pending' | 'synced' | 'error';
  };
  
  // 데이터 출처 정보
  source?: 'videos' | 'trending';
  isFromTrending?: boolean;
  
  // Mongoose 자동 생성 필드
  createdAt?: string;
  updatedAt?: string;
  _id?: string;
}

// ===== 전체 Video 인터페이스 조합 =====
export interface Video extends VideoCore, ChannelInfo, AIAnalysis, YouTubeSpecific, SystemMetadata {
  // UI 전용 필드
  id?: string | number;
  videoId?: string;            // 비디오 고유 ID
  thumbnail?: string;          // thumbnailUrl과 동일
  channelAvatar?: string;
  channelAvatarUrl?: string;   // channelAvatar와 동일
  viewCount?: number;          // views와 동일
  daysAgo?: number;
  isTrending?: boolean;
  embedUrl?: string;
  aspectRatio?: '16:9' | '9:16';
  
  // AI 분석 결과 (VideoModal용)
  analysisResult?: AIAnalysisResult;
  
  // 아카이브 전용 필드
  archivedAt?: string;
  tags?: string[];
  notes?: string;
  
  // 배치 수집 정보
  batchIds?: string[];
  collectedAt?: string;
  isCollected?: boolean;
}

// ===== Extended Video Types =====
export interface ExtendedVideo extends Video {
  category?: string;  // mainCategory의 별칭
}

// ===== AI 분석 결과 =====
export interface AIAnalysisResult {
  category: string;
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence: number;
  processingTime: number;
}

// ===== Collection Batch =====
export interface CollectionBatch {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  collectedAt: string;
  videoCount: number;
  channels: string[];
}