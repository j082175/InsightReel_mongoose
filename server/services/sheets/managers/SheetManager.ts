import { ServerLogger } from '../../../utils/logger';
import { PLATFORMS } from '../../../config/api-messages';

interface SheetInfo {
    sheetId: number;
    title: string;
    index: number;
    rowCount: number;
    columnCount: number;
}

interface CreateSheetResult {
    success: boolean;
    sheetId?: number;
    sheetName?: string;
    error?: string;
}

interface SheetOperation {
    success: boolean;
    data?: any;
    error?: string;
    rowsAffected?: number;
}

export class SheetManager {
    private sheets: any;
    private spreadsheetId: string;
    private cache: Map<string, any>;
    private cacheTTL: number;

    constructor(sheets: any, spreadsheetId: string) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
        this.cache = new Map();
        this.cacheTTL = 60000; // 1분 캐시
    }

    /**
     * 플랫폼별 시트명 반환
     */
    getSheetNameByPlatform(platform: string): string {
        const normalizedPlatform = platform.toUpperCase();

        switch (normalizedPlatform) {
            case 'YOUTUBE':
                return 'YOUTUBE';
            case 'INSTAGRAM':
                return 'INSTAGRAM';
            case 'TIKTOK':
                return 'TIKTOK';
            default:
                ServerLogger.warn(`알 수 없는 플랫폼: ${platform}, YOUTUBE로 기본 설정`);
                return 'YOUTUBE';
        }
    }

    /**
     * 첫 번째 시트명 반환
     */
    async getFirstSheetName(): Promise<string> {
        try {
            const cacheKey = `first_sheet_${this.spreadsheetId}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const firstSheet = response.data.sheets?.[0];
            if (!firstSheet) {
                throw new Error('시트를 찾을 수 없습니다');
            }

            const sheetName = firstSheet.properties.title;
            this.setCache(cacheKey, sheetName);

            return sheetName;

        } catch (error) {
            ServerLogger.error('첫 번째 시트명 조회 실패:', error);
            return 'Sheet1'; // 기본값
        }
    }

    /**
     * 플랫폼용 시트 생성
     */
    async createSheetForPlatform(sheetName: string): Promise<CreateSheetResult> {
        try {
            ServerLogger.info(`시트 생성 시작: ${sheetName}`);

            // 시트가 이미 존재하는지 확인
            const existingSheets = await this.listAllSheets();
            const existingSheet = existingSheets.find(sheet =>
                sheet.title.toLowerCase() === sheetName.toLowerCase()
            );

            if (existingSheet) {
                ServerLogger.info(`시트가 이미 존재합니다: ${sheetName}`);
                return {
                    success: true,
                    sheetId: existingSheet.sheetId,
                    sheetName: existingSheet.title
                };
            }

            // 새 시트 생성
            const requests = [{
                addSheet: {
                    properties: {
                        title: sheetName,
                        gridProperties: {
                            rowCount: 1000,
                            columnCount: 20
                        }
                    }
                }
            }];

            const response = await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: { requests }
            });

            const addedSheet = response.data.replies[0].addSheet;
            const sheetId = addedSheet.properties.sheetId;

            ServerLogger.success(`시트 생성 완료: ${sheetName} (ID: ${sheetId})`);

            // 캐시 무효화
            this.clearCache();

            return {
                success: true,
                sheetId,
                sheetName
            };

        } catch (error) {
            ServerLogger.error(`시트 생성 실패 (${sheetName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '시트 생성 실패'
            };
        }
    }

    /**
     * 시트 헤더 설정
     */
    async setHeadersForSheet(sheetName: string, headers: string[]): Promise<SheetOperation> {
        try {
            if (!Array.isArray(headers) || headers.length === 0) {
                return {
                    success: false,
                    error: '유효하지 않은 헤더 배열입니다'
                };
            }

            ServerLogger.info(`헤더 설정 시작: ${sheetName}`);

            // 헤더 데이터 준비
            const headerRange = `${sheetName}!A1:${this.getColumnLetter(headers.length)}1`;
            const values = [headers];

            // 헤더 입력
            const response = await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: headerRange,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            // 헤더 스타일링 (굵게, 배경색)
            await this.formatHeaderRow(sheetName, headers.length);

            ServerLogger.success(`헤더 설정 완료: ${sheetName}`);

            return {
                success: true,
                data: response.data,
                rowsAffected: 1
            };

        } catch (error) {
            ServerLogger.error(`헤더 설정 실패 (${sheetName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '헤더 설정 실패'
            };
        }
    }

    /**
     * 헤더 행 포맷팅
     */
    private async formatHeaderRow(sheetName: string, columnCount: number): Promise<void> {
        try {
            const sheetInfo = await this.getSheetInfo(sheetName);
            if (!sheetInfo) return;

            const requests = [
                {
                    repeatCell: {
                        range: {
                            sheetId: sheetInfo.sheetId,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: columnCount
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: {
                                    red: 0.9,
                                    green: 0.9,
                                    blue: 0.9
                                },
                                textFormat: {
                                    bold: true
                                }
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                }
            ];

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: { requests }
            });

        } catch (error) {
            ServerLogger.warn('헤더 포맷팅 실패:', error);
        }
    }

    /**
     * 시트 정보 조회
     */
    async getSheetInfo(sheetName: string): Promise<SheetInfo | null> {
        try {
            const cacheKey = `sheet_info_${sheetName}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const sheet = response.data.sheets?.find(
                (s: any) => s.properties.title === sheetName
            );

            if (!sheet) {
                return null;
            }

            const sheetInfo: SheetInfo = {
                sheetId: sheet.properties.sheetId,
                title: sheet.properties.title,
                index: sheet.properties.index,
                rowCount: sheet.properties.gridProperties.rowCount,
                columnCount: sheet.properties.gridProperties.columnCount
            };

            this.setCache(cacheKey, sheetInfo);
            return sheetInfo;

        } catch (error) {
            ServerLogger.error(`시트 정보 조회 실패 (${sheetName}):`, error);
            return null;
        }
    }

    /**
     * 모든 시트 목록 조회
     */
    async listAllSheets(): Promise<SheetInfo[]> {
        try {
            const cacheKey = `all_sheets_${this.spreadsheetId}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const sheets: SheetInfo[] = response.data.sheets?.map((sheet: any) => ({
                sheetId: sheet.properties.sheetId,
                title: sheet.properties.title,
                index: sheet.properties.index,
                rowCount: sheet.properties.gridProperties.rowCount,
                columnCount: sheet.properties.gridProperties.columnCount
            })) || [];

            this.setCache(cacheKey, sheets);
            return sheets;

        } catch (error) {
            ServerLogger.error('시트 목록 조회 실패:', error);
            return [];
        }
    }

    /**
     * 시트 용량 확보
     */
    async ensureSheetCapacity(sheetName: string, requiredRow: number): Promise<SheetOperation> {
        try {
            const sheetInfo = await this.getSheetInfo(sheetName);
            if (!sheetInfo) {
                return {
                    success: false,
                    error: '시트를 찾을 수 없습니다'
                };
            }

            // 여유분 50행 추가
            const targetRows = requiredRow + 50;

            if (sheetInfo.rowCount >= targetRows) {
                return { success: true }; // 이미 충분함
            }

            ServerLogger.info(`시트 용량 확장: ${sheetName} (${sheetInfo.rowCount} → ${targetRows}행)`);

            const requests = [{
                updateSheetProperties: {
                    properties: {
                        sheetId: sheetInfo.sheetId,
                        gridProperties: {
                            rowCount: targetRows,
                            columnCount: sheetInfo.columnCount
                        }
                    },
                    fields: 'gridProperties.rowCount'
                }
            }];

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: { requests }
            });

            // 캐시 무효화
            this.clearCache();

            return { success: true };

        } catch (error) {
            ServerLogger.error(`시트 용량 확장 실패 (${sheetName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '용량 확장 실패'
            };
        }
    }

    /**
     * 시트에 데이터 추가
     */
    async appendData(sheetName: string, data: any[][]): Promise<SheetOperation> {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                return {
                    success: false,
                    error: '유효하지 않은 데이터입니다'
                };
            }

            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: data }
            });

            return {
                success: true,
                data: response.data,
                rowsAffected: data.length
            };

        } catch (error) {
            ServerLogger.error(`데이터 추가 실패 (${sheetName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '데이터 추가 실패'
            };
        }
    }

    /**
     * 시트 데이터 조회
     */
    async getData(sheetName: string, range?: string): Promise<SheetOperation> {
        try {
            const fullRange = range ? `${sheetName}!${range}` : sheetName;

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: fullRange
            });

            return {
                success: true,
                data: response.data.values || []
            };

        } catch (error) {
            ServerLogger.error(`데이터 조회 실패 (${sheetName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '데이터 조회 실패'
            };
        }
    }

    /**
     * 시트 업데이트
     */
    async updateData(sheetName: string, range: string, data: any[][]): Promise<SheetOperation> {
        try {
            const fullRange = `${sheetName}!${range}`;

            const response = await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: fullRange,
                valueInputOption: 'USER_ENTERED',
                resource: { values: data }
            });

            return {
                success: true,
                data: response.data,
                rowsAffected: data.length
            };

        } catch (error) {
            ServerLogger.error(`데이터 업데이트 실패 (${sheetName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '데이터 업데이트 실패'
            };
        }
    }

    /**
     * 열 번호를 문자로 변환 (A, B, C, ... AA, AB, ...)
     */
    private getColumnLetter(columnNumber: number): string {
        let result = '';
        while (columnNumber > 0) {
            columnNumber--;
            result = String.fromCharCode(65 + (columnNumber % 26)) + result;
            columnNumber = Math.floor(columnNumber / 26);
        }
        return result;
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
    private clearCache(): void {
        this.cache.clear();
    }

    /**
     * 시트 삭제
     */
    async deleteSheet(sheetName: string): Promise<SheetOperation> {
        try {
            const sheetInfo = await this.getSheetInfo(sheetName);
            if (!sheetInfo) {
                return {
                    success: false,
                    error: '시트를 찾을 수 없습니다'
                };
            }

            const requests = [{
                deleteSheet: {
                    sheetId: sheetInfo.sheetId
                }
            }];

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: { requests }
            });

            this.clearCache();

            ServerLogger.success(`시트 삭제 완료: ${sheetName}`);
            return { success: true };

        } catch (error) {
            ServerLogger.error(`시트 삭제 실패 (${sheetName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '시트 삭제 실패'
            };
        }
    }

    /**
     * 시트명 변경
     */
    async renameSheet(oldName: string, newName: string): Promise<SheetOperation> {
        try {
            const sheetInfo = await this.getSheetInfo(oldName);
            if (!sheetInfo) {
                return {
                    success: false,
                    error: '시트를 찾을 수 없습니다'
                };
            }

            const requests = [{
                updateSheetProperties: {
                    properties: {
                        sheetId: sheetInfo.sheetId,
                        title: newName
                    },
                    fields: 'title'
                }
            }];

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: { requests }
            });

            this.clearCache();

            ServerLogger.success(`시트명 변경 완료: ${oldName} → ${newName}`);
            return { success: true };

        } catch (error) {
            ServerLogger.error(`시트명 변경 실패 (${oldName} → ${newName}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '시트명 변경 실패'
            };
        }
    }
}

export default SheetManager;