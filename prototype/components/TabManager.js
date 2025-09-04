/**
 * TabManager - 동적 탭 관리 컴포넌트
 * 하드코딩된 HTML 구조를 완전히 제거하고 동적 생성
 */

class TabManager {
  constructor(config, container) {
    this.tabs = config.tabs || [];
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.activeTabId = this.getDefaultActiveTab();
    this.onTabChangeCallbacks = [];
    
    // 설정 검증
    this.validateConfig();
    
    // 초기 렌더링
    this.render();
    this.bindEvents();
    
    // 디버그 로그
    console.log('📑 TabManager 초기화 완료:', {
      총탭수: this.tabs.length,
      활성탭: this.activeTabId,
      컨테이너: this.container
    });
  }
  
  /**
   * 설정 검증
   */
  validateConfig() {
    if (!this.container) {
      throw new Error('TabManager: container가 필요합니다');
    }
    
    if (!Array.isArray(this.tabs) || this.tabs.length === 0) {
      throw new Error('TabManager: 최소 하나의 탭이 필요합니다');
    }
    
    // 필수 속성 확인
    this.tabs.forEach((tab, index) => {
      if (!tab.id) {
        throw new Error(`TabManager: 탭 ${index}에 id가 필요합니다`);
      }
      if (!tab.label) {
        throw new Error(`TabManager: 탭 ${tab.id}에 label이 필요합니다`);
      }
    });
    
    // 중복 ID 확인
    const ids = this.tabs.map(tab => tab.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      throw new Error(`TabManager: 중복된 탭 ID가 있습니다: ${duplicates.join(', ')}`);
    }
  }
  
  /**
   * 기본 활성 탭 찾기
   */
  getDefaultActiveTab() {
    const defaultTab = this.tabs.find(tab => tab.defaultActive);
    return defaultTab ? defaultTab.id : this.tabs[0].id;
  }
  
  /**
   * 탭 UI 렌더링
   */
  render() {
    if (!this.container) return;
    
    const tabsHtml = this.tabs.map(tab => {
      const isActive = tab.id === this.activeTabId;
      const icon = tab.icon || '📄';
      const description = tab.description || tab.label;
      
      return `
        <button 
          class="tab ${isActive ? 'active' : ''}" 
          data-tab-id="${tab.id}"
          title="${description}"
          aria-label="${tab.label}"
          role="tab"
          aria-selected="${isActive}"
          tabindex="${isActive ? 0 : -1}"
        >
          <span class="tab-icon" aria-hidden="true">${icon}</span>
          <span class="tab-label">${tab.label}</span>
        </button>
      `;
    }).join('');
    
    // ARIA 속성 추가
    this.container.innerHTML = tabsHtml;
    this.container.setAttribute('role', 'tablist');
    this.container.setAttribute('aria-label', '대시보드 탭');
    
    // CSS 클래스 추가 (기존 스타일과의 호환성)
    this.container.classList.add('nav-tabs');
    
    console.log('🎨 TabManager 렌더링 완료:', this.tabs.length, '개 탭');
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    if (!this.container) return;
    
    // 클릭 이벤트 (이벤트 위임 사용)
    this.container.addEventListener('click', (e) => {
      const tabButton = e.target.closest('[data-tab-id]');
      if (tabButton) {
        const tabId = tabButton.getAttribute('data-tab-id');
        this.switchTab(tabId);
      }
    });
    
    // 키보드 네비게이션 (접근성)
    this.container.addEventListener('keydown', (e) => {
      const currentTab = e.target.closest('[data-tab-id]');
      if (!currentTab) return;
      
      const currentIndex = Array.from(this.container.children).indexOf(currentTab);
      let nextIndex = currentIndex;
      
      switch (e.key) {
        case 'ArrowLeft':
          nextIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
          break;
        case 'ArrowRight':
          nextIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = this.tabs.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          const tabId = currentTab.getAttribute('data-tab-id');
          this.switchTab(tabId);
          return;
        default:
          return;
      }
      
      e.preventDefault();
      const nextTab = this.container.children[nextIndex];
      if (nextTab) {
        nextTab.focus();
      }
    });
    
    console.log('🎯 TabManager 이벤트 바인딩 완료');
  }
  
  /**
   * 탭 전환
   */
  switchTab(tabId) {
    // 탭 존재 확인
    const tab = this.getTab(tabId);
    if (!tab) {
      console.warn('⚠️ TabManager: 존재하지 않는 탭 ID:', tabId);
      return false;
    }
    
    // 이미 활성 탭인 경우
    if (this.activeTabId === tabId) {
      console.log('🔄 TabManager: 이미 활성화된 탭:', tabId);
      return false;
    }
    
    // 이전 활성 탭 상태 업데이트
    const prevActiveTab = this.container.querySelector('.tab.active');
    if (prevActiveTab) {
      prevActiveTab.classList.remove('active');
      prevActiveTab.setAttribute('aria-selected', 'false');
      prevActiveTab.setAttribute('tabindex', '-1');
    }
    
    // 새 활성 탭 상태 업데이트
    const newActiveTab = this.container.querySelector(`[data-tab-id="${tabId}"]`);
    if (newActiveTab) {
      newActiveTab.classList.add('active');
      newActiveTab.setAttribute('aria-selected', 'true');
      newActiveTab.setAttribute('tabindex', '0');
    }
    
    // 활성 탭 ID 업데이트
    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    
    // 콜백 실행
    this.triggerTabChange(tabId, previousTabId);
    
    console.log('✅ TabManager 탭 전환:', `${previousTabId} → ${tabId}`);
    return true;
  }
  
  /**
   * 탭 정보 가져오기
   */
  getTab(tabId) {
    return this.tabs.find(tab => tab.id === tabId);
  }
  
  /**
   * 활성 탭 정보 가져오기
   */
  getActiveTab() {
    return this.getTab(this.activeTabId);
  }
  
  /**
   * 탭 추가
   */
  addTab(tab, position = -1) {
    // 탭 검증
    if (!tab.id || !tab.label) {
      throw new Error('TabManager: 탭에는 id와 label이 필요합니다');
    }
    
    // 중복 ID 확인
    if (this.getTab(tab.id)) {
      throw new Error(`TabManager: 이미 존재하는 탭 ID입니다: ${tab.id}`);
    }
    
    // 탭 추가
    if (position === -1) {
      this.tabs.push(tab);
    } else {
      this.tabs.splice(position, 0, tab);
    }
    
    // 재렌더링
    this.render();
    this.bindEvents();
    
    console.log('➕ TabManager 탭 추가:', tab.id, '현재 총', this.tabs.length, '개');
    return true;
  }
  
  /**
   * 탭 제거
   */
  removeTab(tabId) {
    const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
    
    if (tabIndex === -1) {
      console.warn('⚠️ TabManager: 제거할 탭이 없습니다:', tabId);
      return false;
    }
    
    // 마지막 탭은 제거할 수 없음
    if (this.tabs.length <= 1) {
      throw new Error('TabManager: 마지막 탭은 제거할 수 없습니다');
    }
    
    // 활성 탭을 제거하는 경우 다른 탭을 활성화
    if (this.activeTabId === tabId) {
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : tabIndex + 1;
      const newActiveTabId = this.tabs[newActiveIndex].id;
      this.activeTabId = newActiveTabId;
    }
    
    // 탭 제거
    this.tabs.splice(tabIndex, 1);
    
    // 재렌더링
    this.render();
    this.bindEvents();
    
    console.log('➖ TabManager 탭 제거:', tabId, '현재 총', this.tabs.length, '개');
    return true;
  }
  
  /**
   * 탭 업데이트
   */
  updateTab(tabId, updates) {
    const tab = this.getTab(tabId);
    if (!tab) {
      console.warn('⚠️ TabManager: 업데이트할 탭이 없습니다:', tabId);
      return false;
    }
    
    // 탭 정보 업데이트
    Object.assign(tab, updates);
    
    // ID 변경 시 활성 탭 ID도 업데이트
    if (updates.id && this.activeTabId === tabId) {
      this.activeTabId = updates.id;
    }
    
    // 재렌더링
    this.render();
    this.bindEvents();
    
    console.log('🔄 TabManager 탭 업데이트:', tabId, updates);
    return true;
  }
  
  /**
   * 탭 변경 이벤트 리스너 등록
   */
  onTabChange(callback) {
    if (typeof callback === 'function') {
      this.onTabChangeCallbacks.push(callback);
    }
  }
  
  /**
   * 탭 변경 이벤트 리스너 제거
   */
  offTabChange(callback) {
    const index = this.onTabChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.onTabChangeCallbacks.splice(index, 1);
    }
  }
  
  /**
   * 탭 변경 이벤트 트리거
   */
  triggerTabChange(newTabId, previousTabId) {
    const tab = this.getTab(newTabId);
    const eventData = {
      tabId: newTabId,
      tab: tab,
      previousTabId: previousTabId,
      timestamp: Date.now()
    };
    
    this.onTabChangeCallbacks.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error('❌ TabManager 콜백 에러:', error);
      }
    });
  }
  
  /**
   * 탭 개수 가져오기
   */
  getTabCount() {
    return this.tabs.length;
  }
  
  /**
   * 모든 탭 ID 가져오기
   */
  getTabIds() {
    return this.tabs.map(tab => tab.id);
  }
  
  /**
   * 탭 순서 변경
   */
  reorderTab(tabId, newPosition) {
    const currentIndex = this.tabs.findIndex(tab => tab.id === tabId);
    if (currentIndex === -1) {
      console.warn('⚠️ TabManager: 존재하지 않는 탭 ID:', tabId);
      return false;
    }
    
    // 범위 검사
    if (newPosition < 0 || newPosition >= this.tabs.length) {
      console.warn('⚠️ TabManager: 잘못된 위치:', newPosition);
      return false;
    }
    
    // 탭 이동
    const [tab] = this.tabs.splice(currentIndex, 1);
    this.tabs.splice(newPosition, 0, tab);
    
    // 재렌더링
    this.render();
    this.bindEvents();
    
    console.log('🔄 TabManager 탭 순서 변경:', tabId, `${currentIndex} → ${newPosition}`);
    return true;
  }
  
  /**
   * 컴포넌트 제거
   */
  destroy() {
    // 이벤트 리스너 제거
    this.onTabChangeCallbacks = [];
    
    // DOM 정리
    if (this.container) {
      this.container.innerHTML = '';
      this.container.removeAttribute('role');
      this.container.removeAttribute('aria-label');
      this.container.classList.remove('nav-tabs');
    }
    
    console.log('🗑️ TabManager 제거 완료');
  }
}

// 브라우저 환경에서 전역으로 사용 가능하게
if (typeof window !== 'undefined') {
  window.TabManager = TabManager;
}

// Node.js 환경에서 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TabManager;
}

export default TabManager;