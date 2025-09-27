import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerLogger } from '../../../utils/logger';
import { BatchItem, BatchStats, QueueState, BatchProcessorConfig } from '../types/batch-types';

export class BatchQueueManager {
    private batchQueue: BatchItem[] = [];
    private stats: BatchStats;
    private batchFile: string;

    constructor(config: BatchProcessorConfig) {
        this.batchFile = config.batchFile;
        this.stats = {
            totalProcessed: 0,
            totalBatches: 0,
            quotaSaved: 0,
            avgProcessingTime: 0,
        };
    }

    /**
     * 큐 초기화 (파일에서 복원)
     */
    async initialize(): Promise<void> {
        await this.restoreFromFile();
    }

    /**
     * 큐에 아이템 추가
     */
    addItem(item: BatchItem): void {
        this.batchQueue.push(item);
        ServerLogger.debug('큐에 아이템 추가:', {
            id: item.id,
            videoId: item.videoId,
            queueLength: this.batchQueue.length
        });
    }

    /**
     * 큐에서 모든 아이템 가져오기 및 비우기
     */
    dequeueAll(): BatchItem[] {
        const items = [...this.batchQueue];
        this.batchQueue = [];

        ServerLogger.debug('큐에서 모든 아이템 제거:', {
            itemCount: items.length,
            remainingCount: this.batchQueue.length
        });

        return items;
    }

    /**
     * 실패한 아이템들을 큐 앞에 다시 추가
     */
    requeueItems(items: BatchItem[]): void {
        this.batchQueue.unshift(...items);

        ServerLogger.warn('아이템 재큐잉:', {
            requeuingCount: items.length,
            totalQueueLength: this.batchQueue.length
        });
    }

    /**
     * 큐 길이 반환
     */
    getQueueLength(): number {
        return this.batchQueue.length;
    }

    /**
     * 큐가 비어있는지 확인
     */
    isEmpty(): boolean {
        return this.batchQueue.length === 0;
    }

    /**
     * 큐가 가득 찼는지 확인
     */
    isFull(maxSize: number): boolean {
        return this.batchQueue.length >= maxSize;
    }

    /**
     * 큐 비우기
     */
    async clearQueue(): Promise<number> {
        const clearedCount = this.batchQueue.length;
        this.batchQueue = [];
        await this.saveToFile();

        ServerLogger.info('큐 비우기 완료:', { clearedCount });
        return clearedCount;
    }

    /**
     * 통계 업데이트
     */
    updateStats(processed: number, batches: number, quotaSaved: number, processingTime: number): void {
        this.stats.totalProcessed += processed;
        this.stats.totalBatches += batches;
        this.stats.quotaSaved += quotaSaved;

        // 평균 처리 시간 업데이트 (지수 이동 평균)
        if (this.stats.totalBatches === 1) {
            this.stats.avgProcessingTime = processingTime;
        } else {
            const alpha = 0.1;
            this.stats.avgProcessingTime =
                (1 - alpha) * this.stats.avgProcessingTime + alpha * processingTime;
        }

        ServerLogger.debug('배치 통계 업데이트:', this.stats);
    }

    /**
     * 통계 반환
     */
    getStats(): BatchStats {
        return { ...this.stats };
    }

    /**
     * 예상 대기 시간 계산
     */
    getEstimatedWaitTime(maxBatchSize: number, batchTimeout: number): number {
        if (this.batchQueue.length >= maxBatchSize) {
            return 0; // 즉시 처리
        }

        const timeToFull = batchTimeout;
        const avgProcessingTime = this.stats.avgProcessingTime || 10000;

        return Math.max(timeToFull, avgProcessingTime);
    }

    /**
     * 파일에 큐 상태 저장
     */
    async saveToFile(): Promise<void> {
        try {
            const dataDir = path.dirname(this.batchFile);
            await fs.mkdir(dataDir, { recursive: true });

            const data: QueueState = {
                queue: this.batchQueue,
                stats: this.stats,
                savedAt: new Date().toISOString(),
            };

            await fs.writeFile(this.batchFile, JSON.stringify(data, null, 2));

            ServerLogger.debug('큐 상태 파일 저장 완료:', {
                queueLength: this.batchQueue.length,
                filePath: this.batchFile
            });

        } catch (error) {
            ServerLogger.error('큐 상태 파일 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 파일에서 큐 상태 복원
     */
    private async restoreFromFile(): Promise<void> {
        try {
            const data = await fs.readFile(this.batchFile, 'utf8');
            const parsed: QueueState = JSON.parse(data);

            this.batchQueue = parsed.queue || [];
            this.stats = { ...this.stats, ...parsed.stats };

            if (this.batchQueue.length > 0) {
                ServerLogger.info('배치 큐 복원 완료:', {
                    queueLength: this.batchQueue.length,
                    oldestItem: this.batchQueue[0]?.addedAt,
                    stats: this.stats,
                });
            }

        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                ServerLogger.error('큐 상태 파일 복원 실패:', error);
            } else {
                ServerLogger.debug('큐 상태 파일 없음 - 새로 시작');
            }
            this.batchQueue = [];
        }
    }

    /**
     * 큐 상태 요약 반환
     */
    getQueueSummary(): {
        length: number;
        oldestItemAge: number | null;
        newestItemAge: number | null;
        priorityCounts: Record<string, number>;
    } {
        if (this.batchQueue.length === 0) {
            return {
                length: 0,
                oldestItemAge: null,
                newestItemAge: null,
                priorityCounts: {}
            };
        }

        const now = Date.now();
        const oldest = new Date(this.batchQueue[0].addedAt).getTime();
        const newest = new Date(this.batchQueue[this.batchQueue.length - 1].addedAt).getTime();

        const priorityCounts = this.batchQueue.reduce((counts, item) => {
            counts[item.priority] = (counts[item.priority] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        return {
            length: this.batchQueue.length,
            oldestItemAge: now - oldest,
            newestItemAge: now - newest,
            priorityCounts
        };
    }

    /**
     * 특정 조건의 아이템들 필터링
     */
    getItemsByStatus(status: BatchItem['status']): BatchItem[] {
        return this.batchQueue.filter(item => item.status === status);
    }

    /**
     * 특정 우선순위의 아이템들 필터링
     */
    getItemsByPriority(priority: BatchItem['priority']): BatchItem[] {
        return this.batchQueue.filter(item => item.priority === priority);
    }
}

export default BatchQueueManager;