const mongoose = require('mongoose');
const { createVideoSchema } = require('../types/video-types');

/**
 * 🚀 Video 모델 (새 인터페이스 기반)
 * video-types.js의 인터페이스 조합을 사용하여 스키마 생성
 * 
 * 구성:
 * - VideoCore: 기본 비디오 정보
 * - ChannelInfo: 채널 정보 (최소한)
 * - AIAnalysis: AI 분석 결과
 * - YouTubeSpecific: YouTube 전용 필드
 * - SystemMetadata: 시스템 메타데이터
 */

const videoSchema = new mongoose.Schema(createVideoSchema(), {
  timestamps: true,
  collection: 'videos',
  toJSON: {
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 복합 인덱스 생성 (개별 인덱스는 video-types.js에서 정의됨)
videoSchema.index({ platform: 1, uploadDate: -1 });    // 플랫폼별 최신순
videoSchema.index({ platform: 1, likes: -1 });         // 플랫폼별 인기순  
videoSchema.index({ channelName: 1, uploadDate: -1 }); // 채널별 최신순
// mainCategory는 video-types.js에서 이미 인덱스 설정됨

// 정적 메서드
videoSchema.statics.findByPlatform = function(platform, sortBy = 'uploadDate', order = 'desc', limit = 15) {
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;
  
  return this.find({ platform: platform })
             .sort(sortObj)
             .limit(limit);
};

videoSchema.statics.getRecentVideos = function(limit = 15, sortBy = 'uploadDate', order = 'desc') {
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;
  
  return this.find({})
             .sort(sortObj)
             .limit(limit);
};

// 인스턴스 메서드
videoSchema.methods.updateStats = function(likes, views, shares, commentsCount) {
  this.likes = likes || this.likes;
  this.views = views || this.views;
  this.shares = shares || this.shares;
  this.commentsCount = commentsCount || this.commentsCount;
  
  return this.save();
};

videoSchema.methods.getDisplayData = function() {
  return {
    rowNumber: this.rowNumber,
    uploadDate: this.uploadDate,
    platform: this.platform,
    channelName: this.channelName,
    title: this.title,
    url: this.url,
    thumbnailUrl: this.thumbnailUrl,
    likes: this.likes,
    views: this.views,
    mainCategory: this.mainCategory
  };
};

videoSchema.methods.getChannelInfo = function() {
  return {
    channelName: this.channelName,
    channelUrl: this.channelUrl,
    subscribers: this.subscribers,
    channelVideos: this.channelVideos
  };
};

videoSchema.methods.getAnalysisResult = function() {
  return {
    mainCategory: this.mainCategory,
    middleCategory: this.middleCategory,
    fullCategoryPath: this.fullCategoryPath,
    categoryDepth: this.categoryDepth,
    confidence: this.confidence,
    analysisStatus: this.analysisStatus,
    keywords: this.keywords,
    hashtags: this.hashtags
  };
};

// VideoUrl 데이터와 동기화하여 Video 레코드 생성/업데이트
videoSchema.statics.createOrUpdateFromVideoUrl = async function(videoUrlData, metadata = {}) {
  const { originalUrl, platform, originalPublishDate, processedAt } = videoUrlData;
  
  // Instagram URL에서 사용자명 추출 함수
  const extractInstagramUsername = (url) => {
    if (!url || !url.includes('instagram.com/')) return null;
    
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1] && !['reels', 'reel', 'p', 'stories'].includes(match[1])) {
      return match[1];
    }
    return null;
  };

  // 플랫폼별 채널명 처리
  let channelName = metadata.channelName || metadata.youtubeHandle || metadata.account;
  
  if (platform === 'instagram' && !channelName) {
    const extractedUsername = extractInstagramUsername(originalUrl);
    channelName = extractedUsername || 'Instagram 사용자';
  }

  // 비디오 데이터 구조
  const videoData = {
    platform: platform,
    channelName: channelName || '알 수 없는 채널',
    url: originalUrl,
    uploadDate: originalPublishDate || new Date(),
    
    // AI 분석 필드
    mainCategory: metadata.mainCategory || metadata.category || '미분류',
    middleCategory: metadata.middleCategory || '',
    fullCategoryPath: metadata.fullCategoryPath || '',
    categoryDepth: metadata.categoryDepth || 0,
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords : (metadata.keywords ? [metadata.keywords] : []),
    hashtags: Array.isArray(metadata.hashtags) ? metadata.hashtags : (metadata.hashtags ? [metadata.hashtags] : []),
    mentions: Array.isArray(metadata.mentions) ? metadata.mentions : (metadata.mentions ? [metadata.mentions] : []),
    description: metadata.description || '',
    analysisContent: metadata.analysisContent || metadata.ai_description || '',
    
    // 성과 지표
    likes: metadata.likes || 0,
    commentsCount: metadata.commentsCount || metadata.comments_count || metadata.comments || 0,
    views: metadata.views || 0,
    
    // URL 및 메타데이터
    thumbnailUrl: metadata.thumbnailUrl || metadata.thumbnailPath || '',
    channelUrl: metadata.channelUrl || '',
    confidence: metadata.confidence || '',
    analysisStatus: metadata.analysisStatus || 'completed',
    collectionTime: new Date(),
    
    // YouTube 전용 필드
    youtubeHandle: metadata.youtubeHandle || '',
    comments: metadata.commentText || '',
    duration: metadata.duration || '',
    subscribers: metadata.subscribers || 0,
    channelVideos: metadata.channelVideos || 0,
    monetized: metadata.monetized || '',
    youtubeCategory: metadata.youtubeCategory || '',
    license: metadata.license || '',
    quality: metadata.quality || '',
    language: metadata.language || '',
    categoryMatchRate: metadata.categoryMatchRate || '',
    matchType: metadata.matchType || '',
    matchReason: metadata.matchReason || '',
    
    // 레거시 호환성 필드
    title: metadata.title || originalUrl.split('/').pop() || '미분류',
    shares: metadata.shares || 0,
    timestamp: originalPublishDate || new Date(),
    processedAt: processedAt || new Date(),
    topComments: metadata.topComments || ''
  };
  
  return this.findOneAndUpdate(
    { url: originalUrl, platform: platform },
    { $set: videoData },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Video', videoSchema);