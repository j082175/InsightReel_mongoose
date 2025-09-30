import { ServerLogger } from '../../utils/logger';
import { PLATFORMS } from '../../config/api-messages';
import { CONTENT_LIMITS } from '../../config/constants';
import HighViewCollector from './HighViewCollector';
import DurationClassifier from '../../utils/duration-classifier';
import ChannelGroup from '../../models/ChannelGroup';
import TrendingVideo from '../../models/TrendingVideo';
import { YouTubeApiTypeUtils } from '../../types/youtube-api-types';

// Type definitions
interface GroupTrendingOptions {
    daysBack?: number;
    minViews?: number;
    maxViews?: number | null;
    includeShorts?: boolean;
    includeMidform?: boolean;
    includeLongForm?: boolean;
    keywords?: string[];
    excludeKeywords?: string[];
    batchId?: string | null;
    startDate?: string;
    endDate?: string;
}

interface ChannelCollectionOptions extends GroupTrendingOptions {
    channels: string[];
}

interface GroupResult {
    groupId: string;
    groupName: string;
    totalVideos: number;
    savedVideos: number;
    videos: any[];
    quotaUsed?: number;
}

interface AllGroupsResult {
    results: Array<{
        groupId: string;
        groupName: string;
        status: 'success' | 'failed';
        savedVideos: number;
        totalVideos: number;
        quotaUsed?: number;
        error?: string;
    }>;
    totalGroups: number;
    totalVideos: number;
    successGroups: number;
}

interface TrendingVideoData {
    videoId: string;
    title: string;
    url: string;
    platform: string;
    channelName: string;
    channelId: string;
    channelUrl: string;
    groupId: string | null;
    groupName: string;
    batchId: string | null;
    collectionDate: Date;
    collectedFrom: string;
    views: number;
    likes: number;
    commentsCount: number;
    shares: number;
    uploadDate: Date;
    duration: string;
    durationSeconds: number;
    thumbnailUrl: string;
    description: string;
    keywords: string[];
    hashtags: string[];
}

interface TrendingVideoOptions {
    groupId?: string | null;
    groupName?: string;
    collectedFrom?: string;
    keywords?: string[];
    batchId?: string | null;
}

interface CollectionResult {
    totalChannels: number;
    totalVideosFound: number;
    totalVideosSaved: number;
    quotaUsed: number;
    videos: any[];
    stats: {
        byPlatform: {
            YOUTUBE: number;
            INSTAGRAM: number;
            TIKTOK: number;
        };
        byDuration: { [key: string]: number };
        avgViews: number;
        totalViews: number;
    };
}

interface ViewStats {
    avgViews: number;
    totalViews: number;
}

/**
 * 🎯 그룹별 트렌딩 영상 수집기
 * HighViewCollector를 확장하여 그룹 기반 수집 및 TrendingVideo 저장
 */
class GroupTrendingCollector {
    private highViewCollector: any;
    private _initialized: boolean;

    constructor() {
        this.highViewCollector = new HighViewCollector();
        this._initialized = false;
    }

    /**
     * 비동기 초기화
     */
    async initialize(): Promise<GroupTrendingCollector> {
        if (this._initialized) return this;

        try {
            await this.highViewCollector.initialize();
            this._initialized = true;
            return this;
        } catch (error) {
            ServerLogger.error('GroupTrendingCollector 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 특정 그룹의 트렌딩 영상 수집
     * @param groupId - 채널 그룹 ID
     * @param options - 수집 옵션
     */
    async collectGroupTrending(groupId: string, options: GroupTrendingOptions = {}): Promise<GroupResult> {
        try {
            // 그룹 정보 조회
            const group = await ChannelGroup.findById(groupId);
            if (!group) {
                throw new Error(`채널 그룹을 찾을 수 없습니다: ${groupId}`);
            }

            if (group.channels.length === 0) {
                ServerLogger.warn(`⚠️ 그룹 "${group.name}"에 채널이 없습니다`);
                return {
                    groupId,
                    groupName: group.name,
                    totalVideos: 0,
                    savedVideos: 0,
                    videos: []
                };
            }

            ServerLogger.info(`🎯 그룹 "${group.name}" 트렌딩 수집 시작 (${group.channels.length}개 채널)`);

            // HighViewCollector로 영상 수집 (채널 ID만 추출)
            const channelIds = group.channels.map((channel: any) => {
                // 다양한 데이터 구조 지원을 위한 방어적 프로그래밍
                const id = channel.channelId || channel.id || channel;
                console.log(`🔍 DEBUG: 채널 데이터 구조 - 원본:`, channel, `추출된 ID: ${id}`);
                return id;
            }).filter((id: any) => id && id !== 'undefined'); // undefined 값 필터링

            ServerLogger.info(`🔍 추출된 채널 IDs: ${channelIds.join(', ')}`);

            if (channelIds.length === 0) {
                throw new Error(`그룹 "${group.name}"에서 유효한 채널 ID를 찾을 수 없습니다`);
            }

            const results = await this.highViewCollector.collectFromChannels(channelIds, options);

            // 수집된 영상들을 TrendingVideo로 변환 및 저장
            const savedVideos = [];
            let savedCount = 0;
            let duplicateCount = 0;
            let totalFoundCount = 0;

            for (const channelResult of (results.videos || [])) {
                if (channelResult.videos && channelResult.videos.length > 0) {
                    totalFoundCount += channelResult.videos.length;
                    for (const video of channelResult.videos) {
                        try {
                            const trendingVideo = await this.saveTrendingVideo(video, group);
                            if (trendingVideo) {
                                savedVideos.push(trendingVideo);
                                savedCount++;
                            } else {
                                duplicateCount++;
                            }
                        } catch (error: any) {
                            ServerLogger.error(`영상 저장 실패 (${video.id?.videoId || 'unknown'}):`, error.message);
                        }
                    }
                }
            }

            // 그룹의 마지막 수집 시간 업데이트
            await group.updateLastCollected();

            ServerLogger.success(`✅ 그룹 "${group.name}" 수집 완료: ${savedCount}개 새 영상 저장 (${duplicateCount}개 중복 스킵, 총 ${totalFoundCount}개 발견)`);

            return {
                groupId,
                groupName: group.name,
                totalVideos: results.totalVideos || 0,
                savedVideos: savedCount,
                videos: savedVideos,
                quotaUsed: results.quotaUsed || 0
            };

        } catch (error) {
            ServerLogger.error(`❌ 그룹 트렌딩 수집 실패 (${groupId}):`, error);
            throw error;
        }
    }

    /**
     * 모든 활성 그룹의 트렌딩 영상 수집
     * @param options - 수집 옵션
     */
    async collectAllActiveGroups(options: GroupTrendingOptions = {}): Promise<AllGroupsResult> {
        try {
            const activeGroups = await ChannelGroup.findActive();

            if (activeGroups.length === 0) {
                ServerLogger.warn('⚠️ 활성화된 채널 그룹이 없습니다');
                return { results: [], totalGroups: 0, totalVideos: 0, successGroups: 0 };
            }

            ServerLogger.info(`🚀 전체 그룹 트렌딩 수집 시작: ${activeGroups.length}개 그룹`);

            const results = [];
            let totalVideos = 0;

            for (const group of activeGroups) {
                try {
                    const result = await this.collectGroupTrending(String(group._id), options);
                    results.push({
                        groupId: String(group._id),
                        groupName: group.name,
                        status: 'success' as const,
                        savedVideos: result.savedVideos,
                        totalVideos: result.totalVideos,
                        quotaUsed: result.quotaUsed
                    });
                    totalVideos += result.savedVideos;
                } catch (error: any) {
                    ServerLogger.error(`그룹 수집 실패 (${group.name}):`, error.message);
                    results.push({
                        groupId: String(group._id),
                        groupName: group.name,
                        status: 'failed' as const,
                        error: error.message,
                        savedVideos: 0,
                        totalVideos: 0
                    });
                }

                // 그룹 간 딜레이 (API 제한 방지)
                await this.delay(CONTENT_LIMITS.DELAY_BETWEEN_GROUPS);
            }

            ServerLogger.success(`🏁 전체 그룹 수집 완료: ${totalVideos}개 영상`);

            return {
                results,
                totalGroups: activeGroups.length,
                totalVideos,
                successGroups: results.filter(r => r.status === 'success').length
            };

        } catch (error) {
            ServerLogger.error('❌ 전체 그룹 수집 실패:', error);
            throw error;
        }
    }

    /**
     * 공통 TrendingVideo 데이터 생성 팩토리 메서드
     * @param videoData - YouTube API 영상 데이터
     * @param options - 옵션 { groupId, groupName, collectedFrom, keywords, batchId }
     */
    createTrendingVideoData(videoData: any, options: TrendingVideoOptions = {}): TrendingVideoData {
        const {
            groupId = null,
            groupName = '개별 채널 수집',
            collectedFrom = 'individual',
            keywords = [],
            batchId = null
        } = options;

        // 타입 안전한 데이터 추출
        const videoId = YouTubeApiTypeUtils.extractVideoId(videoData);
        const views = YouTubeApiTypeUtils.parseViewCount(videoData);
        const likes = YouTubeApiTypeUtils.parseLikeCount(videoData);
        const commentsCount = YouTubeApiTypeUtils.parseCommentCount(videoData);
        const description = YouTubeApiTypeUtils.extractDescription(videoData, CONTENT_LIMITS.DESCRIPTION_MAX_LENGTH);
        const thumbnailUrl = YouTubeApiTypeUtils.extractThumbnailUrl(videoData);
        const uploadDate = YouTubeApiTypeUtils.parseUploadDate(videoData);

        // Duration 분류
        const durationSeconds = DurationClassifier.parseDuration(videoData.contentDetails?.duration);
        const durationCategory = DurationClassifier.categorizeByDuration(durationSeconds);

        return {
            videoId: videoId || "",
            title: videoData.snippet?.title || '',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            platform: PLATFORMS.YOUTUBE,

            // 채널 정보
            channelName: videoData.snippet?.channelTitle || '',
            channelId: videoData.snippet?.channelId || '',
            channelUrl: `https://www.youtube.com/channel/${videoData.snippet?.channelId || ''}`,

            // 그룹 정보
            groupId: groupId || null,
            groupName: groupName,
            batchId: batchId || null,
            collectionDate: new Date(),
            collectedFrom: collectedFrom,

            // 통계 (타입 안전한 파싱)
            views: views,
            likes: likes,
            commentsCount: commentsCount,
            shares: CONTENT_LIMITS.SHARES_DEFAULT_VALUE,

            // 메타데이터
            uploadDate: uploadDate,
            duration: durationCategory,
            durationSeconds: durationSeconds,
            thumbnailUrl: thumbnailUrl,
            description: description,

            // 키워드 및 태그
            keywords: keywords || [],
            hashtags: [] // 향후 비디오 설명에서 해시태그 추출 로직 추가 예정
        };
    }

    /**
     * YouTube API 영상 데이터를 TrendingVideo로 변환 및 저장
     * @param videoData - YouTube API 영상 데이터
     * @param group - 채널 그룹 정보
     * @param batchId - 배치 ID (선택사항)
     */
    async saveTrendingVideo(videoData: any, group: any, batchId: string | null = null): Promise<any> {
        try {
            // 디버깅: 비디오 데이터 구조 확인
            console.log(`🔍 DEBUG: videoData structure:`, JSON.stringify(videoData, null, 2));

            // 타입 안전한 비디오 ID 추출
            const videoId = YouTubeApiTypeUtils.extractVideoId(videoData);
            if (!videoId) {
                ServerLogger.error('❌ 비디오 ID 추출 실패:', videoData);
                return null;
            }

            console.log(`🔍 DEBUG: extracted videoId: ${videoId}`);

            const existingVideo = await TrendingVideo.findOne({ videoId: videoId });
            if (existingVideo) {
                ServerLogger.warn(`⚠️ 중복 영상 스킵: ${videoData.snippet?.title} (${videoId})`);
                return null; // 이미 존재하는 영상
            }

            // 팩토리 메서드를 사용하여 TrendingVideo 데이터 생성
            const trendingVideoData = this.createTrendingVideoData(videoData, {
                groupId: String(group._id),
                groupName: group.name,
                collectedFrom: 'trending',
                keywords: group.keywords || [],
                batchId: batchId
            });

            const trendingVideo = new TrendingVideo(trendingVideoData);
            const saved = await trendingVideo.save();
            return saved;

        } catch (error) {
            ServerLogger.error('TrendingVideo 저장 실패:', error);
            return null;
        }
    }

    /**
     * 채널 목록에서 직접 트렌딩 영상 수집
     * @param options - 수집 옵션 (channels 배열 포함)
     */
    async collectFromChannels(options: ChannelCollectionOptions): Promise<CollectionResult> {
        try {
            const {
                channels,
                daysBack = 7,
                minViews = 10000,
                maxViews = null,
                includeShorts = true,
                includeMidform = true,
                includeLongForm = true,
                keywords = [],
                excludeKeywords = [],
                batchId = null
            } = options;

            if (!channels || !Array.isArray(channels) || channels.length === 0) {
                throw new Error('채널 목록이 필요합니다');
            }

            ServerLogger.info(`🎯 다중 채널 트렌딩 수집 시작: ${channels.length}개 채널`);

            // 날짜 범위 설정
            console.log('🔍 DEBUG GroupTrendingCollector: daysBack =', daysBack);
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
            const publishedAfter = startDate.toISOString();
            const publishedBefore = endDate.toISOString();
            console.log('🔍 DEBUG GroupTrendingCollector: 계산된 날짜 범위:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

            ServerLogger.info(`📅 수집 기간: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`);

            // HighViewCollector를 사용해서 영상 수집
            const collectorOptions = {
                daysBack,
                minViews,
                maxViews,
                includeShorts,
                includeMidform,
                includeLongForm,
                keywords,
                excludeKeywords
            };

            // 각 채널별로 직접 영상 수집 및 저장
            let savedCount = 0;
            const savedVideos = [];
            let totalQuotaUsed = 0;

            for (const channelId of channels) {
                try {
                    // 개별 채널에서 영상 수집
                    const channelResult = await this.highViewCollector.collectChannelTrending(
                        channelId,
                        publishedAfter,
                        publishedBefore,
                        {
                            minViews: collectorOptions.minViews,
                            maxResultsPerSearch: 50
                        }
                    );

                    totalQuotaUsed += channelResult.quotaUsed || 0;

                    // 수집된 영상들을 TrendingVideo로 저장
                    if (channelResult.videos && channelResult.videos.length > 0) {
                        ServerLogger.info(`🎬 채널 ${channelId}에서 ${channelResult.videos.length}개 영상 처리 시작`);
                        for (const video of channelResult.videos) {
                            try {
                                // 타입 안전한 비디오 ID 추출
                                const videoId = YouTubeApiTypeUtils.extractVideoId(video);
                                if (!videoId) {
                                    ServerLogger.error('❌ 비디오 ID 추출 실패:', video);
                                    continue;
                                }

                                ServerLogger.info(`🔍 영상 ID 체크: ${videoId} (${video.snippet?.title})`);

                                // 같은 배치 내에서만 중복 검사 (배치별 중복 방지)
                                const existingVideo = await TrendingVideo.findOne({
                                    videoId: videoId || "",
                                    batchId: batchId  // 같은 배치 내에서만 중복 체크
                                });

                                if (existingVideo) {
                                    ServerLogger.info(`⏭️ 배치 내 중복 영상 건너뛰기: ${videoId} (${video.snippet?.title})`);
                                    continue; // 같은 배치에서 이미 존재하는 영상은 건너뛰기
                                }

                                ServerLogger.info(`💾 새로운 영상 저장 시작: ${videoId}`);

                                // 팩토리 메서드를 사용하여 TrendingVideo 데이터 생성
                                ServerLogger.info(`🕒 영상 길이 분류: ${video.contentDetails?.duration}`);

                                const trendingVideoData = this.createTrendingVideoData(video, {
                                    groupId: null,
                                    groupName: '개별 채널 수집',
                                    collectedFrom: 'individual',
                                    keywords: keywords || [],
                                    batchId: batchId
                                });

                                const trendingVideo = new TrendingVideo(trendingVideoData);
                                const savedVideo = await trendingVideo.save();
                                savedVideos.push(savedVideo);
                                savedCount++;

                                ServerLogger.success(`✅ 영상 저장 완료: ${videoId} - ${video.snippet?.title}`);
                            } catch (saveError: any) {
                                ServerLogger.error(`❌ 영상 저장 실패 (${video.id || 'unknown'}):`, saveError.message);
                            }
                        }
                    }
                } catch (channelError: any) {
                    ServerLogger.error(`채널 ${channelId} 수집 실패:`, channelError.message);
                }
            }

            ServerLogger.success(`✅ 다중 채널 수집 완료: ${savedCount}개 영상 저장`);

            const viewStats = this.calculateViewStats(savedVideos);

            return {
                totalChannels: channels.length,
                totalVideosFound: savedVideos.length,
                totalVideosSaved: savedCount,
                quotaUsed: totalQuotaUsed,
                videos: savedVideos,
                stats: {
                    byPlatform: {
                        YOUTUBE: savedCount,
                        INSTAGRAM: 0,
                        TIKTOK: 0
                    },
                    byDuration: this.calculateDurationStats(savedVideos),
                    avgViews: viewStats.avgViews,
                    totalViews: viewStats.totalViews
                }
            };

        } catch (error) {
            ServerLogger.error('❌ 다중 채널 트렌딩 수집 실패:', error);
            throw error;
        }
    }

    /**
     * 영상 길이별 통계 계산
     */
    calculateDurationStats(videos: any[]): { [key: string]: number } {
        const stats: { [key: string]: number } = { SHORT: 0, MID: 0, LONG: 0 };

        videos.forEach(video => {
            if (video.duration) {
                stats[video.duration] = (stats[video.duration] || 0) + 1;
            } else if (video.durationCategory) {
                stats[video.durationCategory] = (stats[video.durationCategory] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * 영상 조회수 통계 계산
     */
    calculateViewStats(videos: any[]): ViewStats {
        if (!videos || videos.length === 0) {
            return { avgViews: 0, totalViews: 0 };
        }

        const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
        const avgViews = Math.round(totalViews / videos.length);

        return { avgViews, totalViews };
    }

    /**
     * 딜레이 함수
     */
    delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default GroupTrendingCollector;
module.exports = GroupTrendingCollector;