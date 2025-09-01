// 실제 복잡도 테스트
const testData = {
  "게임": {
    "플레이·리뷰": {
      "keywords": ["실황", "Let's Play"],
      "subcategories": {
        "호러게임": { "keywords": ["공포게임", "호러"], "tags": ["점프스케어"] },
        "인디게임": { "keywords": ["인디", "소규모"], "tags": ["픽셀아트"] },
        "AAA게임": { "keywords": ["대작", "트리플A"], "tags": ["오픈월드"] }
      }
    },
    "e스포츠": {
      "keywords": ["프로경기", "토너먼트"],
      "subcategories": {
        "리그오브레전드": { "keywords": ["롤", "LoL"], "tags": ["챔피언분석"] },
        "오버워치": { "keywords": ["오버워치"], "tags": ["영웅분석"] }
      }
    }
  },
  "요리": {
    "한식": {
      "keywords": ["한국요리"],
      "subcategories": {
        "전통한식": { "keywords": ["궁중요리"], "tags": ["발효음식"] },
        "퓨전한식": { "keywords": ["퓨전"], "tags": ["K-푸드"] }
      }
    },
    "양식": {
      "keywords": ["서양요리"],
      "subcategories": {
        "이탈리안": { "keywords": ["파스타"], "tags": ["올리브오일"] },
        "프렌치": { "keywords": ["프랑스"], "tags": ["와인"] }
      }
    }
  }
};

let totalCategories = 0;
let maxDepth = 0;
let pathCount = 0;

function analyzeComplexity(obj, depth = 1, path = []) {
  maxDepth = Math.max(maxDepth, depth);
  
  for (const [key, value] of Object.entries(obj)) {
    totalCategories++;
    const currentPath = [...path, key];
    
    console.log('  '.repeat(depth-1) + `${depth === 1 ? '📁' : depth === 2 ? '📂' : '📄'} ${key}`);
    
    // subcategories가 있으면 재귀 호출
    if (typeof value === 'object' && value.subcategories && Object.keys(value.subcategories).length > 0) {
      analyzeComplexity(value.subcategories, depth + 1, currentPath);
    } 
    // keywords만 있는 경우 (최종 노드)
    else if (typeof value === 'object' && value.keywords) {
      pathCount++; // 완전한 경로 수
      console.log('  '.repeat(depth) + `   → 완전경로: ${currentPath.join(' > ')}`);
    }
    // 일반 중카테고리인 경우
    else if (typeof value === 'object') {
      // 하위 카테고리들 처리
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subKey !== 'keywords' && subKey !== 'tags') {
          totalCategories++;
          console.log('  '.repeat(depth) + `📂 ${subKey}`);
          
          if (subValue.subcategories) {
            analyzeComplexity(subValue.subcategories, depth + 2, [...currentPath, subKey]);
          } else {
            pathCount++;
            console.log('  '.repeat(depth + 1) + `   → 완전경로: ${[...currentPath, subKey].join(' > ')}`);
          }
        }
      }
    }
  }
}

console.log('=== 🧪 실제 3단계 구조 복잡도 분석 ===\n');
analyzeComplexity(testData);

console.log('\n📊 복잡도 통계:');
console.log('- 총 카테고리 수:', totalCategories);
console.log('- 최대 깊이:', maxDepth);
console.log('- 완전 경로 수:', pathCount);
console.log('- AI가 선택해야 할 조합:', Math.pow(totalCategories, maxDepth));

// AI 프롬프트 길이 예상
const promptLength = totalCategories * 50; // 평균 50자
console.log('- 예상 프롬프트 길이:', promptLength, '자');
console.log('- 현재 대비 증가율:', Math.round(promptLength / 800 * 100), '%');

// 관리 복잡도
console.log('\n⚠️ 관리 이슈:');
console.log('- 수정 시 영향받는 카테고리:', totalCategories);
console.log('- 검증해야 할 조합:', pathCount);
console.log('- 태그까지 포함한 관리 포인트:', pathCount * 3, '개');