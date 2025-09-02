const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 설정 검증 먼저 실행
const { getConfig } = require('./config/config-validator');
const config = getConfig(); // 여기서 검증 실행

const VideoProcessor = require('./services/VideoProcessor');
const AIAnalyzer = require('./services/AIAnalyzer');
const SheetsManager = require('./services/SheetsManager');
const { ServerLogger } = require('./utils/logger');
const ResponseHandler = require('./utils/response-handler');
const { API_MESSAGES, ERROR_CODES } = require('./config/api-messages');
const videoQueue = require('./utils/VideoQueue');

const app = express();
const PORT = config.get('PORT');

// 미들웨어 설정
app.use(cors({
  origin: [
    'chrome-extension://*',
    'http://localhost:*',
    'https://www.instagram.com',
    'https://instagram.com',
    'https://www.tiktok.com',
    'https://tiktok.com',
    'https://www.youtube.com',
    'https://youtube.com',
    'https://youtu.be'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 정적 파일 서빙
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// 다운로드 폴더 생성
const downloadDir = path.join(__dirname, '../downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, downloadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 서비스 초기화
const videoProcessor = new VideoProcessor();
const aiAnalyzer = new AIAnalyzer();
const sheetsManager = new SheetsManager();

// 기본 통계
let stats = {
  total: 0,
  today: 0,
  lastReset: new Date().toDateString()
};

// 오늘 날짜가 바뀌면 통계 리셋
const checkDateReset = () => {
  const today = new Date().toDateString();
  if (stats.lastReset !== today) {
    stats.today = 0;
    stats.lastReset = today;
  }
};

// API 라우트

// 건강 상태 확인
app.get('/health', (req, res) => {
  ResponseHandler.health(res, {
    useGemini: process.env.USE_GEMINI === 'true',
    version: '1.0.0'
  });
});

// 통계 조회
app.get('/api/stats', (req, res) => {
  try {
    checkDateReset();
    ResponseHandler.success(res, stats, '통계 정보를 성공적으로 조회했습니다.');
  } catch (error) {
    ResponseHandler.serverError(res, error, '통계 조회 중 오류가 발생했습니다.');
  }
});

// Gemini 사용량 통계 조회
app.get('/api/gemini/usage', (req, res) => {
  try {
    const usageStats = aiAnalyzer.getGeminiUsageStats();
    ResponseHandler.success(res, usageStats, 'Gemini 사용량 통계를 성공적으로 조회했습니다.');
  } catch (error) {
    ResponseHandler.serverError(res, error, 'Gemini 사용량 통계 조회 중 오류가 발생했습니다.');
  }
});

// Gemini 헬스체크 조회
app.get('/api/gemini/health', (req, res) => {
  try {
    const healthCheck = aiAnalyzer.getGeminiHealthCheck();
    ResponseHandler.success(res, healthCheck, 'Gemini 헬스체크를 성공적으로 조회했습니다.');
  } catch (error) {
    ResponseHandler.serverError(res, error, 'Gemini 헬스체크 조회 중 오류가 발생했습니다.');
  }
});

// 구글 시트 연결 테스트
app.get('/api/test-sheets', async (req, res) => {
  try {
    const result = await sheetsManager.testConnection();
    ResponseHandler.success(res, result, API_MESSAGES.CONNECTION.SHEETS_SUCCESS);
  } catch (error) {
    ResponseHandler.serverError(res, {
      ...error,
      code: ERROR_CODES.SHEETS_CONNECTION_FAILED,
      suggestion: '구글 API 키 설정과 인증을 확인해주세요.'
    }, API_MESSAGES.CONNECTION.SHEETS_FAILED);
  }
});

// 설정 상태 확인 API
app.get('/api/config/health', (req, res) => {
  try {
    const healthStatus = config.healthCheck();
    const isHealthy = healthStatus.status === 'healthy';
    
    if (isHealthy) {
      ResponseHandler.success(res, healthStatus, API_MESSAGES.CONNECTION.CONFIG_VALID);
    } else {
      ResponseHandler.clientError(res, {
        code: ERROR_CODES.INVALID_CONFIGURATION,
        message: API_MESSAGES.CONNECTION.CONFIG_INVALID,
        details: healthStatus
      }, 422);
    }
  } catch (error) {
    ResponseHandler.serverError(res, error, '설정 상태 확인 중 오류가 발생했습니다.');
  }
});

// 비디오 처리 메인 엔드포인트
app.post('/api/process-video', async (req, res) => {
  try {
    const { platform, videoUrl, postUrl, metadata, analysisType = 'quick' } = req.body;
    
    // 큐 상태 확인 및 로깅
    const queueStatus = videoQueue.getStatus();
    ServerLogger.info(`📋 현재 큐 상태:`, queueStatus);
    
    // 큐에 작업 추가
    const result = await videoQueue.addToQueue({
      id: `url_${platform}_${Date.now()}`,
      type: 'url',
      data: { platform, videoUrl, postUrl, metadata, analysisType },
      processor: async (taskData) => {
        const { platform, videoUrl, postUrl, metadata, analysisType } = taskData;
        
        ServerLogger.info(`🎬 Processing ${platform} video:`, postUrl || videoUrl);
        ServerLogger.info(`🔍 Analysis type: ${analysisType}`);
        
        let videoPath;
        let youtubeInfo = null;
        
        // YouTube인 경우 API로 정보 수집
        if (platform === 'youtube') {
          ServerLogger.info('0️⃣ YouTube 정보 수집 중...');
          youtubeInfo = await videoProcessor.getYouTubeVideoInfo(videoUrl);
          ServerLogger.info(`📺 ${youtubeInfo.contentType} 감지: ${youtubeInfo.title}`);
          ServerLogger.info(`⏱️ 길이: ${youtubeInfo.durationFormatted}`);
          
          // YouTube는 일단 정보 수집만 (다운로드는 후단계에서)
          // 실제 비디오 다운로드 URL이 필요한 경우 여기서 처리
          videoPath = null; // 임시로 null 설정
        } else {
          // Instagram/TikTok: 기존 방식
          ServerLogger.info('1️⃣ 비디오 다운로드 중...');
          videoPath = await videoProcessor.downloadVideo(videoUrl, platform);
        }
        
        let thumbnailPaths;
        let analysis;
        
        if (platform === 'youtube') {
          // YouTube: 썸네일 URL로 AI 분석
          ServerLogger.info('1️⃣ YouTube 썸네일로 AI 분석 중...');
          
          const enrichedMetadata = { 
            ...metadata, 
            platform,
            title: youtubeInfo.title,
            description: youtubeInfo.description,
            author: youtubeInfo.channel,
            duration: youtubeInfo.duration,
            contentType: youtubeInfo.contentType,
            youtubeCategory: youtubeInfo.category
          };
          
          // YouTube 썸네일 URL을 사용하여 분석
          analysis = await aiAnalyzer.analyzeVideo(youtubeInfo.thumbnailUrl, enrichedMetadata);
          thumbnailPaths = [youtubeInfo.thumbnailUrl]; // 썸네일 URL 저장
          
        } else {
          // Instagram/TikTok: 기존 방식
          // 2단계: 썸네일/프레임 생성
          if (analysisType === 'multi-frame' || analysisType === 'full') {
            ServerLogger.info('2️⃣ 다중 프레임 추출 중...');
            thumbnailPaths = await videoProcessor.generateThumbnail(videoPath, analysisType);
            ServerLogger.info(`✅ ${thumbnailPaths.length}개 프레임 추출 완료`);
          } else {
            ServerLogger.info('2️⃣ 단일 썸네일 생성 중...');
            var singleThumbnail = await videoProcessor.generateThumbnail(videoPath, analysisType);
            thumbnailPaths = Array.isArray(singleThumbnail) ? singleThumbnail : [singleThumbnail];
          }
          
          // 3단계: AI 분석
          if (thumbnailPaths.length > 1) {
            ServerLogger.info(`3️⃣ 다중 프레임 AI 분석 중... (${thumbnailPaths.length}개 프레임)`);
          } else {
            ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
          }
          
          const enrichedMetadata = { ...metadata, platform };
          analysis = await aiAnalyzer.analyzeVideo(thumbnailPaths, enrichedMetadata);
        }
        
        // AI 분석에서 오류가 발생한 경우 시트 저장 중단
        if (analysis.aiError && analysis.aiError.occurred) {
          ServerLogger.error('❌ AI 분석 실패로 인한 처리 중단:', analysis.aiError.message);
          
          // 통계는 업데이트하지 않음
          ServerLogger.info('⚠️ AI 분석 오류로 인해 시트 저장을 건너뜁니다');
          
          return {
            processing: {
              platform,
              analysisType,
              frameCount: analysis.frameCount || 1,
              skippedSaving: true
            },
            analysis: {
              category: analysis.category,
              mainCategory: analysis.mainCategory,
              middleCategory: analysis.middleCategory,
              keywords: analysis.keywords,
              hashtags: analysis.hashtags,
              confidence: analysis.confidence
            },
            files: {
              videoPath,
              thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
              thumbnailPaths: thumbnailPaths
            },
            aiError: analysis.aiError
          };
        }
        
        // 4단계: 구글 시트 저장 (AI 분석 성공 시에만)
        ServerLogger.info('4️⃣ 구글 시트 저장 중...');
        await sheetsManager.saveVideoData({
          platform,
          postUrl,
          videoPath,
          thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
          thumbnailPaths: thumbnailPaths,
          metadata,
          analysis,
          timestamp: new Date().toISOString()
        });
        
        // 통계 업데이트
        stats.total++;
        stats.today++;
        
        ServerLogger.info('✅ 비디오 처리 완료');
        
        const responseData = {
          processing: {
            platform,
            analysisType,
            frameCount: analysis.frameCount || 1
          },
          analysis: {
            category: analysis.category,
            mainCategory: analysis.mainCategory,
            middleCategory: analysis.middleCategory,
            keywords: analysis.keywords,
            hashtags: analysis.hashtags,
            confidence: analysis.confidence
          },
          files: {
            videoPath,
            thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
            thumbnailPaths: thumbnailPaths
          }
        };

        // AI 오류 정보가 있으면 추가
        if (analysis.aiError) {
          responseData.aiError = analysis.aiError;
        }

        return responseData;
      }
    });

    ResponseHandler.success(res, result, API_MESSAGES.VIDEO.PROCESSING_SUCCESS);
    
  } catch (error) {
    ServerLogger.error('비디오 처리 실패:', error);
    ResponseHandler.serverError(res, {
      ...error,
      code: ERROR_CODES.VIDEO_PROCESSING_FAILED
    }, API_MESSAGES.VIDEO.PROCESSING_FAILED);
  }
});

// 저장된 비디오 목록 조회
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await sheetsManager.getRecentVideos();
    ResponseHandler.success(res, videos, API_MESSAGES.DATA.FETCH_SUCCESS);
  } catch (error) {
    ResponseHandler.serverError(res, {
      ...error,
      code: ERROR_CODES.DATA_FETCH_FAILED
    }, API_MESSAGES.DATA.FETCH_FAILED);
  }
});

// 큐 상태 조회 엔드포인트
app.get('/api/queue/status', async (req, res) => {
  try {
    const queueStatus = videoQueue.getStatus();
    ResponseHandler.success(res, queueStatus, '큐 상태 조회 성공');
  } catch (error) {
    ResponseHandler.serverError(res, {
      ...error,
      code: 'QUEUE_STATUS_FAILED'
    }, '큐 상태 조회 실패');
  }
});

// 자가 학습 카테고리 시스템 통계 조회
app.get('/api/self-learning/stats', async (req, res) => {
  try {
    const AIAnalyzer = require('./services/AIAnalyzer');
    const aiAnalyzer = new AIAnalyzer();
    const stats = aiAnalyzer.dynamicCategoryManager.getSelfLearningStats();
    const systemStats = aiAnalyzer.dynamicCategoryManager.getSystemStats();
    
    ResponseHandler.success(res, {
      selfLearning: stats,
      system: systemStats,
      timestamp: new Date().toISOString()
    }, '자가 학습 통계 조회 성공');
  } catch (error) {
    ServerLogger.error('자가 학습 통계 조회 실패', error);
    ResponseHandler.serverError(res, {
      ...error,
      code: 'SELF_LEARNING_STATS_FAILED'
    }, '자가 학습 통계 조회에 실패했습니다.');
  }
});

// 파일 업로드 (테스트용)
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return ResponseHandler.clientError(res, {
        code: ERROR_CODES.FILE_NOT_FOUND,
        message: API_MESSAGES.VIDEO.FILE_NOT_UPLOADED
      }, 400);
    }
    
    const thumbnailPath = await videoProcessor.generateThumbnail(req.file.path);
    const analysis = await aiAnalyzer.analyzeVideo(thumbnailPath, {});
    
    const responseData = {
      file: {
        name: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      thumbnail: thumbnailPath,
      analysis
    };

    ResponseHandler.success(res, responseData, API_MESSAGES.FILE.UPLOAD_SUCCESS);
  } catch (error) {
    ResponseHandler.serverError(res, {
      ...error,
      code: ERROR_CODES.FILE_UPLOAD_FAILED
    }, API_MESSAGES.FILE.UPLOAD_FAILED);
  }
});

// blob 비디오 처리 엔드포인트
app.post('/api/process-video-blob', upload.single('video'), async (req, res) => {
  try {
    const { platform, postUrl, analysisType = 'quick' } = req.body;
    const metadata = JSON.parse(req.body.metadata || '{}');
    
    ServerLogger.info(`🎬 Processing ${platform} blob video from:`, postUrl);
    ServerLogger.info(`📁 Uploaded file: ${req.file ? `${req.file.filename} (${req.file.size} bytes)` : 'None'}`);
    ServerLogger.info(`🔍 Analysis type: ${analysisType}`);
    
    if (!req.file) {
      return ResponseHandler.clientError(res, {
        code: ERROR_CODES.FILE_NOT_FOUND,
        message: API_MESSAGES.VIDEO.FILE_NOT_UPLOADED
      }, 400);
    }
    
    const videoPath = req.file.path;
    
    // 큐 상태 확인 및 로깅
    const queueStatus = videoQueue.getStatus();
    ServerLogger.info(`📋 현재 큐 상태:`, queueStatus);
    
    // 큐에 작업 추가
    const result = await videoQueue.addToQueue({
      id: `blob_${platform}_${Date.now()}`,
      type: 'blob',
      data: { platform, postUrl, analysisType, metadata, videoPath },
      processor: async (taskData) => {
        const { platform, postUrl, analysisType, metadata, videoPath } = taskData;
        
        // 2단계: 썸네일/프레임 생성
        if (analysisType === 'multi-frame' || analysisType === 'full') {
          ServerLogger.info('2️⃣ 다중 프레임 추출 중...');
          var thumbnailPaths = await videoProcessor.generateThumbnail(videoPath, analysisType);
          ServerLogger.info(`✅ ${thumbnailPaths.length}개 프레임 추출 완료`);
        } else {
          ServerLogger.info('2️⃣ 단일 썸네일 생성 중...');
          var singleThumbnail = await videoProcessor.generateThumbnail(videoPath, analysisType);
          var thumbnailPaths = Array.isArray(singleThumbnail) ? singleThumbnail : [singleThumbnail];
        }
        
        // 3단계: AI 분석 (먼저 실행)
        if (thumbnailPaths.length > 1) {
          ServerLogger.info(`3️⃣ 다중 프레임 AI 분석 중... (${thumbnailPaths.length}개 프레임)`);
        } else {
          ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
        }
        // metadata에 platform 정보 추가
        const enrichedMetadata = { ...metadata, platform };
        const analysis = await aiAnalyzer.analyzeVideo(thumbnailPaths, enrichedMetadata);
        
        // AI 분석에서 오류가 발생한 경우 시트 저장 중단
        if (analysis.aiError && analysis.aiError.occurred) {
          ServerLogger.error('❌ AI 분석 실패로 인한 처리 중단:', analysis.aiError.message);
          
          // 통계는 업데이트하지 않음
          ServerLogger.info('⚠️ AI 분석 오류로 인해 시트 저장을 건너뜁니다');
          
          return {
            processing: {
              platform,
              analysisType,
              frameCount: analysis.frameCount || 1,
              skippedSaving: true,
              source: 'blob-upload'
            },
            analysis: {
              category: analysis.category,
              mainCategory: analysis.mainCategory,
              middleCategory: analysis.middleCategory,
              keywords: analysis.keywords,
              hashtags: analysis.hashtags,
              confidence: analysis.confidence
            },
            files: {
              videoPath,
              thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
              thumbnailPaths: thumbnailPaths
            },
            aiError: analysis.aiError
          };
        }
        
        // 4단계: 구글 시트 저장 (AI 분석 성공 시에만)
        ServerLogger.info('4️⃣ 구글 시트 저장 중...');
        await sheetsManager.saveVideoData({
          platform,
          postUrl,
          videoPath,
          thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
          thumbnailPaths: thumbnailPaths,
          metadata,
          analysis,
          timestamp: new Date().toISOString()
        });
        
        // 통계 업데이트
        stats.total++;
        stats.today++;
        
        ServerLogger.info('✅ blob 비디오 처리 완료');
        
        const responseData = {
          processing: {
            platform,
            analysisType,
            frameCount: analysis.frameCount || 1,
            source: 'blob-upload'
          },
          analysis: {
            category: analysis.category,
            mainCategory: analysis.mainCategory,
            middleCategory: analysis.middleCategory,
            keywords: analysis.keywords,
            hashtags: analysis.hashtags,
            confidence: analysis.confidence
          },
          files: {
            videoPath,
            thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
            thumbnailPaths: thumbnailPaths
          }
        };

        // AI 오류 정보가 있으면 추가
        if (analysis.aiError) {
          responseData.aiError = analysis.aiError;
        }

        return responseData;
      }
    });

    ResponseHandler.success(res, result, API_MESSAGES.VIDEO.PROCESSING_SUCCESS);
    
  } catch (error) {
    ServerLogger.error('blob 비디오 처리 실패:', error);
    ResponseHandler.serverError(res, {
      ...error,
      code: ERROR_CODES.VIDEO_PROCESSING_FAILED
    }, API_MESSAGES.VIDEO.PROCESSING_FAILED);
  }
});

// 에러 핸들러
app.use((err, req, res, next) => {
  ServerLogger.error('서버 에러:', err);
  ResponseHandler.serverError(res, {
    ...err,
    code: ERROR_CODES.INTERNAL_SERVER_ERROR
  }, API_MESSAGES.COMMON.INTERNAL_ERROR);
});

// 404 핸들러
app.use((req, res) => {
  ResponseHandler.notFound(res, `경로 '${req.path}'를 찾을 수 없습니다.`);
});

// 서버 시작
app.listen(PORT, () => {
  ServerLogger.info(`
🎬 영상 자동저장 분석기 서버 실행중
📍 포트: ${PORT}
🌐 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health

📋 설정 체크리스트:
[ ] Gemini API 키 설정 (.env 파일)
[ ] Chrome 확장프로그램 로드

💡 테스트 URL:
- 구글 시트 테스트: http://localhost:${PORT}/api/test-sheets
- 설정 상태 확인: http://localhost:${PORT}/api/config/health
  `);
});