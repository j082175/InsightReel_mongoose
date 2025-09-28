/**
 * 📊 Channel Analysis Service (Refactored)
 * 리팩토링된 채널 분석 서비스 - 역할별로 분리된 서비스들을 조합
 */

const { ServerLogger } = require('../../utils/logger');

// 분리된 서비스들
const { ChannelAnalyzer } = require('./services/ChannelAnalyzer');
const { ChannelBackupService } = require('./services/ChannelBackupService');
const { ChannelDataService } = require('./services/ChannelDataService');
const { ChannelSearchService } = require('./services/ChannelSearchService');

// ChannelData 타입 import 추가
import type { ChannelData } from '../../types/channel.types';

const DuplicateCheckManager = require('../../models/DuplicateCheckManager');
const Channel = require('../../models/Channel');

/**
 * 📊 채널 분석 서비스 (메인 조합기)
 * 각 전문 서비스들을 조합하여 완전한 채널 분석 기능 제공
 */
class ChannelAnalysisService {
    private dataService: any;
    private backupService: any;
    private searchService: any;
    private analyzer: any;

    constructor() {
        // 분리된 서비스들 초기화
        this.dataService = new ChannelDataService();
        this.backupService = new ChannelBackupService();
        this.searchService = new ChannelSearchService();
        this.analyzer = new ChannelAnalyzer();

        this.initialize();
    }

    /**
     * 🚀 초기화
     */
    async initialize() {
        try {
            await this.backupService.initialize();

            const channelCount = await this.dataService.getTotalCount();
            ServerLogger.success('✅ ChannelAnalysisService 초기화 완료', {
                channelCount: channelCount,
            });
        } catch (error) {
            ServerLogger.error('❌ ChannelAnalysisService 초기화 실패', error);
            throw error;
        }
    }

    // =================================================================
    // 🤖 AI 분석 관련 메서드들 (ChannelAnalyzer 위임)
    // =================================================================

    /**
     * 📊 YouTube API에서 채널 상세 분석 후 생성/업데이트
     */
    async createOrUpdateWithAnalysis(
        channelIdentifier: string,
        userKeywords: string[] = [],
        includeAnalysis: boolean = true,
        skipAIAnalysis: boolean = false,
        queueNormalizedChannelId: string | null = null,
    ) {
        try {
            // 🚨 중복검사 - 리소스 사용 전에 즉시 확인
            // const decodedChannelIdentifier =
            //     decodeURIComponent(channelIdentifier);

            // AI 분석으로 채널 데이터 생성
            const channelData = await this.analyzer.analyzeChannelWithAI(
                channelIdentifier,
                userKeywords,
                includeAnalysis,
                skipAIAnalysis,
                queueNormalizedChannelId,
            );

            // 중복 검사
            const existing = await this.dataService.findById(
                channelData.channelId,
            );
            if (existing) {
                ServerLogger.warn(`⚠️ 중복 분석 차단: ${channelData.name}`);
                throw new Error(
                    `채널 ${channelData.name}은 이미 분석되었습니다.`,
                );
            }

            // 생성/업데이트 처리
            return await this.createOrUpdate(channelData);
        } catch (error) {
            const decodedChannelIdentifier =
                decodeURIComponent(channelIdentifier);
            ServerLogger.error(
                `❌ YouTube 채널 상세 분석 실패: ${decodedChannelIdentifier}`,
                error,
            );
            throw error;
        }
    }

    /**
     * 🔍 YouTube API에서 채널 정보 가져와서 생성/업데이트 (기본 정보만)
     */
    async createOrUpdateFromYouTube(
        channelIdentifier: string,
        userKeywords: string[] = [],
    ) {
        try {
            // 기본 정보만 가져오기
            const channelData = await this.analyzer.getBasicChannelInfo(
                channelIdentifier,
                userKeywords,
            );

            // 🚨 중복검사
            const existing = await this.dataService.findById(
                channelData.channelId,
            );
            if (existing) {
                ServerLogger.warn(`⚠️ 중복 분석 차단: ${channelData.name}`);
                throw new Error(
                    `채널 ${channelData.name}은 이미 분석되었습니다.`,
                );
            }

            // 생성/업데이트 처리
            return await this.createOrUpdate(channelData);
        } catch (error) {
            const decodedChannelIdentifier =
                decodeURIComponent(channelIdentifier);
            ServerLogger.error(
                `❌ YouTube 채널 정보 수집 실패: ${decodedChannelIdentifier}`,
                error,
            );
            throw error;
        }
    }

    // =================================================================
    // 💾 데이터 관리 메서드들 (ChannelDataService + ChannelBackupService 위임)
    // =================================================================

    /**
     * 🆕 채널 생성 또는 업데이트
     */
    async createOrUpdate(channelData: ChannelData): Promise<ChannelData> {
        try {
            // 🚀 원본 로직을 따라 channel 객체로 재구성
            const channel = {
                channelId: channelData.channelId,
                name: channelData.name,
                url: channelData.url,
                platform: channelData.platform || 'YOUTUBE',

                // 기본 정보
                subscribers: channelData.subscribers || 0,
                description: channelData.description || '',
                thumbnailUrl: channelData.thumbnailUrl || '',
                customUrl: channelData.customUrl || '',
                publishedAt: channelData.publishedAt,

                // 언어 및 지역 정보
                defaultLanguage: channelData.defaultLanguage || '',
                country: channelData.country || '',

                // 콘텐츠 타입 정보
                contentType: channelData.contentType || 'mixed',

                // 태그 정보
                keywords: channelData.keywords || [],
                aiTags: channelData.aiTags || [],
                deepInsightTags: channelData.deepInsightTags || [],
                allTags: channelData.allTags || [],

                // channelIdentity 필드들
                targetAudience: channelData.targetAudience || '',
                contentStyle: channelData.contentStyle || '',
                uniqueFeatures: channelData.uniqueFeatures || [],
                channelPersonality: channelData.channelPersonality || '',

                // 클러스터 정보
                clusterIds: channelData.clusterIds || [],
                suggestedClusters: channelData.suggestedClusters || [],

                // 상세 분석 정보 (있는 경우에만 포함)
                ...(channelData.dailyUploadRate !== undefined && {
                    dailyUploadRate: channelData.dailyUploadRate,
                    last7DaysViews: channelData.last7DaysViews,
                    avgDurationSeconds: channelData.avgDurationSeconds,
                    avgDurationFormatted: channelData.avgDurationFormatted,
                    shortFormRatio: channelData.shortFormRatio,
                    viewsByPeriod: channelData.viewsByPeriod,
                    totalVideos: channelData.totalVideos,
                    totalViews: channelData.totalViews,
                    averageViewsPerVideo: channelData.averageViewsPerVideo,
                    uploadFrequency: channelData.uploadFrequency,
                    mostViewedVideo: channelData.mostViewedVideo,
                    lastAnalyzedAt: channelData.lastAnalyzedAt,
                    analysisVersion: channelData.analysisVersion,
                }),

                // 메타데이터
                collectedAt: channelData.collectedAt || new Date(),
                updatedAt: new Date(),
                version: 1,
            };

            // MongoDB 저장 (upsert 사용)
            const savedChannel = await Channel.findOneAndUpdate(
                { channelId: channelData.channelId },
                channel,
                { upsert: true, new: true },
            );

            // 🔍 저장 후 실제 DB 값 확인
            ServerLogger.info(`🔍 저장 후 DB 확인:`, {
                targetAudience: savedChannel.targetAudience,
                contentStyle: savedChannel.contentStyle
                    ? savedChannel.contentStyle.substring(0, 50) + '...'
                    : '',
                uniqueFeatures: savedChannel.uniqueFeatures,
                channelPersonality: savedChannel.channelPersonality,
            });

            // ✅ 채널 저장 성공 후에만 중복검사 DB 업데이트
            try {
                // Queue에서 생성한 정규화 ID를 우선 사용
                const normalizedChannelId = (
                    savedChannel.customUrl?.startsWith('@')
                        ? savedChannel.customUrl
                        : `@${savedChannel.name}`
                ).toLowerCase();

                const updateResult =
                    await DuplicateCheckManager.updateChannelStatus(
                        normalizedChannelId,
                        'completed',
                        {
                            name: savedChannel.name,
                            url: savedChannel.url,
                            subscribers: savedChannel.subscribers,
                            channelId: savedChannel.channelId,
                        },
                    );

                if (updateResult.success) {
                    ServerLogger.success(
                        `✅ 중복검사 DB 상태 업데이트 성공: ${normalizedChannelId}`,
                    );
                } else {
                    ServerLogger.error(
                        `❌ 중복검사 DB 상태 업데이트 실패: ${updateResult.error}`,
                    );
                }
            } catch (duplicateError) {
                ServerLogger.warn(
                    `⚠️ 중복검사 DB 등록 실패 (무시): ${duplicateError}`,
                );
            }

            // 백업 파일은 비동기로 업데이트 (성능 최적화)
            this.backupService.saveChannelsAsync();

            return savedChannel;
        } catch (error) {
            ServerLogger.error('❌ 채널 저장 실패', error);
            throw error;
        }
    }

    // =================================================================
    // 🔍 검색 및 조회 메서드들 (ChannelDataService 위임)
    // =================================================================

    async findById(channelId: any) {
        return await this.dataService.findById(channelId);
    }

    async findByName(name: any) {
        return await this.dataService.findByName(name);
    }

    async findByTag(tag: any) {
        return await this.dataService.findByTag(tag);
    }

    async getAll() {
        return await this.dataService.getAll();
    }

    async getRecent(limit: any = 20) {
        return await this.dataService.getRecent(limit);
    }

    async getUnclustered() {
        return await this.dataService.getUnclustered();
    }

    async getTotalCount() {
        return await this.dataService.getTotalCount();
    }

    async getUnclusteredCount() {
        return await this.dataService.getUnclusteredCount();
    }

    async delete(channelId: any) {
        const result = await this.dataService.delete(channelId);
        if (result) {
            this.backupService.saveChannelsAsync();
        }
        return result;
    }

    async assignToCluster(channelId: any, clusterId: any) {
        const result = await this.dataService.assignToCluster(
            channelId,
            clusterId,
        );
        this.backupService.saveChannelsAsync();
        return result;
    }

    async removeFromCluster(channelId: any, clusterId: any) {
        const result = await this.dataService.removeFromCluster(
            channelId,
            clusterId,
        );
        this.backupService.saveChannelsAsync();
        return result;
    }

    // =================================================================
    // 📊 통계 및 고급 검색 (ChannelSearchService 위임)
    // =================================================================

    async getKeywordStatistics() {
        return await this.searchService.getKeywordStatistics();
    }

    async getPlatformStatistics() {
        return await this.searchService.getPlatformStatistics();
    }

    async search(filters: any = {}) {
        return await this.searchService.search(filters);
    }

    async fillMissingChannelInfo() {
        const result = await this.searchService.fillMissingChannelInfo();

        // 실제 업데이트 로직은 여기서 처리
        if (result.channelsToUpdate && result.channelsToUpdate.length > 0) {
            let updated = 0;
            let failed = 0;

            for (const channelInfo of result.channelsToUpdate) {
                try {
                    ServerLogger.info(
                        `🔄 채널 업데이트 중: ${channelInfo.name}`,
                    );

                    // YouTube API에서 정보 가져와서 업데이트
                    await this.createOrUpdateFromYouTube(
                        channelInfo.name,
                        channelInfo.keywords,
                    );
                    updated++;

                    // API 호출 간격 (Rate Limit 방지)
                    await new Promise((resolve) => setTimeout(resolve, 100));
                } catch (error) {
                    ServerLogger.error(
                        `❌ 채널 업데이트 실패: ${channelInfo.name}`,
                        error,
                    );
                    failed++;
                }
            }

            ServerLogger.success(
                `✅ 빈 채널 정보 채우기 완료: 성공 ${updated}개, 실패 ${failed}개`,
            );

            return { updated, failed };
        }

        return result;
    }

    async getChannelCompletionStats() {
        return await this.searchService.getChannelCompletionStats();
    }

    // =================================================================
    // 🔄 백업 관련 메서드들 (ChannelBackupService 위임)
    // =================================================================

    async syncBackupFile() {
        return await this.backupService.syncBackupFile();
    }

    async saveChannels() {
        return await this.backupService.saveChannels();
    }

    async loadChannels() {
        return await this.backupService.loadChannels();
    }
}

// 싱글톤 패턴
let instance: ChannelAnalysisService | null = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new ChannelAnalysisService();
        }
        return instance;
    },

    // 정적 메서드들 (편의성)
    createOrUpdate: async (data: any) => {
        const model = module.exports.getInstance();
        return await model.createOrUpdate(data);
    },

    findById: async (id: any) => {
        const model = module.exports.getInstance();
        return await model.findById(id);
    },

    getAll: async () => {
        const model = module.exports.getInstance();
        return await model.getAll();
    },

    getRecent: async (limit: any) => {
        const model = module.exports.getInstance();
        return await model.getRecent(limit);
    },

    getUnclustered: async () => {
        const model = module.exports.getInstance();
        return await model.getUnclustered();
    },

    getTotalCount: async () => {
        const model = module.exports.getInstance();
        return await model.getTotalCount();
    },

    getUnclusteredCount: async () => {
        const model = module.exports.getInstance();
        return await model.getUnclusteredCount();
    },

    search: async (filters: any) => {
        const model = module.exports.getInstance();
        return await model.search(filters);
    },

    // 새로운 메서드들
    createOrUpdateFromYouTube: async (
        channelIdentifier: string,
        userKeywords: string[],
    ) => {
        const model = module.exports.getInstance();
        return await model.createOrUpdateFromYouTube(
            channelIdentifier,
            userKeywords,
        );
    },

    fillMissingChannelInfo: async () => {
        const model = module.exports.getInstance();
        return await model.fillMissingChannelInfo();
    },

    getChannelCompletionStats: async () => {
        const model = module.exports.getInstance();
        return await model.getChannelCompletionStats();
    },

    // 새로운 상세 분석 메서드들
    createOrUpdateWithAnalysis: async (
        channelIdentifier: string,
        userKeywords: string[],
        includeAnalysis: boolean,
        skipAIAnalysis: boolean,
        queueNormalizedChannelId: string | null,
    ) => {
        const model = module.exports.getInstance();
        return await model.createOrUpdateWithAnalysis(
            channelIdentifier,
            userKeywords,
            includeAnalysis,
            skipAIAnalysis,
            queueNormalizedChannelId,
        );
    },
};
