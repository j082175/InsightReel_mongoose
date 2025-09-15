import React, { useState } from 'react';
import { Modal } from '../shared/components';

const UseMultiModalTestPage: React.FC = () => {
  const [modals, setModals] = useState<Record<string, boolean>>({
    modal1: false,
    modal2: false,
    modal3: false
  });

  const openModal = (modalId: string) => {
    setModals(prev => ({ ...prev, [modalId]: true }));
  };

  const closeModal = (modalId: string) => {
    setModals(prev => ({ ...prev, [modalId]: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🎪 useMultiModal Hook Test</h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button onClick={() => openModal('modal1')} className="px-4 py-2 bg-blue-500 text-white rounded">
            Modal 1 열기
          </button>
          <button onClick={() => openModal('modal2')} className="px-4 py-2 bg-green-500 text-white rounded">
            Modal 2 열기
          </button>
          <button onClick={() => openModal('modal3')} className="px-4 py-2 bg-red-500 text-white rounded">
            Modal 3 열기
          </button>
        </div>

        <div className="bg-white p-6 rounded border">
          <h2 className="text-lg font-semibold mb-4">활성 모달 상태</h2>
          {Object.entries(modals).map(([id, isOpen]) => (
            <div key={id} className="flex justify-between py-2">
              <span>{id}</span>
              <span className={isOpen ? 'text-green-600' : 'text-gray-400'}>
                {isOpen ? '열림' : '닫힘'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 실제 모달들 */}
      <Modal isOpen={modals.modal1} onClose={() => closeModal('modal1')} title="Modal 1">
        <div className="p-4">Modal 1 내용</div>
      </Modal>
      <Modal isOpen={modals.modal2} onClose={() => closeModal('modal2')} title="Modal 2">
        <div className="p-4">Modal 2 내용</div>
      </Modal>
      <Modal isOpen={modals.modal3} onClose={() => closeModal('modal3')} title="Modal 3">
        <div className="p-4">Modal 3 내용</div>
      </Modal>
    </div>
  );
};

export default UseMultiModalTestPage;