import { ServerLogger } from '../../utils/logger';
import { Platform, FinalVideoData, StandardVideoMetadata } from '../../types/video-types';
import { InstagramReelInfo } from '../instagram/types/instagram-types';
import { TikTokVideoInfo } from '../tiktok/types/tiktok-types';
import { YouTubeProcessor } from './processors/YouTubeProcessor';
import { InstagramProcessor } from './processors/InstagramProcessor';
import { TikTokProcessor } from './processors/TikTokProcessor';
import { ThumbnailExtractor } from './extractors/ThumbnailExtractor';
import VideoUtils from './utils/VideoUtils';
import * as fs from 'fs';
import * as path from 'path';

interface ProcessingOptions {
    downloadVideo?: boolean;
    generateThumbnail?: boolean;
    analysisType?: 'single' | 'multi-frame' | 'full';
    maxRetries?: number;
}

interface ProcessingResult {
    success: boolean;
    videoData?: StandardVideoMetadata;
    videoPath?: string;
    thumbnailPath?: string;
    error?: string;
}

export class VideoProcessor {
    private youtubeProcessor: YouTubeProcessor;
    private instagramProcessor: InstagramProcessor;
    private tikTokProcessor: TikTokProcessor;
    private thumbnailExtractor: ThumbnailExtractor;
    private downloadDir: string;

    constructor() {
        this.youtubeProcessor = new YouTubeProcessor();
        this.instagramProcessor = new InstagramProcessor();
        this.tikTokProcessor = new TikTokProcessor();
        this.thumbnailExtractor = new ThumbnailExtractor();

        this.downloadDir = path.join(__dirname, '../../../downloads');
        this.ensureDirectories();
    }

    private ensureDirectories(): void {
        const dirs = [
            this.downloadDir,
            path.join(this.downloadDir, 'videos'),
            path.join(this.downloadDir, 'thumbnails'),
            path.join(this.downloadDir, 'frames')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async processVideo(videoUrl: string, options: ProcessingOptions = {}): Promise<ProcessingResult> {
        try {
            ServerLogger.info(`비디오 처리 시작: ${videoUrl}`);

            // 플랫폼 감지
            const platform = VideoUtils.detectPlatform(videoUrl);
            if (!platform) {
                throw new Error('지원하지 않는 플랫폼입니다');
            }

            // URL 유효성 검사
            if (!VideoUtils.isValidUrl(videoUrl)) {
                throw new Error('유효하지 않은 URL입니다');
            }

            // 플랫폼별 비디오 정보 추출
            const videoInfo = await this.getVideoInfo(videoUrl, platform);
            if (!videoInfo) {
                throw new Error('비디오 정보를 가져올 수 없습니다');
            }

            let videoPath: string | undefined;
            let thumbnailPath: string | undefined;

            // 비디오 다운로드
            if (options.downloadVideo !== false) {
                videoPath = await this.downloadVideo(videoUrl, platform, videoInfo.videoId);
            }

            // 썸네일 생성
            if (options.generateThumbnail !== false) {
                thumbnailPath = await this.processThumbnail(
                    videoInfo.thumbnailUrl,
                    videoPath,
                    videoInfo.videoId,
                    platform,
                    options.analysisType
                );
            }

            // 표준 메타데이터 생성
            const standardMetadata = this.normalizeVideoMetadata(videoInfo, platform, videoPath, thumbnailPath);

            return {
                success: true,
                videoData: standardMetadata,
                videoPath,
                thumbnailPath
            };

        } catch (error) {
            ServerLogger.error('비디오 처리 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    private async getVideoInfo(videoUrl: string, platform: Platform): Promise<any> {
        switch (platform) {
            case 'YOUTUBE':
                return await this.youtubeProcessor.getVideoInfo(videoUrl);
            case 'INSTAGRAM':
                return await this.instagramProcessor.getVideoInfo(videoUrl);
            case 'TIKTOK':
                return await this.tikTokProcessor.getVideoInfo(videoUrl);
            default:
                throw new Error(`지원하지 않는 플랫폼: ${platform}`);
        }
    }

    private async downloadVideo(videoUrl: string, platform: Platform, videoId: string): Promise<string | undefined> {
        try {
            const sanitizedId = VideoUtils.sanitizeFileName(videoId);
            const filePath = path.join(this.downloadDir, 'videos', `${platform}_${sanitizedId}.mp4`);

            // 이미 존재하는지 확인
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.size > 1024) { // 1KB 이상
                    ServerLogger.info(`비디오가 이미 존재합니다: ${filePath}`);
                    return filePath;
                }
            }

            let success = false;
            const startTime = new Date();

            switch (platform) {
                case 'YOUTUBE':
                    success = await this.youtubeProcessor.downloadVideo(videoUrl, filePath, startTime);
                    break;
                case 'INSTAGRAM':
                    success = await this.instagramProcessor.downloadVideo(videoUrl, filePath, startTime);
                    break;
                case 'TIKTOK':
                    success = await this.tikTokProcessor.downloadVideo(videoUrl, filePath, startTime);
                    break;
            }

            if (success && fs.existsSync(filePath)) {
                return filePath;
            }

            return undefined;

        } catch (error) {
            ServerLogger.error('비디오 다운로드 실패:', error);
            return undefined;
        }
    }

    private async processThumbnail(
        thumbnailUrl: string,
        videoPath: string | undefined,
        videoId: string,
        platform: Platform,
        analysisType: 'single' | 'multi-frame' | 'full' = 'multi-frame'
    ): Promise<string | undefined> {
        try {
            // 온라인 썸네일 다운로드 시도
            if (thumbnailUrl) {
                const downloadedThumbnail = await this.thumbnailExtractor.downloadThumbnail(
                    thumbnailUrl,
                    videoId,
                    platform
                );
                if (downloadedThumbnail) {
                    return downloadedThumbnail;
                }
            }

            // 로컬 비디오 파일에서 썸네일 생성
            if (videoPath && fs.existsSync(videoPath)) {
                const result = await this.thumbnailExtractor.generateThumbnail(videoPath, analysisType);
                if (result.success && result.thumbnailPath) {
                    return result.thumbnailPath;
                }
            }

            return undefined;

        } catch (error) {
            ServerLogger.error('썸네일 처리 실패:', error);
            return undefined;
        }
    }

    private normalizeVideoMetadata(
        videoInfo: any,
        platform: Platform,
        videoPath?: string,
        thumbnailPath?: string
    ): StandardVideoMetadata {
        const baseMetadata: StandardVideoMetadata = {
            title: videoInfo.title || videoInfo.caption || '',
            description: videoInfo.description || videoInfo.caption || '',
            platform,
            url: videoInfo.url || '',
            channelId: videoInfo.channelId || '',
            channelName: videoInfo.channelName || videoInfo.channelTitle || videoInfo.owner?.username || '',
            views: parseInt(
                videoInfo.views?.toString() ||
                videoInfo.viewCount?.toString() ||
                '0'
            ),
            likes: parseInt(
                videoInfo.likes?.toString() ||
                videoInfo.likeCount?.toString() ||
                '0'
            ),
            commentsCount: parseInt(
                videoInfo.comments?.toString() ||
                videoInfo.commentCount?.toString() ||
                '0'
            ),
            uploadDate: videoInfo.uploadDate || new Date().toISOString(),
            thumbnailUrl: thumbnailPath || videoInfo.thumbnailUrl || '',
            // videoUrl은 StandardVideoMetadata에 없음 (url 필드 사용)
            duration: this.parseDuration(videoInfo.duration || videoInfo.videoDuration, platform),
            hashtags: this.extractHashtags(videoInfo.description || videoInfo.caption || '', platform),
            mentions: this.extractMentions(videoInfo.description || videoInfo.caption || '', platform)
        };

        // 플랫폼별 추가 메타데이터
        switch (platform) {
            case 'YOUTUBE':
                return {
                    ...baseMetadata,
                    categoryId: videoInfo.categoryId || ''
                };
            case 'TIKTOK':
                return {
                    ...baseMetadata,
                    shares: parseInt(videoInfo.shares?.toString() || '0')
                };
            case 'INSTAGRAM':
                return {
                    ...baseMetadata,
                    // Instagram 특화 필드들이 필요시 여기 추가
                };
            default:
                return baseMetadata;
        }
    }

    private parseDuration(duration: any, platform: Platform): number {
        if (!duration) return 0;

        switch (platform) {
            case 'YOUTUBE':
                return this.youtubeProcessor.parseYouTubeDuration(duration);
            default:
                return typeof duration === 'number' ? duration : parseInt(duration?.toString() || '0');
        }
    }

    private extractHashtags(text: string, platform: Platform): string[] {
        switch (platform) {
            case 'INSTAGRAM':
                return this.instagramProcessor.extractHashtags(text);
            case 'TIKTOK':
                return this.tikTokProcessor.extractHashtags(text);
            default:
                return VideoUtils.extractHashtags(text);
        }
    }

    private extractMentions(text: string, platform: Platform): string[] {
        switch (platform) {
            case 'INSTAGRAM':
                return this.instagramProcessor.extractMentions(text);
            case 'TIKTOK':
                return this.tikTokProcessor.extractMentions(text);
            default:
                return VideoUtils.extractMentions(text);
        }
    }

    // 비디오 파일 메타데이터 추출
    async extractVideoMetadata(videoPath: string): Promise<any> {
        return await VideoUtils.getVideoMetadata(videoPath);
    }

    // 파일 타입 감지
    async detectFileType(filePath: string): Promise<'video' | 'image' | 'audio' | 'unknown'> {
        return await VideoUtils.detectFileType(filePath);
    }

    // 채널 URL 생성
    buildChannelUrl(platform: Platform, channelId: string, customUrl?: string): string {
        return VideoUtils.buildChannelUrl(platform, channelId, customUrl);
    }

    // 플랫폼 감지
    detectPlatform(url: string): Platform | null {
        return VideoUtils.detectPlatform(url);
    }

    // 컨텐츠 타입 분류
    classifyContentType(duration: number): 'SHORT' | 'MID' | 'LONG' {
        return VideoUtils.classifyContentType(duration);
    }

    // 임시 파일 정리
    cleanTempFiles(maxAge: number = 24 * 60 * 60 * 1000): number {
        return VideoUtils.cleanTempFiles(this.downloadDir, maxAge);
    }

    // 디스크 공간 확인
    async checkDiskSpace(): Promise<{ free: number; total: number } | null> {
        return await VideoUtils.checkDiskSpace(this.downloadDir);
    }

    // 썸네일 정리
    cleanOldThumbnails(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
        this.thumbnailExtractor.cleanOldThumbnails(maxAge);
    }

    // 플랫폼별 URL 검증
    validateUrl(url: string): { isValid: boolean; platform: Platform | null } {
        const platform = this.detectPlatform(url);
        let isValid = false;

        if (platform) {
            switch (platform) {
                case 'YOUTUBE':
                    isValid = this.youtubeProcessor.isYouTubeUrl(url);
                    break;
                case 'INSTAGRAM':
                    isValid = this.instagramProcessor.isInstagramUrl(url);
                    break;
                case 'TIKTOK':
                    isValid = this.tikTokProcessor.isTikTokUrl(url);
                    break;
            }
        }

        return { isValid, platform };
    }
}

export default VideoProcessor;