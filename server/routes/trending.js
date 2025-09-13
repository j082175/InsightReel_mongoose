const express = require('express');
const router = express.Router();
const TrendingVideo = require('../models/TrendingVideo');
const ChannelGroup = require('../models/ChannelGroup');
const { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES } = require('../config/api-messages');
const { ServerLogger } = require('../utils/logger');

/**
 * 🎯 트렌딩 영상 관리 API
 * 수집된 트렌딩 영상들을 조회하고 관리하는 기능
 */

// GET /api/trending/videos - 수집된 트렌딩 영상 목록 조회
router.get('/videos', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0,
      groupId,
      duration,
      platform,
      minViews,
      maxViews,
      keyword,
      sortBy = 'collectionDate',
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;

    // 필터 조건 구성
    let query = {};
    
    if (groupId) {
      query.groupId = groupId;
    }
    
    if (duration && ['SHORT', 'MID', 'LONG'].includes(duration)) {
      query.duration = duration;
    }
    
    if (platform && ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'].includes(platform)) {
      query.platform = platform;
    }
    
    if (minViews) {
      query.views = { ...query.views, $gte: parseInt(minViews) };
    }
    
    if (maxViews) {
      query.views = { ...query.views, $lte: parseInt(maxViews) };
    }
    
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { channelName: { $regex: keyword, $options: 'i' } },
        { keywords: { $in: [new RegExp(keyword, 'i')] } }
      ];
    }
    
    if (dateFrom || dateTo) {
      query.collectionDate = {};
      if (dateFrom) query.collectionDate.$gte = new Date(dateFrom);
      if (dateTo) query.collectionDate.$lte = new Date(dateTo);
    }

    // 정렬 옵션
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const videos = await TrendingVideo.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const totalCount = await TrendingVideo.countDocuments(query);
    
    // 트렌딩 비디오에 source 정보 추가
    const videosWithSource = videos.map(video => ({
      ...video,
      source: 'trending',
      isFromTrending: true
    }));

    ServerLogger.info(`📋 트렌딩 영상 조회: ${videos.length}개 (총 ${totalCount}개)`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: videosWithSource,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + videos.length) < totalCount
      }
    });

  } catch (error) {
    ServerLogger.error('트렌딩 영상 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '트렌딩 영상 조회에 실패했습니다.'
    });
  }
});

// GET /api/trending/videos/:id - 특정 트렌딩 영상 상세 조회
router.get('/videos/:id', async (req, res) => {
  try {
    const video = await TrendingVideo.findById(req.params.id);
    
    if (!video) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '영상을 찾을 수 없습니다.'
      });
    }

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: {
        ...video.toObject(),
        source: 'trending',
        isFromTrending: true
      }
    });

  } catch (error) {
    ServerLogger.error('트렌딩 영상 상세 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '영상 상세 조회에 실패했습니다.'
    });
  }
});

// DELETE /api/trending/videos/:id - 트렌딩 영상 삭제
router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await TrendingVideo.findById(req.params.id);
    
    if (!video) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '영상을 찾을 수 없습니다.'
      });
    }

    await TrendingVideo.findByIdAndDelete(req.params.id);

    ServerLogger.info(`🗑️ 트렌딩 영상 삭제: ${video.title}`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      message: '영상이 삭제되었습니다.'
    });

  } catch (error) {
    ServerLogger.error('트렌딩 영상 삭제 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '영상 삭제에 실패했습니다.'
    });
  }
});

// GET /api/trending/stats - 트렌딩 수집 통계
router.get('/stats', async (req, res) => {
  try {
    const { groupId, dateFrom, dateTo } = req.query;
    
    let matchStage = {};
    if (groupId) {
      matchStage.groupId = groupId;
    }
    if (dateFrom || dateTo) {
      matchStage.collectionDate = {};
      if (dateFrom) matchStage.collectionDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.collectionDate.$lte = new Date(dateTo);
    }

    const stats = await TrendingVideo.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgViews: { $avg: '$views' },
          platforms: { $addToSet: '$platform' },
          durations: { $addToSet: '$duration' }
        }
      }
    ]);

    const platformStats = await TrendingVideo.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }
      }
    ]);

    const durationStats = await TrendingVideo.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$duration',
          count: { $sum: 1 },
          avgViews: { $avg: '$views' }
        }
      }
    ]);

    const result = {
      overview: stats[0] || {
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        avgViews: 0,
        platforms: [],
        durations: []
      },
      byPlatform: platformStats,
      byDuration: durationStats
    };

    ServerLogger.info('📊 트렌딩 통계 조회 완료');

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: result
    });

  } catch (error) {
    ServerLogger.error('트렌딩 통계 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '통계 조회에 실패했습니다.'
    });
  }
});

module.exports = router;