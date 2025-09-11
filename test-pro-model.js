const http = require('http');

// 채널 분석 요청 함수
function testChannelAnalysis() {
    const postData = JSON.stringify({
        channelIdentifier: '@김나영의노가리',
        keywords: ['테스트']
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/collect-channel',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('🚀 채널 분석 테스트 시작: @김나영의노가리');
    console.log('📊 이전 사용량 - Pro: 0, Flash: 0, Flash-Lite: 32');
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('✅ 응답 상태:', res.statusCode);
            console.log('📝 응답 데이터:', data);
        });
    });

    req.on('error', (error) => {
        console.error('❌ 요청 오류:', error);
    });

    req.write(postData);
    req.end();
}

// 테스트 실행
testChannelAnalysis();