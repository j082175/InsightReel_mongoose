const axios = require('axios');

async function debugAPISorting() {
    try {
        console.log('🔍 API 정렬 문제 디버깅...');

        // 다양한 정렬 옵션으로 테스트
        const sortOptions = ['createdAt', 'updatedAt', 'lastAnalyzedAt'];

        for (const sortBy of sortOptions) {
            console.log(`\n📊 ${sortBy}로 정렬된 채널 목록:`);

            const response = await axios.get(`http://localhost:3000/api/channels?limit=5&sortBy=${sortBy}`);

            if (response.data.success && response.data.data.channels) {
                response.data.data.channels.forEach((ch, index) => {
                    console.log(`${index + 1}. ${ch.name}`);
                    console.log(`   - ${sortBy}: ${ch[sortBy]}`);
                    console.log(`   - averageViewsPerVideo: ${ch.averageViewsPerVideo || 0}`);
                });
            } else {
                console.log('❌ 응답 실패');
            }
        }

        // MongoDB 직접 확인
        console.log('\n🔍 MongoDB 상태 확인...');
        const healthResponse = await axios.get('http://localhost:3000/api/database/health');
        console.log('데이터베이스 상태:', healthResponse.data);

        // 특정 채널 ID로 직접 검색
        console.log('\n🔍 PewDiePie 채널 직접 검색...');
        const pewdieResponse = await axios.get('http://localhost:3000/api/channels?search=PewDiePie');

        if (pewdieResponse.data.success && pewdieResponse.data.data.channels.length > 0) {
            const pewdie = pewdieResponse.data.data.channels[0];
            console.log('✅ PewDiePie 찾음:');
            console.log(`- averageViewsPerVideo: ${pewdie.averageViewsPerVideo}`);
            console.log(`- dailyUploadRate: ${pewdie.dailyUploadRate}`);
            console.log(`- totalVideos: ${pewdie.totalVideos}`);
            console.log(`- createdAt: ${pewdie.createdAt}`);
        } else {
            console.log('❌ PewDiePie 검색 결과 없음');
        }

    } catch (error) {
        console.error('❌ 디버깅 실패:', error.response?.data || error.message);
    }
}

debugAPISorting();