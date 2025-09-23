import React, { useState, useCallback } from 'react';
import { Channel } from '../shared/types';
import { SearchBar } from '../shared/components';
import {
  ChannelCard,
  ChannelAnalysisModal,
  ChannelGroupModal,
  ChannelGroupCard,
  IndividualChannelsTab,
  ChannelGroupsTab,
} from '../features/channel-management';
import { DeleteConfirmationModal } from '../shared/ui';
import { formatViews, getDocumentId } from '../shared/utils';
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

  // 디버깅: 데이터 상태 확인
  console.log('🔍 [ChannelManagementPage] 디버그 정보:', {
    channelsCount: channels.length,
    channels: channels,
    isLoading,
    queryError,
    firstChannel: channels[0]
  });

  // React Query Mutations
  const deleteChannelMutation = useDeleteChannel();
  const deleteChannelsMutation = useDeleteChannels();
  const createChannelGroupMutation = useCreateChannelGroup();
  const updateChannelGroupMutation = useUpdateChannelGroup();
  const deleteChannelGroupMutation = useDeleteChannelGroup();

  // Custom Hooks (필터링 및 선택 로직)
  const filteredChannels = useFilteredChannels(channels);

  // 디버깅: 필터링 결과 확인
  console.log('🔍 [ChannelManagementPage] 필터링 결과:', {
    originalCount: channels.length,
    filteredCount: filteredChannels.length,
    filteredChannels: filteredChannels
  });
  const {
    selectedChannels,
    toggleChannelSelection,
    selectAllChannels,
    clearSelection,
  } = useChannelSelection();
  const { filters, updateFilters, resetFilters } = useChannelFilters();

  const error = queryError?.message || null;

  // Local State
  const [activeTab, setActiveTab] = useState<'groups' | 'channels'>('channels');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<Channel | null>(null);
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
        // 채널 상세 분석 모달 열기 (채널 객체 전달)
        setChannelToAnalyze(channel);
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
    setChannelToAnalyze(channel);
  }, []);

  const handleChannelDelete = useCallback(
    async (channel: Channel) => {
      try {
        await deleteChannelMutation.mutateAsync(channel._id || channel.channelId);
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
            return channel?.id || channel?.id;
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

  const handleAddChannel = useCallback(() => {
    // TODO: 채널 추가 로직 구현
    console.log('채널 추가 기능 구현 필요');
  }, []);

  const handleSaveGroup = useCallback(
    async (groupData: any) => {
      try {
        if (editingGroup) {
          await updateChannelGroupMutation.mutateAsync({
            id: editingGroup.id,
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
        const groupId = getDocumentId(group);
      if (!groupId) {
        console.error('❌ 그룹 ID가 없습니다:', group);
        return;
      }
      await deleteChannelGroupMutation.mutateAsync(groupId);
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
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('channels')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'channels'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📺 개별 채널
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                  {channels.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'groups'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📁 채널 그룹
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                  {channelGroups.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {activeTab === 'channels' ? (
              <IndividualChannelsTab
                channels={channels}
                filteredChannels={filteredChannels}
                isLoading={isLoading}
                isSelectMode={isSelectMode}
                selectedChannels={selectedChannels}
                searchTerm={filters.searchTerm}
                filters={filters}
                stats={stats}
                onSearchChange={(term) => updateFilters({ searchTerm: term })}
                onFilterChange={updateFilters}
                onToggleSelectMode={toggleSelectMode}
                onSelectAll={handleSelectAll}
                onClearSelection={clearSelection}
                onChannelClick={handleChannelClick}
                onChannelSelect={handleSelectToggle}
                onChannelDelete={handleDeleteClick}
                onAddChannel={handleAddChannel}
              />
            ) : (
              <ChannelGroupsTab
                groups={channelGroups}
                isLoading={isLoadingGroups}
                onCreateGroup={handleCreateGroup}
                onEditGroup={handleGroupEdit}
                onDeleteGroup={handleGroupDelete}
                onCollectGroup={(group) => {
                  console.log('트렌딩 수집:', group.name);
                  // TODO: 트렌딩 수집 로직 구현
                }}
              />
            )}
          </div>
        </div>

      </div>

      {/* 모달들 */}
      <ChannelAnalysisModal
        channel={channelToAnalyze}
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
