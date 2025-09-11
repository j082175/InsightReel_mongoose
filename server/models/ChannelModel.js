const mongoose = require('mongoose');
const { createChannelSchema } = require('../types/channel-types');

/**
 * 🚀 Channel 모델 (새 인터페이스 기반)
 * channel-types.js의 인터페이스 조합을 사용하여 스키마 생성
 * 
 * 구성:
 * - ChannelCore: 기본 채널 정보
 * - ChannelAIAnalysis: AI 분석 결과
 * - ChannelClusterInfo: 클러스터링 정보
 * - ChannelStats: 성과 통계
 * - ChannelMetadata: 시스템 메타데이터
 */

const channelSchema = new mongoose.Schema(createChannelSchema(), {
  timestamps: true,
  collection: 'channels',
  toJSON: {
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 복합 인덱스 생성
channelSchema.index({ platform: 1, subscribers: -1 });           // 플랫폼별 구독자순
channelSchema.index({ 'categoryInfo.majorCategory': 1 });        // 대카테고리별
channelSchema.index({ totalViews: -1 });                         // 총 조회수순
channelSchema.index({ lastAnalyzedAt: -1 });                     // 최근 분석순

// 정적 메서드
channelSchema.statics.findByPlatform = function(platform, sortBy = 'subscribers', limit = 20) {
  const sortObj = {};
  sortObj[sortBy] = -1;
  
  return this.find({ platform: platform.toLowerCase() })
    .sort(sortObj)
    .limit(limit);
};

channelSchema.statics.findByCategory = function(category, limit = 20) {
  return this.find({ 'categoryInfo.majorCategory': category })
    .sort({ subscribers: -1 })
    .limit(limit);
};

channelSchema.statics.getTopPerforming = function(platform, limit = 20) {
  return this.find({ platform: platform.toLowerCase() })
    .sort({ totalViews: -1, subscribers: -1 })
    .limit(limit);
};

channelSchema.statics.findSimilar = function(channelId, limit = 10) {
  return this.findById(channelId)
    .then(channel => {
      if (!channel) return [];
      
      return this.find({
        _id: { $ne: channelId },
        'categoryInfo.majorCategory': channel.categoryInfo?.majorCategory,
        platform: channel.platform
      })
      .sort({ subscribers: -1 })
      .limit(limit);
    });
};

// 인스턴스 메서드
channelSchema.methods.getBasicInfo = function() {
  return {
    id: this.id,
    name: this.name,
    url: this.url,
    platform: this.platform,
    subscribers: this.subscribers,
    totalVideos: this.totalVideos
  };
};

channelSchema.methods.getAnalysisResult = function() {
  return {
    categoryInfo: this.categoryInfo,
    keywords: this.keywords,
    aiTags: this.aiTags,
    consistencyLevel: this.categoryInfo?.consistencyLevel,
    lastAnalyzedAt: this.lastAnalyzedAt
  };
};

channelSchema.methods.getPerformanceStats = function() {
  return {
    totalViews: this.totalViews,
    totalVideos: this.totalVideos,
    averageViewsPerVideo: this.averageViewsPerVideo,
    last7DaysViews: this.last7DaysViews,
    uploadFrequency: this.uploadFrequency,
    mostViewedVideo: this.mostViewedVideo
  };
};

// Video 모델과의 동기화를 위한 메서드
channelSchema.methods.getVideoChannelInfo = function() {
  return {
    channelName: this.name,
    channelUrl: this.url,
    subscribers: this.subscribers,
    channelVideos: this.totalVideos
  };
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;