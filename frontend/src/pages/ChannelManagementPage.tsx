import React, { useState, useEffect, useCallback } from 'react';
import { Channel } from '../shared/types';
import { SearchBar, ActionBar } from '../shared/components';
import { ChannelCard, ChannelAnalysisModal } from '../features/channel-management';
import { DeleteConfirmationModal } from '../shared/ui';
import { formatViews } from '../shared/utils';
import {
  useChannelManagementStore,
  useFilteredChannels,
  useChannelSelection,
  useChannelFilters
} from '../features/channel-management/model/channelStore';

const ChannelManagementPage: React.FC = () => {
  // Zustand Store 사용
  const channels = useChannelManagementStore(state => state.channels);
  const isLoading = useChannelManagementStore(state => state.isLoading);
  const error = useChannelManagementStore(state => state.error);

  // Store Actions
  const setChannels = useChannelManagementStore(state => state.setChannels);
  const setLoading = useChannelManagementStore(state => state.setLoading);
  const setError = useChannelManagementStore(state => state.setError);
  const removeChannel = useChannelManagementStore(state => state.removeChannel);

  // Custom Hooks
  const filteredChannels = useFilteredChannels();
  const { selectedChannels, toggleChannelSelection, selectAllChannels, clearSelection } = useChannelSelection();
  const { filters, updateFilters, resetFilters } = useChannelFilters();

  // Local State
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'single' | 'bulk';
    data?: Channel;
    count?: number;
  } | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // API 데이터 로드
  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/channels');
        if (!response.ok) throw new Error('채널 데이터 조회 실패');

        const result = await response.json();
        const channelsData = Array.isArray(result) ? result : result.data || result.channels || [];

        setChannels(channelsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '채널 데이터를 불러오는데 실패했습니다');
        setChannels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [setChannels, setLoading, setError]);

  // Event Handlers
  const handleChannelClick = useCallback((channel: Channel) => {
    if (isSelectMode) {
      toggleChannelSelection(channel.channelId);
    } else {
      setSelectedChannel(channel);
    }
  }, [isSelectMode, toggleChannelSelection]);

  const handleSelectToggle = useCallback((channelId: string) => {
    toggleChannelSelection(channelId);
  }, [toggleChannelSelection]);

  const handleSelectAll = useCallback(() => {
    if (selectedChannels.length === filteredChannels.length) {
      clearSelection();
    } else {
      selectAllChannels();
    }
  }, [selectedChannels.length, filteredChannels.length, clearSelection, selectAllChannels]);

  const handleChannelAnalyze = useCallback((channel: Channel) => {
    setChannelToAnalyze(channel.channelId);
  }, []);

  const handleChannelDelete = useCallback(async (channel: Channel) => {
    try {
      const response = await fetch(`/api/channels/${channel.channelId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('채널 삭제 실패');

      removeChannel(channel.channelId);
      console.log('✅ 채널 삭제 성공:', channel.name);
    } catch (error) {
      console.error('❌ 채널 삭제 실패:', error);
      throw error;
    }
  }, [removeChannel]);

  const handleDeleteClick = useCallback((item: { type: 'single' | 'bulk'; data?: Channel; count?: number }) => {
    setItemToDelete(item);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'single' && itemToDelete.data) {
        await handleChannelDelete(itemToDelete.data);
      } else if (itemToDelete.type === 'bulk') {
        for (const channelId of selectedChannels) {
          const channel = channels.find(ch => ch.channelId === channelId);
          if (channel) {
            await handleChannelDelete(channel);
          }
        }
        clearSelection();
      }

      setItemToDelete(null);
    } catch (error) {
      console.error('❌ 삭제 실패:', error);
    }
  }, [itemToDelete, handleChannelDelete, selectedChannels, channels, clearSelection]);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => !prev);
    if (isSelectMode) {
      clearSelection();
    }
  }, [isSelectMode, clearSelection]);

  // 통계 계산
  const stats = {
    totalChannels: filteredChannels.length,
    totalSubscribers: filteredChannels.reduce((sum, ch) => sum + (ch.subscribers || 0), 0),
    platformCounts: filteredChannels.reduce((acc, channel) => {
      acc[channel.platform] = (acc[channel.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  if (isLoading && channels.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">채널 관리</h1>
              <p className="mt-1 text-sm text-gray-600">
                등록된 채널들을 관리하고 분석하세요
              </p>
            </div>

            {/* 통계 요약 */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalChannels}</div>
                <div className="text-xs text-gray-500">총 채널</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatViews(stats.totalSubscribers)}
                </div>
                <div className="text-xs text-gray-500">총 구독자</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 검색 및 필터 바 */}
        <SearchBar
          searchTerm={filters.searchTerm}
          onSearchTermChange={(term) => updateFilters({ searchTerm: term })}
          placeholder="채널명, 설명 검색..."
          showFilters={true}
        >
          <select
            value={filters.platform}
            onChange={(e) => updateFilters({ platform: e.target.value as any })}
            className="border-gray-300 rounded-md"
          >
            <option value="ALL">모든 플랫폼</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectMode}
              className={`px-3 py-1 text-sm rounded ${
                isSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {isSelectMode ? '선택 취소' : '선택 모드'}
            </button>
          </div>
        </SearchBar>

        {/* 결과 정보 */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="text-sm text-gray-500">
            총 {filteredChannels.length}개 채널 (키워드: "{filters.searchTerm || '없음'}", 플랫폼: {filters.platform === 'ALL' ? '전체' : filters.platform})
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* 메인 콘텐츠 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {filteredChannels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map((channel) => (
                  <ChannelCard
                    key={channel.channelId}
                    channel={channel}
                    onClick={handleChannelClick}
                    onAnalyze={handleChannelAnalyze}
                    onDelete={(ch) => handleDeleteClick({ type: 'single', data: ch })}
                    isSelectMode={isSelectMode}
                    isSelected={selectedChannels.includes(channel.channelId)}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">채널이 없습니다</div>
                <div className="text-gray-400">새로운 채널을 추가해보세요.</div>
              </div>
            )}
          </div>
        </div>

        {/* 선택 모드 액션 바 */}
        <ActionBar
          isVisible={isSelectMode}
          selectedCount={selectedChannels.length}
          totalCount={filteredChannels.length}
          itemType="개"
          onSelectAll={handleSelectAll}
          onClearSelection={() => {
            toggleSelectMode();
            clearSelection();
          }}
          onDelete={() => handleDeleteClick({ type: 'bulk', count: selectedChannels.length })}
        />
      </div>

      {/* 모달들 */}
      <ChannelAnalysisModal
        channelName={channelToAnalyze}
        onClose={() => setChannelToAnalyze(null)}
      />

      <DeleteConfirmationModal
        itemToDelete={itemToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

export default ChannelManagementPage;