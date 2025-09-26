import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Video, ExtendedVideo } from '../shared/types';
import { useVideoStore } from '../features/video-management/model/videoStore';
import { VideoModal, VideoOnlyModal } from '../features/video-analysis';
import { DeleteConfirmationModal } from '../shared/ui';
import { VideoListItem } from '../features/video-analysis';
import { ChannelAnalysisModal } from '../features/channel-management';
import { VideoCard, SearchBar } from '../shared/components';
import { UniversalGrid } from '../widgets/UniversalGrid';

import { PLATFORMS } from '../shared/types/api';
import { formatViews } from '../shared/utils';
import { getViewCount } from '../shared/utils/videoUtils';
import { getDocumentId } from '../shared/utils';
import { useSearch, useFilter } from '../shared/hooks';
import { ActionBar } from '../shared/components';

const VideoArchivePage: React.FC = () => {
  // VideoStore를 사용한 통합 상태 관리 (무한 스크롤링 지원)
  const videoStore = useVideoStore('all');
  const {
    videos,
    loading: isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    isSelectMode,
    selectedVideos,
    toggleSelectMode,
    selectVideo,
    deselectVideo,
    selectAllVideos,
    clearSelection,
    deleteVideo,
    deleteVideos
  } = videoStore;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(2);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedVideoForPlay, setSelectedVideoForPlay] =
    useState<Video | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  } | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);

  // ExtendedVideo로 변환된 데이터
  const archivedVideos = useMemo(() => {
    return videos.map((video: Video) => {
      // ExtendedVideo 형식으로 변환
      const extendedVideo: ExtendedVideo = {
        ...video,
        aspectRatio: video.platform === PLATFORMS.YOUTUBE ? '16:9' : '9:16',
        archivedAt: video.collectionTime || video.processedAt || new Date().toISOString(),
        tags: video.keywords || [],
        category: video.mainCategory || '미분류',
        notes: video.analysisContent || '',
        daysAgo: Math.floor((Date.now() - new Date(video.uploadDate).getTime()) / (1000 * 60 * 60 * 24))
      };
      return extendedVideo;
    });
  }, [videos]);

  // Search and filter hooks
  const searchResult = useSearch(archivedVideos, {
    searchFields: ['title', 'keywords'],
    defaultSearchTerm: '',
  });

  // Extract all available tags and categories for filter options (memoized)
  const allTags = useMemo(
    () =>
      Array.from(new Set(archivedVideos.flatMap((video) => video.tags || []))),
    [archivedVideos]
  );
  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(archivedVideos.map((video) => video.category || '미분류'))
      ),
    [archivedVideos]
  );

  const filterResult = useFilter(searchResult.filteredData, {
    defaultFilters: {
      selectedTag: 'All',
      selectedCategory: 'All',
    },
    filterFunctions: {
      selectedTag: (item: ExtendedVideo, value: string) => {
        if (value === 'All') return true;
        return (item.tags || []).includes(value);
      },
      selectedCategory: (item: ExtendedVideo, value: string) => {
        if (value === 'All') return true;
        return item.category === value;
      },
    },
  });

  // Final filtered videos combining search and filter results
  const filteredVideos = filterResult.filteredData;



  // URL 유효성 검증 함수
  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // 플랫폼별 기본 URL 생성
  const generateFallbackUrl = (platform: string, channelName?: string) => {
    const normalizedPlatform = platform.toUpperCase();
    switch (normalizedPlatform) {
      case 'YOUTUBE':
        return channelName
          ? `https://www.youtube.com/@${channelName}`
          : 'https://www.youtube.com';
      case 'INSTAGRAM':
        return channelName
          ? `https://www.instagram.com/${channelName}`
          : 'https://www.instagram.com';
      case 'TIKTOK':
        return channelName
          ? `https://www.tiktok.com/@${channelName}`
          : 'https://www.tiktok.com';
      default:
        return '#';
    }
  };


  const handleSelectToggle = (videoId: string) => {
    console.log('🟢 VideoArchivePage.handleSelectToggle:', {
      videoId,
      currentlySelected: selectedVideos.has(videoId),
      selectedCount: selectedVideos.size,
      allSelected: Array.from(selectedVideos)
    });

    if (selectedVideos.has(videoId)) {
      console.log('🔴 선택 해제:', videoId);
      deselectVideo(videoId);
    } else {
      console.log('🟢 선택 추가:', videoId);
      selectVideo(videoId);
    }
  };

  const handleSelectAll = () => {
    selectAllVideos();
  };

  const handleDeleteClick = (item: {
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  }) => {
    setItemToDelete(item);
  };

  const handleVideoDelete = (video: Video) => {
    setItemToDelete({ type: 'single', data: video });
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete?.type === 'single' && itemToDelete.data) {
      await deleteVideo(itemToDelete.data._id);
    } else if (itemToDelete?.type === 'bulk') {
      const selectedIds = Array.from(selectedVideos);
      await deleteVideos(selectedIds);
      clearSelection();
      toggleSelectMode();
    }
    setItemToDelete(null);
  };

  const gridLayouts: Record<number, string> = {
    1: 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
    2: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    3: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };

  const ViewControls: React.FC = () => (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {viewMode === 'grid' && (
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-500">크기:</label>
          <select
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            className="text-sm border-gray-300 rounded"
          >
            <option value={1}>작게</option>
            <option value={2}>중간</option>
            <option value={3}>크게</option>
          </select>
        </div>
      )}

      <button
        onClick={toggleSelectMode}
        className={`px-3 py-1 text-sm rounded ${isSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
      >
        {isSelectMode ? '선택 취소' : '선택 모드'}
      </button>
    </div>
  );

  const TagModal: React.FC = () => {
    if (!showTagModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">태그 관리</h2>
            <button
              onClick={() => setShowTagModal(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              태그 관리 기능을 구현 중입니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={() => setShowTagModal(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📁 영상 아카이브
        </h1>
        <p className="text-gray-600">
          저장된 영상들을 태그와 카테고리로 관리하세요
        </p>
      </div>

      {/* 통계 카드들 */}
      <div
        className="grid gap-6 mb-8"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
      >
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">보관된 영상</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {archivedVideos.length}
          </p>
          <p className="mt-1 text-sm text-green-600">+8개 이번 주</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">태그 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {allTags.length}
          </p>
          <p className="mt-1 text-sm text-gray-600">분류 체계</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">카테고리 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {allCategories.length}
          </p>
          <p className="mt-1 text-sm text-gray-600">주제별 분류</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">총 조회수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatViews(
              archivedVideos.reduce((sum, v) => sum + getViewCount(v), 0)
            )}
          </p>
          <p className="mt-1 text-sm text-gray-600">보관된 콘텐츠</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white rounded-lg shadow">
        {/* 검색 및 필터 */}
        <SearchBar
          searchTerm={searchResult.searchTerm}
          onSearchTermChange={searchResult.setSearchTerm}
          placeholder="영상, 채널, 태그 검색..."
          showFilters={true}
        >
          <select
            value={filterResult.filters.selectedCategory || 'All'}
            onChange={(e) =>
              filterResult.updateFilter('selectedCategory', e.target.value)
            }
            className="border-gray-300 rounded-md"
          >
            <option value="All">모든 카테고리</option>
            {allCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={filterResult.filters.selectedTag || 'All'}
            onChange={(e) =>
              filterResult.updateFilter('selectedTag', e.target.value)
            }
            className="border-gray-300 rounded-md"
          >
            <option value="All">모든 태그</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowTagModal(true)}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            태그 관리
          </button>
        </SearchBar>

        {/* 컨트롤 및 통계 */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="text-sm text-gray-500">
              총 {filteredVideos.length}개 영상
              {searchResult.searchTerm && (
                <span className="ml-2 text-blue-600">
                  (검색: "{searchResult.searchTerm}")
                </span>
              )}
              {filterResult.activeFilterCount > 0 && (
                <span className="ml-2 text-green-600">
                  ({filterResult.activeFilterCount}개 필터 적용)
                </span>
              )}
            </div>

            <ViewControls />
          </div>
        </div>

        {/* 영상 그리드/리스트 */}
        <div className="p-6">
          {(() => {
            console.log('🚦 VideoArchivePage 렌더링 조건:', {
              isLoading,
              error: !!error,
              videosLength: videos.length,
              filteredVideosLength: filteredVideos.length,
              isSelectMode,
              selectedVideos: selectedVideos.size
            });
          })()}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">영상 데이터를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p className="text-lg">⚠️</p>
              <p className="mt-2">영상 데이터를 불러오는데 실패했습니다.</p>
              <p className="text-sm text-gray-500 mt-1">
                Mock 데이터를 사용합니다.
              </p>
            </div>
          ) : filteredVideos.length > 0 ? (
            <UniversalGrid
              data={filteredVideos}
              renderCard={(video, cardProps) => (
                <VideoCard
                  video={video}
                  onVideoPlay={(video) => setSelectedVideoForPlay(video)}
                  onInfoClick={(video) =>
                    !cardProps.isSelectMode && setSelectedVideo(video)
                  }
                  onChannelClick={setChannelToAnalyze}
                  isSelectMode={cardProps.isSelectMode}
                  isSelected={cardProps.isSelected}
                  onSelect={cardProps.onSelect}
                  onDelete={handleVideoDelete}
                  showArchiveInfo={true}
                />
              )}
              gridSize={gridSize}
              hasMore={hasMore}
              onLoadMore={loadMore}
              isLoading={isLoadingMore}
              showVirtualScrolling={true}
              useWindowScroll={true}
              // 🎯 VideoStore의 선택 상태를 UniversalGrid에 전달
              selectedItems={selectedVideos}
              isSelectMode={isSelectMode}
              onSelectToggle={handleSelectToggle}
              onSelectModeToggle={toggleSelectMode}
              onSelectionChange={(selectedIds) => {
                console.log('Selection changed:', selectedIds);
              }}
              onDelete={async (video) => {
                await deleteVideo(video._id);
              }}
              onBulkDelete={async (videos) => {
                await deleteVideos(videos.map(v => v._id));
              }}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">📂</p>
              <p className="mt-2">조건에 맞는 보관 영상이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 선택 모드 액션 바 */}
      <ActionBar
        isVisible={isSelectMode}
        selectedCount={selectedVideos.size}
        totalCount={filteredVideos.length}
        itemType="개"
        onSelectAll={handleSelectAll}
        onClearSelection={() => {
          toggleSelectMode();
        }}
        onDelete={() =>
          handleDeleteClick({ type: 'bulk', count: selectedVideos.size })
        }
        additionalActions={
          <>
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
              태그 편집
            </button>
            <button className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              내보내기
            </button>
          </>
        }
      />

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

      <TagModal />
    </main>
  );
};

export default VideoArchivePage;
