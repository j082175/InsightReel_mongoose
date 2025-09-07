/**
 * Gemini 2.5 Flash Thinking 모드 테스트 스크립트
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const UnifiedGeminiManager = require('../server/utils/unified-gemini-manager');
const { ServerLogger } = require('../server/utils/logger');

async function testThinkingMode() {
  try {
    console.log('🤔 Gemini Thinking 모드 테스트 시작...\n');

    // UnifiedGeminiManager 초기화
    const geminiManager = new UnifiedGeminiManager({
      strategy: 'flash',
      retryAttempts: 1,
      retryDelay: 1000
    });

    // 복잡한 수학 문제 (thinking 모드가 유용한 상황)
    const mathPrompt = `
다음 수학 문제를 단계별로 풀어주세요:

한 회사에서 제품 A와 B를 생산합니다.
- 제품 A: 시간당 12개 생산, 개당 이익 5만원
- 제품 B: 시간당 8개 생산, 개당 이익 8만원
- 하루 총 작업시간: 10시간
- 제품 A 생산에 최소 3시간, 최대 7시간 할당 가능

하루 최대 이익을 얻으려면 각 제품을 몇 시간씩 생산해야 할까요?
`;

    console.log('📊 복잡한 수학 문제 테스트:');
    console.log('프롬프트:', mathPrompt.trim());
    console.log('\n' + '='.repeat(50));

    // 1. Thinking 모드 없이 테스트
    console.log('\n1️⃣ Thinking 모드 OFF (thinkingBudget: 0)');
    const startTime1 = Date.now();
    
    const result1 = await geminiManager.generateContent(mathPrompt, null, {
      thinkingBudget: 0
    });
    
    const duration1 = Date.now() - startTime1;
    console.log(`⏱️ 응답 시간: ${duration1}ms`);
    console.log('📝 응답:');
    console.log(result1.text);
    console.log('\n' + '-'.repeat(30));

    // 2. Thinking 모드 동적 활성화
    console.log('\n2️⃣ Thinking 모드 ON (thinkingBudget: -1, 동적)');
    const startTime2 = Date.now();
    
    const result2 = await geminiManager.generateContent(mathPrompt, null, {
      thinkingBudget: -1
    });
    
    const duration2 = Date.now() - startTime2;
    console.log(`⏱️ 응답 시간: ${duration2}ms`);
    console.log('📝 응답:');
    console.log(result2.text);
    console.log('\n' + '-'.repeat(30));

    // 3. 고정 토큰 수로 테스트
    console.log('\n3️⃣ Thinking 모드 고정 (thinkingBudget: 2000)');
    const startTime3 = Date.now();
    
    const result3 = await geminiManager.generateContent(mathPrompt, null, {
      thinkingBudget: 2000
    });
    
    const duration3 = Date.now() - startTime3;
    console.log(`⏱️ 응답 시간: ${duration3}ms`);
    console.log('📝 응답:');
    console.log(result3.text);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Thinking 모드 테스트 완료!');
    console.log(`📊 성능 비교:`);
    console.log(`   - OFF: ${duration1}ms`);
    console.log(`   - 동적: ${duration2}ms`);
    console.log(`   - 고정: ${duration3}ms`);

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
}

// 스크립트 실행
if (require.main === module) {
  testThinkingMode();
}

module.exports = { testThinkingMode };