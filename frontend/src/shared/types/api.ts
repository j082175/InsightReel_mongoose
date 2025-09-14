/**
 * 🚀 API 타입 정의 (서버 응답 구조 및 API 클라이언트용)
 * server/config/api-messages.js와 연동
 */

// ===== API 응답 기본 구조 =====
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// ===== HTTP 상태 코드 (서버와 동일) =====
export const HTTP_STATUS_CODES: {
  readonly OK: 200;
  readonly CREATED: 201;
  readonly BAD_REQUEST: 400;
  readonly UNAUTHORIZED: 401;
  readonly FORBIDDEN: 403;
  readonly NOT_FOUND: 404;
  readonly INTERNAL_SERVER_ERROR: 500;
} = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// ===== 에러 코드 (서버와 동일) =====
export const ERROR_CODES: {
  readonly FILE_NOT_FOUND: 'FILE_NOT_FOUND';
  readonly INVALID_URL: 'INVALID_URL';
  readonly PROCESSING_FAILED: 'PROCESSING_FAILED';
  readonly UNAUTHORIZED: 'UNAUTHORIZED';
  readonly INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR';
} = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_URL: 'INVALID_URL',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// ===== 플랫폼 상수 (서버와 동일) =====
export const PLATFORMS: {
  readonly YOUTUBE: 'YOUTUBE';
  readonly INSTAGRAM: 'INSTAGRAM';
  readonly TIKTOK: 'TIKTOK';
} = {
  YOUTUBE: 'YOUTUBE',
  INSTAGRAM: 'INSTAGRAM',
  TIKTOK: 'TIKTOK'
};

// ===== API 클라이언트 타입들 =====
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
      id?: string;
      name?: string;
      status?: string;
      used?: number;
      limit?: number;
    }>;
  };
  safetyMargin?: number;
}

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
  keyId?: string;
  apiKey?: ApiKey;
  message: string;
  isDuplicate?: boolean;
}

export interface ApiKeyDeleteResult {
  success: boolean;
  message: string;
}

// ===== Filter Types =====
export interface VideoFilters {
  search: string;
  platform: string;
  category: string;
  dateRange: string;
}

export interface FilterState {
  keyword: string;
  platform: string;
  duration: string;
  minViews: string;
  maxViews: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: string;
}

// Legacy FilterState for backward compatibility
export interface LegacyFilterState {
  days: string;
  views: string;
  platform: string;
}

// ===== Chart Data Types =====
export interface ChartData {
  data: number[];
  label: string;
}