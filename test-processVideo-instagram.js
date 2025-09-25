const VideoProcessor = require('./server/services/VideoProcessor');
const { PLATFORMS } = require('./server/config/api-messages');

async function testInstagramProcessVideo() {
    console.log('🧪 Instagram processVideo 테스트 시작...');

    try {
        const processor = new VideoProcessor();
        await processor.initialize();

        const testUrl = 'https://www.instagram.com/reel/DOf5jTKjC4t/';

        console.log(`📸 테스트 URL: ${testUrl}`);

        const result = await processor.processVideo({
            url: testUrl,
            platform: PLATFORMS.INSTAGRAM,
            metadata: { source: 'test' }
        });

        console.log('✅ 테스트 성공!');
        console.log('📊 결과:', {
            title: result.title,
            views: result.views,
            platform: result.platform,
            channelName: result.channelName,
            subscribers: result.subscriberCount
        });

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    }
}

testInstagramProcessVideo();