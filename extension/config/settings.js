// Extension 설정 파일
// Chrome Extension 런타임에서 사용 가능한 설정

// Content script에서 chrome.runtime을 사용할 수 없으므로 간단한 방식 사용
window.EXTENSION_CONFIG = {
  // 서버 설정 - 현재는 개발 환경으로 고정 (실제 배포 시 수정)
  SERVER_URL: 'http://localhost:3000',
  
  // API 엔드포인트
  ENDPOINTS: {
    ANALYZE: '/api/analyze',
    ANALYZE_CHANNEL: '/api/analyze-channel',
    PROCESS_VIDEO: '/api/process-video',
    PROCESS_BLOB: '/api/process-video-blob',
    HEALTH: '/health'
  },
  
  // 개발 모드 플래그 (현재는 true로 고정)
  IS_DEVELOPMENT: true
};