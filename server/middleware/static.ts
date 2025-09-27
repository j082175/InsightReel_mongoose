import * as express from 'express';
import * as path from 'path';

/**
 * 정적 파일 서빙 미들웨어 설정
 * @param app Express 애플리케이션 인스턴스
 */
const setupStaticFiles = (app: express.Application) => {
    // 다운로드된 비디오 파일 서빙
    app.use('/downloads', express.static(path.join(__dirname, '../../downloads')));

    // 미디어 파일 (썸네일 등) 서빙
    app.use('/media', express.static(path.join(__dirname, '../../media')));

    // 공개 파일 서빙
    app.use(express.static(path.join(__dirname, '../../public')));
};

export default setupStaticFiles;