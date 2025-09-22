import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useTrendingStats,
  useQuotaStatus,
  useServerStatus,
} from '../shared/hooks';
import toast from 'react-hot-toast';
import { Video } from '../shared/types';
import { useAppContext } from '../app/providers';
import { ChannelAnalysisModal } from '../features/channel-management';
import { SearchBar } from '../shared/components';
import { UniversalGrid } from '../widgets';
import { VideoManagement } from '../features';
import { FadeIn } from '../shared/components/animations';

import { PLATFORMS } from '../shared/types/api';
import { getDocumentId } from '../shared/utils';
import { formatViews } from '../shared/utils/formatters';

const DashboardPage: React.FC = () => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(1);
  const [channelToAnalyze, setChannelToAnalyze] = useState<string | null>(null);


  // VideoStore 사용 - 간소화 (선택 상태는 UniversalGrid에서 관리)
  const videoStore = VideoManagement.useVideoStore(selectedBatchId);
  const {
    videos,
    loading,
    error,
    filters,
    deleteVideo,
    updateFilters,
  } = videoStore;


  // 기타 API 훅들
  const { data: trendingStats } = useTrendingStats();
  const { data: quotaStatus } = useQuotaStatus();
  const { data: serverStatus } = useServerStatus();

  // 전역 상태에서 배치 정보 가져오기
  const { collectionBatches } = useAppContext();

  // React Query가 자동으로 데이터를 가져오므로 수동 호출 불필요

  const handleVideoDelete = async (video: Video) => {
    try {
      const videoId = getDocumentId(video);
      if (!videoId) {
        console.error('❌ 비디오 ID가 없습니다:', video);
        return;
      }
      await deleteVideo(videoId);
      toast.success(`비디오 "${video.title}" 삭제 완료`);
    } catch (error) {
      toast.error(`비디오 삭제 실패: ${error}`);
      throw error;
    }
  };


  // 통계 계산
  const stats = {
    totalVideos: videos.length,
    totalViews: videos.reduce((sum, video) => sum + (video.views || 0), 0),
    totalLikes: videos.reduce((sum, video) => sum + (video.likes || 0), 0),
    platformCounts: videos.reduce(
      (acc, video) => {
        acc[video.platform] = (acc[video.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  if (loading && videos.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                영상 대시보드
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                수집된 영상들을 관리하고 분석하세요
              </p>
            </div>

            {/* 통계 요약 */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalVideos}
                </div>
                <div className="text-xs text-gray-500">총 영상</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatViews(stats.totalViews)}
                </div>
                <div className="text-xs text-gray-500">총 조회수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatViews(stats.totalLikes)}
                </div>
                <div className="text-xs text-gray-500">총 좋아요</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 검색 및 필터 바 */}
        <SearchBar
          searchTerm={filters.keyword}
          onSearchTermChange={(term) => updateFilters({ keyword: term })}
          placeholder="영상, 채널, 키워드 검색..."
          showFilters={true}
        >
          <select
            value={filters.platform}
            onChange={(e) => updateFilters({ platform: e.target.value })}
            className="border-gray-300 rounded-md"
          >
            <option value="">모든 플랫폼</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="TIKTOK">TikTok</option>
            <option value="INSTAGRAM">Instagram</option>
          </select>

        </SearchBar>

        {/* 결과 정보 */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="text-sm text-gray-500">
            총 {videos.length}개 영상 (키워드: "{filters.keyword || '없음'}",
            플랫폼: {filters.platform || '전체'})
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* 🚀 UniversalGrid - 간소화된 통합 그리드 */}
        <UniversalGrid
          data={videos}
          cardType="video"
          onSelectionChange={(selectedIds) => {
            // VideoStore에 동기화 (필요시)
            console.log('Selected items changed:', selectedIds);
          }}
          onDelete={handleVideoDelete}
          onBulkDelete={async (selectedVideos) => {
            try {
              const selectedVideoIds = selectedVideos.map(video => getDocumentId(video)).filter(Boolean) as string[];
              for (const videoId of selectedVideoIds) {
                await deleteVideo(videoId);
              }
              toast.success(`선택된 ${selectedVideoIds.length}개 비디오가 삭제되었습니다`);
            } catch (error) {
              toast.error(`일괄 삭제 실패: ${error}`);
            }
          }}
          onCardClick={(video) => setChannelToAnalyze(video.channelName)}
          initialItemsPerPage={20}
          showVirtualScrolling={true}
          gridSize={gridSize}
          containerWidth={1200}
          containerHeight={600}
          className="bg-white rounded-lg shadow p-6"
        />
      </div>

      {/* 모달들 */}
      <ChannelAnalysisModal
        channelName={channelToAnalyze}
        onClose={() => setChannelToAnalyze(null)}
      />
    </div>
  );
};

export default DashboardPage;
