// 하이브리드 시스템만 테스트
require('dotenv').config();

// 임시로 Enhanced Multi API 비활성화
delete process.env.GEMINI_FALLBACK_STRATEGY;
process.env.USE_HYBRID_GEMINI = 'true';

const AIAnalyzer = require('./server/services/AIAnalyzer');

async function testHybridOnly() {
  console.log('🧪 하이브리드 시스템만 테스트');
  
  try {
    const aiAnalyzer = new AIAnalyzer();
    
    console.log(`Enhanced Multi API 활성화: ${aiAnalyzer.useEnhancedMultiApi}`);
    console.log(`하이브리드 Gemini 활성화: ${aiAnalyzer.useHybridGemini}`);
    
    if (aiAnalyzer.useHybridGemini && !aiAnalyzer.useEnhancedMultiApi) {
      console.log('✅ 하이브리드 시스템만 활성화됨');
      
      const response = await aiAnalyzer.queryGemini("Hello");
      console.log(`✅ API 호출 성공: "${response.substring(0, 30)}..."`);
    } else {
      console.log('❌ 설정이 잘못됨');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

testHybridOnly();