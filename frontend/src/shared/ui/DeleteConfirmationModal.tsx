import React from 'react';
import { Video } from '../types';
import { Modal } from '../components';

interface DeleteConfirmationModalProps {
  itemToDelete: {
    type: 'single' | 'bulk';
    data?: Video;
    count?: number;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  itemToDelete, 
  onConfirm, 
  onCancel 
}) => {
  if (!itemToDelete) return null;

  const isBulkDelete = itemToDelete.type === 'bulk';
  const title = isBulkDelete 
    ? `${itemToDelete.count}개 영상 삭제` 
    : '영상 삭제';
  
  const message = isBulkDelete
    ? `선택한 ${itemToDelete.count}개의 영상을 삭제하시겠습니까?`
    : `"${itemToDelete.data?.title || ''}"을(를) 삭제하시겠습니까?`;

  const footer = (
    <>
      <button 
        onClick={onCancel}
        className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        취소
      </button>
      <button 
        onClick={onConfirm}
        className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
      >
        삭제
      </button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      showFooter={true}
      footer={footer}
    >
      <div className="p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-500 text-center mb-6">
          {message}
        </p>
        
        <div className="text-xs text-gray-400 text-center">
          이 작업은 되돌릴 수 없습니다.
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;