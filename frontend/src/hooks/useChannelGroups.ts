import { useState, useEffect } from 'react';

export interface ChannelGroup {
  _id?: string;
  name: string;
  description: string;
  color: string;
  channels: string[];
  keywords: string[];
  isActive: boolean;
  lastCollectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectGroupOptions {
  daysBack?: number;
  minViews?: number;
  includeShorts?: boolean;
  includeLongForm?: boolean;
}

export const useChannelGroups = () => {
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모든 그룹 조회
  const fetchGroups = async (filters?: { active?: boolean; keyword?: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.active !== undefined) params.append('active', filters.active.toString());
      if (filters?.keyword) params.append('keyword', filters.keyword);

      const response = await fetch(`/api/channel-groups?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setGroups(data.data);
        return data.data;
      } else {
        throw new Error(data.message || '그룹 조회에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('그룹 조회 실패:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 새 그룹 생성
  const createGroup = async (groupData: Omit<ChannelGroup, '_id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/channel-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setGroups(prev => [...prev, data.data]);
        return data.data;
      } else {
        throw new Error(data.message || '그룹 생성에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('그룹 생성 실패:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 그룹 수정
  const updateGroup = async (groupId: string, groupData: Partial<ChannelGroup>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/channel-groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setGroups(prev => prev.map(group => 
          group._id === groupId ? data.data : group
        ));
        return data.data;
      } else {
        throw new Error(data.message || '그룹 수정에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('그룹 수정 실패:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 그룹 삭제
  const deleteGroup = async (groupId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/channel-groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setGroups(prev => prev.filter(group => group._id !== groupId));
        return true;
      } else {
        throw new Error(data.message || '그룹 삭제에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('그룹 삭제 실패:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 특정 그룹 트렌딩 수집
  const collectGroupTrending = async (groupId: string, options: CollectGroupOptions = {}) => {
    setIsLoading(true);
    setError(null);

    const defaultOptions = {
      daysBack: 3,
      minViews: 30000,
      includeShorts: true,
      includeLongForm: true,
      ...options
    };

    try {
      const response = await fetch(`/api/channel-groups/${groupId}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultOptions)
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // 그룹의 lastCollectedAt 업데이트
        setGroups(prev => prev.map(group => 
          group._id === groupId 
            ? { ...group, lastCollectedAt: new Date().toISOString() }
            : group
        ));
        return data.data;
      } else {
        throw new Error(data.message || '그룹 트렌딩 수집에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('그룹 트렌딩 수집 실패:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 모든 활성 그룹 트렌딩 수집
  const collectAllActiveGroups = async (options: CollectGroupOptions = {}) => {
    setIsLoading(true);
    setError(null);

    const defaultOptions = {
      daysBack: 3,
      minViews: 30000,
      includeShorts: true,
      includeLongForm: true,
      ...options
    };

    try {
      const response = await fetch('/api/channel-groups/collect-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultOptions)
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // 모든 활성 그룹의 lastCollectedAt 업데이트
        const now = new Date().toISOString();
        setGroups(prev => prev.map(group => 
          group.isActive 
            ? { ...group, lastCollectedAt: now }
            : group
        ));
        return data.data;
      } else {
        throw new Error(data.message || '전체 그룹 트렌딩 수집에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('전체 그룹 트렌딩 수집 실패:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 그룹의 트렌딩 영상 조회
  const getGroupVideos = async (groupId: string, options?: {
    limit?: number;
    duration?: 'SHORT' | 'MID' | 'LONG';
    sortBy?: 'collectionDate' | 'views';
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.duration) params.append('duration', options.duration);
      if (options?.sortBy) params.append('sortBy', options.sortBy);

      const response = await fetch(`/api/channel-groups/${groupId}/videos?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || '그룹 영상 조회에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('그룹 영상 조회 실패:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초기 로딩
  useEffect(() => {
    fetchGroups();
  }, []);

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    collectGroupTrending,
    collectAllActiveGroups,
    getGroupVideos,
    // 편의 메서드
    refreshGroups: () => fetchGroups(),
    getActiveGroups: () => groups.filter(group => group.isActive),
    getGroupById: (id: string) => groups.find(group => group._id === id),
  };
};