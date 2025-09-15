import React, { memo, useState, useEffect } from 'react';
import { VideoCard, SearchBar, ActionBar } from '../shared/components';
import { useVideos, useChannels } from '../shared/hooks';
import { Video, Channel } from '../shared/types';

const IntegrationTestPage: React.FC = memo(() => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // 실제 API 데이터 사용
  const { data: videos, isLoading: videosLoading, error: videosError } = useVideos();

  // 🔍 실제 데이터 구조 확인
  console.log('🎬 IntegrationTestPage videos 데이터:', videos?.slice(0, 1));

  const { data: channels, isLoading: channelsLoading, error: channelsError } = useChannels();

  // 검색 필터링
  const filteredVideos = videos?.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.channelName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSelection = (videoId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, videoId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== videoId));
    }
  };

  const handleSelectAll = () => {
    setSelectedItems(filteredVideos.map(v => v.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      // 실제 삭제 API 호출 시뮬레이션
      console.log('실제 삭제 API 호출:', selectedItems);

      // 삭제 후 선택 해제
      setSelectedItems([]);

      // 실제로는 여기서 데이터 리프레시
      alert(`${selectedItems.length}개 항목이 삭제되었습니다. (시뮬레이션)`);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔗 Integration Tests</h1>
          <p className="text-lg text-gray-600">실제 API 데이터와 상태 관리를 사용한 통합 테스트입니다.</p>
        </div>

        {/* API 상태 정보 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 API Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div key="videos-api-status" className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Videos API</h3>
              <div className="space-y-2 text-sm">
                <div key="videos-status">상태: {videosLoading ? '로딩 중...' : videosError ? '오류' : '정상'}</div>
                <div key="videos-count">데이터 수: {videos?.length || 0}개</div>
                {videosError && (
                  <div key="videos-error" className="text-red-600">오류: {videosError.message}</div>
                )}
              </div>
            </div>

            <div key="channels-api-status" className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Channels API</h3>
              <div className="space-y-2 text-sm">
                <div key="channels-status">상태: {channelsLoading ? '로딩 중...' : channelsError ? '오류' : '정상'}</div>
                <div key="channels-count">데이터 수: {channels?.length || 0}개</div>
                {channelsError && (
                  <div key="channels-error" className="text-red-600">오류: {channelsError.message}</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 실제 검색 기능 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Live Search</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="실제 비디오 제목, 채널명으로 검색..."
            />
            <div className="mt-4 text-sm text-gray-600">
              검색 결과: {filteredVideos.length}개 / 전체: {videos?.length || 0}개
            </div>
          </div>
        </section>

        {/* 실제 액션바 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⚡ Live Action Bar</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <ActionBar
              selectedCount={selectedItems.length}
              totalCount={filteredVideos.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onDelete={handleDelete}
            />
            <div className="mt-4 text-sm text-gray-600">
              현재 선택된 항목: {selectedItems.length}개
            </div>
          </div>
        </section>

        {/* 실제 비디오 목록 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎬 Live Video List</h2>

          {videosLoading ? (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">비디오 데이터 로딩 중...</div>
            </div>
          ) : videosError ? (
            <div className="text-center py-8">
              <div className="text-lg text-red-600">데이터 로딩 실패</div>
              <div className="text-sm text-gray-600 mt-2">{videosError.message}</div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">
                {searchTerm ? '검색 결과가 없습니다' : '비디오 데이터가 없습니다'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.slice((currentPage - 1) * 12, currentPage * 12).map((video, index) => (
                <div key={`video-${video._id}-${index}`} className="bg-white p-4 rounded-lg shadow">
                  <VideoCard
                    video={video}
                    isSelectMode={true}
                    isSelected={selectedItems.includes(video._id)}
                    onSelectToggle={(id) => handleSelection(id, !selectedItems.includes(id))}
                    onClick={(video) => {
                      console.log('실제 비디오 클릭:', video._id);
                      // 실제 비디오 모달 열기 등
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {filteredVideos.length > 12 && (
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-2">
                {Array.from({ length: Math.ceil(filteredVideos.length / 12) }, (_, i) => (
                  <button
                    key={`page-${i + 1}`}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-2 rounded ${
                      currentPage === i + 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 실제 상태 관리 정보 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 State Management</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div key="search-term">
                <div className="font-medium text-gray-700">검색어</div>
                <div className="text-gray-600">"{searchTerm}"</div>
              </div>
              <div key="selected-items">
                <div className="font-medium text-gray-700">선택된 항목</div>
                <div className="text-gray-600">{selectedItems.length}개</div>
              </div>
              <div key="current-page">
                <div className="font-medium text-gray-700">현재 페이지</div>
                <div className="text-gray-600">{currentPage}페이지</div>
              </div>
              <div key="filtered-results">
                <div className="font-medium text-gray-700">필터된 결과</div>
                <div className="text-gray-600">{filteredVideos.length}개</div>
              </div>
            </div>
          </div>
        </section>

        {/* 개발 정보 */}
        <div className="mt-12 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">🚀 Integration Test Features</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li key="api-data-handling">• 실제 API 데이터 로딩 및 에러 핸들링</li>
            <li key="realtime-search">• 실시간 검색 기능 (클라이언트 사이드 필터링)</li>
            <li key="state-management">• 실제 선택 상태 관리 및 액션</li>
            <li key="pagination">• 페이지네이션 동작</li>
            <li key="realtime-monitoring">• 상태 변화 실시간 모니터링</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

IntegrationTestPage.displayName = 'IntegrationTestPage';

export default IntegrationTestPage;