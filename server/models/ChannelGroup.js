const mongoose = require('mongoose');

/**
 * 🎯 ChannelGroup 모델 - 채널 그룹 관리
 * 채널들을 의미있는 그룹으로 묶어서 관리
 */
const channelGroupSchema = new mongoose.Schema({
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
    type: String,
    trim: true
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

// 인덱스 설정
channelGroupSchema.index({ name: 1 });
channelGroupSchema.index({ isActive: 1 });
channelGroupSchema.index({ keywords: 1 });

// 정적 메서드
channelGroupSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ updatedAt: -1 });
};

channelGroupSchema.statics.findByKeyword = function(keyword) {
  return this.find({ 
    keywords: { $in: [keyword] },
    isActive: true 
  });
};

// 인스턴스 메서드
channelGroupSchema.methods.addChannel = function(channelId) {
  if (!this.channels.includes(channelId)) {
    this.channels.push(channelId);
  }
  return this.save();
};

channelGroupSchema.methods.removeChannel = function(channelId) {
  this.channels = this.channels.filter(id => id !== channelId);
  return this.save();
};

channelGroupSchema.methods.updateLastCollected = function() {
  this.lastCollectedAt = new Date();
  return this.save();
};

const ChannelGroup = mongoose.model('ChannelGroup', channelGroupSchema);

module.exports = ChannelGroup;