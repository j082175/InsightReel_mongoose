import React, { useState } from 'react';
import { Sidebar } from '../shared/components';

/**
 * SidebarTestPage - Sidebar 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: Sidebar의 모든 상태와 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 사이드바 표시/숨김 상태
 * 2. 네비게이션 메뉴 구조
 * 3. 드롭다운 메뉴 기능
 * 4. 테스트 모드 동작
 * 5. 반응형 동작
 * 6. 닫기 기능
 */
const SidebarTestPage: React.FC = () => {
  // 🎛️ 테스트 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [testActions, setTestActions] = useState<string[]>([]);

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions((prev) => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    addTestLog('사이드바 닫기');
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
    addTestLog(`사이드바 ${sidebarOpen ? '닫기' : '열기'}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 테스트 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            🗂️ Sidebar Component Test
          </h1>
          <p className="text-gray-600 mt-1">
            Sidebar 컴포넌트의 모든 기능을 테스트합니다.
          </p>
        </div>
      </div>

      <div className="flex">
        {/* 실제 Sidebar 컴포넌트 (테스트 모드) */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          isTestMode={true}
        />

        {/* 테스트 콘텐츠 영역 */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* 테스트 컨트롤 */}
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🎛️ 테스트 컨트롤
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    사이드바 상태
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleSidebarToggle}
                      className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
                        sidebarOpen
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {sidebarOpen ? '사이드바 숨기기' : '사이드바 보이기'}
                    </button>

                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">
                        현재 상태:{' '}
                        <span className="font-medium text-gray-800">
                          {sidebarOpen ? '열림' : '닫힘'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    테스트 기능
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => addTestLog('네비게이션 메뉴 테스트')}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      네비게이션 테스트
                    </button>
                    <button
                      onClick={() => addTestLog('드롭다운 메뉴 테스트')}
                      className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                    >
                      드롭다운 테스트
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

            {/* 기능별 테스트 */}
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🧪 기능별 테스트
              </h2>

              <div className="space-y-6">
                {/* 네비게이션 구조 테스트 */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    🧭 네비게이션 구조
                  </h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600 mb-3">
                      사이드바의 네비게이션 메뉴 항목들을 테스트합니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-gray-800 mb-2">
                          메인 메뉴
                        </h4>
                        <ul className="space-y-1 text-gray-600">
                          <li>• 대시보드</li>
                        </ul>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-gray-800 mb-2">
                          관리 메뉴
                        </h4>
                        <ul className="space-y-1 text-gray-600">
                          <li>• 채널 관리</li>
                          <li>• 영상 아카이브</li>
                        </ul>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-gray-800 mb-2">
                          분석 & 발굴
                        </h4>
                        <ul className="space-y-1 text-gray-600">
                          <li>• 소재 발굴</li>
                          <li>• 콘텐츠 아이디어</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 테스트 모드 기능 */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    🧪 테스트 모드 기능
                  </h3>
                  <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      현재 활성화된 기능들
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• 라우터 독립 모드 (React Router 없이 동작)</li>
                      <li>• 안전한 네비게이션 처리</li>
                      <li>• 에러 방지 모드</li>
                      <li>• 테스트 환경 최적화</li>
                    </ul>
                  </div>
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
                    테스트 액션을 수행하면 로그가 여기에 표시됩니다.
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
                  <strong>1. 기본 테스트:</strong> 왼쪽 사이드바의 메뉴 항목들을
                  클릭해보세요.
                </p>
                <p>
                  <strong>2. 상태 변경:</strong> "사이드바 숨기기/보이기"
                  버튼으로 표시 상태를 변경할 수 있습니다.
                </p>
                <p>
                  <strong>3. 드롭다운:</strong> "관리"와 "분석 & 발굴" 메뉴를
                  클릭하면 하위 메뉴가 표시됩니다.
                </p>
                <p>
                  <strong>4. 테스트 모드:</strong> 현재 Router 독립 모드로
                  안전하게 테스트할 수 있습니다.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarTestPage;
