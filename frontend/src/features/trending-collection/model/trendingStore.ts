import { useState, useCallback, useMemo } from 'react';
import { Channel, Video } from '../../../shared/types';
import { getDocumentId } from '../../../shared/utils';
import {
  useChannelGroups,
  useChannels,
  useTrendingVideos,
  useCollectTrending,
  useCollectMultipleGroups,
} from '../../../shared/hooks/useApi';

export interface CollectionFilters {
  daysBack: number;
  minViews: number;
  maxViews: number | null;
  includeShorts: boolean;
  includeMidform: boolean;
  includeLongForm: boolean;
  keywords: string[];
  excludeKeywords: string[];
}

export interface CollectionTarget {
  type: 'groups' | 'channels';
  selectedGroups: string[];
  selectedChannels: string[];
}

export interface ChannelGroup {
  _id: string;
  name: string;
  description?: string;
  color: string;
  channels: Array<{
    channelId: string;
    name: string;
  }>;
  keywords: string[];
  isActive: boolean;
  lastCollectedAt?: string;
}

interface TrendingStoreState {
  // Collection State
  collectionTarget: CollectionTarget;
  filters: CollectionFilters;
  isCollecting: boolean;
  collectionProgress: string;

  // Data State
  channelGroups: ChannelGroup[];
  channels: Channel[];
  trendingVideos: Video[];

  // Loading State
  groupsLoading: boolean;
  channelsLoading: boolean;
  videosLoading: boolean;

  // Error State
  error: string | null;
  groupsError: string | null;

  // Search State
  searchTerm: string;
  selectedVideos: Set<string>;
  isSelectMode: boolean;
}

interface TrendingStoreActions {
  // Collection Actions
  updateCollectionTarget: (target: Partial<CollectionTarget>) => void;
  updateFilters: (filters: Partial<CollectionFilters>) => void;
  resetFilters: () => void;
  startCollection: () => Promise<void>;
  stopCollection: () => void;

  // Data Actions
  fetchChannelGroups: () => Promise<void>;
  fetchChannels: () => Promise<void>;
  fetchTrendingVideos: () => Promise<void>;

  // Selection Actions
  handleGroupSelection: (groupId: string) => void;
  handleChannelSelection: (channelId: string) => void;
  handleTargetTypeChange: (type: 'groups' | 'channels') => void;

  // Video Management
  toggleSelectMode: () => void;
  selectVideo: (videoId: string) => void;
  deselectVideo: (videoId: string) => void;
  selectAllVideos: () => void;
  clearSelection: () => void;
  updateSearchTerm: (searchTerm: string) => void;
}

const defaultFilters: CollectionFilters = {
  daysBack: 7,
  minViews: 10000,
  maxViews: null,
  includeShorts: true,
  includeMidform: true,
  includeLongForm: true,
  keywords: [],
  excludeKeywords: [],
};

const defaultCollectionTarget: CollectionTarget = {
  type: 'groups',
  selectedGroups: [],
  selectedChannels: [],
};

export const useTrendingStore = (): TrendingStoreState &
  TrendingStoreActions => {
  // React Query 훅 사용
  const {
    data: channelGroups = [],
    isLoading: groupsLoading,
    error: groupsQueryError,
  } = useChannelGroups();
  const { data: channels = [], isLoading: channelsLoading } = useChannels();
  const { data: trendingVideos = [], isLoading: videosLoading } =
    useTrendingVideos();
  const collectTrendingMutation = useCollectTrending();
  const collectMultipleGroupsMutation = useCollectMultipleGroups();

  const [state, setState] = useState({
    collectionTarget: defaultCollectionTarget,
    filters: defaultFilters,
    isCollecting: false,
    collectionProgress: '',
    searchTerm: '',
    selectedVideos: new Set<string>(),
    isSelectMode: false,
  });

  // 에러 상태 처리
  const error = null; // 일반 에러
  const groupsError = groupsQueryError
    ? (groupsQueryError as any)?.userMessage || '채널 그룹 조회에 실패했습니다'
    : null;

  // 필터링된 영상 목록
  const filteredVideos = useMemo(() => {
    const videosArray = Array.isArray(trendingVideos) ? trendingVideos : [];
    let filtered = videosArray;

    if (state.searchTerm) {
      const keyword = state.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (video) =>
          video.title?.toLowerCase().includes(keyword) ||
          video.channelName?.toLowerCase().includes(keyword)
      );
    }

    // 업로드 날짜 기준 내림차순 정렬
    filtered.sort(
      (a, b) =>
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );

    return filtered;
  }, [trendingVideos, state.searchTerm]);

  // Collection Actions
  const updateCollectionTarget = useCallback(
    (target: Partial<CollectionTarget>) => {
      setState((prev) => ({
        ...prev,
        collectionTarget: { ...prev.collectionTarget, ...target },
      }));
    },
    []
  );

  const updateFilters = useCallback((filters: Partial<CollectionFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: defaultFilters,
    }));
  }, []);

  const startCollection = useCallback(async () => {
    if (state.isCollecting) return;

    setState((prev) => ({
      ...prev,
      isCollecting: true,
      collectionProgress: '수집 시작...',
    }));

    try {
      let endpoint = '';
      const requestBody: CollectionFilters & {
        groupIds?: string[];
        channels?: string[];
      } = {
        ...state.filters,
      };

      if (state.collectionTarget.type === 'groups') {
        endpoint = '/api/channel-groups/collect-multiple';
        requestBody.groupIds = state.collectionTarget.selectedGroups;
      } else {
        endpoint = '/api/collect-trending';
        requestBody.channels = state.collectionTarget.selectedChannels;
      }

      setState((prev) => ({ ...prev, collectionProgress: 'API 호출 중...' }));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setState((prev) => ({
        ...prev,
        collectionProgress: '수집 완료!',
        error: null,
      }));

      // 수집 완료 후 트렌딩 비디오 다시 불러오기
      setTimeout(() => {
        fetchTrendingVideos();
      }, 1000);

      console.log('✅ 트렌딩 수집 성공:', result);
    } catch (error) {
      console.error('❌ 트렌딩 수집 실패:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : '수집에 실패했습니다',
        collectionProgress: '수집 실패',
      }));
    } finally {
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isCollecting: false,
          collectionProgress: '',
        }));
      }, 2000);
    }
  }, [state.isCollecting, state.filters, state.collectionTarget]);

  const stopCollection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCollecting: false,
      collectionProgress: '수집이 중단되었습니다',
    }));
  }, []);

  // Data Actions
  const fetchChannelGroups = useCallback(async () => {
    setState((prev) => ({ ...prev, groupsLoading: true, groupsError: null }));

    try {
      const response = await fetch('/api/channel-groups?active=true');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const groupsData = Array.isArray(result)
        ? result
        : result.data || result.groups || [];

      setState((prev) => ({
        ...prev,
        channelGroups: groupsData,
        groupsLoading: false,
      }));
    } catch (error) {
      console.error('❌ 채널 그룹 조회 실패:', error);
      setState((prev) => ({
        ...prev,
        channelGroups: [],
        groupsError:
          error instanceof Error
            ? error.message
            : '채널 그룹을 불러오는데 실패했습니다',
        groupsLoading: false,
      }));
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    setState((prev) => ({ ...prev, channelsLoading: true, error: null }));

    try {
      const response = await fetch('/api/channels');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const channelsData = Array.isArray(result)
        ? result
        : result.data || result.channels || [];

      setState((prev) => ({
        ...prev,
        channels: channelsData,
        channelsLoading: false,
      }));
    } catch (error) {
      console.error('❌ 채널 조회 실패:', error);
      setState((prev) => ({
        ...prev,
        channels: [],
        error:
          error instanceof Error
            ? error.message
            : '채널을 불러오는데 실패했습니다',
        channelsLoading: false,
      }));
    }
  }, []);

  const fetchTrendingVideos = useCallback(async () => {
    setState((prev) => ({ ...prev, videosLoading: true, error: null }));

    try {
      const response = await fetch('/api/trending/videos');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const videosData = Array.isArray(result)
        ? result
        : result.data || result.videos || [];

      setState((prev) => ({
        ...prev,
        trendingVideos: videosData,
        videosLoading: false,
      }));
    } catch (error) {
      console.error('❌ 트렌딩 비디오 조회 실패:', error);
      setState((prev) => ({
        ...prev,
        trendingVideos: [],
        error:
          error instanceof Error
            ? error.message
            : '트렌딩 비디오를 불러오는데 실패했습니다',
        videosLoading: false,
      }));
    }
  }, []);

  // Selection Actions
  const handleGroupSelection = useCallback((groupId: string) => {
    setState((prev) => ({
      ...prev,
      collectionTarget: {
        ...prev.collectionTarget,
        selectedGroups: prev.collectionTarget.selectedGroups.includes(groupId)
          ? prev.collectionTarget.selectedGroups.filter((id) => id !== groupId)
          : [...prev.collectionTarget.selectedGroups, groupId],
      },
    }));
  }, []);

  const handleChannelSelection = useCallback((channelId: string) => {
    setState((prev) => ({
      ...prev,
      collectionTarget: {
        ...prev.collectionTarget,
        selectedChannels: prev.collectionTarget.selectedChannels.includes(
          channelId
        )
          ? prev.collectionTarget.selectedChannels.filter(
              (id) => id !== channelId
            )
          : [...prev.collectionTarget.selectedChannels, channelId],
      },
    }));
  }, []);

  const handleTargetTypeChange = useCallback((type: 'groups' | 'channels') => {
    setState((prev) => ({
      ...prev,
      collectionTarget: {
        type,
        selectedGroups: [],
        selectedChannels: [],
      },
    }));
  }, []);

  // Video Management
  const toggleSelectMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSelectMode: !prev.isSelectMode,
      selectedVideos: new Set(),
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

  const updateSearchTerm = useCallback((searchTerm: string) => {
    setState((prev) => ({ ...prev, searchTerm }));
  }, []);

  return {
    // State
    collectionTarget: state.collectionTarget,
    filters: state.filters,
    isCollecting: state.isCollecting,
    collectionProgress: state.collectionProgress,
    channelGroups: state.channelGroups,
    channels: state.channels,
    trendingVideos: filteredVideos,
    groupsLoading: state.groupsLoading,
    channelsLoading: state.channelsLoading,
    videosLoading: state.videosLoading,
    error: state.error,
    groupsError: state.groupsError,
    searchTerm: state.searchTerm,
    selectedVideos: state.selectedVideos,
    isSelectMode: state.isSelectMode,

    // Actions
    updateCollectionTarget,
    updateFilters,
    resetFilters,
    startCollection,
    stopCollection,
    fetchChannelGroups,
    fetchChannels,
    fetchTrendingVideos,
    handleGroupSelection,
    handleChannelSelection,
    handleTargetTypeChange,
    toggleSelectMode,
    selectVideo,
    deselectVideo,
    selectAllVideos,
    clearSelection,
    updateSearchTerm,
  };
};
