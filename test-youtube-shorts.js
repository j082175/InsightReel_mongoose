const axios = require('axios');

async function testYouTubeShorts() {
    try {
        // 실제 YouTube Shorts URL로 테스트
        const shortsUrl = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';

        console.log('🔍 YouTube Shorts 영상 처리 시작:', shortsUrl);

        const response = await axios.post('http://localhost:3000/api/process-video', {
            url: shortsUrl
        });

        console.log('✅ 처리 성공!');
        console.log('응답 데이터:', JSON.stringify(response.data, null, 2));

        // 저장된 데이터 확인
        setTimeout(async () => {
            try {
                const videoResponse = await axios.get('http://localhost:3000/api/videos?limit=1');

                if (videoResponse.data.data && videoResponse.data.data.length > 0) {
                    const video = videoResponse.data.data[0];
                    console.log('\n📊 저장된 비디오 데이터:');
                    console.log('Title:', video.title);
                    console.log('ChannelName:', video.channelName);
                    console.log('👥 Subscribers:', video.subscribers, '(목표: 실제 값)');
                    console.log('📹 ChannelVideos:', video.channelVideos, '(목표: 실제 값)');
                    console.log('👀 Views:', video.views);
                    console.log('📱 Platform:', video.platform);

                    if (video.subscribers === 0 || video.channelVideos === 0) {
                        console.log('\n❌ 문제 발견: subscribers 또는 channelVideos가 0으로 저장됨');
                    } else {
                        console.log('\n✅ 성공: 채널 정보가 정상적으로 저장됨');
                    }
                } else {
                    console.log('\n❌ 저장된 비디오가 없습니다.');
                }
            } catch (error) {
                console.error('\n❌ 비디오 조회 오류:', error.response?.data || error.message);
            }
        }, 3000);

    } catch (error) {
        console.error('❌ 처리 오류:', error.response?.data || error.message);
    }
}

testYouTubeShorts();