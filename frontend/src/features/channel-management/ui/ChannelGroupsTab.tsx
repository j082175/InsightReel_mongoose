import React, { useState, useMemo } from 'react';
import { ChannelGroup } from '../../../shared/types';
import { SearchBar } from '../../../shared/components';
import ChannelGroupCard from './ChannelGroupCard';

interface ChannelGroupsTabProps {
  groups: ChannelGroup[];
  isLoading: boolean;
  onCreateGroup: () => void;
  onEditGroup: (group: ChannelGroup) => void;
  onDeleteGroup: (group: ChannelGroup) => void;
  onCollectGroup?: (group: ChannelGroup) => void;
}

const ChannelGroupsTab: React.FC<ChannelGroupsTabProps> = ({
  groups,
  isLoading,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onCollectGroup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'channels'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // 필터링 및 정렬된 그룹 목록
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = groups.filter((group) => {
      // 검색어 필터
      const matchesSearch = searchTerm === '' ||
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));

      // 상태 필터
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && group.isActive) ||
        (filterStatus === 'inactive' && !group.isActive);

      return matchesSearch && matchesStatus;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        case 'channels':
          return (b.channels?.length || 0) - (a.channels?.length || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [groups, searchTerm, sortBy, filterStatus]);

  // 통계
  const stats = useMemo(() => {
    return {
      total: groups.length,
      active: groups.filter(g => g.isActive).length,
      totalChannels: groups.reduce((sum, g) => sum + (g.channels?.length || 0), 0),
    };
  }, [groups]);

  return (
    <div className="space-y-6">
      {/* 헤더 및 통계 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">채널 그룹 관리</h3>
          <p className="text-sm text-gray-500">
            관련 채널들을 그룹으로 묶어 효율적으로 관리하고 트렌딩 수집하세요
          </p>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>총 {stats.total}개 그룹</span>
            <span>활성 {stats.active}개</span>
            <span>총 {stats.totalChannels}개 채널</span>
          </div>
        </div>
        <button
          onClick={onCreateGroup}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새 그룹 만들기
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="그룹명, 설명, 키워드로 검색..."
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          {/* 상태 필터 */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>

          {/* 정렬 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">이름순</option>
            <option value="created">생성일순</option>
            <option value="channels">채널 수순</option>
          </select>
        </div>
      </div>

      {/* 그룹 목록 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : filteredAndSortedGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">📁</div>
          {searchTerm || filterStatus !== 'all' ? (
            <div>
              <p className="text-gray-500 mb-2">검색 조건에 맞는 그룹이 없습니다.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-2">생성된 채널 그룹이 없습니다.</p>
              <button
                onClick={onCreateGroup}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                첫 번째 그룹 만들기
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedGroups.map((group) => (
            <ChannelGroupCard
              key={group._id}
              group={group}
              onEdit={() => onEditGroup(group)}
              onDelete={() => onDeleteGroup(group)}
              onCollect={onCollectGroup ? () => onCollectGroup(group) : undefined}
            />
          ))}
        </div>
      )}

      {/* 검색 결과 요약 */}
      {(searchTerm || filterStatus !== 'all') && filteredAndSortedGroups.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          {filteredAndSortedGroups.length}개 그룹이 검색되었습니다.
        </div>
      )}
    </div>
  );
};

export default ChannelGroupsTab;