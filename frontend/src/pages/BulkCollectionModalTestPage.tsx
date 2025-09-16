import React, { useState } from 'react';
import BulkCollectionModal from '../features/trending-collection/ui/BulkCollectionModal';
import { CollectionBatch, Video } from '../shared/types';

/**
 * BulkCollectionModalTestPage - BulkCollectionModal 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: BulkCollectionModal의 모든 기능과 수집 시나리오를 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 다양한 채널 선택 시나리오 (단일, 다중, 전체)
 * 2. 수집 조건 설정 (기간, 조회수, 영상 길이, 키워드)
 * 3. 실시간 수집 진행 상황 모니터링
 * 4. 채널별 수집 결과 및 에러 처리
 * 5. 수집 완료 후 결과 처리
 * 6. 필터 프리셋 및 저장/불러오기
 */
const BulkCollectionModalTestPage: React.FC = () => {
  // 🎛️ 테스트 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [allVisibleChannels, setAllVisibleChannels] = useState<string[]>([]);
  const [testActions, setTestActions] = useState<string[]>([]);
  const [collectionHistory, setCollectionHistory] = useState<
    Array<{
      batch: CollectionBatch;
      videos: Video[];
      timestamp: string;
    }>
  >([]);

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions((prev) => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 테스트용 채널 데이터
  const testChannels = [
    {
      id: 'UC-tech-1',
      name: '노마드 코더',
      platform: 'YOUTUBE',
      category: '테크',
    },
    {
      id: 'UC-tech-2',
      name: '생활코딩',
      platform: 'YOUTUBE',
      category: '테크',
    },
    {
      id: 'UC-food-1',
      name: '백종원의 요리비책',
      platform: 'YOUTUBE',
      category: '요리',
    },
    { id: 'UC-food-2', name: '쯔양', platform: 'YOUTUBE', category: '요리' },
    {
      id: 'IG-kpop-1',
      name: 'BTS Instagram',
      platform: 'INSTAGRAM',
      category: 'K-POP',
    },
    {
      id: 'IG-kpop-2',
      name: 'BLACKPINK Instagram',
      platform: 'INSTAGRAM',
      category: 'K-POP',
    },
    {
      id: 'TT-dance-1',
      name: 'Dance Trends TikTok',
      platform: 'TIKTOK',
      category: '댄스',
    },
    { id: 'UC-game-1', name: '우왁굳', platform: 'YOUTUBE', category: '게임' },
    { id: 'UC-game-2', name: '풍월량', platform: 'YOUTUBE', category: '게임' },
    { id: 'UC-edu-1', name: 'EBS', platform: 'YOUTUBE', category: '교육' },
    {
      id: 'TT-comedy-1',
      name: 'Comedy TikTok',
      platform: 'TIKTOK',
      category: '코미디',
    },
    {
      id: 'IG-fashion-1',
      name: 'Fashion Influencer',
      platform: 'INSTAGRAM',
      category: '패션',
    },
  ];

  // 테스트 시나리오
  const testScenarios = [
    {
      name: '단일 채널 수집',
      description: '단일 채널의 최근 영상 수집',
      channels: ['UC-tech-1'],
      icon: '🎯',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: '동일 카테고리 수집',
      description: '테크 카테고리 채널들의 트렌딩 수집',
      channels: ['UC-tech-1', 'UC-tech-2'],
      icon: '📱',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      name: '혼합 플랫폼 수집',
      description: 'YouTube, Instagram, TikTok 혼합 수집',
      channels: ['UC-food-1', 'IG-kpop-1', 'TT-dance-1'],
      icon: '🌐',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      name: '대량 채널 수집',
      description: '모든 채널 대량 수집 (성능 테스트)',
      channels: testChannels.map((ch) => ch.id),
      icon: '📊',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      name: 'K-POP 전문 수집',
      description: 'K-POP 관련 채널들만 선별 수집',
      channels: ['IG-kpop-1', 'IG-kpop-2', 'TT-dance-1'],
      icon: '💜',
      color: 'bg-pink-500 hover:bg-pink-600',
    },
    {
      name: '교육 콘텐츠 수집',
      description: '교육/강의 채널 전문 수집',
      channels: ['UC-tech-1', 'UC-tech-2', 'UC-edu-1'],
      icon: '📚',
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      name: '숏폼 전용 수집',
      description: 'TikTok/Instagram 숏폼 콘텐츠만',
      channels: ['TT-dance-1', 'TT-comedy-1', 'IG-kpop-1', 'IG-fashion-1'],
      icon: '⚡',
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
    {
      name: '게임 실황 수집',
      description: '게임 실황 채널들의 인기 영상',
      channels: ['UC-game-1', 'UC-game-2'],
      icon: '🎮',
      color: 'bg-violet-500 hover:bg-violet-600',
    },
  ];

  // 이벤트 핸들러
  const handleOpenModal = (scenario: (typeof testScenarios)[0]) => {
    setSelectedChannels(scenario.channels);
    setAllVisibleChannels(testChannels.map((ch) => ch.id));
    setIsModalOpen(true);
    addTestLog(
      `대량 수집 시작: ${scenario.name} (${scenario.channels.length}개 채널)`
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChannels([]);
    addTestLog('대량 수집 모달 닫기');
  };

  const handleCollectionComplete = (
    batch: CollectionBatch,
    videos: Video[]
  ) => {
    const historyEntry = {
      batch,
      videos,
      timestamp: new Date().toISOString(),
    };
    setCollectionHistory((prev) => [historyEntry, ...prev.slice(0, 4)]);
    addTestLog(`수집 완료: ${batch.name} (${videos.length}개 영상)`);
  };

  const handleCustomSelection = (channelIds: string[]) => {
    setSelectedChannels(channelIds);
    setAllVisibleChannels(testChannels.map((ch) => ch.id));
    setIsModalOpen(true);
    addTestLog(`커스텀 선택: ${channelIds.length}개 채널`);
  };

  const handleSelectAll = () => {
    const allChannelIds = testChannels.map((ch) => ch.id);
    handleCustomSelection(allChannelIds);
  };

  const handleSelectByCategory = (category: string) => {
    const categoryChannels = testChannels
      .filter((ch) => ch.category === category)
      .map((ch) => ch.id);
    handleCustomSelection(categoryChannels);
  };

  const handleSelectByPlatform = (platform: string) => {
    const platformChannels = testChannels
      .filter((ch) => ch.platform === platform)
      .map((ch) => ch.id);
    handleCustomSelection(platformChannels);
  };

  const getChannelInfo = (channelId: string) => {
    return testChannels.find((ch) => ch.id === channelId);
  };

  // 통계 계산
  const totalCollections = collectionHistory.length;
  const totalVideos = collectionHistory.reduce(
    (sum, entry) => sum + entry.videos.length,
    0
  );
  const platformStats = testChannels.reduce(
    (acc, ch) => {
      acc[ch.platform] = (acc[ch.platform] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 테스트 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            📊 BulkCollectionModal Component Test
          </h1>
          <p className="text-gray-600 mt-1">
            BulkCollectionModal 컴포넌트의 대량 수집 기능을 테스트합니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 테스트 통계 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📈 테스트 통계
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-gray-800">
                  {testChannels.length}
                </div>
                <div className="text-xs text-gray-600">테스트 채널</div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-blue-700">
                  {platformStats.YOUTUBE || 0}
                </div>
                <div className="text-xs text-blue-600">YouTube</div>
              </div>
              <div className="bg-pink-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-pink-700">
                  {platformStats.INSTAGRAM || 0}
                </div>
                <div className="text-xs text-pink-600">Instagram</div>
              </div>
              <div className="bg-black bg-opacity-10 p-3 rounded text-center">
                <div className="text-lg font-bold text-gray-800">
                  {platformStats.TIKTOK || 0}
                </div>
                <div className="text-xs text-gray-600">TikTok</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-green-700">
                  {totalCollections}
                </div>
                <div className="text-xs text-green-600">수집 횟수</div>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-purple-700">
                  {totalVideos}
                </div>
                <div className="text-xs text-purple-600">총 수집 영상</div>
              </div>
            </div>
          </section>

          {/* 테스트 컨트롤 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎛️ 테스트 컨트롤
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">전체 선택</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleSelectAll}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    모든 채널 ({testChannels.length}개)
                  </button>
                  <div className="text-xs text-gray-500">
                    모든 테스트 채널을 선택하여 대량 수집 성능 테스트
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  플랫폼별 선택
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSelectByPlatform('YOUTUBE')}
                    className="w-full px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    YouTube ({platformStats.YOUTUBE}개)
                  </button>
                  <button
                    onClick={() => handleSelectByPlatform('INSTAGRAM')}
                    className="w-full px-3 py-1.5 bg-pink-500 text-white rounded hover:bg-pink-600 text-sm"
                  >
                    Instagram ({platformStats.INSTAGRAM}개)
                  </button>
                  <button
                    onClick={() => handleSelectByPlatform('TIKTOK')}
                    className="w-full px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm"
                  >
                    TikTok ({platformStats.TIKTOK}개)
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">카테고리별</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSelectByCategory('테크')}
                    className="w-full px-3 py-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                  >
                    테크 (2개)
                  </button>
                  <button
                    onClick={() => handleSelectByCategory('요리')}
                    className="w-full px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    요리 (2개)
                  </button>
                  <button
                    onClick={() => handleSelectByCategory('K-POP')}
                    className="w-full px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    K-POP (2개)
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">기타 액션</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    disabled={!isModalOpen}
                    className="w-full px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm disabled:opacity-50"
                  >
                    강제 닫기
                  </button>
                  <button
                    onClick={() => setCollectionHistory([])}
                    className="w-full px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                  >
                    히스토리 초기화
                  </button>
                  <button
                    onClick={() => setTestActions([])}
                    className="w-full px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    로그 지우기
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 수집 시나리오 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎬 수집 시나리오
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testScenarios.map((scenario, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{scenario.icon}</span>
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                      {scenario.name}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    {scenario.description}
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">채널 수:</span>
                      <span className="text-gray-700 font-medium">
                        {scenario.channels.length}개
                      </span>
                    </div>
                    <div className="text-gray-500">
                      <div className="mb-1">포함 채널:</div>
                      <div className="max-h-16 overflow-y-auto">
                        {scenario.channels.map((channelId, idx) => {
                          const channel = getChannelInfo(channelId);
                          return (
                            <div key={idx} className="truncate text-xs">
                              {channel?.name || channelId}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenModal(scenario)}
                    className={`w-full mt-4 px-3 py-2 text-white rounded text-sm font-medium ${scenario.color} transition-colors`}
                  >
                    수집 시작
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 수집 히스토리 */}
          {collectionHistory.length > 0 && (
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📋 수집 히스토리
              </h2>

              <div className="space-y-3">
                {collectionHistory.map((entry, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {entry.batch.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {entry.batch.description || '설명 없음'}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">수집 영상:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {entry.videos.length}개
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">총 발견:</span>
                        <span className="ml-2 font-medium text-blue-600">
                          {entry.batch.totalVideosFound}개
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">할당량:</span>
                        <span className="ml-2 font-medium text-orange-600">
                          {entry.batch.quotaUsed}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">상태:</span>
                        <span
                          className={`ml-2 font-medium ${
                            entry.batch.status === 'completed'
                              ? 'text-green-600'
                              : entry.batch.status === 'failed'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {entry.batch.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 테스트 로그 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 테스트 로그
            </h2>

            <div className="bg-gray-50 p-4 rounded h-64 overflow-y-auto">
              {testActions.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  수집 시나리오를 선택하거나 모달과 상호작용하면 로그가 여기에
                  표시됩니다.
                </p>
              ) : (
                <div className="space-y-1">
                  {testActions.map((action, index) => (
                    <div
                      key={index}
                      className="text-sm font-mono text-gray-700"
                    >
                      {action}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 사용법 안내 */}
          <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">
              💡 사용법 안내
            </h2>

            <div className="space-y-3 text-sm text-blue-800">
              <p>
                <strong>1. 시나리오 선택:</strong> 다양한 수집 시나리오 중
                하나를 선택해 모달을 열어보세요.
              </p>
              <p>
                <strong>2. 필터 설정:</strong> 모달에서 기간, 조회수, 영상 길이,
                키워드 등을 설정하세요.
              </p>
              <p>
                <strong>3. 진행 모니터링:</strong> 채널별 수집 진행 상황과
                실시간 통계를 확인하세요.
              </p>
              <p>
                <strong>4. 에러 확인:</strong> 일부 채널에서 오류가 발생했을
                때의 처리를 확인하세요.
              </p>
              <p>
                <strong>5. 결과 분석:</strong> 수집 완료 후 플랫폼별, 길이별
                통계를 분석하세요.
              </p>
              <p>
                <strong>6. 대량 처리:</strong> "모든 채널" 시나리오로 대량 수집
                성능을 테스트하세요.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* BulkCollectionModal 컴포넌트 */}
      <BulkCollectionModal
        isOpen={isModalOpen}
        selectedChannels={selectedChannels}
        allVisibleChannels={allVisibleChannels}
        onClose={handleCloseModal}
        onCollectionComplete={handleCollectionComplete}
      />
    </div>
  );
};

export default BulkCollectionModalTestPage;
