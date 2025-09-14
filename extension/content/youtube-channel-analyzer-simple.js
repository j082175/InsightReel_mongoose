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

            // 간단한 검증
            if (!metadata.author) {
                throw new Error('채널 정보를 찾을 수 없습니다');
            }

            // 성공 알림
            alert(`채널 수집 완료!\n채널: ${metadata.author}\n제목: ${metadata.title || '알 수 없음'}`);

        } catch (error) {
            console.error('❌ 채널 수집 실패:', error);
            alert('채널 수집 실패: ' + error.message);
        } finally {
            button.textContent = originalText;
        }
    }

    // 쇼츠 분석 버튼과 100% 동일한 메타데이터 추출 함수
    extractYouTubeMetadata() {
        console.log('🎯 메타데이터 추출 시작 (쇼츠 버튼과 동일)');

        const metadata = { platform: 'YOUTUBE' };

        try {
            // 제목
            const titleEl = document.querySelector('#title h1') ||
                          document.querySelector('h1.ytd-watch-metadata');
            if (titleEl) {
                metadata.title = titleEl.textContent?.trim();
                console.log('✅ 제목:', metadata.title);
            }

            // 채널명 (쇼츠 분석 버튼과 완전히 동일)
            const channelEl = document.querySelector('#channel-name a') ||
                            document.querySelector('#owner-name a');
            if (channelEl) {
                metadata.author = channelEl.textContent?.trim();
                console.log('✅ 채널명:', metadata.author);
            } else {
                console.log('⚠️ 채널 요소를 찾을 수 없음');
            }

            // 조회수
            const viewEl = document.querySelector('#info-text .view-count');
            if (viewEl) {
                metadata.views = viewEl.textContent?.trim();
                console.log('✅ 조회수:', metadata.views);
            }

        } catch (error) {
            console.log('❌ 메타데이터 추출 오류:', error);
        }

        console.log('📋 메타데이터 추출 완료:', metadata);
        return metadata;
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