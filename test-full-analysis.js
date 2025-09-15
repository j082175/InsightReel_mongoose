const axios = require('axios');

async function testFullAnalysis() {
    try {
        console.log('🔍 완전 분석 모드 테스트 시작...');

        // 완전 분석 모드 테스트 (다른 채널로)
        const response = await axios.post('http://localhost:3000/api/channel-queue/add', {
            channelIdentifier: '@kurzgesagt',  // 새로운 채널
            keywords: [],
            options: {
                skipAIAnalysis: false  // 완전 분석 모드
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ API 응답:', response.data);

        if (response.data.success) {
            console.log(`📋 작업 ID: ${response.data.jobId}`);

            // 작업 상태 주기적 확인
            const checkStatus = async () => {
                try {
                    const statusResponse = await axios.get(`http://localhost:3000/api/channel-queue/job/${response.data.jobId}`);
                    console.log(`📊 현재 상태: ${statusResponse.data.job.status}`);

                    if (statusResponse.data.job.progress) {
                        console.log(`진행률: ${statusResponse.data.job.progress.current}/${statusResponse.data.job.progress.total}`);
                        console.log(`메시지: ${statusResponse.data.job.progress.message}`);
                    }

                    if (statusResponse.data.job.status === 'completed') {
                        console.log('✅ 분석 완료!');
                        console.log('📊 결과:', JSON.stringify(statusResponse.data.job.result, null, 2));

                        // 저장된 채널 데이터 확인
                        setTimeout(async () => {
                            const channelsResponse = await axios.get('http://localhost:3000/api/channels?limit=1&sortBy=createdAt');
                            if (channelsResponse.data.success && channelsResponse.data.data.channels.length > 0) {
                                const latestChannel = channelsResponse.data.data.channels[0];
                                console.log('\n📊 저장된 채널 통계:');
                                console.log(`- 채널명: ${latestChannel.name}`);
                                console.log(`- 구독자: ${latestChannel.subscribers?.toLocaleString()}`);
                                console.log(`- averageViewsPerVideo: ${latestChannel.averageViewsPerVideo}`);
                                console.log(`- dailyUploadRate: ${latestChannel.dailyUploadRate}`);
                                console.log(`- avgDurationSeconds: ${latestChannel.avgDurationSeconds}`);
                                console.log(`- totalVideos: ${latestChannel.totalVideos}`);
                                console.log(`- shortFormRatio: ${latestChannel.shortFormRatio}`);

                                if (latestChannel.viewsByPeriod) {
                                    console.log('- viewsByPeriod:', latestChannel.viewsByPeriod);
                                }
                            }
                        }, 2000);

                        return;
                    } else if (statusResponse.data.job.status === 'failed') {
                        console.error('❌ 분석 실패:', statusResponse.data.job.error);
                        return;
                    } else {
                        // 계속 진행 중이면 5초 후 다시 확인
                        setTimeout(checkStatus, 5000);
                    }
                } catch (error) {
                    console.error('❌ 상태 확인 실패:', error.message);
                }
            };

            // 첫 번째 상태 확인
            setTimeout(checkStatus, 3000);
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.response?.data || error.message);
    }
}

testFullAnalysis();