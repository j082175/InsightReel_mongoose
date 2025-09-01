// 프롬프트 길이 비교
const CategoryManager = require('./server/services/CategoryManager.js');
const PromptBuilder = require('./server/services/PromptBuilder.js');

const cm = new CategoryManager();
const pb = new PromptBuilder(cm);

// 현재 2단계 프롬프트
const currentPrompt = pb.buildSingleFramePrompt({platform: 'instagram'});

// 3단계 구조 시뮬레이션
const simple3Level = `
**카테고리 구조** (3단계):
• 게임 → 플레이·리뷰 → 호러게임 | 인디게임 | AAA게임
• 게임 → e스포츠 → 리그오브레전드 | 오버워치  
• 요리 → 한식 → 전통한식 | 퓨전한식
• 요리 → 양식 → 이탈리안 | 프렌치

**JSON 응답 형식**:
{
  "category_path": ["대카테고리", "중카테고리", "소카테고리"],
  "hashtags": ["#태그1", "#태그2"],
  "confidence": 0.95
}
`;

console.log('=== 📏 프롬프트 길이 비교 ===');
console.log('현재 2단계 프롬프트:', currentPrompt.length, '자');
console.log('3단계 프롬프트 예상:', simple3Level.length, '자');

const lengthDiff = simple3Level.length - currentPrompt.length;
console.log('변화:', lengthDiff > 0 ? `+${lengthDiff}` : lengthDiff, '자');
console.log('변화율:', Math.round((lengthDiff / currentPrompt.length) * 100), '%');

console.log('\n=== 🤖 AI 부담 실제 비교 ===');
console.log('현재: 58개 완전 경로 중 선택');
console.log('- 게임 > 플레이·리뷰');
console.log('- 게임 > 가이드·분석'); 
console.log('- 게임 > e스포츠');
console.log('- ... (총 58개)');

console.log('\n3단계: 9개 완전 경로 중 선택');  
console.log('- 게임 > 플레이·리뷰 > 호러게임');
console.log('- 게임 > 플레이·리뷰 > 인디게임');
console.log('- 게임 > e스포츠 > 롤');
console.log('- ... (총 9개)');

console.log('\n=== 💡 결론 ===');
console.log('✅ AI 선택지: 58개 → 9개 (84% 감소)');
console.log('✅ 더 구체적인 분류 가능');
console.log('✅ AI에게 훨씬 명확한 지시');

console.log('\n=== ⚠️ 하지만 문제점 ===');
console.log('❌ 모든 콘텐츠가 소카테고리까지 필요하지 않음');
console.log('❌ 빈 카테고리들이 많이 생길 가능성');
console.log('❌ 관리 복잡도는 여전히 증가');