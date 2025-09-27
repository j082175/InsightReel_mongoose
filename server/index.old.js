const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 미들웨어 및 컨트롤러 import
const ErrorHandler = require('./middleware/error-handler');
const SecurityMiddleware = require('./middleware/security');
const ValidationMiddleware = require('./middleware/validation');
// 기존 JavaScript 컨트롤러 사용 (TypeScript 마이그레이션 중)
const VideoController = require('./controllers/video-controller');
const DatabaseManager = require('./config/database');

/**
 * 리팩토링된 서버 애플리케이션
 */
class VideoSaverServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.videoController = new VideoController();

    this.init().catch(error => {
      console.error('❌ 서버 초기화 실패:', error);
      process.exit(1);
    });
  }

  /**
   * 서버 초기화
   */
  async init() {
    // 환경 변수 검증
    SecurityMiddleware.validateEnvironment();

    // MongoDB 연결
    await this.connectDatabase();

    // 디렉토리 생성
    this.ensureDirectories();

    // 미들웨어 설정
    this.setupMiddleware();

    // 라우트 설정
    this.setupRoutes();

    // 에러 핸들러 설정
    this.setupErrorHandlers();
  }

  /**
   * 데이터베이스 연결
   */
  async connectDatabase() {
    try {
      await DatabaseManager.connect();
    } catch (error) {
      console.error('❌ MongoDB 연결 실패:', error.message);
      console.log('⚠️ Google Sheets 모드로 계속 진행합니다.');
    }
  }

  /**
   * 필요한 디렉토리 생성
   */
  ensureDirectories() {
    const directories = [
      path.join(__dirname, '../downloads'),
      path.join(__dirname, '../downloads/thumbnails')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 디렉토리 생성: ${dir}`);
      }
    });
  }

  /**
   * 미들웨어 설정
   */
  setupMiddleware() {
    // 보안 미들웨어
    this.app.use(SecurityMiddleware.securityHeaders);
    this.app.use(SecurityMiddleware.corsPolicy);
    this.app.use(SecurityMiddleware.requestLogger);
    
    // Rate Limiting
    this.app.use('/api', SecurityMiddleware.ipRateLimit(100, 15)); // 15분당 100회
    
    // 요청 크기 제한
    this.app.use(SecurityMiddleware.requestSizeLimit('50mb'));
    
    // 기본 Express 미들웨어
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // 정적 파일 서빙
    this.app.use('/downloads', express.static(path.join(__dirname, '../downloads')));
    
    // Multer 설정
    this.setupMulter();
  }

  /**
   * Multer 파일 업로드 설정
   */
  setupMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../downloads'));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
      }
    });

    this.upload = multer({ 
      storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 1
      },
      fileFilter: (req, file, cb) => {
        // 기본 파일 타입 검증
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('지원되지 않는 파일 형식입니다'), false);
        }
      }
    });
  }

  /**
   * 라우트 설정
   */
  setupRoutes() {
    // 헬스 체크
    this.app.get('/health', this.videoController.healthCheck);
    
    // 통계 조회
    this.app.get('/api/stats', this.videoController.getStats);
    
    // 서비스 연결 테스트
    this.app.get('/api/test-sheets', this.videoController.testSheets);
    
    // 비디오 처리 (URL 방식)
    this.app.post('/api/process-video',
      ValidationMiddleware.validateProcessVideo,
      this.videoController.processVideo
    );
    
    // 비디오 처리 (Blob 방식)
    this.app.post('/api/process-video-blob',
      this.upload.single('video'),
      SecurityMiddleware.validateFileUpload,
      ValidationMiddleware.validateProcessVideoBlob,
      ValidationMiddleware.validateMetadata,
      this.videoController.processVideoBlob
    );
    
    // 저장된 비디오 목록 조회
    this.app.get('/api/videos', this.videoController.getVideos);
    
    // 테스트 파일 업로드
    this.app.post('/api/upload',
      this.upload.single('video'),
      SecurityMiddleware.validateFileUpload,
      ValidationMiddleware.validateFileUpload,
      this.videoController.uploadTest
    );
    
    // API 문서 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      this.app.get('/api/docs', this.getApiDocs.bind(this));
    }
  }

  /**
   * 에러 핸들러 설정
   */
  setupErrorHandlers() {
    // 404 핸들러
    this.app.use(ErrorHandler.notFoundHandler);
    
    // 글로벌 에러 핸들러
    this.app.use(ErrorHandler.globalErrorHandler);
  }

  /**
   * API 문서 (간단한 버전)
   */
  getApiDocs(req, res) {
    const docs = {
      title: "InsightReel API",
      version: "1.0.0",
      endpoints: {
        "GET /health": "서버 상태 확인",
        "GET /api/stats": "처리 통계 조회",
        "GET /api/test-sheets": "구글 시트 연결 테스트",
        "POST /api/process-video": "비디오 처리 (URL 방식)",
        "POST /api/process-video-blob": "비디오 처리 (파일 업로드)",
        "GET /api/videos": "저장된 비디오 목록",
        "POST /api/upload": "테스트 파일 업로드"
      },
      security: {
        "CORS": "Instagram, TikTok 도메인만 허용",
        "Rate Limiting": "IP당 15분에 100회 요청 제한",
        "File Upload": "100MB 제한, 비디오 파일만 허용",
        "Request Size": "50MB 제한"
      }
    };
    
    res.json(docs);
  }

  /**
   * 서버 시작
   */
  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`
🎬 InsightReel 서버 실행중 (리팩토링 버전)
📍 포트: ${this.port}
🌐 URL: http://localhost:${this.port}
📊 Health Check: http://localhost:${this.port}/health
🔒 보안 강화: ✅
⚡ 에러 처리 개선: ✅
🧩 모듈화: ✅

📋 설정 체크리스트:
[ ] Gemini API 키 설정 (.env 파일)
[ ] 구글 API 키 설정 (.env 파일)
[ ] Chrome 확장프로그램 로드

💡 테스트 URL:
- 구글 시트 테스트: http://localhost:${this.port}/api/test-sheets
- API 문서: http://localhost:${this.port}/api/docs
      `);
    });

    // 종료 신호 처리
    this.setupGracefulShutdown();
  }

  /**
   * 우아한 종료 설정
   */
  setupGracefulShutdown() {
    const shutdown = (signal) => {
      console.log(`\n🛑 ${signal} 신호 수신. 서버 종료 중...`);
      
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            console.error('❌ 서버 종료 중 오류:', err);
            process.exit(1);
          }
          
          console.log('✅ 서버가 정상적으로 종료되었습니다');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // 처리되지 않은 에러 처리
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Promise Rejection:', reason);
      // 프로덕션에서는 서버 종료를 고려할 수 있음
      if (process.env.NODE_ENV === 'production') {
        shutdown('UNHANDLED_REJECTION');
      }
    });
    
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
  }
}

// 서버 실행
if (require.main === module) {
  const server = new VideoSaverServer();
  server.start();
}

module.exports = VideoSaverServer;