const axios = require('axios');

async function checkPewDiePie() {
    try {
        console.log('🔍 PewDiePie 채널 확인...');

        const response = await axios.get('http://localhost:3000/api/channels?limit=10&sortBy=createdAt');

        if (response.data.success && response.data.data.channels) {
            console.log(`📊 총 ${response.data.data.channels.length}개 채널:`);

            // 모든 채널 표시
            response.data.data.channels.forEach((ch, index) => {
                console.log(`\n${index + 1}. ${ch.name}`);
                console.log(`   - channelId: ${ch.channelId}`);
                console.log(`   - 구독자: ${ch.subscribers?.toLocaleString()}`);
                console.log(`   - averageViewsPerVideo: ${ch.averageViewsPerVideo || 0}`);
                console.log(`   - dailyUploadRate: ${ch.dailyUploadRate || 0}`);
                console.log(`   - totalVideos: ${ch.totalVideos || 0}`);
                console.log(`   - createdAt: ${ch.createdAt}`);
                console.log(`   - aiTags: ${ch.aiTags?.length || 0}개`);
            });

            // PewDiePie 채널 찾기
            const pewdieChannel = response.data.data.channels.find(ch =>
                ch.name && (ch.name.includes('PewDiePie') || ch.name.includes('pewdiepie'))
            );

            if (pewdieChannel) {
                console.log('\n✅ PewDiePie 채널 발견!');
                console.log('📊 상세 통계:');
                console.log(`- averageViewsPerVideo: ${pewdieChannel.averageViewsPerVideo}`);
                console.log(`- dailyUploadRate: ${pewdieChannel.dailyUploadRate}`);
                console.log(`- avgDurationSeconds: ${pewdieChannel.avgDurationSeconds}`);
                console.log(`- totalVideos: ${pewdieChannel.totalVideos}`);

                const hasProblemsFields = !pewdieChannel.averageViewsPerVideo ||
                                        pewdieChannel.averageViewsPerVideo === 0 ||
                                        !pewdieChannel.totalVideos;

                if (hasProblemsFields) {
                    console.log('❌ 통계 필드에 문제가 있습니다!');
                } else {
                    console.log('✅ 모든 통계가 정상입니다!');
                }
            } else {
                console.log('\n❌ PewDiePie 채널을 찾을 수 없습니다.');
            }
        }

    } catch (error) {
        console.error('❌ 확인 실패:', error.response?.data || error.message);
    }
}

checkPewDiePie();