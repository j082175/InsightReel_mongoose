// HighViewCollector 단독 테스트
const HighViewCollector = require('../server/services/HighViewCollector');

console.log('🧪 HighViewCollector 초기화 테스트');

try {
  const collector = new HighViewCollector();
  console.log('✅ 초기화 성공!');
  
  // quota 상태 확인
  const quotaStatus = collector.getQuotaStatus();
  console.log('📊 Quota 상태:', quotaStatus);
  
} catch (error) {
  console.log('❌ 초기화 실패:', error.message);
  console.log('📋 오류 스택:', error.stack);
}