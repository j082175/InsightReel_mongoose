const express = require('express');
const router = express.Router();
const ChannelGroup = require('../models/ChannelGroup');
const TrendingVideo = require('../models/TrendingVideo');
const GroupTrendingCollector = require('../services/GroupTrendingCollector');
const { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES } = require('../config/api-messages');
const { ServerLogger } = require('../utils/logger');

/**
 * 🎯 채널 그룹 CRUD API
 * 채널들을 그룹으로 묶어서 관리하는 기능
 */

// GET /api/channel-groups - 모든 채널 그룹 조회
router.get('/', async (req, res) => {
  try {
    const { active, keyword } = req.query;
    let query = {};
    
    if (active === 'true') {
      query.isActive = true;
    }
    
    if (keyword) {
      query.keywords = { $in: [keyword] };
    }
    
    const groups = await ChannelGroup.find(query)
      .sort({ updatedAt: -1 })
      .lean();
    
    ServerLogger.info(`📋 채널 그룹 조회: ${groups.length}개`);
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: groups,
      count: groups.length
    });
    
  } catch (error) {
    ServerLogger.error('채널 그룹 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 그룹 조회에 실패했습니다.'
    });
  }
});

// GET /api/channel-groups/:id - 특정 채널 그룹 조회
router.get('/:id', async (req, res) => {
  try {
    const group = await ChannelGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널 그룹을 찾을 수 없습니다.'
      });
    }
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: group
    });
    
  } catch (error) {
    ServerLogger.error('채널 그룹 상세 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 그룹 조회에 실패했습니다.'
    });
  }
});

// POST /api/channel-groups - 새 채널 그룹 생성
router.post('/', async (req, res) => {
  try {
    const { name, description, color, channels, keywords, isActive } = req.body;
    
    // 필수 필드 검증
    if (!name || !name.trim()) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '그룹 이름은 필수입니다.'
      });
    }
    
    // 중복 이름 검사
    const existingGroup = await ChannelGroup.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        error: ERROR_CODES.DUPLICATE_URL,
        message: '같은 이름의 그룹이 이미 존재합니다.'
      });
    }
    
    const newGroup = new ChannelGroup({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#3B82F6',
      channels: channels || [],
      keywords: keywords || [],
      isActive: isActive !== false
    });
    
    const savedGroup = await newGroup.save();
    
    ServerLogger.info(`✅ 새 채널 그룹 생성: ${savedGroup.name} (${savedGroup.channels.length}개 채널)`);
    
    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: savedGroup,
      message: '채널 그룹이 생성되었습니다.'
    });
    
  } catch (error) {
    ServerLogger.error('채널 그룹 생성 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 그룹 생성에 실패했습니다.'
    });
  }
});

// PUT /api/channel-groups/:id - 채널 그룹 수정
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, channels, keywords, isActive } = req.body;
    
    const group = await ChannelGroup.findById(req.params.id);
    if (!group) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널 그룹을 찾을 수 없습니다.'
      });
    }
    
    // 이름 중복 검사 (자기 자신 제외)
    if (name && name.trim() !== group.name) {
      const existingGroup = await ChannelGroup.findOne({ 
        name: name.trim(),
        _id: { $ne: req.params.id }
      });
      if (existingGroup) {
        return res.status(HTTP_STATUS_CODES.CONFLICT).json({
          success: false,
          error: ERROR_CODES.DUPLICATE_URL,
          message: '같은 이름의 그룹이 이미 존재합니다.'
        });
      }
    }
    
    // 필드 업데이트
    if (name?.trim()) group.name = name.trim();
    if (description !== undefined) group.description = description?.trim() || '';
    if (color) group.color = color;
    if (channels !== undefined) group.channels = channels;
    if (keywords !== undefined) group.keywords = keywords;
    if (isActive !== undefined) group.isActive = isActive;
    
    const updatedGroup = await group.save();
    
    ServerLogger.info(`🔄 채널 그룹 수정: ${updatedGroup.name}`);
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: updatedGroup,
      message: '채널 그룹이 수정되었습니다.'
    });
    
  } catch (error) {
    ServerLogger.error('채널 그룹 수정 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 그룹 수정에 실패했습니다.'
    });
  }
});

// DELETE /api/channel-groups/:id - 채널 그룹 삭제
router.delete('/:id', async (req, res) => {
  try {
    const group = await ChannelGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널 그룹을 찾을 수 없습니다.'
      });
    }
    
    await ChannelGroup.findByIdAndDelete(req.params.id);
    
    ServerLogger.info(`🗑️ 채널 그룹 삭제: ${group.name}`);
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      message: '채널 그룹이 삭제되었습니다.'
    });
    
  } catch (error) {
    ServerLogger.error('채널 그룹 삭제 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 그룹 삭제에 실패했습니다.'
    });
  }
});

// POST /api/channel-groups/:id/collect - 특정 그룹 트렌딩 수집
router.post('/:id/collect', async (req, res) => {
  try {
    const { daysBack = 3, minViews = 30000, includeShorts = true, includeMidform = true, includeLongForm = true } = req.body;
    
    const group = await ChannelGroup.findById(req.params.id);
    if (!group) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널 그룹을 찾을 수 없습니다.'
      });
    }

    const collector = new GroupTrendingCollector();
    const result = await collector.collectGroupTrending(req.params.id, {
      daysBack,
      minViews,
      includeShorts,
      includeMidform,
      includeLongForm
    });

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: result,
      message: `그룹 "${result.groupName}"에서 ${result.savedVideos}개 영상을 수집했습니다.`
    });

  } catch (error) {
    ServerLogger.error('그룹 트렌딩 수집 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '트렌딩 영상 수집에 실패했습니다.'
    });
  }
});

// POST /api/channel-groups/collect-all - 모든 활성 그룹 트렌딩 수집
router.post('/collect-all', async (req, res) => {
  try {
    const { daysBack = 3, minViews = 30000, includeShorts = true, includeMidform = true, includeLongForm = true } = req.body;

    const collector = new GroupTrendingCollector();
    const results = await collector.collectAllActiveGroups({
      daysBack,
      minViews,
      includeShorts,
      includeMidform,
      includeLongForm
    });

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: results,
      message: `${results.successGroups}/${results.totalGroups}개 그룹에서 총 ${results.totalVideos}개 영상을 수집했습니다.`
    });

  } catch (error) {
    ServerLogger.error('전체 그룹 트렌딩 수집 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '전체 그룹 트렌딩 수집에 실패했습니다.'
    });
  }
});

// GET /api/channel-groups/:id/videos - 그룹의 트렌딩 영상 조회
router.get('/:id/videos', async (req, res) => {
  try {
    const { limit = 20, duration, sortBy = 'collectionDate' } = req.query;
    
    let query = { groupId: req.params.id };
    if (duration && ['SHORT', 'MID', 'LONG'].includes(duration)) {
      query.duration = duration;
    }

    const sortOptions = {};
    sortOptions[sortBy] = -1;
    if (sortBy !== 'views') {
      sortOptions.views = -1; // 2차 정렬
    }

    const videos = await TrendingVideo.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .lean();

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: videos,
      count: videos.length
    });

  } catch (error) {
    ServerLogger.error('그룹 영상 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '그룹 영상 조회에 실패했습니다.'
    });
  }
});

// POST /api/channel-groups/:id/channels - 그룹에 채널 추가
router.post('/:id/channels', async (req, res) => {
  try {
    const { channels, action = 'add' } = req.body;
    
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '추가할 채널 목록은 필수입니다.'
      });
    }

    const group = await ChannelGroup.findById(req.params.id);
    if (!group) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널 그룹을 찾을 수 없습니다.'
      });
    }

    let updatedChannels = [...group.channels];
    
    if (action === 'add') {
      // 채널 추가 (중복 제거)
      const newChannels = channels.filter(channel => !updatedChannels.includes(channel));
      updatedChannels = [...updatedChannels, ...newChannels];
      
      ServerLogger.info(`➕ 그룹 "${group.name}"에 ${newChannels.length}개 채널 추가`);
      
    } else if (action === 'remove') {
      // 채널 제거
      updatedChannels = updatedChannels.filter(channel => !channels.includes(channel));
      
      ServerLogger.info(`➖ 그룹 "${group.name}"에서 ${channels.length}개 채널 제거`);
      
    } else {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: 'action은 "add" 또는 "remove"여야 합니다.'
      });
    }

    group.channels = updatedChannels;
    await group.save();

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: group,
      message: `채널 ${action === 'add' ? '추가' : '제거'}가 완료되었습니다.`
    });

  } catch (error) {
    ServerLogger.error('그룹 채널 관리 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '그룹 채널 관리에 실패했습니다.'
    });
  }
});

// GET /api/channel-groups/:id/channels - 그룹의 채널 목록 상세 조회
router.get('/:id/channels', async (req, res) => {
  try {
    const group = await ChannelGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널 그룹을 찾을 수 없습니다.'
      });
    }

    // 채널 목록과 각 채널의 통계 정보 반환
    const channelsInfo = group.channels.map(channel => ({
      name: channel,
      // TODO: 실제 채널 모델에서 정보 조회하여 추가
      videosCount: 0,
      lastCollected: null,
      status: 'active'
    }));

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: {
        groupId: group._id,
        groupName: group.name,
        channels: channelsInfo,
        totalChannels: group.channels.length
      }
    });

  } catch (error) {
    ServerLogger.error('그룹 채널 목록 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '그룹 채널 목록 조회에 실패했습니다.'
    });
  }
});

module.exports = router;