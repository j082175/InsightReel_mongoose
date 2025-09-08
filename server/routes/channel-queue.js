const express = require('express');
const { ServerLogger } = require('../utils/logger');

const router = express.Router();

// 테스트 라우트 (라우트 등록 확인용)
router.get('/test', (req, res) => {
  ServerLogger.info('🧪 테스트 라우트 호출됨');
  res.json({
    success: true,
    message: '채널 큐 라우트가 정상적으로 등록되었습니다.',
    timestamp: new Date().toISOString()
  });
});

// 큐 매니저를 동적으로 로드하여 의존성 오류 방지
function getQueueManager() {
  try {
    const ChannelAnalysisQueueManager = require('../services/ChannelAnalysisQueue');
    return ChannelAnalysisQueueManager.getInstance();
  } catch (error) {
    throw new Error(`큐 매니저 초기화 실패: ${error.message}`);
  }
}

/**
 * 채널 분석 작업 추가
 * POST /api/channel-queue/add
 */
router.post('/add', async (req, res) => {
  try {
    const { channelIdentifier, keywords = [], options = {} } = req.body;

    if (!channelIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'channelIdentifier is required'
      });
    }

    const queue = getQueueManager();
    const jobId = await queue.addJob(channelIdentifier, keywords, options);

    ServerLogger.info(`📋 채널 분석 작업 추가 요청: ${channelIdentifier}`);

    res.json({
      success: true,
      jobId,
      message: '채널 분석 작업이 큐에 추가되었습니다'
    });

  } catch (error) {
    ServerLogger.error('❌ 채널 분석 작업 추가 실패', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 작업 상태 조회
 * GET /api/channel-queue/job/:jobId
 */
router.get('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const queue = getQueueManager();
    const jobStatus = queue.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      job: jobStatus
    });

  } catch (error) {
    ServerLogger.error('❌ 작업 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 큐 상태 조회
 * GET /api/channel-queue/status
 */
router.get('/status', (req, res) => {
  ServerLogger.info('🔍 채널 큐 상태 조회 요청 시작');
  
  try {
    ServerLogger.info('🔍 큐 매니저 가져오는 중...');
    const queue = getQueueManager();
    ServerLogger.info('✅ 큐 매니저 가져옴');
    
    const queueStatus = queue.getQueueStatus();
    ServerLogger.info('✅ 큐 상태 조회 성공:', queueStatus);

    res.json({
      success: true,
      queue: queueStatus
    });

  } catch (error) {
    ServerLogger.error('❌ 큐 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * 모든 작업 목록 조회
 * GET /api/channel-queue/jobs
 */
router.get('/jobs', (req, res) => {
  try {
    const queue = getQueueManager();
    const jobs = queue.getAllJobs();

    res.json({
      success: true,
      jobs: jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // 최신순 정렬
    });

  } catch (error) {
    ServerLogger.error('❌ 작업 목록 조회 실패', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 작업 취소
 * DELETE /api/channel-queue/job/:jobId
 */
router.delete('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const queue = getQueueManager();
    const cancelled = queue.cancelJob(jobId);

    if (cancelled) {
      res.json({
        success: true,
        message: '작업이 취소되었습니다'
      });
    } else {
      res.status(400).json({
        success: false,
        error: '작업을 취소할 수 없습니다. (이미 처리 중이거나 완료됨)'
      });
    }

  } catch (error) {
    ServerLogger.error('❌ 작업 취소 실패', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 큐 초기화
 * DELETE /api/channel-queue/clear
 */
router.delete('/clear', (req, res) => {
  try {
    const queue = getQueueManager();
    const cancelledJobs = queue.clearQueue();

    res.json({
      success: true,
      message: `큐가 초기화되었습니다. ${cancelledJobs}개 작업이 취소되었습니다.`
    });

  } catch (error) {
    ServerLogger.error('❌ 큐 초기화 실패', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 완료된 작업 정리
 * POST /api/channel-queue/cleanup
 */
router.post('/cleanup', (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body;
    const queue = getQueueManager();
    const cleaned = queue.cleanupCompletedJobs(olderThanHours);

    res.json({
      success: true,
      message: `${cleaned}개의 완료된 작업을 정리했습니다.`
    });

  } catch (error) {
    ServerLogger.error('❌ 작업 정리 실패', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 채널 중복 검사
 * POST /api/channel-queue/check-duplicate
 */
router.post('/check-duplicate', async (req, res) => {
  try {
    const { channelIdentifier } = req.body;

    if (!channelIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'channelIdentifier is required'
      });
    }

    ServerLogger.info(`🔍 채널 중복 검사 요청: ${channelIdentifier}`);

    // Channel 모델을 동적으로 로드
    const Channel = require('../models/Channel');
    const YouTubeChannelService = require('../services/YouTubeChannelService');
    
    let duplicateInfo = null;
    
    try {
      // 1. 먼저 채널 식별자가 YouTube 채널 ID인지 확인해보기
      let channelId = channelIdentifier;
      
      // @username이나 custom URL인 경우 실제 채널 ID로 변환 필요
      if (channelIdentifier.startsWith('@') || channelIdentifier.includes('/channel/') || 
          channelIdentifier.includes('/c/') || channelIdentifier.includes('/user/')) {
        const youtubeService = new YouTubeChannelService();
        const channelInfo = await youtubeService.getChannelInfo(channelIdentifier);
        if (channelInfo && channelInfo.id) {
          channelId = channelInfo.id;
        }
      }
      
      // 2. MongoDB에서 채널 ID로 중복 검사
      const existingChannel = await Channel.findOne({ id: channelId }).lean();
      
      if (existingChannel) {
        duplicateInfo = {
          isDuplicate: true,
          existingChannel: {
            id: existingChannel.id,
            name: existingChannel.name,
            url: existingChannel.url,
            subscribers: existingChannel.subscribers,
            platform: existingChannel.platform,
            collectedAt: existingChannel.collectedAt,
            lastAnalyzedAt: existingChannel.lastAnalyzedAt
          },
          message: `채널 "${existingChannel.name}"은 이미 분석되었습니다.`
        };
        
        ServerLogger.warn(`⚠️ 중복 채널 발견: ${existingChannel.name} (${existingChannel.id})`);
      } else {
        duplicateInfo = {
          isDuplicate: false,
          message: '새로운 채널입니다.'
        };
        
        ServerLogger.info(`✅ 새로운 채널: ${channelIdentifier}`);
      }
      
    } catch (searchError) {
      ServerLogger.warn(`⚠️ 채널 정보 조회 실패: ${searchError.message}`);
      
      // 검색 실패 시에도 처리 계속 진행 (graceful degradation)
      duplicateInfo = {
        isDuplicate: false,
        message: '중복 검사를 완전히 수행할 수 없었지만 처리를 계속합니다.',
        warning: searchError.message
      };
    }

    res.json({
      success: true,
      channelIdentifier,
      duplicate: duplicateInfo
    });

  } catch (error) {
    ServerLogger.error('❌ 채널 중복 검사 실패', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;