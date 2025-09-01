const { ServerLogger } = require('./logger');

/**
 * 성능 측정 유틸리티 클래스
 * 영상 분석 과정의 단계별 시간을 측정하고 로깅합니다.
 */
class PerformanceLogger {
  constructor() {
    this.timers = new Map();
    this.stages = new Map();
  }

  /**
   * 타이머 시작
   * @param {string} name - 타이머 이름
   */
  start(name) {
    this.timers.set(name, Date.now());
  }

  /**
   * 타이머 종료 및 소요시간 반환
   * @param {string} name - 타이머 이름
   * @returns {number} 소요시간 (밀리초)
   */
  end(name) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      ServerLogger.warn(`⚠️ 타이머 '${name}'이 시작되지 않았습니다.`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    return duration;
  }

  /**
   * 타이머 종료 및 로그 출력
   * @param {string} name - 타이머 이름
   * @param {string} message - 로그 메시지 (옵션)
   */
  endAndLog(name, message = null) {
    const duration = this.end(name);
    const logMessage = message || `${name} 완료`;
    ServerLogger.info(`⏱️ ${logMessage}: ${duration}ms (${(duration / 1000).toFixed(2)}초)`);
    return duration;
  }

  /**
   * 전체 프로세스 성능 측정 시작
   * @param {string} processType - 프로세스 타입 (url, blob 등)
   * @param {string} platform - 플랫폼 (instagram, tiktok 등)
   */
  startTotalProcess(processType, platform) {
    const processName = `${processType}_${platform}_${Date.now()}`;
    this.start('total_process');
    this.start('download');
    
    ServerLogger.info(`🚀 전체 영상 처리 시작 - ${processType.toUpperCase()}, 플랫폼: ${platform}`);
    
    return {
      processName,
      recordStage: (stageName) => this.recordStage(stageName),
      endStage: (stageName) => this.endStage(stageName),
      finish: () => this.finishTotalProcess(processType, platform)
    };
  }

  /**
   * 단계 시작
   * @param {string} stageName - 단계 이름
   */
  recordStage(stageName) {
    this.stages.set(stageName, Date.now());
    ServerLogger.info(`📍 ${stageName} 단계 시작`);
  }

  /**
   * 단계 종료
   * @param {string} stageName - 단계 이름
   */
  endStage(stageName) {
    const startTime = this.stages.get(stageName);
    if (!startTime) {
      ServerLogger.warn(`⚠️ 단계 '${stageName}'이 시작되지 않았습니다.`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.stages.delete(stageName);
    ServerLogger.info(`✅ ${stageName} 완료: ${duration}ms (${(duration / 1000).toFixed(2)}초)`);
    return duration;
  }

  /**
   * 전체 프로세스 완료
   * @param {string} processType - 프로세스 타입
   * @param {string} platform - 플랫폼
   */
  finishTotalProcess(processType, platform) {
    const totalDuration = this.end('total_process');
    
    ServerLogger.info(`🏁 전체 영상 처리 완료 - ${processType.toUpperCase()}, 플랫폼: ${platform}`);
    ServerLogger.info(`⏱️ 총 소요시간: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}초)`);
    
    // 성능 통계 로깅
    this.logPerformanceStats(totalDuration, processType, platform);
    
    return totalDuration;
  }

  /**
   * 성능 통계 로깅
   * @param {number} totalDuration - 총 소요시간
   * @param {string} processType - 프로세스 타입
   * @param {string} platform - 플랫폼
   */
  logPerformanceStats(totalDuration, processType, platform) {
    const secondsTotal = (totalDuration / 1000).toFixed(2);
    
    // 성능 분류
    let performanceCategory = '⚡ 빠름';
    if (totalDuration > 60000) { // 60초 이상
      performanceCategory = '🐌 느림';
    } else if (totalDuration > 30000) { // 30초 이상
      performanceCategory = '⏳ 보통';
    }
    
    ServerLogger.info(`📊 성능 분석: ${performanceCategory} (${secondsTotal}초)`);
    
    // 권장사항 로깅
    if (totalDuration > 60000) {
      ServerLogger.info(`💡 성능 개선 권장: 프레임 수 조정 또는 AI 모델 최적화 고려`);
    }
  }

  /**
   * 현재 진행중인 모든 타이머 상태 조회
   * @returns {Object} 타이머 상태 정보
   */
  getStatus() {
    const runningTimers = [];
    const currentTime = Date.now();
    
    for (const [name, startTime] of this.timers) {
      runningTimers.push({
        name,
        elapsed: currentTime - startTime,
        startTime: new Date(startTime).toISOString()
      });
    }
    
    return {
      runningTimers: runningTimers.length,
      timers: runningTimers
    };
  }

  /**
   * 메모리 정리
   */
  cleanup() {
    this.timers.clear();
    this.stages.clear();
  }
}

// 싱글톤 인스턴스 생성
const performanceLogger = new PerformanceLogger();

module.exports = performanceLogger;