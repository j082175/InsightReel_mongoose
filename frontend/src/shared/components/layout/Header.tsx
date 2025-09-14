import React, { useState, memo, useCallback } from 'react';
import SettingsModal from '../../ui/SettingsModal';
import { useAPIStatus } from '../../hooks';
import { useNavigation, ROUTE_CATEGORIES } from '../../../app/routing';

interface HeaderProps {}

interface NavigationItem {
  id: string;
  name: string;
  children?: NavigationItem[];
}

const Header: React.FC<HeaderProps> = memo(() => {
  const { currentPage, navigateTo } = useNavigation();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);

  const { data: apiStatus, isLoading: apiLoading } = useAPIStatus();
  

  const navStructure: NavigationItem[] = [
    { id: 'dashboard', name: '대시보드' },
    {
      id: 'management', name: '관리', children: [
        ...ROUTE_CATEGORIES.management.routes.map(route => ({ id: route.id, name: route.label })),
        ...ROUTE_CATEGORIES.main.routes.filter(r => r.id === 'archive').map(route => ({ id: route.id, name: route.label })),
      ]
    },
    {
      id: 'trending', name: '트렌딩 수집', children:
        ROUTE_CATEGORIES.trending.routes.map(route => ({ id: route.id, name: route.label }))
    },
    {
      id: 'analysis', name: '분석 & 발굴', children: [
        ...ROUTE_CATEGORIES.main.routes.filter(r => ['discovery', 'ideas'].includes(r.id)).map(route => ({ id: route.id, name: route.label })),
      ]
    }
  ];

  const NavItem: React.FC<{ item: NavigationItem }> = memo(({ item }) => {
    const isActive = item.id === currentPage || (item.children && item.children.some((child: NavigationItem) => child.id === currentPage));

    if (item.children) {
      return (
        <div className="relative" onMouseEnter={() => setOpenDropdown(item.id)} onMouseLeave={() => setOpenDropdown(null)}>
          <button
            className={`flex items-center gap-1 ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'} px-3 py-2 rounded-md text-sm font-medium transition-colors`}
          >
            {item.name}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
          {openDropdown === item.id && (
            <div className="origin-top-right absolute right-0 top-full pt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
              {item.children.map((child: NavigationItem) => (
                <button 
                  key={child.id} 
                  onClick={() => navigateTo(child.id)} 
                  className={`w-full text-left block px-4 py-2 text-sm ${currentPage === child.id ? 'font-bold text-indigo-600' : 'text-gray-700'} hover:bg-gray-100`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => navigateTo(item.id)}
        className={`${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'} px-3 py-2 rounded-md text-sm font-medium transition-colors`}
      >
        {item.name}
      </button>
    );
  });

  return (
    <>
      {/* API 상태 상단 바 */}
      {!apiLoading && apiStatus && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-4 py-2">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                apiStatus.currentKey.usagePercentage > 80 ? 'bg-red-500' :
                apiStatus.currentKey.usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="text-xs font-medium text-gray-700">API Status</span>
            </div>
            <div className="flex items-center space-x-6">
              {/* 전체 사용량 */}
              <span className="text-xs text-gray-600">
                전체: <span className="font-medium text-gray-800">
                  {apiStatus.totalUsage.used?.toLocaleString()}/{(apiStatus.totalUsage.limit / 1000).toFixed(0)}K
                </span>
                <span className="text-gray-500 ml-1">
                  ({apiStatus.totalUsage.usagePercentage}%)
                </span>
              </span>
              
              {/* 현재 활성 키 */}
              <span className="text-xs text-gray-600">
                현재 키 ({apiStatus.currentKey.name}): <span className="font-medium text-gray-800">
                  {apiStatus.currentKey.usage?.toLocaleString()}/{(apiStatus.currentKey.limit / 1000).toFixed(0)}K
                </span>
                <span className="text-gray-500 ml-1">
                  ({apiStatus.currentKey.usagePercentage}%)
                </span>
              </span>
              
              {/* 사용가능한 키 개수 */}
              <span className="text-xs text-gray-600">
                키: <span className="font-medium text-gray-800">
                  {apiStatus.availableKeys}/{apiStatus.totalKeys} 사용가능
                </span>
              </span>
              
              {/* 진행률 바 (현재 키 기준) */}
              <div className="w-16 bg-gray-300 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    apiStatus.currentKey.usagePercentage > 80 ? 'bg-red-500' :
                    apiStatus.currentKey.usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(apiStatus.currentKey.usagePercentage || 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Gemini API 상태 바 */}
          {apiStatus.gemini && apiStatus.gemini.total && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 px-4 py-2">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    apiStatus.gemini.total.percentage > 80 ? 'bg-red-500' :
                    apiStatus.gemini.total.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-xs font-medium text-gray-700">Gemini API Status</span>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Pro 모델 */}
                  <span className="text-xs text-gray-600">
                    Pro: <span className="font-medium text-gray-800">
                      {apiStatus.gemini.pro.used}/{apiStatus.gemini.pro.limit}
                    </span>
                    <span className="text-gray-500 ml-1">
                      ({apiStatus.gemini.pro.usagePercent}%)
                    </span>
                  </span>
                  
                  {/* Flash 모델 */}
                  <span className="text-xs text-gray-600">
                    Flash: <span className="font-medium text-gray-800">
                      {apiStatus.gemini.flash.used}/{apiStatus.gemini.flash.limit}
                    </span>
                    <span className="text-gray-500 ml-1">
                      ({apiStatus.gemini.flash.usagePercent}%)
                    </span>
                  </span>
                  
                  {/* Flash-Lite 모델 */}
                  <span className="text-xs text-gray-600">
                    Flash-Lite: <span className="font-medium text-gray-800">
                      {apiStatus.gemini.flashLite.used}/{apiStatus.gemini.flashLite.limit}
                    </span>
                    <span className="text-gray-500 ml-1">
                      ({apiStatus.gemini.flashLite.usagePercent}%)
                    </span>
                  </span>
                  
                  {/* 전체 진행률 바 */}
                  <div className="w-16 bg-gray-300 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        apiStatus.gemini.total.percentage > 80 ? 'bg-red-500' :
                        apiStatus.gemini.total.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(apiStatus.gemini.total.percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 mr-8">InsightReel</h1>
            
            {/* 네비게이션 메뉴 */}
            <nav className="hidden md:flex space-x-4">
              {navStructure.map(item => (
                <NavItem key={item.id} item={item} />
              ))}
            </nav>
          </div>

          {/* 우측 프로필 영역 */}
          <div className="flex items-center space-x-4">
            {/* 개발자 모드 버튼 (개발 환경에서만 표시) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="relative">
                <button
                  onClick={() => setShowDevMenu(!showDevMenu)}
                  className="px-3 py-1 bg-yellow-500 text-black rounded text-sm font-medium hover:bg-yellow-400 transition-colors"
                >
                  🛠️ DEV
                </button>

                {showDevMenu && (
                  <div className="absolute top-10 right-0 bg-white shadow-lg rounded-md border p-2 z-50 min-w-[120px]">
                    <button
                      onClick={() => {
                        navigateTo('test');
                        setShowDevMenu(false);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                    >
                      📋 테스트 메뉴
                    </button>
                  </div>
                )}
              </div>
            )}

            <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5-5 5h5zm0 0v-5" />
              </svg>
            </button>

            <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* 프로필 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <img className="h-8 w-8 rounded-full" src="https://placehold.co/32x32/6366F1/FFFFFF?text=U" alt="Profile" />
                <span className="hidden md:block text-gray-700 font-medium">사용자</span>
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </button>
              
              {isProfileOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <button 
                    onClick={() => {
                      setSettingsOpen(true);
                      setProfileOpen(false);
                    }}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    설정
                  </button>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">로그아웃</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* 설정 모달 */}
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
      </header>
    </>
  );
});

Header.displayName = 'Header';

export default Header;