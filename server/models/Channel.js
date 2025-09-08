const mongoose = require('mongoose');

// 📺 채널 스키마 정의 (channels.json 구조 완전 매핑)
const channelSchema = new mongoose.Schema({
  // 기본 식별 정보
  id: {
    type: String,
    required: true,
    unique: true,
    index: true  // 채널 ID로 빠른 조회
  },
  
  name: {
    type: String,
    required: true,
    index: true  // 채널명으로 검색 가능
  },
  
  url: {
    type: String,
    required: false
  },
  
  platform: {
    type: String,
    required: true,
    enum: ['youtube', 'instagram', 'tiktok'],
    index: true  // 플랫폼별 조회
  },
  
  subscribers: {
    type: Number,
    required: false,
    index: true  // 구독자 수로 정렬
  },
  
  description: {
    type: String,
    required: false
  },
  
  thumbnailUrl: {
    type: String,
    required: false
  },
  
  customUrl: {
    type: String,
    required: false
  },
  
  contentType: {
    type: String,
    enum: ['shortform', 'longform', 'mixed'],
    required: false
  },
  
  // AI 분석 결과 (핵심 데이터)
  keywords: [{
    type: String
  }],
  
  aiTags: [{
    type: String
  }],
  
  deepInsightTags: [{
    type: String
  }],
  
  allTags: [{
    type: String
  }],
  
  // 클러스터 정보
  clusterIds: [{
    type: String
  }],
  
  suggestedClusters: [{
    type: mongoose.Schema.Types.Mixed  // 유연한 구조
  }],
  
  // 통계 정보
  dailyUploadRate: {
    type: Number,
    required: false
  },
  
  last7DaysViews: {
    type: Number,
    required: false,
    index: true  // 최근 조회수로 정렬
  },
  
  avgDurationSeconds: {
    type: Number,
    required: false
  },
  
  avgDurationFormatted: {
    type: String,
    required: false
  },
  
  shortFormRatio: {
    type: Number,
    required: false
  },
  
  // 기간별 조회수 (중첩 객체)
  viewsByPeriod: {
    last7Days: { type: Number, required: false },
    last30Days: { type: Number, required: false },
    last90Days: { type: Number, required: false },
    lastYear: { type: Number, required: false }
  },
  
  // 전체 통계
  totalVideos: {
    type: Number,
    required: false,
    index: true
  },
  
  totalViews: {
    type: Number,
    required: false,
    index: true  // 총 조회수로 정렬
  },
  
  averageViewsPerVideo: {
    type: Number,
    required: false
  },
  
  // 업로드 패턴 (중첩 객체)
  uploadFrequency: {
    pattern: { 
      type: String, 
      enum: ['daily', 'weekly', 'bi_weekly', 'multiple_per_week', 'irregular'],
      required: false 
    },
    avgDaysBetweenUploads: { type: Number, required: false },
    consistency: { type: Number, required: false }
  },
  
  // 최고 인기 영상 (중첩 객체) 
  mostViewedVideo: {
    videoId: { type: String, required: false },
    title: { type: String, required: false },
    publishedAt: { type: Date, required: false },
    thumbnailUrl: { type: String, required: false },
    viewCount: { type: Number, required: false },
    likeCount: { type: Number, required: false },
    commentCount: { type: Number, required: false },
    duration: { type: String, required: false },
    durationSeconds: { type: Number, required: false },
    tags: [{ type: String }],
    categoryId: { type: String, required: false }
  },
  
  // 분석 메타데이터
  lastAnalyzedAt: {
    type: Date,
    required: false,
    index: true  // 최근 분석일로 정렬
  },
  
  analysisVersion: {
    type: String,
    required: false
  },
  
  collectedAt: {
    type: Date,
    required: false
  },
  
  updatedAt: {
    type: Date,
    required: false
  },
  
  version: {
    type: Number,
    required: false
  }
  
}, {
  // MongoDB 자동 타임스탬프 추가
  timestamps: true,
  
  // JSON 변환 시 _id와 __v 제거
  toJSON: {
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 복합 인덱스 생성 (성능 최적화)
channelSchema.index({ platform: 1, subscribers: -1 });  // 플랫폼별 구독자 순
channelSchema.index({ platform: 1, totalViews: -1 });   // 플랫폼별 총 조회수 순
channelSchema.index({ lastAnalyzedAt: -1 });            // 최근 분석 순

// 채널 모델 생성
const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;