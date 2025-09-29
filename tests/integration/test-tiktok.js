const axios = require('axios');

async function testTikTokVideo() {
    console.log('🎵 Testing TikTok video with new pipeline...');
    console.log('URL: https://www.tiktok.com/@demiandpj/video/7535902174291692822');

    try {
        const response = await axios.post('http://localhost:3000/api/process-video', {
            platform: 'TIKTOK',
            videoUrl: 'https://www.tiktok.com/@demiandpj/video/7535902174291692822',
            analysisType: 'multi-frame',
            useAI: true
        }, {
            timeout: 90000
        });

        console.log('✅ TikTok test successful!');
        console.log('Response status:', response.status);
        console.log('Processing time:', response.data.processingTime + 'ms');

        const result = response.data.data;

        console.log('\n🎵 TikTok Processing Results:');
        console.log(`📹 Title: ${result.title || 'N/A'}`);
        console.log(`⏱️  Duration: ${result.duration} seconds`);
        console.log(`👀 Views: ${result.views || 'N/A'}`);
        console.log(`👤 Creator: ${result.channelName || 'N/A'}`);

        console.log('\n🎯 Pipeline Stage Results:');
        console.log(`✅ Video Download: ${result.videoPath ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Thumbnail: ${result.thumbnailPath ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ AI Analysis: ${result.category !== '분석 안함' ? 'SUCCESS' : 'SKIPPED'}`);
        console.log(`✅ Data Saving: ${result.duration > 0 ? 'SUCCESS' : 'FAILED'}`);

        if (result.category !== '분석 안함') {
            console.log('\n🤖 AI Analysis Results:');
            console.log(`📂 Category: ${result.mainCategory} > ${result.middleCategory}`);
            console.log(`🏷️  Keywords: ${result.keywords?.length || 0} found`);
            console.log(`🎯 Confidence: ${result.confidence}%`);
        }

        console.log('\n📱 TikTok-Specific Checks:');
        console.log(`- Short Duration: ${result.duration <= 180 ? '✅' : '❌'} (${result.duration}s)`);
        console.log(`- Multi-frame Analysis: ${result.analysisType === 'multi-frame' ? '✅' : '❌'}`);

    } catch (error) {
        console.log('❌ TikTok test failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data?.message || error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testTikTokVideo();
