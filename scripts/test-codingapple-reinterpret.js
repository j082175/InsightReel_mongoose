require('dotenv').config();

async function testCodingAppleReinterpret() {
  console.log('🧪 @codingapple AI 재해석 테스트 시작...');
  
  try {
    // 채널 분석 API 호출 (사용자 카테고리 포함)
    const response = await fetch('http://localhost:3000/api/channel-queue/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channelIdentifier: '@codingapple',
        keywords: ['쉽게 알려주는 코딩이야기'],
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
    console.log('- keywords: ["쉽게 알려주는 코딩이야기"]');
    console.log('- aiTags: ["JavaScript", "웹개발", "프론트엔드"...] (기존 표면적 태그)');
    console.log('- deepInsightTags: ["초보자친화적", "실무중심", "코딩입문"...] (새로 생성될 깊이 분석 태그)');
    console.log('- allTags: 위 3개 항목이 통합됨');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

testCodingAppleReinterpret();