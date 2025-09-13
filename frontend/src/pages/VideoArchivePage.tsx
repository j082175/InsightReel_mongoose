import React, { useState, useEffect } from 'react';
import { Video, ExtendedVideo } from '../types';
import { useVideos } from '../hooks/useApi';
import VideoModal from '../components/VideoModal';
import VideoOnlyModal from '../components/VideoOnlyModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import VideoListItem from '../components/VideoListItem';
import ChannelAnalysisModal from '../components/ChannelAnalysisModal';
import VideoCard from '../components/VideoCard';
import SearchFilterBar from '../components/SearchFilterBar';

import { PLATFORMS } from '../types/api';
import { formatViews } from '../utils/formatters';
import { getViewCount } from '../utils/videoUtils';
import { useSelection } from '../hooks/useSelection';
import { useSearch } from '../hooks/useSearch';
import { useFilter } from '../hooks/useFilter';
import SelectionActionBar from '../components/SelectionActionBar';

const VideoArchivePage: React.FC = () => {
  const [archivedVideos, setArchivedVideos] = useState<ExtendedVideo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(2);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const videoSelection = useSelection<string>();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<Video | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  } | null>(null);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  
  // Search and filter hooks
  const searchResult = useSearch(archivedVideos, {
    searchFields: ['title', 'channelName', 'tags'],
    defaultSearchTerm: ''
  });
  
  // Extract all available tags and categories for filter options
  const allTags = Array.from(new Set(archivedVideos.flatMap(video => video.tags || [])));
  const allCategories = Array.from(new Set(archivedVideos.map(video => video.category || '미분류')));
  
  const filterResult = useFilter(searchResult.filteredData, {
    defaultFilters: {
      selectedTag: 'All',
      selectedCategory: 'All'
    },
    filterFunctions: {
      selectedTag: (item: ExtendedVideo, value: string) => {
        if (value === 'All') return true;
        return (item.tags || []).includes(value);
      },
      selectedCategory: (item: ExtendedVideo, value: string) => {
        if (value === 'All') return true;
        return item.category === value;
      }
    }
  });
  
  // Final filtered videos combining search and filter results
  const filteredVideos = filterResult.filteredData;
  
  // API에서 실제 비디오 데이터 가져오기
  const { data: apiVideos = [], isLoading, error } = useVideos();

  // Mock 데이터
  const mockArchivedVideos: ExtendedVideo[] = [
    {
      uploadDate: '2024-01-01T10:00:00',
      platform: 'YOUTUBE',
      channelName: '개발왕 김코딩',
      mainCategory: '개발/기술',
      keywords: ['React', 'JavaScript', '웹개발'],
      likes: 5200,
      commentsCount: 120,
      url: 'https://www.youtube.com/watch?v=react18',
      thumbnailUrl: 'https://placehold.co/600x400/3B82F6/FFFFFF?text=React18',
      id: '101',
      title: 'React 18의 새로운 기능들 완벽 정리',
      views: 350000,
      daysAgo: 15,
      channelAvatarUrl: 'https://placehold.co/100x100/3B82F6/FFFFFF?text=K',
      isTrending: false,
      aspectRatio: '16:9',
      createdAt: '2024-01-01T10:00:00',
      archivedAt: '2024-01-10T14:30:00',
      tags: ['개발', '프론트엔드', '튜토리얼'],
      category: '개발/기술',
      notes: 'React 18 업데이트 내용 정리용'
    },
    {
      uploadDate: '2024-01-08T09:00:00',
      platform: 'TIKTOK',
      channelName: '요리하는 남자',
      mainCategory: '라이프스타일',
      keywords: ['요리', '브런치', '레시피'],
      likes: 18500,
      commentsCount: 340,
      url: 'https://www.tiktok.com/@brunch',
      thumbnailUrl: 'https://placehold.co/400x600/F43F5E/FFFFFF?text=Brunch',
      id: '102',
      title: '10분 만에 만드는 감동 브런치',
      views: 1200000,
      daysAgo: 7,
      channelAvatarUrl: 'https://placehold.co/100x100/F43F5E/FFFFFF?text=C',
      isTrending: false,
      aspectRatio: '9:16',
      createdAt: '2024-01-08T09:00:00',
      archivedAt: '2024-01-12T16:45:00',
      tags: ['요리', '레시피', '간편식'],
      category: '라이프스타일',
      notes: '주말 브런치 아이디어'
    }
  ];

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
        return channelName ? `https://www.youtube.com/@${channelName}` : 'https://www.youtube.com';
      case 'INSTAGRAM':
        return channelName ? `https://www.instagram.com/${channelName}` : 'https://www.instagram.com';
      case 'TIKTOK':
        return channelName ? `https://www.tiktok.com/@${channelName}` : 'https://www.tiktok.com';
      default:
        return '#';
    }
  };

  useEffect(() => {
    if (apiVideos.length > 0) {
      // DB 데이터를 ExtendedVideo 형식으로 변환
      const convertedVideos: ExtendedVideo[] = apiVideos.map((video: Video) => {
        const uploadDate = video.uploadDate || video.timestamp || video.createdAt;
        let daysAgo = 0;
        let normalizedUploadDate = uploadDate; // VideoCard에 전달할 정규화된 날짜
        
        if (uploadDate) {
          try {
            // 한국어 날짜 형식 처리 ('2025. 9. 9. 오전 5:37:21' 등)
            if (uploadDate.includes && (uploadDate.includes('오전') || uploadDate.includes('오후'))) {
              const timeMatch = uploadDate.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{1,2})/);
              if (timeMatch) {
                const [, year, month, day, ampm, hour, minute] = timeMatch;
                let hour24 = parseInt(hour);
                
                // 오전/오후를 24시간 형식으로 변환
                if (ampm === '오후' && hour24 !== 12) {
                  hour24 += 12;
                } else if (ampm === '오전' && hour24 === 12) {
                  hour24 = 0;
                }
                
                // 한국시간으로 Date 객체 생성 (UTC가 아닌 로컬시간으로)
                const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute), 0);
                if (!isNaN(parsedDate.getTime())) {
                  daysAgo = Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
                  normalizedUploadDate = parsedDate.toISOString(); // ISO 형식으로 변환
                }
              } else {
                // 시간 정보가 없는 경우 날짜만 파싱
                const dateMatch = uploadDate.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
                if (dateMatch) {
                  const [, year, month, day] = dateMatch;
                  const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                  if (!isNaN(parsedDate.getTime())) {
                    daysAgo = Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
                    normalizedUploadDate = parsedDate.toISOString(); // ISO 형식으로 변환
                  }
                }
              }
            } else {
              const parsedDate = new Date(uploadDate);
              if (!isNaN(parsedDate.getTime())) {
                daysAgo = Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
                normalizedUploadDate = parsedDate.toISOString(); // ISO 형식으로 변환
              }
            }
          } catch (error) {
            console.warn('날짜 파싱 실패:', uploadDate, error);
            daysAgo = 0;
          }
        }
        
        // URL 검증 및 fallback 처리
        let url = video.url;
        if (!url || !isValidUrl(url)) {
          url = generateFallbackUrl(video.platform || '', video.channelName || video.youtubeHandle);
        }

        // 키워드 처리 - 문자열이면 배열로 변환
        let keywordsArray: string[] = [];
        if (video.keywords) {
          if (typeof video.keywords === 'string') {
            keywordsArray = (video.keywords as string).split(',').map(k => k.trim()).filter(k => k.length > 0);
          } else if (Array.isArray(video.keywords)) {
            keywordsArray = video.keywords;
          }
        }

        // 해시태그 처리 - 배열 형태로 통일
        let hashtagsArray: string[] = [];
        if (video.hashtags) {
          if (typeof video.hashtags === 'string') {
            hashtagsArray = (video.hashtags as string).split(',').map(h => h.trim()).filter(h => h.length > 0);
          } else if (Array.isArray(video.hashtags)) {
            hashtagsArray = video.hashtags;
          }
        }

        const extendedVideo: ExtendedVideo = {
          ...video,
          id: video._id || video.id || String(Date.now()),
          platform: (video.platform?.toUpperCase() === 'YOUTUBE' || video.platform === PLATFORMS.YOUTUBE) ? 'YOUTUBE' : 
                   (video.platform?.toUpperCase() === 'TIKTOK' || video.platform === 'TIKTOK') ? 'TIKTOK' : 
                   (video.platform?.toUpperCase() === 'INSTAGRAM' || video.platform === 'INSTAGRAM') ? 'INSTAGRAM' : 'YOUTUBE',
          url: url,
          uploadDate: normalizedUploadDate, // 정규화된 날짜 사용
          keywords: keywordsArray,
          hashtags: hashtagsArray,
          daysAgo: daysAgo,
          aspectRatio: video.platform === PLATFORMS.YOUTUBE ? '16:9' : '9:16',
          archivedAt: video.collectionTime || video.processedAt || new Date().toISOString(),
          tags: [...hashtagsArray, ...keywordsArray].filter(Boolean),
          category: video.mainCategory || '미분류',
          notes: video.analysisContent || ''
        };
        return extendedVideo;
      });
      setArchivedVideos(convertedVideos);
    } else {
      // API 데이터가 없으면 mock 데이터 사용
      setArchivedVideos(mockArchivedVideos);
    }
  }, [apiVideos]);



  const handleSelectToggle = (videoId: string | number) => {
    videoSelection.toggle(String(videoId));
  };

  const handleSelectAll = () => {
    videoSelection.selectAll(filteredVideos.map(v => String(v.id)));
  };

  const handleDeleteClick = (item: { type: 'single' | 'bulk'; data?: Video; count?: number }) => {
    setItemToDelete(item);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete?.type === 'single' && itemToDelete.data) {
      setArchivedVideos(archivedVideos.filter(v => v.id !== itemToDelete.data?.id));
    } else if (itemToDelete?.type === 'bulk') {
      setArchivedVideos(archivedVideos.filter(v => !videoSelection.selected.has(String(v.id))));
      videoSelection.clear();
      setIsSelectMode(false);
    }
    setItemToDelete(null);
  };

  const gridLayouts: Record<number, string> = { 
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
          videoSelection.clear();
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
      <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
            {formatViews(archivedVideos.reduce((sum, v) => sum + getViewCount(v), 0))}
          </p>
          <p className="mt-1 text-sm text-gray-600">보관된 콘텐츠</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white rounded-lg shadow">
        {/* 검색 및 필터 */}
        <SearchFilterBar
          searchTerm={searchResult.searchTerm}
          onSearchTermChange={searchResult.setSearchTerm}
          placeholder="영상, 채널, 태그 검색..."
          showFilters={true}
        >
          <select
            value={filterResult.filters.selectedCategory || 'All'}
            onChange={(e) => filterResult.updateFilter('selectedCategory', e.target.value)}
            className="border-gray-300 rounded-md"
          >
            <option value="All">모든 카테고리</option>
            {allCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={filterResult.filters.selectedTag || 'All'}
            onChange={(e) => filterResult.updateFilter('selectedTag', e.target.value)}
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
        </SearchFilterBar>
        
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
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">영상 데이터를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p className="text-lg">⚠️</p>
              <p className="mt-2">영상 데이터를 불러오는데 실패했습니다.</p>
              <p className="text-sm text-gray-500 mt-1">Mock 데이터를 사용합니다.</p>
            </div>
          ) : filteredVideos.length > 0 ? (
            viewMode === 'grid' ? (
              <div className={`grid ${gridLayouts[gridSize] || gridLayouts[2]} gap-6`}>
                {filteredVideos.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video}
                    onClick={(video) => {
                      if (!isSelectMode) {
                        if (video.platform === PLATFORMS.YOUTUBE) {
                          setSelectedVideoForPlay(video);
                        } else if (video.url && video.url !== '#') {
                          window.open(video.url, '_blank', 'noopener,noreferrer');
                        } else {
                          alert('죄송합니다. 이 영상의 링크를 찾을 수 없습니다.');
                        }
                      }
                    }}
                    onInfoClick={(video) => !isSelectMode && setSelectedVideo(video)}
                    onChannelClick={setChannelToAnalyze}
                    isSelectMode={isSelectMode}
                    isSelected={videoSelection.isSelected(String(video.id))}
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
                    isSelected={videoSelection.isSelected(String(video.id))}
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
      <SelectionActionBar
        isVisible={isSelectMode}
        selectedCount={videoSelection.count}
        totalCount={filteredVideos.length}
        itemType="개"
        onSelectAll={handleSelectAll}
        onClearSelection={() => {
          setIsSelectMode(false);
          videoSelection.clear();
        }}
        onDelete={() => handleDeleteClick({ type: 'bulk', count: videoSelection.count })}
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