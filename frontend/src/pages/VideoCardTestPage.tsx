import React, { useState } from 'react';
import { VideoCard } from '../shared/components';
import { Video } from '../shared/types';

/**
 * VideoCardTestPage - VideoCard 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: VideoCard의 모든 변형과 상태를 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 다양한 플랫폼 (YouTube, Instagram, TikTok)
 * 2. 영상 길이별 구분 (SHORT, MID, LONG)
 * 3. 선택 모드 vs 일반 모드
 * 4. 조회수 다양한 범위
 * 5. 썸네일 로딩 상태
 * 6. 클릭 이벤트 처리
 */
const VideoCardTestPage: React.FC = () => {
  // 🎬 테스트용 비디오 데이터
  const testVideos: Video[] = [
    {
      _id: '1',
      title: 'React 18 완벽 가이드 - Concurrent Features Deep Dive',
      views: 1234567,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FF0000/FFFFFF?text=React+18',
      channelName: 'React 마스터 채널',
      uploadDate: '2024-01-15T10:30:00Z',
      duration: 'LONG',
      keywords: ['React', '18', 'Concurrent', 'Deep Dive'],
    },
    {
      _id: '2',
      title: 'JavaScript 60초 팁',
      views: 89000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FFA500/FFFFFF?text=JS+Tips',
      channelName: 'JS 전문가',
      uploadDate: '2024-01-10T15:45:00Z',
      duration: 'SHORT',
      keywords: ['JavaScript', '팁', '60초'],
    },
    {
      _id: '3',
      title: 'TypeScript 고급 패턴 실무 활용법',
      views: 456000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/0066CC/FFFFFF?text=TypeScript',
      channelName: 'TypeScript Korea',
      uploadDate: '2024-01-05T08:20:00Z',
      duration: 'MID',
      keywords: ['TypeScript', '고급', '패턴', '실무'],
    },
    {
      _id: '4',
      title: '인스타그램 개발 비하인드',
      views: 234000,
      platform: 'INSTAGRAM',
      thumbnailUrl: 'https://placehold.co/320x180/E4405F/FFFFFF?text=Instagram',
      channelName: 'Instagram Developers',
      uploadDate: '2024-01-01T12:00:00Z',
      duration: 'MID',
      keywords: ['Instagram', '개발', '비하인드'],
    },
    {
      _id: '5',
      title: '틱톡 알고리즘 분석',
      views: 1500000,
      platform: 'TIKTOK',
      thumbnailUrl: 'https://placehold.co/320x180/000000/FFFFFF?text=TikTok',
      channelName: 'TikTok Analytics',
      uploadDate: '2023-12-28T16:30:00Z',
      duration: 'SHORT',
      keywords: ['TikTok', '알고리즘', '분석'],
    },
    {
      _id: '6',
      title: '조회수 적은 영상 예시',
      views: 1203,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/808080/FFFFFF?text=Low+Views',
      channelName: '소규모 채널',
      uploadDate: '2024-01-20T09:15:00Z',
      duration: 'LONG',
      keywords: ['예시', '소규모'],
    },
    {
      _id: '7',
      title: '엄청난 인기 영상',
      views: 50000000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FFD700/000000?text=Viral',
      channelName: '메가 채널',
      uploadDate: '2024-01-18T20:00:00Z',
      duration: 'MID',
      keywords: ['바이럴', '인기'],
    },
  ];

  // 🎛️ 상태 관리
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [clickedVideo, setClickedVideo] = useState<string | null>(null);

  // 선택 토글
  const handleToggleSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  // 카드 클릭
  const handleCardClick = (video: Video) => {
    setClickedVideo(video._id);
    setTimeout(() => setClickedVideo(null), 1000); // 1초 후 초기화
  };

  // 비디오 삭제
  const handleVideoDelete = (video: Video) => {
    console.log('비디오 삭제:', video.title);
    // 테스트용 삭제 로직
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-7xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎬 VideoCard Component Test
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            VideoCard 컴포넌트의 모든 변형과 상태를 테스트합니다.
          </p>

          {/* 컨트롤 패널 */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelectionMode}
                onChange={(e) => setIsSelectionMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">선택 모드</span>
            </label>

            {isSelectionMode && (
              <>
                <button
                  onClick={() => setSelectedVideos(new Set(testVideos.map(v => v._id)))}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  전체 선택
                </button>
                <button
                  onClick={() => setSelectedVideos(new Set())}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  선택 해제
                </button>
                <span className="text-sm text-gray-600">
                  {selectedVideos.size}개 선택됨
                </span>
              </>
            )}
          </div>
        </div>

        {/* 플랫폼별 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🌐 플랫폼별 VideoCard</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['YOUTUBE', 'INSTAGRAM', 'TIKTOK'].map(platform => {
              const video = testVideos.find(v => v.platform === platform);
              if (!video) return null;

              return (
                <div key={platform} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">{platform}</h3>
                  <VideoCard
                    video={video}
                    isSelected={selectedVideos.has(video._id)}
                    isSelectMode={isSelectionMode}
                    onSelectToggle={handleToggleSelection}
                    onClick={handleCardClick}
                    onDelete={handleVideoDelete}
                  />
                  {clickedVideo === video._id && (
                    <div className="p-2 bg-green-100 text-green-800 rounded text-sm">
                      ✅ 카드 클릭됨!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 영상 길이별 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⏱️ 영상 길이별 분류</h2>

          <div className="space-y-8">
            {['SHORT', 'MID', 'LONG'].map(duration => {
              const videos = testVideos.filter(v => v.duration === duration);
              const durationLabels = {
                SHORT: '숏폼 (60초 이하)',
                MID: '미드폼 (1-3분)',
                LONG: '롱폼 (3분 이상)'
              };

              return (
                <div key={duration}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {durationLabels[duration as keyof typeof durationLabels]}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {videos.map(video => (
                      <VideoCard
                        key={video._id}
                        video={video}
                        isSelected={selectedVideos.has(video._id)}
                        isSelectMode={isSelectionMode}
                        onSelectToggle={handleToggleSelection}
                        onClick={handleCardClick}
                        onDelete={handleVideoDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 조회수 범위별 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">👀 조회수 범위별 표시</h2>

          <div className="space-y-6">
            {[
              { range: '1천 미만', videos: testVideos.filter(v => v.views < 1000) },
              { range: '1천 - 10만', videos: testVideos.filter(v => v.views >= 1000 && v.views < 100000) },
              { range: '10만 - 100만', videos: testVideos.filter(v => v.views >= 100000 && v.views < 1000000) },
              { range: '100만 이상', videos: testVideos.filter(v => v.views >= 1000000) },
            ].map(({ range, videos }) => (
              <div key={range}>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {range} ({videos.length}개)
                </h3>
                {videos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {videos.map(video => (
                      <VideoCard
                        key={video._id}
                        video={video}
                        isSelected={selectedVideos.has(video._id)}
                        isSelectMode={isSelectionMode}
                        onSelectToggle={handleToggleSelection}
                        onClick={handleCardClick}
                        onDelete={handleVideoDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">해당 범위의 영상이 없습니다.</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 상태별 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎛️ 상태별 테스트</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 일반 모드 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">일반 모드</h3>
              <VideoCard
                video={testVideos[0]}
                isSelected={false}
                isSelectMode={false}
                onClick={handleCardClick}
              />
              <p className="text-sm text-gray-600 mt-3">
                클릭하면 비디오 상세 페이지로 이동하는 기본 모드
              </p>
            </div>

            {/* 선택 모드 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">선택 모드</h3>
              <VideoCard
                video={testVideos[1]}
                isSelected={selectedVideos.has(testVideos[1]._id)}
                isSelectMode={true}
                onSelectToggle={handleToggleSelection}
                onClick={handleCardClick}
              />
              <p className="text-sm text-gray-600 mt-3">
                체크박스가 표시되어 다중 선택이 가능한 모드
              </p>
            </div>

            {/* 선택된 상태 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">선택된 상태</h3>
              <VideoCard
                video={testVideos[2]}
                isSelected={true}
                isSelectMode={true}
                onSelectToggle={handleToggleSelection}
                onClick={handleCardClick}
              />
              <p className="text-sm text-gray-600 mt-3">
                선택된 상태의 카드 (파란색 테두리와 체크 표시)
              </p>
            </div>

            {/* 호버 상태 시뮬레이션 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">호버 효과</h3>
              <div className="transform hover:scale-105 transition-transform duration-200">
                <VideoCard
                  video={testVideos[3]}
                  isSelected={false}
                  isSelectMode={false}
                  onClick={handleCardClick}
                />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                마우스 오버 시 확대 효과 (위 카드에 마우스 올려보세요)
              </p>
            </div>
          </div>
        </section>

        {/* 레이아웃 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📐 레이아웃 테스트</h2>

          <div className="space-y-8">
            {/* 1열 레이아웃 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">1열 레이아웃 (모바일)</h3>
              <div className="grid grid-cols-1 gap-4 max-w-sm">
                {testVideos.slice(0, 2).map(video => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    isSelected={selectedVideos.has(video._id)}
                    isSelectMode={isSelectionMode}
                    onSelectToggle={handleToggleSelection}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            </div>

            {/* 2열 레이아웃 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">2열 레이아웃 (태블릿)</h3>
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {testVideos.slice(0, 4).map(video => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    isSelected={selectedVideos.has(video._id)}
                    isSelectMode={isSelectionMode}
                    onSelectToggle={handleToggleSelection}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            </div>

            {/* 4열 레이아웃 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">4열 레이아웃 (데스크톱)</h3>
              <div className="grid grid-cols-4 gap-4">
                {testVideos.slice(0, 4).map(video => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    isSelected={selectedVideos.has(video._id)}
                    isSelectMode={isSelectionMode}
                    onSelectToggle={handleToggleSelection}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 테스트 통계 */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 VideoCard 테스트 통계</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{testVideos.length}</div>
                <div className="text-sm text-gray-600">총 테스트 영상</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">
                  {new Set(testVideos.map(v => v.platform)).size}
                </div>
                <div className="text-sm text-gray-600">지원 플랫폼</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedVideos.size}</div>
                <div className="text-sm text-gray-600">선택된 영상</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((selectedVideos.size / testVideos.length) * 100)}%
                </div>
                <div className="text-sm text-gray-600">선택 비율</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">💡 테스트 가이드</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 각 카드를 클릭하여 클릭 이벤트 동작 확인</li>
                <li>• 선택 모드 토글로 체크박스 표시/숨김 테스트</li>
                <li>• 다양한 조회수와 플랫폼별 스타일 차이 확인</li>
                <li>• 반응형 레이아웃이 화면 크기에 따라 변화하는지 확인</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VideoCardTestPage;