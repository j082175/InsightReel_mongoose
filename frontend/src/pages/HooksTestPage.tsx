import React, { memo, useState } from 'react';
import { useModal, useMultiModal, useSearch, useSelection, useFilter, useAPIStatus } from '../shared/hooks';
import { useVideos, useChannels, useTrendingStats, useQuotaStatus, useServerStatus, useCollectTrending } from '../shared/hooks/useApi';
import { Video } from '../shared/types';

const HooksTestPage: React.FC = memo(() => {
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

  // 📊 Hook 인스턴스들
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

  // 🌐 실제 API Hook 테스트
  const { data: realVideos, isLoading: videosLoading, error: videosError } = useVideos();
  const { data: realChannels, isLoading: channelsLoading, error: channelsError } = useChannels();

  // 🆕 추가 API Hook 테스트
  const { data: apiStatus, isLoading: apiStatusLoading, error: apiStatusError } = useAPIStatus();
  const { data: trendingStats, isLoading: trendingStatsLoading, error: trendingStatsError } = useTrendingStats();
  const { data: quotaStatus, isLoading: quotaStatusLoading, error: quotaStatusError } = useQuotaStatus();
  const { data: serverStatus, isLoading: serverStatusLoading, error: serverStatusError } = useServerStatus();
  const collectTrendingMutation = useCollectTrending();

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 Hooks Laboratory</h1>
          <p className="text-lg text-gray-600 mb-4">총 12개 커스텀 Hook을 UI Hook과 API Hook으로 분류하여 실시간 테스트할 수 있는 실험실입니다.</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">🎨 UI Hook 5개</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">🌐 API Hook 7개</span>
          </div>
        </div>

        {/* =============================================== */}
        {/* 🎨 UI HOOK 섹션 */}
        {/* =============================================== */}
        <div className="mb-16">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">🎨 UI Hook 테스트</h2>
            <p className="text-gray-700 mb-4">
              사용자 인터페이스 상태 관리를 담당하는 Hook들입니다.
              서버 통신 없이 브라우저 메모리에서 동작하며, 모달, 선택, 검색, 필터링 등의 UI 상태를 관리합니다.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded">useModal</span>
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded">useMultiModal</span>
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded">useSelection</span>
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded">useSearch</span>
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded">useFilter</span>
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

        </div> {/* UI Hook 섹션 종료 */}

        {/* =============================================== */}
        {/* 🌐 API HOOK 섹션 */}
        {/* =============================================== */}
        <div className="mb-16">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">🌐 API Hook 테스트</h2>
            <p className="text-gray-700 mb-4">
              서버와의 데이터 통신을 담당하는 Hook들입니다.
              HTTP 요청, 로딩 상태, 에러 처리, 캐싱 등을 관리하며 실제 백엔드 API와 연동하여 동작합니다.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded">useVideos</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded">useChannels</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded">useAPIStatus</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded">useTrendingStats</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded">useQuotaStatus</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded">useServerStatus</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded">useCollectTrending</span>
            </div>
          </div>

        {/* 기본 API Hook 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🌐 기본 API Hooks</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StateBox title="useVideos Hook" color="green">
              <div className="space-y-2">
                <div>isLoading: <strong>{videosLoading ? 'true' : 'false'}</strong></div>
                <div>hasError: <strong>{videosError ? 'true' : 'false'}</strong></div>
                <div>dataCount: <strong>{realVideos?.length || 0}개</strong></div>
                {videosError && (
                  <div className="text-red-600 text-xs">
                    Error: {videosError.message}
                  </div>
                )}
                {realVideos && realVideos.length > 0 && (
                  <div className="text-xs">
                    <div>첫 번째 비디오: {realVideos[0].title}</div>
                  </div>
                )}
              </div>
            </StateBox>

            <StateBox title="useChannels Hook" color="blue">
              <div className="space-y-2">
                <div>isLoading: <strong>{channelsLoading ? 'true' : 'false'}</strong></div>
                <div>hasError: <strong>{channelsError ? 'true' : 'false'}</strong></div>
                <div>dataCount: <strong>{realChannels?.length || 0}개</strong></div>
                {channelsError && (
                  <div className="text-red-600 text-xs">
                    Error: {channelsError.message}
                  </div>
                )}
                {realChannels && realChannels.length > 0 && (
                  <div className="text-xs">
                    <div>첫 번째 채널: {realChannels[0].name}</div>
                  </div>
                )}
              </div>
            </StateBox>
          </div>
        </section>

        {/* 🆕 고급 API Hook 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚡ 고급 API Hooks</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* useAPIStatus */}
            <StateBox title="useAPIStatus Hook" color="cyan">
              <div className="space-y-2">
                <div>isLoading: <strong>{apiStatusLoading ? 'true' : 'false'}</strong></div>
                <div>hasError: <strong>{apiStatusError ? 'true' : 'false'}</strong></div>
                {apiStatusError && (
                  <div className="text-red-600 text-xs">
                    Error: {apiStatusError.message}
                  </div>
                )}
                {apiStatus && (
                  <div className="text-xs space-y-1">
                    <div>총 API 키: <strong>{apiStatus.totalKeys}개</strong></div>
                    <div>사용 가능: <strong>{apiStatus.availableKeys}개</strong></div>
                    <div>전체 사용량: <strong>{apiStatus.totalUsage.usagePercentage}%</strong></div>
                    <div>현재 키: <strong>{apiStatus.currentKey.name}</strong></div>
                    {apiStatus.gemini && (
                      <div className="mt-2 pt-2 border-t border-cyan-200">
                        <div className="text-cyan-700 font-medium">Gemini 사용량:</div>
                        <div>Pro: {apiStatus.gemini.pro.usagePercent}%</div>
                        <div>Flash: {apiStatus.gemini.flash.usagePercent}%</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </StateBox>

            {/* useTrendingStats */}
            <StateBox title="useTrendingStats Hook" color="pink">
              <div className="space-y-2">
                <div>isLoading: <strong>{trendingStatsLoading ? 'true' : 'false'}</strong></div>
                <div>hasError: <strong>{trendingStatsError ? 'true' : 'false'}</strong></div>
                {trendingStatsError && (
                  <div className="text-red-600 text-xs">
                    Error: {trendingStatsError.message}
                  </div>
                )}
                {trendingStats && (
                  <div className="text-xs space-y-1">
                    <div>데이터 타입: <strong>{typeof trendingStats}</strong></div>
                    <div className="bg-pink-100 p-2 rounded text-pink-800 max-h-20 overflow-y-auto">
                      <pre>{JSON.stringify(trendingStats, null, 1)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </StateBox>

            {/* useQuotaStatus */}
            <StateBox title="useQuotaStatus Hook" color="yellow">
              <div className="space-y-2">
                <div>isLoading: <strong>{quotaStatusLoading ? 'true' : 'false'}</strong></div>
                <div>hasError: <strong>{quotaStatusError ? 'true' : 'false'}</strong></div>
                {quotaStatusError && (
                  <div className="text-red-600 text-xs">
                    Error: {quotaStatusError.message}
                  </div>
                )}
                {quotaStatus && (
                  <div className="text-xs space-y-1">
                    <div>데이터 타입: <strong>{typeof quotaStatus}</strong></div>
                    <div className="bg-yellow-100 p-2 rounded text-yellow-800 max-h-20 overflow-y-auto">
                      <pre>{JSON.stringify(quotaStatus, null, 1)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </StateBox>

            {/* useServerStatus */}
            <StateBox title="useServerStatus Hook" color="indigo">
              <div className="space-y-2">
                <div>isLoading: <strong>{serverStatusLoading ? 'true' : 'false'}</strong></div>
                <div>hasError: <strong>{serverStatusError ? 'true' : 'false'}</strong></div>
                {serverStatusError && (
                  <div className="text-red-600 text-xs">
                    Error: {serverStatusError.message}
                  </div>
                )}
                {serverStatus && (
                  <div className="text-xs space-y-1">
                    <div>상태: <strong>{serverStatus.success ? '✅ 정상' : '❌ 오류'}</strong></div>
                    {serverStatus.message && (
                      <div>메시지: <strong>{serverStatus.message}</strong></div>
                    )}
                    <div className="bg-indigo-100 p-2 rounded text-indigo-800 max-h-20 overflow-y-auto">
                      <pre>{JSON.stringify(serverStatus, null, 1)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </StateBox>

            {/* useCollectTrending */}
            <StateBox title="useCollectTrending Hook" color="emerald">
              <div className="space-y-2">
                <div>isPending: <strong>{collectTrendingMutation.isPending ? 'true' : 'false'}</strong></div>
                <div>isSuccess: <strong>{collectTrendingMutation.isSuccess ? 'true' : 'false'}</strong></div>
                <div>isError: <strong>{collectTrendingMutation.isError ? 'true' : 'false'}</strong></div>

                <div className="space-y-2">
                  <button
                    onClick={() => collectTrendingMutation.mutate()}
                    disabled={collectTrendingMutation.isPending}
                    className={`w-full px-3 py-2 rounded text-sm ${
                      collectTrendingMutation.isPending
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {collectTrendingMutation.isPending ? '수집 중...' : '트렌딩 수집 시작'}
                  </button>
                </div>

                {collectTrendingMutation.isError && (
                  <div className="text-red-600 text-xs">
                    Error: {collectTrendingMutation.error?.message}
                  </div>
                )}
                {collectTrendingMutation.isSuccess && (
                  <div className="text-emerald-600 text-xs">
                    ✅ 수집 완료!
                  </div>
                )}
              </div>
            </StateBox>
          </div>
        </section>

        </div> {/* API Hook 섹션 종료 */}

        {/* =============================================== */}
        {/* 🔬 HOOK 조합 및 요약 섹션 */}
        {/* =============================================== */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">🔬 Hook 조합 시연</h2>
            <p className="text-gray-700 mb-4">
              UI Hook과 API Hook을 조합하여 더 강력한 기능을 만들어내는 패턴들을 소개합니다.
              실제 애플리케이션에서는 이런 조합들이 복합적으로 사용됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* UI Hook 조합 패턴 */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">🎨 UI Hook 조합 패턴</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <strong className="text-blue-800">Search + Filter:</strong><br />
                  <span className="text-gray-600">검색 결과를 다시 필터링하여 더 정밀한 결과</span>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <strong className="text-blue-800">Search + Selection:</strong><br />
                  <span className="text-gray-600">검색된 항목들을 선택하여 일괄 작업</span>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <strong className="text-blue-800">Filter + Selection + Modal:</strong><br />
                  <span className="text-gray-600">필터링된 항목 선택 후 모달에서 상세 작업</span>
                </div>
              </div>
            </div>

            {/* API Hook 조합 패턴 */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-green-900 mb-4">🌐 API Hook 조합 패턴</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-green-200">
                  <strong className="text-green-800">API Status + Server Status:</strong><br />
                  <span className="text-gray-600">API 할당량과 서버 상태를 동시 모니터링</span>
                </div>
                <div className="bg-white p-3 rounded border border-green-200">
                  <strong className="text-green-800">Collect + Videos + Stats:</strong><br />
                  <span className="text-gray-600">트렌딩 수집 후 비디오 목록과 통계 자동 갱신</span>
                </div>
                <div className="bg-white p-3 rounded border border-green-200">
                  <strong className="text-green-800">Videos + Channels + TrendingStats:</strong><br />
                  <span className="text-gray-600">다중 데이터 소스 동시 로딩 및 동기화</span>
                </div>
              </div>
            </div>
          </div>

          {/* 전체 Hook 현황 요약 */}
          <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">📊 Hook 생태계 요약</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-3xl font-bold text-blue-600 mb-2">5개</div>
                <div className="text-lg font-semibold text-gray-800">🎨 UI Hook</div>
                <div className="text-sm text-gray-600 mt-2">
                  Modal, Selection, Search, Filter 등<br />
                  브라우저 메모리 상태 관리
                </div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-3xl font-bold text-green-600 mb-2">7개</div>
                <div className="text-lg font-semibold text-gray-800">🌐 API Hook</div>
                <div className="text-sm text-gray-600 mt-2">
                  Videos, Channels, Stats 등<br />
                  서버 통신 및 데이터 관리
                </div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-3xl font-bold text-purple-600 mb-2">12개</div>
                <div className="text-lg font-semibold text-gray-800">🔗 전체 Hook</div>
                <div className="text-sm text-gray-600 mt-2">
                  완전한 Hook 생태계<br />
                  무한 조합 가능
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

HooksTestPage.displayName = 'HooksTestPage';

export default HooksTestPage;