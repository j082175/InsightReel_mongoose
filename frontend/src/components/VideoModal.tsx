import React, { useState, useEffect, useCallback } from 'react';
import { Video } from '../types';

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
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

  const formatViews = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    return num.toLocaleString();
  };

  const getYouTubeEmbedUrl = (url: string) => {
    // YouTube URL에서 video ID 추출
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
        isAnimating ? 'bg-black bg-opacity-75' : 'bg-black bg-opacity-0'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transition-all duration-200 ease-in-out ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-start p-6 border-b">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {video.title}
            </h2>
            <div className="flex items-center gap-3">
              <img 
                src={video.channelAvatarUrl} 
                alt={video.channelName}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm text-gray-600">{video.channelName}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                video.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                video.platform === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {video.platform}
              </span>
              {video.isTrending && (
                <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                  🔥 인기
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 영상/썸네일 영역 */}
            <div className="space-y-4">
              {video.platform === 'YouTube' ? (
                /* 유튜브 영상 iframe */
                <div className={`relative overflow-hidden rounded-lg shadow-sm ${
                  video.aspectRatio === '16:9' 
                    ? 'aspect-video' /* 16:9 롱폼 */
                    : 'aspect-[9/16] max-w-xs mx-auto' /* 9:16 숏폼 */
                }`}>
                  <iframe
                    src={getYouTubeEmbedUrl(video.originalUrl)}
                    title={video.title}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                /* 다른 플랫폼은 썸네일 + 링크 */
                <div className="relative">
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title}
                    className="w-full rounded-lg shadow-sm"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <a
                      href={video.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black bg-opacity-75 text-white p-3 rounded-full hover:bg-opacity-90 transition-opacity"
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              )}
              
              {/* 액션 버튼들 */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={video.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  원본 보기
                </a>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  아카이브에 저장
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  공유
                </button>
              </div>
            </div>

            {/* 정보 영역 */}
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">영상 정보</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">조회수</span>
                    <span className="text-sm font-medium">{formatViews(video.views)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">업로드</span>
                    <span className="text-sm font-medium">
                      {video.daysAgo === 0 ? '오늘' : `${video.daysAgo}일 전`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">비율</span>
                    <span className="text-sm font-medium">{video.aspectRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">수집일</span>
                    <span className="text-sm font-medium">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 키워드 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">키워드</h3>
                <div className="flex flex-wrap gap-2">
                  {video.keywords.map((keyword, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI 분석 결과 */}
              {video.analysisResult && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">AI 분석</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">카테고리</span>
                      <span className="text-sm font-medium">{video.analysisResult.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">신뢰도</span>
                      <span className="text-sm font-medium">{Math.round(video.analysisResult.confidence * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">감정</span>
                      <span className={`text-sm font-medium capitalize ${
                        video.analysisResult.sentiment === 'positive' ? 'text-green-600' :
                        video.analysisResult.sentiment === 'negative' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {video.analysisResult.sentiment || '중립'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">처리 시간</span>
                      <span className="text-sm font-medium">{video.analysisResult.processingTime}ms</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 관련 영상 섹션 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">유사한 영상</h3>
                <div className="text-sm text-gray-500">
                  동일한 채널의 다른 영상들을 여기에 표시할 예정입니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button 
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
          <button className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;