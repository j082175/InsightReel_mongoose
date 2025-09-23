const EventEmitter = require('events');
const { ServerLogger } = require('../utils/logger');
const ChannelAnalysisService = require('../features/cluster/ChannelAnalysisService');
const DuplicateCheckManager = require('../models/DuplicateCheckManager');

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
        this.ChannelAnalysisService = null;

        this.initializeChannelAnalysisService();

        ServerLogger.success('📋 채널 분석 큐 시스템 초기화 완료');
    }

    async initializeChannelAnalysisService() {
        this.ChannelAnalysisService = ChannelAnalysisService.getInstance();
        // ChannelAnalysisService 초기화 대기
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    /**
     * 새 채널 분석 작업 추가
     */
    async addJob(channelIdentifier, keywords = [], options = {}) {
        // 🚨 중복검사 - 큐에 추가하기 전에 사전 검사
        const decodedChannelIdentifier = decodeURIComponent(channelIdentifier);
        ServerLogger.info(`🔍 채널 중복 검사 시작: ${decodedChannelIdentifier}`);

        try {
            let youtubeData = null;

            // 1. 영상 URL인지 채널 식별자인지 판별
            if (decodedChannelIdentifier.includes('/watch') || decodedChannelIdentifier.includes('/shorts/')) {
                // 영상 URL에서 채널 정보 추출
                ServerLogger.info(`🎥 영상 URL에서 채널 정보 추출: ${decodedChannelIdentifier}`);
                const VideoProcessor = require('./VideoProcessor');
                const videoProcessor = new VideoProcessor();

                try {
                    const videoInfo = await videoProcessor.getYouTubeVideoInfo(decodedChannelIdentifier);
                    if (videoInfo && videoInfo.channelId && videoInfo.channelName) {
                        youtubeData = {
                            id: videoInfo.channelId,
                            channelName: videoInfo.channelName,
                            url: videoInfo.channelUrl || `https://www.youtube.com/channel/${videoInfo.channelId}`
                        };
                        ServerLogger.info(`✅ 영상에서 채널 정보 추출 성공: ${youtubeData.channelName} (${youtubeData.id})`);
                    }
                } catch (videoError) {
                    ServerLogger.warn(`⚠️ 영상에서 채널 정보 추출 실패: ${videoError.message}`);
                }
            } else {
                // 채널 식별자로 직접 검색
                const YouTubeChannelService = require('./YouTubeChannelService');
                const youtubeService = new YouTubeChannelService();
                youtubeData = await youtubeService.getChannelInfo(decodedChannelIdentifier);
            }

            if (!youtubeData) {
                throw new Error(`YouTube에서 채널을 찾을 수 없음: ${decodedChannelIdentifier}`);
            }

            // 2. 메인 Channel 컬렉션에서 중복 검사
            const Channel = require('../models/ChannelModel');
            const existing = await Channel.findOne({
                channelId: youtubeData.id,
            });

            if (existing) {
                ServerLogger.warn(
                    `⚠️ 중복 분석 차단: 채널 ${youtubeData.channelName}은 이미 분석되었습니다.`,
                );
                throw new Error(
                    `채널 ${youtubeData.channelName}은 이미 분석되었습니다.`,
                );
            }

            ServerLogger.info('🆕 새 채널 확인 - 큐에 추가 진행', {
                channelId: youtubeData.id,
                name: youtubeData.channelName,
            });
        } catch (error) {
            ServerLogger.error('❌ 중복 검사 실패:', error);
            throw error; // 중복이거나 오류가 있으면 큐에 추가하지 않음
        }

        const jobId = `job_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;

        const job = {
            id: jobId,
            channelIdentifier,
            keywords,
            options: {
                includeAnalysis: options.includeAnalysis !== false,
                priority: options.priority || 'normal',
                ...options,
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
                message: '큐에서 대기 중...',
            },
        };

        // 우선순위에 따라 큐에 삽입
        if (job.options.priority === 'high') {
            this.queue.unshift(job);
        } else {
            this.queue.push(job);
        }

        this.jobs.set(jobId, job);

        // UTF-8 안전한 로그 출력
        const safeChannelName = Buffer.from(channelIdentifier, 'utf8').toString(
            'utf8',
        );
        ServerLogger.info(
            `📋 채널 분석 작업 추가: ${safeChannelName} (${jobId})`,
        );

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
        ServerLogger.info(
            `🚀 채널 분석 큐 처리 시작: ${this.queue.length}개 작업`,
        );

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

        // UTF-8 안전한 채널명 출력
        const safeChannelName = Buffer.from(
            job.channelIdentifier,
            'utf8',
        ).toString('utf8');
        ServerLogger.info(`⚙️ 채널 분석 시작: ${safeChannelName} (${job.id})`);
        this.emit('jobStarted', job);

        // 중복검사 DB에 processing 상태로 등록 (대소문자 통일)
        const decodedChannelIdentifier = decodeURIComponent(job.channelIdentifier);
        const normalizedChannelId = (decodedChannelIdentifier.startsWith('@')
            ? decodedChannelIdentifier
            : `@${decodedChannelIdentifier}`).toLowerCase(); // 소문자로 통일

        // job에 normalizedChannelId 저장 (나중에 ChannelAnalysisService에서 사용)
        job.normalizedChannelId = normalizedChannelId;

        try {
            await DuplicateCheckManager.registerChannel(
                normalizedChannelId,
                decodedChannelIdentifier,
                'YOUTUBE',
                { name: decodedChannelIdentifier, temp: true }
            );

            ServerLogger.info(`📝 중복검사 DB 등록 (processing): ${normalizedChannelId}`);
        } catch (duplicateError) {
            ServerLogger.warn(`⚠️ 중복검사 DB 등록 실패 (무시): ${duplicateError.message}`);
        }

        try {
            // 1단계: 채널 정보 수집
            this.updateJobProgress(job, {
                step: 'fetching_channel_info',
                current: 10,
                message: '채널 정보 수집 중...',
            });

            // 2단계: 기본 분석
            this.updateJobProgress(job, {
                step: 'basic_analysis',
                current: 30,
                message: '기본 채널 분석 중...',
            });

            // 3단계: 상세 분석 (필요한 경우)
            if (job.options.includeAnalysis) {
                this.updateJobProgress(job, {
                    step: 'detailed_analysis',
                    current: 60,
                    message: '상세 분석 중...',
                });
            }

            // 실제 분석 수행
            ServerLogger.info(
                `🔍 Queue DEBUG: 분석 요청 전송 - includeAnalysis = ${job.options.includeAnalysis}, skipAIAnalysis = ${job.options.skipAIAnalysis}`,
            );
            ServerLogger.info(`🏷️ Queue DEBUG: 전달할 키워드:`, {
                type: typeof job.keywords,
                isArray: Array.isArray(job.keywords),
                content: job.keywords,
                length: job.keywords?.length
            });
            const result =
                await this.ChannelAnalysisService.createOrUpdateWithAnalysis(
                    job.channelIdentifier, // 원본 대소문자 유지
                    job.keywords,
                    job.options.includeAnalysis,
                    job.options.skipAIAnalysis,
                    job.normalizedChannelId, // 중복 방지를 위한 정규화된 채널 ID (소문자)
                );

            // 완료 처리
            this.updateJobProgress(job, {
                step: 'completed',
                current: 100,
                message: '분석 완료!',
            });

            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date();

            const safeChannelName2 = Buffer.from(
                job.channelIdentifier,
                'utf8',
            ).toString('utf8');
            ServerLogger.success(
                `✅ 채널 분석 완료: ${safeChannelName2} (${job.id})`,
            );
            this.emit('jobCompleted', job);
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();

            this.updateJobProgress(job, {
                step: 'error',
                current: 0,
                message: `오류: ${error.message}`,
            });

            // 🗑️ 분석 실패 시 중복검사 DB에서 해당 채널 삭제 (job에 저장된 정규화 ID 사용)
            try {
                const normalizedChannelId = job.normalizedChannelId; // 이미 소문자로 통일됨
                if (normalizedChannelId) {
                    await DuplicateCheckManager.removeChannel(normalizedChannelId);
                    ServerLogger.info(`🗑️ 분석 실패로 중복검사 DB에서 삭제: ${normalizedChannelId}`);
                }
            } catch (cleanupError) {
                ServerLogger.warn(`⚠️ 중복검사 DB 정리 실패 (무시): ${cleanupError.message}`);
            }

            throw error;
        }
    }

    /**
     * 작업 진행상황 업데이트
     */
    updateJobProgress(job, progress) {
        job.progress = {
            ...job.progress,
            ...progress,
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
            result: job.result
                ? {
                      id: job.result.id,
                      name: job.result.name,
                      subscribers: job.result.subscribers,
                      aiTags: job.result.aiTags,
                  }
                : null,
        };
    }

    /**
     * 큐 상태 조회
     */
    getQueueStatus() {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.queue.length,
            currentJob: this.currentJob
                ? {
                      id: this.currentJob.id,
                      channelIdentifier: this.currentJob.channelIdentifier,
                      progress: this.currentJob.progress,
                  }
                : null,
            totalJobs: this.jobs.size,
        };
    }

    /**
     * 모든 작업 목록 조회
     */
    getAllJobs() {
        return Array.from(this.jobs.values()).map((job) => ({
            id: job.id,
            channelIdentifier: job.channelIdentifier,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
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
            const index = this.queue.findIndex((j) => j.id === jobId);
            if (index !== -1) {
                this.queue.splice(index, 1);
            }

            job.status = 'cancelled';
            job.completedAt = new Date();

            ServerLogger.info(
                `❌ 작업 취소됨: ${job.channelIdentifier} (${jobId})`,
            );
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
        this.queue.forEach((job) => {
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
        const cutoffTime = new Date(
            Date.now() - olderThanHours * 60 * 60 * 1000,
        );
        let cleaned = 0;

        for (const [jobId, job] of this.jobs.entries()) {
            if (
                (job.status === 'completed' ||
                    job.status === 'failed' ||
                    job.status === 'cancelled') &&
                job.completedAt &&
                job.completedAt < cutoffTime
            ) {
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
