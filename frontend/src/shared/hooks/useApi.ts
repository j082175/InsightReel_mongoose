import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  videosApi,
  channelsApi,
  channelGroupsApi,
  batchesApi,
  healthApi,
} from '../services/apiClient';
import {
  Video,
  Channel,
  ChannelGroup,
  CollectionBatch,
  TrendingVideo,
} from '../types';
import toast from 'react-hot-toast';
import axios from 'axios';

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
const hasProperty = <T extends string>(
  obj: unknown,
  prop: T
): obj is Record<T, unknown> => {
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
  return (
    Array.isArray(data) &&
    (data.length === 0 ||
      (typeof data[0] === 'object' && data[0] !== null && ('id' in data[0] || '_id' in data[0])))
  );
};

const isChannelsResponse = (data: unknown): data is ChannelsResponse => {
  if (!hasProperty(data, 'channels')) {
    return false;
  }
  return Array.isArray(data.channels);
};

const isChannelArray = (data: unknown): data is Channel[] => {
  return (
    Array.isArray(data) &&
    (data.length === 0 ||
      (typeof data[0] === 'object' && data[0] !== null && ('id' in data[0] || '_id' in data[0])))
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

// ===== Query Keys for Cache Management =====
export const queryKeys = {
  videos: {
    all: ['videos'] as const,
    lists: () => [...queryKeys.videos.all, 'list'] as const,
    list: (batchId?: string) =>
      [...queryKeys.videos.lists(), { batchId }] as const,
    details: () => [...queryKeys.videos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.videos.details(), id] as const,
  },
  channels: {
    all: ['channels'] as const,
    lists: () => [...queryKeys.channels.all, 'list'] as const,
    list: (filters?: any) =>
      [...queryKeys.channels.lists(), { filters }] as const,
  },
  channelGroups: {
    all: ['channelGroups'] as const,
    lists: () => [...queryKeys.channelGroups.all, 'list'] as const,
    list: (filters?: any) =>
      [...queryKeys.channelGroups.lists(), { filters }] as const,
  },
  batches: {
    all: ['batches'] as const,
    lists: () => [...queryKeys.batches.all, 'list'] as const,
    list: (filters?: any) =>
      [...queryKeys.batches.lists(), { filters }] as const,
  },
  trending: {
    all: ['trending'] as const,
    videos: () => [...queryKeys.trending.all, 'videos'] as const,
    videosList: (filters?: any) =>
      [...queryKeys.trending.videos(), { filters }] as const,
    stats: () => [...queryKeys.trending.all, 'stats'] as const,
  },
  health: {
    server: ['health', 'server'] as const,
    quota: ['health', 'quota'] as const,
  },
} as const;

// 영상 목록 조회 (배치 필터링 지원)
export const useVideos = (batchId?: string) => {
  return useQuery({
    queryKey: queryKeys.videos.list(batchId),
    queryFn: () => videosApi.getVideos(batchId),
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  });
};

// ===== Queries =====

// 트렌딩 통계 조회
export const useTrendingStats = () => {
  return useQuery({
    queryKey: queryKeys.trending.stats(),
    queryFn: async () => {
      const response = await axios.get(
        'http://localhost:3000/api/trending-stats'
      );
      return response.data;
    },
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10분
  });
};

// API 할당량 상태 조회
export const useQuotaStatus = () => {
  return useQuery({
    queryKey: queryKeys.health.quota,
    queryFn: () => healthApi.getQuotaStatus(),
    retry: 2,
    staleTime: 15 * 60 * 1000, // 15분
  });
};

// 서버 상태 조회
export const useServerStatus = () => {
  return useQuery({
    queryKey: queryKeys.health.server,
    queryFn: () => healthApi.getServerStatus(),
    retry: 1,
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 체크
  });
};

// 채널 목록 조회
export const useChannels = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.channels.list(filters),
    queryFn: () => channelsApi.getChannels(filters),
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });
};

// 채널 그룹 목록 조회
export const useChannelGroups = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.channelGroups.list(filters),
    queryFn: () => channelGroupsApi.getChannelGroups(filters),
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });
};

// 배치 목록 조회
export const useBatches = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.batches.list(filters),
    queryFn: () => batchesApi.getBatches(filters),
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 7 * 60 * 1000, // 7분
  });
};

// 트렌딩 비디오 목록 조회
export const useTrendingVideos = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.trending.videosList(filters),
    queryFn: async () => {
      const response = await axios.get(
        'http://localhost:3000/api/trending/videos',
        { params: filters }
      );
      return response.data.success ? response.data.data : [];
    },
    staleTime: 1 * 60 * 1000, // 1분 (트렌딩은 자주 업데이트)
    gcTime: 3 * 60 * 1000, // 3분
  });
};

// 배치별 영상 조회
export const useBatchVideos = (batchId?: string) => {
  return useQuery({
    queryKey: ['batchVideos', batchId],
    queryFn: () => {
      if (!batchId) throw new Error('BatchId is required');
      return batchesApi.getBatchVideos(batchId);
    },
    enabled: !!batchId, // batchId가 있을 때만 쿼리 실행
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  });
};

// ===== Mutations =====

// Video Mutations
export const useDeleteVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: videosApi.deleteVideo,
    onSuccess: (_, videoId) => {
      // 모든 비디오 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });

      // 트렌딩 비디오 캐시도 강제 무효화 (모든 필터 조합)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key === 'trending' || key === 'videos';
        }
      });

      toast.success('비디오가 삭제되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '비디오 삭제 실패';
      toast.error(message);
    },
  });
};

export const useDeleteVideos = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: videosApi.deleteVideos,
    onSuccess: (_, videoIds) => {
      // 모든 비디오 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });

      // 트렌딩 비디오 캐시도 강제 무효화 (모든 필터 조합)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key === 'trending' || key === 'videos';
        }
      });

      toast.success(`${videoIds.length}개 비디오가 삭제되었습니다`);
    },
    onError: (error: any) => {
      const message = error?.userMessage || '비디오 삭제 실패';
      toast.error(message);
    },
  });
};

// Channel Mutations
export const useDeleteChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelsApi.deleteChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
      toast.success('채널이 삭제되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '채널 삭제 실패';
      toast.error(message);
    },
  });
};

export const useDeleteChannels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelsApi.deleteChannels,
    onSuccess: (_, channelIds) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
      toast.success(`${channelIds.length}개 채널이 삭제되었습니다`);
    },
    onError: (error: any) => {
      const message = error?.userMessage || '채널 삭제 실패';
      toast.error(message);
    },
  });
};

// Channel Group Mutations
export const useCreateChannelGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelGroupsApi.createChannelGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channelGroups.all });
      toast.success('채널 그룹이 생성되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '채널 그룹 생성 실패';
      toast.error(message);
    },
  });
};

export const useUpdateChannelGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChannelGroup> }) =>
      channelGroupsApi.updateChannelGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channelGroups.all });
      toast.success('채널 그룹이 수정되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '채널 그룹 수정 실패';
      toast.error(message);
    },
  });
};

export const useDeleteChannelGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelGroupsApi.deleteChannelGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channelGroups.all });
      toast.success('채널 그룹이 삭제되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '채널 그룹 삭제 실패';
      toast.error(message);
    },
  });
};

// Batch Mutations
export const useCreateBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchesApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      toast.success('배치가 생성되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '배치 생성 실패';
      toast.error(message);
    },
  });
};

export const useDeleteBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchesApi.deleteBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
      toast.success('배치가 삭제되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '배치 삭제 실패';
      toast.error(message);
    },
  });
};

export const useDeleteBatches = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchesApi.deleteBatches,
    onSuccess: (_, batchIds) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
      toast.success(`${batchIds.length}개 배치가 삭제되었습니다`);
    },
    onError: (error: any) => {
      const message = error?.userMessage || '배치 삭제 실패';
      toast.error(message);
    },
  });
};

// 트렌딩 수집 뮤테이션
export const useCollectTrending = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionData: any) => {
      const response = await axios.post(
        'http://localhost:3000/api/collect-trending',
        collectionData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.health.quota });
      toast.success('트렌딩 영상 수집 완료');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '트렌딩 영상 수집 실패';
      toast.error(message);
    },
  });
};

// 채널 URL 추가 뮤테이션
export const useAddChannelUrl = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelsApi.addChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
      toast.success('채널이 추가되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '채널 추가 실패';
      toast.error(message);
    },
  });
};

// 다중 채널 그룹 수집 뮤테이션
export const useCollectMultipleGroups = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelGroupsApi.collectMultipleGroups,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.health.quota });
      toast.success('다중 그룹 수집 완료');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '다중 그룹 수집 실패';
      toast.error(message);
    },
  });
};
