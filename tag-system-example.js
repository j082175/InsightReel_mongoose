// 태그 시스템 실제 예시

// === 현재 방식 ===
const currentSystem = {
  mainCategory: "게임",
  middleCategory: "플레이·리뷰",
  // 더 세분화하려면 새 카테고리 필요
};

// === 태그 시스템 ===
const tagSystem = {
  mainCategory: "게임",
  middleCategory: "플레이·리뷰", 
  tags: ["호러게임", "1인플레이", "점프스케어", "실황"],  // ← 이게 태그!
  // 필요한 만큼 자유롭게 추가 가능
};

// 실제 사용 예시들
const examples = [
  {
    title: "공포게임 실황 영상",
    category: "게임 > 플레이·리뷰",
    tags: ["호러게임", "점프스케어", "1인플레이", "실황"]
  },
  {
    title: "요리 브이로그",
    category: "요리 > 한식",
    tags: ["집밥", "혼밥", "간단요리", "브이로그"]
  },
  {
    title: "프로그래밍 강의",
    category: "과학·기술 > 프로그래밍",
    tags: ["파이썬", "초보자", "웹개발", "무료강의"]
  }
];

console.log("=== 🏷️ 태그 시스템 예시 ===\n");

examples.forEach((example, i) => {
  console.log(`${i+1}. ${example.title}`);
  console.log(`   카테고리: ${example.category}`);
  console.log(`   태그: #${example.tags.join(' #')}`);
  console.log('');
});

// 태그 검색 시뮬레이션
console.log("=== 🔍 태그 검색 예시 ===");
console.log("'호러게임' 태그 검색:");
const horror = examples.filter(ex => ex.tags.includes('호러게임'));
console.log(`결과: ${horror.length}개 영상`);

console.log("\n'초보자' 태그 검색:");
const beginner = examples.filter(ex => ex.tags.includes('초보자'));
console.log(`결과: ${beginner.length}개 영상`);