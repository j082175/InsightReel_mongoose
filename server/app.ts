import * as express from 'express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { setupMiddleware } from './middleware';
import routes from './routes';
import { ServerLogger } from './utils/logger';

// 환경변수 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

// 설정 검증
import { getConfig } from './config/config-validator';
const config = getConfig();

/**
 * Express 애플리케이션 생성 및 설정
 */
const createApp = async (): Promise<express.Application> => {
    const app = express.default();

    try {
        // 1. 미들웨어 설정
        setupMiddleware(app);

        // 2. 클러스터 시스템 초기화
        try {
            const { initializeClusterSystem } = require('./features/cluster');
            initializeClusterSystem(app);
            ServerLogger.success('✅ 클러스터 시스템 초기화 완료');
        } catch (error) {
            ServerLogger.error('❌ 클러스터 시스템 초기화 실패:', error);
        }

        // 3. 라우터 설정
        app.use(routes);

        // 4. 404 핸들러
        app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: `Route ${req.method} ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });

        // 5. 글로벌 에러 핸들러
        app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            ServerLogger.error('글로벌 에러 핸들러:', err);

            res.status(500).json({
                success: false,
                error: 'INTERNAL_SERVER_ERROR',
                message: '서버 내부 오류가 발생했습니다',
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        });

        ServerLogger.success('✅ Express 앱 생성 완료');
        return app;

    } catch (error) {
        ServerLogger.error('❌ Express 앱 생성 실패:', error);
        throw error;
    }
};

export { createApp, config };
export default createApp;