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
      top: 10px;
      right: 10px;
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
    
    console.log('✅ 분석 버튼 추가됨:', container);
  },
  
  handleAnalysisClick(container, video, button) {
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
    
    // Instagram downloader 방식으로 미디어 정보 추출
    const mediaInfo = this.extractMediaInfoFromContainer(container, video);
    
    if (mediaInfo && mediaInfo.videoUrl) {
      console.log('📹 미디어 정보 발견:', mediaInfo);
      this.processVideoAnalysis(mediaInfo, button);
    } else {
      console.error('❌ 미디어 정보를 찾을 수 없습니다');
      this.resetButton(button, '❌ 실패');
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
  
  extractMediaInfoFromContainer(container, video) {
    console.log('🔍 미디어 정보 추출 시작 - 컨테이너별 개별 추출');
    
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
          mediaData: mediaData
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
        mediaData: mediaData
      };
    }
    
    // 3. 비디오 src 직접 사용 (최종 fallback)
    if (video.src) {
      console.log('📺 비디오 src 사용 (fallback)');
      return {
        videoUrl: video.src,
        shortcode: shortcode || urlShortcode || 'unknown_' + Date.now(),
        mediaData: null,
        isBlob: video.src.includes('blob:')
      };
    }
    
    console.warn('⚠️ 미디어 정보 추출 실패');
    return null;
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
          currentVideo: correctVideo
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
    const bgColor = type === CONSTANTS.NOTIFICATION_TYPES.SUCCESS ? '#4caf50' : 
                    type === CONSTANTS.NOTIFICATION_TYPES.ERROR ? '#f44336' : '#2196f3';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      white-space: pre-line;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, duration);
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
              originalUrl: realVideoUrl !== cleanVideoUrl ? realVideoUrl : undefined
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
            isUpdate: true
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
          captureMethod: 'canvas-frame'
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
      const likesElement = Utils.safeQuerySelector(post, CONSTANTS.SELECTORS.INSTAGRAM.LIKES);
      const likes = likesElement?.textContent || '0';
      const hashtags = Utils.extractHashtags(caption);
      
      return {
        author: author.trim(),
        caption: caption.trim(),
        likes: likes.trim(),
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
      metadata
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