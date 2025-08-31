/**
 * 시간 처리 관련 유틸리티 함수들
 */
export class TimeUtils {
  /**
   * 현재 타임스탬프 생성
   * @returns {string} ISO 형식 타임스탬프
   */
  static getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * 유닉스 타임스탬프 생성
   * @returns {number} 유닉스 타임스탬프
   */
  static getCurrentUnixTimestamp() {
    return Date.now();
  }

  /**
   * 날짜 포맷팅
   * @param {Date|string|number} date 날짜
   * @param {string} format 포맷 ('YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', 'relative')
   * @returns {string} 포맷된 날짜
   */
  static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    switch (format) {
      case 'YYYY-MM-DD':
        return d.toISOString().split('T')[0];
      
      case 'YYYY-MM-DD HH:mm:ss':
        return d.toISOString().replace('T', ' ').split('.')[0];
      
      case 'relative':
        return this.getRelativeTime(d);
      
      case 'korean':
        return d.toLocaleString('ko-KR');
      
      default:
        return d.toISOString();
    }
  }

  /**
   * 상대적 시간 계산 (예: "3분 전", "1시간 전")
   * @param {Date|string|number} date 날짜
   * @returns {string} 상대적 시간
   */
  static getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    
    if (diffMs < 0) return '미래';
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}년 전`;
    if (months > 0) return `${months}개월 전`;
    if (weeks > 0) return `${weeks}주 전`;
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    if (seconds > 10) return `${seconds}초 전`;
    return '방금 전';
  }

  /**
   * 시간 지연 (비동기)
   * @param {number} ms 지연 시간 (밀리초)
   * @returns {Promise} 지연 Promise
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 타임아웃과 함께 Promise 실행
   * @param {Promise} promise 실행할 Promise
   * @param {number} timeoutMs 타임아웃 시간 (밀리초)
   * @param {string} timeoutMessage 타임아웃 메시지
   * @returns {Promise} 타임아웃이 적용된 Promise
   */
  static withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      )
    ]);
  }

  /**
   * 특정 간격으로 함수 실행 (polling)
   * @param {Function} fn 실행할 함수
   * @param {number} intervalMs 간격 (밀리초)
   * @param {Function} stopCondition 중지 조건 함수
   * @param {number} maxAttempts 최대 시도 횟수
   * @returns {Promise} 결과 Promise
   */
  static async pollUntil(fn, intervalMs = 1000, stopCondition = null, maxAttempts = 10) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const result = await fn();
      
      if (stopCondition && stopCondition(result)) {
        return result;
      }
      
      if (!stopCondition && result) {
        return result;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await this.delay(intervalMs);
      }
    }
    
    throw new Error(`Polling failed after ${maxAttempts} attempts`);
  }

  /**
   * 디바운스 함수 생성
   * @param {Function} func 실행할 함수
   * @param {number} wait 대기 시간 (밀리초)
   * @param {boolean} immediate 즉시 실행 여부
   * @returns {Function} 디바운스된 함수
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(this, args);
    };
  }

  /**
   * 스로틀 함수 생성
   * @param {Function} func 실행할 함수
   * @param {number} limit 제한 시간 (밀리초)
   * @param {Object} options 옵션 { leading: true, trailing: true }
   * @returns {Function} 스로틀된 함수
   */
  static throttle(func, limit, options = { leading: true, trailing: true }) {
    let inThrottle;
    let lastFunc;
    let lastRan;
    
    return function executedFunction(...args) {
      if (!inThrottle) {
        if (options.leading) {
          func.apply(this, args);
        }
        lastRan = Date.now();
        inThrottle = true;
      } else {
        if (options.trailing) {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(() => {
            if (Date.now() - lastRan >= limit) {
              func.apply(this, args);
              lastRan = Date.now();
            }
          }, limit - (Date.now() - lastRan));
        }
      }
    };
  }

  /**
   * 성능 측정
   * @param {Function} fn 측정할 함수
   * @param {string} label 측정 라벨
   * @returns {Promise} 함수 실행 결과와 측정 시간
   */
  static async measurePerformance(fn, label = 'Operation') {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`⏱️ ${label} (Error): ${duration.toFixed(2)}ms`);
      throw error;
    }
  }

  /**
   * 비디오 시간 포맷팅 (초 → mm:ss 또는 hh:mm:ss)
   * @param {number} seconds 초
   * @returns {string} 포맷된 시간
   */
  static formatVideoTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}