import { Schema, model, Model } from 'mongoose';
import { IVideoUrl } from '../types/models';
import { ServerLogger } from '../utils/logger';

// 🎯 모델 타입 (정적 메서드 포함)
export interface VideoUrlModelType extends Model<IVideoUrl> {
  checkDuplicate(normalizedUrl: string): Promise<any>;
  registerUrl(
    normalizedUrl: string,
    originalUrl: string,
    platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK',
    sheetLocation: any,
    originalPublishDate?: Date | null,
  ): Promise<{ success: boolean; document?: IVideoUrl; error?: string; message?: string; retried?: boolean }>;
  updateStatus(
    normalizedUrl: string,
    status: 'processing' | 'completed' | 'failed',
    sheetLocation?: any | null,
    originalPublishDate?: Date | null,
  ): Promise<{ success: boolean; error?: string }>;
  cleanupStaleProcessing(): Promise<{ success: boolean; deletedCount: number; error?: string }>;
  cleanupAllProcessing(): Promise<{ success: boolean; deletedCount: number; error?: string }>;
  getStats(): Promise<any>;
}

const videoUrlSchema = new Schema<IVideoUrl, VideoUrlModelType>({
  normalizedUrl: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['INSTAGRAM', 'YOUTUBE', 'TIKTOK'],
    index: true
  },
  videoId: {
    type: String,
    required: false,
    index: true
  },
  channelId: {
    type: String,
    required: false,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    index: true
  },
  sheetLocation: {
    sheetName: String,
    column: String,
    row: Number
  },
  originalPublishDate: {
    type: Date,
    required: false,
    index: true,
    default: null // null을 기본값으로 허용
  },
  processedAt: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'video_duplicate_check',
  versionKey: false
});

videoUrlSchema.index({ platform: 1, originalPublishDate: -1 });
videoUrlSchema.index({ platform: 1, createdAt: -1 });
videoUrlSchema.index({ status: 1, createdAt: 1 });
videoUrlSchema.index({ normalizedUrl: 1, status: 1 });
videoUrlSchema.index({ originalPublishDate: -1 });

videoUrlSchema.statics.checkDuplicate = async function(normalizedUrl: string) {
  try {
    const existing = await this.findOne({ 
      normalizedUrl,
      status: { $in: ['processing', 'completed'] }
    }).lean();
    
    if (existing) {
      return {
        isDuplicate: true,
        existingPlatform: existing.platform,
        existingRow: existing.sheetLocation?.row || 'Unknown',
        existingColumn: existing.sheetLocation?.column || '',
        originalUrl: existing.originalUrl,
        status: existing.status,
        createdAt: existing.createdAt,
        isProcessing: existing.status === 'processing'
      };
    }
    
    return { isDuplicate: false };
    
  } catch (error: any) {
    ServerLogger.error('MongoDB URL 중복 검사 실패', { error: error.message, url: normalizedUrl }, 'MODEL');
    if (error.message.includes('buffering timed out') || error.message.includes('connection')) {
      ServerLogger.warn('MongoDB 연결 불안정 - 안전을 위해 중복 처리', null, 'MODEL');
      return { isDuplicate: true, error: error.message, reason: 'connection_timeout' };
    }
    return { isDuplicate: false, error: error.message };
  }
};

videoUrlSchema.statics.registerUrl = async function(
  normalizedUrl: string, 
  originalUrl: string, 
  platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK', 
  sheetLocation: any, 
  originalPublishDate: Date | null = null
) {
  try {
    const urlDoc = new this({
      normalizedUrl,
      originalUrl,
      platform,
      sheetLocation,
      originalPublishDate,
      status: 'processing'
    });
    
    await urlDoc.save();
    
    ServerLogger.success(`URL 등록 완료 (processing): ${platform}`, { url: normalizedUrl }, 'MODEL');
    if (originalPublishDate) {
      ServerLogger.info(`원본 게시일: ${originalPublishDate.toLocaleString()}`, null, 'MODEL');
    }
    return { success: true, document: urlDoc };
    
  } catch (error: any) {
    if (error.code === 11000) {
      try {
        const existingDoc = await this.findOne({ normalizedUrl });
        if (existingDoc && existingDoc.status === 'failed') {
          existingDoc.status = 'processing';
          existingDoc.originalUrl = originalUrl;
          existingDoc.platform = platform;
          existingDoc.sheetLocation = sheetLocation;
          existingDoc.originalPublishDate = originalPublishDate;
          await existingDoc.save();
          
          ServerLogger.info(`Failed URL 재시도: ${platform}`, { url: normalizedUrl }, 'MODEL');
          return { success: true, document: existingDoc, retried: true };
        } else {
          ServerLogger.warn(`URL 이미 존재 (${existingDoc?.status || 'unknown'})`, { url: normalizedUrl }, 'MODEL');
          return { success: false, error: 'DUPLICATE_URL', message: 'URL이 이미 존재합니다.' };
        }
      } catch (findError: any) {
        ServerLogger.error('기존 URL 조회 실패', { error: findError.message }, 'MODEL');
        return { success: false, error: findError.message };
      }
    }
    
    ServerLogger.error('URL 등록 실패', { error: error.message }, 'MODEL');
    return { success: false, error: error.message };
  }
};

videoUrlSchema.statics.updateStatus = async function(
  normalizedUrl: string, 
  status: 'processing' | 'completed' | 'failed', 
  sheetLocation: any | null = null, 
  originalPublishDate: Date | null = null
) {
  try {
    const updateData: any = { status };
    
    if (sheetLocation) {
      updateData.sheetLocation = sheetLocation;
    }
    
    if (originalPublishDate) {
      updateData.originalPublishDate = originalPublishDate;
    }
    
    if (status === 'completed') {
      updateData.processedAt = new Date();
    }
    
    const result = await this.updateOne(
      { normalizedUrl },
      updateData
    );
    
    if (result.modifiedCount > 0) {
      ServerLogger.success(`URL 상태 업데이트: ${status}`, { url: normalizedUrl }, 'MODEL');
      return { success: true };
    } else {
      ServerLogger.warn('URL 상태 업데이트 실패 (찾을 수 없음)', { url: normalizedUrl }, 'MODEL');
      return { success: false, error: 'URL_NOT_FOUND' };
    }
    
  } catch (error: any) {
    ServerLogger.error('URL 상태 업데이트 실패', { error: error.message }, 'MODEL');
    return { success: false, error: error.message };
  }
};

videoUrlSchema.statics.cleanupStaleProcessing = async function() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await this.deleteMany({
      status: 'processing',
      createdAt: { $lt: tenMinutesAgo }
    });
    
    if (result.deletedCount > 0) {
      ServerLogger.info(`오래된 processing 레코드 정리: ${result.deletedCount}개`, null, 'MODEL');
    }
    
    return { success: true, deletedCount: result.deletedCount };
    
  } catch (error: any) {
    ServerLogger.error('오래된 processing 레코드 정리 실패', { error: error.message }, 'MODEL');
    return { success: false, error: error.message };
  }
};

videoUrlSchema.statics.cleanupAllProcessing = async function() {
  try {
    const result = await this.deleteMany({
      status: 'processing'
    });
    
    if (result.deletedCount > 0) {
      ServerLogger.info(`서버 재시작: 모든 processing 레코드 정리: ${result.deletedCount}개`, null, 'MODEL');
    }
    
    return { success: true, deletedCount: result.deletedCount };
    
  } catch (error: any) {
    ServerLogger.error('서버 재시작 processing 레코드 정리 실패', { error: error.message }, 'MODEL');
    return { success: false, error: error.message };
  }
};

videoUrlSchema.statics.getStats = async function() {
  try {
    const platformStats = await this.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          latest: { $max: '$createdAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const statusStats = await this.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          latest: { $max: '$createdAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const total = await this.countDocuments();
    
    return {
      total,
      byPlatform: platformStats,
      byStatus: statusStats,
      lastUpdated: new Date()
    };
    
  } catch (error: any) {
    ServerLogger.error('URL 통계 조회 실패', { error: error.message }, 'MODEL');
    return { error: error.message };
  }
};

const VideoUrl = model<IVideoUrl, VideoUrlModelType>('VideoUrl', videoUrlSchema);

export default VideoUrl;
