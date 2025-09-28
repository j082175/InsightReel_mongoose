const axios = require('axios');

async function testLatestVideo() {
    try {
        console.log('🔍 API 테스트 시작...');
        const response = await axios.get('http://localhost:3000/api/videos?limit=5');

        console.log('✅ API 응답 상태:', response.status);
        console.log('📊 총 비디오 개수:', response.data.total || '정보 없음');
        console.log('📋 현재 페이지 개수:', response.data.data ? response.data.data.length : 0);

        if (response.data.data && response.data.data.length > 0) {
            console.log('\n📹 비디오 목록:');
            response.data.data.forEach((video, index) => {
                console.log(`\n--- 비디오 ${index + 1} ---`);
                console.log('ID:', video._id);
                console.log('Title:', video.title);
                console.log('URL:', video.url);
                console.log('Platform:', video.platform);
                console.log('ChannelName:', video.channelName);
                console.log('Views:', video.views);
                console.log('Subscribers:', video.subscribers);
                console.log('ChannelVideos:', video.channelVideos);
                console.log('MiddleCategory:', video.middleCategory);
                console.log('Keywords:', video.keywords);
                console.log('CreatedAt:', video.createdAt);
                console.log('UpdatedAt:', video.updatedAt);
            });
        } else {
            console.log('❌ 저장된 비디오가 없습니다.');
        }
    } catch (error) {
        console.error('❌ 오류:', error.response?.data || error.message);
        console.error('상세 오류:', error.response?.status, error.response?.statusText);
    }
}

testLatestVideo();