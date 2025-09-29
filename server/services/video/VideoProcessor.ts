import { ServerLogger } from '../../utils/logger';
import { Platform, FinalVideoData, StandardVideoMetadata, ContentType } from '../../types/video-types';
import { InstagramReelInfo } from '../instagram/types/instagram-types';
import { TikTokVideoInfo } from '../tiktok/types/tiktok-types';
import { YouTubeProcessor } from './processors/YouTubeProcessor';
import { InstagramProcessor } from './processors/InstagramProcessor';
import { TikTokProcessor } from './processors/TikTokProcessor';
import { ThumbnailExtractor } from './extractors/ThumbnailExtractor';
import VideoUtils, { VideoFileMetadata } from './utils/VideoUtils';
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
    private _initialized: boolean = false;

    constructor() {
        this.youtubeProcessor = new YouTubeProcessor();
        this.instagramProcessor = new InstagramProcessor();
        this.tikTokProcessor = new TikTokProcessor();
        this.thumbnailExtractor = new ThumbnailExtractor();

        this.downloadDir = path.join(__dirname, '../../../downloads');
        this.ensureDirectories();
    }

    /**
     * VideoProcessor 초기화
     */
    async initialize(): Promise<void> {
        if (this._initialized) return;

        try {
            // YouTube 처리기는 생성자에서 자동으로 초기화됨 (HybridYouTubeExtractor 포함)
            // 별도의 initialize 호출이 필요하지 않음

            this._initialized = true;
            ServerLogger.info('✅ VideoProcessor 초기화 완료');
        } catch (error) {
            ServerLogger.error('❌ VideoProcessor 초기화 실패:', error);
            throw error;
        }
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
                // Controller에서 전달받은 videoId를 사용
                const videoId = 'unknown'; // processVideo에서는 직접 호출하므로 기본값 사용
                videoPath = await this.downloadVideo(videoUrl, platform, videoId);
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

    async downloadVideo(videoUrl: string, platform: Platform, videoId: string): Promise<string | undefined> {
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

    async processThumbnail(
        thumbnailUrl: string,
        videoPath: string | undefined,
        videoId: string,
        platform: Platform,
        analysisType: 'single' | 'multi-frame' | 'full' = 'multi-frame'
    ): Promise<string | undefined> {
        // 다중 프레임이 필요한 경우 새로운 메서드 사용
        if (analysisType === 'multi-frame' || analysisType === 'full') {
            const result = await this.processThumbnailMultiFrame(thumbnailUrl, videoPath, videoId, platform, analysisType);
            // 첫 번째 프레임만 반환 (기존 호환성 유지)
            if (Array.isArray(result) && result.length > 0) {
                return result[0];
            }
            return typeof result === 'string' ? result : undefined;
        }

        // 단일 프레임 처리
        return this.processThumbnailSingle(thumbnailUrl, videoPath, videoId, platform);
    }

    async processThumbnailMultiFrame(
        thumbnailUrl: string,
        videoPath: string | undefined,
        videoId: string,
        platform: Platform,
        analysisType: 'single' | 'multi-frame' | 'full' = 'multi-frame'
    ): Promise<string | string[] | undefined> {
        try {
            ServerLogger.info(`🔍 썸네일 처리 시작 (폴백 모드): URL=${thumbnailUrl}, videoPath=${videoPath}, videoId=${videoId}`);
            ServerLogger.info(`🔍 분석 타입: ${analysisType}, 비디오 파일 존재: ${videoPath ? fs.existsSync(videoPath) : false}`);

            // 폴백 모드: 비디오 다운로드가 실패했지만 파일이 있는 경우 사용
            // 다중 프레임 분석이 필요한 경우, 비디오 파일을 우선적으로 사용
            const shouldUseMultiFrame = analysisType !== 'single' && videoPath && fs.existsSync(videoPath);
            ServerLogger.info(`🎯 폴백 모드 - 다중 프레임 사용 결정: analysisType="${analysisType}", shouldUse=${shouldUseMultiFrame}`);

            if (shouldUseMultiFrame) {
                ServerLogger.info(`🎬 폴백: 로컬 비디오 파일에서 다중 프레임 생성 중...`);
                const result = await this.thumbnailExtractor.generateThumbnail(videoPath, 'multi-frame');
                if (result.success && result.framePaths && result.framePaths.length > 0) {
                    ServerLogger.info(`✅ 폴백: ${result.framePaths.length}개 프레임 추출 완료`);
                    return result.framePaths; // 다중 프레임 배열 반환
                }
                ServerLogger.warn(`❌ 로컬 비디오 파일에서 썸네일 생성 실패, 온라인 썸네일로 대체`);
            }

            // 온라인 썸네일 다운로드 시도 (단일 프레임이거나 비디오 파일이 없는 경우)
            if (thumbnailUrl) {
                ServerLogger.info(`📥 온라인 썸네일 다운로드 시도: ${thumbnailUrl}`);
                const downloadedThumbnail = await this.thumbnailExtractor.downloadThumbnail(
                    thumbnailUrl,
                    videoId,
                    platform
                );
                if (downloadedThumbnail) {
                    ServerLogger.info(`✅ 온라인 썸네일 다운로드 성공: ${downloadedThumbnail}`);
                    return downloadedThumbnail;
                } else {
                    ServerLogger.warn(`❌ 온라인 썸네일 다운로드 실패, 로컬 생성으로 전환`);
                }
            } else {
                ServerLogger.warn(`⚠️ 썸네일 URL이 없음, 로컬 생성으로 전환`);
            }

            // 로컬 비디오 파일에서 썸네일 생성 (최종 fallback)
            if (videoPath && fs.existsSync(videoPath)) {
                const fallbackAnalysisType = analysisType === 'single' ? 'single' : 'multi-frame';
                const result = await this.thumbnailExtractor.generateThumbnail(videoPath, fallbackAnalysisType);
                if (result.success) {
                    if (fallbackAnalysisType === 'multi-frame' && result.framePaths && result.framePaths.length > 0) {
                        return result.framePaths; // 다중 프레임 배열 반환
                    } else if (result.thumbnailPath) {
                        return result.thumbnailPath; // 단일 프레임 반환
                    }
                }
            }

            return undefined;

        } catch (error) {
            ServerLogger.error('썸네일 처리 실패:', error);
            return undefined;
        }
    }

    async processThumbnailSingle(
        thumbnailUrl: string,
        videoPath: string | undefined,
        videoId: string,
        platform: Platform
    ): Promise<string | undefined> {
        try {
            ServerLogger.info(`🔍 단일 썸네일 처리 시작: URL=${thumbnailUrl}, videoPath=${videoPath}, videoId=${videoId}`);

            // 온라인 썸네일 다운로드 시도
            if (thumbnailUrl) {
                ServerLogger.info(`📥 온라인 썸네일 다운로드 시도: ${thumbnailUrl}`);
                const downloadedThumbnail = await this.thumbnailExtractor.downloadThumbnail(
                    thumbnailUrl,
                    videoId,
                    platform
                );
                if (downloadedThumbnail) {
                    ServerLogger.info(`✅ 온라인 썸네일 다운로드 성공: ${downloadedThumbnail}`);
                    return downloadedThumbnail;
                } else {
                    ServerLogger.warn(`❌ 온라인 썸네일 다운로드 실패, 로컬 생성으로 전환`);
                }
            } else {
                ServerLogger.warn(`⚠️ 썸네일 URL이 없음, 로컬 생성으로 전환`);
            }

            // 로컬 비디오 파일에서 썸네일 생성
            if (videoPath && fs.existsSync(videoPath)) {
                const result = await this.thumbnailExtractor.generateThumbnail(videoPath, 'single');
                if (result.success && result.thumbnailPath) {
                    return result.thumbnailPath;
                }
            }

            return undefined;

        } catch (error) {
            ServerLogger.error('단일 썸네일 처리 실패:', error);
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
            // 핵심 성과 지표
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
                videoInfo.commentCount?.toString() ||
                videoInfo.commentsCount?.toString() ||
                videoInfo.comments?.toString() ||
                '0'
            ),
            shares: parseInt(
                videoInfo.shares?.toString() ||
                videoInfo.shareCount?.toString() ||
                '0'
            ),

            // 기본 정보
            title: videoInfo.title || videoInfo.caption || '',
            channelName: videoInfo.channelTitle || videoInfo.channelName || videoInfo.owner?.username || '',
            uploadDate: videoInfo.uploadDate || videoInfo.publishedAt || new Date().toISOString(),
            thumbnailUrl: thumbnailPath || videoInfo.thumbnailUrl || '',
            description: videoInfo.description || videoInfo.caption || '',

            // 플랫폼 정보
            platform,
            url: videoInfo.url || '',

            // 채널 정보 (기본값)
            channelUrl: '',
            subscribers: 0,
            channelVideos: 0,

            // 비디오 상세 (기본값)
            youtubeHandle: '',
            duration: this.parseDurationToString(videoInfo.duration || videoInfo.videoDuration, platform),
            monetized: 'N',
            youtubeCategory: '',
            categoryId: videoInfo.categoryId || '',
            license: 'YOUTUBE',
            quality: 'sd',
            language: '',
            contentType: 'longform' as ContentType,
            channelId: videoInfo.channelId || '',

            // 소셜 메타데이터
            hashtags: this.extractHashtags(videoInfo.description || videoInfo.caption || '', platform),
            mentions: this.extractMentions(videoInfo.description || videoInfo.caption || '', platform),

            // 시스템 메타데이터 (기본값)
            collectionTime: new Date().toISOString(),
            rowNumber: 0, // 나중에 DB에서 자동 증가
            topComments: '',
            comments: ''
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

    private parseDurationToString(duration: any, platform: Platform): string {
        if (!duration) return '0';

        // 만약 이미 문자열 형태라면 그대로 반환
        if (typeof duration === 'string') {
            return duration;
        }

        // 숫자 형태라면 seconds를 문자열로 변환
        const durationInSeconds = this.parseDuration(duration, platform);

        // 초를 "MM:SS" 또는 "HH:MM:SS" 형태로 변환
        const hours = Math.floor(durationInSeconds / 3600);
        const minutes = Math.floor((durationInSeconds % 3600) / 60);
        const seconds = durationInSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    async extractVideoMetadata(videoPath: string): Promise<VideoFileMetadata | null> {
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

    // VideoId 추출 메서드들 (Controller에서 사용)
    extractYouTubeId(url: string): string | null {
        return this.youtubeProcessor.extractYouTubeId(url);
    }

    extractInstagramId(url: string): string | null {
        return this.instagramProcessor.extractInstagramId?.(url) || null;
    }

    extractTikTokId(url: string): string | null {
        return this.tikTokProcessor.extractTikTokId?.(url) || null;
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

    /**
     * 썸네일 생성 (레거시 호환)
     */
    async generateThumbnail(videoPath: string, analysisType: string = 'multi-frame'): Promise<string | string[]> {
        try {
            const result = await this.thumbnailExtractor.generateThumbnail(videoPath, analysisType as any);
            if (result.success) {
                // Return multiple frames for multi-frame analysis, single frame otherwise
                if (analysisType === 'multi-frame' && result.framePaths && result.framePaths.length > 1) {
                    ServerLogger.info(`✅ Multi-frame extraction: ${result.framePaths.length} frames generated`);
                    return result.framePaths;
                } else {
                    ServerLogger.info(`✅ Single frame extraction: ${result.thumbnailPath}`);
                    return result.thumbnailPath || '';
                }
            }
            throw new Error('썸네일 생성 실패');
        } catch (error) {
            ServerLogger.error('썸네일 생성 실패:', error);
            throw error;
        }
    }

    /**
     * YouTube 비디오 정보 수집 (레거시 호환)
     */
    async getYouTubeVideoInfo(videoUrl: string): Promise<any> {
        try {
            return await this.youtubeProcessor.getVideoInfo(videoUrl);
        } catch (error) {
            ServerLogger.error('YouTube 비디오 정보 수집 실패:', error);
            throw error;
        }
    }

    /**
     * Instagram 비디오 정보 수집
     */
    async getInstagramVideoInfo(videoUrl: string): Promise<InstagramReelInfo | null> {
        try {
            return await this.instagramProcessor.getVideoInfo(videoUrl);
        } catch (error) {
            ServerLogger.error('Instagram 비디오 정보 수집 실패:', error);
            return null;
        }
    }

    /**
     * TikTok 비디오 정보 수집
     */
    async getTikTokVideoInfo(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            return await this.tikTokProcessor.getVideoInfo(videoUrl);
        } catch (error) {
            ServerLogger.error('TikTok 비디오 정보 수집 실패:', error);
            return null;
        }
    }

    /**
     * 썸네일 다운로드 (로컬 저장)
     */
    async downloadThumbnail(thumbnailUrl: string, videoId: string, platform: string): Promise<string | null> {
        try {
            return await this.thumbnailExtractor.downloadThumbnail(thumbnailUrl, videoId, platform);
        } catch (error) {
            ServerLogger.error('썸네일 다운로드 실패:', error);
            return null;
        }
    }
}

export default VideoProcessor;