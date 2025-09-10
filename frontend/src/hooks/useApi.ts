import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { Video, Channel } from '../types';

// API 응답 타입 정의
interface PlatformStats {
  youtube?: number;
  instagram?: number;
  tiktok?: number;
}

interface ResponseMeta {
  page?: number;
  totalPages?: number;
  hasMore?: boolean;
}

interface VideosResponse {
  videos: Video[];
  total?: number;
  platform_stats?: PlatformStats;
}

interface ChannelsResponse {
  channels: Channel[];
  meta?: ResponseMeta;
}

// 영상 목록 조회
export const useVideos = () => {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      try {
        const response = await apiClient.getVideos();
        console.log('🎬 Videos API 응답:', response);
        
        // 백엔드 응답 구조: { data: { videos: [...], total: ..., platform_stats: {...} } }
        const data = response?.data as unknown as VideosResponse;
        const videos = data?.videos || (response?.data as unknown as Video[]) || [];
        console.log('📊 파싱된 영상 수:', videos.length);
        console.log('🔍 첫 번째 영상 샘플:', videos[0]);
        
        // 🐛 플랫폼 정보 디버깅
        videos.forEach((video: any, index: number) => {
          if (index < 3) { // 처음 3개만 로그
            console.log(`🔍 영상 ${index + 1} 플랫폼 정보:`, {
              title: video.title?.substring(0, 30) + '...',
              platform: video.platform,
              rawData: video
            });
          }
        });
        
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
        const data = response?.data as unknown as ChannelsResponse;
        const channels = data?.channels || (response?.data as unknown as Channel[]) || [];
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