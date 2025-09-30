import axios from 'axios';
import { ServerLogger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import MultiKeyManager from '../../utils/multi-key-manager';
import UsageTracker from '../../utils/usage-tracker';
import * as serviceRegistry from '../../utils/service-registry';
import { getInstance as getApiKeyManager } from '../../services/ApiKeyManager';

// Type definitions
interface CollectionConfig {
    daysBack?: number;
    minViews?: number;
    maxResultsPerSearch?: number;
    batchSize?: number;
    startDate?: string;
    endDate?: string;
}

interface CollectionResults {
    totalChannels: number;
    processedChannels: number;
    totalVideos: number;
    trendingVideos: number;
    quotaUsed: number;
    errors: Array<{ channelId: string; error: string }>;
    videos: Array<{
        channelId: string;
        videos: any[];
        totalVideos: number;
        trendingVideos: number;
    }>;
}

interface ChannelResult {
    channelId?: string;
    totalVideos: number;
    trendingVideos: number;
    videos: any[];
    quotaUsed?: number;
}

interface SearchResult {
    results: any[];
    quotaUsed: number;
}

interface VideoStatsResult {
    videos: any[];
    quotaUsed: number;
}

interface QuotaStatus {
    used: number;
    limit: number;
    remaining: number;
    usagePercent: string;
    keyCount: number;
    allKeys: any[];
    activeKeyCount: number;
    gemini: {
        pro: {
            used: number;
            limit: number;
            remaining: number;
            usagePercent: number;
        };
        flash: {
            used: number;
            limit: number;
            remaining: number;
            usagePercent: number;
        };
        flashLite: {
            used: number;
            limit: number;
            remaining: number;
            usagePercent: number;
        };
        total: {
            used: number;
            quota: number;
            percentage: number;
        };
    };
}

interface ActiveKey {
    name: string;
    apiKey: string;
}

/**
 * YouTube 채널별 고조회수 영상 수집기
 * 최근 2-3일 내의 조회수 높은 영상들만 효율적으로 수집
 */
class HighViewCollector {
    private queueFilePath: string;
    private statsFilePath: string;
    private multiKeyManager: any;
    private usageTracker: any;
    private _initialized: boolean;
    private defaultConfig: CollectionConfig;

    constructor() {
        this.queueFilePath = path.join(__dirname, '../config/trending_channels_queue.json');
        this.statsFilePath = path.join(__dirname, '../config/trending_collection_stats.json');

        this.multiKeyManager = null;
        this.usageTracker = UsageTracker.getInstance();
        this._initialized = false;

        // 기본 설정 (사용자가 오버라이드 가능)
        this.defaultConfig = {
            daysBack: 7,           // 기본 7일 (사용자 설정 가능)
            minViews: 10000,       // 기본 1만 조회수 (사용자 설정 가능)
            maxResultsPerSearch: 50,
            batchSize: 50
        };

        // 서비스 레지스트리에 등록
        if (serviceRegistry && typeof (serviceRegistry as any).register === 'function') {
            (serviceRegistry as any).register(this);
        }
    }

    /**
     * 비동기 초기화
     */
    async initialize(): Promise<HighViewCollector> {
        if (this._initialized) return this;

        try {
            this.multiKeyManager = await MultiKeyManager.getInstance();
            this._initialized = true;
            ServerLogger.info(`📊 HighViewCollector 초기화 완료 - ${this.multiKeyManager.keys.length}개 API 키 로드됨`);
            return this;
        } catch (error) {
            ServerLogger.error('HighViewCollector 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 채널 목록에서 트렌딩 영상 수집 시작
     * @param channelIds - 채널 ID 배열
     * @param options - 수집 옵션
     */
    async collectFromChannels(channelIds: string[], options: CollectionConfig = {}): Promise<CollectionResults> {
        const config = { ...this.defaultConfig, ...options };
        const startTime = Date.now();

        ServerLogger.info(`🚀 채널별 고조회수 영상 수집 시작 - ${channelIds.length}개 채널`);

        const results: CollectionResults = {
            totalChannels: channelIds.length,
            processedChannels: 0,
            totalVideos: 0,
            trendingVideos: 0,
            quotaUsed: 0,
            errors: [],
            videos: [] // 수집된 비디오 데이터 저장용
        };

        // 날짜 범위 설정 - 사용자가 직접 지정 가능
        let startDate: Date, endDate: Date;

        if (options.startDate && options.endDate) {
            // 사용자가 날짜 직접 지정
            startDate = new Date(options.startDate);
            endDate = new Date(options.endDate);
            ServerLogger.info(`📅 사용자 지정 기간: ${options.startDate} ~ ${options.endDate}`);
        } else if (options.daysBack) {
            // 며칠 전까지로 지정
            endDate = new Date();
            startDate = new Date(endDate.getTime() - (config.daysBack! * 24 * 60 * 60 * 1000));
            ServerLogger.info(`📅 최근 ${config.daysBack}일: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`);
        } else {
            // 기본값 사용
            endDate = new Date();
            startDate = new Date(endDate.getTime() - (config.daysBack! * 24 * 60 * 60 * 1000));
            ServerLogger.info(`📅 기본 설정 ${config.daysBack}일: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`);
        }

        const publishedAfter = startDate.toISOString();
        const publishedBefore = endDate.toISOString();

        ServerLogger.info(`⚙️ 설정: 최소 조회수 ${config.minViews!.toLocaleString()}회 이상`);

        for (const channelId of channelIds) {
            try {
                // 사용 가능한 API 키 확인
                try {
                    const availableKey = this.multiKeyManager.getAvailableKey();
                    if (!availableKey) {
                        throw new Error('모든 API 키 할당량 소진');
                    }
                } catch (error: any) {
                    ServerLogger.warn(`⚠️ ${error.message} - 수집 중단`);
                    break;
                }

                const channelResult = await this.collectChannelTrending(
                    channelId,
                    publishedAfter,
                    publishedBefore,
                    config
                );

                results.processedChannels++;
                results.totalVideos += channelResult.totalVideos;
                results.trendingVideos += channelResult.trendingVideos;
                results.quotaUsed = channelResult.quotaUsed || 0;

                // 채널별 비디오 데이터를 결과에 추가
                if (channelResult.videos && channelResult.videos.length > 0) {
                    results.videos.push({
                        channelId: channelId,
                        videos: channelResult.videos,
                        totalVideos: channelResult.totalVideos,
                        trendingVideos: channelResult.trendingVideos
                    });
                }

                ServerLogger.info(`✅ ${channelId}: ${channelResult.trendingVideos}/${channelResult.totalVideos}개 고조회수`);

            } catch (error: any) {
                ServerLogger.error(`❌ ${channelId} 수집 실패:`, error.message);
                results.errors.push({ channelId, error: error.message });
            }

            // 요청 간 딜레이 (API 제한 방지)
            await this.delay(100);
        }

        const totalTime = Date.now() - startTime;
        ServerLogger.info(`🏁 고조회수 영상 수집 완료: ${results.trendingVideos}개 영상 (${(totalTime/1000).toFixed(1)}초)`);
        ServerLogger.info(`📊 API quota 사용: ${results.quotaUsed} units`);

        // 멀티키 매니저 사용량 현황 로그
        this.multiKeyManager.logUsageStatus();

        // 통계 저장
        await this.saveStats(results, totalTime);

        return results;
    }

    /**
     * 개별 채널에서 고조회수 영상 수집
     */
    async collectChannelTrending(
        channelId: string,
        publishedAfter: string,
        publishedBefore: string,
        config: CollectionConfig
    ): Promise<ChannelResult> {
        let totalQuotaUsed = 0;

        // 1단계: 최신 영상 검색
        const { results: searchResults, quotaUsed: searchQuota } = await this.searchChannelVideos(
            channelId,
            publishedAfter,
            publishedBefore,
            config.maxResultsPerSearch!
        );
        totalQuotaUsed += searchQuota;

        console.log(`🔍 DEBUG: 채널 ${channelId}에서 검색된 영상 수: ${searchResults.length}개`);
        if (searchResults.length === 0) {
            console.log(`❌ DEBUG: 채널 ${channelId}에서 검색된 영상이 없습니다 (기간: ${publishedAfter} ~ ${publishedBefore})`);
            return { totalVideos: 0, trendingVideos: 0, videos: [] };
        }

        // 2단계: 영상 상세 정보 배치 조회
        const { videos: videosWithStats, quotaUsed: videosQuota } = await this.getVideoStatsBatch(searchResults);
        totalQuotaUsed += videosQuota;

        // 3단계: 조회수 필터링
        const trendingVideos = videosWithStats.filter(video => {
            const viewCount = parseInt(video.statistics?.viewCount || 0);
            const isHighView = viewCount >= config.minViews!;
            console.log(`🔍 DEBUG: ${video.snippet?.title || '제목없음'} - 조회수: ${viewCount.toLocaleString()}회 (기준: ${config.minViews!.toLocaleString()}회) - ${isHighView ? '✅ 통과' : '❌ 제외'}`);
            return isHighView;
        });

        ServerLogger.info(`📈 ${channelId}: ${trendingVideos.length}/${videosWithStats.length}개 고조회수 (quota: ${totalQuotaUsed})`);

        return {
            channelId,
            totalVideos: videosWithStats.length,
            trendingVideos: trendingVideos.length,
            videos: trendingVideos,
            quotaUsed: totalQuotaUsed
        };
    }

    /**
     * 채널의 최신 영상 검색 (최적화: playlistItems 사용)
     * search API(100 할당량) → channels + playlistItems(2 할당량) 98% 절약!
     */
    async searchChannelVideos(
        channelId: string,
        publishedAfter: string,
        publishedBefore: string,
        maxResults: number
    ): Promise<SearchResult> {
        // 채널 ID 형식 검증
        if (!this.isValidChannelId(channelId)) {
            ServerLogger.error(`❌ 잘못된 채널 ID 형식: "${channelId}" - YouTube 채널 ID는 'UC'로 시작하는 24자 문자열이어야 합니다`);
            throw new Error(`잘못된 채널 ID 형식: ${channelId}`);
        }

        let attempts = 0;
        const maxAttempts = this.multiKeyManager.keys.length;
        let totalQuotaUsed = 0;

        while (attempts < maxAttempts) {
            try {
                const availableKey = this.multiKeyManager.getAvailableKey();

                // 1단계: channels API로 uploads 플레이리스트 ID 가져오기 (1 할당량)
                const channelsResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                    params: {
                        part: 'contentDetails',
                        id: channelId,
                        key: availableKey.key
                    }
                });

                this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);
                totalQuotaUsed += 1;

                if (!channelsResponse.data.items || channelsResponse.data.items.length === 0) {
                    throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
                }

                const uploadsPlaylistId = channelsResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
                if (!uploadsPlaylistId) {
                    throw new Error(`uploads 플레이리스트를 찾을 수 없습니다: ${channelId}`);
                }

                // 2단계: playlistItems API로 최신 영상 목록 가져오기 (1 할당량)
                const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
                    params: {
                        part: 'snippet',
                        playlistId: uploadsPlaylistId,
                        maxResults: maxResults,
                        key: availableKey.key
                    }
                });

                this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', true);
                totalQuotaUsed += 1;

                ServerLogger.info(`🚀 최적화된 API 호출 성공: ${channelId} (키: ${availableKey.name}, 할당량: 2)`);

                const items = playlistResponse.data.items || [];

                // 날짜 필터링 (publishedAfter, publishedBefore 적용)
                const startDate = new Date(publishedAfter);
                const endDate = new Date(publishedBefore);

                const filteredItems = items.filter((item: any) => {
                    const publishedDate = new Date(item.snippet.publishedAt);
                    return publishedDate >= startDate && publishedDate <= endDate;
                });

                console.log(`🔍 DEBUG: playlistItems API 응답 - ${items.length}개 → 날짜 필터 후 ${filteredItems.length}개`);
                console.log(`🔍 DEBUG: 검색 조건 - 채널: ${channelId}, 기간: ${publishedAfter} ~ ${publishedBefore}`);

                // playlistItems 응답을 search API 형태로 변환
                const formattedItems = filteredItems.map((item: any) => ({
                    id: {
                        videoId: item.snippet.resourceId.videoId
                    },
                    snippet: {
                        title: item.snippet.title,
                        description: item.snippet.description,
                        publishedAt: item.snippet.publishedAt,
                        thumbnails: item.snippet.thumbnails,
                        channelId: item.snippet.channelId,
                        channelTitle: item.snippet.channelTitle
                    }
                }));

                // 첫 번째 몇 개 영상의 기본 정보 로깅
                formattedItems.slice(0, 3).forEach((item: any, index: number) => {
                    console.log(`🔍 DEBUG: [${index + 1}] ${item.snippet?.title || '제목없음'} (${item.snippet?.publishedAt})`);
                });

                return {
                    results: formattedItems,
                    quotaUsed: totalQuotaUsed // 2 할당량 (98% 절약!)
                };

            } catch (error: any) {
                attempts++;

                if (error.response?.status === 403) {
                    // Quota 초과 - 현재 키를 실패로 마킹하고 다음 키 시도
                    const availableKey = this.multiKeyManager.getAvailableKey();
                    this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', false);
                    ServerLogger.warn(`⚠️ API Key ${availableKey.name} quota 초과 - 다음 키로 전환 시도 (${attempts}/${maxAttempts})`);
                    continue;
                } else {
                    // 다른 에러는 즉시 실패
                    throw new Error(`최적화된 API 오류: ${error.message}`);
                }
            }
        }

        // 모든 키 시도 후 실패
        throw new Error('🚨 모든 YouTube API 키의 할당량이 소진되었습니다');
    }

    /**
     * 영상들의 상세 통계 배치 조회
     */
    async getVideoStatsBatch(videoItems: any[]): Promise<VideoStatsResult> {
        if (videoItems.length === 0) return { videos: [], quotaUsed: 0 };

        const videoIds = videoItems.map(item => item.id.videoId).join(',');
        let attempts = 0;
        const maxAttempts = this.multiKeyManager.keys.length;

        while (attempts < maxAttempts) {
            try {
                const availableKey = this.multiKeyManager.getAvailableKey();

                const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        part: 'statistics,snippet,contentDetails',
                        id: videoIds,
                        key: availableKey.key
                    }
                });

                // 성공시 사용량 추적
                this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', true);
                ServerLogger.info(`📊 Videos API 호출 성공: ${videoItems.length}개 영상 (키: ${availableKey.name})`);

                const videosWithStats = response.data.items || [];

                // 조회수 로그 (디버그용)
                videosWithStats.forEach((video: any) => {
                    const viewCount = parseInt(video.statistics?.viewCount || 0);
                    const title = video.snippet?.title?.substring(0, 30) || 'Untitled';
                    ServerLogger.info(`  📹 ${title}... | 조회수: ${viewCount.toLocaleString()}`);
                });

                return {
                    videos: videosWithStats,
                    quotaUsed: 1
                };

            } catch (error: any) {
                attempts++;

                if (error.response?.status === 403) {
                    // Quota 초과 - 현재 키를 실패로 마킹하고 다음 키 시도
                    const availableKey = this.multiKeyManager.getAvailableKey();
                    this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', false);
                    ServerLogger.warn(`⚠️ API Key ${availableKey.name} quota 초과 - 다음 키로 전환 시도 (${attempts}/${maxAttempts})`);
                    continue;
                } else {
                    // 다른 에러는 즉시 실패
                    throw new Error(`Videos API 오류: ${error.message}`);
                }
            }
        }

        // 모든 키 시도 후 실패
        throw new Error('🚨 모든 YouTube API 키의 할당량이 소진되었습니다');
    }

    /**
     * 수집 통계 저장
     */
    async saveStats(results: CollectionResults, processingTime: number): Promise<void> {
        const stats = {
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            ...results,
            processingTimeMs: processingTime,
            processingTimeSeconds: (processingTime / 1000).toFixed(1),
            avgTimePerChannel: results.processedChannels > 0 ? (processingTime / results.processedChannels).toFixed(0) : 0,
            trendingRate: results.totalVideos > 0 ? ((results.trendingVideos / results.totalVideos) * 100).toFixed(1) : 0,
            quotaEfficiency: results.quotaUsed > 0 ? (results.trendingVideos / results.quotaUsed).toFixed(2) : 0
        };

        try {
            // 기존 통계 읽기
            let allStats: any[] = [];
            try {
                const existingData = await fs.readFile(this.statsFilePath, 'utf8');
                allStats = JSON.parse(existingData);
            } catch (error) {
                // 파일이 없으면 새로 생성
            }

            // 새 통계 추가 (최근 30개만 유지)
            allStats.push(stats);
            if (allStats.length > 30) {
                allStats = allStats.slice(-30);
            }

            await fs.writeFile(this.statsFilePath, JSON.stringify(allStats, null, 2));
            ServerLogger.info(`💾 수집 통계 저장: ${stats.trendingRate}% 고조회수율, quota 효율성: ${stats.quotaEfficiency}`);

        } catch (error) {
            ServerLogger.error('통계 저장 실패:', error);
        }
    }

    /**
     * Quota 일일 리셋 (호환성을 위해 유지)
     * 실제 quota 관리는 MultiKeyManager가 담당
     */
    resetQuotaDaily(): void {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        ServerLogger.info(`⏰ Quota는 MultiKeyManager가 관리 중 - 다음 리셋: ${tomorrow.toLocaleString()}`);
    }

    /**
     * 활성화된 API 키 목록 조회 (MultiKeyManager 실시간 상태 기반)
     */
    getActiveKeys(): ActiveKey[] {
        // MultiKeyManager가 현재 사용 가능하다고 판단하는 키들만 반환
        try {
            const activeKeys: ActiveKey[] = [];

            for (const keyInfo of this.multiKeyManager.keys) {
                const keyData = this.multiKeyManager.trackers.get(keyInfo.key);

                // 키가 할당량 초과 여부를 확인하여 활성 상태 결정
                if (keyData && !keyData.tracker.isYouTubeQuotaExceeded()) {
                    activeKeys.push({
                        name: keyInfo.name,
                        apiKey: keyInfo.key
                    });
                }
            }

            return activeKeys;
        } catch (error: any) {
            ServerLogger.warn('활성 키 조회 실패', error.message, 'HIGH-VIEW-COLLECTOR');
            return [];
        }
    }

    /**
     * 현재 quota 사용 현황 (MultiKeyManager 기반)
     */
    async getQuotaStatus(): Promise<QuotaStatus> {
        try {
            const allStatus = this.multiKeyManager.getAllUsageStatus();

            // ApiKeyManager에서 실제 키 정보 가져오기 (안전한 호출)
            const ApiKeyManager = getApiKeyManager();
            let allApiKeys: any[] = [];
            try {
                await ApiKeyManager.initialize();
                allApiKeys = await ApiKeyManager.getAllApiKeys();
            } catch (error: any) {
                ServerLogger.warn('ApiKeyManager 호출 실패, 기본 정보만 사용', error.message, 'HIGH-VIEW-COLLECTOR');
            }

            // allStatus에 실제 키 ID와 상태 정보 추가
            const enrichedStatus = allStatus.map((status: any, index: number) => {
                // API 키 값으로 실제 키 정보 찾기
                const keyInfo = this.multiKeyManager.keys[index];
                const apiKeyData = allApiKeys.find(k => k.apiKey === keyInfo.key);

                return {
                    ...status,
                    id: apiKeyData ? apiKeyData.id : `key-${index}`, // 실제 ID 또는 fallback
                    apiKey: keyInfo.key, // API 키도 포함
                    realStatus: apiKeyData ? apiKeyData.status : 'active' // 실제 파일 상태
                };
            });

            // 활성화된 키 API 값들 가져오기
            const activeKeys = this.getActiveKeys();
            const activeApiKeys = activeKeys.map(key => key.apiKey);

            // MultiKeyManager 키들 중 활성화된 것만 필터링
            const activeKeyInfos = this.multiKeyManager.keys.filter((keyInfo: any) =>
                activeApiKeys.includes(keyInfo.key)
            );

            // 활성화된 키에 해당하는 상태만 필터링
            const activeStatus = enrichedStatus.filter((status: any, index: number) =>
                activeKeyInfos.some((keyInfo: any) => keyInfo.name === status.name)
            );

            // 활성화된 키가 없으면 첫 번째 키만 사용 (환경변수 기본키)
            const statusToSum = activeStatus.length > 0 ? activeStatus : [enrichedStatus[0]].filter(Boolean);

            let totalUsed = 0;
            let totalLimit = 0;

            statusToSum.forEach((status: any) => {
                const usage = status.usage.split('/');
                totalUsed += parseInt(usage[0]);
                totalLimit += parseInt(usage[1]);
            });

            // Gemini API 사용량 정보 추가
            const usageTracker = this.usageTracker; // 기존 인스턴스 사용
            const geminiStats = usageTracker.getUsageStats();

            console.log('🔍 [SERVER] Gemini Stats:', JSON.stringify(geminiStats, null, 2));

            return {
                used: totalUsed,
                limit: totalLimit,
                remaining: totalLimit - totalUsed,
                usagePercent: totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : '0',
                keyCount: enrichedStatus.length,
                allKeys: enrichedStatus.map((status: any) => ({
                    ...status,
                    realStatus: status.realStatus // realStatus 필드가 확실히 포함되도록 명시
                })),
                activeKeyCount: statusToSum.length,

                // Gemini API 상태 정보 추가
                gemini: {
                    pro: {
                        used: geminiStats.pro.used,
                        limit: geminiStats.pro.quota,
                        remaining: geminiStats.pro.remaining,
                        usagePercent: geminiStats.pro.percentage
                    },
                    flash: {
                        used: geminiStats.flash.used,
                        limit: geminiStats.flash.quota,
                        remaining: geminiStats.flash.remaining,
                        usagePercent: geminiStats.flash.percentage
                    },
                    flashLite: {
                        used: geminiStats.flashLite.used,
                        limit: geminiStats.flashLite.quota,
                        remaining: geminiStats.flashLite.remaining,
                        usagePercent: geminiStats.flashLite.percentage
                    },
                    total: {
                        used: geminiStats.total.used,
                        quota: geminiStats.total.quota,
                        percentage: geminiStats.total.percentage
                    }
                }
            };

        } catch (error: any) {
            ServerLogger.error('getQuotaStatus 실행 중 오류 발생', error, 'HIGH-VIEW-COLLECTOR');

            // 안전한 fallback 응답 반환
            return {
                used: 0,
                limit: 8000,
                remaining: 8000,
                usagePercent: '0',
                keyCount: 0,
                allKeys: [],
                activeKeyCount: 0,
                gemini: {
                    pro: { used: 0, limit: 50, remaining: 50, usagePercent: 0 },
                    flash: { used: 0, limit: 250, remaining: 250, usagePercent: 0 },
                    flashLite: { used: 0, limit: 1000, remaining: 1000, usagePercent: 0 },
                    total: { used: 0, quota: 1300, percentage: 0 }
                }
            };
        }
    }

    /**
     * 수집 통계 조회
     */
    async getStats(): Promise<any[]> {
        try {
            const data = await fs.readFile(this.statsFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    /**
     * YouTube 채널 ID 형식 검증
     * @param channelId - 검증할 채널 ID
     * @returns 유효한 채널 ID인지 여부
     */
    isValidChannelId(channelId: string): boolean {
        // YouTube 채널 ID는 'UC'로 시작하고 24자 길이여야 함
        const youtubeChannelIdRegex = /^UC[a-zA-Z0-9_-]{22}$/;
        return youtubeChannelIdRegex.test(channelId);
    }

    /**
     * 딜레이 함수
     */
    delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // API 키 캐시 클리어 (파일 변경 시 호출)
    clearApiKeyCache(): void {
        this.multiKeyManager = null;
        this._initialized = false;
        ServerLogger.info('🔄 HighViewCollector API 키 캐시 클리어 - MultiKeyManager 재초기화 필요', null, 'HIGH-VIEW-COLLECTOR');
    }
}

export default HighViewCollector;
module.exports = HighViewCollector;