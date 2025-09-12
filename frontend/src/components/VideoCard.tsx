import React, { useState } from 'react';
import { Video, ExtendedVideo } from '../types';
import { PLATFORMS } from '../types/api';

interface VideoCardProps {
  video: ExtendedVideo;
  onClick?: (video: ExtendedVideo) => void; // 일반 클릭 (유튜브: 영상재생, 다른플랫폼: 원본링크)
  onInfoClick?: (video: ExtendedVideo) => void; // 정보 버튼 클릭 (상세 모달)
  onChannelClick?: (channelName: string) => void;
  onDeleteClick?: (item: { type: 'single'; data: ExtendedVideo }) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (videoId: string | number) => void;
  showArchiveInfo?: boolean; // 아카이브 정보 표시 여부
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  onClick,
  onInfoClick, 
  onChannelClick,
  onDeleteClick,
  isSelectMode = false,
  isSelected = false,
  onSelectToggle,
  showArchiveInfo = false
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatViews = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + '천';
    return num.toLocaleString();
  };

  const formatDaysAgo = (days: number) => {
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    return `${days}일 전`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '날짜 없음';
    
    // 한국어 날짜 형식 처리
    if (dateString.includes('오전') || dateString.includes('오후')) {
      // '2025. 9. 9. 오전 5:37:21' 형식을 '2025. 09. 09' 형식으로 변환
      const match = dateString.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
      if (match) {
        const [, year, month, day] = match;
        return `${year}. ${month.padStart(2, '0')}. ${day.padStart(2, '0')}`;
      }
    }
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch {}
    
    return dateString; // 원본 문자열 반환
  };

  // 플랫폼별 스타일
  const platformStyles = {
    YOUTUBE: { bg: 'bg-red-500' },
    TIKTOK: { bg: 'bg-black' },
    INSTAGRAM: { bg: 'bg-gradient-to-r from-purple-500 to-pink-500' }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectMode && onSelectToggle) {
      onSelectToggle(video.id || 0);
      return;
    }

    // 유튜브는 모달로, 다른 플랫폼은 직접 링크 열기
    if (video.platform === PLATFORMS.YOUTUBE && onClick) {
      onClick(video);
    } else if (video.url) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInfoClick) {
      onInfoClick(video);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteClick) {
      onDeleteClick({ type: 'single', data: video });
    }
    setMenuOpen(false);
  };

  const handleSelectToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectToggle) {
      onSelectToggle(video.id || 0);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 group cursor-pointer flex flex-col relative"
    >
      {/* 선택 표시 오버레이 */}
      <div className={`absolute inset-0 z-10 rounded-lg border-4 ${
        isSelected ? 'border-indigo-500 bg-indigo-500 bg-opacity-10' : 'border-transparent'
      } transition-all duration-200 pointer-events-none`}></div>

      {/* 선택 모드 체크박스 */}
      {isSelectMode && (
        <div className={`absolute top-2 left-2 z-20 transition-opacity duration-200 ${
          isSelectMode ? 'opacity-100' : 'opacity-0'
        }`}>
          <div 
            onClick={handleSelectToggle}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer ${
              isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'
            }`}
          >
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 썸네일 */}
      <div className="relative w-full aspect-[9/16]">
        <img 
          className="w-full h-full object-cover" 
          src={video.thumbnailUrl || video.thumbnail || ''} 
          alt={video.title || ''} 
        />

        {/* 플레이 버튼 오버레이 (hover 시) */}
        {!isSelectMode && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
            </svg>
          </div>
        )}

        {/* 플랫폼 배지 (우상단) */}
        <div className={`absolute top-2 right-2 ${
          video.platform === PLATFORMS.YOUTUBE ? platformStyles.YOUTUBE.bg :
          video.platform === 'TIKTOK' ? platformStyles.TIKTOK.bg :
          video.platform === 'INSTAGRAM' ? platformStyles.INSTAGRAM.bg :
          'bg-gray-500'
        } text-white text-xs font-bold px-2 py-1 rounded-full flex items-center`}>
          <span>{video.platform || ''}</span>
        </div>

        {/* 버튼들 (hover 시, 선택 모드가 아닐 때) */}
        {!isSelectMode && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            {/* 정보 버튼 */}
            <button 
              onClick={handleInfoClick}
              className="w-8 h-8 rounded-full bg-blue-500 bg-opacity-80 text-white flex items-center justify-center hover:bg-opacity-100"
              title="상세 정보"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
              </svg>
            </button>
            
            {/* 삭제 메뉴 버튼 */}
            {onDeleteClick && (
              <button 
                onClick={handleMenuToggle}
                className="w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-70"
                title="메뉴"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                </svg>
              </button>
            )}
            
            {menuOpen && onDeleteClick && (
              <div className="absolute left-0 mt-10 w-40 bg-white rounded-md shadow-lg z-10">
                <button 
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd"></path>
                  </svg>
                  삭제하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 정보 */}
      <div className="p-4 flex-grow flex flex-col">
        {/* 제목 */}
        <h3 className="text-md font-semibold text-gray-800 h-12 overflow-hidden">
          {video.isTrending && <span className="mr-1">🔥</span>}
          {video.title || ''}
        </h3>

        {/* 채널 정보 */}
        <div className="flex items-center mt-2 text-sm text-gray-500">
          <img 
            src={video.channelAvatarUrl || video.channelAvatar || ''} 
            className="w-6 h-6 rounded-full mr-2 object-cover"
            alt={video.channelName || ''}
          />
          {onChannelClick ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChannelClick(video.channelName || '');
              }}
              className="hover:text-indigo-600 hover:underline"
            >
              {video.channelName || ''}
            </button>
          ) : (
            <span>{video.channelName || ''}</span>
          )}
        </div>

        {/* 아카이브 정보 (옵션) */}
        {showArchiveInfo && video.archivedAt && (
          <div className="text-xs text-gray-500 mt-2">
            수집일: {formatDate(video.archivedAt)}
          </div>
        )}

        {/* 태그 또는 키워드 */}
        {showArchiveInfo && video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {video.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                #{tag}
              </span>
            ))}
            {video.tags.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{video.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* 카테고리 (아카이브용) */}
        {showArchiveInfo && video.category && (
          <div className="text-xs text-indigo-600 font-medium mt-2">
            {video.category}
          </div>
        )}

        {/* 조회수와 날짜 (하단 고정) */}
        <div className="mt-auto pt-3 text-sm text-gray-600 font-medium">
          <span>
            {video.platform === 'INSTAGRAM' ? (
              video.likes == null ? '좋아요 정보 없음' : `좋아요 ${formatViews(video.likes)}개`
            ) : (
              `조회수 ${formatViews(video.views || video.viewCount || 0)}회`
            )}
          </span>
          <span className="mx-1">•</span>
          <span>
            {showArchiveInfo ? (
              video.uploadDate ? 
                `업로드: ${formatDate(video.uploadDate)}` :
                formatDaysAgo(video.daysAgo || 0)
            ) : (
              formatDaysAgo(video.daysAgo || 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;