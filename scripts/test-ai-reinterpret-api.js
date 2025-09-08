require('dotenv').config();

async function testAIReinterpretViaAPI() {
  console.log('🧪 AI 재해석 API 테스트 시작...');
  
  try {
    // 채널 분석 API 호출 (사용자 카테고리 포함)
    const response = await fetch('http://localhost:3000/api/channel-queue/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channelIdentifier: '@shortsman8',
        keywords: ['참교육'],  // 수정: userKeywords → keywords
        options: { includeAnalysis: true }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ API 호출 성공!');
    console.log('📊 Job ID:', result.jobId);
    console.log('⏳ 분석이 완료되면 channels.json을 확인하세요.');
    console.log('');
    console.log('🔍 예상 결과:');
    console.log('- keywords: ["참교육"]');
    console.log('- aiTags: ["일상", "관계", "소통"...] (기존)');
    console.log('- deepInsightTags: ["참교육", "정의구현", "사이다"...] (새로 생성)');
    console.log('- allTags: 위 3개 항목이 통합됨');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

testAIReinterpretViaAPI();