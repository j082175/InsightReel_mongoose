const axios = require('axios');

async function testFixedFields() {
    try {
        console.log('🧪 Testing the fixes for undefined fields...');

        // Process a test video
        const response = await axios.post('http://localhost:3000/api/process-video', {
            videoUrl: 'https://www.youtube.com/shorts/8Z5EjAmZS1o',
            useAI: true,
            analysisType: 'quick'
        });

        console.log('✅ Video processing response:');
        console.log('📊 Fields to check:');
        console.log('- mainCategory:', response.data.data?.mainCategory || 'undefined');
        console.log('- hashtags:', response.data.data?.hashtags || 'undefined');
        console.log('- youtubeHandle: will check from DB');
        console.log('- categoryMatchRate: will check from DB');
        console.log('- matchType: will check from DB');
        console.log('- matchReason: will check from DB');

        // Check the latest video from database
        const dbResponse = await axios.get('http://localhost:3000/api/videos?limit=1');
        const video = dbResponse.data.data[0];

        console.log('\n📋 Database fields:');
        console.log('- mainCategory:', video?.mainCategory || 'undefined');
        console.log('- hashtags:', video?.hashtags || 'undefined');
        console.log('- youtubeHandle:', video?.youtubeHandle || 'undefined');
        console.log('- categoryMatchRate:', video?.categoryMatchRate || 'undefined');
        console.log('- matchType:', video?.matchType || 'undefined');
        console.log('- matchReason:', video?.matchReason || 'undefined');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testFixedFields();