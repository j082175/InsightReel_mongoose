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
  getVideos: async (batchId?: string): Promise<Video[]> => {
    const params = batchId && batchId !== 'all' ? { batchId } : {};
    const response = await axiosInstance.get('/api/videos', { params });
    return response.data.success ? response.data.data : [];
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
    return response.data.success ? response.data.data : [];
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
