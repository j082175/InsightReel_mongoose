import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

// 영상 목록 조회
export const useVideos = () => {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      try {
        const response = await apiClient.getVideos();
        console.log('🎬 Videos API 응답:', response);
        
        // 백엔드 응답 구조: { data: { videos: [...], total: ..., platform_stats: {...} } }
        const videos = response?.data?.videos || response?.data || [];
        console.log('📊 파싱된 영상 수:', videos.length);
        console.log('🔍 첫 번째 영상 샘플:', videos[0]);
        
        return videos;
      } catch (error) {
        console.warn('영상 API 호출 실패, 빈 배열 반환:', error);
        return [];
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  });
};

// 트렌딩 통계 조회
export const useTrendingStats = () => {
  return useQuery({
    queryKey: ['trendingStats'],
    queryFn: async () => {
      const response = await apiClient.getTrendingStats();
      return response.data;
    },
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10분
  });
};

// API 할당량 상태 조회
export const useQuotaStatus = () => {
  return useQuery({
    queryKey: ['quotaStatus'],
    queryFn: async () => {
      const response = await apiClient.getQuotaStatus();
      return response.data;
    },
    retry: 2,
    staleTime: 15 * 60 * 1000, // 15분
  });
};

// 서버 상태 조회
export const useServerStatus = () => {
  return useQuery({
    queryKey: ['serverStatus'],
    queryFn: () => apiClient.testConnection(),
    retry: 1,
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 체크
  });
};

// 채널 목록 조회
export const useChannels = () => {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      try {
        const response = await apiClient.getChannels();
        console.log('🔍 Channels API 응답:', response);
        // 백엔드 응답 구조: { data: { channels: [...], meta: {...} } }
        const channels = response?.data?.channels || response?.data || [];
        console.log('📊 파싱된 채널 수:', channels.length);
        return channels;
      } catch (error) {
        console.warn('채널 API 호출 실패, mock 데이터 사용:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  });
};

// 트렌딩 수집 뮤테이션
export const useCollectTrending = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.collectTrending(),
    onSuccess: () => {
      // 성공 후 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['trendingStats'] });
      queryClient.invalidateQueries({ queryKey: ['quotaStatus'] });
      console.log('✅ 트렌딩 영상 수집 완료');
    },
    onError: (error) => {
      console.error('❌ 트렌딩 영상 수집 실패:', error);
    },
  });
};