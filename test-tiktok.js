const axios = require('axios');

async function testTikTokProcessing() {
    console.log('🎯 TikTok 영상 처리 테스트 시작...');

    const testUrl = 'https://www.tiktok.com/@o1o211/video/7550768142486621447';

    try {
        const response = await axios.post('http://localhost:3000/api/process-video', {
            videoUrl: testUrl
        }, {
            timeout: 120000, // 2분 타임아웃
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 응답 성공!');
        console.log('📊 Status:', response.status);
        console.log('💾 저장된 데이터:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('❌ 에러 발생:', error.response?.status);
        console.log('📝 에러 메시지:', error.response?.data || error.message);
    }
}

testTikTokProcessing();