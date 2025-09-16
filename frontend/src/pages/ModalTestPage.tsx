import React, { useState } from 'react';
import { Modal } from '../shared/components';

/**
 * ModalTestPage - Modal 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: Modal의 모든 크기, 애니메이션, 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 다양한 크기 (sm, md, lg, xl, full)
 * 2. 애니메이션 효과
 * 3. 중첩 모달
 * 4. 접근성 (키보드 네비게이션, 포커스 트랩)
 * 5. 콜백 함수들
 * 6. 커스텀 스타일링
 */
const ModalTestPage: React.FC = () => {
  // 🎛️ 모달 상태 관리
  const [basicModal, setBasicModal] = useState(false);
  const [smallModal, setSmallModal] = useState(false);
  const [largeModal, setLargeModal] = useState(false);
  const [fullModal, setFullModal] = useState(false);
  const [nestedModal, setNestedModal] = useState(false);
  const [nestedSecond, setNestedSecond] = useState(false);
  const [customModal, setCustomModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  // 📝 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  // 폼 제출 핸들러
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`폼 제출: ${JSON.stringify(formData, null, 2)}`);
    setFormModal(false);
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📝 Modal Component Test
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Modal 컴포넌트의 모든 크기, 스타일, 기능을 테스트합니다.
          </p>
        </div>

        {/* 기본 크기별 모달 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📐 크기별 Modal
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              onClick={() => setSmallModal(true)}
              className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Small Modal
            </button>

            <button
              onClick={() => setBasicModal(true)}
              className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Medium Modal
            </button>

            <button
              onClick={() => setLargeModal(true)}
              className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Large Modal
            </button>

            <button
              onClick={() => setFullModal(true)}
              className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Full Modal
            </button>

            <button
              onClick={() => setCustomModal(true)}
              className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Custom Style
            </button>
          </div>
        </section>

        {/* 기능별 모달 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ⚙️ 기능별 Modal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                중첩 Modal
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                모달 위에 또 다른 모달을 열어 계층 구조를 테스트합니다.
              </p>
              <button
                onClick={() => setNestedModal(true)}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                중첩 Modal 열기
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Form Modal
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                폼이 포함된 모달로 실제 데이터 입력을 테스트합니다.
              </p>
              <button
                onClick={() => setFormModal(true)}
                className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              >
                Form Modal 열기
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Confirm Modal
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                확인/취소 다이얼로그 형태의 모달을 테스트합니다.
              </p>
              <button
                onClick={() => setConfirmModal(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Confirm Modal 열기
              </button>
            </div>
          </div>
        </section>

        {/* 접근성 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ♿ 접근성 테스트
          </h2>

          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              키보드 네비게이션 가이드
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">
                  키보드 단축키
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    •{' '}
                    <kbd className="px-2 py-1 bg-white rounded shadow">Esc</kbd>{' '}
                    - 모달 닫기
                  </li>
                  <li>
                    •{' '}
                    <kbd className="px-2 py-1 bg-white rounded shadow">Tab</kbd>{' '}
                    - 다음 요소로 포커스
                  </li>
                  <li>
                    •{' '}
                    <kbd className="px-2 py-1 bg-white rounded shadow">
                      Shift + Tab
                    </kbd>{' '}
                    - 이전 요소로 포커스
                  </li>
                  <li>
                    •{' '}
                    <kbd className="px-2 py-1 bg-white rounded shadow">
                      Enter
                    </kbd>{' '}
                    - 버튼 활성화
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">접근성 기능</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 포커스 트랩 (모달 내부에서만 탭 이동)</li>
                  <li>• ARIA 라벨 및 역할 정의</li>
                  <li>• 자동 포커스 관리</li>
                  <li>• 모달 닫힌 후 원래 위치로 포커스 복귀</li>
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setBasicModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                접근성 테스트용 Modal
              </button>
              <p className="text-sm text-blue-600 mt-2">
                모달을 열고 키보드만으로 네비게이션해보세요!
              </p>
            </div>
          </div>
        </section>

        {/* === 실제 Modal 컴포넌트들 === */}

        {/* Small Modal */}
        <Modal
          isOpen={smallModal}
          onClose={() => setSmallModal(false)}
          title="Small Modal"
          size="sm"
        >
          <div className="p-4">
            <p className="text-gray-600 mb-4">
              이것은 작은 크기의 모달입니다. 간단한 메시지나 확인 다이얼로그에
              적합합니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSmallModal(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                닫기
              </button>
            </div>
          </div>
        </Modal>

        {/* Basic Modal */}
        <Modal
          isOpen={basicModal}
          onClose={() => setBasicModal(false)}
          title="Medium Modal"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              기본 크기의 모달입니다. 대부분의 컨텐츠에 적합한 크기입니다.
            </p>
            <div className="bg-gray-50 p-4 rounded mb-4">
              <h4 className="font-medium text-gray-800 mb-2">
                모달 기능 테스트
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ 오버레이 클릭으로 닫기</li>
                <li>✅ ESC 키로 닫기</li>
                <li>✅ X 버튼으로 닫기</li>
                <li>✅ 포커스 트랩</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBasicModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                확인
              </button>
            </div>
          </div>
        </Modal>

        {/* Large Modal */}
        <Modal
          isOpen={largeModal}
          onClose={() => setLargeModal(false)}
          title="Large Modal"
          size="lg"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              대형 모달 컨텐츠
            </h3>
            <p className="text-gray-600 mb-6">
              큰 크기의 모달로 많은 내용을 담을 수 있습니다. 복잡한 폼이나 상세
              정보 표시에 적합합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">왼쪽 컨텐츠</h4>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-blue-800 text-sm">
                    Large 모달에서는 좌우로 컨텐츠를 배치할 수 있는 충분한
                    공간이 있습니다.
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">
                  오른쪽 컨텐츠
                </h4>
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-green-800 text-sm">
                    복잡한 레이아웃이나 여러 섹션을 포함할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLargeModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                취소
              </button>
              <button
                onClick={() => setLargeModal(false)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                저장
              </button>
            </div>
          </div>
        </Modal>

        {/* Full Modal */}
        <Modal
          isOpen={fullModal}
          onClose={() => setFullModal(false)}
          title="Full Screen Modal"
          size="full"
        >
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              전체 화면 모달
            </h3>
            <p className="text-gray-600 mb-8">
              전체 화면을 차지하는 모달입니다. 복잡한 에디터나 대시보드 같은
              애플리케이션에 적합합니다.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3">섹션 1</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3">섹션 2</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 bg-blue-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3">섹션 3</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 bg-green-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFullModal(false)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                닫기
              </button>
            </div>
          </div>
        </Modal>

        {/* Nested Modal */}
        <Modal
          isOpen={nestedModal}
          onClose={() => setNestedModal(false)}
          title="첫 번째 모달"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              이것은 첫 번째 모달입니다. 여기서 두 번째 모달을 열 수 있습니다.
            </p>
            <div className="bg-yellow-50 p-4 rounded mb-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ 중첩 모달 사용 시 사용자 경험을 고려해야 합니다.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNestedModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                닫기
              </button>
              <button
                onClick={() => setNestedSecond(true)}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                두 번째 모달 열기
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={nestedSecond}
          onClose={() => setNestedSecond(false)}
          title="두 번째 모달 (중첩)"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              이것은 중첩된 두 번째 모달입니다. Z-index와 오버레이가 올바르게
              작동하는지 확인해보세요.
            </p>
            <div className="bg-red-50 p-4 rounded mb-4">
              <p className="text-red-800 text-sm">
                🔴 이 모달을 닫으면 첫 번째 모달로 돌아갑니다.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNestedSecond(false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                이 모달 닫기
              </button>
              <button
                onClick={() => {
                  setNestedSecond(false);
                  setNestedModal(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                모든 모달 닫기
              </button>
            </div>
          </div>
        </Modal>

        {/* Form Modal */}
        <Modal
          isOpen={formModal}
          onClose={() => setFormModal(false)}
          title="Form Modal"
        >
          <form onSubmit={handleFormSubmit} className="p-6">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메시지
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="메시지를 입력하세요..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              >
                제출
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirm Modal */}
        <Modal
          isOpen={confirmModal}
          onClose={() => setConfirmModal(false)}
          title="확인"
          size="sm"
        >
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  정말 삭제하시겠습니까?
                </h3>
                <p className="text-gray-600 text-sm">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                취소
              </button>
              <button
                onClick={() => {
                  alert('삭제되었습니다!');
                  setConfirmModal(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </Modal>

        {/* Custom Style Modal */}
        <Modal
          isOpen={customModal}
          onClose={() => setCustomModal(false)}
          title=""
        >
          <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">🎨 Custom Styled Modal</h2>
            <p className="mb-6">
              이 모달은 커스텀 스타일이 적용되었습니다. 그라데이션 배경과 흰색
              텍스트를 사용합니다.
            </p>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-6">
              <p className="text-sm">
                Modal 컴포넌트의 children 영역을 활용하여 완전히 다른 스타일을
                적용할 수 있습니다.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setCustomModal(false)}
                className="px-6 py-2 bg-white text-orange-500 rounded-lg hover:bg-gray-100 font-medium"
              >
                멋지네요!
              </button>
            </div>
          </div>
        </Modal>

        {/* 테스트 통계 */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📊 Modal 테스트 현황
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">9</div>
                <div className="text-sm text-gray-600">테스트 모달</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">5</div>
                <div className="text-sm text-gray-600">지원 크기</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600">접근성 지원</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">∞</div>
                <div className="text-sm text-gray-600">중첩 가능</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ModalTestPage;
