import React, { useState, useEffect } from 'react';
import {
  useVideos,
  useChannels,
  useAPIStatus,
  useTrendingStats,
  useQuotaStatus,
  useServerStatus,
  useCollectTrending
} from '../shared/hooks';

/**
 * StateBox - API Hook 상태 시각화 컴포넌트
 */
interface StateBoxProps {
  title: string;
  data: any;
  loading?: boolean;
  error?: any;
  actions?: React.ReactNode;
}

const StateBox: React.FC<StateBoxProps> = ({ title, data, loading, error, actions }) => (
  <div className="border border-gray-300 rounded-lg p-4 bg-white">
    <h4 className="text-lg font-semibold mb-3 text-gray-800">{title}</h4>

    {loading && (
      <div className="flex items-center text-blue-600 mb-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        로딩 중...
      </div>
    )}

    {error && (
      <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
        <p className="text-red-700 text-sm">
          <strong>에러:</strong> {typeof error === 'string' ? error : error?.message || '알 수 없는 에러'}
        </p>
      </div>
    )}

    <div className="bg-gray-50 rounded p-3 mb-3">
      <pre className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>

    {actions && (
      <div className="flex gap-2 flex-wrap">
        {actions}
      </div>
    )}
  </div>
);

/**
 * APIHooksTestPage - 7개 API Hook 테스트 페이지
 * 🎯 목적: API Hook들의 실시간 서버 통신 및 상태 관리 시연
 *
 * 포함된 API Hooks:
 * 1. useVideos - 비디오 목록 조회
 * 2. useChannels - 채널 목록 조회
 * 3. useAPIStatus - API 상태 모니터링
 * 4. useTrendingStats - 트렌딩 통계
 * 5. useQuotaStatus - API 할당량 상태
 * 6. useServerStatus - 서버 헬스 체크
 * 7. useCollectTrending - 트렌딩 수집
 */
const APIHooksTestPage: React.FC = () => {
  // 1. useVideos Hook 테스트
  const {
    data: videos,
    loading: videosLoading,
    error: videosError,
    refetch: refetchVideos
  } = useVideos();

  // 2. useChannels Hook 테스트
  const {
    data: channels,
    loading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels
  } = useChannels();

  // 3. useAPIStatus Hook 테스트
  const {
    data: apiStatus,
    loading: apiStatusLoading,
    error: apiStatusError,
    refetch: refetchAPIStatus
  } = useAPIStatus();

  // 4. useTrendingStats Hook 테스트
  const {
    data: trendingStats,
    loading: trendingStatsLoading,
    error: trendingStatsError,
    refetch: refetchTrendingStats
  } = useTrendingStats();

  // 5. useQuotaStatus Hook 테스트
  const {
    data: quotaStatus,
    loading: quotaStatusLoading,
    error: quotaStatusError,
    refetch: refetchQuotaStatus
  } = useQuotaStatus();

  // 6. useServerStatus Hook 테스트
  const {
    data: serverStatus,
    loading: serverStatusLoading,
    error: serverStatusError,
    refetch: refetchServerStatus
  } = useServerStatus();

  // 7. useCollectTrending Hook 테스트
  const {
    mutate: collectTrending,
    loading: collectTrendingLoading,
    error: collectTrendingError,
    data: collectTrendingResult
  } = useCollectTrending();

  // 트렌딩 수집 테스트용 상태
  const [collectParams, setCollectParams] = useState({
    channelId: '',
    daysBack: 7,
    minViews: 10000
  });

  // 자동 새로고침 상태
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // 초

  // 자동 새로고침 효과
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchServerStatus();
      refetchAPIStatus();
      refetchQuotaStatus();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetchServerStatus, refetchAPIStatus, refetchQuotaStatus]);

  // 전체 데이터 새로고침
  const handleRefreshAll = () => {
    refetchVideos();
    refetchChannels();
    refetchAPIStatus();
    refetchTrendingStats();
    refetchQuotaStatus();
    refetchServerStatus();
  };

  // 트렌딩 수집 실행
  const handleCollectTrending = () => {
    if (!collectParams.channelId.trim()) {
      alert('채널 ID를 입력해주세요');
      return;
    }

    collectTrending({
      channelId: collectParams.channelId,
      daysBack: collectParams.daysBack,
      minViews: collectParams.minViews
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-2">API Hooks 테스트 페이지</h1>
          <p className="text-green-100 mb-4">
            서버와의 실시간 통신을 담당하는 7개 API Hook들의 동작을 테스트합니다
          </p>

          {/* 전체 제어 패널 */}
          <div className="flex flex-wrap items-center gap-4 bg-white/10 rounded-lg p-4">
            <button
              onClick={handleRefreshAll}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 전체 새로고침
            </button>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                자동 새로고침
              </label>

              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-white/20 text-white rounded px-2 py-1 text-sm"
                >
                  <option value={10} className="text-black">10초</option>
                  <option value={30} className="text-black">30초</option>
                  <option value={60} className="text-black">1분</option>
                </select>
              )}
            </div>

            {autoRefresh && (
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                🔄 자동 새로고침 활성
              </span>
            )}
          </div>
        </div>

        {/* API Hook 테스트 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. useVideos Hook */}
          <StateBox
            title="📹 useVideos Hook"
            data={videos}
            loading={videosLoading}
            error={videosError}
            actions={
              <button
                onClick={() => refetchVideos()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                비디오 목록 새로고침
              </button>
            }
          />

          {/* 2. useChannels Hook */}
          <StateBox
            title="📺 useChannels Hook"
            data={channels}
            loading={channelsLoading}
            error={channelsError}
            actions={
              <button
                onClick={() => refetchChannels()}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
              >
                채널 목록 새로고침
              </button>
            }
          />

          {/* 3. useAPIStatus Hook */}
          <StateBox
            title="🔌 useAPIStatus Hook"
            data={apiStatus}
            loading={apiStatusLoading}
            error={apiStatusError}
            actions={
              <button
                onClick={() => refetchAPIStatus()}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                API 상태 확인
              </button>
            }
          />

          {/* 4. useTrendingStats Hook */}
          <StateBox
            title="📊 useTrendingStats Hook"
            data={trendingStats}
            loading={trendingStatsLoading}
            error={trendingStatsError}
            actions={
              <button
                onClick={() => refetchTrendingStats()}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm"
              >
                트렌딩 통계 조회
              </button>
            }
          />

          {/* 5. useQuotaStatus Hook */}
          <StateBox
            title="📈 useQuotaStatus Hook"
            data={quotaStatus}
            loading={quotaStatusLoading}
            error={quotaStatusError}
            actions={
              <button
                onClick={() => refetchQuotaStatus()}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                할당량 상태 확인
              </button>
            }
          />

          {/* 6. useServerStatus Hook */}
          <StateBox
            title="🖥️ useServerStatus Hook"
            data={serverStatus}
            loading={serverStatusLoading}
            error={serverStatusError}
            actions={
              <button
                onClick={() => refetchServerStatus()}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm"
              >
                서버 상태 확인
              </button>
            }
          />

        </div>

        {/* 7. useCollectTrending Hook - 별도 섹션 */}
        <div className="mt-8">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">🚀 useCollectTrending Hook</h3>

            {/* 수집 파라미터 입력 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채널 ID
                </label>
                <input
                  type="text"
                  value={collectParams.channelId}
                  onChange={(e) => setCollectParams(prev => ({ ...prev, channelId: e.target.value }))}
                  placeholder="UC123abc... 형태의 채널 ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수집 기간 (일)
                </label>
                <input
                  type="number"
                  value={collectParams.daysBack}
                  onChange={(e) => setCollectParams(prev => ({ ...prev, daysBack: Number(e.target.value) }))}
                  min="1"
                  max="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  최소 조회수
                </label>
                <input
                  type="number"
                  value={collectParams.minViews}
                  onChange={(e) => setCollectParams(prev => ({ ...prev, minViews: Number(e.target.value) }))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 수집 실행 버튼 */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleCollectTrending}
                disabled={collectTrendingLoading || !collectParams.channelId.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium"
              >
                {collectTrendingLoading ? '수집 중...' : '트렌딩 수집 시작'}
              </button>

              {collectTrendingLoading && (
                <div className="flex items-center text-emerald-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 mr-2"></div>
                  수집 진행 중...
                </div>
              )}
            </div>

            {/* 수집 결과 또는 에러 표시 */}
            {collectTrendingError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-red-700 text-sm">
                  <strong>수집 에러:</strong> {typeof collectTrendingError === 'string' ? collectTrendingError : collectTrendingError?.message || '알 수 없는 에러'}
                </p>
              </div>
            )}

            {collectTrendingResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                <h4 className="font-medium text-emerald-800 mb-2">수집 결과:</h4>
                <pre className="text-sm text-emerald-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {JSON.stringify(collectTrendingResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Hook 조합 패턴 데모 */}
        <div className="mt-8 bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">🔗 API Hook 조합 패턴</h3>
          <p className="text-gray-600 mb-4">
            여러 API Hook을 조합하여 복합적인 데이터 처리를 수행하는 패턴을 시연합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 서버 상태 종합 모니터링 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">🖥️ 서버 상태 종합 모니터링</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>서버 상태:</span>
                  <span className={`font-medium ${serverStatus?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {serverStatusLoading ? '확인 중...' : serverStatus?.status || '알 수 없음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>API 상태:</span>
                  <span className={`font-medium ${apiStatus?.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                    {apiStatusLoading ? '확인 중...' : apiStatus?.status || '알 수 없음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>할당량 상태:</span>
                  <span className={`font-medium ${quotaStatus?.status === 'ok' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {quotaStatusLoading ? '확인 중...' : quotaStatus?.status || '알 수 없음'}
                  </span>
                </div>
              </div>
            </div>

            {/* 데이터 요약 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">📊 데이터 요약</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>총 비디오 수:</span>
                  <span className="font-medium text-blue-600">
                    {videosLoading ? '로딩 중...' : (Array.isArray(videos) ? videos.length : 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>총 채널 수:</span>
                  <span className="font-medium text-purple-600">
                    {channelsLoading ? '로딩 중...' : (Array.isArray(channels) ? channels.length : 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>트렌딩 통계:</span>
                  <span className="font-medium text-orange-600">
                    {trendingStatsLoading ? '로딩 중...' : (trendingStats ? '사용 가능' : '없음')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 실시간 로그 */}
        <div className="mt-8 bg-black rounded-lg p-4">
          <h3 className="text-white font-medium mb-2">📋 실시간 API 호출 로그</h3>
          <div className="text-green-400 font-mono text-sm space-y-1 max-h-32 overflow-y-auto">
            <div>[{new Date().toLocaleTimeString()}] API Hook 테스트 페이지 초기화 완료</div>
            {videosLoading && <div>[{new Date().toLocaleTimeString()}] 🔄 비디오 목록 조회 중...</div>}
            {channelsLoading && <div>[{new Date().toLocaleTimeString()}] 🔄 채널 목록 조회 중...</div>}
            {collectTrendingLoading && <div>[{new Date().toLocaleTimeString()}] 🚀 트렌딩 수집 진행 중...</div>}
            {autoRefresh && <div>[{new Date().toLocaleTimeString()}] ⚡ 자동 새로고침 활성화됨 ({refreshInterval}초 간격)</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIHooksTestPage;