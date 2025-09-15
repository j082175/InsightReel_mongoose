import React, { useState } from 'react';
import { ActionBar } from '../shared/components';
import { Video } from '../shared/types';

/**
 * ActionBarTestPage - ActionBar 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: ActionBar의 모든 상태와 액션을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 선택 모드 활성화/비활성화
 * 2. 다중 선택 상태 관리
 * 3. 일괄 액션 (삭제, 분석, 내보내기)
 * 4. 선택 해제 및 전체 선택
 * 5. 동적 버튼 상태 변화
 * 6. 확인 다이얼로그 통합
 */
const ActionBarTestPage: React.FC = () => {
  // 🎬 테스트용 비디오 데이터
  const testVideos: Video[] = [
    {
      _id: '1',
      title: 'React 18 새로운 기능 완벽 가이드',
      views: 1234567,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FF0000/FFFFFF?text=React+18',
      channelName: 'React 개발자',
      uploadDate: '2024-01-15T10:30:00Z',
      duration: 'LONG',
      keywords: ['React', '18', 'Guide'],
    },
    {
      _id: '2',
      title: 'JavaScript 최신 트렌드 2024',
      views: 89000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FFA500/FFFFFF?text=JS+2024',
      channelName: 'JS 전문가',
      uploadDate: '2024-01-10T15:45:00Z',
      duration: 'MID',
      keywords: ['JavaScript', '2024', 'Trends'],
    },
    {
      _id: '3',
      title: 'TypeScript 실무 활용법',
      views: 456000,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/0066CC/FFFFFF?text=TypeScript',
      channelName: 'TS 마스터',
      uploadDate: '2024-01-05T08:20:00Z',
      duration: 'LONG',
      keywords: ['TypeScript', 'Practice'],
    },
    {
      _id: '4',
      title: '인스타그램 개발 팁',
      views: 234000,
      platform: 'INSTAGRAM',
      thumbnailUrl: 'https://placehold.co/320x180/E4405F/FFFFFF?text=Instagram',
      channelName: 'Instagram Dev',
      uploadDate: '2024-01-01T12:00:00Z',
      duration: 'SHORT',
      keywords: ['Instagram', 'Tips'],
    },
    {
      _id: '5',
      title: 'TikTok 알고리즘 분석',
      views: 1500000,
      platform: 'TIKTOK',
      thumbnailUrl: 'https://placehold.co/320x180/000000/FFFFFF?text=TikTok',
      channelName: 'TikTok Analyzer',
      uploadDate: '2023-12-28T16:30:00Z',
      duration: 'SHORT',
      keywords: ['TikTok', 'Algorithm'],
    },
  ];

  // 🎛️ 상태 관리
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [showActionBar, setShowActionBar] = useState(true);

  // 액션 로그 추가
  const addActionLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActionHistory(prev => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 선택 토글
  const handleToggleSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
      addActionLog(`비디오 선택 해제: ${testVideos.find(v => v._id === videoId)?.title}`);
    } else {
      newSelected.add(videoId);
      addActionLog(`비디오 선택: ${testVideos.find(v => v._id === videoId)?.title}`);
    }
    setSelectedVideos(newSelected);
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedVideos.size === testVideos.length) {
      setSelectedVideos(new Set());
      addActionLog('모든 비디오 선택 해제');
    } else {
      setSelectedVideos(new Set(testVideos.map(v => v._id)));
      addActionLog(`모든 비디오 선택 (${testVideos.length}개)`);
    }
  };

  // ActionBar 액션 핸들러들
  const handleAnalyze = () => {
    const count = selectedVideos.size;
    addActionLog(`${count}개 비디오 AI 분석 시작`);
    alert(`${count}개 비디오의 AI 분석을 시작합니다.`);
  };

  const handleDelete = () => {
    const count = selectedVideos.size;
    if (window.confirm(`선택된 ${count}개 비디오를 정말 삭제하시겠습니까?`)) {
      addActionLog(`${count}개 비디오 삭제 완료`);
      setSelectedVideos(new Set());
      alert(`${count}개 비디오가 삭제되었습니다.`);
    }
  };

  const handleExport = () => {
    const count = selectedVideos.size;
    addActionLog(`${count}개 비디오 데이터 내보내기`);
    alert(`${count}개 비디오 데이터를 CSV로 내보냅니다.`);
  };

  const handleClearSelection = () => {
    const count = selectedVideos.size;
    setSelectedVideos(new Set());
    addActionLog(`선택 해제 (${count}개)`);
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ⚡ ActionBar Component Test
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            ActionBar 컴포넌트의 모든 액션과 상태를 테스트합니다.
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

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showActionBar}
                onChange={(e) => setShowActionBar(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">ActionBar 표시</span>
            </label>

            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              {selectedVideos.size === testVideos.length ? '전체 해제' : '전체 선택'}
            </button>

            <span className="text-sm text-gray-600">
              {selectedVideos.size}/{testVideos.length} 개 선택됨
            </span>
          </div>
        </div>

        {/* ActionBar 테스트 영역 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚡ ActionBar 인터랙션</h2>

          {/* 실제 ActionBar */}
          {showActionBar && (
            <div className="mb-6">
              <ActionBar
                isVisible={true}
                selectedCount={selectedVideos.size}
                totalCount={testVideos.length}
                itemType="개 영상"
                onSelectAll={() => setSelectedVideos(new Set(testVideos.map(v => v._id)))}
                onClearSelection={handleClearSelection}
                onDelete={handleDelete}
                onAnalyze={handleAnalyze}
                onExport={handleExport}
              />
            </div>
          )}

          {/* 비디오 목록 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">테스트용 비디오 목록</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testVideos.map(video => (
                <div
                  key={video._id}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all
                    ${selectedVideos.has(video._id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${isSelectionMode ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  onClick={() => isSelectionMode && handleToggleSelection(video._id)}
                >
                  <div className="flex items-start gap-3">
                    {isSelectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedVideos.has(video._id)}
                        onChange={() => handleToggleSelection(video._id)}
                        className="mt-1 rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{video.title}</h4>
                      <p className="text-sm text-gray-600">{video.channelName}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${video.platform === 'YOUTUBE' ? 'bg-red-100 text-red-800' :
                            video.platform === 'INSTAGRAM' ? 'bg-pink-100 text-pink-800' :
                            'bg-gray-100 text-gray-800'}
                        `}>
                          {video.platform}
                        </span>
                        <span className="text-xs text-gray-500">
                          {video.views.toLocaleString()} 조회
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ActionBar 상태별 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎛️ ActionBar 상태별 테스트</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 선택 없음 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">선택 없음 (0개)</h3>
              <ActionBar
                isVisible={true}
                selectedCount={0}
                totalCount={testVideos.length}
                itemType="개 영상"
                onSelectAll={() => addActionLog('전체 선택 클릭 (0개 선택)')}
                onClearSelection={() => addActionLog('선택 해제 클릭 (0개 선택)')}
                onDelete={() => addActionLog('삭제 버튼 클릭 (0개 선택)')}
                onAnalyze={() => addActionLog('분석 버튼 클릭 (0개 선택)')}
                onExport={() => addActionLog('내보내기 버튼 클릭 (0개 선택)')}
              />
              <p className="text-sm text-gray-600 mt-3">
                모든 버튼이 비활성화된 상태
              </p>
            </div>

            {/* 일부 선택 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">일부 선택 (3개)</h3>
              <ActionBar
                isVisible={true}
                selectedCount={3}
                totalCount={testVideos.length}
                itemType="개 영상"
                onSelectAll={() => addActionLog('전체 선택 클릭 (3개 선택)')}
                onClearSelection={() => addActionLog('선택 해제 클릭 (3개 선택)')}
                onDelete={() => addActionLog('삭제 버튼 클릭 (3개 선택)')}
                onAnalyze={() => addActionLog('분석 버튼 클릭 (3개 선택)')}
                onExport={() => addActionLog('내보내기 버튼 클릭 (3개 선택)')}
              />
              <p className="text-sm text-gray-600 mt-3">
                모든 버튼이 활성화된 상태
              </p>
            </div>

            {/* 많은 선택 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">많은 선택 (50개)</h3>
              <ActionBar
                isVisible={true}
                selectedCount={50}
                totalCount={100}
                itemType="개 영상"
                onSelectAll={() => addActionLog('전체 선택 클릭 (50개 선택)')}
                onClearSelection={() => addActionLog('선택 해제 클릭 (50개 선택)')}
                onDelete={() => addActionLog('삭제 버튼 클릭 (50개 선택)')}
                onAnalyze={() => addActionLog('분석 버튼 클릭 (50개 선택)')}
                onExport={() => addActionLog('내보내기 버튼 클릭 (50개 선택)')}
              />
              <p className="text-sm text-gray-600 mt-3">
                대량 처리 시나리오 테스트
              </p>
            </div>
          </div>
        </section>

        {/* 액션 히스토리 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📜 액션 히스토리</h2>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">실시간 액션 로그</h3>
              <button
                onClick={() => setActionHistory([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                로그 지우기
              </button>
            </div>

            <div className="p-4">
              {actionHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {actionHistory.map((action, index) => (
                    <div
                      key={index}
                      className={`
                        p-2 rounded text-sm
                        ${index === 0 ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-gray-50 text-gray-700'}
                      `}
                    >
                      {action}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">
                  아직 액션이 없습니다. 위의 비디오를 선택하거나 ActionBar를 사용해보세요.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 기능별 상세 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔧 기능별 상세 테스트</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🤖 AI 분석 기능</h3>
              <p className="text-gray-600 text-sm mb-4">
                선택된 비디오들에 대해 AI 분석을 수행합니다.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    addActionLog('AI 분석 시작 (시뮬레이션)');
                    setTimeout(() => {
                      addActionLog('AI 분석 완료 (시뮬레이션)');
                    }, 2000);
                  }}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  AI 분석 시뮬레이션
                </button>
                <p className="text-xs text-gray-500">
                  실제로는 서버에 요청을 보내고 진행 상황을 표시합니다.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🗑️ 삭제 기능</h3>
              <p className="text-gray-600 text-sm mb-4">
                선택된 비디오들을 일괄 삭제합니다.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (window.confirm('정말 삭제하시겠습니까? (시뮬레이션)')) {
                      addActionLog('삭제 확인됨 (시뮬레이션)');
                    } else {
                      addActionLog('삭제 취소됨');
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  삭제 확인 테스트
                </button>
                <p className="text-xs text-gray-500">
                  실제로는 확인 다이얼로그 후 서버에서 삭제됩니다.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 내보내기 기능</h3>
              <p className="text-gray-600 text-sm mb-4">
                선택된 비디오 데이터를 CSV/Excel로 내보냅니다.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    addActionLog('CSV 파일 생성 중...');
                    setTimeout(() => {
                      addActionLog('CSV 다운로드 완료 (시뮬레이션)');
                    }, 1500);
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  CSV 내보내기 테스트
                </button>
                <p className="text-xs text-gray-500">
                  실제로는 선택된 비디오 데이터가 CSV 파일로 다운로드됩니다.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">✨ 선택 관리</h3>
              <p className="text-gray-600 text-sm mb-4">
                선택된 항목들을 관리하고 상태를 초기화합니다.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedVideos(new Set(['1', '3', '5']));
                    addActionLog('특정 비디오들 선택됨 (1, 3, 5번)');
                  }}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  특정 항목 선택
                </button>
                <p className="text-xs text-gray-500">
                  프로그래밍적으로 특정 항목들을 선택 상태로 만듭니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 테스트 통계 */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 ActionBar 테스트 통계</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{testVideos.length}</div>
                <div className="text-sm text-gray-600">총 테스트 항목</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{selectedVideos.size}</div>
                <div className="text-sm text-gray-600">선택된 항목</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{actionHistory.length}</div>
                <div className="text-sm text-gray-600">수행된 액션</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedVideos.size > 0 ? '활성' : '대기'}
                </div>
                <div className="text-sm text-gray-600">ActionBar 상태</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">💡 테스트 가이드</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 선택 모드를 활성화하고 비디오들을 클릭하여 선택</li>
                <li>• ActionBar의 각 버튼을 클릭하여 기능 테스트</li>
                <li>• 액션 히스토리에서 실시간 로그 확인</li>
                <li>• 다양한 선택 개수에서 ActionBar 상태 변화 관찰</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ActionBarTestPage;