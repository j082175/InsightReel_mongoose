import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar,
  Eye,
  Play,
  ExternalLink,
  Clock,
  TrendingUp,
  Youtube,
  Instagram,
  Video,
  BarChart3
} from 'lucide-react';

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
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
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
    sortOrder: 'desc'
  });

  const [channelGroups, setChannelGroups] = useState<Array<{_id: string, name: string}>>([]);

  useEffect(() => {
    fetchChannelGroups();
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [filters, pagination.offset]);

  const fetchChannelGroups = async () => {
    try {
      const response = await fetch('/api/channel-groups?active=true');
      const result = await response.json();
      if (result.success) {
        setChannelGroups(result.data);
      }
    } catch (error) {
      console.error('채널 그룹 조회 실패:', error);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/trending/videos?${params}`);
      const result: ApiResponse = await response.json();

      if (result.success) {
        setVideos(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          hasMore: result.pagination.hasMore
        }));
      } else {
        setError('영상 데이터 조회에 실패했습니다.');
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
      console.error('영상 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 })); // 필터 변경 시 첫 페이지로
  };

  const handlePageChange = (newOffset: number) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getDurationLabel = (duration: string): string => {
    switch (duration) {
      case 'SHORT': return '숏폼';
      case 'MID': return '미드폼';
      case 'LONG': return '롱폼';
      default: return duration;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'YOUTUBE': return <Youtube className="w-4 h-4 text-red-500" />;
      case 'INSTAGRAM': return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'TIKTOK': return <Video className="w-4 h-4 text-black" />;
      default: return <Play className="w-4 h-4" />;
    }
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
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">수집된 트렌딩 영상</h1>
        </div>
        <p className="text-gray-600">
          총 {pagination.total}개의 트렌딩 영상이 수집되었습니다
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 검색 */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              검색 (제목, 채널명, 키워드)
            </label>
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 플랫폼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">플랫폼</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">영상 길이</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">채널 그룹</label>
            <select
              value={filters.groupId}
              onChange={(e) => handleFilterChange('groupId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {channelGroups.map(group => (
                <option key={group._id} value={group._id}>{group.name}</option>
              ))}
            </select>
          </div>

          {/* 조회수 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">최소 조회수</label>
            <input
              type="number"
              value={filters.minViews}
              onChange={(e) => handleFilterChange('minViews', e.target.value)}
              placeholder="예: 10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">최대 조회수</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">수집 종료일</label>
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

      {/* 영상 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div key={video._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            {/* 썸네일 */}
            <div className="relative">
              {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                  <Play className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {/* 플랫폼 아이콘 */}
              <div className="absolute top-3 left-3 bg-black bg-opacity-70 rounded-full p-2">
                {getPlatformIcon(video.platform)}
              </div>
              
              {/* 영상 길이 */}
              <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {getDurationLabel(video.duration)}
              </div>
              
              {/* 조회수 */}
              <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatNumber(video.views)}
              </div>
            </div>

            {/* 콘텐츠 */}
            <div className="p-4">
              {/* 제목 */}
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 leading-tight">
                {video.title}
              </h3>

              {/* 채널 정보 */}
              <div className="text-sm text-gray-600 mb-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{video.channelName}</span>
                  {video.groupName && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {video.groupName}
                    </span>
                  )}
                </div>
              </div>

              {/* 통계 */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-4">
                  {video.likes && (
                    <span className="flex items-center gap-1">
                      <span>❤️</span>
                      {formatNumber(video.likes)}
                    </span>
                  )}
                  {video.commentsCount && (
                    <span className="flex items-center gap-1">
                      <span>💬</span>
                      {formatNumber(video.commentsCount)}
                    </span>
                  )}
                </div>
              </div>

              {/* 카테고리 */}
              {video.mainCategory && (
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                    {video.mainCategory}
                  </span>
                  {video.middleCategory && (
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      {video.middleCategory}
                    </span>
                  )}
                </div>
              )}

              {/* 키워드 */}
              {video.keywords && video.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {video.keywords.slice(0, 3).map((keyword, index) => (
                    <span key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                      #{keyword}
                    </span>
                  ))}
                  {video.keywords.length > 3 && (
                    <span className="text-gray-500 text-xs">+{video.keywords.length - 3}</span>
                  )}
                </div>
              )}

              {/* 날짜 정보 */}
              <div className="text-xs text-gray-400 mb-3">
                <div>업로드: {formatDate(video.uploadDate)}</div>
                <div>수집: {formatDate(video.collectionDate)}</div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-500 text-white text-sm py-2 px-3 rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  영상 보기
                </a>
                {video.channelUrl && (
                  <a
                    href={video.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-500 text-white text-sm py-2 px-3 rounded hover:bg-gray-600 transition-colors"
                    title="채널 보기"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

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
          <p className="text-xl text-gray-500 mb-2">수집된 트렌딩 영상이 없습니다</p>
          <p className="text-gray-400">필터 조건을 변경하거나 새로운 영상을 수집해보세요.</p>
        </div>
      )}

      {/* 페이지네이션 */}
      {videos.length > 0 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">
            {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} / {pagination.total}개 표시
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
              disabled={pagination.offset === 0}
              className="px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            
            <span className="px-3 py-2 text-sm">
              {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.offset + pagination.limit)}
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