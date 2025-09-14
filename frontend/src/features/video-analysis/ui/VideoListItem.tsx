import React, { useState, memo, useCallback } from 'react';
import { Video } from '../../../shared/types';
import { formatViews } from '../../../shared/utils';
import { getPlatformStyle } from '../../../shared/utils';
import { getVideoId, getThumbnailUrl, getViewCount } from '../../../shared/utils';

interface VideoListItemProps {
  video: Video;
  onCardClick: (video: Video) => void;
  onDeleteClick: (item: { type: 'single'; data: Video }) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelectToggle: (videoId: string | number) => void;
}

const VideoListItem: React.FC<VideoListItemProps> = memo(({
  video,
  onCardClick,
  onDeleteClick,
  isSelectMode,
  isSelected,
  onSelectToggle
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const videoId = getVideoId(video);
  const thumbnailSrc = getThumbnailUrl(video);
  const views = getViewCount(video);

  const handleClick = useCallback((_e: React.MouseEvent) => {
    if (isSelectMode) {
      onSelectToggle(videoId);
    } else {
      onCardClick(video);
    }
  }, [isSelectMode, onSelectToggle, videoId, onCardClick, video]);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  }, [menuOpen]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick({ type: 'single', data: video });
    setMenuOpen(false);
  }, [onDeleteClick, video]);

  const handleCheckboxChange = useCallback(() => {
    onSelectToggle(videoId);
  }, [onSelectToggle, videoId]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      className={`bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer relative ${
        isSelectMode && isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex p-4 gap-4">
        {/* 체크박스 (선택 모드일 때) */}
        {isSelectMode && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              onClick={handleCheckboxClick}
            />
          </div>
        )}

        {/* 썸네일 */}
        <div className="flex-shrink-0">
          <img 
            src={thumbnailSrc} 
            alt={video.title || ''}
            className="w-32 h-20 object-cover rounded"
          />
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                {video.title || ''}
              </h3>
              
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={video.channelAvatarUrl || video.channelAvatar || ''} 
                  alt={video.channelName || ''}
                  className="w-4 h-4 rounded-full"
                />
                <span className="text-xs text-gray-600 truncate">{video.channelName || ''}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{formatViews(views)} 조회수</span>
                <span>{video.daysAgo === 0 ? '오늘' : `${video.daysAgo}일 전`}</span>
                <span className={`px-2 py-1 rounded-full ${getPlatformStyle(video.platform)}`}>
                  {video.platform}
                </span>
              </div>
            </div>

            {/* 메뉴 버튼 */}
            <div className="relative">
              <button 
                onClick={handleMenuToggle}
                className="p-1 rounded hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                </svg>
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10 border">
                  <button 
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd"></path>
                    </svg>
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoListItem;