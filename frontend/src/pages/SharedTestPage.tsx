import React, { memo, useState } from 'react';
import { VideoCard, SearchBar, ActionBar, Modal } from '../shared/components';
import { Header, Sidebar } from '../shared/components/layout';
import { DeleteConfirmModal, ApiKeyManager, NotificationModal, SettingsModal } from '../shared/ui';
import { formatViews, formatDate, getDurationLabel } from '../shared/utils/formatters';
import { getPlatformStyle, getPlatformIconStyle } from '../shared/utils/platformStyles';
import { Video } from '../shared/types';

const SharedTestPage: React.FC = memo(() => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isApiKeyManagerOpen, setApiKeyManagerOpen] = useState(false);
  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // 테스트용 비디오 데이터들
  const testVideos: Video[] = [
    {
      _id: '1',
      title: 'YouTube 영상 - 일반적인 제목',
      views: 1234567,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FF0000/FFFFFF?text=YouTube',
      channelName: 'Tech Channel',
      uploadDate: '2024-01-15T10:30:00Z',
      duration: 'LONG',
      keywords: ['기술', '리뷰', '튜토리얼'],
    },
    {
      _id: '2',
      title: 'Instagram 릴스 - 매우 긴 제목이 있는 콘텐츠입니다 어떻게 표시될지 확인해보세요',
      views: 50000,
      platform: 'INSTAGRAM',
      thumbnailUrl: 'https://placehold.co/320x180/E4405F/FFFFFF?text=Instagram',
      channelName: '인플루언서',
      uploadDate: '2024-01-10T15:45:00Z',
      duration: 'SHORT',
      keywords: ['패션', '라이프스타일'],
    },
    {
      _id: '3',
      title: 'TikTok 쇼츠',
      views: 999,
      platform: 'TIKTOK',
      thumbnailUrl: 'https://placehold.co/320x180/000000/FFFFFF?text=TikTok',
      channelName: '크리에이터',
      uploadDate: '2024-01-05T08:20:00Z',
      duration: 'MID',
      keywords: ['댄스', '트렌드'],
    },
    {
      _id: '4',
      title: '높은 조회수 영상',
      views: 15678900,
      platform: 'YOUTUBE',
      thumbnailUrl: 'https://placehold.co/320x180/FF0000/FFFFFF?text=High+Views',
      channelName: 'Popular Channel',
      uploadDate: '2024-01-01T12:00:00Z',
      duration: 'LONG',
      keywords: ['바이럴', '인기'],
    }
  ];

  const handleSelectToggle = (videoId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  };

  const handleVideoClick = (video: Video) => {
    console.log('Video clicked:', video.title);
  };

  const handleVideoDelete = async (video: Video) => {
    console.log('Delete video:', video.title);
    alert(`테스트: "${video.title}" 비디오 삭제 요청됨`);
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🧱 Shared Components</h1>
          <p className="text-lg text-gray-600">공유 컴포넌트들의 다양한 상태와 변형을 테스트할 수 있습니다.</p>
        </div>

        {/* SearchBar 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔍 SearchBar</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">기본 상태</h3>
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="영상 제목, 채널명으로 검색..."
              />
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">검색어 입력된 상태</h3>
              <SearchBar
                value="YouTube"
                onChange={() => {}}
                placeholder="검색어가 있는 상태"
              />
            </div>
          </div>
        </section>

        {/* VideoCard 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎬 VideoCard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {testVideos.map((video) => (
              <div key={video._id} className="bg-white p-4 rounded-lg shadow">
                <VideoCard
                  video={video}
                  isSelected={selectedItems.includes(video._id)}
                  isSelectMode={true}
                  onSelectToggle={handleSelectToggle}
                  onClick={handleVideoClick}
                  onDelete={handleVideoDelete}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ActionBar 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚡ ActionBar</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">선택된 아이템이 없는 상태</h3>
              <ActionBar
                selectedCount={0}
                totalCount={testVideos.length}
                onSelectAll={() => setSelectedItems(testVideos.map(v => v.id))}
                onDeselectAll={() => setSelectedItems([])}
                onDelete={() => setDeleteModalOpen(true)}
              />
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">일부 아이템이 선택된 상태 ({selectedItems.length}개 선택)</h3>
              <ActionBar
                selectedCount={selectedItems.length}
                totalCount={testVideos.length}
                onSelectAll={() => setSelectedItems(testVideos.map(v => v.id))}
                onDeselectAll={() => setSelectedItems([])}
                onDelete={() => setDeleteModalOpen(true)}
              />
            </div>
          </div>
        </section>

        {/* Modal 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🪟 Modal</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              기본 모달 열기
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              삭제 확인 모달 열기
            </button>
          </div>
        </section>

        {/* 포맷터 함수 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Formatters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">조회수 포맷팅</h3>
              <div className="space-y-2 text-sm">
                <div>999 → {formatViews(999)}</div>
                <div>1000 → {formatViews(1000)}</div>
                <div>50000 → {formatViews(50000)}</div>
                <div>1234567 → {formatViews(1234567)}</div>
                <div>15678900 → {formatViews(15678900)}</div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">날짜 포맷팅</h3>
              <div className="space-y-2 text-sm">
                <div>2024-01-15T10:30:00Z → {formatDate('2024-01-15T10:30:00Z')}</div>
                <div>2024-01-10T15:45:00Z → {formatDate('2024-01-10T15:45:00Z')}</div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">영상 길이 라벨</h3>
              <div className="space-y-2 text-sm">
                <div>SHORT → {getDurationLabel('SHORT')}</div>
                <div>MID → {getDurationLabel('MID')}</div>
                <div>LONG → {getDurationLabel('LONG')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* 플랫폼 스타일 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎨 Platform Styles</h2>
          <div className="space-y-4">
            {['YOUTUBE', 'INSTAGRAM', 'TIKTOK'].map(platform => (
              <div key={platform} className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">{platform}</h3>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getPlatformStyle(platform)}`}>
                    {platform}
                  </span>
                  <div className={`w-4 h-4 rounded ${getPlatformIconStyle(platform)}`}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 모달들 */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="테스트 모달"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              이것은 기본 Modal 컴포넌트의 테스트입니다.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                확인
              </button>
            </div>
          </div>
        </Modal>

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={() => {
            console.log('삭제 확인:', selectedItems);
            setDeleteModalOpen(false);
          }}
          title="선택된 항목 삭제"
          message={`${selectedItems.length}개의 항목을 삭제하시겠습니까?`}
        />

        {/* Header 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔝 Header</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">기본 헤더</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(true)} />
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📱 Sidebar</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">사이드바 상태들</h3>
              <div className="space-y-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  사이드바 열기
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ApiKeyManager 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔑 API Key Manager</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">API 키 관리</h3>
              <button
                onClick={() => setApiKeyManagerOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                API 키 관리자 열기
              </button>
            </div>
          </div>
        </section>

        {/* NotificationModal 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔔 Notification Modal</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">다양한 알림 타입</h3>
              <div className="flex flex-wrap gap-3">
                {(['success', 'error', 'warning', 'info'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setNotificationType(type);
                      setNotificationModalOpen(true);
                    }}
                    className={`px-4 py-2 text-white rounded hover:opacity-90 ${
                      type === 'success' ? 'bg-green-600' :
                      type === 'error' ? 'bg-red-600' :
                      type === 'warning' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}
                  >
                    {type.toUpperCase()} 알림
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SettingsModal 테스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Settings Modal</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">설정 모달</h3>
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                설정 모달 열기
              </button>
            </div>
          </div>
        </section>

        {/* 모달들 */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isTestMode={true}
        />

        <ApiKeyManager
          isOpen={isApiKeyManagerOpen}
          onClose={() => setApiKeyManagerOpen(false)}
        />

        <NotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setNotificationModalOpen(false)}
          type={notificationType}
          title={`${notificationType.toUpperCase()} 알림 테스트`}
          message={`이것은 ${notificationType} 타입의 알림 메시지입니다. 테스트 목적으로 표시되고 있습니다.`}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
        />
      </div>
    </div>
  );
});

SharedTestPage.displayName = 'SharedTestPage';

export default SharedTestPage;