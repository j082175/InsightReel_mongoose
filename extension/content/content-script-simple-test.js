/**
 * Simple Test Content Script
 * 기본 기능만 테스트
 */

console.log('🚀 InsightReel Simple Test Script 시작');

// 기본 유틸리티
class Utils {
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
        }
    }

    static detectPlatform() {
        const hostname = window.location.hostname;
        if (hostname.includes('instagram.com')) return 'INSTAGRAM';
        if (hostname.includes('tiktok.com')) return 'TIKTOK';
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YOUTUBE';
        return null;
    }
}

// Instagram 간단한 버튼 추가
const InstagramSimple = {
    init() {
        const platform = Utils.detectPlatform();

        // 인스타그램이 아니면 완전히 중단
        if (platform !== 'INSTAGRAM') {
            Utils.log('info', `⏭️ ${platform || '알 수 없음'} 플랫폼 감지됨, Instagram 스크립트 건너뛰기`);
            return;
        }

        Utils.log('info', '📱 Instagram 간단 모드 시작');

        // 3초 간격으로 버튼 추가 시도
        setInterval(() => {
            this.tryAddButton();
        }, 3000);

        // 즉시 한번 실행
        this.tryAddButton();
    },

    tryAddButton() {
        // 기존 버튼이 있는지 확인
        if (document.querySelector('.simple-analysis-button')) {
            return;
        }

        // 다양한 방법으로 요소 찾기
        const selectors = [
            'article',
            'main',
            '[role="main"]',
            'div[style*="display"]',
            'section',
            'div'
        ];

        let foundElement = null;
        let elementsCount = 0;

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elementsCount += elements.length;
            Utils.log('info', `🔍 ${selector}: ${elements.length}개 발견`);

            if (elements.length > 0) {
                foundElement = elements[0];
                Utils.log('success', `✅ 요소 발견: ${selector}`);
                break;
            }
        }

        // 조건에 관계없이 버튼 생성 (DOM이 있다면 인스타그램 페이지)
        Utils.log('info', `📊 총 ${elementsCount}개 요소 발견됨`);

        // 버튼 생성
            const button = document.createElement('button');
            button.textContent = '🔍 분석';
            button.className = 'simple-analysis-button';
            button.style.cssText = `
                position: fixed !important;
                top: 100px !important;
                right: 20px !important;
                z-index: 10000 !important;
                background: linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                border: none !important;
                border-radius: 20px !important;
                padding: 10px 20px !important;
                font-size: 14px !important;
                font-weight: bold !important;
                cursor: pointer !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            `;

            button.onclick = async () => {
                Utils.log('success', '✅ 분석 버튼 클릭됨!');

                // 버튼 상태 변경
                button.textContent = '🔄 분석중...';
                button.disabled = true;

                try {
                    await this.analyzeCurrentVideo();
                } catch (error) {
                    Utils.log('error', '분석 실패', error.message);
                    alert(`분석 실패: ${error.message}`);
                } finally {
                    // 버튼 상태 복원
                    button.textContent = '🔍 분석';
                    button.disabled = false;
                }
            };

        document.body.appendChild(button);
        Utils.log('success', '✅ 분석 버튼 추가됨');
    },

    async analyzeCurrentVideo() {
        Utils.log('info', '🎯 Instagram 비디오 분석 시작');

        // 1. 기본 정보 수집
        const metadata = this.extractMetadata();
        Utils.log('info', '📊 메타데이터 추출 완료', metadata);

        // 2. 서버 상태 확인 후 분석 요청
        const response = await fetch('http://localhost:3000/api/process-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platform: 'INSTAGRAM',
                type: 'video',
                url: window.location.href,
                metadata: metadata,
                timestamp: new Date().toISOString(),
                // 임시: 비디오 다운로드 건너뛰기 플래그 추가
                skipVideoDownload: true
            })
        });

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        Utils.log('success', '✅ 분석 완료', result);

        // 결과 표시
        alert(`분석 완료!\n제목: ${metadata.title || '제목 없음'}\n채널: ${metadata.channelName || '채널명 없음'}`);
    },

    extractMetadata() {
        const metadata = {
            url: window.location.href,
            title: '',
            channelName: '',
            description: '',
            timestamp: new Date().toISOString()
        };

        try {
            // 제목 추출
            const titleSelectors = [
                'h1',
                'title',
                'meta[property="og:title"]',
                'meta[name="title"]'
            ];

            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    metadata.title = (element.content || element.textContent || '').trim();
                    if (metadata.title) break;
                }
            }

            // 채널명 추출 - 더 포괄적인 방법
            const channelSelectors = [
                'header a[role="link"]',
                'a[href*="instagram.com/"]',
                'meta[property="og:site_name"]'
            ];

            for (const selector of channelSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    let channelName = (element.textContent || element.content || '').trim();
                    if (channelName && channelName !== 'Instagram') {
                        metadata.channelName = channelName;
                        break;
                    }
                }
            }

            // URL에서 채널명 추출 (fallback)
            if (!metadata.channelName) {
                const urlMatch = window.location.href.match(/instagram\.com\/([^\/\?]+)/);
                if (urlMatch && urlMatch[1] !== 'p' && urlMatch[1] !== 'reel') {
                    metadata.channelName = urlMatch[1];
                }
            }

            Utils.log('info', '메타데이터 추출 결과', metadata);
        } catch (error) {
            Utils.log('warn', '메타데이터 추출 중 오류', error.message);
        }

        return metadata;
    }
};

// 실행
try {
    InstagramSimple.init();
    Utils.log('success', '✅ Simple Test Script 초기화 완료');
} catch (error) {
    Utils.log('error', '❌ 초기화 실패', error.message);
}