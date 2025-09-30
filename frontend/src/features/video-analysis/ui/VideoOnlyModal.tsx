import React from 'react';
import { Video, PLATFORMS } from '../../../shared/types';
import { Modal } from '../../../shared/components';

interface VideoOnlyModalProps {
  video: Video | null;
  onClose: () => void;
}

const VideoOnlyModal: React.FC<VideoOnlyModalProps> = ({ video, onClose }) => {
  if (!video) return null;

  // Multi-platform video embed URL generator
  const getVideoEmbedUrl = (url: string, platform: string) => {
    if (!url) return '';

    switch (platform) {
      case PLATFORMS.YOUTUBE:
        const videoId = extractYouTubeVideoId(url);
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0` : '';

      case 'INSTAGRAM':
        // Instagram embed URL format
        const instaId = url.match(/\/p\/([A-Za-z0-9_-]+)|\/reel\/([A-Za-z0-9_-]+)|\/reels\/([A-Za-z0-9_-]+)/);
        const shortcode = instaId ? (instaId[1] || instaId[2] || instaId[3]) : null;
        return shortcode ? `https://www.instagram.com/p/${shortcode}/embed/` : '';

      case 'TIKTOK':
        // TikTok embed URL format
        const tikTokId = url.match(/\/video\/(\d+)/);
        return tikTokId ? `https://www.tiktok.com/embed/v2/${tikTokId[1]}` : '';

      default:
        return '';
    }
  };

  const extractYouTubeVideoId = (url: string) => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return '';
  };

  return (
    <Modal
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

        {/* Multi-platform 영상 iframe */}
        <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl">
          <iframe
            src={getVideoEmbedUrl(video?.url || '', video?.platform || '')}
            title={video?.title || ''}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
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
    </Modal>
  );
};

export default VideoOnlyModal;
