import React, { useState, useMemo } from 'react';
import { ChannelGroup } from '../../../shared/types';
import ChannelGroupCard from './ChannelGroupCard';
import { UniversalGrid } from '../../../widgets/UniversalGrid';

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
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'channels'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // 트렌딩 수집 필터 설정
  const [collectionDaysBack, setCollectionDaysBack] = useState<number>(7);
  const [collectionMinViews, setCollectionMinViews] = useState<number>(100000);

  // 필터링 및 정렬된 그룹 목록
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = groups.filter((group) => {
      // 상태 필터
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && group.isActive) ||
        (filterStatus === 'inactive' && !group.isActive);

      return matchesStatus;
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
  }, [groups, sortBy, filterStatus]);

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

      {/* 필터 컨트롤 */}
      <div className="flex flex-wrap gap-2 items-center">
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

        {/* 구분선 */}
        <div className="h-8 w-px bg-gray-300"></div>
        <span className="text-sm text-gray-600 font-medium">트렌딩 수집 조건:</span>

        {/* Recent X Days 필터 */}
        <select
          value={collectionDaysBack}
          onChange={(e) => setCollectionDaysBack(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-indigo-50"
          title="최근 며칠 이내의 영상을 수집할지 설정"
        >
          <option value={1}>1일 전</option>
          <option value={3}>3일 전</option>
          <option value={5}>5일 전</option>
          <option value={7}>7일 전</option>
        </select>

        {/* Minimum X Views 필터 */}
        <select
          value={collectionMinViews}
          onChange={(e) => setCollectionMinViews(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-indigo-50"
          title="최소 조회수 설정"
        >
          <option value={50000}>50K 이상</option>
          <option value={100000}>100K 이상</option>
          <option value={500000}>500K 이상</option>
          <option value={1000000}>1M 이상</option>
        </select>
      </div>

      {/* 그룹 목록 - UniversalGrid 사용 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : filteredAndSortedGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">📁</div>
          {filterStatus !== 'all' ? (
            <div>
              <p className="text-gray-500 mb-2">검색 조건에 맞는 그룹이 없습니다.</p>
              <button
                onClick={() => {
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
        <UniversalGrid<ChannelGroup>
          data={filteredAndSortedGroups}
          renderCard={(group, props) => (
            <ChannelGroupCard
              group={group}
              isSelected={props.isSelected}
              onSelect={props.onSelect}
              onClick={props.onCardClick}
              onEdit={onEditGroup}
              onDelete={() => props.onDelete?.(group)}
              onCollect={onCollectGroup}
              showSelection={props.isSelectMode}
              collectionFilters={{
                daysBack: collectionDaysBack,
                minViews: collectionMinViews,
              }}
            />
          )}
          onDelete={onDeleteGroup}
          onCardClick={(group) => {
            // 카드 클릭 시 동작 (필요시 추가)
          }}
          enableSearch={true}
          searchPlaceholder="그룹명, 설명, 키워드로 검색..."
          searchFields={['name', 'description', 'keywords']}
          initialItemsPerPage={20}
          showVirtualScrolling={true}
          gridSize={3}
          containerHeight={600}
        />
      )}
    </div>
  );
};

export default ChannelGroupsTab;