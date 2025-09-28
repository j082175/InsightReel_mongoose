const axios = require('axios');

async function testPipelineDetailed() {
    console.log('🧪 Testing new pipeline with detailed response check...');

    try {
        const response = await axios.post('http://localhost:3000/api/process-video', {
            platform: 'YOUTUBE',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            analysisType: 'single',
            useAI: false
        }, {
            timeout: 30000
        });

        console.log('✅ Pipeline test successful!');
        console.log('Response status:', response.status);
        console.log('\n📊 Response structure:');
        console.log(JSON.stringify(response.data, null, 2));

        // Check if all pipeline stages worked
        const result = response.data.data; // Access nested data
        if (result.videoPath) {
            console.log('\n✅ Stage 1 - Video Download: SUCCESS');
        }
        if (result.thumbnailPath) {
            console.log('✅ Stage 2 - Thumbnail Processing: SUCCESS');
        }
        if (result.category && result.mainCategory) {
            console.log('✅ Stage 3 - Analysis: SUCCESS (with defaults)');
        }
        if (result.duration > 0) {
            console.log('✅ Stage 4 - Data Saving: SUCCESS');
        }

        console.log('\n🎯 Key Results:');
        console.log(`- Video: ${result.videoPath ? 'Downloaded' : 'Failed'}`);
        console.log(`- Thumbnail: ${result.thumbnailPath ? 'Processed' : 'Failed'}`);
        console.log(`- Duration: ${result.duration} seconds`);
        console.log(`- Category: ${result.mainCategory}`);
        console.log(`- Hashtags: ${result.hashtags?.length || 0} found`);

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

testPipelineDetailed();