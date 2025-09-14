const { ServerLogger } = require('../../utils/logger');
const TagExtractor = require('./TagExtractor');
const SimilarityCalculator = require('./SimilarityCalculator');
const ChannelAnalysisService = require('./ChannelAnalysisService');
const ClusterModel = require('./ClusterModel');

/**
 * 📊 채널 클러스터 관리자
 * 채널 수집, 태깅, 클러스터링의 핵심 로직
 */
class ClusterManager {
    constructor() {
        this.tagExtractor = new TagExtractor();
        this.similarityCalculator = new SimilarityCalculator();

        // 캐시
        this.channelCache = new Map();
        this.clusterCache = new Map();

        ServerLogger.info('🎯 ClusterManager 초기화');
    }

    /**
     * 🚀 시스템 초기화
     */
    async initialize() {
        try {
            // 기존 데이터 로드
            await this.loadExistingData();

            ServerLogger.success('✅ 클러스터 매니저 초기화 완료');
        } catch (error) {
            ServerLogger.error('❌ 클러스터 매니저 초기화 실패', error);
            throw error;
        }
    }

    /**
     * 📊 채널 수집 (기존 "채널 분석" 버튼 재활용)
     */
    async collectChannel(
        channelData,
        userKeywords = [],
        contentType = 'longform',
    ) {
        try {
            ServerLogger.info('📊 채널 수집 시작', { name: channelData.name });

            // 1. 기본 채널 정보 저장
            ServerLogger.info('🔧 STEP 1: saveChannelInfo 시작', {
                name: channelData.name,
            });
            const channel = await this.saveChannelInfo(channelData);
            ServerLogger.info('✅ STEP 1 완룈: saveChannelInfo', {
                channelId: channel.channelId,
            });

            // 2. AI 태그 추출 (보조 기능)
            ServerLogger.info('🔧 STEP 2: AI 태그 추출 시작');
            const aiTags = await this.tagExtractor.extractFromChannel(
                channel,
                contentType,
            );
            ServerLogger.info('✅ STEP 2 완료: AI 태그 추출', {
                aiTags,
                type: typeof aiTags,
            });

            // 3. 사용자 키워드 + AI 태그 결합
            ServerLogger.info('🔧 STEP 3: 키워드 결합 시작', {
                userKeywords,
                aiTags,
            });
            const allTags = this.combineKeywords(userKeywords, aiTags);
            ServerLogger.info('✅ STEP 3 완료: 키워드 결합', { allTags });

            // 4. 기존 클러스터에 맞는지 확인
            ServerLogger.info('🔧 STEP 4: 클러스터 검색 시작', { allTags });
            const clusterSuggestions = await this.findSuitableClusters(allTags);
            ServerLogger.info('✅ STEP 4 완료: 클러스터 검색', {
                suggestionCount: clusterSuggestions.length,
            });

            // 5. 채널 저장
            const savedChannel = await ChannelAnalysisService.createOrUpdate({
                ...channel,
                keywords: userKeywords,
                aiTags: aiTags,
                allTags: allTags,
                contentType: contentType,
                collectedAt: new Date(),
            });

            ServerLogger.success('✅ 채널 수집 완료', {
                channelId: savedChannel.id,
                keywords: userKeywords.length,
                suggestions: clusterSuggestions.length,
            });

            return {
                success: true,
                channel: savedChannel,
                clusterSuggestions,
                stats: {
                    userKeywords: userKeywords.length,
                    aiTags: aiTags.length,
                    totalTags: allTags.length,
                },
            };
        } catch (error) {
            ServerLogger.error('❌ 채널 수집 실패', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * 🏷️ 키워드와 AI 태그 결합
     */
    combineKeywords(userKeywords, aiTags) {
        // 입력값 검증
        const validUserKeywords = Array.isArray(userKeywords)
            ? userKeywords
            : [];
        const validAiTags = Array.isArray(aiTags) ? aiTags : [];

        // 사용자 키워드 우선, AI 태그로 보완
        const combined = [
            ...new Set([
                ...validUserKeywords, // 사용자 키워드가 최우선
                ...validAiTags.slice(0, 5), // AI 태그는 상위 5개만
            ]),
        ];

        return combined;
    }

    /**
     * 🎯 적합한 클러스터 찾기
     */
    async findSuitableClusters(tags) {
        const existingClusters = await ClusterModel.getAllActive();
        const suggestions = [];

        for (const cluster of existingClusters) {
            const similarity = this.similarityCalculator.calculateTagSimilarity(
                tags,
                cluster.commonTags,
            );

            if (similarity > 0.5) {
                // 50% 이상 유사하면 추천
                suggestions.push({
                    cluster,
                    similarity,
                    reason: this.generateSuggestionReason(
                        tags,
                        cluster.commonTags,
                    ),
                });
            }
        }

        // 유사도 순으로 정렬
        suggestions.sort((a, b) => b.similarity - a.similarity);

        return suggestions.slice(0, 3); // 상위 3개만
    }

    /**
     * 💡 추천 이유 생성
     */
    generateSuggestionReason(newTags, clusterTags) {
        const common = newTags.filter((tag) => clusterTags.includes(tag));
        return `공통 태그: ${common.join(', ')}`;
    }

    /**
     * 🔍 빠른 키워드 제안 (자주 사용한 키워드)
     */
    async getRecentKeywords(limit = 10) {
        try {
            const recentChannels = await ChannelAnalysisService.getRecent(50);
            const keywordFreq = new Map();

            // 빈도 계산
            recentChannels.forEach((channel) => {
                channel.keywords.forEach((keyword) => {
                    keywordFreq.set(
                        keyword,
                        (keywordFreq.get(keyword) || 0) + 1,
                    );
                });
            });

            // 빈도순 정렬
            const sortedKeywords = Array.from(keywordFreq.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([keyword, count]) => ({ keyword, count }));

            return sortedKeywords;
        } catch (error) {
            ServerLogger.error('❌ 최근 키워드 조회 실패', error);
            return [];
        }
    }

    /**
     * 📈 자동 클러스터 생성 제안
     */
    async suggestNewClusters() {
        try {
            const unclusteredChannels =
                await ChannelAnalysisService.getUnclustered();

            if (unclusteredChannels.length < 3) {
                return []; // 최소 3개는 있어야 클러스터 생성
            }

            const clusterSuggestions = await this.groupSimilarChannels(
                unclusteredChannels,
            );

            return clusterSuggestions.map((group) => ({
                suggestedName: this.generateClusterName(group.channels),
                channels: group.channels,
                commonTags: group.commonTags,
                confidence: group.confidence,
            }));
        } catch (error) {
            ServerLogger.error('❌ 클러스터 제안 실패', error);
            return [];
        }
    }

    /**
     * 🏷️ 클러스터 이름 자동 생성
     */
    generateClusterName(channels) {
        // 가장 많이 나타나는 키워드 찾기
        const keywordFreq = new Map();
        channels.forEach((channel) => {
            channel.allTags.forEach((tag) => {
                keywordFreq.set(tag, (keywordFreq.get(tag) || 0) + 1);
            });
        });

        const topKeyword = Array.from(keywordFreq.entries()).sort(
            (a, b) => b[1] - a[1],
        )[0];

        return topKeyword ? `${topKeyword[0]} 채널들` : '새 그룹';
    }

    /**
     * 📊 통계 조회
     */
    async getStatistics() {
        try {
            const [totalChannels, totalClusters, unclusteredCount] =
                await Promise.all([
                    ChannelAnalysisService.getTotalCount(),
                    ClusterModel.getTotalCount(),
                    ChannelAnalysisService.getUnclusteredCount(),
                ]);

            return {
                totalChannels,
                totalClusters,
                unclusteredCount,
                clusteredPercentage: Math.round(
                    ((totalChannels - unclusteredCount) / totalChannels) * 100,
                ),
            };
        } catch (error) {
            ServerLogger.error('❌ 통계 조회 실패', error);
            return null;
        }
    }

    /**
     * 💾 기존 데이터 로드 (캐시 구축)
     */
    async loadExistingData() {
        const channels = await ChannelAnalysisService.getAll();
        const clusters = await ClusterModel.getAll();

        channels.forEach((channel) => {
            this.channelCache.set(channel.channelId, channel);
        });

        clusters.forEach((cluster) => {
            this.clusterCache.set(cluster.id, cluster);
        });

        ServerLogger.info('📚 캐시 로드 완료', {
            channels: this.channelCache.size,
            clusters: this.clusterCache.size,
        });
    }

    /**
     * 💾 채널 기본 정보 저장
     */
    async saveChannelInfo(channelData) {
        const channelInfo = {
            name: channelData.name || channelData.channelTitle,
            url: channelData.url || channelData.channelUrl,
            platform: channelData.platform || 'YOUTUBE',
            subscribers: channelData.subscribers || 0,
            description: channelData.description || '',
            thumbnailUrl: channelData.thumbnailUrl || '',
            customUrl: channelData.customUrl || channelData.youtubeHandle || '',
        };

        // Only set ID if it's already a valid MongoDB ObjectId or YouTube channel ID (UC...)
        const existingId = channelData.channelId || channelData.id;
        if (
            existingId &&
            (existingId.startsWith('UC') || /^[a-f\d]{24}$/i.test(existingId))
        ) {
            channelInfo.id = existingId;
        }
        // Otherwise, let MongoDB generate its own ObjectId

        return channelInfo;
    }

    /**
     * 🔑 채널 ID 생성
     */
    generateChannelId(url) {
        // URL 검증
        if (!url || typeof url !== 'string') {
            return `ch_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
        }

        // URL에서 채널 ID 추출 또는 생성
        if (url.includes('/channel/')) {
            return url.split('/channel/')[1].split('/')[0];
        } else if (url.includes('/@')) {
            return url.split('/@')[1].split('/')[0];
        } else {
            return `ch_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
        }
    }
}

module.exports = ClusterManager;
