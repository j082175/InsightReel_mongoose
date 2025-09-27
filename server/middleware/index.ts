import * as express from 'express';
import corsMiddleware from './cors';
import encodingMiddleware from './encoding';
import setupStaticFiles from './static';
import upload from './upload';

/**
 * 모든 미들웨어를 Express 앱에 적용
 * @param app Express 애플리케이션 인스턴스
 */
export const setupMiddleware = (app: express.Application) => {
    // 1. CORS 설정
    app.use(corsMiddleware);

    // 2. JSON 및 URL 인코딩 파서 설정
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // 3. UTF-8 인코딩 미들웨어
    app.use(encodingMiddleware);

    // 4. 정적 파일 서빙 설정
    setupStaticFiles(app);
};

// 개별 미들웨어 내보내기
export {
    corsMiddleware,
    encodingMiddleware,
    setupStaticFiles,
    upload
};

export default setupMiddleware;