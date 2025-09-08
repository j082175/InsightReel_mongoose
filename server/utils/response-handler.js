const { ServerLogger } = require('./logger');

/**
 * 표준화된 API 응답 핸들러
 */
class ResponseHandler {
  /**
   * 표준 API 응답 형식
   * @param {boolean} success - 성공 여부
   * @param {any} data - 응답 데이터
   * @param {string|null} message - 메시지
   * @param {Object|null} error - 에러 정보
   * @param {Object} meta - 메타데이터 (페이징, 버전 등)
   * @returns {Object} 표준 응답 객체
   */
  static createResponse(success, data = null, message = null, error = null, meta = {}) {
    const response = {
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

  /**
   * 성공 응답 전송
   * @param {Response} res - Express Response 객체
   * @param {any} data - 응답 데이터
   * @param {string} message - 성공 메시지
   * @param {Object} meta - 메타데이터
   */
  static success(res, data = null, message = null, meta = {}) {
    const response = this.createResponse(true, data, message, null, meta);
    
    ServerLogger.info('API 성공 응답', {
      endpoint: res.req.originalUrl,
      method: res.req.method,
      statusCode: 200
    });

    res.status(200).json(response);
  }

  /**
   * 생성 성공 응답 전송 (201)
   * @param {Response} res - Express Response 객체
   * @param {any} data - 생성된 데이터
   * @param {string} message - 성공 메시지
   * @param {Object} meta - 메타데이터
   */
  static created(res, data = null, message = null, meta = {}) {
    const response = this.createResponse(true, data, message, null, meta);
    
    ServerLogger.info('API 생성 성공 응답', {
      endpoint: res.req.originalUrl,
      method: res.req.method,
      statusCode: 201
    });

    res.status(201).json(response);
  }

  /**
   * 클라이언트 에러 응답 전송 (400번대)
   * @param {Response} res - Express Response 객체
   * @param {string|Error} error - 에러 정보
   * @param {number} statusCode - HTTP 상태 코드
   * @param {string} message - 에러 메시지
   */
  static clientError(res, error, statusCode = 400, message = null) {
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

  /**
   * 서버 에러 응답 전송 (500번대)
   * @param {Response} res - Express Response 객체
   * @param {Error} error - 에러 객체
   * @param {string} message - 에러 메시지
   */
  static serverError(res, error, message = '서버 내부 오류가 발생했습니다.') {
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

  /**
   * 인증 실패 응답 (401)
   * @param {Response} res - Express Response 객체
   * @param {string} message - 인증 실패 메시지
   */
  static unauthorized(res, message = '인증이 필요합니다.') {
    this.clientError(res, { code: 'UNAUTHORIZED', message }, 401, message);
  }

  /**
   * 권한 없음 응답 (403)
   * @param {Response} res - Express Response 객체
   * @param {string} message - 권한 없음 메시지
   */
  static forbidden(res, message = '접근 권한이 없습니다.') {
    this.clientError(res, { code: 'FORBIDDEN', message }, 403, message);
  }

  /**
   * 잘못된 요청 응답 (400)
   * @param {Response} res - Express Response 객체
   * @param {string} message - 잘못된 요청 메시지
   */
  static badRequest(res, message = '잘못된 요청입니다.') {
    this.clientError(res, { code: 'BAD_REQUEST', message }, 400, message);
  }

  /**
   * 리소스 없음 응답 (404)
   * @param {Response} res - Express Response 객체
   * @param {string} message - 리소스 없음 메시지
   */
  static notFound(res, message = '요청한 리소스를 찾을 수 없습니다.') {
    this.clientError(res, { code: 'NOT_FOUND', message }, 404, message);
  }

  /**
   * 요청 충돌 응답 (409)
   * @param {Response} res - Express Response 객체
   * @param {string} message - 충돌 메시지
   */
  static conflict(res, message = '요청이 현재 리소스 상태와 충돌합니다.') {
    this.clientError(res, { code: 'CONFLICT', message }, 409, message);
  }

  /**
   * 유효성 검사 실패 응답 (422)
   * @param {Response} res - Express Response 객체
   * @param {Object|Array} validationErrors - 유효성 검사 에러들
   * @param {string} message - 메시지
   */
  static validationError(res, validationErrors, message = '입력 데이터가 유효하지 않습니다.') {
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

  /**
   * 비율 제한 초과 응답 (429)
   * @param {Response} res - Express Response 객체
   * @param {string} message - 제한 메시지
   * @param {number} retryAfter - 재시도 가능 시간 (초)
   */
  static tooManyRequests(res, message = '요청 횟수 제한을 초과했습니다.', retryAfter = 60) {
    res.set('Retry-After', retryAfter);
    this.clientError(res, { code: 'RATE_LIMIT_EXCEEDED', message }, 429, message);
  }

  /**
   * 페이징된 데이터 응답
   * @param {Response} res - Express Response 객체
   * @param {Array} data - 데이터 배열
   * @param {Object} pagination - 페이징 정보
   * @param {string} message - 메시지
   */
  static pagedSuccess(res, data, pagination, message = null) {
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

  /**
   * 헬스체크 응답
   * @param {Response} res - Express Response 객체
   * @param {Object} healthData - 헬스체크 데이터
   */
  static health(res, healthData) {
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...healthData
    };

    res.status(200).json(response);
  }
}

module.exports = ResponseHandler;