import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import VideoModal from '../components/VideoModal';
import VideoOnlyModal from '../components/VideoOnlyModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import VideoListItem from '../components/VideoListItem';
import ChannelAnalysisModal from '../components/ChannelAnalysisModal';
import VideoCard from '../components/VideoCard';

interface ArchivedVideo extends Video {
  archivedAt: string;
  tags: string[];
  notes?: string;
  category: string;
}

const VideoArchivePage: React.FC = () => {
  const [archivedVideos, setArchivedVideos] = useState<ArchivedVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<ArchivedVideo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(2);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<Video | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  } | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);

  // Mock 데이터
  const mockArchivedVideos: ArchivedVideo[] = [
    {
      id: 101,
      platform: 'YouTube',
      title: 'React 18의 새로운 기능들 완벽 정리',
      channelName: '개발왕 김코딩',
      views: 350000,
      daysAgo: 15,
      thumbnailUrl: 'https://placehold.co/600x400/3B82F6/FFFFFF?text=React18',
      channelAvatarUrl: 'https://placehold.co/100x100/3B82F6/FFFFFF?text=K',
      isTrending: false,
      originalUrl: 'https://www.youtube.com/watch?v=react18',
      aspectRatio: '16:9' as const,
      keywords: ['React', 'JavaScript', '웹개발'],
      createdAt: '2024-01-01T10:00:00',
      archivedAt: '2024-01-10T14:30:00',
      tags: ['개발', '프론트엔드', '튜토리얼'],
      category: '개발/기술',
      notes: 'React 18 업데이트 내용 정리용'
    },
    {
      id: 102,
      platform: 'TikTok',
      title: '10분 만에 만드는 감동 브런치',
      channelName: '요리하는 남자',
      views: 1200000,
      daysAgo: 7,
      thumbnailUrl: 'https://placehold.co/400x600/F43F5E/FFFFFF?text=Brunch',
      channelAvatarUrl: 'https://placehold.co/100x100/F43F5E/FFFFFF?text=C',
      isTrending: false,
      originalUrl: 'https://www.tiktok.com/@brunch',
      aspectRatio: '9:16' as const,
      keywords: ['요리', '브런치', '레시피'],
      createdAt: '2024-01-08T09:00:00',
      archivedAt: '2024-01-12T16:45:00',
      tags: ['요리', '레시피', '간편식'],
      category: '라이프스타일',
      notes: '주말 브런치 아이디어'
    },
    {
      id: 103,
      platform: 'Instagram',
      title: '제주도 숨겨진 카페 TOP 10',
      channelName: '카페찾아 삼만리',
      views: 78000,
      daysAgo: 3,
      thumbnailUrl: 'https://placehold.co/400x600/8B5CF6/FFFFFF?text=Jeju+Cafe',
      channelAvatarUrl: 'https://placehold.co/100x100/8B5CF6/FFFFFF?text=T',
      isTrending: false,
      originalUrl: 'https://www.instagram.com/jejucafe',
      aspectRatio: '9:16' as const,
      keywords: ['제주도', '카페', '여행'],
      createdAt: '2024-01-12T11:00:00',
      archivedAt: '2024-01-13T19:20:00',
      tags: ['여행', '카페', '제주도'],
      category: '여행/관광',
      notes: '제주도 여행 계획할 때 참고'
    },
    {
      id: 104,
      platform: 'YouTube',
      title: '고양이 행동 심리학 - 우리 냥이가 하는 행동의 의미',
      channelName: '냥냥펀치',
      views: 450000,
      daysAgo: 12,
      thumbnailUrl: 'https://placehold.co/600x400/F97316/FFFFFF?text=Cat+Psychology',
      channelAvatarUrl: 'https://placehold.co/100x100/F97316/FFFFFF?text=P',
      isTrending: false,
      originalUrl: 'https://www.youtube.com/watch?v=catpsych',
      aspectRatio: '16:9' as const,
      keywords: ['고양이', '동물', '심리학'],
      createdAt: '2024-01-03T15:00:00',
      archivedAt: '2024-01-08T11:15:00',
      tags: ['동물', '교육', '펫케어'],
      category: '동물/펫',
      notes: '우리 고양이 이해하는데 도움됨'
    },
    {
      id: 105,
      platform: 'YouTube',
      title: '겨울 캠핑 장비 완벽 가이드 2024',
      channelName: '캠핑은 장비빨',
      views: 280000,
      daysAgo: 20,
      thumbnailUrl: 'https://placehold.co/600x400/22C55E/FFFFFF?text=Winter+Camping',
      channelAvatarUrl: 'https://placehold.co/100x100/22C55E/FFFFFF?text=C',
      isTrending: false,
      originalUrl: 'https://www.youtube.com/watch?v=wintercamp',
      aspectRatio: '16:9' as const,
      keywords: ['캠핑', '장비', '겨울'],
      createdAt: '2023-12-25T14:00:00',
      archivedAt: '2024-01-05T10:30:00',
      tags: ['캠핑', '아웃도어', '장비리뷰'],
      category: '아웃도어/스포츠',
      notes: '겨울 캠핑 준비물 체크리스트'
    }
  ];

  useEffect(() => {
    setArchivedVideos(mockArchivedVideos);
  }, []);

  useEffect(() => {
    let filtered = archivedVideos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.channelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTag = selectedTag === 'All' || video.tags.includes(selectedTag);
      const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;
      return matchesSearch && matchesTag && matchesCategory;
    });
    setFilteredVideos(filtered);
  }, [archivedVideos, searchTerm, selectedTag, selectedCategory]);

  // 모든 태그와 카테고리 추출
  const allTags = Array.from(new Set(archivedVideos.flatMap(video => video.tags)));
  const allCategories = Array.from(new Set(archivedVideos.map(video => video.category)));

  const formatViews = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    return num.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
      setSelectedVideos(new Set(filteredVideos.map(v => v.id)));
    }
  };

  const handleDeleteClick = (item: { type: 'single' | 'bulk'; data?: Video; count?: number }) => {
    setItemToDelete(item);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete?.type === 'single' && itemToDelete.data) {
      setArchivedVideos(archivedVideos.filter(v => v.id !== itemToDelete.data!.id));
    } else if (itemToDelete?.type === 'bulk') {
      setArchivedVideos(archivedVideos.filter(v => !selectedVideos.has(v.id)));
      setSelectedVideos(new Set());
      setIsSelectMode(false);
    }
    setItemToDelete(null);
  };

  const gridLayouts = { 
    1: 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8', 
    2: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', 
    3: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
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
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
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
        onClick={() => {
          setIsSelectMode(!isSelectMode);
          setSelectedVideos(new Set());
        }}
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
            <p className="text-gray-600 mb-4">태그 관리 기능을 구현 중입니다.</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag, index) => (
                <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">📁 영상 아카이브</h1>
        <p className="text-gray-600">저장된 영상들을 태그와 카테고리로 관리하세요</p>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">보관된 영상</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{archivedVideos.length}</p>
          <p className="mt-1 text-sm text-green-600">+8개 이번 주</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">태그 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{allTags.length}</p>
          <p className="mt-1 text-sm text-gray-600">분류 체계</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">카테고리 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{allCategories.length}</p>
          <p className="mt-1 text-sm text-gray-600">주제별 분류</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">총 조회수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatViews(archivedVideos.reduce((sum, v) => sum + v.views, 0))}
          </p>
          <p className="mt-1 text-sm text-gray-600">보관된 콘텐츠</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white rounded-lg shadow">
        {/* 필터 및 컨트롤 */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                placeholder="영상, 채널, 태그 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md w-64"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border-gray-300 rounded-md"
              >
                <option value="All">모든 카테고리</option>
                {allCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="border-gray-300 rounded-md"
              >
                <option value="All">모든 태그</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
              <button
                onClick={() => setShowTagModal(true)}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                태그 관리
              </button>
            </div>
            
            <ViewControls />
          </div>
          
          <div className="text-sm text-gray-500">
            총 {filteredVideos.length}개 영상
          </div>
        </div>

        {/* 영상 그리드/리스트 */}
        <div className="p-6">
          {filteredVideos.length > 0 ? (
            viewMode === 'grid' ? (
              <div className={`grid ${gridLayouts[gridSize as keyof typeof gridLayouts]} gap-6`}>
                {filteredVideos.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video}
                    onClick={(video) => {
                      if (!isSelectMode) {
                        if (video.platform === 'YouTube') {
                          setSelectedVideoForPlay(video);
                        } else {
                          window.open(video.originalUrl, '_blank', 'noopener,noreferrer');
                        }
                      }
                    }}
                    onInfoClick={(video) => !isSelectMode && setSelectedVideo(video)}
                    onChannelClick={setChannelToAnalyze}
                    isSelectMode={isSelectMode}
                    isSelected={selectedVideos.has(video.id)}
                    onSelectToggle={handleSelectToggle}
                    showArchiveInfo={true}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVideos.map(video => (
                  <VideoListItem 
                    key={video.id} 
                    video={video}
                    onCardClick={setSelectedVideo}
                    onDeleteClick={handleDeleteClick}
                    isSelectMode={isSelectMode}
                    isSelected={selectedVideos.has(video.id)}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">📂</p>
              <p className="mt-2">조건에 맞는 보관 영상이 없습니다.</p>
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
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                태그 편집
              </button>
              <button className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                내보내기
              </button>
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