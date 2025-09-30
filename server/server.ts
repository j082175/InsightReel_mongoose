import { createApp, config } from './app';
import { ServerLogger } from './utils/logger';
import DatabaseManager from './config/database';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * 서버 시작 함수
 */
const startServer = async () => {
    try {
        const app = await createApp();
        const PORT = config.get('PORT');

        // MongoDB 연결 시도 (USE_MONGODB가 true인 경우에만)
        if (process.env.USE_MONGODB === 'true') {
            try {
                ServerLogger.info('🔗 MongoDB 연결 시도 중...');
                await DatabaseManager.connect();
                ServerLogger.info('✅ MongoDB 연결 완료');
            } catch (dbError) {
                ServerLogger.error('❌ MongoDB 연결 실패, Google Sheets 전용 모드로 실행:', dbError);
                // MongoDB 연결이 실패해도 서버는 계속 실행 (Google Sheets 모드)
            }
        } else {
            ServerLogger.info('ℹ️ MongoDB 사용 안함 - Google Sheets 전용 모드');
        }

        // yt-dlp 자동 업데이트 시스템 설정
        setupYtDlpAutoUpdater();

        // 서버 시작
        const server = app.listen(PORT, () => {
            ServerLogger.info(`
🎬 InsightReel 서버 실행중 (리팩토링 버전)
📍 포트: ${PORT}
🌐 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
🔒 보안 강화: ✅
⚡ 에러 처리 개선: ✅
🧩 모듈화: ✅

📋 설정 체크리스트:
[ ] Gemini API 키 설정 (.env 파일)
[ ] 구글 API 키 설정 (.env 파일)
[ ] Chrome 확장프로그램 로드

💡 테스트 URL:
- 구글 시트 테스트: http://localhost:${PORT}/api/test-sheets
- API 문서: http://localhost:${PORT}/api/docs
            `);
        });

        // Graceful shutdown 설정
        setupGracefulShutdown(server);

        return server;

    } catch (error: any) {
        ServerLogger.error('🚨 서버 시작 실패', error.message, 'START');
        process.exit(1);
    }
};

/**
 * yt-dlp 자동 업데이트 시스템 설정
 */
const setupYtDlpAutoUpdater = () => {
    const ytdlpNightlyExe = path.join(__dirname, '../yt-dlp-nightly.exe');

    const updateYtDlp = async () => {
        try {
            ServerLogger.info('🔄 yt-dlp-nightly.exe 자동 업데이트 확인 중...');
            const { stdout } = await execAsync(`"${ytdlpNightlyExe}" --update-to nightly`, { timeout: 30000 });

            if (stdout.includes('Updated yt-dlp to')) {
                ServerLogger.info('✅ yt-dlp-nightly.exe 새 버전으로 업데이트 완료');
            } else {
                ServerLogger.info('ℹ️ yt-dlp-nightly.exe 이미 최신 버전');
            }
        } catch (error: any) {
            ServerLogger.warn('⚠️ yt-dlp-nightly.exe 자동 업데이트 실패:', error.message);
        }
    };

    // 서버 시작 30초 후 첫 업데이트 체크
    setTimeout(updateYtDlp, 30000);

    // 이후 1시간마다 주기적 업데이트 체크
    setInterval(updateYtDlp, 60 * 60 * 1000);

    ServerLogger.info('⚡ yt-dlp-nightly.exe 주기적 자동 업데이트 시스템 시작 (1시간 간격)');
};

/**
 * Graceful shutdown 설정
 */
const setupGracefulShutdown = (server: any) => {
    const gracefulShutdown = async (signal: string) => {
        ServerLogger.info(`📡 ${signal} 신호를 받았습니다. 서버를 안전하게 종료합니다...`, 'SHUTDOWN');

        // 메모리 정리
        try {
            ServerLogger.info('🧹 메모리 정리 시작...', 'SHUTDOWN');

            // 1. 비디오 큐 정리
            const videoQueueModule = await import('./utils/VideoQueue');
            const videoQueue = videoQueueModule.default || videoQueueModule;
            if (videoQueue && typeof videoQueue.clearQueue === 'function') {
                videoQueue.clearQueue();
                ServerLogger.info('✅ 비디오 큐 정리 완료', 'SHUTDOWN');
            }

            // 2. 서비스 정리
            try {
                const serviceRegistryModule = await import('./utils/service-registry');
                const ServiceRegistry = serviceRegistryModule.default || serviceRegistryModule;
                if (ServiceRegistry && typeof ServiceRegistry.clearAllServiceCaches === 'function') {
                    ServiceRegistry.clearAllServiceCaches();
                    ServerLogger.info('✅ 서비스 레지스트리 정리 완료', 'SHUTDOWN');
                }
            } catch (serviceError: any) {
                ServerLogger.warn('⚠️ 서비스 정리 실패 (무시하고 계속)', serviceError.message, 'SHUTDOWN');
            }

            // 3. UsageTracker 정리
            try {
                const UsageTrackerModule = await import('./utils/usage-tracker');
                const UsageTracker = UsageTrackerModule.UsageTracker || UsageTrackerModule.default || UsageTrackerModule;
                if (UsageTracker) {
                    if (typeof UsageTracker.destroyAll === 'function') {
                        UsageTracker.destroyAll();
                    }
                    // 4. API 키 파일 감시 중지
                    if (typeof UsageTracker.stopFileWatcher === 'function') {
                        UsageTracker.stopFileWatcher();
                    }
                }
            } catch (usageTrackerError: any) {
                ServerLogger.warn('⚠️ UsageTracker 정리 실패 (무시하고 계속)', usageTrackerError.message, 'SHUTDOWN');
            }

            // 5. 가비지 컬렉션 강제 실행
            if (global.gc) {
                global.gc();
                ServerLogger.info('🧹 가비지 컬렉션 실행 완료', 'SHUTDOWN');
            }

            ServerLogger.info('🧹 메모리 정리 완료', 'SHUTDOWN');
        } catch (cleanupError: any) {
            ServerLogger.error('⚠️ 메모리 정리 중 오류 (무시하고 계속)', cleanupError.message, 'SHUTDOWN');
        }

        server.close(() => {
            ServerLogger.info('✅ HTTP 서버가 종료되었습니다', 'SHUTDOWN');

            // MongoDB 연결 종료
            if (process.env.USE_MONGODB === 'true') {
                DatabaseManager.disconnect().then(() => {
                    ServerLogger.info('✅ MongoDB 연결이 종료되었습니다', 'SHUTDOWN');
                    process.exit(0);
                }).catch((err) => {
                    ServerLogger.error('❌ MongoDB 연결 종료 실패', err.message, 'SHUTDOWN');
                    process.exit(1);
                });
            } else {
                process.exit(0);
            }
        });

        // 강제 종료 타임아웃 (10초)
        setTimeout(() => {
            ServerLogger.error('⏰ 강제 종료 타임아웃', 'SHUTDOWN');
            process.exit(1);
        }, 10000);
    };

    // 시그널 핸들러 등록
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
};

export { startServer };
export default startServer;