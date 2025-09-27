const http = require('http');

async function checkRecentVideo() {
    console.log('📊 최근 처리된 비디오 데이터 확인...\n');

    try {
        const result = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/videos?fromTrending=false&limit=10&sortBy=createdAt&sortOrder=desc',
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

        console.log('✅ 최근 비디오 데이터 조회 성공!\n');

        if (result.data && result.data.length > 0) {
            console.log(`📊 최근 처리된 ${result.data.length}개 비디오:\n`);

            result.data.forEach((video, index) => {
                console.log(`${index + 1}. [${video.platform || 'N/A'}] ${video.title || 'N/A'}`);
                console.log(`   채널명: ${video.channelName || 'N/A'}`);
                console.log(`   채널URL: "${video.channelUrl || ''}"`);
                console.log(`   원본URL: ${video.url || 'N/A'}`);
                console.log(`   처리일시: ${video.createdAt || 'N/A'}`);

                if (video.channelUrl && video.channelUrl !== '') {
                    console.log('   ✅ 채널 URL 저장됨');

                    // URL 형식 검증
                    if (video.platform === 'INSTAGRAM' && video.channelUrl.includes('instagram.com')) {
                        console.log('   ✅ Instagram 채널 URL 형식 올바름');
                    } else if (video.platform === 'TIKTOK' && video.channelUrl.includes('tiktok.com/@')) {
                        console.log('   ✅ TikTok 채널 URL 형식 올바름');
                    } else if (video.platform === 'YOUTUBE' && video.channelUrl.includes('youtube.com')) {
                        console.log('   ✅ YouTube 채널 URL 형식 올바름');
                    }
                } else {
                    console.log('   ❌ 채널 URL이 저장되지 않음');
                }
                console.log('');
            });
        } else {
            console.log('❌ 처리된 비디오가 없습니다.');
        }

    } catch (error) {
        console.error(`❌ 데이터 조회 실패: ${error.message}`);
    }
}

checkRecentVideo();