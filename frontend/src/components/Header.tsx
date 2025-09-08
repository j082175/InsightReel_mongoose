import React, { useState } from 'react';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navStructure = [
    { id: 'dashboard', name: '대시보드' },
    {
      id: 'management', name: '관리', children: [
        { id: 'channels', name: '채널 관리' },
        { id: 'archive', name: '영상 아카이브' },
      ]
    },
    {
      id: 'analysis', name: '분석 & 발굴', children: [
        { id: 'discovery', name: '소재 발굴' },
        { id: 'ideas', name: '콘텐츠 아이디어' },
      ]
    }
  ];

  const NavItem: React.FC<{ item: any }> = ({ item }) => {
    const isActive = item.id === currentPage || (item.children && item.children.some((child: any) => child.id === currentPage));

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
              {item.children.map((child: any) => (
                <button 
                  key={child.id} 
                  onClick={() => onNavigate(child.id)} 
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
        onClick={() => onNavigate(item.id)}
        className={`${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'} px-3 py-2 rounded-md text-sm font-medium transition-colors`}
      >
        {item.name}
      </button>
    );
  };

  return (
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
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">설정</a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">로그아웃</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;