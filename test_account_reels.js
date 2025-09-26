const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAccountReels() {
    console.log('🎯 특정 계정의 릴스 수집 테스트...');

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

        // 테스트할 계정명 (mandoo77000이 위에서 발견됨)
        const testAccount = 'mandoo77000';
        console.log(`👤 계정 테스트: ${testAccount}`);

        // 1. 계정 프로필 페이지로 이동
        console.log('📱 프로필 페이지 접속...');
        await page.goto(`https://www.instagram.com/${testAccount}/`);
        await page.waitForTimeout(5000);

        // 프로필 정보 확인
        const profileInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                hasProfile: !!document.querySelector('header'),
                accountName: document.querySelector('h2')?.innerText || 'Not found'
            };
        });

        console.log('📊 프로필 정보:');
        console.log(`  제목: ${profileInfo.title}`);
        console.log(`  계정명: ${profileInfo.accountName}`);
        console.log(`  프로필 존재: ${profileInfo.hasProfile ? 'Yes' : 'No'}`);

        if (!profileInfo.hasProfile) {
            console.log('❌ 프로필을 찾을 수 없습니다.');
            return;
        }

        // 2. 릴스 탭 찾기 및 클릭
        console.log('🎬 릴스 탭 찾기...');

        // 릴스 탭 선택자들 시도
        const reelsSelectors = [
            'a[href*="/reels/"]',
            'a[href$="/reels/"]',
            'svg[aria-label*="릴스"]',
            'svg[aria-label*="Reels"]',
            '[role="tab"]:has-text("릴스")',
            '[role="tab"]:has-text("Reels")'
        ];

        let reelsTabFound = false;
        for (const selector of reelsSelectors) {
            try {
                const reelsTab = await page.$(selector);
                if (reelsTab) {
                    console.log(`✅ 릴스 탭 발견: ${selector}`);
                    await reelsTab.click();
                    await page.waitForTimeout(3000);
                    reelsTabFound = true;
                    break;
                }
            } catch (e) {
                // 다음 선택자 시도
            }
        }

        if (!reelsTabFound) {
            console.log('⚠️ 릴스 탭을 찾을 수 없어서 직접 URL로 이동...');
            await page.goto(`https://www.instagram.com/${testAccount}/reels/`);
            await page.waitForTimeout(5000);
        }

        // 3. 릴스 데이터 추출
        console.log('🎯 릴스 데이터 추출 중...');

        const reelsData = await page.evaluate(() => {
            const results = {
                currentUrl: window.location.href,
                reelsFound: [],
                allNumbers: [],
                allTexts: []
            };

            // 페이지의 모든 텍스트에서 조회수 패턴 찾기
            const pageText = document.body.innerText;
            results.allTexts.push(pageText.substring(0, 500));

            // 한국어 "만" 단위 조회수 패턴
            const koreanViewPatterns = [
                /(\d+(?:\.\d+)?만)/g,
                /(\d+(?:,\d+)*)\s*회/g,
                /(\d+(?:,\d+)*)\s*views?/gi
            ];

            for (let pattern of koreanViewPatterns) {
                const matches = pageText.match(pattern);
                if (matches) {
                    results.allNumbers.push(...matches);
                }
            }

            // 릴스 링크들 찾기
            const reelsLinks = document.querySelectorAll('a[href*="/reel"]');
            reelsLinks.forEach((link, i) => {
                if (i < 10) { // 최대 10개만
                    const href = link.getAttribute('href');
                    const parentText = link.parentElement ? link.parentElement.innerText.substring(0, 100) : '';
                    results.reelsFound.push({
                        url: href,
                        text: parentText
                    });
                }
            });

            return results;
        });

        console.log('📊 릴스 수집 결과:');
        console.log(`  현재 URL: ${reelsData.currentUrl}`);
        console.log(`  발견된 릴스 수: ${reelsData.reelsFound.length}`);

        if (reelsData.reelsFound.length > 0) {
            console.log('\n🎬 발견된 릴스들:');
            reelsData.reelsFound.forEach((reel, i) => {
                console.log(`  ${i + 1}. ${reel.url}`);
                console.log(`     텍스트: ${reel.text}`);
            });
        }

        if (reelsData.allNumbers.length > 0) {
            console.log('\n📈 발견된 조회수 패턴들:');
            reelsData.allNumbers.forEach((num, i) => {
                console.log(`  ${i + 1}. ${num}`);

                // 5만 이상인지 체크
                let numericValue = 0;
                if (num.includes('만')) {
                    const baseNum = parseFloat(num.replace('만', ''));
                    numericValue = baseNum * 10000;
                } else {
                    numericValue = parseInt(num.replace(/[,\s]/g, ''));
                }

                if (numericValue >= 50000) {
                    console.log(`    ✅ 5만 이상! (${numericValue.toLocaleString()}회)`);
                } else {
                    console.log(`    ❌ 5만 미만 (${numericValue.toLocaleString()}회)`);
                }
            });
        } else {
            console.log('\n⚠️ 조회수 데이터를 찾지 못했습니다.');
            console.log('페이지 내용 일부:', reelsData.allTexts[0]);
        }

    } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
    }

    await page.waitForTimeout(15000); // 수동 확인용
    await browser.close();
}

testAccountReels();