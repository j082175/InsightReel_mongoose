import React, { useState } from 'react';
import { ChannelCard } from '../features/channel-management';
import { Channel } from '../shared/types';

/**
 * ChannelCardTestPage - ChannelCard 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: ChannelCard의 모든 상태와 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 플랫폼별 채널 카드 표시 (YouTube, Instagram, TikTok)
 * 2. 선택 모드 및 상호작용
 * 3. 채널 정보 표시 (구독자, 썸네일, 키워드)
 * 4. 액션 버튼 (수집, 분석, 편집, 삭제)
 * 5. 호버 효과 및 상태 변경
 * 6. 다양한 데이터 시나리오
 */
const ChannelCardTestPage: React.FC = () => {
  // 🎛️ 테스트 상태
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    new Set()
  );
  const [showSelection, setShowSelection] = useState(false);
  const [testActions, setTestActions] = useState<string[]>([]);

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions((prev) => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 테스트용 채널 데이터
  const testChannels: Channel[] = [
    {
      _id: 'youtube-channel-1',
      channelId: 'UCabcd1234',
      name: '테크 리뷰 채널',
      platform: 'YOUTUBE',
      subscribers: 1250000,
      description: '최신 테크 제품과 가젯을 리뷰하는 채널',
      thumbnailUrl: 'https://placehold.co/64x64/FF0000/FFFFFF?text=YT',
      url: 'https://youtube.com/@techreview',
      keywords: ['테크', 'IT', '리뷰', '가젯', '스마트폰'],
      contentType: 'longform',
      totalViews: 125000000,
      totalVideos: 450,
      categoryInfo: {
        majorCategory: '과학기술',
        middleCategory: '디지털기기',
        subCategory: '스마트폰리뷰',
      },
    },
    {
      _id: 'instagram-channel-1',
      channelId: '@foodie_daily',
      name: '푸디 데일리',
      platform: 'INSTAGRAM',
      subscribers: 850000,
      description: '매일 맛있는 음식과 레시피를 공유합니다',
      thumbnailUrl: 'https://placehold.co/64x64/E4405F/FFFFFF?text=IG',
      url: 'https://instagram.com/foodie_daily',
      keywords: ['음식', '레시피', '맛집', '요리', '디저트'],
      contentType: 'shortform',
      totalViews: 45000000,
      totalVideos: 1200,
      categoryInfo: {
        majorCategory: '라이프스타일',
        middleCategory: '음식',
        subCategory: '레시피',
      },
    },
    {
      _id: 'tiktok-channel-1',
      channelId: '@dance_viral',
      name: '댄스 바이럴',
      platform: 'TIKTOK',
      subscribers: 2500000,
      description: '바이럴 댄스와 트렌드를 선도하는 크리에이터',
      thumbnailUrl: 'https://placehold.co/64x64/000000/FFFFFF?text=TT',
      url: 'https://tiktok.com/@dance_viral',
      keywords: ['댄스', '트렌드', '바이럴', '챌린지', 'K-POP'],
      contentType: 'shortform',
      totalViews: 180000000,
      totalVideos: 800,
      categoryInfo: {
        majorCategory: '엔터테인먼트',
        middleCategory: '댄스',
        subCategory: '트렌드댄스',
      },
    },
    {
      _id: 'youtube-channel-2',
      channelId: 'UCefgh5678',
      name: '작은 크리에이터',
      platform: 'YOUTUBE',
      subscribers: 15000,
      description: '새로 시작한 게임 실황 채널',
      thumbnailUrl: 'https://placehold.co/64x64/FF0000/FFFFFF?text=게임',
      url: 'https://youtube.com/@smallgamer',
      keywords: ['게임', '실황', '인디게임'],
      contentType: 'longform',
      totalViews: 500000,
      totalVideos: 25,
      categoryInfo: {
        majorCategory: '게임',
        middleCategory: '게임실황',
        subCategory: '인디게임',
      },
    },
  ];

  // 이벤트 핸들러
  const handleChannelSelect = (channelId: string) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId);
    } else {
      newSelected.add(channelId);
    }
    setSelectedChannels(newSelected);
    addTestLog(`채널 선택 토글: ${channelId}`);
  };

  const handleChannelClick = (channel: Channel) => {
    addTestLog(`채널 클릭: ${channel.name}`);
  };

  const handleCollect = (channel: Channel) => {
    addTestLog(`수집 시작: ${channel.name}`);
  };

  const handleAnalyze = (channel: Channel) => {
    addTestLog(`분석 시작: ${channel.name}`);
  };

  const handleEdit = (channel: Channel) => {
    addTestLog(`편집 모드: ${channel.name}`);
  };

  const handleDelete = (channel: Channel) => {
    addTestLog(`삭제 요청: ${channel.name}`);
  };

  const handleKeywordClick = (keyword: string) => {
    addTestLog(`키워드 클릭: ${keyword}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 테스트 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            📺 ChannelCard Component Test
          </h1>
          <p className="text-gray-600 mt-1">
            ChannelCard 컴포넌트의 모든 기능을 테스트합니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 테스트 컨트롤 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎛️ 테스트 컨트롤
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">선택 모드</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showSelection}
                      onChange={(e) => setShowSelection(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">선택 모드 활성화</span>
                  </label>

                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">
                      선택된 채널:{' '}
                      <span className="font-medium text-gray-800">
                        {selectedChannels.size}개
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedChannels(new Set());
                      addTestLog('모든 선택 해제');
                    }}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    선택 해제
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  빠른 테스트
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('플랫폼별 표시 테스트')}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    플랫폼별 표시
                  </button>
                  <button
                    onClick={() => addTestLog('구독자 수 표시 테스트')}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    구독자 수 표시
                  </button>
                  <button
                    onClick={() => addTestLog('키워드 상호작용 테스트')}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    키워드 상호작용
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  액션 테스트
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('호버 효과 테스트')}
                    className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                  >
                    호버 효과
                  </button>
                  <button
                    onClick={() => addTestLog('삭제 모달 테스트')}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    삭제 모달
                  </button>
                  <button
                    onClick={() => setTestActions([])}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    로그 지우기
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 채널 카드 표시 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📺 채널 카드 테스트
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannels.has(channel.id)}
                  onSelect={handleChannelSelect}
                  onChannelClick={handleChannelClick}
                  onCollect={handleCollect}
                  onAnalyze={handleAnalyze}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onKeywordClick={handleKeywordClick}
                  showSelection={showSelection}
                />
              ))}
            </div>
          </section>

          {/* 플랫폼별 비교 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🏷️ 플랫폼별 특징
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">📺 YouTube</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• 구독자 수 표시</li>
                  <li>• 롱폼 콘텐츠 중심</li>
                  <li>• 상세한 카테고리 정보</li>
                  <li>• 높은 총 조회수</li>
                </ul>
              </div>

              <div className="bg-pink-50 p-4 rounded border border-pink-200">
                <h3 className="font-semibold text-pink-800 mb-2">
                  📸 Instagram
                </h3>
                <ul className="text-sm text-pink-700 space-y-1">
                  <li>• 팔로워 수 표시</li>
                  <li>• 숏폼 위주</li>
                  <li>• 라이프스타일 콘텐츠</li>
                  <li>• 시각적 중심 피드</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">🎵 TikTok</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 팔로워 수 표시</li>
                  <li>• 쇼트폼 전용</li>
                  <li>• 트렌드/바이럴 중심</li>
                  <li>• 높은 참여도</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 테스트 로그 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 테스트 로그
            </h2>

            <div className="bg-gray-50 p-4 rounded h-64 overflow-y-auto">
              {testActions.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  채널 카드와 상호작용하면 로그가 여기에 표시됩니다.
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
                <strong>1. 기본 상호작용:</strong> 채널 카드를 클릭하거나 액션
                버튼을 테스트해보세요.
              </p>
              <p>
                <strong>2. 선택 모드:</strong> "선택 모드 활성화"를 체크하면
                다중 선택이 가능합니다.
              </p>
              <p>
                <strong>3. 플랫폼별 차이:</strong> YouTube, Instagram, TikTok의
                서로 다른 스타일을 확인하세요.
              </p>
              <p>
                <strong>4. 키워드 테스트:</strong> 채널 카드의 키워드 태그를
                클릭해보세요.
              </p>
              <p>
                <strong>5. 액션 버튼:</strong> 수집, 분석, 편집, 삭제 버튼의
                동작을 테스트할 수 있습니다.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChannelCardTestPage;
