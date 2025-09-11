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
    enum: ['INSTAGRAM', 'YOUTUBE', 'TIKTOK'],
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
  shares: numberFieldOptions,
  videoUrl: commonFieldOptions,
  topComments: commonFieldOptions
};

// ===== 채널 정보 (하이브리드 방식 - 최소 정보만) =====
const ChannelInfo = {
  channelName: { ...commonFieldOptions, index: true },  // 검색/표시용
  channelUrl: commonFieldOptions,                       // 표시용
  subscribers: numberFieldOptions,                      // 표시용 (스냅샷)
  channelVideos: numberFieldOptions                     // 표시용 (스냅샷)
  // 참고: 전문 채널 분석은 별도 Channel 모델 사용
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

// ===== YouTube 전용 필드 =====
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
  timestamp: dateFieldOptions,
  processedAt: { type: String, required: false, default: () => new Date().toISOString() },
  sheetsRowData: { type: Object, required: false } // Google Sheets 원본 데이터
};

// ===== 전체 Video 스키마 조합 =====
const createVideoSchema = () => {
  return {
    ...VideoCore,
    ...ChannelInfo,
    ...AIAnalysis,
    ...YouTubeSpecific,
    ...SystemMetadata
  };
};

module.exports = {
  VideoCore,
  ChannelInfo,
  AIAnalysis,
  YouTubeSpecific,
  SystemMetadata,
  createVideoSchema
};