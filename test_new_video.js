const http = require('http');

async function testNewVideo() {
    console.log('🔍 새로운 비디오로 channelUrl 생성 테스트...\n');

    // 새로운 실제 Instagram URL로 테스트 (channelUrl 생성 확인)
    const testUrl = 'https://www.instagram.com/p/DJ5MjFQyoMo/';

    console.log(`📍 테스트 URL: ${testUrl}`);
    console.log('🔄 서버에 요청 전송 중...');

    try {
        const postData = JSON.stringify({
            url: testUrl,
            skipVideoDownload: true,
            skipThumbnailGeneration: true
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

        console.log('✅ 비디오 처리 성공!');
        console.log('\n📊 메타데이터 channelUrl:');
        console.log(`   channelUrl: "${result.metadata?.channelUrl || 'N/A'}"`);

        // 서버 로그를 확인하라는 메시지
        console.log('\n💡 서버 로그를 확인하여 buildChannelUrlByPlatform 호출 여부를 확인하세요.');

    } catch (error) {
        console.error(`❌ 테스트 실패: ${error.message}`);
    }
}

testNewVideo();