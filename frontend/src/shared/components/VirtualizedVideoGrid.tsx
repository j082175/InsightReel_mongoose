import React, { useMemo, useState, useEffect, useCallback } from 'react';
import VideoCard from './VideoCard';
import { Video } from '../types';
import { getDocumentId, isItemSelected } from '../utils';

interface VirtualizedVideoGridProps {
  videos: Video[];
  selectedVideos: Set<string>;
  isSelectMode: boolean;
  onChannelClick?: (channelName: string) => void;
  onVideoDelete?: (video: Video) => void;
  onVideoSelect?: (videoId: string) => void;
  containerWidth?: number;
  containerHeight?: number;
}

// 🚀 간단한 가상 스크롤링 구현 (react-window 대체)
export const VirtualizedVideoGrid: React.FC<VirtualizedVideoGridProps> = ({
  videos,
  selectedVideos,
  isSelectMode,
  onChannelClick,
  onVideoDelete,
  onVideoSelect,
  containerWidth = 1200,
  containerHeight = 600,
}) => {
  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 320;
  const columnsPerRow = Math.floor(containerWidth / CARD_WIDTH);
  const rowHeight = CARD_HEIGHT;

  // 가시영역 계산
  const [scrollTop, setScrollTop] = useState(0);
  const visibleRowCount = Math.ceil(containerHeight / rowHeight);
  const startRow = Math.floor(scrollTop / rowHeight);
  const endRow = Math.min(startRow + visibleRowCount + 1, Math.ceil(videos.length / columnsPerRow));

  // 스크롤 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 렌더링할 비디오들 계산
  const visibleVideos = useMemo(() => {
    const result = [];
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columnsPerRow; col++) {
        const index = row * columnsPerRow + col;
        if (index < videos.length) {
          result.push({
            video: videos[index],
            row,
            col,
            index,
            top: row * rowHeight,
            left: col * CARD_WIDTH
          });
        }
      }
    }
    return result;
  }, [videos, startRow, endRow, columnsPerRow, rowHeight, CARD_WIDTH]);

  const totalHeight = Math.ceil(videos.length / columnsPerRow) * rowHeight;

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">영상이 없습니다</div>
        <div className="text-gray-400">비디오를 추가하거나 수집해보세요.</div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-auto border rounded-lg"
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 전체 높이를 위한 더미 컨테이너 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 가시영역 비디오들만 렌더링 */}
        {visibleVideos.map(({ video, row, col, index, top, left }) => {
          const videoId = getDocumentId(video);
          if (!videoId) return null;

          return (
            <div
              key={videoId}
              style={{
                position: 'absolute',
                top,
                left,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                padding: '12px'
              }}
            >
              <VideoCard
                video={video}
                onChannelClick={onChannelClick}
                onDelete={onVideoDelete}
                isSelected={isItemSelected(selectedVideos, video)}
                isSelectMode={isSelectMode}
                onSelect={onVideoSelect}
              />
            </div>
          );
        })}
      </div>

      {/* 스크롤 인디케이터 */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        {startRow + 1}-{endRow} / {Math.ceil(videos.length / columnsPerRow)} 행
      </div>
    </div>
  );
};