import React, { useState, useEffect } from 'react';
import { useChannels } from '../hooks/useApi';
import { CollectionBatch } from '../types';
import { FieldMapper } from '../types/field-mapper';
import { useAppContext } from '../App';
import ChannelAnalysisModal from '../components/ChannelAnalysisModal';
import VideoAnalysisModal from '../components/VideoAnalysisModal';
import BulkCollectionModal from '../components/BulkCollectionModal';

// LocalChannel 인터페이스 제거 - 직접 FieldMapper 사용

const ChannelManagementPage: React.FC = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // API 훅 (실제 데이터 가져오기)
  const { data: apiChannels = [], isLoading, error } = useChannels();
  const { addCollectionBatch } = useAppContext();

  // Mock 데이터 - FieldMapper와 호환되도록 수정
  const mockChannels: any[] = [
    {
      [FieldMapper.get('ID')]: 1,
      [FieldMapper.get('CHANNEL_NAME')]: '개발왕 김코딩',
      [FieldMapper.get('PLATFORM')]: 'YouTube',
      [FieldMapper.get('CHANNEL_URL')]: 'https://youtube.com/@kimcoding',
      [FieldMapper.get('SUBSCRIBERS')]: 1250000,
      [FieldMapper.get('CHANNEL_VIDEOS')]: 342,
      [FieldMapper.get('UPDATED_AT')]: '2024-01-15T10:30:00',
      [FieldMapper.get('ANALYSIS_STATUS')]: 'active',
      [FieldMapper.get('THUMBNAIL_URL')]: 'https://placehold.co/100x100/3B82F6/FFFFFF?text=K'
    },
    {
      [FieldMapper.get('ID')]: 2,
      [FieldMapper.get('CHANNEL_NAME')]: '요리하는 남자',
      [FieldMapper.get('PLATFORM')]: 'TikTok',
      [FieldMapper.get('CHANNEL_URL')]: 'https://tiktok.com/@cookingman',
      [FieldMapper.get('SUBSCRIBERS')]: 3450000,
      [FieldMapper.get('CHANNEL_VIDEOS')]: 567,
      [FieldMapper.get('UPDATED_AT')]: '2024-01-15T09:15:00',
      [FieldMapper.get('ANALYSIS_STATUS')]: 'active',
      [FieldMapper.get('THUMBNAIL_URL')]: 'https://placehold.co/100x100/F43F5E/FFFFFF?text=C'
    },
    {
      [FieldMapper.get('ID')]: 3,
      [FieldMapper.get('CHANNEL_NAME')]: '카페찾아 삼만리',
      [FieldMapper.get('PLATFORM')]: 'Instagram',
      [FieldMapper.get('CHANNEL_URL')]: 'https://instagram.com/cafe_explorer',
      [FieldMapper.get('SUBSCRIBERS')]: 89000,
      [FieldMapper.get('CHANNEL_VIDEOS')]: 124,
      [FieldMapper.get('UPDATED_AT')]: '2024-01-14T18:00:00',
      [FieldMapper.get('ANALYSIS_STATUS')]: 'inactive',
      [FieldMapper.get('THUMBNAIL_URL')]: 'https://placehold.co/100x100/8B5CF6/FFFFFF?text=T'
    },
    {
      [FieldMapper.get('ID')]: 4,
      [FieldMapper.get('CHANNEL_NAME')]: '냥냥펀치',
      [FieldMapper.get('PLATFORM')]: 'YouTube',
      [FieldMapper.get('CHANNEL_URL')]: 'https://youtube.com/@nyangpunch',
      [FieldMapper.get('SUBSCRIBERS')]: 567000,
      [FieldMapper.get('CHANNEL_VIDEOS')]: 89,
      [FieldMapper.get('UPDATED_AT')]: '2024-01-15T11:00:00',
      [FieldMapper.get('ANALYSIS_STATUS')]: 'error',
      [FieldMapper.get('THUMBNAIL_URL')]: 'https://placehold.co/100x100/F97316/FFFFFF?text=P'
    },
    {
      [FieldMapper.get('ID')]: 5,
      [FieldMapper.get('CHANNEL_NAME')]: '캠핑은 장비빨',
      [FieldMapper.get('PLATFORM')]: 'YouTube',
      [FieldMapper.get('CHANNEL_URL')]: 'https://youtube.com/@campinggear',
      [FieldMapper.get('SUBSCRIBERS')]: 234000,
      [FieldMapper.get('CHANNEL_VIDEOS')]: 156,
      [FieldMapper.get('UPDATED_AT')]: '2024-01-15T08:45:00',
      [FieldMapper.get('ANALYSIS_STATUS')]: 'active',
      [FieldMapper.get('THUMBNAIL_URL')]: 'https://placehold.co/100x100/22C55E/FFFFFF?text=C'
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
    const channelName = FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME') || '';
    const channelPlatform = FieldMapper.getTypedField<string>(channel, 'PLATFORM') || '';
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
      setSelectedChannels(new Set(filteredChannels.map(ch => String(FieldMapper.getTypedField<number>(ch, 'ID') || FieldMapper.getTypedField<string>(ch, 'ID')))));
    }
  };

  const handleCollectionComplete = (batch: CollectionBatch, videos: any[]) => {
    // 전역 상태에 배치와 영상 추가
    addCollectionBatch(batch, videos);
    console.log('수집 완료:', batch, videos);
    alert(`"${batch.name}" 배치로 ${videos.length}개 영상이 수집되었습니다! 대시보드에서 확인하세요.`);
    setShowCollectionModal(false);
  };

  const AddChannelModal: React.FC = () => {
    const [newChannel, setNewChannel] = useState({
      [FieldMapper.get('CHANNEL_URL')]: '',
      [FieldMapper.get('PLATFORM')]: 'YouTube',
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
                value={(newChannel[FieldMapper.get('CHANNEL_URL')] as string) || ''}
                onChange={(e) => setNewChannel({...newChannel, [FieldMapper.get('CHANNEL_URL')]: e.target.value})}
                placeholder="https://youtube.com/@channel"
                className="w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                플랫폼
              </label>
              <select
                value={(newChannel[FieldMapper.get('PLATFORM')] as string) || 'YouTube'}
                onChange={(e) => setNewChannel({...newChannel, [FieldMapper.get('PLATFORM')]: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram">Instagram</option>
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
            {channels.filter(ch => FieldMapper.getTypedField<string>(ch, 'ANALYSIS_STATUS') === 'active' || FieldMapper.getTypedField<string>(ch, 'UPDATED_AT')).length}
          </p>
          <p className="mt-1 text-sm text-gray-600">자동 수집 중</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">오류 채널</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {channels.filter(ch => FieldMapper.getTypedField<string>(ch, 'ANALYSIS_STATUS') === 'error').length}
          </p>
          <p className="mt-1 text-sm text-red-600">확인 필요</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">총 구독자</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(channels.reduce((sum, ch) => sum + (FieldMapper.getTypedField<number>(ch, 'SUBSCRIBERS') || 0), 0))}
          </p>
          <p className="mt-1 text-sm text-gray-600">전체 도달 범위</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white rounded-lg shadow">
        {/* 툴바 */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                placeholder="채널 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              />
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
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              >
                + 채널 추가
              </button>
              <button
                onClick={() => setShowCollectionModal(true)}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                🎯 일괄 수집
              </button>
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

        {/* 채널 테이블 */}
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
                <tr key={FieldMapper.getTypedField<number>(channel, 'ID') || FieldMapper.getTypedField<string>(channel, 'ID')} className="hover:bg-gray-50">
                  {isSelectMode && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedChannels.has(String(FieldMapper.getTypedField<number>(channel, 'ID') || FieldMapper.getTypedField<string>(channel, 'ID')))}
                        onChange={() => handleSelectToggle(String(FieldMapper.getTypedField<number>(channel, 'ID') || FieldMapper.getTypedField<string>(channel, 'ID')))}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img 
                        src={FieldMapper.getTypedField<string>(channel, 'THUMBNAIL_URL') || `https://placehold.co/100x100/3B82F6/FFFFFF?text=${(FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME') || 'C').charAt(0)}`} 
                        alt={FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME') || ''}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      <div>
                        <button
                          onClick={() => setChannelToAnalyze(FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME') || '')}
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME')}
                        </button>
                        <div className="text-xs text-gray-500">{FieldMapper.getTypedField<string>(channel, 'CHANNEL_URL') || 'URL 없음'}</div>
                        {FieldMapper.getTypedField<string[]>(channel, 'KEYWORDS') && FieldMapper.getTypedField<string[]>(channel, 'KEYWORDS')!.length > 0 && (
                          <div className="text-xs text-blue-500 mt-1">
                            키워드: {FieldMapper.getTypedField<string[]>(channel, 'KEYWORDS')!.slice(0, 3).join(', ')}{FieldMapper.getTypedField<string[]>(channel, 'KEYWORDS')!.length > 3 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      FieldMapper.getTypedField<string>(channel, 'PLATFORM') === 'YouTube' ? 'bg-red-100 text-red-700' :
                      FieldMapper.getTypedField<string>(channel, 'PLATFORM') === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {FieldMapper.getTypedField<string>(channel, 'PLATFORM')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatNumber(FieldMapper.getTypedField<number>(channel, 'SUBSCRIBERS') || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {FieldMapper.getTypedField<number>(channel, 'CHANNEL_VIDEOS') || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      FieldMapper.getTypedField<string>(channel, 'ANALYSIS_STATUS') === 'active' || FieldMapper.getTypedField<string>(channel, 'UPDATED_AT') ? 'bg-green-100 text-green-700' :
                      FieldMapper.getTypedField<string>(channel, 'ANALYSIS_STATUS') === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {FieldMapper.getTypedField<string>(channel, 'ANALYSIS_STATUS') === 'active' || FieldMapper.getTypedField<string>(channel, 'UPDATED_AT') ? '활성' : 
                       FieldMapper.getTypedField<string>(channel, 'ANALYSIS_STATUS') === 'error' ? '오류' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {FieldMapper.getTypedField<string>(channel, 'UPDATED_AT') ? formatLastChecked(FieldMapper.getTypedField<string>(channel, 'UPDATED_AT')!) : '미분석'}
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
          const channel = channels.find(ch => String(FieldMapper.getTypedField<number>(ch, 'ID') || FieldMapper.getTypedField<string>(ch, 'ID')) === id);
          return channel ? FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME') || '' : '';
        }).filter(name => name)}
        onClose={() => setShowAnalysisModal(false)}
      />
      <BulkCollectionModal
        isOpen={showCollectionModal}
        selectedChannels={Array.from(selectedChannels).map(id => {
          const channel = channels.find(ch => String(FieldMapper.getTypedField<number>(ch, 'ID') || FieldMapper.getTypedField<string>(ch, 'ID')) === id);
          return channel ? FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME') || '' : '';
        }).filter(name => name)}
        allVisibleChannels={filteredChannels.map(ch => FieldMapper.getTypedField<string>(ch, 'CHANNEL_NAME') || '')}
        onClose={() => setShowCollectionModal(false)}
        onCollectionComplete={handleCollectionComplete}
      />
    </main>
  );
};

export default ChannelManagementPage;