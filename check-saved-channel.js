const axios = require('axios');

async function checkSavedChannel() {
    try {
        console.log('🔍 저장된 채널 데이터 확인...');

        // 채널 목록 조회
        const response = await axios.get('http://localhost:3000/api/channels');

        if (response.data.success && response.data.data.length > 0) {
            const latestChannel = response.data.data[0]; // 최신 채널
            console.log('📊 최신 채널 데이터:');
            console.log(JSON.stringify(latestChannel, null, 2));
        } else {
            console.log('❌ 저장된 채널이 없습니다.');
        }

    } catch (error) {
        console.error('❌ 조회 실패:', error.response?.data || error.message);
    }
}

checkSavedChannel();