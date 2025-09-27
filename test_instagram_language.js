const http = require('http');

async function testInstagramLanguage() {
    console.log('🌍 Instagram 언어/지역 정보 테스트 시작...\n');

    const testUrl = 'https://www.instagram.com/p/DDVh6yDSRBd/';

    console.log(`📍 테스트 URL: ${testUrl}`);
    console.log('🔄 서버에 요청 전송 중...\n');

    try {
        const postData = JSON.stringify({
            url: testUrl,
            skipVideoDownload: true,
            skipThumbnailGeneration: false
        });

        const result = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/process-video',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        console.error(`❌ API 에러: ${res.statusCode}`);
                        console.error(data);
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        console.log('✅ API 응답 받음!\n');
        console.log('📊 언어/위치 정보 확인:');
        console.log(`  - 플랫폼: ${result.platform || 'N/A'}`);
        console.log(`  - 언어 (language): "${result.metadata?.language || 'N/A'}"`);
        console.log(`  - 위치/지역 (region): "${result.metadata?.region || 'N/A'}"`);
        console.log(`  - 비즈니스 계정 (isCommercial): ${result.metadata?.isCommercial || 'N/A'}`);
        console.log(`  - 제목: ${result.metadata?.title || 'N/A'}`);

        if (result.metadata?.region && result.metadata.region !== '') {
            console.log('\n✅ ✅ ✅ 위치 정보 추출 성공! ✅ ✅ ✅');
            console.log(`📍 추출된 위치: "${result.metadata.region}"`);
        } else if (result.metadata?.language && result.metadata.language !== '') {
            console.log('\n✅ 언어 정보 추출 성공!');
            console.log(`🗣️ 추출된 언어: "${result.metadata.language}"`);
        } else {
            console.log('\n⚠️ 언어/위치 정보가 비어있음');
            console.log('💡 팁: 위치 태그가 있는 Instagram 포스트를 테스트해보세요');
        }

    } catch (error) {
        console.error(`\n❌ 테스트 실패: ${error.message}`);
        console.error('서버가 실행 중인지 확인하세요 (npm run dev)');
    }
}

testInstagramLanguage();