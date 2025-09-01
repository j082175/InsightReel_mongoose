const { ServerLogger } = require('./logger');

/**
 * 비디오 처리 큐 시스템
 * 순차적으로 하나씩 비디오를 처리하여 AI 재분석 완료를 보장
 */
class VideoQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.currentProcessingId = null;
    this.stats = {
      totalProcessed: 0,
      totalQueued: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * 큐에 비디오 처리 작업 추가
   * @param {Object} task - 처리할 작업 객체
   * @param {string} task.id - 고유 식별자
   * @param {string} task.type - 작업 타입 ('url' 또는 'blob')
   * @param {Object} task.data - 처리 데이터
   * @param {Function} task.processor - 실제 처리 함수
   * @param {Function} task.onComplete - 완료 콜백
   * @param {Function} task.onError - 에러 콜백
   * @returns {Promise} 처리 완료 프로미스
   */
  async addToQueue(task) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: task.type || 'unknown',
        data: task.data,
        processor: task.processor,
        addedAt: new Date().toISOString(),
        resolve,
        reject,
        onComplete: task.onComplete,
        onError: task.onError
      };

      this.queue.push(queueItem);
      this.stats.totalQueued++;

      ServerLogger.info(`📋 큐에 작업 추가: ${queueItem.id} (${queueItem.type})`, {
        queueLength: this.queue.length,
        isProcessing: this.isProcessing,
        currentTask: this.currentProcessingId
      });

      // 처리 중이 아니면 즉시 시작
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * 큐 처리 메인 루프
   */
  async processQueue() {
    if (this.isProcessing) {
      ServerLogger.info('⚠️ 이미 큐 처리 중, 중복 실행 방지');
      return;
    }

    this.isProcessing = true;
    ServerLogger.info('🚀 큐 처리 시작');

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.currentProcessingId = task.id;
      
      const startTime = Date.now();
      ServerLogger.info(`🔄 작업 처리 시작: ${task.id} (${task.type})`, {
        remainingInQueue: this.queue.length
      });

      try {
        // 실제 비디오 처리 실행
        const result = await task.processor(task.data);
        const processingTime = Date.now() - startTime;
        
        this.updateStats(processingTime);
        this.stats.totalProcessed++;

        ServerLogger.info(`✅ 작업 완료: ${task.id}`, {
          processingTime: `${processingTime}ms`,
          totalProcessed: this.stats.totalProcessed,
          remainingInQueue: this.queue.length
        });

        // 완료 콜백 실행
        if (task.onComplete) {
          task.onComplete(result);
        }

        // Promise resolve
        task.resolve(result);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        
        ServerLogger.error(`❌ 작업 실패: ${task.id}`, {
          error: error.message,
          processingTime: `${processingTime}ms`,
          remainingInQueue: this.queue.length
        });

        // 에러 콜백 실행
        if (task.onError) {
          task.onError(error);
        }

        // Promise reject
        task.reject(error);
      }

      this.currentProcessingId = null;
    }

    this.isProcessing = false;
    ServerLogger.info('🏁 큐 처리 완료 - 모든 작업 처리됨');
  }

  /**
   * 통계 업데이트
   * @param {number} processingTime - 처리 시간 (ms)
   */
  updateStats(processingTime) {
    if (this.stats.totalProcessed === 0) {
      this.stats.averageProcessingTime = processingTime;
    } else {
      // 이동 평균 계산
      const alpha = 0.1; // 가중치
      this.stats.averageProcessingTime = 
        (1 - alpha) * this.stats.averageProcessingTime + alpha * processingTime;
    }
  }

  /**
   * 현재 큐 상태 조회
   * @returns {Object} 큐 상태 정보
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentProcessingId: this.currentProcessingId,
      queueLength: this.queue.length,
      stats: {
        ...this.stats,
        averageProcessingTime: Math.round(this.stats.averageProcessingTime)
      },
      estimatedWaitTime: this.queue.length * this.stats.averageProcessingTime
    };
  }

  /**
   * 특정 작업이 큐에 있는지 확인
   * @param {string} taskId - 작업 ID
   * @returns {boolean} 큐에 있으면 true
   */
  isInQueue(taskId) {
    return this.queue.some(task => task.id === taskId) || 
           this.currentProcessingId === taskId;
  }

  /**
   * 큐 비우기 (긴급상황용)
   */
  clearQueue() {
    const clearedCount = this.queue.length;
    
    // 대기 중인 작업들 모두 취소
    this.queue.forEach(task => {
      task.reject(new Error('Queue cleared'));
    });
    
    this.queue = [];
    
    ServerLogger.info(`🧹 큐 비우기 완료: ${clearedCount}개 작업 취소`);
    return clearedCount;
  }

  /**
   * 큐 상태 로깅
   */
  logStatus() {
    const status = this.getStatus();
    ServerLogger.info('📊 큐 상태:', status);
  }
}

// 싱글톤 인스턴스 생성
const videoQueue = new VideoQueue();

module.exports = videoQueue;