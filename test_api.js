const http = require('http');

async function testAPI() {
    try {
        console.log('🧪 API 테스트 시작...');

        const postData = JSON.stringify({
            platform: 'YOUTUBE',
            videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
            postUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
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

testAPI();