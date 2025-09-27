import { ServerLogger } from '../../utils/logger';
import { YtdlExtractor } from './extractors/YtdlExtractor';
import { APIExtractor } from './extractors/APIExtractor';
import { DataMerger } from './processors/DataMerger';
import { UrlProcessor } from './utils/UrlProcessor';
import {
    VideoExtractionConfig,
    ExtractionResult,
    ExtractorStatus,
    YtdlVideoData,
    APIVideoData
} from './types/extraction-types';

const MultiKeyManager = require('../../utils/multi-key-manager');

export class HybridYouTubeExtractor {
    private config: VideoExtractionConfig;
    private ytdlExtractor: YtdlExtractor;
    private apiExtractor: APIExtractor;
    private multiKeyManager: any;
    private initialized: boolean = false;

    constructor() {
        this.config = {
            useYtdlFirst: process.env.USE_YTDL_FIRST !== 'false',
            ytdlTimeout: 10000, // 10초
        };

        this.ytdlExtractor = new YtdlExtractor(this.config);
        this.apiExtractor = new APIExtractor();
        this.multiKeyManager = null;
    }

    /**
     * 비동기 초기화
     */
    async initialize(): Promise<HybridYouTubeExtractor> {
        if (this.initialized) {
            return this;
        }

        try {
            // 멀티 키 매니저 초기화
            this.multiKeyManager = await MultiKeyManager.getInstance();

            // API 추출기 초기화
            await this.apiExtractor.initialize();

            ServerLogger.success('🔧 하이브리드 YouTube 추출기 초기화 완료:', {
                keyCount: this.multiKeyManager.keys.length,
                ytdlFirst: this.config.useYtdlFirst,
                timeout: this.config.ytdlTimeout,
            });

            this.initialized = true;
            return this;

        } catch (error) {
            ServerLogger.error('❌ 하이브리드 YouTube 추출기 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 🎯 메인 추출 메서드 - 하이브리드 방식
     */
    async extractVideoData(url: string): Promise<ExtractionResult> {
        const startTime = Date.now();

        try {
            // 초기화 확인
            await this.initialize();

            // URL 검증
            const videoId = UrlProcessor.extractVideoId(url);
            if (!videoId) {
                throw new Error('유효하지 않은 YouTube URL입니다');
            }

            ServerLogger.info('🔍 하이브리드 데이터 추출 시작:', {
                videoId,
                url: url.substring(0, 50)
            });

            // 병렬 데이터 수집
            const [ytdlResult, apiResult] = await this.extractDataInParallel(url, videoId);

            // 데이터 병합
            const mergedData = DataMerger.mergeVideoData(ytdlResult, apiResult, url);

            const duration = Date.now() - startTime;

            // 결과 로깅
            ServerLogger.success('🎉 하이브리드 추출 완료:', {
                duration: `${duration}ms`,
                title: mergedData.title?.substring(0, 50),
                sources: {
                    ytdl: !!ytdlResult,
                    api: !!apiResult
                },
                qualityScore: this.calculateDataQuality(mergedData)
            });

            return {
                success: true,
                data: mergedData,
                sources: {
                    ytdl: !!ytdlResult,
                    api: !!apiResult,
                },
                extractionTime: duration,
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            ServerLogger.error('❌ 하이브리드 추출 실패:', {
                error: errorMessage,
                duration: `${duration}ms`,
                url: url.substring(0, 50)
            });

            return {
                success: false,
                error: errorMessage,
                extractionTime: duration,
            };
        }
    }

    /**
     * 병렬 데이터 추출
     */
    private async extractDataInParallel(url: string, videoId: string): Promise<[YtdlVideoData | null, APIVideoData | null]> {
        const extractionPromises: Promise<YtdlVideoData | null | APIVideoData>[] = [];

        // 1. ytdl-core 추출 (설정에 따라)
        if (this.config.useYtdlFirst) {
            extractionPromises.push(
                this.ytdlExtractor.extractVideoData(url).catch(error => {
                    ServerLogger.warn('⚠️ ytdl-core 추출 실패:', error.message);
                    return null;
                })
            );
        } else {
            extractionPromises.push(Promise.resolve(null));
        }

        // 2. YouTube API 추출
        extractionPromises.push(
            this.apiExtractor.extractVideoData(videoId).catch(error => {
                ServerLogger.warn('⚠️ YouTube API 추출 실패:', error.message);
                return null;
            })
        );

        const [ytdlResult, apiResult] = await Promise.all(extractionPromises);

        // 타입 안전성 보장
        const ytdlData = ytdlResult && typeof ytdlResult === 'object' && 'source' in ytdlResult && ytdlResult.source === 'ytdl-core'
            ? ytdlResult as YtdlVideoData
            : null;

        const apiData = apiResult && typeof apiResult === 'object' && 'source' in apiResult && apiResult.source === 'youtube-api'
            ? apiResult as APIVideoData
            : null;

        // 추출 결과 검증
        if (!ytdlData && !apiData) {
            throw new Error('모든 데이터 소스에서 추출 실패');
        }

        ServerLogger.debug('📊 병렬 추출 결과:', {
            ytdlSuccess: !!ytdlData,
            apiSuccess: !!apiData,
            ytdlTitle: ytdlData?.title?.substring(0, 30),
            apiTitle: apiData?.title?.substring(0, 30)
        });

        return [ytdlData, apiData];
    }

    /**
     * 데이터 품질 점수 계산
     */
    private calculateDataQuality(data: any): string {
        const checks = {
            hasTitle: !!data.title,
            hasDescription: !!data.description,
            hasChannelInfo: !!(data.channelName && data.channelId),
            hasStatistics: !!(data.viewCount || data.likeCount),
            hasThumbnails: Array.isArray(data.thumbnails) && data.thumbnails.length > 0,
            hasMetadata: Array.isArray(data.keywords) && data.keywords.length > 0,
        };

        const score = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;
        const percentage = Math.round((score / total) * 100);

        return `${score}/${total} (${percentage}%)`;
    }

    /**
     * YouTube URL에서 비디오 ID 추출 (호환성을 위한 메서드)
     */
    extractVideoId(url: string): string | null {
        return UrlProcessor.extractVideoId(url);
    }

    /**
     * 모든 API 키의 사용량 현황 조회
     */
    getUsageStatus(): any {
        return this.multiKeyManager?.getAllUsageStatus() || {};
    }

    /**
     * 사용량 현황 로그 출력
     */
    logUsageStatus(): void {
        this.multiKeyManager?.logUsageStatus();
    }

    /**
     * 📊 추출기 상태 및 통계
     */
    async getStatus(): Promise<ExtractorStatus> {
        try {
            await this.initialize();

            // 각 추출기 가용성 확인
            const [ytdlAvailable, apiAvailable] = await Promise.all([
                YtdlExtractor.checkAvailability().catch(() => false),
                this.apiExtractor.checkAvailability().catch(() => false)
            ]);

            return {
                available: {
                    ytdl: ytdlAvailable,
                    api: apiAvailable,
                },
                config: {
                    ytdlFirst: this.config.useYtdlFirst,
                    timeout: this.config.ytdlTimeout,
                },
                capabilities: {
                    basicInfo: ytdlAvailable || apiAvailable,
                    statistics: apiAvailable,
                    realTimeViews: ytdlAvailable,
                    thumbnails: ytdlAvailable || apiAvailable,
                    batchProcessing: apiAvailable,
                },
            };

        } catch (error) {
            ServerLogger.error('상태 조회 실패:', error);
            return {
                available: { ytdl: false, api: false },
                config: { ytdlFirst: this.config.useYtdlFirst, timeout: this.config.ytdlTimeout },
                capabilities: {
                    basicInfo: false,
                    statistics: false,
                    realTimeViews: false,
                    thumbnails: false,
                    batchProcessing: false,
                },
            };
        }
    }

    /**
     * 설정 업데이트
     */
    updateConfig(newConfig: Partial<VideoExtractionConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // ytdl 추출기 타임아웃 업데이트
        if (newConfig.ytdlTimeout) {
            this.ytdlExtractor.setTimeout(newConfig.ytdlTimeout);
        }

        ServerLogger.info('⚙️ 추출기 설정 업데이트:', this.config);
    }

    /**
     * 현재 설정 반환
     */
    getConfig(): VideoExtractionConfig {
        return { ...this.config };
    }

    /**
     * 싱글톤 인스턴스
     */
    private static instance: HybridYouTubeExtractor | null = null;

    static async getInstance(): Promise<HybridYouTubeExtractor> {
        if (!this.instance) {
            this.instance = new HybridYouTubeExtractor();
            await this.instance.initialize();
        }
        return this.instance;
    }

    /**
     * 인스턴스 재설정 (테스트용)
     */
    static resetInstance(): void {
        this.instance = null;
    }
}

export default HybridYouTubeExtractor;