// Content Script - 인스타그램과 틱톡에서 실행되는 스크립트
class VideoSaver {
  constructor() {
    this.serverUrl = 'http://localhost:3003';
    this.currentPlatform = this.detectPlatform();
    this.enhancementTimeout = null;
    this.lastEnhancementTime = 0;
    this.isProcessing = false;
    this.init();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    return null;
  }

  init() {
    console.log('🔧 VideoSaver init() 호출됨');
    console.log('감지된 플랫폼:', this.currentPlatform);
    console.log('document.readyState:', document.readyState);
    
    if (!this.currentPlatform) {
      console.log('❌ 지원되지 않는 플랫폼입니다:', window.location.hostname);
      return;
    }
    
    console.log(`✅ 영상 저장기가 ${this.currentPlatform}에서 실행됩니다.`);
    console.log('현재 URL:', window.location.href);
    
    // 페이지 로드 완료 대기
    if (document.readyState === 'loading') {
      console.log('📄 문서 로딩 중 - DOMContentLoaded 이벤트 대기');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOMContentLoaded 이벤트 발생 - setup() 호출');
        this.setup();
      });
    } else {
      console.log('📄 문서 이미 로드됨 - 즉시 setup() 호출');
      this.setup();
    }
  }

  setup() {
    console.log('⚙️ setup() 함수 실행 시작');
    
    // Instagram 기본 저장 버튼에 기능 추가
    console.log('🔍 enhanceInstagramSaveButtons() 호출');
    this.enhanceInstagramSaveButtons();
    
    // URL 변경 감지 (SPA 대응)
    console.log('🔄 observeUrlChanges() 호출');
    this.observeUrlChanges();
    
    // 동적 콘텐츠 감지
    console.log('👀 observeContentChanges() 호출');
    this.observeContentChanges();
    
    console.log('✅ setup() 함수 실행 완료');
  }

  addSaveButtons() {
    setTimeout(() => {
      if (this.currentPlatform === 'instagram') {
        this.addInstagramSaveButtons();
      } else if (this.currentPlatform === 'tiktok') {
        this.addTikTokSaveButtons();
      }
    }, 2000); // 페이지 로드 대기
  }

  addInstagramSaveButtons() {
    console.log('🔍 Instagram 저장 버튼 추가 시도 중...');
    
    // 여러 가지 선택자로 인스타그램 게시물 찾기 시도
    let posts = document.querySelectorAll('article[role="presentation"]');
    console.log(`article[role="presentation"] 선택자로 발견된 게시물: ${posts.length}`);
    
    if (posts.length === 0) {
      posts = document.querySelectorAll('article');
      console.log(`article 선택자로 발견된 게시물: ${posts.length}`);
    }
    
    if (posts.length === 0) {
      posts = document.querySelectorAll('[role="article"]');
      console.log(`[role="article"] 선택자로 발견된 게시물: ${posts.length}`);
    }
    
    // 비디오 요소 직접 검색
    const allVideos = document.querySelectorAll('video');
    console.log(`전체 비디오 요소 수: ${allVideos.length}`);
    
    // 비디오 기반 접근
    allVideos.forEach((video, index) => {
      console.log(`비디오 ${index + 1} 처리 중...`);
      
      // 이미 버튼이 있는지 확인
      const existingButton = video.closest('div').querySelector('.video-save-button');
      if (existingButton) {
        console.log(`비디오 ${index + 1}: 이미 버튼이 있음`);
        return;
      }
      
      // 부모 요소에서 적절한 컨테이너 찾기
      let container = video.closest('article') || video.closest('div[role="button"]') || video.parentElement;
      
      if (!container) {
        console.log(`비디오 ${index + 1}: 적절한 컨테이너를 찾을 수 없음`);
        return;
      }
      
      console.log(`비디오 ${index + 1}: 컨테이너 발견!`, container.tagName);
      
      // 액션 버튼 영역 찾기 또는 생성
      let actionArea = container.querySelector('section') || 
                      container.querySelector('[role="toolbar"]') ||
                      container.querySelector('div[style*="flex"]');
      
      if (!actionArea) {
        // 액션 영역이 없으면 비디오 근처에 직접 추가
        console.log(`비디오 ${index + 1}: 액션 영역을 찾을 수 없어 비디오 위에 직접 추가`);
        actionArea = this.createActionArea(video);
      } else {
        console.log(`비디오 ${index + 1}: 기존 액션 영역 발견!`, actionArea.tagName);
      }
      
      // 저장 버튼 생성
      const saveButton = this.createSaveButton();
      saveButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveInstagramVideo(container, video);
      };
      
      // 버튼 추가
      try {
        actionArea.appendChild(saveButton);
        console.log(`✅ 비디오 ${index + 1}: 저장 버튼이 액션 영역에 추가됨`);
        
        // 버튼이 실제로 보이는지 확인
        setTimeout(() => {
          const rect = saveButton.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          console.log(`버튼 ${index + 1} 가시성 확인:`, {
            visible: isVisible,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          });
          
          if (!isVisible) {
            console.log(`버튼 ${index + 1}이 보이지 않음. body에 직접 추가 시도`);
            this.addFloatingButton(video, saveButton);
          }
        }, 500);
        
      } catch (error) {
        console.error(`버튼 ${index + 1} 추가 실패:`, error);
        // 실패시 대안: body에 플로팅 버튼으로 추가
        this.addFloatingButton(video, saveButton);
      }
    });
  }
  
  createActionArea(video) {
    const actionArea = document.createElement('div');
    actionArea.className = 'video-save-action-area';
    actionArea.style.cssText = `
      position: absolute !important;
      top: 15px !important;
      right: 15px !important;
      z-index: 10000 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 8px !important;
      pointer-events: auto !important;
    `;
    
    // 비디오의 부모에 relative position 추가
    const videoParent = video.parentElement;
    if (videoParent) {
      const currentPosition = getComputedStyle(videoParent).position;
      if (currentPosition === 'static') {
        videoParent.style.position = 'relative';
        console.log('부모 요소에 relative position 추가됨');
      }
      
      videoParent.appendChild(actionArea);
      console.log('액션 영역이 비디오 부모에 추가됨:', videoParent.tagName);
    }
    
    return actionArea;
  }
  
  addFloatingButton(video, saveButton) {
    // 비디오의 위치를 기반으로 플로팅 버튼 생성
    const rect = video.getBoundingClientRect();
    
    const floatingContainer = document.createElement('div');
    floatingContainer.className = 'video-save-floating-container';
    floatingContainer.style.cssText = `
      position: fixed !important;
      top: ${rect.top + 20}px !important;
      right: 20px !important;
      z-index: 99999 !important;
      pointer-events: auto !important;
    `;
    
    // 기존 버튼 제거하고 플로팅 컨테이너에 추가
    if (saveButton.parentElement) {
      saveButton.parentElement.removeChild(saveButton);
    }
    
    floatingContainer.appendChild(saveButton);
    document.body.appendChild(floatingContainer);
    
    console.log('🚁 플로팅 버튼이 body에 추가됨');
    
    // 스크롤시 위치 업데이트
    const updatePosition = () => {
      const newRect = video.getBoundingClientRect();
      floatingContainer.style.top = `${newRect.top + 20}px`;
    };
    
    window.addEventListener('scroll', updatePosition);
    
    // 비디오가 화면에서 벗어나면 버튼 제거
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          if (document.body.contains(floatingContainer)) {
            document.body.removeChild(floatingContainer);
            window.removeEventListener('scroll', updatePosition);
            observer.disconnect();
          }
        }
      });
    });
    
    observer.observe(video);
  }

  addTikTokSaveButtons() {
    // 틱톡 비디오 찾기
    const videos = document.querySelectorAll('[data-e2e="video-player"]');
    
    videos.forEach(videoContainer => {
      if (videoContainer.querySelector('.video-save-button')) return;
      
      const videoElement = videoContainer.querySelector('video');
      if (!videoElement) return;
      
      // 사이드 액션 버튼 컨테이너 찾기
      const sideActions = videoContainer.closest('[data-e2e="video-wrapper"]')
        ?.querySelector('[data-e2e="video-side-actions"]');
      
      if (!sideActions) return;
      
      // 저장 버튼 생성
      const saveButton = this.createSaveButton();
      saveButton.onclick = () => this.saveTikTokVideo(videoContainer, videoElement);
      
      // 버튼 추가
      sideActions.appendChild(saveButton);
    });
  }

  createSaveButton() {
    const button = document.createElement('button');
    button.className = 'video-save-button';
    button.style.cssText = `
      all: unset !important;
      position: relative !important;
      z-index: 9999 !important;
      display: inline-block !important;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
      color: white !important;
      padding: 10px 15px !important;
      border-radius: 25px !important;
      border: 2px solid white !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: bold !important;
      text-align: center !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
      transition: all 0.3s ease !important;
      margin: 8px !important;
      min-width: 140px !important;
      white-space: nowrap !important;
    `;
    
    button.innerHTML = '💾 저장 & 분석';
    
    // 호버 효과
    button.onmouseenter = () => {
      button.style.transform = 'scale(1.1) !important';
      button.style.background = 'linear-gradient(45deg, #ff5252, #26c6da) !important';
    };
    
    button.onmouseleave = () => {
      button.style.transform = 'scale(1) !important';  
      button.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4) !important';
    };
    
    console.log('✅ 저장 버튼 생성 완료');
    return button;
  }

  async saveInstagramVideo(post, videoElement) {
    try {
      const videoUrl = videoElement.src;
      const postUrl = window.location.href;
      
      // 메타데이터 추출
      const metadata = this.extractInstagramMetadata(post);
      
      await this.processVideo({
        platform: 'instagram',
        videoUrl,
        postUrl,
        metadata
      });
      
    } catch (error) {
      console.error('인스타그램 영상 저장 실패:', error);
      this.showNotification('영상 저장에 실패했습니다.', 'error');
    }
  }

  async saveTikTokVideo(videoContainer, videoElement) {
    try {
      const videoUrl = videoElement.src;
      const postUrl = window.location.href;
      
      // 메타데이터 추출
      const metadata = this.extractTikTokMetadata(videoContainer);
      
      await this.processVideo({
        platform: 'tiktok',
        videoUrl,
        postUrl,
        metadata
      });
      
    } catch (error) {
      console.error('틱톡 영상 저장 실패:', error);
      this.showNotification('영상 저장에 실패했습니다.', 'error');
    }
  }

  extractInstagramMetadata(post) {
    try {
      // 작성자
      const author = post.querySelector('a[role="link"]')?.textContent || '';
      
      // 캡션
      const captionElement = post.querySelector('[data-testid="post-content"] span');
      const caption = captionElement?.textContent || '';
      
      // 좋아요 수
      const likesElement = post.querySelector('button[data-testid="like-count"]');
      const likes = likesElement?.textContent || '0';
      
      // 해시태그 추출
      const hashtags = caption.match(/#[\w가-힣]+/g) || [];
      
      return {
        author,
        caption,
        likes,
        hashtags,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('인스타그램 메타데이터 추출 실패:', error);
      return { timestamp: new Date().toISOString() };
    }
  }

  extractTikTokMetadata(videoContainer) {
    try {
      // 작성자
      const authorElement = document.querySelector('[data-e2e="video-author"]');
      const author = authorElement?.textContent || '';
      
      // 캡션
      const captionElement = document.querySelector('[data-e2e="video-desc"]');
      const caption = captionElement?.textContent || '';
      
      // 좋아요 수
      const likesElement = document.querySelector('[data-e2e="like-count"]');
      const likes = likesElement?.textContent || '0';
      
      // 해시태그 추출
      const hashtags = caption.match(/#[\w가-힣]+/g) || [];
      
      return {
        author,
        caption,
        likes,
        hashtags,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('틱톡 메타데이터 추출 실패:', error);
      return { timestamp: new Date().toISOString() };
    }
  }

  async processVideo(data, buttonElement = null) {
    // buttonElement가 전달되지 않으면 UI 업데이트 생략
    let button = buttonElement;
    let originalContent = null;
    
    if (button) {
      originalContent = button.innerHTML;
    }
    
    // 로딩 상태 (버튼이 있는 경우에만)
    if (button) {
      button.innerHTML = `
        <div style="padding: 8px 12px; background: #666; color: white; border-radius: 20px;">
          ⏳ 처리중...
        </div>
      `;
      button.disabled = true;
    }

    try {
      // 서버로 비디오 데이터 전송
      const response = await fetch(`${this.serverUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        this.showNotification(`✅ 영상이 저장되고 분석되었습니다!\n카테고리: ${result.category || '미정'}`, 'success');
        
        // 성공 상태 (버튼이 있는 경우에만)
        if (button) {
          button.innerHTML = `
            <div style="padding: 8px 12px; background: #4caf50; color: white; border-radius: 20px;">
              ✅ 완료!
            </div>
          `;
        }
      } else {
        throw new Error('서버 처리 실패');
      }
    } catch (error) {
      console.error('비디오 처리 실패:', error);
      this.showNotification('영상 처리에 실패했습니다. 로컬 서버가 실행 중인지 확인해주세요.', 'error');
    } finally {
      // 버튼 상태 복원 (버튼이 있는 경우에만)
      if (button && originalContent) {
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.disabled = false;
        }, 3000);
      }
    }
  }
  
  async downloadBlobVideo(blobUrl, videoElement = null) {
    try {
      console.log('📥 blob 비디오 다운로드 시작:', blobUrl);
      
      const response = await fetch(blobUrl);
      if (response.ok) {
        const blob = await response.blob();
        console.log('✅ blob 비디오 다운로드 완료:', blob.size, 'bytes');
        return blob;
      } else {
        throw new Error('HTTP 오류: ' + response.status);
      }
    } catch (error) {
      console.error('❌ blob 비디오 다운로드 실패:', error);
      throw error;
    }
  }
  
  async processVideoWithBlob(data, buttonElement = null) {
    const { videoBlob, platform, postUrl, metadata } = data;
    
    console.log('📤 blob 비디오를 서버로 전송 중...');
    console.log('비디오 크기:', videoBlob.size, 'bytes');
    console.log('비디오 타입:', videoBlob.type);
    
    try {
      // FormData로 blob 전송
      const formData = new FormData();
      formData.append('video', videoBlob, `instagram_video_${Date.now()}.mp4`);
      formData.append('platform', platform);
      formData.append('postUrl', postUrl);
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await fetch(`${this.serverUrl}/api/process-video-blob`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        this.showNotification(`✅ 영상이 저장되고 분석되었습니다!\n카테고리: ${result.category || '미정'}`, 'success');
      } else {
        throw new Error('서버 처리 실패');
      }
    } catch (error) {
      console.error('blob 비디오 처리 실패:', error);
      this.showNotification('영상 처리에 실패했습니다. 로컬 서버가 실행 중인지 확인해주세요.', 'error');
      throw error;
    }
  }

  observeUrlChanges() {
    let currentUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => this.addSaveButtons(), 1000);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  enhanceInstagramSaveButtons() {
    // 이미 처리 중이면 스킵
    if (this.isProcessing) {
      return;
    }
    
    // 쓰로틀링 - 10초마다 최대 한번만 실행
    const now = Date.now();
    if (now - this.lastEnhancementTime < 10000) {
      return;
    }
    
    this.isProcessing = true;
    console.log('🔍 Instagram 저장 버튼 기능 향상 중...');
    this.lastEnhancementTime = now;
    
    console.log('⏰ setTimeout 설정 - 1초 후 실행 예정');
    setTimeout(() => {
      console.log('⏰ setTimeout 실행됨 - 저장 버튼 검색 시작');
      try {
        // Instagram 저장 버튼 찾기 (북마크 아이콘)
        const saveButtons = document.querySelectorAll('svg[aria-label*="저장"], svg[aria-label*="Save"], svg[aria-label*="save"]');
        console.log(`발견된 저장 버튼 수: ${saveButtons.length}`);
        
        let newButtonsEnhanced = 0;
        
        saveButtons.forEach((svg, index) => {
          console.log(`🔍 저장 버튼 ${index + 1} 검사 중...`);
          console.log(`SVG 요소:`, svg);
          console.log(`SVG 부모:`, svg.parentElement);
          console.log(`SVG 부모의 부모:`, svg.parentElement?.parentElement);
          
          // 여러 방법으로 버튼 요소 찾기 시도
          let button = svg.closest('button');
          if (!button) {
            button = svg.closest('div[role="button"]');
          }
          if (!button) {
            button = svg.parentElement;
          }
          if (!button) {
            button = svg.parentElement?.parentElement;
          }
          
          console.log(`최종 버튼 요소:`, button);
          
          if (!button) {
            console.log(`❌ 버튼 ${index + 1}: 버튼 요소를 찾을 수 없음`);
            return;
          }
          
          if (button.hasAttribute('data-video-save-enhanced')) {
            console.log(`⏭️ 버튼 ${index + 1}: 이미 향상된 버튼 (기존 속성 제거 후 재처리)`);
            // 테스트를 위해 기존 속성 제거
            button.removeAttribute('data-video-save-enhanced');
            // 기존 AI 표시기도 제거
            const existingIndicator = button.querySelector('.ai-indicator');
            if (existingIndicator) {
              existingIndicator.remove();
            }
          }
          
          console.log(`✅ 버튼 ${index + 1}: 새로운 버튼 발견`);
          
          // 이미 향상된 버튼은 스킵
          button.setAttribute('data-video-save-enhanced', 'true');
          
          // 해당 게시물에서 비디오 찾기 - 더 넓은 범위에서 찾기
          let post = button.closest('article');
          if (!post) {
            post = button.closest('div[role="presentation"]');
          }
          if (!post) {
            // 저장 버튼에서 위로 올라가면서 article 찾기
            let current = button;
            for (let i = 0; i < 10; i++) {
              current = current.parentElement;
              if (!current) break;
              if (current.tagName === 'ARTICLE' || current.hasAttribute('role')) {
                post = current;
                break;
              }
            }
          }
          console.log(`게시물 컨테이너:`, post);
          
          // 비디오 찾기 - 여러 방법 시도
          let video = post?.querySelector('video');
          if (!video) {
            // 페이지 전체에서 비디오 찾기 (릴스의 경우)
            video = document.querySelector('video');
          }
          if (!video) {
            // 현재 뷰포트에 보이는 비디오 찾기
            const allVideos = document.querySelectorAll('video');
            for (const v of allVideos) {
              const rect = v.getBoundingClientRect();
              if (rect.top >= 0 && rect.top < window.innerHeight) {
                video = v;
                break;
              }
            }
          }
          console.log(`비디오 요소:`, video);
          console.log(`비디오 src:`, video?.src || video?.currentSrc || '없음');
          
          if (video) {
            console.log(`✅ 저장 버튼 ${index + 1}에 영상 분석 기능 추가`);
            console.log('비디오 정보:', {
              videoSrc: video.src || 'src 없음',
              videoCurrentSrc: video.currentSrc || 'currentSrc 없음',
              videoDuration: video.duration || '길이 정보 없음',
              postElement: post ? post.tagName : '게시물 컨테이너 없음'
            });
            newButtonsEnhanced++;
            console.log('📊 newButtonsEnhanced 증가됨:', newButtonsEnhanced);
            
            console.log('📎 클릭 이벤트 리스너 추가 중...');
            
            // 중복 실행 방지를 위한 플래그
            let isProcessing = false;
            
            const clickHandler = async (event) => {
              // 이미 처리 중이면 무시
              if (isProcessing) {
                console.log('⏭️ 이미 처리 중이므로 스킵');
                return;
              }
              
              isProcessing = true;
              console.log('🎯 Instagram 저장 버튼 클릭 이벤트 감지!');
              console.log('이벤트 타입:', event.type);
              console.log('클릭된 버튼:', button);
              console.log('비디오 요소:', video);
              console.log('현재 URL:', window.location.href);
              
              try {
                console.log('📱 Instagram 저장 후 AI 분석 시작...');
                
                // blob URL이 유효한 동안 즉시 다운로드
                const videoUrl = video.src || video.currentSrc;
                if (videoUrl && videoUrl.startsWith('blob:')) {
                  console.log('⚡ blob URL 즉시 다운로드 시도:', videoUrl);
                  try {
                    const videoBlob = await this.downloadBlobVideo(videoUrl, video);
                    console.log('✅ blob 다운로드 성공, 지연 후 처리 시작');
                    
                    // blob 다운로드 성공 후에만 지연 처리
                    setTimeout(async () => {
                      try {
                        await this.processVideoWithBlob({
                          platform: 'instagram',
                          videoBlob,
                          postUrl: window.location.href,
                          metadata: this.extractInstagramMetadata(post)
                        });
                      } catch (error) {
                        console.error('blob 처리 중 오류:', error);
                      } finally {
                        setTimeout(() => {
                          isProcessing = false;
                        }, 5000);
                      }
                    }, 500);
                  } catch (blobError) {
                    console.error('blob 즉시 다운로드 실패:', blobError);
                    isProcessing = false;
                  }
                } else {
                  // blob이 아닌 URL인 경우 기존 방식 사용
                  setTimeout(async () => {
                    try {
                      await this.processInstagramVideoFromSave(post, video);
                    } catch (error) {
                      console.error('AI 분석 중 오류:', error);
                    } finally {
                      setTimeout(() => {
                        isProcessing = false;
                      }, 5000);
                    }
                  }, 500);
                }
              } catch (error) {
                console.error('클릭 처리 중 오류:', error);
                isProcessing = false;
              }
            };
            
            // 간단한 클릭 이벤트만 등록
            button.addEventListener('click', clickHandler, false);
            
            console.log('✅ 클릭 이벤트 리스너 추가 완료');
            
            // 글로벌 테스트 함수 추가 (콘솔에서 수동 실행 가능)
            window.testVideoAnalysis = () => {
              console.log('🧪 수동 테스트 실행');
              clickHandler({ type: 'manual_test' });
            };
            console.log('💡 수동 테스트 방법: 콘솔에서 testVideoAnalysis() 실행');
            
            // 저장 버튼에 작은 표시 추가
            console.log('🤖 AI 표시기 추가 중...');
            this.addEnhancementIndicator(button);
            console.log('✅ AI 표시기 추가 완료');
          } else {
            console.log(`❌ 저장 버튼 ${index + 1}: 연결된 비디오를 찾을 수 없음`);
            console.log('게시물 컨테이너:', post ? post.tagName : '없음');
          }
        });
        
        console.log('🔄 버튼 처리 완료, 결과 정리 중...');
        if (newButtonsEnhanced > 0) {
          console.log(`🎯 새로 향상된 저장 버튼: ${newButtonsEnhanced}개`);
        } else {
          console.log('📝 모든 저장 버튼이 이미 향상되었습니다.');
        }
        console.log('✅ enhanceInstagramSaveButtons 함수 완료');
      } catch (error) {
        console.error('저장 버튼 향상 중 오류:', error);
      } finally {
        this.isProcessing = false;
        console.log('🏁 isProcessing 플래그 해제됨');
      }
    }, 1000);
  }
  
  addEnhancementIndicator(button) {
    console.log('🔧 addEnhancementIndicator 함수 시작');
    console.log('대상 버튼:', button);
    
    // 이미 표시가 있으면 추가하지 않음
    if (button.querySelector('.ai-indicator')) {
      console.log('⚠️ 이미 AI 표시기가 존재함');
      return;
    }
    
    console.log('🎨 AI 표시기 엘리먼트 생성 중...');
    const indicator = document.createElement('div');
    indicator.className = 'ai-indicator';
    indicator.style.cssText = `
      position: absolute !important;
      top: -8px !important;
      right: -8px !important;
      width: 16px !important;
      height: 16px !important;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
      border-radius: 50% !important;
      font-size: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: white !important;
      font-weight: bold !important;
      z-index: 1000 !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
    `;
    indicator.innerHTML = '🤖';
    indicator.title = 'AI 분석 기능이 추가된 저장 버튼';
    console.log('✅ AI 표시기 엘리먼트 생성 완료');
    
    // 부모 요소에 relative position 추가
    console.log('📍 버튼에 relative position 설정...');
    const currentPosition = button.style.position;
    console.log('현재 position:', currentPosition);
    if (currentPosition === '' || currentPosition === 'static') {
      button.style.position = 'relative';
      console.log('✅ position을 relative로 변경');
    }
    
    console.log('📌 버튼에 AI 표시기 추가 중...');
    try {
      button.appendChild(indicator);
      console.log('✅ AI 표시기가 성공적으로 추가됨');
      
      // 실제로 추가되었는지 확인
      console.log('⏰ 100ms 후 AI 표시기 확인 예정');
      setTimeout(() => {
        console.log('⏰ setTimeout 실행됨 - AI 표시기 확인 시작');
        try {
          const addedIndicator = button.querySelector('.ai-indicator');
          if (addedIndicator) {
            console.log('✅ AI 표시기가 DOM에 정상적으로 추가 확인됨');
            const rect = addedIndicator.getBoundingClientRect();
            console.log('AI 표시기 위치:', {
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left,
              visible: rect.width > 0 && rect.height > 0
            });
          } else {
            console.log('❌ AI 표시기가 DOM에서 발견되지 않음');
          }
          console.log('✅ AI 표시기 확인 완료');
        } catch (error) {
          console.error('❌ AI 표시기 확인 중 오류:', error);
        }
      }, 100);
    } catch (error) {
      console.error('❌ AI 표시기 추가 실패:', error);
    }
  }
  
  async processInstagramVideoFromSave(post, video) {
    try {
      console.log('🎬 저장된 영상 분석 시작...');
      console.log('비디오 src:', video.src);
      console.log('비디오 currentSrc:', video.currentSrc);
      
      const videoUrl = video.src || video.currentSrc;
      const postUrl = window.location.href;
      const metadata = this.extractInstagramMetadata(post);
      
      console.log('추출된 메타데이터:', metadata);
      console.log('서버로 전송할 데이터:', {
        platform: 'instagram',
        videoUrl,
        postUrl,
        metadata
      });
      
      if (!videoUrl) {
        throw new Error('비디오 URL을 찾을 수 없습니다.');
      }
      
      // blob URL인 경우 클라이언트에서 다운로드 후 전송
      if (videoUrl.startsWith('blob:')) {
        console.log('🔄 blob URL 감지 - 클라이언트에서 다운로드 중...');
        const videoBlob = await this.downloadBlobVideo(videoUrl);
        await this.processVideoWithBlob({
          platform: 'instagram',
          videoBlob,
          postUrl,
          metadata
        });
      } else {
        await this.processVideo({
          platform: 'instagram',
          videoUrl,
          postUrl,
          metadata
        });
      }
      
      this.showNotification('✅ 영상이 Instagram에 저장되고 AI 분석도 완료되었습니다!', 'success');
      
    } catch (error) {
      console.error('저장된 영상 분석 실패:', error);
      this.showNotification(`Instagram 저장은 완료되었지만 AI 분석에 실패했습니다: ${error.message}`, 'warning');
    }
  }

  observeContentChanges() {
    // 더 제한적인 관찰 - 초기 로드 후 URL 변경만 감지
    let currentUrl = window.location.href;
    let urlCheckInterval;
    
    // URL 변경 감지 (Instagram의 SPA 네비게이션)
    urlCheckInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('🔄 URL 변경 감지 - 새 페이지 콘텐츠 스캔');
        
        // URL이 변경되면 새로운 콘텐츠 스캔
        setTimeout(() => {
          this.enhanceInstagramSaveButtons();
        }, 2000);
      }
    }, 3000); // 3초마다 URL 체크
    
    // 스크롤 이벤트로 새 콘텐츠 로딩 감지 (무한 스크롤)
    let scrollTimeout;
    let lastScrollTime = 0;
    
    window.addEventListener('scroll', () => {
      const now = Date.now();
      
      // 스크롤이 멈춘 후 2초 후에 한번만 실행
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        // 10초 간격으로만 스크롤 기반 스캔 허용
        if (now - lastScrollTime > 10000) {
          lastScrollTime = now;
          console.log('📜 스크롤 멈춤 감지 - 새 콘텐츠 스캔');
          this.enhanceInstagramSaveButtons();
        }
      }, 2000);
    });
  }

  showNotification(message, type = 'info') {
    // 설정 확인
    chrome.storage.sync.get(['showNotifications'], (result) => {
      if (result.showNotifications === false) return;
      
      const notification = document.createElement('div');
      const bgColor = type === 'success' ? '#4caf50' : 
                      type === 'error' ? '#f44336' : '#2196f3';
      
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
      }, 5000);
    });
  }
}

// 콘텐츠 스크립트 실행
console.log('🚀 Content Script 로딩 시작');
console.log('현재 도메인:', window.location.hostname);
console.log('현재 URL:', window.location.href);

if (window.location.hostname.includes('instagram.com') || 
    window.location.hostname.includes('tiktok.com')) {
  console.log('✅ 지원되는 플랫폼에서 VideoSaver 초기화');
  new VideoSaver();
} else {
  console.log('❌ 지원되지 않는 플랫폼:', window.location.hostname);
}