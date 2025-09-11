const mongoose = require('mongoose');
const { createVideoSchema } = require('../types/video-interfaces');

/**
 * 🚀 새로운 Video 모델 (인터페이스 조합 방식)
 * FieldMapper 대신 명확한 인터페이스 분리로 관리
 */

const videoSchema = new mongoose.Schema(createVideoSchema(), {
  timestamps: true,
  collection: 'videos'
});

// ===== 복합 인덱스 =====
videoSchema.index({ platform: 1, uploadDate: -1 });    // 플랫폼별 최신순
videoSchema.index({ platform: 1, likes: -1 });         // 플랫폼별 인기순  
videoSchema.index({ mainCategory: 1, views: -1 });     // 카테고리별 조회수순
videoSchema.index({ channelName: 1, uploadDate: -1 }); // 채널별 최신순

// ===== 정적 메서드 =====
videoSchema.statics.findByPlatform = function(platform, sortBy = 'uploadDate', order = 'desc', limit = 15) {
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;
  
  return this.find({ platform: platform.toUpperCase() })
    .sort(sortObj)
    .limit(limit);
};

videoSchema.statics.findByChannel = function(channelName, limit = 15) {
  return this.find({ channelName })
    .sort({ uploadDate: -1 })
    .limit(limit);
};

videoSchema.statics.findByCategory = function(category, limit = 15) {
  return this.find({ mainCategory: category })
    .sort({ views: -1 })
    .limit(limit);
};

videoSchema.statics.getTopPerforming = function(platform, limit = 15) {
  return this.find({ platform: platform.toUpperCase() })
    .sort({ likes: -1, views: -1 })
    .limit(limit);
};

// ===== 인스턴스 메서드 =====
videoSchema.methods.getDisplayData = function() {
  return {
    id: this._id,
    title: this.title,
    channelName: this.channelName,
    platform: this.platform,
    views: this.views || 0,
    likes: this.likes,
    uploadDate: this.uploadDate,
    thumbnailUrl: this.thumbnailUrl,
    url: this.url
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
    analysisContent: this.analysisContent,
    confidence: this.confidence,
    matchType: this.matchType,
    matchReason: this.matchReason
  };
};

const VideoNew = mongoose.model('VideoNew', videoSchema);

module.exports = VideoNew;