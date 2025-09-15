const axios = require('axios');

async function testFixedQuickCollection() {
    try {
        console.log('🔍 수정된 빠른 수집 모드 테스트 시작...');

        // 다른 채널로 테스트 (기존 채널과 중복 방지)
        const response = await axios.post('http://localhost:3000/api/channel-queue/add', {
            channelIdentifier: '@sesame_st',  // 세서미 스트리트 채널
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

            // 작업 상태 확인 (더 긴 시간 대기)
            setTimeout(async () => {
                try {
                    const statusResponse = await axios.get(`http://localhost:3000/api/channel-queue/job/${response.data.jobId}`);
                    console.log('📊 작업 상태:', JSON.stringify(statusResponse.data, null, 2));

                    // 채널 데이터 확인
                    if (statusResponse.data.success && statusResponse.data.job.status === 'completed') {
                        const channelResponse = await axios.get('http://localhost:3000/api/channels');
                        if (channelResponse.data.success && channelResponse.data.data.length > 0) {
                            const latestChannel = channelResponse.data.data[0];
                            console.log('📊 저장된 채널 통계:');
                            console.log(`- averageViewsPerVideo: ${latestChannel.averageViewsPerVideo || 'undefined'}`);
                            console.log(`- dailyUploadRate: ${latestChannel.dailyUploadRate || 'undefined'}`);
                            console.log(`- avgDurationSeconds: ${latestChannel.avgDurationSeconds || 'undefined'}`);
                            console.log(`- totalVideos: ${latestChannel.totalVideos || 'undefined'}`);
                        }
                    }
                } catch (error) {
                    console.error('❌ 상태 확인 실패:', error.message);
                }
            }, 10000); // 10초 대기
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.response?.data || error.message);
    }
}

testFixedQuickCollection();