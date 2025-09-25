import React, { useState, useCallback } from 'react';
import { Channel } from '../shared/types';
import {
  ChannelAnalysisModal,
  ChannelGroupModal,
} from '../features/channel-management';
import { UniversalGrid } from '../widgets/UniversalGrid';
import { getDocumentId } from '../shared/utils';
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

const ChannelManagementPage: React.FC = () => {
  // React Query 훅 사용
  const { data: channels = [], isLoading, error: queryError } = useChannels();
  const { data: channelGroups = [], isLoading: isLoadingGroups } = useChannelGroups();

  // React Query Mutations
  const deleteChannelMutation = useDeleteChannel();
  const deleteChannelsMutation = useDeleteChannels();
  const createChannelGroupMutation = useCreateChannelGroup();
  const updateChannelGroupMutation = useUpdateChannelGroup();
  const deleteChannelGroupMutation = useDeleteChannelGroup();

  // Local State
  const [activeTab, setActiveTab] = useState<'groups' | 'channels'>('channels');
  const [channelToAnalyze, setChannelToAnalyze] = useState<Channel | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  const error = queryError?.message || null;

  // Event Handlers
  const handleChannelClick = useCallback((channel: Channel) => {
    console.log('🔍 [ChannelManagementPage] 클릭된 채널:', channel);
    setChannelToAnalyze(channel);
  }, []);

  const handleCreateGroup = useCallback(() => {
    setShowGroupModal(true);
  }, []);

  const handleSaveGroup = useCallback(
    async (groupData: any) => {
      try {
        if (editingGroup) {
          await updateChannelGroupMutation.mutateAsync({
            ...groupData,
            _id: editingGroup._id,
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

  // UniversalGrid용 핸들러들
  const handleChannelDeleteFromGrid = useCallback(
    async (channel: Channel) => {
      try {
        const channelId = channel.id || channel._id;
        if (!channelId) {
          console.error('❌ 채널 ID가 없습니다:', channel);
          return;
        }
        await deleteChannelMutation.mutateAsync(channelId);
      } catch (error) {
        throw error;
      }
    },
    [deleteChannelMutation]
  );

  const handleDeleteBulk = useCallback(
    async (selectedChannels: Channel[]) => {
      try {
        const channelIds = selectedChannels
          .map(ch => ch.id || ch._id)
          .filter(Boolean) as string[];

        if (channelIds.length > 0) {
          await deleteChannelsMutation.mutateAsync(channelIds);
        }
      } catch (error) {
        throw error;
      }
    },
    [deleteChannelsMutation]
  );

  const handleGroupClick = useCallback(
    (group: any) => {
      console.log('그룹 클릭:', group.name);
    },
    []
  );

  const handleGroupDeleteBulk = useCallback(
    async (selectedGroups: any[]) => {
      try {
        const groupIds = selectedGroups
          .map(g => getDocumentId(g))
          .filter(Boolean) as string[];

        for (const groupId of groupIds) {
          await deleteChannelGroupMutation.mutateAsync(groupId);
        }
      } catch (error) {
        throw error;
      }
    },
    [deleteChannelGroupMutation]
  );

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
                  <h1 className="text-3xl font-bold text-gray-900">채널 관리</h1>
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
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    새 그룹
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('channels')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
              <UniversalGrid
                data={channels}
                cardType="channel"
                enableSearch={true}
                searchPlaceholder="채널명, 키워드 검색..."
                searchFields={['name', 'description', 'keywords'] as (keyof Channel)[]}
                onCardClick={handleChannelClick}
                onDelete={handleChannelDeleteFromGrid}
                onBulkDelete={handleDeleteBulk}
                showVirtualScrolling={true}
                containerHeight={600}
                gridSize={3}
              />
            ) : (
              <UniversalGrid
                data={channelGroups}
                cardType="channelGroup"
                enableSearch={true}
                searchPlaceholder="그룹명, 설명 검색..."
                searchFields={['name', 'description', 'keywords'] as (keyof any)[]}
                onCardClick={handleGroupClick}
                onDelete={handleGroupDelete}
                onBulkDelete={handleGroupDeleteBulk}
                showVirtualScrolling={true}
                containerHeight={600}
                gridSize={2}
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