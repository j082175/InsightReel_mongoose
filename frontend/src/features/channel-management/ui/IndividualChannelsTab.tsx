import React, { useState, useMemo } from 'react';
import { Channel } from '../../../shared/types';
import { SearchBar } from '../../../shared/components';
import { formatViews } from '../../../shared/utils';
import ChannelCard from './ChannelCard';

interface IndividualChannelsTabProps {
  channels: Channel[];
  filteredChannels: Channel[];
  isLoading: boolean;
  isSelectMode: boolean;
  selectedChannels: string[];
  searchTerm: string;
  filters: any;
  stats: any;
  onSearchChange: (term: string) => void;
  onFilterChange: (filters: any) => void;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onChannelClick: (channel: Channel) => void;
  onChannelSelect: (channelId: string) => void;
  onChannelDelete: (item: any) => void;
  onAddChannel: () => void;
}

const IndividualChannelsTab: React.FC<IndividualChannelsTabProps> = ({
  channels,
  filteredChannels,
  isLoading,
  isSelectMode,
  selectedChannels,
  searchTerm,
  filters,
  stats,
  onSearchChange,
  onFilterChange,
  onToggleSelectMode,
  onSelectAll,
  onClearSelection,
  onChannelClick,
  onChannelSelect,
  onChannelDelete,
  onAddChannel,
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'subscribers' | 'platform' | 'created'>('name');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK'>('all');
  const [subscriberFilter, setSubscriberFilter] = useState<'all' | '1k' | '10k' | '100k' | '1m'>('all');

  // 추가 필터링 및 정렬
  const finalFilteredChannels = useMemo(() => {
    let result = [...filteredChannels];

    // 플랫폼 필터
    if (platformFilter !== 'all') {
      result = result.filter(channel => channel.platform === platformFilter);
    }

    // 구독자 수 필터
    if (subscriberFilter !== 'all') {
      const minSubscribers = {
        '1k': 1000,
        '10k': 10000,
        '100k': 100000,
        '1m': 1000000,
      }[subscriberFilter] || 0;

      result = result.filter(channel => (channel.subscribers || 0) >= minSubscribers);
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'subscribers':
          return (b.subscribers || 0) - (a.subscribers || 0);
        case 'platform':
          return (a.platform || '').localeCompare(b.platform || '');
        case 'created':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [filteredChannels, sortBy, platformFilter, subscriberFilter]);

  // 플랫폼별 통계
  const platformStats = useMemo(() => {
    const counts = channels.reduce((acc, channel) => {
      acc[channel.platform] = (acc[channel.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      YOUTUBE: counts.YOUTUBE || 0,
      INSTAGRAM: counts.INSTAGRAM || 0,
      TIKTOK: counts.TIKTOK || 0,
    };
  }, [channels]);

  const hasActiveFilters = platformFilter !== 'all' || subscriberFilter !== 'all' || searchTerm;

  return (
    <div className="space-y-6">
      {/* 헤더 및 통계 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">개별 채널 관리</h3>
          <p className="text-sm text-gray-500">
            등록된 채널들을 개별적으로 관리하고 분석하세요
          </p>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>총 {stats.totalChannels}개 채널</span>
            <span>총 구독자 {formatViews(stats.totalSubscribers)}</span>
            <div className="flex gap-2">
              <span>YouTube {platformStats.YOUTUBE}</span>
              <span>Instagram {platformStats.INSTAGRAM}</span>
              <span>TikTok {platformStats.TIKTOK}</span>
            </div>
          </div>
        </div>

        {!isSelectMode && (
          <button
            onClick={onAddChannel}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            채널 추가
          </button>
        )}
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            searchTerm={searchTerm}
            onSearchTermChange={onSearchChange}
            placeholder="채널명, 카테고리, 키워드로 검색..."
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          {/* 플랫폼 필터 */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체 플랫폼</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
          </select>

          {/* 구독자 수 필터 */}
          <select
            value={subscriberFilter}
            onChange={(e) => setSubscriberFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체 구독자</option>
            <option value="1k">1천+ 구독자</option>
            <option value="10k">1만+ 구독자</option>
            <option value="100k">10만+ 구독자</option>
            <option value="1m">100만+ 구독자</option>
          </select>

          {/* 정렬 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">이름순</option>
            <option value="subscribers">구독자순</option>
            <option value="platform">플랫폼순</option>
            <option value="created">등록일순</option>
          </select>

          <button
            onClick={onToggleSelectMode}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isSelectMode
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelectMode ? '선택 취소' : '선택 모드'}
          </button>
        </div>
      </div>

      {/* 선택 모드 액션 */}
      {isSelectMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-blue-700">
              {selectedChannels.length}개 채널이 선택됨
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className="px-3 py-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                {selectedChannels.length === finalFilteredChannels.length ? '전체 해제' : '전체 선택'}
              </button>
              <button
                onClick={() => onChannelDelete({ type: 'bulk', count: selectedChannels.length })}
                disabled={selectedChannels.length === 0}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                선택 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 채널 목록 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : finalFilteredChannels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">📺</div>
          {hasActiveFilters ? (
            <div>
              <p className="text-gray-500 mb-2">필터 조건에 맞는 채널이 없습니다.</p>
              <button
                onClick={() => {
                  onSearchChange('');
                  setPlatformFilter('all');
                  setSubscriberFilter('all');
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-2">등록된 채널이 없습니다.</p>
              <button
                onClick={onAddChannel}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                첫 번째 채널 추가하기
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {finalFilteredChannels.map((channel) => (
            <ChannelCard
              key={channel.channelId || channel._id}
              channel={channel}
              isSelected={selectedChannels.includes(channel.channelId)}
              showSelection={isSelectMode}
              onChannelClick={onChannelClick}
              onSelect={() => onChannelSelect(channel.channelId)}
              onAnalyze={() => onChannelClick(channel)}
              onDelete={() => onChannelDelete({ type: 'single', data: channel })}
            />
          ))}
        </div>
      )}

      {/* 필터 결과 요약 */}
      {hasActiveFilters && finalFilteredChannels.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          {finalFilteredChannels.length}개 채널이 필터 조건에 일치합니다.
        </div>
      )}
    </div>
  );
};

export default IndividualChannelsTab;