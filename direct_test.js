const http = require('http');

function sendRequest(url) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            platform: 'YOUTUBE',
            videoUrl: url,
            postUrl: url,
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
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
}

async function testURL() {
    const testUrl = 'https://www.youtube.com/shorts/JtU15NnX9M0';
    console.log(`🎬 테스트 시작: ${testUrl}`);

    try {
        const result = await sendRequest(testUrl);
        console.log('✅ 응답 받음!');
        console.log('📊 상태코드:', result.statusCode);
        console.log('📄 응답 길이:', result.data.length, 'bytes');

        // JSON 파싱 시도
        try {
            const jsonData = JSON.parse(result.data);
            console.log('🎯 성공:', jsonData.success);
            console.log('💬 메시지:', jsonData.message);
        } catch (e) {
            console.log('⚠️ JSON 파싱 실패, 원본 응답 일부:', result.data.substring(0, 200));
        }
    } catch (error) {
        console.log('❌ 테스트 실패:', error.message);
        console.log('💡 서버 로그를 확인하세요. 서버가 요청을 받고 처리 중일 수 있습니다.');
    }
}

testURL();