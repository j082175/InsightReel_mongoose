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
    
    // 트렌딩 비디오에 source 정보 추가, _id 유지
    const videosWithSource = videos.map(video => {
      const { __v, batchId, collectionDate, ...cleanVideo } = video;
      return {
        ...cleanVideo,
        // MongoDB _id 그대로 사용 (변환 없음)
        views: cleanVideo.views || 0,
        thumbnailUrl: cleanVideo.thumbnailUrl || '',
        // 배치 관련 필드
        batchIds: batchId ? [batchId] : [],
        collectedAt: collectionDate,
        // API 메타 정보
        source: 'trending',
        isFromTrending: true
      };
    });

    ServerLogger.info(`📋 트렌딩 영상 조회: ${videos.length}개 (총 ${totalCount}개)`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: videosWithSource,  // 프론트엔드 호환성을 위해 직접 배열 반환
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
    // ID 유효성 검사
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '유효하지 않은 트렌딩 비디오 ID입니다.'
      });
    }

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

// PUT /api/trending/videos/:id - 트렌딩 비디오 정보 수정
router.put('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    ServerLogger.info(`📝 트렌딩 비디오 수정 요청: ${id}`, { updateData });

    // ID 유효성 검사
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        message: '유효하지 않은 비디오 ID입니다.'
      });
    }

    // 트렌딩 비디오 존재 여부 확인
    const existingVideo = await TrendingVideo.findById(id);
    if (!existingVideo) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '트렌딩 비디오를 찾을 수 없습니다.'
      });
    }

    // 수정 불가 필드 제거
    const restrictedFields = ['_id', '__v', 'createdAt', 'updatedAt', 'url', 'batchId', 'collectionDate'];
    restrictedFields.forEach(field => {
      if (field in updateData) {
        delete updateData[field];
      }
    });

    // 배열 필드 처리 (keywords, hashtags, mentions)
    if (updateData.keywords && typeof updateData.keywords === 'string') {
      updateData.keywords = updateData.keywords.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (updateData.hashtags && typeof updateData.hashtags === 'string') {
      updateData.hashtags = updateData.hashtags.split(',').map(h => h.trim()).filter(Boolean);
    }
    if (updateData.mentions && typeof updateData.mentions === 'string') {
      updateData.mentions = updateData.mentions.split(',').map(m => m.trim()).filter(Boolean);
    }

    // 숫자 필드 변환
    const numberFields = ['views', 'likes', 'commentsCount', 'subscribers', 'channelVideos'];
    numberFields.forEach(field => {
      if (field in updateData && typeof updateData[field] === 'string') {
        const num = parseInt(updateData[field], 10);
        updateData[field] = isNaN(num) ? 0 : num;
      }
    });

    // 트렌딩 비디오 업데이트
    const updatedVideo = await TrendingVideo.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date().toISOString() },
      { new: true, runValidators: true }
    );

    ServerLogger.info(`✅ 트렌딩 비디오 수정 완료: ${id}`);

    res.json({
      success: true,
      message: API_MESSAGES.SUCCESS.UPDATE_SUCCESS,
      data: {
        _id: updatedVideo._id,
        title: updatedVideo.title,
        channelName: updatedVideo.channelName,
        views: updatedVideo.views,
        likes: updatedVideo.likes,
        uploadDate: updatedVideo.uploadDate,
        platform: updatedVideo.platform,
        description: updatedVideo.description,
        keywords: updatedVideo.keywords,
        hashtags: updatedVideo.hashtags,
        mentions: updatedVideo.mentions,
        mainCategory: updatedVideo.mainCategory,
        middleCategory: updatedVideo.middleCategory,
        thumbnailUrl: updatedVideo.thumbnailUrl,
        batchId: updatedVideo.batchId,
        collectionDate: updatedVideo.collectionDate,
        updatedAt: updatedVideo.updatedAt
      }
    });

  } catch (error) {
    ServerLogger.error('트렌딩 비디오 수정 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.UPDATE_FAILED,
      message: '트렌딩 비디오 수정에 실패했습니다.'
    });
  }
});

module.exports = router;