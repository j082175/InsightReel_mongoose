import { useState, useCallback, useRef } from 'react';

export interface UseEditModeOptions {
  onSave?: (fieldName: string, value: any) => Promise<void> | void;
  onCancel?: (fieldName: string) => void;
  onEditStart?: (fieldName: string) => void;
}

export interface UseEditModeReturn {
  editingField: string | null;
  isEditing: (fieldName: string) => boolean;
  startEdit: (fieldName: string) => void;
  cancelEdit: () => void;
  saveEdit: (fieldName: string, value: any) => Promise<void>;
  isEditMode: boolean;
  toggleEditMode: () => void;
}

export const useEditMode = (options: UseEditModeOptions = {}): UseEditModeReturn => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const pendingChangesRef = useRef<Record<string, any>>({});

  const isEditing = useCallback((fieldName: string): boolean => {
    return editingField === fieldName;
  }, [editingField]);

  const startEdit = useCallback((fieldName: string) => {
    setEditingField(fieldName);
    options.onEditStart?.(fieldName);
  }, [options.onEditStart]);

  const cancelEdit = useCallback(() => {
    const currentField = editingField;
    setEditingField(null);
    if (currentField) {
      options.onCancel?.(currentField);
    }
  }, [editingField, options.onCancel]);

  const saveEdit = useCallback(async (fieldName: string, value: any) => {
    try {
      if (options.onSave) {
        await options.onSave(fieldName, value);
      }

      // 성공적으로 저장된 경우에만 편집 모드 종료
      setEditingField(null);

      // 변경사항 임시 저장
      pendingChangesRef.current[fieldName] = value;
    } catch (error) {
      // 저장 실패 시 편집 모드 유지
      console.error('Save failed:', error);
      throw error;
    }
  }, [options.onSave]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);

    // 편집 모드를 끄면 현재 편집 중인 필드도 취소
    if (isEditMode && editingField) {
      cancelEdit();
    }
  }, [isEditMode, editingField, cancelEdit]);

  return {
    editingField,
    isEditing,
    startEdit,
    cancelEdit,
    saveEdit,
    isEditMode,
    toggleEditMode,
  };
};