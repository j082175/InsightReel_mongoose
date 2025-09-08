require('dotenv').config();
const ChannelModel = require('../server/features/cluster/ChannelModel');

async function testAIReinterpret() {
  console.log('🧪 AI 재해석 테스트 시작...');
  
  try {
    // 3초 대기 (ChannelModel 초기화)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const channelModel = new ChannelModel();
    
    // shortsman8 채널에 "참교육" 카테고리로 재분석
    console.log('🎯 shortsman8 채널에 "참교육" 카테고리 등록 중...');
    
    const result = await channelModel.createOrUpdateWithAnalysis(
      '@shortsman8',
      ['참교육'], // 사용자 카테고리
      true  // 분석 포함
    );
    
    console.log('✅ AI 재해석 테스트 완료!');
    console.log('📊 결과:');
    console.log('- 사용자 카테고리:', result.keywords);
    console.log('- 기존 AI 태그:', result.aiTags?.slice(0, 10) || []);
    console.log('- 재해석 태그:', result.deepInsightTags || []);
    console.log('- 통합 태그:', result.allTags?.slice(0, 15) || []);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

testAIReinterpret();