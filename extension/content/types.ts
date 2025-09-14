// TypeScript 인터페이스 정의
export interface VideoData {
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  url: string;
  timestamp: string;
  title?: string;
  id?: string;
  views?: number;
  thumbnailUrl?: string;
}

export interface ExtensionMessage {
  action: 'ping' | 'getStatus' | 'extractVideo';
  data?: any;
}

export interface ExtensionResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface PlatformConfig {
  SERVER_URL: string;
  NODE_ENV: string;
  GOOGLE_API_KEY: string | null;
  isDevelopment: boolean;
}

export interface MediaTracker {
  mediaData: Record<string, any>;
  mediaIdMap: Record<string, any>;
  init(): void;
  extractFromPageData(): void;
}