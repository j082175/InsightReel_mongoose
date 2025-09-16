import React, { useState } from 'react';
import { SearchBar } from '../shared/components';
import { Video } from '../shared/types';

/**
 * SearchBarTestPage - SearchBar 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: SearchBar의 모든 기능과 상태를 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 기본 검색 기능
 * 2. 플레이스홀더 변경
 * 3. 검색어 초기화
 * 4. 실시간 검색 결과
 * 5. 검색 히스토리
 * 6. 다양한 크기 및 스타일
 */
const SearchBarTestPage: React.FC = () => {
  // 🎯 테스트용 비디오 데이터
  const testVideos: Video[] = [
    {
      _id: '1',
      title: 'React Hook 완벽 가이드',
      views: 1234567,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FF0000/FFFFFF?text=React',
      channelName: '개발자 TV',
      uploadDate: '2024-01-15T10:30:00Z',
      duration: 'LONG',
      keywords: ['React', 'Hook', '가이드', '튜토리얼'],
    },
    {
      _id: '2',
      title: 'JavaScript ES2024 신기능 소개',
      views: 89000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FFA500/FFFFFF?text=JS',
      channelName: 'JS 마스터',
      uploadDate: '2024-01-10T15:45:00Z',
      duration: 'MID',
      keywords: ['JavaScript', 'ES2024', '신기능'],
    },
    {
      _id: '3',
      title: 'TypeScript 고급 패턴과 실무 활용',
      views: 456000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/0066CC/FFFFFF?text=TS',
      channelName: 'TypeScript Pro',
      uploadDate: '2024-01-05T08:20:00Z',
      duration: 'LONG',
      keywords: ['TypeScript', '고급', '패턴', '실무'],
    },
    {
      _id: '4',
      title: 'Next.js 14 새로운 기능 둘러보기',
      views: 234000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/000000/FFFFFF?text=Next',
      channelName: 'Next.js Korea',
      uploadDate: '2024-01-01T12:00:00Z',
      duration: 'MID',
      keywords: ['Next.js', '14', '새기능', '둘러보기'],
    },
    {
      _id: '5',
      title: 'CSS Grid vs Flexbox 완벽 비교',
      views: 178000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/9932CC/FFFFFF?text=CSS',
      channelName: 'CSS 전문가',
      uploadDate: '2023-12-28T16:30:00Z',
      duration: 'LONG',
      keywords: ['CSS', 'Grid', 'Flexbox', '비교'],
    },
  ];

  // 🔍 검색 상태 관리
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');

  // 검색 핸들러
  const handleSearch = (query: string) => {
    setCurrentQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // 검색 로직
    const results = testVideos.filter(
      (video) =>
        video.title.toLowerCase().includes(query.toLowerCase()) ||
        video.channelName.toLowerCase().includes(query.toLowerCase()) ||
        video.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query.toLowerCase())
        )
    );

    setSearchResults(results);

    // 검색 히스토리 업데이트
    if (query.length > 1 && !searchHistory.includes(query)) {
      setSearchHistory((prev) => [query, ...prev.slice(0, 4)]); // 최대 5개 유지
    }
  };

  // 검색어 초기화
  const handleClear = () => {
    setCurrentQuery('');
    setSearchResults([]);
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔍 SearchBar Component Test
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            SearchBar 컴포넌트의 모든 기능과 상태를 테스트합니다.
          </p>
        </div>

        {/* 기본 SearchBar 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🎯 기본 검색 기능
          </h2>

          <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              실시간 검색
            </h3>
            <SearchBar
              placeholder="비디오 제목, 채널명, 키워드로 검색..."
              onSearch={handleSearch}
              onClear={handleClear}
              value={currentQuery}
            />

            {/* 검색 결과 표시 */}
            {currentQuery && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>"{currentQuery}"</strong> 검색 결과:{' '}
                  {searchResults.length}개
                </p>

                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((video) => (
                      <div
                        key={video._id}
                        className="p-3 bg-white rounded border"
                      >
                        <h4 className="font-medium text-gray-900">
                          {video.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {video.channelName}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {video.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">검색 결과가 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 다양한 플레이스홀더 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📝 플레이스홀더 변형
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                기본 플레이스홀더
              </h3>
              <SearchBar
                placeholder="검색어를 입력하세요..."
                onSearch={() => {}}
              />
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                구체적 안내
              </h3>
              <SearchBar
                placeholder="채널명 또는 비디오 제목으로 검색"
                onSearch={() => {}}
              />
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                예시 포함
              </h3>
              <SearchBar
                placeholder="예: React, JavaScript, CSS..."
                onSearch={() => {}}
              />
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                액션 안내
              </h3>
              <SearchBar
                placeholder="Enter 키를 누르거나 돋보기를 클릭하세요"
                onSearch={() => {}}
              />
            </div>
          </div>
        </section>

        {/* 검색 히스토리 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📜 검색 히스토리
          </h2>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                최근 검색어
              </h3>
              <button
                onClick={() => setSearchHistory([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                전체 삭제
              </button>
            </div>

            {searchHistory.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(query)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">검색 히스토리가 없습니다.</p>
            )}
          </div>
        </section>

        {/* 크기 및 스타일 변형 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🎨 크기 및 스타일 변형
          </h2>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                컴팩트 사이즈
              </h3>
              <div className="max-w-sm">
                <SearchBar placeholder="컴팩트 검색" onSearch={() => {}} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                풀 사이즈
              </h3>
              <SearchBar placeholder="전체 너비 검색바" onSearch={() => {}} />
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                중간 사이즈
              </h3>
              <div className="max-w-md mx-auto">
                <SearchBar placeholder="중간 크기 검색" onSearch={() => {}} />
              </div>
            </div>
          </div>
        </section>

        {/* 기능 상태 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ⚙️ 기능 상태 테스트
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                초기화 기능
              </h3>
              <SearchBar
                placeholder="검색 후 X 버튼 확인"
                onSearch={() => {}}
                onClear={() => console.log('검색어 초기화됨')}
              />
              <p className="text-sm text-gray-600 mt-2">
                검색어 입력 후 X 버튼으로 초기화 테스트
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                엔터키 검색
              </h3>
              <SearchBar
                placeholder="엔터키로 검색"
                onSearch={(query) => console.log('엔터키 검색:', query)}
              />
              <p className="text-sm text-gray-600 mt-2">
                콘솔에서 엔터키 검색 이벤트 확인
              </p>
            </div>
          </div>
        </section>

        {/* 접근성 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ♿ 접근성 테스트
          </h2>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              키보드 네비게이션
            </h3>
            <SearchBar
              placeholder="Tab 키로 포커스, Enter로 검색, Escape로 초기화"
              onSearch={() => {}}
            />
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h4 className="font-medium text-blue-900 mb-2">키보드 단축키</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • <kbd className="px-2 py-1 bg-white rounded shadow">Tab</kbd>{' '}
                  - 검색바로 포커스 이동
                </li>
                <li>
                  •{' '}
                  <kbd className="px-2 py-1 bg-white rounded shadow">Enter</kbd>{' '}
                  - 검색 실행
                </li>
                <li>
                  •{' '}
                  <kbd className="px-2 py-1 bg-white rounded shadow">
                    Escape
                  </kbd>{' '}
                  - 검색어 초기화
                </li>
                <li>
                  •{' '}
                  <kbd className="px-2 py-1 bg-white rounded shadow">
                    Ctrl + A
                  </kbd>{' '}
                  - 전체 선택
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 테스트 통계 */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📊 테스트 현황
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {testVideos.length}
                </div>
                <div className="text-sm text-gray-600">테스트 데이터</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {searchHistory.length}
                </div>
                <div className="text-sm text-gray-600">검색 히스토리</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {searchResults.length}
                </div>
                <div className="text-sm text-gray-600">검색 결과</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {currentQuery.length}
                </div>
                <div className="text-sm text-gray-600">현재 검색어 길이</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SearchBarTestPage;
