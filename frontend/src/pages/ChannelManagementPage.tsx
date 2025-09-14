import React, { useState, useEffect } from 'react';
import { useChannels } from '../shared/hooks';
import { useChannelGroups, ChannelGroup as HookChannelGroup } from '../features/channel-management/model/useChannelGroups';
import { CollectionBatch, Channel, Video } from '../shared/types';
import { FRONTEND_CONSTANTS } from '../shared/config';

// Local ChannelGroup interface compatible with both hook and component
interface ChannelGroup {
  _id?: string;
  name: string;
  description: string;
  color: string;
  channels: string[];  // Simplified to string array for component usage
  keywords: string[];
  isActive: boolean;
  lastCollectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
import { useAppContext } from '../app/providers';
import { ChannelAnalysisModal } from '../features/channel-management';
import { VideoAnalysisModal } from '../features/video-analysis';
import { BulkCollectionModal } from '../features/trending-collection';
import { ChannelGroupModal } from '../features/channel-management';
import { SearchBar } from '../shared/components';
import { BatchCard } from '../features/trending-collection';
import { VideoCard } from '../shared/components';
import { formatViews, formatDate } from '../shared/utils';
import { ChannelCard } from '../features/channel-management';
import ChannelGroupCard from '../features/channel-management/ui/ChannelGroupCard';

import { PLATFORMS } from '../shared/types/api';
import { useSelection, useMultiModal, useSearch, useFilter } from '../shared/hooks';
import { ActionBar } from '../shared/components';

const ChannelManagementPage: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const channelSelection = useSelection<string>();
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // 🎯 탭 관련 상태
  const [activeTab, setActiveTab] = useState<'channels' | 'groups'>('channels');
  const [editingGroup, setEditingGroup] = useState<ChannelGroup | null>(null);
  
  // 📦 그룹별 배치 관련 상태
  const [selectedGroupForBatches, setSelectedGroupForBatches] = useState<ChannelGroup | null>(null);
  const [groupBatches, setGroupBatches] = useState<CollectionBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<CollectionBatch | null>(null);
  const [batchVideos, setBatchVideos] = useState<Video[]>([]);
  const [showBatchVideosModal, setShowBatchVideosModal] = useState(false);
  const [showGroupBatchesModal, setShowGroupBatchesModal] = useState(false);

  // 🔧 수집 조건 상태
  const [collectionFilters, setCollectionFilters] = useState({
    daysBack: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.DAYS_BACK,        // 최근 n일
    minViews: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.MIN_VIEWS,    // 최소 조회수
    maxVideos: 50       // 최대 영상 수
  });
  
  // 🔥 Modal 상태 관리 통합
  const modalTypes = ['add', 'channelAnalysis', 'videoAnalysis', 'collection', 'group'];
  const { 
    modals, 
    selectedItems, 
    openModal, 
    closeModal,
    closeAllModals 
  } = useMultiModal(modalTypes);

  // API 훅 (실제 데이터 가져오기)
  const { data: apiChannels = [], isLoading, error, refetch: refetchChannels } = useChannels();
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



  useEffect(() => {
    // 실제 API 데이터만 사용
    setChannels(apiChannels);
  }, [apiChannels]);

  // useEffect for fetching batches removed - now handled by group click

  // 🔍 Search and Filter hooks
  const { searchTerm, setSearchTerm, filteredData: searchedChannels } = useSearch(channels, {
    searchFields: ['name', 'keywords'] as (keyof Channel)[],
    defaultSearchTerm: ''
  });

  const { filters, updateFilter, filteredData: filteredChannels } = useFilter(searchedChannels, {
    defaultFilters: { platform: 'All' },
    filterFunctions: {
      platform: (item: Channel, value: string) => {
        if (value === 'All') return true;
        return (item.platform || '').toLowerCase() === value.toLowerCase();
      }
    }
  });


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
    channelSelection.toggle(channelId);
  };

  const handleSelectAll = () => {
    channelSelection.selectAll(filteredChannels.map(ch => ch.id));
  };

  const handleCollectionComplete = (batch: CollectionBatch, videos: Video[]) => {
    // 전역 상태에 배치와 영상 추가
    addCollectionBatch(batch, videos);
    console.log('수집 완료:', batch, videos);
    alert(`"${batch.name}" 배치로 ${videos.length}개 영상이 수집되었습니다! 대시보드에서 확인하세요.`);
    closeModal('collection');
  };

  // Conversion functions between component and hook interfaces
  const convertToHookFormat = async (group: ChannelGroup): Promise<HookChannelGroup> => {
    // 채널 이름으로 실제 채널 ID 조회
    const channelsWithIds = await Promise.all(
      group.channels.map(async (channelName) => {
        try {
          // 채널 이름으로 실제 채널 정보 조회
          const channel = channels.find(ch => ch.name === channelName);
          if (channel && channel.id) {
            console.log('✅ 채널 이름 → 채널 ID:', channelName, '→', channel.id);
            return { id: channel.id, name: channelName };
          } else {
            console.warn('⚠️ 채널을 찾을 수 없음:', channelName);
            // 찾을 수 없는 경우 일단 이름을 ID로 사용 (기존 동작)
            return { id: channelName, name: channelName };
          }
        } catch (error) {
          console.error('❌ 채널 조회 실패:', channelName, error);
          return { id: channelName, name: channelName };
        }
      })
    );

    return {
      ...group,
      channels: channelsWithIds
    };
  };

  const convertFromHookFormat = (group: HookChannelGroup): ChannelGroup => ({
    ...group,
    channels: group.channels.map(ch => typeof ch === 'string' ? ch : ch.name)
  });

  // 그룹 관련 핸들러들
  const handleGroupSave = async (groupData: ChannelGroup) => {
    try {
      console.log('🔍 그룹 저장 시작:', groupData);
      const hookGroupData = await convertToHookFormat(groupData);
      console.log('🔍 변환된 그룹 데이터:', hookGroupData);

      if (editingGroup) {
        // 수정 모드
        await updateGroup(editingGroup._id!, hookGroupData);
        console.log('✅ 그룹 수정 완료:', groupData);
      } else {
        // 생성 모드
        await createGroup(hookGroupData);
        console.log('✅ 새 그룹 생성 완료:', groupData);
      }
      closeModal('group');
      setEditingGroup(null);
    } catch (error) {
      console.error('그룹 저장 실패:', error);
      alert('그룹 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleGroupEdit = (group: HookChannelGroup) => {
    const convertedGroup = convertFromHookFormat(group);
    setEditingGroup(convertedGroup);
    openModal('group');
  };

  // 📦 그룹별 배치 관련 핸들러들
  const fetchGroupBatches = async (groupId: string) => {
    setBatchesLoading(true);
    try {
      // targetGroups 필드에 그룹 ID가 포함된 배치들을 조회
      const response = await fetch(`/api/batches?limit=50&sortBy=createdAt&sortOrder=desc`);
      const result = await response.json();
      if (result.success) {
        // 해당 그룹에 속하는 배치들만 필터링
        const filteredBatches = result.data.filter((batch: CollectionBatch) => 
          batch.targetGroups?.some((group: any) => group._id === groupId || group === groupId)
        );
        setGroupBatches(filteredBatches);
      }
    } catch (error) {
      console.error('그룹 배치 목록 조회 실패:', error);
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleGroupClick = (group: ChannelGroup) => {
    setSelectedGroupForBatches(group);
    setShowGroupBatchesModal(true);
    fetchGroupBatches(group._id!);
  };

  const handleCloseGroupBatchesModal = () => {
    setShowGroupBatchesModal(false);
    setSelectedGroupForBatches(null);
    setGroupBatches([]);
  };

  const handleBatchClick = async (batch: CollectionBatch) => {
    if (batch.status !== 'completed') return;
    
    setSelectedBatch(batch);
    setShowBatchVideosModal(true);
    
    try {
      const response = await fetch(`/api/batches/${batch._id}/videos?limit=100`);
      const result = await response.json();
      if (result.success) {
        setBatchVideos(result.data);
      }
    } catch (error) {
      console.error('배치 영상 목록 조회 실패:', error);
    }
  };

  const handleBatchDelete = async (batchId: string) => {
    if (!confirm('정말로 이 배치를 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/batches/${batchId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        // 선택된 그룹이 있으면 해당 그룹의 배치들만 새로고침
        if (selectedGroupForBatches) {
          fetchGroupBatches(selectedGroupForBatches._id!);
        }
      } else {
        alert('배치 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('배치 삭제 실패:', error);
      alert('배치 삭제 중 오류가 발생했습니다.');
    }
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

  const handleChannelDelete = async (channel: Channel) => {
    if (!confirm(`정말로 "${channel.name}" 채널을 삭제하시겠습니까?`)) return;
    
    try {
      const response = await fetch(`/api/channels/${channel.id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 채널 목록 새로고침
        refetchChannels();
        alert('채널이 성공적으로 삭제되었습니다.');
      } else {
        alert(`채널 삭제에 실패했습니다: ${result.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('채널 삭제 실패:', error);
      alert('채널 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleGroupCollect = async (groupId: string) => {
    console.log('🎯 handleGroupCollect 호출됨:', groupId);
    
    const group = groups.find(g => g._id === groupId);
    if (!group) {
      console.error('❌ 그룹을 찾을 수 없음:', groupId);
      return;
    }
    
    console.log('✅ 그룹 찾음:', group.name, group);
    
    try {
      console.log(`🚀 그룹 "${group.name}" 수집 시작...`);
      console.log('📋 수집 조건:', collectionFilters);
      
      // TrendingCollectionPage와 정확히 동일한 방식 사용
      const response = await fetch(`http://localhost:3000/api/channel-groups/collect-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daysBack: collectionFilters.daysBack,  // 필드명 통일
          minViews: collectionFilters.minViews,
          maxViews: null,
          includeShorts: true,
          includeMidform: true,
          includeLongForm: true,
          keywords: [],
          excludeKeywords: [],
          groupIds: [groupId]
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`그룹 "${group.name}" 수집 완료!\n${data.data.totalVideosSaved || 0}개 영상이 수집되었습니다.`);
        // 그룹 목록 새로고침
        await refreshGroups();
      } else {
        alert(`수집 실패: ${data.message || '알 수 없는 오류'}`);
      }
      
      console.log('✅ 수집 응답:', data);
    } catch (error) {
      console.error('❌ 그룹 수집 실패:', error);
      alert(`그룹 수집에 실패했습니다: ${error.message || error}`);
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
        daysBack: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.DAYS_BACK,
        minViews: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.MIN_VIEWS,
        includeShorts: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_SHORTS,
        includeLongForm: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_LONGFORM
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

    if (!modals.add) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">새 채널 추가</h2>
            <button 
              onClick={() => closeModal('add')}
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
              onClick={() => closeModal('add')}
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
      <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
            {formatViews(channels.reduce((sum, ch) => sum + (ch.subscribers || 0), 0))}
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

        {/* 🔍 Search and Filter Bar */}
        {activeTab === 'channels' && (
          <div className="p-6 border-b">
            <SearchBar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              placeholder={activeTab === 'channels' ? "채널 검색..." : "그룹 검색..."}
              showFilters={true}
              className="mb-0"
            >
              <select
                value={filters.platform || 'All'}
                onChange={(e) => updateFilter('platform', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="All">모든 플랫폼</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
              </select>
            </SearchBar>
            
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => openModal('add')}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                  + 채널 추가
                </button>
                <button
                  onClick={() => openModal('collection')}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  🎯 일괄 수집
                </button>
              </div>
              
              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  channelSelection.clear();
                }}
                className={`px-3 py-1 text-sm rounded ${
                  isSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isSelectMode ? '선택 취소' : '선택 모드'}
              </button>
            </div>
          </div>
        )}
        
        {/* Groups Tab Toolbar */}
        {activeTab === 'groups' && (
          <div className="p-6 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  placeholder="그룹 검색..."
                  className="px-4 py-2 border border-gray-300 rounded-md"
                />
                
                {/* 수집 조건 필터 */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">최근</label>
                  <select 
                    value={collectionFilters.daysBack}
                    onChange={(e) => setCollectionFilters({...collectionFilters, daysBack: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value={1}>1일</option>
                    <option value={3}>3일</option>
                    <option value={7}>7일</option>
                    <option value={14}>14일</option>
                    <option value={30}>30일</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">최소 조회수</label>
                  <select 
                    value={collectionFilters.minViews}
                    onChange={(e) => setCollectionFilters({...collectionFilters, minViews: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value={1000}>1천</option>
                    <option value={5000}>5천</option>
                    <option value={10000}>1만</option>
                    <option value={50000}>5만</option>
                    <option value={100000}>10만</option>
                    <option value={500000}>50만</option>
                    <option value={1000000}>100만</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => openModal('group')}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                  + 그룹 생성
                </button>
                <button
                  onClick={handleAllGroupsCollect}
                  disabled={isGroupsLoading}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-green-400"
                >
                  {isGroupsLoading ? '수집 중...' : '🎯 전체 그룹 수집'}
                </button>
              </div>
            </div>
            
            {/* 현재 설정된 조건 표시 */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>수집 조건:</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                최근 {collectionFilters.daysBack}일
              </span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                {collectionFilters.minViews.toLocaleString()}회 이상
              </span>
            </div>
          </div>
        )}


        {/* 컨텐츠 영역 */}
        {activeTab === 'channels' ? (
          <div className="p-6">
            {/* 전체 선택 버튼 (선택 모드일 때만) */}
            {isSelectMode && (
              <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={channelSelection.count === filteredChannels.length && filteredChannels.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    전체 선택 ({channelSelection.count}/{filteredChannels.length})
                  </span>
                </label>
              </div>
            )}

            {/* 채널 카드 그리드 */}
            {filteredChannels.length > 0 ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                {filteredChannels.map((channel) => (
                  <ChannelCard
                    key={channel._id}
                    channel={channel}
                    isSelected={channelSelection.isSelected(channel.id)}
                    onSelect={handleSelectToggle}
                    onChannelClick={(channel) => openModal('channelAnalysis', channel.name || '')}
                    onCollect={(channel) => console.log('수집:', channel.name)}
                    onAnalyze={(channel) => openModal('channelAnalysis', channel.name || '')}
                    onEdit={(channel) => console.log('편집:', channel.name)}
                    onKeywordClick={(keyword) => setSearchTerm(keyword)}
                    showSelection={isSelectMode}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">😅</p>
                <p className="mt-2">채널이 없습니다.</p>
              </div>
            )}
          </div>
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
              <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {groups.map((group) => (
                  <ChannelGroupCard
                    key={group._id}
                    group={group}
                    onClick={handleGroupClick}
                    onEdit={handleGroupEdit}
                  />
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
      <ActionBar
        isVisible={isSelectMode}
        selectedCount={channelSelection.count}
        totalCount={filteredChannels.length}
        itemType="개 채널"
        onSelectAll={() => channelSelection.selectAll(filteredChannels.map(c => c.id))}
        onClearSelection={() => {
          setIsSelectMode(false);
          channelSelection.clear();
        }}
        onDelete={() => console.log('채널 삭제')}
        additionalActions={
          <>
            <button 
              onClick={() => openModal('videoAnalysis')}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              📊 영상 분석
            </button>
            <button 
              onClick={() => openModal('collection')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              선택한 채널 수집
            </button>
          </>
        }
      />

      {/* 모달들 */}
      <AddChannelModal />
      <ChannelAnalysisModal
        channelName={selectedItems.channelAnalysis}
        onClose={() => closeModal('channelAnalysis')}
      />
      <VideoAnalysisModal
        isOpen={modals.videoAnalysis}
        selectedChannels={Array.from(channelSelection.selected).map(id => {
          const channel = channels.find(ch => ch.id === id);
          return channel?.name || '';
        }).filter(name => name)}
        onClose={() => closeModal('videoAnalysis')}
      />
      <BulkCollectionModal
        isOpen={modals.collection}
        selectedChannels={Array.from(channelSelection.selected).map(id => {
          const channel = channels.find(ch => ch.id === id);
          return channel?.name || '';
        }).filter(name => name)}
        allVisibleChannels={filteredChannels.map(ch => ch.name || '')}
        onClose={() => closeModal('collection')}
        onCollectionComplete={handleCollectionComplete}
      />
      <ChannelGroupModal
        isOpen={modals.group}
        onClose={() => {
          closeModal('group');
          setEditingGroup(null);
        }}
        onSave={handleGroupSave}
        editingGroup={editingGroup}
        availableChannels={channels.map(ch => ch.name || '').filter(name => name)}
      />

      {/* Group Batches Modal */}
      {showGroupBatchesModal && selectedGroupForBatches && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedGroupForBatches.color }}
                ></div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedGroupForBatches.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedGroupForBatches.channels.length}개 채널의 수집 배치 목록
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleGroupCollect(selectedGroupForBatches._id!)}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                  🎯 새 수집 시작
                </button>
                <button
                  onClick={handleCloseGroupBatchesModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {batchesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-gray-600">배치 목록 로딩중...</span>
                </div>
              ) : groupBatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupBatches.map((batch) => (
                    <BatchCard
                      key={batch._id}
                      batch={batch}
                      onClick={handleBatchClick}
                      onDelete={handleBatchDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">📦</p>
                  <p className="mt-2">이 그룹에서 생성된 수집 배치가 없습니다.</p>
                  <p className="text-sm mt-2">"새 수집 시작" 버튼을 눌러 배치를 생성해보세요!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Videos Modal */}
      {showBatchVideosModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedBatch.name} - 수집된 영상
                </h2>
                <p className="text-gray-600 mt-1">
                  {selectedBatch.totalVideosSaved}개 영상 | {formatDate(selectedBatch.createdAt)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBatchVideosModal(false);
                  setSelectedBatch(null);
                  setBatchVideos([]);
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                ✕
              </button>
            </div>

            {/* Videos List */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {batchVideos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-2">수집된 영상이 없습니다</div>
                  <div className="text-gray-400">이 배치에서 수집된 영상이 없거나 데이터를 찾을 수 없습니다.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {batchVideos.map((video) => (
                    <VideoCard 
                      key={video._id} 
                      video={video}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ChannelManagementPage;