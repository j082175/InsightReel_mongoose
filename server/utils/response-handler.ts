import { Response } from 'express';
import { ServerLogger } from './logger';

// Standard API Response interfaces
export interface APIResponse<T = any> {
  success: boolean;
  timestamp: string;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  [key: string]: any;
}

class ResponseHandler {
  static createResponse(success: boolean, data: any = null, message: string | null = null, error: any = null, meta: object = {}) {
    const response: any = {
      success,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (data !== null) {
      response.data = data;
    }

    if (message) {
      response.message = message;
    }

    if (error) {
      response.error = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || '알 수 없는 오류가 발생했습니다.',
        ...(process.env.NODE_ENV !== 'production' && error.stack && { stack: error.stack })
      };
    }

    return response;
  }

  static success(res: Response, data: any = null, message: string | null = null, meta: object = {}) {
    const response = this.createResponse(true, data, message, null, meta);
    
    ServerLogger.info('API 성공 응답', {
      endpoint: res.req.originalUrl,
      method: res.req.method,
      statusCode: 200
    });

    res.status(200).json(response);
  }

  static created(res: Response, data: any = null, message: string | null = null, meta: object = {}) {
    const response = this.createResponse(true, data, message, null, meta);
    
    ServerLogger.info('API 생성 성공 응답', {
      endpoint: res.req.originalUrl,
      method: res.req.method,
      statusCode: 201
    });

    res.status(201).json(response);
  }

  static clientError(res: Response, error: any, statusCode: number = 400, message: string | null = null) {
    const errorObj = typeof error === 'string' 
      ? { code: 'CLIENT_ERROR', message: error }
      : error;

    const response = this.createResponse(false, null, message, errorObj);
    
    ServerLogger.warn('API 클라이언트 에러', {
      endpoint: res.req.originalUrl,
      method: res.req.method,
      statusCode,
      error: errorObj.message
    });

    res.status(statusCode).json(response);
  }

  static serverError(res: Response, error: any, message: string = '서버 내부 오류가 발생했습니다.') {
    const errorObj = {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || message
    };

    const response = this.createResponse(false, null, message, errorObj);
    
    ServerLogger.error('API 서버 에러', {
      endpoint: res.req.originalUrl,
      method: res.req.method,
      statusCode: 500,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json(response);
  }

  static unauthorized(res: Response, message: string = '인증이 필요합니다.') {
    this.clientError(res, { code: 'UNAUTHORIZED', message }, 401, message);
  }

  static forbidden(res: Response, message: string = '접근 권한이 없습니다.') {
    this.clientError(res, { code: 'FORBIDDEN', message }, 403, message);
  }

  static badRequest(res: Response, message: string = '잘못된 요청입니다.') {
    this.clientError(res, { code: 'BAD_REQUEST', message }, 400, message);
  }

  static notFound(res: Response, message: string = '요청한 리소스를 찾을 수 없습니다.') {
    this.clientError(res, { code: 'NOT_FOUND', message }, 404, message);
  }

  static conflict(res: Response, message: string = '요청이 현재 리소스 상태와 충돌합니다.') {
    this.clientError(res, { code: 'CONFLICT', message }, 409, message);
  }

  static validationError(res: Response, validationErrors: any, message: string = '입력 데이터가 유효하지 않습니다.') {
    const response = this.createResponse(false, null, message, {
      code: 'VALIDATION_ERROR',
      message,
      details: validationErrors
    });
    
    ServerLogger.warn('API 유효성 검사 실패', {
      endpoint: res.req.originalUrl,
      method: res.req.method,
      statusCode: 422,
      validationErrors
    });

    res.status(422).json(response);
  }

  static tooManyRequests(res: Response, message: string = '요청 횟수 제한을 초과했습니다.', retryAfter: number = 60) {
    res.set('Retry-After', String(retryAfter));
    this.clientError(res, { code: 'RATE_LIMIT_EXCEEDED', message }, 429, message);
  }

  static pagedSuccess(res: Response, data: any[], pagination: any, message: string | null = null) {
    const meta = {
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        pages: Math.ceil((pagination.total || 0) / (pagination.limit || 20))
      }
    };

    this.success(res, data, message, meta);
  }

  static health(res: Response, healthData: any) {
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...healthData
    };

    res.status(200).json(response);
  }
}

export default ResponseHandler;
