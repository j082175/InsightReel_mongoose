import { ServerLogger } from '../../../utils/logger';

interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingRow?: number;
    sheetName?: string;
    error?: string;
}

interface MongoDBRegistration {
    success: boolean;
    error?: string;
}

export class DuplicateChecker {
    private sheets: any;
    private spreadsheetId: string;
    private cache: Map<string, any>;
    private cacheTTL: number;

    constructor(sheets: any, spreadsheetId: string) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
        this.cache = new Map();
        this.cacheTTL = 300000; // 5분 캐시 (URL 중복 체크는 좀 더 길게)
    }

    /**
     * 빠른 URL 중복 체크 (캐시 활용)
     */
    async checkDuplicateURLFast(videoUrl: string): Promise<DuplicateCheckResult> {
        try {
            if (!videoUrl || typeof videoUrl !== 'string') {
                return {
                    isDuplicate: false,
                    error: '유효하지 않은 URL입니다'
                };
            }

            // 캐시에서 먼저 확인
            const cacheKey = `duplicate_${videoUrl}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // MongoDB에서 우선 확인 (더 빠름)
            const mongoResult = await this.checkDuplicateInMongoDB(videoUrl);
            if (mongoResult.isDuplicate) {
                const result = {
                    isDuplicate: true,
                    sheetName: 'MongoDB',
                    existingRow: -1 // MongoDB는 행 번호가 없음
                };
                this.setCache(cacheKey, result);
                return result;
            }

            // Google Sheets에서 확인
            const sheetsResult = await this.checkDuplicateInSheets(videoUrl);
            this.setCache(cacheKey, sheetsResult);

            return sheetsResult;

        } catch (error) {
            ServerLogger.error('빠른 중복 체크 실패:', error);
            return {
                isDuplicate: false,
                error: error instanceof Error ? error.message : '중복 체크 실패'
            };
        }
    }

    /**
     * 전체 URL 중복 체크 (모든 시트 검색)
     */
    async checkDuplicateURL(videoUrl: string): Promise<DuplicateCheckResult> {
        try {
            if (!videoUrl || typeof videoUrl !== 'string') {
                return {
                    isDuplicate: false,
                    error: '유효하지 않은 URL입니다'
                };
            }

            ServerLogger.info(`URL 중복 체크 시작: ${videoUrl.substring(0, 50)}...`);

            // 모든 시트 목록 조회
            const sheetsResponse = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const sheets = sheetsResponse.data.sheets || [];
            const platforms = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'];

            // 각 플랫폼 시트에서 검색
            for (const platform of platforms) {
                const sheet = sheets.find((s: any) =>
                    s.properties.title.toUpperCase() === platform
                );

                if (!sheet) continue;

                const result = await this.searchUrlInSheet(platform, videoUrl);
                if (result.isDuplicate) {
                    return result;
                }
            }

            ServerLogger.info('URL 중복 없음');
            return { isDuplicate: false };

        } catch (error) {
            ServerLogger.error('URL 중복 체크 실패:', error);
            return {
                isDuplicate: false,
                error: error instanceof Error ? error.message : '중복 체크 실패'
            };
        }
    }

    /**
     * 특정 시트에서 URL 검색
     */
    private async searchUrlInSheet(sheetName: string, videoUrl: string): Promise<DuplicateCheckResult> {
        try {
            // URL 컬럼은 보통 L열(12번째) 또는 그 근처에 있음
            const searchRanges = [
                'L:L', // 12번째 열
                'M:M', // 13번째 열
                'K:K'  // 11번째 열
            ];

            for (const range of searchRanges) {
                const fullRange = `${sheetName}!${range}`;

                const response = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: fullRange
                });

                const values = response.data.values || [];

                // URL 매칭 검색
                for (let i = 0; i < values.length; i++) {
                    const cellValue = values[i]?.[0];
                    if (cellValue && typeof cellValue === 'string') {
                        if (this.areUrlsEqual(cellValue, videoUrl)) {
                            return {
                                isDuplicate: true,
                                existingRow: i + 1, // 1-based 행 번호
                                sheetName
                            };
                        }
                    }
                }
            }

            return { isDuplicate: false };

        } catch (error) {
            ServerLogger.warn(`시트 검색 실패 (${sheetName}):`, error);
            return { isDuplicate: false };
        }
    }

    /**
     * Google Sheets에서 중복 확인
     */
    private async checkDuplicateInSheets(videoUrl: string): Promise<DuplicateCheckResult> {
        try {
            // 모든 시트 검색
            const result = await this.checkDuplicateURL(videoUrl);
            return result;

        } catch (error) {
            ServerLogger.error('Sheets 중복 체크 실패:', error);
            return { isDuplicate: false };
        }
    }

    /**
     * MongoDB에서 중복 확인
     */
    private async checkDuplicateInMongoDB(videoUrl: string): Promise<DuplicateCheckResult> {
        try {
            // VideoUrl 모델을 동적으로 import
            const VideoUrl = require('../../../models/VideoUrl');

            const existingUrl = await VideoUrl.findOne({ url: videoUrl });

            if (existingUrl) {
                return {
                    isDuplicate: true,
                    sheetName: existingUrl.sheetName || 'MongoDB',
                    existingRow: existingUrl.row || -1
                };
            }

            return { isDuplicate: false };

        } catch (error) {
            ServerLogger.warn('MongoDB 중복 체크 실패:', error);
            // MongoDB 실패는 치명적이지 않으므로 false 반환
            return { isDuplicate: false };
        }
    }

    /**
     * MongoDB에 URL 등록
     */
    async registerUrlInMongoDB(
        videoUrl: string,
        platform: string,
        sheetName: string,
        column: string,
        row: number
    ): Promise<MongoDBRegistration> {
        try {
            const VideoUrl = require('../../../models/VideoUrl');

            const urlData = new VideoUrl({
                url: videoUrl,
                platform: platform.toUpperCase(),
                sheetName,
                column,
                row,
                createdAt: new Date()
            });

            await urlData.save();

            ServerLogger.info(`URL MongoDB 등록 완료: ${videoUrl.substring(0, 50)}...`);

            // 캐시 무효화
            const cacheKey = `duplicate_${videoUrl}`;
            this.cache.delete(cacheKey);

            return { success: true };

        } catch (error) {
            ServerLogger.error('MongoDB URL 등록 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'MongoDB 등록 실패'
            };
        }
    }

    /**
     * URL 동등성 비교
     */
    private areUrlsEqual(url1: string, url2: string): boolean {
        if (url1 === url2) return true;

        try {
            // URL 정규화 후 비교
            const normalized1 = this.normalizeUrl(url1);
            const normalized2 = this.normalizeUrl(url2);
            return normalized1 === normalized2;
        } catch {
            // URL 파싱 실패 시 문자열 비교
            return url1.trim().toLowerCase() === url2.trim().toLowerCase();
        }
    }

    /**
     * URL 정규화
     */
    private normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url.trim());

            // 프로토콜 정규화
            urlObj.protocol = 'https:';

            // www 제거
            urlObj.hostname = urlObj.hostname.replace(/^www\./, '');

            // YouTube 정규화
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
                const videoId = this.extractYouTubeId(url);
                if (videoId) {
                    return `https://youtube.com/watch?v=${videoId}`;
                }
            }

            // Instagram 정규화
            if (urlObj.hostname.includes('instagram.com')) {
                // /p/ 또는 /reel/ 경로 정규화
                const match = urlObj.pathname.match(/\/(p|reel)\/([^\/\?]+)/);
                if (match) {
                    return `https://instagram.com/${match[1]}/${match[2]}`;
                }
            }

            // TikTok 정규화
            if (urlObj.hostname.includes('tiktok.com')) {
                const match = urlObj.pathname.match(/\/@[^\/]+\/video\/(\d+)/);
                if (match) {
                    return `https://tiktok.com/video/${match[1]}`;
                }
            }

            // 기본 정규화 (쿼리 파라미터 제거)
            urlObj.search = '';
            urlObj.hash = '';

            return urlObj.toString();

        } catch {
            return url.trim().toLowerCase();
        }
    }

    /**
     * YouTube ID 추출
     */
    private extractYouTubeId(url: string): string | null {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
            /youtube\.com\/embed\/([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * 캐시에서 데이터 조회
     */
    private getFromCache(key: string): any {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    /**
     * 캐시에 데이터 저장
     */
    private setCache(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * 캐시 무효화
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 중복 URL 통계
     */
    async getDuplicateStats(): Promise<{
        totalChecked: number;
        duplicatesFound: number;
        cacheHitRate: number;
    }> {
        // 간단한 통계 - 실제 구현에서는 더 정교한 메트릭 필요
        return {
            totalChecked: this.cache.size,
            duplicatesFound: 0, // 실제 카운트 필요
            cacheHitRate: 0.0 // 실제 계산 필요
        };
    }

    /**
     * 특정 플랫폼의 모든 URL 목록 반환
     */
    async getAllUrlsFromSheet(sheetName: string): Promise<string[]> {
        try {
            const result = await this.searchUrlInSheet(sheetName, '');
            // 실제 구현에서는 모든 URL을 반환하도록 수정 필요
            return [];

        } catch (error) {
            ServerLogger.error(`URL 목록 조회 실패 (${sheetName}):`, error);
            return [];
        }
    }
}

export default DuplicateChecker;