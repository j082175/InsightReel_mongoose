const http = require('http');

async function testChannelUrls() {
    console.log('🔗 채널 URL 추출 테스트 시작...\n');

    const testUrls = [
        {
            name: 'Instagram',
            url: 'https://www.instagram.com/p/DCvyInhyEW9/',
            expectedChannel: 'https://www.instagram.com/'
        }
    ];

    for (const test of testUrls) {
        console.log(`\n📍 ${test.name} 테스트`);
        console.log(`   URL: ${test.url}`);
        console.log('   🔄 서버에 요청 전송 중...');

        try {
            const postData = JSON.stringify({
                url: test.url,
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
                            console.error(`   ❌ API 에러: ${res.statusCode}`);
                            console.error(`   ${data}`);
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

            console.log('   ✅ API 응답 받음!');
            console.log('   📊 전체 응답:');
            console.log(JSON.stringify(result, null, 2));

            console.log('\n   📊 채널 정보:');
            console.log(`      - 채널명: "${result.metadata?.channelName || 'N/A'}"`);
            console.log(`      - 채널ID: "${result.metadata?.channelId || 'N/A'}"`);
            console.log(`      - 채널URL: "${result.metadata?.channelUrl || 'N/A'}"`);

            if (result.metadata?.channelUrl && result.metadata.channelUrl !== '') {
                console.log('\n   ✅ ✅ ✅ 채널 URL 생성 성공! ✅ ✅ ✅');
                console.log(`   🔗 생성된 채널 URL: "${result.metadata.channelUrl}"`);

                // URL 형식 검증
                if (result.metadata.channelUrl.startsWith(test.expectedChannel)) {
                    console.log('   ✅ URL 형식 올바름');
                } else {
                    console.log('   ⚠️ URL 형식이 예상과 다름');
                }
            } else {
                console.log('\n   ❌ 채널 URL이 생성되지 않음');
            }

        } catch (error) {
            console.error(`\n   ❌ ${test.name} 테스트 실패: ${error.message}`);
        }
    }

    console.log('\n🔗 채널 URL 테스트 완료!');
    console.log('💡 이제 비디오 URL에서 해당 채널 페이지로 바로 이동할 수 있습니다.');
}

testChannelUrls();