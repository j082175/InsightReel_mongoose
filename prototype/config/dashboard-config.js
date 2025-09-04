/**
 * Dashboard Configuration - 확장 가능한 설정 시스템
 * 모든 하드코딩된 값들을 중앙 집중식으로 관리
 */

const DashboardConfig = {
  // API 엔드포인트 설정
  api: {
    baseUrl: 'http://localhost:3000',
    endpoints: {
      videos: '/api/videos',
      trending: '/api/trending-stats',
      collectTrending: '/api/collect-trending',
      channels: '/api/channels',
      health: '/health',
      testSheets: '/api/test-sheets',
      quotaStatus: '/api/quota-status'
    },
    // 요청 설정
    timeout: 30000, // 30초
    retryAttempts: 3,
    retryDelay: 1000 // 1초
  },

  // 탭 시스템 설정 - 쉽게 추가/제거 가능
  tabs: [
    { 
      id: 'videos', 
      label: '수집된 영상', 
      icon: '📹',
      description: '자동으로 수집된 모든 영상들을 확인할 수 있습니다.',
      defaultActive: true
    },
    { 
      id: 'trending', 
      label: 'YouTube 트렌딩', 
      icon: '🔥',
      description: 'YouTube에서 인기 있는 트렌딩 영상들을 확인하고 수집할 수 있습니다.',
      defaultActive: false
    },
    { 
      id: 'channels', 
      label: '채널 관리', 
      icon: '👥',
      description: '구독 중인 채널들을 관리하고 새로운 채널을 추가할 수 있습니다.',
      defaultActive: false
    },
    { 
      id: 'analytics', 
      label: '분석 리포트', 
      icon: '📊',
      description: '수집된 영상들의 통계와 분석 결과를 확인할 수 있습니다.',
      defaultActive: false
    }
  ],

  // 통계 카드 설정 - 동적 생성 가능
  statCards: {
    videos: [
      {
        id: 'total-videos',
        label: '총 영상 수',
        icon: '🎬',
        value: 0,
        color: 'primary',
        clickable: false
      },
      {
        id: 'today-videos', 
        label: '오늘 수집',
        icon: '📅',
        value: 0,
        color: 'success',
        clickable: true,
        onclick: 'filterTodayVideos'
      },
      {
        id: 'processing',
        label: '처리 중',
        icon: '⏳',
        value: 0,
        color: 'warning',
        clickable: true,
        onclick: 'filterProcessingVideos'
      },
      {
        id: 'server-status',
        label: '서버 상태',
        icon: '🔌',
        value: '연결 확인 중...',
        color: 'info',
        clickable: true,
        onclick: 'testServerConnection'
      }
    ],
    trending: [
      {
        id: 'trending-count',
        label: '트렌딩 영상',
        icon: '🔥',
        value: 0,
        color: 'error'
      },
      {
        id: 'last-update',
        label: '마지막 업데이트',
        icon: '🕐',
        value: '없음',
        color: 'secondary'
      },
      {
        id: 'quota-usage',
        label: 'API 할당량',
        icon: '📊',
        value: '확인 중...',
        color: 'warning'
      }
    ]
  },

  // 필터 설정 - 각 탭별 필터
  filters: {
    videos: [
      {
        key: 'platform',
        type: 'select',
        label: '플랫폼',
        placeholder: '모든 플랫폼',
        options: [
          { value: 'youtube', label: 'YouTube' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'tiktok', label: 'TikTok' }
        ]
      },
      {
        key: 'category',
        type: 'select',
        label: '카테고리',
        placeholder: '모든 카테고리',
        options: [] // 동적으로 로드
      },
      {
        key: 'dateRange',
        type: 'select',
        label: '기간',
        placeholder: '전체 기간',
        options: [
          { value: 'today', label: '오늘' },
          { value: 'week', label: '최근 1주일' },
          { value: 'month', label: '최근 1개월' },
          { value: 'custom', label: '사용자 지정' }
        ]
      },
      {
        key: 'status',
        type: 'select', 
        label: '상태',
        placeholder: '모든 상태',
        options: [
          { value: 'completed', label: '완료' },
          { value: 'processing', label: '처리 중' },
          { value: 'error', label: '오류' }
        ]
      }
    ]
  },

  // 채널 관리 설정
  channels: {
    youtube: [
      { id: 'UCXuqSBlHAE6Xw-yeJA0Tunw', name: 'Linus Tech Tips', active: true },
      { id: 'UCsBjURrPoezykLs9EqgamOA', name: 'Fireship', active: true },
      { id: 'UC8butISFwT-Wl7EV0hUK0BQ', name: 'freeCodeCamp', active: true },
      { id: 'UCWv7vMbMWH4-V0ZXdmDpPBA', name: 'Programming with Mosh', active: false }
    ],
    maxChannels: 50,
    defaultChannelLimit: 10
  },

  // UI 설정
  ui: {
    // 페이징
    videosPerPage: 20,
    maxVideosPerPage: 100,
    
    // 캐싱
    cacheExpiry: 5 * 60 * 1000, // 5분
    
    // 지연 로딩
    lazyLoadOffset: 50,
    
    // 애니메이션
    animationDuration: 200,
    
    // 검색
    searchDebounceDelay: 300,
    minSearchLength: 2,
    
    // 알림
    notificationDuration: 5000,
    
    // 테마
    defaultTheme: 'default',
    availableThemes: ['default', 'dark', 'youtube'],
    
    // 반응형 브레이크포인트
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1400
    }
  },

  // 트렌딩 수집 설정
  trending: {
    maxVideosPerChannel: 8,
    minViewCount: 50000,
    maxDaysOld: 7,
    collectInterval: 3600000, // 1시간 (밀리초)
    batchSize: 5, // 동시 처리할 채널 수
    
    // YouTube API 할당량 관리
    quotaLimits: {
      daily: 10000,
      warningThreshold: 8000, // 80%
      criticalThreshold: 9500  // 95%
    }
  },

  // 성능 설정
  performance: {
    // 이미지 최적화
    thumbnailSize: { width: 320, height: 180 },
    avatarSize: { width: 48, height: 48 },
    
    // 네트워크
    maxConcurrentRequests: 3,
    requestDelay: 500,
    
    // 메모리
    maxCacheSize: 100, // 캐시할 최대 아이템 수
    cleanupInterval: 10 * 60 * 1000 // 10분마다 정리
  },

  // 보안 설정
  security: {
    // CSP 설정
    allowedDomains: [
      'localhost:3000',
      'img.youtube.com',
      'i.ytimg.com',
      'www.youtube.com',
      'www.instagram.com'
    ],
    
    // HTTPS 강제
    enforceHTTPS: false, // 개발 환경에서는 false
    
    // API 키 마스킹
    maskApiKeys: true
  },

  // 로깅 설정
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    enableConsole: true,
    enableNetwork: true,
    maxLogEntries: 1000
  },

  // 개발자 설정
  development: {
    enableDebugMode: true,
    showPerformanceMetrics: true,
    mockAPIResponses: false,
    verboseLogging: false
  }
};

// 설정 유틸리티 함수들
DashboardConfig.utils = {
  // 탭 가져오기
  getTab: function(tabId) {
    return this.tabs.find(tab => tab.id === tabId);
  },
  
  // 활성 탭 가져오기
  getActiveTab: function() {
    return this.tabs.find(tab => tab.defaultActive) || this.tabs[0];
  },
  
  // API URL 생성
  getApiUrl: function(endpoint) {
    const baseUrl = this.api.baseUrl;
    const endpointPath = this.api.endpoints[endpoint] || endpoint;
    return `${baseUrl}${endpointPath}`;
  },
  
  // 통계 카드 가져오기
  getStatCards: function(tabId) {
    return this.statCards[tabId] || [];
  },
  
  // 필터 가져오기
  getFilters: function(tabId) {
    return this.filters[tabId] || [];
  },
  
  // 테마 설정 검증
  isValidTheme: function(theme) {
    return this.ui.availableThemes.includes(theme);
  },
  
  // 환경별 설정 병합
  mergeEnvironmentConfig: function(envConfig) {
    if (typeof envConfig === 'object') {
      Object.assign(this, envConfig);
    }
  },
  
  // 설정 검증
  validate: function() {
    const errors = [];
    
    // 필수 API 설정 확인
    if (!this.api.baseUrl) {
      errors.push('API baseUrl is required');
    }
    
    // 탭 설정 확인
    if (!Array.isArray(this.tabs) || this.tabs.length === 0) {
      errors.push('At least one tab configuration is required');
    }
    
    // 기본 활성 탭 확인
    const activeTabs = this.tabs.filter(tab => tab.defaultActive);
    if (activeTabs.length !== 1) {
      errors.push('Exactly one tab must be set as defaultActive');
    }
    
    return errors;
  }
};

// 브라우저 환경에서 export
if (typeof window !== 'undefined') {
  window.DashboardConfig = DashboardConfig;
}

// Node.js 환경에서 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardConfig;
}

export default DashboardConfig;