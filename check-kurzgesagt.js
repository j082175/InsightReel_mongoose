const axios = require('axios');

async function checkKurzgesagt() {
    try {
        console.log('🔍 Kurzgesagt 채널 데이터 확인...');

        // 채널 ID로 직접 검색
        const response = await axios.get('http://localhost:3000/api/channels?limit=10&sortBy=createdAt');

        if (response.data.success && response.data.data.channels) {
            console.log(`📊 총 ${response.data.data.channels.length}개 채널 발견`);

            // Kurzgesagt 채널 찾기
            const kurzgesagtChannel = response.data.data.channels.find(ch =>
                ch.name && ch.name.includes('Kurzgesagt')
            );

            if (kurzgesagtChannel) {
                console.log('✅ Kurzgesagt 채널 발견!');
                console.log(`- 채널명: ${kurzgesagtChannel.name}`);
                console.log(`- 채널ID: ${kurzgesagtChannel.channelId}`);
                console.log(`- 구독자: ${kurzgesagtChannel.subscribers?.toLocaleString()}`);
                console.log(`- averageViewsPerVideo: ${kurzgesagtChannel.averageViewsPerVideo || '없음'}`);
                console.log(`- dailyUploadRate: ${kurzgesagtChannel.dailyUploadRate || '없음'}`);
                console.log(`- avgDurationSeconds: ${kurzgesagtChannel.avgDurationSeconds || '없음'}`);
                console.log(`- totalVideos: ${kurzgesagtChannel.totalVideos || '없음'}`);
                console.log(`- shortFormRatio: ${kurzgesagtChannel.shortFormRatio || '없음'}`);
                console.log(`- contentType: ${kurzgesagtChannel.contentType || '없음'}`);
                console.log(`- aiTags: ${kurzgesagtChannel.aiTags?.length || 0}개`);

                if (kurzgesagtChannel.viewsByPeriod) {
                    console.log('- viewsByPeriod:', kurzgesagtChannel.viewsByPeriod);
                }

                // 문제가 있는 필드들 확인
                const problemFields = [];
                if (!kurzgesagtChannel.averageViewsPerVideo || kurzgesagtChannel.averageViewsPerVideo === 0) problemFields.push('averageViewsPerVideo');
                if (!kurzgesagtChannel.dailyUploadRate || kurzgesagtChannel.dailyUploadRate === 0) problemFields.push('dailyUploadRate');
                if (!kurzgesagtChannel.avgDurationSeconds || kurzgesagtChannel.avgDurationSeconds === 0) problemFields.push('avgDurationSeconds');
                if (!kurzgesagtChannel.totalVideos || kurzgesagtChannel.totalVideos === 0) problemFields.push('totalVideos');

                if (problemFields.length > 0) {
                    console.log(`❌ 문제가 있는 필드: ${problemFields.join(', ')}`);
                } else {
                    console.log('✅ 모든 통계 필드가 정상입니다!');
                }
            } else {
                console.log('❌ Kurzgesagt 채널을 찾을 수 없습니다.');
                console.log('📋 현재 채널 목록:');
                response.data.data.channels.forEach((ch, index) => {
                    console.log(`${index + 1}. ${ch.name} (${ch.channelId})`);
                });
            }
        }

    } catch (error) {
        console.error('❌ 확인 실패:', error.response?.data || error.message);
    }
}

checkKurzgesagt();