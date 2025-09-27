const http = require('http');

async function testFramePath() {
    console.log('🧪 프레임 경로 테스트 시작...\n');

    // 새로운 TikTok URL로 테스트 (프레임 추출되도록)
    const testUrl = 'https://www.tiktok.com/@user/video/7123456789987654321';

    console.log(`📍 테스트 URL: ${testUrl}`);
    console.log('🔄 서버에 요청 전송 중 (프레임 추출 모드)...\n');

    try {
        // API 호출 - 프레임 추출을 위해 skipVideoDownload를 false로 설정
        const postData = JSON.stringify({
            url: testUrl,
            skipVideoDownload: false,  // 비디오 다운로드해서 프레임 추출
            skipThumbnailGeneration: false,
            analysisType: 'multi-frame'  // 다중 프레임 분석 모드
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

        console.log('✅ API 응답 받음!');
        console.log('📊 결과:');
        console.log(`  - 플랫폼: ${result.platform || 'N/A'}`);
        console.log(`  - 제목: ${result.metadata?.title || 'N/A'}`);

        if (result.success) {
            console.log('\n✅ ✅ ✅ 프레임 경로 테스트 성공! ✅ ✅ ✅');
            console.log('새로운 downloads/frames 폴더에 프레임이 저장되었는지 확인하세요.');
        } else {
            console.log('\n⚠️ 처리 실패 또는 중복');
        }

    } catch (error) {
        console.error(`\n❌ 테스트 실패: ${error.message}`);
        console.error('서버가 실행 중인지 확인하세요 (npm run dev)');
    }
}

testFramePath();