module.exports = {
  // ts-jest preset
  preset: 'ts-jest',

  // 테스트 환경 설정
  testEnvironment: 'node',

  // 테스트 파일 패턴 (프로젝트 테스트만 포함)
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],

  // node_modules 완전 제외
  testPathIgnorePatterns: [
    '/node_modules/',
    '/frontend/node_modules/',
    '/extension/',
    '/downloads/'
  ],

  // 커버리지 설정 (기본적으로 비활성화)
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/frontend/node_modules/',
    '/tests/',
    '/extension/',
    '/downloads/'
  ],

  // 환경 변수 설정
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 타임아웃 설정 (AI 분석은 시간이 오래 걸릴 수 있음)
  testTimeout: 30000,

  // 테스트 결과 보고
  verbose: true,

  // 메모리 사용량 최적화
  maxWorkers: 1,
  workerIdleMemoryLimit: '512MB',

  // 캐시 제한
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // 파일 변경 감지 최적화
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/frontend/node_modules/',
    '/coverage/',
    '/.git/'
  ]
};