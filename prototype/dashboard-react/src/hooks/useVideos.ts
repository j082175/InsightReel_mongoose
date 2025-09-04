import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { Video, APIResponse } from '../types/index';
import { dashboardConfig } from '../config/dashboard.config';

interface UseVideosOptions {
  page?: number;
  limit?: number;
  platform?: string;
  search?: string;
  enabled?: boolean;
}

export const useVideos = (options: UseVideosOptions = {}) => {
  const {
    page = 1,
    limit = dashboardConfig.ui.videosPerPage,
    platform,
    search,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['videos', { page, limit, platform, search }],
    queryFn: async (): Promise<Video[]> => {
      const response = await apiClient.getVideos({
        page,
        limit,
        platform,
        search,
      });
      
      console.log('🔍 API 응답 데이터:', response);
      
      if (!response.success) {
        throw new Error(response.error || '영상 목록을 불러오는데 실패했습니다.');
      }

      // 서버에서 반환하는 데이터 구조: {videos: Array, total: number, ...}
      const data = response.data || {};
      const videos = data.videos || [];
      
      if (!Array.isArray(videos)) {
        console.warn('⚠️ videos 필드가 배열이 아닙니다:', videos);
        return [];
      }

      console.log(`✅ ${videos.length}개의 영상 데이터를 성공적으로 로드했습니다.`);
      return videos;
    },
    staleTime: dashboardConfig.ui.cacheExpiry,
    refetchOnWindowFocus: false,
    enabled,
  });
};

export const useTrendingStats = (options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: ['trending-stats'],
    queryFn: async () => {
      const response = await apiClient.getTrendingStats();
      if (!response.success) {
        throw new Error(response.error || '트렌딩 통계를 불러오는데 실패했습니다.');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
    enabled,
  });
};

export const useQuotaStatus = (options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: ['quota-status'],
    queryFn: async () => {
      const response = await apiClient.getQuotaStatus();
      if (!response.success) {
        throw new Error(response.error || 'API 할당량 정보를 불러오는데 실패했습니다.');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2분
    refetchOnWindowFocus: false,
    enabled,
  });
};

export const useServerStatus = () => {
  return useQuery({
    queryKey: ['server-status'],
    queryFn: async () => {
      const isConnected = await apiClient.testConnection();
      return isConnected;
    },
    staleTime: 30 * 1000, // 30초
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // 1분마다 자동 체크
  });
};