const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 설정 검증 먼저 실행
const { getConfig } = require('./config/config-validator');
const config = getConfig(); // 여기서 검증 실행

// DatabaseManager는 다른 API에서 사용되므로 일단 유지
const DatabaseManager = require('./config/database');
// 간단한 채널 분석에서는 직접 사용하지 않지만 다른 API에서 필요
// const Video = require('./models/Video');
// const VideoUrl = require('./models/VideoUrl');

const VideoProcessor = require('./services/VideoProcessor');
const AIAnalyzer = require('./services/AIAnalyzer');
const SheetsManager = require('./services/SheetsManager');
const UnifiedVideoSaver = require('./services/UnifiedVideoSaver');
// const youtubeBatchProcessor = require('./services/YouTubeBatchProcessor');
const HighViewCollector = require('./services/HighViewCollector');
const YouTubeChannelDataCollector = require('./services/YouTubeChannelDataCollector');
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
  origin: function (origin, callback) {
    // 모든 origin 허용 (개발 환경)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 정적 파일 서빙
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// 🎯 클러스터 시스템 초기화
try {
  const { initializeClusterSystem } = require('./features/cluster');
  initializeClusterSystem(app);
  ServerLogger.success('✅ 클러스터 시스템 초기화 완료');
} catch (error) {
  ServerLogger.error('❌ 클러스터 시스템 초기화 실패:', error);
}

// 다운로드 폴더 생성
const downloadDir = path.join(__dirname, '../downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

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

// 간단한 채널 분석에 필요한 서비스만 초기화
const sheetsManager = new SheetsManager();
// Blob 처리 API를 위해 필요한 서비스들 추가
const videoProcessor = new VideoProcessor();
const aiAnalyzer = new AIAnalyzer();
const unifiedVideoSaver = new UnifiedVideoSaver(sheetsManager, aiAnalyzer);

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
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await DatabaseManager.healthCheck();
    ResponseHandler.health(res, {
      useGemini: process.env.USE_GEMINI === 'true',
      useMongoDB: process.env.USE_MONGODB === 'true',
      database: dbStatus,
      version: '1.0.0'
    });
  } catch (error) {
    ResponseHandler.health(res, {
      useGemini: process.env.USE_GEMINI === 'true',
      useMongoDB: process.env.USE_MONGODB === 'true',
      database: { status: 'error', message: error.message },
      version: '1.0.0'
    });
  }
});

// 🗄️ MongoDB 전용 헬스 체크
app.get('/api/database/health', async (req, res) => {
  try {
    const healthCheck = await DatabaseManager.healthCheck();
    const connectionStatus = DatabaseManager.isConnectedStatus();
    
    res.json({
      success: true,
      database: {
        type: 'MongoDB Atlas',
        ...healthCheck,
        connection: connectionStatus
      },
      message: '데이터베이스 상태 확인 완료'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      database: {
        type: 'MongoDB Atlas',
        status: 'error'
      },
      message: '데이터베이스 연결 확인 실패'
    });
  }
});

// 🧪 MongoDB 테스트 API들
app.get('/api/database/test', async (req, res) => {
  try {
    // 1. 테스트 비디오 데이터 생성
    const testVideo = new Video({
      platform: 'youtube',
      timestamp: new Date(),
      account: 'TestChannel',
      title: 'MongoDB 연결 테스트 비디오',
      comments: 'https://www.youtube.com/watch?v=test123',
      likes: 100,
      views: 1000,
      category: 'Technology',
      ai_description: 'MongoDB Atlas 연결 테스트용 비디오입니다'
    });

    // 2. 데이터베이스에 저장
    const saved = await testVideo.save();
    
    // 3. 저장된 데이터 조회
    const found = await Video.findById(saved._id);
    
    // 4. 테스트 데이터 삭제 (정리)
    await Video.findByIdAndDelete(saved._id);
    
    res.json({
      success: true,
      message: 'MongoDB CRUD 테스트 성공!',
      test_results: {
        created: !!saved,
        found: !!found,
        deleted: true,
        document_id: saved._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'MongoDB 테스트 실패'
    });
  }
});

// 📊 컬렉션 상태 확인
app.get('/api/database/collections', async (req, res) => {
  try {
    const db = DatabaseManager.connection.connection.db;
    const collections = await db.listCollections().toArray();
    const stats = {};
    
    for (const collection of collections) {
      const collectionStats = await db.collection(collection.name).countDocuments();
      stats[collection.name] = collectionStats;
    }
    
    res.json({
      success: true,
      database: 'videos',
      collections: stats,
      message: '컬렉션 상태 조회 완료'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '컬렉션 상태 조회 실패'
    });
  }
});

// 🚀 Google Sheets → MongoDB 마이그레이션 API
app.post('/api/database/migrate', async (req, res) => {
  try {
    const DataMigrator = require('./scripts/migrate-to-mongodb');
    const migrator = new DataMigrator();
    
    ServerLogger.info('🚀 웹 API를 통한 마이그레이션 시작', 'API');
    
    // 마이그레이션 실행
    const stats = await migrator.migrate();
    
    res.json({
      success: true,
      message: 'Google Sheets → MongoDB 마이그레이션 완료!',
      stats: stats,
      next_steps: [
        '1. /api/database/collections로 마이그레이션된 데이터 확인',
        '2. /api/videos-mongo로 MongoDB 데이터 조회 테스트',
        '3. 기존 /api/videos와 성능 비교'
      ]
    });
    
  } catch (error) {
    ServerLogger.error('❌ 마이그레이션 API 실패', error.message, 'API');
    res.status(500).json({
      success: false,
      error: error.message,
      message: '마이그레이션 실패'
    });
  }
});

// 🗑️ MongoDB 데이터 초기화 API (재마이그레이션용)
app.delete('/api/database/reset', async (req, res) => {
  try {
    const deleteResult = await Video.deleteMany({});
    
    ServerLogger.info(`🗑️ MongoDB 데이터 초기화: ${deleteResult.deletedCount}개 문서 삭제`, 'API');
    
    res.json({
      success: true,
      message: `MongoDB 데이터 초기화 완료! ${deleteResult.deletedCount}개 문서 삭제`,
      deleted_count: deleteResult.deletedCount,
      next_step: 'POST /api/database/migrate로 재마이그레이션 실행 가능'
    });
    
  } catch (error) {
    ServerLogger.error('❌ 데이터 초기화 실패', error.message, 'API');
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'MongoDB 데이터 초기화 실패'
    });
  }
});

// 🔍 MongoDB 데이터 검증 API
app.get('/api/database/verify', async (req, res) => {
  try {
    const verifyData = require('./scripts/verify-data');
    
    // 콘솔 출력을 캡처하기 위한 헬퍼
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };
    
    const success = await verifyData();
    
    // 원래 console.log 복구
    console.log = originalLog;
    
    res.json({
      success: success,
      message: success ? 'MongoDB 데이터 검증 완료!' : '데이터 검증 실패',
      verification_output: output,
      timestamp: new Date()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '데이터 검증 API 실패'
    });
  }
});

// 📊 마이그레이션 진행 상황 조회
app.get('/api/database/migration-status', async (req, res) => {
  try {
    const totalVideos = await Video.countDocuments();
    const platformStats = await Video.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      migration_status: {
        total_migrated: totalVideos,
        by_platform: platformStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        last_updated: new Date()
      },
      message: '마이그레이션 상태 조회 완료'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '마이그레이션 상태 조회 실패'
    });
  }
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

// 🔍 개별 YouTube 시트 직접 조회 테스트 API
app.get('/api/test-youtube-sheet', async (req, res) => {
  try {
    const range = 'YouTube!A2:S10';
    const response = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: range
    });
    
    const data = response.data.values || [];
    const sampleData = data.slice(0, 3).map(row => ({
      id: row[0],
      timestamp: row[1], 
      platform: row[2],
      account: row[3],
      title: row[9]?.substring(0, 50) + '...' || 'N/A'
    }));
    
    res.json({
      success: true,
      range,
      count: data.length,
      sampleData,
      message: `YouTube 시트에서 ${data.length}개 행 직접 조회 성공`
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      range: 'YouTube!A2:S10'
    });
  }
});

// 🔍 구글 시트 구조 확인 API
app.get('/api/test-sheet-structure', async (req, res) => {
  try {
    const response = await sheetsManager.sheets.spreadsheets.get({
      spreadsheetId: sheetsManager.spreadsheetId
    });
    const sheetInfo = response.data.sheets.map(sheet => ({
      title: sheet.properties.title,
      sheetId: sheet.properties.sheetId,
      rowCount: sheet.properties.gridProperties.rowCount,
      columnCount: sheet.properties.gridProperties.columnCount
    }));
    
    res.json({ 
      success: true,
      spreadsheetTitle: response.data.properties.title,
      sheetInfo,
      totalSheets: sheetInfo.length 
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 🔍 모든 시트별 데이터 수 확인 API  
app.get('/api/test-all-sheets-count', async (req, res) => {
  try {
    const platforms = ['Instagram', 'YouTube', 'TikTok'];
    const results = {};
    
    for (const sheetName of platforms) {
      try {
        const range = `${sheetName}!A:A`;
        const response = await sheetsManager.sheets.spreadsheets.values.get({
          spreadsheetId: sheetsManager.spreadsheetId,
          range: range
        });
        const count = (response.data.values?.length || 1) - 1; // 헤더 제외
        results[sheetName] = { success: true, count, range };
      } catch (error) {
        results[sheetName] = { success: false, error: error.message, count: 0 };
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 🔍 Instagram 시트 최신 데이터 조사 API
app.get('/api/test-instagram-latest', async (req, res) => {
  try {
    const range = 'Instagram!A2:B50'; // 처음 50개 행의 번호와 날짜만
    const response = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: range
    });
    
    const data = response.data.values || [];
    
    // 날짜별로 정렬해서 최신 10개 확인
    const sortedData = data
      .filter(row => row[1]) // 날짜가 있는 것만
      .sort((a, b) => {
        const dateA = new Date(a[1].replace(/\. /g, '/').replace(/\.$/, ''));
        const dateB = new Date(b[1].replace(/\. /g, '/').replace(/\.$/, ''));
        return dateB - dateA;
      })
      .slice(0, 10);
    
    res.json({
      success: true,
      range,
      totalRows: data.length,
      latestDates: sortedData.map(row => ({ id: row[0], date: row[1] })),
      message: `Instagram 시트에서 ${data.length}개 행 조회, 최신 10개 날짜 정렬 완료`
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
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
    const { platform, videoUrl, postUrl, url, metadata, analysisType = 'quick', useAI = true, mode = 'immediate' } = req.body;
    
    // 🆕 URL 필드 통합 처리 (url 필드도 지원)
    const finalVideoUrl = videoUrl || url;
    const finalPostUrl = postUrl;
    
    // 🆕 플랫폼 자동 감지 (platform이 없는 경우)
    const finalPlatform = platform || (finalVideoUrl ? 
      (finalVideoUrl.includes('youtube.com') || finalVideoUrl.includes('youtu.be') ? 'youtube' : 
       finalVideoUrl.includes('instagram.com') ? 'instagram' : 
       finalVideoUrl.includes('tiktok.com') ? 'tiktok' : 'unknown') : 'unknown');
    
    // 🔍 URL 중복 검사 (모든 플랫폼 공통)
    const checkUrl = finalVideoUrl || finalPostUrl;
    let videoUrlDoc = null;  // MongoDB 문서 참조용
    
    if (checkUrl) {
      try {
        const duplicateCheck = await sheetsManager.checkDuplicateURLFast(checkUrl);
        
        if (duplicateCheck.isDuplicate) {
          let errorMessage;
          
          if (duplicateCheck.isProcessing) {
            errorMessage = `🔄 처리 중인 URL: 같은 URL이 현재 처리되고 있습니다 (${duplicateCheck.existingPlatform})`;
          } else {
            errorMessage = `⚠️ 중복 URL: 이미 ${duplicateCheck.existingPlatform} 시트의 ${duplicateCheck.existingColumn}${duplicateCheck.existingRow}행에 존재합니다`;
          }
          
          ServerLogger.warn(errorMessage, 'API_DUPLICATE');
          
          return res.status(409).json({
            success: false,
            error: 'DUPLICATE_URL',
            message: errorMessage,
            duplicate_info: {
              platform: duplicateCheck.existingPlatform,
              row: duplicateCheck.existingRow,
              column: duplicateCheck.existingColumn,
              normalized_url: sheetsManager.normalizeVideoUrl(checkUrl),
              isProcessing: duplicateCheck.isProcessing || false,
              status: duplicateCheck.status
            }
          });
        }
        
        // ✅ 중복이 아닌 경우 - 즉시 processing 상태로 MongoDB에 등록
        const normalizedUrl = sheetsManager.normalizeVideoUrl(checkUrl);
        const VideoUrl = require('./models/VideoUrl');
        
        const registerResult = await VideoUrl.registerUrl(
          normalizedUrl,
          checkUrl,
          platform,
          null  // sheetLocation은 나중에 업데이트
        );
        
        if (registerResult.success) {
          videoUrlDoc = registerResult.document;
          ServerLogger.info(`✅ URL processing 상태 등록: ${normalizedUrl} (${platform})`);
        } else {
          ServerLogger.warn(`⚠️ URL processing 상태 등록 실패: ${registerResult.error}`);
        }
        
        ServerLogger.info(`✅ URL 중복 검사 통과: ${checkUrl}`, 'API_DUPLICATE');
        
      } catch (duplicateError) {
        // 중복 검사 실패해도 계속 진행 (시스템 안정성을 위해)
        ServerLogger.warn(`중복 검사 실패하여 건너뜀: ${duplicateError.message}`, 'API_DUPLICATE');
      }
    }
    
    // 🆕 YouTube 배치 모드 처리
    if (finalPlatform === 'youtube' && mode === 'batch') {
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

        const batchResult = await youtubeBatchProcessor.addToBatch(finalVideoUrl, options);
        
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
      id: `url_${finalPlatform}_${Date.now()}`,
      type: 'url',
      data: { platform: finalPlatform, videoUrl: finalVideoUrl, postUrl: finalPostUrl, metadata, analysisType, useAI },
      processor: async (taskData) => {
        const { platform, videoUrl, postUrl, analysisType, useAI } = taskData;
        let metadata = taskData.metadata; // 🆕 재할당 가능하도록 let으로 선언
        
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
          // 🆕 metadata가 null/undefined인 경우 빈 객체로 초기화
          if (!metadata || typeof metadata !== 'object') {
            metadata = {};
          }
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
            liveBroadcast: youtubeInfo.liveBroadcast || 'none',
            // YouTube 핸들명과 채널 URL 추가 🎯
            youtubeHandle: youtubeInfo.youtubeHandle || '',
            channelUrl: youtubeInfo.channelUrl || '',
            // 새로운 필드들 추가 🆕
            description: youtubeInfo.description || '',
            hashtags: youtubeInfo.hashtags || [],
            mentions: youtubeInfo.mentions || [],
            topComments: youtubeInfo.topComments || '',
            thumbnailUrl: youtubeInfo.thumbnailUrl || ''
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
            // YouTube 카테고리를 기본 분류로 사용
            const youtubeMainCategory = youtubeInfo.category || '미분류';
            ServerLogger.info(`📂 YouTube 카테고리 사용: ${youtubeMainCategory}`);
            
            analysis = {
              category: '분석 안함',
              mainCategory: youtubeMainCategory,  // YouTube 카테고리 사용 🎯
              middleCategory: '기본',
              keywords: [],
              hashtags: [],
              confidence: 100,  // YouTube 공식 카테고리이므로 100% 신뢰도
              frameCount: 1,
              categoryMatch: {
                matchScore: 100,
                matchType: 'youtube_official',
                matchReason: `YouTube 공식 카테고리: ${youtubeMainCategory}`
              },
              aiModel: '수동'  // AI 비사용 시 '수동'으로 표시
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
              frameCount: thumbnailPaths.length,
              aiModel: '수동'  // AI 비사용 시 '수동'으로 표시
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
        
        // 4-5단계: 통합 저장 (Google Sheets + MongoDB 동시 저장) 🆕
        ServerLogger.info('4-5️⃣ 통합 저장 시작 (Google Sheets + MongoDB)');
        const result = await unifiedVideoSaver.saveVideoData(platform, {
          platform,
          postUrl,
          videoPath,
          thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
          thumbnailPaths: thumbnailPaths,
          metadata,
          analysis,
          timestamp: new Date().toISOString()
        });
        
        // 통합 저장 결과 확인
        if (!result.success) {
          throw new Error(`통합 저장 실패: ${result.error}`);
        }
        
        ServerLogger.info('✅ 통합 저장 완료!', {
          sheetsTime: `${result.performance.sheetsTime}ms`,
          mongoTime: `${result.performance.mongoTime}ms`,
          totalTime: `${result.performance.totalTime}ms`
        });
        
        // 통계 업데이트
        stats.total++;
        stats.today++;
        
        ServerLogger.info('✅ 비디오 처리 완료 (통합 저장)');
        
        // ✅ 성공적으로 처리 완료 시 MongoDB 상태를 'completed'로 업데이트
        if (videoUrlDoc && checkUrl) {
          try {
            const VideoUrl = require('./models/VideoUrl');
            const normalizedUrl = sheetsManager.normalizeVideoUrl(checkUrl);
            
            // sheetInfo가 있으면 사용, 없으면 null로 업데이트
            const sheetLocation = result.sheets ? {
              sheetName: result.sheets.sheetName,
              column: 'N', // URL 저장 컬럼
              row: result.sheets.nextRow
            } : null;
            
            // await VideoUrl.updateStatus(normalizedUrl, 'completed', sheetLocation); // 🆕 비활성화
            
            ServerLogger.info(`✅ URL 상태 업데이트: ${normalizedUrl} -> completed`);
          } catch (statusError) {
            ServerLogger.warn(`⚠️ URL 상태 업데이트 실패: ${statusError.message}`);
          }
        }
        
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
    
    // ❌ 처리 실패 시 MongoDB에서 해당 URL 레코드 삭제 (재시도 가능하도록)
    const { videoUrl: errorVideoUrl, postUrl: errorPostUrl } = req.body; // 🆕 req.body에서 직접 추출
    const checkUrl = errorVideoUrl || errorPostUrl;
    if (checkUrl) {
      try {
        const VideoUrl = require('./models/VideoUrl');
        const normalizedUrl = sheetsManager.normalizeVideoUrl(checkUrl);
        
        await VideoUrl.deleteOne({ normalizedUrl });
        
        ServerLogger.info(`🗑️ 처리 실패로 인한 URL 레코드 삭제: ${normalizedUrl}`);
      } catch (deleteError) {
        ServerLogger.warn(`⚠️ 처리 실패 URL 레코드 삭제 실패: ${deleteError.message}`);
      }
    }
    
    ResponseHandler.serverError(res, {
      ...error,
      code: ERROR_CODES.VIDEO_PROCESSING_FAILED
    }, API_MESSAGES.VIDEO.PROCESSING_FAILED);
  }
});

// 저장된 비디오 목록 조회 (최적화: 단일 Video 모델 쿼리)
app.get('/api/videos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'timestamp'; // timestamp는 이제 원본 게시일
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const platform = req.query.platform; // 플랫폼 필터 (선택적)
    
    ServerLogger.info(`📡 MongoDB API 요청: /api/videos (limit=${limit}, sortBy=${sortBy}, platform=${platform})`, 'DEBUG');
    
    // MongoDB 연결 확인
    if (!DatabaseManager.isConnectedStatus().connected) {
      await DatabaseManager.connect();
    }
    
    // 쿼리 조건 구성 - originalPublishDate가 있는 레코드 우선
    const query = {
      originalPublishDate: { $exists: true, $ne: null }
    };
    if (platform) {
      query.platform = platform.toLowerCase();
    }
    
    // 정렬 조건 구성 (timestamp로 요청해도 originalPublishDate로 정렬)
    const sortOptions = {};
    if (sortBy === 'timestamp') {
      sortOptions['originalPublishDate'] = sortOrder;
    } else {
      sortOptions[sortBy] = sortOrder;
    }
    
    // MongoDB에서 비디오 조회 (단일 쿼리!)
    const videos = await Video.find(query)
      .sort(sortOptions)
      .limit(limit)
      .select('platform account title likes views comments timestamp originalPublishDate processedAt category keywords hashtags thumbnailUrl')
      .lean(); // 성능 최적화
    
    // timestamp 필드가 originalPublishDate와 동일한지 확인하고 보정
    const enhancedVideos = videos.map(video => {
      return {
        ...video,
        timestamp: video.originalPublishDate || video.timestamp, // 원본 게시일을 timestamp로 사용
        originalPublishDate: video.originalPublishDate
      };
    });
    
    // 플랫폼별 비디오 수 분석
    const platformCounts = {};
    enhancedVideos.forEach(v => {
      const platform = v.platform || 'unknown';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });
    
    ServerLogger.info(`📊 MongoDB API 응답: 총 ${enhancedVideos.length}개 비디오 (단일 쿼리 최적화)`, 'DEBUG');
    ServerLogger.info(`📊 플랫폼별 비디오 수: ${JSON.stringify(platformCounts)}`, 'DEBUG');
    
    ResponseHandler.success(res, {
      videos: enhancedVideos,
      total: enhancedVideos.length,
      query: { limit, sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc', platform },
      platform_stats: platformCounts
    }, API_MESSAGES.DATA.FETCH_SUCCESS);
    
  } catch (error) {
    ServerLogger.error(`❌ MongoDB /api/videos API 실패`, error.message, 'DEBUG');
    ResponseHandler.serverError(res, {
      ...error,
      code: ERROR_CODES.DATA_FETCH_FAILED
    }, API_MESSAGES.DATA.FETCH_FAILED);
  }
});

// 🔍 캐시 강제 무효화 API
app.post('/api/cache/clear', async (req, res) => {
  try {
    sheetsManager.invalidateCache();
    res.json({ 
      success: true, 
      message: '캐시가 무효화되었습니다. 다음 조회부터 새로운 데이터를 가져옵니다.' 
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 캐시 상태 확인 엔드포인트 (디버깅용)
app.get('/api/cache/status', async (req, res) => {
  try {
    const cacheInfo = {
      cacheSize: sheetsManager.cache.size,
      keys: Array.from(sheetsManager.cache.keys()),
      ttl: sheetsManager.cacheTTL,
      entries: {}
    };
    
    // 각 캐시 엔트리의 나이 계산
    for (const [key, value] of sheetsManager.cache.entries()) {
      const age = Date.now() - value.timestamp;
      cacheInfo.entries[key] = {
        age: `${age}ms`,
        isValid: age < sheetsManager.cacheTTL,
        dataLength: value.data ? value.data.length : 0
      };
    }
    
    ResponseHandler.success(res, cacheInfo, '캐시 상태 조회 성공');
  } catch (error) {
    ResponseHandler.serverError(res, error, '캐시 상태 조회 실패');
  }
});

// 캐시 무효화 엔드포인트 (디버깅용)
app.post('/api/cache/clear', async (req, res) => {
  try {
    sheetsManager.invalidateCache();
    ResponseHandler.success(res, { cleared: true }, '캐시 무효화 성공');
  } catch (error) {
    ResponseHandler.serverError(res, error, '캐시 무효화 실패');
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

// 🔍 URL 중복 검사 API 엔드포인트
app.post('/api/check-duplicate', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL_REQUIRED',
        message: 'URL이 필요합니다.'
      });
    }
    
    ServerLogger.info(`🔍 API 중복 검사 요청: ${url}`, 'API_DUPLICATE_CHECK');
    
    const duplicateCheck = await sheetsManager.checkDuplicateURL(url);
    
    if (duplicateCheck.isDuplicate) {
      res.json({
        success: true,
        isDuplicate: true,
        message: `중복 URL 발견: ${duplicateCheck.existingPlatform} 시트의 ${duplicateCheck.existingColumn}${duplicateCheck.existingRow}행에 존재합니다`,
        data: {
          platform: duplicateCheck.existingPlatform,
          row: duplicateCheck.existingRow,
          column: duplicateCheck.existingColumn,
          original_url: url,
          normalized_url: sheetsManager.normalizeVideoUrl(url)
        }
      });
    } else {
      res.json({
        success: true,
        isDuplicate: false,
        message: '중복 없음 - 새로운 URL입니다',
        data: {
          original_url: url,
          normalized_url: sheetsManager.normalizeVideoUrl(url),
          error: duplicateCheck.error || null
        }
      });
    }
    
  } catch (error) {
    ServerLogger.error('URL 중복 검사 API 실패', error.message, 'API_DUPLICATE_CHECK');
    res.status(500).json({
      success: false,
      error: 'DUPLICATE_CHECK_FAILED',
      message: '중복 검사 중 오류가 발생했습니다.'
    });
  }
});

// 간단한 채널 분석에서는 사용하지 않으므로 주석 처리
/*
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
*/

app.post('/api/process-video-blob', upload.single('video'), async (req, res) => {
  let videoUrlDoc = null;  // MongoDB 문서 참조용
  
  try {
    const { platform, postUrl, analysisType = 'quick', useAI = true } = req.body;
    const metadata = JSON.parse(req.body.metadata || '{}');
    
    ServerLogger.info(`🎬 Processing ${platform} blob video from:`, postUrl);
    ServerLogger.info(`📁 Uploaded file: ${req.file ? `${req.file.filename} (${req.file.size} bytes)` : 'None'}`);
    ServerLogger.info(`🔍 Analysis type: ${analysisType}, AI 분석: ${useAI ? '활성화' : '비활성화'}`);
    
    // 🔍 URL 중복 검사 (Blob 처리에서도 공통 적용)
    
    if (postUrl) {
      try {
        const duplicateCheck = await sheetsManager.checkDuplicateURLFast(postUrl);
        
        if (duplicateCheck.isDuplicate) {
          let errorMessage;
          
          if (duplicateCheck.isProcessing) {
            errorMessage = `🔄 처리 중인 URL: 같은 URL이 현재 처리되고 있습니다 (${duplicateCheck.existingPlatform})`;
          } else {
            errorMessage = `⚠️ 중복 URL: 이미 ${duplicateCheck.existingPlatform} 시트의 ${duplicateCheck.existingColumn}${duplicateCheck.existingRow}행에 존재합니다`;
          }
          
          ServerLogger.warn(errorMessage, 'API_DUPLICATE_BLOB');
          
          return res.status(409).json({
            success: false,
            error: 'DUPLICATE_URL',
            message: errorMessage,
            duplicate_info: {
              platform: duplicateCheck.existingPlatform,
              row: duplicateCheck.existingRow,
              column: duplicateCheck.existingColumn,
              normalized_url: sheetsManager.normalizeVideoUrl(postUrl),
              isProcessing: duplicateCheck.isProcessing || false,
              status: duplicateCheck.status
            }
          });
        }
        
        // ✅ 중복이 아닌 경우 - 즉시 processing 상태로 MongoDB에 등록
        const normalizedUrl = sheetsManager.normalizeVideoUrl(postUrl);
        const VideoUrl = require('./models/VideoUrl');
        
        const registerResult = await VideoUrl.registerUrl(
          normalizedUrl,
          postUrl,
          platform,
          null  // sheetLocation은 나중에 업데이트
        );
        
        if (registerResult.success) {
          videoUrlDoc = registerResult.document;
          ServerLogger.info(`✅ URL processing 상태 등록 (Blob): ${normalizedUrl} (${platform})`);
        } else {
          ServerLogger.warn(`⚠️ URL processing 상태 등록 실패 (Blob): ${registerResult.error}`);
        }
        
        ServerLogger.info(`✅ URL 중복 검사 통과 (Blob): ${postUrl}`, 'API_DUPLICATE_BLOB');
        
      } catch (duplicateError) {
        // 중복 검사 실패해도 계속 진행 (시스템 안정성을 위해)
        ServerLogger.warn(`중복 검사 실패하여 건너뜀 (Blob): ${duplicateError.message}`, 'API_DUPLICATE_BLOB');
      }
    }
    
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
        
        // 4-5단계: 통합 저장 (Google Sheets + MongoDB 동시 저장) 🆕
        ServerLogger.info('4-5️⃣ 통합 저장 시작 (Google Sheets + MongoDB)');
        const result = await unifiedVideoSaver.saveVideoData(platform, {
          platform,
          postUrl,
          videoPath,
          thumbnailPath: Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths,
          thumbnailPaths: thumbnailPaths,
          metadata,
          analysis,
          timestamp: new Date().toISOString()
        });
        
        // 통합 저장 결과 확인
        if (!result.success) {
          throw new Error(`통합 저장 실패: ${result.error}`);
        }
        
        ServerLogger.info('✅ 통합 저장 완료!', {
          sheetsTime: `${result.performance.sheetsTime}ms`,
          mongoTime: `${result.performance.mongoTime}ms`,
          totalTime: `${result.performance.totalTime}ms`
        });
        
        // 통계 업데이트
        stats.total++;
        stats.today++;
        
        ServerLogger.info('✅ blob 비디오 처리 완료 (통합 저장)');
        
        // ✅ 성공적으로 처리 완료 시 MongoDB 상태를 'completed'로 업데이트
        if (videoUrlDoc && postUrl) {
          try {
            const VideoUrl = require('./models/VideoUrl');
            const normalizedUrl = sheetsManager.normalizeVideoUrl(postUrl);
            
            // sheetInfo가 있으면 사용, 없으면 null로 업데이트
            const sheetLocation = result.sheets ? {
              sheetName: result.sheets.sheetName,
              column: 'N', // URL 저장 컬럼
              row: result.sheets.nextRow
            } : null;
            
            // await VideoUrl.updateStatus(normalizedUrl, 'completed', sheetLocation); // 🆕 비활성화
            
            ServerLogger.info(`✅ URL 상태 업데이트 (Blob): ${normalizedUrl} -> completed`);
          } catch (statusError) {
            ServerLogger.warn(`⚠️ URL 상태 업데이트 실패 (Blob): ${statusError.message}`);
          }
        }
        
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
    
    // ❌ 처리 실패 시 MongoDB에서 해당 URL 레코드 삭제 (재시도 가능하도록)
    if (videoUrlDoc && postUrl) {
      try {
        const VideoUrl = require('./models/VideoUrl');
        const normalizedUrl = sheetsManager.normalizeVideoUrl(postUrl);
        
        await VideoUrl.deleteOne({ normalizedUrl });
        
        ServerLogger.info(`🗑️ 처리 실패로 인한 URL 레코드 삭제 (Blob): ${normalizedUrl}`);
      } catch (deleteError) {
        ServerLogger.warn(`⚠️ 처리 실패 URL 레코드 삭제 실패 (Blob): ${deleteError.message}`);
      }
    }
    
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
let highViewCollector;
try {
  highViewCollector = new HighViewCollector();
  ServerLogger.info('✅ HighViewCollector 초기화 성공');
} catch (error) {
  ServerLogger.error('❌ HighViewCollector 초기화 실패:', error);
  highViewCollector = null;
}

// HighViewCollector 초기화 확인 API
app.get('/api/debug-collector', (req, res) => {
  res.json({ 
    success: true, 
    message: 'HighViewCollector 초기화 체크 완료',
    initialized: !!highViewCollector,
    timestamp: new Date().toISOString()
  });
});
ServerLogger.info('🧪 DEBUG: HighViewCollector 초기화 체크 API 등록');

// collect-trending GET API 등록 전 디버그
app.get('/api/debug-before-collect-get', (req, res) => {
  res.json({ success: true, message: 'collect-trending GET 등록 직전!' });
});

// 채널별 트렌딩 영상 수집 시작 (GET은 안내용, POST는 실제 처리)
app.get('/api/collect-trending', (req, res) => {
  res.json({
    success: true,
    message: 'HighViewCollector API 정상 작동중',
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
  if (!highViewCollector) {
    return ResponseHandler.serverError(res, 
      new Error('HighViewCollector가 초기화되지 않았습니다'), 
      'HighViewCollector 초기화 오류');
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

    const results = await highViewCollector.collectFromChannels(channelIds, options);
    
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
  if (!highViewCollector) {
    return ResponseHandler.serverError(res, 
      new Error('HighViewCollector가 초기화되지 않았습니다'), 
      'HighViewCollector 초기화 오류');
  }
  
  try {
    const quotaStatus = highViewCollector.getQuotaStatus();
    
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

// 이미지 프록시 API (CORS 우회)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return ResponseHandler.badRequest(res, {
        field: 'url',
        message: '이미지 URL이 필요합니다.'
      });
    }
    
    // Instagram 미디어 URL만 허용
    if (!url.includes('instagram.com')) {
      return ResponseHandler.badRequest(res, {
        field: 'url', 
        message: 'Instagram URL만 지원됩니다.'
      });
    }
    
    ServerLogger.info('🖼️ 이미지 프록시 요청:', url);
    
    // fetch를 사용하여 이미지 가져오기
    const fetch = (await import('node-fetch')).default;
    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!imageResponse.ok) {
      throw new Error(`이미지 로드 실패: ${imageResponse.status}`);
    }
    
    // Content-Type 설정
    const contentType = imageResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // 이미지 스트림 전달
    const buffer = await imageResponse.buffer();
    res.send(buffer);
    
  } catch (error) {
    ServerLogger.error('이미지 프록시 에러:', error);
    ResponseHandler.serverError(res, error, '이미지 프록시 처리 중 오류가 발생했습니다.');
  }
});

// Instagram 썸네일 추출 API
app.post('/api/get-instagram-thumbnail', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('instagram.com')) {
      return ResponseHandler.badRequest(res, {
        code: 'INVALID_URL',
        message: '유효한 Instagram URL이 필요합니다.',
        details: { provided: url }
      });
    }
    
    ServerLogger.info('📸 Instagram 썸네일 추출 요청:', { url });
    
    // Instagram URL에서 미디어 ID 추출
    const reelMatch = url.match(/instagram\.com\/reels?\/([A-Za-z0-9_-]+)/);
    const postMatch = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
    
    if (!reelMatch && !postMatch) {
      return ResponseHandler.badRequest(res, {
        code: 'INVALID_INSTAGRAM_URL',
        message: 'Instagram 릴스 또는 포스트 URL이 아닙니다.',
        details: { url }
      });
    }
    
    const mediaId = reelMatch ? reelMatch[1] : postMatch[1];
    
    // Instagram 썸네일 URL 패턴들
    const thumbnailUrls = [
      `https://www.instagram.com/p/${mediaId}/media/?size=l`,
      `https://www.instagram.com/p/${mediaId}/media/?size=m`,
      `https://instagram.com/p/${mediaId}/media/`
    ];
    
    // 첫 번째 URL로 응답 (클라이언트에서 이미지 로드 시도)
    ResponseHandler.success(res, {
      thumbnailUrl: thumbnailUrls[0],
      mediaId,
      alternativeUrls: thumbnailUrls.slice(1),
      originalUrl: url
    }, 'Instagram 썸네일 URL을 생성했습니다.');
    
    ServerLogger.info('✅ Instagram 썸네일 URL 생성 완료:', { mediaId, url: thumbnailUrls[0] });
    
  } catch (error) {
    ServerLogger.error('❌ Instagram 썸네일 추출 실패:', error);
    ResponseHandler.serverError(res, error, 'Instagram 썸네일 추출 중 오류가 발생했습니다.');
  }
});

// MongoDB URL 상태 통계 및 정리 상태 조회
app.get('/api/mongodb/url-stats', async (req, res) => {
  try {
    const VideoUrl = require('./models/VideoUrl');
    
    const stats = await VideoUrl.getStats();
    
    if (stats.error) {
      return ResponseHandler.serverError(res, {
        code: 'STATS_QUERY_FAILED',
        message: stats.error
      }, 'MongoDB URL 통계 조회 실패');
    }
    
    ResponseHandler.success(res, {
      ...stats,
      cleanupInfo: {
        staleThresholdMinutes: 10,
        description: '10분 이상 processing 상태인 레코드는 자동 정리됩니다',
        nextCleanup: '매 10분마다 자동 실행'
      }
    }, 'MongoDB URL 상태 통계 조회 성공');
    
  } catch (error) {
    ServerLogger.error('MongoDB URL 통계 조회 실패:', error);
    ResponseHandler.serverError(res, error, 'URL 통계 조회 중 오류가 발생했습니다.');
  }
});

// 수동으로 오래된 processing 레코드 정리
app.post('/api/mongodb/cleanup', async (req, res) => {
  try {
    const VideoUrl = require('./models/VideoUrl');
    
    const result = await VideoUrl.cleanupStaleProcessing();
    
    if (result.success) {
      ServerLogger.info(`🧹 수동 정리 완료: ${result.deletedCount}개 레코드 삭제`);
      
      ResponseHandler.success(res, {
        deletedCount: result.deletedCount,
        message: result.deletedCount > 0 
          ? `${result.deletedCount}개의 오래된 processing 레코드를 정리했습니다.`
          : '정리할 오래된 레코드가 없습니다.'
      }, '수동 정리 완료');
    } else {
      ResponseHandler.serverError(res, {
        code: 'CLEANUP_FAILED',
        message: result.error
      }, '정리 작업 실패');
    }
    
  } catch (error) {
    ServerLogger.error('수동 정리 실패:', error);
    ResponseHandler.serverError(res, error, '정리 작업 중 오류가 발생했습니다.');
  }
});

// 트렌딩 수집 통계 조회
app.get('/api/trending-stats', async (req, res) => {
  try {
    const stats = await highViewCollector.getStats();
    
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

// 🔗 통합 저장 시스템 테스트 API 🆕
app.get('/api/unified-saver/stats', async (req, res) => {
  try {
    const { platform } = req.query;
    const stats = await unifiedVideoSaver.getSaveStatistics(platform);
    
    ResponseHandler.success(res, stats, '통합 저장 통계 조회 성공');
  } catch (error) {
    ServerLogger.error('통합 저장 통계 조회 실패', error.message, 'UNIFIED_SAVER_API');
    ResponseHandler.serverError(res, error, '통합 저장 통계 조회 실패');
  }
});

// 🔍 데이터 일관성 검증 API 🆕
app.get('/api/unified-saver/validate/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { limit = 100 } = req.query;
    
    const validationResult = await unifiedVideoSaver.validateDataConsistency(platform, parseInt(limit));
    
    ResponseHandler.success(res, validationResult, `${platform} 데이터 일관성 검증 완료`);
  } catch (error) {
    ServerLogger.error(`데이터 일관성 검증 실패: ${req.params.platform}`, error.message, 'UNIFIED_SAVER_API');
    ResponseHandler.serverError(res, error, '데이터 일관성 검증 실패');
  }
});

// 🗑️ MongoDB 데이터 전체 삭제 API (개발/테스트용)
app.post('/api/clear-database', async (req, res) => {
  try {
    ServerLogger.info('🗑️ MongoDB 데이터 전체 삭제 요청 시작', 'DATABASE_CLEAR');
    
    // MongoDB 연결 확인
    if (!DatabaseManager.isConnectedStatus().connected) {
      await DatabaseManager.connect();
    }
    
    // 현재 개수 확인
    const beforeCount = await Video.countDocuments();
    ServerLogger.info(`📊 삭제 전 비디오 개수: ${beforeCount}개`, 'DATABASE_CLEAR');
    
    // 모든 비디오 삭제
    const result = await Video.deleteMany({});
    ServerLogger.info(`🗑️ 삭제된 비디오 개수: ${result.deletedCount}개`, 'DATABASE_CLEAR');
    
    // 삭제 후 개수 확인
    const afterCount = await Video.countDocuments();
    ServerLogger.info(`📊 삭제 후 비디오 개수: ${afterCount}개`, 'DATABASE_CLEAR');
    
    // VideoUrl 컬렉션도 있으면 삭제
    try {
      const VideoUrl = require('./models/VideoUrl');
      const beforeUrlCount = await VideoUrl.countDocuments();
      const urlResult = await VideoUrl.deleteMany({});
      ServerLogger.info(`🗑️ 삭제된 VideoUrl 개수: ${urlResult.deletedCount}개 (삭제 전: ${beforeUrlCount}개)`, 'DATABASE_CLEAR');
    } catch (urlError) {
      ServerLogger.warn(`⚠️ VideoUrl 삭제 중 오류 (무시): ${urlError.message}`, 'DATABASE_CLEAR');
    }
    
    ResponseHandler.success(res, {
      deletedCount: result.deletedCount,
      beforeCount: beforeCount,
      afterCount: afterCount,
      message: `✅ MongoDB 데이터 삭제 완료! (${result.deletedCount}개 삭제)`
    }, 'MongoDB 데이터가 성공적으로 삭제되었습니다.');
    
    ServerLogger.info('✅ MongoDB 데이터 전체 삭제 완료!', 'DATABASE_CLEAR');
    
  } catch (error) {
    ServerLogger.error('❌ MongoDB 데이터 삭제 실패:', error, 'DATABASE_CLEAR');
    ResponseHandler.serverError(res, error, 'MongoDB 데이터 삭제 중 오류가 발생했습니다.');
  }
});

// 🎬 기존 채널 분석 API 제거됨 - 새로운 클러스터 수집 API 사용 (/api/cluster/collect-channel)

// 📋 채널 분석 큐 라우트 등록
try {
  const channelQueueRoutes = require('./routes/channel-queue');
  app.use('/api/channel-queue', channelQueueRoutes);
  ServerLogger.info('📋 채널 분석 큐 API 등록 완료');
} catch (error) {
  ServerLogger.error('❌ 채널 분석 큐 라우트 등록 실패:', error);
}

// 404 핸들러 (모든 라우트 등록 후 마지막에)
app.use((req, res) => {
  ResponseHandler.notFound(res, `경로 '${req.path}'를 찾을 수 없습니다.`);
});

// 서버 시작 (MongoDB 연결 포함)
const startServer = async () => {
  try {
    // MongoDB 연결 시도
    await DatabaseManager.connect();
    
    // 🧹 서버 시작 시 오래된 processing 레코드 정리
    try {
      const VideoUrl = require('./models/VideoUrl');
      const cleanupResult = await VideoUrl.cleanupStaleProcessing();
      
      if (cleanupResult.success && cleanupResult.deletedCount > 0) {
        ServerLogger.info(`🧹 서버 시작 시 오래된 processing 레코드 정리: ${cleanupResult.deletedCount}개`);
      }
      
      // ⏰ 10분마다 정리 작업 스케줄링
      setInterval(async () => {
        try {
          const result = await VideoUrl.cleanupStaleProcessing();
          if (result.success && result.deletedCount > 0) {
            ServerLogger.info(`🧹 정기 정리: 오래된 processing 레코드 ${result.deletedCount}개 삭제`);
          }
        } catch (intervalError) {
          ServerLogger.warn(`⚠️ 정기 정리 실패: ${intervalError.message}`);
        }
      }, 10 * 60 * 1000); // 10분마다
      
    } catch (cleanupError) {
      ServerLogger.warn(`⚠️ 초기 정리 실패 (무시): ${cleanupError.message}`);
    }

    // 📋 채널 분석 큐 라우트는 이미 위에서 등록됨 (404 핸들러 이전)

    
    app.listen(PORT, () => {
      ServerLogger.info(`
🎬 영상 자동저장 분석기 서버 실행중
📍 포트: ${PORT}
🌐 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
🗄️ Database: ${process.env.USE_MONGODB === 'true' ? 'MongoDB Atlas' : 'Google Sheets'}

📋 설정 체크리스트:
[ ] Gemini API 키 설정 (.env 파일)
[ ] MongoDB Atlas 연결 (${process.env.USE_MONGODB === 'true' ? '✅' : '❌'})
[ ] Chrome 확장프로그램 로드

💡 테스트 URL:
- 구글 시트 테스트: http://localhost:${PORT}/api/test-sheets
- MongoDB 상태 확인: http://localhost:${PORT}/api/database/health
- 설정 상태 확인: http://localhost:${PORT}/api/config/health
  `, 'START');
    });
  } catch (error) {
    ServerLogger.error('🚨 서버 시작 실패', error.message, 'START');
    process.exit(1);
  }
};

// 서버 시작
startServer();