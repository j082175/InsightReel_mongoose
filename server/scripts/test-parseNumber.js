// parseNumber 로직 테스트

// 수정된 parseNumber 함수
function parseNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  
  const str = value.toString().trim();
  
  // 한국어 단위 처리
  if (str.includes('만')) {
    // "16.1만" → 16.1 * 10000 = 161000
    const numberPart = str.replace(/만.*$/, '').replace(/[^\d.]/g, '');
    const base = parseFloat(numberPart);
    return isNaN(base) ? 0 : Math.floor(base * 10000);
  }
  
  if (str.includes('천')) {
    // "5.2천" → 5.2 * 1000 = 5200
    const numberPart = str.replace(/천.*$/, '').replace(/[^\d.]/g, '');
    const base = parseFloat(numberPart);
    return isNaN(base) ? 0 : Math.floor(base * 1000);
  }
  
  if (str.includes('억')) {
    // "1.5억" → 1.5 * 100000000 = 150000000
    const numberPart = str.replace(/억.*$/, '').replace(/[^\d.]/g, '');
    const base = parseFloat(numberPart);
    return isNaN(base) ? 0 : Math.floor(base * 100000000);
  }
  
  // 일반 숫자 (콤마 제거)
  // "5,392,359" → 5392359
  const cleaned = str.replace(/[,\s]/g, '').replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.floor(parsed);
}

// 테스트 케이스
const testCases = [
  { input: '16.1만', expected: 161000 },
  { input: '5.2천', expected: 5200 },
  { input: '1.5억', expected: 150000000 },
  { input: '5,392,359', expected: 5392359 },
  { input: '1,234', expected: 1234 },
  { input: '100', expected: 100 },
  { input: '0', expected: 0 },
  { input: '', expected: 0 },
  { input: null, expected: 0 },
  { input: 12345, expected: 12345 },
  { input: '2.5만', expected: 25000 },
  { input: '10억', expected: 1000000000 }
];

console.log('🧪 parseNumber 테스트 시작...\n');

testCases.forEach((testCase, index) => {
  const result = parseNumber(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`테스트 ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  입력: "${testCase.input}"`);
  console.log(`  예상: ${testCase.expected}`);
  console.log(`  결과: ${result}`);
  if (!passed) {
    console.log(`  🚨 실패! 차이: ${result - testCase.expected}`);
  }
  console.log('');
});

const failedTests = testCases.filter((testCase, index) => {
  return parseNumber(testCase.input) !== testCase.expected;
});

if (failedTests.length === 0) {
  console.log('🎉 모든 테스트 통과!');
} else {
  console.log(`❌ ${failedTests.length}개 테스트 실패`);
}