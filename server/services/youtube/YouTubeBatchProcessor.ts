import * as path from 'path';
import { ServerLogger } from '../../utils/logger';
import { UrlProcessor } from './utils/UrlProcessor';
import { BatchQueueManager } from './managers/BatchQueueManager';
import { BatchProcessor } from './processors/BatchProcessor';
import {
    BatchItem,
    BatchResult,
    BatchStatus,
    AddToBatchOptions,
    AddToBatchResult,
    BatchProcessorConfig
} from './types/batch-types';

export class YouTubeBatchProcessor {
    private queueManager: BatchQueueManager;
    private batchProcessor: BatchProcessor;
    private config: BatchProcessorConfig;
    private isProcessing: boolean = false;
    private timeoutId: NodeJS.Timeout | null = null;

    constructor() {
        this.config = {
            maxBatchSize: 50, // YouTube API 최대 제한
            batchTimeout: 60000, // 60초 후 자동 처리
            batchFile: path.join(__dirname, '../../../data/youtube_batch_queue.json'),
            apiTimeout: 30000, // 30초 API 타임아웃
        };

        this.queueManager = new BatchQueueManager(this.config);
        this.batchProcessor = new BatchProcessor(this.config);

        // 서비스 레지스트리에 등록
        this.registerToServiceRegistry();

        ServerLogger.success('📦 YouTube 배치 처리기 초기화 완료:', {
            maxBatchSize: this.config.maxBatchSize,
            batchTimeout: this.config.batchTimeout / 1000 + '초',
            batchFile: this.config.batchFile
        });
    }

    /**
     * 초기화
     */
    async initialize(): Promise<void> {
        try {
            await this.queueManager.initialize();
            await this.batchProcessor.initialize();

            // 복원된 항목이 있으면 타임아웃 설정
            if (!this.queueManager.isEmpty() && !this.timeoutId) {
                this.scheduleTimeout();
            }

            ServerLogger.info('YouTube 배치 처리기 초기화 완료');
        } catch (error) {
            ServerLogger.error('YouTube 배치 처리기 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 배치 큐에 YouTube URL 추가
     */
    async addToBatch(videoUrl: string, options: AddToBatchOptions = {}): Promise<AddToBatchResult> {
        try {
            // URL 검증
            ServerLogger.debug('YouTube URL 검증:', { url: videoUrl.substring(0, 50) });

            const videoId = UrlProcessor.extractVideoId(videoUrl);
            if (!videoId) {
                throw new Error('유효하지 않은 YouTube URL입니다');
            }

            // 배치 아이템 생성
            const batchItem: BatchItem = {
                id: this.generateBatchId(),
                videoUrl,
                videoId,
                addedAt: new Date().toISOString(),
                priority: options.priority || 'normal',
                clientInfo: options.clientInfo || {},
                metadata: options.metadata || {},
                status: 'pending',
            };

            // 큐에 추가
            this.queueManager.addItem(batchItem);
            await this.queueManager.saveToFile();

            ServerLogger.info('배치 큐에 추가:', {
                videoId,
                queueLength: this.queueManager.getQueueLength(),
                maxSize: this.config.maxBatchSize
            });

            // 즉시 처리 조건 확인
            if (this.queueManager.isFull(this.config.maxBatchSize)) {
                ServerLogger.info('🚀 배치 큐 가득참 - 즉시 처리 시작');
                this.clearTimeout();
                const result = await this.processBatch();
                return {
                    batchId: batchItem.id,
                    status: 'processing',
                    queuePosition: 0,
                    estimatedWaitTime: 0,
                    message: '즉시 처리 완료'
                };
            }

            // 타임아웃 스케줄링
            this.scheduleTimeout();

            return {
                batchId: batchItem.id,
                status: 'queued',
                queuePosition: this.queueManager.getQueueLength(),
                estimatedWaitTime: this.queueManager.getEstimatedWaitTime(
                    this.config.maxBatchSize,
                    this.config.batchTimeout
                ),
                message: `큐에 추가됨 (${this.queueManager.getQueueLength()}/${this.config.maxBatchSize})`
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            ServerLogger.error('배치 큐 추가 실패:', errorMessage);
            throw error;
        }
    }

    /**
     * 배치 처리 실행
     */
    async processBatch(): Promise<BatchResult> {
        if (this.isProcessing || this.queueManager.isEmpty()) {
            return {
                success: false,
                processed: 0,
                total: 0,
                processingTime: 0,
                quotaSaved: 0,
                results: [],
            };
        }

        this.isProcessing = true;
        this.clearTimeout();

        try {
            // 큐에서 모든 아이템 가져오기
            const batchItems = this.queueManager.dequeueAll();
            await this.queueManager.saveToFile();

            ServerLogger.info('🔄 배치 처리 시작:', {
                itemCount: batchItems.length,
                expectedQuotaSaving: this.calculateQuotaSaving(batchItems.length)
            });

            // 실제 처리
            const result = await this.batchProcessor.processBatch(batchItems);

            // 통계 업데이트
            if (result.success) {
                const chunksUsed = Math.ceil(batchItems.length / this.config.maxBatchSize);
                this.queueManager.updateStats(
                    result.processed,
                    chunksUsed,
                    result.quotaSaved,
                    result.processingTime
                );
                await this.queueManager.saveToFile();
            } else {
                // 실패한 경우 아이템들을 다시 큐에 추가
                this.queueManager.requeueItems(batchItems);
                await this.queueManager.saveToFile();
            }

            return result;

        } catch (error) {
            ServerLogger.error('배치 처리 실행 실패:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 강제 배치 처리
     */
    async forceProcess(): Promise<BatchResult> {
        if (this.queueManager.isEmpty()) {
            return {
                success: false,
                processed: 0,
                total: 0,
                processingTime: 0,
                quotaSaved: 0,
                results: [],
            };
        }

        ServerLogger.info('🔥 강제 배치 처리:', {
            queueLength: this.queueManager.getQueueLength()
        });

        return await this.processBatch();
    }

    /**
     * 현재 큐 상태 조회
     */
    getStatus(): BatchStatus {
        const queueLength = this.queueManager.getQueueLength();
        const stats = this.queueManager.getStats();

        return {
            queueLength,
            maxBatchSize: this.config.maxBatchSize,
            isProcessing: this.isProcessing,
            nextProcessTime: this.timeoutId
                ? new Date(Date.now() + this.config.batchTimeout).toISOString()
                : null,
            stats,
            estimatedQuotaSaving: queueLength > 0
                ? this.calculateQuotaSaving(queueLength)
                : '0 유닛',
        };
    }

    /**
     * 큐 비우기
     */
    async clearQueue(): Promise<{ cleared: number }> {
        this.clearTimeout();
        const clearedCount = await this.queueManager.clearQueue();

        ServerLogger.info('🧹 배치 큐 비우기 완료:', { clearedCount });
        return { cleared: clearedCount };
    }

    /**
     * 설정 업데이트
     */
    updateConfig(newConfig: Partial<BatchProcessorConfig>): void {
        this.config = { ...this.config, ...newConfig };
        ServerLogger.info('⚙️ 배치 처리기 설정 업데이트:', this.config);
    }

    /**
     * 현재 설정 반환
     */
    getConfig(): BatchProcessorConfig {
        return { ...this.config };
    }

    /**
     * 큐 요약 정보 반환
     */
    getQueueSummary() {
        return this.queueManager.getQueueSummary();
    }

    /**
     * 배치 ID 생성
     */
    private generateBatchId(): string {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 타임아웃 스케줄링
     */
    private scheduleTimeout(): void {
        if (this.timeoutId) {
            return; // 이미 스케줄됨
        }

        this.timeoutId = setTimeout(() => {
            if (!this.queueManager.isEmpty()) {
                ServerLogger.info('⏰ 타임아웃 - 부분 배치 처리 시작');
                this.processBatch().catch(error => {
                    ServerLogger.error('타임아웃 배치 처리 실패:', error);
                });
            }
            this.timeoutId = null;
        }, this.config.batchTimeout);
    }

    /**
     * 타임아웃 클리어
     */
    private clearTimeout(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * 할당량 절약 계산
     */
    private calculateQuotaSaving(itemCount: number): string {
        const chunksNeeded = Math.ceil(itemCount / this.config.maxBatchSize);
        const quotaSaved = itemCount * 8 - chunksNeeded * 12;
        return `${quotaSaved} 유닛`;
    }

    /**
     * 서비스 레지스트리 등록
     */
    private registerToServiceRegistry(): void {
        try {
            const serviceRegistry = require('../../utils/service-registry');
            serviceRegistry.register(this);
        } catch (error) {
            ServerLogger.warn('서비스 레지스트리 등록 실패:', error);
        }
    }

    /**
     * API 키 캐시 클리어 (호환성)
     */
    clearApiKeyCache(): void {
        ServerLogger.info('🔄 YouTubeBatchProcessor API 키 캐시 클리어');
        // 새 아키텍처에서는 MultiKeyManager가 자동으로 처리
    }

    /**
     * 싱글톤 인스턴스
     */
    private static instance: YouTubeBatchProcessor | null = null;

    static async getInstance(): Promise<YouTubeBatchProcessor> {
        if (!this.instance) {
            this.instance = new YouTubeBatchProcessor();
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

// 호환성을 위한 싱글톤 인스턴스 생성 및 내보내기
let youtubeBatchProcessorInstance: YouTubeBatchProcessor | null = null;

const getYouTubeBatchProcessor = async (): Promise<YouTubeBatchProcessor> => {
    if (!youtubeBatchProcessorInstance) {
        youtubeBatchProcessorInstance = new YouTubeBatchProcessor();
        await youtubeBatchProcessorInstance.initialize();
    }
    return youtubeBatchProcessorInstance;
};

// CommonJS와 ES6 모듈 모두 지원
export default getYouTubeBatchProcessor;