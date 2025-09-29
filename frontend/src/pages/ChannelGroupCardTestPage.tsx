import React, { useState } from 'react';
import ChannelGroupCard from '../features/channel-management/ui/ChannelGroupCard';
import { ChannelGroup } from '../shared/types';

/**
 * ChannelGroupCardTestPage - ChannelGroupCard 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: ChannelGroupCard의 모든 상태와 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 다양한 그룹 크기 (소규모/중간/대규모 채널 그룹)
 * 2. 색상 테마별 표시 (빨강, 파랑, 초록, 보라 등)
 * 3. 액션 버튼 (수집, 편집, 삭제)
 * 4. 키워드 표시 및 오버플로우 처리
 * 5. 마지막 수집 시간 표시
 * 6. 로딩 상태 및 상호작용
 */
const ChannelGroupCardTestPage: React.FC = () => {
  // 🎛️ 테스트 상태
  const [testActions, setTestActions] = useState<string[]>([]);
  const [groupStates, setGroupStates] = useState<Record<string, boolean>>({});

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions((prev) => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 테스트용 채널 그룹 데이터
  const testGroups: ChannelGroup[] = [
    {
      _id: 'group-1',
      name: '테크 리뷰어 그룹',
      description: '최신 기술과 가젯을 리뷰하는 채널들의 모음',
      color: '#EF4444',
      channels: [
        { channelId: 'UC123abc', name: '테크 리뷰채널 A' },
        { channelId: 'UC456def', name: '가젯 인사이트' },
        { channelId: 'UC789ghi', name: 'IT 뉴스데스크' },
        { channelId: 'UC101jkl', name: '스마트폰 리뷰' },
        { channelId: 'UC112mno', name: '노트북 가이드' }
      ],
      keywords: ['테크', 'IT', '리뷰', '가젯', '스마트폰', '노트북'],
      isActive: true,
      lastCollectedAt: '2024-09-15T06:30:00.000Z',
      createdAt: '2024-09-01T10:00:00.000Z',
      updatedAt: '2024-09-15T06:30:00.000Z',
    },
    {
      _id: 'group-2',
      name: '푸드 크리에이터',
      description: '맛있는 음식과 레시피를 소개하는 채널들',
      color: '#10B981',
      channels: [
        { channelId: 'UC201abc', name: '맛집 탐방' },
        { channelId: 'UC202def', name: '레시피 마스터' }
      ],
      keywords: ['음식', '레시피', '요리', '맛집'],
      isActive: true,
      lastCollectedAt: '2024-09-14T14:20:00.000Z',
      createdAt: '2024-09-05T15:30:00.000Z',
      updatedAt: '2024-09-14T14:20:00.000Z',
    },
    {
      _id: 'group-3',
      name: 'K-POP 댄스 트렌드',
      description: '최신 K-POP 댄스와 트렌드를 다루는 채널들',
      color: '#8B5CF6',
      channels: [
        { channelId: 'UC301abc', name: '엔터테인먼트 A' },
        { channelId: 'UC302def', name: '코미디 센터' },
        { channelId: 'UC303ghi', name: '버라이어티 쇼' },
        { channelId: 'UC304jkl', name: '음악 토크쇼' },
        { channelId: 'UC305mno', name: '드라마 리뷰' },
        { channelId: 'UC306pqr', name: '영화 분석' },
        { channelId: 'UC307stu', name: '연예 뉴스' },
        { channelId: 'UC308vwx', name: '이슈 토크' }
      ],
      keywords: [
        'K-POP',
        '댄스',
        '트렌드',
        '안무',
        '커버댄스',
        '챌린지',
        '아이돌',
        '뮤직비디오',
        '안무영상',
      ],
      isActive: true,
      lastCollectedAt: '2024-09-13T09:15:00.000Z',
      createdAt: '2024-08-20T12:00:00.000Z',
      updatedAt: '2024-09-13T09:15:00.000Z',
    },
    {
      _id: 'group-4',
      name: '게임 실황 모음',
      description: '다양한 게임의 실황과 공략을 제공하는 채널들',
      color: '#F59E0B',
      channels: [
        { channelId: 'UC401abc', name: '헬스 가이드' },
        { channelId: 'UC402def', name: '피트니스 코치' },
        { channelId: 'UC403ghi', name: '요가 마스터' }
      ],
      keywords: ['게임', '실황', '공략', '리뷰'],
      isActive: false,
      lastCollectedAt: '2024-09-10T16:45:00.000Z',
      createdAt: '2024-08-15T14:00:00.000Z',
      updatedAt: '2024-09-10T16:45:00.000Z',
    },
    {
      _id: 'group-5',
      name: '신규 그룹 (수집 이력 없음)',
      description: '새로 생성된 그룹으로 아직 트렌딩 수집이 진행되지 않음',
      color: '#6B7280',
      channels: [
        { channelId: 'UC501abc', name: '학습 채널' }
      ],
      keywords: ['신규', '테스트'],
      isActive: true,
      createdAt: '2024-09-15T08:00:00.000Z',
      updatedAt: '2024-09-15T08:00:00.000Z',
    },
    {
      _id: 'group-6',
      name: '대규모 채널 그룹',
      description: '15개 이상의 채널을 포함한 대규모 그룹으로 성능 테스트용',
      color: '#EC4899',
      channels: Array.from({ length: 18 }, (_, i) => ({
        channelId: `UC${600 + i}abc`,
        name: `대규모 채널 ${i + 1}`
      })),
      keywords: [
        '대규모',
        '성능',
        '테스트',
        '다수',
        '채널',
        '관리',
        '효율',
        '최적화',
        '스케일',
        '확장성',
      ],
      isActive: true,
      lastCollectedAt: '2024-09-12T11:30:00.000Z',
      createdAt: '2024-08-01T09:00:00.000Z',
      updatedAt: '2024-09-12T11:30:00.000Z',
    },
  ];

  // 이벤트 핸들러
  const handleGroupClick = (group: ChannelGroup) => {
    addTestLog(`그룹 클릭: ${group.name} (${group.channels.length}개 채널)`);
  };

  const handleEdit = (group: ChannelGroup) => {
    addTestLog(`편집 요청: ${group.name}`);
  };

  const handleDelete = (group: ChannelGroup) => {
    addTestLog(`삭제 요청: ${group.name}`);
  };

  const handleCollect = (group: ChannelGroup) => {
    addTestLog(`트렌딩 수집 시작: ${group.name}`);
    // 임시로 로딩 상태 시뮬레이션
    setGroupStates((prev) => ({ ...prev, [group._id!]: true }));
    setTimeout(() => {
      setGroupStates((prev) => ({ ...prev, [group._id!]: false }));
      addTestLog(`트렌딩 수집 완료: ${group.name}`);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 테스트 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            📁 ChannelGroupCard Component Test
          </h1>
          <p className="text-gray-600 mt-1">
            ChannelGroupCard 컴포넌트의 모든 기능을 테스트합니다.
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
                <h3 className="font-semibold text-gray-800 mb-3">그룹 통계</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">총 그룹 수:</span>
                    <span className="font-medium text-gray-800">
                      {testGroups.length}개
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">활성 그룹:</span>
                    <span className="font-medium text-green-600">
                      {testGroups.filter((g) => g.isActive).length}개
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">총 채널 수:</span>
                    <span className="font-medium text-blue-600">
                      {testGroups.reduce(
                        (total, group) => total + group.channels.length,
                        0
                      )}
                      개
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  빠른 테스트
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('색상 테마 테스트')}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    색상 테마 확인
                  </button>
                  <button
                    onClick={() => addTestLog('키워드 오버플로우 테스트')}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    키워드 표시
                  </button>
                  <button
                    onClick={() => addTestLog('대규모 그룹 테스트')}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    대규모 그룹
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  액션 테스트
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('수집 액션 테스트')}
                    className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                  >
                    수집 기능
                  </button>
                  <button
                    onClick={() => addTestLog('편집 모달 테스트')}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    편집 모달
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

          {/* 채널 그룹 카드 표시 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📁 채널 그룹 카드 테스트
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testGroups.map((group) => (
                <ChannelGroupCard
                  key={group._id}
                  group={group}
                  onClick={handleGroupClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCollect={handleCollect}
                />
              ))}
            </div>
          </section>

          {/* 그룹 특징 분석 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📊 그룹 특징 분석
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">
                  🔴 소규모 그룹 (2-5개 채널)
                </h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• 빠른 수집 속도</li>
                  <li>• 집중적인 모니터링</li>
                  <li>• 특화된 주제</li>
                  <li>• 관리 용이성</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-2">
                  🟣 중간 그룹 (6-10개 채널)
                </h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• 균형잡힌 커버리지</li>
                  <li>• 다양한 콘텐츠</li>
                  <li>• 적절한 수집 시간</li>
                  <li>• 효율적인 분석</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">
                  🟢 대규모 그룹 (10+개 채널)
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 포괄적인 데이터</li>
                  <li>• 트렌드 파악 우수</li>
                  <li>• 긴 수집 시간 필요</li>
                  <li>• 성능 최적화 중요</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 색상 테마 가이드 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎨 색상 테마 가이드
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-500"></div>
                <p className="text-sm font-medium text-gray-700">빨강</p>
                <p className="text-xs text-gray-500">테크/IT</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500"></div>
                <p className="text-sm font-medium text-gray-700">초록</p>
                <p className="text-xs text-gray-500">음식/요리</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-500"></div>
                <p className="text-sm font-medium text-gray-700">보라</p>
                <p className="text-xs text-gray-500">엔터/K-POP</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-500"></div>
                <p className="text-sm font-medium text-gray-700">노랑</p>
                <p className="text-xs text-gray-500">게임</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-500"></div>
                <p className="text-sm font-medium text-gray-700">회색</p>
                <p className="text-xs text-gray-500">신규/미분류</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-pink-500"></div>
                <p className="text-sm font-medium text-gray-700">분홍</p>
                <p className="text-xs text-gray-500">대규모</p>
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
                  채널 그룹 카드와 상호작용하면 로그가 여기에 표시됩니다.
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
                <strong>1. 기본 상호작용:</strong> 그룹 카드를 클릭하거나 액션
                버튼을 테스트해보세요.
              </p>
              <p>
                <strong>2. 수집 기능:</strong> 플레이 버튼(▶️)을 클릭하면 트렌딩
                수집이 시작됩니다.
              </p>
              <p>
                <strong>3. 편집/삭제:</strong> 설정 버튼(⚙️)과 더보기
                버튼(⋮)으로 관리 기능을 테스트하세요.
              </p>
              <p>
                <strong>4. 그룹 크기별 차이:</strong> 소규모, 중간, 대규모
                그룹의 서로 다른 특징을 확인하세요.
              </p>
              <p>
                <strong>5. 색상 테마:</strong> 각 그룹의 색상 테마가 카테고리를
                나타냅니다.
              </p>
              <p>
                <strong>6. 키워드 표시:</strong> 많은 키워드가 있을 때
                오버플로우 처리를 확인하세요.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChannelGroupCardTestPage;
