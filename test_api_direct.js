const http = require('http');

async function testApiDirect() {
    console.log('🔍 /api/videos API 직접 테스트...\n');

    try {
        const result = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/videos?fromTrending=false&limit=3',
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
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
            req.end();
        });

        console.log('✅ API 응답 성공!');
        console.log(`📊 총 비디오 수: ${result.totalCount || 0}`);
        console.log(`📊 반환된 비디오 수: ${result.videos ? result.videos.length : 0}\n`);

        console.log('🔍 전체 API 응답 구조:');
        console.log(JSON.stringify(result, null, 2));

        if (result.videos && result.videos.length > 0) {
            result.videos.forEach((video, index) => {
                console.log(`${index + 1}. ${video.title || 'N/A'}`);
                console.log(`   플랫폼: ${video.platform || 'N/A'}`);
                console.log(`   채널명: ${video.channelName || 'N/A'}`);
                console.log(`   채널URL: "${video.channelUrl || ''}"`);
                console.log(`   생성일: ${video.createdAt || 'N/A'}\n`);
            });
        } else {
            console.log('❌ 비디오가 없습니다.');
        }

    } catch (error) {
        console.error(`❌ 테스트 실패: ${error.message}`);
    }
}

testApiDirect();