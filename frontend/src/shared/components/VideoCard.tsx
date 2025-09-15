import React, { memo, useCallback } from 'react';
import { Eye, Play, MoreVertical } from 'lucide-react';
import { formatViews, formatDate, getDurationLabel } from '../utils/formatters';
import { getPlatformStyle } from '../utils/platformStyles';
import { getVideoId, getThumbnailUrl, getViewCount } from '../utils/videoUtils';
import { Video } from '../types';

interface VideoCardProps {
  video: Video;
  onClick?: (video: Video) => void;
  onInfoClick?: (video: Video) => void;
  onChannelClick?: (channelName: string) => void;
  onDelete: (video: Video) => void;  // 필수 Props
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string | number) => void;
  showArchiveInfo?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = memo(({
  video,
  onClick,
  onInfoClick,
  onChannelClick,
  onDelete,
  isSelectMode,
  isSelected,
  onSelectToggle,
  showArchiveInfo
}) => {
  const videoId = getVideoId(video);
  const thumbnailUrl = getThumbnailUrl(video);
  const viewCount = getViewCount(video);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      if (onSelectToggle) {
        onSelectToggle(videoId);
      }
    } else if (onClick) {
      onClick(video);
    }
  }, [isSelectMode, onSelectToggle, videoId, onClick, video]);

  const handleInfoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onInfoClick) {
      onInfoClick(video);
    }
  }, [onInfoClick, video]);

  const handleChannelClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChannelClick && video.channelName) {
      onChannelClick(video.channelName);
    }
  }, [onChannelClick, video.channelName]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(video);
  }, [onDelete, video]);

  return (
    <div
        className={`
          relative group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isSelectMode ? 'hover:ring-2 hover:ring-blue-300' : ''}
        `}
        onClick={handleClick}
      >
        {/* 선택 체크박스 */}
        {(isSelectMode || isSelected) && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={() => onSelectToggle && onSelectToggle(videoId)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* 썸네일 */}
        <div className="relative aspect-video bg-gray-200 overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* 재생 버튼 오버레이 */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
            <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* 플랫폼 배지 */}
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getPlatformStyle(video.platform)}`}>
              {video.platform}
            </span>
          </div>

          {/* 영상 길이 */}
          {video.duration && (
            <div className="absolute bottom-3 right-3">
              <span className="px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
                {getDurationLabel(video.duration)}
              </span>
            </div>
          )}
        </div>

        {/* 비디오 정보 */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
            {video.title}
          </h3>

          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <button
              onClick={handleChannelClick}
              className="hover:text-blue-600 transition-colors truncate"
            >
              {video.channelName}
            </button>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{formatViews(viewCount)}</span>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleInfoClick}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="상세 정보"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDelete}
                  className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                  title="삭제"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {formatDate(video.uploadDate)}
          </div>

          {showArchiveInfo && video.collectedAt && (
            <div className="mt-2 text-xs text-blue-600">
              수집: {formatDate(video.collectedAt)}
            </div>
          )}
        </div>
      </div>
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;