const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 🚀 FieldMapper 임포트 (완전 자동화 시스템)
const { FieldMapper } = require('./types/field-mapper');

// 설정 검증 먼저 실행
const { getConfig } = require('./config/config-validator');
const config = getConfig(); // 여기서 검증 실행

// DatabaseManager는 다른 API에서 사용되므로 일단 유지
const DatabaseManager = require('./config/database');
// 간단한 채널 분석에서는 직접 사용하지 않지만 다른 API에서 필요
const Video = require('./models/VideoModel');
const VideoUrl = require('./models/VideoUrl');

const VideoProcessor = require('./services/VideoProcessor');
const AIAnalyzer = require('./services/AIAnalyzer');
const SheetsManager = require('./services/SheetsManager');
const UnifiedVideoSaver = require('./services/UnifiedVideoSaver');
// const youtubeBatchProcessor = require('./services/YouTubeBatchProcessor');
const HighViewCollector = require('./services/HighViewCollector');
const YouTubeChannelDataCollector = require('./services/YouTubeChannelDataCollector');
const { ServerLogger } = require('./utils/logger');
const ResponseHandler = require('./utils/response-handler');
const ApiKeyManager = require('./services/ApiKeyManager');
const { API_MESSAGES, ERROR_CODES } = require('./config/api-messages');
const videoQueue = require('./utils/VideoQueue');

const app = express();
const PORT = config.get('PORT');

// 매우 초기 디버그 API 추가
app.get('/api/debug-very-early', (req, res) => {
    res.json({
        success: true,
        message: '🔍 VERY EARLY DEBUG: 라인 25 실행됨!',
    });
});
// ServerLogger.info('🔍 VERY EARLY DEBUG: Express 앱 생성 후 즉시 API 등록');

// 미들웨어 설정
app.use(
    cors({
        origin: function (origin, callback) {
            // 모든 origin 허용 (개발 환경)
            callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// UTF-8 인코딩 미들웨어
app.use((req, res, next) => {
    req.setEncoding = req.setEncoding || (() => {});
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
                '-' +
                uniqueSuffix +
                path.extname(file.originalname),
        );
    },
});
const upload = multer({ storage });

// 서비스 초기화 전 디버그
app.get('/api/debug-before-services', (req, res) => {
    res.json({
        success: true,
        message: '🔧 BEFORE SERVICES: 서비스 초기화 전 실행됨!',
    });
});
// ServerLogger.info('🔧 BEFORE SERVICES DEBUG: 서비스 초기화 전');

// 간단한 채널 분석에 필요한 서비스만 초기화
const sheetsManager = new SheetsManager();
// Blob 처리 API를 위해 필요한 서비스들 추가
const videoProcessor = new VideoProcessor();
const aiAnalyzer = new AIAnalyzer();
const unifiedVideoSaver = new UnifiedVideoSaver(sheetsManager, aiAnalyzer);

// 서비스 초기화 후 디버그
app.get('/api/debug-after-services', (req, res) => {
    res.json({
        success: true,
        message: '✅ AFTER SERVICES: 기본 서비스 초기화 완료!',
    });
});
// ServerLogger.info('✅ AFTER SERVICES DEBUG: 기본 서비스 초기화 완료');

// 기본 통계
let stats = {
    total: 0,
    today: 0,
    lastReset: new Date().toDateString(),
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
            version: '1.0.0',
        });
    } catch (error) {
        ResponseHandler.health(res, {
            useGemini: process.env.USE_GEMINI === 'true',
            useMongoDB: process.env.USE_MONGODB === 'true',
            database: {
                [FieldMapper.get('STATUS')]: 'error',
                message: error.message,
            },
            version: '1.0.0',
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
                connection: connectionStatus,
            },
            message: '데이터베이스 상태 확인 완료',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            [FieldMapper.get('ERROR')]: error.message,
            database: {
                type: 'MongoDB Atlas',
                [FieldMapper.get('STATUS')]: 'error',
            },
            message: '데이터베이스 연결 확인 실패',
        });
    }
});

// 🧪 MongoDB 테스트 API들
app.get('/api/database/test', async (req, res) => {
    try {
        // 1. 테스트 비디오 데이터 생성
        const testVideo = new Video({
            [FieldMapper.get('PLATFORM')]: 'youtube',
            [FieldMapper.get('TIMESTAMP')]: new Date(),
            [FieldMapper.get('CHANNEL_NAME')]: 'TestChannel',
            [FieldMapper.get('TITLE')]: 'MongoDB 연결 테스트 비디오',
            [FieldMapper.get('URL')]: 'https://www.youtube.com/watch?v=test123', // 🚀 FieldMapper 자동화
            [FieldMapper.get('COMMENTS_COUNT')]: 0, // 🚀 FieldMapper 자동화
            [FieldMapper.get('LIKES')]: 100,
            [FieldMapper.get('VIEWS')]: 1000,
            [FieldMapper.get('CATEGORY')]: 'Technology',
            [FieldMapper.get('AI_DESCRIPTION')]:
                'MongoDB Atlas 연결 테스트용 비디오입니다',
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
                document_id: saved._id,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            [FieldMapper.get('ERROR')]: error.message,
            message: 'MongoDB 테스트 실패',
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
            const collectionStats = await db
                .collection(collection.name)
                .countDocuments();
            stats[collection.name] = collectionStats;
        }

        res.json({
            success: true,
            database: 'videos',
            collections: stats,
            message: '컬렉션 상태 조회 완료',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            [FieldMapper.get('ERROR')]: error.message,
            message: '컬렉션 상태 조회 실패',
        });
    }
});

// 🚀 Google Sheets → MongoDB 마이그레이션 API (비활성화 - scripts 폴더 제거됨)
// app.post('/api/database/migrate', async (req, res) => {
//   try {
//     const DataMigrator = require('./scripts/migrate-to-mongodb');
//     const migrator = new DataMigrator();
//
//     ServerLogger.info('🚀 웹 API를 통한 마이그레이션 시작', 'API');
//
//     // 마이그레이션 실행
//     const stats = await migrator.migrate();
//
//     res.json({
//       success: true,
//       message: 'Google Sheets → MongoDB 마이그레이션 완료!',
//       stats: stats,
//       next_steps: [
//         '1. /api/database/collections로 마이그레이션된 데이터 확인',
//         '2. /api/videos-mongo로 MongoDB 데이터 조회 테스트',
//         '3. 기존 /api/videos와 성능 비교'
//       ]
//     });
//
//   } catch (error) {
//     ServerLogger.error('❌ 마이그레이션 API 실패', error.message, 'API');
//     res.status(500).json({
//       success: false,
//       [FieldMapper.get('ERROR')]: error.message,
//       message: '마이그레이션 실패'
//     });
//   }
// });

// 🗑️ MongoDB 데이터 초기화 API (재마이그레이션용)
app.delete('/api/database/reset', async (req, res) => {
    try {
        const deleteResult = await Video.deleteMany({});

        ServerLogger.info(
            `🗑️ MongoDB 데이터 초기화: ${deleteResult.deletedCount}개 문서 삭제`,
            'API',
        );

        res.json({
            success: true,
            message: `MongoDB 데이터 초기화 완료! ${deleteResult.deletedCount}개 문서 삭제`,
            deleted_count: deleteResult.deletedCount,
            next_step: 'POST /api/database/migrate로 재마이그레이션 실행 가능',
        });
    } catch (error) {
        ServerLogger.error('❌ 데이터 초기화 실패', error.message, 'API');
        res.status(500).json({
            success: false,
            [FieldMapper.get('ERROR')]: error.message,
            message: 'MongoDB 데이터 초기화 실패',
        });
    }
});

// 🔍 MongoDB 데이터 검증 API (비활성화 - scripts 폴더 제거됨)
// app.get('/api/database/verify', async (req, res) => {
//   try {
//     const verifyData = require('./scripts/verify-data');
//
//     // 콘솔 출력을 캡처하기 위한 헬퍼
//     const originalLog = console.log;
//     let output = '';
//     console.log = (...args) => {
//       output += args.join(' ') + '\n';
//       originalLog(...args);
//     };
//
//     const success = await verifyData();
//
//     // 원래 console.log 복구
//     console.log = originalLog;
//
//     res.json({
//       success: success,
//       message: success ? 'MongoDB 데이터 검증 완료!' : '데이터 검증 실패',
//       verification_output: output,
// //       [FieldMapper.get('TIMESTAMP')]: new Date()
//     });
//
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       [FieldMapper.get('ERROR')]: error.message,
//       message: '데이터 검증 API 실패'
//     });
//   }
// });

// 📊 마이그레이션 진행 상황 조회
app.get('/api/database/migration-status', async (req, res) => {
    try {
        const totalVideos = await Video.countDocuments();
        const platformStats = await Video.aggregate([
            { $group: { _id: '$platform', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        res.json({
            success: true,
            migration_status: {
                total_migrated: totalVideos,
                by_platform: platformStats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                last_updated: new Date(),
            },
            message: '마이그레이션 상태 조회 완료',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            [FieldMapper.get('ERROR')]: error.message,
            message: '마이그레이션 상태 조회 실패',
        });
    }
});

// 통계 조회
app.get('/api/stats', (req, res) => {
    try {
        checkDateReset();
        ResponseHandler.success(
            res,
            stats,
            '통계 정보를 성공적으로 조회했습니다.',
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            '통계 조회 중 오류가 발생했습니다.',
        );
    }
});

// Gemini 사용량 통계 조회
app.get('/api/gemini/usage', (req, res) => {
    try {
        const usageStats = aiAnalyzer.getGeminiUsageStats();
        ResponseHandler.success(
            res,
            usageStats,
            'Gemini 사용량 통계를 성공적으로 조회했습니다.',
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            'Gemini 사용량 통계 조회 중 오류가 발생했습니다.',
        );
    }
});

// Gemini 헬스체크 조회
app.get('/api/gemini/health', (req, res) => {
    try {
        const healthCheck = aiAnalyzer.getGeminiHealthCheck();
        ResponseHandler.success(
            res,
            healthCheck,
            'Gemini 헬스체크를 성공적으로 조회했습니다.',
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            'Gemini 헬스체크 조회 중 오류가 발생했습니다.',
        );
    }
});

// 구글 시트 연결 테스트
app.get('/api/test-sheets', async (req, res) => {
    try {
        const result = await sheetsManager.testConnection();
        ResponseHandler.success(
            res,
            result,
            API_MESSAGES.CONNECTION.SHEETS_SUCCESS,
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: ERROR_CODES.SHEETS_CONNECTION_FAILED,
                suggestion: '구글 API 키 설정과 인증을 확인해주세요.',
            },
            API_MESSAGES.CONNECTION.SHEETS_FAILED,
        );
    }
});

// 🔍 개별 YouTube 시트 직접 조회 테스트 API
app.get('/api/test-youtube-sheet', async (req, res) => {
    try {
        const range = 'YouTube!A2:S10';
        const response = await sheetsManager.sheets.spreadsheets.values.get({
            spreadsheetId: sheetsManager.spreadsheetId,
            range: range,
        });

        const data = response.data.values || [];
        const sampleData = data.slice(0, 3).map((row) => ({
            [FieldMapper.get('ID')]: row[0],
            [FieldMapper.get('TIMESTAMP')]: row[1],
            [FieldMapper.get('PLATFORM')]: row[2],
            [FieldMapper.get('CHANNEL_NAME')]: row[3],
            [FieldMapper.get('TITLE')]:
                row[9]?.substring(0, 50) + '...' || 'N/A',
        }));

        res.json({
            success: true,
            range,
            count: data.length,
            sampleData,
            message: `YouTube 시트에서 ${data.length}개 행 직접 조회 성공`,
        });
    } catch (error) {
        res.json({
            success: false,
            [FieldMapper.get('ERROR')]: error.message,
            range: 'YouTube!A2:S10',
        });
    }
});

// 🔍 구글 시트 구조 확인 API
app.get('/api/test-sheet-structure', async (req, res) => {
    try {
        const response = await sheetsManager.sheets.spreadsheets.get({
            spreadsheetId: sheetsManager.spreadsheetId,
        });
        const sheetInfo = response.data.sheets.map((sheet) => ({
            [FieldMapper.get('TITLE')]:
                sheet.properties[FieldMapper.get('TITLE')],
            sheetId: sheet.properties.sheetId,
            rowCount: sheet.properties.gridProperties.rowCount,
            columnCount: sheet.properties.gridProperties.columnCount,
        }));

        res.json({
            success: true,
            spreadsheetTitle:
                response.data.properties[FieldMapper.get('TITLE')],
            sheetInfo,
            totalSheets: sheetInfo.length,
        });
    } catch (error) {
        res.json({ success: false, [FieldMapper.get('ERROR')]: error.message });
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
                const response =
                    await sheetsManager.sheets.spreadsheets.values.get({
                        spreadsheetId: sheetsManager.spreadsheetId,
                        range: range,
                    });
                const count = (response.data.values?.length || 1) - 1; // 헤더 제외
                results[sheetName] = { success: true, count, range };
            } catch (error) {
                results[sheetName] = {
                    success: false,
                    [FieldMapper.get('ERROR')]: error.message,
                    count: 0,
                };
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        res.json({ success: false, [FieldMapper.get('ERROR')]: error.message });
    }
});

// 🔍 Instagram 시트 최신 데이터 조사 API
app.get('/api/test-instagram-latest', async (req, res) => {
    try {
        const range = 'Instagram!A2:B50'; // 처음 50개 행의 번호와 날짜만
        const response = await sheetsManager.sheets.spreadsheets.values.get({
            spreadsheetId: sheetsManager.spreadsheetId,
            range: range,
        });

        const data = response.data.values || [];

        // 날짜별로 정렬해서 최신 10개 확인
        const sortedData = data
            .filter((row) => row[1]) // 날짜가 있는 것만
            .sort((a, b) => {
                const dateA = new Date(
                    a[1].replace(/\. /g, '/').replace(/\.$/, ''),
                );
                const dateB = new Date(
                    b[1].replace(/\. /g, '/').replace(/\.$/, ''),
                );
                return dateB - dateA;
            })
            .slice(0, 10);

        res.json({
            success: true,
            range,
            totalRows: data.length,
            latestDates: sortedData.map((row) => ({
                [FieldMapper.get('ID')]: row[0],
                date: row[1],
            })),
            message: `Instagram 시트에서 ${data.length}개 행 조회, 최신 10개 날짜 정렬 완료`,
        });
    } catch (error) {
        res.json({ success: false, [FieldMapper.get('ERROR')]: error.message });
    }
});

// 설정 상태 확인 API
app.get('/api/config/health', (req, res) => {
    try {
        const healthStatus = config.healthCheck();
        const isHealthy = healthStatus[FieldMapper.get('STATUS')] === 'healthy';

        if (isHealthy) {
            ResponseHandler.success(
                res,
                healthStatus,
                API_MESSAGES.CONNECTION.CONFIG_VALID,
            );
        } else {
            ResponseHandler.clientError(
                res,
                {
                    code: ERROR_CODES.INVALID_CONFIGURATION,
                    message: API_MESSAGES.CONNECTION.CONFIG_INVALID,
                    details: healthStatus,
                },
                422,
            );
        }
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            '설정 상태 확인 중 오류가 발생했습니다.',
        );
    }
});

// 비디오 처리 메인 엔드포인트
app.post('/api/process-video', async (req, res) => {
    try {
        const {
            [FieldMapper.get('PLATFORM')]: platform,
            [FieldMapper.get('VIDEO_URL')]: videoUrl,
            [FieldMapper.get('POST_URL')]: postUrl,
            [FieldMapper.get('URL')]: url,
            [FieldMapper.get('METADATA')]: metadata,
            [FieldMapper.get('ANALYSIS_TYPE')]: analysisType = 'quick',
            [FieldMapper.get('USE_AI')]: useAI = true,
            mode = 'immediate',
        } = req.body;

        // 🔍 디버그: 받은 메타데이터 로깅
        ServerLogger.info(
            '📡 /api/process-video 엔드포인트에서 metadata 수신:',
            {
                platform,
                hasMetadata: !!metadata,
                metadataKeys: metadata ? Object.keys(metadata) : [],
                metadataPreview: metadata
                    ? JSON.stringify(metadata).substring(0, 200) + '...'
                    : 'null',
            },
        );

        // 🆕 URL 필드 통합 처리 (url 필드도 지원)
        const finalVideoUrl = videoUrl || url;
        const finalPostUrl = postUrl;

        // 🆕 플랫폼 자동 감지 (platform이 없는 경우)
        const finalPlatform =
            platform ||
            (finalVideoUrl
                ? finalVideoUrl.includes('youtube.com') ||
                  finalVideoUrl.includes('youtu.be')
                    ? 'youtube'
                    : finalVideoUrl.includes('instagram.com')
                    ? 'instagram'
                    : finalVideoUrl.includes('tiktok.com')
                    ? 'tiktok'
                    : 'unknown'
                : 'unknown');

        // 🔍 URL 중복 검사 (모든 플랫폼 공통)
        const checkUrl = finalVideoUrl || finalPostUrl;
        let videoUrlDoc = null; // MongoDB 문서 참조용

        if (checkUrl) {
            try {
                const duplicateCheck =
                    await sheetsManager.checkDuplicateURLFast(checkUrl);

                if (duplicateCheck.isDuplicate) {
                    let errorMessage;

                    if (duplicateCheck[FieldMapper.get('IS_PROCESSING')]) {
                        errorMessage = `🔄 처리 중인 URL: 같은 URL이 현재 처리되고 있습니다 (${duplicateCheck.existingPlatform})`;
                    } else {
                        errorMessage = `⚠️ 중복 URL: 이미 ${duplicateCheck.existingPlatform} 시트의 ${duplicateCheck.existingColumn}${duplicateCheck.existingRow}행에 존재합니다`;
                    }

                    ServerLogger.warn(errorMessage, 'API_DUPLICATE');

                    return res.status(409).json({
                        success: false,
                        [FieldMapper.get('ERROR')]: 'DUPLICATE_URL',
                        message: errorMessage,
                        duplicate_info: {
                            [FieldMapper.get('PLATFORM')]:
                                duplicateCheck.existingPlatform,
                            [FieldMapper.get('ROW')]:
                                duplicateCheck.existingRow,
                            [FieldMapper.get('COLUMN')]:
                                duplicateCheck.existingColumn,
                            [FieldMapper.get('NORMALIZED_URL')]:
                                sheetsManager.normalizeVideoUrl(checkUrl),
                            [FieldMapper.get('IS_PROCESSING')]:
                                duplicateCheck[
                                    FieldMapper.get('IS_PROCESSING')
                                ] || false,
                            [FieldMapper.get('STATUS')]:
                                duplicateCheck[FieldMapper.get('STATUS')],
                        },
                    });
                }

                // ✅ 중복이 아닌 경우 - 즉시 processing 상태로 MongoDB에 등록
                const normalizedUrl = sheetsManager.normalizeVideoUrl(checkUrl);
                const VideoUrl = require('./models/VideoUrl');

                const registerResult = await VideoUrl.registerUrl(
                    normalizedUrl,
                    checkUrl,
                    finalPlatform,
                    null, // sheetLocation은 나중에 업데이트
                );

                if (registerResult.success) {
                    videoUrlDoc = registerResult.document;
                    ServerLogger.info(
                        `✅ URL processing 상태 등록: ${normalizedUrl} (${finalPlatform})`,
                    );
                } else {
                    ServerLogger.warn(
                        `⚠️ URL processing 상태 등록 실패: ${
                            registerResult[FieldMapper.get('ERROR')]
                        }`,
                    );
                }

                ServerLogger.info(
                    `✅ URL 중복 검사 통과: ${checkUrl}`,
                    'API_DUPLICATE',
                );
            } catch (duplicateError) {
                // 중복 검사 실패해도 계속 진행 (시스템 안정성을 위해)
                ServerLogger.warn(
                    `중복 검사 실패하여 건너뜀: ${duplicateError.message}`,
                    'API_DUPLICATE',
                );
            }
        }

        // 🆕 YouTube 배치 모드 처리
        if (finalPlatform === 'youtube' && mode === 'batch') {
            try {
                const options = {
                    [FieldMapper.get('PRIORITY')]:
                        req.body.priority || 'normal',
                    [FieldMapper.get('CLIENT_INFO')]: {
                        [FieldMapper.get('USER_AGENT')]: req.get('User-Agent'),
                        [FieldMapper.get(
                            'REQUEST_ID',
                        )]: `req_${Date.now()}_${Math.random()
                            .toString(36)
                            .substr(2, 9)}`,
                        [FieldMapper.get('TIMESTAMP')]:
                            new Date().toISOString(),
                    },
                    [FieldMapper.get('METADATA')]: metadata || {},
                };

                const batchResult = await youtubeBatchProcessor.addToBatch(
                    finalVideoUrl,
                    options,
                );

                ServerLogger.info(`📦 YouTube 배치 모드: 큐에 추가됨`, {
                    [FieldMapper.get('BATCH_ID')]:
                        batchResult[FieldMapper.get('BATCH_ID')],
                    [FieldMapper.get('QUEUE_POSITION')]:
                        batchResult.queuePosition,
                    [FieldMapper.get('ESTIMATED_WAIT_TIME')]:
                        batchResult.estimatedWaitTime,
                });

                return res.json({
                    success: true,
                    message: '배치 큐에 추가되었습니다',
                    [FieldMapper.get('DATA')]: {
                        [FieldMapper.get('MODE')]: 'batch',
                        ...batchResult,
                        [FieldMapper.get('API_SAVING')]:
                            '개별 호출 대비 97% 쿼터 절약',
                        [FieldMapper.get('ESTIMATED_PROCESS_TIME')]:
                            '최대 60초 또는 50개 모일 때까지 대기',
                    },
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
            [FieldMapper.get('ID')]: `url_${finalPlatform}_${Date.now()}`,
            [FieldMapper.get('TYPE')]: 'url',
            [FieldMapper.get('DATA')]: {
                [FieldMapper.get('PLATFORM')]: finalPlatform,
                [FieldMapper.get('VIDEO_URL')]: finalVideoUrl,
                [FieldMapper.get('POST_URL')]: finalPostUrl,
                metadata,
                [FieldMapper.get('ANALYSIS_TYPE')]: analysisType,
                [FieldMapper.get('USE_AI')]: useAI,
            },
            [FieldMapper.get('PROCESSOR')]: async (taskData) => {
                const {
                    [FieldMapper.get('PLATFORM')]: platform,
                    [FieldMapper.get('VIDEO_URL')]: videoUrl,
                    [FieldMapper.get('POST_URL')]: postUrl,
                    [FieldMapper.get('ANALYSIS_TYPE')]: analysisType,
                    [FieldMapper.get('USE_AI')]: useAI,
                } = taskData;
                let metadata = taskData[FieldMapper.get('METADATA')]; // 🆕 재할당 가능하도록 let으로 선언

                ServerLogger.info(`🎬 Processing ${platform} video:`, postUrl);
                ServerLogger.info(
                    `🔍 Analysis type: ${analysisType}, AI 분석: ${
                        useAI ? '활성화' : '비활성화'
                    }`,
                );

                let videoPath;
                let youtubeInfo = null;

                // YouTube인 경우 API로 정보 수집
                if (platform === 'youtube') {
                    ServerLogger.info('0️⃣ YouTube 정보 수집 중...');
                    youtubeInfo = await videoProcessor.getYouTubeVideoInfo(
                        videoUrl,
                    );
                    ServerLogger.info(
                        `📺 ${
                            youtubeInfo[FieldMapper.get('CONTENT_TYPE')]
                        } 감지: ${youtubeInfo[FieldMapper.get('TITLE')]}`,
                    );
                    ServerLogger.info(
                        `⏱️ 길이: ${
                            youtubeInfo[FieldMapper.get('DURATION_FORMATTED')]
                        }`,
                    );

                    // YouTube는 일단 정보 수집만 (다운로드는 후단계에서)
                    // 실제 비디오 다운로드 URL이 필요한 경우 여기서 처리
                    videoPath = null; // 임시로 null 설정
                } else {
                    // Instagram/TikTok: 기존 방식
                    ServerLogger.info('1️⃣ 비디오 다운로드 중...');
                    videoPath = await videoProcessor.downloadVideo(
                        videoUrl,
                        platform,
                    );
                }

                let thumbnailPaths;
                let analysis;
                let enrichedMetadata = { platform }; // 🆕 기본값으로 초기화

                if (platform === 'youtube') {
                    // YouTube 정보를 원본 metadata에 병합 (시트 저장용)
                    // 🆕 metadata가 null/undefined인 경우 빈 객체로 초기화
                    if (!metadata || typeof metadata !== 'object') {
                        metadata = {};
                    }
                    Object.assign(metadata, {
                        [FieldMapper.get('TITLE')]:
                            youtubeInfo[FieldMapper.get('TITLE')],
                        [FieldMapper.get('DESCRIPTION')]:
                            youtubeInfo[FieldMapper.get('DESCRIPTION')],
                        [FieldMapper.get('CHANNEL_NAME')]:
                            youtubeInfo[FieldMapper.get('CHANNEL_NAME')],
                        [FieldMapper.get('LIKES')]:
                            youtubeInfo[FieldMapper.get('LIKES')],
                        [FieldMapper.get('COMMENTS')]:
                            youtubeInfo[FieldMapper.get('COMMENTS_COUNT')],
                        [FieldMapper.get('VIEWS')]:
                            youtubeInfo[FieldMapper.get('VIEWS')],
                        [FieldMapper.get('DURATION')]:
                            youtubeInfo[FieldMapper.get('DURATION')],
                        [FieldMapper.get('DURATION_FORMATTED')]:
                            youtubeInfo[FieldMapper.get('DURATION_FORMATTED')],
                        [FieldMapper.get('UPLOAD_DATE')]:
                            youtubeInfo[FieldMapper.get('UPLOAD_DATE')],
                        [FieldMapper.get('CONTENT_TYPE')]:
                            youtubeInfo[FieldMapper.get('CONTENT_TYPE')],
                        [FieldMapper.get('YOUTUBE_CATEGORY')]:
                            youtubeInfo[FieldMapper.get('YOUTUBE_CATEGORY')],
                        // YouTube 추가 정보
                        [FieldMapper.get('SUBSCRIBERS')]:
                            youtubeInfo[FieldMapper.get('SUBSCRIBERS')],
                        [FieldMapper.get('CHANNEL_VIDEOS')]:
                            youtubeInfo[FieldMapper.get('CHANNEL_VIDEOS')],
                        [FieldMapper.get('MONETIZED')]:
                            youtubeInfo[FieldMapper.get('MONETIZED')],
                        [FieldMapper.get('CATEGORY_ID')]:
                            youtubeInfo[FieldMapper.get('CATEGORY_ID')],
                        [FieldMapper.get('LICENSE')]:
                            youtubeInfo[FieldMapper.get('LICENSE')],
                        [FieldMapper.get('DEFINITION')]:
                            youtubeInfo[FieldMapper.get('DEFINITION')],
                        [FieldMapper.get('LANGUAGE')]:
                            youtubeInfo[FieldMapper.get('LANGUAGE')],
                        [FieldMapper.get('AGE_RESTRICTED')]:
                            youtubeInfo[FieldMapper.get('AGE_RESTRICTED')],
                        [FieldMapper.get('LIVE_BROADCAST')]:
                            youtubeInfo[FieldMapper.get('LIVE_BROADCAST')],
                        // YouTube 핸들명과 채널 URL 추가 🎯
                        [FieldMapper.get('YOUTUBE_HANDLE')]:
                            youtubeInfo[FieldMapper.get('YOUTUBE_HANDLE')],
                        [FieldMapper.get('CHANNEL_URL')]:
                            youtubeInfo[FieldMapper.get('CHANNEL_URL')],
                        // 새로운 필드들 추가 🆕
                        [FieldMapper.get('DESCRIPTION')]:
                            youtubeInfo[FieldMapper.get('DESCRIPTION')],
                        [FieldMapper.get('HASHTAGS')]:
                            youtubeInfo[FieldMapper.get('HASHTAGS')],
                        [FieldMapper.get('MENTIONS')]:
                            youtubeInfo[FieldMapper.get('MENTIONS')],
                        [FieldMapper.get('TOP_COMMENTS')]:
                            youtubeInfo[FieldMapper.get('TOP_COMMENTS')],
                        [FieldMapper.get('COMMENTS_COUNT')]:
                            youtubeInfo[FieldMapper.get('COMMENTS_COUNT')],
                        [FieldMapper.get('THUMBNAIL_URL')]:
                            youtubeInfo[FieldMapper.get('THUMBNAIL_URL')],
                    });

                    enrichedMetadata = {
                        ...metadata,
                        platform,
                        [FieldMapper.get('URL')]: videoUrl || postUrl, // 🆕 원본 URL 추가
                        // 🆕 YouTube 전용 ID 추가
                        [FieldMapper.get('VIDEO_ID')]:
                            youtubeInfo?.[FieldMapper.get('VIDEO_ID')] ||
                            videoUrl?.match(/[?&]v=([^&]+)/)?.[1],
                        [FieldMapper.get('CHANNEL_ID')]:
                            youtubeInfo?.[FieldMapper.get('CHANNEL_ID')],
                    };

                    thumbnailPaths = [
                        youtubeInfo[FieldMapper.get('THUMBNAIL_URL')],
                    ]; // 썸네일 URL 저장

                    // AI 분석 조건부 실행
                    if (useAI && analysisType !== 'none') {
                        ServerLogger.info('1️⃣ YouTube 썸네일로 AI 분석 중...');
                        analysis = await aiAnalyzer.analyzeVideo(
                            youtubeInfo[FieldMapper.get('THUMBNAIL_URL')],
                            enrichedMetadata,
                        );

                        // 🔍 AI 분석 결과 디버깅
                        console.log(
                            '🔍 AI 분석 결과 전체:',
                            JSON.stringify(analysis, null, 2),
                        );

                        // YouTube 카테고리와 AI 카테고리 일치율 비교
                        if (
                            youtubeInfo[FieldMapper.get('CATEGORY')] &&
                            analysis.mainCategory
                        ) {
                            const matchResult =
                                videoProcessor.compareCategories(
                                    youtubeInfo[FieldMapper.get('CATEGORY')],
                                    analysis.mainCategory,
                                    analysis.middleCategory,
                                    analysis.fullCategoryPath,
                                );

                            // 분석 결과에 일치율 정보 추가
                            analysis.categoryMatch = matchResult;

                            ServerLogger.info(
                                `📊 카테고리 일치율: ${matchResult.matchScore}% (${matchResult.matchType})`,
                            );
                            ServerLogger.info(
                                `📋 일치 사유: ${matchResult.matchReason}`,
                            );
                        }
                    } else {
                        ServerLogger.info('1️⃣ AI 분석 건너뜀 (사용자 설정)');
                        // YouTube 카테고리를 기본 분류로 사용
                        const youtubeMainCategory =
                            youtubeInfo[FieldMapper.get('CATEGORY')] ||
                            '미분류';
                        ServerLogger.info(
                            `📂 YouTube 카테고리 사용: ${youtubeMainCategory}`,
                        );

                        analysis = {
                            [FieldMapper.get('CATEGORY')]: '분석 안함',
                            [FieldMapper.get('MAIN_CATEGORY')]:
                                youtubeMainCategory, // YouTube 카테고리 사용 🎯
                            [FieldMapper.get('MIDDLE_CATEGORY')]: '기본',
                            [FieldMapper.get('KEYWORDS')]: [],
                            [FieldMapper.get('HASHTAGS')]: [],
                            [FieldMapper.get('CONFIDENCE')]: 100, // YouTube 공식 카테고리이므로 100% 신뢰도
                            [FieldMapper.get('FRAME_COUNT')]: 1,
                            categoryMatch: {
                                matchScore: 100,
                                [FieldMapper.get('MATCH_TYPE')]:
                                    'youtube_official',
                                [FieldMapper.get(
                                    'MATCH_REASON',
                                )]: `YouTube 공식 카테고리: ${youtubeMainCategory}`,
                            },
                            [FieldMapper.get('AI_MODEL')]: '수동', // AI 비사용 시 '수동'으로 표시
                        };
                    }
                } else {
                    // Instagram/TikTok: 기존 방식
                    // 2단계: 썸네일/프레임 생성
                    if (
                        analysisType === 'multi-frame' ||
                        analysisType === 'full'
                    ) {
                        ServerLogger.info('2️⃣ 다중 프레임 추출 중...');
                        thumbnailPaths = await videoProcessor.generateThumbnail(
                            videoPath,
                            analysisType,
                        );
                        ServerLogger.info(
                            `✅ ${thumbnailPaths.length}개 프레임 추출 완료`,
                        );
                    } else {
                        ServerLogger.info('2️⃣ 단일 썸네일 생성 중...');
                        var singleThumbnail =
                            await videoProcessor.generateThumbnail(
                                videoPath,
                                analysisType,
                            );
                        thumbnailPaths = Array.isArray(singleThumbnail)
                            ? singleThumbnail
                            : [singleThumbnail];
                    }

                    // 3단계: AI 분석 (조건부 실행)
                    enrichedMetadata = {
                        ...metadata,
                        [FieldMapper.get('PLATFORM')]: platform,
                        [FieldMapper.get('URL')]: videoUrl || postUrl,
                    };

                    if (useAI && analysisType !== 'none') {
                        if (thumbnailPaths.length > 1) {
                            ServerLogger.info(
                                `3️⃣ 다중 프레임 AI 분석 중... (${thumbnailPaths.length}개 프레임)`,
                            );
                        } else {
                            ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
                        }
                        analysis = await aiAnalyzer.analyzeVideo(
                            thumbnailPaths,
                            enrichedMetadata,
                        );
                    } else {
                        ServerLogger.info('3️⃣ AI 분석 건너뜀 (사용자 설정)');
                        analysis = {
                            [FieldMapper.get('CATEGORY')]: '분석 안함',
                            [FieldMapper.get('MAIN_CATEGORY')]: '미분류',
                            [FieldMapper.get('MIDDLE_CATEGORY')]: '기본',
                            [FieldMapper.get('KEYWORDS')]: [],
                            [FieldMapper.get('HASHTAGS')]: [],
                            [FieldMapper.get('CONFIDENCE')]: 0,
                            [FieldMapper.get('FRAME_COUNT')]:
                                thumbnailPaths.length,
                            [FieldMapper.get('AI_MODEL')]: '수동', // AI 비사용 시 '수동'으로 표시
                        };
                    }
                }

                // AI 분석에서 오류가 발생한 경우 시트 저장 중단
                if (analysis.aiError && analysis.aiError.occurred) {
                    ServerLogger.error(
                        '❌ AI 분석 실패로 인한 처리 중단:',
                        analysis.aiError.message,
                    );

                    // 통계는 업데이트하지 않음
                    ServerLogger.info(
                        '⚠️ AI 분석 오류로 인해 시트 저장을 건너뜁니다',
                    );

                    return {
                        [FieldMapper.get('PROCESSING')]: {
                            platform,
                            analysisType,
                            [FieldMapper.get('FRAME_COUNT')]:
                                analysis.frameCount || 1,
                            skippedSaving: true,
                        },
                        [FieldMapper.get('ANALYSIS')]: {
                            [FieldMapper.get('CATEGORY')]:
                                analysis[FieldMapper.get('CATEGORY')],
                            [FieldMapper.get('MAIN_CATEGORY')]:
                                analysis.mainCategory,
                            [FieldMapper.get('MIDDLE_CATEGORY')]:
                                analysis.middleCategory,
                            [FieldMapper.get('KEYWORDS')]: analysis.keywords,
                            [FieldMapper.get('HASHTAGS')]: analysis.hashtags,
                            [FieldMapper.get('CONFIDENCE')]:
                                analysis.confidence,
                        },
                        [FieldMapper.get('FILES')]: {
                            [FieldMapper.get('VIDEO_PATH')]: videoPath,
                            [FieldMapper.get('THUMBNAIL_PATH')]: Array.isArray(
                                thumbnailPaths,
                            )
                                ? thumbnailPaths[0]
                                : thumbnailPaths,
                            [FieldMapper.get('THUMBNAIL_PATHS')]:
                                thumbnailPaths,
                        },
                        [FieldMapper.get('AI_ERROR')]: analysis.aiError,
                    };
                }

                // 4-5단계: 통합 저장 (Google Sheets + MongoDB 동시 저장) 🆕
                ServerLogger.info(
                    '4-5️⃣ 통합 저장 시작 (Google Sheets + MongoDB)',
                );
                const result = await unifiedVideoSaver.saveVideoData(platform, {
                    platform,
                    postUrl,
                    videoPath,
                    [FieldMapper.get('THUMBNAIL_PATH')]: Array.isArray(
                        thumbnailPaths,
                    )
                        ? thumbnailPaths[0]
                        : thumbnailPaths,
                    [FieldMapper.get('THUMBNAIL_PATHS')]: thumbnailPaths,
                    metadata,
                    analysis,
                    [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
                });

                // 통합 저장 결과 확인
                if (!result.success) {
                    // Google Sheets 인증 문제는 경고로 처리하고 계속 진행
                    if (
                        result[FieldMapper.get('ERROR')] &&
                        result[FieldMapper.get('ERROR')].includes(
                            'invalid_grant',
                        )
                    ) {
                        ServerLogger.warn(
                            `⚠️ Google Sheets 인증 실패로 시트 저장 건너뜀: ${
                                result[FieldMapper.get('ERROR')]
                            }`,
                        );
                        // MongoDB 저장이 성공했다면 계속 진행
                        if (result.mongodb && result.mongodb.success) {
                            ServerLogger.info(
                                '✅ MongoDB 저장은 성공, Google Sheets 실패는 무시하고 계속 진행',
                            );
                        } else {
                            throw new Error(
                                `통합 저장 실패: ${
                                    result[FieldMapper.get('ERROR')]
                                }`,
                            );
                        }
                    } else {
                        throw new Error(
                            `통합 저장 실패: ${
                                result[FieldMapper.get('ERROR')]
                            }`,
                        );
                    }
                }

                ServerLogger.info('✅ 통합 저장 완료!', {
                    [FieldMapper.get(
                        'SHEETS_TIME',
                    )]: `${result.performance.sheetsTime}ms`,
                    [FieldMapper.get(
                        'MONGO_TIME',
                    )]: `${result.performance.mongoTime}ms`,
                    [FieldMapper.get(
                        'TOTAL_TIME',
                    )]: `${result.performance.totalTime}ms`,
                });

                // 통계 업데이트
                stats.total++;
                stats.today++;

                ServerLogger.info('✅ 비디오 처리 완료 (통합 저장)');

                // ✅ 성공적으로 처리 완료 시 MongoDB 상태를 'completed'로 업데이트
                if (videoUrlDoc && checkUrl) {
                    try {
                        const VideoUrl = require('./models/VideoUrl');
                        const normalizedUrl =
                            sheetsManager.normalizeVideoUrl(checkUrl);

                        // sheetInfo가 있으면 사용, 없으면 null로 업데이트
                        const sheetLocation = result.sheets
                            ? {
                                  [FieldMapper.get('SHEET_NAME')]:
                                      result.sheets.sheetName,
                                  [FieldMapper.get('COLUMN')]: 'N', // URL 저장 컬럼
                                  [FieldMapper.get('ROW')]:
                                      result.sheets.nextRow,
                              }
                            : null;

                        // YouTube 게시일 추출 (enrichedMetadata에서)
                        const originalPublishDate = enrichedMetadata[
                            FieldMapper.get('UPLOAD_DATE')
                        ]
                            ? new Date(
                                  enrichedMetadata[
                                      FieldMapper.get('UPLOAD_DATE')
                                  ],
                              )
                            : null;

                        await VideoUrl.updateStatus(
                            normalizedUrl,
                            'completed',
                            sheetLocation,
                            originalPublishDate,
                        );

                        ServerLogger.info(
                            `✅ URL 상태 업데이트: ${normalizedUrl} -> completed`,
                        );
                    } catch (statusError) {
                        ServerLogger.warn(
                            `⚠️ URL 상태 업데이트 실패: ${statusError.message}`,
                        );
                    }
                }

                // 🕰️ 처리 시간 계산
                const processingEndTime = Date.now();
                const totalProcessingTime = 2000; // 임시값

                const responseData = {
                    [FieldMapper.get('PROCESSING')]: {
                        platform,
                        analysisType,
                        [FieldMapper.get('FRAME_COUNT')]:
                            analysis.frameCount || 1,
                        // 🆕 시간 정보 추가
                        [FieldMapper.get('START_TIME')]:
                            new Date().toISOString(),
                        [FieldMapper.get('END_TIME')]: new Date().toISOString(),
                        [FieldMapper.get(
                            'TOTAL_TIME',
                        )]: `${totalProcessingTime}ms`,
                        [FieldMapper.get('AI_PROCESSING_TIME')]:
                            analysis[FieldMapper.get('PROCESSING_TIME')] ||
                            'N/A',
                    },
                    [FieldMapper.get('METADATA')]: {
                        ...enrichedMetadata,
                        // 🆕 상세 메타데이터 추가
                        [FieldMapper.get('TITLE')]:
                            enrichedMetadata[FieldMapper.get('TITLE')] ||
                            youtubeInfo?.[FieldMapper.get('TITLE')],
                        [FieldMapper.get('UPLOAD_DATE')]:
                            enrichedMetadata[FieldMapper.get('UPLOAD_DATE')] ||
                            '',
                        [FieldMapper.get('CHANNEL_ID')]:
                            youtubeInfo?.[FieldMapper.get('CHANNEL_ID')] || '',
                        [FieldMapper.get('VIDEO_ID')]:
                            youtubeInfo?.[FieldMapper.get('VIDEO_ID')] ||
                            videoUrl?.match(/[?&]v=([^&]+)/)?.[1] ||
                            '',
                        [FieldMapper.get('CHANNEL_NAME')]: (() => {
                            const channelName =
                                enrichedMetadata[
                                    FieldMapper.get('CHANNEL_NAME')
                                ] ||
                                youtubeInfo?.[
                                    FieldMapper.get('CHANNEL_NAME')
                                ] ||
                                '';
                            ServerLogger.info(
                                `🔍 채널명 디버그: ${channelName}`,
                                {
                                    enrichedChannelName:
                                        enrichedMetadata[
                                            FieldMapper.get('CHANNEL_NAME')
                                        ],
                                    enrichedChannelNameLegacy:
                                        enrichedMetadata[
                                            FieldMapper.get('CHANNEL_NAME')
                                        ],
                                    youtubeInfoChannel:
                                        youtubeInfo?.[
                                            FieldMapper.get('CHANNEL_NAME')
                                        ],
                                    finalChannelName: channelName,
                                },
                            );
                            return channelName;
                        })(),
                        [FieldMapper.get('CHANNEL_URL')]:
                            enrichedMetadata[FieldMapper.get('CHANNEL_URL')] ||
                            youtubeInfo?.[FieldMapper.get('CHANNEL_URL')] ||
                            '',
                        [FieldMapper.get('TAGS')]:
                            enrichedMetadata[FieldMapper.get('TAGS')] ||
                            youtubeInfo?.[FieldMapper.get('TAGS')] ||
                            [],
                        [FieldMapper.get('LANGUAGE')]:
                            enrichedMetadata[FieldMapper.get('LANGUAGE')] &&
                            enrichedMetadata[
                                FieldMapper.get('LANGUAGE')
                            ].trim() !== ''
                                ? enrichedMetadata[FieldMapper.get('LANGUAGE')]
                                : enrichedMetadata[
                                      FieldMapper.get('DEFAULT_LANGUAGE')
                                  ] &&
                                  enrichedMetadata[
                                      FieldMapper.get('DEFAULT_LANGUAGE')
                                  ].trim() !== ''
                                ? enrichedMetadata[
                                      FieldMapper.get('DEFAULT_LANGUAGE')
                                  ]
                                : youtubeInfo?.[FieldMapper.get('LANGUAGE')] &&
                                  youtubeInfo?.[
                                      FieldMapper.get('LANGUAGE')
                                  ].trim() !== ''
                                ? youtubeInfo?.[FieldMapper.get('LANGUAGE')]
                                : youtubeInfo?.[
                                      FieldMapper.get('DEFAULT_LANGUAGE')
                                  ] &&
                                  youtubeInfo?.[
                                      FieldMapper.get('DEFAULT_LANGUAGE')
                                  ].trim() !== ''
                                ? youtubeInfo?.[
                                      FieldMapper.get('DEFAULT_LANGUAGE')
                                  ]
                                : youtubeInfo?.[
                                      FieldMapper.get('DEFAULT_AUDIO_LANGUAGE')
                                  ] &&
                                  youtubeInfo?.[
                                      FieldMapper.get('DEFAULT_AUDIO_LANGUAGE')
                                  ].trim() !== ''
                                ? youtubeInfo?.[
                                      FieldMapper.get('DEFAULT_AUDIO_LANGUAGE')
                                  ]
                                : null,
                        [FieldMapper.get('LICENSED_CONTENT')]:
                            enrichedMetadata[
                                FieldMapper.get('LICENSED_CONTENT')
                            ] || '',
                        [FieldMapper.get('CATEGORY_ID')]:
                            youtubeInfo?.[FieldMapper.get('CATEGORY_ID')] || 0,
                        [FieldMapper.get('SHARES')]:
                            enrichedMetadata[FieldMapper.get('SHARES')] || 0,
                        [FieldMapper.get('VIDEO_URL')]:
                            finalVideoUrl || postUrl || '',
                        [FieldMapper.get('TOP_COMMENTS')]:
                            enrichedMetadata[FieldMapper.get('TOP_COMMENTS')] ||
                            youtubeInfo?.[FieldMapper.get('TOP_COMMENTS')] ||
                            '',
                        // 📈 통계 정보 추가
                        [FieldMapper.get('LIKE_RATIO')]:
                            enrichedMetadata[FieldMapper.get('LIKES')] &&
                            enrichedMetadata[FieldMapper.get('VIEWS')]
                                ? (
                                      (parseInt(
                                          enrichedMetadata[
                                              FieldMapper.get('LIKES')
                                          ],
                                      ) /
                                          parseInt(
                                              enrichedMetadata[
                                                  FieldMapper.get('VIEWS')
                                              ],
                                          )) *
                                      100
                                  ).toFixed(2) + '%'
                                : '',
                        [FieldMapper.get('ENGAGEMENT_RATE')]:
                            enrichedMetadata[FieldMapper.get('LIKES')] &&
                            enrichedMetadata[FieldMapper.get('COMMENTS')] &&
                            enrichedMetadata[FieldMapper.get('VIEWS')]
                                ? (
                                      ((parseInt(
                                          enrichedMetadata[
                                              FieldMapper.get('LIKES')
                                          ],
                                      ) +
                                          parseInt(
                                              enrichedMetadata[
                                                  FieldMapper.get(
                                                      'COMMENTS_COUNT',
                                                  )
                                              ] || 0,
                                          )) /
                                          parseInt(
                                              enrichedMetadata[
                                                  FieldMapper.get('VIEWS')
                                              ],
                                          )) *
                                      100
                                  ).toFixed(2) + '%'
                                : '',
                    },
                    [FieldMapper.get('ANALYSIS')]: {
                        [FieldMapper.get('CATEGORY')]:
                            analysis[FieldMapper.get('CATEGORY')] ||
                            analysis.mainCategory ||
                            '미분류',
                        [FieldMapper.get('MAIN_CATEGORY')]:
                            analysis.mainCategory,
                        [FieldMapper.get('MIDDLE_CATEGORY')]:
                            analysis.middleCategory,
                        [FieldMapper.get('KEYWORDS')]: analysis.keywords,
                        [FieldMapper.get('HASHTAGS')]: analysis.hashtags,
                        [FieldMapper.get('CONFIDENCE')]: analysis.confidence,
                        // 🆕 AI 분석 상세 내용 추가 (폴백 시스템 신뢰)
                        [FieldMapper.get('SUMMARY')]:
                            analysis[FieldMapper.get('SUMMARY')],
                        [FieldMapper.get('DESCRIPTION')]:
                            analysis[FieldMapper.get('DESCRIPTION')],
                        [FieldMapper.get('CONTENT')]:
                            analysis[FieldMapper.get('CONTENT')],
                        [FieldMapper.get('ANALYSIS_CONTENT')]:
                            analysis[FieldMapper.get('ANALYSIS_CONTENT')] ||
                            analysis[FieldMapper.get('SUMMARY')] ||
                            analysis[FieldMapper.get('DESCRIPTION')] ||
                            analysis[FieldMapper.get('CONTENT')] ||
                            null,
                        [FieldMapper.get('SOURCE')]:
                            analysis[FieldMapper.get('SOURCE')] || 'gemini',
                        [FieldMapper.get('AI_MODEL')]:
                            analysis.aiModel || 'gemini-2.5-flash-lite',
                        [FieldMapper.get('PROCESSING_TIME')]:
                            analysis[FieldMapper.get('PROCESSING_TIME')] ||
                            'N/A',
                        // 🏷️ 카테고리 매칭 상세
                        [FieldMapper.get('FULL_CATEGORY_PATH')]:
                            analysis.fullCategoryPath ||
                            `${analysis.mainCategory}/${analysis.middleCategory}`,
                        [FieldMapper.get('CATEGORY_MATCH_RATE')]:
                            analysis.categoryMatch
                                ? `${analysis.categoryMatch.matchScore}%`
                                : analysis.categoryMatchRate || null,
                        [FieldMapper.get('MATCH_TYPE')]: analysis.categoryMatch
                            ? analysis.categoryMatch.matchType
                            : analysis.matchType ||
                              (analysis[FieldMapper.get('SOURCE')]
                                  ? `${
                                        analysis[FieldMapper.get('SOURCE')]
                                    }-analysis`
                                  : null),
                        [FieldMapper.get('MATCH_REASON')]:
                            analysis.categoryMatch
                                ? analysis.categoryMatch.matchReason
                                : analysis.matchReason ||
                                  (analysis[FieldMapper.get('SOURCE')]
                                      ? `${
                                            analysis[FieldMapper.get('SOURCE')]
                                        } 분석 결과`
                                      : null),
                    },
                    // 🆕 누락된 필드들 추가
                    [FieldMapper.get('COMMENTS_COUNT')]:
                        enrichedMetadata[FieldMapper.get('COMMENTS_COUNT')] ||
                        0,
                    [FieldMapper.get('COMMENTS')]:
                        enrichedMetadata[FieldMapper.get('TOP_COMMENTS')] || '',
                    [FieldMapper.get('URL')]:
                        enrichedMetadata[FieldMapper.get('URL')] ||
                        videoUrl ||
                        postUrl ||
                        '',
                    [FieldMapper.get('FILES')]: {
                        [FieldMapper.get('VIDEO_PATH')]: videoPath,
                        [FieldMapper.get('THUMBNAIL_PATH')]: Array.isArray(
                            thumbnailPaths,
                        )
                            ? thumbnailPaths[0]
                            : thumbnailPaths,
                        [FieldMapper.get('THUMBNAIL_PATHS')]: thumbnailPaths,
                        // 🆕 비디오 상세 정보 추가
                        [FieldMapper.get('VIDEO_SIZE')]: videoPath
                            ? 'N/A'
                            : null,
                        [FieldMapper.get('VIDEO_FORMAT')]: 'youtube-stream',
                        [FieldMapper.get('VIDEO_QUALITY')]:
                            enrichedMetadata[
                                FieldMapper.get('VIDEO_QUALITY')
                            ] || 'hd',
                    },
                };

                // AI 오류 정보가 있으면 추가
                if (analysis.aiError) {
                    responseData.aiError = analysis.aiError;
                }

                return responseData;
            },
        });

        ResponseHandler.success(
            res,
            result,
            API_MESSAGES.VIDEO.PROCESSING_SUCCESS,
        );
    } catch (error) {
        ServerLogger.error('비디오 처리 실패:', error);

        // ❌ 처리 실패 시 MongoDB에서 URL 상태를 failed로 업데이트
        const {
            [FieldMapper.get('VIDEO_URL')]: errorVideoUrl,
            [FieldMapper.get('POST_URL')]: errorPostUrl,
        } = req.body;
        const checkUrl = errorVideoUrl || errorPostUrl;
        if (checkUrl) {
            try {
                const VideoUrl = require('./models/VideoUrl');
                const normalizedUrl = sheetsManager.normalizeVideoUrl(checkUrl);

                await VideoUrl.updateStatus(normalizedUrl, 'failed');

                ServerLogger.info(
                    `❌ 처리 실패로 인한 URL 상태 업데이트: ${normalizedUrl} -> failed`,
                );
            } catch (updateError) {
                ServerLogger.warn(
                    `⚠️ 처리 실패 URL 상태 업데이트 실패: ${updateError.message}`,
                );
            }
        }

        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: ERROR_CODES.VIDEO_PROCESSING_FAILED,
            },
            API_MESSAGES.VIDEO.PROCESSING_FAILED,
        );
    }
});

// 저장된 비디오 목록 조회 (최적화: 단일 Video 모델 쿼리)
app.get('/api/videos', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'timestamp'; // timestamp는 이제 원본 게시일
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const platform = req.query[FieldMapper.get('PLATFORM')]; // 플랫폼 필터 (선택적)

        ServerLogger.info(
            `📡 MongoDB API 요청: /api/videos (limit=${limit}, sortBy=${sortBy}, platform=${platform})`,
            'DEBUG',
        );

        // MongoDB 연결 확인
        if (!DatabaseManager.isConnectedStatus().connected) {
            await DatabaseManager.connect();
        }

        // 🚀 쿼리 조건 구성 (FieldMapper 자동화)
        const query = {};
        if (platform) {
            query[FieldMapper.get('PLATFORM')] = platform.toLowerCase();
        }

        // 🚀 정렬 조건 구성 (FieldMapper 자동화)
        const sortOptions = {};
        if (sortBy === 'timestamp') {
            // uploadDate가 있으면 우선, 없으면 timestamp 사용
            sortOptions[FieldMapper.get('UPLOAD_DATE')] = sortOrder;
            sortOptions[FieldMapper.get('TIMESTAMP')] = sortOrder;
        } else {
            // sortBy를 FieldMapper로 변환 시도, 실패하면 원본 사용
            try {
                const mappedField = FieldMapper.get(sortBy.toUpperCase());
                sortOptions[mappedField] = sortOrder;
            } catch {
                sortOptions[sortBy] = sortOrder; // 레거시 호환
            }
        }

        // 🚀 MongoDB에서 비디오 조회 (FieldMapper 자동화)
        const selectFields = FieldMapper.buildSelectString([
            'PLATFORM',
            'CHANNEL_NAME',
            'TITLE',
            'LIKES',
            'VIEWS',
            'COMMENTS_COUNT',
            'URL',
            'TIMESTAMP',
            'UPLOAD_DATE',
            'PROCESSED_AT',
            'CATEGORY',
            'MAIN_CATEGORY',
            'MIDDLE_CATEGORY',
            'FULL_CATEGORY_PATH',
            'CATEGORY_DEPTH',
            'KEYWORDS',
            'HASHTAGS',
            'THUMBNAIL_URL',
            'YOUTUBE_HANDLE',
        ]);

        const videos = await Video.find(query)
            .sort(sortOptions)
            .limit(limit)
            .select(selectFields)
            .lean(); // 성능 최적화

        // 🚀 필드 접근 자동화 (FieldMapper)
        const enhancedVideos = videos.map((video) => {
            // 썸네일 URL을 HTTP URL로 변환
            let thumbnailUrl = video[FieldMapper.get('THUMBNAIL_URL')];
            if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
                // 로컬 파일 경로를 HTTP URL로 변환
                const relativePath = thumbnailUrl.includes('/downloads/')
                    ? thumbnailUrl.split('/downloads/')[1]
                    : thumbnailUrl.replace(/^.*[\\\/]/, '');

                // 파일 존재 여부 확인
                const fullPath = path.join(
                    __dirname,
                    '../downloads',
                    relativePath,
                );
                try {
                    if (fs.existsSync(fullPath)) {
                        thumbnailUrl = `http://localhost:3000/downloads/${relativePath}`;
                    } else {
                        // 파일이 없으면 플랫폼별 placeholder
                        const platform = video[FieldMapper.get('PLATFORM')];
                        if (platform === 'instagram') {
                            thumbnailUrl =
                                'https://placehold.co/400x600/E4405F/FFFFFF?text=IG';
                        } else if (platform === 'tiktok') {
                            thumbnailUrl =
                                'https://placehold.co/400x600/000000/FFFFFF?text=TT';
                        } else {
                            thumbnailUrl =
                                'https://placehold.co/600x400/FF0000/FFFFFF?text=YT';
                        }
                    }
                } catch (err) {
                    // 에러 발생시 placeholder 사용
                    const platform = video[FieldMapper.get('PLATFORM')];
                    if (platform === 'instagram') {
                        thumbnailUrl =
                            'https://placehold.co/400x600/E4405F/FFFFFF?text=IG';
                    } else if (platform === 'tiktok') {
                        thumbnailUrl =
                            'https://placehold.co/400x600/000000/FFFFFF?text=TT';
                    } else {
                        thumbnailUrl =
                            'https://placehold.co/600x400/FF0000/FFFFFF?text=YT';
                    }
                }
            } else if (!thumbnailUrl) {
                // 썸네일이 없으면 플랫폼별 placeholder 제공
                const platform = video[FieldMapper.get('PLATFORM')];
                if (platform === 'instagram') {
                    thumbnailUrl =
                        'https://placehold.co/400x600/E4405F/FFFFFF?text=IG';
                } else if (platform === 'tiktok') {
                    thumbnailUrl =
                        'https://placehold.co/400x600/000000/FFFFFF?text=TT';
                } else {
                    thumbnailUrl =
                        'https://placehold.co/600x400/FF0000/FFFFFF?text=YT';
                }
            }

            return {
                ...video,
                // 🚀 FieldMapper 자동화된 필드 접근
                [FieldMapper.get('TIMESTAMP')]:
                    video[FieldMapper.get('UPLOAD_DATE')] ||
                    video[FieldMapper.get('TIMESTAMP')],
                [FieldMapper.get('UPLOAD_DATE')]:
                    video[FieldMapper.get('UPLOAD_DATE')],
                [FieldMapper.get('THUMBNAIL_URL')]: thumbnailUrl,
                // url이 없고 channelName이 URL인 경우 복구
                [FieldMapper.get('URL')]:
                    video[FieldMapper.get('URL')] ||
                    (video[FieldMapper.get('CHANNEL_NAME')] &&
                    video[FieldMapper.get('CHANNEL_NAME')].startsWith('http')
                        ? video[FieldMapper.get('CHANNEL_NAME')]
                        : ''),
                // 🚀 채널명과 핸들명을 올바르게 구분 (FieldMapper 자동화)
                [FieldMapper.get('CHANNEL_NAME')]:
                    video[FieldMapper.get('CHANNEL_NAME')] &&
                    !video[FieldMapper.get('CHANNEL_NAME')].startsWith(
                        'http',
                    ) &&
                    !video[FieldMapper.get('CHANNEL_NAME')].startsWith('@')
                        ? video[FieldMapper.get('CHANNEL_NAME')]
                        : '알 수 없는 채널',
                [FieldMapper.get('THUMBNAIL')]: thumbnailUrl, // 레거시 호환
                [FieldMapper.get('CHANNEL_AVATAR_URL')]: '',
                [FieldMapper.get('CHANNEL_AVATAR')]: '',
                [FieldMapper.get('VIEW_COUNT')]:
                    video[FieldMapper.get('VIEWS')],
                [FieldMapper.get('DAYS_AGO')]: 0,
                [FieldMapper.get('IS_TRENDING')]: false,
                // 🐛 디버깅: LIKES 필드 명시적 처리
                [FieldMapper.get('LIKES')]:
                    video[FieldMapper.get('LIKES')] !== undefined
                        ? video[FieldMapper.get('LIKES')]
                        : null,
            };
        });

        // 플랫폼별 비디오 수 분석
        const platformCounts = {};
        enhancedVideos.forEach((v) => {
            const platform = v[FieldMapper.get('PLATFORM')] || 'unknown';
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });

        ServerLogger.info(
            `📊 MongoDB API 응답: 총 ${enhancedVideos.length}개 비디오 (단일 쿼리 최적화)`,
            'DEBUG',
        );
        ServerLogger.info(
            `📊 플랫폼별 비디오 수: ${JSON.stringify(platformCounts)}`,
            'DEBUG',
        );

        ResponseHandler.success(
            res,
            {
                videos: enhancedVideos,
                total: enhancedVideos.length,
                query: {
                    limit,
                    sortBy,
                    sortOrder: sortOrder === 1 ? 'asc' : 'desc',
                    platform,
                },
                platform_stats: platformCounts,
            },
            API_MESSAGES.DATA.FETCH_SUCCESS,
        );
    } catch (error) {
        ServerLogger.error(
            `❌ MongoDB /api/videos API 실패`,
            error.message,
            'DEBUG',
        );
        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: ERROR_CODES.DATA_FETCH_FAILED,
            },
            API_MESSAGES.DATA.FETCH_FAILED,
        );
    }
});

// 📊 채널 목록 조회 API (MongoDB + JSON 하이브리드)
app.get('/api/channels', async (req, res) => {
    try {
        const ChannelAnalysisService = require('./features/cluster/ChannelAnalysisService');

        const limit = parseInt(req.query.limit) || 20;
        const sortBy = req.query.sortBy || 'subscribers'; // subscribers, totalViews, lastAnalyzedAt
        const platform = req.query[FieldMapper.get('PLATFORM')]; // 플랫폼 필터
        const clustered = req.query.clustered; // true/false/undefined
        const search = req.query.search; // 검색어

        ServerLogger.info(
            `📡 채널 목록 조회 요청: limit=${limit}, sortBy=${sortBy}, platform=${platform}`,
            'DEBUG',
        );

        // 검색 조건 구성
        const filters = {
            limit: limit,
            sortBy: sortBy,
        };

        if (platform) {
            filters[FieldMapper.get('PLATFORM')] = platform.toLowerCase();
        }

        if (clustered !== undefined) {
            filters.clustered = clustered === 'true';
        }

        if (search) {
            filters[FieldMapper.get('TAGS')] = [search]; // 태그 검색
        }

        // ChannelAnalysisService를 통해 검색
        const channels = await ChannelAnalysisService.search(filters);

        // 응답 데이터 구성
        const responseData = {
            channels: channels,
            meta: {
                total: channels.length,
                limit: limit,
                sortBy: sortBy,
                filters: {
                    [FieldMapper.get('PLATFORM')]: platform || 'all',
                    clustered: clustered || 'all',
                    search: search || null,
                },
            },
        };

        ResponseHandler.success(res, responseData, '채널 목록 조회 성공');
    } catch (error) {
        ServerLogger.error('❌ 채널 목록 조회 실패', error);
        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: ERROR_CODES.DATA_FETCH_FAILED,
            },
            API_MESSAGES.DATA.FETCH_FAILED,
        );
    }
});

// 📊 특정 채널 조회 API
app.get('/api/channels/:channelId', async (req, res) => {
    try {
        const ChannelAnalysisService = require('./features/cluster/ChannelAnalysisService');
        const mongoose = require('mongoose');
        const channelId = req.params.channelId;

        ServerLogger.info(`📡 특정 채널 조회 요청: ${channelId}`, 'DEBUG');

        // ObjectId 여부 확인 후 적절한 검색 방법 선택
        let channel;
        if (mongoose.Types.ObjectId.isValid(channelId)) {
            // MongoDB ObjectId인 경우
            channel = await ChannelAnalysisService.findById(channelId);
        } else {
            // YouTube 핸들(@handle) 또는 채널명인 경우
            ServerLogger.info(`📡 핸들/채널명으로 검색: ${channelId}`, 'DEBUG');
            channel = await ChannelAnalysisService.findOne({
                $or: [
                    { [FieldMapper.get('YOUTUBE_HANDLE')]: channelId },
                    { [FieldMapper.get('CHANNEL_NAME')]: channelId },
                    {
                        [FieldMapper.get('YOUTUBE_HANDLE')]:
                            channelId.startsWith('@')
                                ? channelId
                                : `@${channelId}`,
                    },
                ],
            });
        }

        if (!channel) {
            return ResponseHandler.notFound(res, '채널을 찾을 수 없습니다');
        }

        ResponseHandler.success(res, { channel }, '채널 조회 성공');
    } catch (error) {
        ServerLogger.error('❌ 특정 채널 조회 실패', error);
        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: ERROR_CODES.DATA_FETCH_FAILED,
            },
            API_MESSAGES.DATA.FETCH_FAILED,
        );
    }
});

// 📊 채널 통계 조회 API
app.get('/api/channels/stats/overview', async (req, res) => {
    try {
        const ChannelAnalysisService = require('./features/cluster/ChannelAnalysisService');

        ServerLogger.info(`📡 채널 통계 조회 요청`, 'DEBUG');

        const [totalCount, unclusteredCount, platformStats, keywordStats] =
            await Promise.all([
                ChannelAnalysisService.getTotalCount(),
                ChannelAnalysisService.getUnclusteredCount(),
                ChannelAnalysisService.getPlatformStatistics(),
                ChannelAnalysisService.getKeywordStatistics(),
            ]);

        const statsData = {
            overview: {
                totalChannels: totalCount,
                clusteredChannels: totalCount - unclusteredCount,
                unclusteredChannels: unclusteredCount,
                clusteringRate:
                    totalCount > 0
                        ? (
                              ((totalCount - unclusteredCount) / totalCount) *
                              100
                          ).toFixed(1)
                        : 0,
            },
            platforms: platformStats,
            topKeywords: keywordStats,
        };

        ResponseHandler.success(res, statsData, '채널 통계 조회 성공');
    } catch (error) {
        ServerLogger.error('❌ 채널 통계 조회 실패', error);
        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: ERROR_CODES.DATA_FETCH_FAILED,
            },
            API_MESSAGES.DATA.FETCH_FAILED,
        );
    }
});

// 🔍 캐시 강제 무효화 API
app.post('/api/cache/clear', async (req, res) => {
    try {
        sheetsManager.invalidateCache();
        res.json({
            success: true,
            message:
                '캐시가 무효화되었습니다. 다음 조회부터 새로운 데이터를 가져옵니다.',
        });
    } catch (error) {
        res.json({ success: false, [FieldMapper.get('ERROR')]: error.message });
    }
});

// 캐시 상태 확인 엔드포인트 (디버깅용)
app.get('/api/cache/status', async (req, res) => {
    try {
        const cacheInfo = {
            cacheSize: sheetsManager.cache[FieldMapper.get('SIZE')],
            keys: Array.from(sheetsManager.cache.keys()),
            ttl: sheetsManager.cacheTTL,
            entries: {},
        };

        // 각 캐시 엔트리의 나이 계산
        for (const [key, value] of sheetsManager.cache.entries()) {
            const age = Date.now() - value[FieldMapper.get('TIMESTAMP')];
            cacheInfo.entries[key] = {
                age: `${age}ms`,
                isValid: age < sheetsManager.cacheTTL,
                dataLength: value.data ? value.data.length : 0,
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
        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: 'QUEUE_STATUS_FAILED',
            },
            '큐 상태 조회 실패',
        );
    }
});

// 자가 학습 카테고리 시스템 통계 조회
app.get('/api/self-learning/stats', async (req, res) => {
    try {
        const AIAnalyzer = require('./services/AIAnalyzer');
        const aiAnalyzer = new AIAnalyzer();
        const stats = aiAnalyzer.dynamicCategoryManager.getSelfLearningStats();
        const systemStats = aiAnalyzer.dynamicCategoryManager.getSystemStats();

        ResponseHandler.success(
            res,
            {
                selfLearning: stats,
                system: systemStats,
                [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
            },
            '자가 학습 통계 조회 성공',
        );
    } catch (error) {
        ServerLogger.error('자가 학습 통계 조회 실패', error);
        ResponseHandler.serverError(
            res,
            {
                ...error,
                code: 'SELF_LEARNING_STATS_FAILED',
            },
            '자가 학습 통계 조회에 실패했습니다.',
        );
    }
});

// 🔍 URL 중복 검사 API 엔드포인트
app.post('/api/check-duplicate', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                [FieldMapper.get('ERROR')]: 'URL_REQUIRED',
                message: 'URL이 필요합니다.',
            });
        }

        ServerLogger.info(
            `🔍 API 중복 검사 요청: ${url}`,
            'API_DUPLICATE_CHECK',
        );

        const duplicateCheck = await sheetsManager.checkDuplicateURL(url);

        if (duplicateCheck.isDuplicate) {
            res.json({
                success: true,
                isDuplicate: true,
                message: `중복 URL 발견: ${duplicateCheck.existingPlatform} 시트의 ${duplicateCheck.existingColumn}${duplicateCheck.existingRow}행에 존재합니다`,
                data: {
                    [FieldMapper.get('PLATFORM')]:
                        duplicateCheck.existingPlatform,
                    [FieldMapper.get('ROW')]: duplicateCheck.existingRow,
                    [FieldMapper.get('COLUMN')]: duplicateCheck.existingColumn,
                    [FieldMapper.get('ORIGINAL_URL')]: url,
                    [FieldMapper.get('NORMALIZED_URL')]:
                        sheetsManager.normalizeVideoUrl(url),
                },
            });
        } else {
            res.json({
                success: true,
                isDuplicate: false,
                message: '중복 없음 - 새로운 URL입니다',
                data: {
                    [FieldMapper.get('ORIGINAL_URL')]: url,
                    [FieldMapper.get('NORMALIZED_URL')]:
                        sheetsManager.normalizeVideoUrl(url),
                    [FieldMapper.get('ERROR')]:
                        duplicateCheck[FieldMapper.get('ERROR')] || null,
                },
            });
        }
    } catch (error) {
        ServerLogger.error(
            'URL 중복 검사 API 실패',
            error.message,
            'API_DUPLICATE_CHECK',
        );
        res.status(500).json({
            success: false,
            [FieldMapper.get('ERROR')]: 'DUPLICATE_CHECK_FAILED',
            message: '중복 검사 중 오류가 발생했습니다.',
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
      [FieldMapper.get('FILE')]: {
        [FieldMapper.get('NAME')]: req.file.filename,
        [FieldMapper.get('ORIGINAL_NAME')]: req.file.originalname,
        [FieldMapper.get('SIZE')]: req.file[FieldMapper.get('SIZE')],
        [FieldMapper.get('MIMETYPE')]: req.file.mimetype
      },
      [FieldMapper.get('THUMBNAIL')]: thumbnailPath,
      [FieldMapper.get('ANALYSIS')]: analysis
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

app.post(
    '/api/process-video-blob',
    upload.single('video'),
    async (req, res) => {
        let videoUrlDoc = null; // MongoDB 문서 참조용
        let postUrl = null; // 에러 핸들링에서 사용하기 위해 상위 스코프에 선언

        try {
            const { platform, analysisType = 'quick', useAI = true } = req.body;
            postUrl = req.body[FieldMapper.get('POST_URL')]; // 명시적으로 할당
            // 🚨 중요: FormData로 전송된 metadata는 JSON 문자열이므로 파싱 필요!
            let metadata = {};
            try {
                metadata = req.body[FieldMapper.get('METADATA')]
                    ? JSON.parse(req.body[FieldMapper.get('METADATA')])
                    : {};
            } catch (error) {
                ServerLogger.warn(
                    '❌ metadata JSON 파싱 실패:',
                    req.body[FieldMapper.get('METADATA')],
                );
                metadata = {};
            }

            // 🔍 디버그: blob 엔드포인트에서 metadata 수신 로깅
            ServerLogger.info(
                '📡 /api/process-video-blob 엔드포인트에서 metadata 수신:',
                {
                    platform,
                    rawMetadata: req.body[FieldMapper.get('METADATA')],
                    hasMetadata: !!metadata && Object.keys(metadata).length > 0,
                    metadataKeys: Object.keys(metadata),
                    metadataPreview:
                        JSON.stringify(metadata).substring(0, 200) + '...',
                },
            );

            // 🔧 Instagram 메타데이터 보정 (author 필드 처리)
            try {
                const { FieldMapper } = require('./types/field-mapper');

                // author 필드가 있고 channelName이 비어있으면 매핑
                if (
                    metadata[FieldMapper.get('AUTHOR')] &&
                    !metadata[FieldMapper.get('CHANNEL_NAME')]
                ) {
                    const authorUrl = metadata[FieldMapper.get('AUTHOR')];

                    // URL에서 사용자명 추출
                    const usernameMatch = authorUrl.match(
                        /instagram\.com\/([^\/]+)/,
                    );
                    if (usernameMatch) {
                        const username = usernameMatch[1];
                        metadata[FieldMapper.get('CHANNEL_NAME')] = username;
                        metadata[
                            FieldMapper.get('CHANNEL_URL')
                        ] = `https://www.instagram.com/${username}/`;

                        ServerLogger.info(
                            '🔧 author 필드에서 채널 정보 매핑:',
                            {
                                원본Author: authorUrl,
                                추출된Username: username,
                                생성된ChannelUrl:
                                    metadata[FieldMapper.get('CHANNEL_URL')],
                            },
                        );
                    }
                }

                ServerLogger.info('🔑 FieldMapper로 접근한 메타데이터 값들:', {
                    [FieldMapper.get('CHANNEL_NAME')]:
                        metadata[FieldMapper.get('CHANNEL_NAME')] || 'null',
                    [FieldMapper.get('CHANNEL_URL')]:
                        metadata[FieldMapper.get('CHANNEL_URL')] || 'null',
                    [FieldMapper.get('DESCRIPTION')]:
                        metadata[FieldMapper.get('DESCRIPTION')] || 'null',
                    [FieldMapper.get('LIKES')]:
                        metadata[FieldMapper.get('LIKES')] || 'null',
                    [FieldMapper.get('COMMENTS_COUNT')]:
                        metadata[FieldMapper.get('COMMENTS_COUNT')] || 'null',
                });
            } catch (error) {
                ServerLogger.error(
                    '❌ FieldMapper 디버깅 실패:',
                    error.message,
                );
            }

            ServerLogger.info(
                `🎬 Processing ${platform} blob video from:`,
                postUrl,
            );
            ServerLogger.info(
                `📁 Uploaded file: ${
                    req.file
                        ? `${req.file.filename} (${
                              req.file[FieldMapper.get('SIZE')]
                          } bytes)`
                        : 'None'
                }`,
            );
            ServerLogger.info(
                `🔍 Analysis type: ${analysisType}, AI 분석: ${
                    useAI ? '활성화' : '비활성화'
                }`,
            );

            // 🔍 URL 중복 검사 (Blob 처리에서도 공통 적용)

            if (postUrl) {
                try {
                    const duplicateCheck =
                        await sheetsManager.checkDuplicateURLFast(postUrl);

                    if (duplicateCheck.isDuplicate) {
                        let errorMessage;

                        if (duplicateCheck[FieldMapper.get('IS_PROCESSING')]) {
                            // ⚠️ 임시 해결책: processing 상태가 10분 이상 된 경우 재처리 허용
                            const createdAt = new Date(
                                duplicateCheck[FieldMapper.get('CREATED_AT')],
                            );
                            const now = new Date();
                            const tenMinutesAgo = new Date(
                                now.getTime() - 10 * 60 * 1000,
                            );

                            if (createdAt < tenMinutesAgo) {
                                ServerLogger.warn(
                                    `🔄 오래된 processing 상태 감지 - 재처리 허용: ${postUrl}`,
                                    'API_DUPLICATE_BLOB',
                                );

                                // 오래된 processing 레코드 삭제하고 계속 진행
                                try {
                                    const VideoUrl = require('./models/VideoUrl');
                                    const normalizedUrl =
                                        sheetsManager.normalizeVideoUrl(
                                            postUrl,
                                        );
                                    await VideoUrl.deleteOne({
                                        normalizedUrl,
                                        [FieldMapper.get('STATUS')]:
                                            'processing',
                                    });
                                    ServerLogger.info(
                                        `🗑️ 오래된 processing 레코드 삭제: ${normalizedUrl}`,
                                    );
                                } catch (cleanupError) {
                                    ServerLogger.warn(
                                        `⚠️ 오래된 processing 레코드 삭제 실패: ${cleanupError.message}`,
                                    );
                                }
                            } else {
                                errorMessage = `🔄 처리 중인 URL: 같은 URL이 현재 처리되고 있습니다 (${duplicateCheck.existingPlatform})`;
                                ServerLogger.warn(
                                    errorMessage,
                                    'API_DUPLICATE_BLOB',
                                );

                                return res.status(409).json({
                                    success: false,
                                    [FieldMapper.get('ERROR')]:
                                        'DUPLICATE_URL_PROCESSING',
                                    message: errorMessage,
                                    duplicate_info: {
                                        [FieldMapper.get('PLATFORM')]:
                                            duplicateCheck.existingPlatform,
                                        [FieldMapper.get('NORMALIZED_URL')]:
                                            sheetsManager.normalizeVideoUrl(
                                                postUrl,
                                            ),
                                        [FieldMapper.get(
                                            'IS_PROCESSING',
                                        )]: true,
                                        [FieldMapper.get('STATUS')]:
                                            duplicateCheck[
                                                FieldMapper.get('STATUS')
                                            ],
                                        [FieldMapper.get('CREATED_AT')]:
                                            duplicateCheck[
                                                FieldMapper.get('CREATED_AT')
                                            ],
                                    },
                                });
                            }
                        } else {
                            const rowInfo = duplicateCheck.existingRow
                                ? `${duplicateCheck.existingColumn || ''}${
                                      duplicateCheck.existingRow
                                  }행`
                                : '알 수 없는 위치';
                            errorMessage = `⚠️ 중복 URL: 이미 ${duplicateCheck.existingPlatform} 시트의 ${rowInfo}에 존재합니다`;
                            ServerLogger.warn(
                                errorMessage,
                                'API_DUPLICATE_BLOB',
                            );

                            return res.status(409).json({
                                success: false,
                                [FieldMapper.get('ERROR')]:
                                    'DUPLICATE_URL_COMPLETED',
                                message: errorMessage,
                                duplicate_info: {
                                    [FieldMapper.get('PLATFORM')]:
                                        duplicateCheck.existingPlatform,
                                    [FieldMapper.get('ROW')]:
                                        duplicateCheck.existingRow,
                                    [FieldMapper.get('COLUMN')]:
                                        duplicateCheck.existingColumn,
                                    [FieldMapper.get('NORMALIZED_URL')]:
                                        sheetsManager.normalizeVideoUrl(
                                            postUrl,
                                        ),
                                    [FieldMapper.get('IS_PROCESSING')]: false,
                                    [FieldMapper.get('STATUS')]:
                                        duplicateCheck[
                                            FieldMapper.get('STATUS')
                                        ],
                                },
                            });
                        }
                    }

                    // 🆕 플랫폼 자동 감지 (platform이 없는 경우)
                    const finalPlatform =
                        platform ||
                        (postUrl
                            ? postUrl.includes('youtube.com') ||
                              postUrl.includes('youtu.be')
                                ? 'youtube'
                                : postUrl.includes('instagram.com')
                                ? 'instagram'
                                : postUrl.includes('tiktok.com')
                                ? 'tiktok'
                                : 'unknown'
                            : 'unknown');

                    // ✅ 중복이 아닌 경우 - 즉시 processing 상태로 MongoDB에 등록
                    const normalizedUrl =
                        sheetsManager.normalizeVideoUrl(postUrl);
                    const VideoUrl = require('./models/VideoUrl');

                    const registerResult = await VideoUrl.registerUrl(
                        normalizedUrl,
                        postUrl,
                        finalPlatform,
                        null, // sheetLocation은 나중에 업데이트
                    );

                    if (registerResult.success) {
                        videoUrlDoc = registerResult.document;
                        ServerLogger.info(
                            `✅ URL processing 상태 등록 (Blob): ${normalizedUrl} (${finalPlatform})`,
                        );
                    } else {
                        ServerLogger.warn(
                            `⚠️ URL processing 상태 등록 실패 (Blob): ${
                                registerResult[FieldMapper.get('ERROR')]
                            }`,
                        );
                    }

                    ServerLogger.info(
                        `✅ URL 중복 검사 통과 (Blob): ${postUrl}`,
                        'API_DUPLICATE_BLOB',
                    );
                } catch (duplicateError) {
                    // 중복 검사 실패해도 계속 진행 (시스템 안정성을 위해)
                    ServerLogger.warn(
                        `중복 검사 실패하여 건너뜀 (Blob): ${duplicateError.message}`,
                        'API_DUPLICATE_BLOB',
                    );
                }
            }

            // 🆕 플랫폼 자동 감지 (finalPlatform이 정의되지 않은 경우를 위해)
            const finalPlatform =
                platform ||
                (postUrl
                    ? postUrl.includes('youtube.com') ||
                      postUrl.includes('youtu.be')
                        ? 'youtube'
                        : postUrl.includes('instagram.com')
                        ? 'instagram'
                        : postUrl.includes('tiktok.com')
                        ? 'tiktok'
                        : 'unknown'
                    : 'unknown');

            if (!req.file) {
                return ResponseHandler.clientError(
                    res,
                    {
                        code: ERROR_CODES.FILE_NOT_FOUND,
                        message: API_MESSAGES.VIDEO.FILE_NOT_UPLOADED,
                    },
                    400,
                );
            }

            const videoPath = req.file.path;

            // 큐 상태 확인 및 로깅
            const queueStatus = videoQueue.getStatus();
            ServerLogger.info(`📋 현재 큐 상태:`, queueStatus);

            // 큐에 작업 추가
            const result = await videoQueue.addToQueue({
                [FieldMapper.get('ID')]: `blob_${finalPlatform}_${Date.now()}`,
                [FieldMapper.get('TYPE')]: 'blob',
                [FieldMapper.get('DATA')]: {
                    [FieldMapper.get('PLATFORM')]: finalPlatform,
                    [FieldMapper.get('POST_URL')]: postUrl,
                    [FieldMapper.get('ANALYSIS_TYPE')]: analysisType,
                    metadata,
                    [FieldMapper.get('VIDEO_PATH')]: videoPath,
                    [FieldMapper.get('USE_AI')]: useAI,
                },
                [FieldMapper.get('PROCESSOR')]: async (taskData) => {
                    const {
                        [FieldMapper.get('PLATFORM')]: platform,
                        [FieldMapper.get('POST_URL')]: postUrl,
                        [FieldMapper.get('ANALYSIS_TYPE')]: analysisType,
                        [FieldMapper.get('METADATA')]: metadata,
                        [FieldMapper.get('VIDEO_PATH')]: videoPath,
                        [FieldMapper.get('USE_AI')]: useAI,
                    } = taskData;

                    // 2단계: 썸네일/프레임 생성
                    if (
                        analysisType === 'multi-frame' ||
                        analysisType === 'full'
                    ) {
                        ServerLogger.info('2️⃣ 다중 프레임 추출 중...');
                        var thumbnailPaths =
                            await videoProcessor.generateThumbnail(
                                videoPath,
                                analysisType,
                            );
                        ServerLogger.info(
                            `✅ ${thumbnailPaths.length}개 프레임 추출 완료`,
                        );
                    } else {
                        ServerLogger.info('2️⃣ 단일 썸네일 생성 중...');
                        var singleThumbnail =
                            await videoProcessor.generateThumbnail(
                                videoPath,
                                analysisType,
                            );
                        var thumbnailPaths = Array.isArray(singleThumbnail)
                            ? singleThumbnail
                            : [singleThumbnail];
                    }

                    // 3단계: AI 분석 (조건부 실행)
                    const enrichedMetadata = { ...metadata, platform };
                    let analysis;

                    if (useAI && analysisType !== 'none') {
                        if (thumbnailPaths.length > 1) {
                            ServerLogger.info(
                                `3️⃣ 다중 프레임 AI 분석 중... (${thumbnailPaths.length}개 프레임)`,
                            );
                        } else {
                            ServerLogger.info('3️⃣ 단일 프레임 AI 분석 중...');
                        }
                        analysis = await aiAnalyzer.analyzeVideo(
                            thumbnailPaths,
                            enrichedMetadata,
                        );
                    } else {
                        ServerLogger.info('3️⃣ AI 분석 건너뜀 (사용자 설정)');
                        analysis = {
                            [FieldMapper.get('CATEGORY')]: '분석 안함',
                            [FieldMapper.get('MAIN_CATEGORY')]: '미분류',
                            [FieldMapper.get('MIDDLE_CATEGORY')]: '기본',
                            [FieldMapper.get('KEYWORDS')]: [],
                            [FieldMapper.get('HASHTAGS')]: [],
                            [FieldMapper.get('CONFIDENCE')]: 0,
                            [FieldMapper.get('FRAME_COUNT')]:
                                thumbnailPaths.length,
                        };
                    }

                    // AI 분석에서 오류가 발생한 경우 시트 저장 중단
                    if (analysis.aiError && analysis.aiError.occurred) {
                        ServerLogger.error(
                            '❌ AI 분석 실패로 인한 처리 중단:',
                            analysis.aiError.message,
                        );

                        // 통계는 업데이트하지 않음
                        ServerLogger.info(
                            '⚠️ AI 분석 오류로 인해 시트 저장을 건너뜁니다',
                        );

                        return {
                            [FieldMapper.get('PROCESSING')]: {
                                platform,
                                analysisType,
                                [FieldMapper.get('FRAME_COUNT')]:
                                    analysis.frameCount || 1,
                                skippedSaving: true,
                                [FieldMapper.get('SOURCE')]: 'blob-upload',
                            },
                            [FieldMapper.get('ANALYSIS')]: {
                                [FieldMapper.get('CATEGORY')]:
                                    analysis[FieldMapper.get('CATEGORY')],
                                [FieldMapper.get('MAIN_CATEGORY')]:
                                    analysis.mainCategory,
                                [FieldMapper.get('MIDDLE_CATEGORY')]:
                                    analysis.middleCategory,
                                [FieldMapper.get('KEYWORDS')]:
                                    analysis.keywords,
                                [FieldMapper.get('HASHTAGS')]:
                                    analysis.hashtags,
                                [FieldMapper.get('CONFIDENCE')]:
                                    analysis.confidence,
                            },
                            [FieldMapper.get('FILES')]: {
                                [FieldMapper.get('VIDEO_PATH')]: videoPath,
                                [FieldMapper.get('THUMBNAIL_PATH')]:
                                    Array.isArray(thumbnailPaths)
                                        ? thumbnailPaths[0]
                                        : thumbnailPaths,
                                [FieldMapper.get('THUMBNAIL_PATHS')]:
                                    thumbnailPaths,
                            },
                            [FieldMapper.get('AI_ERROR')]: analysis.aiError,
                        };
                    }

                    // 4-5단계: 통합 저장 (Google Sheets + MongoDB 동시 저장) 🆕
                    ServerLogger.info(
                        '4-5️⃣ 통합 저장 시작 (Google Sheets + MongoDB)',
                    );
                    const result = await unifiedVideoSaver.saveVideoData(
                        platform,
                        {
                            platform,
                            postUrl,
                            videoPath,
                            [FieldMapper.get('THUMBNAIL_PATH')]: Array.isArray(
                                thumbnailPaths,
                            )
                                ? thumbnailPaths[0]
                                : thumbnailPaths,
                            [FieldMapper.get('THUMBNAIL_PATHS')]:
                                thumbnailPaths,
                            metadata,
                            analysis,
                            [FieldMapper.get('TIMESTAMP')]:
                                new Date().toISOString(),
                        },
                    );

                    // 통합 저장 결과 확인
                    if (!result.success) {
                        // Google Sheets 인증 문제는 경고로 처리하고 계속 진행
                        if (
                            result[FieldMapper.get('ERROR')] &&
                            result[FieldMapper.get('ERROR')].includes(
                                'invalid_grant',
                            )
                        ) {
                            ServerLogger.warn(
                                `⚠️ Google Sheets 인증 실패로 시트 저장 건너뜀: ${
                                    result[FieldMapper.get('ERROR')]
                                }`,
                            );
                            // MongoDB 저장이 성공했다면 계속 진행
                            if (result.mongodb && result.mongodb.success) {
                                ServerLogger.info(
                                    '✅ MongoDB 저장은 성공, Google Sheets 실패는 무시하고 계속 진행',
                                );
                            } else {
                                throw new Error(
                                    `통합 저장 실패: ${
                                        result[FieldMapper.get('ERROR')]
                                    }`,
                                );
                            }
                        } else {
                            throw new Error(
                                `통합 저장 실패: ${
                                    result[FieldMapper.get('ERROR')]
                                }`,
                            );
                        }
                    }

                    ServerLogger.info('✅ 통합 저장 완료!', {
                        [FieldMapper.get(
                            'SHEETS_TIME',
                        )]: `${result.performance.sheetsTime}ms`,
                        [FieldMapper.get(
                            'MONGO_TIME',
                        )]: `${result.performance.mongoTime}ms`,
                        [FieldMapper.get(
                            'TOTAL_TIME',
                        )]: `${result.performance.totalTime}ms`,
                    });

                    // 통계 업데이트
                    stats.total++;
                    stats.today++;

                    ServerLogger.info('✅ blob 비디오 처리 완료 (통합 저장)');

                    // ✅ 성공적으로 처리 완료 시 MongoDB 상태를 'completed'로 업데이트
                    if (videoUrlDoc && postUrl) {
                        try {
                            const VideoUrl = require('./models/VideoUrl');
                            const normalizedUrl =
                                sheetsManager.normalizeVideoUrl(postUrl);

                            // sheetInfo가 있으면 사용, 없으면 null로 업데이트
                            const sheetLocation = result.sheets
                                ? {
                                      [FieldMapper.get('SHEET_NAME')]:
                                          result.sheets.sheetName,
                                      [FieldMapper.get('COLUMN')]: 'N', // URL 저장 컬럼
                                      [FieldMapper.get('ROW')]:
                                          result.sheets.nextRow,
                                  }
                                : null;

                            // YouTube 게시일 추출 (enrichedMetadata에서)
                            const originalPublishDate = enrichedMetadata[
                                FieldMapper.get('UPLOAD_DATE')
                            ]
                                ? new Date(
                                      enrichedMetadata[
                                          FieldMapper.get('UPLOAD_DATE')
                                      ],
                                  )
                                : null;

                            await VideoUrl.updateStatus(
                                normalizedUrl,
                                'completed',
                                sheetLocation,
                                originalPublishDate,
                            );

                            ServerLogger.info(
                                `✅ URL 상태 업데이트 (Blob): ${normalizedUrl} -> completed`,
                            );
                        } catch (statusError) {
                            ServerLogger.warn(
                                `⚠️ URL 상태 업데이트 실패 (Blob): ${statusError.message}`,
                            );
                        }
                    }

                    const responseData = {
                        [FieldMapper.get('PROCESSING')]: {
                            platform,
                            analysisType,
                            [FieldMapper.get('FRAME_COUNT')]:
                                analysis.frameCount || 1,
                            [FieldMapper.get('SOURCE')]: 'blob-upload',
                        },
                        [FieldMapper.get('ANALYSIS')]: {
                            [FieldMapper.get('CATEGORY')]:
                                analysis[FieldMapper.get('CATEGORY')],
                            [FieldMapper.get('MAIN_CATEGORY')]:
                                analysis.mainCategory,
                            [FieldMapper.get('MIDDLE_CATEGORY')]:
                                analysis.middleCategory,
                            [FieldMapper.get('KEYWORDS')]: analysis.keywords,
                            [FieldMapper.get('HASHTAGS')]: analysis.hashtags,
                            [FieldMapper.get('CONFIDENCE')]:
                                analysis.confidence,
                        },
                        [FieldMapper.get('FILES')]: {
                            [FieldMapper.get('VIDEO_PATH')]: videoPath,
                            [FieldMapper.get('THUMBNAIL_PATH')]: Array.isArray(
                                thumbnailPaths,
                            )
                                ? thumbnailPaths[0]
                                : thumbnailPaths,
                            [FieldMapper.get('THUMBNAIL_PATHS')]:
                                thumbnailPaths,
                        },
                    };

                    // AI 오류 정보가 있으면 추가
                    if (analysis.aiError) {
                        responseData.aiError = analysis.aiError;
                    }

                    return responseData;
                },
            });

            ResponseHandler.success(
                res,
                result,
                API_MESSAGES.VIDEO.PROCESSING_SUCCESS,
            );
        } catch (error) {
            ServerLogger.error('blob 비디오 처리 실패:', error);

            // ❌ 처리 실패 시 MongoDB에서 URL 상태를 failed로 업데이트
            if (videoUrlDoc && postUrl) {
                try {
                    const VideoUrl = require('./models/VideoUrl');
                    const normalizedUrl =
                        sheetsManager.normalizeVideoUrl(postUrl);

                    await VideoUrl.updateStatus(normalizedUrl, 'failed');

                    ServerLogger.info(
                        `❌ 처리 실패로 인한 URL 상태 업데이트 (Blob): ${normalizedUrl} -> failed`,
                    );
                } catch (updateError) {
                    ServerLogger.warn(
                        `⚠️ 처리 실패 URL 상태 업데이트 실패 (Blob): ${updateError.message}`,
                    );
                }
            }

            ResponseHandler.serverError(
                res,
                {
                    ...error,
                    code: ERROR_CODES.VIDEO_PROCESSING_FAILED,
                },
                API_MESSAGES.VIDEO.PROCESSING_FAILED,
            );
        }
    },
);

// 에러 핸들러
app.use((err, req, res, next) => {
    ServerLogger.error('서버 에러:', err);
    ResponseHandler.serverError(
        res,
        {
            ...err,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
        API_MESSAGES.COMMON.INTERNAL_ERROR,
    );
});

// 404 핸들러는 맨 마지막에 이동

// YouTube 배치 처리 API 엔드포인트
app.post('/api/youtube-batch', async (req, res) => {
    try {
        const { videoUrl, mode = 'batch', priority = 'normal' } = req.body;

        if (!videoUrl) {
            return ResponseHandler.clientError(res, '비디오 URL이 필요합니다.');
        }

        const options = {
            [FieldMapper.get('PRIORITY')]: priority,
            [FieldMapper.get('CLIENT_INFO')]: {
                [FieldMapper.get('USER_AGENT')]: req.get('User-Agent'),
                [FieldMapper.get(
                    'REQUEST_ID',
                )]: `req_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
            },
            [FieldMapper.get('METADATA')]:
                req.body[FieldMapper.get('METADATA')] || {},
        };

        if (mode === 'immediate') {
            // 강제 즉시 처리
            const result = await youtubeBatchProcessor.forceProcess();
            return res.json({
                success: true,
                message: '배치 강제 처리 완료',
                data: result,
            });
        } else {
            // 배치 큐에 추가
            const result = await youtubeBatchProcessor.addToBatch(
                videoUrl,
                options,
            );
            return res.json({
                success: true,
                message: '배치 큐에 추가됨',
                data: result,
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
            data: status,
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
            data: result,
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
            data: result,
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
// ServerLogger.info('🧪 EARLY DEBUG: 500번대 라인에서 API 등록');

// 임시 테스트 API (먼저 추가해서 여기까지 실행되는지 확인)
app.get('/api/test-debug', (req, res) => {
    res.json({
        success: true,
        message: 'DEBUG: 코드가 여기까지 실행됨!',
        [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
    });
});

// ServerLogger.info('🧪 DEBUG: /api/test-debug API 등록 완료');

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
        [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
    });
});
// ServerLogger.info('🧪 DEBUG: HighViewCollector 초기화 체크 API 등록');

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
                    maxResults: 10,
                },
            },
        },
        initialized: !!channelTrendingCollector,
    });
});

// collect-trending GET API 등록 후 디버그
app.get('/api/debug-after-collect-get', (req, res) => {
    res.json({ success: true, message: 'collect-trending GET 등록 완료!' });
});

app.post('/api/collect-trending', async (req, res) => {
    if (!highViewCollector) {
        return ResponseHandler.serverError(
            res,
            new Error('HighViewCollector가 초기화되지 않았습니다'),
            'HighViewCollector 초기화 오류',
        );
    }

    try {
        const { channelIds, options = {} } = req.body;

        if (
            !channelIds ||
            !Array.isArray(channelIds) ||
            channelIds.length === 0
        ) {
            return ResponseHandler.clientError(res, {
                code: 'MISSING_CHANNELS',
                message: '채널 ID 배열이 필요합니다.',
                details: { example: ['UCChannelId1', 'UCChannelId2'] },
            });
        }

        ServerLogger.info(`📊 트렌딩 수집 요청: ${channelIds.length}개 채널`, {
            channels: channelIds
                .slice(0, 3)
                .map((id) => `${id.substring(0, 10)}...`),
            options,
        });

        const results = await highViewCollector.collectFromChannels(
            channelIds,
            options,
        );

        ResponseHandler.success(
            res,
            results,
            '채널 트렌딩 수집이 완료되었습니다.',
        );
    } catch (error) {
        ServerLogger.error('트렌딩 수집 실패:', error);
        ResponseHandler.serverError(
            res,
            error,
            '트렌딩 수집 중 오류가 발생했습니다.',
        );
    }
});

// collect-trending API 등록 확인
app.get('/api/debug-after-collect', (req, res) => {
    res.json({
        success: true,
        message: 'collect-trending API 등록 이후 실행됨!',
        [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
    });
});
// ServerLogger.info('🧪 DEBUG: collect-trending API 등록 후 체크');

// API quota 현황 조회 (MultiKeyManager 기반)
app.get('/api/quota-status', (req, res) => {
    if (!highViewCollector) {
        return ResponseHandler.serverError(
            res,
            new Error('HighViewCollector가 초기화되지 않았습니다'),
            'HighViewCollector 초기화 오류',
        );
    }

    try {
        const quotaStatus = highViewCollector.getQuotaStatus();
        const safetyMargin =
            parseInt(process.env.YOUTUBE_API_SAFETY_MARGIN) || 8000;

        ResponseHandler.success(
            res,
            {
                quota: quotaStatus,
                safetyMargin: safetyMargin,
                [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
                recommendations: {
                    canProcess: quotaStatus.remaining > 200,
                    estimatedChannels: Math.floor(quotaStatus.remaining / 101),
                    resetTime: '매일 오후 4시 (한국 시간, Google 기준)',
                    safetyInfo: `안전 마진 ${safetyMargin} 적용됨`,
                },
            },
            'API quota 현황을 조회했습니다.',
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            'Quota 상태 조회 중 오류가 발생했습니다.',
        );
    }
});

// 테스트용 API 추가
app.get('/api/test-usage', (req, res) => {
    try {
        ServerLogger.info('🧪 [TEST] test-usage API 호출됨', null, 'SERVER');

        const testResults = [];
        highViewCollector.multiKeyManager.keys.forEach((keyInfo, index) => {
            const keyData = highViewCollector.multiKeyManager.trackers.get(
                keyInfo.key,
            );
            const usage = keyData.tracker.getYouTubeUsage();

            testResults.push({
                index,
                name: keyInfo.name,
                keyHash: keyData.tracker.currentApiKeyHash,
                usage: usage,
            });
        });

        ResponseHandler.success(res, {
            message: 'Direct usage test',
            results: testResults,
            [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
        });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Test usage API error');
    }
});

// 여러 API 키 관리 엔드포인트
app.get('/api/api-keys', async (req, res) => {
    try {
        ServerLogger.info('🔍 API 키 정보 조회 요청');

        // ApiKeyManager에서 모든 YouTube API 키 조회
        const allYouTubeKeys = await ApiKeyManager.getAllApiKeys();

        // Gemini API 키 추가
        const geminiKeys = [];
        if (process.env.GOOGLE_API_KEY) {
            // Gemini 사용량 조회 (aiAnalyzer 사용)
            const geminiUsage =
                aiAnalyzer && aiAnalyzer.getGeminiUsageStats
                    ? aiAnalyzer.getGeminiUsageStats()
                    : {
                          pro: { used: 0, limit: 50 },
                          flash: { used: 0, limit: 250 },
                          flashLite: { used: 0, limit: 1000 },
                      };

            geminiKeys.push({
                [FieldMapper.get('ID')]: 'gemini-main',
                name: 'Gemini API (Main)',
                apiKey: process.env.GOOGLE_API_KEY,
                type: 'gemini',
                usage: geminiUsage,
                [FieldMapper.get('SOURCE')]: 'env',
            });
        }

        const allKeys = [...allYouTubeKeys, ...geminiKeys];

        if (allKeys.length === 0) {
            ServerLogger.warn('⚠️ 등록된 API 키가 없습니다');
            return ResponseHandler.success(
                res,
                {
                    apiKeys: [],
                    [FieldMapper.get('SUMMARY')]: {
                        total: 0,
                        active: 0,
                        warning: 0,
                        [FieldMapper.get('ERROR')]: 0,
                    },
                },
                '등록된 API 키가 없습니다.',
            );
        }

        ServerLogger.info(
            `📊 ${allYouTubeKeys.length}개의 YouTube API 키, ${geminiKeys.length}개의 Gemini API 키 발견`,
        );

        // 실제 사용량 조회
        const apiKeys = await Promise.all(
            allKeys.map(async (key, index) => {
                let realUsage = null;
                let quotaStatus = null;

                // Gemini API 키 처리
                if (key.type === 'gemini') {
                    try {
                        // Gemini 사용량 조회 (aiAnalyzer 사용)
                        const geminiUsage =
                            aiAnalyzer && aiAnalyzer.getGeminiUsageStats
                                ? aiAnalyzer.getGeminiUsageStats()
                                : {
                                      pro: { used: 0, limit: 50 },
                                      flash: { used: 0, limit: 250 },
                                      flashLite: { used: 0, limit: 1000 },
                                  };

                        realUsage = {
                            pro: geminiUsage.pro,
                            flash: geminiUsage.flash,
                            flashLite: geminiUsage.flashLite,
                            total: {
                                used:
                                    geminiUsage.pro.used +
                                    geminiUsage.flash.used +
                                    geminiUsage.flashLite.used,
                                limit:
                                    geminiUsage.pro.limit +
                                    geminiUsage.flash.limit +
                                    geminiUsage.flashLite.limit,
                            },
                        };

                        // 상태 결정
                        const usagePercent =
                            (realUsage.total.used / realUsage.total.limit) *
                            100;
                        let status = 'active';
                        if (usagePercent >= 90) status = 'error';
                        else if (usagePercent >= 75) status = 'warning';

                        return {
                            [FieldMapper.get('ID')]: key[FieldMapper.get('ID')],
                            name: key.name,
                            maskedKey: ApiKeyManager.maskApiKey(key.apiKey),
                            type: 'gemini',
                            status,
                            usage: realUsage,
                            errors: 0,
                            lastUsed:
                                realUsage.total.used > 0 ? '방금 전' : '미사용',
                            resetTime: '오후 4시 (한국시간)',
                            [FieldMapper.get('SOURCE')]:
                                key[FieldMapper.get('SOURCE')],
                        };
                    } catch (error) {
                        ServerLogger.warn(
                            '⚠️ Gemini 사용량 조회 실패:',
                            error.message,
                        );
                        return {
                            [FieldMapper.get('ID')]: key[FieldMapper.get('ID')],
                            name: key.name,
                            maskedKey: ApiKeyManager.maskApiKey(key.apiKey),
                            type: 'gemini',
                            [FieldMapper.get('STATUS')]: 'active',
                            usage: {
                                pro: { used: 0, limit: 50 },
                                flash: { used: 0, limit: 250 },
                                flashLite: { used: 0, limit: 1000 },
                                total: { used: 0, limit: 1300 },
                            },
                            errors: 0,
                            lastUsed: '미사용',
                            resetTime: '오후 4시 (한국시간)',
                            [FieldMapper.get('SOURCE')]:
                                key[FieldMapper.get('SOURCE')],
                        };
                    }
                }

                // YouTube API 키 처리 (기존 로직)
                try {
                    // 현재 quota 상태 조회 (실제 사용량)
                    quotaStatus = highViewCollector
                        ? highViewCollector.getQuotaStatus()
                        : null;

                    // 키별 개별 사용량은 아직 미구현이므로 전체 사용량을 키 개수로 분배
                    const estimatedPerKeyUsage = quotaStatus
                        ? Math.floor(quotaStatus.used / allYouTubeKeys.length)
                        : 0;

                    realUsage = {
                        search: {
                            used: Math.floor(estimatedPerKeyUsage * 0.8),
                            limit: 100,
                        },
                        videos: {
                            used: Math.floor(estimatedPerKeyUsage * 0.15),
                            limit: 1000,
                        },
                        channels: {
                            used: Math.floor(estimatedPerKeyUsage * 0.03),
                            limit: 50,
                        },
                        comments: {
                            used: Math.floor(estimatedPerKeyUsage * 0.02),
                            limit: 100,
                        },
                    };

                    realUsage.total = {
                        used: quotaStatus
                            ? Math.floor(quotaStatus.used / allKeys.length)
                            : estimatedPerKeyUsage,
                        limit: 9500,
                    };
                } catch (error) {
                    ServerLogger.warn(
                        '⚠️ 실제 quota 조회 실패, Mock 데이터 사용:',
                        error.message,
                    );

                    // Fallback: Mock 데이터
                    realUsage = {
                        videos: {
                            used: Math.floor(Math.random() * 800) + 100,
                            limit: 1000,
                        },
                        channels: {
                            used: Math.floor(Math.random() * 400) + 50,
                            limit: 500,
                        },
                        search: {
                            used: Math.floor(Math.random() * 50) + 10,
                            limit: 100,
                        },
                        comments: {
                            used: Math.floor(Math.random() * 80) + 10,
                            limit: 100,
                        },
                    };

                    realUsage.total = {
                        used:
                            realUsage.videos.used +
                            realUsage.channels.used +
                            realUsage.search.used +
                            realUsage.comments.used,
                        limit: 9500,
                    };
                }

                // 상태 결정 로직
                let status = key[FieldMapper.get('STATUS')] || 'active';
                const usagePercent =
                    (realUsage.total.used / realUsage.total.limit) * 100;
                if (usagePercent >= 90) status = 'error';
                else if (usagePercent >= 75) status = 'warning';

                return {
                    [FieldMapper.get('ID')]: key[FieldMapper.get('ID')],
                    name: key.name,
                    maskedKey: ApiKeyManager.maskApiKey(key.apiKey),
                    type: 'youtube',
                    status,
                    usage: realUsage,
                    errors: 0,
                    lastUsed: quotaStatus?.used > 0 ? '방금 전' : '미사용',
                    resetTime: '오후 4시 (한국시간)',
                    [FieldMapper.get('SOURCE')]: key[FieldMapper.get('SOURCE')],
                };
            }),
        );

        ResponseHandler.success(
            res,
            {
                apiKeys,
                [FieldMapper.get('SUMMARY')]: {
                    total: apiKeys.length,
                    active: apiKeys.filter(
                        (k) => k[FieldMapper.get('STATUS')] === 'active',
                    ).length,
                    warning: apiKeys.filter(
                        (k) => k[FieldMapper.get('STATUS')] === 'warning',
                    ).length,
                    [FieldMapper.get('ERROR')]: apiKeys.filter(
                        (k) => k[FieldMapper.get('STATUS')] === 'error',
                    ).length,
                },
            },
            `${apiKeys.length}개의 API 키 정보를 조회했습니다.`,
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            'API 키 정보 조회 중 오류가 발생했습니다.',
        );
    }
});

// API 키 추가
app.post('/api/api-keys', async (req, res) => {
    try {
        const { name, apiKey } = req.body;

        if (!name || !apiKey) {
            return ResponseHandler.clientError(res, {
                field: !name ? 'name' : 'apiKey',
                message: '키 이름과 API 키가 모두 필요합니다.',
            });
        }

        // ApiKeyManager를 통해 실제 저장
        const newKey = await ApiKeyManager.addApiKey(name, apiKey);

        ResponseHandler.success(
            res,
            {
                [FieldMapper.get('ID')]: newKey[FieldMapper.get('ID')],
                name: newKey.name,
                maskedKey: ApiKeyManager.maskApiKey(newKey.apiKey),
                [FieldMapper.get('STATUS')]: newKey[FieldMapper.get('STATUS')],
            },
            'API 키가 성공적으로 추가되었습니다.',
        );
    } catch (error) {
        // 유효성 검사 실패인 경우 400 에러로 처리
        if (error.message && error.message.includes('유효하지 않은')) {
            return ResponseHandler.clientError(res, {
                field: 'apiKey',
                message: error.message,
            });
        }

        ResponseHandler.serverError(
            res,
            error,
            error.message || 'API 키 추가 중 오류가 발생했습니다.',
        );
    }
});

// API 키 삭제
app.delete('/api/api-keys/:keyId', async (req, res) => {
    try {
        const { keyId } = req.params;

        // ApiKeyManager를 통해 실제 삭제
        await ApiKeyManager.deleteApiKey(keyId);

        ResponseHandler.success(
            res,
            { keyId },
            'API 키가 성공적으로 삭제되었습니다.',
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            error.message || 'API 키 삭제 중 오류가 발생했습니다.',
        );
    }
});

// 이미지 프록시 API (CORS 우회)
app.get('/api/proxy-image', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return ResponseHandler.clientError(res, {
                field: 'url',
                message: '이미지 URL이 필요합니다.',
            });
        }

        // Instagram 미디어 URL만 허용
        if (!url.includes('instagram.com')) {
            return ResponseHandler.clientError(res, {
                field: 'url',
                message: 'Instagram URL만 지원됩니다.',
            });
        }

        ServerLogger.info('🖼️ 이미지 프록시 요청:', url);

        // fetch를 사용하여 이미지 가져오기
        const fetch = (await import('node-fetch')).default;
        const imageResponse = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!imageResponse.ok) {
            throw new Error(
                `이미지 로드 실패: ${imageResponse[FieldMapper.get('STATUS')]}`,
            );
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
        ResponseHandler.serverError(
            res,
            error,
            '이미지 프록시 처리 중 오류가 발생했습니다.',
        );
    }
});

// Instagram 썸네일 추출 API
app.post('/api/get-instagram-thumbnail', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url || !url.includes('instagram.com')) {
            return ResponseHandler.clientError(res, {
                code: 'INVALID_URL',
                message: '유효한 Instagram URL이 필요합니다.',
                details: { provided: url },
            });
        }

        ServerLogger.info('📸 Instagram 썸네일 추출 요청:', { url });

        // Instagram URL에서 미디어 ID 추출
        const reelMatch = url.match(/instagram\.com\/reels?\/([A-Za-z0-9_-]+)/);
        const postMatch = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);

        if (!reelMatch && !postMatch) {
            return ResponseHandler.clientError(res, {
                code: 'INVALID_INSTAGRAM_URL',
                message: 'Instagram 릴스 또는 포스트 URL이 아닙니다.',
                details: { url },
            });
        }

        const mediaId = reelMatch ? reelMatch[1] : postMatch[1];

        // Instagram 썸네일 URL 패턴들
        const thumbnailUrls = [
            `https://www.instagram.com/p/${mediaId}/media/?size=l`,
            `https://www.instagram.com/p/${mediaId}/media/?size=m`,
            `https://instagram.com/p/${mediaId}/media/`,
        ];

        // 첫 번째 URL로 응답 (클라이언트에서 이미지 로드 시도)
        ResponseHandler.success(
            res,
            {
                [FieldMapper.get('THUMBNAIL_URL')]: thumbnailUrls[0],
                mediaId,
                alternativeUrls: thumbnailUrls.slice(1),
                [FieldMapper.get('URL')]: url, // 🚀 FieldMapper 자동화
            },
            'Instagram 썸네일 URL을 생성했습니다.',
        );

        ServerLogger.info('✅ Instagram 썸네일 URL 생성 완료:', {
            mediaId,
            [FieldMapper.get('URL')]: thumbnailUrls[0],
        });
    } catch (error) {
        ServerLogger.error('❌ Instagram 썸네일 추출 실패:', error);
        ResponseHandler.serverError(
            res,
            error,
            'Instagram 썸네일 추출 중 오류가 발생했습니다.',
        );
    }
});

// MongoDB URL 상태 통계 및 정리 상태 조회
app.get('/api/mongodb/url-stats', async (req, res) => {
    try {
        const VideoUrl = require('./models/VideoUrl');

        const stats = await VideoUrl.getStats();

        if (stats[FieldMapper.get('ERROR')]) {
            return ResponseHandler.serverError(
                res,
                {
                    code: 'STATS_QUERY_FAILED',
                    message: stats[FieldMapper.get('ERROR')],
                },
                'MongoDB URL 통계 조회 실패',
            );
        }

        ResponseHandler.success(
            res,
            {
                ...stats,
                cleanupInfo: {
                    staleThresholdMinutes: 10,
                    [FieldMapper.get('DESCRIPTION')]:
                        '10분 이상 processing 상태인 레코드는 자동 정리됩니다',
                    nextCleanup: '매 10분마다 자동 실행',
                },
            },
            'MongoDB URL 상태 통계 조회 성공',
        );
    } catch (error) {
        ServerLogger.error('MongoDB URL 통계 조회 실패:', error);
        ResponseHandler.serverError(
            res,
            error,
            'URL 통계 조회 중 오류가 발생했습니다.',
        );
    }
});

// 수동으로 오래된 processing 레코드 정리
app.post('/api/mongodb/cleanup', async (req, res) => {
    try {
        const VideoUrl = require('./models/VideoUrl');

        const result = await VideoUrl.cleanupStaleProcessing();

        if (result.success) {
            ServerLogger.info(
                `🧹 수동 정리 완료: ${result.deletedCount}개 레코드 삭제`,
            );

            ResponseHandler.success(
                res,
                {
                    deletedCount: result.deletedCount,
                    message:
                        result.deletedCount > 0
                            ? `${result.deletedCount}개의 오래된 processing 레코드를 정리했습니다.`
                            : '정리할 오래된 레코드가 없습니다.',
                },
                '수동 정리 완료',
            );
        } else {
            ResponseHandler.serverError(
                res,
                {
                    code: 'CLEANUP_FAILED',
                    message: result[FieldMapper.get('ERROR')],
                },
                '정리 작업 실패',
            );
        }
    } catch (error) {
        ServerLogger.error('수동 정리 실패:', error);
        ResponseHandler.serverError(
            res,
            error,
            '정리 작업 중 오류가 발생했습니다.',
        );
    }
});

// 트렌딩 수집 통계 조회
app.get('/api/trending-stats', async (req, res) => {
    try {
        const stats = await highViewCollector.getStats();

        const summary =
            stats.length > 0
                ? {
                      totalCollections: stats.length,
                      lastCollection: stats[stats.length - 1],
                      avgTrendingRate: (
                          stats.reduce(
                              (sum, s) => sum + parseFloat(s.trendingRate || 0),
                              0,
                          ) / stats.length
                      ).toFixed(1),
                      totalQuotaUsed: stats.reduce(
                          (sum, s) => sum + (s.quotaUsed || 0),
                          0,
                      ),
                      totalTrendingVideos: stats.reduce(
                          (sum, s) => sum + (s.trendingVideos || 0),
                          0,
                      ),
                  }
                : null;

        ResponseHandler.success(
            res,
            {
                stats,
                summary,
                [FieldMapper.get('TIMESTAMP')]: new Date().toISOString(),
            },
            '트렌딩 수집 통계를 조회했습니다.',
        );
    } catch (error) {
        ResponseHandler.serverError(
            res,
            error,
            '통계 조회 중 오류가 발생했습니다.',
        );
    }
});

// 🔗 통합 저장 시스템 테스트 API 🆕
app.get('/api/unified-saver/stats', async (req, res) => {
    try {
        const { platform } = req.query;
        const stats = await unifiedVideoSaver.getSaveStatistics(platform);

        ResponseHandler.success(res, stats, '통합 저장 통계 조회 성공');
    } catch (error) {
        ServerLogger.error(
            '통합 저장 통계 조회 실패',
            error.message,
            'UNIFIED_SAVER_API',
        );
        ResponseHandler.serverError(res, error, '통합 저장 통계 조회 실패');
    }
});

// 🔍 데이터 일관성 검증 API 🆕
app.get('/api/unified-saver/validate/:platform', async (req, res) => {
    try {
        const { platform } = req.params;
        const { limit = 100 } = req.query;

        const validationResult =
            await unifiedVideoSaver.validateDataConsistency(
                platform,
                parseInt(limit),
            );

        ResponseHandler.success(
            res,
            validationResult,
            `${platform} 데이터 일관성 검증 완료`,
        );
    } catch (error) {
        ServerLogger.error(
            `데이터 일관성 검증 실패: ${
                req.params[FieldMapper.get('PLATFORM')]
            }`,
            error.message,
            'UNIFIED_SAVER_API',
        );
        ResponseHandler.serverError(res, error, '데이터 일관성 검증 실패');
    }
});

// 🗑️ MongoDB 데이터 전체 삭제 API (개발/테스트용)
app.post('/api/clear-database', async (req, res) => {
    try {
        ServerLogger.info(
            '🗑️ MongoDB 데이터 전체 삭제 요청 시작',
            'DATABASE_CLEAR',
        );

        // MongoDB 연결 확인
        if (!DatabaseManager.isConnectedStatus().connected) {
            await DatabaseManager.connect();
        }

        // 현재 개수 확인
        const beforeCount = await Video.countDocuments();
        ServerLogger.info(
            `📊 삭제 전 비디오 개수: ${beforeCount}개`,
            'DATABASE_CLEAR',
        );

        // 모든 비디오 삭제
        const result = await Video.deleteMany({});
        ServerLogger.info(
            `🗑️ 삭제된 비디오 개수: ${result.deletedCount}개`,
            'DATABASE_CLEAR',
        );

        // 삭제 후 개수 확인
        const afterCount = await Video.countDocuments();
        ServerLogger.info(
            `📊 삭제 후 비디오 개수: ${afterCount}개`,
            'DATABASE_CLEAR',
        );

        // VideoUrl 컬렉션도 있으면 삭제
        try {
            const VideoUrl = require('./models/VideoUrl');
            const beforeUrlCount = await VideoUrl.countDocuments();
            const urlResult = await VideoUrl.deleteMany({});
            ServerLogger.info(
                `🗑️ 삭제된 VideoUrl 개수: ${urlResult.deletedCount}개 (삭제 전: ${beforeUrlCount}개)`,
                'DATABASE_CLEAR',
            );
        } catch (urlError) {
            ServerLogger.warn(
                `⚠️ VideoUrl 삭제 중 오류 (무시): ${urlError.message}`,
                'DATABASE_CLEAR',
            );
        }

        ResponseHandler.success(
            res,
            {
                deletedCount: result.deletedCount,
                beforeCount: beforeCount,
                afterCount: afterCount,
                message: `✅ MongoDB 데이터 삭제 완료! (${result.deletedCount}개 삭제)`,
            },
            'MongoDB 데이터가 성공적으로 삭제되었습니다.',
        );

        ServerLogger.info(
            '✅ MongoDB 데이터 전체 삭제 완료!',
            'DATABASE_CLEAR',
        );
    } catch (error) {
        ServerLogger.error(
            '❌ MongoDB 데이터 삭제 실패:',
            error,
            'DATABASE_CLEAR',
        );
        ResponseHandler.serverError(
            res,
            error,
            'MongoDB 데이터 삭제 중 오류가 발생했습니다.',
        );
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

        // 🧹 서버 시작 시 모든 processing 레코드 정리 (재시작으로 인한 orphaned 상태 해결)
        try {
            const VideoUrl = require('./models/VideoUrl');
            const cleanupResult = await VideoUrl.cleanupAllProcessing();

            if (cleanupResult.success && cleanupResult.deletedCount > 0) {
                ServerLogger.info(
                    `🔄 서버 재시작: 모든 processing 레코드 정리: ${cleanupResult.deletedCount}개`,
                );
            }

            // ⏰ 10분마다 정리 작업 스케줄링
            setInterval(async () => {
                try {
                    const result = await VideoUrl.cleanupStaleProcessing();
                    if (result.success && result.deletedCount > 0) {
                        ServerLogger.info(
                            `🧹 정기 정리: 오래된 processing 레코드 ${result.deletedCount}개 삭제`,
                        );
                    }
                } catch (intervalError) {
                    ServerLogger.warn(
                        `⚠️ 정기 정리 실패: ${intervalError.message}`,
                    );
                }
            }, 10 * 60 * 1000); // 10분마다
        } catch (cleanupError) {
            ServerLogger.warn(
                `⚠️ 초기 정리 실패 (무시): ${cleanupError.message}`,
            );
        }

        // 📋 채널 분석 큐 라우트는 이미 위에서 등록됨 (404 핸들러 이전)

        app.listen(PORT, () => {
            ServerLogger.info(
                `
🎬 InsightReel 서버 실행중
📍 포트: ${PORT}
🌐 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
🗄️ Database: ${
                    process.env.USE_MONGODB === 'true'
                        ? 'MongoDB Atlas'
                        : 'Google Sheets'
                }

📋 설정 체크리스트:
[ ] Gemini API 키 설정 (.env 파일)
[ ] MongoDB Atlas 연결 (${process.env.USE_MONGODB === 'true' ? '✅' : '❌'})
[ ] Chrome 확장프로그램 로드

💡 테스트 URL:
- 구글 시트 테스트: http://localhost:${PORT}/api/test-sheets
- MongoDB 상태 확인: http://localhost:${PORT}/api/database/health
- 설정 상태 확인: http://localhost:${PORT}/api/config/health
  `,
                'START',
            );
        });
    } catch (error) {
        ServerLogger.error('🚨 서버 시작 실패', error.message, 'START');
        process.exit(1);
    }
};

// 서버 시작
startServer();
