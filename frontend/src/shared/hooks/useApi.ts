import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  batchesApi,
  channelGroupsApi,
  channelsApi,
  healthApi,
  trendingApi,
  videosApi,
} from '../services/apiClient';
import {
  Channel,
  ChannelGroup,
  Video
} from '../types';

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
export const useVideos = (batchId?: string, limit = 50, offset = 0) => {
  return useQuery({
    queryKey: [...queryKeys.videos.list(batchId), { limit, offset }],
    queryFn: () => videosApi.getVideos(batchId, limit, offset),
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
    queryFn: () => trendingApi.getTrendingVideos(filters),
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
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
      // 데이터 형식을 서버가 기대하는 형식으로 변환
      let channelIds: string[] = [];

      if (collectionData.type === 'channels') {
        channelIds = collectionData.selectedChannels || [];
      } else if (collectionData.type === 'groups') {
        // 그룹에서 채널 ID 추출 로직
        const selectedGroupIds = collectionData.selectedGroups || [];

        console.log('🎯 그룹 모드 디버깅:', {
          type: collectionData.type,
          selectedGroupIds,
          selectedGroupIdsLength: selectedGroupIds.length
        });

        if (selectedGroupIds.length > 0) {
          // 선택된 그룹들에서 채널 목록 추출
          try {
            const groupChannelIds: string[] = [];

            for (const groupId of selectedGroupIds) {
              console.log(`📞 그룹 API 호출: /api/channel-groups/${groupId}`);

              const response = await fetch(`/api/channel-groups/${groupId}`);
              console.log(`📡 그룹 API 응답 상태: ${response.status} ${response.statusText}`);

              if (response.ok) {
                const response_data = await response.json();
                console.log(`📋 그룹 응답 데이터:`, response_data);

                // API 응답이 {success: true, data: {...}} 형태인 경우 처리
                const group = response_data.data || response_data;
                console.log(`📋 실제 그룹 데이터:`, group);

                if (group.channels && Array.isArray(group.channels)) {
                  // 채널 배열에서 channelId 추출
                  const channelIdsFromGroup = group.channels.map((ch: any) => ch.channelId || ch.id).filter(Boolean);
                  console.log(`🔗 그룹 ${groupId}에서 추출한 채널 IDs:`, channelIdsFromGroup);
                  groupChannelIds.push(...channelIdsFromGroup);
                } else {
                  console.warn(`⚠️ 그룹 ${groupId}에 channels 배열이 없거나 비어있음:`, group);
                }
              } else {
                console.error(`❌ 그룹 API 호출 실패: ${response.status} ${response.statusText}`);
              }
            }

            // 중복 제거
            channelIds = [...new Set(groupChannelIds)];
          } catch (error) {
            console.error('그룹에서 채널 목록 추출 실패:', error);
            throw new Error('그룹 정보를 가져오는데 실패했습니다.');
          }
        }
      }

      const requestData = {
        channelIds,
        options: collectionData.filters || {}
      };

      console.log('🚀 트렌딩 수집 요청 데이터:', requestData);

      const response = await axios.post(
          // 'http://localhost:3000/api/collect-trending',
          "http://localhost:3000/api/trending/collect-trending",
          requestData
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

// 트렌딩 비디오 삭제
export const useDeleteTrendingVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trendingApi.deleteTrendingVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });
      toast.success('트렌딩 비디오가 삭제되었습니다');
    },
    onError: (error: any) => {
      const message = error?.userMessage || '트렌딩 비디오 삭제 실패';
      toast.error(message);
    },
  });
};

// 트렌딩 비디오 일괄 삭제
export const useDeleteTrendingVideos = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoIds: string[]) => {
      // 병렬로 삭제 요청
      await Promise.all(
        videoIds.map(id => trendingApi.deleteTrendingVideo(id))
      );
      return videoIds;
    },
    onSuccess: (videoIds) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });
      toast.success(`${videoIds.length}개 트렌딩 비디오가 삭제되었습니다`);
    },
    onError: (error: any) => {
      const message = error?.userMessage || '트렌딩 비디오 일괄 삭제 실패';
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

// ===== 범용 업데이트 시스템 =====

export type EntityType = 'video' | 'channel' | 'channelGroup' | 'trendingVideo';

interface UpdateEntityParams {
  entityType: EntityType;
  id: string;
  data: Partial<any>;
}

// 범용 엔티티 업데이트 API 함수
const updateEntity = async ({ entityType, id, data }: UpdateEntityParams) => {
  const endpoints = {
    video: `/api/videos/${id}`,
    channel: `/api/channels/${id}`,
    channelGroup: `/api/channel-groups/${id}`,
    trendingVideo: `/api/trending/videos/${id}`,
  };

  const response = await axios.put(endpoints[entityType], data);
  return response.data;
};

// 범용 업데이트 뮤테이션 훅
export const useUpdateEntity = (entityType: EntityType) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<any> }) =>
      updateEntity({ entityType, id, data }),

    onMutate: async ({ id, data }) => {
      // 낙관적 업데이트를 위해 기존 쿼리 취소
      const queryKey = getQueryKeyByEntityType(entityType);
      await queryClient.cancelQueries({ queryKey });

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData(queryKey);

      // 낙관적 업데이트 적용
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        if (Array.isArray(old)) {
          return old.map((item: any) =>
            (item._id || item.id) === id ? { ...item, ...data } : item
          );
        }

        return old;
      });

      return { previousData };
    },

    onError: (error, variables, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousData) {
        const queryKey = getQueryKeyByEntityType(entityType);
        queryClient.setQueryData(queryKey, context.previousData);
      }

      const message = (error as any)?.userMessage || `${getEntityDisplayName(entityType)} 업데이트 실패`;
      toast.error(message);
    },

    onSuccess: (updatedData, { id }) => {
      // 관련 캐시 무효화
      invalidateRelatedQueries(queryClient, entityType);

      toast.success(`${getEntityDisplayName(entityType)}이(가) 업데이트되었습니다`);
    },
  });
};

// 헬퍼 함수들
const getQueryKeyByEntityType = (entityType: EntityType) => {
  switch (entityType) {
    case 'video':
      return queryKeys.videos.all;
    case 'channel':
      return queryKeys.channels.all;
    case 'channelGroup':
      return queryKeys.channelGroups.all;
    case 'trendingVideo':
      return queryKeys.trending.all;
    default:
      return ['entity', entityType];
  }
};

const getEntityDisplayName = (entityType: EntityType): string => {
  switch (entityType) {
    case 'video':
      return '비디오';
    case 'channel':
      return '채널';
    case 'channelGroup':
      return '채널 그룹';
    case 'trendingVideo':
      return '트렌딩 비디오';
    default:
      return '항목';
  }
};

const invalidateRelatedQueries = (queryClient: any, entityType: EntityType) => {
  // 각 엔티티 타입별 관련 쿼리 무효화
  switch (entityType) {
    case 'video':
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
      break;
    case 'channel':
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
      break;
    case 'channelGroup':
      queryClient.invalidateQueries({ queryKey: queryKeys.channelGroups.all });
      break;
    case 'trendingVideo':
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });
      break;
  }
};

// 특화된 업데이트 훅들 (편의성을 위한 래퍼)
export const useUpdateVideo = () => useUpdateEntity('video');
export const useUpdateChannel = () => useUpdateEntity('channel');
export const useUpdateTrendingVideo = () => useUpdateEntity('trendingVideo');
