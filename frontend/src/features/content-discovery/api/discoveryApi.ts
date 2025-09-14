/**
 * 🎯 Content Discovery Feature - API Layer
 *
 * 콘텐츠 발굴 관련 API 호출 로직을 담당
 * - 트렌드 키워드 분석
 * - 콘텐츠 아이디어 생성
 * - 경쟁 분석
 */

import { Platform } from '../../../entities';

// ===== API Request/Response Types =====
export interface TrendData {
  id: string;
  keyword: string;
  platform: Platform | 'All';
  growth: number;
  volume: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  relatedKeywords: string[];
  suggestedTopics: string[];
  competitionLevel: number;
  seasonality?: {
    peak: string[];
    low: string[];
  };
}

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  platform: Platform;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedViews: number;
  tags: string[];
  inspiration: {
    keyword: string;
    trend: string;
  };
  createdAt: string;
}

export interface TrendAnalysisRequest {
  keywords?: string[];
  platforms?: Platform[];
  categories?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'year';
  region?: string;
}

export interface CompetitorAnalysis {
  keyword: string;
  topChannels: Array<{
    channelName: string;
    platform: Platform;
    avgViews: number;
    videoCount: number;
    successRate: number;
  }>;
  contentGaps: string[];
  opportunities: string[];
}

// ===== Discovery API Functions =====

/**
 * 트렌드 키워드 목록을 조회합니다
 */
export const fetchTrends = async (request?: TrendAnalysisRequest): Promise<TrendData[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (request?.keywords) queryParams.set('keywords', request.keywords.join(','));
    if (request?.platforms) queryParams.set('platforms', request.platforms.join(','));
    if (request?.categories) queryParams.set('categories', request.categories.join(','));
    if (request?.timeRange) queryParams.set('timeRange', request.timeRange);
    if (request?.region) queryParams.set('region', request.region);

    const response = await fetch(`/api/discover/trends?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trends: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch trends error:', error);
    throw error;
  }
};

/**
 * 특정 키워드에 대한 상세 분석을 수행합니다
 */
export const analyzeTrend = async (keyword: string): Promise<{
  trend: TrendData;
  competitorAnalysis: CompetitorAnalysis;
  contentIdeas: ContentIdea[];
}> => {
  try {
    const response = await fetch('/api/discover/analyze-trend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword }),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze trend: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Analyze trend error:', error);
    throw error;
  }
};

/**
 * AI를 통해 콘텐츠 아이디어를 생성합니다
 */
export const generateContentIdeas = async (params: {
  keywords: string[];
  platform: Platform;
  category?: string;
  count?: number;
}): Promise<ContentIdea[]> => {
  try {
    const response = await fetch('/api/discover/generate-ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate ideas: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Generate ideas error:', error);
    throw error;
  }
};

/**
 * 경쟁사 분석을 수행합니다
 */
export const analyzeCompetition = async (
  keyword: string,
  platform?: Platform
): Promise<CompetitorAnalysis> => {
  try {
    const response = await fetch('/api/discover/analyze-competition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword, platform }),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze competition: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Analyze competition error:', error);
    throw error;
  }
};

/**
 * 트렌드 알림을 설정합니다
 */
export const setTrendAlert = async (params: {
  keywords: string[];
  threshold: number;
  platforms: Platform[];
  email?: string;
}): Promise<{ alertId: string }> => {
  try {
    const response = await fetch('/api/discover/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to set alert: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Set trend alert error:', error);
    throw error;
  }
};

// ===== Mock API (Development) =====

/**
 * 개발용 모의 트렌드 데이터 생성
 */
export const mockFetchTrends = async (): Promise<TrendData[]> => {
  // 모의 지연
  await new Promise(resolve => setTimeout(resolve, 1000));

  return [
    {
      id: '1',
      keyword: 'AI 그림 생성',
      platform: 'YOUTUBE',
      growth: 234,
      volume: 45000,
      difficulty: 'Medium',
      category: '기술/IT',
      relatedKeywords: ['미드저니', 'Stable Diffusion', 'DALL-E', '인공지능'],
      suggestedTopics: ['AI 그림 툴 비교', '무료 AI 그림 생성 방법', 'AI 아트 창작 과정'],
      competitionLevel: 67
    },
    {
      id: '2',
      keyword: '홈 카페',
      platform: 'INSTAGRAM',
      growth: 189,
      volume: 128000,
      difficulty: 'Easy',
      category: '라이프스타일',
      relatedKeywords: ['커피', '원두', '라떼아트', '홈브루잉'],
      suggestedTopics: ['집에서 카페 음료 만들기', '원두 추천', '홈카페 인테리어'],
      competitionLevel: 45
    },
    {
      id: '3',
      keyword: 'ChatGPT 활용법',
      platform: 'YOUTUBE',
      growth: 412,
      volume: 89000,
      difficulty: 'Medium',
      category: '교육/학습',
      relatedKeywords: ['OpenAI', '프롬프트', '자동화', 'AI 도구'],
      suggestedTopics: ['업무 자동화', '학습 도우미 활용', 'ChatGPT 프롬프트 팁'],
      competitionLevel: 78
    },
    {
      id: '4',
      keyword: '요가 루틴',
      platform: 'TIKTOK',
      growth: 78,
      volume: 234000,
      difficulty: 'Easy',
      category: '건강/피트니스',
      relatedKeywords: ['명상', '스트레칭', '필라테스', '홈트'],
      suggestedTopics: ['초보자 요가', '아침 요가 루틴', '스트레스 해소 요가'],
      competitionLevel: 34
    },
    {
      id: '5',
      keyword: '투자 공부',
      platform: 'YOUTUBE',
      growth: 156,
      volume: 67000,
      difficulty: 'Hard',
      category: '재테크',
      relatedKeywords: ['주식', '부동산', '펀드', '경제'],
      suggestedTopics: ['초보자 투자 가이드', '분산투자 전략', '경제 지표 읽는 법'],
      competitionLevel: 89
    }
  ];
};