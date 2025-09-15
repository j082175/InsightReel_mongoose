const axios = require('axios');

async function testFixedLogic() {
    try {
        console.log('🔍 수정된 로직 테스트 시작...');

        // 다양한 시나리오 테스트
        const testCases = [
            {
                name: '빠른 수집 모드',
                channelIdentifier: '@PewDiePie',
                options: { skipAIAnalysis: true },
                expectedBehavior: '기본 통계: ✅, AI 분석: ❌'
            },
            {
                name: '완전 분석 모드',
                channelIdentifier: '@MrBeast',
                options: { skipAIAnalysis: false },
                expectedBehavior: '기본 통계: ✅, AI 분석: ✅'
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n📊 테스트 케이스: ${testCase.name}`);
            console.log(`🎯 예상 동작: ${testCase.expectedBehavior}`);

            try {
                const response = await axios.post('http://localhost:3000/api/channel-queue/add', {
                    channelIdentifier: testCase.channelIdentifier,
                    keywords: [],
                    options: testCase.options
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.data.success) {
                    console.log(`✅ 큐 추가 성공: ${response.data.jobId}`);

                    // 잠시 대기 후 상태 확인
                    await new Promise(resolve => setTimeout(resolve, 8000));

                    const statusResponse = await axios.get(`http://localhost:3000/api/channel-queue/job/${response.data.jobId}`);

                    if (statusResponse.data.success) {
                        const job = statusResponse.data.job;
                        console.log(`📋 상태: ${job.status}`);

                        if (job.status === 'completed' && job.result) {
                            console.log(`✅ 결과: ${job.result.name} (구독자: ${job.result.subscribers?.toLocaleString()})`);
                            console.log(`🤖 AI 태그: ${job.result.aiTags?.length || 0}개`);
                        } else if (job.status === 'failed') {
                            console.log(`❌ 실패: ${job.error}`);
                        } else {
                            console.log(`⏳ 진행 중... (${job.progress?.current}/${job.progress?.total})`);
                        }
                    }
                } else {
                    console.log(`❌ 큐 추가 실패: ${response.data.message}`);
                }
            } catch (error) {
                console.error(`❌ 테스트 실패: ${error.response?.data?.message || error.message}`);
            }

            // 테스트 간 간격
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n🔍 최신 채널 데이터 확인...');
        const channelsResponse = await axios.get('http://localhost:3000/api/channels?limit=3&sortBy=createdAt');

        if (channelsResponse.data.success) {
            console.log(`📊 총 ${channelsResponse.data.data.channels.length}개 채널:`);
            channelsResponse.data.data.channels.forEach((ch, index) => {
                console.log(`${index + 1}. ${ch.name} - avgViews: ${ch.averageViewsPerVideo || 0}, aiTags: ${ch.aiTags?.length || 0}개`);
            });
        }

    } catch (error) {
        console.error('❌ 전체 테스트 실패:', error.message);
    }
}

testFixedLogic();