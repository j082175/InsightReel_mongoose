// skipAIAnalysis 옵션 테스트
const axios = require('axios');

async function testSkipAIAnalysis() {
  console.log('🧪 skipAIAnalysis 옵션 테스트 시작...\n');

  const testData = {
    channelIdentifier: '@DopamineBooster123',
    keywords: ['중구난방', '해외짜집기'],
    options: {
      skipAIAnalysis: true  // AI 분석 건너뛰기
    }
  };

  try {
    console.log('⚡ skipAIAnalysis=true 모드로 테스트...');
    console.log('예상: 3~5초 내 완료, AI 태그 없음, 사용자 키워드만 저장');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/channel-queue/add', testData, {
      timeout: 30000
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ 성공! 처리시간: ${duration}초`);
    console.log('응답:', JSON.stringify(response.data, null, 2));
    
    if (duration < 10) {
      console.log('🎉 빠른 처리 확인됨!');
    } else {
      console.log('⚠️ 처리시간이 예상보다 김');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ 서버 에러:', error.response.status);
      console.log('에러 메시지:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ 서버가 실행되지 않음 (포트 3002)');
    } else {
      console.log('❌ 예상치 못한 에러:', error.message);
    }
  }
}

testSkipAIAnalysis().catch(console.error);