const http = require('http');

async function testTypeScriptServer() {
    try {
        console.log('🚀 TypeScript 서버 테스트 시작...');
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
                console.log('✅ TypeScript 서버 응답 받음!');
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
                        if (jsonData.error) {
                            console.log('❌ 에러:', jsonData.error);
                        }
                        if (jsonData.data) {
                            console.log('📊 데이터:');
                            console.log('  - ID:', jsonData.data._id);
                            console.log('  - 제목:', jsonData.data.title);
                            console.log('  - 조회수:', jsonData.data.views);
                            console.log('  - 플랫폼:', jsonData.data.platform);
                            console.log('  - AI 분석 여부:', jsonData.data.aiAnalysis ? '✅' : '❌');
                        }
                        resolve(jsonData);
                    } catch (e) {
                        console.log('⚠️ JSON 파싱 실패, 원본 응답 일부:', data.substring(0, 500));
                        resolve({ raw: data });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ TypeScript 서버 테스트 실패:', error.message);
                reject(error);
            });

            req.setTimeout(15000, () => {
                console.log('⏰ 요청 타임아웃 (15초)');
                req.destroy();
                resolve({ timeout: true });
            });

            req.write(postData);
            req.end();
        });

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        return { error: error.message };
    }
}

// 테스트 실행
testTypeScriptServer().then(result => {
    console.log('🏁 TypeScript 서버 테스트 완료');
    if (result.timeout) {
        console.log('⏰ 테스트 타임아웃됨. 서버 로그에서 처리 결과를 확인하세요.');
    }
});