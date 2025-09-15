import React, { memo, useCallback, useState } from 'react';
import { Eye, Play, MoreVertical } from 'lucide-react';
import { formatViews, formatDate, getDurationLabel } from '../utils/formatters';
import { getPlatformStyle } from '../utils/platformStyles';
import { getVideoId, getThumbnailUrl, getViewCount } from '../utils/videoUtils';
import { Video } from '../types';
import { DeleteConfirmModal, NotificationModal } from '../ui';

interface VideoCardProps {
  video: Video;
  onClick?: (video: Video) => void;
  onInfoClick?: (video: Video) => void;
  onChannelClick?: (channelName: string) => void;
  onDelete?: (video: Video) => void;
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
  const views = getViewCount(video);
  const thumbnailSrc = getThumbnailUrl(video);
  const videoId = getVideoId(video);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const handleClick = useCallback(() => {
    if (isSelectMode && onSelectToggle) {
      onSelectToggle(videoId);
    } else if (onClick) {
      onClick(video);
    } else if (!isSelectMode) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  }, [isSelectMode, onSelectToggle, videoId, onClick, video]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelectToggle) {
      onSelectToggle(videoId);
    }
  }, [onSelectToggle, videoId]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    console.log('🎯 내장 삭제 로직 실행 시작');
    setIsDeleting(true);
    
    console.log('⚠️ onDelete prop이 없어서 내장 삭제 로직 실행');
    
    // 기본 삭제 로직
    setIsDeleting(true);
    try {
      // 삭제에는 API에서 변환된 id 필드 사용
      const dbId = video._id;  // MongoDB _id 필드 직접 사용
      if (!dbId) {
        throw new Error('비디오 ID를 찾을 수 없습니다');
      }
      
      console.log('삭제할 비디오 정보:', {
        dbId,
        videoSource: video.source,
        isFromTrending: video.isFromTrending,
        isTrending: video.isTrending,
        title: video.title
      });
      
      // 비디오 출처에 따라 적절한 삭제 API 호출  
      const isFromTrending = video.source === 'trending' || video.isFromTrending || video.isTrending;
      
      console.log('🔍 삭제 시도 전 비디오 source 분석:', {
        'video.source': video.source,
        'video.isFromTrending': video.isFromTrending,  
        'video.isTrending': video.isTrending,
        'isFromTrending 결정': isFromTrending
      });
      
      let response;
      if (isFromTrending) {
        // 트렌딩 컬렉션에서 삭제 (source 정보가 있으면 정확한 API 사용)
        response = await fetch(`http://localhost:3000/api/videos/${dbId}?fromTrending=true`, {
          method: 'DELETE'
        });
      } else {
        // 일반 비디오 컬렉션에서 삭제
        response = await fetch(`http://localhost:3000/api/videos/${dbId}`, {
          method: 'DELETE'
        });
      }
      
      // 첫 번째 시도 실패 시 fallback 시도 (source 정보 관계없이)
      if (!response.ok) {
        console.log('첫 번째 삭제 시도 실패, fallback 시도 중...', {
          originalUrl: response.url,
          status: response.status,
          videoSource: video.source,
          isFromTrending
        });
        const fallbackUrl = isFromTrending 
          ? `http://localhost:3000/api/videos/${dbId}` 
          : `http://localhost:3000/api/videos/${dbId}?fromTrending=true`;
          
        response = await fetch(fallbackUrl, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          console.log('Fallback 삭제 성공:', fallbackUrl);
        } else {
          console.log('Fallback 삭제도 실패:', {
            url: fallbackUrl,
            status: response.status,
            statusText: response.statusText
          });
        }
      }
      
      if (response.ok) {
        setShowDeleteModal(false);
        setNotification({
          show: true,
          type: 'success',
          title: '삭제 완료',
          message: '영상이 성공적으로 삭제되었습니다.'
        });
        
        // 삭제 성공 후 부모 컴포넌트에 UI 업데이트 알림
        if (onDelete) {
          console.log('✅ 삭제 성공, onDelete 콜백 호출하여 UI 업데이트');
          onDelete(video);
        } else {
          console.log('✅ 삭제 성공, onDelete 콜백 없음 (수동 새로고침 필요)');
        }
        
        // 삭제 성공했으므로 return으로 함수 종료
        return;
      }
      
      // 삭제 실패 시 에러 처리
      setNotification({
        show: true,
        type: 'error',
        title: '삭제 실패',
        message: '영상 삭제에 실패했습니다. 다시 시도해주세요.'
      });
      setIsDeleting(false);
    } catch (error) {
      console.error('삭제 실패:', error);
      setNotification({
        show: true,
        type: 'error',
        title: '오류 발생',
        message: '삭제 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
      setIsDeleting(false);
    }
  }, [onDelete, video]);

  const handleCloseModal = useCallback(() => {
    if (!isDeleting) {
      setShowDeleteModal(false);
    }
  }, [isDeleting]);

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
                {getDurationLabel(video.duration || 'LONG')}
              </span>
            </div>
            
            <div className="flex gap-1">
              {/* 선택 모드 체크박스 */}
              {isSelectMode && (
                <input
                  type="checkbox"
                  checked={isSelected || false}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 rounded border-2 border-white bg-black/70 backdrop-blur-sm"
                />
              )}
              
              {/* 삭제 버튼 */}
              {!isSelectMode && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-white hover:text-red-400 hover:bg-red-500/30 rounded-full backdrop-blur-sm bg-black/80 transition-colors z-10 relative"
                  title="영상 삭제"
                  style={{ minWidth: '32px', minHeight: '32px' }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </div>
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
              {video.title || 'Untitled'}
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

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="영상 삭제"
        message="이 영상을 삭제하시겠습니까? 삭제된 영상은 복구할 수 없습니다."
        itemName={video.title || 'Untitled'}
        isLoading={isDeleting}
      />

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={notification.show}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.type === 'success' ? 2000 : undefined}
      />
    </div>
  );
});

export default VideoCard;