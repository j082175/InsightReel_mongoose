module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'node',
  
  // 테스트 파일 패턴
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // 커버리지 설정
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/extension/',
    '/downloads/'
  ],
  
  // 환경 변수 설정
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 타임아웃 설정 (AI 분석은 시간이 오래 걸릴 수 있음)
  testTimeout: 30000,
  
  // 모듈 경로 매핑 (moduleNameMapping은 잘못된 옵션명입니다)
  // moduleNameMapping: {
  //   '^@/(.*)$': '<rootDir>/server/$1'
  // },
  
  // 테스트 결과 보고
  verbose: true,
  
  // 병렬 실행 제한 (AI API 호출 제한 고려)
  maxWorkers: 2
};