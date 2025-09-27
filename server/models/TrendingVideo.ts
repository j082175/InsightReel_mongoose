import mongoose, { Schema, model, Model } from 'mongoose';
import { ITrendingVideo } from '../types/models';

// 🎯 정적 메서드 타입 정의
interface TrendingVideoModelType extends Model<ITrendingVideo> {
  findByGroup(groupId: string, limit?: number): Promise<ITrendingVideo[]>;
  findByDuration(duration: 'SHORT' | 'MID' | 'LONG', limit?: number): Promise<ITrendingVideo[]>;
  getTodayCollection(): Promise<ITrendingVideo[]>;
  getGroupStats(groupId: string): Promise<any[]>;
}

const trendingVideoSchema = new Schema<ITrendingVideo, TrendingVideoModelType>({
  videoId: {
    type: String,
    required: true,
    trim: true,
    index: true
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
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelGroup',
    required: false
  },
  groupName: {
    type: String,
    required: false,
    default: '개별 채널 수집'
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionBatch',
    required: false
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

trendingVideoSchema.index({ groupId: 1, collectionDate: -1 });
trendingVideoSchema.index({ batchId: 1, collectionDate: -1 });
trendingVideoSchema.index({ platform: 1, views: -1 });
trendingVideoSchema.index({ duration: 1, views: -1 });
trendingVideoSchema.index({ channelId: 1, collectionDate: -1 });
trendingVideoSchema.index({ videoId: 1 }, { unique: true });

trendingVideoSchema.statics.findByGroup = function(groupId: string, limit: number = 20) {
  return this.find({ groupId })
    .sort({ collectionDate: -1, views: -1 })
    .limit(limit)
    .populate('groupId', 'name color');
};

trendingVideoSchema.statics.findByDuration = function(duration: 'SHORT' | 'MID' | 'LONG', limit: number = 20) {
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

trendingVideoSchema.statics.getGroupStats = function(groupId: string) {
  return this.aggregate([
    { $match: { groupId: new mongoose.Types.ObjectId(groupId) } },
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

const TrendingVideo = model<ITrendingVideo, TrendingVideoModelType>('TrendingVideo', trendingVideoSchema);

export default TrendingVideo;
