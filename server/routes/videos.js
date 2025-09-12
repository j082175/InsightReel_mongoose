const express = require('express');
const router = express.Router();
const Video = require('../models/VideoModel');
const TrendingVideo = require('../models/TrendingVideo');
const { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES, PLATFORMS } = require('../config/api-messages');
const { ServerLogger } = require('../utils/logger');
const VideoProcessor = require('../services/VideoProcessor');
const AIAnalyzer = require('../services/AIAnalyzer');
const SheetsManager = require('../services/SheetsManager');
const UnifiedVideoSaver = require('../services/UnifiedVideoSaver');

/**
 * 🎯 개별 영상 관리 API
 * URL로 영상 추가, 삭제 등 개별 영상 관리 기능
 */

// POST /api/videos/add-url - URL로 영상 직접 추가
router.post('/add-url', async (req, res) => {
  try {
    const { url, platform, metadata = {}, saveToTrending = false, groupId = null } = req.body;
    
    // URL 검증
    if (!url || !url.trim()) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_VIDEO_URL,
        message: 'URL은 필수입니다.'
      });
    }
    
    // 플랫폼 자동 감지
    const detectedPlatform = platform || (
      url.includes('youtube.com') || url.includes('youtu.be') ? PLATFORMS.YOUTUBE :
      url.includes('instagram.com') ? PLATFORMS.INSTAGRAM :
      url.includes('tiktok.com') ? PLATFORMS.TIKTOK :
      null
    );
    
    if (!detectedPlatform) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.UNSUPPORTED_PLATFORM,
        message: '지원하지 않는 플랫폼의 URL입니다.'
      });
    }
    
    ServerLogger.info(`📥 URL로 영상 추가 시작: ${url} (${detectedPlatform})`);
    
    // 중복 체크
    const sheetsManager = new SheetsManager();
    const duplicateCheck = await sheetsManager.checkDuplicateURLFast(url);
    
    if (duplicateCheck.isDuplicate && !duplicateCheck.isProcessing) {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        error: ERROR_CODES.CONFLICT,
        message: `이미 처리된 URL입니다. (${duplicateCheck.existingPlatform} 시트 ${duplicateCheck.existingRow}행)`
      });
    }
    
    // 비디오 처리
    const videoProcessor = new VideoProcessor();
    const aiAnalyzer = new AIAnalyzer();
    const unifiedSaver = new UnifiedVideoSaver();
    
    // 메타데이터 수집
    const videoInfo = await videoProcessor.processVideo({
      url,
      platform: detectedPlatform,
      metadata
    });
    
    // AI 분석
    const analysis = await aiAnalyzer.analyzeVideo({
      metadata: videoInfo,
      platform: detectedPlatform
    });
    
    // 데이터 병합
    const enrichedData = {
      ...videoInfo,
      ...analysis,
      platform: detectedPlatform,
      url,
      collectionTime: new Date().toISOString()
    };
    
    // 저장 처리
    let savedData = null;
    
    if (saveToTrending && groupId) {
      // TrendingVideo로 저장
      const trendingVideo = new TrendingVideo({
        videoId: enrichedData.videoId || url.split('/').pop(),
        title: enrichedData.title,
        url: url,
        platform: detectedPlatform,
        channelName: enrichedData.channelName,
        channelId: enrichedData.channelId,
        channelUrl: enrichedData.channelUrl,
        groupId: groupId,
        groupName: 'Direct Add',
        collectionDate: new Date(),
        collectedFrom: 'individual',
        views: parseInt(enrichedData.views) || 0,
        likes: parseInt(enrichedData.likes) || 0,
        commentsCount: parseInt(enrichedData.commentsCount) || 0,
        uploadDate: enrichedData.uploadDate ? new Date(enrichedData.uploadDate) : null,
        thumbnailUrl: enrichedData.thumbnailUrl,
        description: enrichedData.description,
        keywords: enrichedData.keywords || [],
        hashtags: enrichedData.hashtags || []
      });
      
      savedData = await trendingVideo.save();
      ServerLogger.info(`✅ 트렌딩 영상으로 저장 완료: ${savedData._id}`);
      
    } else {
      // 기존 프로세스 (Sheets + MongoDB)
      const saveResult = await unifiedSaver.save(enrichedData);
      savedData = saveResult;
      ServerLogger.info(`✅ 일반 영상으로 저장 완료`);
    }
    
    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: savedData,
      message: '영상이 성공적으로 추가되었습니다.'
    });
    
  } catch (error) {
    ServerLogger.error('URL로 영상 추가 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.VIDEO_PROCESSING_FAILED,
      message: '영상 추가에 실패했습니다.',
      details: error.message
    });
  }
});

// DELETE /api/videos/:id - 개별 영상 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fromTrending = false } = req.query;
    
    ServerLogger.info(`🗑️ 영상 삭제 요청: ${id} (fromTrending: ${fromTrending})`);
    
    let deletedVideo = null;
    
    if (fromTrending === 'true') {
      // TrendingVideo에서 삭제
      deletedVideo = await TrendingVideo.findByIdAndDelete(id);
      
      if (!deletedVideo) {
        // videoId로 재시도
        deletedVideo = await TrendingVideo.findOneAndDelete({ videoId: id });
      }
      
    } else {
      // 일반 Video 모델에서 삭제
      deletedVideo = await Video.findByIdAndDelete(id);
      
      if (!deletedVideo) {
        // URL로 재시도
        deletedVideo = await Video.findOneAndDelete({ url: id });
      }
    }
    
    if (!deletedVideo) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '영상을 찾을 수 없습니다.'
      });
    }
    
    ServerLogger.info(`✅ 영상 삭제 완료: ${deletedVideo.title || deletedVideo._id}`);
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      message: '영상이 삭제되었습니다.',
      data: {
        deletedId: deletedVideo._id,
        title: deletedVideo.title
      }
    });
    
  } catch (error) {
    ServerLogger.error('영상 삭제 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '영상 삭제에 실패했습니다.',
      details: error.message
    });
  }
});

// GET /api/videos - 영상 목록 조회 (기존 API와 호환)
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      platform, 
      fromTrending = false,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    if (platform) {
      query.platform = platform;
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let videos, totalCount;
    
    if (fromTrending === 'true') {
      videos = await TrendingVideo.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();
      
      totalCount = await TrendingVideo.countDocuments(query);
    } else {
      videos = await Video.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();
      
      totalCount = await Video.countDocuments(query);
    }
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: videos,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + videos.length) < totalCount
      }
    });
    
  } catch (error) {
    ServerLogger.error('영상 목록 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.DATA_FETCH_FAILED,
      message: '영상 목록 조회에 실패했습니다.'
    });
  }
});

module.exports = router;