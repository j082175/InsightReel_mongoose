import { ServerLogger } from '../../../utils/logger';
import { YtdlVideoData, APIVideoData, MergedVideoData } from '../types/extraction-types';
import { UrlProcessor } from '../utils/UrlProcessor';

export class DataMerger {
    /**
     * ytdl-core와 YouTube API 데이터를 병합
     */
    static mergeVideoData(
        ytdlData: YtdlVideoData | null,
        apiData: APIVideoData | null,
        originalUrl?: string
    ): MergedVideoData {
        ServerLogger.info('🔄 비디오 데이터 병합 시작:', {
            hasYtdl: !!ytdlData,
            hasApi: !!apiData,
            ytdlTitle: ytdlData?.title?.substring(0, 30),
            apiTitle: apiData?.title?.substring(0, 30),
        });

        // 기본 데이터 구조 초기화
        const merged: MergedVideoData = {
            platform: 'YOUTUBE',
            url: '',
            dataSources: {
                primary: ytdlData ? 'ytdl-core' : 'youtube-api',
                ytdl: !!ytdlData,
                api: !!apiData,
                hybrid: !!(ytdlData && apiData),
            }
        };

        try {
            // 1단계: 기본 데이터 설정 (ytdl-core 우선)
            if (ytdlData) {
                this.applyYtdlData(merged, ytdlData);
                ServerLogger.debug('✅ ytdl-core 데이터 적용 완료');
            }

            // 2단계: API 데이터로 보강/덮어쓰기
            if (apiData) {
                this.applyAPIData(merged, apiData, !ytdlData);
                ServerLogger.debug('✅ YouTube API 데이터 적용 완료');
            }

            // 3단계: URL 정규화
            this.normalizeUrl(merged, originalUrl);

            // 4단계: 데이터 품질 검증 및 후처리
            this.validateAndPostProcess(merged);

            // 최종 로깅
            ServerLogger.success('🎉 데이터 병합 완료:', {
                title: merged.title?.substring(0, 50),
                duration: merged.duration,
                viewCount: merged.viewCount,
                likeCount: merged.likeCount,
                channelName: merged.channelName,
                primary: merged.dataSources.primary,
                hybrid: merged.dataSources.hybrid
            });

            return merged;

        } catch (error) {
            ServerLogger.error('❌ 데이터 병합 실패:', error);
            // 실패해도 기본 구조는 반환
            return merged;
        }
    }

    /**
     * ytdl-core 데이터 적용
     */
    private static applyYtdlData(merged: MergedVideoData, ytdlData: YtdlVideoData): void {
        // 기본 정보 (ytdl-core가 더 상세함)
        merged.title = ytdlData.title;
        merged.description = ytdlData.description;
        merged.duration = ytdlData.duration;
        merged.uploadDate = ytdlData.uploadDate;

        // 채널 정보
        merged.channelName = ytdlData.channelName;
        merged.channelId = ytdlData.channelId;
        merged.channelUrl = ytdlData.channelUrl;

        // 메타데이터
        merged.category = ytdlData.category;
        merged.keywords = ytdlData.keywords;
        merged.tags = ytdlData.tags;

        // 썸네일
        merged.thumbnails = ytdlData.thumbnails;
        merged.thumbnail = ytdlData.thumbnail;

        // 통계 (실시간성이 좋음)
        merged.viewCount = ytdlData.viewCount;

        // 라이브 스트림 정보
        merged.isLiveContent = ytdlData.isLiveContent;
        merged.isLive = ytdlData.isLive;

        ServerLogger.debug('📹 ytdl-core 데이터 세부 적용:', {
            title: merged.title?.length,
            description: merged.description?.length,
            keywords: merged.keywords?.length,
            thumbnails: merged.thumbnails?.length
        });
    }

    /**
     * YouTube API 데이터 적용
     */
    private static applyAPIData(
        merged: MergedVideoData,
        apiData: APIVideoData,
        isApiOnly: boolean
    ): void {
        if (isApiOnly) {
            // API 전용 모드: 모든 API 데이터 사용
            ServerLogger.debug('📊 API 전용 모드: 모든 API 데이터 적용');

            Object.assign(merged, {
                title: apiData.title,
                description: apiData.description,
                channelName: apiData.channelName,
                channelId: apiData.channelId,
                duration: apiData.duration,
                category: apiData.category,
                keywords: apiData.keywords,
                tags: apiData.tags,
                viewCount: apiData.viewCount,
                thumbnails: apiData.thumbnails,
                uploadDate: apiData.uploadDate,
                isLiveContent: apiData.isLiveContent,
                isLive: apiData.isLive,
            });
        } else {
            // 하이브리드 모드: API가 더 정확한 특정 데이터만 덮어쓰기
            ServerLogger.debug('🔄 하이브리드 모드: 선택적 API 데이터 적용');

            // 날짜 정보 (API가 더 정확)
            if (apiData.publishedAt) {
                merged.publishedAt = apiData.publishedAt;
                merged.originalPublishDate = new Date(apiData.publishedAt);
            }

            // 카테고리 정보 (API가 더 상세)
            if (apiData.categoryId) {
                merged.youtubeCategoryId = apiData.categoryId;
                merged.category = apiData.category; // 한국어 카테고리명
            }

            // 채널명 보완
            if (apiData.channelTitle && !merged.channelName) {
                merged.channelName = apiData.channelTitle;
            }
        }

        // 공통 적용: API만 제공하는 데이터들
        merged.likeCount = apiData.likeCount;
        merged.likes = apiData.likeCount; // 별칭
        merged.commentCount = apiData.commentCount;
        merged.commentsCount = apiData.commentCount; // 별칭

        // 채널 추가 정보
        merged.subscribers = apiData.subscribers;
        merged.channelVideos = apiData.channelVideos;
        merged.channelViews = apiData.channelViews;
        merged.channelCountry = apiData.channelCountry;
        merged.channelDescription = apiData.channelDescription;
        merged.channelCustomUrl = apiData.channelCustomUrl;
        merged.youtubeHandle = apiData.youtubeHandle;

        // 소셜 메타데이터
        merged.hashtags = apiData.hashtags;
        merged.mentions = apiData.mentions;
        merged.topComments = apiData.topComments;

        // 언어 정보
        merged.language = apiData.language;
        merged.defaultLanguage = apiData.defaultLanguage;

        // 라이브 방송 세부 정보
        merged.liveBroadcast = apiData.liveBroadcast;
        merged.privacyStatus = apiData.privacyStatus;
        merged.embeddable = apiData.embeddable;

        ServerLogger.debug('📊 API 데이터 세부 적용:', {
            likeCount: merged.likeCount,
            commentCount: merged.commentCount,
            subscribers: merged.subscribers,
            hashtags: merged.hashtags?.length,
            mentions: merged.mentions?.length,
            topComments: merged.topComments?.length
        });
    }

    /**
     * URL 정규화
     */
    private static normalizeUrl(merged: MergedVideoData, originalUrl?: string): void {
        if (originalUrl) {
            merged.url = originalUrl;
        } else if (merged.channelId) {
            // 비디오 ID를 추출하여 표준 URL 생성
            const videoId = UrlProcessor.extractVideoId(merged.url || '');
            if (videoId) {
                merged.url = UrlProcessor.createStandardUrl(videoId);
            }
        }

        // 채널 URL 정규화
        if (merged.channelId && !merged.channelUrl) {
            merged.channelUrl = UrlProcessor.createChannelUrl(merged.channelId);
        }

        ServerLogger.debug('🔗 URL 정규화 완료:', {
            videoUrl: merged.url?.substring(0, 50),
            channelUrl: merged.channelUrl?.substring(0, 50)
        });
    }

    /**
     * 데이터 품질 검증 및 후처리
     */
    private static validateAndPostProcess(merged: MergedVideoData): void {
        // 필수 필드 검증
        const requiredFields = ['title', 'channelName'];
        const missingFields = requiredFields.filter(field => !merged[field as keyof MergedVideoData]);

        if (missingFields.length > 0) {
            ServerLogger.warn('⚠️ 필수 필드 누락:', missingFields);
        }

        // 숫자 필드 검증
        const numericFields = ['viewCount', 'likeCount', 'commentCount', 'duration', 'subscribers'];
        numericFields.forEach(field => {
            const value = merged[field as keyof MergedVideoData] as number;
            if (typeof value === 'number' && value < 0) {
                (merged as any)[field] = 0;
                ServerLogger.debug(`음수 값 보정: ${field} = 0`);
            }
        });

        // 배열 필드 검증
        const arrayFields = ['keywords', 'tags', 'hashtags', 'mentions', 'topComments', 'thumbnails'];
        arrayFields.forEach(field => {
            const value = merged[field as keyof MergedVideoData];
            if (!Array.isArray(value)) {
                (merged as any)[field] = [];
                ServerLogger.debug(`배열 필드 초기화: ${field} = []`);
            }
        });

        // 데이터 품질 점수 계산
        const qualityScore = this.calculateQualityScore(merged);

        ServerLogger.debug('📊 데이터 품질 검증 완료:', {
            qualityScore: `${qualityScore.score}/${qualityScore.total} (${qualityScore.percentage}%)`,
            missingFields,
            hasDescription: !!merged.description,
            hasStatistics: !!(merged.viewCount || merged.likeCount),
            hasChannelInfo: !!(merged.channelName && merged.channelId)
        });
    }

    /**
     * 데이터 품질 점수 계산
     */
    private static calculateQualityScore(data: MergedVideoData): {
        score: number;
        total: number;
        percentage: number;
    } {
        const checks = {
            hasTitle: !!data.title,
            hasDescription: !!data.description,
            hasChannelInfo: !!(data.channelName && data.channelId),
            hasViewCount: (data.viewCount || 0) > 0,
            hasDuration: (data.duration || 0) > 0,
            hasUploadDate: !!data.uploadDate,
            hasThumbnails: Array.isArray(data.thumbnails) && data.thumbnails.length > 0,
            hasKeywords: Array.isArray(data.keywords) && data.keywords.length > 0,
            hasStatistics: !!(data.likeCount || data.commentCount),
            hasChannelStats: (data.subscribers || 0) > 0
        };

        const score = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;
        const percentage = Math.round((score / total) * 100);

        return { score, total, percentage };
    }

    /**
     * 데이터 소스 정보 생성
     */
    static createDataSourceInfo(ytdlData: YtdlVideoData | null, apiData: APIVideoData | null): {
        primary: string;
        ytdl: boolean;
        api: boolean;
        hybrid: boolean;
        capabilities: string[];
    } {
        const capabilities: string[] = [];

        if (ytdlData) {
            capabilities.push('기본정보', '실시간조회수', '상세메타데이터');
        }

        if (apiData) {
            capabilities.push('정확한통계', '채널정보', '댓글', '해시태그');
        }

        return {
            primary: ytdlData ? 'ytdl-core' : 'youtube-api',
            ytdl: !!ytdlData,
            api: !!apiData,
            hybrid: !!(ytdlData && apiData),
            capabilities
        };
    }
}

export default DataMerger;