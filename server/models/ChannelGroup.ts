import { Schema, model, Model, HydratedDocument } from 'mongoose';
import { IChannelGroup } from '../types/models';

// 🎯 인스턴스 메서드 타입 정의
interface IChannelGroupMethods {
  addChannel(channelId: string, channelName: string): Promise<HydratedChannelGroupDocument>;
  removeChannel(channelId: string): Promise<HydratedChannelGroupDocument>;
  updateLastCollected(): Promise<HydratedChannelGroupDocument>;
}

// 🎯 정적 메서드 타입 정의
interface ChannelGroupModelType extends Model<IChannelGroup, {}, IChannelGroupMethods> {
  findActive(): Promise<HydratedChannelGroupDocument[]>;
  findByKeyword(keyword: string): Promise<HydratedChannelGroupDocument[]>;
}

// 🎯 HydratedDocument 타입
type HydratedChannelGroupDocument = HydratedDocument<IChannelGroup, IChannelGroupMethods>;

const channelGroupSchema = new Schema<IChannelGroup, ChannelGroupModelType, IChannelGroupMethods>({
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
  color: {
    type: String,
    default: '#3B82F6',
    match: /^#[0-9A-F]{6}$/i
  },
  channels: [{
    channelId: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  keywords: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastCollectedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'channelgroups'
});

channelGroupSchema.index({ name: 1 });
channelGroupSchema.index({ isActive: 1 });
channelGroupSchema.index({ keywords: 1 });

channelGroupSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ updatedAt: -1 });
};

channelGroupSchema.statics.findByKeyword = function(keyword: string) {
  return this.find({ 
    keywords: { $in: [keyword] },
    isActive: true 
  });
};

channelGroupSchema.methods.addChannel = function(channelId: string, channelName: string) {
  if (!this.channels.find(channel => channel.channelId === channelId)) {
    this.channels.push({ channelId: channelId, name: channelName });
  }
  return this.save();
};

channelGroupSchema.methods.removeChannel = function(channelId: string) {
  this.channels = this.channels.filter(channel => channel.channelId !== channelId);
  return this.save();
};

channelGroupSchema.methods.updateLastCollected = function() {
  this.lastCollectedAt = new Date();
  return this.save();
};

const ChannelGroup = model<IChannelGroup, ChannelGroupModelType>('ChannelGroup', channelGroupSchema);

export default ChannelGroup;
