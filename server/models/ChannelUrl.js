const mongoose = require('mongoose');

// 🔍 채널 중복 검사 전용 초경량 스키마 (성능 최적화)
const channelUrlSchema = new mongoose.Schema(
    {
        // 정규화된 채널 식별자 (검색 키)
        normalizedChannelId: {
            type: String,
            required: true,
            unique: true, // 🚨 중복 방지 제약조건
            index: true, // ⚡ 초고속 검색을 위한 인덱스
        },

        // 원본 채널 식별자 (URL, @핸들, 채널ID 등)
        originalChannelIdentifier: {
            type: String,
            required: true,
        },

        // 플랫폼 정보
        platform: {
            type: String,
            required: true,
            enum: ['INSTAGRAM', 'YOUTUBE', 'TIKTOK'],
            index: true,
        },

        // 🔄 처리 상태
        status: {
            type: String,
            required: true,
            enum: ['processing', 'completed', 'failed'],
            default: 'processing',
            index: true,
        },

        // 채널 기본 정보 (캐시용)
        channelInfo: {
            name: String, // 채널명
            handle: String, // @핸들 또는 사용자명
            subscriberCount: Number, // 구독자 수
            description: String, // 채널 설명
            thumbnailUrl: String, // 프로필 이미지
        },

        // 분석 작업 정보
        analysisJob: {
            jobId: String, // 분석 작업 ID
            queuePosition: Number, // 큐에서의 위치
            estimatedTime: Number, // 예상 소요 시간 (분)
        },

        // 처리 완료 시간
        processedAt: {
            type: Date,
            required: false,
        },

        // 채널 발견일 (최초 분석 요청일)
        discoveredAt: {
            type: Date,
            default: Date.now,
            index: true,
        },

        // 마지막 분석일
        lastAnalyzedAt: {
            type: Date,
            required: false,
            index: true,
        },
    },
    {
        // 스키마 옵션
        collection: 'channel_duplicate_check', // 🔍 채널 중복 검사 전용 컬렉션
        versionKey: false, // __v 필드 제거 (성능 향상)
    },
);

// 🚀 복합 인덱스 생성
channelUrlSchema.index({ platform: 1, discoveredAt: -1 }); // 플랫폼별 발견일순
channelUrlSchema.index({ platform: 1, 'channelInfo.name': 1 }); // 플랫폼별 채널명 검색
channelUrlSchema.index({ status: 1, discoveredAt: 1 }); // 상태별 처리 순서
channelUrlSchema.index({ 'analysisJob.queuePosition': 1 }); // 큐 위치별 정렬

// 🔍 정적 메서드: 채널 중복 검사 (초고속)
channelUrlSchema.statics.checkDuplicate = async function (normalizedChannelId) {
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
    } catch (error) {
        console.error('MongoDB 채널 중복 검사 실패:', error.message);
        return { isDuplicate: false, error: error.message };
    }
};

// 📝 정적 메서드: 채널 등록
channelUrlSchema.statics.registerChannel = async function (
    normalizedChannelId,
    originalChannelIdentifier,
    platform,
    channelInfo = {},
    analysisJob = {},
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
    } catch (error) {
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

// 🔄 정적 메서드: 상태 업데이트
channelUrlSchema.statics.updateStatus = async function (
    normalizedChannelId,
    status,
    channelInfo = null,
) {
    try {
        const updateData = { status };

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
    } catch (error) {
        console.error('채널 상태 업데이트 실패:', error.message);
        return { success: false, error: error.message };
    }
};

// 🧹 정적 메서드: 오래된 processing 상태 정리 (30분 이상)
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
    } catch (error) {
        console.error(
            '오래된 채널 processing 레코드 정리 실패:',
            error.message,
        );
        return { success: false, error: error.message };
    }
};

// 📊 정적 메서드: 채널 통계 조회
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
    } catch (error) {
        console.error('채널 통계 조회 실패:', error.message);
        return { error: error.message };
    }
};

module.exports = mongoose.model('ChannelUrl', channelUrlSchema);
