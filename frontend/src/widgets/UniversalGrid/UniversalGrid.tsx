import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { UniversalGridProps, GridItem, CardRenderProps } from './types';
import { useUniversalPagination } from './hooks';
import { VirtualizedGrid } from './components/VirtualizedGrid';
import { SimpleAutocomplete } from '../../shared/components';
import { getDocumentId } from '../../shared/utils';
import { GRID_CONFIG } from '../../shared/config/gridConfig';

/**
 * UniversalGrid - 모든 카드 타입을 지원하는 통합 그리드 컴포넌트
 * 페이지네이션, 가상 스크롤링, 선택/삭제 기능을 모두 포함
 * 선택 상태는 내부에서 관리하고 변경사항은 콜백으로 알림
 */
function UniversalGrid<T extends GridItem>({
  data,
  renderCard,
  onSelectionChange,
  onDelete,
  onBulkDelete,
  onCardClick,
  customActions,
  enableSearch = false,
  searchPlaceholder = '검색...',
  searchFields,
  onSearchChange,
  initialItemsPerPage = 20,
  showVirtualScrolling = true,
  useWindowScroll = false,
  gridSize = GRID_CONFIG.DEFAULT_GRID_SIZE,
  containerWidth = 1200,
  containerHeight = 600,
  className = '',
  headerClassName = '',
  gridClassName = '',
  footerClassName = '',
}: UniversalGridProps<T>) {

  // 내부 선택 상태 관리
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // 검색 상태 관리
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDataFromSearch, setFilteredDataFromSearch] = useState(data);

  // 검색으로 필터링된 데이터 사용 (SimpleAutocomplete에서 필터링한 데이터 우선)
  const filteredData = filteredDataFromSearch;

  // data가 변경되면 filteredDataFromSearch도 초기화
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDataFromSearch(data);
    }
  }, [data, searchTerm]);

  // 통합 페이지네이션 훅 사용 (필터링된 데이터로)
  const pagination = useUniversalPagination(filteredData, { initialItemsPerPage });

  const {
    currentData,
    paginatedData,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    useVirtualScrolling,
    setItemsPerPage,
    goToPage,
    goToNextPage,
    goToPrevPage,
    hasNextPage,
    hasPrevPage,
    toggleVirtualization,
  } = pagination;

  // 컨테이너 크기 추적을 위한 ref와 state
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentContainerWidth, setCurrentContainerWidth] = useState<number>(containerWidth || 1200);

  // 컨테이너 크기 변화 감지
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setCurrentContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // 초기 크기 설정
    updateWidth();

    // 리사이즈 이벤트 리스너
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 렌더링 함수 준비 (제네릭 방식)

  // 그리드 레이아웃 클래스
  const gridLayoutClasses = {
    1: 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
    2: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3',
    3: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    4: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6',
  };

  // 동적 카드 크기 계산
  const calculateCardWidth = useMemo(() => {
    const gap = 24; // gap-6 = 24px

    // 화면 크기에 따른 컬럼 수 계산
    let columns;
    if (currentContainerWidth >= 1280) { // xl
      columns = gridSize === 1 ? 8 : gridSize === 2 ? 6 : 5;
    } else if (currentContainerWidth >= 1024) { // lg
      columns = gridSize === 1 ? 6 : gridSize === 2 ? 5 : 4;
    } else if (currentContainerWidth >= 640) { // sm
      columns = gridSize === 1 ? 5 : gridSize === 2 ? 4 : 3;
    } else { // 기본
      columns = gridSize === 1 ? 4 : gridSize === 2 ? 3 : 2;
    }

    return Math.floor((currentContainerWidth - gap * (columns - 1)) / columns);
  }, [currentContainerWidth, gridSize]);

  // 표시할 페이지 번호들 계산
  const getVisiblePages = (maxVisible = 5) => {
    const pages: number[] = [];
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  // 검색 핸들러
  const handleSearchChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    onSearchChange?.(newSearchTerm, filteredData);
  }, [onSearchChange, filteredData]);

  // 선택 관련 핸들러
  const handleSelect = useCallback((id: string) => {
    setSelectedItems(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }

      // 외부에 선택 변경사항 알림
      onSelectionChange?.(Array.from(updated));
      return updated;
    });
  }, [onSelectionChange]);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => !prev);
    // 선택 모드 해제 시 선택 해제
    if (isSelectMode) {
      setSelectedItems(new Set());
      onSelectionChange?.([]);
    }
  }, [isSelectMode, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === currentData.length) {
      // 전체 선택 해제
      setSelectedItems(new Set());
      onSelectionChange?.([]);
    } else {
      // 전체 선택
      const allIds = new Set(currentData.map(item => getDocumentId(item)).filter(Boolean) as string[]);
      setSelectedItems(allIds);
      onSelectionChange?.(Array.from(allIds));
    }
  }, [selectedItems.size, currentData, onSelectionChange]);

  const handleDelete = useCallback((item: T) => {
    const itemId = getDocumentId(item);
    if (itemId) {
      // 삭제된 아이템을 선택에서 제거
      setSelectedItems(prev => {
        const updated = new Set(prev);
        updated.delete(itemId);
        onSelectionChange?.(Array.from(updated));
        return updated;
      });
    }

    // 실제 삭제는 외부에서 처리
    onDelete?.(item);
  }, [onDelete, onSelectionChange]);

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.size === 0) return;

    // 선택된 아이템들 찾기
    const selectedItemsData = currentData.filter(item => {
      const itemId = getDocumentId(item);
      return itemId && selectedItems.has(itemId);
    });

    // 선택 해제
    setSelectedItems(new Set());
    onSelectionChange?.([]);

    // 실제 일괄 삭제는 외부에서 처리
    onBulkDelete?.(selectedItemsData);
  }, [selectedItems, currentData, onSelectionChange, onBulkDelete]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  // 내부 카드 렌더링 함수
  const renderCardInternal = useCallback(
    (item: T, index?: number) => {
      const itemId = getDocumentId(item);
      if (!itemId) return null;

      if (typeof renderCard !== 'function') {
        return <div key={itemId}>Missing renderCard function</div>;
      }

      const isSelected = selectedItems.has(itemId);

      const cardProps: CardRenderProps<T> = {
        item,
        isSelected,
        isSelectMode,
        onSelect: handleSelect,
        onDelete: handleDelete,
        onCardClick,
        cardWidth: calculateCardWidth,
      };

      return (
        <div key={itemId}>
          {renderCard(item, cardProps)}
        </div>
      );
    },
    [renderCard, selectedItems, isSelectMode, handleSelect, handleDelete, onCardClick, calculateCardWidth]
  );

  if (data.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500 text-lg mb-2">데이터가 없습니다</div>
        <div className="text-gray-400">아이템을 추가해보세요.</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`space-y-4 ${className}`}>
      {/* 검색바 (활성화된 경우만) */}
      {enableSearch && (
        <SimpleAutocomplete
          data={data}
          searchFields={searchFields || []}
          placeholder={searchPlaceholder}
          onSearchChange={(searchTerm, filteredDataFromAutocomplete) => {
            setSearchTerm(searchTerm);
            setFilteredDataFromSearch(filteredDataFromAutocomplete);
            onSearchChange?.(searchTerm, filteredDataFromAutocomplete);
          }}
          className="mb-4"
        />
      )}

      {/* 상단: 정보 표시 + 설정 */}
      <div className={`flex items-center justify-between ${headerClassName}`}>
        <div className="flex items-center space-x-4">
          {/* 정보 표시 */}
          <div className="text-sm text-gray-500">
            총 {totalItems}개 아이템
            {enableSearch && searchTerm && (
              <span> • "{searchTerm}" 검색 결과</span>
            )}
            {!useVirtualScrolling && totalPages > 1 && (
              <span> • {currentPage}/{totalPages} 페이지</span>
            )}
          </div>

          {/* 페이지당 아이템 수 설정 (일반 그리드 모드에서만) */}
          {!useVirtualScrolling && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                페이지당:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={30}>30개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </div>
          )}

          {/* 선택 모드 토글 */}
          <button
            onClick={toggleSelectMode}
            className={`px-3 py-1 text-sm rounded ${
              isSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {isSelectMode ? '선택 취소' : '선택 모드'}
          </button>

          {/* 전체 선택/해제 (선택 모드에서만) */}
          {isSelectMode && (
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {selectedItems.size === currentData.length ? '전체 해제' : '전체 선택'}
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* 선택된 아이템 수 표시 */}
          {isSelectMode && selectedItems.size > 0 && (
            <div className="text-sm text-indigo-600 font-medium">
              {selectedItems.size}개 선택됨
            </div>
          )}

          {/* 가상 스크롤링 토글 */}
          {showVirtualScrolling && (
            <button
              onClick={toggleVirtualization}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                useVirtualScrolling
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={useVirtualScrolling ? '일반 그리드로 전환' : '가상 스크롤링으로 전환'}
            >
              {useVirtualScrolling ? '🚀 가상 스크롤링' : '📋 일반 그리드'}
            </button>
          )}
        </div>
      </div>

      {/* 메인: 가상화 or 일반 그리드 */}
      <div className={gridClassName}>
        {useVirtualScrolling ? (
          // 진짜 가상 스크롤링 (react-virtuoso 기반)
          <VirtualizedGrid
            data={currentData}
            renderCard={renderCard}
            selectedItems={selectedItems}
            isSelectMode={isSelectMode}
            onSelect={handleSelect}
            containerHeight={containerHeight}
            useWindowScroll={useWindowScroll}
            gridSize={gridSize}
          />
        ) : (
          // 일반 그리드 모드
          <div className={`grid ${gridLayoutClasses[gridSize]} gap-6`}>
            {paginatedData.map(renderCardInternal)}
          </div>
        )}
      </div>

      {/* 하단: 페이지네이션 컨트롤 (일반 그리드 모드에서만) */}
      {!useVirtualScrolling && totalPages > 1 && (
        <div className={`flex items-center justify-center space-x-2 ${footerClassName}`}>
          {/* 이전 버튼 */}
          <button
            onClick={goToPrevPage}
            disabled={!hasPrevPage}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>

          {/* 첫 페이지 */}
          {visiblePages[0] > 1 && (
            <>
              <button
                onClick={() => goToPage(1)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                1
              </button>
              {visiblePages[0] > 2 && (
                <span className="px-2 py-2 text-sm text-gray-500">...</span>
              )}
            </>
          )}

          {/* 페이지 번호들 */}
          {visiblePages.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => goToPage(pageNum)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* 마지막 페이지 */}
          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className="px-2 py-2 text-sm text-gray-500">...</span>
              )}
              <button
                onClick={() => goToPage(totalPages)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          {/* 다음 버튼 */}
          <button
            onClick={goToNextPage}
            disabled={!hasNextPage}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}

      {/* 🎯 통합 ActionBar - 선택 모드일 때만 표시 */}
      {isSelectMode && selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white shadow-2xl rounded-lg border border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-6">
              {/* 선택된 아이템 수 */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">
                  {selectedItems.size}개 선택됨
                </span>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  선택 해제
                </button>

                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                >
                  {selectedItems.size === currentData.length ? '전체 해제' : '전체 선택'}
                </button>

                {/* 커스텀 액션 버튼들 */}
                {customActions?.map((action, index) => {
                  const selectedItemsData = currentData.filter(item => {
                    const itemId = getDocumentId(item);
                    return itemId && selectedItems.has(itemId);
                  });

                  const isDisabled = action.disabled?.(selectedItemsData) ?? false;

                  return (
                    <button
                      key={index}
                      onClick={() => action.onClick(selectedItemsData)}
                      disabled={isDisabled}
                      className={action.className || "px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"}
                    >
                      {action.icon && <span className="mr-1">{action.icon}</span>}
                      {action.label}
                    </button>
                  );
                })}

                {onBulkDelete && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                  >
                    삭제 ({selectedItems.size}개)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { UniversalGrid };
export default UniversalGrid;