// YouTube 채널 수집 - 단순 버전 (쇼츠 분석 버튼과 동일한 구조)
class SimpleYouTubeChannelAnalyzer {
    constructor() {
        this.init();
    }

    init() {
        console.log('🚀 단순 YouTube 채널 수집기 시작');
        this.createChannelButton();
    }

    // 플로팅 채널 수집 버튼 생성
    createChannelButton() {
        // 기존 버튼이 있으면 제거
        const existing = document.querySelector('#simple-channel-collect-btn');
        if (existing) {
            existing.remove();
        }

        const button = document.createElement('div');
        button.id = 'simple-channel-collect-btn';
        button.innerHTML = '<span>📊 채널 수집</span>';
        button.title = '현재 영상의 채널을 수집합니다';

        // 스타일 (기존과 동일)
        button.style.cssText = `
            position: fixed !important;
            bottom: 80px !important;
            right: 80px !important;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 28px !important;
            padding: 14px 20px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            z-index: 10000 !important;
            box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4) !important;
        `;

        // 클릭 이벤트 - 쇼츠 분석 버튼과 동일한 간단한 구조
        button.onclick = () => this.collectChannel();

        document.body.appendChild(button);
        console.log('✅ 단순 채널 수집 버튼 생성 완료');
    }

    // 채널 수집 실행 - 쇼츠 분석 버튼과 동일한 패턴
    async collectChannel() {
        console.log('📊 채널 수집 시작 - 단순 버전');

        const button = document.querySelector('#simple-channel-collect-btn span');
        const originalText = button.textContent;
        button.textContent = '수집 중...';

        try {
            // 쇼츠 분석 버튼과 완전히 동일한 메타데이터 추출
            const metadata = this.extractYouTubeMetadata();
            console.log('📋 추출된 메타데이터:', metadata);

            // 페이지 타입 감지 (검증용)
            const currentUrl = window.location.href;
            let pageType = 'unknown';
            if (currentUrl.includes('/channel/') || currentUrl.includes('/@')) {
                pageType = 'channel';
            } else if (currentUrl.includes('/watch') || currentUrl.includes('/shorts/')) {
                pageType = 'video';
            }

            // 검증 로직 개선
            if (!metadata.author && !metadata.channelName) {
                if (pageType === 'channel') {
                    throw new Error('채널 페이지이지만 채널 정보를 찾을 수 없습니다. 페이지가 완전히 로드되었는지 확인해주세요.');
                } else if (pageType === 'video') {
                    throw new Error('영상 페이지에서 채널 정보를 찾을 수 없습니다. 영상이 완전히 로드되었는지 확인해주세요.');
                } else {
                    throw new Error('지원되지 않는 YouTube 페이지입니다. 채널, 영상, 또는 쇼츠 페이지에서 시도해주세요.');
                }
            }

            // 경고: 구독자 정보가 없는 경우 (채널 페이지가 아닐 때)
            if (pageType !== 'channel' && !metadata.subscribers) {
                console.log('⚠️ 구독자 정보 없음 - 영상 페이지에서는 구독자 정보를 가져올 수 없습니다');
                metadata.subscribers = '정보 없음';
            }

            // 기존 모달 시스템 사용 (youtube-channel-analyzer.js와 동일한 방식)
            await this.showChannelCollectionModal(metadata);

        } catch (error) {
            console.error('❌ 채널 수집 실패:', error);
            alert('채널 수집 실패: ' + error.message);
        } finally {
            button.textContent = originalText;
        }
    }

    // 다중 페이지 지원 메타데이터 추출 함수 (채널/영상/쇼츠 페이지 모두 지원)
    extractYouTubeMetadata() {
        console.log('🎯 YouTube 메타데이터 추출 시작 (다중 페이지 지원)');

        const metadata = { platform: 'YOUTUBE' };
        const currentUrl = window.location.href;
        let pageType = 'unknown';

        // 페이지 타입 감지
        if (currentUrl.includes('/channel/') || currentUrl.includes('/@')) {
            pageType = 'channel';
        } else if (currentUrl.includes('/watch') || currentUrl.includes('/shorts/')) {
            pageType = 'video';
        }

        console.log(`📍 감지된 페이지 타입: ${pageType}`);

        try {
            let channelFound = false;

            // 1단계: 채널 페이지에서 채널 정보 추출
            if (pageType === 'channel') {
                console.log('🏢 채널 페이지에서 정보 추출 중...');
                const channelSelectors = [
                    '#channel-name .ytd-channel-name',  // 새 디자인
                    '#text-container h1',               // 구 디자인
                    '.ytd-channel-name #text',          // 대안 1
                    'yt-formatted-string[role="text"]', // 대안 2
                    '#channel-header-container h1',     // 대안 3
                    'c3-tab-header h1'                  // 대안 4
                ];

                for (const selector of channelSelectors) {
                    const channelEl = document.querySelector(selector);
                    if (channelEl && channelEl.textContent?.trim()) {
                        metadata.channelName = channelEl.textContent.trim();
                        metadata.author = metadata.channelName;
                        console.log(`✅ 채널 페이지에서 채널명 발견 (${selector}):`, metadata.channelName);
                        channelFound = true;
                        break;
                    }
                }
            }

            // 2단계: 영상/쇼츠 페이지에서 채널 정보 추출
            if (!channelFound && pageType === 'video') {
                console.log('🎬 영상/쇼츠 페이지에서 채널 정보 추출 중...');

                // 디버깅: 현재 페이지의 모든 채널 관련 요소 찾기
                console.log('🔍 디버깅: 현재 페이지의 모든 채널 관련 요소들');
                const allChannelElements = document.querySelectorAll('*[id*="channel"], *[class*="channel"], *[href*="@"], *[href*="/channel/"]');
                console.log('발견된 채널 관련 요소 수:', allChannelElements.length);
                allChannelElements.forEach((el, i) => {
                    if (i < 10) { // 처음 10개만 로깅
                        console.log(`요소 ${i}:`, el.tagName, el.id, el.className, el.textContent?.trim().slice(0, 50));
                    }
                });

                const videoChannelSelectors = [
                    // 최신 YouTube UI 셀렉터들
                    'ytd-channel-name#channel-name a',           // 최신 채널명 링크
                    '#above-the-fold #channel-name a',          // 영상 상단 채널명
                    '#owner #channel-name a',                   // 소유자 정보의 채널명
                    'ytd-video-owner-renderer #channel-name a', // 비디오 소유자 렌더러

                    // 기존 셀렉터들
                    '#channel-name a',                          // 기본 채널 링크
                    '#owner-name a',                            // 구 UI 채널 링크
                    '.ytd-video-owner-renderer a',             // 대안 1
                    '.ytd-channel-name a',                     // 대안 2
                    '#upload-info #channel-name a',            // 대안 3
                    'ytd-channel-name a',                      // 대안 4

                    // 더 광범위한 링크 찾기
                    'a[href*="@"]',                            // @채널명 링크
                    'a[href*="/channel/"]',                    // /channel/ 링크
                    'a[href*="/user/"]',                       // /user/ 링크
                    '.yt-simple-endpoint[href*="@"]',          // 심플 엔드포인트 @
                    '.yt-simple-endpoint[href*="/channel/"]',   // 심플 엔드포인트 채널

                    // 텍스트만 있는 요소들
                    'ytd-channel-name#channel-name',           // 채널명만 (링크 없이)
                    '#channel-name',                           // 채널명 ID
                    '.ytd-channel-name',                       // 채널명 클래스
                ];

                for (let i = 0; i < videoChannelSelectors.length; i++) {
                    const selector = videoChannelSelectors[i];
                    console.log(`🔍 시도 중 (${i + 1}/${videoChannelSelectors.length}): ${selector}`);

                    const channelEl = document.querySelector(selector);
                    console.log(`   결과:`, channelEl ? `발견됨 (${channelEl.tagName})` : '없음');

                    if (channelEl) {
                        // 채널명 텍스트 추출
                        const channelName = channelEl.textContent?.trim();
                        console.log(`   텍스트: "${channelName}"`);

                        if (channelName && channelName.length > 0 && channelName !== 'undefined') {
                            metadata.channelName = channelName;
                            metadata.author = channelName;
                            console.log(`✅ 영상 페이지에서 채널명 발견 (${selector}):`, channelName);

                            // 채널 URL도 추출
                            if (channelEl.href) {
                                metadata.channelUrl = channelEl.href;
                                console.log(`✅ 채널 URL 발견:`, channelEl.href);
                            }

                            channelFound = true;
                            break;
                        }
                    }
                }

                // 추가 시도: 쇼츠 전용 셀렉터
                if (!channelFound) {
                    console.log('🎵 쇼츠 전용 셀렉터로 시도 중...');
                    const shortsChannelSelectors = [
                        'ytd-reel-video-renderer #channel-name',
                        '.ytd-reel-player-header-renderer #channel-name',
                        '#shorts-container #channel-name',
                        '.reel-video-in-sequence #channel-name'
                    ];

                    for (const selector of shortsChannelSelectors) {
                        const channelEl = document.querySelector(selector);
                        if (channelEl && channelEl.textContent?.trim()) {
                            metadata.channelName = channelEl.textContent.trim();
                            metadata.author = metadata.channelName;
                            console.log(`✅ 쇼츠 페이지에서 채널명 발견 (${selector}):`, metadata.channelName);
                            channelFound = true;
                            break;
                        }
                    }
                }
            }

            // 3단계: URL에서 채널 정보 추출 (fallback)
            if (!channelFound) {
                console.log('🔗 URL에서 채널 정보 추출 중...');

                // 현재 URL에서 추출 시도
                const urlMatch = currentUrl.match(/\/@([^\/\?]+)|\/channel\/([^\/\?]+)|\/user\/([^\/\?]+)/);
                if (urlMatch) {
                    const rawChannelName = urlMatch[1] || urlMatch[2] || urlMatch[3];
                    try {
                        metadata.channelName = decodeURIComponent(rawChannelName);
                    } catch (e) {
                        metadata.channelName = rawChannelName;
                    }
                    metadata.author = metadata.channelName;
                    console.log('✅ 현재 URL에서 채널명 추출:', metadata.channelName);
                    channelFound = true;
                }

                // 영상 페이지에서 채널 링크의 URL 추출
                if (!channelFound && pageType === 'video') {
                    const channelLinkSelectors = [
                        '#channel-name a[href*="@"]',
                        '#channel-name a[href*="/channel/"]',
                        '#owner-name a[href*="@"]',
                        '#owner-name a[href*="/channel/"]'
                    ];

                    for (const selector of channelLinkSelectors) {
                        const linkEl = document.querySelector(selector);
                        if (linkEl && linkEl.href) {
                            const linkMatch = linkEl.href.match(/\/@([^\/\?]+)|\/channel\/([^\/\?]+)|\/user\/([^\/\?]+)/);
                            if (linkMatch) {
                                const rawChannelName = linkMatch[1] || linkMatch[2] || linkMatch[3];
                                try {
                                    metadata.channelName = decodeURIComponent(rawChannelName);
                                } catch (e) {
                                    metadata.channelName = rawChannelName;
                                }
                                metadata.author = metadata.channelName;
                                metadata.channelUrl = linkEl.href;
                                console.log('✅ 영상 페이지 채널 링크에서 채널명 추출:', metadata.channelName);
                                channelFound = true;
                                break;
                            }
                        }
                    }
                }
            }

            // 구독자 수 추출
            const subscriberSelectors = [
                '#subscriber-count',
                '.ytd-c4-tabbed-header-renderer #subscriber-count',
                'yt-formatted-string#subscriber-count'
            ];

            for (const selector of subscriberSelectors) {
                const subEl = document.querySelector(selector);
                if (subEl && subEl.textContent?.trim()) {
                    metadata.subscribers = subEl.textContent.trim();
                    console.log(`✅ 구독자 수 발견:`, metadata.subscribers);
                    break;
                }
            }

            // URL 설정: 채널 페이지면 현재 URL, 아니면 추출된 채널 URL 사용
            if (pageType === 'channel') {
                metadata.url = currentUrl;
                metadata.channelId = this.extractChannelIdFromUrl(currentUrl);
            } else if (metadata.channelUrl) {
                metadata.url = metadata.channelUrl;
                metadata.channelId = this.extractChannelIdFromUrl(metadata.channelUrl);
            } else {
                // 채널 URL을 구성할 수 있으면 구성
                if (metadata.channelName && metadata.channelName.startsWith('UC')) {
                    metadata.url = `https://www.youtube.com/channel/${metadata.channelName}`;
                } else if (metadata.channelName) {
                    metadata.url = `https://www.youtube.com/@${metadata.channelName}`;
                }
                metadata.channelId = this.extractChannelIdFromUrl(metadata.url || currentUrl);
            }

            console.log(`📍 최종 채널 URL: ${metadata.url}`);
            console.log(`🆔 추출된 채널 ID: ${metadata.channelId}`);

        } catch (error) {
            console.log('❌ 메타데이터 추출 오류:', error);
        }

        console.log('📋 채널 메타데이터 추출 완료:', metadata);
        return metadata;
    }

    // URL에서 채널 ID 추출 (개선된 버전)
    extractChannelIdFromUrl(url = null) {
        const targetUrl = url || window.location.href;
        console.log(`🔍 채널 ID 추출 시도: ${targetUrl}`);

        const match = targetUrl.match(/\/channel\/([^\/\?]+)|\/user\/([^\/\?]+)|\/@([^\/\?&]+)/);
        if (match) {
            const rawChannelId = match[1] || match[2] || match[3];
            // URL 디코딩으로 한글 채널 ID 처리
            try {
                return decodeURIComponent(rawChannelId);
            } catch (e) {
                return rawChannelId; // 디코딩 실패시 원본 사용
            }
        }
        return null;
    }

    // 채널 정보 모달 표시
    showChannelModal(metadata) {
        console.log('🖼️ 채널 정보 모달 생성 중...');

        // 기존 모달이 있으면 제거
        const existingModal = document.querySelector('#channel-info-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 배경
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'channel-info-modal';
        modalOverlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.7) !important;
            z-index: 20000 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
        `;

        // 모달 컨텐츠
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white !important;
            border-radius: 12px !important;
            padding: 24px !important;
            max-width: 500px !important;
            width: 90% !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
            color: #333 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        `;

        modalContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #1976d2; margin: 0; font-size: 24px; font-weight: 600;">📊 채널 수집 완료</h2>
            </div>

            <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">채널명</strong>
                    <div style="font-size: 18px; font-weight: 500; margin-top: 4px;">${metadata.channelName || metadata.author || '알 수 없음'}</div>
                </div>

                ${metadata.subscribers ? `
                <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">구독자 수</strong>
                    <div style="font-size: 16px; margin-top: 4px;">${metadata.subscribers}</div>
                </div>
                ` : ''}

                <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">채널 URL</strong>
                    <div style="font-size: 14px; margin-top: 4px; word-break: break-all; color: #1976d2;">
                        <a href="${metadata.url}" target="_blank" style="color: #1976d2; text-decoration: none;">
                            ${metadata.url}
                        </a>
                    </div>
                </div>

                ${metadata.channelId ? `
                <div>
                    <strong style="color: #666; font-size: 14px;">채널 ID</strong>
                    <div style="font-size: 14px; margin-top: 4px; font-family: monospace; background: #e8e8e8; padding: 4px 8px; border-radius: 4px;">
                        ${metadata.channelId}
                    </div>
                </div>
                ` : ''}
            </div>

            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="save-channel-btn" style="
                    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 6px !important;
                    padding: 12px 24px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: transform 0.2s ease !important;
                ">
                    💾 채널 저장
                </button>

                <button id="close-modal-btn" style="
                    background: #6c757d !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 6px !important;
                    padding: 12px 24px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: transform 0.2s ease !important;
                ">
                    ✕ 닫기
                </button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // 이벤트 리스너 추가
        document.getElementById('close-modal-btn').onclick = () => {
            modalOverlay.remove();
        };

        document.getElementById('save-channel-btn').onclick = () => {
            this.saveChannelToServer(metadata);
        };

        // 배경 클릭으로 모달 닫기
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        };

        // 호버 효과
        const buttons = modalContent.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
            });
        });

        console.log('✅ 채널 정보 모달 표시 완료');
    }

    // 채널 수집 모달 표시 (기존 youtube-channel-analyzer.js 방식)
    async showChannelCollectionModal(metadata) {
        try {
            console.log('📊 채널 수집 모달 표시 중...');

            // 채널 정보를 기존 포맷으로 변환
            const channelInfo = {
                channelName: metadata.author || metadata.channelName,
                subscribers: metadata.subscribers,
                channelId: metadata.channelId,
                url: metadata.url
            };

            // 최근 키워드 가져오기
            const recentKeywords = await this.getRecentKeywords();

            // 모든 키워드 가져오기
            const allKeywords = await this.getAllKeywords();

            // 기존 키워드 모달 표시
            this.showKeywordModal(channelInfo, recentKeywords, allKeywords);

        } catch (error) {
            console.error('❌ 채널 수집 모달 표시 실패:', error);
            // 실패 시 간단한 모달로 fallback
            this.showChannelModal(metadata);
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

    // 모든 키워드 가져오기
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
            return [
                // ㄱ 시작
                { keyword: '게임', count: 25 },
                { keyword: '게임리뷰', count: 12 },
                { keyword: '게임실황', count: 18 },
                { keyword: '교육', count: 15 },
                { keyword: '기술', count: 20 },
                { keyword: '건강', count: 14 },
                { keyword: '골프', count: 9 },

                // ㄴ 시작
                { keyword: '뉴스', count: 22 },
                { keyword: '노래', count: 16 },
                { keyword: '낚시', count: 8 },

                // ㄷ 시작
                { keyword: '댄스', count: 13 },
                { keyword: '드라마', count: 19 },
                { keyword: '동물', count: 11 },

                // ㄹ 시작
                { keyword: '리뷰', count: 28 },
                { keyword: '라이브', count: 15 },

                // ㅁ 시작
                { keyword: '음악', count: 30 },
                { keyword: '먹방', count: 17 },
                { keyword: '메이크업', count: 9 },
                { keyword: '모바일', count: 12 },

                // ㅂ 시작
                { keyword: '뷰티', count: 21 },
                { keyword: '방송', count: 14 },
                { keyword: '부동산', count: 8 },

                // ㅅ 시작
                { keyword: '스포츠', count: 24 },
                { keyword: '쇼핑', count: 13 },
                { keyword: '수학', count: 10 },

                // ㅇ 시작
                { keyword: '엔터테인먼트', count: 26 },
                { keyword: '영화', count: 23 },
                { keyword: '운동', count: 18 },
                { keyword: '요리', count: 20 },
                { keyword: '여행', count: 19 },

                // ㅈ 시작
                { keyword: '자동차', count: 16 },
                { keyword: '주식', count: 15 },

                // ㅊ 시작
                { keyword: '축구', count: 14 },

                // ㅋ 시작
                { keyword: '코딩', count: 17 },
                { keyword: '코메디', count: 12 },

                // ㅌ 시작
                { keyword: '테크', count: 13 },

                // ㅍ 시작
                { keyword: '패션', count: 15 },

                // ㅎ 시작
                { keyword: '헬스', count: 11 },
                { keyword: '힙합', count: 8 }
            ];
        }
    }

    // 키워드 입력 모달 표시 (기존 youtube-channel-analyzer.js와 동일)
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
                            '<div class="channel-subs" style="color: #888; font-style: italic;">채널 페이지에서 수집됨</div>'
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
                                    <input type="radio" name="contentType" value="longform" checked>
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
                                    <input type="radio" name="aiAnalysis" value="full" checked>
                                    <span>🧠 완전 분석</span>
                                    <small>(AI 태그 + 카테고리 분석, 약 30초)</small>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="aiAnalysis" value="skip">
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

        // 스타일 추가 (간소화된 버전)
        modal.innerHTML += `
            <style>
                .modal-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: rgba(0, 0, 0, 0.8) !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    z-index: 20000 !important;
                }
                .modal-content {
                    background: white !important;
                    border-radius: 12px !important;
                    width: 500px !important;
                    max-width: 90vw !important;
                    max-height: 80vh !important;
                    overflow-y: auto !important;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }
                .modal-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 20px !important;
                    border-bottom: 1px solid #eee !important;
                }
                .modal-header h3 {
                    margin: 0 !important;
                    color: #333 !important;
                    font-size: 20px !important;
                    font-weight: 600 !important;
                }
                .modal-close {
                    background: none !important;
                    border: none !important;
                    font-size: 24px !important;
                    cursor: pointer !important;
                    color: #999 !important;
                    width: 30px !important;
                    height: 30px !important;
                    border-radius: 15px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .modal-close:hover {
                    background: #f5f5f5 !important;
                    color: #333 !important;
                }
                .channel-info {
                    padding: 15px 20px !important;
                    background: #f8f9fa !important;
                    border-bottom: 1px solid #eee !important;
                }
                .channel-name {
                    font-weight: bold !important;
                    font-size: 16px !important;
                    color: #333 !important;
                    margin-bottom: 4px !important;
                }
                .channel-subs {
                    font-size: 14px !important;
                    color: #666 !important;
                }
                .modal-body {
                    padding: 20px !important;
                }
                .section {
                    margin-bottom: 20px !important;
                }
                .section label {
                    display: block !important;
                    margin-bottom: 8px !important;
                    font-weight: 500 !important;
                    color: #333 !important;
                    font-size: 14px !important;
                }
                .keyword-buttons {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                }
                .keyword-btn {
                    background: #e9ecef !important;
                    border: 1px solid #dee2e6 !important;
                    border-radius: 20px !important;
                    padding: 6px 12px !important;
                    font-size: 14px !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    color: #333 !important;
                }
                .keyword-btn:hover {
                    background: #007bff !important;
                    color: white !important;
                }
                .keyword-btn.selected {
                    background: #007bff !important;
                    color: white !important;
                }
                .count {
                    font-size: 12px !important;
                    opacity: 0.7 !important;
                }
                .input-container {
                    position: relative !important;
                    width: 100% !important;
                }
                #custom-keywords {
                    width: 100% !important;
                    padding: 10px !important;
                    border: 1px solid #ddd !important;
                    border-radius: 6px !important;
                    font-size: 14px !important;
                    box-sizing: border-box !important;
                }
                .autocomplete-suggestions {
                    position: absolute !important;
                    top: 100% !important;
                    left: 0 !important;
                    right: 0 !important;
                    background: white !important;
                    border: 1px solid #ddd !important;
                    border-top: none !important;
                    border-radius: 0 0 6px 6px !important;
                    max-height: 200px !important;
                    overflow-y: auto !important;
                    z-index: 1000 !important;
                    display: none !important;
                }
                .autocomplete-item {
                    padding: 10px !important;
                    cursor: pointer !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                }
                .autocomplete-item:hover,
                .autocomplete-item.highlighted {
                    background: #f8f9fa !important;
                }
                .autocomplete-keyword {
                    font-weight: 500 !important;
                }
                .autocomplete-count {
                    font-size: 12px !important;
                    color: #666 !important;
                    background: #e9ecef !important;
                    padding: 2px 6px !important;
                    border-radius: 10px !important;
                }
                .content-type-selector,
                .ai-analysis-selector {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 8px !important;
                    margin-top: 8px !important;
                }
                .radio-option {
                    display: flex !important;
                    align-items: flex-start !important;
                    gap: 8px !important;
                    padding: 8px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    transition: background-color 0.2s !important;
                }
                .radio-option:hover {
                    background: #f8f9fa !important;
                }
                .radio-option input[type="radio"] {
                    margin: 0 !important;
                    margin-top: 2px !important;
                }
                .radio-option > span {
                    font-weight: 500 !important;
                    color: #333 !important;
                }
                .radio-option small {
                    display: block !important;
                    color: #666 !important;
                    font-size: 12px !important;
                    margin-top: 2px !important;
                }
                .selected-keywords {
                    min-height: 40px !important;
                    border: 1px solid #ddd !important;
                    border-radius: 6px !important;
                    padding: 10px !important;
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                    background: #f8f9fa !important;
                }
                .selected-keyword {
                    background: #007bff !important;
                    color: white !important;
                    padding: 4px 8px !important;
                    border-radius: 12px !important;
                    font-size: 12px !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                }
                .remove-keyword {
                    cursor: pointer !important;
                    font-weight: bold !important;
                    margin-left: 4px !important;
                }
                .modal-footer {
                    padding: 20px !important;
                    border-top: 1px solid #eee !important;
                    display: flex !important;
                    justify-content: flex-end !important;
                    gap: 10px !important;
                }
                .btn-cancel, .btn-submit {
                    padding: 10px 20px !important;
                    border: none !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    transition: all 0.2s !important;
                }
                .btn-cancel {
                    background: #6c757d !important;
                    color: white !important;
                }
                .btn-cancel:hover {
                    background: #5a6268 !important;
                }
                .btn-submit {
                    background: #007bff !important;
                    color: white !important;
                }
                .btn-submit:hover:not(:disabled) {
                    background: #0056b3 !important;
                }
                .btn-submit:disabled {
                    background: #ccc !important;
                    cursor: not-allowed !important;
                }
            </style>
        `;

        document.body.appendChild(modal);

        // 이벤트 리스너 설정
        this.setupKeywordModalEvents(channelInfo, allKeywords);
    }

    // 키워드 모달 이벤트 설정
    setupKeywordModalEvents(channelInfo, allKeywords) {
        const selectedKeywords = new Set();
        console.log('🔧 키워드 모달 이벤트 설정 중...', { allKeywords: allKeywords.length });

        // 닫기 버튼
        document.querySelector('.modal-close').onclick = () => {
            document.getElementById('channel-collect-modal').remove();
        };

        // 취소 버튼
        document.getElementById('collect-cancel').onclick = () => {
            document.getElementById('channel-collect-modal').remove();
        };

        // 키워드 버튼들
        document.querySelectorAll('.keyword-btn').forEach(btn => {
            btn.onclick = () => {
                const keyword = btn.dataset.keyword;
                if (selectedKeywords.has(keyword)) {
                    selectedKeywords.delete(keyword);
                    btn.classList.remove('selected');
                } else {
                    selectedKeywords.add(keyword);
                    btn.classList.add('selected');
                }
                this.updateSelectedKeywords(selectedKeywords, this);
            };
        });

        // 직접 입력 및 자동완성
        const customInput = document.getElementById('custom-keywords');
        const suggestionsContainer = document.getElementById('autocomplete-suggestions');
        let currentHighlight = -1;
        let currentSuggestions = [];

        console.log('🔍 자동완성 설정 중...', {
            inputFound: !!customInput,
            suggestionsFound: !!suggestionsContainer,
            keywordsCount: allKeywords.length
        });

        if (!customInput || !suggestionsContainer) {
            console.error('❌ 자동완성 요소를 찾을 수 없습니다');
            return;
        }

        // 자동완성 업데이트 함수 (스코프 내에서 정의)
        const updateAutocompleteHighlight = (highlightIndex) => {
            const items = suggestionsContainer.querySelectorAll('.autocomplete-item');
            items.forEach((item, index) => {
                if (index === highlightIndex) {
                    item.classList.add('highlighted');
                } else {
                    item.classList.remove('highlighted');
                }
            });
        };


        // 입력 이벤트 - 자동완성 표시
        customInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            console.log('🔍 입력됨:', query);

            if (query.length < 1) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            // 매칭되는 키워드 찾기
            currentSuggestions = allKeywords
                .filter(kw => kw.keyword && kw.keyword.toLowerCase().includes(query))
                .slice(0, 8); // 최대 8개

            console.log('📋 자동완성 결과:', currentSuggestions.length, '개');

            if (currentSuggestions.length === 0) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            // 자동완성 항목 생성
            suggestionsContainer.innerHTML = currentSuggestions.map((kw, index) =>
                `<div class="autocomplete-item ${index === currentHighlight ? 'highlighted' : ''}" data-keyword="${kw.keyword}">
                    <span class="autocomplete-keyword">${kw.keyword}</span>
                    <span class="autocomplete-count">${kw.count || 0}</span>
                </div>`
            ).join('');

            suggestionsContainer.style.display = 'block';
            currentHighlight = -1; // 리셋

            // 자동완성 항목 클릭 이벤트
            suggestionsContainer.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    const keyword = item.dataset.keyword;
                    addKeyword(keyword);
                });
            });
        });

        // 키보드 네비게이션
        customInput.addEventListener('keydown', (e) => {
            const isAutocompleteOpen = suggestionsContainer.style.display === 'block';

            if (isAutocompleteOpen && currentSuggestions.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentHighlight = Math.min(currentHighlight + 1, currentSuggestions.length - 1);
                    updateAutocompleteHighlight(currentHighlight);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentHighlight = Math.max(currentHighlight - 1, -1);
                    updateAutocompleteHighlight(currentHighlight);
                } else if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    if (currentHighlight >= 0 && currentSuggestions[currentHighlight]) {
                        const keyword = currentSuggestions[currentHighlight].keyword;
                        addKeyword(keyword);
                    } else if (e.key === 'Enter') {
                        // 자동완성 없이 엔터 - 직접 입력
                        const keyword = customInput.value.trim();
                        if (keyword) {
                            addKeyword(keyword);
                        }
                    }
                } else if (e.key === 'Escape') {
                    suggestionsContainer.style.display = 'none';
                    currentHighlight = -1;
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const keyword = customInput.value.trim();
                if (keyword) {
                    addKeyword(keyword);
                }
            }
        });

        // 입력창 포커스 아웃 시 자동완성 숨기기 (약간의 딜레이)
        customInput.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionsContainer.style.display = 'none';
                currentHighlight = -1;
            }, 200);
        });

        console.log('✅ 자동완성 설정 완료');

        // 수집하기 버튼
        document.getElementById('collect-submit').onclick = () => {
            this.startChannelCollection(channelInfo, Array.from(selectedKeywords));
        };

        // 선택된 키워드 표시 업데이트 함수 (스코프 내에서 정의)
        const updateSelectedKeywordsDisplay = () => {
            const container = document.getElementById('selected-keywords');
            if (selectedKeywords.size === 0) {
                container.innerHTML = '<span style="color: #999; font-style: italic;">선택된 키워드가 없습니다</span>';
            } else {
                container.innerHTML = Array.from(selectedKeywords).map(keyword =>
                    `<span class="selected-keyword" data-keyword="${keyword}">
                        ${keyword}
                        <span class="remove-keyword">&times;</span>
                    </span>`
                ).join('');

                // 키워드 제거 이벤트 추가
                container.querySelectorAll('.remove-keyword').forEach(removeBtn => {
                    removeBtn.addEventListener('click', (e) => {
                        const keywordEl = e.target.closest('.selected-keyword');
                        const keyword = keywordEl.dataset.keyword;
                        selectedKeywords.delete(keyword);

                        // 해당 버튼도 선택 해제
                        document.querySelectorAll('.keyword-btn').forEach(btn => {
                            if (btn.dataset.keyword === keyword) {
                                btn.classList.remove('selected');
                            }
                        });

                        updateSelectedKeywordsDisplay();
                    });
                });
            }
        };

        // 키워드 추가/제거 시 updateSelectedKeywordsDisplay 함수를 사용하도록 수정
        const addKeyword = (keyword) => {
            console.log('✅ 키워드 추가:', keyword);
            if (!selectedKeywords.has(keyword)) {
                selectedKeywords.add(keyword);
                updateSelectedKeywordsDisplay();
            }
            customInput.value = '';
            suggestionsContainer.style.display = 'none';
            currentHighlight = -1;
        };

        // 키워드 버튼들도 updateSelectedKeywordsDisplay 사용하도록 다시 설정
        document.querySelectorAll('.keyword-btn').forEach(btn => {
            btn.onclick = () => {
                const keyword = btn.dataset.keyword;
                if (selectedKeywords.has(keyword)) {
                    selectedKeywords.delete(keyword);
                    btn.classList.remove('selected');
                } else {
                    selectedKeywords.add(keyword);
                    btn.classList.add('selected');
                }
                updateSelectedKeywordsDisplay();
            };
        });

        // 초기 키워드 표시 업데이트
        updateSelectedKeywordsDisplay();
    }


    // 채널 수집 시작
    async startChannelCollection(channelInfo, keywords) {
        console.log('🚀 채널 수집 시작:', { channelInfo, keywords });

        // 라디오 버튼 값들 수집
        const contentType = document.querySelector('input[name="contentType"]:checked')?.value || 'longform';
        const aiAnalysis = document.querySelector('input[name="aiAnalysis"]:checked')?.value || 'full';

        console.log('📊 수집 옵션:', { contentType, aiAnalysis });

        const submitBtn = document.getElementById('collect-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '수집 중...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/channels/add-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: channelInfo.url,
                    platform: 'YOUTUBE',
                    channelData: {
                        channelId: channelInfo.channelId,
                        name: channelInfo.channelName,
                        subscribers: channelInfo.subscribers,
                        url: channelInfo.url,
                        keywords: keywords,
                        contentType: contentType,
                        aiAnalysis: aiAnalysis
                    },
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (!response.ok) {
                // 409 Conflict (중복 채널) 처리
                if (response.status === 409) {
                    console.log('ℹ️ 이미 등록된 채널:', result.message);
                    submitBtn.textContent = '⚠️ 이미 등록됨';
                    submitBtn.style.background = '#ffc107';

                    setTimeout(() => {
                        document.getElementById('channel-collect-modal').remove();
                    }, 2000);
                    return;
                }

                throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
            }

            console.log('✅ 채널 수집 완료:', result);

            // 성공 표시
            submitBtn.textContent = '✅ 수집 완료!';
            submitBtn.style.background = '#28a745';

            setTimeout(() => {
                document.getElementById('channel-collect-modal').remove();
            }, 1500);

        } catch (error) {
            console.error('❌ 채널 수집 실패:', error);
            submitBtn.textContent = '❌ 수집 실패';
            submitBtn.style.background = '#dc3545';

            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.background = '#007bff';
                submitBtn.disabled = false;
            }, 2000);
        }
    }

    // 서버에 채널 정보 저장 (Fallback용 간단한 모달)
    async saveChannelToServer(metadata) {
        console.log('💾 서버에 채널 저장 중...');

        const saveBtn = document.getElementById('save-channel-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '저장 중...';
        saveBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/channels/add-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: metadata.url,
                    platform: 'YOUTUBE',
                    channelData: {
                        channelId: metadata.channelId,
                        name: metadata.channelName || metadata.author,
                        subscribers: metadata.subscribers,
                        url: metadata.url
                    },
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ 채널 저장 완료:', result);

            // 성공 표시
            saveBtn.textContent = '✅ 저장됨!';
            saveBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

            setTimeout(() => {
                document.getElementById('channel-info-modal')?.remove();
            }, 1500);

        } catch (error) {
            console.error('❌ 채널 저장 실패:', error);
            saveBtn.textContent = '❌ 저장 실패';
            saveBtn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';

            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
                saveBtn.disabled = false;
            }, 2000);
        }
    }
}

// 즉시 실행
try {
    console.log('🚀 단순 YouTube 채널 분석기 초기화 시작');
    const analyzer = new SimpleYouTubeChannelAnalyzer();
    window.SIMPLE_CHANNEL_ANALYZER = analyzer; // 디버깅용
    console.log('✅ 단순 YouTube 채널 분석기 초기화 완료');
} catch (error) {
    console.error('❌ 단순 채널 분석기 실행 오류:', error);
}