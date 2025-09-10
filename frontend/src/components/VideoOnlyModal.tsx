import React, { useState, useEffect, useCallback } from 'react';
import { Video } from '../types';
import { FieldMapper } from '../types/field-mapper';

interface VideoOnlyModalProps {
  video: Video | null;
  onClose: () => void;
}

const VideoOnlyModal: React.FC<VideoOnlyModalProps> = ({ video, onClose }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (video) {
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [video]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (video) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [video, handleClose]);

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
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isAnimating ? 'bg-black bg-opacity-90' : 'bg-black bg-opacity-0'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`relative transition-all duration-200 ease-in-out ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${
          FieldMapper.getTypedField<string>(video, 'ASPECT_RATIO') === '16:9' 
            ? 'w-full max-w-4xl aspect-video' /* 16:9 롱폼 */
            : 'w-full max-w-sm aspect-[9/16]' /* 9:16 숏폼 */
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button 
          onClick={handleClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-light z-10"
        >
          ✕
        </button>

        {/* YouTube 영상 iframe */}
        <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl">
          <iframe
            src={getYouTubeEmbedUrl(FieldMapper.getTypedField<string>(video, 'URL') || '')}
            title={FieldMapper.getTypedField<string>(video, 'TITLE') || ''}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* 영상 제목 (하단) */}
        <div className="absolute -bottom-16 left-0 right-0 text-center">
          <h3 className="text-white text-lg font-medium truncate px-4">
            {FieldMapper.getTypedField<string>(video, 'TITLE') || ''}
          </h3>
          <p className="text-gray-300 text-sm mt-1">
            {FieldMapper.getTypedField<string>(video, 'CHANNEL_NAME') || ''} • {FieldMapper.getTypedField<string>(video, 'PLATFORM')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoOnlyModal;