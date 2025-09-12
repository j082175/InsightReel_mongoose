import { useState, useCallback } from 'react';

/**
 * 🎯 Modal 상태 관리를 위한 공통 Hook
 * 반복되는 Modal 상태 관리 로직을 하나의 Hook으로 통합
 */
export interface UseModalReturn {
  isOpen: boolean;
  selectedItem: string | null;
  openModal: (item?: string) => void;
  closeModal: () => void;
  toggleModal: (item?: string) => void;
}

/**
 * 단일 Modal을 위한 Hook
 */
export const useModal = (initialOpen = false): UseModalReturn => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const openModal = useCallback((item?: string) => {
    setSelectedItem(item || null);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setSelectedItem(null);
  }, []);

  const toggleModal = useCallback((item?: string) => {
    if (isOpen) {
      closeModal();
    } else {
      openModal(item);
    }
  }, [isOpen, openModal, closeModal]);

  return {
    isOpen,
    selectedItem,
    openModal,
    closeModal,
    toggleModal,
  };
};

/**
 * 다중 Modal을 위한 Hook
 * 여러 종류의 Modal을 한 번에 관리
 */
export interface UseMultiModalReturn<T extends string> {
  modals: Record<T, boolean>;
  selectedItems: Record<T, string | null>;
  openModal: (modalType: T, item?: string) => void;
  closeModal: (modalType: T) => void;
  closeAllModals: () => void;
  isAnyModalOpen: boolean;
}

export const useMultiModal = <T extends string>(
  modalTypes: T[]
): UseMultiModalReturn<T> => {
  // 모든 Modal의 초기 상태를 false로 설정
  const initialModals = modalTypes.reduce((acc, type) => {
    acc[type] = false;
    return acc;
  }, {} as Record<T, boolean>);

  const initialItems = modalTypes.reduce((acc, type) => {
    acc[type] = null;
    return acc;
  }, {} as Record<T, string | null>);

  const [modals, setModals] = useState<Record<T, boolean>>(initialModals);
  const [selectedItems, setSelectedItems] = useState<Record<T, string | null>>(initialItems);

  const openModal = useCallback((modalType: T, item?: string) => {
    setModals(prev => ({ ...prev, [modalType]: true }));
    setSelectedItems(prev => ({ ...prev, [modalType]: item || null }));
  }, []);

  const closeModal = useCallback((modalType: T) => {
    setModals(prev => ({ ...prev, [modalType]: false }));
    setSelectedItems(prev => ({ ...prev, [modalType]: null }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(initialModals);
    setSelectedItems(initialItems);
  }, [initialModals, initialItems]);

  const isAnyModalOpen = Object.values(modals).some(Boolean);

  return {
    modals,
    selectedItems,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
  };
};

/**
 * 편의를 위한 타입별 Hook들
 */
export const useAnalysisModal = () => useModal();
export const useCollectionModal = () => useModal();
export const useGroupModal = () => useModal();