import { ServerLogger } from '../../../utils/logger';

export class UrlProcessor {
    /**
     * YouTube URL에서 비디오 ID 추출
     */
    static extractVideoId(url: string): string | null {
        if (!url || typeof url !== 'string') {
            return null;
        }

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
            /^[a-zA-Z0-9_-]{11}$/, // 직접 비디오 ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                const videoId = match[1] || match[0];
                if (videoId && videoId.length === 11) {
                    return videoId;
                }
            }
        }

        ServerLogger.warn('유효하지 않은 YouTube URL:', url);
        return null;
    }

    /**
     * 비디오 ID를 표준 YouTube URL로 변환
     */
    static createStandardUrl(videoId: string): string {
        return `https://youtube.com/watch?v=${videoId}`;
    }

    /**
     * URL 유효성 검증
     */
    static isValidYouTubeUrl(url: string): boolean {
        return this.extractVideoId(url) !== null;
    }

    /**
     * 채널 URL 생성
     */
    static createChannelUrl(channelId: string): string {
        return `https://www.youtube.com/channel/${channelId}`;
    }

    /**
     * YouTube Shorts URL인지 확인
     */
    static isShortsUrl(url: string): boolean {
        return url.includes('/shorts/');
    }

    /**
     * YouTube 임베드 URL 생성
     */
    static createEmbedUrl(videoId: string): string {
        return `https://www.youtube.com/embed/${videoId}`;
    }

    /**
     * 썸네일 URL 생성
     */
    static createThumbnailUrls(videoId: string): {
        default: string;
        medium: string;
        high: string;
        standard: string;
        maxres: string;
    } {
        const baseUrl = `https://img.youtube.com/vi/${videoId}`;
        return {
            default: `${baseUrl}/default.jpg`,
            medium: `${baseUrl}/mqdefault.jpg`,
            high: `${baseUrl}/hqdefault.jpg`,
            standard: `${baseUrl}/sddefault.jpg`,
            maxres: `${baseUrl}/maxresdefault.jpg`,
        };
    }
}

export default UrlProcessor;