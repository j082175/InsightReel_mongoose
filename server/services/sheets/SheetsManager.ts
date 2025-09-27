import { ServerLogger } from '../../utils/logger';
import { PLATFORMS } from '../../config/api-messages';
import { GoogleAuthenticator } from './auth/GoogleAuthenticator';
import { VideoDataProcessor } from './processors/VideoDataProcessor';
import { SheetManager } from './managers/SheetManager';
import { DuplicateChecker } from './utils/DuplicateChecker';

interface SheetsManagerOptions {
    spreadsheetId?: string;
    cacheTTL?: number;
}

interface SaveVideoResult {
    success: boolean;
    sheetName?: string;
    row?: number;
    error?: string;
    duplicate?: boolean;
}

interface BatchSaveResult {
    success: boolean;
    savedCount: number;
    skippedCount: number;
    errors: string[];
    results: SaveVideoResult[];
}

export class SheetsManager {
    private authenticator: GoogleAuthenticator;
    private sheetManager: SheetManager | null = null;
    private duplicateChecker: DuplicateChecker | null = null;
    private cache: Map<string, any>;
    private cacheTTL: number;
    private isInitialized: boolean = false;

    constructor(options: SheetsManagerOptions = {}) {
        this.authenticator = new GoogleAuthenticator();
        this.cache = new Map();
        this.cacheTTL = options.cacheTTL || 60000; // 1분 기본 캐시

        // 스프레드시트 ID 설정
        if (options.spreadsheetId) {
            this.authenticator.setSpreadsheetId(options.spreadsheetId);
        }

        this.init();
    }

    /**
     * 초기화
     */
    private async init(): Promise<void> {
        try {
            const authResult = await this.authenticator.authenticate();
            if (authResult.success && authResult.sheets) {
                const spreadsheetId = this.authenticator.getSpreadsheetId();
                if (spreadsheetId) {
                    this.sheetManager = new SheetManager(authResult.sheets, spreadsheetId);
                    this.duplicateChecker = new DuplicateChecker(authResult.sheets, spreadsheetId);
                    this.isInitialized = true;
                    ServerLogger.info('SheetsManager 초기화 완료');
                } else {
                    ServerLogger.warn('스프레드시트 ID가 설정되지 않았습니다');
                }
            } else {
                ServerLogger.warn('Google Sheets 인증 실패:', authResult.error);
            }
        } catch (error) {
            ServerLogger.error('SheetsManager 초기화 실패:', error);
        }
    }

    /**
     * 연결 테스트
     */
    async testConnection(): Promise<any> {
        try {
            return await this.authenticator.testConnection();
        } catch (error) {
            ServerLogger.error('연결 테스트 실패:', error);
            return {
                status: 'error',
                error: error instanceof Error ? error.message : '연결 테스트 실패'
            };
        }
    }

    /**
     * 새 스프레드시트 생성
     */
    async createSpreadsheet(title?: string): Promise<any> {
        try {
            return await this.authenticator.createSpreadsheet(title);
        } catch (error) {
            ServerLogger.error('스프레드시트 생성 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '스프레드시트 생성 실패'
            };
        }
    }

    /**
     * 단일 비디오 데이터 저장
     */
    async saveVideoData(videoData: any): Promise<SaveVideoResult> {
        try {
            if (!this.isInitialized || !this.sheetManager || !this.duplicateChecker) {
                return {
                    success: false,
                    error: 'SheetsManager가 초기화되지 않았습니다'
                };
            }

            ServerLogger.info(`비디오 데이터 저장 시작: ${videoData.title || '제목 없음'}`);

            // 플랫폼 확인 및 시트명 결정
            const platform = videoData.platform || 'YOUTUBE';
            const sheetName = this.sheetManager.getSheetNameByPlatform(platform);

            // 중복 검사
            if (videoData.url || videoData.videoUrl) {
                const url = videoData.url || videoData.videoUrl;
                const duplicateResult = await this.duplicateChecker.checkDuplicateURLFast(url);

                if (duplicateResult.isDuplicate) {
                    ServerLogger.warn(`중복 URL 발견: ${url.substring(0, 50)}...`);
                    return {
                        success: false,
                        duplicate: true,
                        error: `중복된 URL입니다. 기존 위치: ${duplicateResult.sheetName}:${duplicateResult.existingRow}`
                    };
                }
            }

            // 시트 존재 확인 및 생성
            await this.ensureSheetExists(sheetName, platform);

            // 데이터 처리
            const processedResult = VideoDataProcessor.processVideoData(videoData, platform);
            if (!processedResult.success || !processedResult.processedData) {
                return {
                    success: false,
                    error: processedResult.error || '데이터 처리 실패'
                };
            }

            // 시트에 데이터 추가
            const appendResult = await this.sheetManager.appendData(sheetName, processedResult.processedData);
            if (!appendResult.success) {
                return {
                    success: false,
                    error: appendResult.error || '데이터 저장 실패'
                };
            }

            // MongoDB에 URL 등록 (중복 방지용)
            if (videoData.url || videoData.videoUrl) {
                const url = videoData.url || videoData.videoUrl;
                await this.duplicateChecker.registerUrlInMongoDB(url, platform, sheetName, 'L', -1);
            }

            ServerLogger.success(`비디오 데이터 저장 완료: ${sheetName}`);

            return {
                success: true,
                sheetName,
                row: -1 // append 방식이므로 정확한 행 번호는 알 수 없음
            };

        } catch (error) {
            ServerLogger.error('비디오 데이터 저장 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '저장 중 오류'
            };
        }
    }

    /**
     * 배치 비디오 데이터 저장
     */
    async saveVideoBatch(videoDataArray: any[], platform: string = 'YOUTUBE'): Promise<BatchSaveResult> {
        try {
            if (!this.isInitialized || !this.sheetManager || !this.duplicateChecker) {
                return {
                    success: false,
                    savedCount: 0,
                    skippedCount: 0,
                    errors: ['SheetsManager가 초기화되지 않았습니다'],
                    results: []
                };
            }

            ServerLogger.info(`배치 저장 시작: ${videoDataArray.length}개 비디오 (${platform})`);

            const results: SaveVideoResult[] = [];
            const errors: string[] = [];
            let savedCount = 0;
            let skippedCount = 0;

            // 시트명 결정 및 생성
            const sheetName = this.sheetManager.getSheetNameByPlatform(platform);
            await this.ensureSheetExists(sheetName, platform);

            // 중복 체크 및 데이터 필터링
            const validData: any[] = [];

            for (const videoData of videoDataArray) {
                try {
                    // 중복 검사
                    if (videoData.url || videoData.videoUrl) {
                        const url = videoData.url || videoData.videoUrl;
                        const duplicateResult = await this.duplicateChecker.checkDuplicateURLFast(url);

                        if (duplicateResult.isDuplicate) {
                            const result: SaveVideoResult = {
                                success: false,
                                duplicate: true,
                                error: `중복된 URL: ${url.substring(0, 50)}...`
                            };
                            results.push(result);
                            skippedCount++;
                            continue;
                        }
                    }

                    validData.push(videoData);

                } catch (error) {
                    const errorMsg = `데이터 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
                    errors.push(errorMsg);
                    results.push({
                        success: false,
                        error: errorMsg
                    });
                    skippedCount++;
                }
            }

            if (validData.length === 0) {
                return {
                    success: false,
                    savedCount: 0,
                    skippedCount,
                    errors: ['저장할 유효한 데이터가 없습니다'],
                    results
                };
            }

            // 배치 데이터 처리
            const processedResult = VideoDataProcessor.processBatchVideoData(validData, platform);
            if (!processedResult.success || !processedResult.processedData) {
                errors.push(processedResult.error || '배치 데이터 처리 실패');
                return {
                    success: false,
                    savedCount: 0,
                    skippedCount: videoDataArray.length,
                    errors,
                    results
                };
            }

            // 시트에 배치 데이터 추가
            const appendResult = await this.sheetManager.appendData(sheetName, processedResult.processedData);
            if (!appendResult.success) {
                errors.push(appendResult.error || '배치 데이터 저장 실패');
                return {
                    success: false,
                    savedCount: 0,
                    skippedCount: videoDataArray.length,
                    errors,
                    results
                };
            }

            // MongoDB에 URL들 등록
            for (const videoData of validData) {
                if (videoData.url || videoData.videoUrl) {
                    const url = videoData.url || videoData.videoUrl;
                    await this.duplicateChecker.registerUrlInMongoDB(url, platform, sheetName, 'L', -1);
                }

                results.push({
                    success: true,
                    sheetName
                });
                savedCount++;
            }

            ServerLogger.success(`배치 저장 완료: ${savedCount}개 저장, ${skippedCount}개 스킵`);

            return {
                success: true,
                savedCount,
                skippedCount,
                errors,
                results
            };

        } catch (error) {
            ServerLogger.error('배치 저장 실패:', error);
            return {
                success: false,
                savedCount: 0,
                skippedCount: videoDataArray.length,
                errors: [error instanceof Error ? error.message : '배치 저장 중 오류'],
                results: []
            };
        }
    }

    /**
     * 채널 데이터 저장
     */
    async saveChannelData(channelData: any): Promise<SaveVideoResult> {
        try {
            if (!this.isInitialized || !this.sheetManager) {
                return {
                    success: false,
                    error: 'SheetsManager가 초기화되지 않았습니다'
                };
            }

            const sheetName = 'CHANNELS';

            // 채널 시트 존재 확인 및 생성
            await this.ensureChannelSheetExists();

            // 데이터 처리
            const processedResult = VideoDataProcessor.processChannelData(channelData);
            if (!processedResult.success || !processedResult.processedData) {
                return {
                    success: false,
                    error: processedResult.error || '채널 데이터 처리 실패'
                };
            }

            // 시트에 데이터 추가
            const appendResult = await this.sheetManager.appendData(sheetName, processedResult.processedData);
            if (!appendResult.success) {
                return {
                    success: false,
                    error: appendResult.error || '채널 데이터 저장 실패'
                };
            }

            ServerLogger.success(`채널 데이터 저장 완료: ${channelData.name || '채널명 없음'}`);

            return {
                success: true,
                sheetName
            };

        } catch (error) {
            ServerLogger.error('채널 데이터 저장 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '채널 저장 중 오류'
            };
        }
    }

    /**
     * 최근 비디오 목록 조회
     */
    async getRecentVideos(limit: number = 10): Promise<any[]> {
        try {
            if (!this.isInitialized || !this.sheetManager) {
                ServerLogger.warn('SheetsManager가 초기화되지 않았습니다');
                return [];
            }

            const platforms = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'];
            const allVideos: any[] = [];

            for (const platform of platforms) {
                const result = await this.sheetManager.getData(platform, `A2:T${limit + 1}`);
                if (result.success && result.data) {
                    const headers = VideoDataProcessor.getHeadersForPlatform(platform);
                    const videos = result.data.map((row: any[]) => {
                        const video: any = { platform };
                        headers.forEach((header, index) => {
                            video[header] = row[index] || '';
                        });
                        return video;
                    });
                    allVideos.push(...videos);
                }
            }

            // 업로드 날짜 기준 정렬 (최신순)
            allVideos.sort((a, b) => {
                const dateA = new Date(a.uploadDate || a['업로드일']);
                const dateB = new Date(b.uploadDate || b['업로드일']);
                return dateB.getTime() - dateA.getTime();
            });

            return allVideos.slice(0, limit);

        } catch (error) {
            ServerLogger.error('최근 비디오 조회 실패:', error);
            return [];
        }
    }

    /**
     * 시트 존재 확인 및 생성
     */
    private async ensureSheetExists(sheetName: string, platform: string): Promise<void> {
        if (!this.sheetManager) return;

        const sheetInfo = await this.sheetManager.getSheetInfo(sheetName);
        if (!sheetInfo) {
            // 시트 생성
            const createResult = await this.sheetManager.createSheetForPlatform(sheetName);
            if (!createResult.success) {
                throw new Error(`시트 생성 실패: ${createResult.error}`);
            }

            // 헤더 설정
            const headers = VideoDataProcessor.getHeadersForPlatform(platform);
            const headerResult = await this.sheetManager.setHeadersForSheet(sheetName, headers);
            if (!headerResult.success) {
                ServerLogger.warn(`헤더 설정 실패: ${headerResult.error}`);
            }
        }
    }

    /**
     * 채널 시트 존재 확인 및 생성
     */
    private async ensureChannelSheetExists(): Promise<void> {
        if (!this.sheetManager) return;

        const sheetName = 'CHANNELS';
        const sheetInfo = await this.sheetManager.getSheetInfo(sheetName);

        if (!sheetInfo) {
            // 시트 생성
            const createResult = await this.sheetManager.createSheetForPlatform(sheetName);
            if (!createResult.success) {
                throw new Error(`채널 시트 생성 실패: ${createResult.error}`);
            }

            // 헤더 설정
            const headers = VideoDataProcessor.getChannelHeaders();
            const headerResult = await this.sheetManager.setHeadersForSheet(sheetName, headers);
            if (!headerResult.success) {
                ServerLogger.warn(`채널 헤더 설정 실패: ${headerResult.error}`);
            }
        }
    }

    /**
     * 통계 업데이트
     */
    async updateStatistics(): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.isInitialized || !this.sheetManager) {
                return {
                    success: false,
                    error: 'SheetsManager가 초기화되지 않았습니다'
                };
            }

            // 각 플랫폼별 통계 수집
            const platforms = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'];
            const stats: any = {};

            for (const platform of platforms) {
                const result = await this.sheetManager.getData(platform);
                if (result.success && result.data) {
                    stats[platform] = {
                        totalVideos: result.data.length - 1, // 헤더 제외
                        lastUpdated: new Date().toISOString()
                    };
                }
            }

            ServerLogger.info('통계 업데이트 완료:', stats);

            return { success: true };

        } catch (error) {
            ServerLogger.error('통계 업데이트 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '통계 업데이트 실패'
            };
        }
    }

    /**
     * 중복 URL 체크
     */
    async checkDuplicateURL(videoUrl: string): Promise<any> {
        if (!this.duplicateChecker) {
            return {
                isDuplicate: false,
                error: 'DuplicateChecker가 초기화되지 않았습니다'
            };
        }

        return await this.duplicateChecker.checkDuplicateURLFast(videoUrl);
    }

    /**
     * 초기화 상태 확인
     */
    isReady(): boolean {
        return this.isInitialized && !!this.sheetManager && !!this.duplicateChecker;
    }

    /**
     * 인증 정보 검증
     */
    async validateCredentials(): Promise<any> {
        return await this.authenticator.validateCredentials();
    }

    /**
     * OAuth URL 생성 (OAuth 방식 사용 시)
     */
    generateAuthUrl(): string | null {
        return this.authenticator.generateAuthUrl();
    }

    /**
     * OAuth 토큰 저장 (OAuth 방식 사용 시)
     */
    async saveOAuthToken(code: string): Promise<any> {
        return await this.authenticator.saveOAuthToken(code);
    }
}

export default SheetsManager;