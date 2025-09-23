const axios = require('axios');

async function testVideosAPI() {
    try {
        console.log('🔍 Testing /api/videos endpoint...');
        const response = await axios.get('http://localhost:3000/api/videos');
        console.log('✅ Success:', response.status);
        console.log('📊 Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.statusText);
        console.error('📋 Error data:', error.response?.data);
        console.error('🔍 Full error:', error.message);
    }
}

testVideosAPI();