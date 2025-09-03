const mongoose = require('mongoose');

// 📊 비디오 스키마 정의 (Google Sheets 구조 기반)
const videoSchema = new mongoose.Schema({
  // 기본 식별 정보
  platform: {
    type: String,
    required: true,
    enum: ['instagram', 'youtube', 'tiktok'],
    index: true  // 플랫폼별 조회 최적화
  },
  
  // 시간 정보 (정렬의 핵심)
  timestamp: {
    type: Date,
    required: true,
    index: true  // 날짜순 정렬 최적화
  },
  
  // 계정/채널 정보
  account: {
    type: String,
    required: true,
    index: true  // 계정별 검색 최적화
  },
  
  // 영상 메타데이터
  title: {
    type: String,
    required: true,
    text: true  // 텍스트 검색 최적화
  },
  
  // URL 정보
  comments: String,  // 영상 URL
  videoUrl: String,  // 다운로드된 영상 경로
  thumbnailUrl: String,  // 썸네일 경로
  
  // 성과 지표 (정렬 기준)
  likes: {
    type: Number,
    default: 0,
    index: true  // 좋아요순 정렬 최적화
  },
  
  views: {
    type: Number,
    default: 0,
    index: true  // 조회수순 정렬 최적화
  },
  
  shares: {
    type: Number,
    default: 0
  },
  
  comments_count: {
    type: Number,
    default: 0
  },
  
  // AI 분석 결과
  category: String,
  ai_description: String,
  keywords: [String],  // 키워드 배열
  
  // 추가 메타데이터
  duration: String,
  hashtags: [String],
  mentions: [String],
  
  // 시스템 정보
  created_at: {
    type: Date,
    default: Date.now
  },
  
  updated_at: {
    type: Date,
    default: Date.now
  },
  
  // Google Sheets 원본 데이터 (마이그레이션용)
  sheets_row_data: mongoose.Schema.Types.Mixed
}, {
  // 스키마 옵션
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'videos'
});

// 🚀 복합 인덱스 생성 (성능 최적화)
videoSchema.index({ platform: 1, timestamp: -1 });  // 플랫폼별 최신순
videoSchema.index({ platform: 1, likes: -1 });      // 플랫폼별 인기순
videoSchema.index({ platform: 1, views: -1 });      // 플랫폼별 조회수순
videoSchema.index({ account: 1, timestamp: -1 });   // 계정별 최신순

// 📊 정적 메서드 추가 (자주 사용하는 쿼리)
videoSchema.statics.findByPlatform = function(platform, sortBy = 'timestamp', order = 'desc', limit = 15) {
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;
  
  return this.find({ platform })
             .sort(sortObj)
             .limit(limit);
};

videoSchema.statics.getRecentVideos = function(limit = 15, sortBy = 'timestamp', order = 'desc') {
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;
  
  return this.find({})
             .sort(sortObj)
             .limit(limit);
};

// 📈 인스턴스 메서드 추가
videoSchema.methods.updateStats = function(likes, views, shares, comments) {
  this.likes = likes || this.likes;
  this.views = views || this.views;
  this.shares = shares || this.shares;
  this.comments_count = comments || this.comments_count;
  this.updated_at = new Date();
  return this.save();
};

module.exports = mongoose.model('Video', videoSchema);