export default {
  // 테스트 환경 설정
  testEnvironment: 'jsdom',

  // TypeScript 및 JSX 파일 변환 설정
  preset: 'ts-jest',

  // 모듈 파일 확장자
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // 변환할 파일 패턴
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
    }],
  },

  // 테스트 파일 패턴
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
  ],

  // 테스트 전 실행할 설정 파일
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // 모듈 경로 매핑 (Vite의 alias와 정적 파일 모킹)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
  },

  // 커버리지 설정
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],

  // 테스트 환경에서 제외할 경로
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],

  // 모듈 변환 무시 패턴
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|framer-motion))',
  ],

  // ESModule 호환성
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};