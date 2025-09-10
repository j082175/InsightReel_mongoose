// API Response Types (기존 API 구조 호환)
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// Platform Types
export type Platform = 'YouTube' | 'TikTok' | 'Instagram' | 'youtube' | 'instagram' | 'tiktok';

// Video Types (VideoOptimized.js 표준 기준 통합) ⭐ 표준화 완료
export interface Video {
  // MongoDB 기본 필드
  _id?: string;
  rowNumber?: number;
  
  // ===== 플랫폼별 공통 필드 (VideoOptimized 표준) =====
  uploadDate: string;           // 업로드날짜 ⭐ 표준화
  platform: Platform;          // 플랫폼
  channelName: string;         // 채널이름 ⭐ 표준화
  channelUrl?: string;         // 채널URL
  
  // AI 카테고리 분석
  mainCategory: string;        // 대카테고리 ⭐ 표준화
  middleCategory?: string;     // 중카테고리
  fullCategoryPath?: string;   // 전체카테고리경로
  categoryDepth?: number;      // 카테고리깊이
  
  // 콘텐츠 분석
  keywords: string[];          // 키워드 배열
  hashtags?: string;           // 해시태그 (문자열)
  mentions?: string;           // 멘션 (문자열)
  description?: string;        // 설명/캡션
  analysisContent?: string;    // AI 분석내용
  
  // 성과 지표 (표준화)
  likes: number;               // 좋아요수
  commentsCount: number;       // 댓글수 ⭐ 표준화 (camelCase)
  views?: number;              // 조회수 (YouTube 전용)
  
  // URL 정보 (표준화)
  url: string;                 // 원본 URL ⭐ 표준화 (originalUrl → url)
  thumbnailUrl: string;        // 썸네일URL
  
  // 메타 정보
  confidence?: string;         // AI 신뢰도
  analysisStatus?: string;     // 분석상태
  collectionTime?: string;     // 수집시간
  
  // ===== YouTube 전용 필드 =====
  youtubeHandle?: string;      // YouTube핸들명
  comments?: string;           // 댓글 내용
  duration?: string;           // 영상길이
  subscribers?: number;        // 구독자수
  channelVideos?: number;      // 채널동영상수
  monetized?: string;          // 수익화여부
  youtubeCategory?: string;    // YouTube카테고리
  license?: string;            // 라이센스
  quality?: string;            // 화질
  language?: string;           // 언어
  categoryMatchRate?: string;  // 카테고리일치율
  matchType?: string;          // 일치유형
  matchReason?: string;        // 일치사유
  
  // ===== 레거시 호환성 필드 =====
  id?: number;                 // 레거시 ID (마이그레이션용)
  title?: string;              // 영상 제목 (레거시)
  category?: string;           // 구 카테고리 (mainCategory로 매핑)
  channelId?: string;          // 레거시 채널 ID
  channelAvatarUrl?: string;   // 레거시 아바타 URL
  createdAt?: string;          // 레거시 생성일
  updatedAt?: string;          // 레거시 업데이트일
  
  // ===== UI 전용 필드 =====
  thumbnail?: string;          // UI용 썸네일 (thumbnailUrl과 동일)
  channelAvatar?: string;      // UI용 아바타
  viewCount?: number;          // UI용 조회수 (views와 동일)
  daysAgo?: number;            // UI용 경과일
  isTrending?: boolean;        // UI용 트렌딩 상태
  embedUrl?: string;           // UI용 임베드 URL
  aspectRatio?: '16:9' | '9:16'; // UI용 화면비
  
  // 수집 배치 정보
  batchIds?: string[];
  collectedAt?: string;
  isCollected?: boolean;
  
  // AI 분석 결과 (레거시 호환)
  analysisResult?: AIAnalysisResult;
  
  // 아카이브 전용 필드
  archivedAt?: string;             // 아카이브 저장 시간
  tags?: string[];                 // 아카이브 태그 배열
  notes?: string;                  // 사용자 메모
}

// Extended Video Type for Archive Page
export interface ExtendedVideo extends Video {
  archivedAt?: string;
  tags?: string[];
  category?: string;
}

export interface CollectionBatch {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  collectedAt: string;
  videoCount: number;
  channels: string[];
}

export interface AIAnalysisResult {
  category: string;
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence: number;
  processingTime: number;
}

// Channel Types
export interface Channel {
  id: number;
  name: string;
  platform: Platform;
  videoCount: number;
  subscriberCount: number;
  category: string;
  description: string;
  avatarUrl: string;
  keywords: string[];
  channelUrl: string;
  avgUploadsPerDay: number;
  viewsLast7Days: number;
  avgVideoDuration: number;
  shortFormRatio: number;
  dailyViewsLast7Days: number[];
  dailyViewsLast30d: number[];
  dailyViewsLast3m: number[];
  dailyViewsLast1y: number[];
}

// UI Component Types
export interface FilterState {
  days: string;
  views: string;
  platform: string;
}

export interface VideoFilters {
  search: string;
  platform: string;
  category: string;
  dateRange: string;
}

// Chart Data Types
export interface ChartData {
  data: number[];
  label: string;
}

// API Client Types
export interface TrendingStats {
  count: number;
  lastUpdate: string;
}

export interface QuotaStatus {
  used: number;
  daily: number;
  limit?: number;
  quota?: {
    used: number;
    keyCount: number;
    allKeys: Array<{
      exceeded: boolean;
      [key: string]: any;
    }>;
  };
  safetyMargin?: number;
}

// API Types
export interface TrendingCollectionResult {
  videosCollected: number;
  channelsProcessed: number;
  success: boolean;
  message: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  quotaUsed: number;
  quotaLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyCreateResult {
  success: boolean;
  apiKey: ApiKey;
  message: string;
}

export interface ApiKeyDeleteResult {
  success: boolean;
  message: string;
}

// Hook Return Types
export interface UseVideosResult {
  data: Video[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}