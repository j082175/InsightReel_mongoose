import React, { useState, useCallback } from 'react';
import { Channel } from '../../../shared/types';
import { formatViews } from '../../../shared/utils/formatters';
import { getPlatformStyle } from '../../../shared/utils/platformStyles';
import { DeleteConfirmModal, NotificationModal } from '../../../shared/ui';

interface ChannelCardProps {
  channel: Channel;
  isSelected?: boolean;
  onSelect?: (channelId: string) => void;
  onChannelClick?: (channel: Channel) => void;
  onCollect?: (channel: Channel) => void;
  onAnalyze?: (channel: Channel) => void;
  onEdit?: (channel: Channel) => void;
  onDelete?: (channel: Channel) => void;
  onKeywordClick?: (keyword: string) => void;
  showSelection?: boolean;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isSelected = false,
  onSelect,
  onChannelClick,
  onCollect,
  onAnalyze,
  onEdit,
  onDelete,
  onKeywordClick,
  showSelection = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
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

  // 플랫폼별 색상 테마
  const getPlatformTheme = (platform: string) => {
    switch (platform) {
      case 'YOUTUBE':
        return {
          borderColor: 'border-l-red-500',
          bgGradient: 'bg-gradient-to-r from-white to-red-50/30',
          ringColor: 'ring-red-200',
          badgeColor: 'from-red-500 to-red-600'
        };
      case 'TIKTOK':
        return {
          borderColor: 'border-l-black',
          bgGradient: 'bg-gradient-to-r from-white to-gray-50',
          ringColor: 'ring-gray-300',
          badgeColor: 'from-black to-gray-800'
        };
      case 'INSTAGRAM':
        return {
          borderColor: 'border-l-purple-500',
          bgGradient: 'bg-gradient-to-r from-white to-purple-50/30',
          ringColor: 'ring-purple-200',
          badgeColor: 'from-purple-500 via-pink-500 to-orange-400'
        };
      default:
        return {
          borderColor: 'border-l-blue-500',
          bgGradient: 'bg-white',
          ringColor: 'ring-blue-200',
          badgeColor: 'from-blue-500 to-blue-600'
        };
    }
  };

  const theme = getPlatformTheme(channel.platform);
  const formatLastChecked = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // 버튼 클릭 시에는 카드 클릭 이벤트 막기
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onChannelClick?.(channel);
  };

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(channel);
        setShowDeleteModal(false);
      } catch (error) {
        console.error('삭제 실패:', error);
      } finally {
        setIsDeleting(false);
      }
      return;
    }
    
    // 기본 삭제 로직
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/channels/${channel.channelId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setShowDeleteModal(false);
        setNotification({
          show: true,
          type: 'success',
          title: '삭제 완료',
          message: '채널이 성공적으로 삭제되었습니다.'
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setNotification({
          show: true,
          type: 'error',
          title: '삭제 실패',
          message: '채널 삭제에 실패했습니다. 다시 시도해주세요.'
        });
        setIsDeleting(false);
      }
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
  }, [onDelete, channel]);

  const handleCloseModal = useCallback(() => {
    if (!isDeleting) {
      setShowDeleteModal(false);
    }
  }, [isDeleting]);

  return (
    <div 
      className={`
        ${theme.bgGradient} border border-gray-200 ${theme.borderColor} border-l-4 rounded-lg 
        hover:shadow-lg transition-all duration-200 cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
      `}
      onClick={handleCardClick}
    >
      <div className="px-3 py-1.5">
        <div className="flex items-start space-x-3">
          {/* 선택 체크박스 */}
          {showSelection && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect?.(channel.channelId);
              }}
              className="mt-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}
          
          {/* 썸네일 */}
          <div className="flex-shrink-0">
            <img 
              src={channel.thumbnailUrl || `https://placehold.co/64x64/EF4444/FFFFFF?text=${(channel.name || 'C').charAt(0)}`} 
              alt={channel.name || ''}
              className={`w-14 h-14 rounded-lg object-cover ring-2 ${theme.ringColor} ring-offset-1`}
            />
          </div>
          
          {/* 채널 정보 - 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 첫 번째 줄: 채널명 + 플랫폼 배지 */}
            <div className="flex items-center space-x-2 mb-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChannelClick?.(channel);
                }}
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate"
              >
                {channel.name}
              </button>
              <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium text-white rounded-full bg-gradient-to-r ${theme.badgeColor} shadow-sm`}>
                {channel.platform}
              </span>
            </div>
            
            {/* 두 번째 줄: 초컴팩트 정보 표시 */}
            <div className="flex items-center gap-3 mb-1 text-sm">
              <span className="flex items-center text-blue-600" title="구독자 수">
                👥<span className="ml-1 font-medium">{formatViews(channel.subscribers || 0)}</span>
              </span>
              <span className="flex items-center text-green-600" title="총 영상 수">
                📹<span className="ml-1 font-medium">{channel.totalVideos || 0}</span>
              </span>
              <span className="flex items-center text-purple-600" title="총 조회수">
                📊<span className="ml-1 font-medium">{formatViews(channel.totalViews || 0)}</span>
              </span>
              <span className="flex items-center text-orange-600" title="채널 생성일">
                📅<span className="ml-1 font-medium text-xs">{channel.publishedAt ? new Date(channel.publishedAt).toLocaleDateString('ko-KR') : '미상'}</span>
              </span>
            </div>

            {/* 세 번째 줄: 마지막 확인 시간 */}
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <span className="flex items-center" title="마지막 확인">
                ⏰<span className="ml-1">마지막 확인: {channel.updatedAt ? formatLastChecked(channel.updatedAt) : '미확인'}</span>
              </span>
            </div>

            {/* 키워드 태그들 */}
            {channel.keywords && channel.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {channel.keywords.slice(0, 3).map((keyword) => (
                  <button
                    key={keyword}
                    onClick={(e) => {
                      e.stopPropagation();
                      onKeywordClick?.(keyword);
                    }}
                    className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 transition-colors"
                  >
                    {keyword}
                  </button>
                ))}
                {channel.keywords.length > 3 && (
                  <span className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                    +{channel.keywords.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* 삭제 버튼 - 오른쪽 고정 */}
          <div className="flex-shrink-0">
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
              title="채널 삭제"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="채널 삭제"
        message="이 채널을 삭제하시겠습니까? 삭제된 채널은 복구할 수 없습니다."
        itemName={channel.name || 'Unknown Channel'}
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
};

export default React.memo(ChannelCard);