/**
 * 🍃 Channel MongoDB CRUD Service
 * MongoDB 채널 데이터 관리 전담 서비스
 */

import { ChannelData } from '../../../types/channel.types';
import { ServerLogger } from '../../../utils/logger';
import Channel from '../../../models/Channel';

export class ChannelDataService {
    /**
     * 🍃 MongoDB에 채널 데이터 저장
     * @param channelData - 저장할 채널 데이터
     * @returns 저장된 채널 데이터
     */
    async saveToMongoDB(channelData: ChannelData): Promise<ChannelData> {
        try {
            // 🔍 저장 전 channelData 확인
            ServerLogger.info('🔍 저장 전 channelData:', {
                targetAudience: channelData.targetAudience,
                contentStyle: channelData.contentStyle,
                uniqueFeatures: channelData.uniqueFeatures,
                channelPersonality: channelData.channelPersonality,
                hasTargetAudience: !!channelData.targetAudience,
                hasContentStyle: !!channelData.contentStyle,
                hasUniqueFeatures: !!channelData.uniqueFeatures,
                hasChannelPersonality: !!channelData.channelPersonality,
                allKeys: Object.keys(channelData),
            });

            // MongoDB upsert (존재하면 업데이트, 없으면 생성)
            const result = await Channel.findOneAndUpdate(
                { channelId: channelData.channelId },
                channelData,
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                },
            );

            // 안전한 날짜 비교 (Date 객체 변환)
            const createdAt =
                result.createdAt instanceof Date
                    ? result.createdAt
                    : new Date(result.createdAt);
            const updatedAt =
                result.updatedAt instanceof Date
                    ? result.updatedAt
                    : new Date(result.updatedAt);

            ServerLogger.debug('🍃 MongoDB 채널 저장 완료', {
                channelId: channelData.channelId,
                name: channelData.name,
                isNew:
                    !result.updatedAt ||
                    createdAt.getTime() === updatedAt.getTime(),
            });

            // 🔍 저장된 실제 데이터 확인
            ServerLogger.info('🔍 저장 후 실제 DB 데이터:', {
                targetAudience: result.targetAudience,
                contentStyle: result.contentStyle,
                uniqueFeatures: result.uniqueFeatures,
                channelPersonality: result.channelPersonality,
                hasTargetAudience: !!result.targetAudience,
                hasContentStyle: !!result.contentStyle,
                hasUniqueFeatures: !!result.uniqueFeatures,
                hasChannelPersonality: !!result.channelPersonality,
            });

            return result as unknown as ChannelData;
        } catch (error) {
            ServerLogger.error('❌ MongoDB 채널 저장 실패', error);
            throw error;
        }
    }

    /**
     * 🔍 채널 조회 (MongoDB 직접 조회)
     */
    async findById(channelId: string) {
        try {
            const channel = await Channel.findOne({
                channelId: channelId,
            }).lean();
            return channel || null;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 조회 실패', error);
            return null;
        }
    }

    /**
     * 🔍 채널 검색 (이름으로)
     */
    async findByName(name: string) {
        try {
            const results = await Channel.find({
                name: { $regex: name, $options: 'i' },
            }).lean();

            return results;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 검색 실패', error);
            return [];
        }
    }

    /**
     * 🏷️ 태그로 검색
     */
    async findByTag(tag: string) {
        try {
            const results = await Channel.find({
                allTags: { $regex: tag, $options: 'i' },
            }).lean();

            return results;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 태그 검색 실패', error);
            return [];
        }
    }

    /**
     * 📊 전체 채널 조회
     */
    async getAll(): Promise<ChannelData[]> {
        try {
            const channels = await Channel.find({}).lean() as unknown as ChannelData[];
            return channels;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 전체 조회 실패', error);
            return [];
        }
    }

    /**
     * 📈 최근 채널 조회
     */
    async getRecent(limit = 20): Promise<ChannelData[]> {
        try {
            const channels = await Channel.find({})
                .sort({ collectedAt: -1 })
                .limit(limit)
                .lean() as unknown as ChannelData[];
            return channels;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 최근 채널 조회 실패', error);
            return [];
        }
    }

    /**
     * 🔍 클러스터되지 않은 채널 조회
     */
    async getUnclustered() {
        try {
            const channels = await Channel.find({
                $or: [
                    { clusterIds: { $exists: false } },
                    { clusterIds: { $size: 0 } },
                ],
            }).lean();
            return channels;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 미클러스터 채널 조회 실패', error);
            return [];
        }
    }

    /**
     * 📊 전체 채널 수
     */
    async getTotalCount() {
        try {
            const count = await Channel.countDocuments();
            return count;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 카운트 조회 실패', error);
            return 0;
        }
    }

    /**
     * 📊 클러스터되지 않은 채널 수
     */
    async getUnclusteredCount() {
        try {
            const count = await Channel.countDocuments({
                $or: [
                    { clusterIds: { $exists: false } },
                    { clusterIds: { $size: 0 } },
                ],
            });
            return count;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 미클러스터 카운트 조회 실패', error);
            return 0;
        }
    }

    /**
     * 🗑️ 채널 삭제
     */
    async delete(channelId: string) {
        try {
            const result = await Channel.findOneAndDelete({
                channelId: channelId,
            });

            if (result) {
                ServerLogger.info('🗑️ 채널 삭제 완료', {
                    channelId: channelId,
                    name: result.name,
                });

                return true;
            }

            return false;
        } catch (error) {
            ServerLogger.error('❌ 채널 삭제 실패', error);
            return false;
        }
    }

    /**
     * 🔄 채널에 클러스터 할당
     */
    async assignToCluster(channelId: string, clusterId: string) {
        try {
            const channel = await Channel.findOneAndUpdate(
                { channelId: channelId },
                {
                    $addToSet: { clusterIds: clusterId },
                    $set: { updatedAt: new Date() },
                },
                { new: true },
            );

            if (!channel) {
                throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
            }

            ServerLogger.info('🔗 채널-클러스터 연결', {
                channelId,
                clusterId,
            });

            return channel.toJSON();
        } catch (error) {
            ServerLogger.error('❌ 클러스터 할당 실패', error);
            throw error;
        }
    }

    /**
     * ✂️ 클러스터에서 제거
     */
    async removeFromCluster(channelId: string, clusterId: string) {
        try {
            const channel = await Channel.findOneAndUpdate(
                { channelId: channelId },
                {
                    $pull: { clusterIds: clusterId },
                    $set: { updatedAt: new Date() },
                },
                { new: true },
            );

            if (!channel) {
                throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
            }

            ServerLogger.info('✂️ 채널-클러스터 연결 해제', {
                channelId,
                clusterId,
            });

            return channel.toJSON();
        } catch (error) {
            ServerLogger.error('❌ 클러스터 해제 실패', error);
            throw error;
        }
    }
}
