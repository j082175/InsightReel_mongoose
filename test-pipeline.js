const axios = require('axios');

async function testPipeline() {
    console.log('🧪 Testing new video processing pipeline...');

    try {
        // Test simple YouTube video processing
        const response = await axios.post('http://localhost:3000/api/process-video', {
            platform: 'YOUTUBE',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            analysisType: 'single',
            useAI: false  // Disable AI to test basic pipeline
        }, {
            timeout: 30000
        });

        console.log('✅ Pipeline test successful!');
        console.log('Response status:', response.status);
        console.log('Response data keys:', Object.keys(response.data));

        if (response.data.videoPath) {
            console.log('✅ Video processing completed');
        }
        if (response.data.thumbnailPath) {
            console.log('✅ Thumbnail processing completed');
        }
        if (response.data.category) {
            console.log('✅ Analysis completed');
        }

    } catch (error) {
        console.log('❌ Pipeline test failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testPipeline();