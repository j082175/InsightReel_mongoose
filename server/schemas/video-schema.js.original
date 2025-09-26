/**
 * 🚀 Video 인터페이스 조합 시스템
 * 기존 Video.js 스키마와 동일한 42개 필드
 */

// 공통 옵션
const commonFieldOptions = { type: String, default: '' };
const numberFieldOptions = { type: Number, default: 0 };
const dateFieldOptions = { type: String, default: () => new Date().toISOString() };

// ===== 기본 비디오 정보 =====
const VideoCore = {
  // 자동 생성 필드
  rowNumber: { ...numberFieldOptions, index: true },
  
  // 기본 메타데이터
  uploadDate: { ...commonFieldOptions, index: true },
  platform: { 
    type: String,
    required: true,
    enum: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'],
    index: true
  },
  
  // 콘텐츠 분석 필드  
  keywords: [{ type: String }], // 배열로 변경
  hashtags: [{ type: String }], // 배열로 변경
  mentions: [{ type: String }], // 배열로 변경
  description: commonFieldOptions,
  analysisContent: commonFieldOptions,
  
  // 성과 지표
  likes: { ...numberFieldOptions, index: true },
  commentsCount: numberFieldOptions,
  
  // URL 정보
  url: { ...commonFieldOptions, unique: true },
  thumbnailUrl: commonFieldOptions,
  
  // 레거시 호환성 필드
  title: commonFieldOptions,
  topComments: commonFieldOptions
};

// ===== 채널 정보 (기본 4개 필드) =====
const ChannelInfo = {
  channelName: { ...commonFieldOptions, index: true },
  channelUrl: commonFieldOptions,
  subscribers: numberFieldOptions,
  channelVideos: numberFieldOptions
};

// ===== AI 분석 결과 =====
const AIAnalysis = {
  mainCategory: { ...commonFieldOptions, index: true },
  middleCategory: commonFieldOptions,
  fullCategoryPath: commonFieldOptions,
  categoryDepth: numberFieldOptions,
  confidence: commonFieldOptions,
  analysisStatus: commonFieldOptions,
  categoryMatchRate: commonFieldOptions,
  matchType: commonFieldOptions,
  matchReason: commonFieldOptions
};

// ===== YouTube 전용 필드 (확장) =====
const YouTubeSpecific = {
  youtubeHandle: commonFieldOptions,
  comments: commonFieldOptions,
  views: { ...numberFieldOptions, index: true },
  duration: commonFieldOptions,
  contentType: {
    type: String,
    enum: ['shortform', 'longform', 'mixed'],
    default: 'longform',
    index: true
  },
  monetized: commonFieldOptions,
  youtubeCategory: commonFieldOptions,
  license: commonFieldOptions,
  quality: commonFieldOptions,
  language: commonFieldOptions
};


// ===== 시스템 메타데이터 =====
const SystemMetadata = {
  collectionTime: dateFieldOptions,
  processedAt: { type: String, required: false, default: () => new Date().toISOString() }
};

// ===== 전체 Video 스키마 조합 (기본 39개 필드) =====
const createVideoSchema = () => {
  return {
    ...VideoCore,           // 15개
    ...ChannelInfo,         // 4개 (기본)
    ...AIAnalysis,          // 9개
    ...YouTubeSpecific,     // 8개
    ...SystemMetadata       // 3개
  };
};

// ===== 기본 스키마 (기존 호환성) =====
const createBasicVideoSchema = () => {
  return {
    ...VideoCore,
    ...ChannelInfo,
    ...AIAnalysis,
    ...YouTubeSpecific,
    ...SystemMetadata
  };
};

module.exports = {
  // 기존 컴포넌트들
  VideoCore,
  ChannelInfo,
  AIAnalysis,
  YouTubeSpecific,
  SystemMetadata,
  
  // 스키마 생성 함수들
  createVideoSchema,        // 39개 필드 (기본 버전)
  createBasicVideoSchema   // 39개 필드 (기존 호환성)
};