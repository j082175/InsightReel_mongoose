import { ServerLogger } from "./logger";
import type { YouTubeRawData } from "../types/video-types";

// 이 클래스가 반환하는 표준화된 데이터의 형태를 인터페이스로 명확히 정의합니다.
export interface ProcessedYouTubeData {
    videoId: string | null;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    url: string;
    channelId: string;
    channelName: string;
    channelUrl: string | null;
    youtubeHandle: string | null;
    views: number;
    likes: number;
    commentsCount: number;
    duration: number;
    durationFormatted: string;
    uploadDate: string;
    categoryId: string;
    youtubeCategory: string;
    category: string;
    contentType: string;
    hashtags: string[];
    mentions: string[];
    keywords: string[];
    language: string;
    tags: string[];
    viewsFormatted: string;
    likesFormatted: string;
    commentsFormatted: string;
    platform: "YOUTUBE";
    error?: string;
    batchIndex?: number;
    processingTime?: string;
}

/**
 * YouTube 데이터 처리 유틸리티 클래스
 */
class YouTubeDataProcessor {
    static YOUTUBE_CATEGORIES: Record<string, string> = {
        "1": "영화/애니메이션", "2": "자동차/교통", "10": "음악", "15": "애완동물/동물",
        "17": "스포츠", "19": "여행/이벤트", "20": "게임", "22": "인물/블로그",
        "23": "코미디", "24": "엔터테인먼트", "25": "뉴스/정치", "26": "노하우/스타일",
        "27": "교육", "28": "과학기술", "29": "비영리/사회운동",
    };

    static extractYouTubeId(url: string | null | undefined): string | null {
        if (!url) return null;
        try {
            const patterns = [
                /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
                /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
                /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            ];
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) return match[1];
            }
            return null;
        } catch (error) {
            ServerLogger.error("YouTube ID 추출 실패", error, "YOUTUBE_PROCESSOR");
            return null;
        }
    }

    static parseYouTubeDuration(duration: string | null | undefined): number {
        if (!duration) return 0;
        try {
            const hoursMatch = duration.match(/(\d+)H/);
            const minutesMatch = duration.match(/(\d+)M/);
            const secondsMatch = duration.match(/(\d+)S/);
            const hours = hoursMatch ? parseInt(hoursMatch[1] || '0') : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1] || '0') : 0;
            const seconds = secondsMatch ? parseInt(secondsMatch[1] || '0') : 0;
            return hours * 3600 + minutes * 60 + seconds;
        } catch (error) {
            ServerLogger.error("YouTube 시간 파싱 실패", error, "YOUTUBE_PROCESSOR");
            return 0;
        }
    }
    
    static formatDuration(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined || seconds < 0) return "0:00";
        try {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
            }
            return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
        } catch (error) {
            ServerLogger.error("시간 포맷팅 실패", error, "YOUTUBE_PROCESSOR");
            return "0:00";
        }
    }

    static getCategoryName(categoryId: string | number | null | undefined): string {
        if (!categoryId) return "미분류";
        return YouTubeDataProcessor.YOUTUBE_CATEGORIES[categoryId.toString()] || "미분류";
    }

    static extractHashtags(description: string | null | undefined): string[] {
        if (!description) return [];
        try {
            const hashtags = description.match(/#[a-zA-Z가-힣0-9_]+/g) || [];
            return [...new Set(hashtags)].map((tag) => tag.trim()).filter((tag) => tag.length > 1).slice(0, 10);
        } catch (error) {
            ServerLogger.error("해시태그 추출 실패", error, "YOUTUBE_PROCESSOR");
            return [];
        }
    }

    static extractMentions(description: string | null | undefined): string[] {
        if (!description) return [];
        try {
            const mentions = description.match(/@[a-zA-Z가-힣0-9_]+/g) || [];
            return [...new Set(mentions)].map((mention) => mention.trim()).filter((mention) => mention.length > 1).slice(0, 10);
        } catch (error) {
            ServerLogger.error("멘션 추출 실패", error, "YOUTUBE_PROCESSOR");
            return [];
        }
    }

    static extractYouTubeHandle(customUrl: string | null | undefined): string | null {
        if (!customUrl) return null;
        try {
            if (customUrl.startsWith("@")) return customUrl;
            const patterns = [/\/c\/(.+)/, /\/user\/(.+)/, /\/(.+)/];
            for (const pattern of patterns) {
                const match = customUrl.match(pattern);
                if (match && match[1]) return `@${match[1]}`;
            }
            return null;
        } catch (error) {
            ServerLogger.error("YouTube 핸들 추출 실패", error, "YOUTUBE_PROCESSOR");
            return null;
        }
    }

    static buildChannelUrl(customUrl: string | null | undefined, channelId: string | null | undefined): string | null {
        try {
            if (customUrl) {
                if (customUrl.startsWith("http")) return customUrl;
                if (customUrl.startsWith("@")) return `https://www.youtube.com/${customUrl}`;
                if (customUrl.startsWith("/")) return `https://www.youtube.com${customUrl}`;
                return `https://www.youtube.com/c/${customUrl}`;
            }
            if (channelId) return `https://www.youtube.com/channel/${channelId}`;
            return null;
        } catch (error) {
            ServerLogger.error("채널 URL 생성 실패", error, "YOUTUBE_PROCESSOR");
            return null;
        }
    }

    static buildThumbnailUrl(videoId: string | null | undefined, quality: string | null = null): string | null {
        if (!videoId) return null;
        const qualityOrder = ["maxresdefault", "hqdefault", "mqdefault", "default"];
        if (quality && qualityOrder.includes(quality)) {
            return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
        }
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    static isValidYouTubeUrl(url: string | null | undefined): boolean {
        if (!url) return false;
        return YouTubeDataProcessor.extractYouTubeId(url) !== null;
    }

    static getContentType(url: string, duration: number | null = null): string {
        if (url.includes("/shorts/")) return "shorts";
        if (duration !== null && duration <= 60) return "shorts";
        return "video";
    }

    static formatNumber(num: number | string | null | undefined): string {
        if (num === null || num === undefined) return "0";
        const number = typeof num === 'string' ? parseInt(num, 10) : num;
        if (isNaN(number)) return "0";
        if (number >= 100000000) return `${Math.floor(number / 100000000)}억`;
        if (number >= 10000) return `${Math.floor(number / 10000)}만`;
        return number.toString();
    }

    static extractKeywords(title: string = "", description: string = "", tags: string[] = []): string[] {
        const keywords: string[] = [];
        try {
            if (title) {
                keywords.push(...title.toLowerCase().replace(/[^\w가-힣\s]/g, " ").split(/\s+/).filter((word) => word.length > 1).slice(0, 5));
            }
            if (description) {
                keywords.push(...description.substring(0, 100).toLowerCase().replace(/[^\w가-힣\s]/g, " ").split(/\s+/).filter((word) => word.length > 2).slice(0, 3));
            }
            if (Array.isArray(tags)) {
                keywords.push(...tags.map((tag) => tag.toLowerCase().replace(/[^\w가-힣]/g, "")).filter((tag) => tag.length > 1).slice(0, 5));
            }
            return [...new Set(keywords)].filter((keyword) => keyword && keyword.length > 1).slice(0, 10);
        } catch (error) {
            ServerLogger.error("키워드 추출 실패", error, "YOUTUBE_PROCESSOR");
            return [];
        }
    }

    static processVideoMetadata(rawData: YouTubeRawData & { url?: string, id?: string }): ProcessedYouTubeData {
        try {
            const videoId = rawData.id || YouTubeDataProcessor.extractYouTubeId(rawData.url);
            const snippet = rawData.snippet || {};
            const statistics = rawData.statistics || {};
            const contentDetails = rawData.contentDetails || {};
            const duration = contentDetails.duration ? YouTubeDataProcessor.parseYouTubeDuration(contentDetails.duration) : 0;

            return {
                videoId: videoId,
                title: snippet.title || "제목 없음",
                description: snippet.description || "",
                thumbnailUrl: YouTubeDataProcessor.buildThumbnailUrl(videoId),
                url: rawData.url || "",
                channelId: snippet.channelId,
                channelName: snippet.channelTitle,
                channelUrl: YouTubeDataProcessor.buildChannelUrl((snippet as any).customUrl, snippet.channelId),
                youtubeHandle: YouTubeDataProcessor.extractYouTubeHandle((snippet as any).customUrl),
                views: parseInt(statistics.viewCount || '0'),
                likes: parseInt(statistics.likeCount || '0'),
                commentsCount: parseInt(statistics.commentCount || '0'),
                duration: duration,
                durationFormatted: YouTubeDataProcessor.formatDuration(duration),
                uploadDate: snippet.publishedAt,
                categoryId: snippet.categoryId,
                youtubeCategory: YouTubeDataProcessor.getCategoryName(snippet.categoryId),
                category: YouTubeDataProcessor.getCategoryName(snippet.categoryId),
                contentType: YouTubeDataProcessor.getContentType(rawData.url || "", duration),
                hashtags: YouTubeDataProcessor.extractHashtags(snippet.description),
                mentions: YouTubeDataProcessor.extractMentions(snippet.description),
                keywords: YouTubeDataProcessor.extractKeywords(snippet.title, snippet.description, (snippet as any).tags),
                language: (snippet as any).defaultLanguage || (snippet as any).defaultAudioLanguage,
                tags: (snippet as any).tags || [],
                viewsFormatted: YouTubeDataProcessor.formatNumber(statistics.viewCount),
                likesFormatted: YouTubeDataProcessor.formatNumber(statistics.likeCount),
                commentsFormatted: YouTubeDataProcessor.formatNumber(statistics.commentCount),
                platform: "YOUTUBE",
            };
        } catch (error: any) {
            ServerLogger.error("메타데이터 처리 실패", error, "YOUTUBE_PROCESSOR");
            const videoId = rawData.id || YouTubeDataProcessor.extractYouTubeId(rawData.url);
            return {
                videoId: videoId, title: "처리 실패", error: error.message,
                description: "", thumbnailUrl: YouTubeDataProcessor.buildThumbnailUrl(videoId), url: rawData.url || "", channelId: "", channelName: "", channelUrl: null, youtubeHandle: null,
                views: 0, likes: 0, commentsCount: 0, duration: 0, durationFormatted: "0:00", uploadDate: "", categoryId: "",
                youtubeCategory: "미분류", category: "미분류", contentType: "video", hashtags: [], mentions: [], keywords: [],
                language: "", tags: [], viewsFormatted: "0", likesFormatted: "0", commentsFormatted: "0", platform: "YOUTUBE"
            };
        }
    }

    static processBatchMetadata(videoList: (YouTubeRawData & { url?: string, id?: string })[]): ProcessedYouTubeData[] {
        if (!Array.isArray(videoList)) return [];
        return videoList.map((video, index) => {
            try {
                const processed = YouTubeDataProcessor.processVideoMetadata(video);
                processed.batchIndex = index;
                processed.processingTime = new Date().toISOString();
                return processed;
            } catch (error: any) {
                ServerLogger.error(`배치 처리 실패 (인덱스: ${index})`, error, "YOUTUBE_PROCESSOR");
                return {
                    videoId: null, title: "처리 실패", error: error.message, batchIndex: index,
                    description: "", thumbnailUrl: null, url: "", channelId: "", channelName: "", channelUrl: null, youtubeHandle: null,
                    views: 0, likes: 0, commentsCount: 0, duration: 0, durationFormatted: "0:00", uploadDate: "", categoryId: "",
                    youtubeCategory: "미분류", category: "미분류", contentType: "video", hashtags: [], mentions: [], keywords: [],
                    language: "", tags: [], viewsFormatted: "0", likesFormatted: "0", commentsFormatted: "0", platform: "YOUTUBE"
                };
            }
        });
    }
}

export default YouTubeDataProcessor;