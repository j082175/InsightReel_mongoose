// Google Sheets 저장 방식 비교

console.log("=== 📊 Google Sheets 저장 예시 ===\n");

// 현재 방식
console.log("현재 (2단계 카테고리):");
console.log("| 번호 | 대카테고리 | 중카테고리 | 키워드 |");
console.log("|------|------------|------------|--------|");
console.log("| 1    | 게임       | 플레이·리뷰 | Let's Play, 실황 |");
console.log("");

// 태그 시스템 추가
console.log("태그 시스템 추가:");
console.log("| 번호 | 대카테고리 | 중카테고리 | 태그 | 키워드 |");
console.log("|------|------------|------------|------|--------|");
console.log("| 1    | 게임       | 플레이·리뷰 | #호러게임 #점프스케어 #1인플레이 | Let's Play, 실황 |");
console.log("");

// 3단계 카테고리 (비교용)
console.log("3단계 카테고리 (복잡함):");
console.log("| 번호 | 대카테고리 | 중카테고리 | 소카테고리 | 키워드 |");
console.log("|------|------------|------------|------------|--------|");
console.log("| 1    | 게임       | 플레이·리뷰 | 호러게임   | Let's Play, 실황 |");
console.log("");

console.log("=== 💡 태그의 장점 ===");
console.log("✅ 하나의 영상에 여러 특성 표현 가능");
console.log("✅ 검색 성능 향상 (태그별 필터링)");
console.log("✅ 트렌드 분석 가능 (#호러게임 인기도)");
console.log("✅ AI 분류 부담 없음 (기존 구조 유지)");
console.log("✅ 사용자가 이해하기 쉬움");