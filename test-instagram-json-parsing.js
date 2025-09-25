const { chromium } = require('playwright');

/**
 * Instagram JSON 스크립트 태그 상세 분석
 * 35-44개의 JSON 스크립트에서 추출 가능한 추가 데이터 확인
 */

class InstagramJsonParser {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        console.log('🌐 Playwright 브라우저 초기화 중...');

        this.browser = await chromium.launch({
            headless: false,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.addInitScript(() => {
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
     * JSON 스크립트 태그들을 상세 분석
     */
    async analyzeJsonScripts(url) {
        try {
            console.log(`🔍 JSON 스크립트 상세 분석: ${url}`);

            await this.page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            await this.page.waitForTimeout(3000);

            // JSON 스크립트 태그들을 모두 추출하고 분석
            const jsonAnalysis = await this.page.evaluate(() => {
                const scripts = document.querySelectorAll('script[type="application/json"]');
                const results = [];

                console.log(`📋 발견된 JSON 스크립트: ${scripts.length}개`);

                for (let i = 0; i < scripts.length; i++) {
                    const script = scripts[i];
                    try {
                        const content = script.textContent;
                        if (content && content.trim()) {
                            const parsed = JSON.parse(content);

                            // 데이터 구조 분석
                            const analysis = {
                                index: i + 1,
                                size: content.length,
                                topLevelKeys: Object.keys(parsed),
                                hasUserData: !!(
                                    parsed.user ||
                                    parsed.props?.pageProps?.user ||
                                    parsed.graphql?.user ||
                                    (typeof parsed === 'object' && parsed.username)
                                ),
                                hasMediaData: !!(
                                    parsed.media ||
                                    parsed.props?.pageProps?.media ||
                                    parsed.graphql?.shortcode_media ||
                                    (Array.isArray(parsed.items))
                                ),
                                hasStats: !!(
                                    parsed.edge_followed_by ||
                                    parsed.follower_count ||
                                    parsed.like_count ||
                                    (parsed.stats)
                                ),
                                sampleData: {}
                            };

                            // 샘플 데이터 추출
                            if (parsed.user) {
                                analysis.sampleData.user = {
                                    username: parsed.user.username,
                                    follower_count: parsed.user.follower_count,
                                    following_count: parsed.user.following_count
                                };
                            }

                            if (parsed.graphql?.shortcode_media) {
                                const media = parsed.graphql.shortcode_media;
                                analysis.sampleData.media = {
                                    likes: media.edge_media_preview_like?.count,
                                    comments: media.edge_media_to_comment?.count,
                                    caption: media.edge_media_to_caption?.edges[0]?.node?.text?.substring(0, 100)
                                };
                            }

                            // props 구조 확인
                            if (parsed.props?.pageProps) {
                                analysis.sampleData.pageProps = Object.keys(parsed.props.pageProps);
                            }

                            results.push(analysis);
                        }
                    } catch (parseError) {
                        results.push({
                            index: i + 1,
                            error: 'JSON 파싱 실패',
                            size: script.textContent?.length || 0
                        });
                    }
                }

                return results;
            });

            return jsonAnalysis;

        } catch (error) {
            console.error('❌ JSON 스크립트 분석 실패:', error.message);
            return null;
        }
    }

    /**
     * window 객체에서 Instagram 데이터 확인
     */
    async analyzeWindowData(url) {
        try {
            console.log(`🔍 Window 객체 Instagram 데이터 분석: ${url}`);

            await this.page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            await this.page.waitForTimeout(5000);

            const windowData = await this.page.evaluate(() => {
                const data = {};

                // 잘 알려진 Instagram window 객체들 확인
                if (window._sharedData) {
                    data.sharedData = {
                        found: true,
                        keys: Object.keys(window._sharedData),
                        hasEntryData: !!window._sharedData.entry_data,
                        entryDataKeys: window._sharedData.entry_data ? Object.keys(window._sharedData.entry_data) : []
                    };
                }

                if (window.__additionalDataLoaded) {
                    data.additionalData = {
                        found: true,
                        keys: Object.keys(window.__additionalDataLoaded)
                    };
                }

                if (window.require) {
                    data.requireSystem = {
                        found: true,
                        type: typeof window.require
                    };
                }

                // React 관련 데이터
                const reactRoot = document.querySelector('#react-root') || document.querySelector('[data-reactroot]');
                if (reactRoot) {
                    data.reactData = {
                        found: true,
                        hasReactProps: !!(reactRoot._reactInternalFiber || reactRoot._reactInternalInstance)
                    };
                }

                return data;
            });

            return windowData;

        } catch (error) {
            console.error('❌ Window 데이터 분석 실패:', error.message);
            return null;
        }
    }

    /**
     * 전체 분석 실행
     */
    async runAnalysis(url) {
        console.log('🚀 Instagram JSON 상세 분석 시작\n');
        console.log(`📱 분석 URL: ${url}\n`);

        await this.initialize();

        try {
            console.log('1️⃣ JSON 스크립트 태그 분석...\n');
            const jsonAnalysis = await this.analyzeJsonScripts(url);

            if (jsonAnalysis) {
                console.log('📊 JSON 스크립트 분석 결과:');
                console.log('='.repeat(60));

                jsonAnalysis.forEach(script => {
                    if (script.error) {
                        console.log(`${script.index}번 스크립트: ❌ ${script.error} (크기: ${script.size})`);
                    } else {
                        console.log(`${script.index}번 스크립트: ✅ 파싱 성공`);
                        console.log(`  📏 크기: ${script.size} 문자`);
                        console.log(`  🔑 최상위 키: ${script.topLevelKeys.join(', ')}`);
                        console.log(`  👤 사용자 데이터: ${script.hasUserData ? '✅' : '❌'}`);
                        console.log(`  🎬 미디어 데이터: ${script.hasMediaData ? '✅' : '❌'}`);
                        console.log(`  📈 통계 데이터: ${script.hasStats ? '✅' : '❌'}`);

                        if (Object.keys(script.sampleData).length > 0) {
                            console.log(`  🔍 샘플 데이터:`, JSON.stringify(script.sampleData, null, 4));
                        }
                        console.log('');
                    }
                });
            }

            console.log('\n2️⃣ Window 객체 데이터 분석...\n');
            const windowData = await this.analyzeWindowData(url);

            if (windowData) {
                console.log('📊 Window 객체 분석 결과:');
                console.log('='.repeat(60));
                console.log(JSON.stringify(windowData, null, 2));
            }

            return { jsonAnalysis, windowData };

        } finally {
            await this.cleanup();
        }
    }
}

// 테스트 실행
async function main() {
    const parser = new InstagramJsonParser();

    const testUrls = [
        'https://www.instagram.com/instagram/',
        'https://www.instagram.com/p/CXkbh11p7ZH/'
    ];

    for (const url of testUrls) {
        try {
            await parser.runAnalysis(url);
        } catch (error) {
            console.error('분석 실행 중 오류:', error);
        }
        console.log('\n' + '='.repeat(100) + '\n');
    }
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = InstagramJsonParser;