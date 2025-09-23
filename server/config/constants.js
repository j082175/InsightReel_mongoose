/**
 * 서버용 통합 상수 정의
 */
const SERVER_CONSTANTS = {
    // 🌐 서버 설정
    SERVER: {
        DEFAULT_PORT: 3000,
        MAX_FILE_SIZE: '100mb',
        CORS_ORIGINS: [
            'chrome-extension://*',
            'http://localhost:3000',
            'https://www.instagram.com',
            'https://www.tiktok.com',
        ],
    },

    // 📱 플랫폼
    PLATFORMS: {
        YOUTUBE: 'YOUTUBE',
        INSTAGRAM: 'INSTAGRAM',
        TIKTOK: 'TIKTOK',
    },

    // 🛣️ API 엔드포인트
    ENDPOINTS: {
        PROCESS_VIDEO: '/api/process-video',
        PROCESS_BLOB: '/api/process-video-blob',
        ANALYZE: '/api/analyze',
        STATS: '/api/stats',
        HEALTH: '/health',
        CONFIG_HEALTH: '/api/config/health',
        TEST_SHEETS: '/api/test-sheets',
        UPDATE_HEADERS: '/api/update-headers',
    },

    // ⏱️ 타임아웃
    TIMEOUTS: {
        API_REQUEST: 30000,
        VIDEO_PROCESSING: 300000, // 5분
        AI_ANALYSIS: 120000, // 2분
        THUMBNAIL_GENERATION: 30000,
    },

    // 📏 제한값
    LIMITS: {
        MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
        MAX_RETRIES: 3,
        MAX_CONCURRENT_PROCESSES: 5,
    },

    // 📄 API 페이지네이션
    PAGINATION: {
        DEFAULT_LIMIT: 50,        // 기본 페이지당 항목 수
        MAX_LIMIT: 200,          // 최대 페이지당 항목 수
        DEFAULT_OFFSET: 0,       // 기본 오프셋
    },

    // 🔍 AI 설정
    AI: {
        // 재시도 설정 (모든 AI 시스템 공통)
        RETRY: {
            MAX_RETRIES: 3, // 최대 재시도 횟수
            RETRY_DELAYS: [10000, 10000, 10000], // 재시도 간격 (10초씩)
            TIMEOUT: 120000, // AI 분석 타임아웃 (2분)
        },

        MODELS: {
            GEMINI: 'flash-lite',
            GEMINI_PRO: 'pro',
            GEMINI_FLASH: 'flash',
            GEMINI_FLASH_LITE: 'flash-lite',
        },

        CONFIDENCE_THRESHOLDS: {
            HIGH: 0.8,
            MEDIUM: 0.6,
            LOW: 0.4,
        },

        ANALYSIS_TYPES: {
            QUICK: 'quick',
            DETAILED: 'detailed',
            COMPREHENSIVE: 'comprehensive',
        },
    },

    // 📊 구글 시트 설정
    SHEETS: {
        DEFAULT_SHEET_NAME: '인스타',
        REQUIRED_HEADERS: [
            '플랫폼',
            '날짜',
            '작성자',
            '내용',
            '좋아요수',
            '댓글수',
            '메인카테고리',
            '중간카테고리',
            '키워드',
            '해시태그',
            '신뢰도',
            'URL',
            '모델',
        ],
    },

    // 📂 파일 시스템
    PATHS: {
        UPLOADS_DIR: './uploads',
        THUMBNAILS_DIR: './downloads/thumbnails',
        TEMP_DIR: './temp',
        LOGS_DIR: './logs',
    },

    // 📢 로그 레벨
    LOG_LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug',
    },

    // 🚨 에러 타입
    ERROR_TYPES: {
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        PROCESSING_ERROR: 'PROCESSING_ERROR',
        AI_ERROR: 'AI_ERROR',
        SHEETS_ERROR: 'SHEETS_ERROR',
        FILE_ERROR: 'FILE_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
    },

    // 📊 기본 수집 옵션
    DEFAULT_COLLECTION: {
        DAYS_BACK: 7,
        MIN_VIEWS: 10000,
        INCLUDE_SHORTS: true,
        INCLUDE_MIDFORM: true,
        INCLUDE_LONGFORM: true,
    },

    // 📄 콘텐츠 제한값
    CONTENT_LIMITS: {
        DESCRIPTION_MAX_LENGTH: 1000,      // 비디오 설명 최대 길이
        SHARES_DEFAULT_VALUE: 0,           // YouTube API에서 shares 데이터 미제공 시 기본값
        DELAY_BETWEEN_GROUPS: 500,         // 그룹 간 수집 딜레이 (ms)
    },
};

module.exports = SERVER_CONSTANTS;
