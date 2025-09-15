import React, { useState } from 'react';
import VideoAnalysisModal from '../features/video-analysis/ui/VideoAnalysisModal';

/**
 * VideoAnalysisModalTestPage - VideoAnalysisModal 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: VideoAnalysisModal의 모든 상태와 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 채널 선택 시나리오 (단일, 다중, 대량)
 * 2. AI 분석 진행 상태 및 단계별 표시
 * 3. 분석 결과 표시 (통계, 트렌드, 키워드, 추천사항)
 * 4. 다양한 플랫폼별 분석 결과
 * 5. 에러 처리 및 실패 시나리오
 * 6. 모달 열기/닫기 및 상태 관리
 */
const VideoAnalysisModalTestPage: React.FC = () => {
  // 🎛️ 테스트 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [testActions, setTestActions] = useState<string[]>([]);

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions(prev => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 테스트용 채널 시나리오
  const testScenarios = [
    {
      name: '단일 채널 분석',
      description: 'YouTube 테크 채널 1개 분석',
      channels: ['UC-channel-tech-1'],
      channelNames: ['노마드 코더'],
      icon: '🎯',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: '다중 채널 분석 (소규모)',
      description: '동일 카테고리 3개 채널 비교 분석',
      channels: ['UC-channel-food-1', 'UC-channel-food-2', 'UC-channel-food-3'],
      channelNames: ['백종원의 요리비책', '쯔양', '햄지'],
      icon: '🔍',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: '혼합 플랫폼 분석',
      description: 'YouTube, Instagram, TikTok 혼합',
      channels: ['UC-youtube-1', 'IG-instagram-1', 'TT-tiktok-1', 'UC-youtube-2', 'IG-instagram-2'],
      channelNames: ['BTS YouTube', 'BTS Instagram', 'BTS TikTok', 'BLACKPINK YouTube', 'BLACKPINK Instagram'],
      icon: '🌐',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      name: '대량 채널 분석',
      description: '10개 이상 채널 대량 분석 (성능 테스트)',
      channels: Array.from({ length: 12 }, (_, i) => `UC-channel-${i + 1}`),
      channelNames: Array.from({ length: 12 }, (_, i) => `채널 ${i + 1}`),
      icon: '📊',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      name: '에러 시나리오',
      description: '접근 불가능한 채널 포함 (에러 처리 테스트)',
      channels: ['UC-invalid-channel', 'UC-private-channel', 'UC-deleted-channel'],
      channelNames: ['Invalid Channel', 'Private Channel', 'Deleted Channel'],
      icon: '⚠️',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      name: 'K-POP 댄스 분석',
      description: 'K-POP 댄스 전문 채널들 트렌드 분석',
      channels: ['UC-kpop-1', 'UC-kpop-2', 'UC-kpop-3', 'UC-kpop-4', 'UC-kpop-5'],
      channelNames: ['1MILLION Dance Studio', 'STEEZY Studio', 'Matt Steffanina', 'WilldaBeast Adams', 'Lia Kim'],
      icon: '💃',
      color: 'bg-pink-500 hover:bg-pink-600'
    },
    {
      name: '교육 콘텐츠 분석',
      description: '교육/강의 채널들의 성과 분석',
      channels: ['UC-edu-1', 'UC-edu-2', 'UC-edu-3'],
      channelNames: ['EBS', 'Khan Academy', 'Crash Course'],
      icon: '📚',
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      name: '게임 실황 분석',
      description: '게임 실황 채널들의 트렌드 분석',
      channels: ['UC-game-1', 'UC-game-2', 'UC-game-3', 'UC-game-4'],
      channelNames: ['우왁굳', '풍월량', '침착맨', '김뽕'],
      icon: '🎮',
      color: 'bg-violet-500 hover:bg-violet-600'
    }
  ];

  // 이벤트 핸들러
  const handleOpenModal = (scenario: typeof testScenarios[0]) => {
    setSelectedChannels(scenario.channels);
    setIsModalOpen(true);
    addTestLog(`모달 열기: ${scenario.name} (${scenario.channels.length}개 채널)`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChannels([]);
    addTestLog('모달 닫기');
  };

  const handleCustomChannels = () => {
    const customChannels = ['UC-custom-1', 'UC-custom-2'];
    setSelectedChannels(customChannels);
    setIsModalOpen(true);
    addTestLog(`커스텀 채널 분석: ${customChannels.length}개 채널`);
  };

  const handleEmptyChannels = () => {
    setSelectedChannels([]);
    setIsModalOpen(true);
    addTestLog('빈 채널 목록으로 모달 열기 (에러 테스트)');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 테스트 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            🔬 VideoAnalysisModal Component Test
          </h1>
          <p className="text-gray-600 mt-1">
            VideoAnalysisModal 컴포넌트의 모든 기능과 시나리오를 테스트합니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* 테스트 컨트롤 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎛️ 테스트 컨트롤</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">모달 상태</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">모달 열림:</span>
                    <span className={`font-medium ${isModalOpen ? 'text-green-600' : 'text-gray-400'}`}>
                      {isModalOpen ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">선택 채널:</span>
                    <span className="font-medium text-blue-600">{selectedChannels.length}개</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {selectedChannels.length > 0 && (
                      <div className="max-h-20 overflow-y-auto">
                        {selectedChannels.map((channel, idx) => (
                          <div key={idx}>{channel}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">빠른 테스트</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleCustomChannels}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    커스텀 분석
                  </button>
                  <button
                    onClick={handleEmptyChannels}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    빈 목록 테스트
                  </button>
                  <button
                    onClick={() => addTestLog('분석 단계별 확인')}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    진행 단계 확인
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">모달 액션</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    disabled={!isModalOpen}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    강제 닫기
                  </button>
                  <button
                    onClick={() => addTestLog('모달 상태 체크')}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    상태 확인
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

          {/* 테스트 시나리오 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎬 분석 시나리오</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      <span className="text-gray-700 font-medium">{scenario.channels.length}개</span>
                    </div>
                    <div className="text-gray-500">
                      <div className="mb-1">채널 목록:</div>
                      <div className="max-h-16 overflow-y-auto text-xs">
                        {scenario.channelNames.map((name, idx) => (
                          <div key={idx} className="truncate">{name}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenModal(scenario)}
                    className={`w-full mt-4 px-3 py-2 text-white rounded text-sm font-medium ${scenario.color} transition-colors`}
                  >
                    분석 시작
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 분석 기능 가이드 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 분석 기능 가이드</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">📊 통계 분석</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 총 영상 수 및 조회수</li>
                  <li>• 평균 조회수 계산</li>
                  <li>• 최고 성과 영상 식별</li>
                  <li>• 성장률 추세 분석</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">🔍 트렌드 분석</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 조회수 성장률</li>
                  <li>• 참여도 분석</li>
                  <li>• 업로드 빈도 패턴</li>
                  <li>• 플랫폼별 성과</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-2">🎯 AI 분석</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• 키워드 추출</li>
                  <li>• 콘텐츠 카테고리 분류</li>
                  <li>• 성과 예측</li>
                  <li>• 개선 추천사항</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-2">📈 진행 상태</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• 실시간 진행률</li>
                  <li>• 단계별 상태 표시</li>
                  <li>• 에러 처리</li>
                  <li>• 완료 알림</li>
                </ul>
              </div>

              <div className="bg-red-50 p-4 rounded border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">⚠️ 에러 처리</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• API 접근 제한</li>
                  <li>• 비공개 채널</li>
                  <li>• 삭제된 채널</li>
                  <li>• 할당량 초과</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">🔧 기타 기능</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 결과 내보내기</li>
                  <li>• Sheets 연동</li>
                  <li>• 히스토리 저장</li>
                  <li>• 비교 분석</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 테스트 로그 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 테스트 로그</h2>

            <div className="bg-gray-50 p-4 rounded h-64 overflow-y-auto">
              {testActions.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  분석 시나리오를 선택하거나 모달과 상호작용하면 로그가 여기에 표시됩니다.
                </p>
              ) : (
                <div className="space-y-1">
                  {testActions.map((action, index) => (
                    <div key={index} className="text-sm font-mono text-gray-700">
                      {action}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 사용법 안내 */}
          <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">💡 사용법 안내</h2>

            <div className="space-y-3 text-sm text-blue-800">
              <p>
                <strong>1. 시나리오 선택:</strong> 다양한 분석 시나리오 중 하나를 선택해 모달을 열어보세요.
              </p>
              <p>
                <strong>2. 진행 상태 확인:</strong> 모달이 열리면 분석 진행 상태와 단계별 과정을 확인하세요.
              </p>
              <p>
                <strong>3. 분석 결과:</strong> 완료 후 통계, 트렌드, 키워드, 추천사항 등을 확인하세요.
              </p>
              <p>
                <strong>4. 에러 시나리오:</strong> "에러 시나리오"를 통해 오류 상황 처리를 테스트하세요.
              </p>
              <p>
                <strong>5. 대량 처리:</strong> "대량 채널 분석"으로 성능과 UI 반응성을 확인하세요.
              </p>
              <p>
                <strong>6. 플랫폼 혼합:</strong> 여러 플랫폼 채널 동시 분석 결과를 비교해보세요.
              </p>
            </div>
          </section>

        </div>
      </div>

      {/* VideoAnalysisModal 컴포넌트 */}
      <VideoAnalysisModal
        isOpen={isModalOpen}
        selectedChannels={selectedChannels}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default VideoAnalysisModalTestPage;