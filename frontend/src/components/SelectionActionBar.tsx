import React, { memo, useCallback } from 'react';

interface SelectionActionBarProps {
  isVisible: boolean;
  selectedCount: number;
  totalCount: number;
  itemType: string; // "개 영상" 또는 "개 채널"
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  additionalActions?: React.ReactNode;
}

const SelectionActionBar: React.FC<SelectionActionBarProps> = memo(({
  isVisible,
  selectedCount,
  totalCount,
  itemType,
  onSelectAll,
  onClearSelection,
  onDelete,
  additionalActions
}) => {
  if (!isVisible || selectedCount === 0) return null;

  const isAllSelected = selectedCount === totalCount;

  const handleSelectToggle = useCallback(() => {
    if (isAllSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  }, [isAllSelected, onClearSelection, onSelectAll]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {selectedCount}{itemType} 선택됨
          </span>
          <button
            onClick={handleSelectToggle}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {isAllSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {additionalActions}
          <button 
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            삭제
          </button>
          <button 
            onClick={onClearSelection}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
          >
            선택 해제
          </button>
        </div>
      </div>
    </div>
  );
});

export default SelectionActionBar;