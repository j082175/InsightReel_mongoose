import { ServerLogger } from "../../../utils/logger";

interface SheetsVideoData {
    _id?: string;
    title: string;
    views: number;
    channelName: string;
    uploadDate: string;
    thumbnailUrl?: string;
    platform: string;
    [key: string]: any;
}

interface ProcessedVideoData {
    success: boolean;
    processedData?: any[][];
    headers?: string[];
    error?: string;
}

interface BatchProcessResult {
    success: boolean;
    processedCount: number;
    failedCount: number;
    errors: string[];
}

export class VideoDataProcessor {
    private static readonly VIDEO_HEADERS = [
        "제목",
        "조회수",
        "채널명",
        "업로드일",
        "썸네일",
        "대카테고리",
        "중카테고리",
        "소카테고리",
        "키워드",
        "분석결과",
        "요약",
        "URL",
        "비디오 길이",
        "좋아요",
        "댓글수",
        "구독자수",
        "채널설명",
        "태그",
        "언어",
        "업로드시간",
    ];

    private static readonly CHANNEL_HEADERS = [
        "채널명",
        "구독자수",
        "총 조회수",
        "비디오 개수",
        "채널 생성일",
        "채널 설명",
        "국가",
        "카테고리",
        "채널 URL",
        "프로필 이미지",
        "배너 이미지",
        "검증 상태",
    ];

    /**
     * 단일 비디오 데이터 처리
     */
    static processVideoData(
        videoData: SheetsVideoData,
        platform: string = "YOUTUBE"
    ): ProcessedVideoData {
        try {
            if (!videoData || typeof videoData !== "object") {
                return {
                    success: false,
                    error: "유효하지 않은 비디오 데이터입니다",
                };
            }

            const headers = this.VIDEO_HEADERS;
            const processedRow = this.convertVideoToRow(videoData, platform);

            return {
                success: true,
                processedData: [processedRow],
                headers,
            };
        } catch (error) {
            ServerLogger.error("비디오 데이터 처리 실패:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "데이터 처리 중 오류",
            };
        }
    }

    /**
     * 다중 비디오 데이터 배치 처리
     */
    static processBatchVideoData(
        videoDataArray: SheetsVideoData[],
        platform: string = "YOUTUBE"
    ): ProcessedVideoData {
        try {
            if (!Array.isArray(videoDataArray) || videoDataArray.length === 0) {
                return {
                    success: false,
                    error: "유효하지 않은 비디오 데이터 배열입니다",
                };
            }

            const headers = this.VIDEO_HEADERS;
            const processedRows: any[][] = [];
            const errors: string[] = [];

            videoDataArray.forEach((videoData, index) => {
                try {
                    const row = this.convertVideoToRow(videoData, platform);
                    processedRows.push(row);
                } catch (error) {
                    const errorMsg = `인덱스 ${index} 처리 실패: ${
                        error instanceof Error ? error.message : "알 수 없는 오류"
                    }`;
                    errors.push(errorMsg);
                    ServerLogger.warn(errorMsg);
                }
            });

            if (processedRows.length === 0) {
                return {
                    success: false,
                    error: `모든 데이터 처리 실패. 오류: ${errors.join(", ")}`,
                };
            }

            if (errors.length > 0) {
                ServerLogger.warn(`배치 처리 중 ${errors.length}개 오류 발생`);
            }

            return {
                success: true,
                processedData: processedRows,
                headers,
            };
        } catch (error) {
            ServerLogger.error("배치 비디오 데이터 처리 실패:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "배치 처리 중 오류",
            };
        }
    }

    /**
     * 비디오 데이터를 시트 행으로 변환
     */
    private static convertVideoToRow(videoData: SheetsVideoData, platform: string): any[] {
        // 기본값 설정
        const defaults = {
            title: videoData.title || "제목 없음",
            views: this.formatNumber(videoData.views || 0),
            channelName: videoData.channelName || "채널명 없음",
            uploadDate: this.formatDate(videoData.uploadDate),
            thumbnailUrl: videoData.thumbnailUrl || "",
            mainCategory: videoData.mainCategory || "",
            middleCategory: videoData.middleCategory || "",
            subCategory: videoData.subCategory || "",
            keywords: this.formatArray(videoData.keywords),
            analysisResult: videoData.analysisResult || "",
            summary: videoData.summary || "",
            url: videoData.url || videoData.videoUrl || "",
            duration: this.formatDuration(videoData.duration),
            likes: this.formatNumber(videoData.likes || 0),
            comments: this.formatNumber(videoData.comments || 0),
            subscribers: this.formatNumber(videoData.subscribers || 0),
            channelDescription: videoData.channelDescription || "",
            tags: this.formatArray(videoData.tags),
            language: videoData.language || "",
            uploadTime: this.formatTime(videoData.uploadTime || videoData.uploadDate),
        };

        // 헤더 순서에 맞게 배열 생성
        return [
            defaults.title,
            defaults.views,
            defaults.channelName,
            defaults.uploadDate,
            defaults.thumbnailUrl,
            defaults.mainCategory,
            defaults.middleCategory,
            defaults.subCategory,
            defaults.keywords,
            defaults.analysisResult,
            defaults.summary,
            defaults.url,
            defaults.duration,
            defaults.likes,
            defaults.comments,
            defaults.subscribers,
            defaults.channelDescription,
            defaults.tags,
            defaults.language,
            defaults.uploadTime,
        ];
    }

    /**
     * 채널 데이터 처리
     */
    static processChannelData(channelData: any): ProcessedVideoData {
        try {
            if (!channelData || typeof channelData !== "object") {
                return {
                    success: false,
                    error: "유효하지 않은 채널 데이터입니다",
                };
            }

            const headers = this.CHANNEL_HEADERS;
            const processedRow = this.convertChannelToRow(channelData);

            return {
                success: true,
                processedData: [processedRow],
                headers,
            };
        } catch (error) {
            ServerLogger.error("채널 데이터 처리 실패:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "채널 데이터 처리 중 오류",
            };
        }
    }

    /**
     * 채널 데이터를 시트 행으로 변환
     */
    private static convertChannelToRow(channelData: any): any[] {
        return [
            channelData.name || channelData.channelName || "채널명 없음",
            this.formatNumber(channelData.subscribers || channelData.subscriberCount || 0),
            this.formatNumber(channelData.totalViews || channelData.viewCount || 0),
            this.formatNumber(channelData.videoCount || 0),
            this.formatDate(channelData.createdAt || channelData.publishedAt),
            channelData.description || "",
            channelData.country || "",
            channelData.category || "",
            channelData.url || channelData.channelUrl || "",
            channelData.profileImageUrl || channelData.thumbnailUrl || "",
            channelData.bannerImageUrl || "",
            channelData.isVerified ? "인증됨" : "미인증",
        ];
    }

    /**
     * 숫자 포맷팅 (한국어 단위)
     */
    private static formatNumber(value: any): string {
        const num = parseInt(value?.toString() || "0");

        if (num >= 100000000) {
            return Math.floor(num / 100000000) + "억";
        } else if (num >= 10000) {
            return Math.floor(num / 10000) + "만";
        } else if (num >= 1000) {
            return Math.floor(num / 1000) + "천";
        } else {
            return num.toString();
        }
    }

    /**
     * 날짜 포맷팅
     */
    private static formatDate(dateValue: any): string {
        if (!dateValue) return "";

        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return dateValue?.toString() || "";

            return date.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
        } catch {
            return dateValue?.toString() || "";
        }
    }

    /**
     * 시간 포맷팅
     */
    private static formatTime(timeValue: any): string {
        if (!timeValue) return "";

        try {
            const date = new Date(timeValue);
            if (isNaN(date.getTime())) return timeValue?.toString() || "";

            return date.toLocaleString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return timeValue?.toString() || "";
        }
    }

    /**
     * 배열 포맷팅 (쉼표로 구분)
     */
    private static formatArray(arrayValue: any): string {
        if (!arrayValue) return "";

        if (Array.isArray(arrayValue)) {
            return arrayValue.filter((item) => item && typeof item === "string").join(", ");
        }

        if (typeof arrayValue === "string") {
            return arrayValue;
        }

        return arrayValue?.toString() || "";
    }

    /**
     * 지속시간 포맷팅
     */
    private static formatDuration(duration: any): string {
        if (!duration) return "";

        // 숫자인 경우 (초 단위)
        if (typeof duration === "number") {
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = Math.floor(duration % 60);

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
                    .toString()
                    .padStart(2, "0")}`;
            } else {
                return `${minutes}:${seconds.toString().padStart(2, "0")}`;
            }
        }

        // ISO 8601 duration 형식 (PT#M#S)
        if (typeof duration === "string" && duration.startsWith("PT")) {
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
                const hours = parseInt(match[1] || "0");
                const minutes = parseInt(match[2] || "0");
                const seconds = parseInt(match[3] || "0");

                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
                        .toString()
                        .padStart(2, "0")}`;
                } else {
                    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
                }
            }
        }

        // 기타 문자열 형식
        return duration?.toString() || "";
    }

    /**
     * 데이터 유효성 검사
     */
    static validateVideoData(videoData: SheetsVideoData): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!videoData.title || typeof videoData.title !== "string") {
            errors.push("제목이 유효하지 않습니다");
        }

        if (
            videoData.views !== undefined &&
            (typeof videoData.views !== "number" || videoData.views < 0)
        ) {
            errors.push("조회수가 유효하지 않습니다");
        }

        if (!videoData.channelName || typeof videoData.channelName !== "string") {
            errors.push("채널명이 유효하지 않습니다");
        }

        if (videoData.uploadDate && isNaN(new Date(videoData.uploadDate).getTime())) {
            errors.push("업로드 날짜가 유효하지 않습니다");
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * 플랫폼별 헤더 반환
     */
    static getHeadersForPlatform(platform: string): string[] {
        switch (platform.toUpperCase()) {
            case "YOUTUBE":
            case "INSTAGRAM":
            case "TIKTOK":
                return [...this.VIDEO_HEADERS];
            default:
                return [...this.VIDEO_HEADERS];
        }
    }

    /**
     * 채널 데이터 헤더 반환
     */
    static getChannelHeaders(): string[] {
        return [...this.CHANNEL_HEADERS];
    }

    /**
     * 데이터 통계 생성
     */
    static generateDataStats(videoDataArray: SheetsVideoData[]): {
        totalVideos: number;
        totalViews: number;
        averageViews: number;
        platforms: { [key: string]: number };
        channels: { [key: string]: number };
    } {
        const stats = {
            totalVideos: videoDataArray.length,
            totalViews: 0,
            averageViews: 0,
            platforms: {} as { [key: string]: number },
            channels: {} as { [key: string]: number },
        };

        videoDataArray.forEach((video) => {
            // 조회수 합계
            const views = parseInt(video.views?.toString() || "0");
            stats.totalViews += views;

            // 플랫폼 통계
            const platform = video.platform || "UNKNOWN";
            stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;

            // 채널 통계
            const channel = video.channelName || "Unknown";
            stats.channels[channel] = (stats.channels[channel] || 0) + 1;
        });

        stats.averageViews =
            stats.totalVideos > 0 ? Math.floor(stats.totalViews / stats.totalVideos) : 0;

        return stats;
    }
}

export default VideoDataProcessor;
