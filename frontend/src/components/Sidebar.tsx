import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  name: string;
  path?: string;
  children?: NavItem[];
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navStructure: NavItem[] = [
    { id: 'dashboard', name: '대시보드', path: '/dashboard' },
    {
      id: 'management', 
      name: '관리', 
      children: [
        { id: 'channels', name: '채널 관리', path: '/channels' },
        { id: 'archive', name: '영상 아카이브', path: '/archive' },
      ]
    },
    {
      id: 'analysis', 
      name: '분석 & 발굴', 
      children: [
        { id: 'discovery', name: '소재 발굴', path: '/discovery' },
        { id: 'ideas', name: '콘텐츠 아이디어', path: '/ideas' },
      ]
    }
  ];

  const NavItemComponent: React.FC<{ item: NavItem }> = ({ item }) => {
    const currentPath = location.pathname;
    const isActive = item.path === currentPath || (item.children && item.children.some(child => child.path === currentPath));

    if (item.children) {
      return (
        <div 
          className="relative" 
          onMouseEnter={() => setOpenDropdown(item.id)} 
          onMouseLeave={() => setOpenDropdown(null)}
        >
          <button
            className={`flex items-center gap-1 w-full text-left ${
              isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
            } px-3 py-2 rounded-md text-sm font-medium transition-colors`}
          >
            {item.name}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
          {openDropdown === item.id && (
            <div className="origin-top-left absolute left-0 top-full mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
              {item.children.map(child => (
                <button 
                  key={child.id} 
                  onClick={() => child.path && navigate(child.path)} 
                  className={`w-full text-left block px-4 py-2 text-sm ${
                    currentPath === child.path ? 'font-bold text-indigo-600' : 'text-gray-700'
                  } hover:bg-gray-100`}
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
        onClick={() => item.path && navigate(item.path)}
        className={`w-full text-left ${
          isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
        } px-3 py-2 rounded-md text-sm font-medium transition-colors`}
      >
        {item.name}
      </button>
    );
  };

  return (
    <div className="fixed left-0 top-0 w-64 bg-white h-full shadow-lg border-r border-gray-200 z-10">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">InsightReel</h1>
        <p className="text-sm text-gray-500 mt-1">Content Analytics Platform</p>
      </div>
      <nav className="p-4">
        <div className="space-y-2">
          {navStructure.map(item => (
            <NavItemComponent key={item.id} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;