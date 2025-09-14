/**
 * 🎯 Trending Collection Feature - API Layer
 *
 * 트렌딩 수집 관련 API 호출 로직을 담당
 * - 채널별 트렌딩 영상 수집
 * - 수집 배치 관리
 * - 수집 결과 조회
 */

import { VideoEntity, ChannelEntity } from '../../../entities';

// ===== API Request/Response Types =====
export interface CollectionFilters {
  daysBack: number;
  minViews: number;
  maxViews?: number;
  minDuration?: number;
  maxDuration?: number;
  includeShorts: boolean;
  includeLongForm: boolean;
  keywords: string[];
  excludeKeywords: string[];
}

export interface CollectionRequest {
  channels: string[];
  filters: CollectionFilters;
  batchName?: string;
  color?: string;
}

export interface CollectionResult {
  channelId: string;
  channelName: string;
  platform: string;
  foundVideos: number;
  collectedVideos: number;
  status: 'collecting' | 'completed' | 'error';
  errorMessage?: string;
  videos: VideoEntity[];
}

export interface BatchCollectionResult {
  batchId: string;
  batchName: string;
  totalChannels: number;
  totalVideosFound: number;
  totalVideosCollected: number;
  status: 'pending' | 'collecting' | 'completed' | 'error';
  channels: CollectionResult[];
  startedAt: string;
  completedAt?: string;
  filters: CollectionFilters;
}

// ===== Collection API Functions =====

/**
 * 여러 채널에서 트렌딩 영상을 수집합니다
 */
export const collectTrendingBulk = async (
  request: CollectionRequest,
  onProgress?: (result: CollectionResult) => void
): Promise<BatchCollectionResult> => {
  try {
    const response = await fetch('/api/channel-groups/collect-multiple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Collection failed: ${response.statusText}`);
    }

    // 실시간 진행 상황 업데이트를 위한 SSE 연결
    if (onProgress) {
      const eventSource = new EventSource(
        `/api/collection-progress/${response.headers.get('x-batch-id')}`
      );

      eventSource.onmessage = (event) => {
        const progress = JSON.parse(event.data) as CollectionResult;
        onProgress(progress);

        if (progress.status === 'completed' || progress.status === 'error') {
          eventSource.close();
        }
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Bulk collection error:', error);
    throw error;
  }
};

/**
 * 개별 채널에서 트렌딩 영상을 수집합니다
 */
export const collectTrendingChannel = async (
  channelId: string,
  filters: CollectionFilters
): Promise<CollectionResult> => {
  try {
    const response = await fetch('/api/collect-trending', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelId, filters }),
    });

    if (!response.ok) {
      throw new Error(`Channel collection failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Channel collection error:', error);
    throw error;
  }
};

/**
 * 수집 배치 목록을 조회합니다
 */
export const fetchCollectionBatches = async (): Promise<BatchCollectionResult[]> => {
  try {
    const response = await fetch('/api/collection-batches');
    if (!response.ok) {
      throw new Error(`Failed to fetch batches: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch batches error:', error);
    throw error;
  }
};

/**
 * 특정 배치의 상세 정보를 조회합니다
 */
export const fetchBatchDetails = async (batchId: string): Promise<BatchCollectionResult> => {
  try {
    const response = await fetch(`/api/collection-batches/${batchId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch batch details: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch batch details error:', error);
    throw error;
  }
};

/**
 * 수집 배치를 삭제합니다
 */
export const deleteBatch = async (batchId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/batches/${batchId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete batch: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Delete batch error:', error);
    throw error;
  }
};

/**
 * 트렌딩 영상 목록을 조회합니다
 */
export const fetchTrendingVideos = async (
  filters?: {
    batchId?: string;
    platform?: string;
    dateRange?: { from: string; to: string };
    limit?: number;
  }
): Promise<VideoEntity[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.batchId) queryParams.set('batchId', filters.batchId);
    if (filters?.platform) queryParams.set('platform', filters.platform);
    if (filters?.dateRange) {
      queryParams.set('from', filters.dateRange.from);
      queryParams.set('to', filters.dateRange.to);
    }
    if (filters?.limit) queryParams.set('limit', filters.limit.toString());

    const response = await fetch(`/api/trending/videos?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trending videos: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch trending videos error:', error);
    throw error;
  }
};