const http = require('http');

async function debugChannelUrl() {
    console.log('🔍 channelUrl 생성 과정 디버깅...\n');

    const testUrl = 'https://www.tiktok.com/@cristiano/video/7422414983571827969';  // 새로운 TikTok URL

    console.log(`📍 테스트 URL: ${testUrl}`);
    console.log('🔄 서버에 요청 전송 중...');

    try {
        const postData = JSON.stringify({
            url: testUrl,
            skipVideoDownload: true,
            skipThumbnailGeneration: true,
            debug: true  // 디버깅 모드
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
        console.log('\n📊 전체 메타데이터:');
        console.log(JSON.stringify(result.metadata, null, 2));

        console.log('\n📊 특히 채널 관련 데이터:');
        console.log(`   channelName: "${result.metadata?.channelName || 'N/A'}"`);
        console.log(`   channelId: "${result.metadata?.channelId || 'N/A'}"`);
        console.log(`   channelUrl: "${result.metadata?.channelUrl || 'N/A'}"`);
        console.log(`   author 정보: ${JSON.stringify(result.metadata?.author || {}, null, 2)}`);

        // VideoProcessor의 buildChannelUrlByPlatform 함수 테스트
        if (result.metadata?.channelId || result.metadata?.author?.nickname) {
            console.log('\n🔧 buildChannelUrlByPlatform 함수 호출 테스트:');
            const channelId = result.metadata?.channelId || result.metadata?.author?.nickname || result.metadata?.author?.uniqueId;
            console.log(`   입력 channelId: "${channelId}"`);

            // 실제 함수 호출이 어떻게 되는지 확인
            console.log(`   예상 channelUrl: https://www.tiktok.com/@${channelId}`);
        }

    } catch (error) {
        console.error(`❌ 테스트 실패: ${error.message}`);
    }
}

debugChannelUrl();