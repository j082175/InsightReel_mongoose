/**
 * 프론트엔드용 통합 상수 정의
 */
export const FRONTEND_CONSTANTS = {
  // 📊 기본 수집 옵션
  DEFAULT_COLLECTION: {
    DAYS_BACK: 7,
    MIN_VIEWS: 10000,
    INCLUDE_SHORTS: true,
    INCLUDE_MIDFORM: true,
    INCLUDE_LONGFORM: true,
  },

  // 🌐 API 엔드포인트
  API: {
    BASE_URL: 'http://localhost:3000',
  },

  // 📱 플랫폼
  PLATFORMS: {
    YOUTUBE: 'YOUTUBE',
    INSTAGRAM: 'INSTAGRAM',
    TIKTOK: 'TIKTOK',
  },
} as const;