import type { HybridYouTubeData, LegacyFormatData } from "../types/video-types";
import { ServerLogger } from "../utils/logger";

// 임시로 require 사용 (YouTubeDataProcessor는 아직 JS 파일)
// 컴파일 후 dist에서 실행되므로 경로 조정
const YouTubeDataProcessor = require("../../../server/utils/youtube-data-processor");

/**
 * 🔄 하이브리드 YouTube 데이터를 기존 VideoProcessor 포맷으로 변환
 */
export class HybridDataConverter {
    /**
     * 하이브리드 데이터를 기존 getYouTubeVideoInfo 포맷으로 변환
     */
    static convertToLegacyFormat(hybridData: HybridYouTubeData, videoId: string): LegacyFormatData {
        try {
            // 통합된 YouTube 유틸리티 사용

            // 기본 변환
            const converted: LegacyFormatData = {
                videoId: videoId,
                title: hybridData.title || "제목 없음",
                description: hybridData.description || "",
                channel: hybridData.channelName || hybridData.channelTitle || "채널 없음",
                channelId: hybridData.channelId || "",

                // 날짜 처리
                publishedAt:
                    hybridData.publishedAt || hybridData.uploadDate || new Date().toISOString(),

                // 썸네일 처리
                thumbnailUrl: YouTubeDataProcessor.buildThumbnailUrl(videoId),

                // 카테고리 처리
                category: this.convertCategory(hybridData),
                categoryId: String(hybridData.youtubeCategoryId || hybridData.categoryId || "0"),

                // 길이 및 콘텐츠 타입
                duration: hybridData.duration || 0,
                durationFormatted: YouTubeDataProcessor.formatDuration(hybridData.duration || 0),
                contentType: (hybridData.duration || 0) <= 60 ? "shortform" : "longform",
                isShortForm: (hybridData.duration || 0) <= 60,

                // 메타데이터
                tags: hybridData.tags || hybridData.keywords || [],

                // 통계 (하이브리드의 핵심 장점) - 문자열로 변환
                views: String(hybridData.viewCount || hybridData.views || "0"),
                likes: String(hybridData.likeCount || hybridData.likes || "0"),
                commentsCount: String(hybridData.commentCount || hybridData.commentsCount || "0"),

                // 채널 정보 (하이브리드 데이터에서 매핑) - 문자열로 변환
                subscribers: String(hybridData.subscribers || hybridData.subscriberCount || "0"),
                channelVideos: String(
                    hybridData.channelVideos || hybridData.channelVideoCount || "0"
                ),
                channelViews: String(hybridData.channelViews || hybridData.channelViewCount || "0"),
                channelCountry: hybridData.channelCountry || "",
                channelDescription: hybridData.channelDescription || "",

                // 해시태그 및 멘션 (설명에서 추출)
                hashtags: YouTubeDataProcessor.extractHashtags(hybridData.description || ""),
                mentions: YouTubeDataProcessor.extractMentions(hybridData.description || ""),

                // 댓글 및 추가 채널 정보 - 객체 배열 처리 개선
                topComments: this.formatComments(hybridData.topComments),
                youtubeHandle: hybridData.youtubeHandle || hybridData.channelCustomUrl || "",
                channelUrl:
                    hybridData.channelUrl ||
                    `https://www.youtube.com/channel/${hybridData.channelId || ""}`,

                // 하이브리드 메타데이터
                extractionMethod: "hybrid",
                dataSources:
                    hybridData.dataSources && hybridData.dataSources.primary
                        ? (hybridData.dataSources as { primary: string; [key: string]: any })
                        : { primary: "unknown" },

                // 추가 정보
                youtubeCategory: hybridData.category || "미분류",
                license: "YOUTUBE",
                definition: "hd", // 기본값
                privacy: "public", // 기본값

                // Live 스트림 정보
                isLiveContent: hybridData.isLiveContent || false,
                isLive: hybridData.isLive || false,
            };

            ServerLogger.info("🔄 하이브리드 → 레거시 포맷 변환 완료", {
                title: converted.title.substring(0, 50),
                sources: hybridData.dataSources,
                stats: `${converted.views} views, ${converted.likes} likes`,
            });

            return converted;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            ServerLogger.error("하이브리드 데이터 변환 실패:", errorMessage);

            // 최소한의 기본 데이터 반환
            return {
                videoId: videoId,
                title: hybridData?.title || "변환 실패",
                description: hybridData?.description || "",
                channel: hybridData?.channelName || "알 수 없음",
                channelId: hybridData?.channelId || "",
                publishedAt: new Date().toISOString(),
                thumbnailUrl: "",
                category: "미분류",
                categoryId: "0",
                duration: 0,
                durationFormatted: "00:00",
                contentType: "longform",
                isShortForm: false,
                tags: [],
                views: "0",
                likes: "0",
                commentsCount: "0",
                subscribers: "0",
                channelVideos: "0",
                channelViews: "0",
                channelCountry: "",
                channelDescription: "",
                hashtags: [],
                mentions: [],
                topComments: "",
                youtubeHandle: "",
                channelUrl: "",
                extractionMethod: "hybrid-fallback",
                dataSources: { primary: "error" },
                youtubeCategory: "미분류",
                license: "YOUTUBE",
                definition: "hd",
                privacy: "public",
                isLiveContent: false,
                isLive: false,
                error: errorMessage,
            };
        }
    }

    /**
     * 댓글 배열을 문자열로 포맷팅
     */
    static formatComments(comments: any): string {
        if (!comments) return "";

        // 이미 문자열인 경우
        if (typeof comments === "string") {
            return comments.replace(/\[object Object\]/g, "");
        }

        // 배열인 경우
        if (Array.isArray(comments)) {
            return comments
                .map((comment) => {
                    if (typeof comment === "string") return comment;
                    if (comment && typeof comment === "object") {
                        // 댓글 객체에서 텍스트 추출
                        return (
                            comment.text ||
                            comment.snippet?.textOriginal ||
                            comment.snippet?.textDisplay ||
                            String(comment).replace("[object Object]", "댓글")
                        );
                    }
                    return String(comment);
                })
                .filter((text) => text && text.trim())
                .join("\n");
        }

        // 객체인 경우
        if (typeof comments === "object") {
            return (
                comments.text ||
                comments.snippet?.textOriginal ||
                comments.snippet?.textDisplay ||
                ""
            );
        }

        return String(comments);
    }

    // /**
    //  * 썸네일 URL 추출 (커스텀 로직 유지)
    //  */
    // static extractThumbnailUrl(data: any, videoId: string): string {
    //   // ytdl-core 썸네일 배열에서 최고 화질 선택
    //   if (
    //     data.thumbnails &&
    //     Array.isArray(data.thumbnails) &&
    //     data.thumbnails.length > 0
    //   ) {
    //     const best = data.thumbnails[data.thumbnails.length - 1];
    //     return best.url;
    //   }

    //   // 단일 썸네일
    //   if (data.thumbnail && data.thumbnail.url) {
    //     return data.thumbnail.url;
    //   }

    //   // YouTubeDataProcessor 사용
    //   return YouTubeDataProcessor.buildThumbnailUrl(videoId);
    // }

    /**
     * 카테고리 변환 (YouTubeDataProcessor 사용)
     */
    static convertCategory(data: HybridYouTubeData): string {
        // API에서 categoryId가 있는 경우
        if (data.youtubeCategoryId) {
            return YouTubeDataProcessor.getCategoryName(data.youtubeCategoryId);
        }

        // ytdl-core의 category 문자열
        if (data.category) {
            return data.category;
        }

        return "미분류";
    }

    // 중복 메소드들은 YouTubeDataProcessor로 통합됨
}

export default HybridDataConverter;
