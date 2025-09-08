// API Response Types (기존 API 구조 호환)
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// Platform Types
export type Platform = 'YouTube' | 'TikTok' | 'Instagram' | 'youtube' | 'instagram' | 'tiktok';

// Video Types (기존 API + InsightReel 데이터 통합)
export interface Video {
  _id?: string;
  id: number;
  url?: string;
  title: string;
  platform: Platform;
  thumbnail?: string;
  thumbnailUrl: string;
  category?: string;
  keywords: string[];
  createdAt: string;
  updatedAt?: string;
  channelId?: string;
  channelName: string;
  channelAvatarUrl: string;
  channelAvatar?: string;
  viewCount?: number;
  views: number;
  duration?: string;
  description?: string;
  daysAgo: number;
  isTrending: boolean;
  embedUrl?: string;
  originalUrl: string;
  aspectRatio: '16:9' | '9:16';
  analysisResult?: AIAnalysisResult;
  // 수집 배치 정보
  batchIds?: string[];
  collectedAt?: string;
  isCollected?: boolean;
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
}

// Hook Return Types
export interface UseVideosResult {
  data: Video[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}