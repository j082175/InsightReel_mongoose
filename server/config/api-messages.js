/**
 * API 메시지 및 에러 코드 상수
 */

const API_MESSAGES = {
  // 🎬 비디오 처리 관련
  VIDEO: {
    PROCESSING_START: '비디오 처리를 시작합니다.',
    PROCESSING_SUCCESS: '비디오가 성공적으로 처리되었습니다.',
    PROCESSING_FAILED: '비디오 처리 중 오류가 발생했습니다.',
    DOWNLOAD_START: '비디오 다운로드를 시작합니다.',
    DOWNLOAD_SUCCESS: '비디오 다운로드가 완료되었습니다.',
    DOWNLOAD_FAILED: '비디오 다운로드에 실패했습니다.',
    ANALYSIS_START: 'AI 분석을 시작합니다.',
    ANALYSIS_SUCCESS: 'AI 분석이 완료되었습니다.',
    ANALYSIS_FAILED: 'AI 분석에 실패했습니다.',
    THUMBNAIL_START: '썸네일 생성을 시작합니다.',
    THUMBNAIL_SUCCESS: '썸네일 생성이 완료되었습니다.',
    THUMBNAIL_FAILED: '썸네일 생성에 실패했습니다.',
    SAVE_TO_SHEETS_SUCCESS: '구글 시트 저장이 완료되었습니다.',
    SAVE_TO_SHEETS_FAILED: '구글 시트 저장에 실패했습니다.',
    FILE_NOT_UPLOADED: '비디오 파일이 업로드되지 않았습니다.',
    INVALID_PLATFORM: '지원하지 않는 플랫폼입니다.',
    INVALID_URL: '유효하지 않은 비디오 URL입니다.',
    UNSUPPORTED_FORMAT: '지원하지 않는 비디오 형식입니다.'
  },

  // 🔗 연결 테스트 관련
  CONNECTION: {
    SHEETS_SUCCESS: '구글 시트 연결이 성공했습니다.',
    SHEETS_FAILED: '구글 시트 연결에 실패했습니다.',
    SERVER_HEALTHY: '서버가 정상 작동 중입니다.',
    CONFIG_VALID: '서버 설정이 유효합니다.',
    CONFIG_INVALID: '서버 설정에 문제가 있습니다.'
  },

  // 📊 데이터 조회 관련
  DATA: {
    FETCH_SUCCESS: '데이터를 성공적으로 가져왔습니다.',
    FETCH_FAILED: '데이터 조회에 실패했습니다.',
    NO_DATA_FOUND: '조회된 데이터가 없습니다.',
    INVALID_QUERY: '잘못된 조회 조건입니다.'
  },

  // 📁 파일 관련
  FILE: {
    UPLOAD_SUCCESS: '파일 업로드가 완료되었습니다.',
    UPLOAD_FAILED: '파일 업로드에 실패했습니다.',
    SIZE_EXCEEDED: '파일 크기가 제한을 초과했습니다.',
    INVALID_TYPE: '지원하지 않는 파일 형식입니다.',
    CORRUPTED: '파일이 손상되었습니다.'
  },

  // 🔐 인증 및 권한
  AUTH: {
    UNAUTHORIZED: '인증이 필요합니다.',
    FORBIDDEN: '접근 권한이 없습니다.',
    INVALID_CREDENTIALS: '잘못된 인증 정보입니다.',
    TOKEN_EXPIRED: '인증 토큰이 만료되었습니다.',
    SESSION_EXPIRED: '세션이 만료되었습니다.'
  },

  // ⚠️ 일반 에러
  COMMON: {
    INTERNAL_ERROR: '서버 내부 오류가 발생했습니다.',
    BAD_REQUEST: '잘못된 요청입니다.',
    NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
    METHOD_NOT_ALLOWED: '허용되지 않은 요청 방법입니다.',
    RATE_LIMIT_EXCEEDED: '요청 횟수 제한을 초과했습니다.',
    SERVICE_UNAVAILABLE: '서비스를 일시적으로 사용할 수 없습니다.',
    VALIDATION_FAILED: '입력 데이터 검증에 실패했습니다.',
    TIMEOUT: '요청 처리 시간이 초과되었습니다.'
  }
};

const ERROR_CODES = {
  // 🎬 비디오 처리 에러
  VIDEO_PROCESSING_FAILED: 'VIDEO_PROCESSING_FAILED',
  VIDEO_DOWNLOAD_FAILED: 'VIDEO_DOWNLOAD_FAILED',
  VIDEO_ANALYSIS_FAILED: 'VIDEO_ANALYSIS_FAILED',
  THUMBNAIL_GENERATION_FAILED: 'THUMBNAIL_GENERATION_FAILED',
  SHEETS_SAVE_FAILED: 'SHEETS_SAVE_FAILED',
  INVALID_VIDEO_URL: 'INVALID_VIDEO_URL',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  UNSUPPORTED_VIDEO_FORMAT: 'UNSUPPORTED_VIDEO_FORMAT',

  // 🔗 연결 에러
  SHEETS_CONNECTION_FAILED: 'SHEETS_CONNECTION_FAILED',
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  EXTERNAL_API_FAILED: 'EXTERNAL_API_FAILED',

  // 📁 파일 에러
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_CORRUPTED: 'FILE_CORRUPTED',

  // 📊 데이터 에러
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  INVALID_QUERY_PARAMETERS: 'INVALID_QUERY_PARAMETERS',
  DATA_FETCH_FAILED: 'DATA_FETCH_FAILED',

  // 🔐 인증/권한 에러
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // ⚙️ 설정 에러
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  MISSING_REQUIRED_CONFIG: 'MISSING_REQUIRED_CONFIG',
  CONFIG_VALIDATION_FAILED: 'CONFIG_VALIDATION_FAILED',

  // 🔄 일반 에러
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY'
};

const HTTP_STATUS_CODES = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 3xx Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // 4xx Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  CONFLICT: 409,
  GONE: 410,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * 플랫폼별 특수 메시지
 */
const PLATFORM_MESSAGES = {
  INSTAGRAM: {
    UNSUPPORTED: '인스타그램 비디오는 현재 지원하지 않는 형식입니다.',
    PRIVATE_ACCOUNT: '비공개 계정의 비디오는 처리할 수 없습니다.',
    STORY_EXPIRED: '만료된 스토리입니다.',
    REEL_PROCESSING: '릴스 비디오를 처리하고 있습니다.'
  },
  
  TIKTOK: {
    UNSUPPORTED: '틱톡 비디오 기능은 아직 구현되지 않았습니다.',
    REGION_BLOCKED: '지역 제한으로 인해 접근할 수 없는 비디오입니다.',
    PRIVATE_VIDEO: '비공개 비디오는 처리할 수 없습니다.'
  }
};

module.exports = {
  API_MESSAGES,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  PLATFORM_MESSAGES
};