const { chromium } = require('playwright');

async function testReelsViewCount() {
    console.log('🎬 릴스 조회수 추출 테스트 시작...');

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();

    // 프로젝트에서 사용한 실제 릴스 URL들
    const reelsUrls = [
        'https://www.instagram.com/reels/DMxc-IqS4Bj/',
        'https://www.instagram.com/reels/DNRWPXMtSzV/',
        'https://www.instagram.com/reels/DMDYLkRs9RS/'
    ];

    for (const url of reelsUrls) {
        try {
            console.log(`\n🔍 테스트 URL: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

            await page.waitForTimeout(3000); // 페이지 로딩 대기

            // 메타데이터 추출
            const metadata = await page.evaluate(() => {
                const getMetaContent = (property) => {
                    const meta = document.querySelector(`meta[property="${property}"]`) ||
                                document.querySelector(`meta[name="${property}"]`);
                    return meta ? meta.getAttribute('content') : null;
                };

                return {
                    title: document.title,
                    ogTitle: getMetaContent('og:title'),
                    ogDescription: getMetaContent('og:description'),
                    ogType: getMetaContent('og:type'),
                    videoViews: getMetaContent('video:views'),
                    instagramMediaViews: getMetaContent('instagram:media_views')
                };
            });

            console.log('📊 메타데이터:', metadata);

            // 페이지 내용에서 조회수 패턴 찾기
            const engagementData = await page.evaluate(() => {
                const results = [];

                // 다양한 조회수 패턴 검색
                const patterns = [
                    /(\d+(?:,\d+)*)\s*views?/i,
                    /(\d+(?:,\d+)*)\s*조회/i,
                    /(\d+(?:,\d+)*)\s*회\s*재생/i,
                    /(\d+(?:\.\d+)?[KMB])\s*views?/i,
                    /(\d+(?:\.\d+)?[만천백십])\s*회/i
                ];

                // 모든 텍스트 요소 검사
                const textElements = document.querySelectorAll('span, div, p, a');

                for (let elem of textElements) {
                    const text = elem.textContent || '';

                    for (let pattern of patterns) {
                        const match = text.match(pattern);
                        if (match) {
                            results.push({
                                element: elem.tagName + '.' + elem.className,
                                text: text.trim(),
                                match: match[1],
                                pattern: pattern.toString()
                            });
                        }
                    }
                }

                // 좋아요/댓글 수도 함께 추출
                const likeElements = document.querySelectorAll('[aria-label*="like"], [aria-label*="좋아요"]');
                const commentElements = document.querySelectorAll('[aria-label*="comment"], [aria-label*="댓글"]');

                return {
                    viewMatches: results,
                    likeElements: likeElements.length,
                    commentElements: commentElements.length
                };
            });

            console.log('🎯 추출된 engagement 데이터:');
            console.log(`  조회수 패턴 매치: ${engagementData.viewMatches.length}개`);

            if (engagementData.viewMatches.length > 0) {
                engagementData.viewMatches.forEach((match, index) => {
                    console.log(`    ${index + 1}. ${match.match} (${match.text})`);
                });
            }

            console.log(`  좋아요 요소: ${engagementData.likeElements}개`);
            console.log(`  댓글 요소: ${engagementData.commentElements}개`);

        } catch (error) {
            console.error(`❌ ${url} 테스트 실패:`, error.message);
        }

        // 다음 URL 테스트 전 대기
        await page.waitForTimeout(2000);
    }

    await browser.close();
    console.log('\n✅ 릴스 조회수 추출 테스트 완료');
}

// 실행
testReelsViewCount().catch(console.error);