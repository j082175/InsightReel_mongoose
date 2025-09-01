// AI 태그 생성 예시

console.log("=== 🤖 AI 태그 생성 시뮬레이션 ===\n");

// 기존 AI 응답
const oldResponse = {
  main_category: "게임",
  middle_category: "플레이·리뷰", 
  keywords: ["실황", "공포게임", "Let's Play"],
  confidence: 0.9
};

// 태그 시스템 추가된 AI 응답
const newResponse = {
  main_category: "게임",
  middle_category: "플레이·리뷰",
  keywords: ["실황", "Let's Play"],
  tags: [                           // ← 새로 추가!
    "호러게임",      // 게임 장르
    "1인플레이",     // 플레이 스타일  
    "점프스케어",    // 콘텐츠 특성
    "실황",          // 영상 형태
    "한국어"         // 언어
  ],
  confidence: 0.9
};

console.log("기존 AI 응답:");
console.log(JSON.stringify(oldResponse, null, 2));

console.log("\n태그 시스템 추가된 AI 응답:");
console.log(JSON.stringify(newResponse, null, 2));

console.log("\n=== 💡 태그 vs 키워드 차이점 ===");
console.log("키워드: AI 분석용 단어 (내부적)");
console.log("태그: 사용자용 라벨 (검색/분류용)");

console.log("\n=== 🎯 실제 활용 예시 ===");
console.log("1. 검색: '#호러게임' 태그로 필터링");
console.log("2. 통계: '점프스케어' 태그 인기도 분석");  
console.log("3. 추천: 같은 태그 영상 추천");
console.log("4. 트렌드: '#1인플레이' 증가 추세");