const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testCookieFix() {
    console.log('🔧 쿠키 설정 방식 개선 테스트...');

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        // 1. 먼저 Instagram에 접속 (쿠키 없이)
        console.log('🌐 Instagram 기본 페이지 접속...');
        await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // 2. 쿠키 파일 로드 및 설정
        const cookieFilePath = path.join(__dirname, 'data', 'www.instagram.com_cookies.txt');

        if (fs.existsSync(cookieFilePath)) {
            const cookieContent = fs.readFileSync(cookieFilePath, 'utf-8');
            const cookies = [];

            for (const line of cookieContent.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;

                const parts = trimmed.split('\t');
                if (parts.length >= 7) {
                    const cookie = {
                        name: parts[5],
                        value: parts[6],
                        domain: 'instagram.com', // .instagram.com 대신 instagram.com 사용
                        path: parts[2],
                        secure: parts[3] === 'TRUE',
                        httpOnly: false
                    };
                    cookies.push(cookie);
                }
            }

            // 쿠키 설정
            await page.context().addCookies(cookies);
            console.log('✅ ' + cookies.length + '개의 쿠키를 설정했습니다.');

            // 중요한 쿠키들 확인
            const sessionCookie = cookies.find(c => c.name === 'sessionid');
            const csrfCookie = cookies.find(c => c.name === 'csrftoken');
            const userIdCookie = cookies.find(c => c.name === 'ds_user_id');

            console.log('📝 중요 쿠키 확인:');
            console.log('  sessionid:', sessionCookie ? '✅' : '❌');
            console.log('  csrftoken:', csrfCookie ? '✅' : '❌');
            console.log('  ds_user_id:', userIdCookie ? '✅' : '❌');

            // 3. 페이지 새로고침으로 쿠키 적용
            console.log('🔄 페이지 새로고침하여 쿠키 적용...');
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForTimeout(5000);

            // 4. 로그인 상태 확인
            const loginStatus = await page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    hasLoginForm: !!document.querySelector('input[name="username"]'),
                    hasProfileIcon: !!document.querySelector('img[alt*="프로필"], img[data-testid="user-avatar"]'),
                    hasHomeIcon: !!document.querySelector('svg[aria-label="홈"], svg[aria-label="Home"]'),
                    hasNavigation: !!document.querySelector('nav'),
                    bodyText: document.body.innerText.substring(0, 200)
                };
            });

            console.log('📊 로그인 상태 확인:');
            console.log('  제목:', loginStatus.title);
            console.log('  로그인 폼:', loginStatus.hasLoginForm ? '있음' : '없음');
            console.log('  프로필 아이콘:', loginStatus.hasProfileIcon ? '있음' : '없음');
            console.log('  홈 아이콘:', loginStatus.hasHomeIcon ? '있음' : '없음');
            console.log('  네비게이션:', loginStatus.hasNavigation ? '있음' : '없음');

            if (!loginStatus.hasLoginForm && (loginStatus.hasProfileIcon || loginStatus.hasHomeIcon)) {
                console.log('🎉 로그인 성공! 이제 릴스 테스트를 진행합니다...');

                // 5. 릴스 페이지 테스트
                console.log('\\n🎬 릴스 페이지 접근 테스트...');
                await page.goto('https://www.instagram.com/reels/DMxc-IqS4Bj/', { waitUntil: 'networkidle', timeout: 30000 });
                await page.waitForTimeout(5000);

                const reelData = await page.evaluate(() => {
                    const results = {
                        title: document.title,
                        isLoginPage: document.title.includes('로그인') || document.title.includes('Log in'),
                        foundData: []
                    };

                    // 조회수 관련 텍스트 찾기
                    const allText = document.body.innerText;
                    const viewPatterns = [
                        /([0-9,]+)\\s*views?/gi,
                        /([0-9,]+)\\s*조회/gi,
                        /([0-9.]+[KMB])\\s*views?/gi
                    ];

                    for (let pattern of viewPatterns) {
                        const matches = allText.match(pattern);
                        if (matches) {
                            results.foundData.push(...matches);
                        }
                    }

                    return results;
                });

                console.log('🎬 릴스 데이터:');
                console.log('  제목:', reelData.title);
                console.log('  로그인 페이지:', reelData.isLoginPage ? 'Yes' : 'No');

                if (!reelData.isLoginPage) {
                    console.log('✅ 릴스 페이지 접근 성공!');
                    if (reelData.foundData.length > 0) {
                        console.log('🎯 발견된 조회수 데이터:');
                        reelData.foundData.forEach((data, i) => {
                            console.log('  ' + (i + 1) + '. ' + data);
                        });
                    } else {
                        console.log('⚠️ 조회수 데이터를 찾지 못했습니다.');
                    }
                } else {
                    console.log('❌ 여전히 로그인이 필요합니다.');
                }

            } else {
                console.log('❌ 로그인에 실패했습니다. 쿠키가 유효하지 않을 수 있습니다.');
                console.log('💡 디버그 정보:');
                console.log('  본문 내용:', loginStatus.bodyText);
            }

        } else {
            console.log('❌ 쿠키 파일을 찾을 수 없습니다.');
        }

    } catch (error) {
        console.error('❌ 테스트 중 오류:', error.message);
    }

    await page.waitForTimeout(10000); // 수동 확인용 대기
    await browser.close();
    console.log('✅ 테스트 완료');
}

testCookieFix().catch(console.error);