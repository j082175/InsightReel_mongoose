const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const ChannelGroup = require('../models/ChannelGroup');
const { HTTP_STATUS_CODES, ERROR_CODES, API_MESSAGES, PLATFORMS } = require('../config/api-messages');
const { ServerLogger } = require('../utils/logger');
const YouTubeChannelDataCollector = require('../services/YouTubeChannelDataCollector');

/**
 * 🎯 개별 채널 관리 API
 * URL로 채널 추가, 삭제 등 개별 채널 관리 기능
 */

// POST /api/channels/add-url - URL로 채널 직접 추가
router.post('/add-url', async (req, res) => {
  try {
    const { url, platform, metadata = {}, addToGroup = null } = req.body;
    
    // URL 검증
    if (!url || !url.trim()) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '채널 URL은 필수입니다.'
      });
    }
    
    // 플랫폼 자동 감지
    const detectedPlatform = platform || (
      url.includes('youtube.com') ? PLATFORMS.YOUTUBE :
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
    
    ServerLogger.info(`📥 URL로 채널 추가 시작: ${url} (${detectedPlatform})`);
    
    // 채널 ID 추출
    let channelId = null;
    let channelName = null;
    let channelData = {};
    
    if (detectedPlatform === PLATFORMS.YOUTUBE) {
      // YouTube 채널 처리
      const channelCollector = new YouTubeChannelDataCollector();
      
      // URL에서 채널 ID 추출
      if (url.includes('/channel/')) {
        channelId = url.split('/channel/')[1].split('/')[0].split('?')[0];
      } else if (url.includes('/@')) {
        const handle = url.split('/@')[1].split('/')[0].split('?')[0];
        channelId = handle; // 핸들을 임시 ID로 사용
        channelName = handle;
      } else if (url.includes('/c/')) {
        const customUrl = url.split('/c/')[1].split('/')[0].split('?')[0];
        channelId = customUrl;
        channelName = customUrl;
      }
      
      // YouTube API로 채널 정보 수집 시도
      try {
        const channelInfo = await channelCollector.getChannelData(channelId);
        if (channelInfo) {
          channelData = {
            channelId: channelInfo.id,
            name: channelInfo.snippet?.title || channelName,
            url: `https://www.youtube.com/channel/${channelInfo.id}`,
            platform: PLATFORMS.YOUTUBE,
            subscribers: parseInt(channelInfo.statistics?.subscriberCount) || 0,
            totalViews: parseInt(channelInfo.statistics?.viewCount) || 0,
            totalVideos: parseInt(channelInfo.statistics?.videoCount) || 0,
            description: channelInfo.snippet?.description,
            thumbnailUrl: channelInfo.snippet?.thumbnails?.high?.url,
            country: channelInfo.snippet?.country,
            publishedAt: channelInfo.snippet?.publishedAt,
            ...metadata
          };
        }
      } catch (apiError) {
        ServerLogger.warn(`YouTube API 호출 실패, 기본 정보만 저장: ${apiError.message}`);
        channelData = {
          channelId: channelId,
          name: channelName || channelId,
          url: url,
          platform: PLATFORMS.YOUTUBE,
          ...metadata
        };
      }
      
    } else {
      // 다른 플랫폼 (Instagram, TikTok)
      // URL에서 사용자명 추출
      const urlParts = url.split('/').filter(p => p);
      channelId = urlParts[urlParts.length - 1].split('?')[0];
      channelName = channelId;
      
      channelData = {
        channelId: channelId,
        name: channelName,
        url: url,
        platform: detectedPlatform,
        ...metadata
      };
    }
    
    // 중복 체크
    const existingChannel = await Channel.findOne({
      $or: [
        { channelId: channelId, platform: detectedPlatform },
        { url: url }
      ]
    });
    
    if (existingChannel) {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        error: ERROR_CODES.CONFLICT,
        message: '이미 등록된 채널입니다.',
        data: existingChannel
      });
    }
    
    // 채널 저장
    const newChannel = new Channel(channelData);
    const savedChannel = await newChannel.save();
    
    ServerLogger.info(`✅ 채널 저장 완료: ${savedChannel.name} (${savedChannel.channelId})`);
    
    // 그룹에 추가 (옵션)
    if (addToGroup) {
      try {
        const group = await ChannelGroup.findById(addToGroup);
        if (group) {
          await group.addChannel(savedChannel.channelId);
          ServerLogger.info(`✅ 채널을 그룹에 추가: ${group.name}`);
        }
      } catch (groupError) {
        ServerLogger.warn(`그룹 추가 실패: ${groupError.message}`);
      }
    }
    
    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: savedChannel,
      message: '채널이 성공적으로 추가되었습니다.'
    });
    
  } catch (error) {
    ServerLogger.error('URL로 채널 추가 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 추가에 실패했습니다.',
      details: error.message
    });
  }
});

// DELETE /api/channels/:id - 개별 채널 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { removeFromGroups = false } = req.query;
    
    ServerLogger.info(`🗑️ 채널 삭제 요청: ${id}`);
    
    // MongoDB ObjectId 형식인지 확인
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    let deletedChannel = null;
    
    if (isObjectId) {
      // ObjectId로 삭제 시도
      deletedChannel = await Channel.findByIdAndDelete(id);
    }
    
    if (!deletedChannel) {
      // 채널 ID로 삭제 시도
      deletedChannel = await Channel.findOneAndDelete({ channelId: id });
    }
    
    if (!deletedChannel) {
      // URL로 삭제 시도
      deletedChannel = await Channel.findOneAndDelete({ url: id });
    }
    
    if (!deletedChannel) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널을 찾을 수 없습니다.'
      });
    }
    
    // 그룹에서도 제거 (옵션)
    if (removeFromGroups === 'true') {
      try {
        const groups = await ChannelGroup.find({ 
          channels: deletedChannel.channelId 
        });
        
        for (const group of groups) {
          await group.removeChannel(deletedChannel.channelId);
          ServerLogger.info(`✅ 그룹에서 채널 제거: ${group.name}`);
        }
      } catch (groupError) {
        ServerLogger.warn(`그룹에서 채널 제거 실패: ${groupError.message}`);
      }
    }
    
    // 중복 체크 컬렉션에서도 제거 (진짜 중복 체크 데이터)
    try {
      const ChannelUrl = require('../models/ChannelUrl');
      
      ServerLogger.info(`🔍 중복체크 삭제 시도 - 채널 정보: ${JSON.stringify({
        id: deletedChannel.channelId,
        name: deletedChannel.name,
        url: deletedChannel.url
      })}`);
      
      // @ 포함한 핸들명 생성
      const handleWithAt = deletedChannel.customUrl ? `@${deletedChannel.customUrl}` : `@${deletedChannel.name}`;
      
      // 먼저 삭제될 데이터 조회 (더 광범위한 조건으로)
      const toDeleteDocs = await ChannelUrl.find({
        $or: [
          { normalizedChannelId: deletedChannel.channelId },  // 채널 ID로 찾기
          { normalizedChannelId: deletedChannel.name }, // 채널명으로 찾기
          { normalizedChannelId: `@${deletedChannel.name}` }, // @채널명으로 찾기
          { normalizedChannelId: deletedChannel.customUrl }, // 커스텀URL로 찾기
          { normalizedChannelId: `@${deletedChannel.customUrl}` }, // @커스텀URL로 찾기
          { originalChannelIdentifier: deletedChannel.channelId }, // 원본 식별자가 채널 ID인 경우
          { originalChannelIdentifier: deletedChannel.url }, // 원본 식별자가 URL인 경우
          { originalChannelIdentifier: deletedChannel.name }, // 원본 식별자가 이름인 경우
          { originalChannelIdentifier: `@${deletedChannel.name}` }, // @이름인 경우
          { originalChannelIdentifier: deletedChannel.customUrl }, // 커스텀 URL인 경우
          { originalChannelIdentifier: `@${deletedChannel.customUrl}` }, // @커스텀 URL인 경우
          { 'channelInfo.name': deletedChannel.name } // 채널 정보의 이름으로 찾기
        ]
      });
      
      ServerLogger.info(`🔍 삭제 대상 중복체크 문서 ${toDeleteDocs.length}개 발견:`);
      toDeleteDocs.forEach((doc, index) => {
        ServerLogger.info(`  ${index + 1}. normalizedChannelId: ${doc.normalizedChannelId}, originalChannelIdentifier: ${doc.originalChannelIdentifier}`);
      });
      
      // 채널 ID로 중복 체크 데이터 삭제 (더 광범위한 조건으로)
      const duplicateCheckResult = await ChannelUrl.deleteMany({
        $or: [
          { normalizedChannelId: deletedChannel.channelId },  // 채널 ID로 찾기
          { normalizedChannelId: deletedChannel.name }, // 채널명으로 찾기
          { normalizedChannelId: `@${deletedChannel.name}` }, // @채널명으로 찾기
          { normalizedChannelId: deletedChannel.customUrl }, // 커스텀URL로 찾기
          { normalizedChannelId: `@${deletedChannel.customUrl}` }, // @커스텀URL로 찾기
          { originalChannelIdentifier: deletedChannel.channelId }, // 원본 식별자가 채널 ID인 경우
          { originalChannelIdentifier: deletedChannel.url }, // 원본 식별자가 URL인 경우
          { originalChannelIdentifier: deletedChannel.name }, // 원본 식별자가 이름인 경우
          { originalChannelIdentifier: `@${deletedChannel.name}` }, // @이름인 경우
          { originalChannelIdentifier: deletedChannel.customUrl }, // 커스텀 URL인 경우
          { originalChannelIdentifier: `@${deletedChannel.customUrl}` }, // @커스텀 URL인 경우
          { 'channelInfo.name': deletedChannel.name } // 채널 정보의 이름으로 찾기
        ]
      });
      
      ServerLogger.info(`✅ 중복체크 컬렉션에서 채널 제거 완료: ${duplicateCheckResult.deletedCount}개 문서 삭제`);
      
      if (duplicateCheckResult.deletedCount === 0 && toDeleteDocs.length > 0) {
        ServerLogger.warn(`⚠️ 경고: 삭제 대상 ${toDeleteDocs.length}개가 있었지만 실제 삭제는 0개`);
      }
      
    } catch (duplicateError) {
      ServerLogger.error(`❌ 중복체크 컬렉션 업데이트 실패: ${duplicateError.message}`);
      ServerLogger.error(`❌ 중복체크 삭제 스택: ${duplicateError.stack}`);
    }
    
    // 파일 시스템의 channels.json에서도 제거 (백업용)
    try {
      const fs = require('fs');
      const path = require('path');
      const channelsFilePath = path.join(__dirname, '../data/channels.json');
      
      if (fs.existsSync(channelsFilePath)) {
        const channelsData = JSON.parse(fs.readFileSync(channelsFilePath, 'utf8'));
        const updatedChannels = channelsData.filter(ch => 
          ch.id !== deletedChannel.channelId && 
          ch._id !== deletedChannel._id.toString()
        );
        
        fs.writeFileSync(channelsFilePath, JSON.stringify(updatedChannels, null, 2));
        ServerLogger.info(`✅ channels.json에서 채널 제거 완료: ${deletedChannel.name}`);
      }
    } catch (fileError) {
      ServerLogger.warn(`channels.json 업데이트 실패: ${fileError.message}`);
    }
    
    ServerLogger.info(`✅ 채널 삭제 완료: ${deletedChannel.name} (${deletedChannel.channelId})`);
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      message: '채널이 삭제되었습니다.',
      data: {
        deletedId: deletedChannel._id,
        channelId: deletedChannel.channelId,
        name: deletedChannel.name
      }
    });
    
  } catch (error) {
    ServerLogger.error('채널 삭제 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 삭제에 실패했습니다.',
      details: error.message
    });
  }
});

// GET /api/channels - 채널 목록 조회
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      platform, 
      groupId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    
    if (platform) {
      query.platform = platform;
    }
    
    // 특정 그룹의 채널만 조회
    if (groupId) {
      const group = await ChannelGroup.findById(groupId);
      if (group) {
        query.channelId = { $in: group.channels };
      }
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const channels = await Channel.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();
    
    const totalCount = await Channel.countDocuments(query);
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: channels,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + channels.length) < totalCount
      }
    });
    
  } catch (error) {
    ServerLogger.error('채널 목록 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.DATA_FETCH_FAILED,
      message: '채널 목록 조회에 실패했습니다.'
    });
  }
});

// GET /api/channels/debug/duplicate-check - 중복체크 컬렉션 데이터 조회 (디버깅용)
router.get('/debug/duplicate-check', async (req, res) => {
  try {
    const ChannelUrl = require('../models/ChannelUrl');
    
    // 모든 중복체크 데이터 조회
    const duplicateCheckData = await ChannelUrl.find({}).limit(20).lean();
    
    ServerLogger.info(`🔍 중복체크 컬렉션 데이터 ${duplicateCheckData.length}개 조회`);
    duplicateCheckData.forEach((doc, index) => {
      ServerLogger.info(`  ${index + 1}. normalizedChannelId: "${doc.normalizedChannelId}", originalChannelIdentifier: "${doc.originalChannelIdentifier}", platform: "${doc.platform}"`);
    });
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: duplicateCheckData,
      count: duplicateCheckData.length
    });
    
  } catch (error) {
    ServerLogger.error('중복체크 컬렉션 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '중복체크 컬렉션 조회에 실패했습니다.'
    });
  }
});

// GET /api/channels/:id - 특정 채널 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // MongoDB ObjectId 형식인지 확인
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    let channel = null;
    
    if (isObjectId) {
      channel = await Channel.findById(id);
    }
    
    if (!channel) {
      channel = await Channel.findOne({ channelId: id });
    }
    
    if (!channel) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '채널을 찾을 수 없습니다.'
      });
    }
    
    // 채널이 속한 그룹 정보 추가
    const groups = await ChannelGroup.find({
      channels: channel.channelId
    }).select('name color');
    
    const result = {
      ...channel.toObject(),
      groups: groups
    };
    
    res.status(HTTP_STATUS_CODES.OK).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    ServerLogger.error('채널 상세 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.SERVER_ERROR,
      message: '채널 조회에 실패했습니다.'
    });
  }
});

module.exports = router;