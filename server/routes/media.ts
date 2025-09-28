import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES, ERROR_CODES } from '../config/api-messages';

const router = Router();

/**
 * 🖼️ 미디어 프록시 및 서빙 API
 * CORS 우회 및 로컬 파일 서빙 기능
 */

// 이미지 프록시 API (CORS 우회)
router.get('/proxy-image', async (req: Request, res: Response) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return ResponseHandler.clientError(res, {
                field: 'url',
                message: '이미지 URL이 필요합니다.'
            });
        }

        // Instagram CDN URL 허용
        const allowedDomains = [
            'instagram.com',
            'cdninstagram.com',
            'fbcdn.net',
            'instagram.ficn1-1.fna.fbcdn.net'
        ];

        const isAllowed = allowedDomains.some(domain => url.includes(domain));
        if (!isAllowed) {
            return ResponseHandler.clientError(res, {
                field: 'url',
                message: '허용되지 않은 도메인입니다.'
            });
        }

        ServerLogger.info('🖼️ 이미지 프록시 요청:', url);

        // fetch를 사용하여 이미지 가져오기
        const fetch = (await import('node-fetch')).default;
        const imageResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!imageResponse.ok) {
            throw new Error(`이미지 로드 실패: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        // Content-Type 설정
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);

        // CORS 헤더 설정
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // 이미지 스트림 전달
        const buffer = await imageResponse.buffer();
        res.send(buffer);

        ServerLogger.info('✅ 이미지 프록시 성공:', url);

    } catch (error) {
        ServerLogger.error('❌ 이미지 프록시 에러:', error);

        // 기본 placeholder 이미지 반환
        try {
            const placeholderPath = path.join(__dirname, '../../public/placeholder.jpg');
            if (fs.existsSync(placeholderPath)) {
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Access-Control-Allow-Origin', '*');
                return res.sendFile(placeholderPath);
            }
        } catch (placeholderError) {
            // placeholder도 실패하면 404 반환
        }

        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            error: ERROR_CODES.NOT_FOUND,
            message: '이미지를 불러올 수 없습니다.'
        });
    }
});

// 로컬 미디어 파일 서빙 (썸네일 등)
router.get('/local/:filename', (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        // 보안: 파일명 검증
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return ResponseHandler.clientError(res, {
                field: 'filename',
                message: '유효하지 않은 파일명입니다.'
            });
        }

        // 허용된 확장자 확인
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const ext = path.extname(filename).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return ResponseHandler.clientError(res, {
                field: 'filename',
                message: '허용되지 않은 파일 형식입니다.'
            });
        }

        // 파일 경로 구성
        const thumbnailsDir = path.join(__dirname, '../../media/thumbnails');
        const filePath = path.join(thumbnailsDir, filename);

        // 파일 존재 확인
        if (!fs.existsSync(filePath)) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: ERROR_CODES.NOT_FOUND,
                message: '파일을 찾을 수 없습니다.'
            });
        }

        // CORS 헤더 설정
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐시

        // 파일 전송
        res.sendFile(filePath);

        ServerLogger.info('📁 로컬 미디어 파일 서빙:', filename);

    } catch (error) {
        ServerLogger.error('❌ 로컬 미디어 파일 서빙 에러:', error);
        return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: ERROR_CODES.SERVER_ERROR,
            message: '파일 서빙 중 오류가 발생했습니다.'
        });
    }
});

// 미디어 파일 목록 조회
router.get('/thumbnails', (req: Request, res: Response) => {
    try {
        const thumbnailsDir = path.join(__dirname, '../../media/thumbnails');

        if (!fs.existsSync(thumbnailsDir)) {
            return ResponseHandler.success(res, [], '썸네일 폴더가 존재하지 않습니다.');
        }

        const files = fs.readdirSync(thumbnailsDir)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            })
            .map(file => {
                const filePath = path.join(thumbnailsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    url: `/api/media/local/${file}`,
                    size: stats.size,
                    modified: stats.mtime,
                    created: stats.birthtime
                };
            })
            .sort((a, b) => b.modified.getTime() - a.modified.getTime());

        ResponseHandler.success(res, files, `${files.length}개의 썸네일 파일을 찾았습니다.`);

    } catch (error) {
        ServerLogger.error('❌ 썸네일 목록 조회 에러:', error);
        ResponseHandler.serverError(res, error, '썸네일 목록 조회에 실패했습니다.');
    }
});

export default router;