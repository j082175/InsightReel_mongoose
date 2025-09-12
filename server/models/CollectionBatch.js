const mongoose = require('mongoose');

/**
 * 🎯 수집 배치 모델
 * 트렌딩 영상 수집 작업의 메타데이터를 관리
 */
const collectionBatchSchema = new mongoose.Schema({
  // 배치 기본 정보
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // 수집 설정
  collectionType: {
    type: String,
    enum: ['group', 'channels'],
    required: true
  },
  targetGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelGroup'
  }],
  targetChannels: [String],
  
  // 수집 조건
  criteria: {
    daysBack: {
      type: Number,
      default: 3,
      min: 1,
      max: 30
    },
    minViews: {
      type: Number,
      default: 30000,
      min: 0
    },
    maxViews: {
      type: Number,
      default: null
    },
    includeShorts: {
      type: Boolean,
      default: true
    },
    includeMidform: {
      type: Boolean,
      default: true
    },
    includeLongForm: {
      type: Boolean,
      default: true
    },
    keywords: [String],
    excludeKeywords: [String]
  },
  
  // 수집 결과
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  startedAt: Date,
  completedAt: Date,
  
  totalVideosFound: {
    type: Number,
    default: 0
  },
  totalVideosSaved: {
    type: Number,
    default: 0
  },
  failedChannels: [{
    channelName: String,
    error: String
  }],
  
  // API 사용량
  quotaUsed: {
    type: Number,
    default: 0
  },
  
  // 수집 통계
  stats: {
    byPlatform: {
      YOUTUBE: { type: Number, default: 0 },
      INSTAGRAM: { type: Number, default: 0 },
      TIKTOK: { type: Number, default: 0 }
    },
    byDuration: {
      SHORT: { type: Number, default: 0 },
      MID: { type: Number, default: 0 },
      LONG: { type: Number, default: 0 }
    },
    avgViews: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    }
  },
  
  // 에러 정보
  errorMessage: String,
  errorDetails: String

}, {
  timestamps: true,
  collection: 'collectionbatches'
});

// 인덱스
collectionBatchSchema.index({ status: 1 });
collectionBatchSchema.index({ createdAt: -1 });
collectionBatchSchema.index({ collectionType: 1 });

// 가상 필드 설정 (JSON 직렬화 시 포함)
collectionBatchSchema.set('toJSON', { virtuals: true });
collectionBatchSchema.set('toObject', { virtuals: true });

// 가상 필드 - 수집 소요 시간 (분)
collectionBatchSchema.virtual('durationMinutes').get(function() {
  if (this.startedAt && this.completedAt) {
    const duration = Math.round((new Date(this.completedAt) - new Date(this.startedAt)) / (1000 * 60));
    return Math.max(duration, 1); // 최소 1분
  }
  return 0;
});

// 가상 필드 - 성공률
collectionBatchSchema.virtual('successRate').get(function() {
  if (this.totalVideosFound && this.totalVideosFound > 0) {
    return Math.round((this.totalVideosSaved / this.totalVideosFound) * 100);
  }
  return this.totalVideosSaved > 0 ? 100 : 0; // 수집된 영상이 있으면 100%, 없으면 0%
});

// 메서드 - 배치 시작
collectionBatchSchema.methods.start = function() {
  this.status = 'running';
  this.startedAt = new Date();
  return this.save();
};

// 메서드 - 배치 완료
collectionBatchSchema.methods.complete = function(results) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.totalVideosFound = results.totalVideosFound || 0;
  this.totalVideosSaved = results.totalVideosSaved || 0;
  this.quotaUsed = results.quotaUsed || 0;
  
  // 기본 통계 생성 (stats가 없는 경우)
  if (!results.stats) {
    this.stats = {
      byPlatform: {
        YOUTUBE: this.totalVideosSaved,
        INSTAGRAM: 0,
        TIKTOK: 0
      },
      byDuration: {
        SHORT: 0,
        MID: 0,
        LONG: 0
      },
      avgViews: 0,
      totalViews: 0
    };
  } else {
    this.stats = {
      byPlatform: {
        YOUTUBE: results.stats.byPlatform?.YOUTUBE || this.totalVideosSaved,
        INSTAGRAM: results.stats.byPlatform?.INSTAGRAM || 0,
        TIKTOK: results.stats.byPlatform?.TIKTOK || 0
      },
      byDuration: {
        SHORT: results.stats.byDuration?.SHORT || 0,
        MID: results.stats.byDuration?.MID || 0,
        LONG: results.stats.byDuration?.LONG || 0
      },
      avgViews: results.stats.avgViews || 0,
      totalViews: results.stats.totalViews || 0
    };
  }
  
  return this.save();
};

// 메서드 - 배치 실패
collectionBatchSchema.methods.fail = function(error, failedChannels = []) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = error.message || error;
  this.errorDetails = error.stack;
  this.failedChannels = failedChannels;
  return this.save();
};

// 정적 메서드 - 활성 배치 조회
collectionBatchSchema.statics.findActive = function() {
  return this.find({ status: { $in: ['pending', 'running'] } });
};

// 정적 메서드 - 최근 배치 조회
collectionBatchSchema.statics.findRecent = function(limit = 10) {
  return this.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('targetGroups', 'name');
};

module.exports = mongoose.model('CollectionBatch', collectionBatchSchema);