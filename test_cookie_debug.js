const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testCookieDebug() {
    console.log('🐛 쿠키 디버깅 테스트...');

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        // 1. 먼저 Instagram에 접속
        console.log('🌐 Instagram 접속...');
        await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // 2. 쿠키 파일 읽기
        const cookieFilePath = path.join(__dirname, 'data', 'www.instagram.com_cookies.txt');
        const cookieContent = fs.readFileSync(cookieFilePath, 'utf-8');

        console.log('📄 쿠키 파일 내용 일부:');
        const lines = cookieContent.split('\n').slice(0, 15);
        lines.forEach((line, i) => {
            if (line.includes('sessionid')) {
                console.log(`  ${i + 1}. ${line}`);
            }
        });

        // 3. 쿠키 파싱 및 설정 (다양한 도메인 형태로)
        const cookies = [];

        for (const line of cookieContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const parts = trimmed.split('\t');
            if (parts.length >= 7) {
                const domain = parts[0];
                const name = parts[5];
                const value = parts[6];

                // 여러 도메인 형태로 쿠키 추가
                const cookieVariants = [
                    {
                        name: name,
                        value: value,
                        domain: 'instagram.com',
                        path: '/',
                        secure: true,
                        httpOnly: false
                    },
                    {
                        name: name,
                        value: value,
                        domain: '.instagram.com',
                        path: '/',
                        secure: true,
                        httpOnly: false
                    }
                ];

                cookies.push(...cookieVariants);
            }
        }

        console.log(`✅ ${cookies.length}개의 쿠키 설정 시도...`);

        // 쿠키 설정
        await page.context().addCookies(cookies);

        // 4. localStorage도 시도해보기
        await page.evaluate(() => {
            // Instagram이 사용할 수 있는 localStorage 설정
            localStorage.setItem('instagram.session', 'active');
        });

        // 5. 페이지 새로고침
        console.log('🔄 페이지 새로고침...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        // 6. 브라우저 쿠키 직접 확인
        const browserCookies = await page.context().cookies();
        const sessionCookie = browserCookies.find(c => c.name === 'sessionid');

        console.log('🍪 브라우저에 설정된 쿠키 확인:');
        console.log(`  sessionid 쿠키: ${sessionCookie ? '설정됨' : '설정 안됨'}`);
        if (sessionCookie) {
            console.log(`    값: ${sessionCookie.value.substring(0, 20)}...`);
            console.log(`    도메인: ${sessionCookie.domain}`);
        }

        // 7. 페이지 상태 확인
        const pageState = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                hasLoginForm: !!document.querySelector('input[name="username"]'),
                bodyStart: document.body.innerText.substring(0, 100),
                cookies: document.cookie
            };
        });

        console.log('📊 페이지 상태:');
        console.log(`  제목: ${pageState.title}`);
        console.log(`  로그인 폼: ${pageState.hasLoginForm ? '있음' : '없음'}`);
        console.log(`  페이지 쿠키: ${pageState.cookies ? '있음' : '없음'}`);

        if (pageState.hasLoginForm) {
            console.log('❌ 여전히 로그인 페이지입니다.');
            console.log('💡 가능한 원인:');
            console.log('  1. 쿠키 값이 유효하지 않음');
            console.log('  2. Instagram 보안 정책 변경');
            console.log('  3. 사용자 에이전트 감지');
            console.log('  4. 쿠키 도메인/경로 문제');
        } else {
            console.log('🎉 로그인 성공!');
        }

        // 8. 실제 릴스 페이지 시도
        if (!pageState.hasLoginForm) {
            console.log('\\n🎬 릴스 페이지 테스트...');
            await page.goto('https://www.instagram.com/reels/DMxc-IqS4Bj/', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            const reelPageTitle = await page.title();
            console.log(`릴스 페이지 제목: ${reelPageTitle}`);
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
    }

    await page.waitForTimeout(15000); // 긴 대기 시간
    await browser.close();
    console.log('✅ 디버깅 완료');
}

testCookieDebug().catch(console.error);