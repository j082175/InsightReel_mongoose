import React, { memo, useState } from 'react';
import { ChannelGroupModal, ChannelCard, ChannelGroupCard, ChannelAnalysisModal } from '../features/channel-management';
import { BulkCollectionModal } from '../features/trending-collection';
import { VideoAnalysisModal, VideoModal, VideoOnlyModal, VideoListItem } from '../features/video-analysis';
import { BatchCard, BatchForm, BatchVideoList } from '../features/batch-management';
import { Video, Channel, CollectionBatch, ChannelGroup } from '../shared/types';

const FeaturesTestPage: React.FC = memo(() => {
  const [isChannelGroupModalOpen, setChannelGroupModalOpen] = useState(false);
  const [isBulkCollectionModalOpen, setBulkCollectionModalOpen] = useState(false);
  const [isVideoAnalysisModalOpen, setVideoAnalysisModalOpen] = useState(false);
  const [isVideoModalOpen, setVideoModalOpen] = useState(false);
  const [isVideoOnlyModalOpen, setVideoOnlyModalOpen] = useState(false);
  const [isChannelAnalysisModalOpen, setChannelAnalysisModalOpen] = useState(false);
  const [selectedChannelForAnalysis, setSelectedChannelForAnalysis] = useState<string | null>(null);

  // 테스트용 데이터들
  const testVideo: Video = {
    _id: '1',
    title: '테스트 비디오 - AI 분석 결과를 확인할 수 있는 긴 제목의 영상입니다',
    views: 1234567,
    platform: 'YOUTUBE',
    thumbnailUrl: 'https://placehold.co/320x180/FF0000/FFFFFF?text=Test+Video',
    channelName: 'Test Channel',
    uploadDate: '2024-01-15T10:30:00Z',
    duration: 'LONG',
    keywords: ['테스트', '분석', '유튜브'],
    aiSummary: '이 영상은 테스트 목적으로 제작된 콘텐츠입니다. AI 분석 결과를 시연하기 위한 샘플 데이터를 포함하고 있습니다.',
    aiAnalysis: {
      summary: '테스트 영상 요약',
      keyPoints: ['주요 포인트 1', '주요 포인트 2', '주요 포인트 3'],
      sentiment: 'positive',
      topics: ['기술', '교육', '리뷰']
    }
  };

  const testChannels: Channel[] = [
    {
      _id: 'ch1',
      channelId: 'UC123abc',
      name: '테크 채널',
      platform: 'YOUTUBE',
      subscribers: 1000000,
      url: 'https://youtube.com/@tech-channel'
    },
    {
      _id: 'ch2',
      channelId: 'UC456def',
      name: '라이프스타일 채널',
      platform: 'INSTAGRAM',
      subscribers: 500000,
      url: 'https://instagram.com/lifestyle-channel'
    },
    {
      _id: 'ch3',
      channelId: 'UC789ghi',
      name: '엔터테인먼트 채널',
      platform: 'TIKTOK',
      subscribers: 2000000,
      url: 'https://tiktok.com/@entertainment-channel'
    }
  ];

  const testBatch: CollectionBatch = {
    _id: 'batch1',
    name: '테스트 배치',
    description: '테스트용 배치입니다',
    collectionType: 'group',
    targetGroups: [{_id: 'group1', name: '테스트 그룹', color: 'blue'}],
    criteria: {
      daysBack: 7,
      minViews: 10000,
      maxViews: 1000000,
      includeShorts: true,
      includeMidform: true,
      includeLongForm: true,
      keywords: ['테스트', '영상'],
      excludeKeywords: ['광고']
    },
    status: 'completed',
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:30:00Z',
    totalVideosFound: 50,
    totalVideosSaved: 25,
    quotaUsed: 1000,
    stats: {
      byPlatform: {
        YOUTUBE: 15,
        INSTAGRAM: 5,
        TIKTOK: 5
      },
      byDuration: {
        SHORT: 10,
        MID: 8,
        LONG: 7
      }
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  };

  const testBatchVideos: Video[] = [
    testVideo,
    {
      ...testVideo,
      _id: '2',
      title: '배치 수집 영상 2',
      views: 500000,
      platform: 'INSTAGRAM'
    },
    {
      ...testVideo,
      _id: '3',
      title: '배치 수집 영상 3',
      views: 750000,
      platform: 'TIKTOK'
    }
  ];

  const testChannelGroups: ChannelGroup[] = [
    {
      _id: 'group1',
      name: '테크 유튜버 그룹',
      description: '기술 관련 YouTube 채널들을 모은 그룹입니다',
      color: 'blue',
      channels: [
        { channelId: 'UC123abc', name: '테크 채널 1' },
        { channelId: 'UC456def', name: '테크 채널 2' }
      ],
      keywords: ['기술', '프로그래밍', '리뷰'],
      isActive: true,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    {
      _id: 'group2',
      name: '라이프스타일 인플루언서',
      description: '인스타그램 라이프스타일 채널 그룹',
      color: 'pink',
      channels: [
        { channelId: 'IG789ghi', name: '라이프 채널 1' },
        { channelId: 'IG012jkl', name: '라이프 채널 2' }
      ],
      keywords: ['라이프스타일', '패션', '뷰티'],
      isActive: true,
      createdAt: '2024-01-15T11:00:00Z',
      updatedAt: '2024-01-15T11:30:00Z'
    }
  ];

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🎛️ Feature Components</h1>
          <p className="text-lg text-gray-600">기능별 컴포넌트들의 다양한 상태와 동작을 테스트할 수 있습니다.</p>
        </div>

        {/* Channel Management Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📺 Channel Management</h2>

          {/* ChannelGroupModal */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">ChannelGroupModal</h3>
            <button
              onClick={() => setChannelGroupModalOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ChannelGroupModal 열기 (생성 모드)
            </button>
            <p className="text-sm text-gray-600 mt-2">채널 그룹을 생성하거나 편집할 수 있는 모달입니다.</p>
          </div>

          {/* ChannelCard */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">ChannelCard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testChannels.map((channel) => (
                <ChannelCard
                  key={channel._id}
                  channel={channel}
                  onClick={(ch) => console.log('채널 클릭:', ch)}
                  onAnalyze={(channelId) => {
                    setSelectedChannelForAnalysis(channelId);
                    setChannelAnalysisModalOpen(true);
                  }}
                  onEdit={(ch) => console.log('채널 편집:', ch)}
                  onDelete={(ch) => console.log('채널 삭제:', ch)}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">개별 채널 정보를 표시하는 카드 컴포넌트입니다.</p>
          </div>

          {/* ChannelGroupCard */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">ChannelGroupCard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testChannelGroups.map((group) => (
                <ChannelGroupCard
                  key={group._id}
                  group={group}
                  onClick={(g) => console.log('그룹 클릭:', g)}
                  onEdit={(g) => console.log('그룹 편집:', g)}
                  onDelete={(g) => console.log('그룹 삭제:', g)}
                  onCollect={(g) => console.log('그룹 수집:', g)}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">채널 그룹 정보를 표시하는 카드 컴포넌트입니다.</p>
          </div>

          {/* ChannelAnalysisModal */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">ChannelAnalysisModal</h3>
            <button
              onClick={() => {
                setSelectedChannelForAnalysis('UC123abc');
                setChannelAnalysisModalOpen(true);
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              ChannelAnalysisModal 열기
            </button>
            <p className="text-sm text-gray-600 mt-2">채널 분석 결과를 표시하는 모달입니다.</p>
          </div>
        </section>

        {/* Trending Collection Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Trending Collection</h2>

          <div className="space-y-6">
            <div>
              <button
                onClick={() => setBulkCollectionModalOpen(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 mr-4"
              >
                BulkCollectionModal 열기
              </button>
              <p className="text-sm text-gray-600 mt-2">대량 수집 설정 및 진행 상황을 관리하는 모달입니다.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">BatchCard</h3>
              <div className="max-w-md">
                <BatchCard
                  batch={testBatch}
                  onEdit={(batch) => console.log('Edit batch:', batch)}
                  onDelete={(id) => console.log('Delete batch:', id)}
                  onViewVideos={(id) => console.log('View videos:', id)}
                  onToggleStatus={(id, action) => console.log('Toggle status:', id, action)}
                />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">BatchVideoList</h3>
              <div className="max-w-2xl">
                <BatchVideoList
                  videos={testBatchVideos}
                  onVideoSelect={(video) => console.log('Selected video:', video)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Video Analysis Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎬 Video Analysis</h2>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setVideoAnalysisModalOpen(true)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                VideoAnalysisModal 열기
              </button>
              <button
                onClick={() => setVideoModalOpen(true)}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                VideoModal 열기
              </button>
              <button
                onClick={() => setVideoOnlyModalOpen(true)}
                className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
              >
                VideoOnlyModal 열기
              </button>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">VideoListItem</h3>
              <div className="max-w-2xl">
                <VideoListItem
                  video={testVideo}
                  onSelect={(selected) => console.log('Video selected:', selected)}
                  onAnalyze={(video) => console.log('Analyze video:', video)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Batch Management Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Batch Management</h2>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">BatchForm</h3>
            <div className="max-w-md">
              <BatchForm
                onSubmit={(formData) => console.log('Form submitted:', formData)}
                initialData={{
                  name: '테스트 배치',
                  description: '테스트용 배치입니다',
                  settings: {
                    days: 7,
                    minViews: 10000,
                    includeDuration: ['SHORT', 'MID', 'LONG']
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* 상태 정보 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Component States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Channel Management</h3>
              <ul className="text-sm text-blue-700 mt-2">
                <li>• 채널 그룹 생성/편집</li>
                <li>• 채널 선택 인터페이스</li>
                <li>• 그룹 설정 관리</li>
              </ul>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Trending Collection</h3>
              <ul className="text-sm text-purple-700 mt-2">
                <li>• 대량 수집 설정</li>
                <li>• 배치 진행 상태</li>
                <li>• 수집 결과 관리</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Video Analysis</h3>
              <ul className="text-sm text-green-700 mt-2">
                <li>• AI 분석 결과 표시</li>
                <li>• 영상 상세 정보</li>
                <li>• 분석 요약 뷰</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 모달들 - 조건부 렌더링으로 한 번에 하나만 활성화 */}
        {isChannelGroupModalOpen && (
          <ChannelGroupModal
            isOpen={isChannelGroupModalOpen}
            onClose={() => setChannelGroupModalOpen(false)}
            mode="create"
            availableChannels={testChannels}
            onSave={(groupData) => {
              console.log('Channel group saved:', groupData);
              setChannelGroupModalOpen(false);
            }}
          />
        )}

        {isBulkCollectionModalOpen && (
          <BulkCollectionModal
            isOpen={isBulkCollectionModalOpen}
            onClose={() => setBulkCollectionModalOpen(false)}
            channelGroups={[
              { _id: 'group1', name: '테크 그룹', channels: testChannels.slice(0, 2) },
              { _id: 'group2', name: '엔터 그룹', channels: testChannels.slice(1, 3) }
            ]}
            onStartCollection={(settings) => {
              console.log('Collection started:', settings);
              setBulkCollectionModalOpen(false);
            }}
          />
        )}

        {isVideoAnalysisModalOpen && (
          <VideoAnalysisModal
            isOpen={isVideoAnalysisModalOpen}
            onClose={() => setVideoAnalysisModalOpen(false)}
            video={testVideo}
            onAnalyze={(video) => console.log('Analyze video:', video)}
          />
        )}

        {isVideoModalOpen && (
          <VideoModal
            isOpen={isVideoModalOpen}
            onClose={() => setVideoModalOpen(false)}
            video={testVideo}
            onEdit={(video) => console.log('Edit video:', video)}
            onDelete={(id) => console.log('Delete video:', id)}
          />
        )}

        {isVideoOnlyModalOpen && (
          <VideoOnlyModal
            isOpen={isVideoOnlyModalOpen}
            onClose={() => setVideoOnlyModalOpen(false)}
            video={testVideo}
          />
        )}

        {isChannelAnalysisModalOpen && (
          <ChannelAnalysisModal
            isOpen={isChannelAnalysisModalOpen}
            onClose={() => setChannelAnalysisModalOpen(false)}
            channelId={selectedChannelForAnalysis || ''}
          />
        )}
      </div>
    </div>
  );
});

FeaturesTestPage.displayName = 'FeaturesTestPage';

export default FeaturesTestPage;