const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAccountReelsWithDates() {
    console.log('📅 특정 계정의 릴스 + 업로드 날짜 수집 테스트...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 쿠키 설정
        const cookieFilePath = path.join(__dirname, 'data', 'www.instagram.com_cookies.txt');
        const cookieContent = fs.readFileSync(cookieFilePath, 'utf-8');

        const cookies = [];
        for (const line of cookieContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const parts = trimmed.split('\t');
            if (parts.length >= 7) {
                cookies.push({
                    name: parts[5],
                    value: parts[6],
                    domain: parts[0].startsWith('.') ? parts[0] : '.' + parts[0],
                    path: parts[2]
                });
            }
        }

        await page.context().addCookies(cookies);
        console.log(`✅ ${cookies.length}개 쿠키 설정`);

        // Instagram 로그인 확인
        await page.goto('https://www.instagram.com/');
        await page.waitForTimeout(3000);

        const hasLoginInput = await page.$('input[name="username"]') !== null;
        if (hasLoginInput) {
            console.log('❌ 로그인 실패');
            return;
        }

        console.log('✅ 로그인 성공');

        // 테스트할 계정명
        const testAccount = 'mandoo77000';
        console.log(`👤 계정 테스트: ${testAccount}`);

        // 1. 계정 릴스 페이지로 직접 이동
        console.log('🎬 릴스 페이지 직접 접속...');
        await page.goto(`https://www.instagram.com/${testAccount}/reels/`);
        await page.waitForTimeout(5000);

        // 2. 페이지 스크롤하여 더 많은 릴스 로드
        console.log('📜 페이지 스크롤하여 릴스 로드...');
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
        }

        // 3. 상세한 릴스 정보 추출
        console.log('🎯 릴스 상세 정보 추출 중...');

        const reelsData = await page.evaluate(() => {
            const results = {
                currentUrl: window.location.href,
                reelsDetailed: [],
                pageStructure: []
            };

            // 릴스 관련 요소들을 더 정확히 찾기
            const reelsContainers = document.querySelectorAll('article, div[role="button"]');

            reelsContainers.forEach((container, i) => {
                if (i < 20) { // 최대 20개 확인
                    const reelLink = container.querySelector('a[href*="/reel"]');
                    if (reelLink) {
                        const href = reelLink.getAttribute('href');
                        const containerText = container.innerText || '';

                        // 조회수 찾기
                        const viewMatch = containerText.match(/(\d+(?:\.\d+)?만|\d+(?:,\d+)*\s*views?)/i);

                        // 시간 정보 찾기 (상대 시간)
                        const timePatterns = [
                            /(\d+)\s*분\s*전/,
                            /(\d+)\s*시간\s*전/,
                            /(\d+)\s*일\s*전/,
                            /(\d+)\s*주\s*전/,
                            /(\d+)\s*개월\s*전/,
                            /(\d+)m\s*ago/,
                            /(\d+)h\s*ago/,
                            /(\d+)d\s*ago/,
                            /(\d+)w\s*ago/
                        ];

                        let timeInfo = null;
                        for (let pattern of timePatterns) {
                            const timeMatch = containerText.match(pattern);
                            if (timeMatch) {
                                timeInfo = timeMatch[0];
                                break;
                            }
                        }

                        results.reelsDetailed.push({
                            url: href,
                            views: viewMatch ? viewMatch[1] : 'N/A',
                            timeAgo: timeInfo || 'N/A',
                            fullText: containerText.substring(0, 200)
                        });
                    }
                }
            });

            // 페이지 구조 분석
            const allLinks = document.querySelectorAll('a[href*="/reel"]');
            allLinks.forEach((link, i) => {
                if (i < 15) {
                    const href = link.getAttribute('href');
                    const parent = link.closest('article') || link.parentElement;
                    const parentText = parent ? parent.innerText.substring(0, 150) : '';

                    results.pageStructure.push({
                        index: i,
                        url: href,
                        context: parentText
                    });
                }
            });

            return results;
        });

        console.log('📊 릴스 상세 분석 결과:');
        console.log(`  현재 URL: ${reelsData.currentUrl}`);
        console.log(`  상세 릴스 수: ${reelsData.reelsDetailed.length}`);
        console.log(`  전체 링크 수: ${reelsData.pageStructure.length}`);

        if (reelsData.reelsDetailed.length > 0) {
            console.log('\n🎬 릴스 상세 정보 (업로드 시간 포함):');
            reelsData.reelsDetailed.forEach((reel, i) => {
                console.log(`\n  ${i + 1}. ${reel.url}`);
                console.log(`     조회수: ${reel.views}`);
                console.log(`     업로드: ${reel.timeAgo}`);

                // 5만 이상 체크
                if (reel.views !== 'N/A' && reel.views.includes('만')) {
                    const numericValue = parseFloat(reel.views.replace('만', '')) * 10000;
                    if (numericValue >= 50000) {
                        console.log(`     ✅ 5만 이상! (${numericValue.toLocaleString()}회)`);
                    } else {
                        console.log(`     ❌ 5만 미만 (${numericValue.toLocaleString()}회)`);
                    }
                }
            });
        }

        console.log('\n📋 페이지 구조 분석:');
        reelsData.pageStructure.slice(0, 10).forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.url}`);
            console.log(`     컨텍스트: ${item.context}`);
        });

        // 4. 실제 정렬 순서 확인을 위해 첫 번째 릴스 클릭해보기
        if (reelsData.reelsDetailed.length > 0) {
            console.log('\n🔍 첫 번째 릴스 상세 확인...');
            const firstReelUrl = reelsData.reelsDetailed[0].url;
            if (firstReelUrl && !firstReelUrl.includes('/reels/')) {
                const fullUrl = `https://www.instagram.com${firstReelUrl}`;
                await page.goto(fullUrl);
                await page.waitForTimeout(3000);

                const reelDetails = await page.evaluate(() => {
                    return {
                        title: document.title,
                        url: window.location.href,
                        bodyText: document.body.innerText.substring(0, 300)
                    };
                });

                console.log(`첫 번째 릴스 정보:`);
                console.log(`  URL: ${reelDetails.url}`);
                console.log(`  제목: ${reelDetails.title}`);
            }
        }

    } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
    }

    await page.waitForTimeout(10000); // 수동 확인용
    await browser.close();
}

testAccountReelsWithDates();