const { ServerLogger } = require('./logger');

/**
 * 메모리 모니터링 및 가비지 컬렉션 관리 시스템
 */
class MemoryMonitor {
    static instance = null;

    constructor() {
        if (MemoryMonitor.instance) {
            return MemoryMonitor.instance;
        }

        this.monitorInterval = null;
        this.gcInterval = null;
        this.isMonitoring = false;
        this.memoryHistory = [];
        this.maxHistorySize = 100;

        // 메모리 임계값 설정 (MB) - 널널하게 조정
        this.thresholds = {
            warning: 2000,  // 2GB
            critical: 3000, // 3GB
            forceGC: 2500   // 2.5GB에서 강제 GC
        };

        MemoryMonitor.instance = this;
    }

    /**
     * 메모리 모니터링 시작
     */
    startMonitoring(intervalMs = 60000) { // 1분마다
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;

        this.monitorInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, intervalMs);

        // 가비지 컬렉션 주기적 실행 (5분마다)
        this.gcInterval = setInterval(() => {
            this.performGarbageCollection();
        }, 5 * 60 * 1000);

        ServerLogger.info('🔍 메모리 모니터링 시작', null, 'MEMORY-MONITOR');
    }

    /**
     * 메모리 모니터링 중지
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;

        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        if (this.gcInterval) {
            clearInterval(this.gcInterval);
            this.gcInterval = null;
        }

        ServerLogger.info('🛑 메모리 모니터링 중지', null, 'MEMORY-MONITOR');
    }

    /**
     * 현재 메모리 사용량 확인
     */
    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const rssInMB = Math.round(usage.rss / 1024 / 1024);
        const heapUsedInMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalInMB = Math.round(usage.heapTotal / 1024 / 1024);
        const externalInMB = Math.round(usage.external / 1024 / 1024);

        const memoryInfo = {
            timestamp: new Date(),
            rss: rssInMB,
            heapUsed: heapUsedInMB,
            heapTotal: heapTotalInMB,
            external: externalInMB
        };

        // 메모리 히스토리 저장
        this.memoryHistory.push(memoryInfo);
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory.shift();
        }

        // 임계값 검사
        if (rssInMB > this.thresholds.critical) {
            ServerLogger.error(`🚨 메모리 사용량 위험 수준: ${rssInMB}MB (임계값: ${this.thresholds.critical}MB)`, null, 'MEMORY-MONITOR');
            this.performEmergencyCleanup();
        } else if (rssInMB > this.thresholds.warning) {
            ServerLogger.warn(`⚠️ 메모리 사용량 경고: ${rssInMB}MB (임계값: ${this.thresholds.warning}MB)`, null, 'MEMORY-MONITOR');
        }

        // 강제 GC 임계값 검사
        if (rssInMB > this.thresholds.forceGC) {
            this.performGarbageCollection(true);
        }

        return memoryInfo;
    }

    /**
     * 가비지 컬렉션 실행
     */
    performGarbageCollection(forced = false) {
        if (!global.gc) {
            if (forced) {
                ServerLogger.warn('⚠️ 가비지 컬렉션을 사용할 수 없습니다. Node.js를 --expose-gc 플래그로 시작하세요.', null, 'MEMORY-MONITOR');
            }
            return false;
        }

        const beforeMemory = process.memoryUsage();
        global.gc();
        const afterMemory = process.memoryUsage();

        const beforeMB = Math.round(beforeMemory.heapUsed / 1024 / 1024);
        const afterMB = Math.round(afterMemory.heapUsed / 1024 / 1024);
        const freedMB = beforeMB - afterMB;

        const logLevel = forced ? 'warn' : 'info';
        const prefix = forced ? '🚨 강제' : '🧹 정기';

        ServerLogger[logLevel](
            `${prefix} 가비지 컬렉션 완료: ${beforeMB}MB → ${afterMB}MB (${freedMB > 0 ? '-' : '+'}${Math.abs(freedMB)}MB)`,
            null,
            'MEMORY-MONITOR'
        );

        return true;
    }

    /**
     * 응급 메모리 정리
     */
    performEmergencyCleanup() {
        ServerLogger.warn('🚨 응급 메모리 정리 시작', null, 'MEMORY-MONITOR');

        try {
            // 1. UsageTracker 인스턴스 정리
            const UsageTracker = require('./usage-tracker');
            if (UsageTracker.instances && UsageTracker.instances.size > 10) {
                const oldInstances = Array.from(UsageTracker.instances.keys()).slice(0, -5);
                oldInstances.forEach(key => {
                    const instance = UsageTracker.instances.get(key);
                    if (instance && typeof instance.destroy === 'function') {
                        instance.destroy();
                    }
                });
                ServerLogger.info(`🧹 ${oldInstances.length}개 UsageTracker 인스턴스 정리`, null, 'MEMORY-MONITOR');
            }

            // 2. ChannelAnalysisQueue 작업 정리
            const ChannelAnalysisQueueManager = require('../services/ChannelAnalysisQueue');
            const queueInstance = ChannelAnalysisQueueManager.getInstance();
            if (queueInstance && typeof queueInstance.cleanupCompletedJobs === 'function') {
                const cleaned = queueInstance.cleanupCompletedJobs(0.5); // 30분 이상 된 작업 정리
                if (cleaned > 0) {
                    ServerLogger.info(`🧹 ${cleaned}개 완료된 큐 작업 정리`, null, 'MEMORY-MONITOR');
                }
            }

            // 3. 가비지 컬렉션 강제 실행
            this.performGarbageCollection(true);

        } catch (error) {
            ServerLogger.error('❌ 응급 메모리 정리 중 오류', error.message, 'MEMORY-MONITOR');
        }
    }

    /**
     * 메모리 사용량 통계
     */
    getMemoryStats() {
        if (this.memoryHistory.length === 0) {
            return null;
        }

        const recent = this.memoryHistory.slice(-10);
        const avgRss = Math.round(recent.reduce((sum, item) => sum + item.rss, 0) / recent.length);
        const maxRss = Math.max(...recent.map(item => item.rss));
        const minRss = Math.min(...recent.map(item => item.rss));

        return {
            current: this.memoryHistory[this.memoryHistory.length - 1],
            average: { rss: avgRss },
            max: { rss: maxRss },
            min: { rss: minRss },
            samples: recent.length,
            isMonitoring: this.isMonitoring
        };
    }

    /**
     * 메모리 사용량 리포트
     */
    generateMemoryReport() {
        const stats = this.getMemoryStats();
        const current = process.memoryUsage();

        return {
            timestamp: new Date().toISOString(),
            current: {
                rss: Math.round(current.rss / 1024 / 1024),
                heapUsed: Math.round(current.heapUsed / 1024 / 1024),
                heapTotal: Math.round(current.heapTotal / 1024 / 1024),
                external: Math.round(current.external / 1024 / 1024)
            },
            thresholds: this.thresholds,
            history: stats,
            gcAvailable: !!global.gc
        };
    }

    /**
     * 인스턴스 정리
     */
    destroy() {
        this.stopMonitoring();
        this.memoryHistory = [];
        MemoryMonitor.instance = null;
        ServerLogger.info('🧹 MemoryMonitor 정리 완료', null, 'MEMORY-MONITOR');
    }

    /**
     * 싱글톤 인스턴스 가져오기
     */
    static getInstance() {
        if (!MemoryMonitor.instance) {
            MemoryMonitor.instance = new MemoryMonitor();
        }
        return MemoryMonitor.instance;
    }
}

module.exports = MemoryMonitor;