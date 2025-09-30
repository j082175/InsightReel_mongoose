import * as fs from 'fs';
import * as path from 'path';
import { ServerLogger } from '../../../utils/logger';

interface ImageEncodeResult {
    success: boolean;
    base64?: string;
    error?: string;
}

export class ImageProcessor {
    private static readonly SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.image'];
    private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * URL에서 이미지를 다운로드하고 Base64로 인코딩
     */
    static async encodeImageFromUrl(imageUrl: string): Promise<ImageEncodeResult> {
        try {
            if (!imageUrl || typeof imageUrl !== 'string') {
                return { success: false, error: '유효하지 않은 이미지 URL입니다' };
            }

            // URL 유효성 검사
            if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                return { success: false, error: 'HTTP(S) URL만 지원됩니다' };
            }

            ServerLogger.info(`이미지 다운로드 시작: ${imageUrl.substring(0, 80)}...`);

            // 이미지 다운로드
            const axios = (await import('axios')).default;
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 10000, // 10초 타임아웃
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.data) {
                return { success: false, error: '이미지 다운로드 실패' };
            }

            // Base64 변환
            const buffer = Buffer.from(response.data);
            const base64String = buffer.toString('base64');

            if (!base64String || base64String.length === 0) {
                return { success: false, error: 'Base64 인코딩에 실패했습니다' };
            }

            ServerLogger.info(`이미지 다운로드 및 인코딩 완료: ${(buffer.length / 1024).toFixed(2)}KB`);
            return { success: true, base64: base64String };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            ServerLogger.error(`이미지 URL 다운로드 실패:`, error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * 이미지 파일을 Base64로 인코딩 (로컬 파일 또는 URL)
     */
    static async encodeImageToBase64(imagePath: string): Promise<ImageEncodeResult> {
        try {
            if (!imagePath || typeof imagePath !== 'string') {
                return { success: false, error: '유효하지 않은 이미지 경로입니다' };
            }

            // URL인 경우 URL 처리
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                return await this.encodeImageFromUrl(imagePath);
            }

            // 파일 존재 확인
            if (!fs.existsSync(imagePath)) {
                return { success: false, error: `이미지 파일을 찾을 수 없습니다: ${imagePath}` };
            }

            // 파일 확장자 검증
            const ext = path.extname(imagePath).toLowerCase();
            if (!this.SUPPORTED_FORMATS.includes(ext)) {
                return {
                    success: false,
                    error: `지원하지 않는 이미지 형식입니다: ${ext}. 지원 형식: ${this.SUPPORTED_FORMATS.join(', ')}`
                };
            }

            // 파일 크기 검증
            const stats = fs.statSync(imagePath);
            if (stats.size > this.MAX_FILE_SIZE) {
                return {
                    success: false,
                    error: `이미지 파일이 너무 큽니다: ${(stats.size / 1024 / 1024).toFixed(2)}MB. 최대 크기: 10MB`
                };
            }

            if (stats.size === 0) {
                return { success: false, error: '이미지 파일이 비어있습니다' };
            }

            // Base64 인코딩
            const imageBuffer = fs.readFileSync(imagePath);
            const base64String = imageBuffer.toString('base64');

            if (!base64String || base64String.length === 0) {
                return { success: false, error: 'Base64 인코딩에 실패했습니다' };
            }

            ServerLogger.info(`이미지 인코딩 완료: ${imagePath} (${(stats.size / 1024).toFixed(2)}KB)`);
            return { success: true, base64: base64String };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            ServerLogger.error(`이미지 인코딩 실패 (${imagePath}):`, error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * 여러 이미지를 Base64로 일괄 인코딩
     */
    static async encodeMultipleImages(imagePaths: string[]): Promise<{
        success: boolean;
        results: Array<{ path: string; base64?: string; error?: string }>;
        successCount: number;
    }> {
        if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
            return { success: false, results: [], successCount: 0 };
        }

        const results: Array<{ path: string; base64?: string; error?: string }> = [];
        let successCount = 0;

        for (const imagePath of imagePaths) {
            const result = await this.encodeImageToBase64(imagePath);

            if (result.success && result.base64) {
                results.push({ path: imagePath, base64: result.base64 });
                successCount++;
            } else {
                results.push({ path: imagePath, error: result.error });
            }
        }

        return {
            success: successCount > 0,
            results,
            successCount
        };
    }

    /**
     * 이미지 파일 유효성 검사
     */
    static validateImageFile(imagePath: string): { isValid: boolean; error?: string } {
        try {
            if (!imagePath || typeof imagePath !== 'string') {
                return { isValid: false, error: '유효하지 않은 경로입니다' };
            }

            if (!fs.existsSync(imagePath)) {
                return { isValid: false, error: '파일이 존재하지 않습니다' };
            }

            const ext = path.extname(imagePath).toLowerCase();
            if (!this.SUPPORTED_FORMATS.includes(ext)) {
                return { isValid: false, error: '지원하지 않는 이미지 형식입니다' };
            }

            const stats = fs.statSync(imagePath);
            if (stats.size === 0) {
                return { isValid: false, error: '파일이 비어있습니다' };
            }

            if (stats.size > this.MAX_FILE_SIZE) {
                return { isValid: false, error: '파일이 너무 큽니다' };
            }

            return { isValid: true };

        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    /**
     * 이미지 파일 메타데이터 추출
     */
    static getImageMetadata(imagePath: string): {
        success: boolean;
        metadata?: {
            size: number;
            extension: string;
            mimeType: string;
            created: Date;
            modified: Date;
        };
        error?: string;
    } {
        try {
            if (!fs.existsSync(imagePath)) {
                return { success: false, error: '파일이 존재하지 않습니다' };
            }

            const stats = fs.statSync(imagePath);
            const ext = path.extname(imagePath).toLowerCase();

            const mimeTypeMap: { [key: string]: string } = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.bmp': 'image/bmp',
                '.webp': 'image/webp'
            };

            return {
                success: true,
                metadata: {
                    size: stats.size,
                    extension: ext,
                    mimeType: mimeTypeMap[ext] || 'application/octet-stream',
                    created: stats.birthtime,
                    modified: stats.mtime
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    /**
     * 이미지 파일 정리 (오래된 파일 삭제)
     */
    static cleanOldImages(directory: string, maxAge: number = 24 * 60 * 60 * 1000): number {
        let deletedCount = 0;

        try {
            if (!fs.existsSync(directory)) {
                return 0;
            }

            const files = fs.readdirSync(directory);
            const now = Date.now();

            files.forEach(file => {
                const filePath = path.join(directory, file);

                try {
                    const stats = fs.statSync(filePath);
                    const ext = path.extname(file).toLowerCase();

                    // 이미지 파일만 처리
                    if (this.SUPPORTED_FORMATS.includes(ext)) {
                        if (now - stats.mtime.getTime() > maxAge) {
                            fs.unlinkSync(filePath);
                            deletedCount++;
                            ServerLogger.info(`오래된 이미지 파일 삭제: ${filePath}`);
                        }
                    }
                } catch (error) {
                    ServerLogger.warn(`파일 처리 실패: ${filePath}`, error);
                }
            });

            if (deletedCount > 0) {
                ServerLogger.info(`${directory}에서 ${deletedCount}개의 오래된 이미지 파일을 정리했습니다`);
            }

        } catch (error) {
            ServerLogger.error(`이미지 정리 실패 (${directory}):`, error);
        }

        return deletedCount;
    }

    /**
     * 지원하는 이미지 형식 목록 반환
     */
    static getSupportedFormats(): string[] {
        return [...this.SUPPORTED_FORMATS];
    }

    /**
     * 최대 파일 크기 반환
     */
    static getMaxFileSize(): number {
        return this.MAX_FILE_SIZE;
    }
}

export default ImageProcessor;