import React, { useState } from 'react';
import BatchCard from '../features/batch-management/ui/BatchCard';

interface CollectionBatch {
  _id: string;
  name: string;
  description?: string;
  collectionType: 'group' | 'channels';
  targetGroups?: Array<{ _id: string; name: string; color: string }>;
  targetChannels?: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews?: number;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords?: string[];
    excludeKeywords?: string[];
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  totalVideosFound: number;
  totalVideosSaved: number;
  failedChannels?: Array<{ channelName: string; error: string }>;
  quotaUsed: number;
  stats?: {
    byPlatform: {
      YOUTUBE: number;
      INSTAGRAM: number;
      TIKTOK: number;
    };
    byDuration: {
      SHORT: number;
      MID: number;
      LONG: number;
    };
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * BatchCardTestPage - BatchCard 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: BatchCard의 모든 상태와 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 배치 상태별 표시 (pending, running, completed, failed)
 * 2. 진행 상태 및 통계 표시
 * 3. 액션 버튼 (시작/일시정지, 편집, 삭제, 결과 보기)
 * 4. 수집 타입별 차이 (그룹 vs 개별 채널)
 * 5. 에러 처리 및 실패 상태
 * 6. 플랫폼별/길이별 통계
 */
const BatchCardTestPage: React.FC = () => {
  // 🎛️ 테스트 상태
  const [testActions, setTestActions] = useState<string[]>([]);
  const [batchStates, setBatchStates] = useState<
    Record<string, CollectionBatch['status']>
  >({});

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions((prev) => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 테스트용 배치 데이터
  const testBatches: CollectionBatch[] = [
    {
      _id: 'batch-1',
      name: '숏폼 트렌딩 수집 배치',
      description: '인기 K-POP 댄스 채널들의 최근 숏폼 트렌딩 영상 수집',
      collectionType: 'group',
      targetGroups: [
        { _id: 'group1', name: 'K-POP 댄스', color: '#8B5CF6' },
        { _id: 'group2', name: '트렌드 크리에이터', color: '#EC4899' },
      ],
      criteria: {
        daysBack: 7,
        minViews: 50000,
        maxViews: 10000000,
        includeShorts: true,
        includeMidform: false,
        includeLongForm: false,
        keywords: ['댄스', '트렌드', '챌린지'],
        excludeKeywords: ['광고', '협찬'],
      },
      status: 'completed',
      startedAt: '2024-09-15T09:00:00.000Z',
      completedAt: '2024-09-15T09:45:00.000Z',
      totalVideosFound: 156,
      totalVideosSaved: 142,
      quotaUsed: 850,
      stats: {
        byPlatform: {
          YOUTUBE: 89,
          INSTAGRAM: 35,
          TIKTOK: 18,
        },
        byDuration: {
          SHORT: 142,
          MID: 0,
          LONG: 0,
        },
      },
      createdAt: '2024-09-15T08:55:00.000Z',
      updatedAt: '2024-09-15T09:45:00.000Z',
    },
    {
      _id: 'batch-2',
      name: '교육 콘텐츠 롱폼 수집',
      description: '프로그래밍 교육 채널들의 최신 강의 영상 수집',
      collectionType: 'channels',
      targetChannels: ['ch1', 'ch2', 'ch3'],
      criteria: {
        daysBack: 30,
        minViews: 5000,
        maxViews: 5000000,
        includeShorts: false,
        includeMidform: true,
        includeLongForm: true,
        keywords: ['강의', '튜토리얼', '프로그래밍'],
        excludeKeywords: ['리액션'],
      },
      status: 'running',
      startedAt: '2024-09-15T10:30:00.000Z',
      totalVideosFound: 47,
      totalVideosSaved: 32,
      quotaUsed: 320,
      stats: {
        byPlatform: {
          YOUTUBE: 32,
          INSTAGRAM: 0,
          TIKTOK: 0,
        },
        byDuration: {
          SHORT: 0,
          MID: 8,
          LONG: 24,
        },
      },
      createdAt: '2024-09-15T10:25:00.000Z',
      updatedAt: '2024-09-15T11:15:00.000Z',
    },
    {
      _id: 'batch-3',
      name: '대기 중인 배치',
      description: '음식 콘텐츠 전체 타입 수집 (대기 중)',
      collectionType: 'group',
      targetGroups: [
        { _id: 'group3', name: '푸드 크리에이터', color: '#10B981' },
      ],
      criteria: {
        daysBack: 14,
        minViews: 10000,
        includeShorts: true,
        includeMidform: true,
        includeLongForm: true,
        keywords: ['음식', '레시피', '요리'],
        excludeKeywords: [],
      },
      status: 'pending',
      totalVideosFound: 0,
      totalVideosSaved: 0,
      quotaUsed: 0,
      createdAt: '2024-09-15T11:00:00.000Z',
      updatedAt: '2024-09-15T11:00:00.000Z',
    },
    {
      _id: 'batch-4',
      name: '실패한 배치 예시',
      description: 'API 할당량 초과로 실패한 수집 배치',
      collectionType: 'group',
      targetGroups: [{ _id: 'group4', name: '게임 실황', color: '#F59E0B' }],
      criteria: {
        daysBack: 7,
        minViews: 20000,
        includeShorts: true,
        includeMidform: true,
        includeLongForm: true,
        keywords: ['게임', '실황'],
        excludeKeywords: [],
      },
      status: 'failed',
      startedAt: '2024-09-15T08:00:00.000Z',
      totalVideosFound: 23,
      totalVideosSaved: 8,
      failedChannels: [
        { channelName: '우왁굳', error: 'API 할당량 초과' },
        { channelName: '풍월량', error: '채널 접근 불가' },
      ],
      quotaUsed: 1000,
      errorMessage: 'YouTube Data API 일일 할당량이 초과되었습니다.',
      createdAt: '2024-09-15T07:55:00.000Z',
      updatedAt: '2024-09-15T08:20:00.000Z',
    },
    {
      _id: 'batch-5',
      name: '다양한 플랫폼 혼합 수집',
      description: '모든 플랫폼에서 균형잡힌 콘텐츠 수집',
      collectionType: 'group',
      targetGroups: [
        { _id: 'group5', name: '라이프스타일', color: '#06B6D4' },
        { _id: 'group6', name: '패션/뷰티', color: '#F472B6' },
      ],
      criteria: {
        daysBack: 10,
        minViews: 15000,
        maxViews: 8000000,
        includeShorts: true,
        includeMidform: true,
        includeLongForm: true,
        keywords: ['라이프', '일상', '뷰티'],
        excludeKeywords: ['ASMR'],
      },
      status: 'completed',
      startedAt: '2024-09-14T14:00:00.000Z',
      completedAt: '2024-09-14T15:30:00.000Z',
      totalVideosFound: 89,
      totalVideosSaved: 84,
      quotaUsed: 650,
      stats: {
        byPlatform: {
          YOUTUBE: 45,
          INSTAGRAM: 28,
          TIKTOK: 11,
        },
        byDuration: {
          SHORT: 34,
          MID: 27,
          LONG: 23,
        },
      },
      createdAt: '2024-09-14T13:55:00.000Z',
      updatedAt: '2024-09-14T15:30:00.000Z',
    },
    {
      _id: 'batch-6',
      name: '소규모 테스트 배치',
      description: '단일 채널 소규모 테스트 수집',
      collectionType: 'channels',
      targetChannels: ['ch4'],
      criteria: {
        daysBack: 3,
        minViews: 1000,
        includeShorts: true,
        includeMidform: false,
        includeLongForm: false,
        keywords: [],
        excludeKeywords: [],
      },
      status: 'completed',
      startedAt: '2024-09-15T07:00:00.000Z',
      completedAt: '2024-09-15T07:05:00.000Z',
      totalVideosFound: 12,
      totalVideosSaved: 12,
      quotaUsed: 45,
      stats: {
        byPlatform: {
          YOUTUBE: 12,
          INSTAGRAM: 0,
          TIKTOK: 0,
        },
        byDuration: {
          SHORT: 12,
          MID: 0,
          LONG: 0,
        },
      },
      createdAt: '2024-09-15T06:58:00.000Z',
      updatedAt: '2024-09-15T07:05:00.000Z',
    },
  ];

  // 이벤트 핸들러
  const handleEdit = (batch: CollectionBatch) => {
    addTestLog(`편집 요청: ${batch.name}`);
  };

  const handleDelete = (batchId: string) => {
    const batch = testBatches.find((b) => b._id === batchId);
    addTestLog(`삭제 요청: ${batch?.name || batchId}`);
  };

  const handleViewVideos = (batchId: string) => {
    const batch = testBatches.find((b) => b._id === batchId);
    addTestLog(
      `결과 조회: ${batch?.name || batchId} (${batch?.totalVideosSaved || 0}개 영상)`
    );
  };

  const handleToggleStatus = (batchId: string, action: 'start' | 'pause') => {
    const batch = testBatches.find((b) => b._id === batchId);
    const actionText = action === 'start' ? '시작' : '일시정지';
    addTestLog(`${actionText} 요청: ${batch?.name || batchId}`);

    // 상태 변경 시뮬레이션
    setBatchStates((prev) => ({
      ...prev,
      [batchId]: action === 'start' ? 'running' : 'pending',
    }));
  };

  const getDisplayBatches = () => {
    return testBatches.map((batch) => ({
      ...batch,
      status: batchStates[batch._id] || batch.status,
    }));
  };

  // 통계 계산
  const totalBatches = testBatches.length;
  const completedBatches = testBatches.filter(
    (b) => b.status === 'completed'
  ).length;
  const runningBatches = testBatches.filter(
    (b) => b.status === 'running'
  ).length;
  const failedBatches = testBatches.filter((b) => b.status === 'failed').length;
  const totalVideos = testBatches.reduce(
    (sum, b) => sum + b.totalVideosSaved,
    0
  );
  const totalQuota = testBatches.reduce((sum, b) => sum + b.quotaUsed, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 테스트 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            📦 BatchCard Component Test
          </h1>
          <p className="text-gray-600 mt-1">
            BatchCard 컴포넌트의 모든 상태와 기능을 테스트합니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 테스트 통계 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📊 배치 통계
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-gray-800">
                  {totalBatches}
                </div>
                <div className="text-xs text-gray-600">총 배치</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-green-700">
                  {completedBatches}
                </div>
                <div className="text-xs text-green-600">완료</div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-blue-700">
                  {runningBatches}
                </div>
                <div className="text-xs text-blue-600">실행중</div>
              </div>
              <div className="bg-red-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-red-700">
                  {failedBatches}
                </div>
                <div className="text-xs text-red-600">실패</div>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-purple-700">
                  {totalVideos}
                </div>
                <div className="text-xs text-purple-600">총 영상</div>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <div className="text-lg font-bold text-orange-700">
                  {totalQuota}
                </div>
                <div className="text-xs text-orange-600">API 사용량</div>
              </div>
            </div>
          </section>

          {/* 테스트 컨트롤 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎛️ 테스트 컨트롤
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  상태별 필터
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('완료된 배치 확인')}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    완료 배치 확인
                  </button>
                  <button
                    onClick={() => addTestLog('실행중 배치 확인')}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    실행중 배치 확인
                  </button>
                  <button
                    onClick={() => addTestLog('실패 배치 확인')}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    실패 배치 확인
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  수집 타입별
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('그룹 배치 확인')}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    그룹 기반 배치
                  </button>
                  <button
                    onClick={() => addTestLog('채널 배치 확인')}
                    className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                  >
                    채널 기반 배치
                  </button>
                  <button
                    onClick={() => addTestLog('혼합 플랫폼 확인')}
                    className="w-full px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 text-sm"
                  >
                    혼합 플랫폼
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  액션 테스트
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('일괄 액션 테스트')}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    일괄 액션
                  </button>
                  <button
                    onClick={() => setBatchStates({})}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                  >
                    상태 초기화
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

          {/* 배치 카드 표시 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📦 배치 카드 테스트
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getDisplayBatches().map((batch) => (
                <BatchCard
                  key={batch._id}
                  batch={batch}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewVideos={handleViewVideos}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          </section>

          {/* 배치 상태 가이드 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 배치 상태 가이드
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  🟡 Pending (대기)
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 수집 대기 상태</li>
                  <li>• 시작 버튼 활성화</li>
                  <li>• 편집 가능</li>
                  <li>• 통계 없음</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">
                  🔵 Running (실행중)
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 수집 진행 중</li>
                  <li>• 일시정지 버튼</li>
                  <li>• 실시간 통계</li>
                  <li>• 진행률 표시</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">
                  🟢 Completed (완료)
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 수집 완료</li>
                  <li>• 결과 조회 가능</li>
                  <li>• 최종 통계</li>
                  <li>• 재실행 가능</li>
                </ul>
              </div>

              <div className="bg-red-50 p-4 rounded border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">
                  🔴 Failed (실패)
                </h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• 수집 실패</li>
                  <li>• 에러 메시지</li>
                  <li>• 부분 결과</li>
                  <li>• 재시도 가능</li>
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
                  배치 카드와 상호작용하면 로그가 여기에 표시됩니다.
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
                <strong>1. 상태별 테스트:</strong> 각 배치의 상태(대기, 실행중,
                완료, 실패)별 UI를 확인하세요.
              </p>
              <p>
                <strong>2. 액션 버튼:</strong> 시작/일시정지, 편집, 삭제, 결과
                보기 버튼을 테스트하세요.
              </p>
              <p>
                <strong>3. 통계 표시:</strong> 플랫폼별, 길이별 수집 통계와
                진행률을 확인하세요.
              </p>
              <p>
                <strong>4. 에러 처리:</strong> 실패한 배치의 에러 메시지와 부분
                결과를 확인하세요.
              </p>
              <p>
                <strong>5. 수집 타입:</strong> 그룹 기반과 채널 기반 배치의
                차이를 비교하세요.
              </p>
              <p>
                <strong>6. 실시간 업데이트:</strong> 상태 변경이 실시간으로
                반영되는지 확인하세요.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BatchCardTestPage;
