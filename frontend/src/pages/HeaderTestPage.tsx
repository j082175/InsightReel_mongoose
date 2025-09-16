import React, { useState } from 'react';
import { Header } from '../shared/components';
import { useNavigation, ROUTE_CATEGORIES, ROUTES } from '../app/routing';

/**
 * HeaderTestPage - Header 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: Header의 모든 상태와 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 실제 Header 동작 확인
 * 2. 네비게이션 메뉴 테스트
 * 3. API 상태 모니터링
 * 4. 드롭다운 메뉴 기능
 * 5. 반응형 디자인
 * 6. 개발자 모드 메뉴
 */
const HeaderTestPage: React.FC = () => {
  const { currentPage, navigateTo } = useNavigation();

  // 🎛️ 테스트 상태
  const [testActions, setTestActions] = useState<string[]>([]);

  // 사용자 상태 (테스트용)
  const [isLoggedIn] = useState(true);
  const [currentUser] = useState({
    name: '테스트 사용자',
    email: 'test@example.com',
    avatar: 'https://placehold.co/32x32/6366F1/FFFFFF?text=U',
  });

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions((prev) => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 네비게이션 테스트
  const testNavigation = (pageId: string) => {
    navigateTo(pageId);
    addTestLog(`페이지 이동: ${pageId}`);
  };

  // 네비게이션 아이템 정의 (Header에서 사용하는 것과 동일한 구조)
  const navigationItems = [
    { id: 'dashboard', name: '대시보드', category: 'main' },
    ...ROUTE_CATEGORIES.management.routes.map((route) => ({
      id: route.id,
      name: route.label,
      category: 'management',
    })),
    ...ROUTE_CATEGORIES.trending.routes.map((route) => ({
      id: route.id,
      name: route.label,
      category: 'trending',
    })),
    ...ROUTE_CATEGORIES.main.routes
      .filter((r) => ['discovery', 'ideas', 'archive'].includes(r.id))
      .map((route) => ({ id: route.id, name: route.label, category: 'main' })),
  ];

  // 핸들러 함수
  const handleNavigation = (pageId: string) => {
    testNavigation(pageId);
  };

  // 사용자 프로필 관련 상태
  const [notifications] = useState(3);

  // 사용자 액션 핸들러
  const handleProfileClick = () => {
    addTestLog('프로필 메뉴 클릭');
  };

  const handleNotificationClick = () => {
    addTestLog('알림 메뉴 클릭');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 실제 Header 컴포넌트 (props 없음) */}
      <Header />

      {/* 테스트 페이지 컨텐츠 */}
      <div className="container mx-auto p-8 pt-24">
        {' '}
        {/* pt-24는 고정 헤더 높이만큼 여백 */}
        <div className="max-w-6xl mx-auto">
          {/* 페이지 헤더 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🏠 Header Component Test
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              실제 Header 컴포넌트의 동작을 테스트합니다. 위에 표시된 Header를
              직접 조작해보세요.
            </p>
          </div>

          {/* 현재 상태 표시 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              📊 현재 Header 상태
            </h2>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    현재 페이지
                  </h3>
                  <p className="text-gray-600">
                    <strong>{currentPage}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Header의 네비게이션에서 활성 상태로 표시됩니다.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    개발 모드
                  </h3>
                  <p className="text-gray-600">
                    <strong>활성화됨</strong>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Header 우측에 🛠️ DEV 버튼이 표시됩니다.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    API 상태
                  </h3>
                  <p className="text-gray-600">
                    <strong>실시간 모니터링</strong>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Header 상단에 API 사용량이 표시됩니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 네비게이션 테스트 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🧭 네비게이션 테스트
            </h2>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-600 mb-4">
                아래 버튼들을 클릭하여 Header의 네비게이션을 테스트하세요.
                Header에서 활성 상태가 변경됩니다.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => testNavigation('dashboard')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    currentPage === 'dashboard'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📊 대시보드
                </button>
                <button
                  onClick={() => testNavigation('channels')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    currentPage === 'channels'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📺 채널 관리
                </button>
                <button
                  onClick={() => testNavigation('archive')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    currentPage === 'archive'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🗂️ 비디오 아카이브
                </button>
                <button
                  onClick={() => testNavigation('trending')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    currentPage === 'trending'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📈 트렌딩 수집
                </button>
              </div>
            </div>
          </section>

          {/* Header 기능별 테스트 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🧪 기능별 테스트
            </h2>

            <div className="space-y-8">
              {/* 네비게이션 테스트 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🧭 네비게이션 테스트
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Header의 각 네비게이션 항목을 클릭하여 페이지 전환을
                  테스트합니다.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`
                        p-3 rounded-lg border text-sm font-medium transition-colors
                        ${
                          currentPage === item.id
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <div className="text-xl mb-1">{item.icon}</div>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 사용자 메뉴 테스트 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  👤 사용자 메뉴 테스트
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Header 우측의 사용자 프로필 및 메뉴 기능을 테스트합니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      현재 사용자 정보
                    </h4>
                    <div className="bg-gray-50 p-4 rounded">
                      {isLoggedIn ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={currentUser.avatar}
                            alt="프로필"
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {currentUser.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {currentUser.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">로그인되지 않음</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      사용자 액션
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={handleProfileClick}
                        disabled={!isLoggedIn}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                      >
                        프로필 보기
                      </button>
                      <button
                        onClick={handleNotificationClick}
                        disabled={!isLoggedIn}
                        className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
                      >
                        알림 확인 ({notifications})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 반응형 테스트 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📱 반응형 디자인 테스트
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  브라우저 창 크기를 조절하여 Header의 반응형 동작을
                  확인해보세요.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">
                      📱 모바일 (&lt; 768px)
                    </h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• 햄버거 메뉴 표시</li>
                      <li>• 네비게이션 축소</li>
                      <li>• 사용자 메뉴 간소화</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">
                      💻 태블릿 (768px - 1024px)
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 일부 메뉴 표시</li>
                      <li>• 적응형 네비게이션</li>
                      <li>• 중간 크기 로고</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <h4 className="font-medium text-purple-800 mb-2">
                      🖥️ 데스크톱 (&gt; 1024px)
                    </h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• 전체 메뉴 표시</li>
                      <li>• 확장된 네비게이션</li>
                      <li>• 전체 사용자 메뉴</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Header 변형 테스트 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🎨 Header 변형 테스트
            </h2>

            <div className="space-y-6">
              {/* 기본 Header (이미 페이지 상단에 있음) */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🔝 고정 Header (현재 페이지 상단)
                </h3>
                <p className="text-gray-600 text-sm">
                  페이지 상단에 고정된 Header가 현재 적용되어 있습니다.
                  스크롤해도 항상 보입니다.
                </p>
              </div>

              {/* 간단한 Header 변형 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🎯 간단한 Header 변형
                </h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-bold text-gray-900">
                        📊 InsightReel
                      </div>
                      <nav className="hidden md:flex items-center gap-6">
                        <a
                          href="#"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          대시보드
                        </a>
                        <a
                          href="#"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          비디오
                        </a>
                        <a
                          href="#"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          채널
                        </a>
                      </nav>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="p-2 text-gray-600 hover:text-gray-900">
                        🔔
                      </button>
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                        T
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mt-3">
                  최소한의 요소만 포함한 간단한 Header 버전입니다.
                </p>
              </div>

              {/* 확장된 Header 변형 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🚀 확장된 Header 변형
                </h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-6">
                        <div className="text-xl font-bold">
                          🎬 InsightReel Pro
                        </div>
                        <nav className="hidden lg:flex items-center gap-8">
                          <a
                            href="#"
                            className="hover:text-blue-200 transition-colors"
                          >
                            📊 대시보드
                          </a>
                          <a
                            href="#"
                            className="hover:text-blue-200 transition-colors"
                          >
                            🎬 비디오
                          </a>
                          <a
                            href="#"
                            className="hover:text-blue-200 transition-colors"
                          >
                            📺 채널
                          </a>
                          <a
                            href="#"
                            className="hover:text-blue-200 transition-colors"
                          >
                            📈 분석
                          </a>
                          <a
                            href="#"
                            className="hover:text-blue-200 transition-colors"
                          >
                            ⚙️ 설정
                          </a>
                        </nav>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                          <span className="text-sm">💎 Pro Plan</span>
                        </div>
                        <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
                          🔔{' '}
                          <span className="ml-1 bg-red-500 text-xs px-1 rounded-full">
                            3
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          <img
                            src="https://placehold.co/32x32/FFFFFF/4F46E5?text=T"
                            alt="프로필"
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="hidden md:block text-sm">
                            테스트 사용자
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mt-3">
                  그라데이션 배경과 추가 기능이 포함된 확장된 Header 버전입니다.
                </p>
              </div>
            </div>
          </section>

          {/* 접근성 테스트 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ♿ 접근성 테스트
            </h2>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                키보드 네비게이션
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">
                    키보드 단축키
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>
                      •{' '}
                      <kbd className="px-2 py-1 bg-white rounded shadow">
                        Tab
                      </kbd>{' '}
                      - 다음 요소로 포커스
                    </li>
                    <li>
                      •{' '}
                      <kbd className="px-2 py-1 bg-white rounded shadow">
                        Shift + Tab
                      </kbd>{' '}
                      - 이전 요소로 포커스
                    </li>
                    <li>
                      •{' '}
                      <kbd className="px-2 py-1 bg-white rounded shadow">
                        Enter
                      </kbd>{' '}
                      - 링크/버튼 활성화
                    </li>
                    <li>
                      •{' '}
                      <kbd className="px-2 py-1 bg-white rounded shadow">
                        Space
                      </kbd>{' '}
                      - 버튼 클릭
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">
                    접근성 기능
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• ARIA 라벨 및 역할 정의</li>
                    <li>• 스크린 리더 지원</li>
                    <li>• 고대비 색상 지원</li>
                    <li>• 포커스 표시기 제공</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white rounded-lg">
                <p className="text-blue-800 text-sm">
                  💡 <strong>테스트 방법:</strong> Tab 키를 눌러 Header의 모든
                  요소를 순차적으로 탐색해보세요. 각 요소가 명확하게 포커스되고
                  Enter/Space 키로 활성화되는지 확인하세요.
                </p>
              </div>
            </div>
          </section>

          {/* 테스트 통계 */}
          <section className="mb-12">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📊 Header 테스트 현황
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {navigationItems.length}
                  </div>
                  <div className="text-sm text-gray-600">네비게이션 항목</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {isLoggedIn ? '로그인' : '로그아웃'}
                  </div>
                  <div className="text-sm text-gray-600">현재 상태</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {notifications}
                  </div>
                  <div className="text-sm text-gray-600">알림 개수</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">반응형 지원</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  💡 테스트 가이드
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 브라우저 창 크기를 조절하여 반응형 동작 확인</li>
                  <li>• 로그인/로그아웃 상태 변경하여 UI 변화 관찰</li>
                  <li>• 각 네비게이션 항목 클릭하여 활성 상태 확인</li>
                  <li>• 키보드만으로 Header 전체 네비게이션 테스트</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HeaderTestPage;
