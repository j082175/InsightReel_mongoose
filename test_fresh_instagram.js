const http = require('http');

async function testFreshInstagram() {
    console.log('🔗 새로운 Instagram URL로 channelUrl 테스트 시작...\n');

    // 완전히 새로운 Instagram URL 사용
    const testUrl = 'https://www.instagram.com/p/DDH8fJqPtXX/';

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
        console.log('\n📊 채널 정보:');
        console.log(`   채널명: "${result.metadata?.channelName || 'N/A'}"`);
        console.log(`   채널ID: "${result.metadata?.channelId || 'N/A'}"`);
        console.log(`   생성된 channelUrl: "${result.metadata?.channelUrl || 'N/A'}"`);

        if (result.metadata?.channelUrl && result.metadata.channelUrl !== '') {
            console.log('\n✅ ✅ ✅ channelUrl 생성 성공! ✅ ✅ ✅');
            console.log(`🔗 생성된 channelUrl: "${result.metadata.channelUrl}"`);

            // 이제 DB에서 확인해보자
            console.log('\n🔍 DB에서 channelUrl 저장 확인 중...');
            return result.videoId || result.id;
        } else {
            console.log('\n❌ channelUrl이 생성되지 않음');
            return null;
        }

    } catch (error) {
        console.error(`❌ 테스트 실패: ${error.message}`);
        return null;
    }
}

testFreshInstagram().then(videoId => {
    if (videoId) {
        console.log(`\n📊 처리된 비디오 ID: ${videoId}`);
        console.log('💡 이제 check_recent_video.js로 DB 저장 상태를 확인하세요.');
    }
});