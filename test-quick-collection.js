const axios = require('axios');

async function testQuickCollection() {
    try {
        console.log('🔍 빠른 수집 모드 테스트 시작...');

        const response = await axios.post('http://localhost:3000/api/channel-queue/add', {
            channelIdentifier: '@newjinya',
            keywords: [],
            options: {
                skipAIAnalysis: true
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ API 응답:', response.data);

        if (response.data.success) {
            console.log(`📋 작업 ID: ${response.data.jobId}`);

            // 작업 상태 확인
            setTimeout(async () => {
                try {
                    const statusResponse = await axios.get(`http://localhost:3000/api/channel-queue/job/${response.data.jobId}`);
                    console.log('📊 작업 상태:', statusResponse.data);
                } catch (error) {
                    console.error('❌ 상태 확인 실패:', error.message);
                }
            }, 5000);
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.response?.data || error.message);
    }
}

testQuickCollection();