import React from 'react';
import { Video } from '../types';
import BaseModal from './BaseModal';

interface VideoOnlyModalProps {
  video: Video | null;
  onClose: () => void;
}

const VideoOnlyModal: React.FC<VideoOnlyModalProps> = ({ video, onClose }) => {

  if (!video) return null;

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  };

  const extractYouTubeVideoId = (url: string) => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return '';
  };

  return (
    <BaseModal
      isOpen={!!video}
      onClose={onClose}
      customContainer={true}
      className="z-[100] bg-black bg-opacity-90"
    >
      <div 
        className={`relative ${
          video?.aspectRatio === '16:9' 
            ? 'w-full max-w-4xl aspect-video' /* 16:9 롱폼 */
            : 'w-full max-w-sm aspect-[9/16]' /* 9:16 숏폼 */
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-light z-10"
        >
          ✕
        </button>

        {/* YouTube 영상 iframe */}
        <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl">
          <iframe
            src={getYouTubeEmbedUrl(video?.url || '')}
            title={video?.title || ''}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* 영상 제목 (하단) */}
        <div className="absolute -bottom-16 left-0 right-0 text-center">
          <h3 className="text-white text-lg font-medium truncate px-4">
            {video?.title || ''}
          </h3>
          <p className="text-gray-300 text-sm mt-1">
            {video?.channelName || ''} • {video?.platform}
          </p>
        </div>
      </div>
    </BaseModal>
  );
};

export default VideoOnlyModal;