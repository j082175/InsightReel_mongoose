// 동적 카테고리 정규화 시스템

console.log("=== 🔧 카테고리 정규화 시스템 ===\n");

// 실제로 AI가 생성할 수 있는 다양한 표현들
const RAW_AI_OUTPUTS = [
  "게임 > 호러 > 실황",
  "게임 > 공포게임 > 1인플레이", 
  "게임 > 무서운게임 > Let's Play",
  "게임 > 호러게임 > 스트리밍",
  
  "요리 > 한식 > 김치찌개",
  "요리 > 한국요리 > 찌개류",
  "요리 > 코리안푸드 > 김치찌개",
  
  "교육 > 프로그래밍 > 파이썬",
  "교육 > 코딩 > Python",
  "교육 > 개발 > 파이썬언어"
];

// 정규화 규칙
const NORMALIZATION_RULES = {
  // 동의어 매핑
  synonyms: {
    "호러": ["공포게임", "무서운게임", "호러게임"],
    "실황": ["Let's Play", "스트리밍", "라이브"],
    "한식": ["한국요리", "코리안푸드"],
    "프로그래밍": ["코딩", "개발"],
    "파이썬": ["Python", "파이썬언어"]
  },
  
  // 우선순위 (더 일반적인 용어)
  preferred: {
    "공포게임": "호러",
    "무서운게임": "호러", 
    "호러게임": "호러",
    "Let's Play": "실황",
    "스트리밍": "실황",
    "한국요리": "한식",
    "코리안푸드": "한식",
    "코딩": "프로그래밍",
    "개발": "프로그래밍",
    "Python": "파이썬",
    "파이썬언어": "파이썬"
  }
};

// 정규화 함수
function normalizeCategory(rawPath) {
  const parts = rawPath.split(' > ');
  const normalized = parts.map(part => {
    // 우선순위 용어로 변환
    return NORMALIZATION_RULES.preferred[part] || part;
  });
  return normalized.join(' > ');
}

console.log("=== 📝 정규화 예시 ===");
RAW_AI_OUTPUTS.forEach(raw => {
  const normalized = normalizeCategory(raw);
  if (raw !== normalized) {
    console.log(`"${raw}"`);
    console.log(`→ "${normalized}"`);
    console.log("");
  }
});

// 정규화 후 통계
const normalizedResults = RAW_AI_OUTPUTS.map(normalizeCategory);
const unique = [...new Set(normalizedResults)];

console.log("=== 📊 정규화 효과 ===");
console.log(`원본 카테고리: ${RAW_AI_OUTPUTS.length}개`);
console.log(`정규화 후: ${unique.length}개`);
console.log(`중복 제거: ${RAW_AI_OUTPUTS.length - unique.length}개`);
console.log("");

console.log("정규화된 고유 카테고리:");
unique.forEach(cat => console.log(`- ${cat}`));

console.log("\n=== 🤖 동적 학습 시스템 ===");
console.log("1. **빈도 분석**: 자주 나오는 표현을 표준으로 승격");
console.log("   예: '호러'가 '공포게임'보다 많이 나오면 '호러'를 표준으로");
console.log("");
console.log("2. **사용자 피드백**: 잘못된 분류 수정 시 학습");
console.log("   예: 사용자가 '공포게임'을 '호러'로 수정 → 규칙 업데이트");
console.log("");
console.log("3. **자동 병합**: 유사도 높은 카테고리 자동 통합");
console.log("   예: '김치찌개'와 '김치찌개요리' → 자동 통합");

console.log("\n=== 📦 실제 구현 구조 ===");
const implementationStructure = {
  database_tables: {
    categories: "정규화된 표준 카테고리 저장",
    raw_categories: "AI가 생성한 원본 카테고리",
    normalization_rules: "정규화 규칙과 동의어 매핑",
    category_stats: "카테고리별 사용 빈도와 통계"
  },
  
  process_flow: [
    "1. AI가 원본 카테고리 생성",
    "2. 정규화 엔진이 표준화",
    "3. 데이터베이스에 저장", 
    "4. 사용자 피드백으로 규칙 업데이트",
    "5. 주기적으로 통계 분석하여 표준 개선"
  ]
};

console.log(JSON.stringify(implementationStructure, null, 2));