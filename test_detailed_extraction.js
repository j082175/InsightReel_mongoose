const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function detailedExtraction() {
    console.log('🔍 상세 데이터 추출 테스트...');

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

        // 릴스 페이지 접속
        console.log('🎬 릴스 페이지 접속...');
        await page.goto('https://www.instagram.com/reels/DLIOa3xsRSD/');
        await page.waitForTimeout(5000); // 더 긴 대기

        // 페이지가 완전히 로드될 때까지 대기
        try {
            await page.waitForSelector('article', { timeout: 10000 });
        } catch (e) {
            console.log('⚠️ article 요소를 찾을 수 없음');
        }

        // 상세 정보 추출
        const detailedInfo = await page.evaluate(() => {
            const result = {
                title: document.title,
                url: window.location.href,
                allNumbers: [],
                textContent: document.body.innerText,
                videoElements: [],
                articleElements: [],
                spanElements: [],
                metaData: {}
            };

            // 모든 숫자 패턴 추출
            const numberMatches = result.textContent.match(/\d+(?:,\d+)*|\d+(?:\.\d+)?[KMB]/g);
            if (numberMatches) {
                result.allNumbers = numberMatches;
            }

            // 비디오 관련 요소들 찾기
            const videos = document.querySelectorAll('video');
            videos.forEach((video, i) => {
                result.videoElements.push({
                    index: i,
                    src: video.src,
                    duration: video.duration || 0,
                    parentText: video.parentElement ? video.parentElement.innerText : ''
                });
            });

            // article 요소들 찾기
            const articles = document.querySelectorAll('article');
            articles.forEach((article, i) => {
                result.articleElements.push({
                    index: i,
                    text: article.innerText.substring(0, 500)
                });
            });

            // span 요소들에서 숫자 찾기
            const spans = document.querySelectorAll('span');
            spans.forEach(span => {
                const text = span.innerText;
                if (text && /\d/.test(text)) {
                    result.spanElements.push(text);
                }
            });

            // 메타 데이터 확인
            const metas = document.querySelectorAll('meta');
            metas.forEach(meta => {
                const property = meta.getAttribute('property') || meta.getAttribute('name');
                const content = meta.getAttribute('content');
                if (property && content) {
                    result.metaData[property] = content;
                }
            });

            return result;
        });

        console.log('📊 상세 정보:');
        console.log(`  제목: ${detailedInfo.title}`);
        console.log(`  URL: ${detailedInfo.url}`);

        console.log(`\\n🔢 발견된 모든 숫자:`);
        detailedInfo.allNumbers.forEach((num, i) => {
            console.log(`  ${i + 1}. ${num}`);
        });

        console.log(`\\n📄 Article 요소들:`);
        detailedInfo.articleElements.forEach((article, i) => {
            console.log(`  Article ${i + 1}: ${article.text}`);
        });

        console.log(`\\n🎥 비디오 요소들:`);
        detailedInfo.videoElements.forEach((video, i) => {
            console.log(`  Video ${i + 1}: duration=${video.duration}, parentText=${video.parentText.substring(0, 100)}`);
        });

        console.log(`\\n📝 Span 요소들 (숫자 포함):`);
        detailedInfo.spanElements.slice(0, 20).forEach((span, i) => {
            console.log(`  ${i + 1}. ${span}`);
        });

        console.log(`\\n🏷️ 메타 데이터:`);
        Object.keys(detailedInfo.metaData).forEach(key => {
            if (key.includes('video') || key.includes('view') || key.includes('count')) {
                console.log(`  ${key}: ${detailedInfo.metaData[key]}`);
            }
        });

        // 실제 조회수가 높은지 확인해보기
        const highNumbers = detailedInfo.allNumbers
            .map(n => parseInt(n.replace(/[,KMB]/g, '')))
            .filter(n => !isNaN(n) && n > 1000)
            .sort((a, b) => b - a);

        if (highNumbers.length > 0) {
            console.log(`\\n📈 1000 이상의 큰 숫자들:`);
            highNumbers.forEach((num, i) => {
                console.log(`  ${i + 1}. ${num.toLocaleString()}`);
            });
        }

    } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
    }

    await page.waitForTimeout(15000); // 수동 확인용
    await browser.close();
}

detailedExtraction();