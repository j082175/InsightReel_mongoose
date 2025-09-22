import React from 'react';
import VideoCard from '../../../shared/components/VideoCard';
import { CardRendererProps } from '../types';
import { Video } from '../../../shared/types';
import { getDocumentId } from '../../../shared/utils';

/**
 * VideoRenderer - VideoCard를 UniversalGrid에서 사용할 수 있도록 연결하는 어댑터
 */
export const VideoRenderer: React.FC<CardRendererProps<Video>> = ({
  item,
  isSelected = false,
  isSelectMode = false,
  onSelect,
  onDelete,
  onCardClick
}) => {
  const videoId = getDocumentId(item);

  const handleSelect = (id: string) => {
    onSelect?.(id);
  };

  const handleDelete = (video: Video) => {
    onDelete?.(video);
  };

  const handleChannelClick = (channelName: string) => {
    // VideoCard에서 채널 클릭 시 channelName을 전달하지만
    // UniversalGrid에서는 전체 item을 전달하도록 변환
    onCardClick?.(item);
  };

  if (!videoId) {
    return null;
  }

  return (
    <VideoCard
      video={item}
      isSelected={isSelected}
      isSelectMode={isSelectMode}
      onSelect={handleSelect}
      onDelete={handleDelete}
      onChannelClick={handleChannelClick}
    />
  );
};