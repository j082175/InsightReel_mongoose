const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const VideoProcessor = require('./services/VideoProcessor');
const AIAnalyzer = require('./services/AIAnalyzer');
const SheetsManager = require('./services/SheetsManager');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors({
  origin: [
    'chrome-extension://*',
    'http://localhost:*',
    'https://www.instagram.com',
    'https://instagram.com',
    'https://www.tiktok.com',
    'https://tiktok.com'
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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 통계 조회
app.get('/api/stats', (req, res) => {
  checkDateReset();
  res.json(stats);
});

// Ollama 연결 테스트
app.get('/api/test-ollama', async (req, res) => {
  try {
    const result = await aiAnalyzer.testConnection();
    res.json({ status: 'ok', result });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      suggestion: 'Ollama가 설치되고 실행 중인지 확인해주세요. `ollama serve` 명령으로 실행할 수 있습니다.'
    });
  }
});

// 구글 시트 연결 테스트
app.get('/api/test-sheets', async (req, res) => {
  try {
    const result = await sheetsManager.testConnection();
    res.json({ status: 'ok', result });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      suggestion: '구글 API 키 설정과 인증을 확인해주세요.'
    });
  }
});

// 비디오 처리 메인 엔드포인트
app.post('/api/process-video', async (req, res) => {
  try {
    const { platform, videoUrl, postUrl, metadata } = req.body;
    
    console.log(`Processing ${platform} video:`, postUrl);
    
    // 1단계: 비디오 다운로드
    console.log('1. 비디오 다운로드 중...');
    const videoPath = await videoProcessor.downloadVideo(videoUrl, platform);
    
    // 2단계: 썸네일 생성
    console.log('2. 썸네일 생성 중...');
    const thumbnailPath = await videoProcessor.generateThumbnail(videoPath);
    
    // 3단계: AI 분석
    console.log('3. AI 분석 중...');
    const analysis = await aiAnalyzer.analyzeVideo(thumbnailPath, metadata);
    
    // 4단계: 구글 시트 저장
    console.log('4. 구글 시트 저장 중...');
    await sheetsManager.saveVideoData({
      platform,
      postUrl,
      videoPath,
      thumbnailPath,
      metadata,
      analysis,
      timestamp: new Date().toISOString()
    });
    
    // 통계 업데이트
    stats.total++;
    stats.today++;
    
    console.log('✅ 비디오 처리 완료');
    
    res.json({
      success: true,
      message: '비디오가 성공적으로 처리되었습니다.',
      category: analysis.category,
      keywords: analysis.keywords,
      videoPath,
      thumbnailPath
    });
    
  } catch (error) {
    console.error('비디오 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '비디오 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 저장된 비디오 목록 조회
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await sheetsManager.getRecentVideos();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 파일 업로드 (테스트용)
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }
    
    const thumbnailPath = await videoProcessor.generateThumbnail(req.file.path);
    const analysis = await aiAnalyzer.analyzeVideo(thumbnailPath, {});
    
    res.json({
      success: true,
      file: req.file,
      thumbnail: thumbnailPath,
      analysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// blob 비디오 처리 엔드포인트
app.post('/api/process-video-blob', upload.single('video'), async (req, res) => {
  try {
    const { platform, postUrl } = req.body;
    const metadata = JSON.parse(req.body.metadata || '{}');
    
    console.log(`Processing ${platform} blob video from:`, postUrl);
    console.log('Uploaded file:', req.file ? `${req.file.filename} (${req.file.size} bytes)` : 'None');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: '비디오 파일이 업로드되지 않았습니다.' 
      });
    }
    
    const videoPath = req.file.path;
    
    // 2단계: 썸네일 생성
    console.log('2. 썸네일 생성 중...');
    const thumbnailPath = await videoProcessor.generateThumbnail(videoPath);
    
    // 3단계: AI 분석
    console.log('3. AI 분석 중...');
    const analysis = await aiAnalyzer.analyzeVideo(thumbnailPath, metadata);
    
    // 4단계: 구글 시트 저장
    console.log('4. 구글 시트 저장 중...');
    await sheetsManager.saveVideoData({
      platform,
      postUrl,
      videoPath,
      thumbnailPath,
      metadata,
      analysis,
      timestamp: new Date().toISOString()
    });
    
    // 통계 업데이트
    stats.total++;
    stats.today++;
    
    console.log('✅ blob 비디오 처리 완료');
    
    res.json({
      success: true,
      message: '비디오가 성공적으로 처리되었습니다.',
      category: analysis.category,
      keywords: analysis.keywords,
      videoPath,
      thumbnailPath
    });
    
  } catch (error) {
    console.error('blob 비디오 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '비디오 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({
    error: '서버 내부 오류',
    message: err.message
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: '페이지를 찾을 수 없습니다.',
    path: req.path
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`
🎬 영상 자동저장 분석기 서버 실행중
📍 포트: ${PORT}
🌐 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health

📋 설정 체크리스트:
[ ] Ollama 설치 및 실행 (ollama serve)
[ ] LLaVA 모델 다운로드 (ollama pull llava)
[ ] 구글 API 키 설정 (.env 파일)
[ ] Chrome 확장프로그램 로드

💡 테스트 URL:
- Ollama 테스트: http://localhost:${PORT}/api/test-ollama
- 구글 시트 테스트: http://localhost:${PORT}/api/test-sheets
  `);
});