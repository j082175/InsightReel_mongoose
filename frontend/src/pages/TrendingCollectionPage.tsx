import React, { useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Settings,
  TrendingUp,
  Users,
  Calendar,
} from 'lucide-react';
import { SearchBar, ActionBar, VideoCard } from '../shared/components';
import { BulkCollectionModal } from '../features/trending-collection';
import { DeleteConfirmationModal } from '../shared/ui';
import { formatDate, formatViews, getDocumentId, isItemSelected } from '../shared/utils';
import toast from 'react-hot-toast';
import { useTrendingStore } from '../features/trending-collection/model/trendingStore';
import { Video } from '../shared/types';
import { PLATFORMS } from '../shared/types/api';

const TrendingCollectionPage: React.FC = () => {
  // TrendingStore 사용
  const trendingStore = useTrendingStore();
  const {
    collectionTarget,
    filters,
    isCollecting,
    collectionProgress,
    channelGroups,
    channels,
    trendingVideos,
    groupsLoading,
    channelsLoading,
    videosLoading,
    error,
    groupsError,
    searchTerm,
    selectedVideos,
    isSelectMode,
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
  } = trendingStore;

  // Local State
  const [showCollectionModal, setShowCollectionModal] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  } | null>(null);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchChannelGroups();
    fetchChannels();
    fetchTrendingVideos();
  }, [fetchChannelGroups, fetchChannels, fetchTrendingVideos]);

  // Event Handlers

  const handleSelectAll = useCallback(() => {
    if (selectedVideos.size === (trendingVideos?.length || 0)) {
      clearSelection();
    } else {
      selectAllVideos();
    }
  }, [
    selectedVideos.size,
    trendingVideos?.length || 0,
    clearSelection,
    selectAllVideos,
  ]);

  const handleVideoDelete = useCallback(
    async (video: Video) => {
      try {
        const videoId = getDocumentId(video);
        if (!videoId) {
          console.error('❌ 비디오 ID가 없습니다:', video);
          return;
        }

        const response = await fetch(`/api/trending/videos/${videoId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 목록에서 제거 (실제로는 다시 불러오기)
        await fetchTrendingVideos();
        toast.success(`트렌딩 비디오 "${video.title}" 삭제 완료`);
      } catch (error) {
        toast.error(`트렌딩 비디오 삭제 실패: ${error}`);
        throw error;
      }
    },
    [fetchTrendingVideos]
  );

  const handleDeleteClick = useCallback(
    (item: { type: 'single' | 'bulk'; data?: Video; count?: number }) => {
      setItemToDelete(item);
    },
    []
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'single' && itemToDelete.data) {
        await handleVideoDelete(itemToDelete.data);
      } else if (itemToDelete.type === 'bulk') {
        // 선택된 비디오들 삭제
        let successCount = 0;
        for (const videoId of selectedVideos) {
          const video = trendingVideos.find((v) => v.id === videoId);
          if (video) {
            try {
              await handleVideoDelete(video);
              successCount++;
            } catch (error) {
              // 개별 비디오 삭제 실패는 handleVideoDelete에서 이미 알림 처리됨
            }
          }
        }
        clearSelection();
        if (successCount > 0) {
          toast.success(
            `선택된 ${successCount}개 트렌딩 비디오가 삭제되었습니다`
          );
        }
      }

      setItemToDelete(null);
    } catch (error) {
      toast.error(`삭제 실패: ${error}`);
    }
  }, [
    itemToDelete,
    handleVideoDelete,
    selectedVideos,
    trendingVideos,
    clearSelection,
  ]);

  const handleStartCollection = useCallback(async () => {
    if (
      collectionTarget.type === 'groups' &&
      collectionTarget.selectedGroups.length === 0
    ) {
      alert('수집할 채널 그룹을 선택해주세요.');
      return;
    }
    if (
      collectionTarget.type === 'channels' &&
      collectionTarget.selectedChannels.length === 0
    ) {
      alert('수집할 채널을 선택해주세요.');
      return;
    }

    await startCollection();
  }, [collectionTarget, startCollection]);

  // 통계 계산
  const stats = {
    totalVideos: trendingVideos?.length || 0,
    totalViews: (trendingVideos || []).reduce(
      (sum, video) => sum + (video.views || 0),
      0
    ),
    selectedGroups: collectionTarget.selectedGroups.length,
    selectedChannels: collectionTarget.selectedChannels.length,
    platformCounts: (trendingVideos || []).reduce(
      (acc, video) => {
        acc[video.platform] = (acc[video.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  if (
    (groupsLoading || channelsLoading) &&
    (channelGroups?.length || 0) === 0 &&
    (channels?.length || 0) === 0
  ) {
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
              <h1 className="text-3xl font-bold text-gray-900">트렌딩 수집</h1>
              <p className="mt-1 text-sm text-gray-600">
                채널 그룹별 트렌딩 영상을 수집하고 관리하세요
              </p>
            </div>

            {/* 통계 요약 */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalVideos}
                </div>
                <div className="text-xs text-gray-500">총 영상</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatViews(stats.totalViews)}
                </div>
                <div className="text-xs text-gray-500">총 조회수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {collectionTarget.type === 'groups'
                    ? stats.selectedGroups
                    : stats.selectedChannels}
                </div>
                <div className="text-xs text-gray-500">
                  선택된 {collectionTarget.type === 'groups' ? '그룹' : '채널'}
                </div>
              </div>
            </div>
          </div>

          {/* 수집 진행 상태 */}
          {(isCollecting || collectionProgress) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                {isCollecting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                ) : null}
                <span className="text-blue-800 text-sm font-medium">
                  {collectionProgress}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">수집 설정</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCollectionModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                고급 설정
              </button>
              <button
                onClick={isCollecting ? stopCollection : handleStartCollection}
                disabled={
                  !collectionTarget.selectedGroups.length &&
                  !collectionTarget.selectedChannels.length
                }
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isCollecting
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {isCollecting ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    수집 중단
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    수집 시작
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 타겟 타입 선택 */}
          <div className="mb-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="targetType"
                  value="groups"
                  checked={collectionTarget.type === 'groups'}
                  onChange={(e) =>
                    handleTargetTypeChange(e.target.value as 'groups')
                  }
                  className="mr-2"
                />
                <Users className="w-4 h-4 mr-1" />
                채널 그룹별 수집
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="targetType"
                  value="channels"
                  checked={collectionTarget.type === 'channels'}
                  onChange={(e) =>
                    handleTargetTypeChange(e.target.value as 'channels')
                  }
                  className="mr-2"
                />
                <TrendingUp className="w-4 h-4 mr-1" />
                개별 채널 수집
              </label>
            </div>
          </div>

          {/* 선택 목록 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {collectionTarget.type === 'groups' ? (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  채널 그룹 ({channelGroups?.length || 0})
                </h3>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {channelGroups?.map((group) => (
                    <label
                      key={getDocumentId(group)}
                      className="flex items-center p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={collectionTarget.selectedGroups.includes(
                          group._id
                        )}
                        onChange={() => handleGroupSelection(group._id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: group.color }}
                          ></div>
                          <span className="font-medium text-sm">
                            {group.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {group.channels.length}개 채널 •{' '}
                          {group.keywords.join(', ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  채널 ({channels?.length || 0})
                </h3>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {channels?.map((channel) => (
                    <label
                      key={channel.channelId}
                      className="flex items-center p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={collectionTarget.selectedChannels.includes(
                          channel.channelId
                        )}
                        onChange={() =>
                          handleChannelSelection(channel.channelId)
                        }
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {channel.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatViews(channel.subscribers || 0)} 구독자 •{' '}
                          {channel.platform}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 수집 조건 */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">수집 조건</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">최근</span>
                  <select
                    value={filters.daysBack}
                    onChange={(e) =>
                      updateFilters({ daysBack: Number(e.target.value) })
                    }
                    className="border-gray-300 rounded-md text-sm"
                  >
                    <option value={3}>3일</option>
                    <option value={7}>7일</option>
                    <option value={14}>14일</option>
                    <option value={30}>30일</option>
                  </select>
                  <span className="text-sm">동안</span>
                </div>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">최소</span>
                  <input
                    type="number"
                    value={filters.minViews}
                    onChange={(e) =>
                      updateFilters({ minViews: Number(e.target.value) })
                    }
                    className="border-gray-300 rounded-md text-sm w-20"
                    min="0"
                  />
                  <span className="text-sm">회 이상 조회</span>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.includeShorts}
                      onChange={(e) =>
                        updateFilters({ includeShorts: e.target.checked })
                      }
                      className="mr-2"
                    />
                    숏폼
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.includeMidform}
                      onChange={(e) =>
                        updateFilters({ includeMidform: e.target.checked })
                      }
                      className="mr-2"
                    />
                    미드폼
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.includeLongForm}
                      onChange={(e) =>
                        updateFilters({ includeLongForm: e.target.checked })
                      }
                      className="mr-2"
                    />
                    롱폼
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 바 */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchTermChange={updateSearchTerm}
          placeholder="트렌딩 영상 검색..."
          showFilters={true}
        >
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
            총 {trendingVideos?.length || 0}개 트렌딩 영상 (키워드: "
            {searchTerm || '없음'}")
          </div>
        </div>

        {/* 에러 표시 */}
        {(error || groupsError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error || groupsError}</div>
          </div>
        )}

        {/* 트렌딩 영상 목록 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {videosLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">
                  트렌딩 영상을 불러오는 중...
                </p>
              </div>
            ) : (trendingVideos?.length || 0) > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6">
                {trendingVideos?.map((video) => {
                  const videoId = getDocumentId(video);
                  if (!videoId) return null;

                  return (
                    <VideoCard
                      key={videoId}
                      video={video}
                      onDelete={handleVideoDelete}
                      isSelected={isItemSelected(selectedVideos, video)}
                      isSelectMode={isSelectMode}
                      onSelect={(id) => {
                        if (isItemSelected(selectedVideos, { _id: id })) {
                          deselectVideo(id);
                        } else {
                          selectVideo(id);
                        }
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  트렌딩 영상이 없습니다
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  수집을 시작해서 트렌딩 영상을 가져오세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 선택 모드 액션 바 */}
        <ActionBar
          isVisible={isSelectMode}
          selectedCount={selectedVideos.size}
          totalCount={trendingVideos?.length || 0}
          itemType="개"
          onSelectAll={handleSelectAll}
          onClearSelection={() => {
            toggleSelectMode();
            clearSelection();
          }}
          onDelete={() =>
            handleDeleteClick({ type: 'bulk', count: selectedVideos.size })
          }
        />
      </div>

      {/* 모달들 */}
      <BulkCollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        filters={filters}
        onUpdateFilters={updateFilters}
        onResetFilters={resetFilters}
      />


      <DeleteConfirmationModal
        itemToDelete={itemToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

export default TrendingCollectionPage;
