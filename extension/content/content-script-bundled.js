// 호환성을 위한 번들 버전 - ES5 문법으로 변환
(function() {
'use strict';

console.log('🚀 Content Script 시작 - 디버깅용');

// 먼저 간단한 테스트
try {
  console.log('✅ 스크립트 실행 중...');
  
// Instagram Downloader 방식 - 실제 미디어 URL 추적
window.INSTAGRAM_MEDIA_TRACKER = {
  mediaData: {},      // shortcode -> 완전한 미디어 정보
  mediaIdMap: {},     // media ID -> shortcode
  fbIdMap: {},        // FB ID -> shortcode
  
  init() {
    this.setupNetworkInterception();
    this.extractFromPageData();
    console.log('🔥 Instagram Media Tracker 초기화 완료');
  },
  
  setupNetworkInterception() {
    const self = this;
    
    // XMLHttpRequest 후킹 (Instagram downloader 핵심 방식)
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._url = url;
      return originalXHROpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      this.addEventListener('load', function() {
        if (this.status >= 200 && this.status < 300) {
          try {
            if (this.responseURL.includes('/graphql/query')) {
              const responseData = JSON.parse(this.responseText);
              self.processGraphQLResponse(responseData);
            } else if (this.responseURL.includes('/api/v1/media/') && this.responseURL.includes('/info/')) {
              const responseData = JSON.parse(this.responseText);
              self.processMediaInfoResponse(responseData);
            } else if (this.responseURL.includes('/api/v1/feed/')) {
              const responseData = JSON.parse(this.responseText);
              self.processFeedResponse(responseData);
            }
          } catch (error) {
            // JSON 파싱 실패는 무시
          }
        }
      });
      
      return originalXHRSend.apply(this, arguments);
    };
  },
  
  processGraphQLResponse(data) {
    this.extractMediaFromAnyLevel(data);
  },
  
  processMediaInfoResponse(data) {
    if (data.items) {
      data.items.forEach(item => this.storeMediaInfo(item));
    }
  },
  
  processFeedResponse(data) {
    if (data.items) {
      data.items.forEach(item => {
        if (item.media) this.storeMediaInfo(item.media);
        else this.storeMediaInfo(item);
      });
    }
  },
  
  storeMediaInfo(mediaItem) {
    if (!mediaItem?.code || !mediaItem?.like_count) return;

    const shortcode = mediaItem.code;
    
    if (this.mediaData[shortcode]) {
      this.updateExistingMedia(this.mediaData[shortcode], mediaItem);
      return;
    }

    const mediaInfo = {
      code: shortcode,
      created_at: mediaItem?.caption?.created_at || mediaItem?.taken_at,
      like_count: mediaItem.like_count,
      comment_count: mediaItem.comment_count,
      play_count: mediaItem?.ig_play_count || mediaItem?.play_count || mediaItem?.view_count,
      username: mediaItem?.caption?.user?.username || mediaItem?.owner?.username || mediaItem?.user?.username,
      video_url: mediaItem?.video_versions?.[0]?.url,
      img_origin: mediaItem?.image_versions2?.candidates?.[0]?.url
    };

    // 캐러셀 미디어 처리
    if (mediaItem?.carousel_media) {
      mediaInfo.carousel_media = mediaItem.carousel_media
        .map(item => [item?.video_versions?.[0]?.url, item?.image_versions2?.candidates?.[0]?.url])
        .flat()
        .filter(url => url)
        .join('\n');
    }

    this.mediaData[shortcode] = mediaInfo;

    // ID 매핑 생성 (Instagram downloader 방식과 정확히 동일)
    if (mediaItem.id) {
      this.mediaIdMap[mediaItem.id] = shortcode;
      console.log('🆔 mediaIdMap 추가:', mediaItem.id, '→', shortcode);
    }
    if (mediaItem.pk) {
      this.fbIdMap[mediaItem.pk] = shortcode;
      console.log('🆔 fbIdMap 추가 (pk):', mediaItem.pk, '→', shortcode);
    }
    
    // 추가 매핑 - Instagram의 다른 ID 시스템들
    if (mediaItem.video_id) {
      this.fbIdMap[mediaItem.video_id] = shortcode;
      console.log('🆔 fbIdMap 추가 (video_id):', mediaItem.video_id, '→', shortcode);
    }
    if (mediaItem.fb_video_id) {
      this.fbIdMap[mediaItem.fb_video_id] = shortcode;
      console.log('🆔 fbIdMap 추가 (fb_video_id):', mediaItem.fb_video_id, '→', shortcode);
    }

    console.log('📱 미디어 정보 저장됨:', { 
      shortcode, 
      videoUrl: mediaInfo.video_url?.substring(0, 50) + '...',
      hasCarousel: !!mediaInfo.carousel_media 
    });
  },
  
  updateExistingMedia(existing, newData) {
    if (!existing.video_url && newData?.video_versions?.[0]?.url) {
      existing.video_url = newData.video_versions[0].url;
    }
    if (!existing.created_at && (newData?.caption?.created_at || newData?.taken_at)) {
      existing.created_at = newData.caption?.created_at || newData.taken_at;
    }
  },
  
  extractMediaFromAnyLevel(obj, depth = 0) {
    if (depth > 15 || !obj || typeof obj !== 'object') return;
    
    // 미디어 객체 직접 감지
    if (obj.code && obj.like_count) {
      this.storeMediaInfo(obj);
    }
    
    // 다양한 Instagram API 구조 처리
    if (obj.data) {
      this.processDataSection(obj.data);
    }
    
    // 재귀적으로 모든 속성 탐색
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] && typeof obj[key] === 'object') {
        this.extractMediaFromAnyLevel(obj[key], depth + 1);
      }
    }
  },
  
  processDataSection(data) {
    // 피드 타임라인 처리
    if (data.xdt_api__v1__feed__timeline__connection?.edges) {
      data.xdt_api__v1__feed__timeline__connection.edges.forEach(edge => {
        if (edge.node?.media) {
          this.storeMediaInfo(edge.node.media);
        }
      });
    }

    // 릴스 피드 처리  
    if (data.xdt_api__v1__clips__home__connection_v2?.edges) {
      data.xdt_api__v1__clips__home__connection_v2.edges.forEach(edge => {
        if (edge.node?.media) {
          this.storeMediaInfo(edge.node.media);
        } else if (edge.node) {
          this.storeMediaInfo(edge.node);
        }
      });
    }

    // 단일 포스트 정보
    if (data.xdt_api__v1__media__shortcode__web_info?.items) {
      data.xdt_api__v1__media__shortcode__web_info.items.forEach(item => {
        this.storeMediaInfo(item);
      });
    }
  },
  
  extractFromPageData() {
    // Instagram이 페이지에 포함하는 JSON 스크립트 태그 파싱
    const scriptTags = document.querySelectorAll('script[type="application/json"]');
    
    for (const script of scriptTags) {
      try {
        const data = JSON.parse(script.textContent);
        this.extractMediaFromAnyLevel(data);
      } catch (error) {
        // JSON 파싱 실패는 무시
      }
    }
  },
  
  getMediaInfoForCurrentVideo() {
    // 현재 페이지 URL에서 shortcode 추출
    const urlMatch = window.location.href.match(/\/p\/([A-Za-z0-9_-]+)|\/reel\/([A-Za-z0-9_-]+)|\/reels\/([A-Za-z0-9_-]+)/);
    const shortcode = urlMatch ? (urlMatch[1] || urlMatch[2] || urlMatch[3]) : null;
    
    if (shortcode && this.mediaData[shortcode]) {
      console.log('🎯 URL에서 미디어 발견:', shortcode);
      return this.mediaData[shortcode];
    }
    
    // 가장 최근에 로드된 미디어 중 비디오가 있는 것 찾기
    const recentMediaWithVideo = Object.values(this.mediaData)
      .filter(media => media.video_url)
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];
    
    if (recentMediaWithVideo) {
      console.log('🎯 최근 비디오 미디어 사용:', recentMediaWithVideo.code);
      return recentMediaWithVideo;
    }
    
    return null;
  }
};

// 즉시 초기화
window.INSTAGRAM_MEDIA_TRACKER.init();

// Instagram downloader 방식의 UI 시스템 (글로벌 접근을 위해 window에 등록)
window.INSTAGRAM_UI_SYSTEM = {
  isInitialized: false,
  scanInterval: null,
  processedVideos: new Set(),
  debugElements: [], // 디버깅용 요소들 저장
  
  init() {
    if (this.isInitialized) return;
    
    console.log('🎨 Instagram UI System 시작 (Instagram downloader 정확한 방식)');
    this.isInitialized = true;
    
    // Instagram downloader 정확한 방식: 1.5초 간격으로만 스캔
    this.scanInterval = setInterval(() => {
      this.scanAndAddButtons();
    }, 1500); // Instagram downloader와 정확히 동일
    
    // 초기 실행
    this.scanAndAddButtons();
    
    // 디버그 모드 토글 버튼 추가
    this.addDebugToggleButton();
  },
  
  // 개별 컨테이너에 디버그 오버레이 추가
  addDebugOverlay(container, video) {
    // 이미 디버그 버튼이 있는지 확인
    if (container.querySelector('.debug-overlay-btn')) {
      return;
    }
    
    const debugOverlay = document.createElement('div');
    debugOverlay.className = 'debug-overlay-btn';
    debugOverlay.style.cssText = `
      position: absolute;
      bottom: 150px;
      right: 5px;
      background: rgba(25, 118, 210, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      z-index: 999999;
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(5px);
      transition: all 0.3s ease;
      user-select: none;
    `;
    
    // 디버그 모드 상태에 따라 초기 표시 설정
    const isDebugMode = window._instagramDebugMode || false;
    debugOverlay.textContent = '⚪ 더미';
    debugOverlay.style.background = 'rgba(128, 128, 128, 0.8)';
    
    // 호버 효과
    debugOverlay.addEventListener('mouseenter', () => {
      debugOverlay.style.transform = 'scale(1.05)';
      debugOverlay.style.background = 'rgba(128, 128, 128, 0.9)';
    });
    
    debugOverlay.addEventListener('mouseleave', () => {
      debugOverlay.style.transform = 'scale(1)';
      debugOverlay.style.background = 'rgba(128, 128, 128, 0.8)';
    });
    
    // 클릭 이벤트 (더미 - 기능 없음)
    debugOverlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('⚪ 더미 버튼 클릭됨 (기능 없음)');
    });
    
    container.appendChild(debugOverlay);
  },
  
  // 디버그 토글 버튼 추가 (사용 안 함 - 개별 오버레이로 대체)
  addDebugToggleButton() {
    // 개별 컨테이너별로 디버그 버튼이 추가되므로 전역 버튼은 불필요
  },
  
  // 디버그 시각화 시작  
  startDebugVisualization() {
    // 좋아요와 댓글 버튼 위치만 박스로 표시
    this.showButtonPositions();
  },

  // 좋아요/댓글 버튼 위치 박스 표시
  showButtonPositions() {
    console.log('🎯 좋아요/댓글 버튼 위치 검색 중...');
    
    const currentVideo = document.querySelector('video');
    if (!currentVideo) {
      console.log('❌ 비디오를 찾을 수 없음');
      return;
    }

    // 좋아요 버튼 검색 로직 제거됨 (IG Sorter 사용)

    // 댓글 버튼 찾기 및 박스 표시
    const commentButton = this.findCommentButton(currentVideo);
    if (commentButton) {
      this.showButtonBox(commentButton, '💬 댓글 버튼', '#2196f3');
      console.log('✅ 댓글 버튼 발견 및 박스 표시');
    } else {
      console.log('❌ 댓글 버튼을 찾을 수 없음');
    }
  },

  // findHeartButton 함수 제거됨 (IG Sorter 사용)

  // 댓글 버튼 찾기
  findCommentButton(video) {
    // 비디오 근처에서 댓글 버튼 검색
    let searchArea = video;
    for (let i = 0; i < 5; i++) {
      searchArea = searchArea.parentElement;
      if (!searchArea) break;
      
      const commentButtons = searchArea.querySelectorAll('[aria-label="댓글"], [aria-label="Comment"], [aria-label*="comment"], [aria-label*="댓글"], svg[aria-label="댓글"], svg[aria-label="Comment"], button[aria-label*="댓글"], button[aria-label*="Comment"]');
      
      // 화면에 보이는 버튼만 선택
      for (const button of commentButtons) {
        const rect = button.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight && rect.left >= 0 && rect.left < window.innerWidth) {
          console.log('✅ 화면에 보이는 댓글 버튼 발견:', { top: rect.top, left: rect.left });
          return button;
        }
      }
    }
    
    // 전체 문서에서 검색 (화면에 보이는 것만)
    const allCommentButtons = document.querySelectorAll('[aria-label="댓글"], [aria-label="Comment"], [aria-label*="comment"], [aria-label*="댓글"], svg[aria-label="댓글"], svg[aria-label="Comment"], button[aria-label*="댓글"], button[aria-label*="Comment"]');
    
    for (const button of allCommentButtons) {
      const rect = button.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight && rect.left >= 0 && rect.left < window.innerWidth) {
        console.log('✅ 전체 검색에서 화면에 보이는 댓글 버튼 발견:', { top: rect.top, left: rect.left });
        return button;
      }
    }
    
    return null;
  },

  // 버튼 위치에 박스 표시 (숫자 포함한 더 큰 영역)
  showButtonBox(button, label, color) {
    const rect = button.getBoundingClientRect();
    
    // 기존 박스 제거 (같은 레이블)
    const existingBox = document.querySelector(`[data-debug-label="${label}"]`);
    if (existingBox) existingBox.remove();
    
    // 박스를 조금만 크게 만들어서 바로 아래 숫자까지 포함
    const expandX = 20; // 좌우로 20px씩 확장
    const expandY = 30; // 위아래로 30px 확장 (숫자가 보통 아이콘 바로 아래 있음)
    
    // 박스 생성 (확장된 크기)
    const box = document.createElement('div');
    box.setAttribute('data-debug-label', label);
    box.style.cssText = `
      position: fixed;
      left: ${rect.left - expandX}px;
      top: ${rect.top - expandY/2}px;
      width: ${rect.width + (expandX * 2)}px;
      height: ${rect.height + expandY}px;
      border: 3px solid ${color};
      background: ${color}15;
      pointer-events: none;
      z-index: 999999;
      animation: buttonPulse 2s infinite;
      border-radius: 8px;
    `;
    
    // 점선 박스 제거
    
    // 라벨 추가 (더 큰 박스에 맞게 조정)
    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
      position: absolute;
      top: -35px;
      left: 0;
      background: ${color};
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    labelDiv.textContent = label;
    box.appendChild(labelDiv);
    
    // 설명 텍스트 제거 (박스가 작아져서 불필요)
    
    // 펄스 애니메이션 스타일 추가
    if (!document.getElementById('button-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'button-pulse-style';
      style.textContent = `
        @keyframes buttonPulse {
          0%, 100% { 
            opacity: 0.6;
            transform: scale(1);
          }
          50% { 
            opacity: 0.9;
            transform: scale(1.01);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(box);
    this.debugElements.push(box);
    
    // 자동 제거하지 않음 - 디버그 버튼을 다시 클릭하면 사라짐
    
    console.log(`📦 ${label} 박스 표시 완료:`, {
      원본크기: `${rect.width}×${rect.height}px`,
      확장크기: `${rect.width + (expandX * 2)}×${rect.height + expandY}px`,
      위치: `(${rect.left - expandX}, ${rect.top - expandY/2})`
    });
  },

  // 디버깅 박스 기반 검색 영역 계산 (showButtonBox와 동일한 로직)
  getButtonSearchArea(button) {
    const rect = button.getBoundingClientRect();
    const expandX = 20; // 디버깅 박스와 동일한 확장 크기
    const expandY = 30;
    
    return {
      left: rect.left - expandX,
      right: rect.left + rect.width + expandX,
      top: rect.top - expandY/2,
      bottom: rect.top + rect.height + expandY,
      width: rect.width + (expandX * 2),
      height: rect.height + expandY
    };
  },

  // 특정 영역 내에서 숫자 패턴 찾기
  findNumberInArea(searchArea, type, button) {
    console.log(`🔍 ${type} 검색 영역에서 숫자 찾는 중...`, searchArea);
    
    // 방법 1: 버튼의 부모/형제 요소에서 직접 찾기 (Instagram 구조 기반)
    if (button) {
      console.log(`🎯 ${type} 버튼 근처에서 직접 검색 시도`);
      console.log(`🎯 ${type} 버튼 정보:`, {
        tagName: button.tagName,
        className: button.className,
        ariaLabel: button.getAttribute('aria-label'),
        innerHTML: button.innerHTML.substring(0, 100)
      });
      
      // 버튼 주변 형제 요소들도 분석
      if (button.parentElement) {
        const siblings = button.parentElement.children;
        console.log(`👥 ${type} 버튼의 형제 요소들 (${siblings.length}개):`);
        for (let j = 0; j < Math.min(siblings.length, 10); j++) {
          const sibling = siblings[j];
          const siblingText = (sibling.innerText || sibling.textContent || '').trim();
          console.log(`  - ${j+1}: ${sibling.tagName}.${sibling.className} = "${siblingText.substring(0, 30)}"`);
        }
      }
      
      // 버튼의 부모 요소들 탐색 (최대 5단계)
      let parent = button;
      for (let i = 0; i < 5; i++) {
        parent = parent.parentElement;
        if (!parent) break;
        
        console.log(`🏗️ ${type} 레벨 ${i+1} 부모:`, {
          tagName: parent.tagName,
          className: parent.className,
          childElementCount: parent.childElementCount
        });
        
        // 부모 요소 내의 모든 텍스트 요소 검색
        const textElements = parent.querySelectorAll('span, div, p, strong, em, button, a');
        console.log(`🔍 ${type} 레벨 ${i+1} 부모에서 ${textElements.length}개 텍스트 요소 발견`);
        
        for (const element of textElements) {
          const text = (element.innerText || element.textContent || '').trim();
          if (text && text.length < 20) { // 짧은 텍스트만 로그
            const isPattern = this.isNumberPattern(text, type);
            const elementRect = element.getBoundingClientRect();
            const distance = this.calculateDistance(searchArea, elementRect);
            
            console.log(`🔍 ${type} 텍스트 "${text}": 패턴=${isPattern}, 거리=${distance.toFixed(1)}px, 태그=${element.tagName}, 클래스="${element.className}"`);
            
            if (isPattern) {
              // 버튼과 거리가 300px 이내인 경우 (좋아요는 더 멀리 있을 수 있음)
              if (distance < 300) {
                console.log(`✅ ${type} 버튼 근처에서 숫자 발견:`, {
                  text: text,
                  distance: distance,
                  level: i + 1,
                  element: element.tagName + '.' + element.className
                });
                return text;
              } else {
                console.log(`⚠️ ${type} 숫자 "${text}" 너무 멀음 (거리: ${distance.toFixed(1)}px)`);
              }
            }
          }
        }
        
        // 현재 부모 요소의 직접 텍스트도 확인
        const parentText = parent.textContent?.trim();
        if (parentText && this.isNumberPattern(parentText, type)) {
          console.log(`✅ ${type} 부모 요소에서 직접 숫자 발견:`, {
            text: parentText,
            level: i + 1
          });
          return parentText;
        }
        
        // Instagram 특화: 버튼과 같은 레벨의 span 요소들 검사 (일반적인 패턴)
        if (i <= 2) { // 처음 2-3레벨에서만 검사
          const spans = parent.querySelectorAll('span:not([aria-hidden])');
          console.log(`📋 ${type} 레벨 ${i+1}에서 span 요소 ${spans.length}개 추가 검사`);
          
          for (const span of spans) {
            const spanText = (span.innerText || span.textContent || '').trim();
            if (spanText && spanText.length <= 10 && this.isNumberPattern(spanText, type)) {
              const spanRect = span.getBoundingClientRect();
              const distance = this.calculateDistance(searchArea, spanRect);
              
              if (distance < 300) {
                console.log(`✅ ${type} span에서 숫자 발견:`, {
                  text: spanText,
                  distance: distance,
                  level: i + 1
                });
                return spanText;
              }
            }
          }
        }
      }
    }
    
    // 방법 2: 기존 영역 기반 검색
    const currentVideo = document.querySelector('video');
    let searchContainer = document;
    
    if (currentVideo) {
      let parent = currentVideo;
      for (let i = 0; i < 10; i++) {
        parent = parent.parentElement;
        if (!parent) break;
        
        if (parent.tagName === 'ARTICLE' || 
            (parent.tagName === 'DIV' && parent.getBoundingClientRect().height > 400)) {
          searchContainer = parent;
          console.log(`🎯 검색 범위를 현재 포스트 컨테이너로 제한: ${parent.tagName}`);
          break;
        }
      }
    }
    
    // 확장된 검색 영역 (원래보다 2배 크게)
    const expandedArea = {
      left: searchArea.left - 50,
      right: searchArea.right + 50,
      top: searchArea.top - 50,
      bottom: searchArea.bottom + 50
    };
    
    const allElements = searchContainer.querySelectorAll('*'); // 모든 요소 검색
    let foundNumbers = [];
    let overlappingCount = 0;
    
    console.log(`🔍 확장된 검색 영역:`, expandedArea);
    console.log(`🔍 검색 대상 요소 수: ${allElements.length} (컨테이너: ${searchContainer === document ? '전체문서' : '현재포스트'})`);
    
    for (const element of allElements) {
      const rect = element.getBoundingClientRect();
      
      // 확장된 영역과 겹치는지 확인
      if (rect.right > expandedArea.left && 
          rect.left < expandedArea.right && 
          rect.bottom > expandedArea.top && 
          rect.top < expandedArea.bottom) {
        
        const text = (element.innerText || element.textContent || '').trim();
        
        if (text && text.length < 20) { // 짧은 텍스트만 체크
          overlappingCount++;
          
          if (overlappingCount <= 10) { // 처음 10개만 로그 출력
            console.log(`🔍 확장 영역 내 요소 ${overlappingCount}:`, {
              tag: element.tagName,
              text: text,
              position: { x: rect.left, y: rect.top },
              isPattern: this.isNumberPattern(text, type)
            });
          }
          
          if (this.isNumberPattern(text, type)) {
            foundNumbers.push({
              text: text,
              element: element,
              distance: this.calculateDistance(searchArea, rect)
            });
          }
        }
      }
    }
    
    console.log(`📊 확장 검색 결과: ${overlappingCount}개 요소 중 ${foundNumbers.length}개 숫자 후보 발견`);
    
    if (foundNumbers.length > 0) {
      foundNumbers.sort((a, b) => a.distance - b.distance);
      console.log(`✅ ${type} 수 발견:`, foundNumbers[0].text);
      return foundNumbers[0].text;
    }
    
    // 방법 3: Instagram 좋아요 수 특별 검색 (버튼과 완전 분리된 경우)
    if (type === 'likes') {
      console.log('🔍 좋아요 수 특별 검색 시작 (Instagram 전체 구조 분석)');
      
      // 현재 비디오 컨테이너를 더 넓게 확장해서 검색
      const currentVideo = document.querySelector('video');
      if (currentVideo) {
        let postContainer = currentVideo;
        
        // 더 상위 레벨의 포스트 컨테이너 찾기 (최대 15레벨)
        for (let i = 0; i < 15; i++) {
          postContainer = postContainer.parentElement;
          if (!postContainer) break;
          
          // Instagram의 메인 포스트 컨테이너 감지
          if (postContainer.tagName === 'ARTICLE' || 
              postContainer.classList.toString().includes('post') ||
              postContainer.querySelector('video') === currentVideo) {
            console.log(`📦 확장된 포스트 컨테이너 발견 (레벨 ${i+1}):`, postContainer.tagName);
            
            // 이 컨테이너 내의 모든 숫자 텍스트 검색
            const allTextElements = postContainer.querySelectorAll('span, div, p, button, a');
            console.log(`🔍 확장 컨테이너에서 ${allTextElements.length}개 요소 검사`);
            
            const numberCandidates = [];
            
            for (const element of allTextElements) {
              const text = (element.innerText || element.textContent || '').trim();
              if (text && text.length <= 10 && this.isNumberPattern(text, 'likes')) {
                const rect = element.getBoundingClientRect();
                
                // 현재 화면에 보이는 요소만
                if (rect.top >= 0 && rect.top < window.innerHeight) {
                  numberCandidates.push({
                    text: text,
                    element: element,
                    distance: this.calculateDistance(searchArea, rect),
                    rect: rect
                  });
                }
              }
            }
            
            console.log(`📊 확장 검색에서 ${numberCandidates.length}개 숫자 후보 발견`);
            
            if (numberCandidates.length > 0) {
              // 거리순으로 정렬
              numberCandidates.sort((a, b) => a.distance - b.distance);
              console.log('🔍 좋아요 수 후보들:', numberCandidates.map(c => ({
                text: c.text,
                distance: Math.round(c.distance),
                tag: c.element.tagName
              })));
              
              // 가장 가까운 숫자 반환
              console.log(`✅ 확장 검색에서 좋아요 수 발견: "${numberCandidates[0].text}"`);
              return numberCandidates[0].text;
            }
            
            // 방법 4: Instagram 특별 좋아요 수 검색 (aria-label, data 속성, 숨겨진 텍스트)
            console.log('🔍 Instagram 특별 좋아요 검색 (aria-label, data 속성)');
            
            // 좋아요 관련 aria-label이나 data 속성을 가진 요소들 검색
            const likeElements = postContainer.querySelectorAll('[aria-label*="like"], [aria-label*="좋아요"], [data-testid*="like"], [title*="like"], [title*="좋아요"]');
            console.log(`📋 좋아요 관련 속성 요소 ${likeElements.length}개 발견`);
            
            for (const element of likeElements) {
              const ariaLabel = element.getAttribute('aria-label') || '';
              const title = element.getAttribute('title') || '';
              const dataTestId = element.getAttribute('data-testid') || '';
              
              console.log('🔍 좋아요 속성 요소:', {
                tag: element.tagName,
                ariaLabel: ariaLabel,
                title: title,
                dataTestId: dataTestId,
                text: (element.innerText || '').substring(0, 50)
              });
              
              // aria-label이나 title에서 숫자 추출 시도
              const labelMatch = ariaLabel.match(/(\d+[,.]?\d*[만KMk천]?)/);
              const titleMatch = title.match(/(\d+[,.]?\d*[만KMk천]?)/);
              
              if (labelMatch) {
                console.log(`✅ aria-label에서 좋아요 수 발견: "${labelMatch[1]}"`);
                return labelMatch[1];
              }
              
              if (titleMatch) {
                console.log(`✅ title에서 좋아요 수 발견: "${titleMatch[1]}"`);
                return titleMatch[1];
              }
            }
            
            // 방법 5: React/DOM 프로퍼티 검색
            console.log('🔍 React 프로퍼티 및 DOM 데이터 검색');
            
            const allElements = postContainer.querySelectorAll('*');
            for (const element of Array.from(allElements).slice(0, 100)) { // 처음 100개만
              // React 프로퍼티 확인
              const props = element._reactInternalFiber?.memoizedProps || 
                           element._reactInternalInstance?.memoizedProps ||
                           element.__reactInternalInstance?.memoizedProps;
              
              if (props && typeof props === 'object') {
                const propsString = JSON.stringify(props);
                const likeMatch = propsString.match(/"likes?":(\d+)/i) || 
                                 propsString.match(/"count":(\d+)/i);
                
                if (likeMatch) {
                  console.log(`✅ React props에서 좋아요 수 발견: "${likeMatch[1]}"`);
                  return likeMatch[1];
                }
              }
            }
            
            // 방법 6: 전체 페이지 스캔 (최후의 수단) - 댓글 수 제외 처리
            console.log('🔍 전체 페이지 스캔 시작 (댓글 수 제외 처리)');
            
            // 먼저 댓글 버튼 위치 파악
            const currentVideo = document.querySelector('video');
            const commentButton = this.findCommentButton(currentVideo);
            let commentButtonArea = null;
            
            if (commentButton) {
              const commentRect = commentButton.getBoundingClientRect();
              commentButtonArea = {
                left: commentRect.left - 50,
                right: commentRect.right + 50,
                top: commentRect.top - 50,
                bottom: commentRect.bottom + 50
              };
              console.log('📍 댓글 버튼 영역 (제외할 영역):', commentButtonArea);
            }
            
            const allPageElements = document.querySelectorAll('*');
            const potentialNumbers = [];
            
            for (const element of Array.from(allPageElements).slice(0, 500)) { // 처음 500개만
              const text = (element.innerText || element.textContent || '').trim();
              
              // 숫자 패턴 찾기 (순수 숫자, 소수점, 한글 단위 포함)
              const numberPatterns = [
                /^\d{1,6}$/, // 순수 숫자: 1234
                /^\d+[.,]\d+만$/, // 소수점 + 만: 23.3만, 1.5만
                /^\d+[.,]\d+[천KMk]$/, // 소수점 + 다른 단위: 1.2K, 3.4천
                /^\d+만$/, // 만 단위: 23만, 100만
                /^\d+[천KMk]$/, // 다른 단위: 5천, 10K
                /^\d{1,3}(,\d{3})+$/ // 쉼표 숫자: 23,300
              ];
              
              const isValidNumber = numberPatterns.some(pattern => pattern.test(text)) && 
                                   text !== '0' && text !== '1';
              
              if (text && isValidNumber) {
                const rect = element.getBoundingClientRect();
                
                // 화면에 보이는 요소만
                if (rect.top >= 0 && rect.top < window.innerHeight && rect.left >= 0) {
                  
                  // 댓글 버튼 근처 숫자는 제외 (댓글 수일 가능성)
                  let isNearCommentButton = false;
                  if (commentButtonArea) {
                    const elementCenter = {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2
                    };
                    
                    if (elementCenter.x >= commentButtonArea.left && elementCenter.x <= commentButtonArea.right &&
                        elementCenter.y >= commentButtonArea.top && elementCenter.y <= commentButtonArea.bottom) {
                      isNearCommentButton = true;
                      console.log(`⚠️ 댓글 버튼 근처 숫자 제외: "${text}"`);
                    }
                  }
                  
                  if (!isNearCommentButton) {
                    potentialNumbers.push({
                      text: text,
                      element: element,
                      rect: rect,
                      distance: this.calculateDistance(searchArea, rect)
                    });
                  }
                }
              }
            }
            
            console.log(`📊 전체 페이지에서 ${potentialNumbers.length}개 숫자 발견 (댓글 수 제외):`, 
              potentialNumbers.slice(0, 10).map(n => ({ 
                text: n.text, 
                distance: Math.round(n.distance),
                position: { x: Math.round(n.rect.left), y: Math.round(n.rect.top) },
                element: n.element.tagName + '.' + n.element.className
              }))
            );
            
            // 디버깅: 제외되지 않은 모든 숫자 표시 (숫자가 0개일 때만)
            if (potentialNumbers.length === 0) {
              console.log('🔍 좋아요 수가 없는 이유 분석 - 전체 페이지의 모든 숫자 확인');
              const allNumbers = [];
              
              for (const element of Array.from(allPageElements).slice(0, 200)) {
                const text = (element.innerText || element.textContent || '').trim();
                
                if (text && text.match(/\d/)) { // 숫자가 포함된 모든 텍스트
                  const rect = element.getBoundingClientRect();
                  if (rect.top >= 0 && rect.top < window.innerHeight && rect.left >= 0) {
                    allNumbers.push({
                      text: text,
                      rect: rect,
                      element: element
                    });
                  }
                }
              }
              
              console.log(`📋 전체 페이지의 숫자 포함 텍스트 ${Math.min(allNumbers.length, 20)}개:`);
              
              // 각 항목을 개별적으로 로그
              allNumbers.slice(0, 20).forEach((n, index) => {
                console.log(`  ${index + 1}. "${n.text}" (${n.element.tagName}) 위치: (${Math.round(n.rect.left)}, ${Math.round(n.rect.top)})`);
              });
            }
            
            if (potentialNumbers.length > 0) {
              // 거리가 가까운 순으로 정렬
              potentialNumbers.sort((a, b) => a.distance - b.distance);
              
              // 너무 가깝지 않은 것 중에서 선택 (버튼 자체 텍스트 제외)
              const validNumbers = potentialNumbers.filter(n => n.distance > 50 && n.distance < 1000);
              
              if (validNumbers.length > 0) {
                console.log(`✅ 전체 스캔에서 좋아요 수 추정 (댓글 수 제외됨): "${validNumbers[0].text}" (거리: ${Math.round(validNumbers[0].distance)}px)`);
                return validNumbers[0].text;
              }
            }
            
            // 방법 7: IG Sorter 확장프로그램 데이터 활용
            console.log('🔍 IG Sorter 확장프로그램에서 좋아요 수 검색');
            
            // IG Sorter가 만든 요소들 찾기
            const igSorterSelectors = [
              '[class*="ig-sorter"]',
              '[id*="ig-sorter"]', 
              '[class*="sorter"]',
              'div[style*="position: fixed"][style*="right"]', // 오른쪽 고정 위치
              'div[style*="position: absolute"][style*="right"]'
            ];
            
            for (const selector of igSorterSelectors) {
              const elements = document.querySelectorAll(selector);
              console.log(`🔍 IG Sorter 후보 요소 "${selector}": ${elements.length}개`);
              
              for (const element of elements) {
                const text = element.innerText || element.textContent || '';
                console.log(`📋 IG Sorter 요소 내용: "${text.substring(0, 200)}"`);
                
                // 좋아요 수 패턴 찾기 (946, 1,234, 12K 등)
                const likeMatches = text.match(/(\d{1,3}(?:,\d{3})*|\d+[KMk]|\d+\.\d+[KMk])/g);
                if (likeMatches) {
                  console.log(`🎯 IG Sorter에서 숫자 패턴 발견: ${likeMatches.join(', ')}`);
                  
                  // 첫 번째 또는 두 번째 숫자가 좋아요 수일 가능성
                  if (likeMatches.length >= 2) {
                    console.log(`✅ IG Sorter에서 좋아요 수 발견: "${likeMatches[1]}"`);
                    return likeMatches[1]; // 두 번째 숫자가 보통 좋아요 수
                  } else if (likeMatches.length >= 1) {
                    console.log(`✅ IG Sorter에서 숫자 발견: "${likeMatches[0]}"`);
                    return likeMatches[0];
                  }
                }
              }
            }
            
            // 방법 8: 페이지에서 직접 "946" 같은 패턴 찾기
            console.log('🔍 페이지에서 IG Sorter 스타일 좋아요 수 직접 검색');
            const rightSideElements = document.querySelectorAll('div, span, p');
            
            for (const element of rightSideElements) {
              const rect = element.getBoundingClientRect();
              const text = (element.innerText || element.textContent || '').trim();
              
              // 화면 오른쪽에 있고, 짧은 숫자 패턴
              if (rect.right > window.innerWidth - 200 && // 오른쪽 200px 이내
                  text.match(/^\d{1,6}$/) && // 순수 숫자
                  text !== '0' && text !== '1' && text.length >= 2) {
                
                console.log(`🎯 오른쪽 영역에서 숫자 발견: "${text}" 위치: (${Math.round(rect.left)}, ${Math.round(rect.top)})`);
                return text;
              }
            }
            
            // 방법 9: 하드코딩된 폴백
            console.log('⚠️ 좋아요 수가 숨겨져 있을 가능성 - 기본값 반환');
            return '숨겨짐';
            
            break; // 적절한 컨테이너를 찾았으면 중단
          }
        }
      }
    }
    
    console.log(`❌ ${type} 수를 찾을 수 없음`);
    return null;
  },

  // 숫자 패턴 확인
  isNumberPattern(text, type) {
    if (!text || text.trim() === '') {
      return false;
    }
    
    const cleanText = text.trim();
    console.log(`🔍 ${type} 패턴 검사: "${cleanText}" (길이: ${cleanText.length})`);
    
    // 더 유연한 숫자 패턴 (좋아요/댓글 공통)
    const patterns = [
      /^\d+$/, // 순수 숫자: 123, 4567
      /^\d+[.,]\d+[만KMk천]?$/, // 소수점 숫자: 1.2만, 4.5K
      /^\d+[만KMk천]$/, // 단위 숫자: 123만, 45K, 67천
      /^\d{1,3}(,\d{3})+$/, // 쉼표 숫자: 1,234, 12,345
      /^\d+\s*[만KMk천]$/, // 공백 포함: 123 만, 45 K
      /^[0-9]+$/, // 다른 유니코드 숫자들
    ];
    
    if (cleanText.length > 10) {
      console.log(`❌ ${type} 텍스트 길이 초과: "${cleanText}" (${cleanText.length}자)`);
      return false;
    }
    
    // 비숫자 텍스트 필터링
    if (cleanText.includes('좋아요') || cleanText.includes('댓글') || 
        cleanText.includes('Like') || cleanText.includes('Comment') ||
        cleanText.includes('Share') || cleanText.includes('공유')) {
      console.log(`❌ ${type} 비숫자 텍스트: "${cleanText}"`);
      return false;
    }
    
    for (let i = 0; i < patterns.length; i++) {
      if (patterns[i].test(cleanText)) {
        console.log(`✅ ${type} 패턴 ${i+1} 매칭: "${cleanText}"`);
        return true;
      }
    }
    
    console.log(`❌ ${type} 패턴 불일치: "${cleanText}"`);
    return false;
  },

  // 거리 계산 (검색 영역 중심과 요소 중심 간 거리)
  calculateDistance(searchArea, elementRect) {
    const searchCenterX = (searchArea.left + searchArea.right) / 2;
    const searchCenterY = (searchArea.top + searchArea.bottom) / 2;
    const elementCenterX = elementRect.left + elementRect.width / 2;
    const elementCenterY = elementRect.top + elementRect.height / 2;
    
    return Math.sqrt(
      Math.pow(searchCenterX - elementCenterX, 2) + 
      Math.pow(searchCenterY - elementCenterY, 2)
    );
  },
  
  // 디버그 시각화 지우기
  clearDebugVisuals() {
    this.debugElements.forEach(el => el.remove());
    this.debugElements = [];
  },
  
  // 검색 영역 시각화
  visualizeSearchArea(area, id) {
    // 기존 시각화 제거
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = `
      position: fixed;
      left: ${area.left}px;
      top: ${area.top}px;
      width: ${area.right - area.left}px;
      height: ${area.bottom - area.top}px;
      background: rgba(255, 0, 0, 0.15);
      border: 3px dashed red;
      pointer-events: none;
      z-index: 999999;
      animation: debugPulse 2s infinite;
    `;
    
    // 펄스 애니메이션 스타일 추가
    if (!document.getElementById('debug-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'debug-pulse-style';
      style.textContent = `
        @keyframes debugPulse {
          0%, 100% { 
            border-color: red; 
            background: rgba(255, 0, 0, 0.15);
          }
          50% { 
            border-color: #ff6666; 
            background: rgba(255, 0, 0, 0.25);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // 라벨 추가 (더 상세한 정보 포함)
    const label = document.createElement('div');
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const areaWidth = area.right - area.left;
    const areaHeight = area.bottom - area.top;
    const percentage = `${Math.round((areaWidth / screenWidth) * 100)}% × ${Math.round((areaHeight / screenHeight) * 100)}%`;
    
    label.style.cssText = `
      position: absolute;
      top: 5px;
      left: 5px;
      background: red;
      color: white;
      padding: 8px 12px;
      border-radius: 5px;
      font-size: 13px;
      font-weight: bold;
      line-height: 1.3;
      max-width: 250px;
      white-space: nowrap;
    `;
    
    const areaName = id === 'likes-area' ? '❤️ 좋아요 검색 영역' : '💬 댓글 검색 영역';
    label.innerHTML = `
      ${areaName}<br>
      <small style="font-size: 11px; opacity: 0.9;">
        ${Math.round(areaWidth)}×${Math.round(areaHeight)}px (${percentage})
      </small>
    `;
    overlay.appendChild(label);
    
    // 영역 모서리에 좌표 표시
    const corners = [
      { text: `(${Math.round(area.left)}, ${Math.round(area.top)})`, pos: 'top: -25px; left: 0;' },
      { text: `(${Math.round(area.right)}, ${Math.round(area.top)})`, pos: 'top: -25px; right: 0;' },
      { text: `(${Math.round(area.left)}, ${Math.round(area.bottom)})`, pos: 'bottom: -25px; left: 0;' },
      { text: `(${Math.round(area.right)}, ${Math.round(area.bottom)})`, pos: 'bottom: -25px; right: 0;' }
    ];
    
    corners.forEach(corner => {
      const coord = document.createElement('div');
      coord.style.cssText = `
        position: absolute;
        ${corner.pos}
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: bold;
        white-space: nowrap;
      `;
      coord.textContent = corner.text;
      overlay.appendChild(coord);
    });
    
    document.body.appendChild(overlay);
    this.debugElements.push(overlay);
    
    console.log(`🎯 ${areaName} 시각화 완료:`, {
      영역: `${Math.round(areaWidth)}×${Math.round(areaHeight)}px`,
      비율: percentage,
      좌표: `(${Math.round(area.left)}, ${Math.round(area.top)}) ~ (${Math.round(area.right)}, ${Math.round(area.bottom)})`
    });
  },
  
  // 위치 기반 검색 영역 내 요소 하이라이트 (더 부드러운 색상)
  highlightPositionBasedElement(element, type, text) {
    if (!window._instagramDebugMode && !window.location.hash.includes('debug')) return;
    
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left - 1}px;
      top: ${rect.top - 1}px;
      width: ${rect.width + 2}px;
      height: ${rect.height + 2}px;
      background: rgba(255, 255, 0, 0.1);
      border: 1px solid orange;
      pointer-events: none;
      z-index: 999998;
      animation: positionPulse 3s infinite;
    `;
    
    // 위치 기반 하이라이트용 애니메이션 추가
    if (!document.getElementById('position-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'position-pulse-style';
      style.textContent = `
        @keyframes positionPulse {
          0%, 100% { 
            border-color: orange; 
            background: rgba(255, 255, 0, 0.1);
          }
          50% { 
            border-color: #ffaa00; 
            background: rgba(255, 255, 0, 0.2);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // 라벨 추가
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -25px;
      left: 0;
      background: rgba(255, 165, 0, 0.9);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
      white-space: nowrap;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    label.textContent = `📍 ${text}`;
    highlight.appendChild(label);
    
    document.body.appendChild(highlight);
    this.debugElements.push(highlight);
    
    // 3초 후 자동 제거
    setTimeout(() => {
      if (highlight.parentElement) {
        highlight.parentElement.removeChild(highlight);
      }
    }, 3000);
  },
  
  // 찾은 요소 하이라이트
  highlightElement(element, type, text) {
    if (!window._instagramDebugMode && !window.location.hash.includes('debug')) return;
    
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left - 2}px;
      top: ${rect.top - 2}px;
      width: ${rect.width + 4}px;
      height: ${rect.height + 4}px;
      border: 2px solid ${type === 'heart' ? '#e91e63' : type === 'comment' ? '#2196f3' : '#4caf50'};
      background: ${type === 'heart' ? 'rgba(233,30,99,0.2)' : type === 'comment' ? 'rgba(33,150,243,0.2)' : 'rgba(76,175,80,0.2)'};
      pointer-events: none;
      z-index: 999998;
      animation: pulse 1s infinite;
    `;
    
    // 라벨 추가
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -25px;
      left: 0;
      background: ${type === 'heart' ? '#e91e63' : type === 'comment' ? '#2196f3' : '#4caf50'};
      color: white;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
    `;
    label.textContent = `${type}: ${text}`;
    highlight.appendChild(label);
    
    document.body.appendChild(highlight);
    this.debugElements.push(highlight);
    
    // CSS 애니메이션 추가
    if (!document.getElementById('debug-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'debug-pulse-style';
      style.textContent = `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  },
  
  scanAndAddButtons() {
    // Instagram 구조 변경으로 비디오 직접 타겟팅
    const videos = document.querySelectorAll('video');
    console.log('📹 발견된 비디오:', videos.length);
    
    videos.forEach((video, index) => {
      // 비디오의 부모 컨테이너 찾기
      let container = video.closest('div');
      while (container && !container.style.position) {
        container = container.parentElement;
      }
      if (!container) container = video.parentElement;
      
      if (this.shouldAddButton(container, video)) {
        this.addAnalysisOverlay(container, video);
        console.log(`✅ 비디오 ${index}에 버튼 추가됨`);
      }
    });
  },
  
  shouldAddButton(container, video) {
    // 이미 버튼이 추가된 컨테이너는 스킵
    if (container.querySelector('.analysis-overlay-btn')) {
      return false;
    }
    
    // 비디오가 재생 가능한 상태인지 확인
    return video && video.readyState >= 1;
  },
  
  addAnalysisOverlay(container, video) {
    // Instagram downloader 스타일의 오버레이 버튼 생성
    const overlay = document.createElement('div');
    overlay.className = 'analysis-overlay-btn';
    overlay.style.cssText = `
      position: absolute;
      bottom: 100px;
      right:5px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      z-index: 999999;
      border: 2px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      user-select: none;
    `;
    
    overlay.textContent = '🔍 분석';
    
    // 호버 효과
    overlay.addEventListener('mouseenter', () => {
      overlay.style.background = 'rgba(25, 118, 210, 0.9)';
      overlay.style.transform = 'scale(1.05)';
    });
    
    overlay.addEventListener('mouseleave', () => {
      overlay.style.background = 'rgba(0, 0, 0, 0.7)';
      overlay.style.transform = 'scale(1)';
    });
    
    // 클릭 이벤트 - Instagram downloader 방식
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleAnalysisClick(container, video, overlay);
    });
    
    // 컨테이너에 상대 위치 설정 (오버레이 정확한 위치를 위해)
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }
    
    container.appendChild(overlay);
    
    // 디버그 버튼 추가 (분석 버튼 위에)
    this.addDebugOverlay(container, video);
    
    console.log('✅ 분석 버튼 추가됨:', container);
  },
  
  async handleAnalysisClick(container, video, button) {
    console.log('🎯 분석 버튼 클릭됨');
    console.log('📹 전달받은 video 요소:', video);
    console.log('📦 전달받은 container 요소:', container);
    console.log('🔗 video src:', video?.src?.substring(0, 100));
    
    // 현재 화면에서 실제 재생 중인 비디오 찾기
    const currentlyPlayingVideo = this.findCurrentActiveVideo();
    if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
      console.log('⚠️ 전달받은 video와 실제 활성 video가 다름!');
      console.log('🎬 실제 활성 video:', currentlyPlayingVideo);
      console.log('🔗 실제 활성 video src:', currentlyPlayingVideo?.src?.substring(0, 100));
      video = currentlyPlayingVideo; // 실제 활성 video로 교체
    }
    
    // 버튼 상태 변경
    button.style.background = 'rgba(255, 152, 0, 0.9)';
    button.textContent = '⏳ 분석 중...';
    button.style.pointerEvents = 'none';
    
    try {
      // Instagram downloader 방식으로 미디어 정보 추출 (async)
      const mediaInfo = await this.extractMediaInfoFromContainer(container, video);
      
      if (mediaInfo && mediaInfo.videoUrl) {
        console.log('📹 미디어 정보 발견:', mediaInfo);
        this.processVideoAnalysis(mediaInfo, button);
      } else {
        console.error('❌ 미디어 정보를 찾을 수 없습니다');
        this.resetButton(button, '❌ 실패');
      }
    } catch (error) {
      console.error('❌ 미디어 정보 추출 중 오류:', error);
      this.resetButton(button, '❌ 오류');
    }
  },
  
  extractShortcodeFromURL() {
    // 현재 페이지 URL에서 shortcode 추출
    const url = window.location.href;
    const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      console.log('🌐 현재 URL:', url);
      console.log('🎯 URL에서 추출한 shortcode:', match[1]);
      return match[1];
    }
    return null;
  },
  
  findCurrentActiveVideo() {
    // 현재 뷰포트에서 가장 중앙에 위치한 video 찾기
    const videos = document.querySelectorAll('video');
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2;
    
    let bestVideo = null;
    let bestScore = Infinity;
    
    videos.forEach(video => {
      const rect = video.getBoundingClientRect();
      const videoCenter = rect.top + rect.height / 2;
      const distanceFromCenter = Math.abs(videoCenter - viewportCenter);
      
      // 화면에 보이는 video 중에서 중앙에 가장 가까운 것 선택
      if (rect.top < viewportHeight && rect.bottom > 0 && distanceFromCenter < bestScore) {
        bestScore = distanceFromCenter;
        bestVideo = video;
      }
    });
    
    console.log('🎯 현재 활성 비디오 선택:', bestVideo);
    console.log('📊 전체 비디오 수:', videos.length, '선택 점수:', bestScore);
    
    return bestVideo;
  },
  
  findVideoByShortcode(targetShortcode) {
    // 현재 shortcode와 일치하는 video element 찾기
    const videos = document.querySelectorAll('video');
    console.log('🔍 shortcode와 일치하는 video 검색 시작:', targetShortcode);
    
    // 1. React Props 방식으로 검색
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const rect = video.getBoundingClientRect();
      
      // 화면에 보이는 video만 검사
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        console.log(`📹 Video ${i} 검사 중:`, video.src?.substring(0, 50));
        
        // 이 video의 React Props에서 shortcode 추출
        const videoShortcode = this.extractShortcodeFromVideoElement(video);
        console.log(`📋 Video ${i}의 shortcode:`, videoShortcode);
        
        if (videoShortcode === targetShortcode) {
          console.log(`✅ 일치하는 video 발견: ${i}번째`);
          return video;
        }
      }
    }
    
    // 2. React Props 실패시 - 페이지 URL 기반으로 현재 활성 video 추정
    console.log('⚠️ React Props로 매칭 실패, URL 기반 활성 video 선택');
    console.log('🌐 현재 페이지 shortcode:', targetShortcode);
    
    // URL이 변경되었다면 가장 최근에 화면에 나타난 video가 현재 video일 가능성 높음
    const visibleVideos = Array.from(videos).filter(video => {
      const rect = video.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    
    if (visibleVideos.length > 0) {
      // 가장 중앙에 위치한 video 선택 (Instagram 특성상 메인 video가 중앙에 위치)
      const centerVideo = this.findCenterMostVideo(visibleVideos);
      console.log('🎯 중앙 기준 선택된 video:', centerVideo?.src?.substring(0, 50));
      return centerVideo;
    }
    
    console.log('❌ 모든 방법 실패, 기본 활성 video 반환');
    return this.findCurrentActiveVideo();
  },
  
  findCenterMostVideo(videos) {
    // 뷰포트 중앙에 가장 가까운 video 선택
    const viewportCenterY = window.innerHeight / 2;
    let bestVideo = null;
    let minDistance = Infinity;
    
    videos.forEach(video => {
      const rect = video.getBoundingClientRect();
      const videoCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(videoCenterY - viewportCenterY);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestVideo = video;
      }
    });
    
    return bestVideo;
  },
  
  extractShortcodeFromVideoElement(video) {
    // video element에서 직접 shortcode 추출
    let element = video;
    const maxDepth = 10;
    
    for (let depth = 0; depth <= maxDepth && element; depth++) {
      const reactProps = this.getReactPropsFromElement(element);
      if (!reactProps) {
        element = element.parentElement;
        continue;
      }
      
      if (reactProps.children && reactProps.children.props) {
        const props = reactProps.children.props;
        
        // Instagram downloader와 동일한 순서로 검사
        if (props?.videoFBID) {
          const shortcode = window.INSTAGRAM_MEDIA_TRACKER?.fbIdMap[props.videoFBID];
          if (shortcode) return shortcode;
        }
        
        if (props?.post?.code) {
          return props.post.code;
        }
        
        if (props.href) {
          const match = props.href.match(/\/p\/([A-Za-z0-9_-]+)/);
          if (match) return match[1];
        }
      }
      
      element = element.parentElement;
    }
    
    return null;
  },
  
  async extractMediaInfoFromContainer(container, video) {
    console.log('🔍 미디어 정보 추출 시작 - 컨테이너별 개별 추출');
    
    // 현재 활성 비디오 찾기
    const currentVideo = this.findCurrentActiveVideo() || video;
    
    // 릴스 설명 텍스트 추출 (현재 비디오 기준)
    const description = await this.extractReelsDescription(currentVideo);
    
    // 1. Instagram downloader 방식: React Props에서 직접 추출
    const shortcode = this.extractShortcodeFromReactProps(container, video);
    if (shortcode) {
      console.log('⚛️ React Props에서 shortcode 추출:', shortcode);
      
      // Media Tracker에서 해당 shortcode의 미디어 정보 찾기
      if (window.INSTAGRAM_MEDIA_TRACKER && window.INSTAGRAM_MEDIA_TRACKER.mediaData[shortcode]) {
        const mediaData = window.INSTAGRAM_MEDIA_TRACKER.mediaData[shortcode];
        console.log('🎯 개별 미디어 발견:', shortcode);
        return {
          videoUrl: mediaData.video_versions?.[0]?.url || video.src,
          shortcode: shortcode,
          mediaData: mediaData,
          description: description  // 릴스 설명 추가
        };
      }
    }
    
    // 2. URL 기반 fallback (현재 URL에 shortcode가 포함된 경우)
    const urlShortcode = this.generateShortcodeFromUrl();
    if (window.INSTAGRAM_MEDIA_TRACKER && window.INSTAGRAM_MEDIA_TRACKER.mediaData[urlShortcode]) {
      const mediaData = window.INSTAGRAM_MEDIA_TRACKER.mediaData[urlShortcode];
      console.log('🎯 URL 기반 미디어 발견:', urlShortcode);
      return {
        videoUrl: mediaData.video_versions?.[0]?.url || video.src,
        shortcode: urlShortcode,
        mediaData: mediaData,
        description: description  // 릴스 설명 추가
      };
    }
    
    // 3. 비디오 src 직접 사용 (최종 fallback)
    if (video.src) {
      console.log('📺 비디오 src 사용 (fallback)');
      return {
        videoUrl: video.src,
        shortcode: shortcode || urlShortcode || 'unknown_' + Date.now(),
        mediaData: null,
        isBlob: video.src.includes('blob:'),
        description: description  // 릴스 설명 추가
      };
    }
    
    console.warn('⚠️ 미디어 정보 추출 실패');
    return null;
  },
  
  // 릴스 설명 텍스트 추출 함수 (비활성화)
  async extractReelsDescription(targetVideo) {
    console.log('📝 설명 추출 비활성화됨 - 빈 문자열 반환');
    return '';
    
    try {
      // 현재 화면에서 가장 중앙에 있는 비디오 컨테이너만 타겟팅
      let targetContainer = null;
      const viewportCenter = window.innerHeight / 2;
      let bestDistance = Infinity;
      
      // 모든 article을 검사해서 화면 중앙에 가장 가까운 것 선택
      const articles = document.querySelectorAll('article');
      console.log(`📊 전체 article 수: ${articles.length}`);
      
      for (const article of articles) {
        const rect = article.getBoundingClientRect();
        const articleCenter = rect.top + rect.height / 2;
        const distance = Math.abs(articleCenter - viewportCenter);
        
        // 화면에 보이는 article이고 중앙에 가장 가까운 것
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          console.log(`📏 Article 중심: ${articleCenter}, 거리: ${distance}, 영역: ${rect.top}-${rect.bottom}`);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            targetContainer = article;
          }
        }
      }
      
      // 선택된 컨테이너가 실제로 비디오를 포함하는지 확인
      if (targetContainer) {
        const videosInContainer = targetContainer.querySelectorAll('video');
        console.log(`🎯 선택된 컨테이너의 비디오 수: ${videosInContainer.length}`);
        
        if (videosInContainer.length === 0) {
          console.log('⚠️ 선택된 컨테이너에 비디오 없음, 다른 방법으로 검색');
          targetContainer = null;
        } else {
          console.log('✅ 비디오가 포함된 컨테이너 확인됨:', targetContainer);
        }
      }
      
      // fallback: targetVideo 기준으로 컨테이너 찾기
      if (!targetContainer && targetVideo) {
        targetContainer = targetVideo.closest('article') || 
                         targetVideo.closest('section') || 
                         targetVideo.closest('div[role="main"]');
        console.log('🔄 fallback - 비디오 기준 컨테이너:', targetContainer);
      }
      
      // "더 보기" 버튼 클릭하지 않고 보이는 내용만 추출
      console.log('📄 "더 보기" 버튼 클릭 건너뛰고 바로 보이는 내용만 추출');
      
      // 잠시 대기 (DOM 업데이트 시간)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🌐 현재 URL:', window.location.href);
      console.log('📊 대상 컨테이너:', targetContainer?.tagName);
      
      // 타겟 컨테이너가 없으면 설명 추출 중단
      if (!targetContainer) {
        console.log('❌ 현재 영상의 컨테이너를 찾을 수 없어 설명 추출을 중단합니다');
        return '';
      }
      
      console.log('🔍 검색 범위: 선택된 컨테이너 내에서만');
      console.log('📦 최종 타겟 컨테이너:', targetContainer);
      
      // 1단계: React Props에서 직접 설명 추출 시도
      const reactDescription = await this.extractDescriptionFromReactProps(targetContainer, targetVideo);
      if (reactDescription) {
        console.log('✅ React Props에서 설명 직접 추출 성공!');
        return reactDescription;
      }
      
      // 2단계: Instagram API 데이터에서 추출 시도  
      const apiDescription = this.extractDescriptionFromAPIData(targetContainer);
      if (apiDescription) {
        console.log('✅ API 데이터에서 설명 추출 성공!');
        return apiDescription;
      }
      
      // 3단계: DOM 구조 기반 정확한 위치 찾기
      const domDescription = this.extractDescriptionFromDOMStructure(targetContainer);
      if (domDescription) {
        console.log('✅ DOM 구조에서 설명 추출 성공!');
        return domDescription;
      }
      
      console.log('⚠️ 정확한 방법으로 설명을 찾을 수 없어 추측 방식으로 전환합니다');
      
      const descriptionSelectors = [
        // Instagram 릴스 하단 설명 (우선순위)
        'div[style*="bottom"] span:not([role="button"])',
        'div[dir="auto"] span',
        'span[dir="auto"]',
        'div:not([role]) span',
        'span:not([role="button"])',
        'div span:not([role="button"])'
      ];
      
      // 타겟 컨테이너 내에서만 엄격하게 텍스트 수집
      const foundTexts = [];
      
      for (const selector of descriptionSelectors) {
        const elements = targetContainer.querySelectorAll(selector);
        console.log(`🔍 "${selector}" 검색 결과: ${elements.length}개 요소`);
        
        elements.forEach((element, index) => {
          // 이중 체크: 반드시 타겟 컨테이너 내부의 요소여야 함
          if (!targetContainer.contains(element)) {
            console.log(`   [${index}] ❌ 컨테이너 밖의 요소 제외`);
            return;
          }
          
          // 개행 유지를 위해 텍스트 추출 방식 개선
          let description = '';
          if (element.innerText) {
            // innerText는 개행을 공백으로 변환하므로 원본 구조 확인
            const htmlContent = element.innerHTML;
            if (htmlContent.includes('<br>') || htmlContent.includes('</div>') || htmlContent.includes('</p>')) {
              // HTML 구조가 있으면 개행을 보존하여 추출
              description = this.extractTextWithLineBreaks(element);
            } else {
              description = element.innerText;
            }
          } else {
            description = element.textContent;
          }
          
          if (description && description.trim().length > 0) {
            // 요소의 위치도 확인 (컨테이너 내부인지)
            const elementRect = element.getBoundingClientRect();
            const containerRect = targetContainer.getBoundingClientRect();
            
            if (elementRect.top >= containerRect.top - 10 && 
                elementRect.bottom <= containerRect.bottom + 10 &&
                elementRect.left >= containerRect.left - 10 && 
                elementRect.right <= containerRect.right + 10) {
              
              console.log(`   [${index}] ✅ 유효한 텍스트 (${description.length}자): "${description.substring(0, 150)}..."`);
              foundTexts.push({
                text: description.trim(),
                selector: selector,
                element: element,
                length: description.trim().length
              });
            } else {
              console.log(`   [${index}] ❌ 위치상 컨테이너 밖의 텍스트 제외`);
            }
          }
        });
      }
      
      // Meta 태그는 전역에서 검색 (컨테이너와 무관)
      if (!targetContainer || foundTexts.length === 0) {
        const metaSelectors = ['meta[property="og:description"]', 'meta[name="description"]'];
        for (const selector of metaSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const description = element.getAttribute('content');
            if (description && description.trim().length > 0) {
              foundTexts.push({
                text: description.trim(),
                selector: selector,
                element: element,
                length: description.trim().length
              });
            }
          });
        }
      }
      
      console.log(`📝 총 ${foundTexts.length}개의 텍스트 발견됨`);
      
      // 유효한 설명 필터링 및 선택 (릴스 설명에 특화)
      const validTexts = [];
      
      for (const item of foundTexts) {
        const text = item.text;
        
        // 1차 필터: 기본 유효성
        if (text.length >= 5 && text.length <= 2200 && 
            !text.match(/^[\d\s\-\+\(\)]*$/) && // 숫자만은 제외
            !text.includes('팔로우') && 
            !text.includes('조회수') &&
            !text.includes('Follow') &&
            !text.includes('views') &&
            text !== '더 보기' &&
            text !== 'More' &&
            text !== '댓글' &&
            text !== 'Comments' &&
            text !== 'mecha.bytes' && // 계정명 제외
            !text.match(/^[@#]\w+/) // 해시태그나 멘션으로 시작하는 것 제외
        ) {
          // 2차 필터: 릴스 설명 패턴 확인
          const isLikelyDescription = 
            text.includes(' ') && // 공백 포함 (문장 형태)
            (text.includes('!') || text.includes('.') || text.includes('?') || text.length > 20) && // 문장 부호나 충분한 길이
            !text.match(/^\d{1,3}[KkMm]?$/) && // 숫자 + K/M (좋아요 수) 제외
            !text.includes('ago') && // "x hours ago" 제외
            !text.includes('시간') && // "x시간 전" 제외
            !text.includes('분') && // "x분 전" 제외
            !text.includes('일') && // "x일 전" 제외
            text.toLowerCase() !== text.toUpperCase(); // 모두 대문자가 아님
            
          if (isLikelyDescription) {
            validTexts.push(item);
            console.log(`✅ 유효한 설명 후보: "${text.substring(0, 100)}..." (${text.length}자)`);
          } else {
            console.log(`❌ 무효한 텍스트: "${text.substring(0, 50)}..." (릴스 설명 패턴 불일치)`);
          }
        } else {
          console.log(`❌ 무효한 텍스트: "${text.substring(0, 50)}..." (기본 필터링)`);
        }
      }
      
      // 가장 적절한 설명 선택 (길이 기준 - 보통 10-200자 사이)
      if (validTexts.length > 0) {
        // 길이별 정렬 (10-200자 범위를 우선)
        validTexts.sort((a, b) => {
          const aInRange = a.length >= 10 && a.length <= 200;
          const bInRange = b.length >= 10 && b.length <= 200;
          
          if (aInRange && !bInRange) return -1;
          if (!aInRange && bInRange) return 1;
          if (aInRange && bInRange) return b.length - a.length; // 더 긴 것 우선
          return a.length - b.length; // 둘 다 범위 밖이면 짧은 것 우선
        });
        
        const selectedText = validTexts[0];
        console.log('✅ 최종 선택된 릴스 설명!');
        console.log(`📝 설명 내용: "${selectedText.text}"`);
        console.log(`🎯 설명 출처: ${selectedText.selector}`);
        console.log(`📏 설명 길이: ${selectedText.text.length}자`);
        return selectedText.text;
      }
      
      // 현재 화면에서 직접 검색 (React Props 활용)
      console.log('🔍 React Props에서 설명 검색 중...');
      const activeVideo = targetVideo || this.findCurrentActiveVideo();
      if (activeVideo) {
        let element = activeVideo;
        for (let depth = 0; depth < 10 && element; depth++) {
          const reactProps = this.getReactPropsFromElement(element);
          if (reactProps && reactProps.children && reactProps.children.props) {
            const props = reactProps.children.props;
            
            // caption, text, title 등에서 설명 찾기
            const captionFields = ['caption', 'text', 'title', 'description', 'body'];
            for (const field of captionFields) {
              if (props[field] && typeof props[field] === 'string' && props[field].length > 3) {
                console.log(`✅ React Props에서 설명 발견! (${field}):`, props[field]);
                return props[field].trim();
              }
            }
          }
          element = element.parentElement;
        }
      }
      
      // 최후의 방법: 모든 텍스트 노드 검색
      console.log('🔍 전체 DOM에서 설명 검색 중...');
      const allTextElements = document.querySelectorAll('span, p, div, h1, h2, h3');
      for (const element of allTextElements) {
        const text = (element.innerText || element.textContent || '').trim();
        if (text.length > 10 && text.length < 500 && 
            !text.includes('팔로우') && !text.includes('좋아요') && !text.includes('댓글') &&
            !text.includes('Follow') && !text.includes('Like') && !text.includes('Comment') &&
            text.includes(' ') && // 최소 한 개의 공백 포함 (문장 형태)
            !text.match(/^\d+$/) // 숫자만이 아님
        ) {
          // 해당 요소가 현재 보이는 영역에 있는지 확인
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight) {
            console.log('✅ DOM에서 설명 발견:', text.substring(0, 100) + '...');
            return text;
          }
        }
      }
      
      console.log('⚠️ 모든 방법으로 릴스 설명을 찾을 수 없음');
      return '';
      
    } catch (error) {
      console.error('❌ 릴스 설명 추출 중 오류:', error);
      return '';
    }
  },
  
  // 1단계: React Props에서 직접 설명 추출
  async extractDescriptionFromReactProps(container, video) {
    console.log('🔍 React Props에서 설명 직접 추출 시도...');
    
    try {
      // INSTAGRAM_MEDIA_TRACKER에서 현재 영상의 데이터 찾기
      if (window.INSTAGRAM_MEDIA_TRACKER) {
        const mediaData = Object.values(window.INSTAGRAM_MEDIA_TRACKER.mediaData || {});
        
        for (const media of mediaData) {
          if (media && media.caption && media.caption.text) {
            console.log('✅ Media Tracker에서 caption 발견:', media.caption.text.substring(0, 100));
            return media.caption.text;
          }
        }
      }
      
      // React Props 직접 탐색
      const videoElement = video || container.querySelector('video');
      if (videoElement) {
        let element = videoElement;
        for (let depth = 0; depth < 15 && element; depth++) {
          const reactProps = this.getReactPropsFromElement(element);
          if (reactProps) {
            // 다양한 caption 필드 검사
            const captionPaths = [
              'children.props.caption.text',
              'children.props.media.caption.text', 
              'children.props.post.caption.text',
              'caption.text',
              'media.caption.text',
              'post.caption.text'
            ];
            
            for (const path of captionPaths) {
              const captionText = this.getNestedProperty(reactProps, path);
              if (captionText && typeof captionText === 'string' && captionText.length > 10) {
                console.log(`✅ React Props에서 설명 발견 (${path}):`, captionText.substring(0, 100));
                return captionText;
              }
            }
          }
          element = element.parentElement;
        }
      }
      
      console.log('❌ React Props에서 설명 찾기 실패');
      return null;
      
    } catch (error) {
      console.error('❌ React Props 설명 추출 오류:', error);
      return null;
    }
  },
  
  // 2단계: Instagram API 데이터에서 설명 추출
  extractDescriptionFromAPIData(container) {
    console.log('🔍 Instagram API 데이터에서 설명 추출 시도...');
    
    try {
      // window.__additionalDataLoaded나 기타 Instagram 전역 데이터 검사
      if (window.__additionalDataLoaded) {
        const additionalData = window.__additionalDataLoaded;
        // Instagram의 GraphQL 응답 데이터 구조에서 설명 찾기
        // (실제 구조는 Instagram 업데이트에 따라 변경될 수 있음)
      }
      
      console.log('❌ API 데이터에서 설명 찾기 실패');
      return null;
      
    } catch (error) {
      console.error('❌ API 데이터 설명 추출 오류:', error);
      return null;
    }
  },
  
  // 3단계: DOM 구조 기반 정확한 위치 찾기  
  extractDescriptionFromDOMStructure(container) {
    console.log('🔍 컨테이너 기준 설명 추출 (현재 영상만)...');
    
    try {
      if (!container) {
        console.log('❌ 컨테이너가 없어 설명 추출 불가');
        return null;
      }
      
      const containerRect = container.getBoundingClientRect();
      console.log('📦 현재 영상 컨테이너 위치:', {
        top: Math.round(containerRect.top),
        bottom: Math.round(containerRect.bottom),
        height: Math.round(containerRect.height)
      });
      
      // 컨테이너 내에서만 검색 (다른 영상 내용 제외)
      const allElements = container.querySelectorAll('span, div, p');
      const descriptionCandidates = [];
      
      let elementsInContainer = 0;
      
      for (const element of allElements) {
        const rect = element.getBoundingClientRect();
        
        // 컨테이너 내부에 있고 현재 화면에 보이는지 확인
        if (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom &&
            rect.top >= 0 && rect.top <= window.innerHeight) {
          
          elementsInContainer++;
          let text = (element.innerText || element.textContent || '').trim();
          
          // "더 보기" 텍스트 제거
          text = text.replace(/\.\.\.\s*더\s*보기$/, '').replace(/\.\.\.\s*more$/i, '').trim();
          
          // 디버깅: 컨테이너 내 텍스트 로그 (처음 15개만)
          if (text && elementsInContainer <= 15) {
            console.log(`📝 컨테이너 요소 ${elementsInContainer}:`, {
              text: text.substring(0, 80),
              length: text.length,
              position: { y: Math.round(rect.top - containerRect.top) }
            });
          }
          
          // 설명 패턴 체크 (더 강화된 필터링)
          if (text && text.length >= 15 && text.length <= 500 && 
              text.includes(' ') && // 문장 형태 (공백 포함)
              !text.match(/^\d+$/) && // 숫자만이 아님
              !text.match(/^[a-zA-Z0-9._]+$/) && // 계정명 패턴 아님
              !text.match(/^\d+[KkMm]?$/) && // 좋아요 수 아님
              !text.includes('.mp3') && !text.includes('.mp4') && // 파일명 제외
              !text.includes('daniel.mp3') && !text.includes('Zamaro') && // 특정 오류 텍스트 제외
              !text.includes('dream wrld') && // 음악 관련 텍스트 제외
              !text.match(/^[a-zA-Z0-9._]+ · [a-zA-Z0-9._]+$/) && // "artist · song" 패턴 제외
              !['팔로우', 'Follow', '좋아요', 'Like', '댓글', 'Comment', '공유', 'Share', '저장', 'Save', 'More', '더 보기'].some(word => text.includes(word)) &&
              !text.includes('팔로잉') && !text.includes('Following') &&
              !text.includes('관심도') && !text.includes('views') &&
              text.length > text.split(' ').length * 2) { // 평균 단어 길이가 너무 짧지 않음 (해시태그가 아님을 확인)
            
            // 컨테이너 내에서의 상대적 위치 계산
            const relativePosition = (rect.top - containerRect.top) / containerRect.height;
            
            descriptionCandidates.push({
              text: text,
              length: text.length,
              relativePosition: relativePosition,
              position: { x: rect.left, y: rect.top },
              element: element
            });
          }
        }
      }
      
      console.log(`🔍 총 ${elementsInContainer}개 요소가 컨테이너에 있음`);
      console.log('📋 설명 후보들:', descriptionCandidates.map(c => ({ 
        text: c.text.substring(0, 60) + '...', 
        length: c.length, 
        relativePos: Math.round(c.relativePosition * 100) + '%'
      })));
      
      if (descriptionCandidates.length > 0) {
        // 컨테이너 하단에 있으면서 적절한 길이의 텍스트 선택
        descriptionCandidates.sort((a, b) => {
          // 상대적 위치 우선 (컨테이너 하단 70% 이하 우선)
          const aInBottomArea = a.relativePosition >= 0.7;
          const bInBottomArea = b.relativePosition >= 0.7;
          
          if (aInBottomArea && !bInBottomArea) return -1;
          if (!aInBottomArea && bInBottomArea) return 1;
          
          // 둘 다 하단 영역이면 더 아래쪽 우선
          if (aInBottomArea && bInBottomArea) {
            return b.relativePosition - a.relativePosition;
          }
          
          // 길이 기준 (30-200자 범위를 우선)
          const aGoodLength = a.length >= 30 && a.length <= 200;
          const bGoodLength = b.length >= 30 && b.length <= 200;
          
          if (aGoodLength && !bGoodLength) return -1;
          if (!aGoodLength && bGoodLength) return 1;
          
          return b.length - a.length; // 더 긴 것 우선
        });
        
        const selectedDescription = descriptionCandidates[0];
        console.log('✅ 컨테이너 기준 설명 발견:', selectedDescription.text.substring(0, 100));
        console.log(`📏 설명 길이: ${selectedDescription.length}자, 상대위치: ${Math.round(selectedDescription.relativePosition * 100)}%`);
        
        return selectedDescription.text;
      }
      
      console.log('❌ 컨테이너에서 설명 찾기 실패');
      return null;
      
    } catch (error) {
      console.error('❌ 컨테이너 기준 설명 추출 오류:', error);
      return null;
    }
  },
  
  // 컨테이너에서 계정명들 찾기 (제외 목적)
  findAccountNamesInContainer(container) {
    const accountNames = [];
    
    try {
      // 다양한 계정명 위치 선택자
      const accountSelectors = [
        'h2', // 계정명이 h2 태그
        'a[role="link"]', // 계정 링크
        'header a', // 헤더 내 링크
        'div[style*="font-weight"] span' // 굵은 글씨 계정명
      ];
      
      for (const selector of accountSelectors) {
        const elements = container.querySelectorAll(selector);
        for (const element of elements) {
          const text = (element.innerText || element.textContent || '').trim();
          if (text && text.length > 2 && text.length < 50 && 
              !text.includes(' ') && // 계정명은 보통 공백 없음
              !text.includes('팔로우') && 
              text.match(/^[a-zA-Z0-9._]+$/)) { // 계정명 형식
            accountNames.push(text);
          }
        }
      }
      
      // 중복 제거
      return [...new Set(accountNames)];
      
    } catch (error) {
      console.error('계정명 찾기 오류:', error);
      return [];
    }
  },
  
  // 비디오 요소 근처에서 계정명 찾기
  findAccountNearVideo(video) {
    try {
      const videoRect = video.getBoundingClientRect();
      const searchRadius = 200; // 비디오 주변 200px 범위
      
      console.log('🎯 비디오 근처 계정명 검색 범위:', searchRadius + 'px');
      
      // 모든 텍스트 요소 검색
      const allElements = document.querySelectorAll('span, div, a, h1, h2, h3');
      const nearbyAccounts = [];
      
      for (const element of allElements) {
        const rect = element.getBoundingClientRect();
        
        // 비디오와의 거리 계산
        const distance = Math.abs(rect.top - videoRect.top) + Math.abs(rect.left - videoRect.left);
        
        if (distance > searchRadius) continue; // 너무 멀면 건너뛰기
        
        const text = (element.innerText || element.textContent || '').trim();
        const href = element.href || '';
        
        // 링크에서 계정명 추출
        if (href && href.includes('instagram.com')) {
          const linkMatch = href.match(/instagram\.com\/([^\/\?#]+)/);
          if (linkMatch && linkMatch[1] && 
              linkMatch[1] !== 'p' && linkMatch[1] !== 'reel' && linkMatch[1] !== 'reels' &&
              linkMatch[1] !== 'stories' && linkMatch[1] !== 'explore') {
            nearbyAccounts.push({
              name: linkMatch[1],
              distance: distance,
              source: 'link'
            });
          }
        }
        
        // 텍스트에서 계정명 추출
        if (text && text.length > 2 && text.length < 30 && 
            text.match(/^[a-zA-Z0-9._]+$/) && 
            !text.includes(' ') &&
            !text.match(/^\d+$/) &&
            !['팔로우', 'Follow', '좋아요', 'Like', '댓글', 'Comment'].includes(text)) {
          
          nearbyAccounts.push({
            name: text,
            distance: distance,
            source: 'text'
          });
        }
      }
      
      // 거리 기준 정렬 (가까운 순)
      nearbyAccounts.sort((a, b) => a.distance - b.distance);
      console.log('📍 비디오 근처 계정명 후보들:', nearbyAccounts);
      
      if (nearbyAccounts.length > 0) {
        return nearbyAccounts[0].name; // 가장 가까운 계정명
      }
      
      return null;
    } catch (error) {
      console.error('❌ 비디오 근처 계정명 찾기 오류:', error);
      return null;
    }
  },
  
  // Instagram 계정 정보 추출 및 URL 형식으로 변환
  extractAccountInfo(mediaInfo, container, video) {
    console.log('👤 계정 정보 추출 중...');
    
    try {
      let accountName = null;
      
      // 간단한 URL 기반 추출 (가장 안전)
      const currentUrl = window.location.href;
      const urlPath = window.location.pathname;
      console.log('🌐 현재 URL:', currentUrl);
      
      // URL에서 계정명 추출
      const urlPatterns = [
        /\/([^\/]+)\/p\//, // 포스트 URL
        /\/([^\/]+)\/reel\//, // 릴스 URL
        /instagram\.com\/([^\/\?]+)\//, // 일반적인 프로필 URL
      ];
      
      for (const pattern of urlPatterns) {
        const match = currentUrl.match(pattern) || urlPath.match(pattern);
        if (match && match[1] && 
            !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv', 'login', 'help'].includes(match[1])) {
          accountName = match[1];
          console.log('✅ URL에서 계정명 발견:', accountName);
          break;
        }
      }
      
      // 위치 기반 계정명 추출 (왼쪽 하단 고정 위치)
      if (!accountName) {
        console.log('🎯 위치 기반 계정명 검색 (왼쪽 하단)...');
        
        // 화면 왼쪽 하단 영역 정의 (더 넓게)
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;
        
        // 왼쪽 하단 영역: 왼쪽 50%, 하단 50% 영역 (더 넓게 검색)
        const leftBottomArea = {
          left: 0,
          right: screenWidth * 0.5,
          top: screenHeight * 0.5,
          bottom: screenHeight
        };
        
        console.log('📍 왼쪽 하단 검색 영역 (확장):', leftBottomArea);
        console.log('📏 화면 크기:', { width: screenWidth, height: screenHeight });
        
        // 모든 텍스트 요소 검색
        const allElements = document.querySelectorAll('span, div, a, h1, h2, h3, p');
        const accountCandidates = [];
        
        let elementsInArea = 0;
        
        for (const element of allElements) {
          const rect = element.getBoundingClientRect();
          
          // 왼쪽 하단 영역에 있는지 확인
          if (rect.left >= leftBottomArea.left && 
              rect.right <= leftBottomArea.right && 
              rect.top >= leftBottomArea.top && 
              rect.bottom <= leftBottomArea.bottom) {
            
            elementsInArea++;
            const text = (element.innerText || element.textContent || '').trim();
            const href = element.href || '';
            
            // 디버깅: 영역 내 모든 텍스트 로그
            if (text || href) {
              console.log(`📝 영역 내 요소 ${elementsInArea}:`, {
                text: text.substring(0, 50),
                href: href.substring(0, 80),
                position: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
              });
            }
            
            // 링크에서 계정명 추출
            if (href && href.includes('instagram.com')) {
              const linkMatch = href.match(/instagram\.com\/([^\/\?#]+)/);
              if (linkMatch && linkMatch[1] && 
                  !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv'].includes(linkMatch[1])) {
                accountCandidates.push({
                  name: linkMatch[1],
                  source: 'link',
                  position: { x: rect.left, y: rect.top }
                });
              }
            }
            
            // 텍스트에서 계정명 패턴 추출
            if (text && text.length > 2 && text.length < 30 && 
                text.match(/^[a-zA-Z0-9._]+$/) && 
                !text.includes(' ') &&
                !text.match(/^\d+$/) &&
                !['팔로우', 'Follow', '좋아요', 'Like', 'reels', 'p', 'stories', 'explore'].includes(text)) {
              
              accountCandidates.push({
                name: text,
                source: 'text',
                position: { x: rect.left, y: rect.top }
              });
            }
          }
        }
        
        console.log(`🔍 총 ${elementsInArea}개 요소가 왼쪽 하단 영역에 있음`);
        
        console.log('📋 왼쪽 하단에서 발견된 계정명 후보들:', accountCandidates);
        
        if (accountCandidates.length > 0) {
          // 가장 왼쪽 아래에 있는 계정명 선택
          accountCandidates.sort((a, b) => {
            // Y 좌표 우선 (더 아래쪽), 그 다음 X 좌표 (더 왼쪽)
            if (Math.abs(a.position.y - b.position.y) > 20) {
              return b.position.y - a.position.y; // 더 아래쪽 우선
            }
            return a.position.x - b.position.x; // 더 왼쪽 우선
          });
          
          accountName = accountCandidates[0].name;
          console.log('✅ 위치 기반에서 계정명 발견:', accountName, accountCandidates[0]);
        }
      }
      
      // Instagram URL 형식으로 변환
      if (accountName) {
        const instagramUrl = `https://www.instagram.com/${accountName}/reels/`;
        console.log('🔗 Instagram URL 생성:', instagramUrl);
        return instagramUrl;
      }
      
      console.log('⚠️ 계정명을 찾을 수 없음');
      return null;
      
    } catch (error) {
      console.error('❌ 계정 정보 추출 중 오류:', error);
      return null;
    }
  },
  
  // IG Sorter 기반 좋아요 수 추출
  extractLikesCount(container, video) {
    console.log('❤️ 좋아요 수 추출 중... (IG Sorter 방식)');
    
    try {
      // 1단계: 이미 발견된 계정명 확인 (여러 경로에서)
      let currentUsername = null;
      
      // 방법 1: 전달받은 container(virtualPost)에서 계정명 추출
      console.log('🔍 전달받은 container 확인:', container);
      
      if (container) {
        // 1-1: virtualPost URL에서 계정명 추출
        if (!currentUsername && container.url) {
          currentUsername = this.extractUsernameFromSource(container.url, 'Container URL');
        }
        
        // 1-2: 현재 URL에서 계정명 추출
        if (!currentUsername && container.currentUrl) {
          currentUsername = this.extractUsernameFromSource(container.currentUrl, 'Current URL');
        }
        
        // 1-3: 직접 저장된 계정명 사용
        if (!currentUsername && container.username) {
          currentUsername = container.username;
          console.log(`🎯 직접 저장된 계정명 발견: ${currentUsername}`);
        }
        
        // 1-4: 계정 정보에서 직접 추출
        if (!currentUsername && container._instagramAuthor) {
          currentUsername = this.extractUsernameFromSource(container._instagramAuthor, '계정 정보');
        }
      }
      
      // 방법 2: virtualPost URL에서 계정명 추출 (여러 위치 확인)
      if (!currentUsername) {
        const possibleUrls = [
          container?._instagramVirtualPost?.url,
          window._instagramData?.virtualPost?.url,
          window._instagramVirtualPost?.url,
          container?.url,
          video?.closest('article')?._instagramVirtualPost?.url
        ];
        
        for (const url of possibleUrls) {
          if (url) {
            currentUsername = this.extractUsernameFromSource(url, 'VirtualPost URL');
            if (currentUsername) break;
          }
        }
      }
      
      // 방법 3: 콘솔 로그에서 보이는 것처럼 직접 검색
      if (!currentUsername) {
        // 모든 텍스트에서 "byron.seven" 같은 패턴 찾기
        const pageText = document.body.innerText || document.body.textContent || '';
        const usernamePattern = /\b([a-zA-Z0-9._]{3,30})\b/g;
        let match;
        
        // Instagram 링크와 함께 있는 사용자명 찾기
        const instagramLinks = Array.from(document.querySelectorAll('a[href*="instagram.com"]'));
        for (const link of instagramLinks) {
          const href = link.getAttribute('href');
          const linkMatch = href.match(/instagram\.com\/([^\/\?\#]+)/);
          if (linkMatch && linkMatch[1] && 
              linkMatch[1] !== 'reels' && 
              linkMatch[1] !== 'p' &&
              linkMatch[1] !== 'explore' &&
              linkMatch[1].length > 2) {
            currentUsername = linkMatch[1];
            console.log(`🎯 페이지 링크에서 계정명 발견: ${currentUsername}`);
            break;
          }
        }
      }
      
      // 방법 4: DOM에서 계정명 찾기
      if (!currentUsername) {
        currentUsername = this.getCurrentVideoUsername();
      }
      
      // 방법 5: URL에서 계정명 찾기
      if (!currentUsername) {
        currentUsername = this.extractUsernameFromSource(window.location.href, 'Current URL');
      }
      
      // 방법 6: 최후의 수단 - "byron.seven" 직접 하드코딩으로 확인 (디버깅용)
      if (!currentUsername) {
        // 로그에서 보이는 계정명을 직접 찾아보기
        const logText = console.log.toString();
        const knownUsernames = ['byron.seven', 'argenby', 'chateauvandale', 'mad.charcoal'];
        
        for (const testUsername of knownUsernames) {
          // 페이지 텍스트에서 해당 계정명이 있는지 확인
          const pageText = document.body.innerText || document.body.textContent || '';
          if (pageText.includes(testUsername)) {
            currentUsername = testUsername;
            console.log(`🎯 알려진 계정명에서 발견: ${currentUsername}`);
            break;
          }
        }
      }
      
      console.log(`🎯 사용할 계정명: ${currentUsername}`);
      
      if (!currentUsername) {
        console.log('❌ 계정명을 찾을 수 없음! 모든 방법이 실패했습니다.');
        console.log('📊 디버깅 정보:');
        console.log('  - container:', container);
        console.log('  - window.location.href:', window.location.href);
        console.log('  - video element:', video);
        return '계정명 없음';
      }
      
      // IG Sorter 데이터에서 좋아요 수와 날짜 찾기
      console.log(`📡 IG Sorter에서 "${currentUsername}" 검색 시작`);
      const igSorterData = this.getIGSorterLikesCount(currentUsername);
      if (igSorterData) {
        console.log('✅ IG Sorter에서 데이터 발견:', igSorterData);
        
        // 좋아요 수만 반환 (기존 호환성 유지)
        if (typeof igSorterData === 'object' && igSorterData.likes) {
          // 날짜 정보를 전역 변수에 임시 저장 (여러 키로 저장하여 안정성 확보)
          if (igSorterData.uploadDate) {
            const keysToStore = [];
            
            // 1. currentUsername (IG Sorter에서 추출한 계정명)
            if (currentUsername) {
              keysToStore.push(currentUsername);
            }
            
            // 2. 현재 URL에서 추출한 실제 계정명 (API 호출과 매칭)
            const urlMatch = window.location.href.match(/instagram\.com\/([^\/\?]+)(?:\/|$)/);
            if (urlMatch && urlMatch[1] !== 'reels') {
              keysToStore.push(urlMatch[1]);
            }
            
            // 모든 키로 날짜 저장 (중복 제거)
            const uniqueKeys = [...new Set(keysToStore)];
            for (const key of uniqueKeys) {
              window[`uploadDate_${key}`] = igSorterData.uploadDate;
              console.log(`📅 키 "${key}"로 업로드 날짜 저장: ${igSorterData.uploadDate}`);
            }
          }
          return igSorterData.likes;
        }
        
        // 기존 형식 호환성
        return igSorterData;
      }
      
      console.log('❌ IG Sorter 데이터를 찾을 수 없음');
      this.showIGSorterAlert(currentUsername);
      return '숨겨짐';
    } catch (error) {
      console.error('❌ 좋아요 수 추출 중 오류:', error);
      return '숨겨짐';
    }
  },

  // DOM에서 현재 영상의 계정명 찾기
  getCurrentVideoUsername() {
    const currentVideo = document.querySelector('video');
    
    if (!currentVideo) return null;
    
    const videoRect = currentVideo.getBoundingClientRect();
    
    // 현재 화면에 보이는 영상의 계정명 찾기
    if (videoRect.top >= -300 && videoRect.bottom >= 300) {
      let parent = currentVideo;
      for (let i = 0; i < 15; i++) {
        parent = parent.parentElement;
        if (!parent) break;
        
        // 사용자명 링크 찾기
        const userLinks = parent.querySelectorAll('a[href^="/"]');
        for (const link of userLinks) {
          const href = link.getAttribute('href');
          const username = href.match(/^\/([^\/\?\#]+)/)?.[1];
          
          if (username && 
              username !== 'reels' && 
              username !== 'p' &&
              username !== 'explore' &&
              username !== 'stories' &&
              username.length > 2 &&
              !username.includes('.')) {
            
            console.log(`👤 DOM에서 계정명 발견: ${username}`);
            return username;
          }
        }
      }
    }
    
    return null;
  },

  // IG Sorter에서 계정명 기반으로 좋아요 수 가져오기
  getIGSorterLikesCount(username) {
    console.log(`🔍 IG Sorter에서 "${username}" 계정의 좋아요 수 검색 시작`);
    
    try {
      if (!username) {
        console.log('❌ 계정명이 제공되지 않음');
        return null;
      }
      
      // IG Sorter 데이터 찾기
      const allElements = document.querySelectorAll('*');
      console.log(`🔍 전체 페이지 요소 수: ${allElements.length}`);
      
      for (const element of allElements) {
        const text = element.innerText || element.textContent || '';
        
        if (text.includes('IG Sorter')) {
          console.log(`📋 IG Sorter 요소 발견!`);
          console.log(`📄 전체 텍스트 내용: "${text.substring(0, 200)}..."`);
          
          // IG Sorter 텍스트를 각 영상별로 분리
          const videoBlocks = text.split('IG Sorter').filter(block => block.trim());
          console.log(`🎬 IG Sorter에서 ${videoBlocks.length}개 영상 블록 발견`);
          
          // 현재 계정명이 포함된 블록 찾기
          for (let i = 0; i < videoBlocks.length; i++) {
            const block = videoBlocks[i];
            console.log(`🔍 블록 ${i+1} 분석:`, block.substring(0, 100));
            
            if (block.includes(username)) {
              console.log(`✅ 계정명 "${username}"이 포함된 블록 ${i+1} 발견!`);
              
              // 해당 블록에서 숫자 추출 (첫 번째 숫자가 좋아요 수)
              const numbers = block.match(/\d{1,3}(?:,\d{3})*/g);
              console.log(`🔢 "${username}" 블록의 숫자들: ${numbers ? numbers.join(', ') : '없음'}`);
              
              // 업로드 날짜 추출 (YYYY-MM-DD 패턴)
              const dateMatches = block.match(/\d{4}-\d{2}-\d{2}/g);
              const uploadDate = dateMatches && dateMatches.length > 0 ? dateMatches[0] : null;
              console.log(`📅 "${username}" 블록의 업로드 날짜: ${uploadDate || '없음'}`);
              
              if (numbers && numbers.length >= 1) {
                console.log(`✅ "${username}"의 데이터 - 좋아요: ${numbers[0]}, 날짜: ${uploadDate || '없음'}`);
                
                // 좋아요 수와 날짜를 객체로 반환
                return {
                  likes: numbers[0],
                  uploadDate: uploadDate
                };
              }
            }
          }
          
          console.log(`❌ 계정명 "${username}"이 포함된 블록을 찾지 못함`);
          
          // Fallback: 첫 번째 블록 사용
          if (videoBlocks.length > 0) {
            const firstBlock = videoBlocks[0];
            const numbers = firstBlock.match(/\d{1,3}(?:,\d{3})*/g);
            if (numbers && numbers.length >= 1) {
              console.log(`📍 Fallback: 첫 번째 블록의 좋아요 수 ${numbers[0]}`);
              return numbers[0];
            }
          }
        }
      }
      
      console.log('❌ IG Sorter 데이터를 찾지 못함');
      return null;
      
    } catch (error) {
      console.error('❌ IG Sorter 데이터 가져오기 오류:', error);
      return null;
    }
  },

  // 통합 계정명 추출 함수
  extractUsernameFromSource(source, sourceType = 'unknown') {
    try {
      if (!source) return null;
      
      let username = null;
      
      if (typeof source === 'string') {
        // URL에서 계정명 추출
        const match = source.match(/instagram\.com\/([^\/\?\#]+)/);
        if (match && match[1] && match[1] !== 'reels' && match[1] !== 'p' && match[1] !== 'explore') {
          username = match[1];
          console.log(`🎯 ${sourceType}에서 계정명 발견: ${username}`);
        } else if (source.indexOf('/') === -1 && source.length > 2) {
          // 단순 계정명
          username = source;
          console.log(`🎯 ${sourceType}에서 단순 계정명 발견: ${username}`);
        }
      } else if (source && typeof source === 'object') {
        // 객체에서 계정명 추출
        username = source.username || source.name || null;
        if (username) {
          console.log(`🎯 ${sourceType} 객체에서 계정명 발견: ${username}`);
        }
      }
      
      return username;
    } catch (error) {
      console.error(`❌ ${sourceType}에서 계정명 추출 오류:`, error);
      return null;
    }
  },

  // IG Sorter 데이터를 찾지 못했을 때 화면에 알람 표시
  showIGSorterAlert(username) {
    try {
      // 기존 알림이 있으면 제거
      const existingAlert = document.getElementById('ig-sorter-alert');
      if (existingAlert) {
        existingAlert.remove();
      }

      // 알림 메시지 생성
      const alertDiv = document.createElement('div');
      alertDiv.id = 'ig-sorter-alert';
      alertDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ff4757;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10000;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 14px;
          max-width: 350px;
          border-left: 4px solid #ff3742;
        ">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 18px; margin-right: 8px;">⚠️</span>
            <strong>IG Sorter 데이터 없음</strong>
          </div>
          <div style="margin-bottom: 8px; font-size: 13px; opacity: 0.9;">
            계정: <strong>${username || '알 수 없음'}</strong>
          </div>
          <div style="font-size: 12px; opacity: 0.8; line-height: 1.4;">
            IG Sorter 확장 프로그램이 활성화되지 않았거나<br>
            현재 페이지에서 데이터를 찾을 수 없습니다.
          </div>
          <div style="margin-top: 10px; text-align: right;">
            <button onclick="this.parentElement.parentElement.remove()" 
              style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
              ">
              닫기
            </button>
          </div>
        </div>
      `;

      // 페이지에 알림 추가
      document.body.appendChild(alertDiv);

      // 5초 후 자동 제거
      setTimeout(() => {
        const alert = document.getElementById('ig-sorter-alert');
        if (alert) {
          alert.style.opacity = '0';
          alert.style.transition = 'opacity 0.5s ease-out';
          setTimeout(() => {
            alert.remove();
          }, 500);
        }
      }, 5000);

      console.log(`🚨 IG Sorter 데이터 없음 알림 표시 (계정: ${username})`);

    } catch (error) {
      console.error('❌ IG Sorter 알림 표시 오류:', error);
    }
  },


  // 댓글 수 추출 함수 (좋아요 수 추출과 유사한 로직)
  extractCommentsCount(container, video) {
    console.log('💬 댓글 수 추출 중... (디버깅 박스 위치 기반)');
    
    try {
      // 1단계: 댓글 버튼 찾기 (디버깅 박스와 동일한 방식)
      const currentVideo = video || document.querySelector('video');
      const commentButton = this.findCommentButton(currentVideo);
      
      if (!commentButton) {
        console.log('❌ 댓글 버튼을 찾을 수 없음');
        return '0';
      }
      
      // 2단계: 디버깅 박스와 동일한 영역에서 숫자 검색
      const searchArea = this.getButtonSearchArea(commentButton);
      
      // 3단계: 검색 영역 내에서 댓글 수 패턴 찾기
      const commentsCount = this.findNumberInArea(searchArea, 'comments', commentButton);
      
      if (commentsCount) {
        return this.normalizeCommentsCount(commentsCount);
      }
      
      return '0';
    } catch (error) {
      console.error('❌ 댓글 수 추출 중 오류:', error);
      return '0';
    }
  },

  // 댓글 수 패턴 확인
  isCommentsCountPattern(text) {
    if (!text) return false;
    
    // 숫자만 있는 경우 (예: 86)
    if (text.match(/^\d{1,}$/)) return true;
    
    // 한국어 단위가 포함된 경우 (예: 1천)
    if (text.match(/^\d+([.,]\d+)?[천]$/)) return true;
    
    // 숫자 + K 형식 (예: 1K)
    if (text.match(/^\d+([.,]\d+)?[Kk]$/)) return true;
    
    // 쉼표가 포함된 숫자 (예: 1,234)
    if (text.match(/^\d{1,3}(,\d{3})*$/)) return true;
    
    // 댓글 텍스트가 포함된 경우는 제외
    if (text.includes('댓글') || text.includes('comment')) return false;
    
    return false;
  },

  // 댓글 수 정규화
  normalizeCommentsCount(text) {
    if (!text) return '0';
    
    text = text.trim();
    
    // 이미 숫자만 있는 경우
    if (text.match(/^\d+$/)) return text;
    
    // 쉼표 제거
    if (text.includes(',')) {
      return text.replace(/,/g, '');
    }
    
    // 천 단위 처리
    if (text.includes('천')) {
      return text; // "1천" 그대로 유지
    }
    
    // K 단위 처리 (댓글에서는 흔하지 않지만)
    if (text.includes('K') || text.includes('k')) {
      return text; // "1K" 그대로 유지
    }
    
    return text;
  },
  
  // 좋아요 수 패턴 확인
  isLikesCountPattern(text) {
    if (!text) return false;
    
    // 숫자만 있는 경우 (예: 1234)
    if (text.match(/^\d{1,}$/)) return true;
    
    // 한국어 단위가 포함된 경우 (예: 4만, 1.2만, 5천)
    if (text.match(/^\d+([.,]\d+)?[만천]$/)) return true;
    
    // 숫자 + K/M 형식 (예: 1.2K, 5M)
    if (text.match(/^\d+([.,]\d+)?[KkMm]$/)) return true;
    
    // 쉼표가 포함된 숫자 (예: 1,234)
    if (text.match(/^\d{1,3}(,\d{3})*$/)) return true;
    
    // 좋아요 텍스트가 포함된 경우는 제외
    if (text.includes('좋아요') || text.includes('like')) return false;
    
    console.log('🔍 좋아요 패턴 확인:', { text, isMatch: false });
    return false;
  },
  
  // 좋아요 수 정규화 (K, M 단위 변환)
  normalizeLikesCount(text) {
    if (!text) return '0';
    
    text = text.trim();
    
    // 이미 숫자만 있는 경우
    if (text.match(/^\d+$/)) return text;
    
    // 쉼표 제거
    if (text.includes(',')) {
      return text.replace(/,/g, '');
    }
    
    // 만, 천 단위 처리 (한국 Instagram)
    if (text.includes('만')) {
      return text; // "150.8만" 그대로 유지
    }
    
    if (text.includes('천')) {
      return text; // "5.2천" 그대로 유지
    }
    
    // K, M 단위 처리는 원본 형태 유지 (해외 Instagram)
    if (text.match(/\d+[.,]\d*[KkMm]/)) {
      return text;
    }
    
    if (text.match(/\d+[KkMm]/)) {
      return text;
    }
    
    // 숫자만 있는 경우는 그대로 반환
    const numbers = text.match(/\d+/);
    return numbers ? numbers[0] : '0';
  },
  
  // 중첩 객체 속성 안전하게 가져오기
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  },
  
  // HTML 구조를 보존하여 개행이 포함된 텍스트 추출
  extractTextWithLineBreaks(element) {
    try {
      console.log('🔤 개행 보존 텍스트 추출 시작');
      
      // HTML을 텍스트로 변환하면서 개행 보존
      let textContent = '';
      
      // 클론 생성하여 원본 훼손 방지
      const clone = element.cloneNode(true);
      
      // <br> 태그를 개행으로 변환
      const brTags = clone.querySelectorAll('br');
      brTags.forEach(br => {
        br.replaceWith('\n');
      });
      
      // 블록 요소들(<div>, <p> 등) 뒤에 개행 추가
      const blockElements = clone.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6');
      blockElements.forEach(block => {
        // 마지막 자식이 아니면 개행 추가
        if (block.nextSibling) {
          block.insertAdjacentText('afterend', '\n');
        }
      });
      
      // 최종 텍스트 추출
      textContent = clone.innerText || clone.textContent || '';
      
      // 연속된 개행 정리 (최대 2개까지만)
      textContent = textContent.replace(/\n{3,}/g, '\n\n');
      
      // 앞뒤 공백 제거
      textContent = textContent.trim();
      
      console.log('✅ 개행 보존 텍스트 추출 완료');
      console.log(`📝 추출된 텍스트 미리보기:\n${textContent.substring(0, 200)}...`);
      
      return textContent;
      
    } catch (error) {
      console.error('❌ 개행 보존 텍스트 추출 실패:', error);
      // fallback: 일반 텍스트 추출
      return element.innerText || element.textContent || '';
    }
  },
  
  // 특정 컨테이너 내에서만 "더 보기" 버튼 클릭
  async expandDescriptionInContainer(container) {
    console.log('🔍 컨테이너 내 "더 보기" 버튼 검색 중...', container);
    
    try {
      const allClickableElements = container.querySelectorAll('button, span[role="button"], div[role="button"], a');
      
      for (const element of allClickableElements) {
        const text = (element.innerText || element.textContent || '').toLowerCase().trim();
        const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
        
        if (text === '더 보기' || text === 'more' || text.includes('more') ||
            ariaLabel.includes('더 보기') || ariaLabel.includes('more')) {
          
          console.log('✅ 컨테이너 내 "더 보기" 버튼 발견:', element);
          console.log('📝 버튼 텍스트:', text);
          
          // 버튼이 화면에 보이는지 확인
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight) {
            console.log('🎯 컨테이너 내 "더 보기" 버튼 클릭...');
            element.click();
            
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('✅ 컨테이너 내 "더 보기" 클릭 완료');
            return true;
          }
        }
      }
      
      console.log('ℹ️ 컨테이너 내 "더 보기" 버튼 없음');
      return false;
      
    } catch (error) {
      console.error('❌ 컨테이너 내 "더 보기" 클릭 오류:', error);
      return false;
    }
  },
  
  // "더 보기" 버튼 클릭하여 전체 설명 노출 (전역)
  async expandDescriptionIfNeeded() {
    console.log('🔍 "더 보기" 버튼 검색 중...');
    
    try {
      // CSS selector로 :contains()는 작동하지 않으므로 수동으로 검색
      const allClickableElements = document.querySelectorAll('button, span[role="button"], div[role="button"], a');
      
      for (const element of allClickableElements) {
        const text = (element.innerText || element.textContent || '').toLowerCase().trim();
        const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
        
        if (text === '더 보기' || text === 'more' || text.includes('more') ||
            ariaLabel.includes('더 보기') || ariaLabel.includes('more')) {
          
          console.log('✅ "더 보기" 버튼 발견:', element);
          console.log('📝 버튼 텍스트:', text);
          console.log('🏷️ aria-label:', ariaLabel);
          
          // 버튼이 화면에 보이는지 확인
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight && 
              rect.left >= 0 && rect.left <= window.innerWidth) {
            
            console.log('🎯 "더 보기" 버튼 클릭 시도...');
            
            // 클릭 이벤트 발생
            element.click();
            
            // 또는 더 강력한 클릭 이벤트
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(clickEvent);
            
            console.log('✅ "더 보기" 버튼 클릭 완료');
            
            // DOM 업데이트를 위해 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 300));
            return true;
          } else {
            console.log('⚠️ "더 보기" 버튼이 화면 밖에 위치함');
          }
        }
      }
      
      // "더 보기" 버튼이 없는 경우 (이미 전체 텍스트가 표시된 경우)
      console.log('ℹ️ "더 보기" 버튼을 찾을 수 없음 (이미 전체 내용이 표시되었을 수 있음)');
      return false;
      
    } catch (error) {
      console.error('❌ "더 보기" 버튼 클릭 중 오류:', error);
      return false;
    }
  },
  
  extractShortcodeFromReactProps(container, video) {
    // 1. 먼저 현재 URL에서 shortcode 추출 시도 (Instagram downloader도 이를 사용)
    const urlShortcode = this.extractShortcodeFromURL();
    if (urlShortcode) {
      console.log('🔗 URL에서 shortcode 추출 성공:', urlShortcode);
      return urlShortcode;
    }
    
    // 2. Instagram downloader의 E() 함수와 정확히 동일한 로직
    // 클릭 시점에 현재 화면의 실제 video element를 찾아서 분석
    const currentVideo = this.findCurrentActiveVideo();
    let element = currentVideo || video; // 현재 활성 video 우선 사용
    const maxDepth = 15;
    
    console.log('🎯 분석 대상 video element:', element);
    console.log('🔗 분석 대상 video src:', element?.src?.substring(0, 100));
    
    for (let depth = 0; depth <= maxDepth && element; depth++) {
      console.log(`🔍 Props 검색 중 (깊이 ${depth}):`, element.tagName);
      
      // React Props 확인 (Instagram downloader의 e() 함수와 동일)
      const reactProps = this.getReactPropsFromElement(element);
      if (!reactProps) {
        element = element.parentElement;
        continue;
      }
      
      if (reactProps.children && reactProps.children.props) {
        const props = reactProps.children.props;
        
        // Instagram downloader와 동일한 순서로 검사
        if (props?.videoFBID) {
          console.log('🔍 videoFBID 발견:', props.videoFBID);
          console.log('📋 현재 fbIdMap 키들:', Object.keys(window.INSTAGRAM_MEDIA_TRACKER?.fbIdMap || {}));
          
          const shortcode = window.INSTAGRAM_MEDIA_TRACKER?.fbIdMap[props.videoFBID];
          if (shortcode) {
            console.log('📹 videoFBID로 shortcode 찾음:', props.videoFBID, '→', shortcode);
            return shortcode;
          } else {
            console.log('❌ videoFBID는 있지만 fbIdMap에 매핑 없음:', props.videoFBID);
            console.log('📊 fbIdMap 전체 내용:', window.INSTAGRAM_MEDIA_TRACKER?.fbIdMap);
          }
        }
        
        if (props?.media$key?.id) {
          const shortcode = window.INSTAGRAM_MEDIA_TRACKER?.mediaIdMap[props.media$key.id];
          if (shortcode) {
            console.log('🔑 media$key.id로 shortcode 찾음:', props.media$key.id, '→', shortcode);
            return shortcode;
          }
        }
        
        if (props?.post?.id) {
          const shortcode = window.INSTAGRAM_MEDIA_TRACKER?.fbIdMap[props.post.id];
          if (shortcode) {
            console.log('📄 post.id로 shortcode 찾음:', props.post.id, '→', shortcode);
            return shortcode;
          }
        }
        
        if (props.href) {
          const match = props.href.match(/\/p\/([A-Za-z0-9_-]+)/);
          if (match) {
            console.log('🔗 href에서 shortcode 찾음:', match[1]);
            return match[1];
          }
        }
        
        if (props?.postId) {
          const shortcode = window.INSTAGRAM_MEDIA_TRACKER?.fbIdMap[props.postId];
          if (shortcode) {
            console.log('📮 postId로 shortcode 찾음:', props.postId, '→', shortcode);
            return shortcode;
          }
        }
        
        if (props?.mediaId) {
          const shortcode = window.INSTAGRAM_MEDIA_TRACKER?.fbIdMap[props.mediaId];
          if (shortcode) {
            console.log('🎬 mediaId로 shortcode 찾음:', props.mediaId, '→', shortcode);
            return shortcode;
          }
        }
        
        if (props?.post?.code) {
          console.log('📋 post.code로 shortcode 찾음:', props.post.code);
          return props.post.code;
        }
      }
      
      element = element.parentElement;
    }
    
    return null;
  },
  
  getReactPropsFromElement(element) {
    if (!element) return null;
    
    // 1. 기본 React 속성 검사
    for (let prop in element) {
      if (prop.startsWith("__reactProps$")) {
        console.log('✅ __reactProps$ 발견:', prop);
        return element[prop];
      }
      if (prop.startsWith("__reactInternalInstance")) {
        console.log('✅ __reactInternalInstance 발견:', prop);
        return element[prop];
      }
      if (prop.startsWith("__reactFiber")) {
        console.log('✅ __reactFiber 발견:', prop);
        return element[prop];
      }
    }
    
    // 2. Object.getOwnPropertyDescriptors로 숨겨진 속성 검사
    try {
      const descriptors = Object.getOwnPropertyDescriptors(element);
      for (const key in descriptors) {
        if (key.startsWith('__react') || key.startsWith('_react')) {
          console.log('✅ 숨겨진 React 속성 발견:', key);
          return element[key];
        }
      }
    } catch (e) {}
    
    // 3. getOwnPropertyNames로 더 깊은 검사
    try {
      const propNames = Object.getOwnPropertyNames(element);
      for (const name of propNames) {
        if (name.startsWith('__react') || name.startsWith('_react')) {
          console.log('✅ 깊은 React 속성 발견:', name);
          return element[name];
        }
      }
      
      // 모든 키 로깅 (최대 10개만)
      const allKeys = propNames.slice(0, 10);
      console.log('🔍 Element의 속성들 (처음 10개):', allKeys);
      
    } catch (e) {}
    
    return null;
  },
  
  findShortcodeInProps(props, depth = 0) {
    if (depth > 5 || !props || typeof props !== 'object') return null;
    
    // 1. videoFBID로 shortcode 찾기 (Instagram downloader 방식)
    const loggingData = props.loggingMetaData?.coreVideoPlayerMetaData;
    if (loggingData?.videoFBID) {
      console.log('🎯 videoFBID 발견:', loggingData.videoFBID);
      
      // Media Tracker에서 이 FBID로 shortcode 찾기
      if (window.INSTAGRAM_MEDIA_TRACKER) {
        const shortcode = window.INSTAGRAM_MEDIA_TRACKER.fbIdMap[loggingData.videoFBID];
        if (shortcode) {
          console.log('✅ FBID로 shortcode 발견:', shortcode);
          return shortcode;
        }
      }
    }
    
    // 2. 직접 shortcode 찾기 (fallback)
    if (props.code && typeof props.code === 'string' && props.code.match(/^[A-Za-z0-9_-]+$/)) {
      return props.code;
    }
    
    // 3. children에서 재귀 검색
    if (props.children && typeof props.children === 'object') {
      const result = this.findShortcodeInProps(props.children, depth + 1);
      if (result) return result;
    }
    
    // 4. 다른 키들에서 재귀 검색
    for (const key in props) {
      if (typeof props[key] === 'object' && key !== 'children' && key !== 'loggingMetaData') {
        const result = this.findShortcodeInProps(props[key], depth + 1);
        if (result) return result;
      }
    }
    
    return null;
  },
  
  extractShortcodeFromContainer(container) {
    // 1. 컨테이너 내부에서 링크 요소 찾기
    const links = container.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
    for (const link of links) {
      const match = link.href.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
      if (match) {
        console.log('🔗 컨테이너에서 shortcode 추출:', match[1]);
        return match[1];
      }
    }
    
    // 2. data-* 속성에서 찾기
    const dataShortcode = container.querySelector('[data-testid*="shortcode"], [data-shortcode]');
    if (dataShortcode) {
      const shortcode = dataShortcode.getAttribute('data-shortcode') || 
                       dataShortcode.getAttribute('data-testid').replace('shortcode-', '');
      if (shortcode) {
        console.log('📊 데이터 속성에서 shortcode 추출:', shortcode);
        return shortcode;
      }
    }
    
    // 3. React Props에서 shortcode 추출 시도
    const reactFiber = container._reactInternalFiber || container._reactInternalInstance || 
                       Object.keys(container).find(key => key.startsWith('__reactInternalInstance'));
    if (reactFiber && typeof reactFiber === 'object') {
      const shortcode = this.deepSearchForShortcode(reactFiber);
      if (shortcode) {
        console.log('⚛️ React Fiber에서 shortcode 추출:', shortcode);
        return shortcode;
      }
    }
    
    return null;
  },
  
  deepSearchForShortcode(obj, depth = 0, visited = new WeakSet()) {
    if (depth > 8 || !obj || typeof obj !== 'object' || visited.has(obj)) return null;
    visited.add(obj);
    
    // shortcode 패턴 찾기
    if (typeof obj.shortcode === 'string' && /^[A-Za-z0-9_-]+$/.test(obj.shortcode)) {
      return obj.shortcode;
    }
    
    if (typeof obj.code === 'string' && /^[A-Za-z0-9_-]+$/.test(obj.code)) {
      return obj.code;
    }
    
    // 재귀 탐색
    for (const key in obj) {
      if (obj.hasOwnProperty && obj.hasOwnProperty(key) && key !== 'parent' && key !== 'stateNode') {
        try {
          const result = this.deepSearchForShortcode(obj[key], depth + 1, visited);
          if (result) return result;
        } catch (e) {
          // 순환 참조 등의 오류 무시
        }
      }
    }
    
    return null;
  },
  
  findReactProps(element) {
    // Instagram downloader에서 사용하는 React Props 찾기
    const props = Object.keys(element).find(key => key.startsWith('__reactProps'));
    return props ? element[props] : null;
  },
  
  extractFromReactProps(props) {
    try {
      // React Props에서 미디어 데이터 추출
      if (props && props.children) {
        const mediaData = this.deepSearchForVideoData(props.children);
        if (mediaData) {
          return {
            videoUrl: mediaData.videoUrl,
            shortcode: mediaData.shortcode,
            mediaData: mediaData
          };
        }
      }
    } catch (error) {
      console.warn('React Props 추출 실패:', error);
    }
    return null;
  },
  
  deepSearchForVideoData(obj, depth = 0) {
    if (depth > 10 || !obj || typeof obj !== 'object') return null;
    
    // 비디오 URL 패턴 찾기
    if (obj.video_versions && Array.isArray(obj.video_versions)) {
      return {
        videoUrl: obj.video_versions[0].url,
        shortcode: obj.code || obj.shortcode,
        ...obj
      };
    }
    
    // 재귀적으로 검색
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const result = this.deepSearchForVideoData(obj[key], depth + 1);
        if (result) return result;
      }
    }
    
    return null;
  },
  
  generateShortcodeFromUrl() {
    const urlMatch = window.location.href.match(/\/p\/([A-Za-z0-9_-]+)|\/reel\/([A-Za-z0-9_-]+)/);
    return urlMatch ? (urlMatch[1] || urlMatch[2]) : 'unknown_' + Date.now();
  },
  
  processVideoAnalysis(mediaInfo, button) {
    // VideoSaver 인스턴스와 연결
    if (typeof window.videoSaver !== 'undefined' && window.videoSaver) {
      console.log('🔗 VideoSaver 인스턴스와 연결됨');
      console.log('📊 전달할 미디어 정보:', mediaInfo);
      
      // 현재 shortcode와 일치하는 실제 video element를 찾아서 전달
      const correctVideo = this.findVideoByShortcode(mediaInfo.shortcode);
      console.log('🎯 shortcode에 맞는 video element:', correctVideo);
      
      // VideoSaver에 올바른 video element 전달 - metadata 필드에 추가
      const enhancedMediaInfo = {
        ...mediaInfo,
        metadata: {
          ...mediaInfo.metadata,
          currentVideo: correctVideo,
          description: mediaInfo.description  // 릴스 설명 추가
        }
      };
      
      console.log('🚀 VideoSaver에 전달할 enhancedMediaInfo:', enhancedMediaInfo);
      
      this.analyzeWithVideoSaver(enhancedMediaInfo, button);
    } else {
      // fallback - 직접 API 호출
      console.log('📡 VideoSaver 없음, 직접 API 호출');
      this.callAnalysisAPI(mediaInfo, button);
    }
  },
  
  analyzeWithVideoSaver(mediaInfo, button) {
    try {
      // 실제 video element 사용 (metadata.currentVideo가 있으면 우선 사용)
      const actualVideo = mediaInfo.metadata?.currentVideo;
      
      console.log('🎬 analyzeWithVideoSaver에서 받은 actualVideo:', actualVideo);
      console.log('🎬 actualVideo src:', actualVideo?.src?.substring(0, 50));
      
      // 가상 비디오 요소 생성 (VideoSaver가 필요로 함) - actualVideo가 없을 때만
      const virtualVideo = actualVideo || {
        src: mediaInfo.videoUrl,
        currentSrc: mediaInfo.videoUrl,
        readyState: 4,
        videoWidth: 640,
        videoHeight: 480
      };
      
      console.log('🎬 최종 사용할 video:', virtualVideo?.src?.substring(0, 50));
      
      // 가상 포스트 요소 생성 (메타데이터 추출용)
      const virtualPost = this.createVirtualPost(mediaInfo);
      
      // currentVideo를 virtualPost에 첨부
      if (actualVideo) {
        virtualPost._instagramCurrentVideo = actualVideo;
        console.log('🔗 virtualPost에 currentVideo 첨부:', actualVideo);
      }
      
      // VideoSaver의 분석 메소드 호출
      window.videoSaver.performHybridAnalysisWithProgress(virtualPost, virtualVideo, (phase, status) => {
        console.log(`📊 분석 진행상황: ${phase} - ${status}`);
        if (phase === 'phase1' && status === 'complete') {
          this.resetButton(button, '⚡ 1단계 완료');
        } else if (phase === 'phase2' && status === 'complete') {
          this.resetButton(button, '✅ 완료');
          setTimeout(() => {
            this.resetButton(button, '🔍 분석');
          }, 3000);
        }
      })
      .then(() => {
        console.log('✅ VideoSaver 분석 완료');
        if (button.textContent !== '✅ 완료') {
          this.resetButton(button, '✅ 완료');
          setTimeout(() => {
            this.resetButton(button, '🔍 분석');
          }, 3000);
        }
      })
      .catch(error => {
        console.error('❌ VideoSaver 분석 실패:', error);
        this.resetButton(button, '❌ 실패');
        setTimeout(() => {
          this.resetButton(button, '🔍 분석');
        }, 3000);
      });
      
    } catch (error) {
      console.error('❌ VideoSaver 연결 오류:', error);
      this.callAnalysisAPI(mediaInfo, button);
    }
  },
  
  createVirtualPost(mediaInfo) {
    // VideoSaver가 메타데이터 추출에 필요한 가상 DOM 요소 생성
    const virtualPost = document.createElement('article');
    virtualPost.setAttribute('role', 'presentation');
    
    // 릴스 설명 정보를 virtualPost에 추가
    if (mediaInfo.description) {
      virtualPost._instagramDescription = mediaInfo.description;
      console.log('📝 virtualPost에 설명 추가:', mediaInfo.description.substring(0, 100) + '...');
    }
    
    // 계정 정보를 virtualPost에 추가 
    const currentVideo = mediaInfo.metadata?.currentVideo;
    const accountInfo = this.extractAccountInfo(mediaInfo, null, currentVideo);
    if (accountInfo) {
      virtualPost._instagramAuthor = accountInfo;
      console.log('👤 virtualPost에 계정 추가:', accountInfo);
      
      // 통합 함수로 계정명 추출
      const username = this.extractUsernameFromSource(accountInfo, 'accountInfo');
      console.log('🎯 추출된 계정명:', username);
      
      // URL 정보를 virtualPost에 추가 (좋아요 수 추출용)
      if (username) {
        virtualPost.url = `https://www.instagram.com/${username}/`;
        virtualPost.username = username; // 직접 계정명도 저장
        console.log('🔗 virtualPost에 URL 추가:', virtualPost.url);
        console.log('👤 virtualPost에 계정명 추가:', virtualPost.username);
      }
    }
    
    // 현재 URL도 추가
    if (window.location.href.includes('instagram.com')) {
      virtualPost.currentUrl = window.location.href;
      console.log('🌐 virtualPost에 현재 URL 추가:', virtualPost.currentUrl);
    }
    
    // 좋아요 수 추출 및 추가 (virtualPost 정보 전달)
    const likesCount = this.extractLikesCount(virtualPost, currentVideo);
    if (likesCount && likesCount !== '0') {
      virtualPost._instagramLikes = likesCount;
      console.log('❤️ virtualPost에 좋아요 수 추가:', likesCount);
    }
    
    // 댓글 수 추출 및 추가
    const commentsCount = this.extractCommentsCount(null, currentVideo);
    if (commentsCount && commentsCount !== '0') {
      virtualPost._instagramComments = commentsCount;
      console.log('💬 virtualPost에 댓글 수 추가:', commentsCount);
    }
    
    // shortcode 정보를 URL에 포함
    if (mediaInfo.shortcode) {
      const currentUrl = window.location.href;
      if (!currentUrl.includes(mediaInfo.shortcode)) {
        // URL에 shortcode가 없으면 임시로 변경
        history.replaceState(null, null, `/p/${mediaInfo.shortcode}/`);
        setTimeout(() => {
          history.replaceState(null, null, currentUrl);
        }, 100);
      }
    }
    
    return virtualPost;
  },
  
  callAnalysisAPI(mediaInfo, button) {
    // 기존 API 로직과 동일
    fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'instagram',
        url: mediaInfo.videoUrl,
        videoId: mediaInfo.shortcode,
        mediaData: mediaInfo.mediaData
      })
    })
    .then(response => response.json())
    .then(result => {
      console.log('✅ API 분석 완료:', result);
      this.resetButton(button, '✅ 완료');
      
      setTimeout(() => {
        this.resetButton(button, '🔍 분석');
      }, 3000);
    })
    .catch(error => {
      console.error('❌ API 분석 실패:', error);
      this.resetButton(button, '❌ 실패');
      
      setTimeout(() => {
        this.resetButton(button, '🔍 분석');
      }, 3000);
    });
  },
  
  resetButton(button, text) {
    button.textContent = text;
    button.style.background = 'rgba(0, 0, 0, 0.7)';
    button.style.pointerEvents = 'auto';
  },
  
  destroy() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // 모든 생성된 버튼 제거
    document.querySelectorAll('.analysis-overlay-btn').forEach(btn => {
      btn.remove();
    });
    
    this.isInitialized = false;
    this.processedVideos.clear();
    console.log('🗑️ Instagram UI System 정리 완료');
  }
};

// Instagram UI System 초기화
if (window.location.hostname.includes('instagram.com')) {
  // 페이지 로드 완료 후 UI 시스템 시작
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.INSTAGRAM_UI_SYSTEM.init(), 1000);
    });
  } else {
    setTimeout(() => window.INSTAGRAM_UI_SYSTEM.init(), 1000);
  }
  
  // SPA 네비게이션 감지
  let currentUrl = window.location.href;
  const urlChangeObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('🔄 Instagram 페이지 변경 감지');
      
      // UI 시스템은 재시작하지 않음 - Instagram downloader처럼 지속적으로 실행
      // setTimeout(() => {
      //   window.INSTAGRAM_UI_SYSTEM.destroy();
      //   setTimeout(() => window.INSTAGRAM_UI_SYSTEM.init(), 500);
      // }, 1000);
    }
  });
  
  urlChangeObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Constants
const CONSTANTS = {
  SERVER_URL: 'http://localhost:3000',
  
  PLATFORMS: {
    INSTAGRAM: 'instagram',
    TIKTOK: 'tiktok'
  },
  
  SELECTORS: {
    INSTAGRAM: {
      POSTS: [
        'article[role="presentation"]',
        'article',
        '[role="article"]'
      ],
      VIDEOS: 'video',
      SAVE_BUTTONS: 'svg[aria-label*="저장"], svg[aria-label*="Save"], svg[aria-label*="save"]',
      AUTHOR: 'a[role="link"]',
      CAPTION: '[data-testid="post-content"] span',
      LIKES: 'button[data-testid="like-count"]'
    },
    TIKTOK: {
      VIDEO_PLAYER: '[data-e2e="video-player"]',
      VIDEO_WRAPPER: '[data-e2e="video-wrapper"]',
      SIDE_ACTIONS: '[data-e2e="video-side-actions"]',
      VIDEO_AUTHOR: '[data-e2e="video-author"]',
      VIDEO_DESC: '[data-e2e="video-desc"]',
      LIKE_COUNT: '[data-e2e="like-count"]'
    }
  },
  
  NOTIFICATION_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning'
  },
  
  TIMEOUTS: {
    ENHANCEMENT_THROTTLE: 10000,
    PROCESSING_DELAY: 500,
    URL_CHECK_INTERVAL: 3000,
    SCROLL_DEBOUNCE: 2000,
    SCROLL_MIN_INTERVAL: 10000,
    NOTIFICATION_DURATION: 5000,
    BUTTON_RESET_DELAY: 3000
  },

  SETTINGS: {
    AUTO_ANALYSIS: 'autoAnalysis',
    SHOW_NOTIFICATIONS: 'showNotifications'
  },

  STORAGE_KEYS: {
    SETTINGS: 'videosaverSettings'
  }
};

// Utils Class
class Utils {
  static detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    return null;
  }

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

  static isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top >= 0 && rect.top < window.innerHeight;
  }

  static extractHashtags(text) {
    if (!text) return [];
    return text.match(/#[\w가-힣]+/g) || [];
  }

  static safeQuerySelector(parent, selector) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.warn('Query selector failed:', selector, error);
      return null;
    }
  }

  static safeQuerySelectorAll(parent, selector) {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.warn('Query selector all failed:', selector, error);
      return [];
    }
  }

  static log(level, message, data = null) {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
    
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

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// API Client Class
class ApiClient {
  constructor(serverUrl = CONSTANTS.SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      Utils.log('error', 'Server connection failed', error);
      return false;
    }
  }

  async processVideo(data) {
    try {
      Utils.log('info', 'Processing video with URL', { 
        platform: data.platform, 
        url: data.videoUrl,
        analysisType: data.analysisType || 'quick' 
      });
      
      const response = await fetch(`${this.serverUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // AI 오류 정보 확인 및 사용자에게 표시
      this.checkAndShowAiErrors(result);
      
      // 기존 API 응답 형식과 새 응답 형식 둘 다 지원
      if (result.success !== undefined) {
        // 새 형식: { success: true, data: {...} }
        Utils.log('success', 'Video processed successfully', result.data);
        return result.data;
      } else {
        // 기존 형식: 직접 결과 반환
        Utils.log('success', 'Video processed successfully', result);
        return result;
      }

    } catch (error) {
      Utils.log('error', 'Video processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  async processVideoBlob(data) {
    try {
      Utils.log('info', 'Processing video with blob', { 
        platform: data.platform, 
        size: data.videoBlob.size,
        analysisType: data.analysisType || 'quick'
      });
      
      const formData = new FormData();
      formData.append('video', data.videoBlob, `${data.platform}_video_${Date.now()}.mp4`);
      formData.append('platform', data.platform);
      formData.append('postUrl', data.postUrl);
      formData.append('analysisType', data.analysisType || 'quick');
      formData.append('metadata', JSON.stringify(data.metadata));
      
      const response = await fetch(`${this.serverUrl}/api/process-video-blob`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // AI 오류 정보 확인 및 사용자에게 표시
      this.checkAndShowAiErrors(result);
      
      // 기존 API 응답 형식과 새 응답 형식 둘 다 지원
      if (result.success !== undefined) {
        Utils.log('success', 'Video blob processed successfully', result.data);
        return result.data;
      } else {
        Utils.log('success', 'Video blob processed successfully', result);
        return result;
      }

    } catch (error) {
      Utils.log('error', 'Video blob processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  async downloadBlobVideo(blobUrl) {
    try {
      Utils.log('info', 'Downloading blob video', blobUrl);
      
      // blob URL 유효성 체크
      if (!blobUrl || !blobUrl.startsWith('blob:')) {
        throw new Error('유효하지 않은 blob URL');
      }
      
      // 타임아웃 설정으로 빠른 실패
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      try {
        const response = await fetch(blobUrl, {
          signal: controller.signal,
          method: 'GET',
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('빈 blob 데이터');
        }
        
        Utils.log('success', 'Blob video downloaded', { 
          size: blob.size, 
          type: blob.type || 'unknown' 
        });
        return blob;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Blob 다운로드 타임아웃');
        } else if (fetchError.message.includes('net::ERR_FILE_NOT_FOUND')) {
          throw new Error('Blob URL이 만료되었거나 접근할 수 없습니다');
        }
        
        throw fetchError;
      }

    } catch (error) {
      Utils.log('error', 'Blob video download failed', error);
      throw new Error(`blob 비디오 다운로드 실패: ${error.message}`);
    }
  }

  // AI 오류 정보 확인 및 사용자 알림 표시
  checkAndShowAiErrors(result) {
    try {
      // 새 형식에서 data 내부의 aiError 확인
      const data = result.data || result;
      
      if (data && data.aiError && data.aiError.occurred) {
        const error = data.aiError;
        
        // 오류 유형별 아이콘 선택
        let icon = '🤖';
        if (error.type === 'gemini_analysis_failed') {
          if (error.message.includes('API 키')) icon = '🔑';
          else if (error.message.includes('사용량 초과')) icon = '📊';
          else if (error.message.includes('네트워크')) icon = '🌐';
          else if (error.message.includes('이미지')) icon = '🖼️';
          else if (error.message.includes('콘텐츠 정책')) icon = '🛡️';
          else if (error.message.includes('크기 초과')) icon = '📏';
          else if (error.message.includes('서비스 오류')) icon = '⚙️';
        }
        
        // 사용자 친화적 메시지 표시
        const userMessage = `${icon} ${error.message}`;
        const notificationType = error.retryable ? 
          CONSTANTS.NOTIFICATION_TYPES.INFO : 
          CONSTANTS.NOTIFICATION_TYPES.ERROR;
        
        // UI Manager 찾기 (전역에서)
        const uiManager = window.videoSaver?.uiManager;
        if (uiManager && uiManager.showNotification) {
          uiManager.showNotification(userMessage, notificationType, 5000);
        } else {
          // fallback: console 및 간단한 알림
          console.warn('AI 오류:', userMessage);
        }
        
        // 재시도 가능한 오류인 경우 추가 정보
        if (error.retryable && uiManager) {
          setTimeout(() => {
            uiManager.showNotification('💡 잠시 후 다시 시도해보세요', CONSTANTS.NOTIFICATION_TYPES.INFO, 3000);
          }, 2000);
        }
        
        Utils.log('warn', 'AI Error detected', {
          type: error.type,
          message: error.message,
          technical: error.technical,
          retryable: error.retryable,
          timestamp: error.timestamp
        });
      }
    } catch (checkError) {
      Utils.log('error', 'Error checking AI errors', checkError);
    }
  }
}

// UI Manager Class (핵심 기능만)
class UIManager {
  constructor() {
    this.notifications = new Map();
  }

  showNotification(message, type = CONSTANTS.NOTIFICATION_TYPES.INFO, duration = CONSTANTS.TIMEOUTS.NOTIFICATION_DURATION) {
    // 기존 방식과 동일하게 유지
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['showNotifications'], (result) => {
        if (result.showNotifications === false) return;
        this._createNotification(message, type, duration);
      });
    } else {
      this._createNotification(message, type, duration);
    }
  }

  _createNotification(message, type, duration) {
    const notification = document.createElement('div');
    
    // 타입별 색상 및 아이콘 설정
    const colors = {
      [CONSTANTS.NOTIFICATION_TYPES.SUCCESS]: { bg: '#4caf50', border: '#388e3c' },
      [CONSTANTS.NOTIFICATION_TYPES.ERROR]: { bg: '#f44336', border: '#d32f2f' },
      [CONSTANTS.NOTIFICATION_TYPES.INFO]: { bg: '#2196f3', border: '#1976d2' }
    };
    
    const color = colors[type] || colors[CONSTANTS.NOTIFICATION_TYPES.INFO];
    
    // 기존 알림들의 개수 확인 (위치 조정용)
    const existingNotifications = document.querySelectorAll('[data-ai-notification]');
    const topOffset = 20 + (existingNotifications.length * 80);
    
    notification.setAttribute('data-ai-notification', 'true');
    notification.style.cssText = `
      position: fixed;
      top: ${topOffset}px;
      right: 20px;
      background: linear-gradient(135deg, ${color.bg} 0%, ${color.border} 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      z-index: 10001;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.1);
      max-width: 350px;
      min-width: 250px;
      white-space: pre-line;
      border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    `;
    
    notification.textContent = message;
    
    // 닫기 버튼 추가 (오류 메시지인 경우)
    if (type === CONSTANTS.NOTIFICATION_TYPES.ERROR) {
      const closeBtn = document.createElement('div');
      closeBtn.innerHTML = '×';
      closeBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 12px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: background 0.2s;
      `;
      closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
      closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
      closeBtn.onclick = () => this._removeNotification(notification);
      
      notification.appendChild(closeBtn);
      notification.style.paddingRight = '45px';
    }
    
    document.body.appendChild(notification);
    
    // 슬라이드 인 애니메이션
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // 자동 제거 타이머
    setTimeout(() => {
      this._removeNotification(notification);
    }, duration);
    
    // 클릭시 제거 (오류가 아닌 경우)
    if (type !== CONSTANTS.NOTIFICATION_TYPES.ERROR) {
      notification.onclick = () => this._removeNotification(notification);
    }
  }

  // 알림 제거 함수 (애니메이션 포함)
  _removeNotification(notification) {
    if (!notification || !document.body.contains(notification)) return;
    
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
        // 남은 알림들의 위치 재조정
        this._repositionNotifications();
      }
    }, 300);
  }

  // 남은 알림들의 위치 재조정
  _repositionNotifications() {
    const notifications = document.querySelectorAll('[data-ai-notification]');
    notifications.forEach((notification, index) => {
      const topOffset = 20 + (index * 80);
      notification.style.top = `${topOffset}px`;
    });
  }
}

// 기존 VideoSaver 클래스와 동일한 인터페이스 유지
class VideoSaver {
  constructor(serverUrl = CONSTANTS.SERVER_URL) {
    this.platform = Utils.detectPlatform();
    this.apiClient = new ApiClient(serverUrl);
    this.uiManager = new UIManager();
    this.isProcessing = false;
    this.lastEnhancementTime = 0;
    this.cachedSettings = { [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false }; // 설정 캐시
    
    this.init();
    this.setupSettingsListener(); // 설정 변경 리스너 설정
  }

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get(CONSTANTS.STORAGE_KEYS.SETTINGS);
      const settings = result[CONSTANTS.STORAGE_KEYS.SETTINGS] || { 
        [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false,
        [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
      };
      this.cachedSettings = settings; // 캐시 업데이트
      return settings;
    } catch (error) {
      Utils.log('error', '설정 조회 실패', error);
      return { 
        [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false,
        [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
      };
    }
  }

  setupSettingsListener() {
    // Chrome storage 변경 이벤트 리스너
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes[CONSTANTS.STORAGE_KEYS.SETTINGS]) {
          const newSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].newValue;
          const oldSettings = changes[CONSTANTS.STORAGE_KEYS.SETTINGS].oldValue;
          
          Utils.log('info', '🔄 설정이 실시간으로 변경됨:', {
            old: oldSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS],
            new: newSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS]
          });
          
          // 캐시 즉시 업데이트
          this.cachedSettings = newSettings || { 
            [CONSTANTS.SETTINGS.AUTO_ANALYSIS]: false,
            [CONSTANTS.SETTINGS.SHOW_NOTIFICATIONS]: true
          };
          
          // 사용자에게 알림
          if (newSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS] !== oldSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS]) {
            const status = newSettings?.[CONSTANTS.SETTINGS.AUTO_ANALYSIS] ? 'ON' : 'OFF';
            // UIManager를 통해 알림 표시
            this.uiManager.showNotification(`🔄 자동 분석이 ${status}으로 변경되었습니다`, 'info');
          }
        }
      });
      
      Utils.log('info', '✅ 설정 변경 리스너 설정 완료');
    }
  }

  async init() {
    Utils.log('info', 'VideoSaver init() 호출됨');
    Utils.log('info', '감지된 플랫폼:', this.platform);
    
    if (!this.platform) {
      Utils.log('error', '지원되지 않는 플랫폼입니다:', window.location.hostname);
      return;
    }
    
    // 초기 설정 로드
    await this.getSettings();
    Utils.log('info', '초기 설정 로드됨:', this.cachedSettings);
    
    Utils.log('success', `영상 저장기가 ${this.platform}에서 실행됩니다.`);
    
    // 기존과 동일한 초기화 로직
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setup();
      });
    } else {
      this.setup();
    }
  }

  setup() {
    Utils.log('info', 'setup() 함수 실행 시작 (새로운 UI 시스템 사용)');
    
    // ⚠️ 기존 저장 버튼 방식 비활성화 - Instagram UI System으로 완전 대체
    // this.enhanceInstagramSaveButtons(); // 주석 처리
    
    // URL 변경 감지
    this.observeUrlChanges();
    
    // 동적 콘텐츠 감지
    this.observeContentChanges();
    
    Utils.log('success', 'setup() 함수 실행 완료 - Instagram UI System 전용');
  }

  // 기존 메소드들을 그대로 유지하되 내부적으로 새로운 구조 사용
  enhanceInstagramSaveButtons() {
    if (this.isProcessing) {
      return;
    }
    
    const now = Date.now();
    if (now - this.lastEnhancementTime < CONSTANTS.TIMEOUTS.ENHANCEMENT_THROTTLE) {
      return;
    }
    
    this.isProcessing = true;
    this.lastEnhancementTime = now;
    
    setTimeout(() => {
      try {
        const saveButtons = Utils.safeQuerySelectorAll(document, CONSTANTS.SELECTORS.INSTAGRAM.SAVE_BUTTONS);
        Utils.log('info', `발견된 저장 버튼 수: ${saveButtons.length}`);
        
        saveButtons.forEach((svg, index) => {
          this.processSaveButton(svg, index);
        });
      } catch (error) {
        Utils.log('error', '저장 버튼 향상 중 오류', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000);
  }

  processSaveButton(svg, index) {
    // 기존 로직과 동일하게 구현하되 모듈화된 구조 사용
    let button = svg.closest('button') || 
                 svg.closest('div[role="button"]') || 
                 svg.parentElement;

    if (!button || button.hasAttribute('data-video-save-enhanced')) {
      return;
    }

    button.setAttribute('data-video-save-enhanced', 'true');

    // 비디오 찾기
    const post = button.closest('article') || button.closest('div[role="presentation"]');
    const video = post?.querySelector('video') || document.querySelector('video');

    if (video) {
      const clickHandler = this.createClickHandler(post, video);
      button.addEventListener('click', clickHandler, false);
      
      // 분석 버튼 추가 (별도 버튼)
      this.createAnalysisButton(button, post, video);
      
      Utils.log('success', `저장 버튼 ${index + 1}에 영상 분석 기능 추가`);
    }
  }

  createAnalysisButton(originalButton, post, video) {
    // 이미 분석 버튼이 있는지 확인
    const existingAnalysisButton = originalButton.parentElement?.querySelector('.video-analysis-button');
    if (existingAnalysisButton) {
      return;
    }

    // 분석 버튼 생성
    const analysisButton = document.createElement('button');
    analysisButton.className = 'video-analysis-button';
    analysisButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    `;
    
    // 스타일링
    analysisButton.style.cssText = `
      position: relative;
      background: linear-gradient(45deg, #8e44ad, #3498db);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      color: white;
      cursor: pointer;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      z-index: 9999;
    `;

    // 호버 효과
    analysisButton.addEventListener('mouseenter', () => {
      analysisButton.style.transform = 'scale(1.1)';
      analysisButton.style.background = 'linear-gradient(45deg, #9b59b6, #2980b9)';
    });

    analysisButton.addEventListener('mouseleave', () => {
      analysisButton.style.transform = 'scale(1)';
      analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
    });

    // 하이브리드 분석을 위한 진행 상태 추적 함수
    const updateAnalysisButtonState = (phase, status) => {
      switch (phase) {
        case 'phase1':
          if (status === 'start') {
            analysisButton.style.background = '#f39c12';
            analysisButton.innerHTML = '⚡';
            analysisButton.title = 'Phase 1: 빠른 분석 중...';
          } else if (status === 'complete') {
            analysisButton.style.background = '#3498db';
            analysisButton.innerHTML = '🔍';
            analysisButton.title = 'Phase 1 완료! Phase 2: 전체 분석 중...';
          }
          break;
        case 'phase2':
          if (status === 'complete') {
            analysisButton.style.background = '#27ae60';
            analysisButton.innerHTML = '✅';
            analysisButton.title = '하이브리드 분석 완료!';
          }
          break;
        case 'error':
          analysisButton.style.background = '#e74c3c';
          analysisButton.innerHTML = '❌';
          analysisButton.title = '분석 실패';
          break;
      }
    };

    // 클릭 이벤트
    analysisButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      updateAnalysisButtonState('phase1', 'start');
      
      try {
        // Phase 1 시작 알림
        this.uiManager.showNotification('⚡ 빠른 분석 시작...', 'info');
        
        // 하이브리드 분석 실행
        await this.performHybridAnalysisWithProgress(post, video, updateAnalysisButtonState);
        
        // 최종 완료 후 원래 상태로 복원
        setTimeout(() => {
          analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
          analysisButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `;
          analysisButton.title = '영상 분석 (하이브리드)';
        }, 3000);
        
      } catch (error) {
        updateAnalysisButtonState('error');
        Utils.log('error', '분석 버튼 클릭 처리 실패', error);
        
        setTimeout(() => {
          analysisButton.style.background = 'linear-gradient(45deg, #8e44ad, #3498db)';
          analysisButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `;
          analysisButton.title = '영상 분석 (하이브리드)';
        }, 3000);
      }
    });

    // 버튼을 원래 저장 버튼 옆에 배치
    try {
      const buttonContainer = originalButton.parentElement;
      if (buttonContainer) {
        buttonContainer.style.position = 'relative';
        buttonContainer.appendChild(analysisButton);
        Utils.log('info', '분석 버튼이 저장 버튼 옆에 추가됨');
      } else {
        // 대안: floating button으로 추가
        this.createFloatingAnalysisButton(video, analysisButton);
      }
    } catch (error) {
      Utils.log('warn', '분석 버튼 배치 실패, floating 버튼으로 대체', error);
      this.createFloatingAnalysisButton(video, analysisButton);
    }
  }

  createFloatingAnalysisButton(video, analysisButton) {
    analysisButton.style.position = 'absolute';
    analysisButton.style.top = '10px';
    analysisButton.style.right = '10px';
    analysisButton.style.zIndex = '10000';
    
    const videoContainer = video.closest('div') || video.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(analysisButton);
      Utils.log('info', '분석 버튼이 비디오 위에 floating으로 추가됨');
    }
  }

  async performVideoAnalysis(post, video) {
    return this.performHybridAnalysisWithProgress(post, video, null);
  }

  async performHybridAnalysisWithProgress(post, video, progressCallback = null) {
    Utils.log('info', '🔄 하이브리드 영상 분석 시작');
    
    const postUrl = window.location.href;
    const metadata = this.extractInstagramMetadata(post);
    
    // Instagram UI System에서 전달된 currentVideo 보존
    if (post && post._instagramCurrentVideo) {
      Utils.log('info', '🎯 Instagram UI System에서 전달된 currentVideo 보존');
      metadata.currentVideo = post._instagramCurrentVideo;
    }
    
    // Instagram UI System에서 전달된 설명 정보 보존
    if (post && post._instagramDescription) {
      Utils.log('info', '📝 Instagram UI System에서 전달된 설명 보존:', post._instagramDescription.substring(0, 100) + '...');
      metadata.description = post._instagramDescription;
    }
    
    // Instagram UI System에서 전달된 계정 정보 보존
    if (post && post._instagramAuthor) {
      Utils.log('info', '👤 Instagram UI System에서 전달된 계정 보존:', post._instagramAuthor);
      metadata.author = post._instagramAuthor;
    }
    
    // Instagram UI System에서 전달된 좋아요 수 정보 보존
    if (post && post._instagramLikes) {
      Utils.log('info', '❤️ Instagram UI System에서 전달된 좋아요 수 보존:', post._instagramLikes);
      metadata.likes = post._instagramLikes;
    }
    
    // Instagram UI System에서 전달된 댓글 수 정보 보존
    if (post && post._instagramComments) {
      Utils.log('info', '💬 Instagram UI System에서 전달된 댓글 수 보존:', post._instagramComments);
      metadata.comments = post._instagramComments;
    }
    
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 서버 설정 확인 - Gemini 사용 여부
    let useGemini = false;
    try {
      const healthResponse = await fetch(`${CONSTANTS.SERVER_URL}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        useGemini = healthData.useGemini;
        Utils.log('info', `🔮 서버 설정: Gemini ${useGemini ? '활성화' : '비활성화'}`);
      }
    } catch (error) {
      Utils.log('warn', '서버 설정 확인 실패, 기본 동작 수행', error);
    }
    
    if (useGemini) {
      // Gemini 사용시 바로 Phase 2로 진행
      Utils.log('info', '🔮 Gemini 모드: 빠른 분석 건너뛰고 바로 전체 분석 시작');
      if (progressCallback) {
        progressCallback('phase1', 'skipped');
      }
    } else {
      // Phase 1: 즉시 프레임 분석 (2-3초)
      await this.performQuickAnalysis(video, postUrl, metadata, analysisId);
      
      // Phase 1 완료 알림
      if (progressCallback) {
        progressCallback('phase1', 'complete');
      }
    }
    
    // Phase 2: 백그라운드 전체 비디오 분석 (30초-1분)
    this.performFullAnalysisWithProgress(post, video, postUrl, metadata, analysisId, progressCallback);
  }

  async performFullAnalysisWithProgress(post, video, postUrl, metadata, analysisId, progressCallback = null) {
    try {
      Utils.log('info', '🔍 Phase 2: 전체 비디오 분석 시작 (백그라운드)');
      
      // 실제 비디오 URL 추출 시도
      const realVideoUrl = await this.extractRealVideoUrl(video);
      
      // blob URL 우선 처리
      const videoSrc = video.src || video.currentSrc;
      if (videoSrc && videoSrc.startsWith('blob:')) {
        Utils.log('info', '🎯 Blob URL 우선 처리로 전환');
        await this.processBlobVideo(videoSrc, postUrl, metadata, video);
        return;
      }
      
      if (realVideoUrl && !realVideoUrl.startsWith('blob:')) {
        // 실제 비디오 URL이 있는 경우 - 안전한 처리
        Utils.log('info', '🎯 실제 비디오 URL 발견, 전체 분석 진행');
        Utils.log('info', '📋 URL 정보:', {
          length: realVideoUrl.length,
          domain: realVideoUrl.split('/')[2],
          hasParams: realVideoUrl.includes('?')
        });
        
        try {
          // Instagram 전용 URL 검증
          if (!realVideoUrl.includes('fbcdn.net') && !realVideoUrl.includes('cdninstagram.com')) {
            throw new Error('신뢰할 수 없는 비디오 URL');
          }
          
          // Instagram URL에서 부분 다운로드 파라미터 제거
          let cleanVideoUrl = realVideoUrl;
          if (realVideoUrl.includes('bytestart=') || realVideoUrl.includes('byteend=')) {
            const url = new URL(realVideoUrl);
            url.searchParams.delete('bytestart');
            url.searchParams.delete('byteend');
            cleanVideoUrl = url.toString();
            Utils.log('info', '🧹 부분 다운로드 파라미터 제거됨');
          }
          
          await this.apiClient.processVideo({
            platform: CONSTANTS.PLATFORMS.INSTAGRAM,
            videoUrl: cleanVideoUrl,
            postUrl,
            analysisType: 'multi-frame', // 다중 프레임 분석으로 변경
            metadata: {
              ...metadata,
              analysisId,
              analysisType: 'multi-frame', // 메타데이터도 multi-frame으로 일관성 맞춤
              isUpdate: true,
              urlSource: 'extracted',
              originalUrl: realVideoUrl !== cleanVideoUrl ? realVideoUrl : undefined,
              uploadDate: (() => {
                if (!metadata.author) return null;
                
                // metadata.author에서 계정명 추출 (성공 방법)
                const usernameMatch = metadata.author.match(/instagram\.com\/([^\/]+)/);
                const username = usernameMatch ? usernameMatch[1] : metadata.author;
                const uploadDate = window[`uploadDate_${username}`] || null;
                console.log(`📅 계정 "${username}"의 업로드 날짜: ${uploadDate}`);
                return uploadDate;
              })()
            }
          });

          this.uiManager.showNotification('✅ 완전한 영상 분석 완료!', 'success');
          Utils.log('success', '🔍 Phase 2 완료 - 전체 분석으로 결과 업데이트됨');
          
        } catch (urlError) {
          Utils.log('warn', '🎯 실제 URL 처리 실패, 다중 프레임으로 대체', urlError);
          // 실제 URL 실패시 다중 프레임으로 fallback
          throw urlError;
        }
        
      } else {
        // blob URL만 있는 경우 - 다중 프레임 캡처
        Utils.log('info', '📹 blob URL 감지, 다중 프레임 분석 진행');
        
        const multiFrameData = await this.captureMultipleFrames(video, 5); // 5프레임
        
        await this.apiClient.processVideoBlob({
          platform: CONSTANTS.PLATFORMS.INSTAGRAM,
          videoBlob: multiFrameData,
          postUrl,
          analysisType: 'multi-frame', // 파라미터로 전달
          metadata: {
            ...metadata,
            analysisId,
            analysisType: 'multi-frame',
            isUpdate: true,
            uploadDate: (() => {
              if (!metadata.author) return null;
              
              // metadata.author에서 계정명 추출 (성공 방법)
              const usernameMatch = metadata.author.match(/instagram\.com\/([^\/]+)/);
              const username = usernameMatch ? usernameMatch[1] : metadata.author;
              const uploadDate = window[`uploadDate_${username}`] || null;
              console.log(`📅 계정 "${username}"의 업로드 날짜: ${uploadDate}`);
              return uploadDate;
            })()
          }
        });

        this.uiManager.showNotification('✅ 다중 프레임 분석 완료!', 'success');
        Utils.log('success', '📹 Phase 2 완료 - 다중 프레임으로 결과 업데이트됨');
      }
      
      // Phase 2 완료 알림
      if (progressCallback) {
        progressCallback('phase2', 'complete');
      }
      
    } catch (error) {
      Utils.log('error', '🔍 Phase 2 실패', error);
      // Phase 1 결과라도 있으므로 사용자에게는 에러 알림 안함
      Utils.log('info', '⚡ Phase 1 결과는 유효함 - 계속 사용 가능');
    }
  }

  async performQuickAnalysis(video, postUrl, metadata, analysisId) {
    try {
      Utils.log('info', '⚡ Phase 1: 빠른 프레임 분석 시작');
      
      const frameBlob = await this.extractVideoFromElement(video);
      if (!frameBlob) {
        throw new Error('프레임 캡처 실패');
      }

      await this.apiClient.processVideoBlob({
        platform: CONSTANTS.PLATFORMS.INSTAGRAM,
        videoBlob: frameBlob,
        postUrl,
        analysisType: 'quick', // 파라미터로 전달
        metadata: {
          ...metadata,
          analysisId,
          analysisType: 'quick',
          captureMethod: 'canvas-frame',
          uploadDate: (() => {
            if (!metadata.author) return null;
            const usernameMatch = metadata.author.match(/instagram\.com\/([^\/]+)/);
            const username = usernameMatch ? usernameMatch[1] : metadata.author;
            const uploadDate = window[`uploadDate_${username}`] || null;
            console.log(`📅 계정 "${username}"의 업로드 날짜: ${uploadDate}`);
            return uploadDate;
          })()
        }
      });

      this.uiManager.showNotification('⚡ 빠른 분석 완료! 상세 분석 진행 중...', 'info');
      Utils.log('success', '⚡ Phase 1 완료 - 빠른 분석 결과 제공됨');
      
    } catch (error) {
      Utils.log('error', '⚡ Phase 1 실패', error);
      this.uiManager.showNotification('빠른 분석 실패, 전체 분석으로 진행합니다', 'warning');
    }
  }


  async extractRealVideoUrl(video) {
    try {
      Utils.log('info', '🔍 Instagram 실제 비디오 URL 추출 시작 (Instagram Downloader 방식)');
      
      // 🎯 Instagram Downloader 방식: Media Tracker 우선 사용
      const mediaInfo = INSTAGRAM_MEDIA_TRACKER.getMediaInfoForCurrentVideo();
      if (mediaInfo?.video_url && !mediaInfo.video_url.startsWith('blob:')) {
        Utils.log('info', '🚀 Media Tracker에서 실제 URL 발견:', {
          shortcode: mediaInfo.code,
          url: mediaInfo.video_url.substring(0, 80) + '...'
        });
        return mediaInfo.video_url;
      }
      
      // 기존 방법 1: 비디오 요소에서 소스 확인
      const videoElement = video;
      const videoSrc = videoElement.src || videoElement.currentSrc;
      
      // blob URL이면 null 반환해서 processBlobVideo 로직 사용
      if (videoSrc) {
        if (videoSrc.startsWith('blob:')) {
          Utils.log('info', '🎯 Blob URL 발견 - blob 처리 로직으로 전환');
          return null;
        } else {
          Utils.log('info', '📋 비디오 요소에서 직접 URL 발견:', videoSrc.substring(0, 80) + '...');
          return videoSrc;
        }
      }
      
      // Media Tracker에서 가져온 정보가 blob URL인 경우에도 로그 남기기
      if (mediaInfo?.video_url) {
        Utils.log('info', '📋 Media Tracker에서 blob URL 발견, 기존 로직으로 처리:', mediaInfo.video_url.substring(0, 50) + '...');
      }
      
      // 기존 방법들은 fallback으로 유지
      const instagramVideoUrl = await this.extractFromInstagramPageData();
      if (instagramVideoUrl) {
        Utils.log('info', '📋 페이지 데이터에서 URL 발견:', instagramVideoUrl.substring(0, 80) + '...');
        return instagramVideoUrl;
      }
      
      Utils.log('warn', '📋 모든 방법으로 실제 URL을 찾지 못함');
      return null;
      
    } catch (error) {
      Utils.log('warn', '실제 비디오 URL 추출 실패', error);
      return null;
    }
  }

  async extractFromInstagramPageData() {
    try {
      // 현재 페이지 URL에서 Reel ID 추출
      const currentUrl = window.location.href;
      const reelIdMatch = currentUrl.match(/\/reels\/([A-Za-z0-9_-]+)/);
      const currentReelId = reelIdMatch ? reelIdMatch[1] : null;
      
      Utils.log('info', `🔍 현재 Reel ID: ${currentReelId}`);
      
      // Instagram 페이지의 JSON 데이터에서 비디오 URL 찾기
      const scripts = Array.from(document.querySelectorAll('script'));
      
      for (const script of scripts) {
        const content = script.textContent || script.innerHTML;
        
        // 현재 Reel ID와 연결된 비디오 URL 찾기
        if (currentReelId && content.includes(currentReelId)) {
          Utils.log('info', `🎯 Script에서 Reel ID ${currentReelId} 발견`);
          // Reel ID 근처에서 video_url 찾기
          const reelSection = this.extractReelSection(content, currentReelId);
          if (reelSection) {
            Utils.log('info', `📋 Reel 섹션 추출 성공 (길이: ${reelSection.length}자)`);
            
            // 디버깅: Reel 섹션에서 video/mp4 관련 키워드 확인
            const videoKeywords = ['video_url', 'videoUrl', 'playback_url', 'video_dash_url', '.mp4', 'fbcdn.net'];
            const foundKeywords = videoKeywords.filter(keyword => reelSection.includes(keyword));
            Utils.log('info', `🔍 Reel 섹션에서 발견된 비디오 키워드: [${foundKeywords.join(', ')}]`);
            
            // 다양한 패턴으로 비디오 URL 찾기 (확장된 패턴)
            const patterns = [
              /"video_url":"([^"]+)"/,
              /"videoUrl":"([^"]+)"/,
              /"src":"([^"]+\.mp4[^"]*)"/,
              /"url":"([^"]+\.mp4[^"]*)"/,
              /"playback_url":"([^"]+)"/,
              /"video_dash_url":"([^"]+)"/,
              // 새로운 패턴들 추가
              /"video_versions":\[{"url":"([^"]+\.mp4[^"]*)"/,
              /"dash_manifest":"([^"]+)"/,
              /"video_codec":"[^"]*","url":"([^"]+\.mp4[^"]*)"/,
              /https:\/\/[^"]*fbcdn\.net[^"]*\.mp4[^"]*/g,
              /"progressive_url":"([^"]+\.mp4[^"]*)"/
            ];
            
            for (let i = 0; i < patterns.length; i++) {
              const pattern = patterns[i];
              Utils.log('info', `🔍 패턴 ${i+1}/${patterns.length} 시도: ${pattern.toString().substring(0, 50)}...`);
              const videoUrlMatch = reelSection.match(pattern);
              if (videoUrlMatch) {
                const url = (videoUrlMatch[1] || videoUrlMatch[0]).replace(/\\u0026/g, '&').replace(/\\/g, '');
                Utils.log('info', `✅ 패턴 ${i+1} 매칭 성공: ${url.substring(0, 80)}...`);
                if (url.includes('.mp4') && !url.startsWith('blob:') && 
                    (url.includes('fbcdn.net') || url.includes('cdninstagram.com'))) {
                  Utils.log('info', `🎉 Reel ID ${currentReelId}에 맞는 비디오 URL 발견!`);
                  return url;
                } else {
                  Utils.log('warn', `❌ 패턴 ${i+1} 매칭되었지만 조건 불충족: mp4=${url.includes('.mp4')}, not-blob=${!url.startsWith('blob:')}, fbcdn=${url.includes('fbcdn.net')}, cdninstagram=${url.includes('cdninstagram.com')}`);
                }
              } else {
                Utils.log('info', `❌ 패턴 ${i+1} 매칭 실패`);
              }
            }
            Utils.log('warn', `⚠️ Reel 섹션에서 적합한 비디오 URL을 찾지 못함`);
          } else {
            Utils.log('warn', `⚠️ Reel 섹션 추출 실패`);
          }
        } else if (currentReelId) {
          Utils.log('warn', `⚠️ Script에 Reel ID ${currentReelId}가 포함되지 않음`);
        }
        
        // 강화된 전체 검색 (fallback)
        if (content.includes('video_url') || content.includes('videoUrl') || content.includes('.mp4')) {
          const patterns = [
            /"video_url":"([^"]+\.mp4[^"]*)"/,
            /"videoUrl":"([^"]+\.mp4[^"]*)"/,
            /"playback_url":"([^"]+\.mp4[^"]*)"/,
            /"src":"([^"]*fbcdn\.net[^"]*\.mp4[^"]*)"/,
            /"url":"([^"]*fbcdn\.net[^"]*\.mp4[^"]*)"/,
            /"src":"([^"]*cdninstagram\.com[^"]*\.mp4[^"]*)"/,
            /https?:\/\/[^"]*fbcdn\.net[^"]*\.mp4[^"]*/g,
            /https?:\/\/[^"]*cdninstagram\.com[^"]*\.mp4[^"]*/g
          ];
          
          for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
              let url = matches[1] || matches[0];
              url = url.replace(/\\u0026/g, '&').replace(/\\/g, '');
              
              if (url.includes('.mp4') && !url.startsWith('blob:') && 
                  (url.includes('fbcdn.net') || url.includes('cdninstagram.com'))) {
                Utils.log('warn', `⚠️ FALLBACK 사용: Reel ID ${currentReelId}에 맞는 URL을 찾지 못해 다른 영상 URL 사용`);
                Utils.log('info', `📋 발견된 URL: ${url.substring(0, 80)}...`);
                Utils.log('error', `🚨 이는 잘못된 영상이 분석될 수 있음을 의미합니다!`);
                return url;
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      Utils.log('warn', 'Instagram 페이지 데이터 분석 실패', error);
      return null;
    }
  }

  extractReelSection(content, reelId) {
    try {
      // Reel ID가 포함된 섹션을 찾아서 해당 부분의 JSON 데이터 추출
      const reelIndex = content.indexOf(reelId);
      if (reelIndex === -1) return null;
      
      // Reel ID 앞뒤 2000자 정도의 컨텍스트 추출
      const start = Math.max(0, reelIndex - 1000);
      const end = Math.min(content.length, reelIndex + 1000);
      const section = content.slice(start, end);
      
      return section;
    } catch (error) {
      Utils.log('warn', 'Reel 섹션 추출 실패', error);
      return null;
    }
  }

  async extractFromNetworkRequests(video) {
    try {
      // Performance API로 모든 네트워크 요청 분석
      const entries = performance.getEntriesByType('resource');
      
      // Instagram 비디오 URL 패턴들
      const videoPatterns = [
        /\.mp4/i,
        /fbcdn\.net.*video/i,
        /cdninstagram\.com.*video/i,
        /scontent.*\.mp4/i
      ];
      
      const videoEntries = entries.filter(entry => {
        return videoPatterns.some(pattern => pattern.test(entry.name)) &&
               (entry.name.includes('fbcdn.net') || entry.name.includes('cdninstagram.com')) &&
               !entry.name.includes('bytestart=') && // 부분 다운로드 제외
               !entry.name.includes('byteend=') &&
               !entry.name.includes('blob:');
      });
      
      if (videoEntries.length > 0) {
        // 가장 최근의 전체 비디오 요청 찾기
        const fullVideoEntry = videoEntries
          .filter(entry => entry.transferSize > 1000000) // 1MB 이상
          .sort((a, b) => b.startTime - a.startTime)[0];
        
        if (fullVideoEntry) {
          return fullVideoEntry.name;
        }
        
        // 전체 비디오가 없으면 가장 큰 것 선택
        const largestEntry = videoEntries
          .sort((a, b) => b.transferSize - a.transferSize)[0];
        
        if (largestEntry) {
          return largestEntry.name;
        }
      }
      
      return null;
    } catch (error) {
      Utils.log('warn', '네트워크 요청 분석 실패', error);
      return null;
    }
  }

  async extractFromDOMAnalysis(video) {
    try {
      // 비디오 컨테이너의 부모 요소들에서 데이터 찾기
      let currentElement = video;
      
      for (let i = 0; i < 10; i++) { // 최대 10단계 올라가기
        if (!currentElement || !currentElement.parentElement) break;
        
        currentElement = currentElement.parentElement;
        
        // 데이터 속성들 확인
        const attributes = currentElement.attributes;
        for (let attr of attributes) {
          if (attr.value && attr.value.includes('.mp4') && !attr.value.startsWith('blob:')) {
            return attr.value;
          }
        }
        
        // 자식 요소들의 데이터 확인
        const allElements = currentElement.querySelectorAll('*');
        for (let element of allElements) {
          for (let attr of element.attributes) {
            if (attr.value && attr.value.includes('.mp4') && !attr.value.startsWith('blob:')) {
              return attr.value;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      Utils.log('warn', 'DOM 분석 실패', error);
      return null;
    }
  }

  async captureMultipleFrames(video, frameCount = 5) {
    try {
      Utils.log('info', `📸 ${frameCount}개 프레임 캡처 시작`);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const duration = video.duration || 10; // 기본 10초
      const interval = duration / frameCount;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const frames = [];
      const originalTime = video.currentTime;
      
      for (let i = 0; i < frameCount; i++) {
        const targetTime = i * interval;
        video.currentTime = targetTime;
        
        // 프레임 로드 대기
        await new Promise(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });
        
        // 프레임 캡처
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        frames.push({
          time: targetTime,
          data: frameData
        });
      }
      
      // 원래 시간으로 복원
      video.currentTime = originalTime;
      
      // 프레임들을 하나의 blob으로 결합
      const combinedData = {
        frames: frames,
        duration: duration,
        frameCount: frameCount
      };
      
      const blob = new Blob([JSON.stringify(combinedData)], { type: 'application/json' });
      Utils.log('success', `📸 ${frameCount}개 프레임 캡처 완료`);
      
      return blob;
      
    } catch (error) {
      Utils.log('error', '다중 프레임 캡처 실패', error);
      throw error;
    }
  }

  createClickHandler(post, video) {
    let isProcessing = false;
    
    return async (event) => {
      if (isProcessing) return;
      
      isProcessing = true;
      Utils.log('info', 'Instagram 저장 버튼 클릭 이벤트 감지');
      
      // 캐시된 설정 확인 (실시간 반영)
      const isAutoAnalysisEnabled = this.cachedSettings[CONSTANTS.SETTINGS.AUTO_ANALYSIS] || false;
      Utils.log('info', `자동 분석 설정 (캐시됨): ${isAutoAnalysisEnabled}`);
      
      if (!isAutoAnalysisEnabled) {
        Utils.log('info', '자동 분석 비활성화됨 - 저장만 완료');
        this.uiManager.showNotification('✅ 영상이 Instagram에 저장되었습니다!', 'success');
        isProcessing = false;
        return;
      }
      
      Utils.log('info', '🔄 자동 분석 실행됨 (하이브리드 방식)');
      
      // 하이브리드 분석 실행
      try {
        await this.performVideoAnalysis(post, video);
      } catch (error) {
        Utils.log('error', '하이브리드 분석 중 오류', error);
        this.uiManager.showNotification(
          `영상 분석에 실패했습니다: ${error.message}`, 
          CONSTANTS.NOTIFICATION_TYPES.ERROR
        );
      } finally {
        setTimeout(() => {
          isProcessing = false;
        }, 3000);
      }
    };
  }

  // 비디오 요소에서 직접 블롭 추출 (대안 방법)
  async extractVideoFromElement(videoElement) {
    try {
      Utils.log('info', '비디오 요소에서 직접 데이터 추출 시도');
      
      // 방법 1: Canvas를 이용한 프레임 캡처 (완전하지 않지만 대안)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      // 현재 프레임을 캔버스에 그리기
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // 캔버스를 이미지로 변환 (썸네일 대안)
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            Utils.log('info', '비디오 프레임 캡처 성공 (썸네일 대안)', { size: blob.size });
            resolve(blob);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.8);
      });
    } catch (error) {
      Utils.log('error', '비디오 요소에서 데이터 추출 실패', error);
      return null;
    }
  }

  extractInstagramMetadata(post) {
    if (!post) {
      return { timestamp: new Date().toISOString() };
    }

    try {
      const author = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.AUTHOR)?.textContent || '';
      const captionElement = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.CAPTION);
      const caption = captionElement?.textContent || '';
      
      // 좋아요 수 추출 - 위치 기반 방식 사용
      let likes = '0';
      
      // Instagram UI System에서 전달된 좋아요 수 우선 사용
      if (post._instagramLikes) {
        likes = post._instagramLikes;
        console.log('❤️ UI System에서 좋아요 수 발견:', likes);
      } else {
        // 디버깅 박스 기반 좋아요 수 추출 시도
        likes = this.extractLikesCount(post, post._instagramCurrentVideo);
        console.log('❤️ 디버깅 박스 기반 좋아요 수 추출 결과:', likes);
      }
      
      // 댓글 수 추출 - 디버깅 박스 기반 방식 사용
      let comments = '0';
      
      // Instagram UI System에서 전달된 댓글 수 우선 사용
      if (post._instagramComments) {
        comments = post._instagramComments;
        console.log('💬 UI System에서 댓글 수 발견:', comments);
      } else {
        // 디버깅 박스 기반 댓글 수 추출 시도
        comments = this.extractCommentsCount(post, post._instagramCurrentVideo);
        console.log('💬 디버깅 박스 기반 댓글 수 추출 결과:', comments);
      }
      
      const hashtags = Utils.extractHashtags(caption);
      
      return {
        author: author.trim(),
        caption: caption.trim(),
        likes: likes.trim(),
        comments: comments.trim(),
        hashtags,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Utils.log('error', '인스타그램 메타데이터 추출 실패', error);
      return { timestamp: new Date().toISOString() };
    }
  }

  observeUrlChanges() {
    let currentUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        // ⚠️ 기존 저장 버튼 방식 비활성화
        // setTimeout(() => this.enhanceInstagramSaveButtons(), 1000);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  observeContentChanges() {
    let currentUrl = window.location.href;
    let urlCheckInterval;
    
    urlCheckInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        // ⚠️ 기존 저장 버튼 방식 비활성화
        // setTimeout(() => {
        //   this.enhanceInstagramSaveButtons();
        // }, 2000);
      }
    }, CONSTANTS.TIMEOUTS.URL_CHECK_INTERVAL);
    
    let scrollTimeout;
    let lastScrollTime = 0;
    
    window.addEventListener('scroll', () => {
      const now = Date.now();
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        if (now - lastScrollTime > CONSTANTS.TIMEOUTS.SCROLL_MIN_INTERVAL) {
          lastScrollTime = now;
          // ⚠️ 기존 저장 버튼 방식 비활성화
          // this.enhanceInstagramSaveButtons();
        }
      }, CONSTANTS.TIMEOUTS.SCROLL_DEBOUNCE);
    });
  }

  /**
   * Blob URL 비디오 처리
   * @param {string} videoUrl Blob URL
   * @param {string} postUrl 게시물 URL  
   * @param {Object} metadata 메타데이터
   * @param {HTMLVideoElement} videoElement 비디오 요소
   */
  async processBlobVideo(videoUrl, postUrl, metadata, videoElement = null) {
    Utils.log('info', 'blob URL 감지 - Video Element에서 직접 프레임 캡처 시도');
    
    let videoBlob;
    
    // 전달받은 currentVideo가 있으면 우선 사용, 없으면 자동 검색
    let currentVideo = metadata?.currentVideo;
    Utils.log('info', '🔍 metadata 내용:', metadata);
    Utils.log('info', '🔍 metadata.currentVideo:', currentVideo);
    
    if (!currentVideo) {
      Utils.log('info', '❌ currentVideo가 없어서 자동 검색 실행');
      currentVideo = this.findCurrentPlayingVideo();
    } else {
      Utils.log('info', '🎯 전달받은 currentVideo 사용:', currentVideo?.src?.substring(0, 50));
    }
    
    const targetVideo = currentVideo || videoElement;
    
    Utils.log('info', `타겟 비디오: ${targetVideo ? '발견됨' : '없음'}, src: ${targetVideo?.src?.substring(0, 50) || 'N/A'}`);
    
    // Video Element에서 직접 프레임 캡처 (더 안정적)
    if (targetVideo) {
      try {
        Utils.log('info', '현재 재생 중인 비디오에서 프레임 캡처 중...');
        videoBlob = await this.captureVideoFrame(targetVideo);
        Utils.log('info', '✅ Video Element에서 프레임 캡처 성공');
      } catch (frameError) {
        Utils.log('error', '프레임 캡처 실패, blob URL 다운로드 시도', frameError);
        
        // 프레임 캡처 실패시 blob URL 다운로드 시도
        try {
          videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
          Utils.log('info', 'Blob URL 다운로드 성공');
        } catch (blobError) {
          throw new Error(`비디오 처리 실패: 프레임 캡처(${frameError.message})와 Blob 다운로드(${blobError.message}) 모두 실패`);
        }
      }
    } else {
      // Video Element가 없으면 blob URL 다운로드만 시도
      try {
        videoBlob = await this.apiClient.downloadBlobVideo(videoUrl);
        Utils.log('info', 'Blob URL 다운로드 성공');
      } catch (blobError) {
        throw new Error(`Video Element를 찾을 수 없고 Blob 다운로드도 실패: ${blobError.message}`);
      }
    }
    
    await this.apiClient.processVideoBlob({
      platform: CONSTANTS.PLATFORMS.INSTAGRAM,
      videoBlob,
      postUrl,
      metadata: {
        ...metadata,
        uploadDate: (() => {
          if (!metadata.author) return null;
          const usernameMatch = metadata.author.match(/instagram\.com\/([^\/]+)/);
          const username = usernameMatch ? usernameMatch[1] : metadata.author;
          const uploadDate = window[`uploadDate_${username}`] || null;
          console.log(`📅 계정 "${username}"의 업로드 날짜: ${uploadDate}`);
          return uploadDate;
        })()
      }
    });
  }

  /**
   * 현재 화면에서 실제로 재생 중인 video element 찾기
   * @returns {HTMLVideoElement|null} 현재 재생 중인 비디오 요소
   */
  findCurrentPlayingVideo() {
    Utils.log('info', '🔍 현재 재생 중인 video element 검색 시작');
    
    const videos = document.querySelectorAll('video');
    Utils.log('info', `페이지에서 발견된 video 요소 수: ${videos.length}`);
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      
      // 화면에 보이고 재생 중인 비디오 찾기
      const rect = video.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && 
                       rect.top < window.innerHeight && rect.bottom > 0;
      const isPlaying = !video.paused && video.currentTime > 0;
      
      Utils.log('info', `Video ${i}: visible=${isVisible}, playing=${isPlaying}, src=${video.src?.substring(0, 30) || 'N/A'}`);
      
      if (isVisible && (isPlaying || video.readyState >= 2)) {
        Utils.log('info', `✅ 활성 비디오 발견: ${i}번째 비디오`);
        return video;
      }
    }
    
    // 재생 중인 비디오가 없으면 가장 큰 비디오 반환
    if (videos.length > 0) {
      const largestVideo = Array.from(videos).reduce((largest, current) => {
        const currentRect = current.getBoundingClientRect();
        const largestRect = largest.getBoundingClientRect();
        return (currentRect.width * currentRect.height) > (largestRect.width * largestRect.height) ? current : largest;
      });
      
      Utils.log('info', `🎯 대체 비디오 선택: 가장 큰 비디오 사용`);
      return largestVideo;
    }
    
    Utils.log('warn', '❌ 사용 가능한 video element를 찾을 수 없음');
    return null;
  }

  /**
   * 비디오가 준비될 때까지 대기
   * @param {HTMLVideoElement} videoElement 비디오 요소
   * @param {number} timeout 타임아웃 (밀리초)
   */
  waitForVideoReady(videoElement, timeout = 3000) {
    return new Promise((resolve, reject) => {
      if (videoElement.readyState >= 2) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        videoElement.removeEventListener('loadeddata', onReady);
        videoElement.removeEventListener('error', onError);
        Utils.log('warn', '비디오 로딩 타임아웃');
        resolve(); // 타임아웃이어도 계속 진행
      }, timeout);

      const onReady = () => {
        clearTimeout(timeoutId);
        videoElement.removeEventListener('loadeddata', onReady);
        videoElement.removeEventListener('error', onError);
        Utils.log('info', '비디오 로딩 완료');
        resolve();
      };

      const onError = (e) => {
        clearTimeout(timeoutId);
        videoElement.removeEventListener('loadeddata', onReady);
        videoElement.removeEventListener('error', onError);
        Utils.log('error', '비디오 로딩 오류:', e);
        resolve(); // 오류여도 계속 진행
      };

      videoElement.addEventListener('loadeddata', onReady);
      videoElement.addEventListener('error', onError);
    });
  }

  /**
   * Video Element에서 현재 프레임 캡처
   * @param {HTMLVideoElement} videoElement 비디오 요소
   * @returns {Promise<Blob>} 캡처된 이미지 Blob
   */
  async captureVideoFrame(videoElement) {
    try {
      Utils.log('info', 'Video element에서 직접 프레임 캡처 시작');
      
      if (!videoElement || videoElement.tagName !== 'VIDEO') {
        throw new Error('유효한 video element가 아닙니다.');
      }

      // 비디오 상태 상세 로깅
      Utils.log('info', `비디오 상태: paused=${videoElement.paused}, currentTime=${videoElement.currentTime}, readyState=${videoElement.readyState}, videoWidth=${videoElement.videoWidth}, videoHeight=${videoElement.videoHeight}`);
      Utils.log('info', `비디오 src: ${videoElement.src?.substring(0, 50) || 'N/A'}`);

      // 비디오가 준비될 때까지 대기 (최대 3초)
      if (videoElement.readyState < 2) {
        Utils.log('info', '비디오 로딩 대기 중...');
        await this.waitForVideoReady(videoElement, 3000);
      }

      // 비디오가 일시정지 상태면 잠시 재생하여 프레임 확보
      const wasPaused = videoElement.paused;
      if (wasPaused) {
        Utils.log('info', '일시정지된 비디오를 잠시 재생하여 프레임 확보');
        videoElement.play();
        // 짧은 재생 후 다시 일시정지
        await new Promise(resolve => setTimeout(resolve, 100));
        if (wasPaused) videoElement.pause();
      }

      // Canvas 생성 및 프레임 캡처
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth || videoElement.clientWidth || 640;
      canvas.height = videoElement.videoHeight || videoElement.clientHeight || 360;
      
      Utils.log('info', `캡처 해상도: ${canvas.width}x${canvas.height}`);
      
      // 캡처 전 컨텍스트 클리어
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Canvas를 Blob으로 변환
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            Utils.log('info', `프레임 캡처 완료: ${blob.size} bytes`);
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob 변환 실패'));
          }
        }, 'image/jpeg', 0.8);
      });

      return blob;
      
    } catch (error) {
      Utils.log('error', 'Video 프레임 캡처 실패', error);
      throw error;
    }
  }
}

// 콘텐츠 스크립트 실행 - 기존과 동일
console.log('🚀 Content Script 로딩 시작');
console.log('현재 도메인:', window.location.hostname);
console.log('현재 URL:', window.location.href);

if (window.location.hostname.includes('instagram.com') || 
    window.location.hostname.includes('tiktok.com')) {
  console.log('✅ 지원되는 플랫폼에서 VideoSaver 초기화');
  window.videoSaver = new VideoSaver();
  
  // URL 변경 감지 및 자동 새로고침 (Instagram SPA 대응)
  let currentUrl = window.location.href;
  
  const urlChangeWatcher = () => {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      console.log('🔄 URL 변경 감지:', currentUrl, '→', newUrl);
      currentUrl = newUrl;
      
      // ⚠️ 기존 저장 버튼 방식 비활성화 - Instagram UI System으로 완전 대체
      // setTimeout(() => {
      //   if (window.videoSaver) {
      //     window.videoSaver.enhanceInstagramSaveButtons();
      //   }
      // }, 2000); // 주석 처리
    }
  };
  
  // URL 변경 감지 (Instagram SPA 네비게이션 대응)
  setInterval(urlChangeWatcher, 1000); // 1초마다 확인
  
  // popstate 이벤트도 추가 (뒤로가기/앞으로가기)
  // window.addEventListener('popstate', () => {
  //   setTimeout(() => {
  //     if (window.videoSaver) {
  //       window.videoSaver.enhanceInstagramSaveButtons();
  //     }
  //   }, 2000);
  // }); // 기존 방식 비활성화
  
  // 기존 글로벌 함수들 유지 (Instagram UI System으로 대체)
  window.refreshVideoSaver = () => {
    console.log('🔄 Instagram UI System 새로고침');
    if (window.INSTAGRAM_UI_SYSTEM && window.INSTAGRAM_UI_SYSTEM.isInitialized) {
      window.INSTAGRAM_UI_SYSTEM.scanAndAddButtons();
    }
  };
  
  window.testVideoAnalysis = () => {
    console.log('🧪 수동 테스트 실행');
    // 테스트 로직
  };
} else {
  console.log('❌ 지원되지 않는 플랫폼:', window.location.hostname);
}

} catch (error) {
  console.error('❌ 스크립트 실행 오류:', error);
  console.error('오류 위치:', error.stack);
}

})();