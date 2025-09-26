const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testSimpleLogin() {
    console.log('🔍 간단한 Instagram 로그인 테스트...');

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        // 쿠키 파일 로드
        const cookieFilePath = path.join(__dirname, 'data', 'instagram_cookies.txt');

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
                        domain: parts[0].startsWith('.') ? parts[0].substring(1) : parts[0],
                        path: parts[2],
                        secure: parts[3] === 'TRUE',
                        httpOnly: false
                    };
                    cookies.push(cookie);
                }
            }

            await page.context().addCookies(cookies);
            console.log('✅ ' + cookies.length + '개의 쿠키를 로드했습니다.');

            // 쿠키 내용 확인
            const sessionCookie = cookies.find(c => c.name === 'sessionid');
            if (sessionCookie) {
                console.log('📝 sessionid 확인됨: ' + sessionCookie.value.substring(0, 20) + '...');
            } else {
                console.log('❌ sessionid 쿠키를 찾을 수 없습니다.');
            }
        }

        // Instagram 메인 페이지로 이동
        console.log('🌐 Instagram 메인 페이지 접근...');
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000);

        // 현재 페이지 정보 확인
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                hasLoginForm: !!document.querySelector('input[name="username"]'),
                hasHomeIcon: !!document.querySelector('svg[aria-label="홈"], svg[aria-label="Home"]'),
                bodyText: document.body.innerText.substring(0, 200)
            };
        });

        console.log('📊 페이지 정보:');
        console.log('  제목:', pageInfo.title);
        console.log('  URL:', pageInfo.url);
        console.log('  로그인 폼 있음:', pageInfo.hasLoginForm ? 'Yes' : 'No');
        console.log('  홈 아이콘 있음:', pageInfo.hasHomeIcon ? 'Yes' : 'No');
        console.log('  본문 내용:', pageInfo.bodyText);

        if (!pageInfo.hasLoginForm && pageInfo.hasHomeIcon) {
            console.log('🎉 로그인 성공! 홈 피드에 접근할 수 있습니다.');

            // 실제 릴스 테스트
            console.log('\\n🎬 실제 릴스 페이지 테스트...');
            await page.goto('https://www.instagram.com/reels/DMxc-IqS4Bj/', { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(5000);

            const reelInfo = await page.evaluate(() => {
                return {
                    title: document.title,
                    hasLoginRequired: document.title.includes('로그인') || document.title.includes('Log in'),
                    bodyText: document.body.innerText.substring(0, 300)
                };
            });

            console.log('🎬 릴스 페이지 정보:');
            console.log('  제목:', reelInfo.title);
            console.log('  로그인 필요:', reelInfo.hasLoginRequired ? 'Yes' : 'No');

            if (!reelInfo.hasLoginRequired) {
                console.log('✅ 릴스 페이지 접근 성공!');
                console.log('  내용:', reelInfo.bodyText);
            }

        } else {
            console.log('❌ 로그인 실패. 로그인 페이지로 리다이렉트됨.');
        }

    } catch (error) {
        console.error('❌ 테스트 중 오류:', error.message);
    }

    await page.waitForTimeout(10000); // 10초 대기 (수동 확인용)
    await browser.close();
    console.log('✅ 테스트 완료');
}

testSimpleLogin().catch(console.error);