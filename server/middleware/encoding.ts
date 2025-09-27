import { Request, Response, NextFunction } from 'express';

/**
 * UTF-8 인코딩 미들웨어
 * 요청/응답의 문자 인코딩을 UTF-8로 설정
 */
const encodingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Request 인코딩 설정 (타입 안전성을 위한 조건부 처리)
    if (typeof (req as any).setEncoding === 'function') {
        (req as any).setEncoding('utf8');
    }

    // Response 헤더에 UTF-8 인코딩 설정
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    next();
};

export default encodingMiddleware;