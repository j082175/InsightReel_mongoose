import { Schema, model, Model } from 'mongoose';
import { IChannelUrl } from '../types/models';

// 🎯 모델 타입 (정적 메서드 포함)
export interface ChannelUrlModelType extends Model<IChannelUrl> {
  checkDuplicate(normalizedChannelId: string): Promise<any>;
  registerChannel(
    normalizedChannelId: string,
    originalChannelIdentifier: string,
    platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK',
    channelInfo?: any,
    analysisJob?: any,
  ): Promise<{ success: boolean; document?: IChannelUrl; error?: string; message?: string }>;
  updateStatus(
    normalizedChannelId: string,
    status: 'processing' | 'completed' | 'failed',
    channelInfo?: any,
  ): Promise<{ success: boolean; error?: string }>;
  cleanupStaleProcessing(): Promise<{ success: boolean; deletedCount: number; error?: string }>;
  getStats(): Promise<any>;
  removeChannel(normalizedChannelId: string): Promise<{ success: boolean; deletedCount: number; error?: string }>;
}

const channelUrlSchema = new Schema<IChannelUrl, ChannelUrlModelType>(
    {
        normalizedChannelId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        originalChannelIdentifier: {
            type: String,
            required: true,
        },
        platform: {
            type: String,
            required: true,
            enum: ['INSTAGRAM', 'YOUTUBE', 'TIKTOK'],
            index: true,
        },
        status: {
            type: String,
            required: true,
            enum: ['processing', 'completed', 'failed'],
            default: 'processing',
            index: true,
        },
        channelInfo: {
            name: String,
            handle: String,
            subscriberCount: Number,
            description: String,
            thumbnailUrl: String,
        },
        analysisJob: {
            jobId: String,
            queuePosition: Number,
            estimatedTime: Number,
        },
        processedAt: {
            type: Date,
            required: false,
        },
        discoveredAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastAnalyzedAt: {
            type: Date,
            required: false,
            index: true,
        },
    },
    {
        collection: 'channel_duplicate_check',
        versionKey: false,
    },
);

channelUrlSchema.index({ platform: 1, discoveredAt: -1 });
channelUrlSchema.index({ platform: 1, 'channelInfo.name': 1 });
channelUrlSchema.index({ status: 1, discoveredAt: 1 });
channelUrlSchema.index({ 'analysisJob.queuePosition': 1 });

channelUrlSchema.statics.checkDuplicate = async function (normalizedChannelId: string) {
    try {
        const existing = await this.findOne({
            normalizedChannelId,
            status: { $in: ['processing', 'completed'] },
        }).lean();

        if (existing) {
            return {
                isDuplicate: true,
                existingPlatform: existing.platform,
                existingChannel: {
                    name: existing.channelInfo?.name,
                    handle: existing.channelInfo?.handle,
                    subscribers: existing.channelInfo?.subscriberCount,
                    description: existing.channelInfo?.description,
                },
                originalIdentifier: existing.originalChannelIdentifier,
                status: existing.status,
                discoveredAt: existing.discoveredAt,
                lastAnalyzedAt: existing.lastAnalyzedAt,
                isProcessing: existing.status === 'processing',
            };
        }

        return { isDuplicate: false };
    } catch (error: any) {
        console.error('MongoDB 채널 중복 검사 실패:', error.message);
        return { isDuplicate: false, error: error.message };
    }
};

channelUrlSchema.statics.registerChannel = async function (
    normalizedChannelId: string,
    originalChannelIdentifier: string,
    platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK',
    channelInfo: any = {},
    analysisJob: any = {},
) {
    try {
        const channelDoc = new this({
            normalizedChannelId,
            originalChannelIdentifier,
            platform,
            channelInfo,
            analysisJob,
            status: 'processing',
        });

        await channelDoc.save();

        console.log(
            `✅ 채널 등록 완료 (processing): ${platform} - ${
                channelInfo.name || originalChannelIdentifier
            }`,
        );
        if (channelInfo.subscriberCount) {
            console.log(
                `👥 구독자 수: ${channelInfo.subscriberCount.toLocaleString()}명`,
            );
        }

        return { success: true, document: channelDoc };
    } catch (error: any) {
        if (error.code === 11000) {
            console.warn(`⚠️ 채널 이미 존재: ${normalizedChannelId}`);
            return {
                success: false,
                error: 'DUPLICATE_CHANNEL',
                message: '채널이 이미 존재합니다.',
            };
        }

        console.error('채널 등록 실패:', error.message);
        return { success: false, error: error.message };
    }
};

channelUrlSchema.statics.updateStatus = async function (
    normalizedChannelId: string,
    status: 'processing' | 'completed' | 'failed',
    channelInfo: any = null,
) {
    try {
        const updateData: any = { status };

        if (channelInfo) {
            updateData.channelInfo = channelInfo;
        }

        if (status === 'completed') {
            updateData.processedAt = new Date();
            updateData.lastAnalyzedAt = new Date();
        }

        const result = await this.findOneAndUpdate(
            { normalizedChannelId },
            {
                $set: updateData,
                $setOnInsert: {
                    normalizedChannelId,
                    createdAt: new Date(),
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        if (result) {
            console.log(
                `✅ 채널 상태 업데이트/생성: ${normalizedChannelId} -> ${status}`,
            );
            return { success: true };
        } else {
            console.warn(
                `⚠️ 채널 상태 업데이트 실패: ${normalizedChannelId}`,
            );
            return { success: false, error: 'UPDATE_FAILED' };
        }
    } catch (error: any) {
        console.error('채널 상태 업데이트 실패:', error.message);
        return { success: false, error: error.message };
    }
};

channelUrlSchema.statics.cleanupStaleProcessing = async function () {
    try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const result = await this.deleteMany({
            status: 'processing',
            discoveredAt: { $lt: thirtyMinutesAgo },
        });

        if (result.deletedCount > 0) {
            console.log(
                `🧹 오래된 채널 processing 레코드 정리: ${result.deletedCount}개`,
            );
        }

        return { success: true, deletedCount: result.deletedCount };
    } catch (error: any) {
        console.error(
            '오래된 채널 processing 레코드 정리 실패:',
            error.message,
        );
        return { success: false, error: error.message };
    }
};

channelUrlSchema.statics.getStats = async function () {
    try {
        const platformStats = await this.aggregate([
            {
                $group: {
                    _id: '$platform',
                    count: { $sum: 1 },
                    avgSubscribers: { $avg: '$channelInfo.subscriberCount' },
                    latest: { $max: '$discoveredAt' },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        const statusStats = await this.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    latest: { $max: '$discoveredAt' },
                },
            },
        ]);

        const total = await this.countDocuments();

        return {
            total,
            byPlatform: platformStats,
            byStatus: statusStats,
            lastUpdated: new Date(),
        };
    } catch (error: any) {
        console.error('채널 통계 조회 실패:', error.message);
        return { error: error.message };
    }
};

channelUrlSchema.statics.removeChannel = async function (normalizedChannelId: string) {
    try {
        const result = await this.deleteOne({
            normalizedChannelId: normalizedChannelId,
        });

        if (result.deletedCount > 0) {
            console.log(`🗑️ 중복검사 DB에서 채널 삭제: ${normalizedChannelId}`);
            return { success: true, deletedCount: result.deletedCount };
        } else {
            console.warn(`⚠️ 삭제할 채널을 찾을 수 없음: ${normalizedChannelId}`);
            return { success: false, error: 'NOT_FOUND' };
        }
    } catch (error: any) {
        console.error('채널 삭제 실패:', error.message);
        return { success: false, error: error.message };
    }
};

const ChannelUrl = model<IChannelUrl, ChannelUrlModelType>('ChannelUrl', channelUrlSchema);

export default ChannelUrl;
