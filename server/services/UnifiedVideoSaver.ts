/**
 * 🚀 Google Sheets + MongoDB 통합 저장 서비스 (TypeScript)
 * 새 인터페이스 기반 직접 필드 접근 방식
 * video-types.ts 인터페이스 표준 준수
 */

import { SheetsManager } from './sheets/SheetsManager';
import { VideoDataConverter } from './VideoDataConverter';
import Video from '../models/Video';
import { ServerLogger } from '../utils/logger';
import mongoose from 'mongoose';
import type {
    Platform,
    FinalVideoData,
    VideoDocument,
    ISODateString,
    StandardVideoMetadata,
    AIAnalysisResult
} from '../types/video-types';

// 표준 타입 사용 (중복 제거)
type VideoData = Partial<StandardVideoMetadata> & {
    url?: string;
    postUrl?: string;
    metadata?: any;
    analysis?: Partial<AIAnalysisResult>;
    timestamp?: string;
};

interface SaveResult {
    success: boolean;
    platform: Platform;
    rowNumber?: number;
    sheets?: any;
    mongodb?: VideoDocument;
    error?: string;
    performance?: {
        totalTime: number;
        sheetsTime: number;
        mongoTime: number;
    };
}

interface BatchSaveResult {
    success: boolean;
    platform: Platform;
    total?: number;
    sheets?: any;
    mongodb?: {
        success: number;
        failed: number;
        results: Array<{
            success: boolean;
            data?: VideoDocument;
            error?: string;
            originalIndex: number;
            url?: string;
        }>;
    };
    error?: string;
    performance?: {
        totalTime: number;
        sheetsTime: number;
        mongoTime: number;
    };
}

interface SaveStatistics {
    sheets: Record<string, number>;
    mongodb: Record<string, number>;
    total: Record<string, number>;
}

interface ConsistencyValidationResult {
    platform: Platform;
    sheetsCount: number;
    mongoCount: number;
    mismatches: any[];
    duplicateUrls: any[];
    consistent: boolean;
}

class UnifiedVideoSaver {
    private sheetsManager: SheetsManager | null;
    private readonly sheetsEnabled: boolean;

    constructor() {
        // SheetsManager는 Google Sheets 기능이 활성화된 경우에만 초기화
        this.sheetsManager = null;
        this.sheetsEnabled = process.env.DISABLE_SHEETS_SAVING !== 'true';

        if (this.sheetsEnabled) {
            try {
                this.sheetsManager = new SheetsManager();
            } catch (error: any) {
                ServerLogger.warn('⚠️ SheetsManager 초기화 실패, MongoDB 전용 모드로 실행', error.message, 'UNIFIED_SAVER');
                this.sheetsEnabled = false;
            }
        } else {
            ServerLogger.info('📋 Google Sheets 저장 비활성화, MongoDB 전용 모드로 실행', {}, 'UNIFIED_SAVER');
        }
    }

    /**
     * 단일 비디오 데이터 통합 저장
     * @param platform - 플랫폼 ('YOUTUBE', 'INSTAGRAM', 'TIKTOK')
     * @param videoData - 비디오 데이터 객체
     * @param rowNumber - Google Sheets 행 번호
     * @returns 저장 결과
     */
    async saveVideoData(platform: Platform, videoData: VideoData, rowNumber: number | null = null): Promise<SaveResult> {
        const startTime = Date.now();
        let sheetsResult: any = null;
        let mongoResult: VideoDocument | undefined = undefined;

        try {
            ServerLogger.info(
                `🚀 통합 저장 시작: ${platform.toUpperCase()}`,
                {
                    url: videoData.url || videoData.postUrl,
                    channelName: videoData.channelName,
                },
                'UNIFIED_SAVER',
            );

            // 1단계: Google Sheets 저장 비활성화 확인 (먼저 체크)
            let actualRowNumber: number;

            if (!this.sheetsEnabled) {
                // Sheets 비활성화시 기본 행 번호 사용
                actualRowNumber = rowNumber || 1;
            } else {
                // Sheets 활성화시 실제 다음 행 번호 가져오기
                actualRowNumber = rowNumber || (await this.getNextRowNumber(platform));
            }

            // 2단계: 플랫폼별 데이터 변환
            ServerLogger.error('🔍 DEBUG - UnifiedVideoSaver 변환 직전 데이터:', {
                platform,
                'videoData.metadata': videoData.metadata ? Object.keys(videoData.metadata) : 'null',
                'videoData.metadata.likes': videoData.metadata?.likes,
                'videoData.metadata.channelName': videoData.metadata?.channelName,
                'videoData.metadata.title': videoData.metadata?.title,
                actualRowNumber
            });

            const convertedData = VideoDataConverter.convertToSchema(
                platform,
                { ...videoData, platform } as any,
                actualRowNumber,
            );

            VideoDataConverter.logConversion(
                platform,
                videoData,
                convertedData,
            );

            // 3단계: Google Sheets 저장 (기존 로직 사용)
            const sheetsStartTime = Date.now();

            if (!this.sheetsEnabled) {
                ServerLogger.info(
                    '⚠️ Google Sheets 저장이 비활성화되어 건너뜁니다',
                    {},
                    'UNIFIED_SAVER',
                );
                sheetsResult = {
                    success: true,
                    message: 'Google Sheets 저장 비활성화됨',
                    sheetName: `${platform}_disabled`,
                    nextRow: 1,
                    spreadsheetUrl: null,
                };
            } else {
                sheetsResult = await this.saveToGoogleSheets(platform, videoData);
            }
            const sheetsEndTime = Date.now();

            if (!sheetsResult.success && this.sheetsEnabled) {
                ServerLogger.warn(
                    `⚠️ Google Sheets 저장 실패하지만 MongoDB 저장 계속 진행: ${sheetsResult.error}`,
                    {},
                    'UNIFIED_SAVER'
                );
                // 예외를 던지지 않고 경고만 로그 - MongoDB 저장은 계속 진행
            }

            // 4단계: MongoDB 저장
            const mongoStartTime = Date.now();
            mongoResult = await this.saveToMongoDB(platform, convertedData);
            const mongoEndTime = Date.now();

            // 5단계: 성능 로그 출력
            const totalTime = Date.now() - startTime;
            const sheetsTime = sheetsEndTime - sheetsStartTime;
            const mongoTime = mongoEndTime - mongoStartTime;

            ServerLogger.info(
                `✅ 통합 저장 완료: ${platform.toUpperCase()}`,
                {
                    url: videoData.url || videoData.postUrl,
                    totalTime: `${totalTime}ms`,
                    sheetsTime: `${sheetsTime}ms`,
                    mongoTime: `${mongoTime}ms`,
                    sheetsUrl: sheetsResult.spreadsheetUrl || 'disabled',
                    mongoId: mongoResult._id,
                },
                'UNIFIED_SAVER',
            );

            return {
                success: true,
                platform: platform,
                rowNumber: actualRowNumber,
                sheets: sheetsResult,
                mongodb: mongoResult,
                performance: {
                    totalTime: totalTime,
                    sheetsTime: sheetsTime,
                    mongoTime: mongoTime,
                },
            };
        } catch (error: any) {
            ServerLogger.error(
                `❌ 통합 저장 실패: ${platform.toUpperCase()}`,
                error.message,
                'UNIFIED_SAVER',
            );

            // 롤백 처리 (MongoDB만 삭제, Google Sheets는 유지)
            if (mongoResult && mongoResult._id) {
                try {
                    await this.rollbackMongoDB(platform, mongoResult._id.toString());
                    ServerLogger.info(
                        `🔄 MongoDB 롤백 완료: ${mongoResult._id}`,
                        null,
                        'UNIFIED_SAVER',
                    );
                } catch (rollbackError: any) {
                    ServerLogger.error(
                        `❌ MongoDB 롤백 실패: ${mongoResult._id}`,
                        rollbackError.message,
                        'UNIFIED_SAVER',
                    );
                }
            }

            return {
                success: false,
                platform: platform,
                error: error.message,
                sheets: sheetsResult,
                mongodb: mongoResult,
            };
        }
    }

    /**
     * 배치 비디오 데이터 통합 저장
     * @param platform - 플랫폼
     * @param videoDataArray - 비디오 데이터 배열
     * @returns 저장 결과
     */
    async saveBatchVideoData(platform: Platform, videoDataArray: VideoData[]): Promise<BatchSaveResult> {
        const startTime = Date.now();
        let sheetsResult: any = null;
        let mongoResults: Array<{
            success: boolean;
            data?: VideoDocument;
            error?: string;
            originalIndex: number;
            url?: string;
        }> = [];
        let successCount = 0;
        let failedCount = 0;

        try {
            ServerLogger.info(
                `🚀 배치 통합 저장 시작: ${platform.toUpperCase()}`,
                {
                    count: videoDataArray.length,
                },
                'UNIFIED_SAVER',
            );

            // 1단계: Google Sheets 배치 저장 (기존 로직 사용)
            const sheetsStartTime = Date.now();

            if (!this.sheetsEnabled) {
                ServerLogger.info(
                    '⚠️ Google Sheets 배치 저장이 비활성화되어 건너뜁니다',
                    {},
                    'UNIFIED_SAVER',
                );
                sheetsResult = {
                    success: true,
                    message: 'Google Sheets 배치 저장 비활성화됨',
                    savedCount: videoDataArray.length,
                    spreadsheetUrl: null,
                };
            } else {
                sheetsResult = await this.saveBatchToGoogleSheets(platform, videoDataArray);
            }
            const sheetsEndTime = Date.now();

            if (!sheetsResult.success && this.sheetsEnabled) {
                ServerLogger.warn(
                    `⚠️ Google Sheets 배치 저장 실패하지만 MongoDB 저장 계속 진행: ${sheetsResult.error}`,
                    {},
                    'UNIFIED_SAVER'
                );
                // 예외를 던지지 않고 경고만 로그 - MongoDB 저장은 계속 진행
            }

            // 2단계: MongoDB 배치 저장
            const mongoStartTime = Date.now();
            const startRow = !this.sheetsEnabled
                ? 1
                : await this.getNextRowNumber(platform);

            for (let i = 0; i < videoDataArray.length; i++) {
                const videoData = videoDataArray[i];
                const rowNumber = startRow + i;

                try {
                    const convertedData = VideoDataConverter.convertToSchema(
                        platform,
                        { ...videoData, platform } as any,
                        rowNumber,
                    );
                    const mongoResult = await this.saveToMongoDB(platform, convertedData);

                    mongoResults.push({
                        success: true,
                        data: mongoResult,
                        originalIndex: i,
                    });
                    successCount++;
                } catch (error: any) {
                    mongoResults.push({
                        success: false,
                        error: error.message,
                        originalIndex: i,
                        url: videoData.url || videoData.postUrl,
                    });
                    failedCount++;

                    ServerLogger.warn(
                        `⚠️ MongoDB 개별 저장 실패 [${i + 1}/${videoDataArray.length}]`,
                        {
                            url: videoData.url || videoData.postUrl,
                            error: error.message,
                        },
                        'UNIFIED_SAVER',
                    );
                }
            }

            const mongoEndTime = Date.now();

            // 3단계: 성능 로그 출력
            const totalTime = Date.now() - startTime;
            const sheetsTime = sheetsEndTime - sheetsStartTime;
            const mongoTime = mongoEndTime - mongoStartTime;

            ServerLogger.info(
                `✅ 배치 통합 저장 완료: ${platform.toUpperCase()}`,
                {
                    total: videoDataArray.length,
                    sheetsSuccess: sheetsResult.saved,
                    mongoSuccess: successCount,
                    mongoFailed: failedCount,
                    totalTime: `${totalTime}ms`,
                    sheetsTime: `${sheetsTime}ms`,
                    mongoTime: `${mongoTime}ms`,
                    sheetsUrl: sheetsResult.spreadsheetUrl,
                },
                'UNIFIED_SAVER',
            );

            return {
                success: true,
                platform: platform,
                total: videoDataArray.length,
                sheets: sheetsResult,
                mongodb: {
                    success: successCount,
                    failed: failedCount,
                    results: mongoResults,
                },
                performance: {
                    totalTime: totalTime,
                    sheetsTime: sheetsTime,
                    mongoTime: mongoTime,
                },
            };
        } catch (error: any) {
            ServerLogger.error(
                `❌ 배치 통합 저장 실패: ${platform.toUpperCase()}`,
                error.message,
                'UNIFIED_SAVER',
            );

            // 배치 롤백 처리 (성공한 MongoDB 문서들만 삭제)
            if (mongoResults.length > 0) {
                await this.rollbackBatchMongoDB(
                    platform,
                    mongoResults.filter((r) => r.success),
                );
            }

            return {
                success: false,
                platform: platform,
                error: error.message,
                sheets: sheetsResult,
                mongodb: {
                    success: successCount,
                    failed: failedCount,
                    results: mongoResults,
                },
            };
        }
    }

    /**
     * Google Sheets 저장 (기존 SheetsManager 사용)
     */
    async saveToGoogleSheets(platform: Platform, videoData: VideoData): Promise<any> {
        try {
            if (!this.sheetsManager) {
                throw new Error('SheetsManager가 초기화되지 않았습니다');
            }
            return await this.sheetsManager.saveVideoData(videoData);
        } catch (error: any) {
            throw new Error(`Google Sheets 저장 실패: ${error.message}`);
        }
    }

    /**
     * Google Sheets 배치 저장 (기존 SheetsManager 사용)
     */
    async saveBatchToGoogleSheets(platform: Platform, videoDataArray: VideoData[]): Promise<any> {
        try {
            if (!this.sheetsManager) {
                throw new Error('SheetsManager가 초기화되지 않았습니다');
            }
            return await this.sheetsManager.saveVideoBatch(videoDataArray);
        } catch (error: any) {
            throw new Error(`Google Sheets 배치 저장 실패: ${error.message}`);
        }
    }

    /**
     * MongoDB 저장
     */
    async saveToMongoDB(platform: Platform, convertedData: FinalVideoData & { rowNumber: number; collectionTime: ISODateString }): Promise<VideoDocument> {
        try {
            // 통합된 Video 모델 사용
            const Model = Video;

            // 🎯 DUPLICATE CHECK REMOVED - Early checking handled before reaching this service

            // 새 문서 생성 - rowNumber와 collectionTime 제외하고 FinalVideoData만 저장
            const { rowNumber, collectionTime, ...finalVideoData } = convertedData;

            // collectionTime을 ISO string으로 변환하여 추가
            const mongoData = {
                ...finalVideoData,
                collectionTime: new Date(collectionTime).toISOString()
            };

            ServerLogger.info('🔍 STEP3 - MongoDB 저장 직전 데이터:', {
                thumbnailUrl: mongoData.thumbnailUrl,
                language: mongoData.language,
                description: mongoData.description
            });

            const newDoc = new Model(mongoData);
            const savedDoc = await newDoc.save();

            ServerLogger.info(
                `✅ MongoDB 새 문서 저장: ${savedDoc._id}`,
                {
                    platform: platform,
                    url: convertedData.url,
                    channelName: convertedData.channelName,
                },
                'UNIFIED_SAVER',
            );

            return savedDoc as unknown as VideoDocument;
        } catch (error: any) {
            if (error.code === 11000) {
                // 중복 키 에러 처리
                ServerLogger.warn(
                    `⚠️ MongoDB 중복 키 에러: ${convertedData.url}`,
                    error.message,
                    'UNIFIED_SAVER',
                );
                throw new Error(`중복 URL: ${convertedData.url}`);
            }
            throw new Error(`MongoDB 저장 실패: ${error.message}`);
        }
    }

    /**
     * MongoDB 롤백 (단일 문서)
     */
    async rollbackMongoDB(platform: Platform, documentId: string): Promise<boolean> {
        try {
            const Model = Video;
            const deletedDoc = await Model.findByIdAndDelete(documentId);

            if (deletedDoc) {
                ServerLogger.info(
                    `🔄 MongoDB 롤백 성공: ${documentId}`,
                    null,
                    'UNIFIED_SAVER',
                );
                return true;
            } else {
                ServerLogger.warn(
                    `⚠️ MongoDB 롤백 대상 없음: ${documentId}`,
                    null,
                    'UNIFIED_SAVER',
                );
                return false;
            }
        } catch (error: any) {
            ServerLogger.error(
                `❌ MongoDB 롤백 실패: ${documentId}`,
                error.message,
                'UNIFIED_SAVER',
            );
            throw error;
        }
    }

    /**
     * MongoDB 배치 롤백 (다중 문서)
     */
    async rollbackBatchMongoDB(
        platform: Platform,
        successResults: Array<{ success: boolean; data?: VideoDocument }>
    ): Promise<void> {
        try {
            const Model = Video;
            const documentIds = successResults
                .filter(r => r.success && r.data)
                .map((r) => r.data!._id);

            if (documentIds.length === 0) {
                return;
            }

            const deleteResult = await Model.deleteMany({
                _id: { $in: documentIds },
            });

            ServerLogger.info(
                `🔄 MongoDB 배치 롤백 완료: ${deleteResult.deletedCount}개 삭제`,
                null,
                'UNIFIED_SAVER',
            );
        } catch (error: any) {
            ServerLogger.error(
                `❌ MongoDB 배치 롤백 실패`,
                error.message,
                'UNIFIED_SAVER',
            );
            throw error;
        }
    }

    /**
     * Google Sheets 다음 행 번호 가져오기
     */
    async getNextRowNumber(platform: Platform): Promise<number> {
        try {
            if (!this.sheetsManager) {
                ServerLogger.warn(
                    `⚠️ SheetsManager가 없음, 기본값 사용`,
                    null,
                    'UNIFIED_SAVER',
                );
                return 2; // 기본값 (헤더 다음 행)
            }

            const sheetName = await (this.sheetsManager as any).getSheetNameByPlatform(platform);
            const response = await (this.sheetsManager as any).sheets.spreadsheets.values.get({
                spreadsheetId: (this.sheetsManager as any).spreadsheetId,
                range: `${sheetName}!A:A`,
            });

            const values = response.data.values || [];
            return values.length + 1; // 헤더 포함하여 다음 행 번호
        } catch (error: any) {
            ServerLogger.warn(
                `⚠️ 다음 행 번호 조회 실패, 기본값 사용: ${error.message}`,
                null,
                'UNIFIED_SAVER',
            );
            return 2; // 기본값 (헤더 다음 행)
        }
    }

    /**
     * 플랫폼별 저장 통계 조회
     */
    async getSaveStatistics(platform: Platform | null = null): Promise<SaveStatistics> {
        try {
            const stats: SaveStatistics = {
                sheets: {},
                mongodb: {},
                total: {},
            };

            if (platform) {
                // 특정 플랫폼 통계
                const Model = Video;
                const mongoCount = await Model.countDocuments({ platform });

                stats.mongodb[platform] = mongoCount;
                stats.total[platform] = mongoCount;
            } else {
                // 전체 플랫폼 통계
                const platforms: Platform[] = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'];

                for (const plt of platforms) {
                    try {
                        const Model = Video;
                        const mongoCount = await Model.countDocuments({ platform: plt });
                        stats.mongodb[plt] = mongoCount;
                        stats.total[plt] = mongoCount;
                    } catch (error) {
                        stats.mongodb[plt] = 0;
                        stats.total[plt] = 0;
                    }
                }
            }

            return stats;
        } catch (error: any) {
            ServerLogger.error(
                '저장 통계 조회 실패',
                error.message,
                'UNIFIED_SAVER',
            );
            throw error;
        }
    }

    /**
     * 데이터 일관성 검증 (Google Sheets vs MongoDB)
     */
    async validateDataConsistency(platform: Platform, limit: number = 100): Promise<ConsistencyValidationResult> {
        try {
            ServerLogger.info(
                `🔍 데이터 일관성 검증 시작: ${platform.toUpperCase()}`,
                { limit },
                'UNIFIED_SAVER',
            );

            let sheetRows: any[] = [];

            // Google Sheets 데이터 조회 (SheetsManager가 있는 경우에만)
            if (this.sheetsManager) {
                const sheetName = await (this.sheetsManager as any).getSheetNameByPlatform(platform);
                const response = await (this.sheetsManager as any).sheets.spreadsheets.values.get({
                    spreadsheetId: (this.sheetsManager as any).spreadsheetId,
                    range: `${sheetName}!A2:ZZ${limit + 1}`, // 헤더 제외하고 limit 개수만큼
                });

                sheetRows = response.data.values || [];
            } else {
                ServerLogger.info(
                    `📋 Google Sheets 비활성화로 인해 MongoDB만 검증`,
                    {},
                    'UNIFIED_SAVER',
                );
            }

            // MongoDB 데이터 조회
            const Model = Video;
            const mongoDocs = await Model.find({ platform })
                .limit(limit)
                .sort({ createdAt: -1 });

            // 일관성 검증
            const results: ConsistencyValidationResult = {
                platform: platform,
                sheetsCount: sheetRows.length,
                mongoCount: mongoDocs.length,
                mismatches: [],
                duplicateUrls: [],
                consistent: true,
            };

            // URL 기준으로 매칭 검증
            const sheetUrls = new Set<string>();
            const mongoUrls = new Set<string>();

            sheetRows.forEach((row, index) => {
                const url = row[27] || row[16]; // YouTube: 27, Instagram: 16
                if (url) {
                    if (sheetUrls.has(url)) {
                        results.duplicateUrls.push({
                            source: 'sheets',
                            url,
                            row: index + 2,
                        });
                    }
                    sheetUrls.add(url);
                }
            });

            mongoDocs.forEach((doc) => {
                if (doc.url) {
                    if (mongoUrls.has(doc.url)) {
                        results.duplicateUrls.push({
                            source: 'mongodb',
                            url: doc.url,
                            id: doc._id,
                        });
                    }
                    mongoUrls.add(doc.url);
                }
            });

            // 차이점 찾기
            const onlyInSheets = Array.from(sheetUrls).filter((url) => !mongoUrls.has(url));
            const onlyInMongo = Array.from(mongoUrls).filter((url) => !sheetUrls.has(url));

            if (onlyInSheets.length > 0 || onlyInMongo.length > 0) {
                results.consistent = false;
                results.mismatches = {
                    onlyInSheets: onlyInSheets.length,
                    onlyInMongo: onlyInMongo.length,
                    examples: {
                        onlyInSheets: onlyInSheets.slice(0, 5),
                        onlyInMongo: onlyInMongo.slice(0, 5),
                    },
                } as any;
            }

            ServerLogger.info(
                `📊 데이터 일관성 검증 완료: ${platform.toUpperCase()}`,
                {
                    consistent: results.consistent,
                    sheetsCount: results.sheetsCount,
                    mongoCount: results.mongoCount,
                    duplicates: results.duplicateUrls.length,
                    mismatches: results.mismatches,
                },
                'UNIFIED_SAVER',
            );

            return results;
        } catch (error: any) {
            ServerLogger.error(
                `❌ 데이터 일관성 검증 실패: ${platform.toUpperCase()}`,
                error.message,
                'UNIFIED_SAVER',
            );
            throw error;
        }
    }
}

export default UnifiedVideoSaver;