import { Request, Response } from 'express';
import { BaseController } from './base/BaseController';
import { ServerLogger } from '../utils/logger';
import ErrorHandler from '../middleware/error-handler';
import { AIAnalyzer } from '../services/ai/AIAnalyzer';

import type { HealthCheckResponse } from '../types/controller-types';

/**
 * 시스템 통계 및 상태 체크 전용 컨트롤러
 * 책임: 통계 조회, 헬스 체크, 시스템 모니터링
 */
export class SystemStatsController extends BaseController {

    /**
     * 통계 조회
     */
    getStats = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        this.checkDateReset();

        res.json({
            success: true,
            data: {
                ...this.stats,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            },
        });
    });

    /**
     * 헬스 체크
     */
    healthCheck = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const health: HealthCheckResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            services: {
                videoProcessor: 'ok',
                aiAnalyzer: 'unknown',
                sheetsManager: 'unknown',
            },
        };

        // AI 서비스 상태 확인
        try {
            await this.aiAnalyzer.testConnection();
            health.services.aiAnalyzer = 'ok';
        } catch (error) {
            health.services.aiAnalyzer = 'error';
        }

        // 구글 시트 서비스 상태 확인
        try {
            await this.sheetsManager?.testConnection();
            health.services.sheetsManager = 'ok';
        } catch (error) {
            health.services.sheetsManager = 'error';
        }

        res.json(health);
    });

    /**
     * 구글 시트 연결 테스트
     */
    testSheets = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.sheetsManager!.testConnection();
            // 기존 API 형식 유지 (호환성)
            res.json({
                status: 'ok',
                result,
                // 새 형식도 함께 제공
                success: true,
                data: result,
            });
        } catch (error: any) {
            // 기존 에러 형식 유지
            res.status(500).json({
                status: 'error',
                message: '구글 시트에 연결할 수 없습니다. API 키와 인증 설정을 확인해주세요.',
                suggestion: '구글 API 키 설정과 인증을 확인해주세요.',
            });
        }
    });

    /**
     * 자가 학습 카테고리 시스템 통계 조회
     */
    getSelfLearningStats = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            const aiAnalyzer = new AIAnalyzer();
            const stats = aiAnalyzer.getSelfLearningStats();
            const systemStats = aiAnalyzer.getSystemStats();

            res.json({
                success: true,
                data: {
                    categoryStats: stats,
                    systemStats: systemStats,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            ServerLogger.error('자가 학습 통계 조회 실패', error, 'STATS');
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
}