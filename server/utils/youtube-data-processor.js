const { ServerLogger } = require('./logger');

/**
 * YouTube 데이터 처리 유틸리티 클래스
 * 기존 중복된 YouTube 관련 함수들을 통합:
 * - VideoProcessor.js
 * - HybridYouTubeExtractor.js
 * - YouTubeBatchProcessor.js
 * - HighViewCollector.js
 */
class YouTubeDataProcessor {
    // YouTube 카테고리 매핑 (통합된 상수)
    static YOUTUBE_CATEGORIES = {
        1: '영화/애니메이션',
        2: '자동차/교통',
        10: '음악',
        15: '애완동물/동물',
        17: '스포츠',
        19: '여행/이벤트',
        20: '게임',
        22: '인물/블로그',
        23: '코미디',
        24: '엔터테인먼트',
        25: '뉴스/정치',
        26: '노하우/스타일',
        27: '교육',
        28: '과학기술',
        29: '비영리/사회운동',
    };

    /**
     * YouTube URL에서 비디오 ID 추출 (통합된 로직)
     */
    static extractYouTubeId(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }

        try {
            const patterns = [
                // 표준 YouTube URL
                /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
                // 짧은 YouTube URL
                /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                // YouTube Shorts
                /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
                // YouTube 임베드
                /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                // YouTube 모바일
                /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        } catch (error) {
            ServerLogger.error(
                'YouTube ID 추출 실패',
                error,
                'YOUTUBE_PROCESSOR',
            );
            return null;
        }
    }

    /**
     * YouTube 동영상 시간 파싱 (PT4M13S → 초)
     */
    static parseYouTubeDuration(duration) {
        if (!duration || typeof duration !== 'string') {
            return 0;
        }

        try {
            // PT 제거
            let time = duration.replace('PT', '');
            let totalSeconds = 0;

            // 시간 파싱
            const hours = time.match(/(\d+)H/);
            const minutes = time.match(/(\d+)M/);
            const seconds = time.match(/(\d+)S/);

            if (hours) totalSeconds += parseInt(hours[1]) * 3600;
            if (minutes) totalSeconds += parseInt(minutes[1]) * 60;
            if (seconds) totalSeconds += parseInt(seconds[1]);

            return totalSeconds;
        } catch (error) {
            ServerLogger.error(
                'YouTube 시간 파싱 실패',
                error,
                'YOUTUBE_PROCESSOR',
            );
            return 0;
        }
    }

    /**
     * 초를 사람이 읽기 쉬운 형태로 변환 (253 → 4:13)
     */
    static formatDuration(seconds) {
        if (!seconds || seconds < 0) {
            return '0:00';
        }

        try {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = seconds % 60;

            if (hours > 0) {
                return `${hours}:${minutes
                    .toString()
                    .padStart(2, '0')}:${remainingSeconds
                    .toString()
                    .padStart(2, '0')}`;
            } else {
                return `${minutes}:${remainingSeconds
                    .toString()
                    .padStart(2, '0')}`;
            }
        } catch (error) {
            ServerLogger.error('시간 포맷팅 실패', error, 'YOUTUBE_PROCESSOR');
            return '0:00';
        }
    }

    /**
     * YouTube 카테고리 ID를 한글 이름으로 변환
     */
    static getCategoryName(categoryId) {
        if (!categoryId) {
            return '미분류';
        }

        return this.YOUTUBE_CATEGORIES[categoryId.toString()] || '미분류';
    }

    /**
     * 설명에서 해시태그 추출 (#태그 형태)
     */
    static extractHashtags(description) {
        if (!description || typeof description !== 'string') {
            return [];
        }

        try {
            // #으로 시작하는 단어들 추출 (공백이나 줄바꿈으로 구분)
            const hashtags = description.match(/#[a-zA-Z가-힣0-9_]+/g) || [];

            // 중복 제거 및 정리
            return [...new Set(hashtags)]
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 1)
                .slice(0, 10); // 최대 10개까지만
        } catch (error) {
            ServerLogger.error(
                '해시태그 추출 실패',
                error,
                'YOUTUBE_PROCESSOR',
            );
            return [];
        }
    }

    /**
     * 설명에서 멘션 추출 (@사용자명 형태)
     */
    static extractMentions(description) {
        if (!description || typeof description !== 'string') {
            return [];
        }

        try {
            // @으로 시작하는 단어들 추출
            const mentions = description.match(/@[a-zA-Z가-힣0-9_]+/g) || [];

            // 중복 제거 및 정리
            return [...new Set(mentions)]
                .map((mention) => mention.trim())
                .filter((mention) => mention.length > 1)
                .slice(0, 10); // 최대 10개까지만
        } catch (error) {
            ServerLogger.error('멘션 추출 실패', error, 'YOUTUBE_PROCESSOR');
            return [];
        }
    }

    /**
     * customUrl에서 YouTube 핸들명 추출
     */
    static extractYouTubeHandle(customUrl) {
        if (!customUrl || typeof customUrl !== 'string') {
            return null;
        }

        try {
            // @핸들명 형태인지 확인
            if (customUrl.startsWith('@')) {
                return customUrl;
            }

            // /c/ 또는 /user/ 형태에서 핸들명 추출 시도
            const patterns = [/\/c\/(.+)/, /\/user\/(.+)/, /\/(.+)/];

            for (const pattern of patterns) {
                const match = customUrl.match(pattern);
                if (match && match[1]) {
                    return `@${match[1]}`;
                }
            }

            return null;
        } catch (error) {
            ServerLogger.error(
                'YouTube 핸들 추출 실패',
                error,
                'YOUTUBE_PROCESSOR',
            );
            return null;
        }
    }

    /**
     * 채널 URL 생성 (customUrl과 channelId 기반)
     */
    static buildChannelUrl(customUrl, channelId) {
        try {
            // customUrl이 있으면 우선 사용
            if (customUrl) {
                // 이미 전체 URL인 경우
                if (customUrl.startsWith('http')) {
                    return customUrl;
                }

                // @핸들명 형태인 경우
                if (customUrl.startsWith('@')) {
                    return `https://www.youtube.com/${customUrl}`;
                }

                // /c/ 또는 /user/ 형태인 경우
                if (customUrl.startsWith('/')) {
                    return `https://www.youtube.com${customUrl}`;
                }

                // 일반 문자열인 경우 /c/ 추가
                return `https://www.youtube.com/c/${customUrl}`;
            }

            // customUrl이 없으면 channelId 사용
            if (channelId) {
                return `https://www.youtube.com/channel/${channelId}`;
            }

            return null;
        } catch (error) {
            ServerLogger.error(
                '채널 URL 생성 실패',
                error,
                'YOUTUBE_PROCESSOR',
            );
            return null;
        }
    }

    /**
     * 썸네일 URL 생성 (최고 화질부터 폴백)
     */
    static buildThumbnailUrl(videoId, quality = null) {
        if (!videoId) {
            return null;
        }

        // 화질 우선순위 (높은 것부터)
        const qualityOrder = [
            'maxresdefault',  // 1280x720
            'hqdefault',      // 480x360
            'mqdefault',      // 320x180
            'default',        // 120x90
        ];

        // 특정 화질이 지정된 경우
        if (quality && qualityOrder.includes(quality)) {
            return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
        }

        // 최고 화질 반환 (실제로는 클라이언트에서 폴백 처리 필요)
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    /**
     * YouTube URL 유효성 검사
     */
    static isValidYouTubeUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        const videoId = this.extractYouTubeId(url);
        return videoId !== null;
    }

    /**
     * 콘텐츠 타입 판별 (일반 비디오 vs Shorts)
     */
    static getContentType(url, duration = null) {
        if (!url) {
            return 'video';
        }

        // URL에 shorts가 포함되어 있으면 Shorts
        if (url.includes('/shorts/')) {
            return 'shorts';
        }

        // 60초 이하이고 세로형 비율이면 Shorts일 가능성 높음
        if (duration && duration <= 60) {
            return 'shorts';
        }

        return 'video';
    }

    /**
     * 숫자 포맷팅 (1000000 → 100만)
     */
    static formatNumber(number) {
        if (!number || isNaN(number)) {
            return '0';
        }

        const num = parseInt(number);

        if (num >= 100000000) {
            return `${Math.floor(num / 100000000)}억`;
        } else if (num >= 10000000) {
            return `${Math.floor(num / 10000000)}천만`;
        } else if (num >= 1000000) {
            return `${Math.floor(num / 1000000)}백만`;
        } else if (num >= 10000) {
            return `${Math.floor(num / 10000)}만`;
        } else if (num >= 1000) {
            return `${Math.floor(num / 1000)}천`;
        }

        return num.toString();
    }

    /**
     * 메타데이터에서 키워드 추출
     */
    static extractKeywords(title = '', description = '', tags = []) {
        const keywords = [];

        try {
            // 제목에서 키워드 추출
            if (title) {
                const titleWords = title
                    .toLowerCase()
                    .replace(/[^\w가-힣\s]/g, ' ')
                    .split(/\s+/)
                    .filter((word) => word.length > 1)
                    .slice(0, 5);
                keywords.push(...titleWords);
            }

            // 설명에서 키워드 추출 (처음 100자만)
            if (description) {
                const descWords = description
                    .substring(0, 100)
                    .toLowerCase()
                    .replace(/[^\w가-힣\s]/g, ' ')
                    .split(/\s+/)
                    .filter((word) => word.length > 2)
                    .slice(0, 3);
                keywords.push(...descWords);
            }

            // 태그 추가
            if (Array.isArray(tags)) {
                const cleanTags = tags
                    .map((tag) => tag.toLowerCase().replace(/[^\w가-힣]/g, ''))
                    .filter((tag) => tag.length > 1)
                    .slice(0, 5);
                keywords.push(...cleanTags);
            }

            // 중복 제거 및 최종 정리
            return [...new Set(keywords)]
                .filter((keyword) => keyword && keyword.length > 1)
                .slice(0, 10);
        } catch (error) {
            ServerLogger.error('키워드 추출 실패', error, 'YOUTUBE_PROCESSOR');
            return [];
        }
    }

    /**
     * 메타데이터 통합 처리
     */
    static processVideoMetadata(rawData) {
        try {
            const videoId = rawData.id || this.extractYouTubeId(rawData.url);
            const snippet = rawData.snippet || {};
            const statistics = rawData.statistics || {};
            const contentDetails = rawData.contentDetails || {};

            const duration = contentDetails.duration
                ? this.parseYouTubeDuration(contentDetails.duration)
                : 0;

            // 새 인터페이스 기반 메타데이터 구조
            return {
                // 기본 정보
                videoId: videoId,
                title: snippet.title || '제목 없음',
                description: snippet.description || '',
                thumbnailUrl: this.buildThumbnailUrl(videoId),
                url: rawData.url,

                // 채널 정보
                channelId: snippet.channelId,
                channelName: snippet.channelTitle,
                channelUrl: this.buildChannelUrl(
                    snippet.customUrl,
                    snippet.channelId,
                ),
                youtubeHandle: this.extractYouTubeHandle(snippet.customUrl),

                // 통계
                views: parseInt(statistics.viewCount) || 0,
                likes: parseInt(statistics.likeCount) || 0,
                commentsCount: parseInt(statistics.commentCount) || 0,

                // 시간 정보
                duration: duration,
                durationFormatted: this.formatDuration(duration),
                uploadDate: snippet.publishedAt,

                // 카테고리
                categoryId: snippet.categoryId,
                youtubeCategory: this.getCategoryName(snippet.categoryId),
                category: this.getCategoryName(snippet.categoryId),

                // 콘텐츠 분석
                contentType: this.getContentType(rawData.url, duration),
                hashtags: this.extractHashtags(snippet.description),
                mentions: this.extractMentions(snippet.description),
                keywords: this.extractKeywords(
                    snippet.title,
                    snippet.description,
                    snippet.tags,
                ),

                // 기타
                language: snippet.defaultLanguage,
                tags: snippet.tags || [],

                // 포맷된 숫자들
                viewsFormatted: this.formatNumber(statistics.viewCount),
                likesFormatted: this.formatNumber(statistics.likeCount),
                commentsFormatted: this.formatNumber(statistics.commentCount),

                // 플랫폼 정보
                platform: 'YOUTUBE',
            };
        } catch (error) {
            ServerLogger.error(
                '메타데이터 처리 실패',
                error,
                'YOUTUBE_PROCESSOR',
            );
            // 표준화된 오류 응답
            return {
                videoId: null,
                title: '처리 실패',
                error: error.message,
            };
        }
    }

    /**
     * 배치 처리용 메타데이터 변환
     */
    static processBatchMetadata(videoList) {
        if (!Array.isArray(videoList)) {
            return [];
        }

        return videoList.map((video, index) => {
            try {
                const processed = this.processVideoMetadata(video);
                processed.batchIndex = index;
                processed.processingTime = new Date().toISOString();
                return processed;
            } catch (error) {
                ServerLogger.error(
                    `배치 처리 실패 (인덱스: ${index})`,
                    error,
                    'YOUTUBE_PROCESSOR',
                );
                // 표준화된 배치 오류 응답
                return {
                    batchIndex: index,
                    error: error.message,
                    originalData: video,
                };
            }
        });
    }
}

module.exports = YouTubeDataProcessor;
