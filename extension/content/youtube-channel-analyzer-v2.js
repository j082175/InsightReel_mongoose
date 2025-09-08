// YouTube 채널 분석기 v2 - 더 안정적인 버전
console.log('🎥 YouTube 채널 분석기 v2 시작');

class YouTubeChannelAnalyzerV2 {
    constructor() {
        this.channelButton = null;
        this.observer = null;
        this.init();
    }

    init() {
        console.log('🚀 초기화 시작');
        
        // 메인 감시자 시작
        this.startObserving();
        
        // YouTube 이벤트 리스너
        window.addEventListener('yt-navigate-finish', () => {
            console.log('📍 페이지 이동 감지');
            this.checkAndAddButton();
        });
        
        // 페이지 데이터 업데이트 감지
        window.addEventListener('yt-page-data-updated', () => {
            console.log('📄 페이지 데이터 업데이트');
            this.checkAndAddButton();
        });
        
        // 초기 실행 - 이미 채널 페이지인 경우
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.checkAndAddButton();
            });
        } else {
            // DOM이 이미 로드된 경우 즉시 실행
            this.checkAndAddButton();
        }
    }

    // DOM 감시 시작
    startObserving() {
        // 기존 감시자 정리
        if (this.observer) {
            this.observer.disconnect();
        }

        // 새 감시자 생성 - 디바운싱 추가
        let debounceTimer;
        this.observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // 채널 페이지인지 확인
                if (!this.isChannelPage()) return;
                
                // 버튼이 없고, 구독 버튼이 있으면 추가
                const existingBtn = document.getElementById('youtube-channel-collect-btn');
                if (!existingBtn || !existingBtn.isConnected) {
                    const subscribeBtn = this.findSubscribeButton();
                    if (subscribeBtn) {
                        console.log('🔍 구독 버튼 발견 - 채널 수집 버튼 추가');
                        this.addButton(subscribeBtn);
                    }
                }
            }, 100); // 100ms 디바운싱
        });

        // 전체 body 감시
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('👁️ DOM 감시 시작');
    }

    // 채널 페이지 확인
    isChannelPage() {
        const url = window.location.href;
        return url.includes('youtube.com/@') || 
               url.includes('/channel/') || 
               url.includes('/c/') ||
               url.includes('/user/');
    }

    // 구독 버튼 찾기
    findSubscribeButton() {
        // 다양한 구독 버튼 선택자 (우선순위 순)
        const selectors = [
            // 메인 구독 버튼
            '#subscribe-button-shape button',
            '#subscribe-button button',
            'ytd-subscribe-button-renderer button',
            
            // 컨테이너 전체
            '#subscribe-button-shape',
            '#subscribe-button',
            'ytd-subscribe-button-renderer',
            
            // aria-label로 찾기
            '[aria-label*="구독"]',
            '[aria-label*="Subscribe"]',
            'button[aria-label*="구독"]',
            'button[aria-label*="Subscribe"]',
            
            // 텍스트로 찾기
            'button:contains("구독")',
            'button:contains("Subscribe")',
            
            // 클래스명으로 찾기
            '.style-scope.ytd-subscribe-button-renderer',
            'yt-button-shape[data-style="STYLE_RED"]',
            'yt-button-shape[data-style="STYLE_DESTRUCTIVE"]'
        ];

        for (const selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    // 보이는 요소인지 확인
                    if (element.offsetParent !== null && 
                        element.getBoundingClientRect().width > 0) {
                        console.log(`🔍 구독 버튼 발견: ${selector}`);
                        return element;
                    }
                }
            } catch (e) {
                // CSS 선택자 에러 무시하고 계속
                continue;
            }
        }
        
        console.log('⚠️ 구독 버튼을 찾을 수 없습니다');
        return null;
    }

    // 버튼 추가
    addButton(subscribeButton) {
        // 기존 버튼 제거
        this.removeButton();

        // 새 버튼 생성
        this.channelButton = document.createElement('button');
        this.channelButton.id = 'youtube-channel-collect-btn';
        this.channelButton.className = 'youtube-channel-collect-btn-v2';
        this.channelButton.innerHTML = `
            <span style="display: flex; align-items: center; gap: 6px;">
                📊 채널 수집
            </span>
        `;

        // 스타일 설정
        this.channelButton.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 0 16px;
            height: 36px;
            margin-left: 8px;
            font-family: Roboto, Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            vertical-align: middle;
        `;

        // 호버 효과
        this.channelButton.onmouseenter = () => {
            this.channelButton.style.transform = 'scale(1.05)';
            this.channelButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };

        this.channelButton.onmouseleave = () => {
            this.channelButton.style.transform = 'scale(1)';
            this.channelButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        };

        // 클릭 이벤트
        this.channelButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleButtonClick();
        };

        // 구독 버튼 옆에 추가 - 다양한 방법 시도
        const insertMethods = [
            // 방법 1: subscribe-button-shape 컨테이너 옆에
            () => {
                const container = subscribeButton.closest('#subscribe-button-shape, #subscribe-button');
                if (container && container.parentElement) {
                    container.parentElement.insertBefore(this.channelButton, container.nextSibling);
                    return '구독 버튼 컨테이너 옆에 추가';
                }
                return false;
            },
            
            // 방법 2: 버튼 그룹 컨테이너에
            () => {
                const containers = [
                    '#channel-header #buttons',
                    '#owner #buttons', 
                    '.ytd-channel-name #buttons',
                    'ytd-channel-actions-renderer',
                    '.ytd-c4-tabbed-header-renderer #buttons'
                ];
                
                for (const selector of containers) {
                    const container = document.querySelector(selector);
                    if (container) {
                        container.appendChild(this.channelButton);
                        return `버튼 그룹(${selector})에 추가`;
                    }
                }
                return false;
            },
            
            // 방법 3: 구독 버튼과 같은 레벨에
            () => {
                if (subscribeButton.parentElement) {
                    subscribeButton.parentElement.insertBefore(this.channelButton, subscribeButton.nextSibling);
                    return '구독 버튼과 같은 레벨에 추가';
                }
                return false;
            },
            
            // 방법 4: 구독 버튼 부모의 부모에
            () => {
                const grandParent = subscribeButton.parentElement?.parentElement;
                if (grandParent) {
                    grandParent.appendChild(this.channelButton);
                    return '구독 버튼 상위 컨테이너에 추가';
                }
                return false;
            }
        ];

        // 각 방법을 순서대로 시도
        for (let i = 0; i < insertMethods.length; i++) {
            try {
                const result = insertMethods[i]();
                if (result) {
                    console.log(`✅ 방법 ${i + 1}: ${result}`);
                    return;
                }
            } catch (error) {
                console.warn(`⚠️ 방법 ${i + 1} 실패:`, error);
                continue;
            }
        }

        console.error('❌ 모든 버튼 추가 방법 실패');
        console.log('🔍 구독 버튼 정보:', {
            element: subscribeButton,
            tagName: subscribeButton.tagName,
            id: subscribeButton.id,
            className: subscribeButton.className,
            parent: subscribeButton.parentElement
        });
    }

    // 버튼 제거
    removeButton() {
        const existingButton = document.getElementById('youtube-channel-collect-btn');
        if (existingButton) {
            existingButton.remove();
        }
        this.channelButton = null;
    }

    // 수동 체크 및 추가
    checkAndAddButton() {
        // 즉시 한번 체크
        this.tryAddButton();
        
        // 200ms 후 재시도 (DOM이 완전히 로드되지 않았을 경우)
        setTimeout(() => {
            this.tryAddButton();
        }, 200);
        
        // 500ms 후 마지막 재시도
        setTimeout(() => {
            this.tryAddButton();
        }, 500);
    }
    
    // 버튼 추가 시도
    tryAddButton() {
        if (this.isChannelPage()) {
            const existingBtn = document.getElementById('youtube-channel-collect-btn');
            if (!existingBtn || !existingBtn.isConnected) {
                const subscribeBtn = this.findSubscribeButton();
                if (subscribeBtn) {
                    console.log('🔄 수동 체크 - 채널 수집 버튼 추가');
                    this.addButton(subscribeBtn);
                }
            }
        }
    }

    // 버튼 클릭 처리
    async handleButtonClick() {
        console.log('📊 채널 수집 버튼 클릭!');
        
        try {
            // 채널 정보 수집
            const channelInfo = this.extractChannelInfo();
            console.log('채널 정보:', channelInfo);

            // 최근 키워드 가져오기
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

    // 채널 정보 추출
    extractChannelInfo() {
        const info = {};
        
        // 채널 이름
        const nameEl = document.querySelector('#channel-name, .ytd-channel-name');
        info.name = nameEl?.textContent?.trim() || '';
        
        // 구독자 수
        const subEl = document.querySelector('#subscriber-count');
        info.subscribers = subEl?.textContent?.trim() || '';
        
        // URL에서 채널 ID 추출
        const url = window.location.href;
        const handleMatch = url.match(/@([^\/]+)/);
        if (handleMatch) {
            info.handle = handleMatch[1];
        }
        
        return info;
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
            // 기본 키워드 세트
            return [
                { keyword: '게임', count: 25 },
                { keyword: '교육', count: 15 },
                { keyword: '엔터테인먼트', count: 26 },
                { keyword: '요리', count: 20 },
                { keyword: '뷰티', count: 21 },
                { keyword: '스포츠', count: 24 },
                { keyword: '음악', count: 30 },
                { keyword: '기술', count: 20 }
            ];
        }
    }

    // 키워드 입력 모달 표시 (V1과 동일)
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
                        <div class="channel-name">${channelInfo.name}</div>
                        <div class="channel-subs">${channelInfo.subscribers}</div>
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

        // V1과 동일한 스타일 추가
        this.addModalStyles(modal);

        // DOM에 추가
        document.body.appendChild(modal);

        // V1과 동일한 이벤트 리스너 설정
        this.setupModalEventListenersV1(channelInfo, recentKeywords, allKeywords);
        
        console.log('🎉 V1 스타일 키워드 모달 표시');
    }

    // V1 스타일 추가
    addModalStyles(modal) {
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
                    border: 2px solid #007bff;
                    border-top: none;
                    border-radius: 0 0 6px 6px;
                    max-height: 250px;
                    overflow-y: auto;
                    z-index: 10000;
                    display: none;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .autocomplete-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 14px;
                    transition: background 0.2s;
                }
                .autocomplete-item:hover, .autocomplete-item.highlighted {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                .autocomplete-item:last-child {
                    border-bottom: none;
                }
                .content-type-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .radio-option {
                    display: flex;
                    align-items: flex-start;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                .radio-option:hover {
                    background: #f8f9fa;
                }
                .radio-option input {
                    margin-right: 8px;
                    margin-top: 2px;
                }
                .radio-option span {
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                .radio-option small {
                    color: #666;
                    font-size: 12px;
                    display: block;
                }
                .selected-keywords {
                    min-height: 40px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    padding: 10px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
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
                .selected-keyword .remove {
                    cursor: pointer;
                    font-weight: bold;
                }
                .modal-footer {
                    padding: 15px 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                .btn-cancel, .btn-submit {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                }
                .btn-cancel {
                    background: #e9ecef;
                    color: #495057;
                }
                .btn-cancel:hover {
                    background: #dee2e6;
                }
                .btn-submit {
                    background: #007bff;
                    color: white;
                }
                .btn-submit:hover {
                    background: #0056b3;
                }
                .btn-submit:disabled {
                    background: #6c757d;
                    cursor: not-allowed;
                }
            </style>
        `;
    }

    // 피드백 표시
    showFeedback(message, type) {
        if (this.channelButton) {
            const originalText = this.channelButton.innerHTML;
            this.channelButton.innerHTML = `<span>${type === 'success' ? '✅' : '❌'} ${message}</span>`;
            this.channelButton.style.background = type === 'success' ? '#4caf50' : '#f44336';
            
            setTimeout(() => {
                this.channelButton.innerHTML = originalText;
                this.channelButton.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
            }, 2000);
        }
    }

    // V1 스타일 모달 이벤트 리스너 설정
    setupModalEventListenersV1(channelInfo, recentKeywords, allKeywords) {
        const modal = document.getElementById('channel-collect-modal');
        const customKeywordsInput = document.getElementById('custom-keywords');
        const autocompleteDiv = document.getElementById('autocomplete-suggestions');
        const selectedKeywordsDiv = document.getElementById('selected-keywords');
        const submitBtn = document.getElementById('collect-submit');
        const cancelBtn = document.getElementById('collect-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        
        let selectedKeywords = new Set();
        let highlightedIndex = -1;

        // 키워드 버튼 이벤트
        modal.querySelectorAll('.keyword-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const keyword = btn.dataset.keyword;
                if (selectedKeywords.has(keyword)) {
                    selectedKeywords.delete(keyword);
                    btn.classList.remove('selected');
                } else {
                    selectedKeywords.add(keyword);
                    btn.classList.add('selected');
                }
                this.updateSelectedKeywordsDisplay(selectedKeywordsDiv, selectedKeywords);
            });
        });

        // 자동완성 기능 (한글 초성 지원)
        customKeywordsInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            console.log('🔍 자동완성 입력:', value, 'allKeywords 길이:', allKeywords.length);
            
            if (value.length < 1) {
                autocompleteDiv.style.display = 'none';
                return;
            }

            // 서버에서 못 받아온 경우 더 많은 기본 키워드 사용
            const keywordsToSearch = allKeywords.length > 0 ? allKeywords : [
                { keyword: '게임', count: 25 },
                { keyword: '게임리뷰', count: 12 },
                { keyword: '교육', count: 15 },
                { keyword: '교육콘텐츠', count: 8 },
                { keyword: '구독자', count: 18 },
                { keyword: '구독', count: 22 },
                { keyword: '요리', count: 20 },
                { keyword: '뷰티', count: 21 },
                { keyword: '스포츠', count: 24 },
                { keyword: '음악', count: 30 },
                { keyword: '기술', count: 20 },
                { keyword: '리뷰', count: 28 },
                { keyword: '엔터테인먼트', count: 26 },
                { keyword: '영화', count: 23 },
                { keyword: '중구난방', count: 5 },
                { keyword: '자동차', count: 16 },
                { keyword: '주식', count: 15 },
                { keyword: '정치', count: 9 },
                { keyword: '축구', count: 14 },
                { keyword: '춤', count: 8 },
                { keyword: '코딩', count: 17 },
                { keyword: '테크', count: 13 },
                { keyword: '패션', count: 15 },
                { keyword: '헬스', count: 11 }
            ];

            // 한글 초성 매핑
            const choseong = {
                'ㄱ': ['가','나'], 'ㄴ': ['나','다'], 'ㄷ': ['다','라'], 
                'ㄹ': ['라','마'], 'ㅁ': ['마','바'], 'ㅂ': ['바','사'],
                'ㅅ': ['사','아'], 'ㅇ': ['아','자'], 'ㅈ': ['자','차'],
                'ㅊ': ['차','카'], 'ㅋ': ['카','타'], 'ㅌ': ['타','파'],
                'ㅍ': ['파','하'], 'ㅎ': ['하','힣']
            };

            // 초성 매칭만 사용
            const matches = keywordsToSearch.filter(k => {
                if (selectedKeywords.has(k.keyword)) return false;
                
                // 초성 매칭 검사
                if (/^[ㄱ-ㅎ]+$/.test(value)) {
                    // 초성 조합 검사 (예: "ㅈㄱ" -> "중구")
                    let choseongPattern = '';
                    for (let char of value) {
                        if (choseong[char]) {
                            const [start] = choseong[char];
                            choseongPattern += start;
                        }
                    }
                    return choseongPattern && k.keyword.startsWith(choseongPattern);
                }
                
                return false;
            }).slice(0, 8);

            console.log('🔍 매칭된 키워드:', matches);

            if (matches.length > 0) {
                autocompleteDiv.innerHTML = matches.map((k, index) => 
                    `<div class="autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}" data-keyword="${k.keyword}">
                        ${k.keyword} <span style="color: #999;">(${k.count})</span>
                    </div>`
                ).join('');
                autocompleteDiv.style.display = 'block';
                highlightedIndex = -1;
            } else {
                autocompleteDiv.style.display = 'none';
            }
        });

        // 키보드 네비게이션
        customKeywordsInput.addEventListener('keydown', (e) => {
            const items = autocompleteDiv.querySelectorAll('.autocomplete-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
                this.updateHighlight(items, highlightedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, -1);
                this.updateHighlight(items, highlightedIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0 && items[highlightedIndex]) {
                    const keyword = items[highlightedIndex].dataset.keyword;
                    this.addKeyword(keyword, selectedKeywords, selectedKeywordsDiv, customKeywordsInput, autocompleteDiv);
                } else {
                    const value = customKeywordsInput.value.trim();
                    if (value) {
                        this.addKeyword(value, selectedKeywords, selectedKeywordsDiv, customKeywordsInput, autocompleteDiv);
                    }
                }
            } else if (e.key === 'Tab' && highlightedIndex >= 0 && items[highlightedIndex]) {
                e.preventDefault();
                const keyword = items[highlightedIndex].dataset.keyword;
                this.addKeyword(keyword, selectedKeywords, selectedKeywordsDiv, customKeywordsInput, autocompleteDiv);
            }
        });

        // 자동완성 클릭
        autocompleteDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('autocomplete-item')) {
                const keyword = e.target.dataset.keyword;
                this.addKeyword(keyword, selectedKeywords, selectedKeywordsDiv, customKeywordsInput, autocompleteDiv);
            }
        });

        // 외부 클릭시 자동완성 숨김
        document.addEventListener('click', (e) => {
            if (!customKeywordsInput.contains(e.target) && !autocompleteDiv.contains(e.target)) {
                autocompleteDiv.style.display = 'none';
            }
        });

        // 수집 시작
        submitBtn.addEventListener('click', async () => {
            if (selectedKeywords.size === 0) {
                alert('최소 하나의 키워드를 선택해주세요.');
                return;
            }

            const contentType = modal.querySelector('input[name="contentType"]:checked').value;
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = '수집 중...';
                
                const response = await fetch('http://localhost:3000/api/cluster/collect-channel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        channelData: channelInfo,
                        keywords: Array.from(selectedKeywords),
                        contentType: contentType
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ 채널 수집 성공:', data);
                    
                    // 성공 피드백
                    this.showFeedback('채널 수집 시작됨!', 'success');
                    
                    // 모달 닫기
                    modal.remove();
                } else {
                    throw new Error('서버 응답 오류');
                }
            } catch (error) {
                console.error('❌ 채널 수집 실패:', error);
                alert(`채널 수집 실패: ${error.message}`);
                
                submitBtn.disabled = false;
                submitBtn.textContent = '수집하기';
            }
        });

        // 닫기 이벤트
        const closeModal = () => modal.remove();
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) closeModal();
        });
    }

    // 하이라이트 업데이트
    updateHighlight(items, index) {
        items.forEach((item, i) => {
            item.classList.toggle('highlighted', i === index);
        });
    }

    // 키워드 추가
    addKeyword(keyword, selectedKeywords, selectedKeywordsDiv, input, autocompleteDiv) {
        if (keyword && !selectedKeywords.has(keyword)) {
            selectedKeywords.add(keyword);
            this.updateSelectedKeywordsDisplay(selectedKeywordsDiv, selectedKeywords);
            input.value = '';
            autocompleteDiv.style.display = 'none';
        }
    }

    // 선택된 키워드 표시 업데이트
    updateSelectedKeywordsDisplay(div, keywords) {
        div.innerHTML = Array.from(keywords).map(keyword => 
            `<span class="selected-keyword">
                ${keyword}
                <span class="remove" onclick="this.parentElement.remove(); this.parentElement.parentElement.dispatchEvent(new CustomEvent('keywordRemoved', {detail: '${keyword}'}))">×</span>
            </span>`
        ).join('');
        
        // 키워드 제거 이벤트
        div.addEventListener('keywordRemoved', (e) => {
            keywords.delete(e.detail);
            const btn = document.querySelector(`[data-keyword="${e.detail}"]`);
            if (btn) btn.classList.remove('selected');
        });
    }

    // 기존 모달 이벤트 리스너 설정 (V2 스타일 - 사용안함)
    setupModalEventListeners(channelInfo, recentKeywords, allKeywords) {
        const keywordInput = document.getElementById('keyword-input');
        const suggestions = document.getElementById('keyword-suggestions');
        const recentKeywordTags = document.getElementById('recent-keyword-tags');
        const startCollectBtn = document.getElementById('start-collect-btn');

        // 최근 키워드 태그 생성
        recentKeywords.forEach(keywordObj => {
            const tag = document.createElement('button');
            tag.className = 'keyword-tag';
            tag.textContent = keywordObj.keyword;
            tag.onclick = () => {
                const currentKeywords = keywordInput.value;
                const newKeyword = keywordObj.keyword;
                
                if (!currentKeywords.includes(newKeyword)) {
                    keywordInput.value = currentKeywords ? 
                        `${currentKeywords}, ${newKeyword}` : 
                        newKeyword;
                }
            };
            recentKeywordTags.appendChild(tag);
        });

        // 자동완성 기능
        let suggestionTimeout;
        keywordInput.addEventListener('input', (e) => {
            clearTimeout(suggestionTimeout);
            const value = e.target.value;
            const lastKeyword = value.split(',').pop().trim().toLowerCase();

            if (lastKeyword.length < 1) {
                suggestions.style.display = 'none';
                return;
            }

            suggestionTimeout = setTimeout(() => {
                const matches = allKeywords.filter(k => 
                    k.keyword.toLowerCase().includes(lastKeyword) && 
                    !value.includes(k.keyword)
                ).slice(0, 5);

                if (matches.length > 0) {
                    suggestions.innerHTML = matches.map(k => 
                        `<div class="suggestion-item" data-keyword="${k.keyword}">${k.keyword} (${k.count})</div>`
                    ).join('');
                    suggestions.style.display = 'block';
                } else {
                    suggestions.style.display = 'none';
                }
            }, 300);
        });

        // 자동완성 클릭
        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                const keyword = e.target.dataset.keyword;
                const keywords = keywordInput.value.split(',');
                keywords[keywords.length - 1] = ` ${keyword}`;
                keywordInput.value = keywords.join(',');
                suggestions.style.display = 'none';
                keywordInput.focus();
            }
        });

        // 외부 클릭시 자동완성 숨김
        document.addEventListener('click', (e) => {
            if (!keywordInput.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });

        // 수집 시작 버튼
        startCollectBtn.addEventListener('click', async () => {
            const keywords = keywordInput.value
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);
            
            const contentType = document.querySelector('input[name="contentType"]:checked').value;
            
            try {
                startCollectBtn.disabled = true;
                startCollectBtn.textContent = '수집 중...';
                
                const response = await fetch('http://localhost:3000/api/cluster/collect-channel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        channelData: channelInfo,
                        keywords: keywords,
                        contentType: contentType
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ 채널 수집 성공:', data);
                    
                    // 성공 피드백
                    this.showFeedback('채널 수집 시작됨!', 'success');
                    
                    // 모달 닫기
                    document.getElementById('channel-collect-modal').remove();
                } else {
                    throw new Error('서버 응답 오류');
                }
            } catch (error) {
                console.error('❌ 채널 수집 실패:', error);
                alert(`채널 수집 실패: ${error.message}`);
                
                startCollectBtn.disabled = false;
                startCollectBtn.textContent = '수집 시작';
            }
        });
    }
}

// 초기화
if (window.location.hostname === 'www.youtube.com') {
    // 기존 인스턴스 정리
    if (window.youtubeChannelAnalyzerV2) {
        if (window.youtubeChannelAnalyzerV2.observer) {
            window.youtubeChannelAnalyzerV2.observer.disconnect();
        }
    }
    
    // 새 인스턴스 생성
    window.youtubeChannelAnalyzerV2 = new YouTubeChannelAnalyzerV2();
    console.log('✅ YouTube 채널 분석기 v2 활성화');
}