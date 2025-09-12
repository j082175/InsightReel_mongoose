import { useQuery } from '@tanstack/react-query';

interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  usagePercent: string;
  keyCount: number;
  allKeys: any[];
}

interface APIStatusResponse {
  quota: QuotaStatus;
  safetyMargin: number;
  timestamp: string;
  recommendations: {
    canProcess: boolean;
    estimatedChannels: number;
    resetTime: string;
    safetyInfo: string;
  };
}

interface ProcessedAPIStatus {
  totalKeys: number;
  availableKeys: number;
  totalUsage: {
    used: number;
    limit: number;
    usagePercentage: number;
  };
  currentKey: {
    name: string;
    usage: number;
    limit: number;
    usagePercentage: number;
  };
}

const fetchAPIStatus = async (): Promise<ProcessedAPIStatus> => {
  const response = await fetch('http://localhost:3000/api/quota-status');
  if (!response.ok) {
    throw new Error('API 상태 조회 실패');
  }
  const data: { success: boolean; data: APIStatusResponse } = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error('API 응답 형식 오류');
  }
  
  const { quota, safetyMargin } = data.data;
  const usedLimit = quota.limit; // 서버에서 이미 안전마진이 적용된 한도값을 보냄
  
  // 총 키 개수 (서버에서 실제 키 개수를 받아옴)
  const totalKeys = quota.keyCount || 3;
  
  // 현재 활성 키 찾기 (사용량이 0이 아닌 첫 번째 키)
  const activeKey = quota.allKeys?.find((key: any) => key.percentage > 0) || quota.allKeys?.[0];
  
  // 사용 가능한 키 개수 (활성화되고 사용량이 80% 이하인 키들)
  const availableKeys = quota.allKeys?.filter((key: any) => 
    key.realStatus !== 'inactive' && key.percentage < 80
  ).length || 0;
  
  // 개별 키 한도 (서버에서 이미 안전 마진이 적용됨)
  const keyLimit = activeKey ? parseInt(activeKey.usage.split('/')[1]) : 0;
  const keyUsed = activeKey ? parseInt(activeKey.usage.split('/')[0]) : 0;
  
  return {
    totalKeys: totalKeys,
    availableKeys: availableKeys,
    totalUsage: {
      used: quota.used || 0,
      limit: usedLimit, // 전체 한도에서 안전 마진 차감
      usagePercentage: quota.used && usedLimit > 0 ? Math.round((quota.used / usedLimit) * 100) : 0
    },
    currentKey: {
      name: activeKey?.name || `키 1`,
      usage: keyUsed,
      limit: keyLimit,
      usagePercentage: activeKey?.percentage || 0
    }
  };
};

export const useAPIStatus = () => {
  return useQuery({
    queryKey: ['api-status'],
    queryFn: fetchAPIStatus,
    refetchInterval: 30000, // 30초마다 새로고침
    retry: 1,
    staleTime: 15000, // 15초간 캐시 유지
  });
};