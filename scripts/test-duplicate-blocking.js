// 중복 채널 분석 차단 테스트
const axios = require('axios');

async function testDuplicateBlocking() {
  console.log('🧪 중복 채널 분석 차단 테스트 시작...\n');

  const testData = {
    channelIdentifier: '@DopamineBooster123',
    keywords: ['해외짜집기'],
    options: {}
  };

  try {
    // 첫 번째 요청 (DB 초기화 후 새로운 분석)
    console.log('1️⃣ 첫 번째 분석 요청 (DB 초기화 후)...');
    const response = await axios.post('http://localhost:3000/api/channel-queue/add', testData, {
      timeout: 5000
    });
    
    console.log('❌ 예상과 다름: 중복 차단되지 않았음');
    console.log('응답:', response.data);
    
  } catch (error) {
    if (error.response) {
      // 서버에서 에러 응답을 받은 경우 (예상됨)
      console.log('✅ 예상대로: 중복 분석 차단됨');
      console.log('상태:', error.response.status);
      console.log('에러 메시지:', error.response.data.error);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ 서버가 실행되지 않음');
    } else {
      console.log('❌ 예상치 못한 에러:', error.message);
    }
  }
}

testDuplicateBlocking().catch(console.error);