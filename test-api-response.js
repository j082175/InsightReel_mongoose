const axios = require('axios');

async function testApiResponse() {
    try {
        console.log('🔍 API 응답 구조 분석 시작...');
        const response = await axios.get('http://localhost:3000/api/videos?limit=5');

        console.log('✅ API 응답 상태:', response.status);
        console.log('📊 전체 응답 구조:', JSON.stringify(response.data, null, 2));

        // 응답의 모든 키를 확인
        console.log('\n🔍 응답 데이터의 키들:', Object.keys(response.data));

        // data 필드가 있는지 확인
        if (response.data.data) {
            console.log('📋 data 배열 길이:', response.data.data.length);
            console.log('📋 data 배열 타입:', Array.isArray(response.data.data));

            if (response.data.data.length > 0) {
                console.log('\n📹 첫 번째 비디오:', JSON.stringify(response.data.data[0], null, 2));
            }
        }

        // videos 필드가 있는지 확인
        if (response.data.videos) {
            console.log('📋 videos 배열 길이:', response.data.videos.length);
            console.log('📋 videos 배열 타입:', Array.isArray(response.data.videos));
        }

    } catch (error) {
        console.error('❌ 오류:', error.response?.data || error.message);
        console.error('상세 오류:', error.response?.status, error.response?.statusText);
    }
}

testApiResponse();