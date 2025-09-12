/**
 * 🎯 선택 상태 관리를 위한 커스텀 훅
 * 여러 컴포넌트에서 재사용되는 선택 로직을 통합
 */
import { useState, useCallback } from 'react';

/**
 * 제네릭 선택 관리 훅
 * @template T - 선택 아이템의 ID 타입 (string | number)
 * @param initialSelection - 초기 선택 상태
 * @returns 선택 관리 함수들과 상태
 */
export const useSelection = <T extends string | number>(
  initialSelection: Set<T> = new Set()
) => {
  const [selected, setSelected] = useState<Set<T>>(initialSelection);

  /**
   * 단일 아이템 선택 토글
   */
  const toggle = useCallback((id: T) => {
    setSelected(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  /**
   * 전체 선택/해제
   * @param items - 전체 선택할 아이템들의 ID 배열
   */
  const selectAll = useCallback((items: T[]) => {
    setSelected(prev => {
      // 현재 선택된 수와 전체 아이템 수가 같으면 전체 해제
      if (prev.size === items.length) {
        return new Set();
      }
      // 아니면 전체 선택
      return new Set(items);
    });
  }, []);

  /**
   * 선택 초기화
   */
  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  /**
   * 특정 아이템이 선택되었는지 확인
   */
  const isSelected = useCallback((id: T) => {
    return selected.has(id);
  }, [selected]);

  /**
   * 여러 아이템 선택 추가
   */
  const addMultiple = useCallback((ids: T[]) => {
    setSelected(prev => {
      const newSelection = new Set(prev);
      ids.forEach(id => newSelection.add(id));
      return newSelection;
    });
  }, []);

  /**
   * 여러 아이템 선택 제거
   */
  const removeMultiple = useCallback((ids: T[]) => {
    setSelected(prev => {
      const newSelection = new Set(prev);
      ids.forEach(id => newSelection.delete(id));
      return newSelection;
    });
  }, []);

  /**
   * 선택된 아이템 수
   */
  const count = selected.size;

  /**
   * 선택된 아이템이 있는지 확인
   */
  const hasSelection = count > 0;

  return {
    selected,
    setSelected,
    toggle,
    selectAll,
    clear,
    isSelected,
    addMultiple,
    removeMultiple,
    count,
    hasSelection,
  };
};

/**
 * 컴포넌트별 타입 별칭 (편의용)
 */
export type StringSelection = ReturnType<typeof useSelection<string>>;
export type NumberSelection = ReturnType<typeof useSelection<number>>;