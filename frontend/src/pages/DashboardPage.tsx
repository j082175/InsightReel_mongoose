import React, { useState, useMemo } from 'react';
import { useVideos, useTrendingStats, useQuotaStatus, useServerStatus, useCollectTrending } from '../hooks/useApi';
import { Video, FilterState } from '../types';
import { useAppContext } from '../App';
import VideoModal from '../components/VideoModal';
import VideoOnlyModal from '../components/VideoOnlyModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ChannelAnalysisModal from '../components/ChannelAnalysisModal';
import VideoCard from '../components/VideoCard';

import { PLATFORMS } from '../types/api';

const DashboardPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({ 
    days: '7', 
    views: '100000', 
    platform: 'All' 
  });
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBatchForModal, setSelectedBatchForModal] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<Video | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(1);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  } | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);

  // API 훅들
  const { data: apiVideos = [] } = useVideos();
  const { data: trendingStats } = useTrendingStats();
  const { data: quotaStatus } = useQuotaStatus();
  const { data: serverStatus } = useServerStatus();
  const collectTrendingMutation = useCollectTrending();
  
  // 전역 상태에서 수집된 영상과 배치 정보 가져오기
  const { collectedVideos, collectionBatches } = useAppContext();

  // Mock 데이터 - 새로운 인터페이스 형식
  const mockVideos: Video[] = [
    { 
      uploadDate: '2024-01-01T10:00:00',
      platform: 'YOUTUBE',
      channelName: '개발왕 김코딩',
      mainCategory: '개발/기술',
      keywords: ['React', 'JavaScript', '웹개발'],
      likes: 2800,
      commentsCount: 45,
      url: 'https://www.youtube.com/watch?v=react2025',
      thumbnailUrl: 'https://placehold.co/600x400/3B82F6/FFFFFF?text=React+2025',
      id: '1',
      title: '초보자를 위한 React 2025년 최신 가이드 (롱폼)',
      views: 150000,
      daysAgo: 2,
      channelAvatarUrl: 'https://placehold.co/100x100/3B82F6/FFFFFF?text=K',
      isTrending: true,
      aspectRatio: '16:9',
      createdAt: '2024-01-01T10:00:00'
    },
    { 
      uploadDate: '2024-01-02T14:30:00',
      platform: 'TIKTOK',
      channelName: '요리하는 남자',
      mainCategory: '라이프스타일',
      keywords: ['요리', '브런치', '레시피'],
      likes: 8900,
      commentsCount: 234,
      url: 'https://www.tiktok.com/@brunch-master',
      thumbnailUrl: 'https://placehold.co/400x600/F43F5E/FFFFFF?text=Brunch',
      id: '2',
      title: '10분 만에 만드는 감동 브런치 (숏폼)',
      views: 450000,
      daysAgo: 1,
      channelAvatarUrl: 'https://placehold.co/100x100/F43F5E/FFFFFF?text=C',
      isTrending: false,
      aspectRatio: '9:16',
      createdAt: '2024-01-02T14:30:00'
    },
    { 
      uploadDate: '2024-01-03T09:15:00',
      platform: 'INSTAGRAM',
      channelName: '카페찾아 삼만리',
      mainCategory: '여행/관광',
      keywords: ['제주도', '카페', '여행'],
      likes: 1200,
      commentsCount: 67,
      url: 'https://www.instagram.com/jejucafe',
      thumbnailUrl: 'https://placehold.co/400x600/8B5CF6/FFFFFF?text=Jeju+Cafe',
      id: '3',
      title: '제주도 숨겨진 카페 TOP 10 (숏폼)',
      views: 78000,
      daysAgo: 0,
      channelAvatarUrl: 'https://placehold.co/100x100/8B5CF6/FFFFFF?text=T',
      isTrending: false,
      aspectRatio: '9:16',
      createdAt: '2024-01-03T09:15:00'
    }
  ];

  // 모든 영상 데이터 통합
  const allVideos = useMemo(() => {
    const combined = [...(apiVideos || []), ...collectedVideos, ...mockVideos];
    
    // 중복 제거 (ID 기준)
    const uniqueVideos = combined.filter((video, index, arr) => 
      arr.findIndex(v => v.id === video.id) === index
    );
    
    return uniqueVideos;
  }, [apiVideos, collectedVideos]);

  // 필터링된 영상들
  const filteredVideos = useMemo(() => {
    return allVideos.filter(video => {
      // 플랫폼 필터
      if (filters.platform !== 'All' && video.platform !== filters.platform) {
        return false;
      }
      
      // 조회수 필터  
      const minViews = parseInt(filters.views);
      if ((video.views || 0) < minViews) {
        return false;
      }
      
      // 날짜 필터
      const maxDays = parseInt(filters.days);
      if ((video.daysAgo || 0) > maxDays) {
        return false;
      }
      
      // 검색어 필터
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          (video.title || '').toLowerCase().includes(searchLower) ||
          (video.channelName || '').toLowerCase().includes(searchLower) ||
          (Array.isArray(video.keywords) ? video.keywords : []).some(k => k.toLowerCase().includes(searchLower))
        );
      }
      
      // 배치 필터
      if (selectedBatchId !== 'all') {
        return video.batchIds?.includes(selectedBatchId) || false;
      }
      
      return true;
    });
  }, [allVideos, filters, searchTerm, selectedBatchId]);

  // 통계 계산
  const stats = useMemo(() => {
    const totalVideos = filteredVideos.length;
    const totalViews = filteredVideos.reduce((sum, video) => sum + (video.views || 0), 0);
    const totalLikes = filteredVideos.reduce((sum, video) => sum + (video.likes || 0), 0);
    const initialCounts: Record<string, number> = {};
    const platformCounts = filteredVideos.reduce((acc, video) => {
      acc[video.platform] = (acc[video.platform] || 0) + 1;
      return acc;
    }, initialCounts);

    return {
      totalVideos,
      totalViews,
      totalLikes,
      platformCounts
    };
  }, [filteredVideos]);

  // 유틸리티 함수들
  const formatViews = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + '천';
    return num.toLocaleString();
  };

  const handleVideoClick = (video: Video) => {
    if (isSelectMode) {
      handleSelectToggle(Number(video.id));
    } else {
      if (video.platform === PLATFORMS.YOUTUBE) {
        setSelectedVideoForPlay(video);
      } else {
        window.open(video.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleSelectToggle = (videoId: number) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(filteredVideos.map(v => Number(v.id))));
    }
  };

  const handleDeleteClick = (item: { type: 'single' | 'bulk'; data?: Video; count?: number }) => {
    setItemToDelete(item);
  };

  const handleDeleteConfirm = () => {
    // 실제 삭제 로직은 여기에 구현
    console.log('삭제 확인:', itemToDelete);
    setItemToDelete(null);
    setSelectedVideos(new Set());
    setIsSelectMode(false);
  };

  const gridLayouts: Record<number, string> = { 
    1: 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8', 
    2: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', 
    3: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 대시보드</h1>
              <p className="text-gray-600">수집된 영상들을 분석하고 관리하세요</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => collectTrendingMutation.mutate()}
                disabled={collectTrendingMutation.isLoading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {collectTrendingMutation.isLoading ? '수집 중...' : '트렌딩 수집'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">총 영상</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalVideos}</p>
            <p className="mt-1 text-sm text-green-600">필터링된 결과</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">총 조회수</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatViews(stats.totalViews)}</p>
            <p className="mt-1 text-sm text-gray-600">누적 조회수</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">총 좋아요</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatViews(stats.totalLikes)}</p>
            <p className="mt-1 text-sm text-gray-600">누적 좋아요</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">플랫폼</h3>
            <div className="mt-2 space-y-1">
              {Object.entries(stats.platformCounts).map(([platform, count]) => (
                <div key={platform} className="flex justify-between text-sm">
                  <span className="text-gray-600">{platform}</span>
                  <span className="font-medium">{count}개</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="bg-white rounded-lg shadow">
          {/* 필터 및 검색 */}
          <div className="p-6 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  placeholder="영상, 채널, 키워드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md w-64"
                />
                <select
                  value={filters.platform}
                  onChange={(e) => setFilters({...filters, platform: e.target.value})}
                  className="border-gray-300 rounded-md"
                >
                  <option value="All">모든 플랫폼</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="INSTAGRAM">Instagram</option>
                </select>
                <select
                  value={filters.views}
                  onChange={(e) => setFilters({...filters, views: e.target.value})}
                  className="border-gray-300 rounded-md"
                >
                  <option value="0">모든 조회수</option>
                  <option value="1000">1천+ 조회수</option>
                  <option value="10000">1만+ 조회수</option>
                  <option value="100000">10만+ 조회수</option>
                </select>
                <select
                  value={filters.days}
                  onChange={(e) => setFilters({...filters, days: e.target.value})}
                  className="border-gray-300 rounded-md"
                >
                  <option value="1">1일 이내</option>
                  <option value="7">7일 이내</option>
                  <option value="30">30일 이내</option>
                  <option value="365">1년 이내</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  {viewMode === 'grid' ? '목록' : '그리드'}
                </button>
                <button
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    setSelectedVideos(new Set());
                  }}
                  className={`px-3 py-1 text-sm rounded ${isSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  {isSelectMode ? '선택 취소' : '선택 모드'}
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              총 {filteredVideos.length}개 영상
            </div>
          </div>

          {/* 영상 목록 */}
          <div className="p-6">
            {filteredVideos.length > 0 ? (
              <div className={`grid ${gridLayouts[gridSize] || gridLayouts[2]} gap-6`}>
                {filteredVideos.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video}
                    onClick={handleVideoClick}
                    onInfoClick={setSelectedVideo}
                    onChannelClick={setChannelToAnalyze}
                    isSelectMode={isSelectMode}
                    isSelected={selectedVideos.has(Number(video.id))}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">📂</p>
                <p className="mt-2">조건에 맞는 영상이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 선택 모드 액션 바 */}
        {isSelectMode && selectedVideos.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {selectedVideos.size}개 선택됨
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {selectedVideos.size === filteredVideos.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleDeleteClick({ type: 'bulk', count: selectedVideos.size })}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  삭제
                </button>
                <button
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedVideos(new Set());
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
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