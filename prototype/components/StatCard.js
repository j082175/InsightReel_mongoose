/**
 * StatCard - 동적 통계 카드 컴포넌트
 * 하드코딩된 통계 카드를 완전 동적으로 생성 및 관리
 */

class StatCard {
  constructor(config, container) {
    this.id = config.id;
    this.value = config.value || 0;
    this.label = config.label || '';
    this.icon = config.icon || '📊';
    this.color = config.color || 'primary';
    this.clickable = config.clickable || false;
    this.onClick = config.onclick || null;
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.animationEnabled = config.animationEnabled !== false;
    this.formatValue = config.formatValue || this.defaultFormatValue;
    
    // 상태 관리
    this.isLoading = false;
    this.lastValue = this.value;
    this.updateCount = 0;
    
    // 설정 검증
    this.validateConfig();
    
    // 초기 렌더링
    this.render();
    this.bindEvents();
    
    // 디버그 로그
    console.log('📊 StatCard 초기화 완료:', {
      id: this.id,
      label: this.label,
      value: this.value,
      clickable: this.clickable
    });
  }
  
  /**
   * 설정 검증
   */
  validateConfig() {
    if (!this.id) {
      throw new Error('StatCard: id가 필요합니다');
    }
    
    if (!this.label) {
      throw new Error('StatCard: label이 필요합니다');
    }
    
    // 색상 검증
    const validColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
    if (!validColors.includes(this.color)) {
      console.warn(`⚠️ StatCard: 지원하지 않는 색상 '${this.color}', 'primary'로 대체`);
      this.color = 'primary';
    }
  }
  
  /**
   * 기본 값 포맷팅
   */
  defaultFormatValue(value) {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toLocaleString();
    }
    return String(value);
  }
  
  /**
   * 카드 HTML 생성
   */
  generateHTML() {
    const formattedValue = this.formatValue(this.value);
    const clickableClass = this.clickable ? 'clickable' : '';
    const colorClass = `stat-card-${this.color}`;
    const loadingClass = this.isLoading ? 'loading' : '';
    
    return `
      <div 
        class="stat-card ${clickableClass} ${colorClass} ${loadingClass}" 
        data-stat-id="${this.id}"
        data-color="${this.color}"
        role="${this.clickable ? 'button' : 'status'}"
        tabindex="${this.clickable ? '0' : '-1'}"
        aria-label="${this.label}: ${formattedValue}"
        title="${this.clickable ? '클릭하여 상세보기' : this.label}"
      >
        ${this.isLoading ? '<div class="stat-loader"></div>' : ''}
        <div class="stat-icon" aria-hidden="true">${this.icon}</div>
        <div class="stat-number" data-value="${this.value}">${formattedValue}</div>
        <div class="stat-label">${this.label}</div>
        ${this.clickable ? '<div class="stat-click-hint" aria-hidden="true">클릭</div>' : ''}
      </div>
    `;
  }
  
  /**
   * 카드 렌더링
   */
  render() {
    if (!this.container) {
      console.warn('⚠️ StatCard: container가 없어서 렌더링을 건너뜁니다');
      return;
    }
    
    const html = this.generateHTML();
    
    if (this.container.tagName === 'DIV' && this.container.classList.contains('stats-bar')) {
      // stats-bar 컨테이너에 추가
      const existingCard = this.container.querySelector(`[data-stat-id="${this.id}"]`);
      if (existingCard) {
        existingCard.outerHTML = html;
      } else {
        this.container.insertAdjacentHTML('beforeend', html);
      }
    } else {
      // 개별 컨테이너에 렌더링
      this.container.innerHTML = html;
    }
    
    console.log('🎨 StatCard 렌더링 완료:', this.id);
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    if (!this.clickable) return;
    
    const cardElement = this.getCardElement();
    if (!cardElement) return;
    
    // 클릭 이벤트
    cardElement.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
    // 키보드 이벤트 (접근성)
    cardElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleClick();
      }
    });
    
    // 호버 효과 (터치 디바이스 고려)
    cardElement.addEventListener('mouseenter', () => {
      cardElement.classList.add('hover');
    });
    
    cardElement.addEventListener('mouseleave', () => {
      cardElement.classList.remove('hover');
    });
    
    console.log('🎯 StatCard 이벤트 바인딩 완료:', this.id);
  }
  
  /**
   * 카드 엘리먼트 가져오기
   */
  getCardElement() {
    if (!this.container) return null;
    
    if (this.container.classList.contains('stats-bar')) {
      return this.container.querySelector(`[data-stat-id="${this.id}"]`);
    } else {
      return this.container.querySelector('.stat-card');
    }
  }
  
  /**
   * 클릭 이벤트 처리
   */
  handleClick() {
    console.log('🖱️ StatCard 클릭:', this.id);
    
    // 시각적 피드백
    const cardElement = this.getCardElement();
    if (cardElement) {
      cardElement.classList.add('clicked');
      setTimeout(() => {
        cardElement.classList.remove('clicked');
      }, 200);
    }
    
    // onClick 콜백 실행
    if (typeof this.onClick === 'function') {
      try {
        this.onClick(this.id, this.value, this);
      } catch (error) {
        console.error('❌ StatCard onClick 에러:', error);
      }
    } else if (typeof this.onClick === 'string') {
      // 전역 함수명인 경우
      if (typeof window[this.onClick] === 'function') {
        window[this.onClick](this.id, this.value, this);
      } else {
        console.warn('⚠️ StatCard: 존재하지 않는 함수:', this.onClick);
      }
    }
    
    // 커스텀 이벤트 발생
    this.triggerEvent('statcard:click', {
      id: this.id,
      value: this.value,
      label: this.label
    });
  }
  
  /**
   * 값 업데이트 (애니메이션 포함)
   */
  updateValue(newValue, animated = this.animationEnabled) {
    const oldValue = this.value;
    this.lastValue = oldValue;
    this.value = newValue;
    this.updateCount++;
    
    console.log('🔄 StatCard 값 업데이트:', this.id, `${oldValue} → ${newValue}`);
    
    const cardElement = this.getCardElement();
    if (!cardElement) {
      this.render();
      return;
    }
    
    const numberElement = cardElement.querySelector('.stat-number');
    if (!numberElement) return;
    
    if (animated && typeof oldValue === 'number' && typeof newValue === 'number') {
      this.animateValueChange(numberElement, oldValue, newValue);
    } else {
      // 즉시 업데이트
      numberElement.textContent = this.formatValue(newValue);
      numberElement.setAttribute('data-value', newValue);
      cardElement.setAttribute('aria-label', `${this.label}: ${this.formatValue(newValue)}`);
    }
    
    // 변화 방향에 따른 시각적 피드백
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      if (newValue > oldValue) {
        this.showChangeIndicator('increase');
      } else if (newValue < oldValue) {
        this.showChangeIndicator('decrease');
      }
    }
    
    // 커스텀 이벤트 발생
    this.triggerEvent('statcard:update', {
      id: this.id,
      oldValue: oldValue,
      newValue: newValue,
      change: typeof oldValue === 'number' && typeof newValue === 'number' ? newValue - oldValue : null
    });
  }
  
  /**
   * 값 변화 애니메이션
   */
  animateValueChange(element, from, to) {
    const duration = 1000; // 1초
    const steps = 60; // 60 FPS
    const stepDuration = duration / steps;
    const stepValue = (to - from) / steps;
    
    let currentStep = 0;
    let currentValue = from;
    
    const animate = () => {
      currentStep++;
      currentValue += stepValue;
      
      if (currentStep >= steps) {
        currentValue = to;
        element.textContent = this.formatValue(to);
        element.setAttribute('data-value', to);
        return;
      }
      
      element.textContent = this.formatValue(Math.round(currentValue));
      element.setAttribute('data-value', Math.round(currentValue));
      
      setTimeout(animate, stepDuration);
    };
    
    animate();
  }
  
  /**
   * 변화 방향 표시
   */
  showChangeIndicator(direction) {
    const cardElement = this.getCardElement();
    if (!cardElement) return;
    
    // 기존 인디케이터 제거
    const existingIndicator = cardElement.querySelector('.change-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // 새 인디케이터 추가
    const indicator = document.createElement('div');
    indicator.className = `change-indicator ${direction}`;
    indicator.innerHTML = direction === 'increase' ? '↗️' : '↘️';
    indicator.setAttribute('aria-hidden', 'true');
    
    cardElement.appendChild(indicator);
    
    // 2초 후 제거
    setTimeout(() => {
      indicator.remove();
    }, 2000);
  }
  
  /**
   * 로딩 상태 설정
   */
  setLoading(loading = true) {
    this.isLoading = loading;
    
    const cardElement = this.getCardElement();
    if (cardElement) {
      if (loading) {
        cardElement.classList.add('loading');
        // 로더 추가
        if (!cardElement.querySelector('.stat-loader')) {
          const loader = document.createElement('div');
          loader.className = 'stat-loader';
          cardElement.insertBefore(loader, cardElement.firstChild);
        }
      } else {
        cardElement.classList.remove('loading');
        const loader = cardElement.querySelector('.stat-loader');
        if (loader) {
          loader.remove();
        }
      }
    }
    
    console.log('⏳ StatCard 로딩 상태:', this.id, loading);
  }
  
  /**
   * 라벨 업데이트
   */
  updateLabel(newLabel) {
    this.label = newLabel;
    
    const cardElement = this.getCardElement();
    if (cardElement) {
      const labelElement = cardElement.querySelector('.stat-label');
      if (labelElement) {
        labelElement.textContent = newLabel;
      }
      cardElement.setAttribute('aria-label', `${newLabel}: ${this.formatValue(this.value)}`);
    }
    
    console.log('🏷️ StatCard 라벨 업데이트:', this.id, newLabel);
  }
  
  /**
   * 아이콘 업데이트
   */
  updateIcon(newIcon) {
    this.icon = newIcon;
    
    const cardElement = this.getCardElement();
    if (cardElement) {
      const iconElement = cardElement.querySelector('.stat-icon');
      if (iconElement) {
        iconElement.textContent = newIcon;
      }
    }
    
    console.log('🎭 StatCard 아이콘 업데이트:', this.id, newIcon);
  }
  
  /**
   * 색상 변경
   */
  updateColor(newColor) {
    const cardElement = this.getCardElement();
    if (cardElement) {
      // 기존 색상 클래스 제거
      cardElement.classList.remove(`stat-card-${this.color}`);
      // 새 색상 클래스 추가
      cardElement.classList.add(`stat-card-${newColor}`);
      cardElement.setAttribute('data-color', newColor);
    }
    
    this.color = newColor;
    console.log('🎨 StatCard 색상 변경:', this.id, newColor);
  }
  
  /**
   * 클릭 가능 상태 변경
   */
  setClickable(clickable) {
    this.clickable = clickable;
    
    const cardElement = this.getCardElement();
    if (cardElement) {
      if (clickable) {
        cardElement.classList.add('clickable');
        cardElement.setAttribute('role', 'button');
        cardElement.setAttribute('tabindex', '0');
        cardElement.setAttribute('title', '클릭하여 상세보기');
        
        // 클릭 힌트 추가
        if (!cardElement.querySelector('.stat-click-hint')) {
          const hint = document.createElement('div');
          hint.className = 'stat-click-hint';
          hint.textContent = '클릭';
          hint.setAttribute('aria-hidden', 'true');
          cardElement.appendChild(hint);
        }
        
        this.bindEvents();
      } else {
        cardElement.classList.remove('clickable');
        cardElement.setAttribute('role', 'status');
        cardElement.setAttribute('tabindex', '-1');
        cardElement.setAttribute('title', this.label);
        
        // 클릭 힌트 제거
        const hint = cardElement.querySelector('.stat-click-hint');
        if (hint) {
          hint.remove();
        }
      }
    }
    
    console.log('👆 StatCard 클릭 가능 상태:', this.id, clickable);
  }
  
  /**
   * 커스텀 이벤트 발생
   */
  triggerEvent(eventType, detail) {
    if (this.container) {
      const event = new CustomEvent(eventType, {
        detail: detail,
        bubbles: true
      });
      this.container.dispatchEvent(event);
    }
  }
  
  /**
   * 현재 상태 가져오기
   */
  getState() {
    return {
      id: this.id,
      value: this.value,
      label: this.label,
      icon: this.icon,
      color: this.color,
      clickable: this.clickable,
      isLoading: this.isLoading,
      lastValue: this.lastValue,
      updateCount: this.updateCount
    };
  }
  
  /**
   * 컴포넌트 제거
   */
  destroy() {
    const cardElement = this.getCardElement();
    if (cardElement) {
      cardElement.remove();
    }
    
    console.log('🗑️ StatCard 제거 완료:', this.id);
  }
}

/**
 * StatCardManager - 여러 StatCard를 관리하는 매니저
 */
class StatCardManager {
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.cards = new Map();
    
    if (this.container) {
      this.container.classList.add('stats-bar');
    }
    
    console.log('📊 StatCardManager 초기화 완료');
  }
  
  /**
   * 카드 추가
   */
  addCard(config) {
    const card = new StatCard(config, this.container);
    this.cards.set(config.id, card);
    return card;
  }
  
  /**
   * 카드 가져오기
   */
  getCard(id) {
    return this.cards.get(id);
  }
  
  /**
   * 카드 제거
   */
  removeCard(id) {
    const card = this.cards.get(id);
    if (card) {
      card.destroy();
      this.cards.delete(id);
      return true;
    }
    return false;
  }
  
  /**
   * 모든 카드 값 업데이트
   */
  updateAll(values) {
    for (const [id, value] of Object.entries(values)) {
      const card = this.cards.get(id);
      if (card) {
        card.updateValue(value);
      }
    }
  }
  
  /**
   * 모든 카드 제거
   */
  clear() {
    this.cards.forEach(card => card.destroy());
    this.cards.clear();
  }
}

// 브라우저 환경에서 전역으로 사용 가능하게
if (typeof window !== 'undefined') {
  window.StatCard = StatCard;
  window.StatCardManager = StatCardManager;
}

// Node.js 환경에서 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StatCard, StatCardManager };
}

export { StatCard, StatCardManager };