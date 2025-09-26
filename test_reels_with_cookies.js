const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function loadCookiesFromFile(page, cookieFilePath) {
    try {
        if (!fs.existsSync(cookieFilePath)) {
            console.log('❌ 쿠키 파일을 찾을 수 없습니다:', cookieFilePath);
            return false;
        }

        const cookieContent = fs.readFileSync(cookieFilePath, 'utf-8');
        const cookies = [];

        // Netscape 형식 쿠키 파일 파싱
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
                    httpOnly: false // Netscape 형식에서는 기본적으로 false
                };

                cookies.push(cookie);
            }
        }

        // 쿠키를 페이지에 추가
        await page.context().addCookies(cookies);
        console.log(`✅ ${cookies.length}개의 쿠키를 로드했습니다.`);
        return true;

    } catch (error) {
        console.error('❌ 쿠키 로드 중 오류:', error.message);
        return false;
    }
}

async function testReelsWithCookies() {
    console.log('🎬 쿠키 기반 릴스 조회수 추출 테스트 시작...');

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // 쿠키 파일 로드
    const cookieFilePath = path.join(__dirname, 'data', 'instagram_cookies.txt');
    const cookiesLoaded = await loadCookiesFromFile(page, cookieFilePath);

    if (!cookiesLoaded) {
        console.log('⚠️ 쿠키 없이 진행합니다.');
    }

    // 프로젝트에서 사용한 실제 릴스 URL들
    const reelsUrls = [
        'https://www.instagram.com/reels/DMxc-IqS4Bj/',
        'https://www.instagram.com/reels/DNRWPXMtSzV/',
        'https://www.instagram.com/reels/DMDYLkRs9RS/'
    ];

    for (const url of reelsUrls) {
        try {
            console.log('\\n🔍 테스트 URL: ' + url);

            // Instagram 페이지로 이동
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(5000); // 페이지 완전 로딩 대기

            // 로그인 상태 확인
            const isLoggedIn = await page.evaluate(() => {
                return !document.title.includes('로그인');
            });

            console.log('🔐 로그인 상태: ' + (isLoggedIn ? '인증됨' : '비인증'));

            if (!isLoggedIn) {
                console.log('⚠️ 로그인이 필요합니다. 쿠키 만료 가능성');
                continue;
            }

            // 메타데이터 추출
            const metadata = await page.evaluate(() => {
                const getMetaContent = (property) => {
                    const meta = document.querySelector('meta[property="' + property + '"]') ||
                                document.querySelector('meta[name="' + property + '"]');
                    return meta ? meta.getAttribute('content') : null;
                };

                return {
                    title: document.title,
                    ogTitle: getMetaContent('og:title'),
                    ogDescription: getMetaContent('og:description'),
                    ogType: getMetaContent('og:type')
                };
            });

            console.log('📊 메타데이터:', metadata);

            // 페이지에서 조회수 및 engagement 데이터 추출
            const engagementData = await page.evaluate(() => {
                const results = {
                    views: null,
                    likes: null,
                    comments: null,
                    rawData: []
                };

                // 조회수 패턴 검색
                const viewPatterns = [
                    /([0-9,]+)\\s*views?/i,
                    /([0-9,]+)\\s*조회/i,
                    /([0-9.]+[KMB])\\s*views?/i,
                    /([0-9.]+[만천백])\\s*회/i
                ];

                // 좋아요/댓글 패턴 검색
                const likePatterns = [
                    /([0-9,]+)\\s*likes?/i,
                    /([0-9,]+)\\s*좋아요/i,
                    /([0-9.]+[KMB])\\s*likes?/i
                ];

                // 모든 텍스트 요소 검사
                const allElements = document.querySelectorAll('*');

                for (let elem of allElements) {
                    const text = elem.textContent || '';
                    const ariaLabel = elem.getAttribute('aria-label') || '';
                    const combinedText = text + ' ' + ariaLabel;

                    // 조회수 검색
                    for (let pattern of viewPatterns) {
                        const match = combinedText.match(pattern);
                        if (match && !results.views) {
                            results.views = match[1];
                            results.rawData.push({ type: 'views', text: combinedText.trim(), match: match[1] });
                        }
                    }

                    // 좋아요 검색
                    for (let pattern of likePatterns) {
                        const match = combinedText.match(pattern);
                        if (match && !results.likes) {
                            results.likes = match[1];
                            results.rawData.push({ type: 'likes', text: combinedText.trim(), match: match[1] });
                        }
                    }

                    // 댓글 수 검색 (간단한 숫자 패턴)
                    if (combinedText.includes('comment') || combinedText.includes('댓글')) {
                        const commentMatch = combinedText.match(/([0-9,]+)/);
                        if (commentMatch && !results.comments) {
                            results.comments = commentMatch[1];
                            results.rawData.push({ type: 'comments', text: combinedText.trim(), match: commentMatch[1] });
                        }
                    }
                }

                return results;
            });

            console.log('🎯 추출된 engagement 데이터:');
            console.log('  조회수: ' + (engagementData.views || 'N/A'));
            console.log('  좋아요: ' + (engagementData.likes || 'N/A'));
            console.log('  댓글: ' + (engagementData.comments || 'N/A'));

            if (engagementData.rawData.length > 0) {
                console.log('  📋 원본 데이터:');
                engagementData.rawData.forEach((data, index) => {
                    console.log('    ' + (index + 1) + '. [' + data.type + '] ' + data.match + ' - "' + data.text.substring(0, 50) + '..."');
                });
            }

            // 조회수가 있으면 성공!
            if (engagementData.views) {
                console.log('\\n🎉 조회수 추출 성공! 웹 자동화로 릴스 필터링 가능!');

                // 조회수를 숫자로 변환해서 필터링 테스트
                const viewCount = parseInt(engagementData.views.replace(/,/g, ''));
                console.log('📊 숫자 변환 결과: ' + viewCount.toLocaleString() + '회');

                if (viewCount >= 50000) {
                    console.log('✅ 5만 조회수 이상 조건 만족!');
                } else {
                    console.log('❌ 5만 조회수 미만');
                }
            }

        } catch (error) {
            console.error('❌ ' + url + ' 테스트 실패:', error.message);
        }

        // 다음 URL 테스트 전 대기
        await page.waitForTimeout(3000);
    }

    await browser.close();
    console.log('\\n✅ 쿠키 기반 릴스 조회수 추출 테스트 완료');
}

// 실행
testReelsWithCookies().catch(console.error);