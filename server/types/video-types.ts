/**
 * 🎯 InsightReel Video Types - 최종 데이터 흐름 정의
 *
 * [데이터 흐름]
 * 1. RawData (플랫폼별 원시 데이터)
 * 2. StandardVideoMetadata (1차 가공된 표준 데이터)
 * 3. AIAnalysisResult (AI 분석 결과)
 * 4. FinalVideoData (2 + 3, DB 저장 직전 최종 데이터)
 */

// =================================================================
// 🌊 0. 기본 및 공통 타입
// =================================================================
export type Platform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
export type ContentType = 'shortform' | 'longform' | 'mixed';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ISODateString = string; // ISO 8601 형식 (YYYY-MM-DDTHH:mm:ss.sssZ)

// =================================================================
// 🌊 1. RawData: 플랫폼별 원시 데이터
// =================================================================
export interface YouTubeRawData {
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: { high: { url: string } };
    description: string;
    categoryId: string;
    tags?: string[];  // 해시태그 배열
    channelCustomUrl?: string;  // 채널 커스텀 URL
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string;
    definition: string;  // 'hd' | 'sd' 화질 정보
    caption: string;     // 'true' | 'false' 자막 여부
  };
  status?: {
    embeddable: boolean;  // 퍼가기 허용 여부
    madeForKids: boolean; // 키즈 콘텐츠 여부
  };
}

export interface InstagramRawData {
  post: {
    video_view_count: number;
    likes: number;
    comments: number;
    title?: string;
    owner_username: string;
    date: string;
    video_url?: string;
    display_url: string;
    caption?: string;
  };
}

export interface TikTokRawData {
  stats: {
    views: number;
    likes: number;
    commentsCount: number;
    shares: number;
    playCount?: number;
  };
  author: {
    nickname: string;
    uniqueId: string;
    followerCount?: number;
  };
  desc?: string;
  createTime: number;
  video: {
    cover: string;
    playAddr?: string;
    duration?: number;
  };
}

// =================================================================
// 🌊 2. StandardVideoMetadata: 1차 가공된 표준 데이터
// (AI 분석 전, 플랫폼간 공통 필드 위주)
// =================================================================
export interface StandardVideoMetadata {
  // 🎯 핵심 성과 지표 (Required with defaults)
  views: number;
  likes: number;
  commentsCount: number;
  shares: number; // Required: 기본값 0

  // 🎯 기본 정보 (Required)
  title: string;
  channelName: string;
  uploadDate: ISODateString;
  thumbnailUrl: string;
  description: string;

  // 🎯 플랫폼 정보 (Required)
  platform: Platform;
  url: string; // 원본 URL

  // 🎯 채널 정보 (Required with defaults)
  channelUrl: string; // Required: 기본값 ''
  subscribers: number; // Required: 기본값 0
  channelVideos: number; // Required: 기본값 0

  // 🎯 비디오 상세 (Required with defaults for consistency)
  youtubeHandle: string; // Required: 기본값 ''
  duration: string; // Required: duration은 문자열 (PT30S, 0:30)
  monetized: string; // Required: 기본값 'N'
  youtubeCategory: string; // Required: 기본값 ''
  categoryId: string; // Required: 기본값 ''
  license: string; // Required: 기본값 'YOUTUBE'
  quality: string; // Required: 기본값 'sd'
  language: string; // Required: 기본값 ''
  contentType: ContentType; // Required: 기본값 'longform'
  channelId: string; // Required: 기본값 ''

  // 🎯 소셜 메타데이터 (Required with defaults)
  hashtags: string[]; // Required: 기본값 []
  mentions: string[]; // Required: 기본값 []

  // 🎯 시스템 메타데이터 (Required with defaults)
  collectionTime: ISODateString; // Required: 자동 생성
  rowNumber: number; // Required: 자동 증가
  topComments: string; // Required: 기본값 ''
  comments: string; // Required: 기본값 '' (Deprecated 권장)
}

// =================================================================
// 🌊 3. AIAnalysisResult: AI 분석 결과 데이터
// =================================================================
export interface AIAnalysisResult {
  mainCategory: string;
  middleCategory: string;
  fullCategoryPath: string;
  categoryDepth: number;
  keywords: string[];
  hashtags: string[];
  mentions: string[];
  analysisContent: string; // AI 분석 요약
  confidence: string;
  analysisStatus: AnalysisStatus;
  processedAt: ISODateString; // AI 분석 완료 시점

  // 카테고리 비교 결과
  categoryMatchRate?: string;
  matchType?: string;
  matchReason?: string;
}

// =================================================================
// 🌊 4. FinalVideoData: DB 저장을 위한 최종 통합 데이터
// (StandardVideoMetadata + Partial<AIAnalysisResult>)
// =================================================================
export type FinalVideoData = StandardVideoMetadata & Partial<AIAnalysisResult>;


// =================================================================
// ⚙️ MongoDB & API 관련 타입들
// =================================================================
export interface VideoDocument extends FinalVideoData {
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VideoApiResponse extends Omit<VideoDocument, '_id'> {
  id: string;
}

// =================================================================
// 🛡️ 타입 가드 및 유틸리티 타입
// =================================================================
export function isYouTubeData(data: any): data is YouTubeRawData {
  return data?.snippet && data?.statistics;
}

export function isInstagramData(data: any): data is InstagramRawData {
  return data?.post;
}

export function isTikTokData(data: any): data is TikTokRawData {
  return data?.stats && data?.author;
}

export function isValidVideoDocument(data: any): data is VideoDocument {
  return typeof data === 'object' &&
         typeof data._id === 'string' &&
         typeof data.platform === 'string' &&
         ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'].includes(data.platform);
}

export type PartialVideoMetadata = Partial<StandardVideoMetadata>;
export type RequiredVideoFields = Pick<StandardVideoMetadata, 'platform' | 'url' | 'title' | 'channelName'>;
export type OptionalVideoFields = Omit<StandardVideoMetadata, keyof RequiredVideoFields>;


// =================================================================
// 📜 레거시 및 변환기 관련 타입 (하위 호환성)
// =================================================================
export interface HybridYouTubeData {
  title?: string;
  description?: string;
  duration?: number;
  uploadDate?: string;
  publishedAt?: string;
  channelName?: string;
  channelTitle?: string;
  channelId?: string;
  channelUrl?: string;
  channelCustomUrl?: string;
  youtubeHandle?: string;
  views?: number | string;
  likes?: number | string;
  commentsCount?: number | string;
  subscribers?: number | string;
  subscriberCount?: number | string;
  channelVideos?: number | string;
  channelVideoCount?: number | string;
  channelViews?: number | string;
  channelViewCount?: number | string;
  channelCountry?: string;
  channelDescription?: string;
  category?: string;
  youtubeCategoryId?: string | number;
  categoryId?: string | number;
  tags?: string[];
  keywords?: string[];
  topComments?: any;
  dataSources?: { primary?: string; [key: string]: any };
  isLiveContent?: boolean;
  isLive?: boolean;
}

export class VideoDataConversionError extends Error {
  constructor(
    public platform: Platform,
    public originalError: Error,
    message?: string
  ) {
    super(message || `${platform} 데이터 변환 실패: ${originalError.message}`);
    this.name = 'VideoDataConversionError';
  }
}

export interface LegacyFormatData {
  videoId: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  category: string;
  categoryId: string;
  duration: number;
  durationFormatted: string;
  contentType: 'shortform' | 'longform';
  isShortForm: boolean;
  tags: string[];
  views: string;
  likes: string;
  commentsCount: string;
  subscribers: string;
  channelVideos: string;
  channelViews: string;
  channelCountry: string;
  channelDescription: string;
  hashtags: string[];
  mentions: string[];
  topComments: string;
  youtubeHandle: string;
  channelUrl: string;
  extractionMethod: string;
  dataSources: { primary: string; [key: string]: any };
  youtubeCategory: string;
  license: string;
  definition: string;
  privacy: string;
  isLiveContent: boolean;
  isLive: boolean;
  error?: string;
}
