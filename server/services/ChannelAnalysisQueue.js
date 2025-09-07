const EventEmitter = require('events');
const { ServerLogger } = require('../utils/logger');
const ChannelModel = require('../features/cluster/ChannelModel');

/**
 * 채널 분석 큐 시스템
 * 여러 채널을 순차적으로 처리하고 상태를 추적합니다
 */
class ChannelAnalysisQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.currentJob = null;
    this.isProcessing = false;
    this.jobs = new Map(); // jobId -> job 정보
    this.channelModel = null;
    
    this.initializeChannelModel();
    
    ServerLogger.success('📋 채널 분석 큐 시스템 초기화 완료');
  }

  async initializeChannelModel() {
    this.channelModel = ChannelModel.getInstance();
    // ChannelModel 초기화 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * 새 채널 분석 작업 추가
   */
  async addJob(channelIdentifier, keywords = [], options = {}) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      channelIdentifier,
      keywords,
      options: {
        includeAnalysis: options.includeAnalysis !== false,
        priority: options.priority || 'normal',
        ...options
      },
      status: 'queued',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      progress: {
        step: 'queued',
        current: 0,
        total: 100,
        message: '큐에서 대기 중...'
      }
    };

    // 우선순위에 따라 큐에 삽입
    if (job.options.priority === 'high') {
      this.queue.unshift(job);
    } else {
      this.queue.push(job);
    }

    this.jobs.set(jobId, job);

    ServerLogger.info(`📋 채널 분석 작업 추가: ${channelIdentifier} (${jobId})`);
    
    // 작업 추가 이벤트 발생
    this.emit('jobAdded', job);
    
    // 처리 시작 (아직 처리 중이 아니라면)
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * 큐 처리 시작
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    ServerLogger.info(`🚀 채널 분석 큐 처리 시작: ${this.queue.length}개 작업`);

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      this.currentJob = job;

      try {
        await this.processJob(job);
      } catch (error) {
        ServerLogger.error(`❌ 작업 처리 실패: ${job.id}`, error);
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        this.emit('jobFailed', job, error);
      }
    }

    this.currentJob = null;
    this.isProcessing = false;
    
    ServerLogger.success('✅ 채널 분석 큐 처리 완료');
    this.emit('queueCompleted');
  }

  /**
   * 개별 작업 처리
   */
  async processJob(job) {
    job.status = 'processing';
    job.startedAt = new Date();
    
    ServerLogger.info(`⚙️ 채널 분석 시작: ${job.channelIdentifier} (${job.id})`);
    this.emit('jobStarted', job);

    try {
      // 1단계: 채널 정보 수집
      this.updateJobProgress(job, {
        step: 'fetching_channel_info',
        current: 10,
        message: '채널 정보 수집 중...'
      });

      // 2단계: 기본 분석
      this.updateJobProgress(job, {
        step: 'basic_analysis',
        current: 30,
        message: '기본 채널 분석 중...'
      });

      // 3단계: 상세 분석 (필요한 경우)
      if (job.options.includeAnalysis) {
        this.updateJobProgress(job, {
          step: 'detailed_analysis',
          current: 60,
          message: '상세 분석 중...'
        });
      }

      // 실제 분석 수행
      const result = await this.channelModel.createOrUpdateWithAnalysis(
        job.channelIdentifier,
        job.keywords,
        job.options.includeAnalysis
      );

      // 완료 처리
      this.updateJobProgress(job, {
        step: 'completed',
        current: 100,
        message: '분석 완료!'
      });

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();

      ServerLogger.success(`✅ 채널 분석 완료: ${job.channelIdentifier} (${job.id})`);
      this.emit('jobCompleted', job);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      
      this.updateJobProgress(job, {
        step: 'error',
        current: 0,
        message: `오류: ${error.message}`
      });

      throw error;
    }
  }

  /**
   * 작업 진행상황 업데이트
   */
  updateJobProgress(job, progress) {
    job.progress = {
      ...job.progress,
      ...progress
    };
    
    this.emit('jobProgress', job);
  }

  /**
   * 작업 상태 조회
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      channelIdentifier: job.channelIdentifier,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      result: job.result ? {
        id: job.result.id,
        name: job.result.name,
        subscribers: job.result.subscribers,
        aiTags: job.result.aiTags
      } : null
    };
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        channelIdentifier: this.currentJob.channelIdentifier,
        progress: this.currentJob.progress
      } : null,
      totalJobs: this.jobs.size
    };
  }

  /**
   * 모든 작업 목록 조회
   */
  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      channelIdentifier: job.channelIdentifier,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    }));
  }

  /**
   * 작업 취소
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'queued') {
      // 큐에서 제거
      const index = this.queue.findIndex(j => j.id === jobId);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
      
      job.status = 'cancelled';
      job.completedAt = new Date();
      
      ServerLogger.info(`❌ 작업 취소됨: ${job.channelIdentifier} (${jobId})`);
      this.emit('jobCancelled', job);
      
      return true;
    }

    return false; // 처리 중이거나 완료된 작업은 취소할 수 없음
  }

  /**
   * 큐 초기화
   */
  clearQueue() {
    const cancelledJobs = this.queue.length;
    
    // 대기 중인 작업들을 취소로 처리
    this.queue.forEach(job => {
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.emit('jobCancelled', job);
    });
    
    this.queue = [];
    
    ServerLogger.info(`🗑️ 큐 초기화: ${cancelledJobs}개 작업 취소됨`);
    
    return cancelledJobs;
  }

  /**
   * 작업 기록 정리 (완료된 작업 삭제)
   */
  cleanupCompletedJobs(olderThanHours = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') 
          && job.completedAt && job.completedAt < cutoffTime) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      ServerLogger.info(`🧹 완료된 작업 정리: ${cleaned}개 작업 제거됨`);
    }

    return cleaned;
  }
}

// 싱글톤 인스턴스
let queueInstance = null;

class ChannelAnalysisQueueManager {
  static getInstance() {
    if (!queueInstance) {
      queueInstance = new ChannelAnalysisQueue();
    }
    return queueInstance;
  }
}

module.exports = ChannelAnalysisQueueManager;