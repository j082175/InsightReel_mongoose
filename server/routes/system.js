const express = require('express');
const router = express.Router();
const MemoryMonitor = require('../utils/memory-monitor');
const { ServerLogger } = require('../utils/logger');

/**
 * 시스템 상태 관련 API 엔드포인트
 */

/**
 * @route GET /api/system/memory
 * @desc 메모리 사용량 확인
 */
router.get('/memory', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        const report = memoryMonitor.generateMemoryReport();

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        ServerLogger.error('메모리 리포트 생성 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '메모리 리포트 생성 실패',
            message: error.message
        });
    }
});

/**
 * @route POST /api/system/gc
 * @desc 가비지 컬렉션 강제 실행
 */
router.post('/gc', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        const success = memoryMonitor.performGarbageCollection(true);

        if (success) {
            res.json({
                success: true,
                message: '가비지 컬렉션이 실행되었습니다'
            });
        } else {
            res.status(400).json({
                success: false,
                message: '가비지 컬렉션을 사용할 수 없습니다. Node.js를 --expose-gc 플래그로 시작하세요.'
            });
        }
    } catch (error) {
        ServerLogger.error('가비지 컬렉션 실행 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '가비지 컬렉션 실행 실패',
            message: error.message
        });
    }
});

/**
 * @route GET /api/system/health
 * @desc 시스템 전체 상태 확인
 */
router.get('/health', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        const memoryReport = memoryMonitor.generateMemoryReport();

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            memory: memoryReport.current,
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        };

        // 메모리 임계값 검사
        if (memoryReport.current.rss > 1000) { // 1GB 이상
            health.status = 'critical';
        } else if (memoryReport.current.rss > 500) { // 500MB 이상
            health.status = 'warning';
        }

        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        ServerLogger.error('시스템 상태 확인 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '시스템 상태 확인 실패',
            message: error.message
        });
    }
});

/**
 * @route POST /api/system/cleanup
 * @desc 메모리 정리 강제 실행
 */
router.post('/cleanup', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        memoryMonitor.performEmergencyCleanup();

        res.json({
            success: true,
            message: '메모리 정리가 완료되었습니다'
        });
    } catch (error) {
        ServerLogger.error('메모리 정리 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '메모리 정리 실패',
            message: error.message
        });
    }
});

module.exports = router;