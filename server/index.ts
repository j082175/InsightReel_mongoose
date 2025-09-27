/**
 * InsightReel Server - 리팩토링된 진입점
 *
 * 기존 4,359줄의 거대한 index.ts를 모듈화하여 유지보수성 향상
 *
 * 구조:
 * - app.ts: Express 앱 생성 및 미들웨어 설정
 * - server.ts: 서버 시작 및 종료 로직
 * - routes/: API 라우터들 (video, channel, trending, cluster, admin)
 * - middleware/: 미들웨어 모듈들 (cors, upload, encoding, static)
 *
 * @version 2.0.0
 * @author Claude Code
 */

import { startServer } from './server';

// 서버 시작 (CommonJS 환경에서 top-level await 대신 IIFE 사용)
(async () => {
    try {
        await startServer();
    } catch (error) {
        console.error('서버 시작 실패:', error);
        process.exit(1);
    }
})();