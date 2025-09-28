const axios = require('axios');

async function testProcessVideo() {
    try {
        const response = await axios.post('http://localhost:3000/api/process-video', {
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        });
        console.log('✅ API 응답:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ 오류:', error.response?.data || error.message);
    }
}

testProcessVideo();