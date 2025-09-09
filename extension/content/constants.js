/**
 * InsightReel 통합 상수 정의
 * 모든 하드코딩된 값들을 중앙화하여 관리
 */
export const CONSTANTS = {
  // 🌐 서버 & API 설정 (환경변수 기반)
  SERVER: {
    BASE_URL: process.env.SERVER_URL || (process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000'),
    PORT: process.env.PORT || 3000,
    ENDPOINTS: {
      ANALYZE: '/api/analyze',
      PROCESS_VIDEO: '/api/process-video', 
      PROCESS_BLOB: '/api/process-video-blob',
      STATS: '/api/stats',
      HEALTH: '/api/health'
    }
  },

  // 📱 플랫폼 정의  
  PLATFORMS: {
    INSTAGRAM: 'instagram',
    TIKTOK: 'tiktok',
    YOUTUBE: 'youtube', // 향후 확장용
    FACEBOOK: 'facebook' // 향후 확장용
  },

  // 🔗 플랫폼 URL 패턴
  PLATFORM_URLS: {
    INSTAGRAM: {
      BASE: 'https://www.instagram.com',
      POST_PATTERN: /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      REEL_PATTERN: /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      STORY_PATTERN: /instagram\.com\/stories\/([A-Za-z0-9_.-]+)/
    },
    TIKTOK: {
      BASE: 'https://www.tiktok.com',
      POST_PATTERN: /tiktok\.com\/@[^/]+\/video\/(\d+)/
    },
    YOUTUBE: {
      BASE: 'https://www.youtube.com',
      VIDEO_PATTERN: /youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
      SHORTS_PATTERN: /youtube\.com\/shorts\/([A-Za-z0-9_-]+)/,
      EMBED_PATTERN: /youtube\.com\/embed\/([A-Za-z0-9_-]+)/,
      SHORT_URL_PATTERN: /youtu\.be\/([A-Za-z0-9_-]+)/
    }
  },

  // ⚙️ 사용자 설정
  SETTINGS: {
    AUTO_ANALYSIS: 'autoAnalysis',
    SHOW_NOTIFICATIONS: 'showNotifications',
    DEFAULT_ANALYSIS_TYPE: 'defaultAnalysisType',
    AUTO_SAVE: 'autoSave',
    NOTIFICATION_POSITION: 'notificationPosition'
  },

  // 💾 스토리지 키
  STORAGE_KEYS: {
    SETTINGS: 'videosaverSettings',
    USER_PREFERENCES: 'userPreferences',
    CACHE_PREFIX: 'vs_cache_',
    PROCESSED_VIDEOS: 'processedVideos'
  },
  
  // 🎯 CSS 셀렉터
  SELECTORS: {
    INSTAGRAM: {
      // 게시물 컨테이너
      POSTS: [
        'article[role="presentation"]',
        'article',
        '[role="article"]'
      ],
      
      // 비디오 요소
      VIDEOS: 'video',
      
      // 저장 버튼 (다국어 지원)
      SAVE_BUTTONS: [
        'svg[aria-label*="저장"]',
        'svg[aria-label*="Save"]', 
        'svg[aria-label*="save"]',
        'svg[aria-label*="Guardar"]', // 스페인어
        'svg[aria-label*="Sauvegarder"]' // 프랑스어
      ].join(', '),
      
      // 사용자 정보
      AUTHOR: 'a[role="link"]',
      
      // 캡션 (여러 패턴)
      CAPTION: [
        '[data-testid="post-content"] span',
        'article h1',
        'article span[dir="auto"]',
        '.x1lliihq span',
        'h1 span'
      ],
      
      // 상호작용 요소
      LIKES: 'button[data-testid="like-count"]',
      COMMENTS: 'button[data-testid="comments-count"]',
      
      // 액션 섹션 (좋아요, 댓글 등)
      ACTION_SECTIONS: [
        'section:has(button[data-testid="like-count"])',
        'section div[role="button"]',
        'section span[role="button"]'
      ]
    },
    
    TIKTOK: {
      VIDEO_PLAYER: '[data-e2e="video-player"]',
      VIDEO_WRAPPER: '[data-e2e="video-wrapper"]', 
      SIDE_ACTIONS: '[data-e2e="video-side-actions"]',
      VIDEO_AUTHOR: '[data-e2e="video-author"]',
      VIDEO_DESC: '[data-e2e="video-desc"]',
      LIKE_COUNT: '[data-e2e="like-count"]',
      COMMENT_COUNT: '[data-e2e="comment-count"]',
      SHARE_COUNT: '[data-e2e="share-count"]'
    },
    
    YOUTUBE: {
      // 비디오 플레이어
      VIDEO_PLAYER: '#movie_player',
      VIDEO_ELEMENT: 'video',
      
      // 메타데이터
      VIDEO_TITLE: '#title h1.ytd-watch-metadata',
      VIDEO_TITLE_ALT: 'h1.ytd-video-primary-info-renderer',
      CHANNEL_NAME: '#channel-name a',
      CHANNEL_NAME_ALT: '.ytd-video-owner-renderer a',
      
      // 통계 정보
      VIEW_COUNT: '#info-text .view-count',
      VIEW_COUNT_ALT: '.ytd-video-view-count-renderer',
      LIKE_BUTTON: 'button[aria-label*="like"]',
      DISLIKE_BUTTON: 'button[aria-label*="dislike"]',
      
      // 설명 및 정보
      DESCRIPTION: '#description',
      DESCRIPTION_ALT: '.ytd-expandable-video-description-body-renderer',
      
      // 액션 버튼들
      DOWNLOAD_BUTTON: '#download-button',
      SHARE_BUTTON: 'button[aria-label*="Share"]',
      SAVE_BUTTON: 'button[aria-label*="Save"]',
      
      // Shorts 전용 셀렉터
      SHORTS_CONTAINER: '#shorts-container',
      SHORTS_PLAYER: '#shorts-player',
      SHORTS_INFO: '#info.ytd-shorts'
    }
  },
  
  // 📢 알림 타입
  NOTIFICATION_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info', 
    WARNING: 'warning'
  },

  // ⏱️ 타이밍 설정  
  TIMEOUTS: {
    // UI 상호작용
    ENHANCEMENT_THROTTLE: 10000,
    PROCESSING_DELAY: 500,
    BUTTON_RESET_DELAY: 3000,
    
    // 네트워크
    API_TIMEOUT: 30000,
    RETRY_DELAY: 2000,
    
    // 페이지 감지
    URL_CHECK_INTERVAL: 3000,
    SCROLL_DEBOUNCE: 2000,
    SCROLL_MIN_INTERVAL: 10000,
    
    // 알림
    NOTIFICATION_DURATION: 5000,
    
    // 분석
    ANALYSIS_TIMEOUT: 60000,
    THUMBNAIL_GENERATION: 15000
  },

  // 📏 제한 설정
  LIMITS: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_CAPTION_LENGTH: 2000,
    MAX_KEYWORDS: 20,
    MAX_HASHTAGS: 30,
    MAX_RETRY_ATTEMPTS: 3
  },

  // 🎨 UI 설정
  UI: {
    BUTTON_CLASSES: {
      SAVE: 'video-save-button',
      ANALYSIS: 'video-analysis-button', 
      LOADING: 'loading-button'
    },
    
    BUTTON_STYLES: {
      POSITION: 'absolute',
      Z_INDEX: 9999,
      FONT_SIZE: '12px',
      PADDING: '8px 12px',
      BORDER_RADIUS: '20px'
    },
    
    NOTIFICATION_POSITIONS: {
      TOP_RIGHT: 'top-right',
      TOP_LEFT: 'top-left', 
      BOTTOM_RIGHT: 'bottom-right',
      BOTTOM_LEFT: 'bottom-left'
    }
  },

  // 🔍 분석 설정
  ANALYSIS: {
    TYPES: {
      QUICK: 'quick',
      DETAILED: 'detailed',
      COMPREHENSIVE: 'comprehensive'
    },
    
    CONFIDENCE_THRESHOLDS: {
      HIGH: 0.8,
      MEDIUM: 0.6,
      LOW: 0.4
    }
  },

  // 📊 카테고리 매핑
  CATEGORIES: {
    MAIN: [
      '라이프·블로그',
      '게임', 
      '음악',
      '스포츠',
      '교육',
      '엔터테인먼트',
      '뉴스·정치',
      '과학·기술',
      '요리',
      '여행'
    ],
    
    MIDDLE: {
      '라이프·블로그': ['일상 Vlog·Q&A', '패션·뷰티', '육아·키즈'],
      '게임': ['PC게임', '모바일게임', '콘솔게임'],
      '음악': ['K-POP', '팝송', '클래식', '인디음악']
      // 필요시 확장
    }
  }
};