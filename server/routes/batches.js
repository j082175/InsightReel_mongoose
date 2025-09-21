const express = require('express');
const router = express.Router();
const CollectionBatch = require('../models/CollectionBatch');
const TrendingVideo = require('../models/TrendingVideo');
const { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES } = require('../config/api-messages');
const { ServerLogger } = require('../utils/logger');

/**
 * 🎯 수집 배치 관리 API
 * 트렌딩 영상 수집 배치들을 관리하는 기능
 */

// GET /api/batches - 수집 배치 목록 조회
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      status,
      collectionType,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};
    
    if (status && ['pending', 'running', 'completed', 'failed'].includes(status)) {
      query.status = status;
    }
    
    if (collectionType && ['group', 'channels'].includes(collectionType)) {
      query.collectionType = collectionType;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const batches = await CollectionBatch.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('targetGroups', 'name color')
      .lean();

    const totalCount = await CollectionBatch.countDocuments(query);

    ServerLogger.info(`📋 배치 목록 조회: ${batches.length}개 (총 ${totalCount}개)`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: batches,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + batches.length) < totalCount
      }
    });

  } catch (error) {
    ServerLogger.error('배치 목록 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '배치 목록 조회에 실패했습니다.'
    });
  }
});

// GET /api/batches/:id - 특정 배치 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const batch = await CollectionBatch.findById(req.params.id)
      .populate('targetGroups', 'name color channels');
    
    if (!batch) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '배치를 찾을 수 없습니다.'
      });
    }

    // 배치의 영상들 개수 조회
    const videoCount = await TrendingVideo.countDocuments({ 
      collectionDate: {
        $gte: batch.createdAt,
        $lte: batch.completedAt || new Date()
      }
    });

    const result = {
      ...batch.toObject(),
      videoCount
    };

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: result
    });

  } catch (error) {
    ServerLogger.error('배치 상세 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '배치 상세 조회에 실패했습니다.'
    });
  }
});

// POST /api/batches - 새 수집 배치 생성
router.post('/', async (req, res) => {
  try {
    const batchData = req.body;
    
    // 필수 필드 검증
    if (!batchData.name || !batchData.name.trim()) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '배치 이름은 필수입니다.'
      });
    }

    if (!batchData.collectionType) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '수집 타입은 필수입니다.'
      });
    }

    const newBatch = new CollectionBatch(batchData);
    const savedBatch = await newBatch.save();

    ServerLogger.info(`✅ 새 수집 배치 생성: ${savedBatch.name}`);

    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: savedBatch,
      message: '수집 배치가 생성되었습니다.'
    });

  } catch (error) {
    ServerLogger.error('배치 생성 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '배치 생성에 실패했습니다.'
    });
  }
});

// PUT /api/batches/:id - 배치 수정
router.put('/:id', async (req, res) => {
  try {
    const batch = await CollectionBatch.findById(req.params.id);
    
    if (!batch) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '배치를 찾을 수 없습니다.'
      });
    }

    // 실행 중이거나 완료된 배치는 수정 불가
    if (batch.status === 'running' || batch.status === 'completed') {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '실행 중이거나 완료된 배치는 수정할 수 없습니다.'
      });
    }

    Object.assign(batch, req.body);
    const updatedBatch = await batch.save();

    ServerLogger.info(`🔄 배치 수정: ${updatedBatch.name}`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: updatedBatch,
      message: '배치가 수정되었습니다.'
    });

  } catch (error) {
    ServerLogger.error('배치 수정 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '배치 수정에 실패했습니다.'
    });
  }
});

// DELETE /api/batches/:id - 배치 삭제
router.delete('/:id', async (req, res) => {
  try {
    // ID 유효성 검사
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '유효하지 않은 배치 ID입니다.'
      });
    }

    const batch = await CollectionBatch.findById(req.params.id);
    
    if (!batch) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '배치를 찾을 수 없습니다.'
      });
    }

    // 실행 중인 배치는 삭제 불가
    if (batch.status === 'running') {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '실행 중인 배치는 삭제할 수 없습니다.'
      });
    }

    await CollectionBatch.findByIdAndDelete(req.params.id);

    ServerLogger.info(`🗑️ 배치 삭제: ${batch.name}`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      message: '배치가 삭제되었습니다.'
    });

  } catch (error) {
    ServerLogger.error('배치 삭제 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '배치 삭제에 실패했습니다.'
    });
  }
});

// GET /api/batches/:id/videos - 배치의 영상 목록 조회
router.get('/:id/videos', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const batch = await CollectionBatch.findById(req.params.id);
    
    if (!batch) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '배치를 찾을 수 없습니다.'
      });
    }

    // batchId로 직접 조회 (더 정확함)
    let query = { batchId: req.params.id };
    
    // batchId가 없는 기존 데이터의 경우 시간대로 폴백
    const videosByBatchId = await TrendingVideo.countDocuments(query);
    
    if (videosByBatchId === 0) {
      // batchId가 없는 경우 기간으로 조회 (기존 데이터 호환성)
      query = {
        collectionDate: {
          $gte: batch.createdAt,
          $lte: batch.completedAt || new Date()
        }
      };
    }

    const videos = await TrendingVideo.find(query)
      .sort({ collectionDate: -1, views: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const totalCount = await TrendingVideo.countDocuments(query);

    ServerLogger.info(`📋 배치 ${req.params.id} 영상 조회: ${videos.length}개 (총 ${totalCount}개)`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: videos,
      batch: {
        _id: batch._id,
        name: batch.name,
        status: batch.status,
        totalVideosSaved: batch.totalVideosSaved || 0
      },
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + videos.length) < totalCount
      }
    });

  } catch (error) {
    ServerLogger.error('배치 영상 목록 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '배치 영상 목록 조회에 실패했습니다.'
    });
  }
});

// GET /api/batches/stats/overview - 전체 배치 통계
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await CollectionBatch.aggregate([
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          completedBatches: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedBatches: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalVideosCollected: { $sum: '$totalVideosSaved' },
          totalQuotaUsed: { $sum: '$quotaUsed' },
          avgSuccessRate: { $avg: '$successRate' }
        }
      }
    ]);

    const recentActivity = await CollectionBatch.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status totalVideosSaved createdAt')
      .lean();

    const result = {
      overview: stats[0] || {
        totalBatches: 0,
        completedBatches: 0,
        failedBatches: 0,
        totalVideosCollected: 0,
        totalQuotaUsed: 0,
        avgSuccessRate: 0
      },
      recentActivity
    };

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: result
    });

  } catch (error) {
    ServerLogger.error('배치 통계 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '배치 통계 조회에 실패했습니다.'
    });
  }
});

module.exports = router;