/**
 * DOM 조작 관련 유틸리티 함수들
 */
export class DOMUtils {
  /**
   * 안전한 DOM 쿼리 선택자
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
   * 안전한 DOM 쿼리 선택자 (모든 요소)
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
   * 요소 생성 헬퍼
   * @param {string} tagName 태그명
   * @param {Object} attributes 속성들
   * @param {Object} styles 스타일들
   * @param {string} textContent 텍스트 내용
   * @returns {HTMLElement} 생성된 요소
   */
  static createElement(tagName, attributes = {}, styles = {}, textContent = '') {
    const element = document.createElement(tagName);
    
    // 속성 설정
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    // 스타일 설정
    Object.entries(styles).forEach(([key, value]) => {
      element.style[key] = value;
    });
    
    // 텍스트 내용 설정
    if (textContent) {
      element.textContent = textContent;
    }
    
    return element;
  }

  /**
   * 스타일 인젝션
   * @param {string} css CSS 문자열
   * @param {string} id 스타일 태그 ID
   */
  static injectStyles(css, id = 'video-saver-styles') {
    if (document.getElementById(id)) return;
    
    const style = this.createElement('style', { id }, {}, css);
    document.head.appendChild(style);
  }

  /**
   * 요소 안전 제거
   * @param {HTMLElement|string} element 요소 또는 선택자
   */
  static safeRemove(element) {
    try {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    } catch (error) {
      console.warn('Element remove failed:', error);
    }
  }

  /**
   * 클래스 리스트 안전 조작
   * @param {HTMLElement} element 요소
   * @param {string} action 액션 ('add', 'remove', 'toggle', 'contains')
   * @param {string} className 클래스명
   * @returns {boolean|undefined} contains의 경우 boolean 반환
   */
  static safeClassList(element, action, className) {
    if (!element || !element.classList) return;
    
    try {
      switch (action) {
        case 'add':
          element.classList.add(className);
          break;
        case 'remove':
          element.classList.remove(className);
          break;
        case 'toggle':
          element.classList.toggle(className);
          break;
        case 'contains':
          return element.classList.contains(className);
      }
    } catch (error) {
      console.warn(`ClassList ${action} failed:`, error);
    }
  }

  /**
   * 이벤트 리스너 안전 추가
   * @param {HTMLElement|Window|Document} target 타겟
   * @param {string} event 이벤트명
   * @param {Function} handler 핸들러
   * @param {Object|boolean} options 옵션
   */
  static safeAddEventListener(target, event, handler, options = false) {
    try {
      target.addEventListener(event, handler, options);
    } catch (error) {
      console.warn(`Event listener add failed:`, error);
    }
  }

  /**
   * 이벤트 리스너 안전 제거
   * @param {HTMLElement|Window|Document} target 타겟
   * @param {string} event 이벤트명
   * @param {Function} handler 핸들러
   */
  static safeRemoveEventListener(target, event, handler) {
    try {
      target.removeEventListener(event, handler);
    } catch (error) {
      console.warn(`Event listener remove failed:`, error);
    }
  }

  /**
   * 부모 요소 중에서 조건에 맞는 요소 찾기
   * @param {HTMLElement} element 시작 요소
   * @param {Function|string} condition 조건 함수 또는 선택자
   * @param {number} maxDepth 최대 탐색 깊이
   * @returns {HTMLElement|null} 찾은 요소 또는 null
   */
  static findParent(element, condition, maxDepth = 10) {
    let current = element;
    let depth = 0;
    
    while (current && current.parentElement && depth < maxDepth) {
      current = current.parentElement;
      depth++;
      
      if (typeof condition === 'function') {
        if (condition(current)) return current;
      } else if (typeof condition === 'string') {
        if (current.matches && current.matches(condition)) return current;
      }
    }
    
    return null;
  }
}