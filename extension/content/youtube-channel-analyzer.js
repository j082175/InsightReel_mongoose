// YouTube 채널 분석기 - 2단계 분석 (썸네일 + 제목 + 태그 + 설명)
class YouTubeChannelAnalyzer {
    constructor() {
        this.isAnalyzing = false;
        this.channelButton = null;
        this.handlePageLoadTimeout = null; // 디바운싱용
        this.buttonCheckInterval = null; // 버튼 상태 모니터링
        this.init();
    }

    init() {
        console.log('🎥 YouTube 채널 분석기 초기화 (VidIQ 스타일)');
        
        // YouTube 내부 이벤트 리스너 등록 (VidIQ 방식)
        this.setupYouTubeEventListeners();
        
        // 초기 페이지 체크
        this.handlePageLoad();
        
        // V2에서 가져온 추가 이벤트 리스너 (더 안정적)
        window.addEventListener('yt-page-data-updated', () => {
            console.log('📄 페이지 데이터 업데이트');
            this.handlePageLoad();
        });
    }

    // YouTube 내부 이벤트 리스너 설정 (상용 확장 프로그램 방식)
    setupYouTubeEventListeners() {
        // YouTube 페이지 로드 완료 이벤트 (디바운싱)
        window.addEventListener('yt-navigate-finish', () => {
            console.log('🎯 YouTube 내부 이벤트: yt-navigate-finish');
            this.debouncedHandlePageLoad();
        });

        // YouTube 데이터 업데이트 이벤트 (디바운싱)
        document.addEventListener('yt-page-data-updated', () => {
            console.log('🔄 YouTube 내부 이벤트: yt-page-data-updated');
            this.debouncedHandlePageLoad();
        });

        // 백업용: 기존 URL 변경 감지
        let currentURL = location.href;
        const observer = new MutationObserver(() => {
            if (location.href !== currentURL) {
                currentURL = location.href;
                console.log('🔄 URL 변경 감지 (백업):', currentURL);
                this.debouncedHandlePageLoad();
            }
        });
        observer.observe(document, { subtree: true, childList: true });

        // 버튼 상태 지속 모니터링 시작
        this.startButtonMonitoring();
    }

    // 채널 페이지인지 확인
    isChannelPage() {
        const url = window.location.href;
        return url.includes('/channel/') || 
               url.includes('/@') || 
               url.includes('/c/') ||
               url.includes('/user/');
    }

    // 디바운싱된 페이지 로드 처리
    debouncedHandlePageLoad() {
        // 기존 타이머 취소
        if (this.handlePageLoadTimeout) {
            clearTimeout(this.handlePageLoadTimeout);
        }
        
        // 200ms 후 실행 (여러 이벤트가 동시에 발생해도 마지막 하나만 실행)
        this.handlePageLoadTimeout = setTimeout(() => {
            this.handlePageLoad();
        }, 200);
    }

    // 버튼 상태 지속 모니터링 - 제거됨 (더 이상 페이지에 버튼을 추가하지 않음)
    startButtonMonitoring() {
        console.log('🚫 버튼 모니터링이 비활성화됨 - 확장 프로그램 팝업 사용');
        // 기존 모니터링 정지
        if (this.buttonCheckInterval) {
            clearInterval(this.buttonCheckInterval);
            this.buttonCheckInterval = null;
        }
    }

    // 페이지 로드 처리 - 더 이상 버튼 추가하지 않음
    handlePageLoad() {
        console.log('🔍 페이지 로드 처리:', location.href);
        console.log('🚫 페이지 버튼 추가 비활성화됨 - 확장 프로그램 팝업 사용');
        
        // 기존 버튼이 있으면 제거
        this.removeCollectButton();
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
        console.log('🚫 채널 수집 버튼이 확장 프로그램 팝업으로 이동됨');
        return false; // 더 이상 페이지에 버튼 추가하지 않음
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

    // 채널 수집 모달 표시
    async showCollectModal() {
        if (this.isAnalyzing) return;

        try {
            console.log('📊 채널 수집 시작');

            // 채널 정보 추출
            const channelInfo = this.extractChannelInfo();
            console.log('📊 채널 정보:', channelInfo);

            if (!channelInfo.channelId && !channelInfo.channelHandle) {
                throw new Error('채널 ID를 찾을 수 없습니다.');
            }

            // 중복 검사 실행
            const isDuplicate = await this.checkChannelDuplicate(channelInfo);
            if (isDuplicate) {
                const channelName = channelInfo.channelName || channelInfo.channelHandle || '이 채널';
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
            const channelIdentifier = channelInfo.channelHandle ? `@${channelInfo.channelHandle}` : 
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
                        <div class="channel-name">${channelInfo.channelName}</div>
                        <div class="channel-subs">${channelInfo.subscriberCount}</div>
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
            const contentType = contentTypeEl ? contentTypeEl.value : 'longform';
            
            // 선택된 AI 분석 옵션 가져오기
            const aiAnalysisEl = modal.querySelector('input[name="aiAnalysis"]:checked');
            const skipAIAnalysis = aiAnalysisEl ? aiAnalysisEl.value === 'skip' : false;
            
            this.collectChannel(channelInfo, Array.from(selectedKeywords), contentType, skipAIAnalysis);
        });
    }

    // 채널 수집 실행
    async collectChannel(channelInfo, keywords, contentType = 'longform', skipAIAnalysis = false) {
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
                name: channelInfo.channelName || channelInfo.channelHandle || '알 수 없음'
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
                channelIdentifier: data.channelData.channelHandle ? `@${data.channelData.channelHandle}` : 
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

// 확장 프로그램 팝업으로부터의 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showChannelCollectModal') {
        if (window.youtubeChannelAnalyzer) {
            window.youtubeChannelAnalyzer.showCollectModal();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: '채널 분석기가 초기화되지 않음' });
        }
        return true; // 비동기 응답
    }
});

console.log('📺 YouTube 채널 분석기 로드됨');