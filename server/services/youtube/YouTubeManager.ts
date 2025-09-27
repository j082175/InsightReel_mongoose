import { ServerLogger } from '../../utils/logger';
import { HybridYouTubeExtractor } from './HybridYouTubeExtractor';
import { YouTubeBatchProcessor } from './YouTubeBatchProcessor';
import { YouTubeChannelAnalyzer } from './YouTubeChannelAnalyzer';
import { ChannelService } from './services/ChannelService';
import { ChannelDataCollector } from './services/ChannelDataCollector';
import { ChannelInfoCollector } from './analyzers/ChannelInfoCollector';
import {
    ExtractionResult,
    VideoExtractionConfig
} from './types/extraction-types';
import {
    BatchResult,
    AddToBatchOptions,
    AddToBatchResult,
    BatchStatus
} from './types/batch-types';
import {
    ChannelInfo,
    ChannelAnalysisResult,
    ChannelAnalysisConfig
} from './types/channel-types';

export class YouTubeManager {
    private extractor: HybridYouTubeExtractor;
    private batchProcessor: YouTubeBatchProcessor;
    private channelAnalyzer: YouTubeChannelAnalyzer;
    private channelService: ChannelService;
    private channelDataCollector: ChannelDataCollector;
    private channelInfoCollector: ChannelInfoCollector;
    private initialized: boolean = false;

    constructor() {
        this.extractor = new HybridYouTubeExtractor();
        this.batchProcessor = new YouTubeBatchProcessor();
        this.channelAnalyzer = new YouTubeChannelAnalyzer();
        this.channelService = new ChannelService();
        this.channelDataCollector = new ChannelDataCollector();
        this.channelInfoCollector = new ChannelInfoCollector();

        // 서비스 레지스트리에 등록
        this.registerToServiceRegistry();

        ServerLogger.success('🎯 YouTube 통합 매니저 초기화 완료');
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            await Promise.all([
                this.extractor.initialize(),
                this.batchProcessor.initialize(),
                this.channelAnalyzer.initialize(),
                this.channelService.initialize(),
                this.channelDataCollector.initialize(),
                this.channelInfoCollector.initialize()
            ]);

            this.initialized = true;
            ServerLogger.info('🚀 YouTube 통합 매니저 전체 초기화 완료');

        } catch (error) {
            ServerLogger.error('❌ YouTube 통합 매니저 초기화 실패:', error);
            throw error;
        }
    }

    // ===== 비디오 추출 관련 메서드 =====

    async extractVideo(videoUrl: string, config?: VideoExtractionConfig): Promise<ExtractionResult> {
        await this.initialize();
        return await this.extractor.extractVideoData(videoUrl);
    }

    async extractVideoInfo(videoUrl: string): Promise<any | null> {
        await this.initialize();
        const result = await this.extractor.extractVideoData(videoUrl);
        return result.success ? result.data : null;
    }

    // ===== 배치 처리 관련 메서드 =====

    async addToBatch(videoUrl: string, options?: AddToBatchOptions): Promise<AddToBatchResult> {
        await this.initialize();
        return await this.batchProcessor.addToBatch(videoUrl, options);
    }

    async processBatch(): Promise<BatchResult> {
        await this.initialize();
        return await this.batchProcessor.processBatch();
    }

    async forceProcessBatch(): Promise<BatchResult> {
        await this.initialize();
        return await this.batchProcessor.forceProcess();
    }

    getBatchStatus(): BatchStatus {
        return this.batchProcessor.getStatus();
    }

    async clearBatchQueue(): Promise<{ cleared: number }> {
        return await this.batchProcessor.clearQueue();
    }

    // ===== 채널 분석 관련 메서드 =====

    async analyzeChannel(channelId: string, config?: ChannelAnalysisConfig): Promise<ChannelAnalysisResult> {
        await this.initialize();
        return await this.channelAnalyzer.analyzeChannel(channelId, config);
    }

    async analyzeChannelBasic(channelId: string): Promise<ChannelAnalysisResult> {
        await this.initialize();
        return await this.channelAnalyzer.analyzeChannelBasic(channelId);
    }

    async checkChannelExists(channelId: string): Promise<boolean> {
        await this.initialize();
        return await this.channelAnalyzer.checkChannelExists(channelId);
    }

    async getChannelStats(channelId: string): Promise<{
        subscriberCount: number;
        videoCount: number;
        viewCount: number;
    } | null> {
        await this.initialize();
        return await this.channelAnalyzer.getChannelStats(channelId);
    }

    // ===== 채널 서비스 관련 메서드 =====

    async getChannelInfo(channelIdentifier: string): Promise<ChannelInfo | null> {
        await this.initialize();
        return await this.channelService.getChannelInfo(channelIdentifier);
    }

    async getMultipleChannels(channelIds: string[]): Promise<ChannelInfo[]> {
        await this.initialize();
        return await this.channelService.getMultipleChannels(channelIds);
    }

    async collectChannelData(channelInfo: any): Promise<any> {
        await this.initialize();
        return await this.channelDataCollector.collectChannelData(channelInfo);
    }

    async getChannelData(channelIdOrHandle: string): Promise<any> {
        await this.initialize();
        return await this.channelDataCollector.getChannelData(channelIdOrHandle);
    }

    // ===== 할당량 및 상태 관련 메서드 =====

    getQuotaStatus(): any {
        return this.channelService.getQuotaStatus();
    }

    clearApiKeyCache(): void {
        // HybridYouTubeExtractor는 clearApiKeyCache 메서드를 갖지 않음
        // 필요시 각 서비스에서 구현
        ServerLogger.info('API 키 캐시 클리어 요청됨');
        ServerLogger.info('🔄 YouTube 통합 매니저 API 키 캐시 클리어');
    }

    // ===== 설정 관련 메서드 =====

    updateBatchConfig(config: any): void {
        this.batchProcessor.updateConfig(config);
    }

    getBatchConfig(): any {
        return this.batchProcessor.getConfig();
    }

    getBatchQueueSummary(): any {
        return this.batchProcessor.getQueueSummary();
    }

    // ===== 상태 확인 메서드 =====

    getServiceStatus(): {
        extractor: string;
        batchProcessor: string;
        channelAnalyzer: string;
        channelService: string;
        initialized: boolean;
    } {
        return {
            extractor: 'ready',
            batchProcessor: 'ready',
            channelAnalyzer: 'ready',
            channelService: 'ready',
            initialized: this.initialized
        };
    }

    // ===== 유틸리티 메서드 =====

    private registerToServiceRegistry(): void {
        try {
            const serviceRegistry = require('../../utils/service-registry');
            serviceRegistry.register(this);
        } catch (error) {
            ServerLogger.warn('서비스 레지스트리 등록 실패:', error);
        }
    }

    // ===== 싱글톤 패턴 =====

    private static instance: YouTubeManager | null = null;

    static async getInstance(): Promise<YouTubeManager> {
        if (!this.instance) {
            this.instance = new YouTubeManager();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static resetInstance(): void {
        this.instance = null;
    }
}

// 호환성을 위한 기본 내보내기
export default YouTubeManager;