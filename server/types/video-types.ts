/**
 * 🎯 InsightReel Video Types - 필드명 완전 통일
 *
 * 목표: 모든 플랫폼에서 동일한 필드명 사용으로 변환 오류 방지
 * - YouTube: statistics.viewCount → views
 * - Instagram: post.video_view_count → views
 * - TikTok: viewCount → views
 */

// ===== 플랫폼 정의 =====
export type Platform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';

export type ContentType = 'shortform' | 'longform' | 'mixed';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ===== 플랫폼별 원시 데이터 인터페이스 (실제 사용중) =====
export interface YouTubeRawData {
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
    description: string;
    categoryId: string;
  };
  statistics: {
    viewCount: string;      // → views로 변환
    likeCount: string;      // → likes로 변환
    commentCount: string;   // → commentsCount로 변환
  };
  contentDetails: {
    duration: string;
  };
}

export interface InstagramRawData {
  // Instaloader 구조 (실제 사용중)
  post: {
    video_view_count: number;     // → views로 변환
    likes: number;                // → likes 그대로
    comments: number;             // → commentsCount로 변환
    title?: string;
    owner_username: string;       // → channelName으로 변환
    date: string;                 // → uploadDate로 변환
    video_url?: string;
    display_url: string;          // → thumbnailUrl로 변환
    caption?: string;             // → description으로 변환
  };
}

export interface TikTokRawData {
  // TikTok API 응답 구조 (실제 사용중)
  stats: {
    viewCount: number;            // → views로 변환
    likeCount: number;            // → likes로 변환
    commentCount: number;         // → commentsCount로 변환
    shareCount: number;           // → shares로 변환
    playCount?: number;
  };
  author: {
    nickname: string;             // → channelName으로 변환
    uniqueId: string;
    followerCount?: number;       // → subscribers로 변환
  };
  desc?: string;                  // → description으로 변환
  createTime: number;             // → uploadDate로 변환
  video: {
    cover: string;                // → thumbnailUrl로 변환
    playAddr?: string;
    duration?: number;
  };
}

// ===== 표준화된 메타데이터 (변환 후) =====
export interface StandardVideoMetadata {
  // 🎯 핵심 성과 지표 (완전 통일된 필드명)
  views: number;                  // 조회수 (모든 플랫폼 통일)
  likes: number;                  // 좋아요 (모든 플랫폼 통일)
  commentsCount: number;          // 댓글수 (comments 아닌 commentsCount 통일)
  shares?: number;                // 공유수 (TikTok 전용, Instagram일부)

  // 기본 정보
  title: string;
  channelName: string;            // 채널/계정명 (모든 플랫폼 통일)
  uploadDate: string;             // ISO 문자열 또는 로케일 문자열
  thumbnailUrl: string;           // 썸네일 URL (모든 플랫폼 통일)
  description: string;

  // 플랫폼 정보
  platform: Platform;
  url: string;                    // 원본 URL

  // 채널 정보
  channelUrl?: string;
  subscribers?: number;           // 구독자/팔로워 수
  channelVideos?: number;

  // YouTube 전용 필드
  youtubeHandle?: string;
  duration?: string;
  monetized?: string;
  youtubeCategory?: string;
  license?: string;
  quality?: string;
  language?: string;
  contentType?: ContentType;

  // AI 분석 결과
  mainCategory?: string;
  middleCategory?: string;
  fullCategoryPath?: string;
  categoryDepth?: number;
  keywords?: string[];            // 배열 타입
  hashtags?: string[];            // 배열 타입
  mentions?: string[];            // 배열 타입
  analysisContent?: string;       // AI 분석 내용
  confidence?: string;
  analysisStatus?: AnalysisStatus;
  categoryMatchRate?: string;
  matchType?: string;
  matchReason?: string;

  // 시스템 메타데이터 (비즈니스 로직용)
  collectionTime?: string;        // 데이터 수집 시점 (ISO string)
  processedAt?: string;           // AI 분석 완료 시점 (ISO string)
  rowNumber?: number;             // 시트 행 번호

  // 레거시 호환성 필드 (명확한 네이밍)
  topComments?: string;           // 인기 댓글 텍스트 (주로 YouTube)
  comments?: string;              // 전체 댓글 텍스트 (YouTube 전용, deprecated 권장)
}

// ===== MongoDB Video 문서 (최종 저장 형태) =====
export interface VideoDocument extends StandardVideoMetadata {
  _id: string;                    // MongoDB ObjectId 문자열

  // Mongoose 자동 타임스탬프 (DB 관리용)
  createdAt?: Date;               // 문서 생성 시점
  updatedAt?: Date;               // 문서 최종 수정 시점
}

// ===== API 응답 타입 (Transform 적용 후) =====
export interface VideoApiResponse extends Omit<VideoDocument, '_id'> {
  id: string;                     // _id가 id로 변환됨 (toJSON transform)
}

// ===== 타입 가드 함수들 (데이터 변환시 필요) =====
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

// ===== 유틸리티 타입 =====
export type PartialVideoMetadata = Partial<StandardVideoMetadata>;

export type RequiredVideoFields = Pick<StandardVideoMetadata, 'platform' | 'url' | 'title' | 'channelName'>;

export type OptionalVideoFields = Omit<StandardVideoMetadata, keyof RequiredVideoFields>;

// ===== 에러 타입 =====
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

// ===== 검증 관련 타입 (필요시 추가) =====
// 현재 프로젝트에서는 Mongoose 스키마 검증만 사용하므로 별도 검증 타입 제거