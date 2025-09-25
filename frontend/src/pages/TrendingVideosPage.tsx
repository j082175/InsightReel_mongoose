import React, { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { SearchBar, VideoCard } from '../shared/components';
import { UniversalGrid } from '../widgets';
import { useTrendingStore } from '../features/trending-collection/model/trendingStore';
import { formatViews, formatDate, getDurationLabel, getDocumentId } from '../shared/utils';
import toast from 'react-hot-toast';

interface TrendingVideo {
  _id: string;
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  channelName: string;
  channelUrl?: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  duration: 'SHORT' | 'MID' | 'LONG';
  views: number;
  likes?: number;
  commentsCount?: number;
  uploadDate: string;
  collectionDate: string;
  groupId?: string;
  groupName?: string;
  keywords?: string[];
  mainCategory?: string;
  middleCategory?: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface ApiResponse {
  success: boolean;
  data: TrendingVideo[];
  pagination: PaginationInfo;
}

const TrendingVideosPage: React.FC = () => {
  // TrendingStore 사용
  const trendingStore = useTrendingStore();
  const {
    trendingVideos: videos,
    videosLoading: loading,
    error,
    searchTerm,
    selectedVideos,
    isSelectMode,
    updateSearchTerm,
    toggleSelectMode,
    selectVideo,
    deselectVideo,
    selectAllVideos,
    clearSelection,
    deleteTrendingVideo,
    deleteTrendingVideos,
    fetchTrendingVideos,
  } = trendingStore;

  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  // 필터 상태
  const [filters, setFilters] = useState({
    keyword: '',
    platform: '',
    duration: '',
    groupId: '',
    minViews: '',
    maxViews: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'collectionDate',
    sortOrder: 'desc',
  });

  const [channelGroups, setChannelGroups] = useState<
    Array<{ _id: string; name: string }>
  >([]);

  useEffect(() => {
    fetchTrendingVideos();
    fetchChannelGroups();
  }, [fetchTrendingVideos]);

  const fetchChannelGroups = async () => {
    try {
      const response = await fetch('/api/channel-groups?active=true');
      const result = await response.json();
      if (result.success) {
        setChannelGroups(result.data);
      }
    } catch (error) {
      toast.error('채널 그룹 로딩에 실패했습니다.');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, offset: 0 })); // 필터 변경 시 첫 페이지로
  };

  const handlePageChange = (newOffset: number) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  };

  // TrendingStore 기반 핸들러들
  const handleVideoDelete = async (video: any) => {
    try {
      await deleteTrendingVideo(video);
      toast.success(`트렌딩 비디오 "${video.title}" 삭제 완료`);
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.');
      throw error;
    }
  };

  const handleBulkDelete = async (selectedVideos: any[]) => {
    try {
      const deletedIds = await deleteTrendingVideos(selectedVideos);
      if (deletedIds && deletedIds.length > 0) {
        toast.success(`선택된 ${deletedIds.length}개 트렌딩 비디오가 삭제되었습니다`);
      }
    } catch (error) {
      toast.error(`일괄 삭제 실패: ${error}`);
    }
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    // TrendingStore가 내부적으로 selectedVideos를 관리하므로 필요시에만 추가 로직 구현
    console.log('Selected videos changed:', selectedIds);
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
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">
            수집된 트렌딩 영상
          </h1>
        </div>
        <p className="text-gray-600">
          총 {pagination.total}개의 트렌딩 영상이 수집되었습니다
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 플랫폼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              플랫폼
            </label>
            <select
              value={filters.platform}
              onChange={(e) => handleFilterChange('platform', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
            </select>
          </div>

          {/* 영상 길이 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              영상 길이
            </label>
            <select
              value={filters.duration}
              onChange={(e) => handleFilterChange('duration', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="SHORT">숏폼 (≤60초)</option>
              <option value="MID">미드폼 (61-180초)</option>
              <option value="LONG">롱폼 (&gt;180초)</option>
            </select>
          </div>

          {/* 채널 그룹 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              채널 그룹
            </label>
            <select
              value={filters.groupId}
              onChange={(e) => handleFilterChange('groupId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {channelGroups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* 조회수 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              최소 조회수
            </label>
            <input
              type="number"
              value={filters.minViews}
              onChange={(e) => handleFilterChange('minViews', e.target.value)}
              placeholder="예: 10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              최대 조회수
            </label>
            <input
              type="number"
              value={filters.maxViews}
              onChange={(e) => handleFilterChange('maxViews', e.target.value)}
              placeholder="예: 1000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 날짜 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              수집 시작일
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수집 종료일
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 정렬 옵션 */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">정렬:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="collectionDate">수집일</option>
              <option value="views">조회수</option>
              <option value="uploadDate">업로드일</option>
              <option value="likes">좋아요</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">내림차순</option>
              <option value="asc">오름차순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 영상 목록 - UniversalGrid 사용 */}
      {!loading && videos.length > 0 ? (
        <UniversalGrid<TrendingVideo>
          data={videos}
          renderCard={(video, props) => (
            <VideoCard
              video={video}
              isSelected={props.isSelected}
              onSelect={props.onSelect}
              onDelete={() => props.onDelete?.(video)}
              isSelectMode={props.isSelectMode}
              cardWidth={props.cardWidth}
            />
          )}
          enableSearch={true}
          searchPlaceholder="제목, 채널명, 키워드로 검색..."
          searchFields={['title', 'keywords'] as (keyof TrendingVideo)[]}
          onSearchChange={(searchTerm, filteredData) => {
            console.log('Search changed:', searchTerm, 'Results:', filteredData.length);
          }}
          onSelectionChange={handleSelectionChange}
          onDelete={handleVideoDelete}
          onBulkDelete={handleBulkDelete}
          onCardClick={(video) => {
            // 비디오 클릭 시 외부 링크로 이동
            if (video.url) {
              window.open(video.url, '_blank');
            }
          }}
          initialItemsPerPage={pagination.limit}
          showVirtualScrolling={true}
          gridSize={4}
          className="mb-6"
        />
      ) : null}

      {/* 로딩 중일 때 */}
      {loading && videos.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      )}

      {/* 빈 결과 */}
      {!loading && videos.length === 0 && !error && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500 mb-2">
            수집된 트렌딩 영상이 없습니다
          </p>
          <p className="text-gray-400">
            필터 조건을 변경하거나 새로운 영상을 수집해보세요.
          </p>
        </div>
      )}

      {/* 페이지네이션 */}
      {videos.length > 0 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">
            {pagination.offset + 1} -{' '}
            {Math.min(pagination.offset + pagination.limit, pagination.total)} /{' '}
            {pagination.total}개 표시
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handlePageChange(
                  Math.max(0, pagination.offset - pagination.limit)
                )
              }
              disabled={pagination.offset === 0}
              className="px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>

            <span className="px-3 py-2 text-sm">
              {Math.floor(pagination.offset / pagination.limit) + 1} /{' '}
              {Math.ceil(pagination.total / pagination.limit)}
            </span>

            <button
              onClick={() =>
                handlePageChange(pagination.offset + pagination.limit)
              }
              disabled={!pagination.hasMore}
              className="px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingVideosPage;
