import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../services/apiClient';

export interface CookieStatus {
  success: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  daysOld: number;
  lastUpdated: string;
}

/**
 * Instagram 쿠키 상태를 조회하는 훅
 */
export function useCookieStatus() {
  return useQuery({
    queryKey: ['cookieStatus'],
    queryFn: async (): Promise<CookieStatus> => {
      const response = await axiosInstance.get('/api/system/cookie-status');
      return response.data;
    },
    // 5분마다 자동 갱신
    refetchInterval: 5 * 60 * 1000,
    // 탭에 포커스할 때마다 갱신
    refetchOnWindowFocus: true,
    // 에러 발생시에도 기본 데이터 유지
    retry: (failureCount, error) => {
      // 404 에러(쿠키 파일 없음)는 재시도하지 않음
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as { response: { status: number } };
        if (httpError.response?.status === 404 || httpError.response?.status === 500) {
          return false;
        }
      }
      return failureCount < 3;
    },
    // 초기 데이터 (에러시 표시)
    placeholderData: {
      success: false,
      isExpiringSoon: true,
      daysRemaining: 0,
      daysOld: 999,
      lastUpdated: ''
    }
  });
}