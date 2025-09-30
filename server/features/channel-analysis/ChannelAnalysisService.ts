/**
 * 📊 Channel Analysis Service (Refactored)
 * 리팩토링된 채널 분석 서비스 - 역할별로 분리된 서비스들을 조합
 */

import { ServerLogger } from '../../utils/logger';

// 분리된 서비스들
import { ChannelAnalyzer } from './services/ChannelAnalyzer';
// Use dynamic imports for CommonJS modules
let ChannelBackupService: any, ChannelDataService: any, ChannelSearchService: any;

// ChannelData 타입 import 추가
import type { ChannelData } from '../../types/channel.types';

import { DuplicateChecker } from '../../shared/utils/DuplicateChecker';
import Channel from '../../models/Channel';

/**
 * 📊 채널 분석 서비스 (메인 조합기)
 * 각 전문 서비스들을 조합하여 완전한 채널 분석 기능 제공
 */
class ChannelAnalysisService {
    private dataService: any;
    private backupService: any;
    private searchService: any;
    private analyzer: any;
    private initializationWarningCount: number = 0;

    constructor() {
        // 분리된 서비스들 초기화 - 동적으로 로드
        this.analyzer = new ChannelAnalyzer();

        // Initialize services asynchronously - don't call initialize() in constructor
        this.initializeServices().then(() => {
            // Services are now loaded, can initialize
            this.initialize();
        }).catch(error => {
            ServerLogger.error('❌ ChannelAnalysisService 서비스 초기화 실패', error);
        });
    }

    private async initializeServices() {
        const [backupModule, dataModule, searchModule] = await Promise.all([
            import('./services/ChannelBackupService'),
            import('./services/ChannelDataService'),
            import('./services/ChannelSearchService')
        ]);

        ChannelBackupService = (backupModule as any).ChannelBackupService || backupModule;
        ChannelDataService = (dataModule as any).ChannelDataService || dataModule;
        ChannelSearchService = (searchModule as any).ChannelSearchService || searchModule;

        this.dataService = new ChannelDataService();
        this.backupService = new ChannelBackupService();
        this.searchService = new ChannelSearchService();
    }

    private async waitForServices() {
        // Wait until services are initialized
        while (!this.dataService || !this.backupService || !this.searchService) {
            // Log warning only on first few attempts to avoid spam
            if (this.initializationWarningCount < 3) {
                this.initializationWarningCount++;
                ServerLogger.warn(`⏳ ChannelAnalysisService: Waiting for services to initialize (attempt ${this.initializationWarningCount})`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Reset counter once services are ready
        if (this.initializationWarningCount > 0) {
            ServerLogger.info('✅ ChannelAnalysisService: All services initialized successfully');
            this.initializationWarningCount = 0;
        }
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

            // 🎯 EARLY DUPLICATE CHECK - Save resources by checking before processing
            const isDuplicate = await DuplicateChecker.checkChannel(channelData.channelId);
            if (isDuplicate) {
                const existingChannel = await DuplicateChecker.getExistingChannel(channelData.channelId);
                ServerLogger.warn(`⚠️ 중복 분석 차단: ${channelData.name} (${channelData.channelId})`);
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

            // 🎯 EARLY DUPLICATE CHECK - Save resources by checking before processing
            const isDuplicate = await DuplicateChecker.checkChannel(channelData.channelId);
            if (isDuplicate) {
                const existingChannel = await DuplicateChecker.getExistingChannel(channelData.channelId);
                ServerLogger.warn(`⚠️ 중복 분석 차단: ${channelData.name} (${channelData.channelId})`);
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
                publishedAt: channelData.publishedAt ? (typeof channelData.publishedAt === 'object' && channelData.publishedAt && 'toISOString' in channelData.publishedAt ? (channelData.publishedAt as Date).toISOString() : String(channelData.publishedAt)) : undefined,

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

                // 상세 분석 정보 (개별 필드별로 undefined 체크)
                ...(channelData.dailyUploadRate !== undefined && { dailyUploadRate: channelData.dailyUploadRate }),
                ...(channelData.last7DaysViews !== undefined && { last7DaysViews: channelData.last7DaysViews }),
                ...(channelData.avgDurationSeconds !== undefined && { avgDurationSeconds: channelData.avgDurationSeconds }),
                ...(channelData.avgDurationFormatted !== undefined && { avgDurationFormatted: channelData.avgDurationFormatted }),
                ...(channelData.shortFormRatio !== undefined && { shortFormRatio: channelData.shortFormRatio }),
                ...(channelData.viewsByPeriod !== undefined && { viewsByPeriod: channelData.viewsByPeriod }),
                ...(channelData.totalVideos !== undefined && { totalVideos: channelData.totalVideos }),
                ...(channelData.totalViews !== undefined && { totalViews: channelData.totalViews }),
                ...(channelData.averageViewsPerVideo !== undefined && { averageViewsPerVideo: channelData.averageViewsPerVideo }),
                ...(channelData.uploadFrequency !== undefined && { uploadFrequency: channelData.uploadFrequency }),
                ...(channelData.mostViewedVideo !== undefined && { mostViewedVideo: channelData.mostViewedVideo }),
                ...(channelData.lastAnalyzedAt !== undefined && { lastAnalyzedAt: channelData.lastAnalyzedAt }),
                ...(channelData.analysisVersion !== undefined && { analysisVersion: channelData.analysisVersion }),

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
                    ? String(savedChannel.contentStyle).substring(0, 50) + '...'
                    : '',
                uniqueFeatures: savedChannel.uniqueFeatures,
                channelPersonality: savedChannel.channelPersonality,
            });

            // ✅ Channel saved successfully - simplified without old duplicate check system
            ServerLogger.success(`✅ 채널 저장 완료: ${savedChannel.name}`);

            // 백업 파일은 비동기로 업데이트 (성능 최적화)
            if (this.backupService) {
            this.backupService.saveChannelsAsync();
        }

            // Convert IChannel to ChannelData by manually mapping each field
            const result = {
                channelId: savedChannel.channelId,
                name: savedChannel.name,
                url: savedChannel.url,
                platform: savedChannel.platform,
                subscribers: savedChannel.subscribers,
                description: savedChannel.description || '',
                thumbnailUrl: savedChannel.thumbnailUrl || '',
                customUrl: savedChannel.customUrl || '',
                publishedAt: savedChannel.publishedAt ? (savedChannel.publishedAt instanceof Date ? savedChannel.publishedAt.toISOString() : String(savedChannel.publishedAt)) : undefined,
                defaultLanguage: savedChannel.defaultLanguage || '',
                country: savedChannel.country || '',
                contentType: savedChannel.contentType || 'auto',
                keywords: savedChannel.keywords,
                aiTags: savedChannel.aiTags,
                deepInsightTags: savedChannel.deepInsightTags,
                allTags: savedChannel.allTags,
                targetAudience: savedChannel.targetAudience,
                contentStyle: savedChannel.contentStyle,
                uniqueFeatures: savedChannel.uniqueFeatures,
                channelPersonality: savedChannel.channelPersonality,
                clusterIds: savedChannel.clusterIds,
                suggestedClusters: savedChannel.suggestedClusters,
                totalViews: savedChannel.totalViews,
                totalVideos: savedChannel.totalVideos,
                averageViewsPerVideo: savedChannel.averageViewsPerVideo,
                last7DaysViews: savedChannel.last7DaysViews,
                uploadFrequency: savedChannel.uploadFrequency,
                mostViewedVideo: savedChannel.mostViewedVideo,
                categoryInfo: savedChannel.categoryInfo,
                analysisStatus: savedChannel.analysisStatus,
                lastAnalyzedAt: savedChannel.lastAnalyzedAt ? savedChannel.lastAnalyzedAt.toISOString() : undefined,
                clusterId: savedChannel.clusterId,
                clusterScore: savedChannel.clusterScore,
                status: savedChannel.status,
                createdAt: savedChannel.createdAt.toISOString(),
                updatedAt: savedChannel.updatedAt.toISOString(),
                collectedAt: savedChannel.createdAt.toISOString(),
                version: (savedChannel as any).version || 1
            } as any as ChannelData;

            return result;
        } catch (error) {
            ServerLogger.error('❌ 채널 저장 실패', error);
            throw error;
        }
    }

    // =================================================================
    // 🔍 검색 및 조회 메서드들 (ChannelDataService 위임)
    // =================================================================

    async findById(channelId: any) {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.findById(channelId);
    }

    async findByName(name: any) {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.findByName(name);
    }

    async findByTag(tag: any) {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.findByTag(tag);
    }

    async getAll() {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.getAll();
    }

    async getRecent(limit: any = 20) {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.getRecent(limit);
    }

    async getUnclustered() {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.getUnclustered();
    }

    async getTotalCount() {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.getTotalCount();
    }

    async getUnclusteredCount() {
        if (!this.dataService) {
            await this.waitForServices();
        }
        return await this.dataService.getUnclusteredCount();
    }

    async delete(channelId: any) {
        if (!this.dataService) {
            await this.waitForServices();
        }
        const result = await this.dataService.delete(channelId);
        if (result) {
            if (this.backupService) {
                if (this.backupService) {
            this.backupService.saveChannelsAsync();
        }
            }
        }
        return result;
    }

    async assignToCluster(channelId: any, clusterId: any) {
        if (!this.dataService) {
            await this.waitForServices();
        }
        const result = await this.dataService.assignToCluster(
            channelId,
            clusterId,
        );
        if (this.backupService) {
            this.backupService.saveChannelsAsync();
        }
        return result;
    }

    async removeFromCluster(channelId: any, clusterId: any) {
        if (!this.dataService) {
            await this.waitForServices();
        }
        const result = await this.dataService.removeFromCluster(
            channelId,
            clusterId,
        );
        if (this.backupService) {
            this.backupService.saveChannelsAsync();
        }
        return result;
    }

    // =================================================================
    // 📊 통계 및 고급 검색 (ChannelSearchService 위임)
    // =================================================================

    async getKeywordStatistics() {
        if (!this.searchService) {
            await this.waitForServices();
        }
        return await this.searchService.getKeywordStatistics();
    }

    async getPlatformStatistics() {
        if (!this.searchService) {
            await this.waitForServices();
        }
        return await this.searchService.getPlatformStatistics();
    }

    async search(filters: any = {}) {
        if (!this.searchService) {
            await this.waitForServices();
        }
        return await this.searchService.search(filters);
    }

    async fillMissingChannelInfo() {
        if (!this.searchService) {
            await this.waitForServices();
        }
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
        if (!this.searchService) {
            await this.waitForServices();
        }
        return await this.searchService.getChannelCompletionStats();
    }

    // =================================================================
    // 🔄 백업 관련 메서드들 (ChannelBackupService 위임)
    // =================================================================

    async syncBackupFile() {
        if (!this.backupService) {
            await this.waitForServices();
        }
        return await this.backupService.syncBackupFile();
    }

    async saveChannels() {
        if (!this.backupService) {
            await this.waitForServices();
        }
        return await this.backupService.saveChannels();
    }

    async loadChannels() {
        if (!this.backupService) {
            await this.waitForServices();
        }
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
export = module.exports;
