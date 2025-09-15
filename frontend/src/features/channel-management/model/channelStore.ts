/**
 * 🎯 Channel Management Feature - Model Layer
 *
 * 채널 관리 관련 상태 관리 및 비즈니스 로직
 * - 채널 목록 상태 관리
 * - 채널 그룹 상태 관리
 * - 선택 상태 및 필터링
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { useMemo } from 'react';
import { Channel } from '../../../shared/types';

// ===== Channel Management State Types =====
export interface ChannelFilters {
  platform: 'ALL' | 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  contentType: 'ALL' | 'shortform' | 'longform' | 'mixed';
  analysisStatus: 'ALL' | 'pending' | 'analyzing' | 'completed' | 'error';
  subscriberRange: {
    min: number;
    max: number;
  };
  searchTerm: string;
}

export interface ChannelManagementState {
  // Data
  channels: Channel[];
  channelGroups: any[];  // TODO: Define proper ChannelGroup type
  selectedChannels: string[];

  // UI State
  isLoading: boolean;
  error: string | null;
  filters: ChannelFilters;

  // Modal States
  showCreateModal: boolean;
  showGroupModal: boolean;
  showAnalysisModal: boolean;
  editingChannel: Channel | null;
  analyzingChannel: string | null;
}

export interface ChannelManagementActions {
  // Data Actions
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;

  // Channel Groups
  setChannelGroups: (groups: any[]) => void;  // TODO: Define proper ChannelGroup type
  addChannelGroup: (group: any) => void;
  updateChannelGroup: (groupId: string, updates: any) => void;
  removeChannelGroup: (groupId: string) => void;

  // Selection
  setSelectedChannels: (channelIds: string[]) => void;
  toggleChannelSelection: (channelId: string) => void;
  selectAllChannels: () => void;
  clearSelection: () => void;

  // Filters
  updateFilters: (filters: Partial<ChannelFilters>) => void;
  resetFilters: () => void;

  // UI State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Modal Actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openGroupModal: () => void;
  closeGroupModal: () => void;
  openAnalysisModal: (channelId: string) => void;
  closeAnalysisModal: () => void;
  openEditModal: (channel: Channel) => void;
  closeEditModal: () => void;

  // Computed
  getChannelsByGroup: (groupId: string) => Channel[];
  getChannelStats: () => {
    totalChannels: number;
    totalSubscribers: number;
    averageViews: number;
    platformBreakdown: Record<string, number>;
  };
}

// ===== Default Values =====
const defaultFilters: ChannelFilters = {
  platform: 'ALL',
  contentType: 'ALL',
  analysisStatus: 'ALL',
  subscriberRange: { min: 0, max: 10000000 },
  searchTerm: '',
};

const initialState: ChannelManagementState = {
  channels: [],
  channelGroups: [],
  selectedChannels: [],
  isLoading: false,
  error: null,
  filters: defaultFilters,
  showCreateModal: false,
  showGroupModal: false,
  showAnalysisModal: false,
  editingChannel: null,
  analyzingChannel: null,
};

// ===== Store Implementation =====
export const useChannelManagementStore = create<
  ChannelManagementState & ChannelManagementActions
>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Data Actions
      setChannels: (channels) => set({ channels }, false, 'setChannels'),

      addChannel: (channel) =>
        set(
          (state) => ({ channels: [...state.channels, channel] }),
          false,
          'addChannel'
        ),

      updateChannel: (channelId, updates) =>
        set(
          (state) => ({
            channels: state.channels.map((channel) =>
              channel.channelId === channelId ? { ...channel, ...updates } : channel
            ),
          }),
          false,
          'updateChannel'
        ),

      removeChannel: (channelId) =>
        set(
          (state) => ({
            channels: state.channels.filter((channel) => channel.channelId !== channelId),
            selectedChannels: state.selectedChannels.filter((id) => id !== channelId),
          }),
          false,
          'removeChannel'
        ),

      // Channel Groups
      setChannelGroups: (groups) =>
        set({ channelGroups: groups }, false, 'setChannelGroups'),

      addChannelGroup: (group) =>
        set(
          (state) => ({ channelGroups: [...state.channelGroups, group] }),
          false,
          'addChannelGroup'
        ),

      updateChannelGroup: (groupId, updates) =>
        set(
          (state) => ({
            channelGroups: state.channelGroups.map((group) =>
              group._id === groupId ? { ...group, ...updates } : group
            ),
          }),
          false,
          'updateChannelGroup'
        ),

      removeChannelGroup: (groupId) =>
        set(
          (state) => ({
            channelGroups: state.channelGroups.filter((group) => group._id !== groupId),
          }),
          false,
          'removeChannelGroup'
        ),

      // Selection
      setSelectedChannels: (channelIds) =>
        set({ selectedChannels: channelIds }, false, 'setSelectedChannels'),

      toggleChannelSelection: (channelId) =>
        set(
          (state) => ({
            selectedChannels: state.selectedChannels.includes(channelId)
              ? state.selectedChannels.filter((id) => id !== channelId)
              : [...state.selectedChannels, channelId],
          }),
          false,
          'toggleChannelSelection'
        ),

      selectAllChannels: () => {
        const state = get();
        const { channels, filters } = state;

        // 방어적 코딩: channels가 배열인지 확인
        if (!Array.isArray(channels)) {
          return;
        }

        const filteredChannels = channels.filter((channel) => {
          // Platform filter
          if (filters.platform !== 'ALL' && channel.platform !== filters.platform) {
            return false;
          }

          // Content type filter
          if (
            filters.contentType !== 'ALL' &&
            channel.categoryInfo?.majorCategory !== filters.contentType
          ) {
            return false;
          }

          // Search filter
          if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            const matchesName = channel.name?.toLowerCase().includes(searchLower);
            const matchesKeywords = channel.keywords?.some((keyword) =>
              keyword.toLowerCase().includes(searchLower)
            );

            if (!matchesName && !matchesKeywords) {
              return false;
            }
          }

          // Subscriber range filter
          const subscribers = channel.subscribers || 0;
          if (subscribers < filters.subscriberRange.min || subscribers > filters.subscriberRange.max) {
            return false;
          }

          // Analysis status filter
          if (filters.analysisStatus !== 'ALL') {
            // Skip analysis status filtering for now (not implemented in interface)
            // TODO: Implement analysis status logic when needed
          }

          return true;
        });

        set(
          { selectedChannels: filteredChannels.map((channel) => channel.channelId) },
          false,
          'selectAllChannels'
        );
      },

      clearSelection: () => set({ selectedChannels: [] }, false, 'clearSelection'),

      // Filters
      updateFilters: (newFilters) =>
        set(
          (state) => ({ filters: { ...state.filters, ...newFilters } }),
          false,
          'updateFilters'
        ),

      resetFilters: () => set({ filters: defaultFilters }, false, 'resetFilters'),

      // UI State
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setError: (error) => set({ error }, false, 'setError'),

      // Modal Actions
      openCreateModal: () => set({ showCreateModal: true }, false, 'openCreateModal'),
      closeCreateModal: () => set({ showCreateModal: false }, false, 'closeCreateModal'),

      openGroupModal: () => set({ showGroupModal: true }, false, 'openGroupModal'),
      closeGroupModal: () => set({ showGroupModal: false }, false, 'closeGroupModal'),

      openAnalysisModal: (channelId) =>
        set(
          { showAnalysisModal: true, analyzingChannel: channelId },
          false,
          'openAnalysisModal'
        ),
      closeAnalysisModal: () =>
        set(
          { showAnalysisModal: false, analyzingChannel: null },
          false,
          'closeAnalysisModal'
        ),

      openEditModal: (channel) =>
        set({ editingChannel: channel }, false, 'openEditModal'),
      closeEditModal: () => set({ editingChannel: null }, false, 'closeEditModal'),

      // Computed Methods

      getChannelsByGroup: (groupId) => {
        const { channels, channelGroups } = get();
        const group = channelGroups.find((g) => g._id === groupId);
        if (!group) return [];

        return channels.filter((channel) => group.channels.some(gc => gc.channelId === channel.channelId));
      },

      getChannelStats: () => {
        const channels = get().channels;

        const totalSubscribers = channels.reduce(
          (sum, channel) => sum + (channel.subscribers || 0),
          0
        );

        const totalViews = channels.reduce(
          (sum, channel) => sum + (channel.totalViews || 0),
          0
        );

        const platformBreakdown = channels.reduce((acc, channel) => {
          acc[channel.platform] = (acc[channel.platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          totalChannels: channels.length,
          totalSubscribers,
          averageViews: channels.length > 0 ? Math.round(totalViews / channels.length) : 0,
          platformBreakdown,
        };
      },
    }),
    {
      name: 'channel-management-store',
    }
  )
);

// ===== Custom Hooks =====

/**
 * 필터링된 채널 목록을 반환합니다
 */
export const useFilteredChannels = () => {
  const channels = useChannelManagementStore(state => state.channels);
  const filters = useChannelManagementStore(state => state.filters);

  return useMemo(() => {
    // 방어적 코딩: channels가 배열인지 확인
    if (!Array.isArray(channels)) {
      return [];
    }

    return channels.filter((channel) => {
      // Platform filter
      if (filters.platform !== 'ALL' && channel.platform !== filters.platform) {
        return false;
      }

      // Content type filter
      if (
        filters.contentType !== 'ALL' &&
        channel.categoryInfo?.majorCategory !== filters.contentType
      ) {
        return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = channel.name?.toLowerCase().includes(searchLower);
        const matchesKeywords = channel.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(searchLower)
        );

        if (!matchesName && !matchesKeywords) {
          return false;
        }
      }

      // Subscriber range filter
      const subscribers = channel.subscribers || 0;
      if (subscribers < filters.subscriberRange.min || subscribers > filters.subscriberRange.max) {
        return false;
      }

      // Analysis status filter
      if (filters.analysisStatus !== 'ALL') {
        // Skip analysis status filtering for now (not implemented in interface)
        // TODO: Implement analysis status logic when needed
      }

      return true;
    });
  }, [channels, filters]);
};

/**
 * 선택된 채널 목록과 선택 관련 함수들을 반환합니다
 */
export const useChannelSelection = () => {
  const selectedChannels = useChannelManagementStore((state) => state.selectedChannels);
  const toggleChannelSelection = useChannelManagementStore(
    (state) => state.toggleChannelSelection
  );
  const selectAllChannels = useChannelManagementStore((state) => state.selectAllChannels);
  const clearSelection = useChannelManagementStore((state) => state.clearSelection);

  return {
    selectedChannels,
    toggleChannelSelection,
    selectAllChannels,
    clearSelection,
  };
};

/**
 * 채널 필터 상태와 업데이트 함수를 반환합니다
 */
export const useChannelFilters = () => {
  const filters = useChannelManagementStore((state) => state.filters);
  const updateFilters = useChannelManagementStore((state) => state.updateFilters);
  const resetFilters = useChannelManagementStore((state) => state.resetFilters);

  return { filters, updateFilters, resetFilters };
};