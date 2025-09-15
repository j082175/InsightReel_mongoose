// YouTube 채널 수집 - 2단계 분석 (썸네일 + 제목 + 태그 + 설명)
class YouTubeChannelAnalyzer {
    constructor() {
        this.isAnalyzing = false;
        this.channelButton = null;
        this.handlePageLoadTimeout = null; // 디바운싱용
        this.buttonCheckInterval = null; // 버튼 상태 모니터링
        this.init();
    }

    init() {
        console.log('🎥 YouTube 채널 수집 초기화 (VidIQ 스타일)');
        console.log('🌍 현재 페이지:', window.location.href);
        console.log('📋 YouTube 채널 수집기가 시작되었습니다!');
        
        // 테스트 코드 제거 - 중복 생성 방지
        
        // YouTube 내부 이벤트 리스너 등록 (VidIQ 방식)
        this.setupYouTubeEventListeners();
        
        // 초기 페이지 체크
        this.handlePageLoad();
        
        // 이벤트 리스너 비활성화 (중복 생성 방지)
        // window.addEventListener('yt-page-data-updated', () => {
        //     console.log('📄 페이지 데이터 업데이트');
        //     this.handlePageLoad();
        // });
    }

    // YouTube 내부 이벤트 리스너 설정
    setupYouTubeEventListeners() {
        // YouTube SPA 네비게이션 감지
        window.addEventListener('yt-navigate-finish', () => {
            console.log('🎯 YouTube 내부 이벤트: yt-navigate-finish');
            this.clearDataCache();
            this.debouncedHandlePageLoad();
        });

        // 페이지 데이터 업데이트 감지
        document.addEventListener('yt-page-data-updated', () => {
            console.log('🔄 YouTube 내부 이벤트: yt-page-data-updated');
            this.clearDataCache();
            this.debouncedHandlePageLoad();
        });

        // 백업용 MutationObserver - URL 변경 감지
        let currentURL = location.href;
        const observer = new MutationObserver(() => {
            if (location.href !== currentURL) {
                const oldURL = currentURL;
                currentURL = location.href;
                console.log('🔄 URL 변경 감지 (백업):', { oldURL, newURL: currentURL });
                this.clearDataCache();
                this.debouncedHandlePageLoad();
            }
        });
        observer.observe(document, { subtree: true, childList: true });
    }

    // 데이터 캐시 초기화 (SPA 네비게이션시 이전 페이지 데이터 제거)
    clearDataCache() {
        console.log('🧹 강력한 데이터 캐시 초기화 시작');

        // YouTube 전역 객체 완전 초기화
        if (window.ytInitialData) {
            console.log('🗑️ window.ytInitialData 완전 삭제');
            window.ytInitialData = null;
            delete window.ytInitialData;
        }

        if (window.ytInitialPlayerResponse) {
            console.log('🗑️ window.ytInitialPlayerResponse 완전 삭제');
            window.ytInitialPlayerResponse = null;
            delete window.ytInitialPlayerResponse;
        }

        // 추가 YouTube 캐시 객체들도 클리어
        if (window.ytplayer) {
            console.log('🗑️ window.ytplayer 캐시 클리어');
        }

        // DOM에 남아있을 수 있는 이전 데이터도 강제로 새로고침 대기
        this.forceDataRefresh = true;

        // 이전 채널명 캐시도 초기화 (DOM 업데이트 검증용)
        this.lastSeenChannelName = null;

        // 분석 상태 초기화
        this.isAnalyzing = false;

        // 기존 버튼 제거 (새 페이지에서 재생성됨)
        this.removeCollectButton();

        console.log('✅ 강력한 데이터 캐시 초기화 완료 (채널명 캐시 포함)');
    }

    // 채널 페이지인지 확인
    isChannelPage() {
        const url = window.location.href;
        const isChannel = url.includes('/channel/') || 
               url.includes('/@') || 
               url.includes('/c/') ||
               url.includes('/user/');
        
        console.log('🔍 채널 페이지 확인:', {
            url: url,
            isChannel: isChannel
        });
        
        return isChannel;
    }

    // ImprovedTube 방식: 안정적인 페이지 로드 처리
    debouncedHandlePageLoad() {
        // 기존 타이머 취소
        if (this.handlePageLoadTimeout) {
            clearTimeout(this.handlePageLoadTimeout);
        }
        
        // ImprovedTube 패턴: DOM이 안정화될 때까지 적절한 지연
        this.handlePageLoadTimeout = setTimeout(() => {
            this.handlePageLoadWithRetry();
        }, 500); // 더 안정적인 지연 시간
    }

    // ImprovedTube 방식: 재시도 로직이 포함된 페이지 로드 처리
    async handlePageLoadWithRetry() {
        // DOM Ready 상태 확인
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }

        // YouTube 기본 구조가 로드될 때까지 대기
        await this.waitForYouTubeBasicStructure();
        
        // 기존 handlePageLoad 실행
        this.handlePageLoad();
    }

    // YouTube 기본 구조 로드 대기 (ImprovedTube 패턴)
    async waitForYouTubeBasicStructure(maxWait = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            const ytdApp = document.querySelector('ytd-app');
            const masthead = document.querySelector('#masthead');
            
            if (ytdApp && masthead) {
                console.log('✅ YouTube 기본 구조 로드 완료');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('⚠️ YouTube 기본 구조 로드 대기 시간 초과');
        return false;
    }

    // 버튼 상태 지속 모니터링 - ImprovedTube 방식으로 재활성화
    startButtonMonitoring() {
        console.log('👀 ImprovedTube 방식 버튼 모니터링 시작');
        
        // 기존 모니터링 정리
        if (this.buttonCheckInterval) {
            clearInterval(this.buttonCheckInterval);
        }
        
        // ImprovedTube 패턴: 더 안정적인 모니터링 (5초 간격)
        this.buttonCheckInterval = setInterval(() => {
            // 채널 페이지이고 버튼이 없으면 재시도
            if (this.isChannelPage(location.href) && !document.querySelector('#youtube-channel-collect-btn')) {
                console.log('🔄 버튼이 사라짐 - ImprovedTube 방식으로 재생성 시도');
                this.injectChannelButtonWithRetry();
            }
        }, 5000); // 5초마다 체크
    }

    // 페이지 로드 처리 - 모든 YouTube 페이지에서 실행
    handlePageLoad() {
        console.log('🔍 페이지 로드 처리:', location.href);
        console.log('✅ YouTube 페이지 감지됨 - 플로팅 버튼 생성 시작');
        
        // 모든 YouTube 페이지에서 플로팅 버튼 생성
        this.createFloatingChannelButton();
    }

    // 버튼 추가 시도 - 제거됨 (더 이상 페이지에 버튼을 추가하지 않음)
    tryAddButton() {
        console.log('🚫 버튼 추가 시도 비활성화됨 - 확장 프로그램 팝업 사용');
    }

    // 채널 헤더 로드 대기
    waitForChannelHeader() {
        const maxAttempts = 15;
        let attempts = 0;

        const checkHeader = () => {
            attempts++;
            
            // 더 포괄적인 채널 헤더 요소들 확인
            const channelName = document.querySelector([
                '#channel-name #text',
                '#channel-name span',
                '.ytd-channel-name #text', 
                '.ytd-channel-name span',
                '#text-container h1',
                '[class*="channel-name"] span',
                'h1[class*="channel"]',
                '.ytd-c4-tabbed-header-renderer h1'
            ].join(', '));
            
            const subscriberCount = document.querySelector([
                '#subscriber-count #text',
                '#subscriber-count span',
                '.ytd-subscriber-count #text',
                '.ytd-subscriber-count span', 
                '[id*="subscriber"] span',
                '[class*="subscriber"] span'
            ].join(', '));
            
            // 구독 버튼도 확인 (이게 가장 확실한 지표)
            const subscribeButton = document.querySelector([
                '#subscribe-button',
                '.ytd-subscribe-button-renderer',
                '[aria-label*="구독"]',
                '[aria-label*="Subscribe"]',
                'button[class*="subscribe"]'
            ].join(', '));
            
            console.log(`🔍 시도 ${attempts}: 채널명=${!!channelName}, 구독자=${!!subscriberCount}, 구독버튼=${!!subscribeButton}`);
            
            // 구독 버튼이 있으면 충분히 채널 페이지로 간주
            if (subscribeButton && (channelName || subscriberCount)) {
                console.log('✅ 채널 헤더 발견! 버튼 생성 시작');
                this.addCollectButton();
            } else if (attempts < maxAttempts) {
                setTimeout(checkHeader, 1000);
            } else {
                console.log('⚠️ 채널 헤더를 찾을 수 없음 - 더 관대한 조건으로 시도');
                // 마지막 시도: 구독 버튼만 있어도 시도
                if (subscribeButton) {
                    console.log('🎯 구독 버튼만 발견 - 강제로 버튼 추가 시도');
                    this.addCollectButton();
                }
            }
        };

        checkHeader();
    }

    // 채널 수집 버튼 추가 - 제거됨 (확장 프로그램 팝업으로 이동)
    addCollectButton() {
        console.log('📊 ImprovedTube 방식으로 채널 수집 버튼 추가 중...');
        
        // ImprovedTube 패턴: 안정적인 버튼 주입
        this.injectChannelButtonWithRetry();
    }

    // ImprovedTube 방식: 재시도 로직을 포함한 안정적인 버튼 주입
    async injectChannelButtonWithRetry(maxRetries = 5, retryDelay = 500) {
        for (let i = 0; i < maxRetries; i++) {
            const success = this.tryInjectChannelButton();
            
            if (success) {
                console.log(`✅ 채널 버튼 주입 성공 (${i + 1}번째 시도)`);
                return true;
            }
            
            if (i < maxRetries - 1) {
                console.log(`⏳ 채널 버튼 주입 재시도 ${i + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        console.log(`❌ 채널 버튼 주입 실패 (${maxRetries}회 시도 후)`);
        return false;
    }

    // ImprovedTube 방식: 다중 셀렉터 fallback으로 안정적인 컨테이너 찾기
    tryInjectChannelButton() {
        console.log('🔍 채널 버튼 주입 시도 시작 - 현재 URL:', window.location.href);
        
        // 기존 버튼이 있으면 제거 (중복 방지)
        const existingButton = document.querySelector('#youtube-channel-collect-btn');
        if (existingButton) {
            console.log('🗑️ 기존 버튼 제거');
            existingButton.remove();
        }

        // 현재 페이지의 DOM 구조 로깅
        console.log('📊 현재 DOM 구조 분석:');
        console.log('- ytd-app:', !!document.querySelector('ytd-app'));
        console.log('- masthead:', !!document.querySelector('#masthead'));
        console.log('- channel elements:', document.querySelectorAll('[id*="channel"], [class*="channel"]').length);

        // 근본적 해결: YouTube 외부 고정 위치 사용 (찌부러짐 방지)
        console.log('🎯 YouTube 외부 고정 위치에 버튼 배치');
        this.createFloatingChannelButton();
        return true; // 바로 성공 리턴
    }

    // 요소가 실제로 화면에 보이는지 확인 (ImprovedTube 패턴)
    isElementVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }

    // 플로팅 채널 버튼 생성 (YouTube 외부 고정 위치) - 모든 YouTube 페이지에서 실행
    createFloatingChannelButton() {
        console.log('🚀 플로팅 채널 버튼 생성 시작 - 모든 페이지에서 사용 가능');
        
        // 기존 플로팅 버튼이 있으면 생성하지 않음 (중복 방지)
        const existingButton = document.querySelector('#insightreel-floating-channel-btn');
        if (existingButton) {
            console.log('⚠️ 플로팅 버튼 이미 존재 - 생성 스킵');
            return true;
        }
        
        // 채널 정보 추출
        const channelName = this.extractChannelName();
        
        // 플로팅 버튼 생성
        const floatingButton = document.createElement('div');
        floatingButton.id = 'insightreel-floating-channel-btn';
        floatingButton.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">📊</span>
                <span style="font-weight: 600;">채널 수집</span>
            </div>
        `;
        floatingButton.title = `${channelName} 채널의 영상들을 수집하여 분석합니다`;
        
        // 플로팅 버튼 스타일 (매우 확실한 위치와 스타일)
        floatingButton.style.cssText = `
            position: fixed !important;
            bottom: 80px !important;
            right: 24px !important;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 28px !important;
            padding: 14px 20px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            z-index: 10000 !important;
            box-shadow: 0 8px 32px rgba(255, 107, 107, 0.4) !important;
            backdrop-filter: blur(12px) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            user-select: none !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            display: flex !important;
            align-items: center !important;
            min-width: 140px !important;
            justify-content: center !important;
            opacity: 0.95 !important;
        `;
        
        // 클릭 이벤트
        floatingButton.onclick = () => this.showCollectModal();
        
        // 페이지에 추가 (YouTube와 완전히 독립적)
        document.body.appendChild(floatingButton);
        
        // 전역 참조 저장
        this.channelButton = floatingButton;
        
        console.log('✅ 플로팅 채널 버튼 생성 완료 (모든 YouTube 페이지에서 사용 가능)');
        return true;
    }
    
    // YouTube 내부 데이터로 채널 이름 추출 - 초고속
    extractChannelName() {
        const url = window.location.href;
        
        try {
            // YouTube 내부 데이터 객체들 접근
            const ytInitialData = window.ytInitialData;
            const ytInitialPlayerResponse = window.ytInitialPlayerResponse;
            
            // 채널 페이지
            if (this.isChannelPage() && ytInitialData) {
                const header = ytInitialData?.header;
                const channelHeaderRenderer = header?.c4TabbedHeaderRenderer || header?.pageHeaderRenderer;
                
                if (channelHeaderRenderer) {
                    const channelName = channelHeaderRenderer.title || 
                                      channelHeaderRenderer.channelTitle || 
                                      channelHeaderRenderer.pageTitle || '';
                    if (channelName) return channelName;
                }
                
                // 메타데이터에서 시도
                const metadata = ytInitialData?.metadata?.channelMetadataRenderer;
                if (metadata?.title) {
                    return metadata.title;
                }
            }
            
            // 동영상/쇼츠 페이지
            else if ((url.includes('/watch?v=') || url.includes('/shorts/')) && ytInitialPlayerResponse) {
                const videoDetails = ytInitialPlayerResponse.videoDetails;
                if (videoDetails?.author) {
                    return videoDetails.author;
                }
            }
            
        } catch (error) {
            console.log('YouTube 내부 데이터 접근 실패, DOM 방식으로 fallback');
        }
        
        // Fallback: 간단한 DOM 셀렉터
        if (this.isChannelPage()) {
            const nameEl = document.querySelector('#channel-name #text, .ytd-channel-name #text');
            if (nameEl?.textContent?.trim()) {
                return nameEl.textContent.trim();
            }
        } else if (url.includes('/watch?v=')) {
            const ownerLink = document.querySelector('#owner #channel-name a, ytd-video-owner-renderer a[href*="@"]');
            if (ownerLink?.textContent?.trim()) {
                return ownerLink.textContent.trim();
            }
        } else if (url.includes('/shorts/')) {
            const shortsLink = document.querySelector('ytd-reel-video-renderer a[href*="@"]');
            if (shortsLink?.textContent?.trim()) {
                return shortsLink.textContent.trim();
            }
        }
        
        return '이 채널';
    }


    // 컨테이너에 따라 적절한 위치에 버튼 생성 및 주입
    createAndInjectButton(container, selector) {
        console.log(`🎨 버튼 생성 및 주입: ${selector}`);
        const button = this.createChannelButton();
        
        let injectionSuccessful = false;
        
        try {
            // 컨테이너 타입에 따라 주입 방식 결정 (겹침 방지 우선)
            if (selector.includes('primary-items') || selector.includes('chips-content') || selector.includes('chip')) {
                console.log('📍 탭/칩 스타일로 주입');
                // 탭 메뉴에 추가
                container.appendChild(button);
                button.style.cssText = `
                    background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 20px !important;
                    padding: 10px 18px !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                    cursor: pointer !important;
                    margin: 0 12px !important;
                    display: inline-block !important;
                    transition: all 0.3s ease !important;
                    z-index: 1000 !important;
                    white-space: nowrap !important;
                `;
                injectionSuccessful = true;
                
            } else if (selector.includes('header-headline') || selector.includes('page-header-view-model')) {
                console.log('📍 헤더 라인에 인라인 스타일로 주입');
                // 최신 YouTube 헤더 구조에 맞게 주입
                container.appendChild(button);
                button.style.cssText = `
                    background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 18px !important;
                    padding: 8px 16px !important;
                    font-weight: 500 !important;
                    font-size: 14px !important;
                    cursor: pointer !important;
                    margin-left: 16px !important;
                    display: inline-block !important;
                    transition: all 0.2s ease !important;
                    z-index: 1000 !important;
                    white-space: nowrap !important;
                `;
                injectionSuccessful = true;
                
            } else if (selector.includes('header-headline') || selector.includes('inner-header-container')) {
                console.log('📍 채널 제목 아래 독립 영역에 주입');
                // 채널 제목 아래에 독립적인 버튼 영역 생성
                this.createIndependentButtonArea(container, button);
                injectionSuccessful = true;
                
            } else {
                console.log('📍 채널 헤더 하단에 독립 영역 생성하여 주입');
                // 헤더 전체 하단에 독립적인 버튼 영역 생성  
                this.createIndependentButtonArea(container, button);
                injectionSuccessful = true;
            }
            
            if (injectionSuccessful) {
                console.log('✅ 버튼 주입 성공!');
                return true;
            } else {
                console.log('❌ 버튼 주입 실패');
                return false;
            }
            
        } catch (error) {
            console.error('⚠️ 버튼 주입 중 오류:', error);
            return false;
        }
    }


    // 독립적인 버튼 영역 생성 (겹침 방지) - 백업용
    createIndependentButtonArea(parentContainer, button) {
        console.log('🏗️ 독립적인 버튼 영역 생성');
        
        // 기존 독립 영역이 있으면 제거
        const existingArea = document.querySelector('#insightreel-channel-button-area');
        if (existingArea) {
            existingArea.remove();
        }
        
        // 독립적인 버튼 컨테이너 생성
        const buttonArea = document.createElement('div');
        buttonArea.id = 'insightreel-channel-button-area';
        buttonArea.style.cssText = `
            width: 100% !important;
            padding: 12px 0 !important;
            margin: 8px 0 !important;
            display: flex !important;
            justify-content: flex-start !important;
            align-items: center !important;
            background: transparent !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            z-index: 1000 !important;
        `;
        
        // 버튼 스타일 설정
        button.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
            color: white !important;
            border: none !important;
            border-radius: 20px !important;
            padding: 10px 18px !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            cursor: pointer !important;
            margin-left: 16px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            transition: all 0.3s ease !important;
            z-index: 1000 !important;
            white-space: nowrap !important;
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3) !important;
        `;
        
        // 버튼을 독립 영역에 추가
        buttonArea.appendChild(button);
        
        // 부모 컨테이너에 독립 영역 추가
        parentContainer.insertAdjacentElement('afterend', buttonArea);
        
        console.log('✅ 독립적인 버튼 영역 생성 완료');
        return buttonArea;
    }

    // 채널 버튼 생성 (기존 로직 유지)
    createChannelButton() {
        const button = document.createElement('button');
        button.id = 'youtube-channel-collect-btn';
        button.innerHTML = `<span>📊 채널 수집</span>`;
        button.title = '이 채널의 비디오들을 수집하여 분석합니다';
        
        // 호버 효과 추가
        this.addButtonHoverEffects(button);
        
        // 클릭 이벤트
        button.addEventListener('click', () => this.showCollectModal());
        
        // 전역 참조 저장
        this.channelButton = button;
        
        return button;
    }

    // 버튼 호버 효과 (모든 스타일에 공통 적용)
    addButtonHoverEffects(button) {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(255, 107, 107, 0.4)';
            button.style.background = 'linear-gradient(45deg, #ff5252, #d32f2f)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
            button.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
        });
    }

    // 채널 헤더 오른쪽 빈 공간에 버튼 추가 (가장 우선적 위치)
    addButtonToChannelHeaderRight(channelHeader) {
        console.log('🎯 채널 헤더 오른쪽에 버튼 추가 중...');
        
        this.channelButton = document.createElement('button');
        this.channelButton.id = 'youtube-channel-collect-btn';
        this.channelButton.innerHTML = `<span>📊 채널 수집</span>`;
        
        // 헤더 오른쪽에 맞는 스타일 (플로팅 버튼 느낌)
        this.channelButton.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 18px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 1000;
            white-space: nowrap;
            height: 40px;
            line-height: 40px;
        `;

        // 호버 효과
        this.channelButton.addEventListener('mouseenter', () => {
            this.channelButton.style.transform = 'translateY(-2px)';
            this.channelButton.style.boxShadow = '0 6px 16px rgba(255, 107, 107, 0.4)';
            this.channelButton.style.background = 'linear-gradient(45deg, #ff5252, #d32f2f)';
        });

        this.channelButton.addEventListener('mouseleave', () => {
            this.channelButton.style.transform = 'translateY(0)';
            this.channelButton.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
            this.channelButton.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
        });

        // 클릭 이벤트
        this.channelButton.addEventListener('click', () => this.showCollectModal());

        // 헤더에 relative position 설정 (absolute 포지셔닝을 위해)
        const headerStyle = window.getComputedStyle(channelHeader);
        if (headerStyle.position === 'static') {
            channelHeader.style.position = 'relative';
        }

        // 헤더에 버튼 추가
        channelHeader.appendChild(this.channelButton);
        console.log('✅ 채널 헤더 오른쪽에 채널 수집 버튼 추가됨');
        return true;
    }

    // 채널 검색창 옆에 버튼 추가 (백업 위치)
    addButtonNextToSearchBox(searchInput) {
        console.log('🎯 검색창 옆에 버튼 추가 중...');
        
        // 검색창의 부모 컨테이너 찾기
        const searchContainer = searchInput.closest([
            '#search-input',
            '.ytd-channel-search-box-renderer',
            '#channel-search',
            '.search-container',
            '[id*="search"]'
        ].join(', ')) || searchInput.parentElement;
        
        if (!searchContainer) {
            console.log('⚠️ 검색창 컨테이너를 찾을 수 없음');
            return false;
        }
        
        this.channelButton = document.createElement('button');
        this.channelButton.id = 'youtube-channel-collect-btn';
        this.channelButton.innerHTML = `<span>📊 채널 수집</span>`;
        
        // 검색창에 맞는 컴팩트한 스타일
        this.channelButton.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 18px;
            padding: 8px 14px;
            margin-left: 10px;
            font-weight: 500;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            height: 32px;
            line-height: 32px;
            white-space: nowrap;
            flex-shrink: 0;
        `;

        // 호버 효과
        this.channelButton.addEventListener('mouseenter', () => {
            this.channelButton.style.transform = 'translateY(-1px)';
            this.channelButton.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.4)';
        });

        this.channelButton.addEventListener('mouseleave', () => {
            this.channelButton.style.transform = 'translateY(0)';
            this.channelButton.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.3)';
        });

        // 클릭 이벤트
        this.channelButton.addEventListener('click', () => this.showCollectModal());

        // 검색창 컨테이너 옆에 추가 (flex 레이아웃 고려)
        try {
            // 검색창 컨테이너의 부모에 flex 스타일 적용 (이미 있을 수도 있음)
            const parentContainer = searchContainer.parentElement;
            if (parentContainer) {
                const parentStyle = window.getComputedStyle(parentContainer);
                if (!parentStyle.display.includes('flex')) {
                    parentContainer.style.display = 'flex';
                    parentContainer.style.alignItems = 'center';
                    parentContainer.style.gap = '8px';
                }
            }
            
            // 검색창 바로 다음에 버튼 추가
            searchContainer.parentElement.insertBefore(this.channelButton, searchContainer.nextSibling);
            console.log('✅ 검색창 옆에 채널 수집 버튼 추가됨');
            return true;
            
        } catch (error) {
            console.log('⚠️ 검색창 옆 추가 실패, 컨테이너 내부에 추가 시도');
            
            // 실패 시 검색창 컨테이너 내부에 추가
            searchContainer.style.display = 'flex';
            searchContainer.style.alignItems = 'center';
            searchContainer.appendChild(this.channelButton);
            console.log('✅ 검색창 컨테이너 내부에 채널 수집 버튼 추가됨');
            return true;
        }
    }

    // 안정적인 액션 영역에 버튼 추가 (탭 변경에도 유지)
    addButtonToActionArea(actionArea) {
        console.log('🎯 액션 영역에 버튼 추가 중...');
        
        this.channelButton = document.createElement('button');
        this.channelButton.id = 'youtube-channel-collect-btn';
        this.channelButton.innerHTML = `<span>📊 채널 수집</span>`;
        
        // YouTube 스타일에 맞게 조정
        this.channelButton.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 8px 16px;
            margin: 0 8px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            height: 36px;
            line-height: 36px;
        `;

        // 호버 효과
        this.channelButton.addEventListener('mouseenter', () => {
            this.channelButton.style.transform = 'translateY(-1px)';
            this.channelButton.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.4)';
        });

        this.channelButton.addEventListener('mouseleave', () => {
            this.channelButton.style.transform = 'translateY(0)';
            this.channelButton.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.3)';
        });

        // 클릭 이벤트
        this.channelButton.addEventListener('click', () => this.showCollectModal());

        // 액션 영역에 추가
        actionArea.appendChild(this.channelButton);
        console.log('✅ 액션 영역에 채널 수집 버튼 추가됨');
        return true;
    }

    // 대안 위치에 버튼 추가
    addButtonToAlternativeLocation(headerElement) {
        console.log('🎯 대안 위치에 버튼 추가 중...');
        
        this.channelButton = document.createElement('button');
        this.channelButton.id = 'youtube-channel-collect-btn';
        this.channelButton.innerHTML = `<span>📊 채널 수집</span>`;
        
        this.channelButton.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 8px 16px;
            margin: 10px;
            font-weight: 500;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            position: relative;
            z-index: 1000;
        `;

        // 이벤트 추가
        this.channelButton.addEventListener('click', () => this.showCollectModal());

        // 헤더에 직접 추가
        headerElement.appendChild(this.channelButton);
        console.log('✅ 대안 위치에 채널 수집 버튼 추가됨');
        return true;
    }

    // 기존 버튼 제거
    removeCollectButton() {
        const existingButton = document.getElementById('youtube-channel-collect-btn');
        if (existingButton) {
            existingButton.remove();
        }
        this.channelButton = null;
    }

    // 쇼츠 분석 버튼과 완전히 동일한 DOM 추출 함수 (content-script-bundled.js에서 복사)
    extractYouTubeMetadata() {
        console.log('🎯 쇼츠 분석 버튼과 동일한 방식으로 메타데이터 추출 시작');

        const metadata = { platform: 'YOUTUBE' };

        try {
            // 제목 (쇼츠 분석 버튼과 동일)
            const titleEl = document.querySelector('#title h1') ||
                          document.querySelector('h1.ytd-watch-metadata');
            if (titleEl) {
                metadata.title = titleEl.textContent?.trim();
                console.log('✅ 제목 추출:', metadata.title);
            }

            // 채널명 (쇼츠 분석 버튼과 완전히 동일한 셀렉터) + 디버깅
            console.log('🔍 DOM 구조 디버깅:');
            console.log('  - #channel-name a 요소:', document.querySelector('#channel-name a'));
            console.log('  - #owner-name a 요소:', document.querySelector('#owner-name a'));
            console.log('  - #channel-name 요소:', document.querySelector('#channel-name'));
            console.log('  - #owner-name 요소:', document.querySelector('#owner-name'));
            console.log('  - #owner 요소:', document.querySelector('#owner'));

            const channelEl = document.querySelector('#channel-name a') ||
                            document.querySelector('#owner-name a');

            console.log('🎯 선택된 채널 요소:', channelEl);

            if (channelEl) {
                metadata.author = channelEl.textContent?.trim();      // 기존과 동일하게 author로 저장
                metadata.channelName = channelEl.textContent?.trim(); // 우리 시스템용으로는 channelName도 저장
                const channelHref = channelEl.href || '';

                console.log('📝 채널 요소 상세:', {
                    textContent: channelEl.textContent,
                    innerText: channelEl.innerText,
                    href: channelHref
                });

                // 채널 링크에서 Handle/ID 추출
                if (channelHref) {
                    const handleMatch = channelHref.match(/\/@([^\/\?]+)/);
                    if (handleMatch) {
                        metadata.youtubeHandle = handleMatch[1];
                    }

                    const channelMatch = channelHref.match(/\/channel\/([^\/\?]+)/);
                    if (channelMatch) {
                        metadata.channelId = channelMatch[1];
                    }
                }

                console.log('✅ 채널 정보 추출 성공:', {
                    name: metadata.channelName,
                    handle: metadata.youtubeHandle,
                    id: metadata.channelId
                });
            } else {
                console.log('❌ 채널 요소를 찾을 수 없음 - 대안 셀렉터 시도');

                // 쇼츠에서 자주 사용되는 다른 셀렉터들도 시도
                const alternativeSelectors = [
                    'ytd-video-owner-renderer #channel-name a',
                    '#owner #channel-name a',
                    'a[href*="/@"]',
                    'a[href*="/channel/"]'
                ];

                for (const selector of alternativeSelectors) {
                    const altEl = document.querySelector(selector);
                    console.log(`  - 대안 셀렉터 '${selector}':`, altEl);

                    if (altEl && altEl.textContent?.trim()) {
                        metadata.author = altEl.textContent.trim();      // 기존과 동일
                        metadata.channelName = altEl.textContent.trim(); // 우리 시스템용
                        console.log(`✅ 대안 셀렉터로 채널명 발견: ${metadata.channelName}`);
                        break;
                    }
                }
            }

            // 조회수 (쇼츠 분석 버튼과 동일)
            const viewEl = document.querySelector('#info-text .view-count');
            if (viewEl) {
                metadata.views = viewEl.textContent?.trim();
                console.log('✅ 조회수 추출:', metadata.views);
            }

        } catch (error) {
            console.log('❌ 쇼츠 방식 메타데이터 추출 중 오류:', error);
        }

        // 현재 페이지 URL 추가
        metadata.pageUrl = window.location.href;

        console.log('📋 쇼츠 방식 메타데이터 추출 완료:', metadata);
        return metadata;
    }

    // SPA 네비게이션에서 페이지가 완전히 로드될 때까지 대기
    async waitForPageFullyLoaded() {
        console.log('⏳ SPA 네비게이션 - 페이지 완전 로드 대기 시작');

        const maxAttempts = 30; // 30회로 증가 (7.5초)
        const checkInterval = 250; // 250ms 간격
        let attempts = 0;

        const checkPageReady = () => {
            attempts++;
            const currentUrl = window.location.href;
            const isShortsPage = currentUrl.includes('/shorts/');

            // 1. 기본 YouTube 구조 확인
            const hasBasicStructure = document.querySelector('#content, #primary, #secondary, #shorts-container');

            let hasVideoElements = false;
            let hasChannelElements = false;

            if (isShortsPage) {
                // 2. 쇼츠 페이지 요소 확인
                hasVideoElements = document.querySelector('#shorts-player, ytd-shorts, #shorts-container, #reel-item-details');

                // 3. 쇼츠 채널 관련 요소 확인
                hasChannelElements = document.querySelector([
                    '#channel-info',
                    '#metadata #channel-name',
                    'ytd-reel-video-renderer #channel-name',
                    '#reel-item-details #channel-name',
                    'a[href*="/@"]',
                    'a[href*="/channel/"]',
                    '.ytd-channel-name'
                ].join(', '));
            } else {
                // 2. 일반 동영상 페이지 요소 확인
                hasVideoElements = document.querySelector('#owner, ytd-video-owner-renderer, #upload-info');

                // 3. 일반 영상 채널 관련 요소 확인
                hasChannelElements = document.querySelector('#channel-name, .ytd-channel-name, a[href*="@"], a[href*="/channel/"]');
            }

            // 4. YouTube 데이터 객체 확인
            const hasYtData = window.ytInitialPlayerResponse || window.ytInitialData;

            // 5. 강화된 검증: URL의 비디오 ID와 DOM 일치 여부 확인 (더 정확함)
            let isDOMUpdated = true;
            const currentVideoId = currentUrl.match(/shorts\/([^?\/]+)/)?.[1];

            if (isShortsPage && currentVideoId) {
                // 쇼츠의 경우 더 엄격한 검증
                const currentChannelName = this.extractChannelNameFromDOM();

                // 비디오 ID 기반으로 DOM이 정말 현재 페이지인지 확인
                const videoElements = document.querySelectorAll('video, [data-video-id]');
                let foundMatchingVideo = false;

                for (const element of videoElements) {
                    const elementVideoId = element.getAttribute('data-video-id') ||
                                         element.src?.match(/[?&]v=([^&]+)/)?.[1] ||
                                         element.src?.match(/shorts\/([^?\/]+)/)?.[1];

                    if (elementVideoId === currentVideoId) {
                        foundMatchingVideo = true;
                        break;
                    }
                }

                // DOM이 아직 이전 페이지 데이터를 보여주는지 확인
                if (currentChannelName && this.lastSeenChannelName) {
                    if (currentChannelName === this.lastSeenChannelName && attempts < 10) {
                        console.log(`🔄 DOM 아직 이전 채널 데이터 (${currentChannelName}) - 더 기다림 (${attempts}/10)`);
                        isDOMUpdated = false;
                    } else if (currentChannelName !== this.lastSeenChannelName) {
                        console.log(`✅ 채널 변경 감지: ${this.lastSeenChannelName} → ${currentChannelName}`);
                        this.lastSeenChannelName = currentChannelName;
                    }
                } else if (currentChannelName) {
                    this.lastSeenChannelName = currentChannelName;
                }

                // 비디오 요소가 현재 URL과 일치하지 않으면 더 기다림
                if (!foundMatchingVideo && attempts < 8) {
                    console.log(`🔄 DOM 비디오 요소가 현재 URL (${currentVideoId})과 불일치 - 더 기다림`);
                    isDOMUpdated = false;
                }

            } else {
                // 일반 영상의 경우 기존 로직
                const currentChannelName = this.extractChannelNameFromDOM();
                if (currentChannelName && this.lastSeenChannelName) {
                    if (currentChannelName === this.lastSeenChannelName && attempts < 5) {
                        console.log(`🔄 DOM 아직 이전 페이지 데이터 (${currentChannelName}) - 더 기다림`);
                        isDOMUpdated = false;
                    } else {
                        console.log(`✅ DOM 업데이트 확인: ${this.lastSeenChannelName} → ${currentChannelName}`);
                        this.lastSeenChannelName = currentChannelName;
                    }
                } else if (currentChannelName) {
                    this.lastSeenChannelName = currentChannelName;
                }
            }

            const isReady = hasBasicStructure && hasVideoElements && hasChannelElements && isDOMUpdated;

            console.log(`🔍 페이지 로드 상태 확인 (${attempts}/${maxAttempts}):`, {
                hasBasicStructure: !!hasBasicStructure,
                hasVideoElements: !!hasVideoElements,
                hasChannelElements: !!hasChannelElements,
                hasYtData: !!hasYtData,
                isDOMUpdated,
                currentChannelName: hasChannelElements ? this.extractChannelNameFromDOM() : null,
                isReady
            });

            return isReady;
        };

        // 즉시 확인
        if (checkPageReady()) {
            console.log('✅ 페이지 이미 로드 완료 - 즉시 진행');
            return true;
        }

        // 주기적 확인
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (checkPageReady() || attempts >= maxAttempts) {
                    clearInterval(interval);

                    if (attempts >= maxAttempts) {
                        console.log('⚠️ 페이지 로드 대기 시간 초과 - 현재 상태로 진행');
                    } else {
                        console.log('✅ 페이지 완전 로드 확인 - 채널 정보 추출 진행');
                    }

                    resolve(true);
                }
            }, checkInterval);
        });
    }

    // 채널 수집 모달 표시 (쇼츠 분석 버튼과 동일한 로직 사용)
    async showCollectModal() {
        if (this.isAnalyzing) return;

        try {
            console.log('📊 채널 수집 시작 (쇼츠 분석 버튼과 동일한 방식)');

            // 기존 쇼츠 분석 버튼과 완전히 동일한 DOM 추출 방식 사용
            const channelInfo = this.extractYouTubeMetadata();
            console.log('📊 채널 정보 (쇼츠 방식):', channelInfo);
            // 쇼츠 분석 버튼과 동일한 간단한 검증 - 채널명만 있으면 진행
            if (!channelInfo.channelName) {
                console.log('⚠️ 채널명을 찾을 수 없습니다. 페이지 로딩을 기다려보세요.');
                throw new Error('채널 정보를 찾을 수 없습니다. 페이지가 완전히 로드된 후 다시 시도해주세요.');
            }

            console.log('✅ 채널 정보 검증 통과:', {
                channelName: channelInfo.channelName,
                handle: channelInfo.youtubeHandle,
                id: channelInfo.channelId
            });

            // 중복 검사 실행
            const isDuplicate = await this.checkChannelDuplicate(channelInfo);
            if (isDuplicate) {
                const channelName = channelInfo.channelName || channelInfo.youtubeHandle || '이 채널';
                const confirmMessage = `${channelName}은 이미 분석된 채널입니다.\n\n다시 분석하시겠습니까?`;
                
                if (!confirm(confirmMessage)) {
                    console.log('🚫 사용자가 중복 분석을 취소했습니다.');
                    return;
                }
                
                console.log('✅ 사용자가 중복 분석을 승인했습니다.');
            }

            // 최근 사용한 키워드 가져오기
            const recentKeywords = await this.getRecentKeywords();
            
            // 모든 키워드 가져오기 (자동완성용)
            const allKeywords = await this.getAllKeywords();

            // 키워드 입력 모달 표시
            this.showKeywordModal(channelInfo, recentKeywords, allKeywords);

        } catch (error) {
            console.error('❌ 채널 수집 실패:', error);
            alert(`채널 수집 실패: ${error.message}`);
        }
    }

    // 채널 중복 검사
    async checkChannelDuplicate(channelInfo) {
        try {
            console.log('🔍 채널 중복 검사 시작:', channelInfo);

            // 채널 식별자 결정 (우선순위: handle > channelId > customUrl > username)
            const channelIdentifier = channelInfo.youtubeHandle ? `@${channelInfo.youtubeHandle}` : 
                                     channelInfo.channelId ? channelInfo.channelId :
                                     channelInfo.customUrl ? channelInfo.customUrl :
                                     channelInfo.username ? channelInfo.username : null;

            if (!channelIdentifier) {
                console.log('⚠️ 채널 식별자를 찾을 수 없어 중복 검사를 건너뜁니다.');
                return false;
            }

            console.log('🔍 채널 식별자:', channelIdentifier);

            // 서버에 중복 검사 요청
            const response = await fetch('http://localhost:3000/api/channel-queue/check-duplicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channelIdentifier: channelIdentifier
                })
            });

            if (!response.ok) {
                console.warn('⚠️ 중복 검사 API 호출 실패, 검사를 건너뜁니다.');
                return false;
            }

            const result = await response.json();
            console.log('🔍 중복 검사 결과:', result);

            // API 응답 구조에 맞게 수정
            return result.duplicate?.isDuplicate || false;

        } catch (error) {
            console.warn('⚠️ 중복 검사 실패, 검사를 건너뜁니다:', error);
            return false; // 에러 발생 시 중복 검사를 건너뛰고 계속 진행
        }
    }

    // 최근 키워드 가져오기
    async getRecentKeywords() {
        try {
            const response = await fetch('http://localhost:3000/api/cluster/recent-keywords?limit=8');
            if (!response.ok) {
                throw new Error('키워드 조회 실패');
            }
            const data = await response.json();
            return data.keywords || [];
        } catch (error) {
            console.warn('최근 키워드 조회 실패:', error);
            return [
                { keyword: '게임', count: 5 },
                { keyword: '교육', count: 3 },
                { keyword: '엔터', count: 4 },
                { keyword: '요리', count: 2 }
            ];
        }
    }

    // 모든 키워드 가져오기 (자동완성용)
    async getAllKeywords() {
        try {
            const response = await fetch('http://localhost:3000/api/cluster/recent-keywords?limit=100');
            if (!response.ok) {
                throw new Error('전체 키워드 조회 실패');
            }
            const data = await response.json();
            return data.keywords || [];
        } catch (error) {
            console.warn('전체 키워드 조회 실패:', error);
            // 기본 키워드 세트 (점진적 필터링을 위한 다양한 키워드)
            return [
                // ㄱ으로 시작
                { keyword: '게임', count: 25 },
                { keyword: '게임리뷰', count: 12 },
                { keyword: '게임실황', count: 18 },
                { keyword: '교육', count: 15 },
                { keyword: '교육콘텐츠', count: 8 },
                { keyword: '기술', count: 20 },
                { keyword: '기술리뷰', count: 10 },
                { keyword: '건강', count: 14 },
                { keyword: '골프', count: 9 },
                { keyword: '구독', count: 7 },
                
                // ㄴ으로 시작  
                { keyword: '뉴스', count: 22 },
                { keyword: '노래', count: 16 },
                { keyword: '낚시', count: 8 },
                
                // ㄷ으로 시작
                { keyword: '댄스', count: 13 },
                { keyword: '드라마', count: 19 },
                { keyword: '동물', count: 11 },
                
                // ㄹ으로 시작
                { keyword: '리뷰', count: 28 },
                { keyword: '라이브', count: 15 },
                { keyword: '런닝', count: 6 },
                
                // ㅁ으로 시작
                { keyword: '음악', count: 30 },
                { keyword: '모바일', count: 12 },
                { keyword: '먹방', count: 17 },
                { keyword: '메이크업', count: 9 },
                
                // ㅂ으로 시작
                { keyword: '뷰티', count: 21 },
                { keyword: '방송', count: 14 },
                { keyword: '부동산', count: 8 },
                { keyword: '북튜브', count: 7 },
                
                // ㅅ으로 시작
                { keyword: '스포츠', count: 24 },
                { keyword: '쇼핑', count: 13 },
                { keyword: '수학', count: 10 },
                { keyword: '사업', count: 11 },
                
                // ㅇ으로 시작
                { keyword: '엔터테인먼트', count: 26 },
                { keyword: '영화', count: 23 },
                { keyword: '운동', count: 18 },
                { keyword: '요리', count: 20 },
                { keyword: '여행', count: 19 },
                { keyword: '육아', count: 12 },
                
                // ㅈ으로 시작
                { keyword: '자동차', count: 16 },
                { keyword: '주식', count: 15 },
                { keyword: '정치', count: 9 },
                
                // ㅊ으로 시작
                { keyword: '축구', count: 14 },
                { keyword: '춤', count: 8 },
                
                // ㅋ으로 시작
                { keyword: '코딩', count: 17 },
                { keyword: '코메디', count: 12 },
                
                // ㅌ으로 시작
                { keyword: '테크', count: 13 },
                { keyword: '트랜드', count: 6 },
                
                // ㅍ으로 시작
                { keyword: '패션', count: 15 },
                { keyword: '펫', count: 9 },
                
                // ㅎ으로 시작
                { keyword: '헬스', count: 11 },
                { keyword: '힙합', count: 8 }
            ];
        }
    }

    // 키워드 입력 모달 표시
    showKeywordModal(channelInfo, recentKeywords, allKeywords = []) {
        // 기존 모달 제거
        const existingModal = document.getElementById('channel-collect-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 생성
        const modal = document.createElement('div');
        modal.id = 'channel-collect-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📊 채널 수집하기</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="channel-info">
                        <div class="channel-name">${channelInfo.channelName || '알 수 없는 채널'}</div>
                        ${channelInfo.subscribers && channelInfo.subscribers.trim() !== '' ? 
                            `<div class="channel-subs">${channelInfo.subscribers}</div>` : 
                            '<div class="channel-subs" style="color: #888; font-style: italic;">동영상에서 수집됨</div>'
                        }
                    </div>
                    
                    <div class="modal-body">
                        <div class="section">
                            <label>빠른 선택 (최근 사용):</label>
                            <div class="keyword-buttons">
                                ${recentKeywords.map(kw => 
                                    `<button class="keyword-btn" data-keyword="${kw.keyword}">
                                        ${kw.keyword} <span class="count">(${kw.count})</span>
                                    </button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="section">
                            <label>직접 입력 (키워드 입력 후 엔터, 탭으로 자동완성):</label>
                            <div class="input-container">
                                <input type="text" id="custom-keywords" placeholder="키워드를 입력하고 엔터를 누르세요 (예: 권투)" />
                                <div id="autocomplete-suggestions" class="autocomplete-suggestions"></div>
                            </div>
                        </div>
                        
                        <div class="section">
                            <label>📹 콘텐츠 유형:</label>
                            <div class="content-type-selector">
                                <label class="radio-option">
                                    <input type="radio" name="contentType" value="auto" checked>
                                    <span>🤖 자동 감지</span>
                                    <small>(채널 데이터 기반 최적 분석)</small>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="contentType" value="longform">
                                    <span>🎬 롱폼 주력</span>
                                    <small>(10분+ 심화 콘텐츠)</small>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="contentType" value="shortform">
                                    <span>⚡ 숏폼 주력</span>
                                    <small>(1분 이하 빠른 콘텐츠)</small>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="contentType" value="mixed">
                                    <span>🔀 혼합형</span>
                                    <small>(롱폼 + 숏폼 병행)</small>
                                </label>
                            </div>
                        </div>
                        
                        <div class="section">
                            <label>🤖 AI 분석 옵션:</label>
                            <div class="ai-analysis-selector">
                                <label class="radio-option">
                                    <input type="radio" name="aiAnalysis" value="full">
                                    <span>🧠 완전 분석</span>
                                    <small>(AI 태그 + 카테고리 분석, 약 30초)</small>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="aiAnalysis" value="skip" checked>
                                    <span>⚡ 빠른 수집</span>
                                    <small>(AI 분석 건너뛰기, 약 5초)</small>
                                </label>
                            </div>
                        </div>
                        
                        <div class="section">
                            <label>선택된 키워드:</label>
                            <div id="selected-keywords" class="selected-keywords"></div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button id="collect-cancel" class="btn-cancel">취소</button>
                        <button id="collect-submit" class="btn-submit">수집하기</button>
                    </div>
                </div>
            </div>
        `;

        // 스타일 추가
        modal.innerHTML += `
            <style>
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 500px;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                }
                .modal-header h3 {
                    margin: 0;
                    color: #333;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #999;
                }
                .channel-info {
                    padding: 15px 20px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #eee;
                }
                .channel-name {
                    font-weight: bold;
                    font-size: 16px;
                    color: #333;
                }
                .channel-subs {
                    font-size: 14px;
                    color: #666;
                    margin-top: 2px;
                }
                .modal-body {
                    padding: 20px;
                }
                .section {
                    margin-bottom: 20px;
                }
                .section label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #333;
                }
                .keyword-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .keyword-btn {
                    background: #e9ecef;
                    border: 1px solid #dee2e6;
                    border-radius: 20px;
                    padding: 6px 12px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .keyword-btn:hover {
                    background: #007bff;
                    color: white;
                }
                .keyword-btn.selected {
                    background: #007bff;
                    color: white;
                }
                .count {
                    font-size: 12px;
                    opacity: 0.7;
                }
                .input-container {
                    position: relative;
                    width: 100%;
                }
                #custom-keywords {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    box-sizing: border-box;
                }
                .autocomplete-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-top: none;
                    border-radius: 0 0 6px 6px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    display: none;
                }
                .autocomplete-item {
                    padding: 10px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .autocomplete-item:hover,
                .autocomplete-item.highlighted {
                    background: #f8f9fa;
                }
                .autocomplete-keyword {
                    font-weight: 500;
                }
                .autocomplete-count {
                    font-size: 12px;
                    color: #666;
                    background: #e9ecef;
                    padding: 2px 6px;
                    border-radius: 10px;
                }
                .selected-keywords {
                    min-height: 40px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    padding: 10px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .selected-keyword {
                    background: #007bff;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .remove-keyword {
                    cursor: pointer;
                    font-weight: bold;
                }
                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                .btn-cancel, .btn-submit {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .btn-cancel {
                    background: #6c757d;
                    color: white;
                }
                .btn-submit {
                    background: #007bff;
                    color: white;
                }
                .btn-submit:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                .content-type-selector,
                .ai-analysis-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 8px;
                }
                .radio-option {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .radio-option:hover {
                    background: #f8f9fa;
                }
                .radio-option input[type="radio"] {
                    margin: 0;
                }
                .radio-option span {
                    font-weight: 500;
                    color: #333;
                }
                .radio-option small {
                    color: #666;
                    font-size: 12px;
                    margin-left: auto;
                }
            </style>
        `;

        document.body.appendChild(modal);

        // 모달 이벤트 설정
        this.setupModalEvents(modal, channelInfo, allKeywords);
    }

    // DOM Script 태그 파싱으로 YouTube 내부 데이터에 접근 - CSP 우회 완벽한 해결책
    async extractChannelInfo() {
        const channelInfo = {};
        const url = window.location.href;
        
        console.log('🚀 DOM Script 파싱으로 YouTube 내부 데이터 추출 시작:', url);

        try {
            // DOM Script 태그에서 YouTube 데이터 파싱
            const ytData = this.parseYouTubeDataFromDOM();
            console.log('✅ DOM Script 파싱으로 가져온 데이터:', ytData);
            
            // 1. 채널 페이지 정보 추출
            if (this.isChannelPage() && ytData.ytInitialData) {
                console.log('📺 채널 페이지 - 파싱된 ytInitialData에서 정보 추출');
                
                const header = ytData.ytInitialData?.header;
                let channelHeaderRenderer = null;
                
                if (header?.c4TabbedHeaderRenderer) {
                    channelHeaderRenderer = header.c4TabbedHeaderRenderer;
                } else if (header?.pageHeaderRenderer) {
                    channelHeaderRenderer = header.pageHeaderRenderer;
                }
                
                if (channelHeaderRenderer) {
                    // 채널명
                    channelInfo.channelName = channelHeaderRenderer.title || 
                                            channelHeaderRenderer.channelTitle || 
                                            channelHeaderRenderer.pageTitle || '';
                    
                    // 구독자 수 
                    const subscriberText = channelHeaderRenderer.subscriberCountText?.simpleText || 
                                         channelHeaderRenderer.subscriberCountText?.runs?.[0]?.text || '';
                    channelInfo.subscribers = subscriberText;
                    
                    console.log('✅ 채널 헤더에서 정보 추출 성공:', { 
                        name: channelInfo.channelName, 
                        subs: channelInfo.subscribers 
                    });
                }
                
                // 메타데이터에서 채널 ID 추출
                const metadata = ytData.ytInitialData?.metadata?.channelMetadataRenderer;
                if (metadata) {
                    channelInfo.channelId = metadata.externalId;
                    if (!channelInfo.channelName) {
                        channelInfo.channelName = metadata.title;
                    }
                    channelInfo.channelDescription = metadata.description || '';
                }
            }
            
            // 2. 동영상 페이지 정보 추출
            else if (url.includes('/watch?v=') && ytData.ytInitialPlayerResponse) {
                console.log('🎥 동영상 페이지 - 파싱된 ytInitialPlayerResponse에서 정보 추출');
                
                const videoDetails = ytData.ytInitialPlayerResponse.videoDetails;
                
                if (videoDetails) {
                    channelInfo.channelName = videoDetails.author;
                    channelInfo.channelId = videoDetails.channelId;
                    
                    console.log('✅ 동영상 정보에서 채널 정보 추출 성공:', {
                        name: channelInfo.channelName,
                        id: channelInfo.channelId
                    });
                }
                
                // 추가로 ytInitialData에서 구독자 수 시도
                if (ytData.ytInitialData) {
                    try {
                        const contents = ytData.ytInitialData.contents?.twoColumnWatchNextResults?.results?.results?.contents;
                        const videoOwner = contents?.find(c => c.videoPrimaryInfoRenderer || c.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer;
                        
                        if (videoOwner) {
                            const subscriberText = videoOwner.subscriberCountText?.simpleText || 
                                                 videoOwner.subscriberCountText?.runs?.[0]?.text || '';
                            channelInfo.subscribers = subscriberText;
                        }
                    } catch (e) {
                        console.log('동영상 페이지 구독자 수 추출 실패 (무시)');
                    }
                }
            }
            
            // 3. 쇼츠 페이지 정보 추출
            else if (url.includes('/shorts/') && ytData.ytInitialPlayerResponse) {
                console.log('🎬 쇼츠 페이지 - 파싱된 데이터에서 정보 추출');
                
                const videoDetails = ytData.ytInitialPlayerResponse.videoDetails;
                if (videoDetails) {
                    channelInfo.channelName = videoDetails.author;
                    channelInfo.channelId = videoDetails.channelId;
                    
                    console.log('✅ 쇼츠 정보에서 채널 정보 추출 성공:', {
                        name: channelInfo.channelName,
                        id: channelInfo.channelId
                    });
                }
            }
            
            // URL에서 handle/ID 추출 (보조적)
            const handleMatch = url.match(/\/@([^\/\?]+)/);
            if (handleMatch) {
                channelInfo.youtubeHandle = handleMatch[1];
            }

            const channelMatch = url.match(/\/channel\/([^\/\?]+)/);
            if (channelMatch) {
                channelInfo.channelId = channelInfo.channelId || channelMatch[1];
            }

            const customMatch = url.match(/\/c\/([^\/\?]+)/);
            if (customMatch) {
                channelInfo.customUrl = customMatch[1];
            }

            const userMatch = url.match(/\/user\/([^\/\?]+)/);
            if (userMatch) {
                channelInfo.username = userMatch[1];
            }

        } catch (error) {
            console.error('❌ DOM Script 파싱 실패, DOM 셀렉터 fallback 사용:', error);
            return this.extractChannelInfoFallback();
        }
        
        // 현재 페이지 URL
        channelInfo.pageUrl = url;

        // 채널 정보 추출 실패시 fallback 호출
        const hasChannelInfo = channelInfo.channelName || channelInfo.channelId ||
                              channelInfo.youtubeHandle || channelInfo.customUrl ||
                              channelInfo.username;

        if (!hasChannelInfo) {
            console.log('⚠️ DOM Script 파싱으로 채널 정보 추출 실패 - fallback 호출');
            return this.extractChannelInfoFallback();
        }

        console.log('✅ DOM Script 파싱으로 채널 정보 추출 완료:', channelInfo);
        return channelInfo;
    }
    
    // DOM에서 Script 태그를 파싱하여 YouTube 데이터 추출 (CSP 우회)
    parseYouTubeDataFromDOM() {
        const currentUrl = window.location.href;
        console.log('🔍 DOM Script 태그에서 YouTube 데이터 파싱 시작 - URL:', currentUrl);

        const ytData = {
            ytInitialData: null,
            ytInitialPlayerResponse: null
        };

        // 강제 새로고침 플래그가 있으면 window 객체 무시하고 DOM에서 직접 파싱
        if (!this.forceDataRefresh) {
            // 첫 번째로 window 객체에서 직접 확인 (가장 최신 데이터)
            if (window.ytInitialData) {
                console.log('🎯 window.ytInitialData에서 직접 데이터 확인');
                ytData.ytInitialData = window.ytInitialData;
            }

            if (window.ytInitialPlayerResponse) {
                console.log('🎯 window.ytInitialPlayerResponse에서 직접 데이터 확인');
                ytData.ytInitialPlayerResponse = window.ytInitialPlayerResponse;
            }
        } else {
            console.log('🔄 강제 새로고침 모드 - window 객체 무시하고 DOM 직접 파싱');
            this.forceDataRefresh = false; // 플래그 리셋
        }

        // window 객체에 데이터가 없는 경우에만 script 태그 파싱
        if (!ytData.ytInitialData || !ytData.ytInitialPlayerResponse) {
            console.log('🔄 window 객체에 데이터 부족, script 태그 파싱 진행');

            const scripts = document.querySelectorAll('script');
            let foundInitialData = !!ytData.ytInitialData;
            let foundPlayerResponse = !!ytData.ytInitialPlayerResponse;
        
        for (const script of scripts) {
            const content = script.textContent || script.innerHTML;
            if (!content) continue;
            
            try {
                // ytInitialData 찾기
                if (!foundInitialData && content.includes('var ytInitialData')) {
                    console.log('🎯 ytInitialData script 태그 발견');
                    const match = content.match(/var ytInitialData\s*=\s*({.+?});/s);
                    if (match && match[1]) {
                        try {
                            ytData.ytInitialData = JSON.parse(match[1]);
                            foundInitialData = true;
                            console.log('✅ ytInitialData 파싱 성공');
                        } catch (e) {
                            console.log('⚠️ ytInitialData JSON 파싱 실패, 다른 패턴 시도');
                            
                            // 다른 패턴들 시도
                            const patterns = [
                                /ytInitialData["']\s*[:=]\s*({.+?})[,;]/s,
                                /ytInitialData\s*[:=]\s*({.+?})[,;]/s,
                                /"ytInitialData"\s*:\s*({.+?})[,}]/s
                            ];
                            
                            for (const pattern of patterns) {
                                const altMatch = content.match(pattern);
                                if (altMatch && altMatch[1]) {
                                    try {
                                        ytData.ytInitialData = JSON.parse(altMatch[1]);
                                        foundInitialData = true;
                                        console.log('✅ ytInitialData 대체 패턴으로 파싱 성공');
                                        break;
                                    } catch (e2) {
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // ytInitialPlayerResponse 찾기
                if (!foundPlayerResponse && content.includes('ytInitialPlayerResponse')) {
                    console.log('🎯 ytInitialPlayerResponse script 태그 발견');
                    
                    const patterns = [
                        /var ytInitialPlayerResponse\s*=\s*({.+?});/s,
                        /ytInitialPlayerResponse["']\s*[:=]\s*({.+?})[,;]/s,
                        /ytInitialPlayerResponse\s*[:=]\s*({.+?})[,;]/s,
                        /"ytInitialPlayerResponse"\s*:\s*({.+?})[,}]/s
                    ];
                    
                    for (const pattern of patterns) {
                        const match = content.match(pattern);
                        if (match && match[1]) {
                            try {
                                ytData.ytInitialPlayerResponse = JSON.parse(match[1]);
                                foundPlayerResponse = true;
                                console.log('✅ ytInitialPlayerResponse 파싱 성공');
                                break;
                            } catch (e) {
                                console.log('⚠️ ytInitialPlayerResponse JSON 파싱 실패, 다음 패턴 시도');
                                continue;
                            }
                        }
                    }
                }
                
                // 둘 다 찾았으면 더 이상 검사하지 않음
                if (foundInitialData && foundPlayerResponse) {
                    break;
                }
                
            } catch (error) {
                // 개별 script 오류는 무시하고 계속
                continue;
            }
        }
        }

        // 강화된 데이터 무결성 검증 - 현재 URL과 데이터 정확히 일치하는지 확인
        if (ytData.ytInitialPlayerResponse && ytData.ytInitialPlayerResponse.videoDetails) {
            const videoId = ytData.ytInitialPlayerResponse.videoDetails.videoId;
            const urlVideoId = currentUrl.match(/[?&]v=([^&]+)/)?.[1] || currentUrl.match(/shorts\/([^?\/]+)/)?.[1];

            console.log('🔍 데이터 무결성 검증:', {
                currentUrl,
                extractedVideoId: videoId,
                urlVideoId,
                channelName: ytData.ytInitialPlayerResponse.videoDetails.author
            });

            if (videoId && urlVideoId && videoId !== urlVideoId) {
                console.log('❌ 심각한 데이터 불일치 감지 - 이전 페이지 캐시 데이터:', {
                    extractedVideoId: videoId,
                    currentUrlVideoId: urlVideoId,
                    wrongChannelName: ytData.ytInitialPlayerResponse.videoDetails.author
                });
                ytData.ytInitialPlayerResponse = null; // 잘못된 데이터 완전 제거
                ytData.ytInitialData = null; // 연관 데이터도 제거

                // DOM에서 다시 파싱 시도
                console.log('🔄 캐시된 데이터 제거 후 DOM에서 직접 재파싱 시도');
                return this.parseYouTubeDataFromDOMDirect();
            } else if (videoId === urlVideoId) {
                console.log('✅ 데이터 무결성 검증 통과 - 정확한 현재 페이지 데이터');
            }
        }

        // ytInitialData가 있지만 ytInitialPlayerResponse가 없는 경우 (쇼츠에서 자주 발생)
        // DOM에서 직접 현재 페이지 데이터 확인
        if (ytData.ytInitialData && !ytData.ytInitialPlayerResponse) {
            console.log('⚠️ ytInitialData만 존재, ytInitialPlayerResponse 없음 - DOM 직접 검증 필요');

            // 쇼츠인 경우 DOM에서 실제 채널 정보와 비교
            if (currentUrl.includes('/shorts/')) {
                const domChannelName = this.extractChannelNameFromDOM();
                console.log('🔍 DOM에서 직접 추출한 현재 채널명:', domChannelName);

                if (domChannelName) {
                    // DOM에서 정확한 채널 정보를 얻었으므로 이를 우선 사용
                    console.log('✅ DOM 직접 추출 성공 - 캐시된 데이터 무시');
                    return { ytInitialData: null, ytInitialPlayerResponse: null };
                }
            }
        }

        console.log('📊 DOM Script 파싱 결과:', {
            url: currentUrl,
            foundInitialData: !!ytData.ytInitialData,
            foundPlayerResponse: !!ytData.ytInitialPlayerResponse,
            dataIntegrityCheck: 'completed'
        });

        return ytData;
    }

    // 기존 시스템과 동일한 방식으로 채널명 추출 (content-script-bundled.js 참고)
    extractChannelNameFromDOM() {
        try {
            console.log('🎯 기존 시스템 방식으로 채널명 추출 시작');

            // 기존 extractYouTubeMetadata와 동일한 셀렉터 사용
            const channelEl = document.querySelector('#channel-name a') ||
                            document.querySelector('#owner-name a') ||
                            document.querySelector('#owner #channel-name a');

            if (channelEl?.textContent?.trim()) {
                const channelName = channelEl.textContent.trim();
                console.log('✅ 기존 방식으로 채널명 추출 성공:', channelName);
                return channelName;
            }

            console.log('⚠️ 기존 방식으로 채널명 추출 실패 - 셀렉터로 찾을 수 없음');
            return null;
        } catch (error) {
            console.log('❌ 채널명 추출 중 오류:', error);
            return null;
        }
    }

    // DOM에서 직접 파싱 (캐시 무시)
    parseYouTubeDataFromDOMDirect() {
        const currentUrl = window.location.href;
        console.log('🔄 DOM 직접 파싱 모드 - 모든 캐시 무시:', currentUrl);

        const ytData = {
            ytInitialData: null,
            ytInitialPlayerResponse: null
        };

        // DOM script 태그를 완전히 새롭게 파싱
        const scripts = document.querySelectorAll('script');
        let foundInitialData = false;
        let foundPlayerResponse = false;

        for (const script of scripts) {
            const content = script.textContent || script.innerHTML;
            if (!content) continue;

            try {
                // ytInitialPlayerResponse 최우선 검색 (동영상/쇼츠용)
                if (!foundPlayerResponse && content.includes('ytInitialPlayerResponse')) {
                    const patterns = [
                        /var ytInitialPlayerResponse\s*=\s*({.+?});/s,
                        /ytInitialPlayerResponse["']\s*[:=]\s*({.+?})[,;]/s,
                        /ytInitialPlayerResponse\s*[:=]\s*({.+?})[,;]/s,
                        /"ytInitialPlayerResponse"\s*:\s*({.+?})[,}]/s
                    ];

                    for (const pattern of patterns) {
                        const match = content.match(pattern);
                        if (match && match[1]) {
                            try {
                                const playerData = JSON.parse(match[1]);
                                const videoId = playerData.videoDetails?.videoId;
                                const urlVideoId = currentUrl.match(/[?&]v=([^&]+)/)?.[1] || currentUrl.match(/shorts\/([^?\/]+)/)?.[1];

                                // 즉시 검증
                                if (videoId === urlVideoId) {
                                    ytData.ytInitialPlayerResponse = playerData;
                                    foundPlayerResponse = true;
                                    console.log('✅ 정확한 ytInitialPlayerResponse 직접 파싱 성공:', {
                                        videoId,
                                        channelName: playerData.videoDetails?.author
                                    });
                                    break;
                                } else {
                                    console.log('🔍 부정확한 playerResponse 데이터 스킵:', { videoId, urlVideoId });
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                }

                if (foundPlayerResponse) break; // 정확한 데이터를 찾으면 더 이상 검색하지 않음

            } catch (error) {
                continue;
            }
        }

        console.log('📊 DOM 직접 파싱 결과:', {
            url: currentUrl,
            foundPlayerResponse,
            channelName: ytData.ytInitialPlayerResponse?.videoDetails?.author
        });

        return ytData;
    }

    // 기존 시스템과 동일한 방식으로 채널 정보 추출 (content-script-bundled.js 방식)
    extractChannelInfoFallback() {
        console.log('🔄 기존 시스템 방식으로 채널 정보 추출 시작');
        const channelInfo = { platform: 'YOUTUBE' };
        const url = window.location.href;

        try {
            // 기존 extractYouTubeMetadata와 동일한 로직 사용

            // 1. 채널명 추출
            const channelEl = document.querySelector('#channel-name a') ||
                            document.querySelector('#owner-name a') ||
                            document.querySelector('#owner #channel-name a');

            if (channelEl) {
                channelInfo.channelName = channelEl.textContent?.trim() || '';
                const channelHref = channelEl.href || '';

                // 채널 링크에서 Handle/ID 추출
                if (channelHref) {
                    const handleMatch = channelHref.match(/\/@([^\/\?]+)/);
                    if (handleMatch) {
                        channelInfo.youtubeHandle = handleMatch[1];
                    }

                    const channelMatch = channelHref.match(/\/channel\/([^\/\?]+)/);
                    if (channelMatch) {
                        channelInfo.channelId = channelMatch[1];
                    }
                }

                console.log('✅ 기존 방식으로 채널 정보 추출 성공:', {
                    name: channelInfo.channelName,
                    handle: channelInfo.youtubeHandle,
                    id: channelInfo.channelId
                });
            } else {
                console.log('⚠️ 기존 방식으로 채널 요소를 찾을 수 없음');
            }

            // 2. 구독자 수 추출 (기존 방식 확장)
            const viewEl = document.querySelector('#info-text .view-count') ||
                         document.querySelector('#owner #subscriber-count #text');
            if (viewEl) {
                channelInfo.subscribers = viewEl.textContent?.trim();
            }

        } catch (error) {
            console.log('❌ 기존 방식 채널 정보 추출 중 오류:', error);
        }

        channelInfo.pageUrl = url;
        console.log('📋 기존 방식 추출 결과:', channelInfo);
        return channelInfo;
    }

    // 모달 이벤트 설정
    setupModalEvents(modal, channelInfo, allKeywords = []) {
        const selectedKeywords = new Set();
        
        // 선택된 키워드 업데이트 함수
        const updateSelectedKeywords = () => {
            const container = modal.querySelector('#selected-keywords');
            container.innerHTML = Array.from(selectedKeywords).map(keyword => 
                `<div class="selected-keyword">
                    ${keyword}
                    <span class="remove-keyword" data-keyword="${keyword}">×</span>
                </div>`
            ).join('');
        };

        // 빠른 선택 버튼 클릭
        modal.querySelectorAll('.keyword-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const keyword = btn.getAttribute('data-keyword');
                if (selectedKeywords.has(keyword)) {
                    selectedKeywords.delete(keyword);
                    btn.classList.remove('selected');
                } else {
                    selectedKeywords.add(keyword);
                    btn.classList.add('selected');
                }
                updateSelectedKeywords();
            });
        });

        // 직접 입력 처리 (자동완성 + 엔터/탭키 처리)
        const customInput = modal.querySelector('#custom-keywords');
        const suggestionBox = modal.querySelector('#autocomplete-suggestions');
        let isComposing = false;
        let currentSuggestions = [];
        let selectedSuggestionIndex = -1;
        
        // 한글 조합 상태 추적 (조합 중에도 자동완성 표시)
        customInput.addEventListener('compositionstart', () => {
            isComposing = true;
        });
        
        customInput.addEventListener('compositionupdate', () => {
            // 조합 중에도 중간 결과로 자동완성 표시
            showAutocompleteSuggestions();
        });
        
        customInput.addEventListener('compositionend', () => {
            isComposing = false;
            showAutocompleteSuggestions();
        });
        
        // 실시간 자동완성 표시 (조합 중에도 표시)
        customInput.addEventListener('input', () => {
            showAutocompleteSuggestions();
        });
        
        // 키 입력 처리 (엔터, 탭, 방향키)
        customInput.addEventListener('keydown', (e) => {
            if (isComposing) return;
            
            const inputValue = customInput.value.trim();
            
            if (e.key === 'Enter') {
                e.preventDefault();
                
                if (selectedSuggestionIndex >= 0 && currentSuggestions[selectedSuggestionIndex]) {
                    // 선택된 자동완성 항목 사용
                    addKeyword(currentSuggestions[selectedSuggestionIndex].keyword);
                } else if (inputValue.length >= 2) {
                    // 직접 입력한 키워드 사용
                    addKeyword(inputValue);
                } else if (inputValue.length > 0) {
                    showInputError('최소 2글자 이상 입력하세요');
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                
                if (currentSuggestions.length > 0) {
                    // 가장 유사도 높은 첫 번째 제안 사용
                    addKeyword(currentSuggestions[0].keyword);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSuggestions.length > 0) {
                    selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
                    updateSuggestionHighlight();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSuggestions.length > 0) {
                    selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                    updateSuggestionHighlight();
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });
        
        // 자동완성 제안 표시 (점진적 필터링)
        function showAutocompleteSuggestions() {
            const query = customInput.value.trim();
            
            if (query.length < 1) {
                hideSuggestions();
                return;
            }
            
            // 모든 키워드에서 유사도 계산 후 필터링
            const matchedKeywords = allKeywords
                .map(kw => ({
                    ...kw,
                    similarity: calculateSimilarity(query, kw.keyword)
                }))
                .filter(kw => {
                    // 유사도가 0보다 크고, 이미 선택되지 않은 키워드만
                    return kw.similarity > 0 && !selectedKeywords.has(kw.keyword);
                })
                .sort((a, b) => {
                    // 유사도 우선, 같으면 사용횟수 우선
                    return b.similarity - a.similarity || b.count - a.count;
                })
                .slice(0, 8); // 최대 8개 표시 (늘림)
            
            currentSuggestions = matchedKeywords;
            selectedSuggestionIndex = -1;
            
            if (matchedKeywords.length > 0) {
                showSuggestions(matchedKeywords);
                console.log(`🔍 "${query}" 검색 결과: ${matchedKeywords.length}개`, 
                    matchedKeywords.map(k => `${k.keyword}(${k.similarity})`));
            } else {
                hideSuggestions();
                console.log(`🔍 "${query}" 검색 결과: 없음`);
            }
        }
        

        // 간단하고 안정적인 한글 처리 헬퍼 함수들
        function isKoreanConsonant(char) {
            const consonants = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
            return consonants.includes(char);
        }
        
        function isKoreanChar(char) {
            const code = char.charCodeAt(0);
            return code >= 0xAC00 && code <= 0xD7A3;
        }
        
        function getKoreanInitial(char) {
            if (!isKoreanChar(char)) return char;
            const consonants = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
            const code = char.charCodeAt(0) - 0xAC00;
            const initialIndex = Math.floor(code / 588);
            return consonants[initialIndex];
        }

        // 안정적인 매칭 함수 (라이브러리 없음)
        function calculateSimilarity(query, keyword) {
            console.log(`🔍 매칭 테스트: "${query}" vs "${keyword}"`);
            
            const queryLower = query.toLowerCase();
            const keywordLower = keyword.toLowerCase();
            
            // 1. 완전 일치 (1000점)
            if (keywordLower === queryLower) {
                console.log(`✅ 완전 일치: ${keyword} (1000점)`);
                return 1000;
            }
            
            // 2. 앞부분 일치 (500점)
            if (keywordLower.startsWith(queryLower)) {
                console.log(`✅ 앞부분 일치: ${keyword} (500점)`);
                return 500;
            }
            
            // 3. 한글 초성 매칭 (300점)
            if (query.length === 1 && isKoreanConsonant(query)) {
                const firstChar = keyword[0];
                if (isKoreanChar(firstChar)) {
                    const firstInitial = getKoreanInitial(firstChar);
                    if (firstInitial === query) {
                        console.log(`✅ 초성 매칭: ${keyword} (300점)`);
                        return 300;
                    }
                }
            }
            
            // 5. 부분 일치 (100점)
            if (keywordLower.includes(queryLower)) {
                console.log(`✅ 부분 일치: ${keyword} (100점)`);
                return 100;
            }
            
            console.log(`❌ 매칭 실패: ${keyword} (0점)`);
            return 0;
        }
        
        // 자동완성 목록 표시
        function showSuggestions(suggestions) {
            suggestionBox.innerHTML = suggestions
                .map((kw, index) => `
                    <div class="autocomplete-item" data-index="${index}" data-keyword="${kw.keyword}">
                        <span class="autocomplete-keyword">${kw.keyword}</span>
                        <span class="autocomplete-count">${kw.count}회</span>
                    </div>
                `).join('');
            
            suggestionBox.style.display = 'block';
            
            // 클릭 이벤트 추가
            suggestionBox.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    addKeyword(item.getAttribute('data-keyword'));
                });
            });
        }
        
        // 자동완성 하이라이트 업데이트
        function updateSuggestionHighlight() {
            suggestionBox.querySelectorAll('.autocomplete-item').forEach((item, index) => {
                if (index === selectedSuggestionIndex) {
                    item.classList.add('highlighted');
                } else {
                    item.classList.remove('highlighted');
                }
            });
        }
        
        // 자동완성 숨기기
        function hideSuggestions() {
            suggestionBox.style.display = 'none';
            currentSuggestions = [];
            selectedSuggestionIndex = -1;
        }
        
        // 키워드 추가
        function addKeyword(keyword) {
            if (keyword && keyword.length >= 2) {
                selectedKeywords.add(keyword);
                customInput.value = '';
                hideSuggestions();
                updateSelectedKeywords();
                console.log('📝 키워드 추가:', keyword);
                customInput.focus(); // 포커스 유지
            }
        }
        
        // 입력 오류 표시
        function showInputError(message) {
            customInput.style.borderColor = '#dc3545';
            const originalPlaceholder = customInput.placeholder;
            customInput.placeholder = message;
            
            setTimeout(() => {
                customInput.style.borderColor = '#ddd';
                customInput.placeholder = originalPlaceholder;
            }, 2000);
        }
        
        // 외부 클릭 시 자동완성 숨기기
        document.addEventListener('click', (e) => {
            if (!customInput.contains(e.target) && !suggestionBox.contains(e.target)) {
                hideSuggestions();
            }
        });

        // 키워드 제거 클릭
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-keyword')) {
                const keyword = e.target.getAttribute('data-keyword');
                selectedKeywords.delete(keyword);
                
                // 빠른 선택 버튼 선택 해제
                const btn = modal.querySelector(`[data-keyword="${keyword}"]`);
                if (btn) btn.classList.remove('selected');
                
                updateSelectedKeywords();
            }
        });

        // 취소 버튼
        modal.querySelector('#collect-cancel').addEventListener('click', () => {
            modal.remove();
        });

        // 닫기 버튼
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        // 오버레이 클릭 시 닫기
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                modal.remove();
            }
        });

        // 수집하기 버튼
        const submitBtn = modal.querySelector('#collect-submit');
        submitBtn.addEventListener('click', () => {
            // 선택된 콘텐츠 유형 가져오기
            const contentTypeEl = modal.querySelector('input[name="contentType"]:checked');
            const contentType = contentTypeEl ? contentTypeEl.value : 'auto';
            
            // 선택된 AI 분석 옵션 가져오기
            const aiAnalysisEl = modal.querySelector('input[name="aiAnalysis"]:checked');
            const skipAIAnalysis = aiAnalysisEl ? aiAnalysisEl.value === 'skip' : false;
            
            this.collectChannel(channelInfo, Array.from(selectedKeywords), contentType, skipAIAnalysis);
        });
    }

    // 채널 수집 실행
    async collectChannel(channelInfo, keywords, contentType = 'auto', skipAIAnalysis = false) {
        if (keywords.length === 0) {
            alert('키워드를 최소 하나는 선택해주세요.');
            return;
        }

        this.isAnalyzing = true;
        this.updateButtonState(skipAIAnalysis ? '빠른 수집 중...' : '수집 중...', true);

        // 모달 닫기
        const modal = document.getElementById('channel-collect-modal');
        if (modal) modal.remove();

        try {
            console.log('🚀 채널 수집 시작', { channelInfo, keywords, contentType, skipAIAnalysis });

            // 서버에 수집 요청
            const channelDataWithName = {
                ...channelInfo,
                name: channelInfo.channelName || channelInfo.youtubeHandle || '알 수 없음'
            };
            
            const response = await this.sendCollectRequest({
                channelData: channelDataWithName,
                keywords: keywords,
                contentType: contentType,
                options: {
                    skipAIAnalysis: skipAIAnalysis
                }
            });

            console.log('✅ 채널 수집 완료:', response);
            
            if (response.success) {
                this.updateButtonState('수집 완료!', false);
                
                // 클러스터 제안이 있으면 표시
                if (response.clusterSuggestions && response.clusterSuggestions.length > 0) {
                    setTimeout(() => {
                        this.showClusterSuggestions(response.clusterSuggestions);
                    }, 1000);
                }
            } else {
                throw new Error(response.error || '수집 실패');
            }
            
            // 3초 후 원래 상태로 복원
            setTimeout(() => {
                this.updateButtonState('📊 채널 수집', false);
            }, 3000);

        } catch (error) {
            console.error('❌ 채널 수집 실패:', error);
            this.updateButtonState('수집 실패', false);
            
            setTimeout(() => {
                this.updateButtonState('📊 채널 수집', false);
            }, 3000);
        } finally {
            this.isAnalyzing = false;
        }
    }

    // 서버에 수집 요청 전송
    async sendCollectRequest(data) {
        const response = await fetch('http://localhost:3000/api/channel-queue/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channelIdentifier: data.channelData.youtubeHandle ? `@${data.channelData.youtubeHandle}` : 
                                  data.channelData.channelId ? data.channelData.channelId :
                                  data.channelData.customUrl ? data.channelData.customUrl :
                                  data.channelData.username ? data.channelData.username : 'unknown',
                keywords: data.keywords,
                contentType: data.contentType,
                options: data.options
            })
        });

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        return await response.json();
    }

    // 클러스터 제안 표시
    showClusterSuggestions(suggestions) {
        if (suggestions.length === 0) return;

        const suggestion = suggestions[0]; // 첫 번째 제안만 표시
        const message = `💡 "${suggestion.cluster.name}" 클러스터에 추가하시겠습니까?\n\n${suggestion.reason}`;
        
        if (confirm(message)) {
            // TODO: 클러스터에 추가하는 API 호출
            console.log('클러스터에 추가:', suggestion);
        }
    }

    // 버튼 상태 업데이트
    updateButtonState(text, isLoading) {
        if (!this.channelButton) return;

        this.channelButton.innerHTML = isLoading 
            ? `<span style="animation: spin 1s linear infinite;">⏳</span> ${text}`
            : `<span>📊</span> ${text}`;
        
        this.channelButton.disabled = isLoading;
        this.channelButton.style.opacity = isLoading ? '0.7' : '1';
        this.channelButton.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    }
}

// 스타일 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// YouTube 페이지에서만 초기화 (강제 실행)
console.log('🔍 YouTube 채널 수집기 로딩 체크:', {
    hostname: window.location.hostname,
    readyState: document.readyState,
    url: window.location.href
});

if (window.location.hostname === 'www.youtube.com') {
    console.log('✅ YouTube 페이지에서 채널 수집기 초기화 시작');
    
    // 즉시 초기화 (readyState와 무관하게)
    window.youtubeChannelAnalyzer = new YouTubeChannelAnalyzer();
    console.log('✅ YouTubeChannelAnalyzer 생성 완료');
    
    // 추가 안전장치
    setTimeout(() => {
        if (!window.youtubeChannelAnalyzer) {
            console.log('🚨 재시도: YouTubeChannelAnalyzer 생성');
            window.youtubeChannelAnalyzer = new YouTubeChannelAnalyzer();
        }
    }, 1000);
} else {
    console.log('❌ YouTube 페이지가 아님, 채널 수집기 로드 스킵');
}

// 확장 프로그램 팝업으로부터의 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showChannelCollectModal') {
        if (window.youtubeChannelAnalyzer) {
            window.youtubeChannelAnalyzer.showCollectModal();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: '채널 수집 기능이 초기화되지 않음' });
        }
        return true; // 비동기 응답
    }
});

console.log('📺 YouTube 채널 수집 기능 로드됨');