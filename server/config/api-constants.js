/**
 * API 관련 상수 정의
 * 모든 하드코딩된 값들을 중앙집중식으로 관리
 */

// YouTube API 할당량 관련 상수
const YOUTUBE_API_LIMITS = {
  // 기본 할당량 (Google 제공 기본값)
  DAILY_QUOTA: 10000,
  
  // 안전 마진 (환경변수 우선, 기본값 8000)
  SAFETY_MARGIN: parseInt(process.env.YOUTUBE_API_SAFETY_MARGIN) || 8000,
  
  // 보수적 마진 (더 안전한 운영을 위한 여유분)
  CONSERVATIVE_MARGIN: parseInt(process.env.YOUTUBE_API_CONSERVATIVE_MARGIN) || 7000,
  
  // 경고 임계값 (사용량이 이 값을 넘으면 경고)
  WARNING_THRESHOLD: parseInt(process.env.YOUTUBE_API_WARNING_THRESHOLD) || 6000,
};

// API 키 관리 관련 상수
const API_KEY_MANAGEMENT = {
  // 최대 키 개수
  MAX_KEYS: parseInt(process.env.MAX_API_KEYS) || 10,
  
  // 키 이름 접두사
  KEY_NAME_PREFIX: 'YouTube API 키',
  
  // 키 파일 경로
  KEYS_FILE_PATH: 'server/data/api-keys.json',
  
  // 마이그레이션 플래그
  MIGRATION_COMPLETED: 'YOUTUBE_KEYS_MIGRATED',
};

// HTTP 응답 관련 상수
const RESPONSE_MESSAGES = {
  SUCCESS: {
    KEY_ADDED: 'API 키가 성공적으로 추가되었습니다',
    KEY_DELETED: 'API 키가 성공적으로 삭제되었습니다',
    MIGRATION_COMPLETED: 'API 키 마이그레이션이 완료되었습니다',
  },
  ERROR: {
    INVALID_KEY: '유효하지 않은 API 키입니다',
    KEY_EXISTS: '이미 존재하는 API 키입니다',
    MAX_KEYS_EXCEEDED: `최대 ${API_KEY_MANAGEMENT.MAX_KEYS}개의 키만 저장할 수 있습니다`,
    QUOTA_EXCEEDED: '모든 API 키의 할당량이 초과되었습니다',
  }
};

// Gemini API 모델별 할당량 상수
const GEMINI_API_LIMITS = {
  // Gemini 2.5 Pro 모델 한도 (가장 제한적)
  PRO: {
    rpm: parseInt(process.env.GEMINI_PRO_RPM) || 5,      // 분당 요청 수
    tpm: parseInt(process.env.GEMINI_PRO_TPM) || 250000, // 분당 토큰 수
    rpd: parseInt(process.env.GEMINI_PRO_RPD) || 50,     // 일일 요청 수
  },
  
  // Gemini 2.5 Flash 모델 한도 (중간)
  FLASH: {
    rpm: parseInt(process.env.GEMINI_FLASH_RPM) || 10,
    tpm: parseInt(process.env.GEMINI_FLASH_TPM) || 250000,
    rpd: parseInt(process.env.GEMINI_FLASH_RPD) || 250,
  },
  
  // Gemini 2.5 Flash Lite 모델 한도 (가장 관대)
  FLASH_LITE: {
    rpm: parseInt(process.env.GEMINI_FLASH_LITE_RPM) || 15,
    tpm: parseInt(process.env.GEMINI_FLASH_LITE_TPM) || 250000,
    rpd: parseInt(process.env.GEMINI_FLASH_LITE_RPD) || 1000,
  },
};

// API 요청 타임아웃 관련 상수
const API_TIMEOUTS = {
  YOUTUBE_API_REQUEST: parseInt(process.env.YOUTUBE_API_TIMEOUT) || 8000, // YouTube API 요청 타임아웃
  DEFAULT_HTTP_TIMEOUT: 5000, // 기본 HTTP 요청 타임아웃
  SLOW_REQUEST_TIMEOUT: 15000, // 느린 요청용 타임아웃
};

// 사용량 추적 관련 상수
const USAGE_TRACKING = {
  // 리셋 시간 (매일 오전 9시 PST)
  RESET_HOUR: 9,
  RESET_TIMEZONE: 'America/Los_Angeles',
  
  // API 엔드포인트별 비용
  ENDPOINT_COSTS: {
    'channels': 1,
    'videos': 1,
    'search': 100,
    'playlistItems': 1,
    'playlists': 1,
    'commentThreads': 1,
  },
};

module.exports = {
  YOUTUBE_API_LIMITS,
  GEMINI_API_LIMITS,
  API_KEY_MANAGEMENT,
  RESPONSE_MESSAGES,
  API_TIMEOUTS,
  USAGE_TRACKING,
};