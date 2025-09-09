import React, { useState, useEffect, useMemo } from 'react';
import { useVideos, useTrendingStats, useQuotaStatus, useServerStatus, useCollectTrending } from '../hooks/useApi';
import { Video, FilterState } from '../types';
import { useAppContext } from '../App';
import VideoModal from '../components/VideoModal';
import VideoOnlyModal from '../components/VideoOnlyModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ChannelAnalysisModal from '../components/ChannelAnalysisModal';
import VideoCard from '../components/VideoCard';

const DashboardPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({ 
    days: '7', 
    views: '100000', 
    platform: 'All' 
  });
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all'); // 'all' = 모든 영상
  const [searchTerm, setSearchTerm] = useState<string>(''); // 검색어
  const [selectedBatchForModal, setSelectedBatchForModal] = useState<string | null>(null); // 모달에서 보여줄 배치
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null); // 상세 정보 모달용
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<Video | null>(null); // 영상 재생 모달용
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
  const { data: apiVideos = [], isLoading: videosLoading, error: videosError } = useVideos();
  const { data: trendingStats, isLoading: trendingLoading } = useTrendingStats();
  const { data: quotaStatus, isLoading: quotaLoading } = useQuotaStatus();
  const { data: serverStatus, isLoading: serverLoading } = useServerStatus();
  const collectTrendingMutation = useCollectTrending();
  
  // 전역 상태에서 수집된 영상과 배치 정보 가져오기
  const { collectedVideos, collectionBatches } = useAppContext();

  // Mock 데이터 (실제 API가 없을 때를 위한 fallback)
  const mockVideos: Video[] = [
    { 
      id: 1, 
      platform: 'YouTube', 
      title: '초보자를 위한 React 2025년 최신 가이드 (롱폼)', 
      channelName: '개발왕 김코딩', 
      views: 150000, 
      daysAgo: 0, 
      thumbnailUrl: 'https://placehold.co/600x400/3B82F6/FFFFFF?text=React', 
      channelAvatarUrl: 'https://placehold.co/100x100/3B82F6/FFFFFF?text=K', 
      isTrending: true, 
      originalUrl: 'https://www.youtube.com/watch?v=t-piB91ftwA', 
      aspectRatio: '16:9' as const, 
      keywords: ['React', 'JavaScript', '코딩'],
      createdAt: new Date().toISOString()
    },
    { 
      id: 2, 
      platform: 'TikTok', 
      title: '1분 만에 따라하는 제육볶음 황금 레시피', 
      channelName: '요리하는 남자', 
      views: 2350000, 
      daysAgo: 2, 
      thumbnailUrl: 'https://placehold.co/400x600/F43F5E/FFFFFF?text=Food', 
      channelAvatarUrl: 'https://placehold.co/100x100/F43F5E/FFFFFF?text=C', 
      isTrending: true, 
      originalUrl: 'https://www.tiktok.com', 
      aspectRatio: '9:16' as const, 
      keywords: ['요리', '레시피', '맛집'],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: 3, 
      platform: 'Instagram', 
      title: '요즘 유행하는 한남동 카페 BEST 5', 
      channelName: '카페찾아 삼만리', 
      views: 52000, 
      daysAgo: 0, 
      thumbnailUrl: 'https://placehold.co/400x600/8B5CF6/FFFFFF?text=Cafe', 
      channelAvatarUrl: 'https://placehold.co/100x100/8B5CF6/FFFFFF?text=T', 
      isTrending: false, 
      originalUrl: 'https://www.instagram.com', 
      aspectRatio: '9:16' as const, 
      keywords: ['여행', '카페', '감성'],
      createdAt: new Date().toISOString()
    },
    { 
      id: 4, 
      platform: 'YouTube', 
      title: '우리집 고양이가 천재인 이유 (숏폼)', 
      channelName: '냥냥펀치', 
      views: 320000, 
      daysAgo: 1, 
      thumbnailUrl: 'https://placehold.co/400x600/F97316/FFFFFF?text=Cat', 
      channelAvatarUrl: 'https://placehold.co/100x100/F97316/FFFFFF?text=P', 
      isTrending: false, 
      originalUrl: 'https://www.youtube.com/shorts/MPV2METPeJU', 
      aspectRatio: '9:16' as const, 
      keywords: ['고양이', '동물', '반려동물'],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: 5, 
      platform: 'YouTube', 
      title: '우중 캠핑 VLOG | 빗소리 들으며 휴식', 
      channelName: '캠핑은 장비빨', 
      views: 88000, 
      daysAgo: 3, 
      thumbnailUrl: 'https://placehold.co/400x600/22C55E/FFFFFF?text=Camping', 
      channelAvatarUrl: 'https://placehold.co/100x100/22C55E/FFFFFF?text=C', 
      isTrending: false, 
      originalUrl: 'https://www.youtube.com/shorts/ARq1t2402p4', 
      aspectRatio: '9:16' as const, 
      keywords: ['캠핑', '여행', 'VLOG'],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
  ];

  // 데이터 선택 로직 (수집된 영상 + API 데이터 + mock 데이터)
  const getAllVideos = useMemo(() => {
    const apiMappedVideos = apiVideos.length > 0 ? apiVideos.map((v: any, index: number) => ({
      ...v,
      id: v._id || v.id || (Date.now() + index), // ID 충돌 방지
      thumbnailUrl: v.thumbnailUrl || v.thumbnail,
      channelAvatarUrl: v.channelAvatarUrl || v.channelAvatar,
      views: v.views || v.viewCount || 0,
      daysAgo: Math.floor((Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    })) : mockVideos;

    return [
      ...collectedVideos, // 수집된 영상들을 맨 앞에 추가
      ...apiMappedVideos
    ];
  }, [collectedVideos, apiVideos]);

  // 배치별 영상 필터링
  const allVideos = useMemo(() => {
    if (selectedBatchId === 'all') {
      return getAllVideos;
    }
    
    // 특정 배치의 영상들만 반환
    return collectedVideos.filter(video => 
      video.batchIds && video.batchIds.includes(selectedBatchId)
    );
  }, [selectedBatchId, collectedVideos, getAllVideos]);

  const gridLayouts = { 
    1: 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8', 
    2: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', 
    3: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
  };

  // 배치 검색 함수
  const getMatchingBatches = (term: string) => {
    if (!term.trim()) return [];
    
    const searchLower = term.toLowerCase();
    
    return collectionBatches.filter(batch => 
      batch.name.toLowerCase().includes(searchLower) ||
      batch.keywords.some(keyword => keyword.toLowerCase().includes(searchLower)) ||
      batch.channels.some(channel => channel.toLowerCase().includes(searchLower))
    );
  };

  // 배치 선택 핸들러
  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    setSearchTerm('');
  };

  // 배치별 실제 영상 개수 계산
  const getActualVideoCount = (batchId: string) => {
    return collectedVideos.filter(video => 
      video.batchIds && video.batchIds.includes(batchId)
    ).length;
  };

  const videos = useMemo(() => {
    let filtered = allVideos.filter(v => 
      v.daysAgo <= parseInt(filters.days) && 
      v.views >= parseInt(filters.views)
    );
    if (filters.platform !== 'All') {
      filtered = filtered.filter(v => v.platform === filters.platform);
    }
    return filtered;
  }, [filters, allVideos]);


  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
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
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(videos.map(v => v.id)));
    }
  };

  const formatViews = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    return num.toLocaleString();
  };

  const KpiCard: React.FC<{ title: string; value: string | number; change: string }> = ({ 
    title, 
    value, 
    change 
  }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-green-600">{change}</p>
    </div>
  );

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

  const handleDeleteClick = (item: { type: 'single' | 'bulk'; data?: Video; count?: number }) => {
    setItemToDelete(item);
  };

  const handleDeleteConfirm = () => {
    // TODO: Implement delete functionality with proper state management
    // For now, just close the modal and reset selection
    if (itemToDelete?.type === 'bulk') {
      setSelectedVideos(new Set());
      setIsSelectMode(false);
    }
    setItemToDelete(null);
  };


  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 서버 상태 및 트렌딩 수집 */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${serverStatus ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-gray-600">
                  서버 상태: {serverStatus ? '연결됨' : '연결 실패'}
                </span>
              </div>
              {quotaStatus && (
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span>
                      API 할당량: {quotaStatus.quota?.used || 0}/{quotaStatus.safetyMargin || 8000}
                    </span>
                    <span className="text-xs text-blue-600">
                      (안전 마진: {quotaStatus.safetyMargin || 8000})
                    </span>
                  </div>
                  {quotaStatus.quota?.allKeys && (
                    <div className="text-xs text-gray-500 mt-1">
                      키 현황: {quotaStatus.quota.allKeys.filter((k: any) => !k.exceeded).length}/{quotaStatus.quota.keyCount}개 사용 가능
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => collectTrendingMutation.mutate()}
                disabled={collectTrendingMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
              >
                {collectTrendingMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>수집 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>🔥 트렌딩 영상 수집</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* KPI 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KpiCard title="수집한 채널" value="128" change="+5개 지난 주" />
          <KpiCard title="새로운 인기 영상 (24시간)" value="12" change="+3개 어제" />
          <KpiCard title="총 영상" value="2,408" change="+120개 지난 주" />
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">📦 수집된 배치 목록</h2>
            <span className="text-sm text-gray-600">
              총 {collectionBatches.length}개 배치
            </span>
          </div>
          
          {/* 검색 및 정렬 */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b">
            <div className="flex items-center gap-4">
              {/* 배치 검색창 */}
              <input
                type="text"
                placeholder="🔍 배치 검색 (배치명, 키워드, 채널명)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 px-4 py-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                >
                  ✕ 초기화
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {searchTerm ? 
                `"${searchTerm}" 검색 결과: ${getMatchingBatches(searchTerm).length}개` : 
                `전체 ${collectionBatches.length}개 배치`
              }
            </div>
          </div>

          {/* 배치 카드 그리드 */}
          {(searchTerm ? getMatchingBatches(searchTerm) : collectionBatches).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchTerm ? getMatchingBatches(searchTerm) : collectionBatches).map((batch) => (
                <div 
                  key={batch.id}
                  onClick={() => setSelectedBatchForModal(batch.id)}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md cursor-pointer transition-shadow"
                >
                  <div className="flex items-start space-x-3 mb-4">
                    <span 
                      className="inline-block w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: batch.color }}
                    ></span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        📦 {batch.name}
                      </h3>
                      <div className="text-sm text-gray-600 mb-3">
                        {new Date(batch.collectedAt).toLocaleDateString('ko-KR')} 수집
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">영상 수</span>
                      <span className="font-medium text-indigo-600">{getActualVideoCount(batch.id)}개</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">채널 수</span>
                      <span className="font-medium">{batch.channels.length}개</span>
                    </div>
                  </div>
                  
                  {batch.keywords.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">키워드</div>
                      <div className="flex flex-wrap gap-1">
                        {batch.keywords.slice(0, 3).map((keyword, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                        {batch.keywords.length > 3 && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                            +{batch.keywords.length - 3}개
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    채널: {batch.channels.slice(0, 2).join(', ')}
                    {batch.channels.length > 2 && ` 외 ${batch.channels.length - 2}개`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">📦</p>
              <p className="mt-2">
                {searchTerm ? 
                  `"${searchTerm}"와 일치하는 배치가 없습니다.` : 
                  '아직 수집된 배치가 없습니다.'
                }
              </p>
            </div>
          )}
        </div>

        {/* 선택 모드 액션 바 */}
        {isSelectMode && (
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
                  {selectedVideos.size === videos.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                  아카이브에 저장
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
        
        {/* 배치 상세 모달 */}
        {selectedBatchForModal && (
          <BatchDetailModal
            batchId={selectedBatchForModal}
            onClose={() => setSelectedBatchForModal(null)}
            onVideoPlay={(video) => {
              setSelectedVideoForPlay(video);
              // 배치 모달은 닫지 않고 유지
            }}
            onVideoInfo={(video) => {
              setSelectedVideo(video);
              // 배치 모달은 닫지 않고 유지
            }}
          />
        )}
    </main>
  );
};

// 배치 상세 모달 컴포넌트
const BatchDetailModal: React.FC<{ 
  batchId: string; 
  onClose: () => void;
  onVideoPlay: (video: Video) => void;
  onVideoInfo: (video: Video) => void;
}> = ({ batchId, onClose, onVideoPlay, onVideoInfo }) => {
  const { collectedVideos, collectionBatches } = useAppContext();
  
  const batch = collectionBatches.find(b => b.id === batchId);
  const batchVideos = collectedVideos.filter(video => 
    video.batchIds && video.batchIds.includes(batchId)
  );

  if (!batch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <span 
              className="inline-block w-4 h-4 rounded-full"
              style={{ backgroundColor: batch.color }}
            ></span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">📦 {batch.name}</h2>
              <p className="text-sm text-gray-600">
                {new Date(batch.collectedAt).toLocaleDateString('ko-KR')} 수집 • {batchVideos.length}개 영상
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* 배치 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{batchVideos.length}</div>
              <div className="text-sm text-gray-600">총 영상</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{batch.channels.length}</div>
              <div className="text-sm text-gray-600">수집 채널</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{batch.keywords.length}</div>
              <div className="text-sm text-gray-600">키워드</div>
            </div>
          </div>

          {/* 키워드 표시 */}
          {batch.keywords.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🏷️ 수집 키워드</h3>
              <div className="flex flex-wrap gap-2">
                {batch.keywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 영상 목록 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎥 수집된 영상들</h3>
            {batchVideos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {batchVideos.map((video) => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    onClick={(video) => {
                      if (video.platform === 'YouTube') {
                        onVideoPlay(video);
                      } else {
                        window.open(video.originalUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    onInfoClick={onVideoInfo}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>이 배치에는 영상이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            닫기
          </button>
          <button className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700">
            아카이브에 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;