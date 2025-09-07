// 동적 카테고리 생성 AI 프롬프트

const FIXED_MAIN_CATEGORIES = ["게임", "요리", "교육", "음악", "스포츠", "여행", "뷰티", "테크", "동물", "엔터테인먼트"];

function buildDynamicCategoryPrompt(metadata) {
  return `
이 영상을 분석하여 카테고리를 분류해주세요.

**분류 규칙:**
1. 대카테고리는 반드시 다음 중 하나 선택: ${FIXED_MAIN_CATEGORIES.join(', ')}
2. 하위 카테고리는 콘텐츠에 맞게 적절한 깊이까지 자유롭게 생성
3. 너무 깊게 들어가지 말고, 의미있는 구분선까지만 생성
4. 한국어 사용, 간결하고 명확한 용어 사용

**예시:**
- 간단한 콘텐츠: "요리 > 한식"
- 구체적인 콘텐츠: "게임 > 호러 > 1인칭 > 생존게임"  
- 교육 콘텐츠: "교육 > 프로그래밍 > 파이썬"

**JSON 응답 형식:**
{
  "main_category": "선택한 대카테고리",
  "category_path": ["하위1", "하위2", "하위3"],
  "full_path": "대카테고리 > 하위1 > 하위2 > 하위3",
  "hashtags": ["#해시태그1", "#해시태그2"],
  "confidence": 0.95,
  "depth": 4
}

콘텐츠 정보:
- 캡션: "${metadata.caption || ''}"
- 플랫폼: ${metadata.platform || 'unknown'}
`;
}

// 실제 사용 예시
const examples = [
  {
    metadata: { caption: "오늘 공포게임 실황했어요! 진짜 무서워서 소리질렀네", platform: "instagram" },
    expected: {
      main_category: "게임",
      category_path: ["호러", "실황"],
      full_path: "게임 > 호러 > 실황",
      hashtags: ["#공포게임", "#실황", "#게임"],
      confidence: 0.92,
      depth: 3
    }
  },
  {
    metadata: { caption: "김치찌개 맛있게 끓이는 법", platform: "tiktok" },
    expected: {
      main_category: "요리",
      category_path: ["한식", "찌개"],
      full_path: "요리 > 한식 > 찌개",
      hashtags: ["#김치찌개", "#한식", "#요리"],
      confidence: 0.95,
      depth: 3
    }
  },
  {
    metadata: { caption: "그냥 오늘 하루 일상", platform: "instagram" },
    expected: {
      main_category: "엔터테인먼트",
      category_path: ["일상"],
      full_path: "엔터테인먼트 > 일상",
      hashtags: ["#일상", "#브이로그"],
      confidence: 0.88,
      depth: 2
    }
  }
];

console.log("=== 🤖 동적 카테고리 AI 프롬프트 ===\n");

examples.forEach((example, i) => {
  console.log(`${i+1}. 캡션: "${example.metadata.caption}"`);
  console.log(`   예상 결과: ${example.expected.full_path}`);
  console.log(`   깊이: ${example.expected.depth}단계`);
  console.log("");
});

console.log("=== 📊 Google Sheets 저장 구조 ===");
console.log("| 대카테고리 | 전체경로 | 깊이 | 해시태그 | 키워드 |");
console.log("|------------|----------|------|----------|--------|");
examples.forEach(ex => {
  console.log(`| ${ex.expected.main_category} | ${ex.expected.full_path} | ${ex.expected.depth} | ${ex.expected.hashtags.join(' ')} | ... |`);
});

console.log("\n=== 💡 시스템 혜택 ===");
console.log("✅ 관리자: 대카테고리 10개만 관리");
console.log("✅ AI: 콘텐츠에 최적화된 세부 분류");
console.log("✅ 사용자: 정확하고 구체적인 분류");
console.log("✅ 시스템: 자동으로 트렌드 반영");

module.exports = { buildDynamicCategoryPrompt };