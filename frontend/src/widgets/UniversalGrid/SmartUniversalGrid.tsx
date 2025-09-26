import React from 'react';
import { UniversalGrid } from './UniversalGrid';
import { useVideoStore } from '../../features/video-management/model/videoStore';
import { VideoCard } from '../../shared/components';

/**
 * 🧠 Smart UniversalGrid - 자동 설정 버전
 * 데이터 타입만 지정하면 Store, Card, 삭제 함수까지 모두 자동 연결
 */

interface SmartUniversalGridProps {
  dataType: 'video' | 'channel' | 'trending' | 'batch';
  batchId?: string;
  className?: string;
  gridSize?: 1 | 2 | 3;
  enableSearch?: boolean;
  showVirtualScrolling?: boolean;
  useWindowScroll?: boolean;
}

export function SmartUniversalGrid({
  dataType,
  batchId = 'all',
  className,
  gridSize = 2,
  enableSearch = false,
  showVirtualScrolling = true,
  useWindowScroll = true,
}: SmartUniversalGridProps) {

  // 🔄 데이터 타입별 자동 Store 연결
  const getStoreAndRenderer = () => {
    switch (dataType) {
      case 'video': {
        const videoStore = useVideoStore(batchId);
        return {
          data: videoStore.videos,
          hasMore: videoStore.hasMore,
          onLoadMore: videoStore.loadMore,
          isLoading: videoStore.isLoadingMore,
          renderCard: (video: any, cardProps: any) => (
            <VideoCard video={video} {...cardProps} />
          ),
          onDelete: async (video: any) => await videoStore.deleteVideo(video._id),
          onBulkDelete: async (videos: any[]) => {
            const ids = videos.map(v => v._id);
            await videoStore.deleteVideos(ids);
          }
        };
      }

      case 'channel': {
        // TODO: 채널 Store 연결
        return {
          data: [],
          renderCard: () => null,
          onDelete: async () => {},
          onBulkDelete: async () => {}
        };
      }

      default:
        throw new Error(`Unsupported dataType: ${dataType}`);
    }
  };

  const config = getStoreAndRenderer();

  return (
    <UniversalGrid
      data={config.data}
      renderCard={config.renderCard}
      hasMore={config.hasMore}
      onLoadMore={config.onLoadMore}
      isLoading={config.isLoading}
      onDelete={config.onDelete}
      onBulkDelete={config.onBulkDelete}

      // UI 설정
      className={className}
      gridSize={gridSize}
      enableSearch={enableSearch}
      showVirtualScrolling={showVirtualScrolling}
      useWindowScroll={useWindowScroll}
    />
  );
}

// 🎯 사용법 (매우 간단!)
export default SmartUniversalGrid;