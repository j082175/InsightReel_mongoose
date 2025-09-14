import React, { useState, useEffect } from 'react';
import { CollectionBatch, Channel, Video } from '../shared/types';
import { useChannelGroups, ChannelGroup } from '../features/channel-management/model/useChannelGroups';
import { useChannels } from '../shared/hooks';
import { PLATFORMS } from '../shared/types/api';
import { FRONTEND_CONSTANTS } from '../shared/config';

interface CollectionFilters {
  daysBack: number;
  minViews: number;
  maxViews: number | null;
  includeShorts: boolean;
  includeMidform: boolean;
  includeLongForm: boolean;
  keywords: string[];
  excludeKeywords: string[];
}

interface CollectionTarget {
  type: 'groups' | 'channels';
  selectedGroups: string[];
  selectedChannels: string[];
}

const TrendingCollectionPage: React.FC = () => {
  // State
  const [collectionTarget, setCollectionTarget] = useState<CollectionTarget>({
    type: 'groups',
    selectedGroups: [],
    selectedChannels: []
  });
  
  const [filters, setFilters] = useState<CollectionFilters>({
    daysBack: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.DAYS_BACK,
    minViews: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.MIN_VIEWS,
    maxViews: null,
    includeShorts: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_SHORTS,
    includeMidform: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_MIDFORM,
    includeLongForm: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_LONGFORM,
    keywords: [],
    excludeKeywords: []
  });

  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionProgress, setCollectionProgress] = useState<string>('');

  // Hooks
  const { groups: channelGroups, isLoading: groupsLoading, error: groupsError, refreshGroups } = useChannelGroups();
  const { data: channels = [], isLoading: channelsLoading } = useChannels();

  const handleTargetTypeChange = (type: 'groups' | 'channels') => {
    setCollectionTarget({
      type,
      selectedGroups: [],
      selectedChannels: []
    });
  };

  const handleGroupSelection = (groupId: string) => {
    setCollectionTarget(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter(id => id !== groupId)
        : [...prev.selectedGroups, groupId]
    }));
  };

  const handleChannelSelection = (channelId: string) => {
    setCollectionTarget(prev => ({
      ...prev,
      selectedChannels: prev.selectedChannels.includes(channelId)
        ? prev.selectedChannels.filter(id => id !== channelId)
        : [...prev.selectedChannels, channelId]
    }));
  };

  const handleStartCollection = async () => {
    if (isCollecting) return;

    setIsCollecting(true);
    setCollectionProgress('수집 시작...');

    try {
      let endpoint = '';
      let requestBody: CollectionFilters & { groupIds?: string[]; channels?: string[] } = {
        ...filters
      };

      if (collectionTarget.type === 'groups') {
        endpoint = '/api/channel-groups/collect-multiple';
        requestBody.groupIds = collectionTarget.selectedGroups;
      } else {
        endpoint = '/api/collect-trending';
        requestBody.channels = collectionTarget.selectedChannels;
      }

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        setCollectionProgress(`수집 완료! ${data.data.totalVideosSaved}개 영상 수집됨`);
      } else {
        setCollectionProgress(`수집 실패: ${data.message}`);
      }
    } catch (error) {
      setCollectionProgress(`수집 중 오류 발생: ${error.message}`);
    } finally {
      setIsCollecting(false);
    }
  };

  const canStartCollection = 
    (collectionTarget.type === 'groups' && collectionTarget.selectedGroups.length > 0) ||
    (collectionTarget.type === 'channels' && collectionTarget.selectedChannels.length > 0);

  return (
    <div className="p-6">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">트렌딩 영상 수집</h1>
        <p className="text-gray-600">채널 그룹이나 개별 채널에서 조건에 맞는 인기 영상들을 수집합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 왼쪽: 수집 대상 선택 */}
        <div className="space-y-6">
          {/* 수집 방식 선택 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🎯 수집 대상 선택</h2>
            
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => handleTargetTypeChange('groups')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  collectionTarget.type === 'groups'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                📁 채널 그룹별 수집
              </button>
              <button
                onClick={() => handleTargetTypeChange('channels')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  collectionTarget.type === 'channels'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                📋 개별 채널 선택
              </button>
            </div>

            {/* 채널 그룹 선택 */}
            {collectionTarget.type === 'groups' && (
              <div>
                <h3 className="font-medium mb-3">채널 그룹 선택</h3>
                {groupsLoading ? (
                  <div className="text-gray-500">그룹 로딩 중...</div>
                ) : !channelGroups || channelGroups.length === 0 ? (
                  <div className="text-gray-500">등록된 채널 그룹이 없습니다.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {channelGroups.map((group, index) => (
                      <label key={group._id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={collectionTarget.selectedGroups.includes(group._id || '')}
                          onChange={() => handleGroupSelection(group._id || '')}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: group.color }}
                            ></div>
                            <span className="font-medium">{group.name}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {group.channels?.length || 0}개 채널
                            {group.channels && group.channels.length > 0 && (
                              <div className="mt-1 text-xs text-gray-400">
                                {group.channels.map(channel => 
                                  typeof channel === 'object' ? channel.name : channel
                                ).slice(0, 3).join(', ')}
                                {group.channels.length > 3 && ' 외'}
                              </div>
                            )}
                            {group.keywords && group.keywords.length > 0 && 
                              ` • ${group.keywords.slice(0, 3).join(', ')}`
                            }
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 개별 채널 선택 */}
            {collectionTarget.type === 'channels' && (
              <div>
                <h3 className="font-medium mb-3">개별 채널 선택</h3>
                {channelsLoading ? (
                  <div className="text-gray-500">채널 로딩 중...</div>
                ) : !channels || channels.length === 0 ? (
                  <div className="text-gray-500">등록된 채널이 없습니다.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {channels.map((channel, index) => (
                      <label key={channel.channelId} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={collectionTarget.selectedChannels.includes(channel.channelId)}
                          onChange={() => handleChannelSelection(channel.channelId)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium">{channel.name}</div>
                          <div className="text-sm text-gray-500">
                            {channel.platform} • {channel.subscribers?.toLocaleString()} 구독자
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 수집 조건 설정 */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">⚙️ 수집 조건 설정</h2>
            
            <div className="space-y-4">
              {/* 기간 설정 */}
              <div>
                <label className="block text-sm font-medium mb-2">수집 기간</label>
                <select
                  value={filters.daysBack}
                  onChange={(e) => setFilters(prev => ({ ...prev, daysBack: Number(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={1}>최근 1일</option>
                  <option value={2}>최근 2일</option>
                  <option value={3}>최근 3일</option>
                  <option value={7}>최근 7일</option>
                  <option value={14}>최근 14일</option>
                  <option value={30}>최근 30일</option>
                </select>
              </div>

              {/* 조회수 범위 */}
              <div>
                <label className="block text-sm font-medium mb-2">최소 조회수</label>
                <select
                  value={filters.minViews}
                  onChange={(e) => setFilters(prev => ({ ...prev, minViews: Number(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={10000}>1만 이상</option>
                  <option value={30000}>3만 이상</option>
                  <option value={50000}>5만 이상</option>
                  <option value={100000}>10만 이상</option>
                  <option value={500000}>50만 이상</option>
                  <option value={1000000}>100만 이상</option>
                </select>
              </div>

              {/* 영상 길이 */}
              <div>
                <label className="block text-sm font-medium mb-2">영상 길이</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.includeShorts}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeShorts: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2">숏폼 (≤60초)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.includeMidform}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeMidform: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2">미드폼 (61-180초)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.includeLongForm}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeLongForm: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2">롱폼 (&gt;180초)</span>
                  </label>
                </div>
              </div>

              {/* 키워드 */}
              <div>
                <label className="block text-sm font-medium mb-2">포함 키워드 (선택사항)</label>
                <input
                  type="text"
                  placeholder="키워드1, 키워드2, ..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onChange={(e) => {
                    const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                    setFilters(prev => ({ ...prev, keywords }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* 수집 실행 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🚀 수집 실행</h2>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                선택된 대상: {
                  collectionTarget.type === 'groups' 
                    ? `${collectionTarget.selectedGroups.length}개 그룹`
                    : `${collectionTarget.selectedChannels.length}개 채널`
                }
              </div>
              
              {collectionProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <div className="text-sm text-blue-700">{collectionProgress}</div>
                </div>
              )}
            </div>

            <button
              onClick={handleStartCollection}
              disabled={!canStartCollection || isCollecting}
              className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                canStartCollection && !isCollecting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCollecting ? '수집 중...' : '트렌딩 수집 시작'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingCollectionPage;