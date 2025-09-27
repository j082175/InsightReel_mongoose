import { ServerLogger } from '../../../utils/logger';
import { ImageProcessor } from '../processors/ImageProcessor';

interface FrameAnalysisOptions {
    analysisType?: 'single' | 'multi-frame' | 'dynamic';
    maxFrames?: number;
    fallbackToSingle?: boolean;
}

interface FrameAnalysisResult {
    success: boolean;
    frameData?: Array<{
        path: string;
        base64?: string;
        metadata?: any;
        error?: string;
    }>;
    analysisType: 'single' | 'multi-frame' | 'dynamic';
    error?: string;
}

export class FrameAnalyzer {
    private static readonly DEFAULT_OPTIONS: FrameAnalysisOptions = {
        analysisType: 'multi-frame',
        maxFrames: 5,
        fallbackToSingle: true
    };

    /**
     * 단일 프레임 분석
     */
    static async analyzeSingleFrame(
        thumbnailPath: string,
        metadata?: any
    ): Promise<FrameAnalysisResult> {
        try {
            if (!thumbnailPath) {
                return {
                    success: false,
                    analysisType: 'single',
                    error: '썸네일 경로가 제공되지 않았습니다'
                };
            }

            // 이미지 유효성 검사
            const validation = ImageProcessor.validateImageFile(thumbnailPath);
            if (!validation.isValid) {
                return {
                    success: false,
                    analysisType: 'single',
                    error: `이미지 유효성 검사 실패: ${validation.error}`
                };
            }

            // Base64 인코딩
            const encodeResult = await ImageProcessor.encodeImageToBase64(thumbnailPath);
            if (!encodeResult.success || !encodeResult.base64) {
                return {
                    success: false,
                    analysisType: 'single',
                    error: `이미지 인코딩 실패: ${encodeResult.error}`
                };
            }

            // 이미지 메타데이터 추출
            const imageMetadata = ImageProcessor.getImageMetadata(thumbnailPath);

            const frameData = [{
                path: thumbnailPath,
                base64: encodeResult.base64,
                metadata: {
                    ...metadata,
                    image: imageMetadata.success ? imageMetadata.metadata : null
                }
            }];

            ServerLogger.info(`단일 프레임 분석 완료: ${thumbnailPath}`);
            return {
                success: true,
                frameData,
                analysisType: 'single'
            };

        } catch (error) {
            ServerLogger.error('단일 프레임 분석 실패:', error);
            return {
                success: false,
                analysisType: 'single',
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    /**
     * 다중 프레임 분석
     */
    static async analyzeMultipleFrames(
        thumbnailPaths: string[],
        metadata?: any,
        options: FrameAnalysisOptions = {}
    ): Promise<FrameAnalysisResult> {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        try {
            if (!Array.isArray(thumbnailPaths) || thumbnailPaths.length === 0) {
                if (opts.fallbackToSingle && thumbnailPaths.length === 1) {
                    return await this.analyzeSingleFrame(thumbnailPaths[0], metadata);
                }

                return {
                    success: false,
                    analysisType: 'multi-frame',
                    error: '유효한 썸네일 경로가 제공되지 않았습니다'
                };
            }

            // 최대 프레임 수 제한
            const limitedPaths = thumbnailPaths.slice(0, opts.maxFrames || 5);

            // 다중 이미지 인코딩
            const encodeResults = await ImageProcessor.encodeMultipleImages(limitedPaths);

            if (!encodeResults.success || encodeResults.successCount === 0) {
                if (opts.fallbackToSingle && limitedPaths.length > 0) {
                    ServerLogger.warn('다중 프레임 분석 실패, 단일 프레임으로 대체');
                    return await this.analyzeSingleFrame(limitedPaths[0], metadata);
                }

                return {
                    success: false,
                    analysisType: 'multi-frame',
                    error: '모든 이미지 인코딩에 실패했습니다'
                };
            }

            // 성공한 프레임들만 처리
            const frameData = encodeResults.results.map(result => {
                if (result.base64) {
                    const imageMetadata = ImageProcessor.getImageMetadata(result.path);
                    return {
                        path: result.path,
                        base64: result.base64,
                        metadata: {
                            ...metadata,
                            image: imageMetadata.success ? imageMetadata.metadata : null
                        }
                    };
                } else {
                    return {
                        path: result.path,
                        error: result.error
                    };
                }
            });

            const successfulFrames = frameData.filter(frame => frame.base64);

            if (successfulFrames.length === 0) {
                return {
                    success: false,
                    analysisType: 'multi-frame',
                    error: '성공적으로 처리된 프레임이 없습니다'
                };
            }

            ServerLogger.info(`다중 프레임 분석 완료: ${successfulFrames.length}/${limitedPaths.length} 프레임`);
            return {
                success: true,
                frameData,
                analysisType: 'multi-frame'
            };

        } catch (error) {
            ServerLogger.error('다중 프레임 분석 실패:', error);

            // 폴백 옵션이 있고 최소 1개 경로가 있다면 단일 프레임으로 시도
            if (opts.fallbackToSingle && thumbnailPaths.length > 0) {
                ServerLogger.info('다중 프레임 분석 실패, 단일 프레임으로 대체');
                return await this.analyzeSingleFrame(thumbnailPaths[0], metadata);
            }

            return {
                success: false,
                analysisType: 'multi-frame',
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    /**
     * 동적 프레임 분석 (조건에 따라 단일/다중 결정)
     */
    static async analyzeDynamicFrames(
        thumbnailPaths: string | string[],
        metadata?: any,
        options: FrameAnalysisOptions = {}
    ): Promise<FrameAnalysisResult> {
        try {
            // 입력 정규화
            const paths = Array.isArray(thumbnailPaths) ? thumbnailPaths : [thumbnailPaths];

            // 유효한 경로만 필터링
            const validPaths = paths.filter(path => {
                if (!path || typeof path !== 'string') return false;
                const validation = ImageProcessor.validateImageFile(path);
                return validation.isValid;
            });

            if (validPaths.length === 0) {
                return {
                    success: false,
                    analysisType: 'dynamic',
                    error: '유효한 이미지 파일이 없습니다'
                };
            }

            // 단일 프레임 vs 다중 프레임 결정
            if (validPaths.length === 1 || options.analysisType === 'single') {
                return await this.analyzeSingleFrame(validPaths[0], metadata);
            } else {
                return await this.analyzeMultipleFrames(validPaths, metadata, options);
            }

        } catch (error) {
            ServerLogger.error('동적 프레임 분석 실패:', error);
            return {
                success: false,
                analysisType: 'dynamic',
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    /**
     * 프레임 데이터 검증
     */
    static validateFrameData(frameData: any[]): {
        isValid: boolean;
        validFrames: number;
        errors: string[];
    } {
        const errors: string[] = [];
        let validFrames = 0;

        if (!Array.isArray(frameData)) {
            return {
                isValid: false,
                validFrames: 0,
                errors: ['프레임 데이터가 배열이 아닙니다']
            };
        }

        frameData.forEach((frame, index) => {
            if (!frame.path) {
                errors.push(`프레임 ${index + 1}: 경로가 없습니다`);
                return;
            }

            if (!frame.base64 && !frame.error) {
                errors.push(`프레임 ${index + 1}: Base64 데이터가 없습니다`);
                return;
            }

            if (frame.base64) {
                validFrames++;
            }
        });

        return {
            isValid: validFrames > 0,
            validFrames,
            errors
        };
    }

    /**
     * 프레임 통계 정보 생성
     */
    static generateFrameStats(frameData: any[]): {
        totalFrames: number;
        successfulFrames: number;
        failedFrames: number;
        totalSize: number;
        averageSize: number;
    } {
        let totalSize = 0;
        let successfulFrames = 0;
        let failedFrames = 0;

        frameData.forEach(frame => {
            if (frame.base64) {
                successfulFrames++;
                const size = frame.metadata?.image?.size || 0;
                totalSize += size;
            } else {
                failedFrames++;
            }
        });

        return {
            totalFrames: frameData.length,
            successfulFrames,
            failedFrames,
            totalSize,
            averageSize: successfulFrames > 0 ? totalSize / successfulFrames : 0
        };
    }
}

export default FrameAnalyzer;