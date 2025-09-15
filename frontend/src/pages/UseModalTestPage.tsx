import React, { useState } from 'react';
import { Modal } from '../shared/components';

/**
 * UseModalTestPage - useModal Hook 테스트 페이지
 *
 * 🎯 목적: useModal 커스텀 훅의 기능과 패턴을 시연
 *
 * 테스트 항목:
 * 1. 단일 모달 상태 관리
 * 2. 모달 열기/닫기 기능
 * 3. 데이터 전달 및 콜백 처리
 * 4. 상태 보존 및 초기화
 */

// useModal 훅 구현 (테스트용)
const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState<any>(null);

  const open = (modalData?: any) => {
    if (modalData) setData(modalData);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const toggle = () => {
    setIsOpen(prev => !prev);
  };

  const reset = () => {
    setIsOpen(false);
    setData(null);
  };

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    reset
  };
};

const UseModalTestPage: React.FC = () => {
  // 🎛️ 여러 모달 인스턴스 테스트
  const simpleModal = useModal();
  const dataModal = useModal();
  const confirmModal = useModal();
  const formModal = useModal();

  const [testActions, setTestActions] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions(prev => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 테스트 데이터
  const sampleData = {
    user: { name: '홍길동', role: '관리자' },
    product: { name: '테스트 상품', price: 15000 },
    message: '이것은 테스트 메시지입니다.'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            🎨 useModal Hook Test
          </h1>
          <p className="text-gray-600 mt-1">
            useModal 커스텀 훅의 모든 기능을 테스트합니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* 테스트 컨트롤 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎛️ 모달 컨트롤</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Simple Modal</h3>
                <button
                  onClick={() => {
                    simpleModal.open();
                    addTestLog('Simple Modal 열기');
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  기본 모달 열기
                </button>
                <p className="text-xs text-gray-500">
                  상태: {simpleModal.isOpen ? '열림' : '닫힘'}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Data Modal</h3>
                <button
                  onClick={() => {
                    dataModal.open(sampleData.user);
                    addTestLog('Data Modal 열기 (사용자 데이터)');
                  }}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  데이터 모달 열기
                </button>
                <p className="text-xs text-gray-500">
                  데이터: {dataModal.data ? '있음' : '없음'}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Confirm Modal</h3>
                <button
                  onClick={() => {
                    confirmModal.open(sampleData.message);
                    addTestLog('Confirm Modal 열기');
                  }}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  확인 모달 열기
                </button>
                <p className="text-xs text-gray-500">
                  상태: {confirmModal.isOpen ? '활성' : '비활성'}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Form Modal</h3>
                <button
                  onClick={() => {
                    formModal.open();
                    addTestLog('Form Modal 열기');
                  }}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  폼 모달 열기
                </button>
                <p className="text-xs text-gray-500">
                  폼 상태: {formModal.isOpen ? '편집중' : '대기'}
                </p>
              </div>
            </div>
          </section>

          {/* Hook 기능 테스트 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Hook 기능 테스트</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">토글 기능</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      simpleModal.toggle();
                      addTestLog(`Simple Modal 토글 (${!simpleModal.isOpen ? '열림' : '닫힘'})`);
                    }}
                    className="w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                  >
                    Simple Modal 토글
                  </button>
                  <button
                    onClick={() => {
                      dataModal.toggle();
                      addTestLog(`Data Modal 토글 (${!dataModal.isOpen ? '열림' : '닫힘'})`);
                    }}
                    className="w-full px-3 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm"
                  >
                    Data Modal 토글
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">데이터 전달</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      dataModal.open(sampleData.product);
                      addTestLog('상품 데이터로 모달 열기');
                    }}
                    className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                  >
                    상품 데이터 전달
                  </button>
                  <button
                    onClick={() => {
                      dataModal.open({ timestamp: new Date().toISOString() });
                      addTestLog('타임스탬프 데이터 전달');
                    }}
                    className="w-full px-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 text-sm"
                  >
                    타임스탬프 전달
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">초기화 기능</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      simpleModal.reset();
                      addTestLog('Simple Modal 초기화');
                    }}
                    className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    Simple Modal 리셋
                  </button>
                  <button
                    onClick={() => {
                      dataModal.reset();
                      addTestLog('Data Modal 초기화');
                    }}
                    className="w-full px-3 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm"
                  >
                    Data Modal 리셋
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 테스트 로그 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 테스트 로그</h2>

            <div className="bg-gray-50 p-4 rounded h-64 overflow-y-auto">
              {testActions.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  모달 관련 액션을 수행하면 로그가 여기에 표시됩니다.
                </p>
              ) : (
                <div className="space-y-1">
                  {testActions.map((action, index) => (
                    <div key={index} className="text-sm font-mono text-gray-700">
                      {action}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setTestActions([])}
              className="mt-3 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              로그 지우기
            </button>
          </section>

        </div>
      </div>

      {/* 실제 모달들 */}
      <Modal isOpen={simpleModal.isOpen} onClose={simpleModal.close} title="Simple Modal">
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            이것은 기본적인 모달입니다. useModal 훅을 사용하여 상태를 관리합니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={simpleModal.close}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              닫기
            </button>
            <button
              onClick={() => {
                simpleModal.toggle();
                addTestLog('모달 내부에서 토글');
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              토글
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={dataModal.isOpen} onClose={dataModal.close} title="Data Modal">
        <div className="p-4">
          <p className="text-gray-600 mb-4">전달받은 데이터:</p>
          {dataModal.data && (
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto mb-4">
              {JSON.stringify(dataModal.data, null, 2)}
            </pre>
          )}
          <button
            onClick={dataModal.close}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            닫기
          </button>
        </div>
      </Modal>

      <Modal isOpen={confirmModal.isOpen} onClose={confirmModal.close} title="확인 필요">
        <div className="p-4">
          <p className="text-gray-600 mb-4">{confirmModal.data}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                confirmModal.close();
                addTestLog('확인 버튼 클릭');
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              확인
            </button>
            <button
              onClick={() => {
                confirmModal.close();
                addTestLog('취소 버튼 클릭');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              취소
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={formModal.isOpen} onClose={formModal.close} title="폼 모달">
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => {
                formModal.close();
                addTestLog(`폼 저장: ${JSON.stringify(formData)}`);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              저장
            </button>
            <button
              onClick={() => {
                formModal.close();
                setFormData({ name: '', email: '' });
                addTestLog('폼 취소');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              취소
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default UseModalTestPage;