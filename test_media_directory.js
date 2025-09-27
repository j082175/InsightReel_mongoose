const http = require('http');

async function testMediaDirectory() {
    console.log('📁 미디어 디렉토리 테스트 시작...\n');

    // 실제 작동하는 YouTube URL로 테스트
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // 다른 테스트 영상

    console.log(`📍 테스트 URL: ${testUrl}`);
    console.log('🔄 서버에 요청 전송 중...\n');

    try {
        // API 호출
        const postData = JSON.stringify({
            url: testUrl,
            skipVideoDownload: true,  // 비디오 다운로드 건너뛰기
            skipThumbnailGeneration: false  // 썸네일 다운로드는 허용
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
        console.log(`  - 제목: ${result.metadata?.title || 'N/A'}`);
        console.log(`  - 조회수: ${result.metadata?.views || 'N/A'}`);
        console.log(`  - 썸네일 URL: ${result.metadata?.thumbnailUrl || 'N/A'}`);

        // 썸네일 URL이 새로운 media 경로인지 확인
        if (result.metadata?.thumbnailUrl) {
            const isMediaThumbnail = result.metadata.thumbnailUrl.includes('localhost:3000/media');
            if (isMediaThumbnail) {
                console.log('\n✅ ✅ ✅ 새로운 media 디렉토리 성공! ✅ ✅ ✅');
                console.log(`미디어 썸네일 URL: ${result.metadata.thumbnailUrl}`);
            } else {
                console.log('\n⚠️ 썸네일이 기존 downloads 경로를 사용 중입니다.');
                console.log(`썸네일 URL: ${result.metadata.thumbnailUrl}`);
            }
        } else {
            console.log('\n⚠️ 썸네일 URL이 없습니다.');
        }

        if (result.mongodb?._id || result.mongoId) {
            console.log('\n✅ ✅ ✅ DB 저장 성공! ✅ ✅ ✅');
            console.log(`MongoDB에 저장된 문서 ID: ${result.mongodb?._id || result.mongoId}`);
        } else {
            console.log('\n⚠️ DB 저장 확인 필요');
        }

    } catch (error) {
        console.error(`\n❌ 테스트 실패: ${error.message}`);
        console.error('서버가 실행 중인지 확인하세요 (npm run dev)');
    }
}

// 즉시 실행
testMediaDirectory();