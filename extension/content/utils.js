// 유틸리티 함수들
export class Utils {
  /**
   * 플랫폼 감지
   * @returns {string|null} 플랫폼 이름 또는 null
   */
  static detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    return null;
  }

  /**
   * 디바운스 함수
   * @param {Function} func 실행할 함수
   * @param {number} wait 대기 시간 (ms)
   * @returns {Function} 디바운스된 함수
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 쓰로틀 함수
   * @param {Function} func 실행할 함수
   * @param {number} limit 제한 시간 (ms)
   * @returns {Function} 쓰로틀된 함수
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 요소가 뷰포트에 보이는지 확인
   * @param {HTMLElement} element 확인할 요소
   * @returns {boolean} 보이면 true
   */
  static isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top >= 0 && rect.top < window.innerHeight;
  }

  /**
   * URL에서 해시태그 추출
   * @param {string} text 텍스트
   * @returns {Array<string>} 해시태그 배열
   */
  static extractHashtags(text) {
    if (!text) return [];
    return text.match(/#[\w가-힣]+/g) || [];
  }

  /**
   * 안전한 DOM 쿼리 선택
   * @param {HTMLElement|Document} parent 부모 요소
   * @param {string} selector 선택자
   * @returns {HTMLElement|null} 찾은 요소 또는 null
   */
  static safeQuerySelector(parent, selector) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.warn('Query selector failed:', selector, error);
      return null;
    }
  }

  /**
   * 안전한 DOM 쿼리 선택 (모든 요소)
   * @param {HTMLElement|Document} parent 부모 요소
   * @param {string} selector 선택자
   * @returns {NodeList} 찾은 요소들
   */
  static safeQuerySelectorAll(parent, selector) {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.warn('Query selector all failed:', selector, error);
      return [];
    }
  }

  /**
   * 로그 출력 (개발 환경에서만)
   * @param {string} level 로그 레벨
   * @param {string} message 메시지
   * @param {any} data 추가 데이터
   */
  static log(level, message, data = null) {
    if (process.env.NODE_ENV === 'production') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[VideoSaver ${timestamp}]`;
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ℹ️ ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data || '');
        break;
      case 'success':
        console.log(`${prefix} ✅ ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} ${message}`, data || '');
    }
  }

  /**
   * 비동기 지연 실행
   * @param {number} ms 지연 시간 (ms)
   * @returns {Promise} 지연 Promise
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 파일 크기를 사람이 읽기 좋은 형태로 변환
   * @param {number} bytes 바이트 수
   * @returns {string} 변환된 문자열
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}