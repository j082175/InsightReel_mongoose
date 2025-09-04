export const dashboardConfig = {
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
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // 탭 시스템 설정
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

  // 통계 카드 설정
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

  // UI 설정
  ui: {
    videosPerPage: 20,
    cacheExpiry: 5 * 60 * 1000, // 5분
    lazyLoadOffset: 50,
    animationDuration: 200,
    searchDebounceDelay: 300,
    minSearchLength: 2,
    notificationDuration: 5000,
    defaultTheme: 'default',
    availableThemes: ['default', 'dark', 'youtube'],
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
    collectInterval: 3600000, // 1시간
    batchSize: 5,
    quotaLimits: {
      daily: 10000,
      warningThreshold: 8000, // 80%
      criticalThreshold: 9500  // 95%
    }
  }
};

export default dashboardConfig;