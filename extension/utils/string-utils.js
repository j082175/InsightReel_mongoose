/**
 * 문자열 처리 관련 유틸리티 함수들
 */
export class StringUtils {
  /**
   * 해시태그 추출
   * @param {string} text 텍스트
   * @returns {Array<string>} 해시태그 배열
   */
  static extractHashtags(text) {
    if (!text) return [];
    return text.match(/#[\w가-힣]+/g) || [];
  }

  /**
   * 멘션 추출
   * @param {string} text 텍스트
   * @returns {Array<string>} 멘션 배열
   */
  static extractMentions(text) {
    if (!text) return [];
    return text.match(/@[\w가-힣]+/g) || [];
  }

  /**
   * URL 추출
   * @param {string} text 텍스트
   * @returns {Array<string>} URL 배열
   */
  static extractUrls(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * 텍스트 정제 (HTML 태그 제거, 공백 정리)
   * @param {string} text 텍스트
   * @param {Object} options 옵션
   * @returns {string} 정제된 텍스트
   */
  static sanitizeText(text, options = {}) {
    if (!text) return '';
    
    const {
      removeHtml = true,
      removeExtraSpaces = true,
      trimWhitespace = true,
      removeSpecialChars = false
    } = options;
    
    let result = text;
    
    // HTML 태그 제거
    if (removeHtml) {
      result = result.replace(/<[^>]*>/g, '');
    }
    
    // HTML 엔티티 디코딩
    result = result
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // 특수 문자 제거
    if (removeSpecialChars) {
      result = result.replace(/[^\w\s가-힣]/g, '');
    }
    
    // 여러 공백을 하나로
    if (removeExtraSpaces) {
      result = result.replace(/\s+/g, ' ');
    }
    
    // 앞뒤 공백 제거
    if (trimWhitespace) {
      result = result.trim();
    }
    
    return result;
  }

  /**
   * 파일명 안전화 (파일명으로 사용할 수 없는 문자 제거/변경)
   * @param {string} filename 파일명
   * @param {string} replacement 대체 문자
   * @returns {string} 안전한 파일명
   */
  static sanitizeFilename(filename, replacement = '_') {
    if (!filename) return '';
    
    // Windows/Linux/Mac에서 사용할 수 없는 문자들
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
    
    return filename
      .replace(invalidChars, replacement)
      .replace(/\s+/g, replacement) // 공백을 _로 변경
      .substring(0, 255); // 파일명 길이 제한
  }

  /**
   * 텍스트 줄임 (ellipsis)
   * @param {string} text 텍스트
   * @param {number} maxLength 최대 길이
   * @param {string} ellipsis 줄임표
   * @returns {string} 줄임 처리된 텍스트
   */
  static truncate(text, maxLength = 100, ellipsis = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
  }

  /**
   * 단어 단위로 텍스트 줄임
   * @param {string} text 텍스트
   * @param {number} maxLength 최대 길이
   * @param {string} ellipsis 줄임표
   * @returns {string} 줄임 처리된 텍스트
   */
  static truncateWords(text, maxLength = 100, ellipsis = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength - ellipsis.length);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + ellipsis;
    }
    
    return truncated + ellipsis;
  }

  /**
   * 카멜케이스 변환
   * @param {string} str 문자열
   * @returns {string} 카멜케이스 문자열
   */
  static toCamelCase(str) {
    if (!str) return '';
    
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  /**
   * 케밥케이스 변환
   * @param {string} str 문자열
   * @returns {string} 케밥케이스 문자열
   */
  static toKebabCase(str) {
    if (!str) return '';
    
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  /**
   * 스네이크케이스 변환
   * @param {string} str 문자열
   * @returns {string} 스네이크케이스 문자열
   */
  static toSnakeCase(str) {
    if (!str) return '';
    
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * 첫 글자 대문자로
   * @param {string} str 문자열
   * @returns {string} 첫 글자가 대문자인 문자열
   */
  static capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * 각 단어의 첫 글자를 대문자로 (Title Case)
   * @param {string} str 문자열
   * @returns {string} 타이틀 케이스 문자열
   */
  static toTitleCase(str) {
    if (!str) return '';
    
    return str
      .toLowerCase()
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  /**
   * 숫자 포맷팅 (천 단위 콤마)
   * @param {number|string} num 숫자
   * @param {string} locale 로케일
   * @returns {string} 포맷된 숫자
   */
  static formatNumber(num, locale = 'ko-KR') {
    if (num === null || num === undefined) return '0';
    
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) return '0';
    
    return number.toLocaleString(locale);
  }

  /**
   * 인스타그램 숫자 표기 파싱 (예: "1.2만" → 12000)
   * @param {string} str 숫자 문자열
   * @returns {number} 파싱된 숫자
   */
  static parseInstagramNumber(str) {
    if (!str) return 0;
    
    const cleanStr = str.replace(/[,\s]/g, '');
    
    // "만" 단위 처리
    if (cleanStr.includes('만')) {
      const num = parseFloat(cleanStr.replace('만', ''));
      return isNaN(num) ? 0 : num * 10000;
    }
    
    // "천", "K" 단위 처리
    if (cleanStr.includes('천') || cleanStr.includes('K')) {
      const num = parseFloat(cleanStr.replace(/[천K]/g, ''));
      return isNaN(num) ? 0 : num * 1000;
    }
    
    // "M" (백만) 단위 처리
    if (cleanStr.includes('M')) {
      const num = parseFloat(cleanStr.replace('M', ''));
      return isNaN(num) ? 0 : num * 1000000;
    }
    
    // 일반 숫자
    const num = parseInt(cleanStr.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  /**
   * 문자열을 Base64로 인코딩
   * @param {string} str 문자열
   * @returns {string} Base64 인코딩된 문자열
   */
  static toBase64(str) {
    if (!str) return '';
    
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.warn('Base64 encoding failed:', error);
      return '';
    }
  }

  /**
   * Base64 문자열을 디코딩
   * @param {string} base64Str Base64 문자열
   * @returns {string} 디코딩된 문자열
   */
  static fromBase64(base64Str) {
    if (!base64Str) return '';
    
    try {
      return decodeURIComponent(escape(atob(base64Str)));
    } catch (error) {
      console.warn('Base64 decoding failed:', error);
      return '';
    }
  }

  /**
   * 고유 ID 생성
   * @param {string} prefix 접두사
   * @param {number} length ID 길이
   * @returns {string} 고유 ID
   */
  static generateUniqueId(prefix = 'id', length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `${prefix}_${result}_${Date.now()}`;
  }

  /**
   * 문자열이 비어있는지 확인 (null, undefined, 공백 문자열 포함)
   * @param {any} value 값
   * @returns {boolean} 비어있으면 true
   */
  static isEmpty(value) {
    return value == null || (typeof value === 'string' && value.trim() === '');
  }

  /**
   * 문자열이 비어있지 않은지 확인
   * @param {any} value 값
   * @returns {boolean} 비어있지 않으면 true
   */
  static isNotEmpty(value) {
    return !this.isEmpty(value);
  }
}