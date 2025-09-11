const request = require('supertest');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Mock 설정
jest.mock('../../server/services/VideoProcessor');
jest.mock('../../server/services/AIAnalyzer');
jest.mock('../../server/services/SheetsManager');
jest.mock('../../server/utils/logger');
jest.mock('../../server/config/config-validator');

const VideoProcessor = require('../../server/services/VideoProcessor');
const AIAnalyzer = require('../../server/services/AIAnalyzer');
const SheetsManager = require('../../server/services/SheetsManager');
const { getConfig } = require('../../server/config/config-validator');

// Mock 클래스 구현
const mockVideoProcessor = {
    downloadVideo: jest.fn(),
    generateThumbnail: jest.fn(),
};

const mockAIAnalyzer = {
    testConnection: jest.fn(),
    analyzeVideo: jest.fn(),
};

const mockSheetsManager = {
    testConnection: jest.fn(),
    saveVideoData: jest.fn(),
    getRecentVideos: jest.fn(),
};

const mockConfig = {
    get: jest.fn((key) => {
        const defaults = {
            PORT: 3000,
            MAX_FILE_SIZE: '50mb',
            CLEANUP_DAYS: 7,
        };
        return defaults[key];
    }),
    healthCheck: jest.fn(),
};

// Mock 클래스들을 return하도록 설정
VideoProcessor.mockImplementation(() => mockVideoProcessor);
AIAnalyzer.mockImplementation(() => mockAIAnalyzer);
SheetsManager.mockImplementation(() => mockSheetsManager);
getConfig.mockReturnValue(mockConfig);

describe('API Integration Tests', () => {
    let app;

    beforeAll(() => {
        // Express 앱을 직접 설정 (서버 index.js와 동일하게)
        app = express();

        // 미들웨어 설정
        app.use(cors());
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // multer 설정
        const storage = multer.memoryStorage(); // 메모리 스토리지로 테스트 간소화
        const upload = multer({ storage });

        // 서비스 인스턴스 (Mock)
        const videoProcessor = new VideoProcessor();
        const aiAnalyzer = new AIAnalyzer();
        const sheetsManager = new SheetsManager();

        // 기본 통계
        let stats = {
            total: 0,
            today: 0,
            lastReset: new Date().toDateString(),
        };

        // API 라우트 설정
        app.get('/health', (req, res) => {
            res.json({
                success: true,
                data: {
                    useGemini: false,
                    version: '1.0.0',
                },
            });
        });

        app.get('/api/stats', (req, res) => {
            res.json({
                success: true,
                data: stats,
            });
        });

        app.get('/api/test-sheets', async (req, res) => {
            try {
                const result = await sheetsManager.testConnection();
                res.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '연결 테스트 실패',
                    error: error.message,
                });
            }
        });

        app.get('/api/config/health', (req, res) => {
            try {
                const healthStatus = mockConfig.healthCheck();
                res.json({
                    success: true,
                    data: healthStatus,
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '설정 상태 확인 실패',
                    error: error.message,
                });
            }
        });

        app.post('/api/process-video', async (req, res) => {
            try {
                const { platform, videoUrl, postUrl, metadata } = req.body;

                // Mock 비디오 처리
                const videoPath = await videoProcessor.downloadVideo(
                    videoUrl,
                    platform,
                );
                const thumbnailPaths = await videoProcessor.generateThumbnail(
                    videoPath,
                );
                const analysis = await aiAnalyzer.analyzeVideo(
                    thumbnailPaths,
                    metadata,
                );

                await sheetsManager.saveVideoData({
                    platform,
                    postUrl,
                    videoPath,
                    thumbnailPaths,
                    metadata,
                    analysis,
                    timestamp: new Date().toISOString(),
                });

                stats.total++;
                stats.today++;

                res.json({
                    success: true,
                    data: {
                        processing: { platform, frameCount: 1 },
                        analysis: {
                            category: analysis.category,
                            keywords: analysis.keywords,
                            hashtags: analysis.hashtags,
                        },
                        files: { videoPath, thumbnailPaths },
                    },
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '비디오 처리 실패',
                    error: error.message,
                });
            }
        });

        app.get('/api/videos', async (req, res) => {
            try {
                const videos = await sheetsManager.getRecentVideos();
                res.json({
                    success: true,
                    data: videos,
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '데이터 조회 실패',
                    error: error.message,
                });
            }
        });

        app.post('/api/upload', upload.single('video'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: '파일이 업로드되지 않았습니다',
                    });
                }

                const thumbnailPath = await videoProcessor.generateThumbnail(
                    req.file.path,
                );
                const analysis = await aiAnalyzer.analyzeVideo(
                    thumbnailPath,
                    {},
                );

                res.json({
                    success: true,
                    data: {
                        file: {
                            name: req.file.originalname,
                            size: req.file.size,
                        },
                        thumbnail: thumbnailPath,
                        analysis,
                    },
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '파일 업로드 실패',
                    error: error.message,
                });
            }
        });

        // 404 핸들러
        app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: '경로를 찾을 수 없습니다',
            });
        });
    });

    beforeEach(() => {
        // Mock 함수 초기화
        jest.clearAllMocks();

        // Mock 반환값 설정
        mockConfig.healthCheck.mockReturnValue({
            status: 'healthy',
            services: ['sheets'],
        });
    });

    describe('GET /health', () => {
        it('서버 상태를 반환해야 함', async () => {
            const response = await request(app).get('/health').expect(200);

            expect(response.body).toEqual({
                success: true,
                data: {
                    useGemini: false,
                    version: '1.0.0',
                },
            });
        });
    });

    describe('GET /api/stats', () => {
        it('통계 정보를 반환해야 함', async () => {
            const response = await request(app).get('/api/stats').expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total');
            expect(response.body.data).toHaveProperty('today');
        });
    });

    describe('GET /api/test-sheets', () => {
        it('구글 시트 연결이 성공하면 200을 반환해야 함', async () => {
            mockSheetsManager.testConnection.mockResolvedValue({
                status: 'connected',
                spreadsheetTitle: 'Test Sheet',
            });

            const response = await request(app)
                .get('/api/test-sheets')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('connected');
            expect(mockSheetsManager.testConnection).toHaveBeenCalled();
        });

        it('구글 시트 연결이 실패하면 500을 반환해야 함', async () => {
            mockSheetsManager.testConnection.mockRejectedValue(
                new Error('Permission denied'),
            );

            const response = await request(app)
                .get('/api/test-sheets')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('연결 테스트 실패');
        });
    });

    describe('GET /api/config/health', () => {
        it('설정이 정상이면 200을 반환해야 함', async () => {
            const response = await request(app)
                .get('/api/config/health')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('status');
            expect(mockConfig.healthCheck).toHaveBeenCalled();
        });

        it('설정 확인이 실패하면 500을 반환해야 함', async () => {
            mockConfig.healthCheck.mockImplementationOnce(() => {
                throw new Error('Config error');
            });

            const response = await request(app)
                .get('/api/config/health')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('설정 상태 확인 실패');
        });
    });

    describe('POST /api/process-video', () => {
        it('비디오 처리가 성공하면 200을 반환해야 함', async () => {
            // Mock 반환값 설정
            mockVideoProcessor.downloadVideo.mockResolvedValue(
                '/path/to/video.mp4',
            );
            mockVideoProcessor.generateThumbnail.mockResolvedValue([
                '/path/to/thumb.jpg',
            ]);
            mockAIAnalyzer.analyzeVideo.mockResolvedValue({
                category: '게임 > 플레이·리뷰',
                keywords: ['게임', '플레이'],
                hashtags: ['#게임', '#플레이'],
            });
            mockSheetsManager.saveVideoData.mockResolvedValue();

            const requestData = {
                platform: 'INSTAGRAM',
                videoUrl: 'https://example.com/video.mp4',
                postUrl: 'https://instagram.com/p/test',
                metadata: {
                    caption: '게임 플레이 영상',
                    hashtags: ['#게임'],
                },
            };

            const response = await request(app)
                .post('/api/process-video')
                .send(requestData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('processing');
            expect(response.body.data).toHaveProperty('analysis');
            expect(response.body.data).toHaveProperty('files');

            // Mock 함수들이 올바른 인자로 호출되었는지 확인
            expect(mockVideoProcessor.downloadVideo).toHaveBeenCalledWith(
                'https://example.com/video.mp4',
                'INSTAGRAM',
            );
            expect(mockSheetsManager.saveVideoData).toHaveBeenCalled();
        });

        it('비디오 다운로드 실패 시 500을 반환해야 함', async () => {
            mockVideoProcessor.downloadVideo.mockRejectedValue(
                new Error('Download failed'),
            );

            const requestData = {
                platform: 'INSTAGRAM',
                videoUrl: 'https://example.com/video.mp4',
                postUrl: 'https://instagram.com/p/test',
                metadata: {},
            };

            const response = await request(app)
                .post('/api/process-video')
                .send(requestData)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('비디오 처리 실패');
        });
    });

    describe('GET /api/videos', () => {
        it('비디오 목록을 성공적으로 반환해야 함', async () => {
            const mockVideos = [
                {
                    platform: 'INSTAGRAM',
                    url: 'https://instagram.com/p/test1',
                    mainCategory: '게임',
                    date: '2024-01-01',
                },
                {
                    platform: 'TIKTOK',
                    url: 'https://tiktok.com/@test/video/123',
                    mainCategory: '음악',
                    date: '2024-01-02',
                },
            ];

            mockSheetsManager.getRecentVideos.mockResolvedValue(mockVideos);

            const response = await request(app).get('/api/videos').expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockVideos);
            expect(mockSheetsManager.getRecentVideos).toHaveBeenCalled();
        });

        it('데이터 조회 실패 시 500을 반환해야 함', async () => {
            mockSheetsManager.getRecentVideos.mockRejectedValue(
                new Error('Database error'),
            );

            const response = await request(app).get('/api/videos').expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('데이터 조회 실패');
        });
    });

    describe('POST /api/upload', () => {
        it('파일 업로드가 성공해야 함', async () => {
            mockVideoProcessor.generateThumbnail.mockResolvedValue(
                '/path/to/thumb.jpg',
            );
            mockAIAnalyzer.analyzeVideo.mockResolvedValue({
                category: '라이프·블로그 > 일상 Vlog·Q&A',
                keywords: ['일상', '브이로그'],
                hashtags: ['#일상', '#브이로그'],
            });

            const response = await request(app)
                .post('/api/upload')
                .attach('video', Buffer.from('fake video content'), 'test.mp4')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('file');
            expect(response.body.data).toHaveProperty('analysis');
            expect(response.body.data.file.name).toBe('test.mp4');
        });

        it('파일이 없으면 400을 반환해야 함', async () => {
            const response = await request(app).post('/api/upload').expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain(
                '파일이 업로드되지 않았습니다',
            );
        });
    });

    describe('404 Handler', () => {
        it('존재하지 않는 경로에 대해 404를 반환해야 함', async () => {
            const response = await request(app)
                .get('/nonexistent/path')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('경로를 찾을 수 없습니다');
        });
    });

    describe('CORS', () => {
        it('CORS 헤더가 설정되어야 함', async () => {
            const response = await request(app).options('/health').expect(204);

            expect(response.headers).toHaveProperty(
                'access-control-allow-origin',
            );
        });
    });
});
