/**
 * 🔍 Channel Search & Statistics Service
 * 채널 검색, 통계, 고급 쿼리 전담 서비스
 */

import { ServerLogger } from '../../../utils/logger';
import { ChannelData } from '../../../types/channel.types';

const Channel = require('../../../models/ChannelModel');

export class ChannelSearchService {
    /**
     * 🏷️ 키워드 통계
     */
    async getKeywordStatistics() {
        try {
            // MongoDB aggregation 사용
            const stats = await Channel.aggregate([
                { $unwind: '$allTags' },
                {
                    $group: {
                        _id: '$allTags',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 50 },
            ]);

            return stats.map((item: any) => ({
                keyword: item._id,
                count: item.count,
            }));
        } catch (error) {
            ServerLogger.warn('⚠️ 키워드 통계 조회 실패', error);
            return [];
        }
    }

    /**
     * 📊 플랫폼별 통계
     */
    async getPlatformStatistics() {
        try {
            // MongoDB aggregation 사용
            const stats = await Channel.aggregate([
                {
                    $group: {
                        _id: '$platform',
                        count: { $sum: 1 },
                        totalSubscribers: {
                            $sum: '$subscribers',
                        },
                        avgSubscribers: {
                            $avg: '$subscribers',
                        },
                    },
                },
            ]);

            const result: any = {};
            stats.forEach((item: any) => {
                result[item._id] = {
                    count: item.count,
                    totalSubscribers: item.totalSubscribers,
                    avgSubscribers: Math.round(item.avgSubscribers),
                };
            });

            return result;
        } catch (error) {
            ServerLogger.warn('⚠️ 플랫폼 통계 조회 실패', error);
            return {};
        }
    }

    /**
     * 🔍 고급 검색
     */
    async search(filters: any = {}): Promise<ChannelData[]> {
        try {
            const query: any = {};

            // 플랫폼 필터
            if (filters.platform) {
                query.platform = filters.platform;
            }

            // 구독자 수 범위 필터
            if (filters.minSubscribers || filters.maxSubscribers) {
                query.subscribers = {};
                if (filters.minSubscribers) {
                    query.subscribers.$gte = filters.minSubscribers;
                }
                if (filters.maxSubscribers) {
                    query.subscribers.$lte = filters.maxSubscribers;
                }
            }

            // 태그 필터
            if (filters.tags && filters.tags.length > 0) {
                query.allTags = {
                    $in: filters.tags.map(
                        (tag: string) => new RegExp(tag, 'i'),
                    ),
                };
            }

            // 클러스터 상태 필터
            if (filters.clustered === true) {
                query.clusterIds = {
                    $exists: true,
                    $ne: [],
                };
            } else if (filters.clustered === false) {
                query.$or = [
                    { clusterIds: { $exists: false } },
                    { clusterIds: { $size: 0 } },
                ];
            }

            // MongoDB 쿼리 실행
            let queryBuilder = Channel.find(query);

            // 정렬
            if (filters.sortBy) {
                const sortOptions: any = {};
                switch (filters.sortBy) {
                    case 'subscribers':
                        sortOptions.subscribers = -1;
                        break;
                    case 'name':
                        sortOptions.name = 1;
                        break;
                    case 'collectedAt':
                        sortOptions.collectedAt = -1;
                        break;
                }
                queryBuilder = queryBuilder.sort(sortOptions);
            }

            // 제한
            if (filters.limit) {
                queryBuilder = queryBuilder.limit(filters.limit);
            }

            const results = await queryBuilder.lean();
            return results;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 고급 검색 실패', error);
            return [];
        }
    }

    /**
     * 🔧 빈 정보가 있는 채널들을 YouTube API에서 채우기
     */
    async fillMissingChannelInfo() {
        try {
            ServerLogger.info('🔧 빈 채널 정보 채우기 시작...');

            // MongoDB에서 빈 정보가 있는 채널들 찾기
            const channelsToUpdate = await Channel.find(
                {
                    platform: 'YOUTUBE',
                    $or: [
                        {
                            description: {
                                $exists: false,
                            },
                        },
                        { description: '' },
                        {
                            thumbnailUrl: {
                                $exists: false,
                            },
                        },
                        { thumbnailUrl: '' },
                        {
                            subscribers: {
                                $exists: false,
                            },
                        },
                        { subscribers: 0 },
                    ],
                },
                {
                    channelId: 1,
                    name: 1,
                    keywords: 1,
                },
            ).lean();

            if (channelsToUpdate.length === 0) {
                ServerLogger.info('✅ 모든 채널 정보가 완전합니다.');
                return { updated: 0, failed: 0 };
            }

            ServerLogger.info(
                `🔧 업데이트할 채널: ${channelsToUpdate.length}개`,
            );

            let updated = 0;
            let failed = 0;

            // 각 채널을 개별적으로 업데이트 (이 부분은 메인 서비스에서 처리)
            return { updated, failed, channelsToUpdate };
        } catch (error) {
            ServerLogger.error('❌ 빈 채널 정보 채우기 실패', error);
            throw error;
        }
    }

    /**
     * 📊 채널 정보 완성도 확인
     */
    async getChannelCompletionStats() {
        try {
            const total = await Channel.countDocuments();

            const missingFields = await Promise.all([
                Channel.countDocuments({
                    $or: [
                        {
                            description: {
                                $exists: false,
                            },
                        },
                        { description: '' },
                    ],
                }),
                Channel.countDocuments({
                    $or: [
                        {
                            thumbnailUrl: {
                                $exists: false,
                            },
                        },
                        { thumbnailUrl: '' },
                    ],
                }),
                Channel.countDocuments({
                    $or: [
                        {
                            subscribers: {
                                $exists: false,
                            },
                        },
                        { subscribers: 0 },
                    ],
                }),
                Channel.countDocuments({
                    $or: [{ customUrl: { $exists: false } }, { customUrl: '' }],
                }),
            ]);

            const complete = await Channel.countDocuments({
                description: { $ne: '' },
                thumbnailUrl: { $ne: '' },
                subscribers: { $ne: 0 },
                customUrl: { $ne: '' },
            });

            return {
                total,
                complete,
                incomplete: total - complete,
                missingFields: {
                    description: missingFields[0],
                    thumbnailUrl: missingFields[1],
                    subscribers: missingFields[2],
                    customUrl: missingFields[3],
                },
            };
        } catch (error) {
            ServerLogger.warn('⚠️ 채널 완성도 통계 조회 실패', error);
            return {
                total: 0,
                complete: 0,
                incomplete: 0,
                missingFields: {
                    description: 0,
                    thumbnailUrl: 0,
                    subscribers: 0,
                    customUrl: 0,
                },
            };
        }
    }
}
