/**
 * 🎯 Video Analysis Feature - API Layer
 *
 * 비디오 분석 관련 API 호출 로직을 담당
 * - 채널별 영상 분석
 * - 트렌드 분석
 * - 성과 지표 계산
 */

import { VideoEntity, ChannelEntity } from '../../../entities';

// ===== API Request/Response Types =====
export interface AnalysisRequest {
  channelIds: string[];
  options?: {
    includeTrends?: boolean;
    includeKeywords?: boolean;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

export interface ChannelAnalysisResult {
  channelId: string;
  channelName: string;
  platform: string;
  videoCount: number;
  totalViews: number;
  avgViews: number;

  topVideo: {
    id: string;
    title: string;
    views: number;
    publishedAt: string;
    thumbnailUrl?: string;
  };

  trends: {
    viewGrowth: number;
    engagementRate: number;
    uploadFrequency: string;
    consistency: number;
  };

  keywords: string[];
  recommendations: string[];
}

export interface BatchAnalysisResult {
  totalChannels: number;
  totalVideos: number;
  totalViews: number;
  avgEngagementRate: number;
  channels: ChannelAnalysisResult[];
  generatedAt: string;
}

// ===== API Functions =====

/**
 * 채널 목록에 대한 분석을 실행합니다
 */
export const analyzeChannels = async (
  request: AnalysisRequest
): Promise<BatchAnalysisResult> => {
  try {
    const response = await fetch('/api/videos/analyze-channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Channel analysis error:', error);
    throw error;
  }
};

/**
 * 개별 채널에 대한 상세 분석
 */
export const analyzeChannel = async (
  channelId: string
): Promise<ChannelAnalysisResult> => {
  try {
    const response = await fetch(`/api/channels/${channelId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Channel analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Individual channel analysis error:', error);
    throw error;
  }
};

/**
 * 비디오 트렌드 분석
 */
export const analyzeTrends = async (
  videoIds: string[]
): Promise<{
  trendingUp: VideoEntity[];
  trendingDown: VideoEntity[];
  insights: string[];
}> => {
  try {
    const response = await fetch('/api/videos/analyze-trends', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoIds }),
    });

    if (!response.ok) {
      throw new Error(`Trend analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Trend analysis error:', error);
    throw error;
  }
};

/**
 * 분석 결과 내보내기
 */
export const exportAnalysisResults = async (
  results: BatchAnalysisResult,
  format: 'json' | 'csv' | 'excel' = 'json'
): Promise<Blob> => {
  try {
    const response = await fetch('/api/videos/export-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ results, format }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Export analysis error:', error);
    throw error;
  }
};

// ===== Mock API (Development) =====

/**
 * 개발용 모의 분석 함수
 */
export const mockAnalyzeChannels = async (
  channelNames: string[],
  onProgress?: (step: string, progress: number) => void
): Promise<BatchAnalysisResult> => {
  const results: ChannelAnalysisResult[] = [];

  for (let i = 0; i < channelNames.length; i++) {
    const channelName = channelNames[i];

    if (onProgress) {
      onProgress(
        `${channelName} 분석 중...`,
        ((i + 1) / channelNames.length) * 100
      );
    }

    // 모의 지연
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockResult: ChannelAnalysisResult = {
      channelId: `channel_${i}`,
      channelName,
      platform: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'][
        Math.floor(Math.random() * 3)
      ],
      videoCount: Math.floor(Math.random() * 500) + 50,
      totalViews: Math.floor(Math.random() * 10000000) + 1000000,
      avgViews: Math.floor(Math.random() * 500000) + 50000,
      topVideo: {
        id: `video_${i}_top`,
        title: `${channelName}의 인기 영상 제목`,
        views: Math.floor(Math.random() * 2000000) + 500000,
        publishedAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      trends: {
        viewGrowth: Math.floor(Math.random() * 50) + 10,
        engagementRate: Math.random() * 10 + 2,
        uploadFrequency: ['매일', '주 2-3회', '주간', '월 2-3회'][
          Math.floor(Math.random() * 4)
        ],
        consistency: Math.random() * 0.5 + 0.5,
      },
      keywords: ['트렌드', '인기', '리뷰', '일상', 'VLOG']
        .sort(() => 0.5 - Math.random())
        .slice(0, 3),
      recommendations: [
        '업로드 빈도를 높이면 더 많은 노출 기회를 얻을 수 있습니다',
        '시청자 참여도가 높은 콘텐츠 유형을 더 제작해보세요',
        '트렌딩 키워드를 활용한 콘텐츠 기획을 추천합니다',
      ]
        .sort(() => 0.5 - Math.random())
        .slice(0, 2),
    };

    results.push(mockResult);
  }

  return {
    totalChannels: results.length,
    totalVideos: results.reduce((sum, r) => sum + r.videoCount, 0),
    totalViews: results.reduce((sum, r) => sum + r.totalViews, 0),
    avgEngagementRate:
      results.reduce((sum, r) => sum + r.trends.engagementRate, 0) /
      results.length,
    channels: results,
    generatedAt: new Date().toISOString(),
  };
};
