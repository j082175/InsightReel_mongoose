const axios = require('axios');

async function testYouTubeShorts() {
    console.log('🎬 Testing YouTube Shorts with new pipeline...');
    console.log('URL: https://www.youtube.com/shorts/GhuSrLs0lS8');

    try {
        const response = await axios.post('http://localhost:3000/api/process-video', {
            platform: 'YOUTUBE',
            videoUrl: 'https://www.youtube.com/shorts/GhuSrLs0lS8',
            analysisType: 'multi-frame',
            useAI: true  // Enable AI for more comprehensive test
        }, {
            timeout: 60000  // Longer timeout for AI processing
        });

        console.log('✅ YouTube Shorts test successful!');
        console.log('Response status:', response.status);
        console.log('Processing time:', response.data.processingTime + 'ms');

        const result = response.data.data;

        console.log('\n📊 Shorts Processing Results:');
        console.log(`📹 Title: ${result.title || 'N/A'}`);
        console.log(`⏱️  Duration: ${result.duration} seconds (${result.duration <= 60 ? 'SHORT' : 'LONG'})`);
        console.log(`👀 Views: ${result.views || 'N/A'}`);
        console.log(`👤 Channel: ${result.channelName || 'N/A'}`);
        console.log(`📁 Content Type: ${result.contentType || 'N/A'}`);

        console.log('\n🎯 Pipeline Stage Results:');
        console.log(`✅ Video Download: ${result.videoPath ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Thumbnail: ${result.thumbnailPath ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ AI Analysis: ${result.category !== '분석 안함' ? 'SUCCESS' : 'SKIPPED'}`);
        console.log(`✅ Data Saving: ${result.duration > 0 ? 'SUCCESS' : 'FAILED'}`);

        if (result.category !== '분석 안함') {
            console.log('\n🤖 AI Analysis Results:');
            console.log(`📂 Category: ${result.mainCategory} > ${result.middleCategory}`);
            console.log(`🏷️  Keywords: ${result.keywords?.length || 0} found`);
            console.log(`#️⃣  Hashtags: ${result.hashtags?.length || 0} found`);
            console.log(`🎯 Confidence: ${result.confidence}%`);
            console.log(`🖼️  Frames Analyzed: ${result.frameCount}`);
        }

        // Test specific Shorts features
        console.log('\n📱 Shorts-Specific Checks:');
        console.log(`- Short Duration: ${result.duration <= 60 ? '✅' : '❌'}`);
        console.log(`- Vertical Format: ${result.thumbnailPath?.includes('shorts') ? '✅' : '🔍 Check needed'}`);
        console.log(`- Multi-frame Analysis: ${result.analysisType === 'multi-frame' ? '✅' : '❌'}`);

    } catch (error) {
        console.log('❌ YouTube Shorts test failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else if (error.code === 'ECONNABORTED') {
            console.log('⏱️ Request timed out - processing may still be happening');
        } else {
            console.log('Error:', error.message);
        }
    }
}

testYouTubeShorts();