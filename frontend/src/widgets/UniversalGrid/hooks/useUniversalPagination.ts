import { useState, useMemo } from 'react';
import { UniversalPaginationOptions, UniversalPaginationResult, GridItem } from '../types';

/**
 * 통합 페이지네이션 훅 - 일반 페이지네이션과 가상 스크롤링을 모두 지원
 */
export const useUniversalPagination = <T extends GridItem>(
  data: T[],
  options: UniversalPaginationOptions = {}
): UniversalPaginationResult<T> => {
  const {
    initialItemsPerPage = 20,
    initialPage = 1
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(true);

  // 기본 계산값들
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // 현재 표시할 데이터 결정
  const currentData = useMemo(() => {
    // 가상 스크롤링 모드에서는 전체 데이터 반환
    if (useVirtualScrolling) {
      return data;
    }
    // 일반 모드에서는 페이지네이션된 데이터 반환
    return data.slice(startIndex, endIndex);
  }, [data, useVirtualScrolling, startIndex, endIndex]);

  // 페이지네이션된 데이터 (일반 모드용)
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // 유틸리티 값들
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // 페이지 이동 함수들
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 페이지당 아이템 수 변경 (1페이지로 리셋)
  const handleItemsPerPageChange = (count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
  };

  // 가상 스크롤링 토글
  const toggleVirtualization = () => {
    setUseVirtualScrolling(!useVirtualScrolling);
    // 가상 스크롤링에서 일반 모드로 전환 시 1페이지로 리셋
    if (useVirtualScrolling) {
      setCurrentPage(1);
    }
  };

  return {
    // 데이터
    currentData,
    paginatedData,

    // 상태
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    useVirtualScrolling,

    // 페이지네이션 액션
    setCurrentPage,
    setItemsPerPage: handleItemsPerPageChange,
    goToPage,
    goToNextPage,
    goToPrevPage,

    // 가상화 액션
    toggleVirtualization,

    // 유틸리티
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
  };
};