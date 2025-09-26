import { useState, useCallback, useMemo } from 'react';
import { Video, FilterState } from '../../../shared/types';
import { getDocumentId } from '../../../shared/utils';
import {
  useInfiniteVideos,
  flattenInfiniteVideos,
  getTotalVideosCount,
  useDeleteVideo,
  useDeleteVideos,
} from '../../../shared/hooks';

interface VideoStoreState {
  videos: Video[];
  loading: boolean;
  error: string | null;
  filters: FilterState;
  selectedVideos: Set<string>;
  isSelectMode: boolean;
  // 무한 스크롤링 추가
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface VideoStoreActions {
  deleteVideo: (videoId: string) => Promise<void>;
  deleteVideos: (videoIds: string[]) => Promise<void>;
  updateFilters: (newFilters: Partial<FilterState>) => void;
  resetFilters: () => void;
  toggleSelectMode: () => void;
  selectVideo: (videoId: string) => void;
  deselectVideo: (videoId: string) => void;
  selectAllVideos: () => void;
  clearSelection: () => void;
  // 무한 스크롤링 추가
  loadMore: () => void;
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
  sortOrder: 'desc',
};

export const useVideoStore = (
  initialBatchId: string = 'all'
): VideoStoreState & VideoStoreActions => {
  // React Query 무한 스크롤링 훅 사용
  const {
    data: infiniteVideosData,
    isLoading: loading,
    isFetchingNextPage: isLoadingMore,
    hasNextPage: hasMore,
    fetchNextPage,
    error: queryError,
  } = useInfiniteVideos(initialBatchId);

  // 모든 페이지의 비디오를 평탄화
  const videos = flattenInfiniteVideos(infiniteVideosData);
  const deleteVideoMutation = useDeleteVideo();
  const deleteVideosMutation = useDeleteVideos();

  const [state, setState] = useState({
    filters: defaultFilters,
    selectedVideos: new Set<string>(),
    isSelectMode: false,
  });

  // 필터링된 비디오 목록
  const filteredVideos = useMemo(() => {
    // 방어적 프로그래밍: videos가 배열이 아닌 경우 빈 배열로 처리
    const videosArray = Array.isArray(videos) ? videos : [];
    let filtered = videosArray;

    if (state.filters.keyword) {
      const keyword = state.filters.keyword.toLowerCase();
      filtered = filtered.filter(
        (video) =>
          video.title?.toLowerCase().includes(keyword) ||
          video.channelName?.toLowerCase().includes(keyword)
      );
    }

    if (state.filters.platform) {
      filtered = filtered.filter(
        (video) => video.platform === state.filters.platform
      );
    }

    if (state.filters.duration) {
      filtered = filtered.filter(
        (video) => video.duration === state.filters.duration
      );
    }

    if (state.filters.minViews) {
      const minViews = parseInt(state.filters.minViews);
      filtered = filtered.filter((video) => video.views >= minViews);
    }

    if (state.filters.maxViews) {
      const maxViews = parseInt(state.filters.maxViews);
      filtered = filtered.filter((video) => video.views <= maxViews);
    }

    if (state.filters.dateFrom) {
      filtered = filtered.filter(
        (video) =>
          new Date(video.uploadDate) >= new Date(state.filters.dateFrom)
      );
    }

    if (state.filters.dateTo) {
      filtered = filtered.filter(
        (video) => new Date(video.uploadDate) <= new Date(state.filters.dateTo)
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      const direction = state.filters.sortOrder === 'desc' ? -1 : 1;

      switch (state.filters.sortBy) {
        case 'views':
          return (a.views - b.views) * direction;
        case 'uploadDate':
          return (
            (new Date(a.uploadDate).getTime() -
              new Date(b.uploadDate).getTime()) *
            direction
          );
        case 'title':
          return a.title.localeCompare(b.title) * direction;
        default:
          return 0;
      }
    });

    return filtered;
  }, [videos, state.filters]);

  // React Query 기반 삭제 함수들
  const deleteVideo = useCallback(
    async (videoId: string) => {
      try {
        await deleteVideoMutation.mutateAsync(videoId);
        // 선택에서만 제거, React Query가 데이터 자동 업데이트 담당
        setState((prev) => ({
          ...prev,
          selectedVideos: new Set(
            [...prev.selectedVideos].filter((id) => id !== videoId)
          ),
        }));
      } catch (error) {
        throw error;
      }
    },
    [deleteVideoMutation]
  );

  const deleteVideos = useCallback(
    async (videoIds: string[]) => {
      try {
        await deleteVideosMutation.mutateAsync(videoIds);
        // 선택 모든 해제, React Query가 데이터 자동 업데이트 담당
        setState((prev) => ({
          ...prev,
          selectedVideos: new Set(),
        }));
      } catch (error) {
        throw error;
      }
    },
    [deleteVideosMutation]
  );

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: defaultFilters,
    }));
  }, []);

  const toggleSelectMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSelectMode: !prev.isSelectMode,
      selectedVideos: new Set(), // 선택 모드 토글 시 선택 초기화
    }));
  }, []);

  const selectVideo = useCallback((videoId: string) => {
    setState((prev) => ({
      ...prev,
      selectedVideos: new Set([...prev.selectedVideos, videoId]),
    }));
  }, []);

  const deselectVideo = useCallback((videoId: string) => {
    setState((prev) => ({
      ...prev,
      selectedVideos: new Set(
        [...prev.selectedVideos].filter((id) => id !== videoId)
      ),
    }));
  }, []);

  const selectAllVideos = useCallback(() => {
    const allVideoIds = filteredVideos
      .map((video) => getDocumentId(video))
      .filter((id): id is string => id !== undefined);
    setState((prev) => ({
      ...prev,
      selectedVideos: new Set(allVideoIds),
    }));
  }, [filteredVideos]);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedVideos: new Set(),
    }));
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      console.log('🔄 [VideoStore] 추가 데이터 로딩 중...');
      fetchNextPage();
    }
  }, [hasMore, isLoadingMore, fetchNextPage]);

  // 🚀 DEBUG: VideoStore 상태 로깅
  console.log('🔧 [DEBUG] VideoStore 상태:', {
    rawVideosCount: videos.length,
    filteredVideosCount: filteredVideos.length,
    loading,
    isLoadingMore,
    hasMore,
    queryError: queryError?.message,
    infiniteDataPages: infiniteVideosData?.pages?.length,
    // React Query의 hasNextPage 상세 분석
    reactQueryState: {
      hasNextPage: hasMore, // 이미 hasMore로 destructuring됨
      isFetchingNextPage: isLoadingMore,
      isLoading: loading,
      pages: infiniteVideosData?.pages?.map((page, index) => ({
        pageIndex: index,
        videosCount: page.videos?.length,
        pagination: page.pagination
      }))
    },
    firstRawVideo: videos[0]?.title,
    firstFilteredVideo: filteredVideos[0]?.title
  });

  return {
    // State (React Query + local state 조합)
    videos: filteredVideos,
    loading,
    error: queryError?.message || null,
    filters: state.filters,
    selectedVideos: state.selectedVideos,
    isSelectMode: state.isSelectMode,
    hasMore: hasMore || false,
    isLoadingMore: isLoadingMore || false,

    // Actions
    deleteVideo,
    deleteVideos,
    updateFilters,
    resetFilters,
    toggleSelectMode,
    selectVideo,
    deselectVideo,
    selectAllVideos,
    clearSelection,
    loadMore,
  };
};
