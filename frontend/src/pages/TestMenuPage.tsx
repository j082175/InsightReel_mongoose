import React, { memo } from 'react';
import { useNavigation } from '../app/routing';

const TestMenuPage: React.FC = memo(() => {
  const { navigateTo } = useNavigation();

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🛠️ 컴포넌트 테스트
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          개발 환경에서 컴포넌트들의 동작을 확인할 수 있는 테스트
          페이지들입니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {/* Shared 컴포넌트 테스트 */}
          <button
            onClick={() => navigateTo('test-shared')}
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 group text-left w-full"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                🧱
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Shared</h2>
              <p className="text-gray-600 leading-relaxed">
                공유 컴포넌트 테스트
              </p>
              <div className="mt-6 text-sm text-blue-600">
                • VideoCard 변형들
                <br />
                • SearchBar 상태들
                <br />
                • Modal 크기들
                <br />
                • ActionBar, Header, Sidebar
                <br />
                • ApiKeyManager, NotificationModal
                <br />• SettingsModal, DeleteConfirmModal
              </div>
            </div>
          </button>

          {/* Features 컴포넌트 테스트 */}
          <button
            onClick={() => navigateTo('test-features')}
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200 group text-left w-full"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                🎛️
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Features
              </h2>
              <p className="text-gray-600 leading-relaxed">
                기능 컴포넌트 테스트
              </p>
              <div className="mt-6 text-sm text-purple-600">
                • ChannelGroupModal
                <br />
                • ChannelCard, ChannelGroupCard
                <br />
                • ChannelAnalysisModal
                <br />
                • VideoAnalysisModal, VideoModal
                <br />
                • BulkCollectionModal
                <br />• BatchCard, BatchForm, BatchVideoList
              </div>
            </div>
          </button>

          {/* Components Lab 테스트 */}
          <button
            onClick={() => navigateTo('test-components')}
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 group text-left w-full"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                🧪
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Components Lab
              </h2>
              <p className="text-gray-600 leading-relaxed">
                개별 컴포넌트 상세 테스트
              </p>
              <div className="mt-6 text-sm text-indigo-600">
                • 컴포넌트별 전용 페이지
                <br />
                • 모든 props와 상태
                <br />
                • 실전 사용 시나리오
                <br />• 카테고리별 분류
              </div>
            </div>
          </button>

          {/* Integration 테스트 */}
          <button
            onClick={() => navigateTo('test-integration')}
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200 group text-left w-full"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                🔗
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Integration
              </h2>
              <p className="text-gray-600 leading-relaxed">통합 테스트</p>
              <div className="mt-6 text-sm text-green-600">
                • 실제 API 연동
                <br />
                • 실제 데이터 렌더링
                <br />
                • 실제 상태 관리
                <br />• CRUD 동작 확인
              </div>
            </div>
          </button>
        </div>

        {/* 개발 정보 */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            💡 사용 방법
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>
              • <strong>Shared</strong>: 기본 레고 블록들의 다양한 상태 확인
            </li>
            <li>
              • <strong>Features</strong>: 조립된 기능 컴포넌트들의 동작 확인
            </li>
            <li>
              • <strong>Components Lab</strong>: 개별 컴포넌트의 상세하고
              전문적인 테스트
            </li>
            <li>
              • <strong>Integration</strong>: 실제 환경에서의 전체 동작 흐름
              테스트
            </li>
          </ul>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ 이 테스트 페이지들은 개발 환경에서만 접근 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

TestMenuPage.displayName = 'TestMenuPage';

export default TestMenuPage;
