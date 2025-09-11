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

// 안전한 속성 접근 헬퍼
const hasProperty = <T extends string>(obj: unknown, prop: T): obj is Record<T, unknown> => {
  return typeof obj === 'object' && obj !== null && prop in obj;
};

// 타입 가드 함수들
const isVideosResponse = (data: unknown): data is VideosResponse => {
  if (!hasProperty(data, 'videos')) {
    return false;
  }
  return Array.isArray(data.videos);
};

const isVideoArray = (data: unknown): data is Video[] => {
  return Array.isArray(data) && (
    data.length === 0 || 
    (typeof data[0] === 'object' && data[0] !== null && 'id' in data[0])
  );
};

const isChannelsResponse = (data: unknown): data is ChannelsResponse => {
  if (!hasProperty(data, 'channels')) {
    return false;
  }
  return Array.isArray(data.channels);
};

const isChannelArray = (data: unknown): data is Channel[] => {
  return Array.isArray(data) && (
    data.length === 0 || 
    (typeof data[0] === 'object' && data[0] !== null && 'id' in data[0])
  );
};

// API 응답 데이터 검증 및 파싱 헬퍼
const parseVideosResponse = (response: { data?: unknown }): Video[] => {
  if (!response || !response.data) {
    return [];
  }

  const data = response.data;
  
  // VideosResponse 형태인지 확인
  if (isVideosResponse(data)) {
    return data.videos;
  }

  // 직접 Video 배열인지 확인
  if (isVideoArray(data)) {
    return data;
  }

  return [];
};

const parseChannelsResponse = (response: { data?: unknown }): Channel[] => {
  if (!response || !response.data) {
    return [];
  }

  const data = response.data;
  
  // ChannelsResponse 형태인지 확인
  if (isChannelsResponse(data)) {
    return data.channels;
  }

  // 직접 Channel 배열인지 확인
  if (isChannelArray(data)) {
    return data;
  }

  return [];
};

// 영상 목록 조회
export const useVideos = () => {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      try {
        const response = await apiClient.getVideos();
        console.log('🎬 Videos API 응답:', response);
        
        const videos = parseVideosResponse(response);
        console.log('📊 파싱된 영상 수:', videos.length);
        
        if (videos.length > 0) {
          console.log('🔍 첫 번째 영상 샘플:', videos[0]);
        }
        
        // 플랫폼 정보 디버깅 (처음 3개만)
        videos.slice(0, 3).forEach((video, index) => {
          console.log(`🔍 영상 ${index + 1} 플랫폼 정보:`, {
            title: video.title?.substring(0, 30) + '...',
            platform: video.platform,
          });
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
        
        const channels = parseChannelsResponse(response);
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