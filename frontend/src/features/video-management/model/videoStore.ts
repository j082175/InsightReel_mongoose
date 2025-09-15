import { useState, useCallback, useMemo } from 'react';
import { Video, FilterState } from '../../../shared/types';

interface VideoStoreState {
  videos: Video[];
  loading: boolean;
  error: string | null;
  filters: FilterState;
  selectedVideos: Set<string>;
  isSelectMode: boolean;
  deletedVideoIds: Set<string>;
}

interface VideoStoreActions {
  fetchVideos: (batchId?: string) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  deleteVideos: (videoIds: string[]) => Promise<void>;
  updateFilters: (newFilters: Partial<FilterState>) => void;
  resetFilters: () => void;
  toggleSelectMode: () => void;
  selectVideo: (videoId: string) => void;
  deselectVideo: (videoId: string) => void;
  selectAllVideos: () => void;
  clearSelection: () => void;
  markVideoAsDeleted: (videoId: string) => void;
}

const defaultFilters: FilterState = {
  keyword: '',
  platform: '',
  duration: '',
  minViews: '',
  maxViews: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'uploadDate',
  sortOrder: 'desc'
};

export const useVideoStore = (initialBatchId: string = 'all'): VideoStoreState & VideoStoreActions => {

  const [state, setState] = useState<VideoStoreState>({
    videos: [],
    loading: false,
    error: null,
    filters: defaultFilters,
    selectedVideos: new Set(),
    isSelectMode: false,
    deletedVideoIds: new Set()
  });

  // 필터링된 비디오 목록
  const filteredVideos = useMemo(() => {
    // 방어적 프로그래밍: videos가 배열이 아닌 경우 빈 배열로 처리
    const videosArray = Array.isArray(state.videos) ? state.videos : [];
    let filtered = videosArray.filter(video => !state.deletedVideoIds.has(video._id));

    if (state.filters.keyword) {
      const keyword = state.filters.keyword.toLowerCase();
      filtered = filtered.filter(video =>
        video.title?.toLowerCase().includes(keyword) ||
        video.channelName?.toLowerCase().includes(keyword)
      );
    }

    if (state.filters.platform) {
      filtered = filtered.filter(video => video.platform === state.filters.platform);
    }

    if (state.filters.duration) {
      filtered = filtered.filter(video => video.duration === state.filters.duration);
    }

    if (state.filters.minViews) {
      const minViews = parseInt(state.filters.minViews);
      filtered = filtered.filter(video => video.views >= minViews);
    }

    if (state.filters.maxViews) {
      const maxViews = parseInt(state.filters.maxViews);
      filtered = filtered.filter(video => video.views <= maxViews);
    }

    if (state.filters.dateFrom) {
      filtered = filtered.filter(video =>
        new Date(video.uploadDate) >= new Date(state.filters.dateFrom)
      );
    }

    if (state.filters.dateTo) {
      filtered = filtered.filter(video =>
        new Date(video.uploadDate) <= new Date(state.filters.dateTo)
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      const direction = state.filters.sortOrder === 'desc' ? -1 : 1;

      switch (state.filters.sortBy) {
        case 'views':
          return (a.views - b.views) * direction;
        case 'uploadDate':
          return (new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()) * direction;
        case 'title':
          return a.title.localeCompare(b.title) * direction;
        default:
          return 0;
      }
    });

    return filtered;
  }, [state.videos, state.filters, state.deletedVideoIds]);

  const fetchVideos = useCallback(async (batchId: string = initialBatchId) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const endpoint = batchId === 'all' ? '/api/videos' : `/api/videos?batchId=${batchId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // API 응답이 다양한 형태일 수 있으므로 안전하게 배열 추출
      let videosData = [];
      if (Array.isArray(result)) {
        videosData = result;
      } else if (result && Array.isArray(result.data)) {
        videosData = result.data;
      } else if (result && Array.isArray(result.videos)) {
        videosData = result.videos;
      }

      console.log('📹 VideoStore: API 응답 데이터', { result, videosData });

      setState(prev => ({
        ...prev,
        videos: videosData,
        loading: false
      }));
    } catch (error) {
      console.error('❌ VideoStore: API 호출 실패', error);
      setState(prev => ({
        ...prev,
        videos: [], // 에러 시에도 빈 배열로 초기화
        error: error instanceof Error ? error.message : '비디오 조회에 실패했습니다',
        loading: false
      }));
    }
  }, [initialBatchId]);

  const deleteVideo = useCallback(async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setState(prev => ({
        ...prev,
        deletedVideoIds: new Set([...prev.deletedVideoIds, videoId]),
        selectedVideos: new Set([...prev.selectedVideos].filter(id => id !== videoId))
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteVideos = useCallback(async (videoIds: string[]) => {
    for (const videoId of videoIds) {
      await deleteVideo(videoId);
    }
  }, [deleteVideo]);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: defaultFilters
    }));
  }, []);

  const toggleSelectMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSelectMode: !prev.isSelectMode,
      selectedVideos: new Set() // 선택 모드 토글 시 선택 초기화
    }));
  }, []);

  const selectVideo = useCallback((videoId: string) => {
    setState(prev => ({
      ...prev,
      selectedVideos: new Set([...prev.selectedVideos, videoId])
    }));
  }, []);

  const deselectVideo = useCallback((videoId: string) => {
    setState(prev => ({
      ...prev,
      selectedVideos: new Set([...prev.selectedVideos].filter(id => id !== videoId))
    }));
  }, []);

  const selectAllVideos = useCallback(() => {
    const allVideoIds = filteredVideos.map(video => video._id);
    setState(prev => ({
      ...prev,
      selectedVideos: new Set(allVideoIds)
    }));
  }, [filteredVideos]);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedVideos: new Set()
    }));
  }, []);

  const markVideoAsDeleted = useCallback((videoId: string) => {
    setState(prev => ({
      ...prev,
      deletedVideoIds: new Set([...prev.deletedVideoIds, videoId])
    }));
  }, []);

  return {
    // State
    videos: filteredVideos,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    selectedVideos: state.selectedVideos,
    isSelectMode: state.isSelectMode,
    deletedVideoIds: state.deletedVideoIds,

    // Actions
    fetchVideos,
    deleteVideo,
    deleteVideos,
    updateFilters,
    resetFilters,
    toggleSelectMode,
    selectVideo,
    deselectVideo,
    selectAllVideos,
    clearSelection,
    markVideoAsDeleted
  };
};