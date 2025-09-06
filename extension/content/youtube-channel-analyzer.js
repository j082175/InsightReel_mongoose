// YouTube 채널 분석기 - 2단계 분석 (썸네일 + 제목 + 태그 + 설명)
class YouTubeChannelAnalyzer {
    constructor() {
        this.isAnalyzing = false;
        this.channelButton = null;
        this.init();
    }

    init() {
        console.log('🎥 YouTube 채널 분석기 초기화');
        this.checkForChannelPage();
        
        // URL 변경 감지 (YouTube SPA 특성)
        this.observeURLChanges();
    }

    // URL 변경 감지 (YouTube는 SPA라서 페이지 새로고침 없이 URL 변경)
    observeURLChanges() {
        let currentURL = location.href;
        
        const observer = new MutationObserver(() => {
            if (location.href !== currentURL) {
                currentURL = location.href;
                setTimeout(() => this.checkForChannelPage(), 1000);
            }
        });
        
        observer.observe(document, { subtree: true, childList: true });
    }

    // 채널 페이지인지 확인
    isChannelPage() {
        const url = window.location.href;
        return url.includes('/channel/') || 
               url.includes('/@') || 
               url.includes('/c/') ||
               url.includes('/user/');
    }

    // 채널 페이지 체크 및 버튼 추가
    checkForChannelPage() {
        if (!this.isChannelPage()) {
            this.removeAnalyzeButton();
            return;
        }

        // 채널 페이지에서 채널 헤더가 로드될 때까지 대기
        this.waitForChannelHeader();
    }

    // 채널 헤더 로드 대기
    waitForChannelHeader() {
        const maxAttempts = 10;
        let attempts = 0;

        const checkHeader = () => {
            attempts++;
            
            // 채널 헤더 요소들 확인
            const channelName = document.querySelector('#channel-name, .ytd-channel-name, #text-container h1');
            const subscriberCount = document.querySelector('#subscriber-count, .ytd-subscriber-count');
            
            if (channelName && subscriberCount) {
                this.addAnalyzeButton();
            } else if (attempts < maxAttempts) {
                setTimeout(checkHeader, 1000);
            } else {
                console.log('⚠️ 채널 헤더를 찾을 수 없음');
            }
        };

        checkHeader();
    }

    // 채널 분석 버튼 추가
    addAnalyzeButton() {
        // 기존 버튼 제거
        this.removeAnalyzeButton();

        // 버튼을 추가할 위치 찾기 (구독 버튼 근처)
        const subscribeButton = document.querySelector('#subscribe-button, .ytd-subscribe-button-renderer');
        if (!subscribeButton) {
            console.log('⚠️ 구독 버튼을 찾을 수 없어 버튼 위치 결정 실패');
            return;
        }

        // 채널 분석 버튼 생성
        this.channelButton = document.createElement('button');
        this.channelButton.id = 'youtube-channel-analyze-btn';
        this.channelButton.innerHTML = `
            <span>🤖 채널 분석</span>
        `;
        
        this.channelButton.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 18px;
            padding: 10px 16px;
            margin-left: 8px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
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
        this.channelButton.addEventListener('click', () => this.analyzeChannel());

        // 버튼 추가
        const buttonContainer = subscribeButton.parentElement;
        if (buttonContainer) {
            buttonContainer.appendChild(this.channelButton);
            console.log('✅ 채널 분석 버튼 추가됨');
        }
    }

    // 기존 버튼 제거
    removeAnalyzeButton() {
        const existingButton = document.getElementById('youtube-channel-analyze-btn');
        if (existingButton) {
            existingButton.remove();
        }
        this.channelButton = null;
    }

    // 채널 분석 시작
    async analyzeChannel() {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.updateButtonState('분석 중...', true);

        try {
            console.log('🚀 채널 분석 시작');

            // 1단계: 채널 기본 정보 수집
            const channelInfo = this.extractChannelInfo();
            console.log('📊 채널 정보:', channelInfo);

            if (!channelInfo.channelId && !channelInfo.channelHandle) {
                throw new Error('채널 ID를 찾을 수 없습니다.');
            }

            // 2단계: 서버에 분석 요청
            const response = await this.sendAnalysisRequest({
                type: 'channel',
                platform: 'youtube',
                channelInfo: channelInfo,
                analysisLevel: 2 // 2단계 분석
            });

            console.log('✅ 채널 분석 완료:', response);
            
            this.updateButtonState('분석 완료!', false);
            
            // 3초 후 원래 상태로 복원
            setTimeout(() => {
                this.updateButtonState('🤖 채널 분석', false);
            }, 3000);

        } catch (error) {
            console.error('❌ 채널 분석 실패:', error);
            this.updateButtonState('분석 실패', false);
            
            setTimeout(() => {
                this.updateButtonState('🤖 채널 분석', false);
            }, 3000);
        } finally {
            this.isAnalyzing = false;
        }
    }

    // 채널 기본 정보 추출
    extractChannelInfo() {
        const channelInfo = {};

        // 채널 이름
        const channelNameEl = document.querySelector('#channel-name #text, .ytd-channel-name #text, #text-container h1');
        channelInfo.channelName = channelNameEl?.textContent?.trim() || '';

        // 구독자 수
        const subscriberEl = document.querySelector('#subscriber-count #text, .ytd-subscriber-count #text');
        channelInfo.subscriberCount = subscriberEl?.textContent?.trim() || '';

        // 채널 설명 (About 탭에서 가져와야 하지만 현재 페이지에서 가능한 것만)
        const descriptionEl = document.querySelector('meta[name="description"]');
        channelInfo.channelDescription = descriptionEl?.getAttribute('content') || '';

        // 채널 ID 추출 (URL에서)
        const url = window.location.href;
        
        // @handle 형태
        const handleMatch = url.match(/\/@([^\/\?]+)/);
        if (handleMatch) {
            channelInfo.channelHandle = handleMatch[1];
        }

        // /channel/ID 형태
        const channelMatch = url.match(/\/channel\/([^\/\?]+)/);
        if (channelMatch) {
            channelInfo.channelId = channelMatch[1];
        }

        // /c/customURL 형태
        const customMatch = url.match(/\/c\/([^\/\?]+)/);
        if (customMatch) {
            channelInfo.customUrl = customMatch[1];
        }

        // /user/username 형태
        const userMatch = url.match(/\/user\/([^\/\?]+)/);
        if (userMatch) {
            channelInfo.username = userMatch[1];
        }

        // 현재 페이지 URL
        channelInfo.pageUrl = url;

        return channelInfo;
    }

    // 서버에 분석 요청 전송
    async sendAnalysisRequest(data) {
        const response = await fetch('http://localhost:3000/api/analyze-channel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        return await response.json();
    }

    // 버튼 상태 업데이트
    updateButtonState(text, isLoading) {
        if (!this.channelButton) return;

        this.channelButton.innerHTML = isLoading 
            ? `<span style="animation: spin 1s linear infinite;">⏳</span> ${text}`
            : `<span>🤖</span> ${text}`;
        
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

// YouTube 페이지에서만 초기화
if (window.location.hostname === 'www.youtube.com') {
    // 페이지 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.youtubeChannelAnalyzer = new YouTubeChannelAnalyzer();
        });
    } else {
        window.youtubeChannelAnalyzer = new YouTubeChannelAnalyzer();
    }
}

console.log('📺 YouTube 채널 분석기 로드됨');