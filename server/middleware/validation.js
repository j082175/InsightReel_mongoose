const { HTTP_STATUS_CODES } = require('../config/api-messages');

/**
 * 입력 검증 미들웨어
 */
class ValidationMiddleware {
    /**
     * 비디오 처리 요청 검증
     */
    static validateProcessVideo(req, res, next) {
        const { platform, videoUrl, postUrl } = req.body;

        const errors = [];

        // 필수 필드 검증
        if (!platform) {
            errors.push('platform은 필수입니다');
        } else if (!['INSTAGRAM', 'TIKTOK', 'YOUTUBE'].includes(platform)) {
            errors.push('platform은 instagram, tiktok 또는 youtube이어야 합니다');
        }

        if (!videoUrl) {
            errors.push('videoUrl은 필수입니다');
        } else if (!ValidationMiddleware.isValidUrl(videoUrl)) {
            errors.push('videoUrl이 올바른 URL 형식이 아닙니다');
        }

        if (!postUrl) {
            errors.push('postUrl은 필수입니다');
        } else if (!ValidationMiddleware.isValidUrl(postUrl)) {
            errors.push('postUrl이 올바른 URL 형식이 아닙니다');
        }

        if (errors.length > 0) {
            const error = new Error('입력 데이터 검증 실패');
            error.statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
            error.type = 'VALIDATION_ERROR';
            error.details = errors;
            return next(error);
        }

        next();
    }

    /**
     * 비디오 블롭 처리 요청 검증
     */
    static validateProcessVideoBlob(req, res, next) {
        const { platform, postUrl } = req.body;
        const file = req.file;

        const errors = [];

        // 파일 검증
        if (!file) {
            errors.push('비디오 파일이 필요합니다');
        } else {
            // 파일 크기 검증 (최대 100MB)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (file.size > maxSize) {
                errors.push(
                    `파일 크기가 너무 큽니다. 최대 ${
                        maxSize / 1024 / 1024
                    }MB까지 지원됩니다`,
                );
            }

            // 파일 타입 검증
            const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
            if (!allowedTypes.includes(file.mimetype)) {
                errors.push(
                    '지원되지 않는 비디오 형식입니다. MP4, WebM, QuickTime만 지원됩니다',
                );
            }
        }

        // 필수 필드 검증
        if (!platform) {
            errors.push('platform은 필수입니다');
        } else if (!['INSTAGRAM', 'TIKTOK', 'YOUTUBE'].includes(platform)) {
            errors.push('platform은 instagram, tiktok 또는 youtube이어야 합니다');
        }

        if (!postUrl) {
            errors.push('postUrl은 필수입니다');
        } else if (!ValidationMiddleware.isValidUrl(postUrl)) {
            errors.push('postUrl이 올바른 URL 형식이 아닙니다');
        }

        if (errors.length > 0) {
            const error = new Error('입력 데이터 검증 실패');
            error.statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
            error.type = 'VALIDATION_ERROR';
            error.details = errors;
            return next(error);
        }

        next();
    }

    /**
     * 파일 업로드 검증
     */
    static validateFileUpload(req, res, next) {
        const file = req.file;

        if (!file) {
            const error = new Error('파일이 업로드되지 않았습니다');
            error.statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
            error.type = 'VALIDATION_ERROR';
            return next(error);
        }

        // 파일 크기 검증
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            const error = new Error(
                `파일 크기가 너무 큽니다. 최대 ${
                    maxSize / 1024 / 1024
                }MB까지 지원됩니다`,
            );
            error.statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
            error.type = 'VALIDATION_ERROR';
            return next(error);
        }

        next();
    }

    /**
     * URL 유효성 검증
     */
    static isValidUrl(string) {
        try {
            const url = new URL(string);
            return ['http:', 'https:', 'blob:'].includes(url.protocol);
        } catch (_) {
            return false;
        }
    }

    /**
     * 요청 제한 검증 (간단한 rate limiting)
     */
    static rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
        const requestCounts = new Map();

        return (req, res, next) => {
            const clientId = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const windowStart = now - windowMs;

            // 이전 요청 기록 정리
            if (requestCounts.has(clientId)) {
                const requests = requestCounts.get(clientId);
                const filteredRequests = requests.filter(
                    (time) => time > windowStart,
                );
                requestCounts.set(clientId, filteredRequests);
            }

            // 현재 요청 수 확인
            const currentRequests = requestCounts.get(clientId) || [];

            if (currentRequests.length >= maxRequests) {
                const error = new Error(
                    '너무 많은 요청입니다. 잠시 후 다시 시도해주세요',
                );
                error.statusCode = HTTP_STATUS_CODES.TOO_MANY_REQUESTS;
                error.type = 'RATE_LIMIT_EXCEEDED';
                return next(error);
            }

            // 현재 요청 기록
            currentRequests.push(now);
            requestCounts.set(clientId, currentRequests);

            next();
        };
    }

    /**
     * CORS 허용 도메인 검증
     */
    static validateOrigin(req, res, next) {
        const origin = req.get('Origin');

        if (!origin) {
            return next(); // Origin이 없는 경우 허용 (같은 도메인 요청)
        }

        const allowedOrigins = [
            'https://www.instagram.com',
            'https://instagram.com',
            'https://www.tiktok.com',
            'https://tiktok.com',
        ];

        // 개발 환경에서는 localhost 허용
        if (process.env.NODE_ENV === 'development') {
            allowedOrigins.push('http://localhost:3000');
            allowedOrigins.push('http://127.0.0.1:3000');
        }

        // Chrome extension 허용
        if (origin.startsWith('chrome-extension://')) {
            return next();
        }

        if (!allowedOrigins.includes(origin)) {
            const error = new Error('허용되지 않는 도메인입니다');
            error.statusCode = HTTP_STATUS_CODES.FORBIDDEN;
            error.type = 'FORBIDDEN_ORIGIN';
            return next(error);
        }

        next();
    }

    /**
     * Content-Type 검증
     */
    static validateContentType(expectedType) {
        return (req, res, next) => {
            const contentType = req.get('Content-Type');

            if (
                expectedType === 'application/json' &&
                (!contentType || !contentType.includes('application/json'))
            ) {
                const error = new Error(
                    'Content-Type은 application/json이어야 합니다',
                );
                error.statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
                error.type = 'INVALID_CONTENT_TYPE';
                return next(error);
            }

            next();
        };
    }

    /**
     * 메타데이터 검증
     */
    static validateMetadata(req, res, next) {
        if (!req.body.metadata) {
            return next();
        }

        try {
            const metadata =
                typeof req.body.metadata === 'string'
                    ? JSON.parse(req.body.metadata)
                    : req.body.metadata;

            // 메타데이터 구조 검증
            if (typeof metadata !== 'object') {
                throw new Error('metadata는 객체여야 합니다');
            }

            // 필요한 경우 메타데이터 필드 검증 추가
            req.body.metadata = metadata;
            next();
        } catch (error) {
            const validationError = new Error(
                `메타데이터 형식이 올바르지 않습니다: ${error.message}`,
            );
            validationError.statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
            validationError.type = 'VALIDATION_ERROR';
            next(validationError);
        }
    }
}

module.exports = ValidationMiddleware;
