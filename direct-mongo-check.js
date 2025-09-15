const axios = require('axios');

async function directMongoCheck() {
    try {
        console.log('🔍 MongoDB 직접 확인...');

        // 직접 MongoDB API로 채널 데이터 확인
        const response = await axios.get('http://localhost:3000/api/channels?limit=20&sortBy=createdAt');

        console.log('📊 API 응답:', JSON.stringify(response.data, null, 2));

        // zhiphyr 채널 특정 검색
        if (response.data.success && response.data.data && response.data.data.channels) {
            const zhiphyrChannel = response.data.data.channels.find(ch => ch.name && (ch.name.includes('zhiphyr') || ch.name.includes('Zhiphyr')));
            if (zhiphyrChannel) {
                console.log('✅ zhiphyr 채널 발견:');
                console.log(`- ID: ${zhiphyrChannel._id}`);
                console.log(`- Name: ${zhiphyrChannel.name}`);
                console.log(`- Channel ID: ${zhiphyrChannel.channelId}`);
                console.log(`- Subscribers: ${zhiphyrChannel.subscribers}`);
                console.log(`- Total Videos: ${zhiphyrChannel.totalVideos}`);
                console.log(`- Total Views: ${zhiphyrChannel.totalViews}`);
                console.log(`- Platform: ${zhiphyrChannel.platform}`);
                console.log(`- Last Analyzed: ${zhiphyrChannel.lastAnalyzedAt}`);
                console.log(`- Created At: ${zhiphyrChannel.createdAt}`);
            } else {
                console.log('❌ zhiphyr 채널을 메인 DB에서 찾을 수 없습니다.');
                console.log('📋 모든 채널 목록:');
                response.data.data.channels.forEach((ch, idx) => {
                    console.log(`${idx + 1}. ${ch.name} (${ch.platform}) - ${ch.customUrl || 'URL 없음'}`);
                });
            }
        }

        // 중복검사 DB 확인
        console.log('\n🔍 중복검사 DB 확인...');
        try {
            const duplicateCheckResponse = await axios.post('http://localhost:3000/api/channel-queue/check-duplicate', {
                channelIdentifier: '@zhiphyr'
            });

            console.log('📊 중복검사 결과:', JSON.stringify(duplicateCheckResponse.data, null, 2));
        } catch (duplicateError) {
            console.error('❌ 중복검사 확인 실패:', duplicateError.response?.data || duplicateError.message);
        }

    } catch (error) {
        console.error('❌ 확인 실패:', error.response?.data || error.message);
    }
}

directMongoCheck();