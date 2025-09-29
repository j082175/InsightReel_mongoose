const { chromium } = require('playwright');

/**
 * TikTok: 개별 영상 URL → 계정 데이터 추출 테스트
 * Instagram과 동일한 워크플로우가 TikTok에서도 가능한지 확인
 */

class TikTokVideoToProfileTester {
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
     * 개별 TikTok 영상에서 작성자 정보 추출
     */
    async extractVideoData(videoUrl) {
        try {
            console.log(`🎬 개별 영상 데이터 추출: ${videoUrl}`);

            await this.page.goto(videoUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            await this.page.waitForTimeout(5000);

            // 영상 페이지에서 메타데이터와 DOM 정보 추출
            const videoData = await this.page.evaluate(() => {
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

                // TikTok 특화 선택자로 작성자 정보 추출 시도
                const authorSelectors = [
                    '[data-e2e="browse-video-desc-username"]',
                    '[data-e2e="video-author-uniqueid"]',
                    'h2[data-e2e="browse-video-desc-username"] a',
                    'span[data-e2e="browse-username"]',
                    '.author-uniqueId',
                    '[href*="/@"]' // @username 링크
                ];

                let authorInfo = null;

                for (const selector of authorSelectors) {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            const text = element.textContent?.trim();
                            const href = element.href;

                            if (text || href) {
                                authorInfo = {
                                    selector: selector,
                                    text: text,
                                    href: href,
                                    found: true
                                };
                                break;
                            }
                        }
                    } catch (e) {
                        // 무시
                    }
                }

                // URL에서 작성자명 추출 시도 (fallback)
                const urlMatch = window.location.href.match(/@([^\/]+)/);
                if (urlMatch && urlMatch[1] && !authorInfo) {
                    authorInfo = {
                        selector: 'URL parsing',
                        text: `@${urlMatch[1]}`,
                        href: `https://www.tiktok.com/@${urlMatch[1]}`,
                        found: true
                    };
                }

                return {
                    metadata,
                    authorInfo,
                    currentUrl: window.location.href
                };
            });

            return videoData;

        } catch (error) {
            console.error('❌ 영상 데이터 추출 실패:', error.message);
            return null;
        }
    }

    /**
     * TikTok 프로필 페이지에서 계정 통계 추출
     */
    async extractProfileData(profileUrl) {
        try {
            console.log(`👤 프로필 데이터 추출: ${profileUrl}`);

            await this.page.goto(profileUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            await this.page.waitForTimeout(5000);

            const profileData = await this.page.evaluate(() => {
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
                    ogUrl: getMetaContent('og:url')
                };
            });

            // Meta description에서 팔로워, 좋아요 등 파싱
            const description = profileData.ogDescription;
            let stats = {};

            if (description) {
                // "TikTok (틱톡) 의 charli d'amelio (@charlidamelio) |좋아요 11.9B개.팔로워 156.3M명"
                const followersMatch = description.match(/팔로워\s*([0-9.]+[KMB]?)명/);
                const likesMatch = description.match(/좋아요\s*([0-9.]+[KMB]?)개/);

                if (followersMatch) stats.followers = followersMatch[1];
                if (likesMatch) stats.totalLikes = likesMatch[1];
            }

            return {
                ...profileData,
                stats
            };

        } catch (error) {
            console.error('❌ 프로필 데이터 추출 실패:', error.message);
            return null;
        }
    }

    /**
     * 완전한 워크플로우 테스트: 영상 URL → 프로필 데이터
     */
    async testCompleteWorkflow(videoUrl) {
        console.log('🚀 TikTok: 영상 URL → 프로필 데이터 워크플로우 테스트\n');
        console.log(`🎬 시작 URL: ${videoUrl}\n`);

        await this.initialize();

        try {
            // 1단계: 개별 영상에서 작성자 정보 추출
            console.log('1️⃣ 개별 영상에서 작성자 정보 추출...');
            const videoData = await this.extractVideoData(videoUrl);

            if (!videoData || !videoData.authorInfo?.found) {
                console.log('❌ 작성자 정보를 찾을 수 없습니다.');
                return null;
            }

            console.log('✅ 작성자 정보 발견:');
            console.log(`   선택자: ${videoData.authorInfo.selector}`);
            console.log(`   텍스트: ${videoData.authorInfo.text}`);
            console.log(`   링크: ${videoData.authorInfo.href}`);

            // 2단계: 프로필 URL 생성
            let profileUrl;
            if (videoData.authorInfo.href && videoData.authorInfo.href.includes('@')) {
                profileUrl = videoData.authorInfo.href;
            } else if (videoData.authorInfo.text && videoData.authorInfo.text.startsWith('@')) {
                const username = videoData.authorInfo.text.replace('@', '');
                profileUrl = `https://www.tiktok.com/@${username}`;
            } else {
                console.log('❌ 프로필 URL을 생성할 수 없습니다.');
                return null;
            }

            console.log(`\n2️⃣ 프로필 페이지 접근: ${profileUrl}`);

            // 3단계: 프로필 데이터 추출
            const profileData = await this.extractProfileData(profileUrl);

            if (!profileData) {
                console.log('❌ 프로필 데이터를 추출할 수 없습니다.');
                return null;
            }

            console.log('✅ 프로필 데이터 추출 성공');

            // 결과 통합
            const result = {
                workflow: 'TikTok Video → Profile',
                success: true,
                originalVideoUrl: videoUrl,
                extractedProfileUrl: profileUrl,
                videoMetadata: {
                    title: videoData.metadata.title,
                    ogDescription: videoData.metadata.ogDescription
                },
                profileData: {
                    title: profileData.title,
                    ogDescription: profileData.ogDescription,
                    stats: profileData.stats
                }
            };

            console.log('\n📊 최종 통합 결과:');
            console.log('='.repeat(60));
            console.log(`원본 영상 URL: ${result.originalVideoUrl}`);
            console.log(`추출된 프로필 URL: ${result.extractedProfileUrl}`);
            console.log(`프로필 통계:`, result.profileData.stats);
            console.log(`영상 제목: ${result.videoMetadata.title}`);
            console.log(`프로필 설명: ${result.profileData.ogDescription}`);

            return result;

        } finally {
            await this.cleanup();
        }
    }
}

// 테스트 실행
async function main() {
    const tester = new TikTokVideoToProfileTester();

    // 실제 TikTok 영상 URL들 테스트
    const testUrls = [
        'https://www.tiktok.com/@charlidamelio/video/7290512640063663374', // 유명 크리에이터
        'https://www.tiktok.com/@khaby.lame/video/7000000000000000000'      // 다른 예시
    ];

    for (const url of testUrls) {
        try {
            const result = await tester.testCompleteWorkflow(url);

            if (result && result.success) {
                console.log(`\n✅ 워크플로우 성공: ${url}`);
            } else {
                console.log(`\n❌ 워크플로우 실패: ${url}`);
            }
        } catch (error) {
            console.error('테스트 실행 중 오류:', error);
        }
        console.log('\n' + '='.repeat(100) + '\n');
    }
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = TikTokVideoToProfileTester;