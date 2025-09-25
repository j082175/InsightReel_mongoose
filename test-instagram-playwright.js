const { chromium } = require('playwright');

/**
 * Playwright를 이용한 Instagram 브라우저 자동화 테스트
 * 2025년 Instagram 메타데이터 추출 - 브라우저 자동화 방식
 */

class InstagramPlaywrightTester {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        console.log('🌐 Playwright 브라우저 초기화 중...');

        this.browser = await chromium.launch({
            headless: false, // 디버깅을 위해 브라우저 표시
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });

        this.page = await this.browser.newPage();

        // 추가 스텔스 설정
        await this.page.addInitScript(() => {
            // webdriver 감지 우회
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });

        await this.page.setViewportSize({ width: 1366, height: 768 });

        console.log('✅ 브라우저 초기화 완료');
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 브라우저 정리 완료');
        }
    }

    /**
     * Instagram 로그인 없이 공개 포스트 접근 시도
     */
    async testPublicPost(instagramUrl) {
        try {
            console.log(`🔍 브라우저로 Instagram 공개 포스트 접근: ${instagramUrl}`);

            // Instagram 페이지 접근
            const response = await this.page.goto(instagramUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            console.log(`📡 응답 상태: ${response.status()}`);

            // 로그인 요구 확인
            const loginRequired = await this.page.locator('text=Log in').isVisible().catch(() => false);
            if (loginRequired) {
                console.log('🔐 로그인이 필요한 것으로 보입니다');
            }

            // 페이지 로딩 대기
            await this.page.waitForTimeout(3000);

            // 메타데이터 추출 시도
            const metadata = await this.extractMetadata();

            if (metadata) {
                return {
                    method: 'Playwright Browser Automation',
                    success: true,
                    metadata: metadata
                };
            } else {
                return {
                    method: 'Playwright Browser Automation',
                    success: false,
                    error: 'No metadata extracted'
                };
            }

        } catch (error) {
            console.error('❌ Playwright 테스트 실패:', error.message);
            return {
                method: 'Playwright Browser Automation',
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 페이지에서 메타데이터 추출
     */
    async extractMetadata() {
        try {
            console.log('📊 메타데이터 추출 시도...');

            // 방법 1: window.__additionalDataLoaded 확인
            const additionalData = await this.page.evaluate(() => {
                return window.__additionalDataLoaded || null;
            }).catch(() => null);

            if (additionalData) {
                console.log('✅ __additionalDataLoaded 발견');
            }

            // 방법 2: script 태그에서 데이터 추출
            const scriptData = await this.page.evaluate(() => {
                const scripts = document.querySelectorAll('script[type="application/json"]');
                const results = [];

                for (let script of scripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data && typeof data === 'object') {
                            results.push(data);
                        }
                    } catch (e) {
                        // JSON 파싱 실패는 무시
                    }
                }

                return results;
            }).catch(() => []);

            console.log(`📋 JSON 스크립트 태그 ${scriptData.length}개 발견`);

            // 방법 3: DOM에서 직접 정보 추출
            const domMetadata = await this.page.evaluate(() => {
                // 메타 태그들 확인
                const getMetaContent = (property) => {
                    const meta = document.querySelector(`meta[property="${property}"]`) ||
                                document.querySelector(`meta[name="${property}"]`);
                    return meta ? meta.getAttribute('content') : null;
                };

                // 기본 메타데이터
                const metadata = {
                    title: document.title,
                    ogTitle: getMetaContent('og:title'),
                    ogDescription: getMetaContent('og:description'),
                    ogImage: getMetaContent('og:image'),
                    ogUrl: getMetaContent('og:url')
                };

                // Instagram 특화 선택자들 시도
                const selectors = {
                    // 구 Instagram 선택자들
                    likes: 'span[data-testid="like-count"]',
                    comments: 'span[data-testid="comment-count"]',
                    // 새 Instagram 선택자들 (추정)
                    likeButton: 'svg[aria-label*="like"]',
                    commentButton: 'svg[aria-label*="comment"]',
                    // 일반적인 선택자들
                    engagement: '[role="button"]',
                    text: 'article div[data-testid="post-content"]'
                };

                for (const [key, selector] of Object.entries(selectors)) {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            metadata[key] = element.textContent || element.innerHTML || 'found';
                        }
                    } catch (e) {
                        // 선택자 오류 무시
                    }
                }

                return metadata;
            }).catch(() => null);

            if (domMetadata) {
                console.log('✅ DOM 메타데이터 추출 성공');
                console.log('📊 추출된 데이터:', domMetadata);
                return domMetadata;
            }

            // 방법 4: React DevTools 데이터 확인
            const reactData = await this.page.evaluate(() => {
                // React 인스턴스 찾기 시도
                const reactRoot = document.querySelector('#react-root') || document.querySelector('[data-reactroot]');
                if (reactRoot && reactRoot._reactInternalInstance) {
                    return 'React instance found';
                }
                return null;
            }).catch(() => null);

            if (reactData) {
                console.log('✅ React 데이터 구조 발견');
            }

            return null;

        } catch (error) {
            console.error('❌ 메타데이터 추출 실패:', error.message);
            return null;
        }
    }

    /**
     * 전체 테스트 실행
     */
    async runTest(instagramUrl) {
        console.log('🚀 Instagram Playwright 브라우저 자동화 테스트 시작\n');
        console.log(`📱 테스트 URL: ${instagramUrl}\n`);

        await this.initialize();

        try {
            const result = await this.testPublicPost(instagramUrl);

            console.log('\n📋 테스트 결과:');
            console.log('='.repeat(50));
            console.log(`${result.method}: ${result.success ? '✅ 성공' : '❌ 실패'}`);

            if (result.success && result.metadata) {
                console.log('📊 추출된 메타데이터:');
                console.log(JSON.stringify(result.metadata, null, 2));
            } else {
                console.log(`❌ 에러: ${result.error}`);
            }

            return result;

        } finally {
            await this.cleanup();
        }
    }
}

// 테스트 실행
async function main() {
    const tester = new InstagramPlaywrightTester();

    // 실제 공개 Instagram 포스트 URL들 (최신)
    const testUrls = [
        'https://www.instagram.com/instagram/', // Instagram 공식 프로필 페이지
        'https://www.instagram.com/p/CXkbh11p7ZH/', // 테스트 포스트
    ];

    for (const url of testUrls) {
        try {
            await tester.runTest(url);
        } catch (error) {
            console.error('테스트 실행 중 오류:', error);
        }
        console.log('\n' + '='.repeat(80) + '\n');
    }
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = InstagramPlaywrightTester;