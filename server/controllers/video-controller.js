const VideoProcessor = require('../services/VideoProcessor');
const AIAnalyzer = require('../services/AIAnalyzer');
const SheetsManager = require('../services/SheetsManager');
const ErrorHandler = require('../middleware/error-handler');

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
      console.log('🔄 수동 헤더 업데이트 요청');
      await this.sheetsManager.ensureUpdatedHeaders();
      
      res.json({
        success: true,
        message: '스프레드시트 헤더가 업데이트되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ 헤더 업데이트 실패:', error);
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
   * Ollama 연결 테스트
   */
  testOllama = ErrorHandler.asyncHandler(async (req, res) => {
    try {
      const result = await this.aiAnalyzer.testConnection();
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
        message: 'Ollama 서버에 연결할 수 없습니다. `ollama serve` 명령으로 서버를 시작해주세요.',
        suggestion: 'Ollama가 설치되고 실행 중인지 확인해주세요. `ollama serve` 명령으로 실행할 수 있습니다.'
      });
    }
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
  processVideo = ErrorHandler.asyncHandler(async (req, res) => {
    const { platform, videoUrl, postUrl, metadata, analysisType = 'quick' } = req.body;
    
    console.log(`🎬 Processing ${platform} video:`, postUrl);
    console.log(`🔍 Analysis type: ${analysisType}`);
    console.log(`📋 Request body keys:`, Object.keys(req.body));
    console.log(`📋 Full request body:`, JSON.stringify(req.body, null, 2));
    
    try {
      const result = await this.executeVideoProcessingPipeline({
        platform,
        videoUrl,
        postUrl,
        metadata,
        analysisType,
        isBlob: false
      });

      this.updateStats();
      
      res.json({
        success: true,
        message: '비디오가 성공적으로 처리되었습니다.',
        data: result
      });

    } catch (error) {
      console.error('❌ 비디오 처리 실패:', error);
      
      // 구체적인 에러 타입별 처리
      if (error.message.includes('다운로드')) {
        throw ErrorHandler.createError(
          '비디오 다운로드에 실패했습니다. URL을 확인해주세요.',
          400,
          'VIDEO_DOWNLOAD_ERROR'
        );
      } else if (error.message.includes('썸네일')) {
        throw ErrorHandler.createError(
          '썸네일 생성에 실패했습니다. 비디오 파일을 확인해주세요.',
          500,
          'THUMBNAIL_GENERATION_ERROR'
        );
      } else if (error.message.includes('분석')) {
        throw ErrorHandler.createError(
          'AI 분석에 실패했습니다. Ollama 서버 상태를 확인해주세요.',
          500,
          'AI_ANALYSIS_ERROR'
        );
      } else if (error.message.includes('시트')) {
        throw ErrorHandler.createError(
          '구글 시트 저장에 실패했습니다. 권한을 확인해주세요.',
          500,
          'SHEETS_SAVE_ERROR'
        );
      }
      
      throw error;
    }
  });

  /**
   * 비디오 처리 (Blob 방식)
   */
  processVideoBlob = ErrorHandler.asyncHandler(async (req, res) => {
    const { platform, postUrl, analysisType = 'quick' } = req.body;
    const metadata = req.body.metadata || {};
    const file = req.file;

    if (!file) {
      throw ErrorHandler.createError(
        '비디오 파일이 업로드되지 않았습니다.',
        400,
        'FILE_UPLOAD_ERROR'
      );
    }
    
    console.log(`🎬 Processing ${platform} blob video:`, postUrl);
    console.log(`📁 File info: ${file.filename} (${file.size} bytes)`);
    console.log(`🔍 Analysis type: ${analysisType}`);
    
    try {
      const result = await this.executeVideoProcessingPipeline({
        platform,
        videoPath: file.path,
        postUrl,
        metadata,
        analysisType,
        isBlob: true
      });

      this.updateStats();
      
      res.json({
        success: true,
        message: '비디오가 성공적으로 처리되었습니다.',
        data: result
      });

    } catch (error) {
      console.error('❌ Blob 비디오 처리 실패:', error);
      throw error;
    }
  });

  /**
   * 비디오 처리 파이프라인 실행
   */
  async executeVideoProcessingPipeline({ platform, videoUrl, videoPath, postUrl, metadata, analysisType, isBlob }) {
    const pipeline = {
      videoPath: null,
      thumbnailPaths: null,
      analysis: null
    };

    try {
      // 1단계: 비디오 준비
      if (isBlob && videoPath) {
        console.log('1️⃣ 업로드된 비디오 사용');
        pipeline.videoPath = videoPath;
      } else if (videoUrl) {
        console.log('1️⃣ 비디오 다운로드 중...');
        pipeline.videoPath = await this.videoProcessor.downloadVideo(videoUrl, platform);
      } else {
        throw new Error('비디오 URL 또는 파일이 필요합니다');
      }
      
      // 2단계: 썸네일/프레임 생성
      if (analysisType === 'multi-frame' || analysisType === 'full') {
        console.log('2️⃣ 다중 프레임 추출 중...');
        pipeline.thumbnailPaths = await this.videoProcessor.generateThumbnail(pipeline.videoPath, analysisType);
        console.log(`✅ ${pipeline.thumbnailPaths.length}개 프레임 추출 완료`);
      } else {
        console.log('2️⃣ 단일 썸네일 생성 중...');
        const singleThumbnail = await this.videoProcessor.generateThumbnail(pipeline.videoPath, analysisType);
        // 단일 프레임도 배열로 통일
        pipeline.thumbnailPaths = Array.isArray(singleThumbnail) ? singleThumbnail : [singleThumbnail];
      }
      
      // 3단계: AI 분석
      if (pipeline.thumbnailPaths.length > 1) {
        console.log(`3️⃣ 다중 프레임 AI 분석 중... (${pipeline.thumbnailPaths.length}개 프레임)`);
      } else {
        console.log('3️⃣ 단일 프레임 AI 분석 중...');
      }
      pipeline.analysis = await this.aiAnalyzer.analyzeVideo(pipeline.thumbnailPaths, metadata);
      
      // 4단계: 구글 시트 저장 (선택사항)
      console.log('4️⃣ 구글 시트 저장 중...');
      try {
        await this.sheetsManager.saveVideoData({
          platform,
          postUrl,
          videoPath: pipeline.videoPath,
          thumbnailPath: Array.isArray(pipeline.thumbnailPaths) ? pipeline.thumbnailPaths[0] : pipeline.thumbnailPaths,
          thumbnailPaths: pipeline.thumbnailPaths, // 모든 프레임 경로도 저장
          metadata,
          analysis: pipeline.analysis,
          timestamp: new Date().toISOString()
        });
        console.log('✅ 구글 시트 저장 완료');
      } catch (error) {
        console.warn('⚠️ 구글 시트 저장 실패 (무시하고 계속):', error.message);
        // 구글 시트 저장 실패는 전체 처리를 중단시키지 않음
      }
      
      console.log('✅ 비디오 처리 파이프라인 완료');
      
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
          console.log('🧹 임시 비디오 파일 정리됨');
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
            console.log(`🧹 임시 썸네일 파일 정리됨: ${path.basename(thumbnailPath)}`);
          }
        }
      }
    } catch (cleanupError) {
      console.warn('⚠️ 파이프라인 정리 중 오류:', cleanupError.message);
    }
  }

  /**
   * 통계 업데이트
   */
  updateStats() {
    this.stats.total++;
    this.stats.today++;
    console.log(`📊 처리 통계 업데이트: 총 ${this.stats.total}개, 오늘 ${this.stats.today}개`);
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
   * 테스트 파일 업로드
   */
  uploadTest = ErrorHandler.asyncHandler(async (req, res) => {
    const file = req.file;
    
    if (!file) {
      throw ErrorHandler.createError(
        '파일이 업로드되지 않았습니다.',
        400,
        'FILE_UPLOAD_ERROR'
      );
    }
    
    try {
      const thumbnailPath = await this.videoProcessor.generateThumbnail(file.path);
      const analysis = await this.aiAnalyzer.analyzeVideo(thumbnailPath, {});
      
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