/**
 * 🎯 Trending Collection Feature - Model Layer
 *
 * 트렌딩 수집 관련 상태 관리 및 비즈니스 로직
 * - 수집 진행 상황 관리
 * - 배치 관리
 * - 필터 설정 관리
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { CollectionFilters, BatchCollectionResult, CollectionResult } from '../api/collectionApi';

// ===== Collection State Types =====
export interface CollectionProgress {
  isCollecting: boolean;
  currentBatch: BatchCollectionResult | null;
  channelResults: CollectionResult[];
  totalProgress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
}

export interface CollectionSettings {
  defaultFilters: CollectionFilters;
  autoSave: boolean;
  notifications: {
    onComplete: boolean;
    onError: boolean;
  };
  maxConcurrentCollections: number;
}

// ===== Store Interface =====
interface TrendingCollectionStore {
  // State
  progress: CollectionProgress;
  batches: BatchCollectionResult[];
  settings: CollectionSettings;
  selectedBatchIds: string[];

  // UI State
  isLoading: boolean;
  error: string | null;
  showCollectionModal: boolean;
  showSettingsModal: boolean;

  // Actions
  startCollection: (batchResult: BatchCollectionResult) => void;
  updateChannelProgress: (result: CollectionResult) => void;
  completeCollection: () => void;
  cancelCollection: () => void;

  setBatches: (batches: BatchCollectionResult[]) => void;
  addBatch: (batch: BatchCollectionResult) => void;
  removeBatch: (batchId: string) => void;
  updateBatch: (batchId: string, updates: Partial<BatchCollectionResult>) => void;

  updateSettings: (settings: Partial<CollectionSettings>) => void;

  setSelectedBatchIds: (batchIds: string[]) => void;
  toggleBatchSelection: (batchId: string) => void;
  clearBatchSelection: () => void;

  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  openCollectionModal: () => void;
  closeCollectionModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  // Computed
  getActiveBatches: () => BatchCollectionResult[];
  getCompletedBatches: () => BatchCollectionResult[];
  getTotalVideosCollected: () => number;
  getCollectionStats: () => {
    totalBatches: number;
    totalVideos: number;
    totalChannels: number;
    successRate: number;
  };
}

// ===== Default Values =====
const defaultSettings: CollectionSettings = {
  defaultFilters: {
    daysBack: 7,
    minViews: 10000,
    includeShorts: true,
    includeLongForm: true,
    keywords: [],
    excludeKeywords: [],
  },
  autoSave: true,
  notifications: {
    onComplete: true,
    onError: true,
  },
  maxConcurrentCollections: 3,
};

const initialProgress: CollectionProgress = {
  isCollecting: false,
  currentBatch: null,
  channelResults: [],
  totalProgress: 0,
};

// ===== Store Implementation =====
export const useTrendingCollectionStore = create<TrendingCollectionStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      progress: initialProgress,
      batches: [],
      settings: defaultSettings,
      selectedBatchIds: [],
      isLoading: false,
      error: null,
      showCollectionModal: false,
      showSettingsModal: false,

      // Collection Actions
      startCollection: (batchResult) =>
        set(
          {
            progress: {
              isCollecting: true,
              currentBatch: batchResult,
              channelResults: [],
              totalProgress: 0,
            },
          },
          false,
          'startCollection'
        ),

      updateChannelProgress: (result) =>
        set(
          (state) => {
            const updatedResults = [...state.progress.channelResults];
            const existingIndex = updatedResults.findIndex(
              (r) => r.channelId === result.channelId
            );

            if (existingIndex >= 0) {
              updatedResults[existingIndex] = result;
            } else {
              updatedResults.push(result);
            }

            const completedChannels = updatedResults.filter(
              (r) => r.status === 'completed' || r.status === 'error'
            ).length;

            const totalChannels = state.progress.currentBatch?.totalChannels || 1;
            const totalProgress = Math.round((completedChannels / totalChannels) * 100);

            return {
              progress: {
                ...state.progress,
                channelResults: updatedResults,
                totalProgress,
              },
            };
          },
          false,
          'updateChannelProgress'
        ),

      completeCollection: () =>
        set(
          (state) => ({
            progress: {
              ...state.progress,
              isCollecting: false,
              totalProgress: 100,
            },
          }),
          false,
          'completeCollection'
        ),

      cancelCollection: () =>
        set(
          { progress: initialProgress },
          false,
          'cancelCollection'
        ),

      // Batch Management
      setBatches: (batches) => set({ batches }, false, 'setBatches'),

      addBatch: (batch) =>
        set(
          (state) => ({ batches: [batch, ...state.batches] }),
          false,
          'addBatch'
        ),

      removeBatch: (batchId) =>
        set(
          (state) => ({
            batches: state.batches.filter((batch) => batch.batchId !== batchId),
            selectedBatchIds: state.selectedBatchIds.filter((id) => id !== batchId),
          }),
          false,
          'removeBatch'
        ),

      updateBatch: (batchId, updates) =>
        set(
          (state) => ({
            batches: state.batches.map((batch) =>
              batch.batchId === batchId ? { ...batch, ...updates } : batch
            ),
          }),
          false,
          'updateBatch'
        ),

      // Settings
      updateSettings: (newSettings) =>
        set(
          (state) => ({
            settings: { ...state.settings, ...newSettings },
          }),
          false,
          'updateSettings'
        ),

      // Selection
      setSelectedBatchIds: (batchIds) =>
        set({ selectedBatchIds: batchIds }, false, 'setSelectedBatchIds'),

      toggleBatchSelection: (batchId) =>
        set(
          (state) => ({
            selectedBatchIds: state.selectedBatchIds.includes(batchId)
              ? state.selectedBatchIds.filter((id) => id !== batchId)
              : [...state.selectedBatchIds, batchId],
          }),
          false,
          'toggleBatchSelection'
        ),

      clearBatchSelection: () =>
        set({ selectedBatchIds: [] }, false, 'clearBatchSelection'),

      // UI State
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setError: (error) => set({ error }, false, 'setError'),

      openCollectionModal: () => set({ showCollectionModal: true }, false, 'openCollectionModal'),
      closeCollectionModal: () => set({ showCollectionModal: false }, false, 'closeCollectionModal'),

      openSettingsModal: () => set({ showSettingsModal: true }, false, 'openSettingsModal'),
      closeSettingsModal: () => set({ showSettingsModal: false }, false, 'closeSettingsModal'),

      // Computed
      getActiveBatches: () => {
        return get().batches.filter(
          (batch) => batch.status === 'pending' || batch.status === 'collecting'
        );
      },

      getCompletedBatches: () => {
        return get().batches.filter(
          (batch) => batch.status === 'completed' || batch.status === 'error'
        );
      },

      getTotalVideosCollected: () => {
        return get().batches.reduce((sum, batch) => sum + batch.totalVideosCollected, 0);
      },

      getCollectionStats: () => {
        const batches = get().batches;
        const completed = batches.filter((b) => b.status === 'completed');

        return {
          totalBatches: batches.length,
          totalVideos: batches.reduce((sum, b) => sum + b.totalVideosCollected, 0),
          totalChannels: batches.reduce((sum, b) => sum + b.totalChannels, 0),
          successRate: batches.length > 0 ? (completed.length / batches.length) * 100 : 0,
        };
      },
    }),
    {
      name: 'trending-collection-store',
    }
  )
);

// ===== Custom Hooks =====

/**
 * 수집 진행 상황을 반환합니다
 */
export const useCollectionProgress = () => {
  return useTrendingCollectionStore((state) => state.progress);
};

/**
 * 수집 설정과 업데이트 함수를 반환합니다
 */
export const useCollectionSettings = () => {
  const settings = useTrendingCollectionStore((state) => state.settings);
  const updateSettings = useTrendingCollectionStore((state) => state.updateSettings);

  return { settings, updateSettings };
};

/**
 * 배치 선택 상태와 관련 함수들을 반환합니다
 */
export const useBatchSelection = () => {
  const selectedBatchIds = useTrendingCollectionStore((state) => state.selectedBatchIds);
  const toggleBatchSelection = useTrendingCollectionStore((state) => state.toggleBatchSelection);
  const clearBatchSelection = useTrendingCollectionStore((state) => state.clearBatchSelection);

  return {
    selectedBatchIds,
    toggleBatchSelection,
    clearBatchSelection,
  };
};