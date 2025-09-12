const mongoose = require('mongoose');

/**
 * 📊 TrendingVideo 모델 - 트렌딩 수집 영상
 * 그룹별 트렌딩 수집으로 얻은 영상들을 개별 분석 영상과 분리 저장
 */
const trendingVideoSchema = new mongoose.Schema({
  // 기본 비디오 정보
  videoId: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK']
  },
  
  // 채널 정보
  channelName: {
    type: String,
    required: true,
    trim: true
  },
  channelId: {
    type: String,
    required: true,
    trim: true
  },
  channelUrl: {
    type: String,
    trim: true
  },
  
  // 수집 정보
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelGroup',
    required: false  // 개별 채널 수집 시에는 null 가능
  },
  groupName: {
    type: String,
    required: false,  // 개별 채널 수집 시에는 기본값 사용
    default: '개별 채널 수집'
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionBatch',
    required: false  // 기존 데이터 호환성을 위해
  },
  collectionDate: {
    type: Date,
    default: Date.now
  },
  collectedFrom: {
    type: String,
    default: 'trending',
    enum: ['trending', 'individual']
  },
  
  // 비디오 통계
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  
  // 비디오 메타데이터
  uploadDate: {
    type: Date
  },
  duration: {
    type: String,
    enum: ['SHORT', 'MID', 'LONG']
  },
  durationSeconds: {
    type: Number
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // 키워드 및 태그
  keywords: [{
    type: String,
    trim: true
  }],
  hashtags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  collection: 'trendingvideos'
});

// 복합 인덱스
trendingVideoSchema.index({ groupId: 1, collectionDate: -1 });
trendingVideoSchema.index({ batchId: 1, collectionDate: -1 });
trendingVideoSchema.index({ platform: 1, views: -1 });
trendingVideoSchema.index({ duration: 1, views: -1 });
trendingVideoSchema.index({ videoId: 1, batchId: 1 }, { unique: true }); // 배치별 중복 방지
trendingVideoSchema.index({ channelId: 1, collectionDate: -1 });

// 정적 메서드
trendingVideoSchema.statics.findByGroup = function(groupId, limit = 20) {
  return this.find({ groupId })
    .sort({ collectionDate: -1, views: -1 })
    .limit(limit)
    .populate('groupId', 'name color');
};

trendingVideoSchema.statics.findByDuration = function(duration, limit = 20) {
  return this.find({ duration })
    .sort({ views: -1 })
    .limit(limit);
};

trendingVideoSchema.statics.getTodayCollection = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    collectionDate: { $gte: today }
  }).sort({ collectionDate: -1 });
};

trendingVideoSchema.statics.getGroupStats = function(groupId) {
  return this.aggregate([
    { $match: { groupId: mongoose.Types.ObjectId(groupId) } },
    {
      $group: {
        _id: '$duration',
        count: { $sum: 1 },
        totalViews: { $sum: '$views' },
        avgViews: { $avg: '$views' }
      }
    }
  ]);
};

const TrendingVideo = mongoose.model('TrendingVideo', trendingVideoSchema);

module.exports = TrendingVideo;