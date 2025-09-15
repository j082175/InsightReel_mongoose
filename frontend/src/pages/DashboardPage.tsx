import React, { useState, useEffect } from 'react';
import { useTrendingStats, useQuotaStatus, useServerStatus } from '../shared/hooks';
import toast from 'react-hot-toast';
import { Video } from '../shared/types';
import { useAppContext } from '../app/providers';
import { VideoModal, VideoOnlyModal } from '../features/video-analysis';
import { DeleteConfirmationModal } from '../shared/ui';
import { ChannelAnalysisModal } from '../features/channel-management';
import { VideoCard, SearchBar } from '../shared/components';
import { VideoManagement } from '../features';

import { PLATFORMS } from '../shared/types/api';
import { formatViews } from '../shared/utils';
import { getVideoId, getViewCount } from '../shared/utils/videoUtils';
import { ActionBar } from '../shared/components';

const DashboardPage: React.FC = () => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<Video | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(1);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  } | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);


  // VideoStore 사용 - 상태와 액션 분리
  const videoStore = VideoManagement.useVideoStore(selectedBatchId);
  const {
    videos,
    loading,
    error,
    filters,
    selectedVideos,
    isSelectMode,
    fetchVideos,
    deleteVideo,
    deleteVideos,
    updateFilters,
    toggleSelectMode,
    selectVideo,
    deselectVideo,
    selectAllVideos,
    clearSelection
  } = videoStore;

  // 기타 API 훅들
  const { data: trendingStats } = useTrendingStats();
  const { data: quotaStatus } = useQuotaStatus();
  const { data: serverStatus } = useServerStatus();

  // 전역 상태에서 배치 정보 가져오기
  const { collectionBatches } = useAppContext();

  // 컴포넌트 마운트 시 비디오 데이터 로드
  useEffect(() => {
    fetchVideos(selectedBatchId);
  }, [fetchVideos, selectedBatchId]);

  // 선택된 비디오 개수 계산
  const selectedCount = selectedVideos.size;
  const totalVideos = videos.length;

  const handleVideoClick = (video: Video) => {
    if (isSelectMode) {
      if (selectedVideos.has(video._id)) {
        deselectVideo(video._id);
      } else {
        selectVideo(video._id);
      }
    } else {
      if (video.platform === PLATFORMS.YOUTUBE) {
        setSelectedVideoForPlay(video);
      } else {
        window.open(video.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleSelectToggle = (videoId: string) => {
    if (selectedVideos.has(videoId)) {
      deselectVideo(videoId);
    } else {
      selectVideo(videoId);
    }
  };

  const handleSelectAll = () => {
    if (selectedCount === totalVideos) {
      clearSelection();
    } else {
      selectAllVideos();
    }
  };

  const handleVideoDelete = async (video: Video) => {
    try {
      await deleteVideo(video._id);
      toast.success(`비디오 "${video.title}" 삭제 완료`);
    } catch (error) {
      toast.error(`비디오 삭제 실패: ${error}`);
      throw error;
    }
  };

  const handleDeleteClick = (item: { type: 'single' | 'bulk'; data?: Video; count?: number }) => {
    setItemToDelete(item);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'single' && itemToDelete.data) {
        await handleVideoDelete(itemToDelete.data);
      } else if (itemToDelete.type === 'bulk') {
        const selectedVideoIds = Array.from(selectedVideos);
        await deleteVideos(selectedVideoIds);
        clearSelection();
        toast.success(`선택된 ${selectedVideoIds.length}개 비디오가 삭제되었습니다`);
      }

      setItemToDelete(null);
    } catch (error) {
      toast.error(`삭제 실패: ${error}`);
    }
  };

  const gridLayouts: Record<number, string> = {
    1: 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
    2: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    3: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  };

  // 통계 계산
  const stats = {
    totalVideos,
    totalViews: videos.reduce((sum, video) => sum + getViewCount(video), 0),
    totalLikes: videos.reduce((sum, video) => sum + (video.likes || 0), 0),
    platformCounts: videos.reduce((acc, video) => {
      acc[video.platform] = (acc[video.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  if (loading && videos.length === 0) {
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
              <h1 className="text-3xl font-bold text-gray-900">영상 대시보드</h1>
              <p className="mt-1 text-sm text-gray-600">
                수집된 영상들을 관리하고 분석하세요
              </p>
            </div>

            {/* 통계 요약 */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalVideos}</div>
                <div className="text-xs text-gray-500">총 영상</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatViews(stats.totalViews)}</div>
                <div className="text-xs text-gray-500">총 조회수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatViews(stats.totalLikes)}</div>
                <div className="text-xs text-gray-500">총 좋아요</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 검색 및 필터 바 */}
        <SearchBar
          searchTerm={filters.keyword}
          onSearchTermChange={(term) => updateFilters({ keyword: term })}
          placeholder="영상, 채널, 키워드 검색..."
          showFilters={true}
        >
          <select
            value={filters.platform}
            onChange={(e) => updateFilters({ platform: e.target.value })}
            className="border-gray-300 rounded-md"
          >
            <option value="">모든 플랫폼</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="TIKTOK">TikTok</option>
            <option value="INSTAGRAM">Instagram</option>
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectMode}
              className={`px-3 py-1 text-sm rounded ${isSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {isSelectMode ? '선택 취소' : '선택 모드'}
            </button>
          </div>
        </SearchBar>

        {/* 결과 정보 */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="text-sm text-gray-500">
            총 {totalVideos}개 영상 (키워드: "{filters.keyword || '없음'}", 플랫폼: {filters.platform || '전체'})
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
            {videos.length > 0 ? (
              <div className={`grid ${gridLayouts[gridSize] || gridLayouts[2]} gap-6`}>
                {videos.map((video) => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    onClick={handleVideoClick}
                    onDelete={handleVideoDelete}
                    onInfoClick={setSelectedVideo}
                    onChannelClick={setChannelToAnalyze}
                    isSelectMode={isSelectMode}
                    isSelected={selectedVideos.has(video._id)}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">영상이 없습니다</div>
                <div className="text-gray-400">비디오를 추가하거나 수집해보세요.</div>
              </div>
            )}
          </div>
        </div>

        {/* 선택 모드 액션 바 */}
        <ActionBar
          isVisible={isSelectMode}
          selectedCount={selectedCount}
          totalCount={totalVideos}
          itemType="개"
          onSelectAll={handleSelectAll}
          onClearSelection={() => {
            toggleSelectMode();
            clearSelection();
          }}
          onDelete={() => handleDeleteClick({ type: 'bulk', count: selectedCount })}
        />
      </div>

      {/* 모달들 */}
      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      <VideoOnlyModal
        video={selectedVideoForPlay}
        onClose={() => setSelectedVideoForPlay(null)}
      />

      <DeleteConfirmationModal
        itemToDelete={itemToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />

      <ChannelAnalysisModal
        channelName={channelToAnalyze}
        onClose={() => setChannelToAnalyze(null)}
      />
    </div>
  );
};

export default DashboardPage;