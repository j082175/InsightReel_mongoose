import { ServerLogger } from '../../../utils/logger';
import { VideoProcessor } from '../../video/VideoProcessor';
import { PLATFORMS } from '../../../config/api-messages';
import type { VideoMetadata } from '../../../types/controller-types';
import type { Platform } from '../../../types/video-types';

/**
 * 플랫폼별 메타데이터 수집 서비스
 * 책임: 각 플랫폼(YouTube, Instagram, TikTok)에서 비디오 메타데이터 추출
 */
export class MetadataCollectionService {
    private videoProcessor: VideoProcessor;

    constructor(videoProcessor: VideoProcessor) {
        this.videoProcessor = videoProcessor;
    }

    /**
     * 플랫폼에 따라 메타데이터 수집
     */
    async collectMetadata(options: {
        platform: Platform;
        postUrl: string;
        existingMetadata?: VideoMetadata;
    }): Promise<VideoMetadata> {
        const { platform, postUrl, existingMetadata = {} } = options;

        ServerLogger.info(`📊 ${platform} 메타데이터 수집 시작...`);
        const startTime = Date.now();

        try {
            let collectedMetadata: VideoMetadata;

            switch (platform) {
                case PLATFORMS.YOUTUBE:
                    collectedMetadata = await this.collectYouTubeMetadata(postUrl, existingMetadata);
                    break;
                case PLATFORMS.INSTAGRAM:
                    collectedMetadata = await this.collectInstagramMetadata(postUrl, existingMetadata);
                    break;
                case PLATFORMS.TIKTOK:
                    collectedMetadata = await this.collectTikTokMetadata(postUrl, existingMetadata);
                    break;
                default:
                    collectedMetadata = existingMetadata;
                    break;
            }

            const processingTime = Date.now() - startTime;
            ServerLogger.info(`✅ ${platform} 메타데이터 수집 완료 (소요시간: ${processingTime}ms)`);

            return collectedMetadata;
        } catch (error: any) {
            const processingTime = Date.now() - startTime;
            ServerLogger.warn(
                `⚠️ ${platform} 메타데이터 수집 실패 (무시하고 계속, 소요시간: ${processingTime}ms):`,
                error.message
            );
            return existingMetadata;
        }
    }

    /**
     * YouTube 메타데이터 수집
     */
    private async collectYouTubeMetadata(postUrl: string, existingMetadata: VideoMetadata): Promise<VideoMetadata> {
        const youtubeInfo = await this.videoProcessor.getYouTubeVideoInfo(postUrl);

        const enrichedMetadata: VideoMetadata = {
            ...existingMetadata,
            // 기본 비디오 정보
            title: youtubeInfo.title,
            description: youtubeInfo.description,
            thumbnailUrl: youtubeInfo.thumbnailUrl,
            // 채널 정보
            channelName: youtubeInfo.channelTitle,
            channelUrl: youtubeInfo.channelCustomUrl || `https://www.youtube.com/channel/${youtubeInfo.channelId}`,
            youtubeHandle: this.extractYouTubeHandle(youtubeInfo.channelCustomUrl, youtubeInfo.channelTitle),
            // 통계 정보
            likes: youtubeInfo.likes,
            commentsCount: youtubeInfo.commentCount,
            views: youtubeInfo.views,
            // 기타 정보
            uploadDate: youtubeInfo.uploadDate,
            duration: this.parseDurationToSeconds(youtubeInfo.duration),
            contentType: this.classifyContentType(this.parseDurationToSeconds(youtubeInfo.duration)),
            youtubeCategory: this.getYouTubeCategoryName(youtubeInfo.categoryId),
            monetized: 'N',
            quality: youtubeInfo.quality,
            license: 'YOUTUBE',
            hashtags: youtubeInfo.tags,
        };

        // 채널 정보 병합
        try {
            const channelInfo = await this.getChannelInfo(youtubeInfo.channelId);
            Object.assign(enrichedMetadata, channelInfo);
        } catch (error) {
            ServerLogger.warn('채널 정보 수집 실패:', error);
        }

        // 댓글 정보 병합
        try {
            const topComments = await this.getTopComments(youtubeInfo.id);
            enrichedMetadata.topComments = topComments;
            enrichedMetadata.comments = '';
        } catch (error) {
            ServerLogger.warn('댓글 정보 수집 실패:', error);
        }

        this.logYouTubeMetadata(enrichedMetadata);
        return enrichedMetadata;
    }

    /**
     * Instagram 메타데이터 수집
     */
    private async collectInstagramMetadata(postUrl: string, existingMetadata: VideoMetadata): Promise<VideoMetadata> {
        const instagramInfo = await this.videoProcessor.getInstagramVideoInfo(postUrl);

        if (!instagramInfo) {
            ServerLogger.warn('⚠️ Instagram 메타데이터를 가져올 수 없음');
            return existingMetadata;
        }

        // Instagram 썸네일 로컬 다운로드
        let localThumbnailUrl = '';
        if (instagramInfo.thumbnailUrl) {
            try {
                const downloadedThumbnailPath = await this.videoProcessor.downloadThumbnail(
                    instagramInfo.thumbnailUrl,
                    instagramInfo.shortcode,
                    'INSTAGRAM'
                );
                localThumbnailUrl = downloadedThumbnailPath || instagramInfo.thumbnailUrl;
                ServerLogger.info(`📸 Instagram 썸네일 로컬 다운로드: ${localThumbnailUrl}`);
            } catch (error) {
                ServerLogger.warn('Instagram 썸네일 다운로드 실패, 원본 URL 사용:', error);
                localThumbnailUrl = instagramInfo.thumbnailUrl;
            }
        }

        const enrichedMetadata: VideoMetadata = {
            ...existingMetadata,
            // 기본 비디오 정보
            title: instagramInfo.caption ? this.extractInstagramTitle(instagramInfo.caption) : 'Instagram Video',
            description: instagramInfo.caption || '',
            thumbnailUrl: localThumbnailUrl,
            // 채널 정보
            channelName: instagramInfo.owner?.username || instagramInfo.owner?.fullName || '',
            channelUrl: instagramInfo.owner?.username ? `https://www.instagram.com/${instagramInfo.owner.username}` : '',
            instagramAuthor: instagramInfo.owner?.username || '',
            _instagramAuthor: instagramInfo.owner?.username || '',
            // 통계 정보
            likes: instagramInfo.likeCount || 0,
            commentsCount: instagramInfo.commentCount || 0,
            views: instagramInfo.viewCount || 0,
            // 기타 정보
            uploadDate: instagramInfo.uploadDate || new Date().toISOString(),
            duration: instagramInfo.videoDuration || 0,
            contentType: 'shortform', // Instagram은 대부분 숏폼
            hashtags: instagramInfo.hashtags || [],
            mentions: instagramInfo.mentions || [],
            language: instagramInfo.language || '',
            platform: 'INSTAGRAM'
        };

        this.logInstagramMetadata(enrichedMetadata);
        return enrichedMetadata;
    }

    /**
     * TikTok 메타데이터 수집
     */
    private async collectTikTokMetadata(postUrl: string, existingMetadata: VideoMetadata): Promise<VideoMetadata> {
        const tiktokInfo = await this.videoProcessor.getTikTokVideoInfo(postUrl);

        if (!tiktokInfo) {
            ServerLogger.warn('⚠️ TikTok 메타데이터를 가져올 수 없음');
            return existingMetadata;
        }

        ServerLogger.info('🔍 Controller에서 받은 TikTok 데이터:', JSON.stringify(tiktokInfo, null, 2));

        // TikTok 썸네일 로컬 다운로드
        let localThumbnailUrl = '';
        if (tiktokInfo.thumbnailUrl) {
            try {
                const downloadedThumbnailPath = await this.videoProcessor.downloadThumbnail(
                    tiktokInfo.thumbnailUrl,
                    tiktokInfo.videoId,
                    'TIKTOK'
                );
                localThumbnailUrl = downloadedThumbnailPath || tiktokInfo.thumbnailUrl;
                ServerLogger.info(`📸 TikTok 썸네일 로컬 다운로드: ${localThumbnailUrl}`);
            } catch (error) {
                ServerLogger.warn('TikTok 썸네일 다운로드 실패, 원본 URL 사용:', error);
                localThumbnailUrl = tiktokInfo.thumbnailUrl;
            }
        }

        const enrichedMetadata: VideoMetadata = {
            ...existingMetadata,
            // 기본 비디오 정보
            title: tiktokInfo.title || tiktokInfo.description || 'TikTok Video',
            description: tiktokInfo.description || '',
            thumbnailUrl: localThumbnailUrl,
            // 채널 정보
            channelName: tiktokInfo.channelName || '',
            channelUrl: tiktokInfo.channelName ? `https://www.tiktok.com/@${tiktokInfo.channelName}` : '',
            // 통계 정보
            likes: tiktokInfo.likes || 0,
            commentsCount: tiktokInfo.comments || 0,
            views: tiktokInfo.views || 0,
            shares: tiktokInfo.shares || 0,
            // 기타 정보
            uploadDate: tiktokInfo.uploadDate || new Date().toISOString(),
            duration: tiktokInfo.duration || 0,
            durationFormatted: this.formatDurationFromSeconds(tiktokInfo.duration || 0),
            contentType: 'shortform', // TikTok은 모두 숏폼
            hashtags: tiktokInfo.hashtags || [],
            mentions: tiktokInfo.mentions || [],
            language: tiktokInfo.language || '',
            platform: 'TIKTOK'
        };

        this.logTikTokMetadata(enrichedMetadata);
        return enrichedMetadata;
    }

    // Helper methods - Actual implementations from VideoController
    private extractYouTubeHandle(customUrl?: string, channelTitle?: string): string {
        ServerLogger.info(`🔍 YouTube 핸들 추출 시도: customUrl="${customUrl}", channelTitle="${channelTitle}"`);

        // 1. customUrl이 있는 경우 처리
        if (customUrl && typeof customUrl === 'string') {
            // @로 시작하는 경우
            if (customUrl.startsWith('@')) {
                ServerLogger.info(`✅ @ 핸들 발견: ${customUrl}`);
                return customUrl;
            }

            // URL에서 @ 핸들 추출
            const handleMatch = customUrl.match(/@([a-zA-Z0-9_.-]+)/);
            if (handleMatch) {
                const handle = `@${handleMatch[1]}`;
                ServerLogger.info(`✅ URL에서 핸들 추출: ${handle}`);
                return handle;
            }

            // /c/ 또는 /user/ 경로에서 추출
            const pathMatch = customUrl.match(/(?:\/c\/|\/user\/)([^\/\?]+)/);
            if (pathMatch) {
                const handle = `@${pathMatch[1]}`;
                ServerLogger.info(`✅ 경로에서 핸들 추출: ${handle}`);
                return handle;
            }

            // 단순 문자열인 경우 @ 추가
            if (customUrl && !customUrl.includes('/') && !customUrl.includes('http')) {
                const handle = `@${customUrl}`;
                ServerLogger.info(`✅ 단순 문자열로 핸들 생성: ${handle}`);
                return handle;
            }
        }

        // 2. customUrl 실패 시 channelTitle에서 핸들 생성
        if (channelTitle && typeof channelTitle === 'string') {
            const sanitized = channelTitle
                .replace(/[^a-zA-Z0-9가-힣\s]/g, '') // 특수문자 제거
                .replace(/\s+/g, '') // 공백 제거
                .slice(0, 15); // 길이 제한

            if (sanitized) {
                const handle = `@${sanitized}`;
                ServerLogger.info(`🔄 채널명으로 핸들 생성: ${handle}`);
                return handle;
            }
        }

        ServerLogger.warn(`❌ YouTube 핸들 추출 실패: customUrl="${customUrl}", channelTitle="${channelTitle}"`);
        return '';
    }

    private parseDurationToSeconds(duration: string): number {
        if (!duration) return 0;

        // PT30S, PT5M30S, PT1H30M25S 형태의 ISO 8601 duration 파싱
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return hours * 3600 + minutes * 60 + seconds;
    }

    private classifyContentType(durationInSeconds: number): string {
        if (durationInSeconds <= 60) return 'shortform';
        return 'longform';
    }

    private getYouTubeCategoryName(categoryId: string | number): string {
        const YouTubeDataProcessor = require('../../../utils/youtube-data-processor').default;
        return YouTubeDataProcessor.getCategoryName(categoryId);
    }

    private async getChannelInfo(channelId: string): Promise<{subscribers: number, channelVideos: number}> {
        try {
            const apiKeyManager = require('../../../services/ApiKeyManager');
            const activeKeys = await apiKeyManager.getActiveApiKeys();

            if (!activeKeys || activeKeys.length === 0) {
                throw new Error('YouTube API 키가 없습니다');
            }

            const apiKey = activeKeys[0];
            const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;

            const axios = require('axios');
            const response = await axios.get(url);

            if (response.data.items && response.data.items.length > 0) {
                const statistics = response.data.items[0].statistics;
                return {
                    subscribers: parseInt(statistics.subscriberCount || '0'),
                    channelVideos: parseInt(statistics.videoCount || '0')
                };
            }

            return { subscribers: 0, channelVideos: 0 };
        } catch (error) {
            ServerLogger.error('❌ 채널 정보 가져오기 실패:', error instanceof Error ? error.message : String(error));
            return { subscribers: 0, channelVideos: 0 };
        }
    }

    private async getTopComments(videoId: string): Promise<string> {
        try {
            const youtubeProcessor = new (require('../../../services/video/processors/YouTubeProcessor')).YouTubeProcessor();
            const comments = await youtubeProcessor.fetchComments(videoId, 5);
            return comments.join(' | ');
        } catch (error) {
            ServerLogger.error('댓글 가져오기 실패', error, 'METADATA');
            return '';
        }
    }

    private extractInstagramTitle(caption: string): string {
        if (!caption) return 'Instagram Video';

        // 첫 번째 줄이나 첫 번째 문장을 제목으로 사용
        const lines = caption.split('\n');
        const firstLine = lines[0].trim();

        if (firstLine.length > 3) {
            // 60자 이내로 제한
            return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
        }

        return 'Instagram Video';
    }

    private formatDurationFromSeconds(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    private logYouTubeMetadata(metadata: VideoMetadata): void {
        ServerLogger.info(`👤 채널: ${metadata.channelName}`);
        ServerLogger.info(`👍 좋아요: ${metadata.likes}, 💬 댓글: ${metadata.commentsCount}, 👀 조회수: ${metadata.views}`);
        ServerLogger.info(`⏱️ 영상길이: ${metadata.duration}초 (${metadata.contentType})`);
        ServerLogger.info(`📅 업로드: ${metadata.uploadDate}`);
    }

    private logInstagramMetadata(metadata: VideoMetadata): void {
        ServerLogger.info(`👤 채널: ${metadata.channelName}`);
        ServerLogger.info(`👍 좋아요: ${metadata.likes}, 💬 댓글: ${metadata.commentsCount}, 👀 조회수: ${metadata.views}`);
        ServerLogger.info(`📝 제목: ${metadata.title}`);
        ServerLogger.info(`🏷️ 해시태그: ${metadata.hashtags?.length || 0}개`);
        ServerLogger.info(`📅 업로드: ${metadata.uploadDate}`);
    }

    private logTikTokMetadata(metadata: VideoMetadata): void {
        ServerLogger.info(`👤 채널: ${metadata.channelName}`);
        ServerLogger.info(`👍 좋아요: ${metadata.likes}, 💬 댓글: ${metadata.commentsCount}, 👀 조회수: ${metadata.views}`);
        ServerLogger.info(`📝 제목: ${metadata.title}`);
        ServerLogger.info(`🏷️ 해시태그: ${metadata.hashtags?.length || 0}개`);
        ServerLogger.info(`📅 업로드: ${metadata.uploadDate}`);
        ServerLogger.info(`⏱️ 지속시간: ${metadata.duration}초 (포맷: ${metadata.durationFormatted})`);
        ServerLogger.info(`🌍 언어: ${metadata.language}`);
    }
}