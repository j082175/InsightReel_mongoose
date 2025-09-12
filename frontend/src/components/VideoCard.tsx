import React from 'react';
import { Eye, Play } from 'lucide-react';
import { formatViews, formatDate, getDurationLabel } from '../utils/formatters';
import { getPlatformStyle } from '../utils/platformStyles';

interface VideoCardProps {
  video: {
    _id?: string;
    videoId?: string;
    id?: string | number;
    title: string;
    url: string;
    thumbnailUrl?: string;
    thumbnail?: string;
    channelName: string;
    platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
    duration: 'SHORT' | 'MID' | 'LONG';
    views?: number;
    viewCount?: number;
    uploadDate: string;
  };
  onClick?: (video: any) => void;
  onInfoClick?: (video: any) => void;
  onChannelClick?: (channelName: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string | number) => void;
  showArchiveInfo?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  onClick, 
  onInfoClick, 
  onChannelClick,
  isSelectMode,
  isSelected,
  onSelectToggle,
  showArchiveInfo 
}) => {
  const views = video.views || video.viewCount || 0;
  const thumbnailSrc = video.thumbnailUrl || video.thumbnail;

  const handleClick = () => {
    if (isSelectMode && onSelectToggle) {
      onSelectToggle(video.id || video._id || video.videoId!);
    } else if (onClick) {
      onClick(video);
    } else if (!isSelectMode) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="group cursor-pointer">
      <div
        onClick={handleClick}
        className="block"
      >
        {/* 9:16 썸네일 컨테이너 (오버레이 포함) */}
        <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden bg-gray-200 shadow-md hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
          {thumbnailSrc ? (
            <img 
              src={thumbnailSrc} 
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
              <Eye className="w-8 h-8 text-gray-600" />
            </div>
          )}
          
          {/* 상단 오버레이 - 플랫폼 & 길이 정보 */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            <div className="flex gap-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-lg ${getPlatformStyle(video.platform)}`}>
                {video.platform}
              </span>
              <span className="bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                {getDurationLabel(video.duration)}
              </span>
            </div>
            {/* 선택 모드 체크박스 */}
            {isSelectMode && (
              <input
                type="checkbox"
                checked={isSelected || false}
                onChange={(e) => {
                  e.stopPropagation();
                  if (onSelectToggle) {
                    onSelectToggle(video.id || video._id || video.videoId!);
                  }
                }}
                className="w-5 h-5 rounded border-2 border-white bg-black/70 backdrop-blur-sm"
              />
            )}
          </div>
          
          {/* 하단 오버레이 - 제목 & 채널 & 통계 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
            <h3 className="text-white font-semibold text-sm leading-tight mb-1" 
                style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
              {video.title}
            </h3>
            
            <div className="text-gray-200 text-xs mb-1 font-medium">
              {video.channelName} 
            </div>
            
            <div className="flex justify-between items-center text-gray-300 text-xs">
              <span className="font-medium">{formatViews(views)} 조회</span>
              <span>{formatDate(video.uploadDate)}</span>
            </div>
          </div>
          
          {/* 호버 시 플레이 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
            <div className="bg-white/90 rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-gray-800 fill-current" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;