import React, { useState, useEffect, useCallback } from 'react';
import { Video } from '../types';
import { PLATFORMS } from '../types/api';

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
    if (num >= 1000) return (num / 1000).toFixed(1) + '천';
    return num.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : '';
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isAnimating ? 'bg-black bg-opacity-75' : 'bg-black bg-opacity-0'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transition-all duration-200 ease-in-out ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <img 
              src={video.channelAvatarUrl || video.channelAvatar || ''} 
              alt={video.channelName || ''}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {video.title || ''}
              </h2>
              <span className="text-sm text-gray-600">{video.channelName || ''}</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                video.platform === PLATFORMS.YOUTUBE ? 'bg-red-100 text-red-700' :
                video.platform === 'TIKTOK' ? 'bg-pink-100 text-pink-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {video.platform}
              </span>
              {video.isTrending && (
                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                  🔥 인기급상승
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

        {/* 콘텐츠 */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 영상/이미지 영역 */}
            <div className="space-y-4">
              {video.platform === PLATFORMS.YOUTUBE ? (
                <div className={`relative bg-black rounded-lg overflow-hidden ${
                  video.aspectRatio === '16:9' 
                    ? 'aspect-video' /* 16:9 롱폼 */
                    : 'aspect-[9/16] max-w-sm mx-auto' /* 9:16 숏폼 */
                }`}>
                  <iframe
                    src={getYouTubeEmbedUrl(video.url || '')}
                    title={video.title || ''}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <img 
                    src={video.thumbnailUrl || video.thumbnail || ''} 
                    alt={video.title || ''}
                    className="w-full rounded-lg"
                  />
                  <div className="text-center">
                    <a 
                      href={video.url || ''}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      원본 링크 보기
                    </a>
                  </div>
                </div>
              )}

              <a 
                href={video.url || ''}
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
              >
                원본 링크에서 보기 →
              </a>
            </div>

            {/* 정보 영역 */}
            <div className="space-y-6">
              {/* 기본 통계 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">조회수</div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-medium">{formatViews(video.views || video.viewCount || 0)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">업로드</div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-medium">
                      {video.uploadDate ? formatDate(video.uploadDate) : 
                       video.daysAgo !== undefined ? `${video.daysAgo}일 전` : '날짜 없음'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">화면비</div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-medium">{video.aspectRatio || '16:9'}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">수집일</div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-medium">
                      {video.archivedAt ? formatDate(video.archivedAt) :
                       video.collectionTime ? formatDate(video.collectionTime) :
                       video.createdAt ? formatDate(video.createdAt) : '날짜 없음'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 키워드/태그 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">키워드</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(video.keywords) 
                    ? video.keywords.map((keyword, index) => (
                        <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                          #{keyword}
                        </span>
                      ))
                    : video.keywords && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                          #{video.keywords}
                        </span>
                      )
                  }
                </div>
              </div>

              {/* AI 분석 결과 */}
              {video.analysisResult && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">AI 분석</h4>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">카테고리</span>
                      <span className="text-sm font-medium">{video.analysisResult.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">신뢰도</span>
                      <span className="text-sm font-medium">{Math.round(video.analysisResult.confidence * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">감정</span>
                      <span className={`text-sm font-medium ${
                        video.analysisResult.sentiment === 'positive' ? 'text-green-600' :
                        video.analysisResult.sentiment === 'negative' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {video.analysisResult.sentiment || '중립'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">처리시간</span>
                      <span className="text-sm font-medium">{video.analysisResult.processingTime}ms</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;