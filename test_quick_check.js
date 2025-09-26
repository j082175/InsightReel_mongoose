const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function quickCheck() {
    console.log('⚡ 빠른 쿠키 테스트...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 쿠키 파일 읽기
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

        // 쿠키 설정
        await page.context().addCookies(cookies);
        console.log(`✅ ${cookies.length}개 쿠키 설정`);

        // Instagram 접속
        await page.goto('https://www.instagram.com/');
        await page.waitForTimeout(5000);

        // 로그인 상태 간단 체크
        const title = await page.title();
        const hasLoginInput = await page.$('input[name="username"]') !== null;

        console.log(`📱 제목: ${title}`);
        console.log(`🔐 로그인 필요: ${hasLoginInput ? 'Yes' : 'No'}`);

        if (!hasLoginInput) {
            console.log('🎉 로그인 성공! 릴스 테스트 진행...');

            // 릴스 페이지 테스트
            await page.goto('https://www.instagram.com/reels/DLIOa3xsRSD/');
            await page.waitForTimeout(3000);

            const reelTitle = await page.title();
            console.log(`🎬 릴스 제목: ${reelTitle}`);

            if (!reelTitle.includes('로그인')) {
                console.log('✅ 릴스 접근 성공!');

                // 더 정확한 조회수 찾기
                const pageText = await page.textContent('body');

                // 다양한 조회수 패턴 시도
                const patterns = [
                    /(\d+(?:,\d+)*)\s*views?/gi,
                    /(\d+(?:,\d+)*)\s*조회/gi,
                    /(\d+(?:\.\d+)?[KMB])\s*views?/gi,
                    /(\d+(?:\.\d+)?[만천])\s*회/gi
                ];

                let foundViews = [];

                for (let pattern of patterns) {
                    const matches = pageText.match(pattern);
                    if (matches) {
                        foundViews.push(...matches);
                    }
                }

                console.log(`🎯 발견된 조회수 패턴들:`);
                if (foundViews.length > 0) {
                    foundViews.forEach((view, i) => {
                        console.log(`  ${i + 1}. ${view}`);
                    });

                    // 가장 큰 숫자를 실제 조회수로 추정
                    const maxViews = foundViews
                        .map(v => parseInt(v.replace(/[,\s\D]/g, '')))
                        .filter(n => !isNaN(n))
                        .sort((a, b) => b - a)[0];

                    if (maxViews) {
                        console.log(`📊 추정 조회수: ${maxViews.toLocaleString()}회`);

                        if (maxViews >= 50000) {
                            console.log('✅ 5만 조회수 이상! 필터링 조건 만족!');
                        } else {
                            console.log('❌ 5만 조회수 미만');
                        }
                    }
                } else {
                    console.log('⚠️ 조회수 패턴을 찾지 못함');
                    console.log('📄 페이지 내용 일부:', pageText.substring(0, 200));
                }
            }
        }

    } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
    }

    await page.waitForTimeout(10000);
    await browser.close();
}

quickCheck();