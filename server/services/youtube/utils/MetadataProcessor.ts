import { VideoThumbnail } from '../types/extraction-types';
import { ServerLogger } from '../../../utils/logger';

export class MetadataProcessor {
    /**
     * 해시태그 추출
     */
    static extractHashtags(description: string): string[] {
        if (!description || typeof description !== 'string') {
            return [];
        }

        try {
            const hashtags = description.match(/#[\w가-힣]+/g) || [];
            const uniqueHashtags = [...new Set(hashtags)];

            ServerLogger.debug('해시태그 추출 완료:', {
                count: uniqueHashtags.length,
                hashtags: uniqueHashtags.slice(0, 5) // 처음 5개만 로깅
            });

            return uniqueHashtags;
        } catch (error) {
            ServerLogger.warn('해시태그 추출 실패:', error);
            return [];
        }
    }

    /**
     * 멘션 추출
     */
    static extractMentions(description: string): string[] {
        if (!description || typeof description !== 'string') {
            return [];
        }

        try {
            const mentions = description.match(/@[\w가-힣.-]+/g) || [];
            const uniqueMentions = [...new Set(mentions)];

            ServerLogger.debug('멘션 추출 완료:', {
                count: uniqueMentions.length,
                mentions: uniqueMentions.slice(0, 5) // 처음 5개만 로깅
            });

            return uniqueMentions;
        } catch (error) {
            ServerLogger.warn('멘션 추출 실패:', error);
            return [];
        }
    }

    /**
     * ISO 8601 duration을 초로 변환 (PT15M33S -> 933초)
     */
    static parseDuration(isoDuration: string): number {
        if (!isoDuration || typeof isoDuration !== 'string') {
            return 0;
        }

        try {
            const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) {
                ServerLogger.warn('잘못된 ISO 8601 duration 형식:', isoDuration);
                return 0;
            }

            const hours = parseInt(match[1]) || 0;
            const minutes = parseInt(match[2]) || 0;
            const seconds = parseInt(match[3]) || 0;

            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            ServerLogger.debug('Duration 파싱 완료:', {
                input: isoDuration,
                hours,
                minutes,
                seconds,
                totalSeconds
            });

            return totalSeconds;
        } catch (error) {
            ServerLogger.warn('Duration 파싱 실패:', error);
            return 0;
        }
    }

    /**
     * 최적 썸네일 선택 (가장 큰 해상도)
     */
    static getBestThumbnail(thumbnails: VideoThumbnail[]): VideoThumbnail | null {
        if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
            return null;
        }

        try {
            const bestThumbnail = thumbnails.reduce((best, current) => {
                if (!best) return current;

                const bestSize = (best.width || 0) * (best.height || 0);
                const currentSize = (current.width || 0) * (current.height || 0);

                return currentSize > bestSize ? current : best;
            });

            ServerLogger.debug('최적 썸네일 선택 완료:', {
                totalThumbnails: thumbnails.length,
                selectedSize: `${bestThumbnail.width}x${bestThumbnail.height}`,
                url: bestThumbnail.url?.substring(0, 50) + '...'
            });

            return bestThumbnail;
        } catch (error) {
            ServerLogger.warn('썸네일 선택 실패:', error);
            return thumbnails[0] || null;
        }
    }

    /**
     * 안전한 정수 변환
     */
    static safeParseInt(value: any, defaultValue: number = 0): number {
        try {
            if (value === null || value === undefined) {
                return defaultValue;
            }

            const parsed = parseInt(String(value));
            return isNaN(parsed) ? defaultValue : parsed;
        } catch (error) {
            ServerLogger.warn('정수 변환 실패:', { value, error });
            return defaultValue;
        }
    }

    /**
     * 날짜 문자열 검증 및 정규화
     */
    static normalizeDate(dateString: string): string {
        if (!dateString || typeof dateString !== 'string') {
            return '';
        }

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                ServerLogger.warn('잘못된 날짜 형식:', dateString);
                return dateString;
            }

            return date.toISOString();
        } catch (error) {
            ServerLogger.warn('날짜 정규화 실패:', error);
            return dateString;
        }
    }

    /**
     * 배열 안전 처리
     */
    static safeArray<T>(value: any): T[] {
        if (Array.isArray(value)) {
            return value.filter(item => item !== null && item !== undefined);
        }
        return [];
    }

    /**
     * 문자열 안전 처리
     */
    static safeString(value: any, defaultValue: string = ''): string {
        if (typeof value === 'string') {
            return value.trim();
        }
        if (value !== null && value !== undefined) {
            return String(value).trim();
        }
        return defaultValue;
    }

    /**
     * 불린 안전 처리
     */
    static safeBoolean(value: any, defaultValue: boolean = false): boolean {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        return defaultValue;
    }

    /**
     * YouTube 카테고리 ID를 한국어 카테고리명으로 변환
     */
    static getCategoryName(categoryId: string): string {
        const categories: { [key: string]: string } = {
            '1': '영화/애니메이션',
            '2': '자동차/교통',
            '10': '음악',
            '15': '애완동물/동물',
            '17': '스포츠',
            '19': '여행/이벤트',
            '20': '게임',
            '22': '인물/블로그',
            '23': '코미디',
            '24': '엔터테인먼트',
            '25': '뉴스/정치',
            '26': '노하우/스타일',
            '27': '교육',
            '28': '과학기술',
            '29': '비영리/사회운동'
        };

        return categories[categoryId] || `카테고리 ${categoryId}`;
    }

    /**
     * 언어 코드 정규화
     */
    static normalizeLanguage(language: string): string {
        if (!language) return '';

        const languageMap: { [key: string]: string } = {
            'ko': '한국어',
            'en': '영어',
            'ja': '일본어',
            'zh': '중국어',
            'es': '스페인어',
            'fr': '프랑스어',
            'de': '독일어',
            'ru': '러시아어',
            'pt': '포르투갈어',
            'it': '이탈리아어'
        };

        const lowerLang = language.toLowerCase().substring(0, 2);
        return languageMap[lowerLang] || language;
    }
}

export default MetadataProcessor;