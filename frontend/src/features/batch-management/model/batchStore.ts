import { useState, useCallback, useMemo } from 'react';
import { Video, FilterState } from '../../../shared/types';
import { getDocumentId } from '../../../shared/utils';
import {
  useBatches,
  useCreateBatch,
  useDeleteBatch,
  useDeleteBatches,
  useVideos,
} from '../../../shared/hooks/useApi';

// Batch Types
export interface CollectionBatch {
  _id: string;
  name: string;
  description?: string;
  collectionType: 'group' | 'channels';
  targetGroups?: Array<{ _id: string; name: string; color: string }>;
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
  failedChannels?: Array<{ channelName: string; error: string }>;
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
    excludeKeywords: [],
  },
};

export const useBatchStore = (): BatchStoreState & BatchStoreActions => {
  // React Query 훅 사용
  const {
    data: batches = [],
    isLoading: loading,
    error: queryError,
  } = useBatches();
  const createBatchMutation = useCreateBatch();
  const deleteBatchMutation = useDeleteBatch();
  const deleteBatchesMutation = useDeleteBatches();
  const { data: batchVideos = [], isLoading: videoLoading } = useVideos();

  const [state, setState] = useState({
    selectedBatches: new Set<string>(),
    isSelectMode: false,
    deletedBatchIds: new Set<string>(),
    searchTerm: '',
    statusFilter: 'all',
    isFormOpen: false,
    isVideoListOpen: false,
    selectedBatchId: null,
    formData: defaultFormData,
  });

  // 에러 상태 처리
  const error = queryError
    ? (queryError as any)?.userMessage || '배치 조회에 실패했습니다'
    : null;

  // 필터링된 배치 목록
  const filteredBatches = useMemo(() => {
    const batchesArray = Array.isArray(batches) ? batches : [];
    let filtered = batchesArray.filter(
      (batch) => {
        const batchId = getDocumentId(batch);
        return batchId ? !state.deletedBatchIds.has(batchId) : false;
      }
    );

    if (state.searchTerm) {
      const keyword = state.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (batch) =>
          batch.name?.toLowerCase().includes(keyword) ||
          batch.description?.toLowerCase().includes(keyword)
      );
    }

    if (state.statusFilter && state.statusFilter !== 'all') {
      filtered = filtered.filter(
        (batch) => batch.status === state.statusFilter
      );
    }

    // 생성일 기준 내림차순 정렬
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return filtered;
  }, [batches, state.searchTerm, state.statusFilter, state.deletedBatchIds]);

  // React Query 기반 액션들
  const createBatch = useCallback(
    async (batchData: BatchFormData) => {
      await createBatchMutation.mutateAsync(batchData);
      setState((prev) => ({
        ...prev,
        isFormOpen: false,
        formData: defaultFormData,
      }));
    },
    [createBatchMutation]
  );

  const deleteBatch = useCallback(
    async (batchId: string) => {
      await deleteBatchMutation.mutateAsync(batchId);
      setState((prev) => ({
        ...prev,
        deletedBatchIds: new Set([...prev.deletedBatchIds, batchId]),
        selectedBatches: new Set(
          [...prev.selectedBatches].filter((id) => id !== batchId)
        ),
      }));
    },
    [deleteBatchMutation]
  );

  const deleteBatches = useCallback(
    async (batchIds: string[]) => {
      await deleteBatchesMutation.mutateAsync(batchIds);
      setState((prev) => ({
        ...prev,
        deletedBatchIds: new Set([...prev.deletedBatchIds, ...batchIds]),
        selectedBatches: new Set(),
        isSelectMode: false,
      }));
    },
    [deleteBatchesMutation]
  );

  const fetchBatchVideos = useCallback(async (batchId: string) => {
    setState((prev) => ({
      ...prev,
      selectedBatchId: batchId,
      isVideoListOpen: true,
    }));
    // 비디오는 useVideos(batchId) 훅이 자동으로 로드함
  }, []);

  // UI Actions
  const toggleSelectMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSelectMode: !prev.isSelectMode,
      selectedBatches: new Set(),
    }));
  }, []);

  const selectBatch = useCallback((batchId: string) => {
    setState((prev) => ({
      ...prev,
      selectedBatches: new Set([...prev.selectedBatches, batchId]),
    }));
  }, []);

  const deselectBatch = useCallback((batchId: string) => {
    setState((prev) => ({
      ...prev,
      selectedBatches: new Set(
        [...prev.selectedBatches].filter((id) => id !== batchId)
      ),
    }));
  }, []);

  const selectAllBatches = useCallback(() => {
    const allBatchIds = filteredBatches
      .map((batch) => getDocumentId(batch))
      .filter((id): id is string => id !== undefined);
    setState((prev) => ({
      ...prev,
      selectedBatches: new Set(allBatchIds),
    }));
  }, [filteredBatches]);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedBatches: new Set(),
    }));
  }, []);

  // Filter Actions
  const updateSearchTerm = useCallback((searchTerm: string) => {
    setState((prev) => ({ ...prev, searchTerm }));
  }, []);

  const updateStatusFilter = useCallback((statusFilter: string) => {
    setState((prev) => ({ ...prev, statusFilter }));
  }, []);

  // Modal Actions
  const openForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isFormOpen: true,
      formData: defaultFormData,
    }));
  }, []);

  const closeForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isFormOpen: false,
      formData: defaultFormData,
    }));
  }, []);

  const openVideoList = useCallback(
    (batchId: string) => {
      fetchBatchVideos(batchId);
    },
    [fetchBatchVideos]
  );

  const closeVideoList = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVideoListOpen: false,
      selectedBatchId: null,
    }));
  }, []);

  const updateFormData = useCallback((updates: Partial<BatchFormData>) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...updates },
    }));
  }, []);

  const resetFormData = useCallback(() => {
    setState((prev) => ({ ...prev, formData: defaultFormData }));
  }, []);

  return {
    // State (React Query 기반)
    batches: filteredBatches,
    loading,
    error,
    selectedBatches: state.selectedBatches,
    isSelectMode: state.isSelectMode,
    deletedBatchIds: state.deletedBatchIds,
    searchTerm: state.searchTerm,
    statusFilter: state.statusFilter,
    isFormOpen: state.isFormOpen,
    isVideoListOpen: state.isVideoListOpen,
    selectedBatchId: state.selectedBatchId,
    batchVideos,
    videoLoading,
    formData: state.formData,

    // Actions (React Query 기반)
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
    resetFormData,
  };
};
