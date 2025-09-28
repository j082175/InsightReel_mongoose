import { ServerLogger } from '../../../utils/logger';
import { VideoProcessor } from '../../video/VideoProcessor';
import { PLATFORMS } from '../../../config/api-messages';
import type { Platform } from '../../../types/video-types';

/**
 * 비디오 준비 서비스
 * 책임: 비디오 다운로드, 파일 경로 관리, Video ID 추출
 */
export class VideoPreparationService {
    private videoProcessor: VideoProcessor;

    constructor(videoProcessor: VideoProcessor) {
        this.videoProcessor = videoProcessor;
    }

    /**
     * 비디오 준비 (다운로드 또는 업로드된 파일 사용)
     */
    async prepareVideo(options: {
        isBlob?: boolean;
        videoPath?: string;
        videoUrl?: string;
        platform: Platform;
    }): Promise<{
        videoPath: string | null;
        videoId: string;
    }> {
        const { isBlob, videoPath, videoUrl, platform } = options;

        if (isBlob && videoPath) {
            ServerLogger.info('1️⃣ 업로드된 비디오 사용');
            return {
                videoPath: videoPath,
                videoId: 'uploaded'
            };
        }

        if (!videoUrl) {
            throw new Error('비디오 URL 또는 파일이 필요합니다');
        }

        ServerLogger.info('1️⃣ 비디오 다운로드 중...');

        // Video ID 추출
        const videoId = this.extractVideoId(videoUrl, platform);
        ServerLogger.info(`🔍 VideoId 추출: ${videoId} from ${videoUrl}`);

        // 비디오 다운로드
        const downloadStartTime = Date.now();
        ServerLogger.info(`📥 비디오 다운로드 시도: ${videoUrl}`);

        const downloadedVideoPath = await this.videoProcessor.downloadVideo(
            videoUrl,
            platform,
            videoId
        );

        const downloadTime = Date.now() - downloadStartTime;

        if (downloadedVideoPath) {
            ServerLogger.info(`✅ 비디오 다운로드 성공: ${downloadedVideoPath} (소요시간: ${downloadTime}ms)`);
        } else {
            ServerLogger.warn(`❌ 비디오 다운로드 실패 또는 경로 없음 (소요시간: ${downloadTime}ms)`);
        }

        return {
            videoPath: downloadedVideoPath || null,
            videoId
        };
    }

    /**
     * 플랫폼별 Video ID 추출
     */
    private extractVideoId(videoUrl: string, platform: Platform): string {
        ServerLogger.info(`🔍 플랫폼 디버그: platform="${platform}", PLATFORMS.YOUTUBE="${PLATFORMS.YOUTUBE}", 일치여부=${platform === PLATFORMS.YOUTUBE}`);

        switch (platform) {
            case PLATFORMS.YOUTUBE:
                const extractedId = this.videoProcessor.extractYouTubeId(videoUrl);
                ServerLogger.info(`🔍 extractYouTubeId 디버그: URL="${videoUrl}" → ID="${extractedId}"`);
                return extractedId || 'unknown';

            case PLATFORMS.INSTAGRAM:
                return this.videoProcessor.extractInstagramId(videoUrl) || 'unknown';

            case PLATFORMS.TIKTOK:
                return this.videoProcessor.extractTikTokId(videoUrl) || 'unknown';

            default:
                return 'unknown';
        }
    }

    /**
     * 플랫폼별 Video ID 추출 (공용 메서드)
     */
    getVideoIdByPlatform(videoUrl: string | undefined, platform: Platform): string | null {
        if (!videoUrl) return null;
        return this.extractVideoId(videoUrl, platform);
    }
}