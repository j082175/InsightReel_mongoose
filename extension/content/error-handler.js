import { Utils } from './utils.js';

/**
 * Extension용 통합 에러 처리 시스템
 */
export class ErrorHandler {
  /**
   * 안전한 비동기 작업 실행
   * @param {Function} operation - 실행할 작업
   * @param {string} context - 작업 설명
   * @param {*} fallback - 실패 시 반환값
   * @param {string} logLevel - 로그 레벨 (error, warn, info)
   * @returns {Promise<*>} 작업 결과 또는 fallback
   */
  static async safeExecute(operation, context = '작업', fallback = null, logLevel = 'error') {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, context, logLevel);
      return fallback;
    }
  }

  /**
   * 안전한 동기 작업 실행
   * @param {Function} operation - 실행할 작업
   * @param {string} context - 작업 설명
   * @param {*} fallback - 실패 시 반환값
   * @param {string} logLevel - 로그 레벨
   * @returns {*} 작업 결과 또는 fallback
   */
  static safeSyncExecute(operation, context = '작업', fallback = null, logLevel = 'error') {
    try {
      return operation();
    } catch (error) {
      this.logError(error, context, logLevel);
      return fallback;
    }
  }

  /**
   * DOM 작업 안전 실행
   * @param {Function} operation - DOM 작업
   * @param {string} context - 작업 설명
   * @param {*} fallback - 실패 시 반환값
   * @returns {*} 작업 결과 또는 fallback
   */
  static safeDOMOperation(operation, context = 'DOM 작업', fallback = null) {
    return this.safeSyncExecute(() => {
      if (document.readyState === 'loading') {
        Utils.log('warn', `${context}: 문서가 아직 로딩 중`);
        return fallback;
      }
      return operation();
    }, context, fallback, 'warn');
  }

  /**
   * API 호출 안전 실행
   * @param {Function} apiCall - API 호출 함수
   * @param {string} endpoint - API 엔드포인트
   * @param {number} retries - 재시도 횟수
   * @returns {Promise<*>} API 응답 또는 null
   */
  static async safeApiCall(apiCall, endpoint = 'API', retries = 0) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // 지수 백오프
          Utils.log('warn', `${endpoint} 재시도 ${attempt + 1}/${retries + 1} (${delay}ms 후)`);
          await this.delay(delay);
        }
      }
    }
    
    this.logError(lastError, `${endpoint} 호출`, 'error');
    return null;
  }

  /**
   * 조건부 에러 처리
   * @param {Function} condition - 검증 조건
   * @param {Function} operation - 실행할 작업
   * @param {string} errorMessage - 조건 실패 시 에러 메시지
   * @param {*} fallback - 실패 시 반환값
   * @returns {*} 작업 결과 또는 fallback
   */
  static conditionalExecute(condition, operation, errorMessage = '조건 불만족', fallback = null) {
    try {
      if (!condition()) {
        Utils.log('warn', errorMessage);
        return fallback;
      }
      return operation();
    } catch (error) {
      this.logError(error, '조건부 실행', 'error');
      return fallback;
    }
  }

  /**
   * 에러 로깅 (상세 정보 포함)
   * @param {Error} error - 에러 객체
   * @param {string} context - 발생 맥락
   * @param {string} level - 로그 레벨
   */
  static logError(error, context = '알 수 없음', level = 'error') {
    const errorInfo = {
      message: error?.message || '알 수 없는 에러',
      stack: error?.stack?.split('\n')?.slice(0, 3)?.join('\n') || '스택 없음',
      type: error?.constructor?.name || 'Error',
      context,
      timestamp: new Date().toISOString(),
      url: window.location?.href || '알 수 없음'
    };

    Utils.log(level, `${context} 실패: ${errorInfo.message}`, errorInfo);
    
    // 심각한 에러인 경우 추가 처리
    if (level === 'error' && this.isCriticalError(error)) {
      this.handleCriticalError(error, context);
    }
  }

  /**
   * 치명적 에러 판단
   * @param {Error} error - 에러 객체
   * @returns {boolean} 치명적 에러 여부
   */
  static isCriticalError(error) {
    const criticalKeywords = [
      'NetworkError',
      'SecurityError', 
      'QuotaExceededError',
      'DOMException'
    ];
    
    return criticalKeywords.some(keyword => 
      error?.message?.includes(keyword) || 
      error?.name?.includes(keyword)
    );
  }

  /**
   * 치명적 에러 처리
   * @param {Error} error - 에러 객체
   * @param {string} context - 발생 맥락
   */
  static handleCriticalError(error, context) {
    Utils.log('error', `🚨 치명적 에러 발생 [${context}]`, {
      error: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (밀리초)
   * @returns {Promise} 지연 Promise
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 에러 경계 래퍼 (React Error Boundary 스타일)
   * @param {Function} component - 래핑할 함수
   * @param {Function} fallback - 에러 시 대체 함수
   * @param {string} name - 컴포넌트 이름
   * @returns {Function} 래핑된 함수
   */
  static withErrorBoundary(component, fallback = () => null, name = 'Component') {
    return (...args) => {
      return this.safeExecute(
        () => component(...args),
        `${name} 실행`,
        fallback(...args)
      );
    };
  }
}