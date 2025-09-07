/**
 * Chrome Extension 환경 설정
 * 빌드 시 환경변수를 주입받아 설정을 관리
 */

// 빌드 시 webpack DefinePlugin으로 주입되는 환경변수들
const environment = {
  // 서버 설정
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // API 키 설정 (보안 중요)
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  YOUTUBE_KEY_1: process.env.YOUTUBE_KEY_1,
  YOUTUBE_KEY_2: process.env.YOUTUBE_KEY_2,
  YOUTUBE_KEY_3: process.env.YOUTUBE_KEY_3,
  
  // 기능 플래그
  USE_GEMINI: process.env.USE_GEMINI === 'true',
  USE_DYNAMIC_CATEGORIES: process.env.USE_DYNAMIC_CATEGORIES === 'true',
  
  // 개발 모드 체크
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

// 필수 환경변수 검증
const requiredVars = ['GOOGLE_API_KEY'];
const missingVars = requiredVars.filter(key => !environment[key]);

if (missingVars.length > 0) {
  console.error('❌ 필수 환경변수 누락:', missingVars);
  console.error('💡 .env 파일에서 다음 변수들을 확인해주세요:', missingVars.join(', '));
}

export default environment;