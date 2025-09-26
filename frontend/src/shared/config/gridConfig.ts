/**
 * 전역 그리드 설정
 * 모든 UniversalGrid에서 사용하는 중앙 집중식 설정
 */
export const GRID_CONFIG = {
  // 기본 그리드 크기 (1: 가장 작음, 4: 가장 큼)
  DEFAULT_GRID_SIZE: 2,

  // 화면별 최대 표시 개수 (gridSize=2 기준)
  MAX_ITEMS_BY_SCREEN: {
    XL_PLUS: 6,  // 1400px+
    XL: 6,       // 1200px+
    LG: 4,       // 1024px+
    MD: 3,       // 768px+
    SM: 3,       // 640px+
    XS: 2,       // <640px
  },

  // 가상 스크롤링 최적화 설정
  VIRTUAL_SCROLLING: {
    CONTAINER_HEIGHT: 600,
    OVERSCAN: 8, // 화면 밖 8개 행 (약 3200px, 8초 스크롤 분량)
    INCREASE_VIEWPORT_BY: 400, // 뷰포트 확장 (위아래 각 200px)
  }
} as const;

// 타입 정의
export type GridSize = 1 | 2 | 3 | 4;
export type ScreenSize = keyof typeof GRID_CONFIG.MAX_ITEMS_BY_SCREEN;