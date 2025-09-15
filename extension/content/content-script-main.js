/**
 * InsightReel Content Script (Complete Restored Version)
 * 기존 거대 파일의 모든 핵심 기능을 모듈화된 구조로 복원
 */

// 환경 설정 (브라우저 환경용)
const environment = {
    SERVER_URL: 'http://localhost:3000',
    NODE_ENV: 'production',
    GOOGLE_API_KEY: null,
    isDevelopment: false,
};

// 플랫폼 상수
const PLATFORMS = {
    INSTAGRAM: 'INSTAGRAM',
    TIKTOK: 'TIKTOK',
    YOUTUBE: 'YOUTUBE'
};

// 기본 유틸리티
class Utils {
    static detectPlatform() {
        const hostname = window.location.hostname;
        if (hostname.includes('instagram.com')) return 'INSTAGRAM';
        if (hostname.includes('tiktok.com')) return 'TIKTOK';
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YOUTUBE';
        return null;
    }

    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[InsightReel ${timestamp}]`;

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
}

// Instagram Media Tracker (완전 복원)
const InstagramMediaTracker = {
    mediaData: {}, // shortcode -> 완전한 미디어 정보
    mediaIdMap: {}, // media ID -> shortcode
    fbIdMap: {}, // FB ID -> shortcode

    init() {
        this.setupNetworkInterception();
        this.extractFromPageData();
        Utils.log('success', '🔥 Instagram Media Tracker 초기화 완료');
    },

    setupNetworkInterception() {
        const self = this;

        // XMLHttpRequest 후킹 (Instagram downloader 핵심 방식)
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._url = url;
            return originalXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (data) {
            this.addEventListener('load', function () {
                if (this.status >= 200 && this.status < 300) {
                    try {
                        if (this.responseURL.includes('/graphql/query')) {
                            const responseData = JSON.parse(this.responseText);
                            self.processGraphQLResponse(responseData);
                        } else if (
                            this.responseURL.includes('/api/v1/media/') &&
                            this.responseURL.includes('/info/')
                        ) {
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
            data.items.forEach((item) => this.storeMediaInfo(item));
        }
    },

    processFeedResponse(data) {
        if (data.items) {
            data.items.forEach((item) => {
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
            play_count:
                mediaItem?.ig_play_count ||
                mediaItem?.play_count ||
                mediaItem?.view_count,
            username:
                mediaItem?.caption?.user?.username ||
                mediaItem?.owner?.username ||
                mediaItem?.user?.username,
            video_url: mediaItem?.video_versions?.[0]?.url,
            img_origin: mediaItem?.image_versions2?.candidates?.[0]?.url,
        };

        // 캐러셀 미디어 처리
        if (mediaItem?.carousel_media) {
            mediaInfo.carousel_media = mediaItem.carousel_media
                .map((item) => [
                    item?.video_versions?.[0]?.url,
                    item?.image_versions2?.candidates?.[0]?.url,
                ])
                .flat()
                .filter((url) => url)
                .join('\n');
        }

        this.mediaData[shortcode] = mediaInfo;

        // ID 매핑 생성
        if (mediaItem.id) {
            this.mediaIdMap[mediaItem.id] = shortcode;
        }
        if (mediaItem.pk) {
            this.fbIdMap[mediaItem.pk] = shortcode;
        }
        if (mediaItem.video_id) {
            this.fbIdMap[mediaItem.video_id] = shortcode;
        }
        if (mediaItem.fb_video_id) {
            this.fbIdMap[mediaItem.fb_video_id] = shortcode;
        }

        Utils.log('info', '📱 미디어 정보 저장됨', {
            shortcode,
            url: mediaInfo.video_url?.substring(0, 50) + '...',
            hasCarousel: !!mediaInfo.carousel_media,
        });
    },

    updateExistingMedia(existing, newData) {
        if (!existing.video_url && newData?.video_versions?.[0]?.url) {
            existing.video_url = newData.video_versions[0].url;
        }
        if (
            !existing.created_at &&
            (newData?.caption?.created_at || newData?.taken_at)
        ) {
            existing.created_at =
                newData.caption?.created_at || newData.taken_at;
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
            if (
                obj.hasOwnProperty(key) &&
                obj[key] &&
                typeof obj[key] === 'object'
            ) {
                this.extractMediaFromAnyLevel(obj[key], depth + 1);
            }
        }
    },

    processDataSection(data) {
        // 피드 타임라인 처리
        if (data.xdt_api__v1__feed__timeline__connection?.edges) {
            data.xdt_api__v1__feed__timeline__connection.edges.forEach((edge) => {
                if (edge.node?.media) {
                    this.storeMediaInfo(edge.node.media);
                }
            });
        }

        // 릴스 피드 처리
        if (data.xdt_api__v1__clips__home__connection_v2?.edges) {
            data.xdt_api__v1__clips__home__connection_v2.edges.forEach((edge) => {
                if (edge.node?.media) {
                    this.storeMediaInfo(edge.node.media);
                } else if (edge.node) {
                    this.storeMediaInfo(edge.node);
                }
            });
        }

        // 단일 포스트 정보
        if (data.xdt_api__v1__media__shortcode__web_info?.items) {
            data.xdt_api__v1__media__shortcode__web_info.items.forEach((item) => {
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
        const urlMatch = window.location.href.match(
            /\/p\/([A-Za-z0-9_-]+)|\/reel\/([A-Za-z0-9_-]+)|\/reels\/([A-Za-z0-9_-]+)/,
        );
        const shortcode = urlMatch ? urlMatch[1] || urlMatch[2] || urlMatch[3] : null;

        if (shortcode && this.mediaData[shortcode]) {
            Utils.log('info', '🎯 URL에서 미디어 발견:', shortcode);
            return this.mediaData[shortcode];
        }

        // 가장 최근에 로드된 미디어 중 비디오가 있는 것 찾기
        const recentMediaWithVideo = Object.values(this.mediaData)
            .filter((media) => media.video_url)
            .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];

        if (recentMediaWithVideo) {
            Utils.log('info', '🎯 최근 비디오 미디어 사용:', recentMediaWithVideo.code);
            return recentMediaWithVideo;
        }

        return null;
    },
};

// YouTube Channel Analyzer (완전 복원)
class YouTubeChannelAnalyzer {
    constructor() {
        this.isAnalyzing = false;
        this.channelButton = null;
        this.init();
    }

    init() {
        Utils.log('info', '🎥 YouTube 채널 분석기 초기화');
        this.checkForChannelPage();
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

        observer.observe(document, {
            subtree: true,
            childList: true,
        });
    }

    // 채널 페이지인지 확인
    isChannelPage() {
        const url = window.location.href;
        return (
            url.includes('/channel/') ||
            url.includes('/@') ||
            url.includes('/c/') ||
            url.includes('/user/')
        );
    }

    // 채널 페이지 체크 및 버튼 추가
    checkForChannelPage() {
        if (!this.isChannelPage()) {
            this.removeAnalyzeButton();
            return;
        }

        this.waitForChannelHeader();
    }

    // 채널 헤더 로드 대기
    waitForChannelHeader() {
        const maxAttempts = 10;
        let attempts = 0;

        const checkHeader = () => {
            attempts++;

            const channelName = document.querySelector(
                '#channel-name, .ytd-channel-name, #text-container h1',
            );
            const subscribers = document.querySelector(
                '#subscriber-count, .ytd-subscriber-count',
            );

            if (channelName && subscribers) {
                this.addAnalyzeButton();
            } else if (attempts < maxAttempts) {
                setTimeout(checkHeader, 1000);
            } else {
                Utils.log('warn', '⚠️ 채널 헤더를 찾을 수 없음');
            }
        };

        checkHeader();
    }

    // 채널 분석 버튼 추가
    addAnalyzeButton() {
        this.removeAnalyzeButton();

        const subscribeButton = document.querySelector(
            '#subscribe-button, .ytd-subscribe-button-renderer',
        );
        if (!subscribeButton) {
            Utils.log('warn', '⚠️ 구독 버튼을 찾을 수 없어 버튼 위치 결정 실패');
            return;
        }

        // 채널 분석 버튼 생성
        this.channelButton = document.createElement('button');
        this.channelButton.textContent = '🤖 채널 분석';
        this.channelButton.className = 'youtube-channel-analysis-button';
        this.channelButton.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
            color: white !important;
            border: none !important;
            border-radius: 20px !important;
            padding: 12px 20px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            margin: 10px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        `;

        this.channelButton.addEventListener('click', () => {
            this.analyzeChannel();
        });

        // 구독 버튼 근처에 추가
        const buttonContainer = subscribeButton.closest('#subscribe-button') ||
                               subscribeButton.parentElement;
        if (buttonContainer) {
            buttonContainer.appendChild(this.channelButton);
            Utils.log('success', '✅ YouTube 채널 분석 버튼 추가됨');
        }
    }

    // 기존 버튼 제거
    removeAnalyzeButton() {
        const existingButton = document.querySelector('.youtube-channel-analysis-button');
        if (existingButton) {
            existingButton.remove();
        }
        this.channelButton = null;
    }

    // 채널 분석 실행
    async analyzeChannel() {
        if (this.isAnalyzing) {
            Utils.log('warn', '이미 분석 중입니다');
            return;
        }

        this.isAnalyzing = true;
        this.updateButtonState(true);

        try {
            const channelData = this.extractChannelData();

            if (!channelData) {
                Utils.log('error', '채널 데이터를 추출할 수 없습니다');
                return;
            }

            Utils.log('info', '🎯 채널 분석 시작', channelData);

            // 서버로 데이터 전송
            const response = await fetch(`${environment.SERVER_URL}/api/process-channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform: 'YOUTUBE',
                    type: 'channel',
                    data: channelData,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                Utils.log('success', '✅ 채널 분석 완료', result);
            } else {
                Utils.log('error', '❌ 서버 응답 오류', response.status);
            }

        } catch (error) {
            Utils.log('error', '❌ 채널 분석 실패', error.message);
        } finally {
            this.isAnalyzing = false;
            this.updateButtonState(false);
        }
    }

    // 채널 데이터 추출
    extractChannelData() {
        const channelName = document.querySelector(
            '#channel-name .ytd-channel-name, #text-container h1'
        )?.textContent?.trim();

        const subscribersText = document.querySelector(
            '#subscriber-count, .ytd-subscriber-count'
        )?.textContent?.trim();

        const channelDescription = document.querySelector(
            '#description-content, .ytd-channel-about-metadata-renderer'
        )?.textContent?.trim();

        const channelUrl = window.location.href;
        const channelId = channelUrl.match(/\/channel\/([^\/\?]+)/)?.[1] ||
                         channelUrl.match(/\/@([^\/\?]+)/)?.[1];

        return {
            name: channelName,
            id: channelId,
            subscribers: subscribersText,
            description: channelDescription,
            url: channelUrl
        };
    }

    // 버튼 상태 업데이트
    updateButtonState(isLoading) {
        if (this.channelButton) {
            this.channelButton.textContent = isLoading ? '🔄 분석중...' : '🤖 채널 분석';
            this.channelButton.disabled = isLoading;
            this.channelButton.style.cursor = isLoading ? 'not-allowed' : 'pointer';
        }
    }
}

// Instagram UI System (완전 복원)
const InstagramUISystem = {
    processedElements: new Set(),
    scanInterval: null,

    init() {
        Utils.log('info', '🎨 Instagram UI System 시작');
        this.startScanning();
        // 즉시 한 번 스캔
        this.scanForMedia();
    },

    startScanning() {
        // 성능 최적화: 3초 간격으로 스캔 (로그 스팸 방지)
        this.scanInterval = setInterval(() => {
            this.scanForMedia();
        }, 3000);

        // 초기 스캔 즉시 실행
        this.scanForMedia();
    },

    scanForMedia() {
        // 조용한 모드: 성공한 경우만 로그 출력
        let postsFound = 0;
        let lastSuccessfulSelector = '';

        // 다양한 Instagram 포스트 셀렉터 시도
        const postSelectors = [
            'article[role="presentation"]',           // 기존 방식
            'article',                               // 일반적인 article
            'div[role="presentation"]',              // div 기반
            '[data-testid="post-item"]',            // 테스트 ID 기반
            'div[style*="flex-direction"]'           // 스타일 기반
        ];

        for (const selector of postSelectors) {
            const posts = document.querySelectorAll(selector);

            // 새로운 포스트만 처리 (이미 처리된 요소 제외)
            let newPostsCount = 0;
            posts.forEach(post => {
                if (this.processedElements.has(post)) return;

                // 비디오나 이미지 요소 확인 (더 포괄적인 셀렉터)
                const video = post.querySelector('video');
                const image = post.querySelector('img[src*="scontent"], img[src*="cdninstagram"], img[src*="instagram"], img[alt]');

                // article 태그 자체가 포스트인 경우도 처리
                const isArticlePost = post.tagName === 'ARTICLE';

                if (video || image || isArticlePost) {
                    this.addAnalysisButton(post);
                    this.processedElements.add(post);
                    postsFound++;
                    newPostsCount++;
                }
            });

            // 새로운 포스트가 발견된 경우에만 로그 출력
            if (newPostsCount > 0) {
                lastSuccessfulSelector = selector;
                Utils.log('success', `✅ ${newPostsCount}개 새 포스트 발견 (${selector})`);
            }

            if (postsFound > 0) break; // 성공적으로 찾으면 다음 셀렉터 시도 안함
        }

        // 처음 실행이거나 새로운 포스트가 없을 때만 디버그 정보 출력 (5초 간격)
        const now = Date.now();
        if (!this.lastDebugTime || (now - this.lastDebugTime > 5000)) {
            if (postsFound === 0) {
                Utils.log('info', '🔍 Instagram 포스트 스캔 중...');
                this.debugDOMStructure();
            }
            this.lastDebugTime = now;
        }
    },

    debugDOMStructure() {
        const allArticles = document.querySelectorAll('article');
        const allDivs = document.querySelectorAll('div[role]');
        const allVideos = document.querySelectorAll('video');

        Utils.log('info', '📊 DOM 구조 분석:', {
            articles: allArticles.length,
            divsWithRole: allDivs.length,
            videos: allVideos.length,
            url: window.location.href
        });
    },

    addAnalysisButton(post) {
        if (post.querySelector('.instagram-analysis-button')) return;

        const button = document.createElement('button');
        button.textContent = '🤖 분석';
        button.className = 'instagram-analysis-button';
        button.style.cssText = `
            background: linear-gradient(45deg, #8e44ad, #3498db) !important;
            color: white !important;
            border: none !important;
            border-radius: 20px !important;
            padding: 8px 16px !important;
            font-size: 12px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            margin: 5px !important;
            z-index: 9999 !important;
            position: absolute !important;
            top: 10px !important;
            right: 10px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        `;

        button.addEventListener('click', () => {
            this.analyzeInstagramMedia();
        });

        // 여러 위치에 버튼 추가 시도
        let buttonAdded = false;

        // 1. 기존 저장 버튼 근처에 추가 시도
        const saveSelectors = [
            'svg[aria-label*="저장"], svg[aria-label*="Save"]',
            'svg[aria-label*="Bookmark"]',
            '[data-testid="save-button"]',
            '[role="button"][aria-label*="Save"]'
        ];

        for (const selector of saveSelectors) {
            const saveButtons = post.querySelectorAll(selector);
            if (saveButtons.length > 0) {
                const saveButton = saveButtons[0].closest('button');
                if (saveButton && saveButton.parentElement) {
                    saveButton.parentElement.appendChild(button);
                    buttonAdded = true;
                    Utils.log('success', `✅ 저장 버튼 근처에 분석 버튼 추가됨 (${selector})`);
                    break;
                }
            }
        }

        // 2. 저장 버튼을 찾지 못했다면 포스트 상단에 고정 위치로 추가
        if (!buttonAdded) {
            // 인스타그램 레이아웃을 깨뜨리지 않도록 position 변경 없이 처리
            // post.style.position = 'relative'; // 이 줄이 레이아웃을 깨뜨림

            // 대신 fixed position으로 우상단에 표시
            button.style.position = 'fixed !important';
            button.style.top = '80px !important';
            button.style.right = '20px !important';
            button.style.zIndex = '10000 !important';

            document.body.appendChild(button);
            buttonAdded = true;
            Utils.log('success', '✅ 고정 위치에 분석 버튼 추가됨 (레이아웃 보존)');
        }

        return buttonAdded;
    },

    async analyzeInstagramMedia() {
        Utils.log('info', '🎯 Instagram 미디어 분석 시작');

        try {
            const mediaInfo = InstagramMediaTracker.getMediaInfoForCurrentVideo();

            if (!mediaInfo) {
                Utils.log('warn', '현재 미디어 정보를 찾을 수 없습니다');
                return;
            }

            const response = await fetch(`${environment.SERVER_URL}/api/process-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform: 'INSTAGRAM',
                    type: 'video',
                    data: mediaInfo,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                Utils.log('success', '✅ Instagram 미디어 분석 완료', result);
            } else {
                Utils.log('error', '❌ 서버 응답 오류', response.status);
            }

        } catch (error) {
            Utils.log('error', '❌ Instagram 미디어 분석 실패', error.message);
        }
    },

    cleanup() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }
        this.processedElements.clear();
    }
};

// YouTube Video Handler (복원)
const YouTubeVideoHandler = {
    init() {
        this.addYouTubeButtons();

        // 개선된 SPA 변경 감지 (채널 분석 버튼 방식 적용)
        this.setupUrlChangeListener();
    },

    // URL 변경 감지 시스템 (채널 분석 버튼과 동일한 방식)
    setupUrlChangeListener() {
        let currentUrl = window.location.href;
        console.log('🔄 YouTube 분석 버튼 URL 변경 감지 시작');

        const checkUrlChange = () => {
            const newUrl = window.location.href;
            if (currentUrl !== newUrl) {
                console.log('🔄 YouTube 분석 버튼 URL 변경 감지:', currentUrl, '→', newUrl);
                currentUrl = newUrl;
                this.updateButtonsVisibility();
            }
        };

        // YouTube 네비게이션 이벤트
        window.addEventListener('yt-navigate-finish', () => {
            setTimeout(() => this.updateButtonsVisibility(), 500);
        });

        // MutationObserver로 추가 감지
        const observer = new MutationObserver(checkUrlChange);
        observer.observe(document, { subtree: true, childList: true });

        // 안전장치로 interval 체크
        setInterval(checkUrlChange, 1000);
    },

    // 버튼 표시 여부 업데이트 (채널 분석 버튼과 동일한 방식)
    updateButtonsVisibility() {
        if (!this.isValidAnalysisPage()) {
            console.log('🚫 분석 불가능한 페이지로 이동 - 모든 분석 버튼 제거');
            this.removeAllAnalysisButtons();
        } else {
            console.log('✅ 분석 가능한 페이지로 이동 - 적절한 분석 버튼 생성');
            this.addYouTubeButtons();
        }
    },

    addYouTubeButtons() {
        // 채널 분석 버튼 방식 적용: 조건부 버튼 표시
        if (!this.isValidAnalysisPage()) {
            console.log('🚫 분석 불가능한 페이지 - 버튼 생성하지 않음');
            this.removeAllAnalysisButtons();
            return;
        }

        const isVideoPage = window.location.pathname === '/watch';
        const isShortsPage = window.location.pathname.startsWith('/shorts/');

        console.log('✅ 분석 가능한 페이지 - 버튼 생성 진행');

        if (isVideoPage) {
            this.addYouTubeVideoAnalysisButton();
            // 쇼츠 버튼이 있으면 제거
            this.removeShortsButton();
        } else if (isShortsPage) {
            this.addYouTubeShortsAnalysisButton();
            // 영상 버튼이 있으면 제거
            this.removeVideoButton();
        }
    },

    // 분석 가능한 페이지인지 확인 (채널 분석 버튼과 동일한 로직)
    isValidAnalysisPage() {
        const currentUrl = window.location.href;

        // 먼저 영상/쇼츠 페이지인지 확인
        if (currentUrl.includes('/watch') || currentUrl.includes('/shorts/')) {
            return true;
        }

        // 홈 화면 등은 분석 불가
        const homePatterns = [
            'https://www.youtube.com/',
            'https://www.youtube.com',
            'https://www.youtube.com/feed/subscriptions',
            'https://www.youtube.com/feed/trending',
            'https://www.youtube.com/feed/explore'
        ];

        for (const pattern of homePatterns) {
            if (currentUrl === pattern || currentUrl.startsWith(pattern + '?')) {
                return false;
            }
        }

        return false; // 기본적으로 분석 불가
    },

    // 모든 분석 버튼 제거
    removeAllAnalysisButtons() {
        this.removeVideoButton();
        this.removeShortsButton();
    },

    // 영상 분석 버튼 제거
    removeVideoButton() {
        const existingButton = document.querySelector('.youtube-analysis-button');
        if (existingButton) {
            existingButton.remove();
            console.log('🗑️ 영상 분석 버튼 제거됨');
        }
    },

    // 쇼츠 분석 버튼 제거
    removeShortsButton() {
        const existingButton = document.querySelector('.youtube-shorts-analysis-button');
        if (existingButton) {
            existingButton.remove();
            console.log('🗑️ 쇼츠 분석 버튼 제거됨');
        }
    },

    // 스마트 셀렉터: 영상 분석 버튼 컨테이너 찾기
    findVideoButtonContainer() {
        console.log('🔍 영상 분석 버튼 컨테이너 검색 시작');

        // 1단계: 기본 셀렉터들 (우선순위 높음)
        const primarySelectors = [
            '#top-level-buttons-computed',              // 최신 YouTube (가장 일반적)
            '#actions #top-level-buttons',              // 기존 YouTube
            '.ytd-menu-renderer #top-level-buttons',    // 메뉴 렌더러 내부
            '#menu-container #top-level-buttons'        // 메뉴 컨테이너 내부
        ];

        for (const selector of primarySelectors) {
            const element = document.querySelector(selector);
            if (element && this.isValidButtonContainer(element)) {
                console.log(`✅ 기본 셀렉터로 컨테이너 발견: ${selector}`);
                return element;
            }
        }

        // 2단계: 대체 셀렉터들 (구조 변경에 대응)
        const fallbackSelectors = [
            '#actions .ytd-menu-renderer',              // 액션 영역의 메뉴 렌더러
            '.ytd-video-primary-info-renderer #menu',   // 비디오 정보 영역의 메뉴
            '#primary-inner #menu',                     // 프라이머리 내부 메뉴
            '.ytd-watch-flexy #menu',                   // 워치 플렉시 메뉴
            '#actions .yt-spec-touch-feedback-shape',   // 터치 피드백 모양 (모바일)
            '.ytd-video-primary-info-renderer [role="toolbar"]' // 툴바 역할을 하는 요소
        ];

        for (const selector of fallbackSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isValidButtonContainer(element)) {
                console.log(`✅ 대체 셀렉터로 컨테이너 발견: ${selector}`);
                return element;
            }
        }

        // 3단계: 넓은 범위 검색 (최후 수단)
        const wideSelectors = [
            '#actions',                                 // 전체 액션 영역
            '#primary-inner',                          // 프라이머리 내부 전체
            '.ytd-video-primary-info-renderer'         // 비디오 정보 렌더러
        ];

        for (const selector of wideSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isValidButtonContainer(element)) {
                console.log(`⚠️ 넓은 범위 셀렉터로 컨테이너 발견: ${selector}`);
                return element;
            }
        }

        console.log('❌ 영상 분석 버튼 컨테이너를 찾지 못함');
        return null;
    },

    // 스마트 셀렉터: 쇼츠 분석 버튼 컨테이너 찾기
    findShortsButtonContainer() {
        console.log('🔍 쇼츠 분석 버튼 컨테이너 검색 시작');

        // 1단계: 기본 쇼츠 셀렉터들
        const primarySelectors = [
            '#actions',                                 // 표준 액션 영역
            'ytd-reel-video-renderer #actions',         // 릴 비디오 렌더러의 액션
            '.ytd-reel-player-header-renderer #actions', // 릴 플레이어 헤더 액션
            '#shorts-container #actions'                // 쇼츠 컨테이너 액션
        ];

        for (const selector of primarySelectors) {
            const element = document.querySelector(selector);
            if (element && this.isValidButtonContainer(element)) {
                console.log(`✅ 기본 쇼츠 셀렉터로 컨테이너 발견: ${selector}`);
                return element;
            }
        }

        // 2단계: 대체 쇼츠 셀렉터들
        const fallbackSelectors = [
            'ytd-reel-video-renderer .ytd-menu-renderer',  // 릴 비디오의 메뉴 렌더러
            '.reel-video-in-sequence #actions',           // 시퀀스 내 릴 비디오 액션
            '.ytd-shorts #actions',                       // 쇼츠 영역 액션
            '#shorts-player #actions',                    // 쇼츠 플레이어 액션
            '[role="toolbar"]'                            // 툴바 역할 요소 (쇼츠에서)
        ];

        for (const selector of fallbackSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isValidButtonContainer(element)) {
                console.log(`✅ 대체 쇼츠 셀렉터로 컨테이너 발견: ${selector}`);
                return element;
            }
        }

        // 3단계: 넓은 범위 검색
        const wideSelectors = [
            'ytd-reel-video-renderer',                  // 릴 비디오 렌더러 전체
            '#shorts-container',                        // 쇼츠 컨테이너 전체
            '.ytd-reel-player-header-renderer'          // 릴 플레이어 헤더 전체
        ];

        for (const selector of wideSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isValidButtonContainer(element)) {
                console.log(`⚠️ 넓은 범위 쇼츠 셀렉터로 컨테이너 발견: ${selector}`);
                return element;
            }
        }

        console.log('❌ 쇼츠 분석 버튼 컨테이너를 찾지 못함');
        return null;
    },

    // 버튼 컨테이너 유효성 검증
    isValidButtonContainer(element) {
        if (!element) return false;

        // 기본 조건: 요소가 존재하고 보임
        if (!element.offsetParent) {
            console.log('❌ 컨테이너가 보이지 않음');
            return false;
        }

        // 크기 조건: 너무 작지 않은지 확인
        const rect = element.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
            console.log('❌ 컨테이너가 너무 작음:', rect);
            return false;
        }

        // 위치 조건: 화면 내에 있는지 확인
        if (rect.top < 0 || rect.left < 0 || rect.top > window.innerHeight) {
            console.log('❌ 컨테이너가 화면 밖에 있음:', rect);
            return false;
        }

        console.log('✅ 유효한 컨테이너 확인됨:', rect);
        return true;
    },

    addYouTubeVideoAnalysisButton() {
        if (document.querySelector('.youtube-analysis-button')) return;

        const actionButtons = this.findVideoButtonContainer();

        if (actionButtons) {
            const button = document.createElement('button');
            button.textContent = '🎬 영상 분석';
            button.className = 'youtube-analysis-button';
            button.style.cssText = `
                background: #ff0000 !important;
                color: white !important;
                border: none !important;
                border-radius: 18px !important;
                padding: 10px 16px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                margin-left: 8px !important;
                height: 36px !important;
            `;

            button.addEventListener('click', () => {
                this.analyzeYouTubeVideo();
            });

            actionButtons.appendChild(button);
            Utils.log('success', '✅ YouTube 영상 분석 버튼 추가됨');
        }
    },

    addYouTubeShortsAnalysisButton() {
        if (document.querySelector('.youtube-shorts-analysis-button')) return;

        const actionsArea = this.findShortsButtonContainer();
        if (actionsArea) {
            const button = document.createElement('button');
            button.textContent = '📱';
            button.title = 'Shorts 분석';
            button.className = 'youtube-shorts-analysis-button';
            button.style.cssText = `
                background: rgba(0, 0, 0, 0.8) !important;
                color: white !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                border-radius: 24px !important;
                width: 48px !important;
                height: 48px !important;
                font-size: 16px !important;
                cursor: pointer !important;
                margin: 8px 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;

            button.addEventListener('click', () => {
                this.analyzeYouTubeVideo(true);
            });

            actionsArea.appendChild(button);
            Utils.log('success', '✅ YouTube Shorts 분석 버튼 추가됨');
        }
    },

    async analyzeYouTubeVideo(isShorts = false) {
        Utils.log('info', `🎯 YouTube ${isShorts ? 'Shorts' : '영상'} 분석 시작`);

        try {
            const videoData = this.extractVideoData();

            const response = await fetch(`${environment.SERVER_URL}/api/process-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform: 'YOUTUBE',
                    type: isShorts ? 'shorts' : 'video',
                    data: videoData,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                Utils.log('success', '✅ YouTube 영상 분석 완료', result);
            } else {
                Utils.log('error', '❌ 서버 응답 오류', response.status);
            }

        } catch (error) {
            Utils.log('error', '❌ YouTube 영상 분석 실패', error.message);
        }
    },

    extractVideoData() {
        const videoId = this.extractYouTubeId(window.location.href);
        const title = document.querySelector('h1.ytd-video-primary-info-renderer, #title h1')?.textContent?.trim();
        const channelName = document.querySelector('#channel-name a, .ytd-channel-name a')?.textContent?.trim();

        return {
            videoId,
            title,
            channelName,
            url: window.location.href
        };
    },

    extractYouTubeId(url) {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
        return match ? match[1] : null;
    }
};

// Main Content Script
class ContentScript {
    constructor() {
        this.platform = Utils.detectPlatform();
        this.init();
    }

    init() {
        Utils.log('info', '🚀 InsightReel Complete Content Script 시작', {
            platform: this.platform,
            url: window.location.href,
            environment: environment.NODE_ENV,
        });

        if (!this.platform) {
            Utils.log('warn', '지원되지 않는 플랫폼', window.location.hostname);
            return;
        }

        // Chrome Extension 메시지 리스너
        this.setupMessageListeners();

        // 플랫폼별 기능 초기화
        this.initializePlatformFeatures();

        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        Utils.log('success', `✅ ${this.platform} 플랫폼 기능 초기화 완료`);
    }

    initializePlatformFeatures() {
        switch (this.platform) {
            case PLATFORMS.INSTAGRAM:
                // Instagram Media Tracker 초기화
                window.INSTAGRAM_MEDIA_TRACKER = InstagramMediaTracker;
                InstagramMediaTracker.init();

                // Instagram UI System 초기화
                window.INSTAGRAM_UI_SYSTEM = InstagramUISystem;
                setTimeout(() => InstagramUISystem.init(), 1000);
                break;

            case PLATFORMS.YOUTUBE:
                // YouTube Channel Analyzer 초기화
                window.youtubeChannelAnalyzer = new YouTubeChannelAnalyzer();

                // YouTube Video Handler 초기화
                YouTubeVideoHandler.init();
                break;

            case PLATFORMS.TIKTOK:
                // TikTok 기본 기능
                this.initializeTikTok();
                break;
        }
    }

    initializeTikTok() {
        setInterval(() => {
            this.addTikTokAnalysisButtons();
        }, 2000);
    }

    addTikTokAnalysisButtons() {
        const videos = document.querySelectorAll('div[data-e2e="recommend-list-item"]');

        videos.forEach(video => {
            if (video.querySelector('.tiktok-analysis-button')) return;

            const button = document.createElement('button');
            button.textContent = '🎵 분석';
            button.className = 'tiktok-analysis-button';
            button.style.cssText = `
                background: #fe2c55 !important;
                color: white !important;
                border: none !important;
                border-radius: 16px !important;
                padding: 8px 12px !important;
                font-size: 12px !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 10px !important;
                right: 10px !important;
                z-index: 9999 !important;
            `;

            button.addEventListener('click', () => {
                this.analyzeTikTokVideo();
            });

            video.style.position = 'relative';
            video.appendChild(button);
        });
    }

    async analyzeTikTokVideo() {
        Utils.log('info', '🎯 TikTok 영상 분석 시작');

        try {
            const response = await fetch(`${environment.SERVER_URL}/api/process-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform: 'TIKTOK',
                    type: 'video',
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                Utils.log('success', '✅ TikTok 영상 분석 완료', result);
            } else {
                Utils.log('error', '❌ 서버 응답 오류', response.status);
            }

        } catch (error) {
            Utils.log('error', '❌ TikTok 영상 분석 실패', error.message);
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'ping':
                    sendResponse({
                        success: true,
                        message: 'Complete Content Script 응답',
                    });
                    break;

                case 'getStatus':
                    sendResponse({
                        success: true,
                        data: {
                            platform: this.platform,
                            serverUrl: environment.SERVER_URL,
                            environment: environment.NODE_ENV,
                            features: {
                                instagramMediaTracker: !!window.INSTAGRAM_MEDIA_TRACKER,
                                youtubeChannelAnalyzer: !!window.youtubeChannelAnalyzer,
                                instagramUISystem: !!window.INSTAGRAM_UI_SYSTEM
                            },
                            version: 'complete-restored'
                        },
                    });
                    break;

                default:
                    sendResponse({ error: '알 수 없는 액션입니다.' });
            }
        } catch (error) {
            Utils.log('error', '메시지 처리 실패', error.message);
            sendResponse({ error: error.message });
        }
    }

    cleanup() {
        if (window.INSTAGRAM_UI_SYSTEM) {
            InstagramUISystem.cleanup();
        }

        Utils.log('info', 'Complete Content Script 정리 완료');
    }
}

// Content Script 실행
try {
    Utils.log('info', '🚀 InsightReel Complete Content Script 초기화 시작');

    const contentScript = new ContentScript();

    // 글로벌 접근을 위한 window 객체 등록
    window.INSIGHTREEL = {
        contentScript,
        utils: Utils,
        platforms: PLATFORMS,
        environment,
        version: 'complete-restored'
    };

    // 디버깅용 추가 접근 (개발 모드에서만)
    if (environment.isDevelopment) {
        window.ContentScript = contentScript;
        window.Utils = Utils;
        window.PLATFORMS = PLATFORMS;
        window.environment = environment;
        Utils.log('info', '🛠️ 개발 모드: 디버깅 객체들이 window에 등록됨');
    }

    Utils.log('success', '✅ InsightReel Complete Content Script 초기화 완료');

} catch (error) {
    console.error('❌ InsightReel Complete Content Script 실행 오류:', error);
    console.error('오류 위치:', error.stack);

    window.INSIGHTREEL_ERROR = {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        version: 'complete-restored'
    };
}