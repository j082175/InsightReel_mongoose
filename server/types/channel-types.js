/**
 * 🚀 Channel 인터페이스 정의 (전문 채널 분석용)
 * Video 모델의 ChannelInfo와는 별도의 전문 분석 모델
 */

// 공통 옵션
const commonFieldOptions = { type: String, default: '' };
const numberFieldOptions = { type: Number, default: 0 };
const dateFieldOptions = { type: String, default: () => new Date().toISOString() };

// ===== 기본 채널 정보 =====
const ChannelCore = {
  // 기본 식별 정보
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    index: true
  },
  
  url: commonFieldOptions,
  
  platform: {
    type: String,
    required: true,
    enum: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'],
    index: true
  },
  
  subscribers: {
    type: Number,
    required: false,
    index: true
  },
  
  description: commonFieldOptions,
  thumbnailUrl: commonFieldOptions,
  customUrl: commonFieldOptions,
  
  contentType: {
    type: String,
    enum: ['shortform', 'longform', 'mixed'],
    required: false
  }
};

// ===== AI 분석 결과 =====
const ChannelAIAnalysis = {
  keywords: [{ type: String }],
  aiTags: [{ type: String }],
  deepInsightTags: [{ type: String }],
  allTags: [{ type: String }],
  
  categoryInfo: {
    majorCategory: { 
      type: String, 
      required: false
    },
    middleCategory: { 
      type: String, 
      required: false
    },
    subCategory: { 
      type: String, 
      required: false 
    },
    fullCategoryPath: { 
      type: String, 
      required: false
    },
    categoryDepth: { 
      type: Number, 
      required: false,
      min: 1,
      max: 6
    },
    categoryConfidence: { 
      type: Number, 
      required: false,
      min: 0,
      max: 1
    },
    consistencyLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: false,
      index: true
    },
    consistencyReason: {
      type: String,
      required: false
    }
  }
};

// ===== 클러스터 정보 =====
const ChannelClusterInfo = {
  clusterIds: [{ type: String }],
  suggestedClusters: [{ type: Object }]  // 유연한 구조
};

// ===== 성과 통계 =====
const ChannelStats = {
  dailyUploadRate: numberFieldOptions,
  last7DaysViews: {
    type: Number,
    required: false,
    index: true
  },
  
  avgDurationSeconds: numberFieldOptions,
  avgDurationFormatted: commonFieldOptions,
  shortFormRatio: numberFieldOptions,
  
  // 기간별 조회수 (중첩 객체)
  viewsByPeriod: {
    last7Days: { type: Number, required: false },
    last30Days: { type: Number, required: false },
    last90Days: { type: Number, required: false },
    lastYear: { type: Number, required: false }
  },
  
  totalVideos: {
    type: Number,
    required: false,
    index: true
  },
  
  totalViews: {
    type: Number,
    required: false,
    index: true
  },
  
  averageViewsPerVideo: numberFieldOptions,
  
  uploadFrequency: {
    pattern: { 
      type: String, 
      enum: ['daily', 'weekly', 'bi_weekly', 'multiple_per_week', 'irregular'],
      required: false 
    },
    avgDaysBetweenUploads: numberFieldOptions,
    consistency: numberFieldOptions
  },
  
  mostViewedVideo: {
    videoId: commonFieldOptions,
    title: commonFieldOptions,
    publishedAt: { type: Date, required: false },
    thumbnailUrl: commonFieldOptions,
    viewCount: numberFieldOptions,
    likeCount: numberFieldOptions,
    commentCount: numberFieldOptions,
    duration: commonFieldOptions,
    durationSeconds: numberFieldOptions,
    tags: [{ type: String }],
    categoryId: commonFieldOptions
  }
};

// ===== 메타데이터 =====
const ChannelMetadata = {
  lastAnalyzedAt: {
    type: String,
    required: false,
    index: true,
    default: () => new Date().toISOString()
  },
  
  analysisVersion: commonFieldOptions,
  collectedAt: { type: String, required: false, default: () => new Date().toISOString() },
  createdAt: { type: String, required: false, default: () => new Date().toISOString() },
  updatedAt: { type: String, required: false, default: () => new Date().toISOString() },
  version: numberFieldOptions
};

// ===== 전체 Channel 스키마 조합 =====
const createChannelSchema = () => {
  return {
    ...ChannelCore,
    ...ChannelAIAnalysis,
    ...ChannelClusterInfo,
    ...ChannelStats,
    ...ChannelMetadata
  };
};

module.exports = {
  ChannelCore,
  ChannelAIAnalysis,
  ChannelClusterInfo,
  ChannelStats,
  ChannelMetadata,
  createChannelSchema
};