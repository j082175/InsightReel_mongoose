const http = require('http');

async function testShortsAPI() {
    try {
        console.log('🎬 YouTube Shorts API 테스트 시작...');

        const postData = JSON.stringify({
            platform: 'YOUTUBE',
            videoUrl: 'https://www.youtube.com/shorts/JtU15NnX9M0',
            postUrl: 'https://www.youtube.com/shorts/JtU15NnX9M0',
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

        const req = http.request(options, (res) => {
            console.log('✅ API 응답 받음!');
            console.log('📊 상태코드:', res.statusCode);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('📄 응답 데이터:', data);
                try {
                    const jsonData = JSON.parse(data);
                    console.log('🎯 처리 결과:', JSON.stringify(jsonData, null, 2));
                } catch (e) {
                    console.log('⚠️ JSON 파싱 실패, 원본 응답:', data);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ API 테스트 실패:', error.message);
        });

        req.write(postData);
        req.end();

    } catch (error) {
        console.error('❌ API 테스트 실패:', error.message);
    }
}

testShortsAPI();