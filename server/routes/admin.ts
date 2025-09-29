import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES } from '../config/api-messages';

const router = Router();

// 시스템 건강 상태 확인
router.get('/health', async (req: Request, res: Response) => {
    try {
        // TODO: 시스템 건강 상태 체크 로직 구현
        ResponseHandler.success(res, {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Health check failed');
    }
});

// 시스템 통계 조회
router.get('/stats', async (req: Request, res: Response) => {
    try {
        // TODO: 시스템 통계 조회 로직 구현
        ResponseHandler.success(res, {
            stats: {
                total: 0,
                today: 0,
                lastReset: new Date().toDateString()
            }
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch stats');
    }
});

// API 키 관리 - 목록 조회
router.get('/api-keys', async (req: Request, res: Response) => {
    try {
        // TODO: API 키 목록 조회 로직 구현
        ResponseHandler.success(res, { apiKeys: [] });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch API keys');
    }
});

// API 키 관리 - 추가
router.post('/api-keys', async (req: Request, res: Response) => {
    try {
        const { keyName, keyValue, keyType } = req.body;
        // TODO: API 키 추가 로직 구현
        ResponseHandler.success(res, { message: 'API key added successfully' });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to add API key');
    }
});

// API 키 관리 - 삭제
router.delete('/api-keys/:keyId', async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        // TODO: API 키 삭제 로직 구현
        ResponseHandler.success(res, { message: 'API key deleted successfully' });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to delete API key');
    }
});

// 시스템 설정 조회
router.get('/config', async (req: Request, res: Response) => {
    try {
        // TODO: 시스템 설정 조회 로직 구현
        ResponseHandler.success(res, {
            config: {
                environment: process.env.NODE_ENV || 'development',
                port: process.env.PORT || 3000,
                mongodb: !!process.env.USE_MONGODB
            }
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch config');
    }
});

// 로그 조회
router.get('/logs', async (req: Request, res: Response) => {
    try {
        const { level = 'info', limit = 100, offset = 0 } = req.query;
        // TODO: 로그 조회 로직 구현
        ResponseHandler.success(res, {
            logs: [],
            pagination: {
                limit: Number(limit),
                offset: Number(offset),
                total: 0
            }
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch logs');
    }
});

// API 할당량 상태 조회
router.get('/quota-status', async (req: Request, res: Response) => {
    try {
        const ApiKeyManager = require('../services/ApiKeyManager');
        const UsageTracker = require('../utils/usage-tracker');
        const UnifiedGeminiManagerModule = await import('../utils/unified-gemini-manager');
        const UnifiedGeminiManager = UnifiedGeminiManagerModule.default || UnifiedGeminiManagerModule.UnifiedGeminiManager;

        // API 키 목록 조회
        await ApiKeyManager.initialize();
        const allKeys = await ApiKeyManager.getAllApiKeys();
        const activeKeys = await ApiKeyManager.getActiveApiKeys();

        if (activeKeys.length === 0) {
            return ResponseHandler.success(res, {
                quota: {
                    used: 0,
                    limit: 0,
                    remaining: 0,
                    usagePercent: "0%",
                    keyCount: 0,
                    allKeys: []
                },
                safetyMargin: 0,
                timestamp: new Date().toISOString(),
                recommendations: {
                    canProcess: false,
                    estimatedChannels: 0,
                    resetTime: "다음날 16:00",
                    safetyInfo: "활성 API 키가 없습니다"
                }
            });
        }

        // 첫 번째 활성 키로 사용량 추적기 생성
        const usageTracker = UsageTracker.getInstance(activeKeys[0]);
        const usageStats = usageTracker.getUsageStats();

        // Unified Gemini Manager에서 상세 사용량 정보 조회
        const geminiManager = UnifiedGeminiManager.getInstance();
        const geminiStats = geminiManager.getUsageStats();

        // 전체 사용량 계산
        const totalUsed = usageStats.total.used;
        const totalLimit = usageStats.total.quota;
        const usagePercentage = usageStats.total.percentage;

        // API 키별 상세 정보 생성
        const keyDetails = allKeys.map((key: any, index: number) => {
            const keyTracker = UsageTracker.getInstance(key.apiKey);
            const keyStats = keyTracker.getUsageStats();

            return {
                name: key.name,
                usage: `${keyStats.total.used}/${keyStats.total.quota}`,
                percentage: keyStats.total.percentage,
                status: key.status,
                realStatus: key.status === 'active' ? 'active' : 'inactive'
            };
        });

        // 응답 데이터 구성
        const quotaData = {
            quota: {
                used: totalUsed,
                limit: totalLimit,
                remaining: totalLimit - totalUsed,
                usagePercent: `${usagePercentage}%`,
                keyCount: activeKeys.length,
                allKeys: keyDetails
            },
            safetyMargin: Math.floor(totalLimit * 0.1), // 10% 안전 마진
            timestamp: new Date().toISOString(),
            recommendations: {
                canProcess: usagePercentage < 90,
                estimatedChannels: Math.floor((totalLimit - totalUsed) / 10), // 채널당 약 10회 호출 추정
                resetTime: "다음날 16:00 (KST)",
                safetyInfo: usagePercentage > 90 ? "할당량이 부족합니다" : "정상 사용 가능"
            },
            gemini: {
                pro: {
                    used: usageStats.pro.used,
                    limit: usageStats.pro.quota,
                    remaining: usageStats.pro.remaining,
                    usagePercent: usageStats.pro.percentage
                },
                flash: {
                    used: usageStats.flash.used,
                    limit: usageStats.flash.quota,
                    remaining: usageStats.flash.remaining,
                    usagePercent: usageStats.flash.percentage
                },
                flashLite: {
                    used: usageStats.flashLite.used,
                    limit: usageStats.flashLite.quota,
                    remaining: usageStats.flashLite.remaining,
                    usagePercent: usageStats.flashLite.percentage
                },
                total: {
                    used: totalUsed,
                    quota: totalLimit,
                    percentage: usagePercentage
                }
            }
        };

        ResponseHandler.success(res, quotaData);
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch quota status');
    }
});

// 디버그 엔드포인트들
router.get('/debug-very-early', (req: Request, res: Response) => {
    res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: '🔍 VERY EARLY DEBUG: 라인 25 실행됨!',
    });
});

router.get('/debug-before-services', (req: Request, res: Response) => {
    res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: '🔧 BEFORE SERVICES: 서비스 초기화 전 실행됨!',
    });
});

router.get('/debug-after-services', (req: Request, res: Response) => {
    res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: '✅ AFTER SERVICES: 기본 서비스 초기화 완료!',
    });
});

// Instagram 쿠키 상태 조회
router.get('/system/cookie-status', async (req: Request, res: Response) => {
    try {
        // TODO: Instagram 쿠키 상태 조회 로직 구현
        // 실제 쿠키 파일 상태를 확인하고 만료일 등을 계산해야 함
        const cookieStatus = {
            success: true,
            isExpiringSoon: false,
            daysRemaining: 30,
            daysOld: 1,
            lastUpdated: new Date().toISOString()
        };

        ResponseHandler.success(res, cookieStatus);
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch cookie status');
    }
});

// 트렌딩 통계 조회
router.get('/trending-stats', async (req: Request, res: Response) => {
    try {
        const TrendingVideo = require('../models/TrendingVideo').default || require('../models/TrendingVideo');

        // 전체 트렌딩 비디오 수 조회
        const count = await TrendingVideo.countDocuments({});

        // 가장 최근 업데이트 시간 조회
        const latestVideo = await TrendingVideo.findOne({})
            .sort({ createdAt: -1 })
            .select('createdAt')
            .lean();

        const trendingStats = {
            count,
            lastUpdate: latestVideo?.createdAt?.toISOString() || new Date().toISOString()
        };

        ResponseHandler.success(res, trendingStats);
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch trending stats');
    }
});

export default router;