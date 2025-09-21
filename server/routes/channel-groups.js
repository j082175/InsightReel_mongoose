const express = require('express');
const router = express.Router();
const ChannelGroup = require('../models/ChannelGroup');
const TrendingVideo = require('../models/TrendingVideo');
const CollectionBatch = require('../models/CollectionBatch');
const GroupTrendingCollector = require('../services/GroupTrendingCollector');
const { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES } = require('../config/api-messages');
const { ServerLogger } = require('../utils/logger');
// response-normalizer 제거 - _id 통일

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

    // 디버깅: 수신된 데이터 구조 확인
    ServerLogger.info('🔍 채널 그룹 생성 요청 데이터:', {
      name,
      description,
      color,
      channels: {
        type: typeof channels,
        isArray: Array.isArray(channels),
        length: channels?.length,
        firstItem: channels?.[0],
        data: channels
      },
      keywords,
      isActive
    });

    // 서버에서 채널 데이터 변환 (방어적 프로그래밍)
    let processedChannels = channels || [];
    if (Array.isArray(channels)) {
      processedChannels = channels.map(channel => {
        // 이미 객체 형태인 경우
        if (typeof channel === 'object' && channel.channelId) {
          return channel;
        }
        // 문자열인 경우 객체로 변환
        if (typeof channel === 'string') {
          return {
            channelId: channel,
            name: `Channel ${channel.substring(0, 8)}...` // 기본 이름
          };
        }
        return channel;
      });
    }

    ServerLogger.info('🔄 변환된 채널 데이터:', processedChannels);
    
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
      channels: processedChannels,
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
    // ID 유효성 검사
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '유효하지 않은 그룹 ID입니다.'
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
    const { daysBack = 7, minViews = 10000, includeShorts = true, includeMidform = true, includeLongForm = true } = req.body;
    console.log('🔍 DEBUG: 채널 그룹 개별 수집 요청 파라미터:', { daysBack, minViews, includeShorts, includeMidform, includeLongForm });
    console.log('🔍 DEBUG: req.body 전체:', req.body);
    
    const group = await ChannelGroup.findById(req.params.id);
    if (!group) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널 그룹을 찾을 수 없습니다.'
      });
    }

    const collector = new GroupTrendingCollector();
    await collector.initialize();
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
    const { daysBack = 7, minViews = 10000, includeShorts = true, includeMidform = true, includeLongForm = true } = req.body;

    const collector = new GroupTrendingCollector();
    await collector.initialize();
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

// POST /api/channel-groups/collect-multiple - 다중 그룹 트렌딩 수집 (배치 이력 자동 생성)
router.post('/collect-multiple', async (req, res) => {
  let batch = null;
  
  try {
    const {
      groupIds,
      days = 7,
      daysBack = days || 7, // daysBack와 days 둘 다 지원
      minViews = 10000,
      maxViews = null,
      includeShorts = true,
      includeMidform = true,
      includeLongForm = true,
      keywords = [],
      excludeKeywords = []
    } = req.body;

    console.log('🔍 DEBUG: 다중 채널 그룹 수집 요청 파라미터:', {
      groupIds, days, daysBack, minViews, maxViews, includeShorts, includeMidform, includeLongForm, keywords, excludeKeywords
    });
    console.log('🔍 DEBUG: req.body 전체:', req.body);

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '수집할 그룹 ID 목록은 필수입니다.'
      });
    }

    ServerLogger.info(`🚀 다중 그룹 트렌딩 수집 시작: ${groupIds.length}개 그룹`);

    // 그룹들 조회 및 유효성 검사
    const groups = await ChannelGroup.find({ _id: { $in: groupIds } });
    if (groups.length !== groupIds.length) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '일부 그룹을 찾을 수 없습니다.'
      });
    }

    // 모든 그룹의 채널들 수집 및 실제 YouTube 채널 ID 조회
    const allChannels = [];
    const groupNames = [];

    for (const group of groups) {
      console.log('🔍 DEBUG: 그룹 정보:', {
        name: group.name,
        channels: group.channels
      });

      // 채널 이름으로 실제 YouTube 채널 ID 조회
      const channelIds = [];
      for (const channel of group.channels) {
        try {
          // Channel 컬렉션에서 실제 채널 정보 조회
          const Channel = require('../models/Channel');
          let actualChannel;
          let channelIdentifier;

          console.log('🔍 DEBUG: 채널 데이터 타입 및 구조:', typeof channel, channel);

          if (typeof channel === 'object' && channel.channelId) {
            // 이미 channelId가 있는 경우 바로 사용
            channelIds.push(channel.channelId);
            console.log('✅ DEBUG: 기존 채널 ID 사용:', channel.channelId);
            continue;
          } else if (typeof channel === 'object' && channel.name) {
            // 채널 이름으로 조회
            channelIdentifier = channel.name;
            actualChannel = await Channel.findOne({ name: channel.name });
            console.log('🔍 DEBUG: 채널명으로 조회:', channel.name, '→ 결과:', actualChannel?.channelId);
          } else if (typeof channel === 'string') {
            // 문자열인 경우 - UC로 시작하면 채널 ID, 아니면 채널 이름
            if (channel.startsWith('UC') && channel.length === 24) {
              channelIds.push(channel);
              console.log('✅ DEBUG: 직접 채널 ID 사용:', channel);
              continue;
            } else {
              // 채널 이름으로 조회
              channelIdentifier = channel;
              actualChannel = await Channel.findOne({ name: channel });
              console.log('🔍 DEBUG: 문자열 채널명으로 조회:', channel, '→ 결과:', actualChannel?.channelId);
            }
          }

          if (actualChannel && actualChannel.channelId) {
            channelIds.push(actualChannel.channelId);
            console.log('✅ DEBUG: 실제 YouTube 채널 ID 사용:', actualChannel.channelId);
          } else {
            console.log('❌ DEBUG: 채널을 찾을 수 없음:', channelIdentifier);
            // 방어적으로 원본 값 추출 시도
            const fallbackId = channel.channelId || channel.id || channel;
            if (fallbackId && fallbackId !== 'undefined') {
              channelIds.push(fallbackId);
              console.log('⚠️ DEBUG: Fallback ID 사용:', fallbackId);
            }
          }
        } catch (error) {
          console.error('❌ DEBUG: 채널 조회 실패:', error.message);
          const fallbackId = channel.channelId || channel.id || channel;
          if (fallbackId && fallbackId !== 'undefined') {
            channelIds.push(fallbackId);
            console.log('⚠️ DEBUG: 에러 시 Fallback ID 사용:', fallbackId);
          }
        }
      }

      allChannels.push(...channelIds);
      groupNames.push(group.name);
    }

    // 중복 채널 제거 및 undefined/null 필터링
    const uniqueChannels = [...new Set(allChannels.filter(channel =>
      channel && channel !== 'undefined' && channel !== 'null' && typeof channel === 'string'
    ))];

    // 🔥 배치 생성 및 저장
    const batchName = `${groupNames.join(', ')} - ${new Date().toLocaleDateString('ko-KR')} ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    
    batch = new CollectionBatch({
      name: batchName,
      description: `${groups.length}개 그룹에서 트렌딩 영상 수집`,
      collectionType: 'group',
      targetGroups: groupIds,
      criteria: {
        daysBack: daysBack,
        minViews,
        maxViews,
        includeShorts,
        includeMidform,
        includeLongForm,
        keywords,
        excludeKeywords
      }
    });

    await batch.save();
    ServerLogger.info(`📝 배치 생성됨: ${batch._id} - "${batchName}"`);

    // 배치 시작
    await batch.start();

    // 유효한 채널이 있는지 확인
    if (uniqueChannels.length === 0) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '선택된 그룹에서 유효한 채널 ID를 찾을 수 없습니다. 채널 데이터를 확인해주세요.'
      });
    }

    ServerLogger.info(`📊 다중 그룹 수집 대상: ${groupNames.join(', ')} (총 ${uniqueChannels.length}개 채널)`);

    // GroupTrendingCollector 사용해서 수집
    const collector = new GroupTrendingCollector();
    await collector.initialize();
    const result = await collector.collectFromChannels({
      channels: uniqueChannels,
      daysBack: days,
      minViews,
      maxViews,
      includeShorts,
      includeMidform,
      includeLongForm,
      keywords,
      excludeKeywords,
      batchId: batch._id  // 배치 ID 전달
    });

    // 🔥 배치 완료 처리
    await batch.complete({
      totalVideosFound: result.totalVideosFound || 0,
      totalVideosSaved: result.totalVideosSaved || 0,
      quotaUsed: result.quotaUsed || 0,
      stats: {
        byPlatform: result.stats?.byPlatform || { YOUTUBE: result.totalVideosSaved || 0 },
        byDuration: result.stats?.byDuration || { SHORT: 0, MID: 0, LONG: 0 },
        avgViews: 0,
        totalViews: 0
      }
    });

    ServerLogger.info(`✅ 다중 그룹 트렌딩 수집 완료: ${result.totalVideosSaved}개 영상 (배치: ${batch._id})`);

    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: {
        ...result,
        groupsProcessed: groups.length,
        groupNames: groupNames,
        channelsProcessed: uniqueChannels.length,
        batchId: batch._id,
        batchName: batch.name
      },
      message: `${groups.length}개 그룹에서 ${result.totalVideosSaved}개 영상을 수집했습니다.`
    });

  } catch (error) {
    ServerLogger.error('다중 그룹 트렌딩 수집 실패:', error);

    // 🔥 배치 실패 처리
    if (batch) {
      try {
        await batch.fail(error);
        ServerLogger.info(`❌ 배치 실패 처리됨: ${batch._id}`);
      } catch (batchError) {
        ServerLogger.error('배치 실패 처리 중 오류:', batchError);
      }
    }

    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '다중 그룹 트렌딩 수집에 실패했습니다.',
      batchId: batch?._id
    });
  }
});

module.exports = router;