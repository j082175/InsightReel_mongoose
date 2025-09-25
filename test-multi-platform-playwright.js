const { chromium } = require('playwright');

/**
 * 멀티 플랫폼 브라우저 자동화 테스트
 * TikTok, YouTube, Instagram 등 모든 플랫폼에서 메타데이터 추출 테스트
 */

class MultiPlatformPlaywrightTester {
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
     * 플랫폼별 특화 메타데이터 추출
     */
    async extractPlatformMetadata(url) {
        const platform = this.detectPlatform(url);

        try {
            console.log(`🔍 ${platform} 플랫폼 메타데이터 추출 시도...`);

            // 페이지 접근
            const response = await this.page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            console.log(`📡 응답 상태: ${response.status()}`);
            await this.page.waitForTimeout(5000);

            // 공통 메타데이터 추출
            const commonMetadata = await this.extractCommonMetadata();

            // 플랫폼별 특화 메타데이터
            let platformSpecific = {};

            switch (platform) {
                case 'TIKTOK':
                    platformSpecific = await this.extractTikTokMetadata();
                    break;
                case 'YOUTUBE':
                    platformSpecific = await this.extractYouTubeMetadata();
                    break;
                case 'INSTAGRAM':
                    platformSpecific = await this.extractInstagramMetadata();
                    break;
                default:
                    console.log('⚠️ 알려지지 않은 플랫폼');
            }

            return {
                platform,
                success: true,
                metadata: {
                    ...commonMetadata,
                    ...platformSpecific
                }
            };

        } catch (error) {
            console.error(`❌ ${platform} 메타데이터 추출 실패:`, error.message);
            return {
                platform,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * URL에서 플랫폼 감지
     */
    detectPlatform(url) {
        if (url.includes('tiktok.com')) return 'TIKTOK';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YOUTUBE';
        if (url.includes('instagram.com')) return 'INSTAGRAM';
        return 'UNKNOWN';
    }

    /**
     * 공통 메타데이터 추출 (모든 플랫폼)
     */
    async extractCommonMetadata() {
        return await this.page.evaluate(() => {
            const getMetaContent = (property) => {
                const meta = document.querySelector(`meta[property="${property}"]`) ||
                            document.querySelector(`meta[name="${property}"]`);
                return meta ? meta.getAttribute('content') : null;
            };

            return {
                title: document.title,
                ogTitle: getMetaContent('og:title'),
                ogDescription: getMetaContent('og:description'),
                ogImage: getMetaContent('og:image'),
                ogUrl: getMetaContent('og:url'),
                ogType: getMetaContent('og:type'),
                twitterCard: getMetaContent('twitter:card'),
                twitterTitle: getMetaContent('twitter:title'),
                twitterDescription: getMetaContent('twitter:description'),
                twitterImage: getMetaContent('twitter:image')
            };
        }).catch(() => ({}));
    }

    /**
     * TikTok 특화 메타데이터
     */
    async extractTikTokMetadata() {
        return await this.page.evaluate(() => {
            const metadata = {};

            try {
                // TikTok 특화 선택자들
                const selectors = {
                    author: '[data-e2e="browse-video-desc-username"]',
                    description: '[data-e2e="browse-video-desc"]',
                    likeCount: '[data-e2e="browse-like-count"]',
                    commentCount: '[data-e2e="browse-comment-count"]',
                    shareCount: '[data-e2e="browse-share-count"]',
                    videoPlayer: 'video',
                    music: '[data-e2e="browse-sound"]'
                };

                for (const [key, selector] of Object.entries(selectors)) {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            metadata[`tiktok_${key}`] = element.textContent?.trim() || element.src || 'found';
                        }
                    } catch (e) {
                        // 무시
                    }
                }

                // __UNIVERSAL_DATA 추출 시도
                const scripts = document.querySelectorAll('script');
                for (let script of scripts) {
                    if (script.textContent && script.textContent.includes('__UNIVERSAL_DATA')) {
                        metadata.universalDataFound = true;
                        break;
                    }
                }

            } catch (error) {
                metadata.error = error.message;
            }

            return metadata;
        }).catch(() => ({}));
    }

    /**
     * YouTube 특화 메타데이터
     */
    async extractYouTubeMetadata() {
        return await this.page.evaluate(() => {
            const metadata = {};

            try {
                // YouTube 특화 선택자들
                const selectors = {
                    channelName: '#channel-name a',
                    subscribers: '#owner-sub-count',
                    views: '.ytd-video-primary-info-renderer .view-count',
                    likes: 'like-button-view-model button[aria-label*="like"]',
                    publishDate: '#info-strings yt-formatted-string',
                    description: '#description-text',
                    title: 'h1.ytd-video-primary-info-renderer'
                };

                for (const [key, selector] of Object.entries(selectors)) {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            metadata[`youtube_${key}`] = element.textContent?.trim() || 'found';
                        }
                    } catch (e) {
                        // 무시
                    }
                }

                // ytInitialData 확인
                if (window.ytInitialData) {
                    metadata.ytInitialDataFound = true;
                }

            } catch (error) {
                metadata.error = error.message;
            }

            return metadata;
        }).catch(() => ({}));
    }

    /**
     * Instagram 특화 메타데이터 (이전과 동일)
     */
    async extractInstagramMetadata() {
        return await this.page.evaluate(() => {
            const metadata = {};

            try {
                const selectors = {
                    likes: 'span[data-testid="like-count"]',
                    comments: 'span[data-testid="comment-count"]',
                    engagement: '[role="button"]'
                };

                for (const [key, selector] of Object.entries(selectors)) {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            metadata[`instagram_${key}`] = element.textContent || 'found';
                        }
                    } catch (e) {
                        // 무시
                    }
                }

                // JSON 스크립트 태그 확인
                const scripts = document.querySelectorAll('script[type="application/json"]');
                metadata.jsonScriptCount = scripts.length;

            } catch (error) {
                metadata.error = error.message;
            }

            return metadata;
        }).catch(() => ({}));
    }

    /**
     * 전체 테스트 실행
     */
    async runAllTests() {
        console.log('🚀 멀티 플랫폼 브라우저 자동화 테스트 시작\n');

        // 테스트할 플랫폼별 URL들
        const testUrls = [
            // TikTok
            'https://www.tiktok.com/@charlidamelio', // 프로필
            'https://www.tiktok.com/@charlidamelio/video/7000000000000000000', // 비디오 (예시)

            // YouTube
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // 유명한 비디오
            'https://www.youtube.com/c/YouTube', // 프로필

            // Instagram (이미 테스트됨)
            'https://www.instagram.com/instagram/',
            'https://www.instagram.com/p/CXkbh11p7ZH/'
        ];

        await this.initialize();

        const results = [];

        for (const url of testUrls) {
            console.log(`\n🔍 테스트 중: ${url}`);

            try {
                const result = await this.extractPlatformMetadata(url);
                results.push({ url, ...result });

                if (result.success) {
                    console.log(`✅ ${result.platform}: 성공`);
                    console.log('📊 메타데이터 샘플:', {
                        title: result.metadata.title?.substring(0, 50) + '...',
                        ogDescription: result.metadata.ogDescription?.substring(0, 80) + '...',
                        platformSpecificFields: Object.keys(result.metadata).filter(key =>
                            key.startsWith(result.platform.toLowerCase())
                        ).length
                    });
                } else {
                    console.log(`❌ ${result.platform}: 실패 - ${result.error}`);
                }

            } catch (error) {
                console.error(`💥 URL 처리 중 오류: ${error.message}`);
                results.push({ url, success: false, error: error.message });
            }

            console.log('⏳ 다음 테스트까지 대기...');
            await this.page.waitForTimeout(2000);
        }

        await this.cleanup();

        // 최종 결과 요약
        console.log('\n📋 전체 테스트 결과 요약:');
        console.log('='.repeat(60));

        const platformSummary = {};
        results.forEach(result => {
            const platform = result.platform || 'UNKNOWN';
            if (!platformSummary[platform]) {
                platformSummary[platform] = { success: 0, failed: 0 };
            }
            if (result.success) {
                platformSummary[platform].success++;
            } else {
                platformSummary[platform].failed++;
            }
        });

        Object.entries(platformSummary).forEach(([platform, stats]) => {
            console.log(`${platform}: ✅${stats.success} ❌${stats.failed}`);
        });

        return results;
    }
}

// 테스트 실행
async function main() {
    const tester = new MultiPlatformPlaywrightTester();

    try {
        const results = await tester.runAllTests();
        console.log('\n🎉 모든 테스트 완료!');
        return results;
    } catch (error) {
        console.error('테스트 실행 중 오류:', error);
    }
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = MultiPlatformPlaywrightTester;