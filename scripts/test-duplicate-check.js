// 채널 중복 검사 API 테스트
const fetch = require('node-fetch');

async function testDuplicateCheck() {
  const serverUrl = 'http://localhost:3000';
  
  console.log('🧪 채널 중복 검사 API 테스트 시작');
  
  try {
    // 테스트 1: 존재할 가능성이 있는 채널
    console.log('\n1️⃣ @leewalters 채널 중복 검사');
    const response1 = await fetch(`${serverUrl}/api/channel-queue/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelIdentifier: '@leewalters' })
    });
    
    const result1 = await response1.json();
    console.log('결과:', JSON.stringify(result1, null, 2));
    
    // 테스트 2: 새로운/존재하지 않는 채널
    console.log('\n2️⃣ @nonexistentchannel123 채널 중복 검사');
    const response2 = await fetch(`${serverUrl}/api/channel-queue/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelIdentifier: '@nonexistentchannel123' })
    });
    
    const result2 = await response2.json();
    console.log('결과:', JSON.stringify(result2, null, 2));
    
    // 테스트 3: 빈 채널 식별자 (에러 케이스)
    console.log('\n3️⃣ 빈 채널 식별자 (에러 케이스)');
    const response3 = await fetch(`${serverUrl}/api/channel-queue/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const result3 = await response3.json();
    console.log('결과:', JSON.stringify(result3, null, 2));
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
  
  console.log('\n✅ 테스트 완료');
}

testDuplicateCheck();