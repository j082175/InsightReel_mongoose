import React, { useState, useCallback } from 'react';
import { Channel } from '../shared/types';
import { SearchBar, ActionBar } from '../shared/components';
import {
  ChannelCard,
  ChannelAnalysisModal,
  ChannelGroupModal,
  ChannelGroupCard,
} from '../features/channel-management';
import { DeleteConfirmationModal } from '../shared/ui';
import { formatViews } from '../shared/utils';
import toast from 'react-hot-toast';
import {
  useChannels,
  useChannelGroups,
  useDeleteChannel,
  useDeleteChannels,
  useCreateChannelGroup,
  useUpdateChannelGroup,
  useDeleteChannelGroup,
} from '../shared/hooks';
import {
  useFilteredChannels,
  useChannelSelection,
  useChannelFilters,
} from '../features/channel-management/model/channelStore';

const ChannelManagementPage: React.FC = () => {
  // React Query 훅 사용
  const { data: channels = [], isLoading, error: queryError } = useChannels();
  const { data: channelGroups = [], isLoading: isLoadingGroups } =
    useChannelGroups();

  // React Query Mutations
  const deleteChannelMutation = useDeleteChannel();
  const deleteChannelsMutation = useDeleteChannels();
  const createChannelGroupMutation = useCreateChannelGroup();
  const updateChannelGroupMutation = useUpdateChannelGroup();
  const deleteChannelGroupMutation = useDeleteChannelGroup();

  // Custom Hooks (필터링 및 선택 로직)
  const filteredChannels = useFilteredChannels(channels);
  const {
    selectedChannels,
    toggleChannelSelection,
    selectAllChannels,
    clearSelection,
  } = useChannelSelection();
  const { filters, updateFilters, resetFilters } = useChannelFilters();

  const error = queryError?.message || null;

  // Local State
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'single' | 'bulk';
    data?: Channel;
    count?: number;
  } | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  // Event Handlers
  const handleChannelClick = useCallback(
    (channel: Channel) => {
      if (isSelectMode) {
        toggleChannelSelection(channel.channelId);
      } else {
        setSelectedChannel(channel);
      }
    },
    [isSelectMode, toggleChannelSelection]
  );

  const handleSelectToggle = useCallback(
    (channelId: string) => {
      toggleChannelSelection(channelId);
    },
    [toggleChannelSelection]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedChannels.length === filteredChannels.length) {
      clearSelection();
    } else {
      selectAllChannels();
    }
  }, [
    selectedChannels.length,
    filteredChannels.length,
    clearSelection,
    selectAllChannels,
  ]);

  const handleChannelAnalyze = useCallback((channel: Channel) => {
    setChannelToAnalyze(channel.channelId);
  }, []);

  const handleChannelDelete = useCallback(
    async (channel: Channel) => {
      try {
        await deleteChannelMutation.mutateAsync(channel._id);
      } catch (error) {
        throw error;
      }
    },
    [deleteChannelMutation]
  );

  const handleDeleteClick = useCallback(
    (item: { type: 'single' | 'bulk'; data?: Channel; count?: number }) => {
      setItemToDelete(item);
    },
    []
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'single' && itemToDelete.data) {
        await handleChannelDelete(itemToDelete.data);
      } else if (itemToDelete.type === 'bulk') {
        const selectedChannelIds = selectedChannels
          .map((channelId) => {
            const channel = channels.find((ch) => ch.channelId === channelId);
            return channel?._id;
          })
          .filter(Boolean) as string[];

        if (selectedChannelIds.length > 0) {
          await deleteChannelsMutation.mutateAsync(selectedChannelIds);
        }
        clearSelection();
      }

      setItemToDelete(null);
    } catch (error) {
      toast.error(`삭제 실패: ${error}`);
    }
  }, [
    itemToDelete,
    handleChannelDelete,
    selectedChannels,
    channels,
    clearSelection,
    deleteChannelsMutation,
  ]);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    if (isSelectMode) {
      clearSelection();
    }
  }, [isSelectMode, clearSelection]);

  const handleCreateGroup = useCallback(() => {
    setShowGroupModal(true);
  }, []);

  const handleSaveGroup = useCallback(
    async (groupData: any) => {
      try {
        if (editingGroup) {
          await updateChannelGroupMutation.mutateAsync({
            id: editingGroup._id,
            data: groupData,
          });
        } else {
          await createChannelGroupMutation.mutateAsync(groupData);
        }

        setShowGroupModal(false);
        setEditingGroup(null);
      } catch (error) {
        toast.error(`그룹 ${editingGroup ? '수정' : '생성'} 실패: ${error}`);
      }
    },
    [editingGroup, createChannelGroupMutation, updateChannelGroupMutation]
  );

  // 그룹 관련 이벤트 핸들러들
  const handleGroupEdit = useCallback((group: any) => {
    setEditingGroup(group);
    setShowGroupModal(true);
  }, []);

  const handleGroupDelete = useCallback(
    async (group: any) => {
      try {
        await deleteChannelGroupMutation.mutateAsync(group._id);
      } catch (error) {
        throw error;
      }
    },
    [deleteChannelGroupMutation]
  );

  // 통계 계산
  const stats = {
    totalChannels: filteredChannels.length,
    totalSubscribers: filteredChannels.reduce(
      (sum, ch) => sum + (ch.subscribers || 0),
      0
    ),
    platformCounts: filteredChannels.reduce(
      (acc, channel) => {
        acc[channel.platform] = (acc[channel.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    채널 관리
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    등록된 채널들을 관리하고 분석하세요
                  </p>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateGroup}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    그룹 만들기
                  </button>
                </div>
              </div>
            </div>

            {/* 통계 요약 */}
            <div className="flex gap-6 ml-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalChannels}
                </div>
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
                isSelectMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {isSelectMode ? '선택 취소' : '선택 모드'}
            </button>
          </div>
        </SearchBar>

        {/* 결과 정보 */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="text-sm text-gray-500">
            총 {filteredChannels.length}개 채널 (키워드: "
            {filters.searchTerm || '없음'}", 플랫폼:{' '}
            {filters.platform === 'ALL' ? '전체' : filters.platform})
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* 채널 그룹 섹션 */}
        {channelGroups.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  채널 그룹
                </h2>
                <span className="text-sm text-gray-500">
                  {channelGroups.length}개 그룹
                </span>
              </div>

              {isLoadingGroups ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-40 bg-gray-200 rounded-lg animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {channelGroups.map((group) => (
                    <ChannelGroupCard
                      key={group._id}
                      group={group}
                      onEdit={handleGroupEdit}
                      onDelete={handleGroupDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 메인 콘텐츠 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">채널 목록</h2>
              <span className="text-sm text-gray-500">
                {filteredChannels.length}개 채널
              </span>
            </div>

            {filteredChannels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map((channel) => (
                  <ChannelCard
                    key={channel.channelId}
                    channel={channel}
                    onChannelClick={handleChannelClick}
                    onDelete={(ch) =>
                      handleDeleteClick({ type: 'single', data: ch })
                    }
                    showSelection={isSelectMode}
                    isSelected={selectedChannels.includes(channel.channelId)}
                    onSelect={handleSelectToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">
                  채널이 없습니다
                </div>
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
          onDelete={() =>
            handleDeleteClick({ type: 'bulk', count: selectedChannels.length })
          }
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

      <ChannelGroupModal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setEditingGroup(null);
        }}
        onSave={handleSaveGroup}
        editingGroup={editingGroup}
        availableChannels={channels}
      />
    </div>
  );
};

export default ChannelManagementPage;
