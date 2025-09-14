import { useState, useCallback, useMemo } from 'react';
import { Video, FilterState } from '../../../shared/types';

// Batch Types
export interface CollectionBatch {
  _id: string;
  name: string;
  description?: string;
  collectionType: 'group' | 'channels';
  targetGroups?: Array<{_id: string, name: string, color: string}>;
  targetChannels?: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews?: number;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords?: string[];
    excludeKeywords?: string[];
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  totalVideosFound: number;
  totalVideosSaved: number;
  failedChannels?: Array<{channelName: string, error: string}>;
  quotaUsed: number;
  stats?: {
    byPlatform: {
      YOUTUBE: number;
      INSTAGRAM: number;
      TIKTOK: number;
    };
    byDuration: {
      SHORT: number;
      MID: number;
      LONG: number;
    };
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchFormData {
  name: string;
  description: string;
  collectionType: 'group' | 'channels';
  selectedGroups: string[];
  selectedChannels: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews: number;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords: string[];
    excludeKeywords: string[];
  };
}

interface BatchStoreState {
  batches: CollectionBatch[];
  loading: boolean;
  error: string | null;
  selectedBatches: Set<string>;
  isSelectMode: boolean;
  deletedBatchIds: Set<string>;

  // Filters
  searchTerm: string;
  statusFilter: string;

  // Modal State
  isFormOpen: boolean;
  isVideoListOpen: boolean;
  selectedBatchId: string | null;
  batchVideos: Video[];
  videoLoading: boolean;
  formData: BatchFormData;
}

interface BatchStoreActions {
  fetchBatches: () => Promise<void>;
  createBatch: (batchData: BatchFormData) => Promise<void>;
  deleteBatch: (batchId: string) => Promise<void>;
  deleteBatches: (batchIds: string[]) => Promise<void>;
  fetchBatchVideos: (batchId: string) => Promise<void>;

  // UI Actions
  toggleSelectMode: () => void;
  selectBatch: (batchId: string) => void;
  deselectBatch: (batchId: string) => void;
  selectAllBatches: () => void;
  clearSelection: () => void;

  // Filter Actions
  updateSearchTerm: (searchTerm: string) => void;
  updateStatusFilter: (status: string) => void;

  // Modal Actions
  openForm: () => void;
  closeForm: () => void;
  openVideoList: (batchId: string) => void;
  closeVideoList: () => void;
  updateFormData: (updates: Partial<BatchFormData>) => void;
  resetFormData: () => void;
}

const defaultFormData: BatchFormData = {
  name: '',
  description: '',
  collectionType: 'group',
  selectedGroups: [],
  selectedChannels: [],
  criteria: {
    daysBack: 7,
    minViews: 10000,
    maxViews: 0,
    includeShorts: true,
    includeMidform: true,
    includeLongForm: true,
    keywords: [],
    excludeKeywords: []
  }
};

export const useBatchStore = (): BatchStoreState & BatchStoreActions => {

  const [state, setState] = useState<BatchStoreState>({
    batches: [],
    loading: false,
    error: null,
    selectedBatches: new Set(),
    isSelectMode: false,
    deletedBatchIds: new Set(),
    searchTerm: '',
    statusFilter: 'all',
    isFormOpen: false,
    isVideoListOpen: false,
    selectedBatchId: null,
    batchVideos: [],
    videoLoading: false,
    formData: defaultFormData
  });

  // 필터링된 배치 목록
  const filteredBatches = useMemo(() => {
    const batchesArray = Array.isArray(state.batches) ? state.batches : [];
    let filtered = batchesArray.filter(batch => !state.deletedBatchIds.has(batch._id));

    if (state.searchTerm) {
      const keyword = state.searchTerm.toLowerCase();
      filtered = filtered.filter(batch =>
        batch.name?.toLowerCase().includes(keyword) ||
        batch.description?.toLowerCase().includes(keyword)
      );
    }

    if (state.statusFilter && state.statusFilter !== 'all') {
      filtered = filtered.filter(batch => batch.status === state.statusFilter);
    }

    // 생성일 기준 내림차순 정렬
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [state.batches, state.searchTerm, state.statusFilter, state.deletedBatchIds]);

  const fetchBatches = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/batches');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      let batchesData = [];
      if (Array.isArray(result)) {
        batchesData = result;
      } else if (result && Array.isArray(result.data)) {
        batchesData = result.data;
      } else if (result && Array.isArray(result.batches)) {
        batchesData = result.batches;
      }

      console.log('📦 BatchStore: API 응답 데이터', { result, batchesData });

      setState(prev => ({
        ...prev,
        batches: batchesData,
        loading: false
      }));
    } catch (error) {
      console.error('❌ BatchStore: API 호출 실패', error);
      setState(prev => ({
        ...prev,
        batches: [],
        error: error instanceof Error ? error.message : '배치 조회에 실패했습니다',
        loading: false
      }));
    }
  }, []);

  const createBatch = useCallback(async (batchData: BatchFormData) => {
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newBatch = await response.json();

      setState(prev => ({
        ...prev,
        batches: [newBatch, ...prev.batches],
        isFormOpen: false,
        formData: defaultFormData
      }));

      console.log('✅ 배치 생성 성공:', newBatch.name);
    } catch (error) {
      console.error('❌ 배치 생성 실패:', error);
      throw error;
    }
  }, []);

  const deleteBatch = useCallback(async (batchId: string) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setState(prev => ({
        ...prev,
        deletedBatchIds: new Set([...prev.deletedBatchIds, batchId]),
        selectedBatches: new Set([...prev.selectedBatches].filter(id => id !== batchId))
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteBatches = useCallback(async (batchIds: string[]) => {
    for (const batchId of batchIds) {
      await deleteBatch(batchId);
    }
  }, [deleteBatch]);

  const fetchBatchVideos = useCallback(async (batchId: string) => {
    setState(prev => ({ ...prev, videoLoading: true }));

    try {
      const response = await fetch(`/api/batches/${batchId}/videos`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const videosData = Array.isArray(result) ? result : result.data || result.videos || [];

      setState(prev => ({
        ...prev,
        batchVideos: videosData,
        videoLoading: false,
        selectedBatchId: batchId,
        isVideoListOpen: true
      }));
    } catch (error) {
      console.error('❌ 배치 영상 조회 실패:', error);
      setState(prev => ({
        ...prev,
        batchVideos: [],
        videoLoading: false,
        error: error instanceof Error ? error.message : '배치 영상 조회에 실패했습니다'
      }));
    }
  }, []);

  // UI Actions
  const toggleSelectMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSelectMode: !prev.isSelectMode,
      selectedBatches: new Set()
    }));
  }, []);

  const selectBatch = useCallback((batchId: string) => {
    setState(prev => ({
      ...prev,
      selectedBatches: new Set([...prev.selectedBatches, batchId])
    }));
  }, []);

  const deselectBatch = useCallback((batchId: string) => {
    setState(prev => ({
      ...prev,
      selectedBatches: new Set([...prev.selectedBatches].filter(id => id !== batchId))
    }));
  }, []);

  const selectAllBatches = useCallback(() => {
    const allBatchIds = filteredBatches.map(batch => batch._id);
    setState(prev => ({
      ...prev,
      selectedBatches: new Set(allBatchIds)
    }));
  }, [filteredBatches]);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedBatches: new Set()
    }));
  }, []);

  // Filter Actions
  const updateSearchTerm = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm }));
  }, []);

  const updateStatusFilter = useCallback((statusFilter: string) => {
    setState(prev => ({ ...prev, statusFilter }));
  }, []);

  // Modal Actions
  const openForm = useCallback(() => {
    setState(prev => ({ ...prev, isFormOpen: true, formData: defaultFormData }));
  }, []);

  const closeForm = useCallback(() => {
    setState(prev => ({ ...prev, isFormOpen: false, formData: defaultFormData }));
  }, []);

  const openVideoList = useCallback((batchId: string) => {
    fetchBatchVideos(batchId);
  }, [fetchBatchVideos]);

  const closeVideoList = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVideoListOpen: false,
      selectedBatchId: null,
      batchVideos: []
    }));
  }, []);

  const updateFormData = useCallback((updates: Partial<BatchFormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates }
    }));
  }, []);

  const resetFormData = useCallback(() => {
    setState(prev => ({ ...prev, formData: defaultFormData }));
  }, []);

  return {
    // State
    batches: filteredBatches,
    loading: state.loading,
    error: state.error,
    selectedBatches: state.selectedBatches,
    isSelectMode: state.isSelectMode,
    deletedBatchIds: state.deletedBatchIds,
    searchTerm: state.searchTerm,
    statusFilter: state.statusFilter,
    isFormOpen: state.isFormOpen,
    isVideoListOpen: state.isVideoListOpen,
    selectedBatchId: state.selectedBatchId,
    batchVideos: state.batchVideos,
    videoLoading: state.videoLoading,
    formData: state.formData,

    // Actions
    fetchBatches,
    createBatch,
    deleteBatch,
    deleteBatches,
    fetchBatchVideos,
    toggleSelectMode,
    selectBatch,
    deselectBatch,
    selectAllBatches,
    clearSelection,
    updateSearchTerm,
    updateStatusFilter,
    openForm,
    closeForm,
    openVideoList,
    closeVideoList,
    updateFormData,
    resetFormData
  };
};