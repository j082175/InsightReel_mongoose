import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  APIResponse,
  Video,
  TrendingStats,
  QuotaStatus,
  Channel,
  TrendingCollectionResult,
  ApiKey,
  ApiKeyCreateResult,
  ApiKeyDeleteResult,
} from '../types';

class APIClient {
  private client: AxiosInstance;
  private readonly baseURL = 'http://localhost:3000';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        console.log(
          `🌐 API 요청: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        console.error('❌ API 요청 오류:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API 응답 성공: ${response.status}`);
        return response;
      },
      (error) => {
        console.error(
          '❌ API 응답 오류:',
          error.response?.status,
          error.message
        );
        return Promise.reject(error);
      }
    );
  }

  // 재시도 로직이 포함된 요청 함수
  private async requestWithRetry<T>(
    config: AxiosRequestConfig,
    retries: number = 3
  ): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (retries > 0) {
        console.warn(`⏳ API 요청 재시도 중... (남은 시도: ${retries})`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.requestWithRetry<T>(config, retries - 1);
      }
      throw error;
    }
  }

  // 헬스 체크
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return this.requestWithRetry({
      url: '/health',
      method: 'GET',
    });
  }

  // 영상 목록 조회
  async getVideos(params?: {
    page?: number;
    limit?: number;
    platform?: string;
    search?: string;
  }): Promise<APIResponse<Video[]>> {
    const mappedParams = params
      ? {
          page: params.page,
          limit: params.limit,
          platform: params.platform,
          search: params.search,
        }
      : undefined;

    return this.requestWithRetry({
      url: '/api/videos',
      method: 'GET',
      params: mappedParams,
    });
  }

  // 트렌딩 통계 조회
  async getTrendingStats(): Promise<APIResponse<TrendingStats>> {
    return this.requestWithRetry({
      url: '/api/trending-stats',
      method: 'GET',
    });
  }

  // 트렌딩 영상 수집
  async collectTrending(): Promise<APIResponse<TrendingCollectionResult>> {
    return this.requestWithRetry({
      url: '/api/collect-trending',
      method: 'POST',
    });
  }

  // 채널 정보 조회
  async getChannels(): Promise<APIResponse<Channel[]>> {
    return this.requestWithRetry({
      url: '/api/channels',
      method: 'GET',
    });
  }

  // API 할당량 상태 조회
  async getQuotaStatus(): Promise<APIResponse<QuotaStatus>> {
    return this.requestWithRetry({
      url: '/api/quota-status',
      method: 'GET',
    });
  }

  // 여러 API 키 정보 조회
  async getApiKeys(): Promise<APIResponse<ApiKey[]>> {
    return this.requestWithRetry({
      url: '/api/api-keys',
      method: 'GET',
    });
  }

  // API 키 추가 (재시도 비활성화 - 중복 요청 방지)
  async addApiKey(
    name: string,
    apiKey: string
  ): Promise<APIResponse<ApiKeyCreateResult>> {
    return this.requestWithRetry(
      {
        url: '/api/api-keys',
        method: 'POST',
        data: {
          name: name,
          apiKey: apiKey,
        },
      },
      0
    ); // 재시도 0번으로 설정
  }

  // API 키 삭제 (재시도 비활성화 - 중복 요청 방지)
  async deleteApiKey(keyId: string): Promise<APIResponse<ApiKeyDeleteResult>> {
    return this.requestWithRetry(
      {
        url: `/api/api-keys/${keyId}`,
        method: 'DELETE',
      },
      0
    ); // 재시도 0번으로 설정
  }

  // API 키 상태 업데이트
  async updateApiKeyStatus(
    keyId: string,
    status: 'active' | 'inactive'
  ): Promise<APIResponse<ApiKey>> {
    return this.requestWithRetry({
      url: `/api/api-keys/${keyId}/status`,
      method: 'PUT',
      data: { status },
    });
  }

  // 서버 상태 테스트
  async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      console.error('🔌 서버 연결 실패:', error);
      return false;
    }
  }
}

// API 클라이언트 인스턴스 생성 및 내보내기
export const apiClient = new APIClient();
export default apiClient;
