import React, { useMemo, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { GridItem, CardRenderProps } from '../types';
import { GRID_CONFIG } from '../../../shared/config/gridConfig';

interface VirtualizedGridProps<T extends GridItem> {
  data: T[];
  renderCard: (item: T, cardProps: CardRenderProps) => React.ReactNode;
  selectedItems: Set<string>;
  isSelectMode: boolean;
  onSelect: (itemId: string) => void;
  containerHeight?: number;
  useWindowScroll?: boolean;
  className?: string;
  gridSize?: 1 | 2 | 3 | 4;
}

/**
 * react-virtuoso 기반 진짜 가상 스크롤링 그리드
 * 10,000개 이상의 데이터도 부드럽게 처리
 */
export function VirtualizedGrid<T extends GridItem>({
  data,
  renderCard,
  selectedItems,
  isSelectMode,
  onSelect,
  containerHeight = 600,
  useWindowScroll = false,
  className = '',
  gridSize = 1
}: VirtualizedGridProps<T>) {

  // 그리드 레이아웃 클래스 매핑
  const gridLayoutClasses = {
    1: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    2: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2'
  };

  // 컨테이너별 아이템 수 계산 (완전 고정값)
  const itemsPerRow = useMemo(() => {
    const viewportWidth = window.innerWidth;

    // 화면 크기별 완전 고정값 (breakpoint 기반)
    let fixedItems;
    if (viewportWidth >= 1400) {
      fixedItems = gridSize === 1 ? 7 : gridSize === 2 ? 6 : gridSize === 3 ? 4 : 3;
    } else if (viewportWidth >= 1200) {
      fixedItems = gridSize === 1 ? 6 : gridSize === 2 ? 6 : gridSize === 3 ? 4 : 3;
    } else if (viewportWidth >= 1024) {
      fixedItems = gridSize === 1 ? 5 : gridSize === 2 ? 4 : gridSize === 3 ? 3 : 2;
    } else if (viewportWidth >= 768) {
      fixedItems = gridSize === 1 ? 4 : gridSize === 2 ? 3 : 2;
    } else if (viewportWidth >= 640) {
      fixedItems = 3;
    } else {
      fixedItems = 2;
    }

    console.log('🔢 VirtualizedGrid 완전고정:', {
      viewportWidth,
      gridSize,
      fixedItems,
      breakpoint: viewportWidth >= 1400 ? 'xl+' : viewportWidth >= 1200 ? 'xl' : viewportWidth >= 1024 ? 'lg' : viewportWidth >= 768 ? 'md' : viewportWidth >= 640 ? 'sm' : 'xs'
    });

    return fixedItems;
  }, [gridSize]);

  // 행별로 데이터를 그룹화
  const rowData = useMemo(() => {
    const rows = [];
    for (let i = 0; i < data.length; i += itemsPerRow) {
      rows.push(data.slice(i, i + itemsPerRow));
    }
    return rows;
  }, [data, itemsPerRow]);

  // 각 행 렌더링
  const renderRow = useCallback((index: number) => {
    const rowItems = rowData[index];
    if (!rowItems) return null;

    return (
      <div key={`row-${index}`} className="flex gap-6 px-6 py-3 justify-start">
        {rowItems.map((item) => {
          const itemId = item._id || item.id || String(item);
          const isSelected = selectedItems.has(itemId);

          const cardProps: CardRenderProps = {
            isSelected,
            isSelectMode,
            onSelect: () => onSelect(itemId)
          };

          return (
            <div key={itemId} className="flex-1 min-w-0">
              {renderCard(item, cardProps)}
            </div>
          );
        })}

        {/* 마지막 행에 빈 공간 추가 (왼쪽 정렬용) */}
        {rowItems.length < itemsPerRow &&
          Array.from({ length: itemsPerRow - rowItems.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 min-w-0" />
          ))
        }
      </div>
    );
  }, [rowData, gridSize, gridLayoutClasses, selectedItems, isSelectMode, onSelect, renderCard]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={!useWindowScroll ? { height: containerHeight } : undefined}
      >
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">데이터가 없습니다</div>
          <div className="text-sm">표시할 항목이 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Virtuoso
        {...(useWindowScroll ? { useWindowScroll: true } : { style: { height: containerHeight } })}
        totalCount={rowData.length}
        itemContent={renderRow}
        overscan={GRID_CONFIG.VIRTUAL_SCROLLING.OVERSCAN}
        increaseViewportBy={GRID_CONFIG.VIRTUAL_SCROLLING.INCREASE_VIEWPORT_BY}
      />
    </div>
  );
}

export default VirtualizedGrid;