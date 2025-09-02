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
const youtubeBatchProcessor = require('./services/YouTubeBatchProcessor');
const ChannelTrendingCollector = require('./services/ChannelTrendingCollector');
const { ServerLogger } = require('./utils/logger');
const ResponseHandler = require('./utils/response-handler');
const { API_MESSAGES, ERROR_CODES } = require('./config/api-messages');
const videoQueue = require('./utils/VideoQueue');

const app = express();
const PORT = config.get('PORT');

// 매우 초기 디버그 API 추가
app.get('/api/debug-very-early', (req, res) => {
  res.json({ success: true, message: '🔍 VERY EARLY DEBUG: 라인 25 실행됨!' });
});
ServerLogger.info('🔍 VERY EARLY DEBUG: Express 앱 생성 후 즉시 API 등록');

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

// 서비스 초기화 전 디버그
app.get('/api/debug-before-services', (req, res) => {
  res.json({ success: true, message: '🔧 BEFORE SERVICES: 서비스 초기화 전 실행됨!' });
});
ServerLogger.info('🔧 BEFORE SERVICES DEBUG: 서비스 초기화 전');

// 서비스 초기화
const videoProcessor = new VideoProcessor();
const aiAnalyzer = new AIAnalyzer();
const sheetsManager = new SheetsManager();

// 서비스 초기화 후 디버그
app.get('/api/debug-after-services', (req, res) => {
  res.json({ success: true, message: '✅ AFTER SERVICES: 기본 서비스 초기화 완료!' });
});
ServerLogger.info('✅ AFTER SERVICES DEBUG: 기본 서비스 초기화 완료');

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
    const { platform, videoUrl, postUrl, metadata, analysisType = 'quick', useAI = true, mode = 'immediate' } = req.body;
    
    // 🆕 YouTube 배치 모드 처리
    if (platform === 'youtube' && mode === 'batch') {
      try {
        const options = {
          priority: req.body.priority || 'normal',
          clientInfo: {
            userAgent: req.get('User-Agent'),
            requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
          },
          metadata: metadata || {}
        };

        const batchResult = await youtubeBatchProcessor.addToBatch(videoUrl, options);
        
        ServerLogger.info(`📦 YouTube 배치 모드: 큐에 추가됨`, {
          batchId: batchResult.batchId,
          queuePosition: batchResult.queuePosition,
          estimatedWaitTime: batchResult.estimatedWaitTime
        });

        return res.json({
          success: true,
          message: '배치 큐에 추가되었습니다',
          data: {
            mode: 'batch',
            ...batchResult,
            apiSaving: '개별 호출 대비 97% 쿼터 절약',
            estimatedProcessTime: '최대 60초 또는 50개 모일 때까지 대기'
          }
        });
      } catch (error) {
        ServerLogger.error('배치 모드 처리 실패:', error);
        // 배치 실패 시 즉시 처리로 폴백
        ServerLogger.info('🔄 배치 실패 - 즉시 처리 모드로 전환');
      }
    }
    
    // 큐 상태 확인 및 로깅
    const queueStatus = videoQueue.getStatus();
    ServerLogger.info(`📋 현재 큐 상태:`, queueStatus);
    
    // 큐에 작업 추가
    const result = await videoQueue.addToQueue({
      id: `url_${platform}_${Date.now()}`,
      type: 'url',
      data: { platform, videoUrl, postUrl, metadata, analysisType, useAI },
      processor: async (taskData) => {
        const { platform, videoUrl, postUrl, metadata, analysisType, useAI } = taskData;
        
        ServerLogger.info(`🎬 Processing ${platform} video:`, postUrl || videoUrl);
        ServerLogger.info(`🔍 Analysis type: ${analysisType}, AI 분석: ${useAI ? '활성화' : '비활성화'}`);
        
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
          // YouTube 정보를 원본 metadata에 병합 (시트 저장용)
          Object.assign(metadata, {
            title: youtubeInfo.title,
            description: youtubeInfo.description,
            author: youtubeInfo.channel,
            likes: youtubeInfo.likes || 0,
            comments: youtubeInfo.comments || 0,
            views: youtubeInfo.views || 0,
            duration: youtubeInfo.duration,
            durationFormatted: youtubeInfo.durationFormatted,
            uploadDate: youtubeInfo.publishedAt,
            contentType: youtubeInfo.contentType,
            youtubeCategory: youtubeInfo.category,
            // YouTube 추가 정보
            subscribers: youtubeInfo.subscribers || '0',
            channelVideos: youtubeInfo.channelVideos || '0',
            monetized: youtubeInfo.monetized || 'N',
            categoryId: youtubeInfo.categoryId || '',
            license: youtubeInfo.license || 'youtube',
            definition: youtubeInfo.definition || 'sd',
            language: youtubeInfo.language || '',
            ageRestricted: youtubeInfo.ageRestricted || 'N',
            liveBroadcast: youtubeInfo.liveBroadcast || 'none'
          });
          
          const enrichedMetadata = { 
            ...metadata, 
            platform
          };
          
          thumbnailPaths = [youtubeInfo.thumbnailUrl]; // 썸네일 URL 저장
          
          // AI 분석 조건부 실행
          if (useAI && analysisType !== 'none') {
            ServerLogger.info('1️⃣ YouTube 썸네일로 AI 분석 중...');
            analysis = await aiAnalyzer.analyzeVideo(youtubeInfo.thumbnailUrl, enrichedMetadata);
            
            // YouTube 카테고리와 AI 카테고리 일치율 비교
            if (youtubeInfo.category && analysis.mainCategory) {
              const matchResult = videoProcessor.compareCategories(
                youtubeInfo.category,
                analysis.mainCategory,
                analysis.middleCategory,
                analysis.fullCategoryPath
              );
              
              // 분석 결과에 일치율 정보 추가
              analysis.categoryMatch = matchResult;
              
              ServerLogger.info(`📊 카테고리 일치율: ${matchResult.matchScore}% (${matchResult.matchType})`);
              ServerLogger.info(`📋 일치 사유: ${matchResult.matchReason}`);
            }
          } else {
            ServerLogger.info('1️⃣ AI 분석 건너뜀 (사용자 설정)');
            analysis = {
              category: '분석 안함',
              mainCategory: '미분류',
              middleCategory: '기본',
              keywords: [],
              hashtags: [],
              confidence: 0,
              frameCount: 1,
              categoryMatch: null
            };
          }
          
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
          
          // 3단계: AI 분석 (조건부 실행)
          const enrichedMetadata = { ...metadata, platform };
          
          if (useAI && analysisType !== 'none') {
            if (thumbnailPaths.length > 1) {
              ServerLogger.info(`3️⃣ 다중 프레임 AI 분석 중... (${thumbnailPaths.length}개 프레임)`);
            } else {
              ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
            }
            analysis = await aiAnalyzer.analyzeVideo(thumbnailPaths, enrichedMetadata);
          } else {
            ServerLogger.info('3️⃣ AI 분석 건너뜀 (사용자 설정)');
            analysis = {
              category: '분석 안함',
              mainCategory: '미분류',
              middleCategory: '기본',
              keywords: [],
              hashtags: [],
              confidence: 0,
              frameCount: thumbnailPaths.length
            };
          }
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
    const { platform, postUrl, analysisType = 'quick', useAI = true } = req.body;
    const metadata = JSON.parse(req.body.metadata || '{}');
    
    ServerLogger.info(`🎬 Processing ${platform} blob video from:`, postUrl);
    ServerLogger.info(`📁 Uploaded file: ${req.file ? `${req.file.filename} (${req.file.size} bytes)` : 'None'}`);
    ServerLogger.info(`🔍 Analysis type: ${analysisType}, AI 분석: ${useAI ? '활성화' : '비활성화'}`);
    
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
      data: { platform, postUrl, analysisType, metadata, videoPath, useAI },
      processor: async (taskData) => {
        const { platform, postUrl, analysisType, metadata, videoPath, useAI } = taskData;
        
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
        
        // 3단계: AI 분석 (조건부 실행)
        const enrichedMetadata = { ...metadata, platform };
        let analysis;
        
        if (useAI && analysisType !== 'none') {
          if (thumbnailPaths.length > 1) {
            ServerLogger.info(`3️⃣ 다중 프레임 AI 분석 중... (${thumbnailPaths.length}개 프레임)`);
          } else {
            ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
          }
          analysis = await aiAnalyzer.analyzeVideo(thumbnailPaths, enrichedMetadata);
        } else {
          ServerLogger.info('3️⃣ AI 분석 건너뜀 (사용자 설정)');
          analysis = {
            category: '분석 안함',
            mainCategory: '미분류',
            middleCategory: '기본',
            keywords: [],
            hashtags: [],
            confidence: 0,
            frameCount: thumbnailPaths.length
          };
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

// 404 핸들러는 맨 마지막에 이동

// YouTube 배치 처리 API 엔드포인트
app.post('/api/youtube-batch', async (req, res) => {
  try {
    const { videoUrl, mode = 'batch', priority = 'normal' } = req.body;

    if (!videoUrl) {
      return ResponseHandler.badRequest(res, '비디오 URL이 필요합니다.');
    }

    const options = {
      priority,
      clientInfo: {
        userAgent: req.get('User-Agent'),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      },
      metadata: req.body.metadata || {}
    };

    if (mode === 'immediate') {
      // 강제 즉시 처리
      const result = await youtubeBatchProcessor.forceProcess();
      return res.json({
        success: true,
        message: '배치 강제 처리 완료',
        data: result
      });
    } else {
      // 배치 큐에 추가
      const result = await youtubeBatchProcessor.addToBatch(videoUrl, options);
      return res.json({
        success: true,
        message: '배치 큐에 추가됨',
        data: result
      });
    }

  } catch (error) {
    ServerLogger.error('YouTube 배치 처리 API 오류:', error);
    return ResponseHandler.error(res, error, 'YouTube 배치 처리 실패');
  }
});

// 배치 상태 조회 API
app.get('/api/youtube-batch/status', (req, res) => {
  try {
    const status = youtubeBatchProcessor.getStatus();
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    ServerLogger.error('배치 상태 조회 실패:', error);
    return ResponseHandler.error(res, error, '배치 상태 조회 실패');
  }
});

// 배치 강제 처리 API
app.post('/api/youtube-batch/force-process', async (req, res) => {
  try {
    const result = await youtubeBatchProcessor.forceProcess();
    return res.json({
      success: true,
      message: '강제 처리 완료',
      data: result
    });
  } catch (error) {
    ServerLogger.error('배치 강제 처리 실패:', error);
    return ResponseHandler.error(res, error, '배치 강제 처리 실패');
  }
});

// 배치 큐 비우기 API
app.delete('/api/youtube-batch/clear', async (req, res) => {
  try {
    const result = await youtubeBatchProcessor.clearQueue();
    return res.json({
      success: true,
      message: '배치 큐 비우기 완료',
      data: result
    });
  } catch (error) {
    ServerLogger.error('배치 큐 비우기 실패:', error);
    return ResponseHandler.error(res, error, '배치 큐 비우기 실패');
  }
});

// 임시 테스트 API - 500번대 라인으로 이동해서 테스트
app.get('/api/test-early', (req, res) => {
  res.json({ success: true, message: 'EARLY DEBUG: 500번대 라인 실행됨!' });
});
ServerLogger.info('🧪 EARLY DEBUG: 500번대 라인에서 API 등록');

// 임시 테스트 API (먼저 추가해서 여기까지 실행되는지 확인)
app.get('/api/test-debug', (req, res) => {
  res.json({ 
    success: true, 
    message: 'DEBUG: 코드가 여기까지 실행됨!',
    timestamp: new Date().toISOString()
  });
});

ServerLogger.info('🧪 DEBUG: /api/test-debug API 등록 완료');

// 채널 트렌딩 수집 API
let channelTrendingCollector;
try {
  channelTrendingCollector = new ChannelTrendingCollector();
  ServerLogger.info('✅ ChannelTrendingCollector 초기화 성공');
} catch (error) {
  ServerLogger.error('❌ ChannelTrendingCollector 초기화 실패:', error);
  channelTrendingCollector = null;
}

// ChannelTrendingCollector 초기화 확인 API
app.get('/api/debug-collector', (req, res) => {
  res.json({ 
    success: true, 
    message: 'ChannelTrendingCollector 초기화 체크 완료',
    initialized: !!channelTrendingCollector,
    timestamp: new Date().toISOString()
  });
});
ServerLogger.info('🧪 DEBUG: ChannelTrendingCollector 초기화 체크 API 등록');

// collect-trending GET API 등록 전 디버그
app.get('/api/debug-before-collect-get', (req, res) => {
  res.json({ success: true, message: 'collect-trending GET 등록 직전!' });
});

// 채널별 트렌딩 영상 수집 시작 (GET은 안내용, POST는 실제 처리)
app.get('/api/collect-trending', (req, res) => {
  res.json({
    success: true,
    message: 'ChannelTrendingCollector API 정상 작동중',
    usage: {
      method: 'POST',
      endpoint: '/api/collect-trending',
      body: {
        channelIds: ['UCChannelId1', 'UCChannelId2'],
        options: {
          daysBack: 3,
          minViewCount: 50000,
          maxResults: 10
        }
      }
    },
    initialized: !!channelTrendingCollector
  });
});

// collect-trending GET API 등록 후 디버그
app.get('/api/debug-after-collect-get', (req, res) => {
  res.json({ success: true, message: 'collect-trending GET 등록 완료!' });
});

app.post('/api/collect-trending', async (req, res) => {
  if (!channelTrendingCollector) {
    return ResponseHandler.serverError(res, 
      new Error('ChannelTrendingCollector가 초기화되지 않았습니다'), 
      'ChannelTrendingCollector 초기화 오류');
  }
  
  try {
    const { channelIds, options = {} } = req.body;
    
    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      return ResponseHandler.badRequest(res, {
        code: 'MISSING_CHANNELS',
        message: '채널 ID 배열이 필요합니다.',
        details: { example: ['UCChannelId1', 'UCChannelId2'] }
      });
    }

    ServerLogger.info(`📊 트렌딩 수집 요청: ${channelIds.length}개 채널`, {
      channels: channelIds.slice(0, 3).map(id => `${id.substring(0, 10)}...`),
      options
    });

    const results = await channelTrendingCollector.collectFromChannels(channelIds, options);
    
    ResponseHandler.success(res, results, '채널 트렌딩 수집이 완료되었습니다.');
    
  } catch (error) {
    ServerLogger.error('트렌딩 수집 실패:', error);
    ResponseHandler.serverError(res, error, '트렌딩 수집 중 오류가 발생했습니다.');
  }
});

// collect-trending API 등록 확인
app.get('/api/debug-after-collect', (req, res) => {
  res.json({ 
    success: true, 
    message: 'collect-trending API 등록 이후 실행됨!',
    timestamp: new Date().toISOString()
  });
});
ServerLogger.info('🧪 DEBUG: collect-trending API 등록 후 체크');

// API quota 현황 조회
app.get('/api/quota-status', (req, res) => {
  if (!channelTrendingCollector) {
    return ResponseHandler.serverError(res, 
      new Error('ChannelTrendingCollector가 초기화되지 않았습니다'), 
      'ChannelTrendingCollector 초기화 오류');
  }
  
  try {
    const quotaStatus = channelTrendingCollector.getQuotaStatus();
    
    ResponseHandler.success(res, {
      quota: quotaStatus,
      timestamp: new Date().toISOString(),
      recommendations: {
        canProcess: quotaStatus.remaining > 200,
        estimatedChannels: Math.floor(quotaStatus.remaining / 101),
        resetTime: '매일 자정 (한국 시간)'
      }
    }, 'API quota 현황을 조회했습니다.');
    
  } catch (error) {
    ResponseHandler.serverError(res, error, 'Quota 상태 조회 중 오류가 발생했습니다.');
  }
});

// 트렌딩 수집 통계 조회
app.get('/api/trending-stats', async (req, res) => {
  try {
    const stats = await channelTrendingCollector.getStats();
    
    const summary = stats.length > 0 ? {
      totalCollections: stats.length,
      lastCollection: stats[stats.length - 1],
      avgTrendingRate: (stats.reduce((sum, s) => sum + parseFloat(s.trendingRate || 0), 0) / stats.length).toFixed(1),
      totalQuotaUsed: stats.reduce((sum, s) => sum + (s.quotaUsed || 0), 0),
      totalTrendingVideos: stats.reduce((sum, s) => sum + (s.trendingVideos || 0), 0)
    } : null;
    
    ResponseHandler.success(res, {
      stats,
      summary,
      timestamp: new Date().toISOString()
    }, '트렌딩 수집 통계를 조회했습니다.');
    
  } catch (error) {
    ResponseHandler.serverError(res, error, '통계 조회 중 오류가 발생했습니다.');
  }
});

// 404 핸들러 (모든 라우트 등록 후 마지막에)
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