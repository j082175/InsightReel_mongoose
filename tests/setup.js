// Jest 테스트 설정 파일
require('dotenv').config({ path: '.env.test' });

// 전역 테스트 설정
global.console = {
  ...console,
  // 테스트 중 로그를 억제하고 싶다면 주석 해제
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// 테스트용 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.USE_GEMINI = 'true'; // 테스트 시 Gemini 활성화
process.env.GOOGLE_API_KEY = 'test-api-key';

// 전역 타임아웃 설정
jest.setTimeout(30000);

// 테스트 후 정리
afterAll(async () => {
  // 필요한 경우 정리 작업 추가
  await new Promise(resolve => setTimeout(resolve, 100));
});