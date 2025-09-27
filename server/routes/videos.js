const express = require('express');
const router = express.Router();
const Video = require('../../dist/server/models/Video');
const TrendingVideo = require('../../dist/server/models/TrendingVideo');
const VideoUrl = require('../../dist/server/models/VideoUrl');
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
    await videoProcessor.initialize();
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
        shares: parseInt(enrichedData.shares) || 0,
        uploadDate: enrichedData.uploadDate ? new Date(enrichedData.uploadDate) : null,
        duration: enrichedData.duration,
        durationSeconds: parseInt(enrichedData.durationSeconds) || 0,
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

    // ID 유효성 검사
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_REQUEST,
        message: '유효하지 않은 비디오 ID입니다.'
      });
    }
    
    ServerLogger.info(`🗑️ 영상 삭제 요청: ${id} (fromTrending: ${fromTrending})`);
    
    let deletedVideo = null;
    
    if (fromTrending === 'true') {
      // TrendingVideo에서 삭제
      ServerLogger.info(`🔍 TrendingVideo 컬렉션에서 삭제 시도: ${id}`);
      deletedVideo = await TrendingVideo.findByIdAndDelete(id);
      
      if (!deletedVideo) {
        ServerLogger.info(`🔍 TrendingVideo에서 _id 실패, videoId로 재시도: ${id}`);
        deletedVideo = await TrendingVideo.findOneAndDelete({ videoId: id });
      }
      
      if (deletedVideo) {
        ServerLogger.info(`✅ TrendingVideo에서 삭제 성공: ${deletedVideo.title || deletedVideo._id}`);
      } else {
        ServerLogger.info(`❌ TrendingVideo에서 삭제 실패: ${id}`);
      }
      
    } else {
      // 일반 Video 모델에서 삭제
      ServerLogger.info(`🔍 Video 컬렉션에서 삭제 시도: ${id}`);
      deletedVideo = await Video.findByIdAndDelete(id);
      
      if (!deletedVideo) {
        ServerLogger.info(`🔍 Video에서 _id 실패, URL로 재시도: ${id}`);
        deletedVideo = await Video.findOneAndDelete({ url: id });
      }
      
      if (deletedVideo) {
        ServerLogger.info(`✅ Video에서 삭제 성공: ${deletedVideo.title || deletedVideo._id}`);
      } else {
        ServerLogger.info(`❌ Video에서 삭제 실패: ${id}`);
      }
    }
    
    if (!deletedVideo) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '영상을 찾을 수 없습니다.'
      });
    }
    
    // 일반 비디오 삭제 시에만 중복 체크 데이터도 함께 삭제
    if (fromTrending !== 'true' && deletedVideo.url) {
      try {
        const sheetsManager = new SheetsManager();
        const normalizedUrl = sheetsManager.normalizeVideoUrl(deletedVideo.url);
        
        // 디버깅: 삭제할 비디오 정보 로그
        ServerLogger.info(`🔍 중복 체크 삭제 대상 비디오 URL: ${deletedVideo.url}`);
        ServerLogger.info(`🔍 정규화된 URL: ${normalizedUrl}`);
        
        // YouTube videoId 추출 (더 정확한 매칭)
        let videoId = null;
        if (deletedVideo.url.includes('youtube.com') || deletedVideo.url.includes('youtu.be')) {
          const videoIdMatch = deletedVideo.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
          if (videoIdMatch) {
            videoId = videoIdMatch[1];
            ServerLogger.info(`🔍 추출된 videoId: ${videoId}`);
          }
        }
        
        // 먼저 관련 중복 체크 데이터가 있는지 확인
        const existingDuplicateCheck = await VideoUrl.find({
          $or: [
            { normalizedUrl: normalizedUrl },
            { originalUrl: deletedVideo.url },
            { normalizedUrl: deletedVideo.url },
            ...(videoId ? [
              { normalizedUrl: { $regex: videoId, $options: 'i' } },
              { originalUrl: { $regex: videoId, $options: 'i' } },
              { videoId: videoId },
              { videoId: { $regex: videoId, $options: 'i' } }
            ] : [])
          ]
        });
        
        ServerLogger.info(`🔍 찾은 중복 체크 데이터: ${existingDuplicateCheck.length}개`);
        if (existingDuplicateCheck.length > 0) {
          existingDuplicateCheck.forEach((item, index) => {
            ServerLogger.info(`   ${index + 1}. normalizedUrl: ${item.normalizedUrl}, originalUrl: ${item.originalUrl}, videoId: ${item.videoId || 'N/A'}`);
          });
        }
        
        // 실제 삭제 실행
        const duplicateCheckResult = await VideoUrl.deleteMany({
          $or: [
            { normalizedUrl: normalizedUrl },
            { originalUrl: deletedVideo.url },
            { normalizedUrl: deletedVideo.url },
            ...(videoId ? [
              { normalizedUrl: { $regex: videoId, $options: 'i' } },
              { originalUrl: { $regex: videoId, $options: 'i' } },
              { videoId: videoId },
              { videoId: { $regex: videoId, $options: 'i' } }
            ] : [])
          ]
        });
        
        if (duplicateCheckResult.deletedCount > 0) {
          ServerLogger.info(`🧹 비디오 중복 체크 데이터 삭제: ${duplicateCheckResult.deletedCount}개 (videoId: ${videoId || 'N/A'})`);
        } else {
          ServerLogger.warn(`⚠️ 삭제할 중복 체크 데이터를 찾지 못했습니다.`);
        }
      } catch (duplicateCheckError) {
        ServerLogger.warn(`⚠️ 비디오 중복 체크 데이터 삭제 실패: ${duplicateCheckError.message}`);
        // 중복 체크 데이터 삭제 실패는 치명적이지 않으므로 계속 진행
      }
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

// GET /api/videos - 영상 목록 조회 (모든 컬렉션에서 가져오기)
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      platform, 
      fromTrending = 'both', // 🎯 기본적으로 모든 컬렉션에서 가져오기
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    if (platform) {
      query.platform = platform;
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let videos = [], totalCount = 0;
    
    if (fromTrending === 'true') {
      // 트렌딩 비디오만 가져오기
      videos = await TrendingVideo.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();
      
      totalCount = await TrendingVideo.countDocuments(query);
      
      videos = videos.map(video => {
        const { __v, batchId, collectionDate, ...cleanVideo } = video;
        return {
          ...cleanVideo,
          // MongoDB _id 그대로 사용, 중복 필드 제거
          batchIds: batchId ? [batchId] : cleanVideo.batchIds || [],
          collectedAt: collectionDate || cleanVideo.collectedAt,
          source: 'trending',
          isFromTrending: true
        };
      });
      
    } else if (fromTrending === 'false') {
      // 일반 비디오만 가져오기
      videos = await Video.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();
      
      totalCount = await Video.countDocuments(query);
      
      videos = videos.map(video => {
        const { __v, ...cleanVideo } = video;
        return {
          ...cleanVideo,
          // MongoDB _id 그대로 사용, 중복 필드 제거
          source: 'videos',
          isFromTrending: false
        };
      });
      
    } else {
      // 🎯 both: 모든 컬렉션에서 가져오기
      const [trendingVideos, regularVideos] = await Promise.all([
        TrendingVideo.find(query).sort(sortOptions).lean(),
        Video.find(query).sort(sortOptions).lean()
      ]);
      
      // source 정보 추가, MongoDB _id 그대로 사용
      const trendingWithSource = trendingVideos.map(video => {
        const { __v, batchId, collectionDate, ...cleanVideo } = video;
        return {
          ...cleanVideo,
          // MongoDB _id 그대로 사용, 중복 필드 제거
          batchIds: batchId ? [batchId] : [],
          collectedAt: collectionDate,
          source: 'trending',
          isFromTrending: true
        };
      });

      const regularWithSource = regularVideos.map(video => {
        const { __v, ...cleanVideo } = video;
        return {
          ...cleanVideo,
          // MongoDB _id 그대로 사용, 중복 필드 제거
          source: 'videos',
          isFromTrending: false
        };
      });
      
      // 합치고 정렬
      const allVideos = [...trendingWithSource, ...regularWithSource];
      allVideos.sort((a, b) => {
        const aValue = a[sortBy] || new Date(0);
        const bValue = b[sortBy] || new Date(0);
        
        if (sortOrder === 'desc') {
          return new Date(bValue) - new Date(aValue);
        } else {
          return new Date(aValue) - new Date(bValue);
        }
      });
      
      // 페이징 적용
      videos = allVideos.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
      totalCount = allVideos.length;
    }
    
    const hasMoreCalculation = (parseInt(offset) + videos.length) < totalCount;
    const responseData = {
      success: true,
      data: videos,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: hasMoreCalculation
      }
    };

    // hasMore 계산 상세 로깅
    ServerLogger.info('🔍 [videos] hasMore 계산 상세:', {
      offset: parseInt(offset),
      videosLength: videos.length,
      totalCount,
      계산식: `(${parseInt(offset)} + ${videos.length}) < ${totalCount}`,
      계산결과: `${parseInt(offset) + videos.length} < ${totalCount}`,
      hasMore: hasMoreCalculation
    });

    ServerLogger.info('📤 [videos] API 응답 구조 DEBUG:', {
      success: responseData.success,
      dataType: Array.isArray(responseData.data) ? 'array' : typeof responseData.data,
      dataLength: responseData.data?.length,
      pagination: responseData.pagination,
      firstVideoTitle: responseData.data?.[0]?.title
    });

    res.status(HTTP_STATUS_CODES.OK).json(responseData);
    
  } catch (error) {
    ServerLogger.error('영상 목록 조회 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.DATA_FETCH_FAILED,
      message: '영상 목록 조회에 실패했습니다.'
    });
  }
});

// PUT /api/videos/:id - 비디오 정보 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    ServerLogger.info(`📝 비디오 수정 요청: ${id}`, { updateData });

    // ID 유효성 검사
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        message: '유효하지 않은 비디오 ID입니다.'
      });
    }

    // 비디오 존재 여부 확인
    const existingVideo = await Video.findById(id);
    if (!existingVideo) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: '비디오를 찾을 수 없습니다.'
      });
    }

    // 수정 불가 필드 제거
    const restrictedFields = ['_id', '__v', 'createdAt', 'updatedAt', 'url'];
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

    // 비디오 업데이트
    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date().toISOString() },
      { new: true, runValidators: true }
    );

    ServerLogger.info(`✅ 비디오 수정 완료: ${id}`);

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
        updatedAt: updatedVideo.updatedAt
      }
    });

  } catch (error) {
    ServerLogger.error('비디오 수정 실패:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.UPDATE_FAILED,
      message: '비디오 수정에 실패했습니다.'
    });
  }
});

module.exports = router;