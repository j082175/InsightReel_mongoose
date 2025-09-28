const axios = require('axios');

async function testLatestVideo() {
    try {
        const response = await axios.get('http://localhost:3000/api/videos?limit=1');
        console.log('✅ 최근 비디오 데이터:');

        if (response.data.data && response.data.data.length > 0) {
            const video = response.data.data[0];
            console.log('Title:', video.title);
            console.log('ChannelName:', video.channelName);
            console.log('Subscribers:', video.subscribers);
            console.log('ChannelVideos:', video.channelVideos);
            console.log('Views:', video.views);
            console.log('Platform:', video.platform);
            console.log('\n전체 데이터:', JSON.stringify(video, null, 2));
        } else {
            console.log('❌ 저장된 비디오가 없습니다.');
        }
    } catch (error) {
        console.error('❌ 오류:', error.response?.data || error.message);
    }
}

testLatestVideo();