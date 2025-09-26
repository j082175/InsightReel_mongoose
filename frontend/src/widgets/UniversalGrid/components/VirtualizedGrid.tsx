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
  onDelete?: (item: T) => void;
  onCardClick?: (item: T) => void;
  containerHeight?: number;
  useWindowScroll?: boolean;
  className?: string;
  gridSize?: 1 | 2 | 3 | 4;
  // 카드 레이아웃 타입 (채널카드는 가로형, 비디오카드는 정사각형)
  cardLayout?: 'horizontal' | 'square';
  // 무한 스크롤링 지원
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
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
  onDelete,
  onCardClick,
  containerHeight = 600,
  useWindowScroll = false,
  className = '',
  gridSize = 1,
  cardLayout = 'square',
  hasMore = false,
  onLoadMore,
  isLoading = false
}: VirtualizedGridProps<T>) {

  console.log('🚀 VirtualizedGrid props:', {
    dataLength: data.length,
    isSelectMode,
    hasOnSelect: !!onSelect,
    onSelectType: typeof onSelect,
    selectedItemsSize: selectedItems.size
  });

  // 그리드 레이아웃 클래스 매핑
  const gridLayoutClasses = {
    1: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    2: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2'
  };

  // 컨테이너별 아이템 수 계산 (카드 레이아웃에 따라 다름)
  const itemsPerRow = useMemo(() => {
    const viewportWidth = window.innerWidth;

    // 가로형 카드 (채널카드) - 3열로 수정
    if (cardLayout === 'horizontal') {
      let fixedItems;
      if (viewportWidth >= 1400) {
        fixedItems = 3; // 큰 화면에서 3열
      } else if (viewportWidth >= 1200) {
        fixedItems = 3; // 3열
      } else if (viewportWidth >= 1024) {
        fixedItems = 3; // 3열
      } else if (viewportWidth >= 768) {
        fixedItems = 2; // 중간 화면에서는 2열
      } else {
        fixedItems = 1; // 작은 화면에서는 1열
      }

      console.log('🔢 VirtualizedGrid 가로형 카드:', {
        viewportWidth,
        cardLayout,
        fixedItems,
        breakpoint: viewportWidth >= 1400 ? 'xl+' : viewportWidth >= 1200 ? 'xl' : viewportWidth >= 1024 ? 'lg' : viewportWidth >= 768 ? 'md' : 'sm'
      });

      return fixedItems;
    }

    // 정사각형 카드 (비디오카드) - 기존 로직 (강제 6열 보장)
    let fixedItems;
    if (viewportWidth >= 1400) {
      fixedItems = gridSize === 1 ? 7 : gridSize === 2 ? 6 : gridSize === 3 ? 4 : 3;
    } else if (viewportWidth >= 1200) {
      fixedItems = gridSize === 1 ? 6 : gridSize === 2 ? 6 : gridSize === 3 ? 4 : 3;
    } else if (viewportWidth >= 1024) {
      fixedItems = gridSize === 1 ? 5 : gridSize === 2 ? 6 : gridSize === 3 ? 4 : 3; // 6열 보장
    } else if (viewportWidth >= 768) {
      fixedItems = gridSize === 1 ? 4 : gridSize === 2 ? 4 : 3; // 4열 보장
    } else if (viewportWidth >= 640) {
      fixedItems = 3;
    } else {
      fixedItems = 2;
    }

    console.log('🔢 VirtualizedGrid 정사각형 카드:', {
      viewportWidth,
      gridSize,
      cardLayout,
      fixedItems,
      breakpoint: viewportWidth >= 1400 ? 'xl+' : viewportWidth >= 1200 ? 'xl' : viewportWidth >= 1024 ? 'lg' : viewportWidth >= 768 ? 'md' : viewportWidth >= 640 ? 'sm' : 'xs'
    });

    return fixedItems;
  }, [gridSize, cardLayout]);

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

          const cardProps: CardRenderProps<T> = {
            item,
            isSelected,
            isSelectMode,
            onSelect: () => onSelect(itemId),
            onDelete,
            onCardClick
          };

          console.log('📱 VirtualizedGrid.cardProps:', {
            itemId,
            isSelected,
            isSelectMode,
            hasOnSelect: !!onSelect,
            onSelectType: typeof onSelect
          });

          return (
            <div
              key={itemId}
              className={cardLayout === 'horizontal' ? 'w-full' : 'flex-1 min-w-0'}
            >
              {renderCard(item, cardProps)}
            </div>
          );
        })}

        {/* 마지막 행에 빈 공간 추가 (왼쪽 정렬용) */}
        {rowItems.length < itemsPerRow &&
          Array.from({ length: itemsPerRow - rowItems.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className={cardLayout === 'horizontal' ? 'w-full' : 'flex-1 min-w-0'}
            />
          ))
        }
      </div>
    );
  }, [rowData, gridSize, gridLayoutClasses, selectedItems, isSelectMode, onSelect, renderCard, cardLayout]);

  // 끝에 도달했을 때 실행되는 콜백 (Hook 순서 보장을 위해 early return 전에 선언)
  const handleEndReached = useCallback(() => {
    if (hasMore && onLoadMore && !isLoading) {
      console.log('🔄 [VirtualizedGrid] 스크롤 끝 도달, 추가 로딩 시작');
      onLoadMore();
    }
  }, [hasMore, onLoadMore, isLoading]);

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
        endReached={handleEndReached}
        components={{
          Footer: () => isLoading ? (
            <div className="flex justify-center py-4">
              <div className="text-gray-500">데이터 로딩 중...</div>
            </div>
          ) : null
        }}
      />
    </div>
  );
}

export default VirtualizedGrid;