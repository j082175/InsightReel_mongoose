const http = require('http');

async function testInstagramDB() {
    console.log('🎬 Instagram DB 저장 테스트 시작...\n');

    // 테스트용 Instagram Reels URL (새로운 테스트)
    const testUrl = 'https://www.instagram.com/reels/DBKFoGkPQmr/';

    console.log(`📍 테스트 URL: ${testUrl}`);
    console.log('🔄 서버에 요청 전송 중...\n');

    try {
        // API 호출
        const postData = JSON.stringify({
            url: testUrl,
            skipVideoDownload: true,  // 비디오 다운로드 건너뛰기
            skipThumbnailGeneration: true  // 썸네일 생성 건너뛰기
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
        console.log('📊 결과 요약:');
        console.log(`  - 플랫폼: ${result.platform || 'N/A'}`);
        console.log(`  - MongoDB ID: ${result.mongodb?._id || result.mongoId || 'N/A'}`);
        console.log(`  - 채널명: ${result.metadata?.channelName || 'N/A'}`);
        console.log(`  - 조회수: ${result.metadata?.views || 'N/A'}`);
        console.log(`  - 좋아요: ${result.metadata?.likes || 'N/A'}`);

        if (result.mongodb?._id || result.mongoId) {
            console.log('\n✅ ✅ ✅ DB 저장 성공! ✅ ✅ ✅');
            console.log(`MongoDB에 저장된 문서 ID: ${result.mongodb?._id || result.mongoId}`);
        } else {
            console.log('\n⚠️ DB 저장 확인 필요');
            console.log('전체 응답 확인:');
            console.log(JSON.stringify(result, null, 2));
        }

        // MongoDB 직접 확인을 위한 가이드
        console.log('\n📝 MongoDB에서 직접 확인하려면:');
        console.log('1. MongoDB Compass 또는 Shell 열기');
        console.log('2. videos 컬렉션에서 다음 쿼리 실행:');
        console.log(`   db.videos.findOne({ platform: "INSTAGRAM", url: "${testUrl}" })`);

    } catch (error) {
        console.error(`\n❌ 테스트 실패: ${error.message}`);
        console.error('서버가 실행 중인지 확인하세요 (npm run dev)');
    }
}

// 즉시 실행
testInstagramDB();