const http = require('http');

async function testNewShortsAPI() {
    try {
        console.log('🎬 새로운 YouTube Shorts API 테스트 시작...');
        console.log('🔗 URL: https://www.youtube.com/shorts/9SMa_T9Amhc');

        const postData = JSON.stringify({
            platform: 'YOUTUBE',
            videoUrl: 'https://www.youtube.com/shorts/9SMa_T9Amhc',
            postUrl: 'https://www.youtube.com/shorts/9SMa_T9Amhc',
            useAI: true,
            analysisType: 'quick'
        });

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

        return new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                console.log('✅ API 응답 받음!');
                console.log('📊 상태코드:', res.statusCode);

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    console.log('📄 응답 길이:', data.length, 'bytes');
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('🎯 성공:', jsonData.success);
                        console.log('💬 메시지:', jsonData.message);
                        if (jsonData.data) {
                            console.log('📊 데이터:', JSON.stringify(jsonData.data, null, 2));
                        }
                        resolve(jsonData);
                    } catch (e) {
                        console.log('⚠️ JSON 파싱 실패, 원본 응답 일부:', data.substring(0, 500));
                        resolve({ raw: data });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ API 테스트 실패:', error.message);
                console.log('💡 서버 로그를 확인하세요. 서버가 요청을 받고 처리 중일 수 있습니다.');
                reject(error);
            });

            req.setTimeout(10000, () => {
                console.log('⏰ 요청 타임아웃 (10초)');
                req.destroy();
                resolve({ timeout: true });
            });

            req.write(postData);
            req.end();
        });

    } catch (error) {
        console.error('❌ API 테스트 실패:', error.message);
        return { error: error.message };
    }
}

// 테스트 실행
testNewShortsAPI().then(result => {
    console.log('🏁 테스트 완료');
    if (result.timeout) {
        console.log('⏰ 테스트 타임아웃됨. 서버 로그에서 처리 결과를 확인하세요.');
    }
});