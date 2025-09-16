/**
 * 🎯 App Layer - Application Routes
 *
 * 애플리케이션의 라우팅 설정
 * - 페이지별 경로 정의
 * - 네비게이션 구성
 */

export interface RouteConfig {
  id: string;
  path: string;
  label: string;
  icon?: string;
  category: 'main' | 'trending' | 'management';
  description?: string;
}

export const ROUTES: Record<string, RouteConfig> = {
  // Main Routes
  DASHBOARD: {
    id: 'dashboard',
    path: '/',
    label: '대시보드',
    icon: '📊',
    category: 'main',
    description: '전체 현황 및 주요 지표',
  },
  CHANNELS: {
    id: 'channels',
    path: '/channels',
    label: '채널 관리',
    icon: '📺',
    category: 'management',
    description: '채널 추가, 편집, 분석',
  },
  ARCHIVE: {
    id: 'archive',
    path: '/archive',
    label: '비디오 아카이브',
    icon: '🗂️',
    category: 'main',
    description: '수집된 비디오 관리',
  },
  DISCOVERY: {
    id: 'discovery',
    path: '/discovery',
    label: '소재 발굴',
    icon: '🔍',
    category: 'main',
    description: '트렌드 키워드 및 콘텐츠 아이디어',
  },
  IDEAS: {
    id: 'ideas',
    path: '/ideas',
    label: '아이디어 관리',
    icon: '💡',
    category: 'main',
    description: '생성된 콘텐츠 아이디어 관리',
  },

  // Trending Routes
  TRENDING_COLLECTION: {
    id: 'trending-collection',
    path: '/trending/collection',
    label: '트렌딩 수집',
    icon: '📈',
    category: 'trending',
    description: '트렌딩 비디오 수집 및 설정',
  },
  TRENDING_VIDEOS: {
    id: 'trending-videos',
    path: '/trending/videos',
    label: '트렌딩 영상',
    icon: '🔥',
    category: 'trending',
    description: '수집된 트렌딩 영상 보기',
  },
  TRENDING_BATCHES: {
    id: 'trending-batches',
    path: '/trending/batches',
    label: '배치 관리',
    icon: '📦',
    category: 'trending',
    description: '수집 배치 현황 및 관리',
  },
  TRENDING_DASHBOARD: {
    id: 'trending-dashboard',
    path: '/trending/dashboard',
    label: '트렌드 대시보드',
    icon: '📊',
    category: 'trending',
    description: '트렌드 분석 대시보드',
  },
} as const;

// Route categories for navigation
export const ROUTE_CATEGORIES = {
  main: {
    label: '메인',
    routes: Object.values(ROUTES).filter((route) => route.category === 'main'),
  },
  trending: {
    label: '트렌딩',
    routes: Object.values(ROUTES).filter(
      (route) => route.category === 'trending'
    ),
  },
  management: {
    label: '관리',
    routes: Object.values(ROUTES).filter(
      (route) => route.category === 'management'
    ),
  },
} as const;

// Helper functions
export const getRouteById = (id: string): RouteConfig | undefined => {
  return Object.values(ROUTES).find((route) => route.id === id);
};

export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return Object.values(ROUTES).find((route) => route.path === path);
};
