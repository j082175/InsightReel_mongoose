const { ServerLogger } = require('../utils/logger');

/**
 * 에러 처리 미들웨어
 */
class ErrorHandler {
  /**
   * 글로벌 에러 핸들러
   */
  static globalErrorHandler(err, req, res, next) {
    const error = ErrorHandler.normalizeError(err);
    
    // 로그 출력
    ErrorHandler.logError(error, req);
    
    // 클라이언트 응답
    const response = ErrorHandler.createErrorResponse(error);
    res.status(error.statusCode || 500).json(response);
  }

  /**
   * 404 핸들러
   */
  static notFoundHandler(req, res) {
    const error = new Error(`경로를 찾을 수 없습니다: ${req.path}`);
    error.statusCode = 404;
    error.type = 'NOT_FOUND';
    
    ErrorHandler.logError(error, req);
    res.status(404).json(ErrorHandler.createErrorResponse(error));
  }

  /**
   * 에러 정규화
   */
  static normalizeError(err) {
    // 이미 정규화된 에러인 경우
    if (err.statusCode && err.type) {
      return err;
    }

    // 일반적인 에러 타입들 처리
    if (err.name === 'ValidationError') {
      err.statusCode = 400;
      err.type = 'VALIDATION_ERROR';
    } else if (err.name === 'UnauthorizedError') {
      err.statusCode = 401;
      err.type = 'UNAUTHORIZED';
    } else if (err.code === 'ENOENT') {
      err.statusCode = 404;
      err.type = 'FILE_NOT_FOUND';
      err.message = '파일을 찾을 수 없습니다';
    } else if (err.code === 'EACCES') {
      err.statusCode = 403;
      err.type = 'PERMISSION_DENIED';
      err.message = '파일 접근 권한이 없습니다';
    } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
      err.statusCode = 503;
      err.type = 'TOO_MANY_FILES';
      err.message = '시스템 리소스 부족';
    } else {
      // 기본 서버 에러
      err.statusCode = err.statusCode || 500;
      err.type = err.type || 'INTERNAL_SERVER_ERROR';
    }

    return err;
  }

  /**
   * 에러 로깅
   */
  static logError(error, req) {
    const logData = {
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

    if (error.statusCode >= 500) {
      ServerLogger.error('🚨 Server Error:', JSON.stringify(logData, null, 2));
    } else if (error.statusCode >= 400) {
      console.warn('⚠️ Client Error:', JSON.stringify(logData, null, 2));
    } else {
      console.info('ℹ️ Info:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * 에러 응답 생성
   */
  static createErrorResponse(error) {
    const response = {
      success: false,
      error: {
        type: error.type,
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
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 커스텀 에러 생성자
   */
  static createError(message, statusCode = 500, type = 'CUSTOM_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.type = type;
    return error;
  }

  /**
   * 안전한 비동기 작업 실행
   * @param {Function} operation - 실행할 작업
   * @param {string} context - 작업 설명
   * @param {*} fallback - 실패 시 반환값
   * @returns {Promise<*>} 작업 결과 또는 fallback
   */
  static async safeExecute(operation, context = '작업', fallback = null) {
    try {
      return await operation();
    } catch (error) {
      ServerLogger.error(`${context} 실패`, error, 'SAFE_EXEC');
      return fallback;
    }
  }

  /**
   * 안전한 동기 작업 실행
   * @param {Function} operation - 실행할 작업
   * @param {string} context - 작업 설명
   * @param {*} fallback - 실패 시 반환값
   * @returns {*} 작업 결과 또는 fallback
   */
  static safeSyncExecute(operation, context = '작업', fallback = null) {
    try {
      return operation();
    } catch (error) {
      ServerLogger.error(`${context} 실패`, error, 'SAFE_EXEC');
      return fallback;
    }
  }

  /**
   * 안전한 API 응답 래퍼
   * @param {Function} operation - API 작업
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {string} context - 작업 설명
   */
  static async safeApiResponse(operation, req, res, context = 'API 작업') {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      
      const response = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      ServerLogger.performance(context, startTime, response.data, 'API');
      res.json(response);
      
    } catch (error) {
      const errorResponse = this.createErrorResponse(this.normalizeError(error));
      errorResponse.processingTime = Date.now() - startTime;
      
      this.logError(error, req);
      res.status(error.statusCode || 500).json(errorResponse);
    }
  }

  /**
   * 조건부 안전 실행
   * @param {Function} condition - 검증 조건
   * @param {Function} operation - 실행할 작업
   * @param {string} errorMessage - 조건 실패 시 에러 메시지
   * @param {*} fallback - 실패 시 반환값
   * @returns {*} 작업 결과 또는 fallback
   */
  static conditionalExecute(condition, operation, errorMessage = '조건 불만족', fallback = null) {
    try {
      if (!condition()) {
        ServerLogger.warn(errorMessage, null, 'CONDITION');
        return fallback;
      }
      return operation();
    } catch (error) {
      ServerLogger.error('조건부 실행 실패', error, 'CONDITION');
      return fallback;
    }
  }

  /**
   * 재시도 로직이 포함된 안전 실행
   * @param {Function} operation - 실행할 작업
   * @param {string} context - 작업 설명
   * @param {number} maxRetries - 최대 재시도 횟수
   * @param {number} baseDelay - 기본 지연 시간 (ms)
   * @returns {Promise<*>} 작업 결과 또는 null
   */
  static async safeExecuteWithRetry(operation, context = '작업', maxRetries = 3, baseDelay = 1000) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
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
   * @param {number} ms - 지연 시간 (밀리초)
   * @returns {Promise} 지연 Promise
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ErrorHandler;