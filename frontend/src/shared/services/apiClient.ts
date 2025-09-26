import axios, { AxiosInstance } from 'axios';
import {
  Video,
  Channel,
  ChannelGroup,
  CollectionBatch,
  TrendingVideo,
} from '../types';

// API Base URL 설정
const API_BASE_URL = 'http://localhost:3000';

// Axios 인스턴스 생성
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`🚀 API 요청: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ API 응답: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(
      `❌ API 에러: ${error.response?.status} ${error.config?.url}`,
      error.response?.data
    );

    // 사용자 친화적 에러 메시지 추가
    if (error.response?.status >= 500) {
      error.userMessage =
        '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else if (error.response?.status === 404) {
      error.userMessage = '요청한 리소스를 찾을 수 없습니다.';
    } else if (error.response?.status === 400) {
      error.userMessage = '잘못된 요청입니다.';
    } else {
      error.userMessage = '네트워크 오류가 발생했습니다.';
    }

    return Promise.reject(error);
  }
);

// ===== Videos API =====
export const videosApi = {
  getVideos: async (batchId?: string, limit?: number, offset?: number): Promise<{ videos: Video[], pagination: any }> => {
    console.log('🚀 [videosApi.getVideos] API 호출 시작:', { batchId, limit, offset });
    const params: any = {};
    if (batchId && batchId !== 'all') params.batchId = batchId;
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    console.log('🔧 [videosApi.getVideos] 실제 HTTP params:', params);
    console.log('🌐 [videosApi.getVideos] 완전한 URL:', `/api/videos?${new URLSearchParams(params).toString()}`);
    const response = await axiosInstance.get('/api/videos', { params });

    console.log('📨 [videosApi.getVideos] 서버 응답 전체 구조:', JSON.stringify(response.data, null, 2));
    console.log('🔍 [videosApi.getVideos] response.data.success:', response.data.success);
    console.log('🔍 [videosApi.getVideos] response.data.data 타입:', typeof response.data.data);
    console.log('🔍 [videosApi.getVideos] response.data.data Array 여부:', Array.isArray(response.data.data));
    console.log('🔍 [videosApi.getVideos] response.data.data 길이:', response.data.data?.length);
    console.log('🔍 [videosApi.getVideos] response.data.pagination:', response.data.pagination);
    console.log('🔍 [videosApi.getVideos] response.data 전체 키:', Object.keys(response.data));

    // 서버 응답 구조: { success: true, data: {videos: [...], total: 50}, pagination: {...} }
    if (response.data.success && response.data.data) {
      // Case 1: data.videos가 배열인 경우 (새로운 서버 응답 구조)
      if (response.data.data.videos && Array.isArray(response.data.data.videos)) {
        console.log('✅ [videosApi.getVideos] 비디오 데이터 파싱 성공 (data.videos):', response.data.data.videos.length);
        console.log('📊 [videosApi.getVideos] pagination 정보:', response.data.pagination);
        return {
          videos: response.data.data.videos,
          pagination: response.data.pagination || {
            total: response.data.data.total || response.data.data.videos.length,
            limit: 50,
            offset: 0,
            hasMore: false
          }
        };
      }
      // Case 2: data가 직접 배열인 경우 (이전 서버 응답 구조)
      else if (Array.isArray(response.data.data)) {
        console.log('✅ [videosApi.getVideos] 비디오 데이터 파싱 성공 (data 직접):', response.data.data.length);
        console.log('📊 [videosApi.getVideos] pagination 정보:', response.data.pagination);
        console.log('🔍 [videosApi.getVideos] pagination 상세 분석:', {
          total: response.data.pagination?.total,
          limit: response.data.pagination?.limit,
          offset: response.data.pagination?.offset,
          hasMore: response.data.pagination?.hasMore,
          계산결과: `(${response.data.pagination?.offset} + ${response.data.data.length}) < ${response.data.pagination?.total} = ${(response.data.pagination?.offset + response.data.data.length) < response.data.pagination?.total}`,
          전체구조: JSON.stringify(response.data.pagination, null, 2)
        });
        return {
          videos: response.data.data,
          pagination: response.data.pagination || {}
        };
      } else {
        console.error('❌ [videosApi.getVideos] 예상하지 못한 data 구조:', response.data.data);
      }
    } else {
      console.error('❌ [videosApi.getVideos] success가 false이거나 data가 없습니다:', { success: response.data.success, hasData: !!response.data.data });
    }

    console.warn('⚠️ [videosApi.getVideos] 예상과 다른 응답 구조:', response.data);
    return { videos: [], pagination: {} };
  },

  deleteVideo: async (videoId: string): Promise<void> => {
    await axiosInstance.delete(`/api/videos/${videoId}`);
  },

  deleteVideos: async (videoIds: string[]): Promise<void> => {
    await Promise.all(
      videoIds.map((id) => axiosInstance.delete(`/api/videos/${id}`))
    );
  },

  getTrendingVideos: async (): Promise<TrendingVideo[]> => {
    const response = await axiosInstance.get('/api/trending/videos');
    return response.data.success ? response.data.data : [];
  },

  deleteTrendingVideo: async (videoId: string): Promise<void> => {
    await axiosInstance.delete(`/api/trending/videos/${videoId}`);
  },
};

// ===== Channels API =====
export const channelsApi = {
  getChannels: async (filters?: any): Promise<Channel[]> => {
    const response = await axiosInstance.get('/api/channels', {
      params: filters,
    });

    console.log('🔍 [channelsApi.getChannels] 전체 서버 응답:', JSON.stringify(response.data, null, 2));

    // 서버 응답 구조: { success: true, data: { channels: [...], meta: {...} } }
    if (response.data.success && response.data.data) {
      // channels 필드가 있는 경우 (새로운 서버 응답 구조)
      if (response.data.data.channels && Array.isArray(response.data.data.channels)) {
        console.log('✅ [channelsApi.getChannels] 채널 데이터 파싱 성공:', response.data.data.channels.length);
        console.log('📊 [channelsApi.getChannels] 첫 번째 채널 전체 필드:', Object.keys(response.data.data.channels[0] || {}));
        console.log('🔍 [channelsApi.getChannels] 첫 번째 채널 상세 데이터:', response.data.data.channels[0]);
        return response.data.data.channels;
      }
      // 직접 배열인 경우 (이전 서버 응답 구조)
      else if (Array.isArray(response.data.data)) {
        console.log('✅ [channelsApi.getChannels] 채널 데이터 파싱 성공 (직접 배열):', response.data.data.length);
        console.log('📊 [channelsApi.getChannels] 첫 번째 채널 전체 필드 (직접 배열):', Object.keys(response.data.data[0] || {}));
        console.log('🔍 [channelsApi.getChannels] 첫 번째 채널 상세 데이터 (직접 배열):', response.data.data[0]);
        return response.data.data;
      }
    }

    console.warn('⚠️ [channelsApi.getChannels] 예상하지 못한 응답 구조:', response.data);
    return [];
  },

  deleteChannel: async (channelId: string): Promise<void> => {
    await axiosInstance.delete(`/api/channels/${channelId}`);
  },

  deleteChannels: async (channelIds: string[]): Promise<void> => {
    await Promise.all(
      channelIds.map((id) => axiosInstance.delete(`/api/channels/${id}`))
    );
  },

  addChannel: async (channelUrl: string): Promise<Channel> => {
    const response = await axiosInstance.post('/api/channels/add-url', {
      url: channelUrl,
    });
    return response.data.data;
  },
};

// ===== Channel Groups API =====
export const channelGroupsApi = {
  getChannelGroups: async (filters?: any): Promise<ChannelGroup[]> => {
    const response = await axiosInstance.get('/api/channel-groups', {
      params: filters,
    });
    return response.data.success ? response.data.data : [];
  },

  createChannelGroup: async (
    groupData: Partial<ChannelGroup>
  ): Promise<ChannelGroup> => {
    const response = await axiosInstance.post('/api/channel-groups', groupData);
    return response.data.data;
  },

  updateChannelGroup: async (
    id: string,
    groupData: Partial<ChannelGroup>
  ): Promise<ChannelGroup> => {
    const response = await axiosInstance.put(
      `/api/channel-groups/${id}`,
      groupData
    );
    return response.data.data;
  },

  deleteChannelGroup: async (groupId: string): Promise<void> => {
    await axiosInstance.delete(`/api/channel-groups/${groupId}`);
  },

  collectMultipleGroups: async (collectionData: any): Promise<any> => {
    const response = await axiosInstance.post(
      '/api/channel-groups/collect-multiple',
      collectionData
    );
    return response.data;
  },
};

// ===== Batches API =====
export const batchesApi = {
  getBatches: async (filters?: any): Promise<CollectionBatch[]> => {
    const response = await axiosInstance.get('/api/batches', {
      params: filters,
    });
    return response.data.success ? response.data.data : [];
  },

  createBatch: async (
    batchData: Partial<CollectionBatch>
  ): Promise<CollectionBatch> => {
    const response = await axiosInstance.post('/api/batches', batchData);
    return response.data.data;
  },

  deleteBatch: async (batchId: string): Promise<void> => {
    await axiosInstance.delete(`/api/batches/${batchId}`);
  },

  deleteBatches: async (batchIds: string[]): Promise<void> => {
    await Promise.all(
      batchIds.map((id) => axiosInstance.delete(`/api/batches/${id}`))
    );
  },

  getBatchVideos: async (batchId: string): Promise<Video[]> => {
    const response = await axiosInstance.get(`/api/batches/${batchId}/videos`);
    return response.data.success ? response.data.data : [];
  },
};

// ===== Trending API =====
export const trendingApi = {
  getTrendingVideos: async (filters?: any): Promise<TrendingVideo[]> => {
    const response = await axiosInstance.get('/api/trending/videos', {
      params: filters,
    });
    return response.data.success ? response.data.data : [];
  },

  getTrendingStats: async (): Promise<any> => {
    const response = await axiosInstance.get('/api/trending/stats');
    return response.data;
  },

  deleteTrendingVideo: async (videoId: string): Promise<void> => {
    await axiosInstance.delete(`/api/trending/videos/${videoId}`);
  },
};

// ===== Health API =====
export const healthApi = {
  getServerStatus: async (): Promise<any> => {
    const response = await axiosInstance.get('/health');
    return response.data;
  },

  getQuotaStatus: async (): Promise<any> => {
    const response = await axiosInstance.get('/api/quota-status');
    return response.data;
  },
};

// 기본 axios 인스턴스도 export (필요시 직접 사용)
export default axiosInstance;
