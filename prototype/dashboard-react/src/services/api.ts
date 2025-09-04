import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { APIResponse, Video } from '../types/index';
import { dashboardConfig } from '../config/dashboard.config';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: dashboardConfig.api.baseUrl,
      timeout: dashboardConfig.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 API 요청: ${config.method?.toUpperCase()} ${config.url}`);
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
        console.error('❌ API 응답 오류:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  // 재시도 로직이 포함된 요청 함수
  private async requestWithRetry<T>(
    config: AxiosRequestConfig,
    retries: number = dashboardConfig.api.retryAttempts
  ): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (retries > 0) {
        console.warn(`⏳ API 요청 재시도 중... (남은 시도: ${retries})`);
        await new Promise(resolve => 
          setTimeout(resolve, dashboardConfig.api.retryDelay)
        );
        return this.requestWithRetry<T>(config, retries - 1);
      }
      throw error;
    }
  }

  // 헬스 체크
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return this.requestWithRetry({
      url: dashboardConfig.api.endpoints.health,
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
    return this.requestWithRetry({
      url: dashboardConfig.api.endpoints.videos,
      method: 'GET',
      params,
    });
  }

  // 트렌딩 통계 조회
  async getTrendingStats(): Promise<APIResponse<any>> {
    return this.requestWithRetry({
      url: dashboardConfig.api.endpoints.trending,
      method: 'GET',
    });
  }

  // 트렌딩 영상 수집
  async collectTrending(): Promise<APIResponse<any>> {
    return this.requestWithRetry({
      url: dashboardConfig.api.endpoints.collectTrending,
      method: 'POST',
    });
  }

  // 채널 정보 조회
  async getChannels(): Promise<APIResponse<any[]>> {
    return this.requestWithRetry({
      url: dashboardConfig.api.endpoints.channels,
      method: 'GET',
    });
  }

  // Google Sheets 테스트
  async testSheets(): Promise<APIResponse<any>> {
    return this.requestWithRetry({
      url: dashboardConfig.api.endpoints.testSheets,
      method: 'GET',
    });
  }

  // API 할당량 상태 조회
  async getQuotaStatus(): Promise<APIResponse<any>> {
    return this.requestWithRetry({
      url: dashboardConfig.api.endpoints.quotaStatus,
      method: 'GET',
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