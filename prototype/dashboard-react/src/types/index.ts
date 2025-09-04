// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// Video Related Types
export type Platform = 'youtube' | 'instagram' | 'tiktok';

export interface Video {
  _id: string;
  url: string;
  title: string;
  platform: Platform;
  thumbnail: string;
  category: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  channelId?: string;
  channelName?: string;
  channelAvatar?: string;
  viewCount?: number;
  duration?: string;
  description?: string;
  analysisResult?: AIAnalysisResult;
}

export interface AIAnalysisResult {
  category: string;
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence: number;
  processingTime: number;
}

// Tab System Types
export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  defaultActive?: boolean;
}

// Stat Card Types
export interface StatCardConfig {
  id: string;
  label: string;
  icon: string;
  value: string | number;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  clickable?: boolean;
  onclick?: string | (() => void);
}

// Dashboard Configuration Types
export interface DashboardConfig {
  api: {
    baseUrl: string;
    endpoints: Record<string, string>;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  tabs: TabConfig[];
  statCards: Record<string, StatCardConfig[]>;
  ui: {
    videosPerPage: number;
    cacheExpiry: number;
    lazyLoadOffset: number;
    animationDuration: number;
    searchDebounceDelay: number;
    minSearchLength: number;
    notificationDuration: number;
    defaultTheme: string;
    availableThemes: string[];
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };
  trending: {
    maxVideosPerChannel: number;
    minViewCount: number;
    maxDaysOld: number;
    collectInterval: number;
    batchSize: number;
    quotaLimits: {
      daily: number;
      warningThreshold: number;
      criticalThreshold: number;
    };
  };
}

// Component Props Types
export interface VideoCardProps {
  video: Video;
  onClick?: (video: Video) => void;
  showDetails?: boolean;
}

export interface TabManagerProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

// Hook Types
export interface UseVideosResult {
  videos: Video[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}