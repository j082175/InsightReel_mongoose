const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testPerformanceTiming() {
    const startTime = Date.now();
    console.log('⏱️ 성능 측정 테스트 시작...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const timings = {};

    try {
        // 1. 쿠키 설정 시간 측정
        const cookieStart = Date.now();
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
        timings.cookieSetup = Date.now() - cookieStart;
        console.log(`✅ 쿠키 설정: ${timings.cookieSetup}ms`);

        // 2. 로그인 확인 시간 측정
        const loginStart = Date.now();
        await page.goto('https://www.instagram.com/');
        await page.waitForTimeout(3000);

        const hasLoginInput = await page.$('input[name="username"]') !== null;
        timings.loginCheck = Date.now() - loginStart;
        console.log(`✅ 로그인 확인: ${timings.loginCheck}ms`);

        if (hasLoginInput) {
            console.log('❌ 로그인 실패');
            return;
        }

        // 3. 릴스 페이지 접속 시간 측정
        const reelsPageStart = Date.now();
        const testAccount = 'mandoo77000';
        await page.goto(`https://www.instagram.com/${testAccount}/reels/`);
        await page.waitForTimeout(5000);
        timings.reelsPageLoad = Date.now() - reelsPageStart;
        console.log(`✅ 릴스 페이지 로드: ${timings.reelsPageLoad}ms`);

        // 4. 스크롤 및 추가 로드 시간 측정
        const scrollStart = Date.now();
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
        }
        timings.scrollAndLoad = Date.now() - scrollStart;
        console.log(`✅ 스크롤 & 로드: ${timings.scrollAndLoad}ms`);

        // 5. 데이터 추출 시간 측정
        const extractStart = Date.now();
        const reelsData = await page.evaluate(() => {
            const results = {
                reelsFound: [],
                highViewReels: []
            };

            const reelsLinks = document.querySelectorAll('a[href*="/reel"]');
            reelsLinks.forEach((link, i) => {
                if (i < 15) {
                    const href = link.getAttribute('href');
                    const parentText = link.parentElement ? link.parentElement.innerText : '';

                    // 조회수 추출
                    const viewMatch = parentText.match(/(\d+(?:\.\d+)?만)/);
                    let views = 0;
                    if (viewMatch) {
                        views = parseFloat(viewMatch[1].replace('만', '')) * 10000;
                    }

                    const reelData = {
                        url: href,
                        views: views,
                        viewsText: viewMatch ? viewMatch[1] : 'N/A'
                    };

                    results.reelsFound.push(reelData);

                    // 5만 이상 필터링
                    if (views >= 50000) {
                        results.highViewReels.push(reelData);
                    }
                }
            });

            return results;
        });

        timings.dataExtraction = Date.now() - extractStart;
        console.log(`✅ 데이터 추출: ${timings.dataExtraction}ms`);

        // 6. 전체 시간 계산
        timings.total = Date.now() - startTime;

        console.log('\n📊 성능 분석 결과:');
        console.log(`  쿠키 설정: ${timings.cookieSetup}ms`);
        console.log(`  로그인 확인: ${timings.loginCheck}ms`);
        console.log(`  릴스 페이지 로드: ${timings.reelsPageLoad}ms`);
        console.log(`  스크롤 & 로드: ${timings.scrollAndLoad}ms`);
        console.log(`  데이터 추출: ${timings.dataExtraction}ms`);
        console.log(`  전체 소요시간: ${timings.total}ms (${(timings.total/1000).toFixed(1)}초)`);

        console.log('\n🎯 수집 결과:');
        console.log(`  전체 릴스 수: ${reelsData.reelsFound.length}`);
        console.log(`  5만 이상 조회수: ${reelsData.highViewReels.length}개`);

        if (reelsData.highViewReels.length > 0) {
            console.log('\n✅ 5만 이상 조회수 릴스:');
            reelsData.highViewReels.forEach((reel, i) => {
                console.log(`  ${i + 1}. ${reel.viewsText} (${reel.views.toLocaleString()}회) - ${reel.url}`);
            });
        }

        // 7. 처리 속도 계산
        const reelsPerSecond = reelsData.reelsFound.length / (timings.total / 1000);
        console.log(`\n⚡ 처리 속도: ${reelsPerSecond.toFixed(1)} 릴스/초`);

    } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
        timings.error = Date.now() - startTime;
        console.log(`오류 발생까지 시간: ${timings.error}ms`);
    }

    await browser.close();
    console.log('\n✅ 성능 측정 완료');
}

testPerformanceTiming();