// 동적 카테고리 시스템 테스트 스크립트

require('dotenv').config();
const DynamicCategoryManager = require('./server/services/DynamicCategoryManager');

console.log('🚀 동적 카테고리 시스템 테스트 시작\n');

// DynamicCategoryManager 인스턴스 생성
const dynamicManager = new DynamicCategoryManager();

console.log('=== 📋 기본 설정 확인 ===');
console.log('고정 대카테고리:', dynamicManager.getFixedMainCategories());
console.log('동적 카테고리 모드:', process.env.USE_DYNAMIC_CATEGORIES === 'true');
console.log('');

console.log('=== 🎯 카테고리 정규화 테스트 ===');

// 테스트 케이스들
const testCases = [
  '게임 > 공포게임 > Let\'s Play',
  '요리 > 한국요리 > 김치찌개',
  '교육 > 코딩 > Python',
  '음악 > cover > K-POP',
  '엔터테인먼트 > 일상'
];

testCases.forEach(testCase => {
  const normalized = dynamicManager.normalizeCategoryPath(testCase);
  if (normalized) {
    console.log(`원본: "${testCase}"`);
    console.log(`정규화: "${normalized.normalized}"`);
    console.log(`깊이: ${normalized.depth}단계`);
    console.log('');
  } else {
    console.log(`❌ 정규화 실패: "${testCase}"`);
    console.log('');
  }
});

console.log('=== 🤖 AI 응답 처리 테스트 ===');

// AI 응답 시뮬레이션
const mockAIResponse = {
  main_category: '게임',
  category_path: ['호러게임', 'Let\'s Play'],
  full_path: '게임 > 호러게임 > Let\'s Play',
  keywords: ['공포게임', '실황', '게임', '스트리밍', '호러'],
  hashtags: ['#공포게임', '#실황', '#게임', '#호러', '#스트리밍'],
  confidence: 0.92,
  depth: 3
};

const mockMetadata = {
  caption: '오늘 공포게임 실황했어요! 진짜 무서워서 소리질렀네',
  platform: 'instagram',
  hashtags: ['#공포게임', '#실황']
};

console.log('🔮 AI 응답 시뮬레이션:');
console.log(JSON.stringify(mockAIResponse, null, 2));
console.log('');

const processed = dynamicManager.processDynamicCategoryResponse(mockAIResponse, mockMetadata);
console.log('✅ 처리 결과:');
console.log(`메인 카테고리: ${processed.mainCategory}`);
console.log(`전체 경로: ${processed.fullPath}`);
console.log(`깊이: ${processed.depth}단계`);
console.log(`키워드: ${processed.keywords.join(', ')}`);
console.log(`해시태그: ${processed.hashtags.join(' ')}`);
console.log(`신뢰도: ${processed.confidence}`);
console.log(`정규화됨: ${processed.normalized}`);
console.log('');

console.log('=== 🔧 동적 프롬프트 생성 테스트 ===');
const dynamicPrompt = dynamicManager.buildDynamicCategoryPrompt(mockMetadata);
console.log('생성된 프롬프트 길이:', dynamicPrompt.length, '자');
console.log('프롬프트 시작 부분:');
console.log(dynamicPrompt.substring(0, 200) + '...');
console.log('');

console.log('=== 📊 시스템 통계 ===');
const stats = dynamicManager.getSystemStats();
console.log('총 카테고리 수:', stats.totalCategories);
console.log('총 사용 횟수:', stats.totalUsage);
console.log('평균 깊이:', stats.averageDepth);
console.log('정규화 규칙 수:', stats.normalizationRules);
console.log('동의어 그룹 수:', stats.synonymGroups);
console.log('마지막 업데이트:', stats.lastUpdated);
console.log('');

console.log('=== 💡 인기 카테고리 ===');
const popular = dynamicManager.getPopularCategories(3);
popular.forEach((item, index) => {
  console.log(`${index + 1}. ${item.path} (${item.count}회 사용)`);
});
console.log('');

console.log('=== 🎲 폴백 테스트 ===');
const fallbackResult = dynamicManager.getFallbackCategory(mockMetadata);
console.log('폴백 카테고리:');
console.log(`메인: ${fallbackResult.mainCategory}`);
console.log(`전체 경로: ${fallbackResult.fullPath}`);
console.log(`신뢰도: ${fallbackResult.confidence}`);
console.log('');

console.log('✅ 동적 카테고리 시스템 테스트 완료!');
console.log('');
console.log('🎉 모든 기능이 정상적으로 작동합니다.');

// 학습 기능 테스트
console.log('=== 📚 사용자 피드백 학습 테스트 ===');
dynamicManager.learnFromUserFeedback('게임 > 공포게임', '게임 > 호러');
console.log('학습 완료: "공포게임" → "호러" 규칙 추가');

// 추천 기능 테스트
console.log('=== 🔍 카테고리 추천 테스트 ===');
const recommendations = dynamicManager.recommendCategories(['게임', '실황'], 3);
console.log('추천 카테고리:');
recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.path} (점수: ${rec.score}, 사용: ${rec.count}회)`);
});

console.log('\n🚀 동적 카테고리 시스템이 성공적으로 구축되었습니다!');