// 채널 큐 기본 API 테스트
const fetch = require('node-fetch');

async function testChannelQueueBasic() {
  const serverUrl = 'http://localhost:3000';
  
  console.log('🧪 채널 큐 기본 API 테스트 시작');
  
  try {
    // 테스트 1: /test 엔드포인트 확인
    console.log('\n1️⃣ 테스트 라우트 확인');
    const response1 = await fetch(`${serverUrl}/api/channel-queue/test`);
    const result1 = await response1.json();
    console.log('결과:', JSON.stringify(result1, null, 2));
    
    // 테스트 2: 큐 상태 확인  
    console.log('\n2️⃣ 큐 상태 확인');
    const response2 = await fetch(`${serverUrl}/api/channel-queue/status`);
    const result2 = await response2.json();
    console.log('결과:', JSON.stringify(result2, null, 2));
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
  
  console.log('\n✅ 테스트 완료');
}

testChannelQueueBasic();