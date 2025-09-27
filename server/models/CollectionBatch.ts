import mongoose, { Schema, model, Model, HydratedDocument } from 'mongoose';
import { ICollectionBatch } from '../types/models';

// 🎯 인스턴스 메서드 타입 정의
interface ICollectionBatchMethods {
  start(): Promise<HydratedCollectionBatchDocument>;
  complete(results: any): Promise<HydratedCollectionBatchDocument>;
  fail(error: any, failedChannels?: any[]): Promise<HydratedCollectionBatchDocument>;
}

// 🎯 정적 메서드 타입 정의
interface CollectionBatchModelType extends Model<ICollectionBatch, {}, ICollectionBatchMethods> {
  findActive(): Promise<HydratedCollectionBatchDocument[]>;
  findRecent(limit?: number): Promise<HydratedCollectionBatchDocument[]>;
}

// 🎯 HydratedDocument 타입
type HydratedCollectionBatchDocument = HydratedDocument<ICollectionBatch, ICollectionBatchMethods>;

const collectionBatchSchema = new Schema<ICollectionBatch, CollectionBatchModelType, ICollectionBatchMethods>({
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
  quotaUsed: {
    type: Number,
    default: 0
  },
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
  errorMessage: String,
  errorDetails: String
}, {
  timestamps: true,
  collection: 'collectionbatches'
});

collectionBatchSchema.index({ status: 1 });
collectionBatchSchema.index({ createdAt: -1 });
collectionBatchSchema.index({ collectionType: 1 });

collectionBatchSchema.set('toJSON', { virtuals: true });
collectionBatchSchema.set('toObject', { virtuals: true });

collectionBatchSchema.virtual('durationMinutes').get(function(this: ICollectionBatch) {
  if (this.startedAt && this.completedAt) {
    const duration = Math.round((new Date(this.completedAt).getTime() - new Date(this.startedAt).getTime()) / (1000 * 60));
    return Math.max(duration, 1);
  }
  return 0;
});

collectionBatchSchema.virtual('successRate').get(function(this: ICollectionBatch) {
  if (this.totalVideosFound && this.totalVideosFound > 0) {
    return Math.round((this.totalVideosSaved / this.totalVideosFound) * 100);
  }
  return this.totalVideosSaved > 0 ? 100 : 0;
});

collectionBatchSchema.methods.start = function() {
  this.status = 'running';
  this.startedAt = new Date();
  return this.save();
};

collectionBatchSchema.methods.complete = function(results: any) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.totalVideosFound = results.totalVideosFound || 0;
  this.totalVideosSaved = results.totalVideosSaved || 0;
  this.quotaUsed = results.quotaUsed || 0;
  
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

collectionBatchSchema.methods.fail = function(error: any, failedChannels: any[] = []) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = error.message || error;
  this.errorDetails = error.stack;
  this.failedChannels = failedChannels;
  return this.save();
};

collectionBatchSchema.statics.findActive = function() {
  return this.find({ status: { $in: ['pending', 'running'] } });
};

collectionBatchSchema.statics.findRecent = function(limit: number = 10) {
  return this.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('targetGroups', 'name');
};

const CollectionBatch = model<ICollectionBatch, CollectionBatchModelType>('CollectionBatch', collectionBatchSchema);

export default CollectionBatch;
