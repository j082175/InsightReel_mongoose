import React, { memo, useState } from 'react';
import { useModal, useMultiModal, useSearch, useSelection, useFilter } from '../shared/hooks';
import { Video } from '../shared/types';

const UIHooksTestPage: React.FC = memo(() => {
  // 🎯 테스트용 데이터
  const testVideos: Video[] = [
    {
      _id: '1',
      title: 'React Hook 튜토리얼',
      views: 1234567,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FF0000/FFFFFF?text=React',
      channelName: '개발자 채널',
      uploadDate: '2024-01-15T10:30:00Z',
      duration: 'LONG',
      keywords: ['React', 'Hook', '튜토리얼'],
    },
    {
      _id: '2',
      title: 'JavaScript ES2024 신기능',
      views: 89000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FFA500/FFFFFF?text=JS',
      channelName: '코딩 마스터',
      uploadDate: '2024-01-10T15:45:00Z',
      duration: 'MID',
      keywords: ['JavaScript', 'ES2024', '신기능'],
    },
    {
      _id: '3',
      title: 'TypeScript 고급 패턴',
      views: 456000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/0066CC/FFFFFF?text=TS',
      channelName: '타입스크립트 전문가',
      uploadDate: '2024-01-05T08:20:00Z',
      duration: 'LONG',
      keywords: ['TypeScript', '고급', '패턴'],
    },
  ];

  const testItems = ['영상1', '영상2', '영상3', '영상4', '영상5'];

  // 📊 UI Hook 인스턴스들
  const singleModal = useModal();
  const multiModal = useMultiModal(['create', 'edit', 'delete', 'settings']);
  const videoSearch = useSearch(testVideos, {
    searchFields: ['title', 'channelName', 'keywords']
  });
  const stringSelection = useSelection<string>();
  const numberSelection = useSelection<number>();
  const videoFilter = useFilter(testVideos, {
    defaultFilters: { platform: '', duration: '', minViews: '' },
    filterFunctions: {
      minViews: (video: Video, value: number) => video.views >= value,
      platform: (video: Video, value: string) => !value || video.platform === value,
      duration: (video: Video, value: string) => !value || video.duration === value
    }
  });

  // 🎨 상태 표시 컴포넌트
  const StateBox: React.FC<{ title: string; children: React.ReactNode; color?: string }> = ({
    title,
    children,
    color = 'blue'
  }) => (
    <div className={`bg-${color}-50 p-4 rounded-lg border border-${color}-200`}>
      <h4 className={`font-semibold text-${color}-800 mb-2`}>{title}</h4>
      <div className={`text-sm text-${color}-700`}>{children}</div>
    </div>
  );

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🎨 UI Hooks Laboratory</h1>
          <p className="text-lg text-gray-600 mb-4">
            사용자 인터페이스 상태 관리를 담당하는 5개 UI Hook의 실시간 테스트 환경입니다.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full">useModal</span>
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full">useMultiModal</span>
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full">useSelection</span>
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full">useSearch</span>
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full">useFilter</span>
            </div>
            <p className="text-blue-700 mt-2 text-sm">
              💡 특징: 서버 통신 없음, 브라우저 메모리에서만 동작, 즉시 반응
            </p>
          </div>
        </div>

        {/* useModal Hook 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎭 useModal Hook</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 단일 모달 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Single Modal</h3>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => singleModal.openModal('테스트 아이템')}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Open Modal
                </button>
                <button
                  onClick={singleModal.closeModal}
                  className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close Modal
                </button>
                <button
                  onClick={() => singleModal.toggleModal('토글 아이템')}
                  className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  Toggle Modal
                </button>
              </div>

              <StateBox title="Single Modal State" color="blue">
                <div className="space-y-1">
                  <div>isOpen: <strong>{singleModal.isOpen ? 'true' : 'false'}</strong></div>
                  <div>selectedItem: <strong>{singleModal.selectedItem || 'null'}</strong></div>
                </div>
              </StateBox>
            </div>

            {/* 다중 모달 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Multi Modal</h3>

              <div className="grid grid-cols-2 gap-2">
                {(['create', 'edit', 'delete', 'settings'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => multiModal.openModal(type, `${type} 아이템`)}
                    className={`px-3 py-2 text-white rounded text-sm hover:opacity-90 ${
                      type === 'create' ? 'bg-green-500' :
                      type === 'edit' ? 'bg-yellow-500' :
                      type === 'delete' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}
                  >
                    Open {type}
                  </button>
                ))}
              </div>

              <button
                onClick={multiModal.closeAllModals}
                className="w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                Close All Modals
              </button>

              <StateBox title="Multi Modal State" color="purple">
                <div className="space-y-1">
                  <div>isAnyModalOpen: <strong>{multiModal.isAnyModalOpen ? 'true' : 'false'}</strong></div>
                  {Object.entries(multiModal.modals).map(([type, isOpen]) => (
                    <div key={type}>
                      {type}: <strong>{isOpen ? 'OPEN' : 'CLOSED'}</strong>
                      {multiModal.selectedItems[type] && (
                        <span className="text-purple-600"> ({multiModal.selectedItems[type]})</span>
                      )}
                    </div>
                  ))}
                </div>
              </StateBox>
            </div>
          </div>
        </section>

        {/* useSearch Hook 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔍 useSearch Hook</h2>

          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="검색어 입력 (제목, 채널명, 키워드)"
                value={videoSearch.searchTerm}
                onChange={(e) => videoSearch.setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => videoSearch.setSearchTerm('')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StateBox title="Search State" color="green">
                <div className="space-y-1">
                  <div>searchTerm: <strong>"{videoSearch.searchTerm}"</strong></div>
                  <div>전체 데이터: <strong>{testVideos.length}개</strong></div>
                  <div>검색 결과: <strong>{videoSearch.searchCount}개</strong></div>
                </div>
              </StateBox>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Filtered Results</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {videoSearch.filteredData.map((video) => (
                    <div key={video._id} className="text-sm bg-white p-2 rounded border">
                      <div className="font-medium">{video.title}</div>
                      <div className="text-gray-600">{video.channelName}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* useSelection Hook 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">✅ useSelection Hook</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* String Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">String Selection</h3>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => stringSelection.selectAll(testItems)}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Select All
                </button>
                <button
                  onClick={stringSelection.clear}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {testItems.map((item) => (
                  <button
                    key={item}
                    onClick={() => stringSelection.toggle(item)}
                    className={`px-3 py-2 rounded text-sm border ${
                      stringSelection.isSelected(item)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <StateBox title="String Selection State" color="blue">
                <div className="space-y-1">
                  <div>count: <strong>{stringSelection.count}</strong></div>
                  <div>hasSelection: <strong>{stringSelection.hasSelection ? 'true' : 'false'}</strong></div>
                  <div>selected: <strong>[{Array.from(stringSelection.selected).join(', ')}]</strong></div>
                </div>
              </StateBox>
            </div>

            {/* Number Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Number Selection</h3>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => numberSelection.selectAll([1, 2, 3, 4, 5])}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Select All Numbers
                </button>
                <button
                  onClick={numberSelection.clear}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => numberSelection.toggle(num)}
                    className={`px-3 py-2 rounded text-sm border ${
                      numberSelection.isSelected(num)
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <StateBox title="Number Selection State" color="purple">
                <div className="space-y-1">
                  <div>count: <strong>{numberSelection.count}</strong></div>
                  <div>hasSelection: <strong>{numberSelection.hasSelection ? 'true' : 'false'}</strong></div>
                  <div>selected: <strong>[{Array.from(numberSelection.selected).join(', ')}]</strong></div>
                </div>
              </StateBox>
            </div>
          </div>
        </section>

        {/* useFilter Hook 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎛️ useFilter Hook</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={videoFilter.filters.platform || ''}
                  onChange={(e) => videoFilter.updateFilter('platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Platforms</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="TIKTOK">TikTok</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select
                  value={videoFilter.filters.duration || ''}
                  onChange={(e) => videoFilter.updateFilter('duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Durations</option>
                  <option value="SHORT">Short (숏폼)</option>
                  <option value="MID">Mid (미드폼)</option>
                  <option value="LONG">Long (롱폼)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Views</label>
                <input
                  type="number"
                  placeholder="최소 조회수"
                  value={videoFilter.filters.minViews || ''}
                  onChange={(e) => videoFilter.updateFilter('minViews', Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={videoFilter.clearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StateBox title="Filter State" color="orange">
                <div className="space-y-1">
                  <div>activeFilterCount: <strong>{videoFilter.activeFilterCount}</strong></div>
                  <div>전체 데이터: <strong>{testVideos.length}개</strong></div>
                  <div>필터링 결과: <strong>{videoFilter.filterCount}개</strong></div>
                  <div>filters:</div>
                  <pre className="text-xs bg-orange-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(videoFilter.filters, null, 2)}
                  </pre>
                </div>
              </StateBox>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Filtered Videos</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {videoFilter.filteredData.map((video) => (
                    <div key={video._id} className="text-sm bg-white p-2 rounded border">
                      <div className="font-medium">{video.title}</div>
                      <div className="text-gray-600">
                        {video.platform} • {video.duration} • {video.views.toLocaleString()} views
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UI Hook 조합 시연 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔬 UI Hook 조합 패턴</h2>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">실제 활용 패턴들</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded border">
                <strong>Search + Filter:</strong><br />
                검색 결과를 다시 필터링하여 더 정밀한 결과
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Search + Selection:</strong><br />
                검색된 항목들을 선택하여 일괄 작업
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Filter + Selection:</strong><br />
                필터링된 결과에서 특정 항목들 선택
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Modal + Selection:</strong><br />
                선택된 항목들에 대한 모달 작업
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Search + Filter + Selection:</strong><br />
                3단계 조합으로 정확한 타겟팅
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>All Combined:</strong><br />
                5개 UI Hook의 완벽한 조합
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

UIHooksTestPage.displayName = 'UIHooksTestPage';

export default UIHooksTestPage;