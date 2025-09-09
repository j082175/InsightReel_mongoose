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
  
  // 원본 게시일 (실제 영상이 게시된 날짜)
  originalPublishDate: {
    type: Date,
    required: false,
    index: true  // 원본 게시일순 정렬 최적화
  },
  
  // 처리 완료 시간
  processedAt: {
    type: Date,
    required: false
  },
  
  // 계정/채널 정보
  account: {
    type: String,
    required: false, // 🆕 required를 false로 변경
    index: true  // 계정별 검색 최적화
  },
  
  // YouTube 전용 필드
  youtubeHandle: {
    type: String,
    required: false,
    index: true  // 핸들명 기반 검색 최적화
  },
  
  channelUrl: {
    type: String,
    required: false
  },
  
  // 영상 메타데이터
  title: {
    type: String,
    required: true,
    text: true  // 텍스트 검색 최적화
  },
  
  // URL 정보
  originalUrl: String,  // 원본 영상 URL
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
  description: String,  // YouTube 설명 또는 Instagram 캡션
  topComments: String,  // 상위 댓글들
  
  // 수집 정보
  collectedAt: {
    type: Date,
    default: Date.now
  },
  
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

// 🆕 정적 메서드: VideoUrl 데이터와 동기화하여 Video 레코드 생성/업데이트
videoSchema.statics.createOrUpdateFromVideoUrl = async function(videoUrlData, metadata = {}) {
  const { originalUrl, platform, originalPublishDate, processedAt } = videoUrlData;
  
  // Instagram URL에서 사용자명 추출 함수
  const extractInstagramUsername = (url) => {
    if (!url || !url.includes('instagram.com/')) return null;
    
    // 패턴: https://instagram.com/username/ 또는 https://instagram.com/username/reel/xyz/
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1] && !['reels', 'reel', 'p', 'stories'].includes(match[1])) {
      return match[1];
    }
    return null;
  };

  // 플랫폼별 채널명 처리
  let channelName = metadata.channelName || metadata.youtubeHandle || metadata.account;
  
  // Instagram의 경우 URL에서 사용자명 추출 시도
  if (platform === 'instagram' && !channelName) {
    const extractedUsername = extractInstagramUsername(originalUrl);
    channelName = extractedUsername || 'Instagram 사용자';
  }

  // 채널명을 account 필드로 사용 (URL이 아닌 실제 채널명)
  const videoData = {
    platform: platform,
    account: channelName || '알 수 없는 채널',
    title: metadata.title || originalUrl.split('/').pop() || '미분류',
    originalUrl: originalUrl, // 원본 영상 URL 저장
    timestamp: originalPublishDate || new Date(), // 원본 게시일을 timestamp로 사용
    originalPublishDate: originalPublishDate,
    processedAt: processedAt || new Date(),
    category: metadata.category || '미분류',
    ai_description: metadata.description || '',
    keywords: metadata.keywords || [],
    hashtags: metadata.hashtags || [],
    likes: metadata.likes || 0,
    views: metadata.views || 0,
    shares: metadata.shares || 0,
    comments_count: metadata.comments || 0,
    thumbnailUrl: metadata.thumbnailUrl || metadata.thumbnailPath || null, // 썸네일 URL 추가
    // YouTube 전용 필드 추가
    youtubeHandle: metadata.youtubeHandle || null,
    channelUrl: metadata.channelUrl || null,
    // 새로운 필드들
    description: metadata.description || null,
    hashtags: metadata.hashtags || [],
    mentions: metadata.mentions || [],
    topComments: metadata.topComments || null,
    collectedAt: new Date()
  };
  
  // upsert: 있으면 업데이트, 없으면 생성 (originalUrl 필드로 URL 기준 중복 체크)
  return this.findOneAndUpdate(
    { originalUrl: originalUrl, platform: platform },
    { $set: videoData },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Video', videoSchema);