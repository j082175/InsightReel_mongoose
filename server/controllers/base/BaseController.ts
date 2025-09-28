import { VideoProcessor } from '../../services/video/VideoProcessor';
import { AIAnalyzer } from '../../services/ai/AIAnalyzer';
import { SheetsManager } from '../../services/sheets/SheetsManager';
import UnifiedVideoSaver from '../../services/UnifiedVideoSaver';
import { VideoPipelineOrchestrator } from '../../services/pipeline/VideoPipelineOrchestrator';
import { ServerLogger } from '../../utils/logger';
import type { ControllerStats } from '../../types/controller-types';

/**
 * 모든 컨트롤러의 기본 클래스
 * 공통 서비스와 초기화 로직을 제공
 */
export abstract class BaseController {
    protected videoProcessor: VideoProcessor;
    protected aiAnalyzer: AIAnalyzer;
    protected sheetsManager: SheetsManager | null = null;
    protected unifiedVideoSaver: any;
    protected pipelineOrchestrator: VideoPipelineOrchestrator;
    protected _initialized: boolean = false;
    protected sheetsEnabled: boolean = false;
    protected stats: ControllerStats;

    constructor() {
        this.videoProcessor = new VideoProcessor();
        this.aiAnalyzer = new AIAnalyzer();

        // SheetsManager 조건부 초기화
        this.sheetsEnabled = process.env.DISABLE_SHEETS_SAVING !== 'true';
        if (this.sheetsEnabled) {
            try {
                this.sheetsManager = new SheetsManager();
            } catch (error) {
                ServerLogger.warn('⚠️ BaseController SheetsManager 초기화 실패, 비활성화 모드로 전환', error);
                this.sheetsEnabled = false;
                this.sheetsManager = null;
            }
        } else {
            ServerLogger.info('📋 BaseController Google Sheets 저장 비활성화');
        }

        this.unifiedVideoSaver = new UnifiedVideoSaver();

        // Initialize pipeline orchestrator
        this.pipelineOrchestrator = new VideoPipelineOrchestrator(
            this.videoProcessor,
            this.aiAnalyzer,
            this.sheetsManager,
            this.unifiedVideoSaver,
            this.sheetsEnabled
        );

        this.stats = {
            total: 0,
            today: 0,
            lastReset: new Date().toDateString(),
        };

        // 비동기 초기화 시작
        this.initialize();
    }

    /**
     * 비동기 초기화
     */
    async initialize(): Promise<void> {
        if (this._initialized) return;

        try {
            await this.videoProcessor.initialize();
            this._initialized = true;
            ServerLogger.info(`✅ ${this.constructor.name} 초기화 완료`);
        } catch (error) {
            ServerLogger.error(`❌ ${this.constructor.name} 초기화 실패:`, error);
        }
    }

    /**
     * 통계 리셋 확인
     */
    protected checkDateReset(): void {
        const today = new Date().toDateString();
        if (this.stats.lastReset !== today) {
            this.stats.today = 0;
            this.stats.lastReset = today;
        }
    }

    /**
     * 통계 업데이트
     */
    protected updateStats(): void {
        this.checkDateReset();
        this.stats.total++;
        this.stats.today++;
    }
}