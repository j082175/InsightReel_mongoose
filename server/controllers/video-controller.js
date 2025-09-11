const path = require('path');
const VideoProcessor = require('../services/VideoProcessor');
const AIAnalyzer = require('../services/AIAnalyzer');
const SheetsManager = require('../services/SheetsManager');
const ErrorHandler = require('../middleware/error-handler');
const { ServerLogger } = require('../utils/logger');
// const { FieldMapper } = require('../types/field-mapper'); // 제거됨 - 직접 필드 접근 사용

/**
 * 비디오 처리 컨트롤러
 */
class VideoController {
  constructor() {
    this.videoProcessor = new VideoProcessor();
    this.aiAnalyzer = new AIAnalyzer();
    this.sheetsManager = new SheetsManager();
    this.stats = {
      total: 0,
      today: 0,
      lastReset: new Date().toDateString()
    };
  }

  /**
   * 통계 리셋 확인
   */
  checkDateReset() {
    const today = new Date().toDateString();
    if (this.stats.lastReset !== today) {
      this.stats.today = 0;
      this.stats.lastReset = today;
    }
  }

  /**
   * 통계 조회
   */
  getStats = ErrorHandler.asyncHandler(async (req, res) => {
    this.checkDateReset();
    
    res.json({
      success: true,
      data: {
        ...this.stats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  });

  /**
   * 수동 헤더 업데이트
   */
  updateHeaders = ErrorHandler.asyncHandler(async (req, res) => {
    try {
      ServerLogger.info('🔄 수동 헤더 업데이트 요청');
      
      // 모든 플랫폼 시트의 헤더 포맷팅 강제 업데이트
      const platforms = ['Instagram', 'TikTok', 'YouTube'];
      for (const platform of platforms) {
        await this.sheetsManager.setHeadersForSheet(platform);
      }
      
      res.json({
        success: true,
        message: '모든 시트의 헤더가 업데이트되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      ServerLogger.error('헤더 업데이트 실패', error, 'VIDEO');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 헬스 체크
   */
  healthCheck = ErrorHandler.asyncHandler(async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        videoProcessor: 'ok',
        aiAnalyzer: 'unknown',
        sheetsManager: 'unknown'
      }
    };

    // AI 서비스 상태 확인
    try {
      await this.aiAnalyzer.testConnection();
      health.services.aiAnalyzer = 'ok';
    } catch (error) {
      health.services.aiAnalyzer = 'error';
    }

    // 구글 시트 서비스 상태 확인
    try {
      await this.sheetsManager.testConnection();
      health.services.sheetsManager = 'ok';
    } catch (error) {
      health.services.sheetsManager = 'error';
    }

    res.json(health);
  });


  /**
   * 구글 시트 연결 테스트
   */
  testSheets = ErrorHandler.asyncHandler(async (req, res) => {
    try {
      const result = await this.sheetsManager.testConnection();
      // 기존 API 형식 유지 (호환성)
      res.json({ 
        status: 'ok', 
        result,
        // 새 형식도 함께 제공
        success: true,
        data: result
      });
    } catch (error) {
      // 기존 에러 형식 유지
      res.status(500).json({ 
        status: 'error', 
        message: '구글 시트에 연결할 수 없습니다. API 키와 인증 설정을 확인해주세요.',
        suggestion: '구글 API 키 설정과 인증을 확인해주세요.'
      });
    }
  });

  /**
   * 비디오 처리 (URL 방식)
   */
  processVideo = (req, res) => {
    const { platform, videoUrl, postUrl, metadata, analysisType = 'quick', useAI = true } = req.body;
    
    ServerLogger.info(`Processing ${platform} video: ${postUrl}`, null, 'VIDEO');
    ServerLogger.info(`Analysis type: ${analysisType}, AI 분석: ${useAI ? '활성화' : '비활성화'}`, null, 'VIDEO');
    ServerLogger.info(`🔍 받은 파라미터 - useAI: ${useAI}, analysisType: ${analysisType}`, null, 'VIDEO');
    
    return ErrorHandler.safeApiResponse(async () => {
      const result = await this.executeVideoProcessingPipeline({
        platform,
        videoUrl,
        postUrl,
        metadata,
        analysisType,
        useAI,
        isBlob: false
      });

      this.updateStats();
      return {
        message: '비디오가 성공적으로 처리되었습니다.',
        data: result
      };
    }, req, res, 'Video Processing');
  };

  /**
   * 비디오 처리 (Blob 방식)
   */
  processVideoBlob = ErrorHandler.asyncHandler(async (req, res) => {
    const { platform, postUrl, analysisType = 'quick', useAI = true } = req.body;
    const metadata = req.body.metadata || {};
    const file = req.file;

    if (!file) {
      throw ErrorHandler.createError(
        '비디오 파일이 업로드되지 않았습니다.',
        400,
        'FILE_UPLOAD_ERROR'
      );
    }
    
    ServerLogger.info(`🎬 Processing ${platform} blob video:`, postUrl);
    ServerLogger.info(`📁 File info: ${file.filename} (${file.size} bytes)`);
    ServerLogger.info(`🔍 Analysis type: ${analysisType}, AI 분석: ${useAI ? '활성화' : '비활성화'}`);
    
    try {
      const result = await this.executeVideoProcessingPipeline({
        platform,
        videoPath: file.path,
        postUrl,
        metadata,
        analysisType,
        useAI,
        isBlob: true
      });

      this.updateStats();
      
      res.json({
        success: true,
        message: '비디오가 성공적으로 처리되었습니다.',
        data: result
      });

    } catch (error) {
      ServerLogger.error('Blob 비디오 처리 실패', error, 'VIDEO');
      throw error;
    }
  });

  /**
   * 비디오 처리 파이프라인 실행
   */
  async executeVideoProcessingPipeline({ platform, videoUrl, videoPath, postUrl, metadata, analysisType, useAI = true, isBlob }) {
    const pipeline = {
      videoPath: null,
      thumbnailPaths: null,
      analysis: null
    };

    try {
      // 1단계: 비디오 준비 및 메타데이터 수집
      let enrichedMetadata = { ...metadata };
      
      // Instagram 메타데이터 보존
      ServerLogger.info('📱 Instagram 메타데이터 수신:', {
        channelName: metadata.channelName,
        channelUrl: metadata.channelUrl,
        description: metadata.description?.substring(0, 50),
        likes: metadata.likes,
        commentsCount: metadata.commentsCount
      });
      
      if (isBlob && videoPath) {
        ServerLogger.info('1️⃣ 업로드된 비디오 사용');
        pipeline.videoPath = videoPath;
      } else if (videoUrl) {
        ServerLogger.info('1️⃣ 비디오 다운로드 중...');
        pipeline.videoPath = await this.videoProcessor.downloadVideo(videoUrl, platform);
        
        // YouTube URL인 경우 메타데이터 수집
        if (platform === 'youtube') {
          ServerLogger.info('📊 YouTube 메타데이터 수집 중...');
          try {
            const youtubeInfo = await this.videoProcessor.getYouTubeVideoInfo(postUrl);
            enrichedMetadata = {
              ...enrichedMetadata,
              channelName: youtubeInfo.channelName,
              likes: youtubeInfo.likes,
              commentsCount: youtubeInfo.commentsCount,
              views: youtubeInfo.views,
              uploadDate: youtubeInfo.uploadDate,
              duration: youtubeInfo.duration,
              contentType: youtubeInfo.contentType
            };
            ServerLogger.info(`✅ YouTube 메타데이터 수집 완료:`);
            ServerLogger.info(`👤 채널: ${enrichedMetadata.channelName}`);
            ServerLogger.info(`👍 좋아요: ${enrichedMetadata.likes}, 💬 댓글: ${enrichedMetadata.commentsCount}, 👀 조회수: ${enrichedMetadata.views}`);
            ServerLogger.info(`⏱️ 영상길이: ${enrichedMetadata.duration}초 (${enrichedMetadata.contentType})`);
            ServerLogger.info(`📅 업로드: ${enrichedMetadata.uploadDate}`);
          } catch (error) {
            ServerLogger.warn('⚠️ YouTube 메타데이터 수집 실패 (무시하고 계속):', error.message);
          }
        }
      } else {
        throw new Error('비디오 URL 또는 파일이 필요합니다');
      }
      
      // 2단계: 썸네일/프레임 생성
      if (analysisType === 'multi-frame' || analysisType === 'full') {
        ServerLogger.info('2️⃣ 다중 프레임 추출 중...');
        pipeline.thumbnailPaths = await this.videoProcessor.generateThumbnail(pipeline.videoPath, analysisType);
        ServerLogger.info(`✅ ${pipeline.thumbnailPaths.length}개 프레임 추출 완료`);
      } else {
        ServerLogger.info('2️⃣ 단일 썸네일 생성 중...');
        const singleThumbnail = await this.videoProcessor.generateThumbnail(pipeline.videoPath, analysisType);
        // 단일 프레임도 배열로 통일
        pipeline.thumbnailPaths = Array.isArray(singleThumbnail) ? singleThumbnail : [singleThumbnail];
      }
      
      // 3단계: AI 분석 (AI 토글이 꺼져있으면 생략)
      if (useAI && analysisType !== 'none') {
        if (pipeline.thumbnailPaths.length > 1) {
          ServerLogger.info(`3️⃣ 다중 프레임 AI 분석 중... (${pipeline.thumbnailPaths.length}개 프레임)`);
        } else {
          ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
        }
        pipeline.analysis = await this.aiAnalyzer.analyzeVideo(pipeline.thumbnailPaths, enrichedMetadata);
      } else {
        ServerLogger.info('3️⃣ AI 분석 건너뜀 (사용자 설정 또는 분석 타입)');
        // 기본 분석 결과 생성
        pipeline.analysis = {
          category: '분석 안함',
          mainCategory: '미분류',
          middleCategory: '기본',
          keywords: [],
          hashtags: [],
          confidence: 0,
          frameCount: pipeline.thumbnailPaths ? pipeline.thumbnailPaths.length : 1
        };
      }
      
      // 4단계: 구글 시트 저장 (선택사항)
      ServerLogger.info('4️⃣ 구글 시트 저장 중...');
      try {
        // Instagram과 YouTube 메타데이터 처리
        const processedMetadata = { ...enrichedMetadata };
        
        // Instagram 필드는 직접 접근으로 전달됨
        // processedMetadata에는 enrichedMetadata가 그대로 전달됨
        
        // Instagram 채널명이 임시 필드에 있는 경우 표준 필드로 이동
        const tempChannelName = enrichedMetadata._instagramAuthor || enrichedMetadata.instagramAuthor;
        if (tempChannelName && !processedMetadata.channelName) {
          processedMetadata.channelName = tempChannelName;
          ServerLogger.info('👤 Instagram 채널 정보 처리:', tempChannelName);
        }
        
        const sheetsResult = await this.sheetsManager.saveVideoData({
          platform,
          postUrl,
          videoPath: pipeline.videoPath,
          thumbnailPath: Array.isArray(pipeline.thumbnailPaths) ? pipeline.thumbnailPaths[0] : pipeline.thumbnailPaths,
          thumbnailPaths: pipeline.thumbnailPaths, // 모든 프레임 경로도 저장
          metadata: processedMetadata,
          analysis: pipeline.analysis,
          timestamp: new Date().toISOString()
        });
        
        if (sheetsResult.success) {
          ServerLogger.info('✅ 구글 시트 저장 완료');
        } else if (sheetsResult.partialSuccess) {
          ServerLogger.warn('⚠️ 구글 시트 저장 부분 실패하지만 계속 진행:', sheetsResult.error);
        } else {
          ServerLogger.error('❌ 구글 시트 저장 완전 실패:', sheetsResult.error);
        }
      } catch (error) {
        ServerLogger.warn('⚠️ 구글 시트 저장 실패 (무시하고 계속):', error.message, 'VIDEO');
        // 구글 시트 저장 실패는 전체 처리를 중단시키지 않음
      }
      
      ServerLogger.info('✅ 비디오 처리 파이프라인 완료');
      
      return {
        category: pipeline.analysis.category,
        mainCategory: pipeline.analysis.mainCategory,
        middleCategory: pipeline.analysis.middleCategory,
        keywords: pipeline.analysis.keywords,
        hashtags: pipeline.analysis.hashtags,
        confidence: pipeline.analysis.confidence,
        frameCount: pipeline.analysis.frameCount || 1,
        analysisType: analysisType,
        videoPath: pipeline.videoPath,
        thumbnailPath: Array.isArray(pipeline.thumbnailPaths) ? pipeline.thumbnailPaths[0] : pipeline.thumbnailPaths,
        thumbnailPaths: pipeline.thumbnailPaths
      };

    } catch (error) {
      // 파이프라인 실패 시 정리 작업
      await this.cleanupFailedPipeline(pipeline);
      throw error;
    }
  }

  /**
   * 실패한 파이프라인 정리
   */
  async cleanupFailedPipeline(pipeline) {
    try {
      const fs = require('fs');
      
      // 생성된 임시 비디오 파일 정리
      if (pipeline.videoPath) {
        if (fs.existsSync(pipeline.videoPath)) {
          fs.unlinkSync(pipeline.videoPath);
          ServerLogger.info('🧹 임시 비디오 파일 정리됨');
        }
      }
      
      // 생성된 썸네일/프레임 파일들 정리
      if (pipeline.thumbnailPaths) {
        const pathsToClean = Array.isArray(pipeline.thumbnailPaths) 
          ? pipeline.thumbnailPaths 
          : [pipeline.thumbnailPaths];
        
        for (const thumbnailPath of pathsToClean) {
          if (thumbnailPath && fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
            ServerLogger.info(`🧹 임시 썸네일 파일 정리됨: ${path.basename(thumbnailPath)}`);
          }
        }
      }
    } catch (cleanupError) {
      ServerLogger.warn('⚠️ 파이프라인 정리 중 오류:', cleanupError.message, 'VIDEO');
    }
  }

  /**
   * 통계 업데이트
   */
  updateStats() {
    this.stats.total++;
    this.stats.today++;
    ServerLogger.info(`📊 처리 통계 업데이트: 총 ${this.stats.total}개, 오늘 ${this.stats.today}개`);
  }

  /**
   * 저장된 비디오 목록 조회
   */
  getVideos = ErrorHandler.asyncHandler(async (req, res) => {
    const videos = await this.sheetsManager.getRecentVideos();
    res.json({
      success: true,
      data: videos
    });
  });

  /**
   * 자가 학습 카테고리 시스템 통계 조회
   */
  getSelfLearningStats = ErrorHandler.asyncHandler(async (req, res) => {
    try {
      const stats = this.aiAnalyzer.categoryManager.getSelfLearningStats();
      const systemStats = this.aiAnalyzer.categoryManager.getSystemStats();
      
      res.json({
        success: true,
        data: {
          selfLearning: stats,
          system: systemStats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      ServerLogger.error('자가 학습 통계 조회 실패', error, 'VIDEO');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 테스트 파일 업로드
   */
  uploadTest = ErrorHandler.asyncHandler(async (req, res) => {
    const file = req.file;
    const { useAI = true } = req.body; // AI 분석 설정 확인
    
    if (!file) {
      throw ErrorHandler.createError(
        '파일이 업로드되지 않았습니다.',
        400,
        'FILE_UPLOAD_ERROR'
      );
    }
    
    try {
      const thumbnailPath = await this.videoProcessor.generateThumbnail(file.path);
      
      let analysis = null;
      if (useAI) {
        analysis = await this.aiAnalyzer.analyzeVideo(thumbnailPath, {});
      } else {
        analysis = {
          category: '분석 안함',
          mainCategory: '미분류',
          middleCategory: '기본',
          keywords: [],
          hashtags: [],
          confidence: 0,
          frameCount: 1
        };
      }
      
      res.json({
        success: true,
        data: {
          file: {
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype
          },
          thumbnail: thumbnailPath,
          analysis
        }
      });
    } catch (error) {
      throw error;
    }
  });
}

module.exports = VideoController;