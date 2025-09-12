import React, { useState, useEffect } from 'react';
import { useChannels } from '../hooks/useApi';
import { useChannelGroups, ChannelGroup } from '../hooks/useChannelGroups';
import { CollectionBatch, Channel } from '../types';
import { useAppContext } from '../App';
import ChannelAnalysisModal from '../components/ChannelAnalysisModal';
import VideoAnalysisModal from '../components/VideoAnalysisModal';
import BulkCollectionModal from '../components/BulkCollectionModal';
import ChannelGroupModal from '../components/ChannelGroupModal';

import { PLATFORMS } from '../types/api';

const ChannelManagementPage: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  
  // 🎯 그룹 탭 관련 상태
  const [activeTab, setActiveTab] = useState<'channels' | 'groups'>('channels');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChannelGroup | null>(null);

  // API 훅 (실제 데이터 가져오기)
  const { data: apiChannels = [], isLoading, error } = useChannels();
  const { addCollectionBatch } = useAppContext();
  const {
    groups,
    isLoading: isGroupsLoading,
    error: groupsError,
    createGroup,
    updateGroup,
    deleteGroup,
    collectGroupTrending,
    collectAllActiveGroups,
    refreshGroups
  } = useChannelGroups();

  // Mock 데이터 - 새 인터페이스 표준 사용
  const mockChannels: Channel[] = [
    {
      id: '1',
      name: '개발왕 김코딩',
      platform: 'YOUTUBE',
      url: 'https://youtube.com/@kimcoding',
      subscribers: 1250000,
      totalVideos: 342,
      updatedAt: '2024-01-15T10:30:00',
      analysisStatus: 'active',
      thumbnailUrl: 'https://placehold.co/100x100/3B82F6/FFFFFF?text=K',
      createdAt: '2024-01-01T00:00:00',
      description: '개발 관련 콘텐츠를 제작하는 채널',
      keywords: ['개발', '프로그래밍', '코딩']
    },
    {
      id: '2',
      name: '요리하는 남자',
      platform: 'TIKTOK',
      url: 'https://tiktok.com/@cookingman',
      subscribers: 3450000,
      totalVideos: 567,
      updatedAt: '2024-01-15T09:15:00',
      analysisStatus: 'active',
      thumbnailUrl: 'https://placehold.co/100x100/F43F5E/FFFFFF?text=C',
      createdAt: '2024-01-01T00:00:00',
      description: '남성 요리 크리에이터',
      keywords: ['요리', '레시피', '남자요리']
    },
    {
      id: '3',
      name: '카페찾아 삼만리',
      platform: 'INSTAGRAM',
      url: 'https://instagram.com/cafe_explorer',
      subscribers: 89000,
      totalVideos: 124,
      updatedAt: '2024-01-14T18:00:00',
      analysisStatus: 'inactive',
      thumbnailUrl: 'https://placehold.co/100x100/8B5CF6/FFFFFF?text=T',
      createdAt: '2024-01-01T00:00:00',
      description: '전국 카페 탐방 콘텐츠',
      keywords: ['카페', '맛집', '여행']
    },
    {
      id: '4',
      name: '냥냥펀치',
      platform: 'YOUTUBE',
      url: 'https://youtube.com/@nyangpunch',
      subscribers: 567000,
      totalVideos: 89,
      updatedAt: '2024-01-15T11:00:00',
      analysisStatus: 'error',
      thumbnailUrl: 'https://placehold.co/100x100/F97316/FFFFFF?text=P',
      createdAt: '2024-01-01T00:00:00',
      description: '고양이 관련 콘텐츠',
      keywords: ['고양이', '펫', '동물']
    },
    {
      id: '5',
      name: '캠핑은 장비빨',
      platform: 'YOUTUBE',
      url: 'https://youtube.com/@campinggear',
      subscribers: 234000,
      totalVideos: 156,
      updatedAt: '2024-01-15T08:45:00',
      analysisStatus: 'active',
      thumbnailUrl: 'https://placehold.co/100x100/22C55E/FFFFFF?text=C',
      createdAt: '2024-01-01T00:00:00',
      description: '캠핑 장비 리뷰',
      keywords: ['캠핑', '장비', '아웃도어']
    }
  ];


  useEffect(() => {
    // API 데이터가 있으면 사용, 없으면 mock 데이터 사용
    if (apiChannels.length > 0) {
      setChannels(apiChannels);
    } else {
      setChannels(mockChannels);
    }
  }, [apiChannels]);

  const filteredChannels = channels.filter(channel => {
    const channelName = channel.name || '';
    const channelPlatform = channel.platform || '';
    const matchesSearch = channelName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'All' || channelPlatform.toLowerCase() === platformFilter.toLowerCase();
    return matchesSearch && matchesPlatform;
  });

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + '천';
    return num.toLocaleString();
  };

  const formatLastChecked = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const handleSelectToggle = (channelId: string) => {
    const newSelection = new Set(selectedChannels);
    if (newSelection.has(channelId)) {
      newSelection.delete(channelId);
    } else {
      newSelection.add(channelId);
    }
    setSelectedChannels(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedChannels.size === filteredChannels.length) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(filteredChannels.map(ch => ch.id)));
    }
  };

  const handleCollectionComplete = (batch: CollectionBatch, videos: Video[]) => {
    // 전역 상태에 배치와 영상 추가
    addCollectionBatch(batch, videos);
    console.log('수집 완료:', batch, videos);
    alert(`"${batch.name}" 배치로 ${videos.length}개 영상이 수집되었습니다! 대시보드에서 확인하세요.`);
    setShowCollectionModal(false);
  };

  // 그룹 관련 핸들러들
  const handleGroupSave = async (groupData: ChannelGroup) => {
    try {
      if (editingGroup) {
        // 수정 모드
        await updateGroup(editingGroup._id!, groupData);
        console.log('그룹 수정 완료:', groupData);
      } else {
        // 생성 모드
        await createGroup(groupData);
        console.log('새 그룹 생성 완룼:', groupData);
      }
      setShowGroupModal(false);
      setEditingGroup(null);
    } catch (error) {
      console.error('그룹 저장 실패:', error);
      alert('그룹 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleGroupEdit = (group: ChannelGroup) => {
    setEditingGroup(group);
    setShowGroupModal(true);
  };

  const handleGroupDelete = async (groupId: string) => {
    if (confirm('정말로 이 그룹을 삭제하시겠습니까?')) {
      try {
        await deleteGroup(groupId);
        console.log('그룹 삭제 완룼:', groupId);
      } catch (error) {
        console.error('그룹 삭제 실패:', error);
        alert('그룹 삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleGroupCollect = async (groupId: string) => {
    const group = groups.find(g => g._id === groupId);
    if (!group) return;
    
    try {
      console.log(`그룹 "${group.name}" 수집 시작...`);
      const result = await collectGroupTrending(groupId, {
        daysBack: 3,
        minViews: 30000,
        includeShorts: true,
        includeLongForm: true
      });
      
      alert(`그룹 "${group.name}"에서 ${result.savedVideos}개 영상을 수집했습니다!`);
    } catch (error) {
      console.error('그룹 수집 실패:', error);
      alert('그룹 수집에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleGroupToggleActive = async (groupId: string) => {
    const group = groups.find(g => g._id === groupId);
    if (!group) return;

    try {
      await updateGroup(groupId, { isActive: !group.isActive });
    } catch (error) {
      console.error('그룹 상태 변경 실패:', error);
      alert('그룹 상태 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleAllGroupsCollect = async () => {
    try {
      console.log('전체 활성 그룹 수집 시작...');
      const result = await collectAllActiveGroups({
        daysBack: 3,
        minViews: 30000,
        includeShorts: true,
        includeLongForm: true
      });
      
      alert(`${result.successGroups}/${result.totalGroups}개 그룹에서 총 ${result.totalVideos}개 영상을 수집했습니다!`);
    } catch (error) {
      console.error('전체 그룹 수집 실패:', error);
      alert('전체 그룹 수집에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const AddChannelModal: React.FC = () => {
    const [newChannel, setNewChannel] = useState<{
      url: string;
      platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
      autoCollect: boolean;
      collectInterval: string;
    }>({
      url: '',
      platform: 'YOUTUBE',
      autoCollect: true,
      collectInterval: '매일'
    });

    if (!showAddModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">새 채널 추가</h2>
            <button 
              onClick={() => setShowAddModal(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                채널 URL
              </label>
              <input
                type="url"
                value={newChannel.url}
                onChange={(e) => setNewChannel({...newChannel, url: e.target.value})}
                placeholder="https://youtube.com/@channel"
                className="w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                플랫폼
              </label>
              <select
                value={newChannel.platform}
                onChange={(e) => {
                  const platformValue = e.target.value;
                  if (platformValue === 'YOUTUBE' || platformValue === 'INSTAGRAM' || platformValue === 'TIKTOK') {
                    setNewChannel({...newChannel, platform: platformValue});
                  }
                }}
                className="w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="YOUTUBE">YouTube</option>
                <option value="TIKTOK">TikTok</option>
                <option value="INSTAGRAM">Instagram</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newChannel.autoCollect}
                  onChange={(e) => setNewChannel({...newChannel, autoCollect: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">자동 수집 활성화</span>
              </label>
            </div>
            
            {newChannel.autoCollect && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수집 주기
                </label>
                <select
                  value={newChannel.collectInterval}
                  onChange={(e) => setNewChannel({...newChannel, collectInterval: e.target.value})}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="6시간마다">6시간마다</option>
                  <option value="매일">매일</option>
                  <option value="주간">주간</option>
                  <option value="월간">월간</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button 
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
            <button className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700">
              추가
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">📺 채널 관리</h1>
        <p className="text-gray-600">수집할 채널을 추가하고 관리하세요</p>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">전체 채널</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{channels.length}</p>
          <p className="mt-1 text-sm text-green-600">+2개 지난 주</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">활성 채널</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {channels.filter(ch => ch.analysisStatus === 'active' || ch.updatedAt).length}
          </p>
          <p className="mt-1 text-sm text-gray-600">자동 수집 중</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">오류 채널</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {channels.filter(ch => ch.analysisStatus === 'error').length}
          </p>
          <p className="mt-1 text-sm text-red-600">확인 필요</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">총 구독자</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(channels.reduce((sum, ch) => sum + (ch.subscribers || 0), 0))}
          </p>
          <p className="mt-1 text-sm text-gray-600">전체 도달 범위</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white rounded-lg shadow">
        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6 pt-6">
            <button
              onClick={() => setActiveTab('channels')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'channels'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📺 채널 관리
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎯 채널 그룹
            </button>
          </nav>
        </div>

        {/* 툴바 */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                placeholder={activeTab === 'channels' ? "채널 검색..." : "그룹 검색..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              />
              {activeTab === 'channels' && (
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="border-gray-300 rounded-md"
                >
                  <option value="All">모든 플랫폼</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                </select>
              )}
              <button
                onClick={() => activeTab === 'channels' ? setShowAddModal(true) : setShowGroupModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              >
                {activeTab === 'channels' ? '+ 채널 추가' : '+ 그룹 생성'}
              </button>
              {activeTab === 'groups' && (
                <button
                  onClick={handleAllGroupsCollect}
                  disabled={isGroupsLoading}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-green-400"
                >
                  {isGroupsLoading ? '수집 중...' : '🎯 전체 그룹 수집'}
                </button>
              )}
              {activeTab === 'channels' && (
                <button
                  onClick={() => setShowCollectionModal(true)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  🎯 일괄 수집
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedChannels(new Set());
              }}
              className={`px-3 py-1 text-sm rounded ${
                isSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isSelectMode ? '선택 취소' : '선택 모드'}
            </button>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        {activeTab === 'channels' ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {isSelectMode && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedChannels.size === filteredChannels.length && filteredChannels.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  채널
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  플랫폼
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  구독자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영상 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마지막 확인
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  자동 수집
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChannels.map((channel) => (
                <tr key={channel.id} className="hover:bg-gray-50">
                  {isSelectMode && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedChannels.has(channel.id)}
                        onChange={() => handleSelectToggle(channel.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img 
                        src={channel.thumbnailUrl || `https://placehold.co/100x100/3B82F6/FFFFFF?text=${(channel.name || 'C').charAt(0)}`} 
                        alt={channel.name || ''}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      <div>
                        <button
                          onClick={() => setChannelToAnalyze(channel.name || '')}
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {channel.name}
                        </button>
                        <div className="text-xs text-gray-500">{channel.url || 'URL 없음'}</div>
                        {channel.keywords && channel.keywords.length > 0 && (
                          <div className="text-xs text-blue-500 mt-1">
                            키워드: {channel.keywords.slice(0, 3).join(', ')}{channel.keywords.length > 3 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      channel.platform === PLATFORMS.YOUTUBE ? 'bg-red-100 text-red-700' :
                      channel.platform === 'TIKTOK' ? 'bg-pink-100 text-pink-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {channel.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatNumber(channel.subscribers || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {channel.totalVideos || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      channel.analysisStatus === 'active' || channel.updatedAt ? 'bg-green-100 text-green-700' :
                      channel.analysisStatus === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {channel.analysisStatus === 'active' || channel.updatedAt ? '활성' : 
                       channel.analysisStatus === 'error' ? '오류' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {channel.updatedAt ? formatLastChecked(channel.updatedAt) : '미분석'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => {}}
                        className="rounded border-gray-300 text-indigo-600 mr-2"
                      />
                      <span className="text-xs text-gray-500">매일</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        수집
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        편집
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

            {filteredChannels.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">😅</p>
                <p className="mt-2">채널이 없습니다.</p>
              </div>
            )}
          </>
        ) : (
          // 그룹 관리
          <div className="p-6">
            {isGroupsLoading ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">⏳</p>
                <p className="mt-2">그룹 데이터를 불러오는 중...</p>
              </div>
            ) : groupsError && groups.length === 0 ? (
              <div className="text-center py-12 text-red-500">
                <p className="text-lg">❌</p>
                <p className="mt-2">그룹 데이터 로딩에 실패했습니다.</p>
                <p className="text-sm mt-2">{groupsError}</p>
                <button 
                  onClick={() => refreshGroups()}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                  다시 시도
                </button>
              </div>
            ) : groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div key={group._id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    {/* 그룹 헤더 */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: group.color }}
                          ></div>
                          <h3 className="font-semibold text-gray-900">{group.name}</h3>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleGroupEdit(group)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="편집"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleGroupDelete(group._id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                      
                      {/* 활성화 상태 */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          group.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {group.isActive ? '✅ 활성' : '⏸️ 비활성'}
                        </span>
                        <button
                          onClick={() => handleGroupToggleActive(group._id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {group.isActive ? '비활성화' : '활성화'}
                        </button>
                      </div>
                    </div>

                    {/* 그룹 정보 */}
                    <div className="p-4 space-y-3">
                      {/* 채널 목록 */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-2">포함 채널 ({group.channels.length}개)</h4>
                        <div className="space-y-1">
                          {group.channels.slice(0, 3).map((channel: string, index: number) => (
                            <div key={index} className="text-sm text-gray-700 truncate">
                              📺 {channel}
                            </div>
                          ))}
                          {group.channels.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{group.channels.length - 3}개 더
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 키워드 */}
                      {group.keywords.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 mb-2">키워드</h4>
                          <div className="flex flex-wrap gap-1">
                            {group.keywords.slice(0, 4).map((keyword: string, index: number) => (
                              <span key={index} className="inline-flex px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {keyword}
                              </span>
                            ))}
                            {group.keywords.length > 4 && (
                              <span className="text-xs text-gray-500">+{group.keywords.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 마지막 수집 시간 */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">마지막 수집</h4>
                        <div className="text-sm text-gray-700">
                          {group.lastCollectedAt ? formatLastChecked(group.lastCollectedAt) : '수집 안함'}
                        </div>
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleGroupCollect(group._id)}
                          disabled={!group.isActive || group.channels.length === 0}
                          className="flex-1 px-3 py-2 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          🎯 수집 시작
                        </button>
                        <button className="px-3 py-2 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          📊 통계 보기
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">🎯</p>
                <p className="mt-2">아직 생성된 채널 그룹이 없습니다.</p>
                <p className="text-sm mt-2">첫 번째 그룹을 생성해보세요!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 선택 모드 액션 바 */}
      {isSelectMode && selectedChannels.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedChannels.size}개 선택됨
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowAnalysisModal(true)}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                📊 영상 분석
              </button>
              <button 
                onClick={() => setShowCollectionModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                선택한 채널 수집
              </button>
              <button className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                선택 삭제
              </button>
              <button
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedChannels(new Set());
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달들 */}
      <AddChannelModal />
      <ChannelAnalysisModal
        channelName={channelToAnalyze}
        onClose={() => setChannelToAnalyze(null)}
      />
      <VideoAnalysisModal
        isOpen={showAnalysisModal}
        selectedChannels={Array.from(selectedChannels).map(id => {
          const channel = channels.find(ch => ch.id === id);
          return channel?.name || '';
        }).filter(name => name)}
        onClose={() => setShowAnalysisModal(false)}
      />
      <BulkCollectionModal
        isOpen={showCollectionModal}
        selectedChannels={Array.from(selectedChannels).map(id => {
          const channel = channels.find(ch => ch.id === id);
          return channel?.name || '';
        }).filter(name => name)}
        allVisibleChannels={filteredChannels.map(ch => ch.name || '')}
        onClose={() => setShowCollectionModal(false)}
        onCollectionComplete={handleCollectionComplete}
      />
      <ChannelGroupModal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setEditingGroup(null);
        }}
        onSave={handleGroupSave}
        editingGroup={editingGroup}
        availableChannels={channels.map(ch => ch.name || '').filter(name => name)}
      />
    </main>
  );
};

export default ChannelManagementPage;