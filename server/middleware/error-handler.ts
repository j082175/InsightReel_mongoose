import { Request, Response, NextFunction } from 'express';
import { ServerLogger } from '../utils/logger';
import { HTTP_STATUS_CODES } from '../config/api-messages';

// TypeScript interfaces for error handling
export interface NormalizedError extends Error {
    statusCode?: number;
    type?: string;
    details?: any;
    code?: string;
}

export interface ErrorResponse {
    success: false;
    error: {
        type: string;
        message: string;
        timestamp: string;
        stack?: string;
        statusCode?: number;
        suggestion?: string;
        details?: any;
    };
    processingTime?: number;
}

export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    timestamp: string;
    processingTime: number;
}

export interface LogData {
    timestamp: string;
    method?: string;
    url?: string;
    ip?: string;
    userAgent?: string;
    error: {
        type?: string;
        message: string;
        statusCode?: number;
        stack?: string;
    };
}

export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
}

export type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export type AsyncOperation<T = any> = () => Promise<T>;
export type SyncOperation<T = any> = () => T;
export type ConditionFunction = () => boolean;

/**
 * 에러 처리 미들웨어
 */
export class ErrorHandler {
    /**
     * 글로벌 에러 핸들러
     */
    static globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
        const error = ErrorHandler.normalizeError(err);

        // 로그 출력
        ErrorHandler.logError(error, req);

        // 클라이언트 응답
        const response = ErrorHandler.createErrorResponse(error);
        res.status(error.statusCode || HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json(response);
    }

    /**
     * 404 핸들러
     */
    static notFoundHandler(req: Request, res: Response): void {
        const error: NormalizedError = new Error(`경로를 찾을 수 없습니다: ${req.path}`);
        error.statusCode = HTTP_STATUS_CODES.NOT_FOUND;
        error.type = 'NOT_FOUND';

        ErrorHandler.logError(error, req);
        res.status(HTTP_STATUS_CODES.NOT_FOUND).json(ErrorHandler.createErrorResponse(error));
    }

    /**
     * 에러 정규화
     */
    static normalizeError(err: any): NormalizedError {
        // 이미 정규화된 에러인 경우
        if (err.statusCode && err.type) {
            return err;
        }

        // 일반적인 에러 타입들 처리
        if (err.name === 'ValidationError') {
            err.statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
            err.type = 'VALIDATION_ERROR';
        } else if (err.name === 'UnauthorizedError') {
            err.statusCode = HTTP_STATUS_CODES.UNAUTHORIZED;
            err.type = 'UNAUTHORIZED';
        } else if (err.code === 'ENOENT') {
            err.statusCode = HTTP_STATUS_CODES.NOT_FOUND;
            err.type = 'FILE_NOT_FOUND';
            err.message = '파일을 찾을 수 없습니다';
        } else if (err.code === 'EACCES') {
            err.statusCode = HTTP_STATUS_CODES.FORBIDDEN;
            err.type = 'PERMISSION_DENIED';
            err.message = '파일 접근 권한이 없습니다';
        } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
            err.statusCode = HTTP_STATUS_CODES.SERVICE_UNAVAILABLE;
            err.type = 'TOO_MANY_FILES';
            err.message = '시스템 리소스 부족';
        } else {
            // 기본 서버 에러
            err.statusCode = err.statusCode || HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
            err.type = err.type || 'INTERNAL_SERVER_ERROR';
        }

        return err;
    }

    /**
     * 에러 로깅
     */
    static logError(error: NormalizedError, req: Request): void {
        const logData: LogData = {
            timestamp: new Date().toISOString(),
            method: req?.method,
            url: req?.url,
            ip: req?.ip || req?.connection?.remoteAddress,
            userAgent: req?.get('User-Agent'),
            error: {
                type: error.type,
                message: error.message,
                statusCode: error.statusCode,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        };

        if ((error.statusCode || 500) >= 500) {
            ServerLogger.error('🚨 Server Error:', JSON.stringify(logData, null, 2));
        } else if ((error.statusCode || 500) >= 400) {
            ServerLogger.warn('⚠️ Client Error:', JSON.stringify(logData, null, 2));
        } else {
            ServerLogger.info('ℹ️ Info:', JSON.stringify(logData, null, 2));
        }
    }

    /**
     * 에러 응답 생성
     */
    static createErrorResponse(error: NormalizedError): ErrorResponse {
        const response: ErrorResponse = {
            success: false,
            error: {
                type: error.type || 'UNKNOWN_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        // 개발 환경에서만 상세 정보 포함
        if (process.env.NODE_ENV === 'development') {
            response.error.stack = error.stack;
            response.error.statusCode = error.statusCode;
        }

        // 에러 타입별 추가 정보
        switch (error.type) {
            case 'VALIDATION_ERROR':
                response.error.suggestion = '요청 데이터를 확인해주세요';
                if (error.details) {
                    response.error.details = error.details;
                }
                break;
            case 'FILE_NOT_FOUND':
                response.error.suggestion = '파일 경로를 확인해주세요';
                break;
            case 'PERMISSION_DENIED':
                response.error.suggestion = '파일 권한을 확인해주세요';
                break;
            case 'TOO_MANY_FILES':
                response.error.suggestion = '잠시 후 다시 시도해주세요';
                break;
            case 'INTERNAL_SERVER_ERROR':
                response.error.suggestion = '서버 관리자에게 문의하세요';
                break;
        }

        return response;
    }

    /**
     * 비동기 함수 래퍼 (에러 자동 처리)
     */
    static asyncHandler(fn: AsyncMiddleware): (req: Request, res: Response, next: NextFunction) => void {
        return (req: Request, res: Response, next: NextFunction): void => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * 커스텀 에러 생성자
     */
    static createError(
        message: string,
        statusCode: number = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        type: string = 'CUSTOM_ERROR'
    ): NormalizedError {
        const error: NormalizedError = new Error(message);
        error.statusCode = statusCode;
        error.type = type;
        return error;
    }

    /**
     * 안전한 비동기 작업 실행
     */
    static async safeExecute<T>(
        operation: AsyncOperation<T>,
        context: string = '작업',
        fallback: T | null = null
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            ServerLogger.error(`${context} 실패`, error as Error, 'SAFE_EXEC');
            return fallback;
        }
    }

    /**
     * 안전한 동기 작업 실행
     */
    static safeSyncExecute<T>(
        operation: SyncOperation<T>,
        context: string = '작업',
        fallback: T | null = null
    ): T | null {
        try {
            return operation();
        } catch (error) {
            ServerLogger.error(`${context} 실패`, error as Error, 'SAFE_EXEC');
            return fallback;
        }
    }

    /**
     * 안전한 API 응답 래퍼
     */
    static async safeApiResponse<T>(
        operation: AsyncOperation<T>,
        req: Request,
        res: Response,
        context: string = 'API 작업'
    ): Promise<void> {
        const startTime = Date.now();

        try {
            const result = await operation();

            const response: SuccessResponse<T> = {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - startTime
            };

            ServerLogger.performance(context, startTime, response.data, 'API');
            res.json(response);

        } catch (error) {
            const normalizedError = this.normalizeError(error);
            const errorResponse = this.createErrorResponse(normalizedError);
            errorResponse.processingTime = Date.now() - startTime;

            this.logError(normalizedError, req);
            res.status(normalizedError.statusCode || HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponse);
        }
    }

    /**
     * 조건부 안전 실행
     */
    static conditionalExecute<T>(
        condition: ConditionFunction,
        operation: SyncOperation<T>,
        errorMessage: string = '조건 불만족',
        fallback: T | null = null
    ): T | null {
        try {
            if (!condition()) {
                ServerLogger.warn(errorMessage, null, 'CONDITION');
                return fallback;
            }
            return operation();
        } catch (error) {
            ServerLogger.error('조건부 실행 실패', error as Error, 'CONDITION');
            return fallback;
        }
    }

    /**
     * 재시도 로직이 포함된 안전 실행
     */
    static async safeExecuteWithRetry<T>(
        operation: AsyncOperation<T>,
        context: string = '작업',
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T | null> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt); // 지수 백오프
                    ServerLogger.warn(`${context} 재시도 ${attempt + 1}/${maxRetries + 1}`, { delay }, 'RETRY');
                    await this.delay(delay);
                }
            }
        }

        ServerLogger.error(`${context} 최종 실패 (${maxRetries + 1}회 시도)`, lastError, 'RETRY');
        return null;
    }

    /**
     * 지연 함수
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Default export for backwards compatibility
export default ErrorHandler;

// CommonJS compatibility for legacy require() imports
module.exports = ErrorHandler;