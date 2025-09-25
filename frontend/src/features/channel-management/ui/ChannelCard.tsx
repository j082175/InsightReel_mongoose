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
  onDelete: (channel: Channel) => void; // 필수 Props
  onKeywordClick?: (keyword: string) => void;
  showSelection?: boolean;
  cardWidth?: number;
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
  showSelection = false,
  cardWidth,
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
    message: '',
  });

  // 플랫폼별 색상 테마
  const getPlatformTheme = (platform: string) => {
    switch (platform) {
      case 'YOUTUBE':
        return {
          borderColor: 'border-l-red-500',
          bgGradient: 'bg-gradient-to-r from-white to-red-50/30',
          ringColor: 'ring-red-200',
          badgeColor: 'from-red-500 to-red-600',
        };
      case 'TIKTOK':
        return {
          borderColor: 'border-l-black',
          bgGradient: 'bg-gradient-to-r from-white to-gray-50',
          ringColor: 'ring-gray-300',
          badgeColor: 'from-black to-gray-800',
        };
      case 'INSTAGRAM':
        return {
          borderColor: 'border-l-purple-500',
          bgGradient: 'bg-gradient-to-r from-white to-purple-50/30',
          ringColor: 'ring-purple-200',
          badgeColor: 'from-purple-500 via-pink-500 to-orange-400',
        };
      default:
        return {
          borderColor: 'border-l-blue-500',
          bgGradient: 'bg-white',
          ringColor: 'ring-blue-200',
          badgeColor: 'from-blue-500 to-blue-600',
        };
    }
  };

  const theme = getPlatformTheme(channel.platform);

  // 동적 폰트 크기 계산 (최소 크기 1.0으로 고정)
  const getDynamicFontSize = (baseSize: number) => {
    if (!cardWidth) return `${baseSize}px`;
    const scaleFactor = Math.max(1.0, Math.min(1.2, cardWidth / 300));
    return `${Math.round(baseSize * scaleFactor)}px`;
  };

  const getDynamicIconSize = (baseSize: number) => {
    if (!cardWidth) return `${baseSize}px`;
    const scaleFactor = Math.max(1.0, Math.min(1.2, cardWidth / 300));
    return `${Math.round(baseSize * scaleFactor)}px`;
  };

  // 카드 크기에 따른 레이아웃 조정
  const isSmallCard = cardWidth && cardWidth < 280;
  const isMediumCard = cardWidth && cardWidth >= 280 && cardWidth < 400;
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

    // 선택 모드일 때는 선택 토글, 아니면 채널 클릭
    if (showSelection) {
      // MongoDB 문서 ID를 사용 (_id 우선, 그 다음 id)
      const documentId = channel._id || channel.id;
      if (documentId) {
        onSelect?.(documentId);
      }
    } else {
      onChannelClick?.(channel);
    }
  };

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(channel);
      setShowDeleteModal(false);
      setNotification({
        show: true,
        type: 'success',
        title: '삭제 완료',
        message: '채널이 성공적으로 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('삭제 실패:', error);
      setNotification({
        show: true,
        type: 'error',
        title: '삭제 실패',
        message:
          error.message || '삭제 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    } finally {
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
        hover:shadow-lg transition-all duration-200 cursor-pointer relative
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* 선택 체크박스 - 오버레이 방식 */}
      {(showSelection || isSelected) && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              // MongoDB 문서 ID를 사용 (_id 우선, 그 다음 id)
              const documentId = channel._id || channel.id;
              if (documentId) {
                onSelect?.(documentId);
              }
            }}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>
      )}

      <div className="px-6 py-2">
        {/* CSS Grid 레이아웃 - 사용자 요청 구조 */}
        <div className="grid gap-2" style={{ gridTemplateColumns: '80px 1fr auto' }}>

          {/* 첫 번째 줄: [썸네일] [채널명] [삭제버튼] */}
          <div className="row-span-2 flex flex-col items-start">
            <img
              src={
                channel.thumbnailUrl ||
                `https://placehold.co/64x64/EF4444/FFFFFF?text=${(channel.name || 'C').charAt(0)}`
              }
              alt={channel.name || ''}
              className={`rounded-lg object-cover ring-2 ${theme.ringColor} ring-offset-1`}
              style={{
                width: getDynamicIconSize(isSmallCard ? 48 : 56),
                height: getDynamicIconSize(isSmallCard ? 48 : 56)
              }}
            />
          </div>

          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChannelClick?.(channel);
              }}
              className="font-semibold text-gray-900 hover:text-blue-600 truncate w-full text-left"
              style={{ fontSize: getDynamicFontSize(18) }}
              title={channel.name}
            >
              {channel.name}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
              title="채널 삭제"
            >
              <svg
                style={{ width: getDynamicIconSize(16), height: getDynamicIconSize(16) }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>

          {/* 두 번째 줄: [플랫폼 배지] (썸네일 아래) */}
          <div className="col-span-2 flex">
            <span
              className={`inline-flex px-1.5 py-0.5 font-medium text-white rounded-full bg-gradient-to-r ${theme.badgeColor} shadow-sm text-center justify-start`}
              style={{ fontSize: getDynamicFontSize(10) }}
            >
              {channel.platform}
            </span>
          </div>

          {/* 세 번째 줄: [조회수] [날짜] */}
          <div className="col-span-3 grid grid-cols-2 gap-3" style={{ fontSize: getDynamicFontSize(14) }}>
            <div className="flex items-center text-purple-600" title="총 조회수">
              📊
              <span className="ml-1 font-medium">
                {formatViews(channel.totalViews || 0)}
              </span>
            </div>
            <div className="flex items-center text-orange-600" title="채널 생성일">
              📅
              <span className="ml-1 font-medium" style={{ fontSize: getDynamicFontSize(12) }}>
                {channel.publishedAt
                  ? new Date(channel.publishedAt).toLocaleDateString('ko-KR', {
                      year: isSmallCard ? '2-digit' : 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '미상'}
              </span>
            </div>
          </div>

          {/* 네 번째 줄: [구독자수] [영상수] */}
          <div className="col-span-3 grid grid-cols-2 gap-3" style={{ fontSize: getDynamicFontSize(14) }}>
            <div className="flex items-center text-blue-600" title="구독자 수">
              👥
              <span className="ml-1 font-medium">
                {formatViews(channel.subscribers || 0)}
              </span>
            </div>
            <div className="flex items-center text-green-600" title="총 영상 수">
              📹
              <span className="ml-1 font-medium">
                {channel.totalVideos || 0}
              </span>
            </div>
          </div>

          {/* 다섯 번째 줄: [확인날] */}
          <div className="col-span-3 flex items-center text-gray-500" style={{ fontSize: getDynamicFontSize(12) }}>
            <span className="flex items-center" title="마지막 확인">
              ⏰
              <span className="ml-1">
                마지막 확인:{' '}
                {channel.updatedAt
                  ? formatLastChecked(channel.updatedAt)
                  : '미확인'}
              </span>
            </span>
          </div>

          {/* 여섯 번째 줄: [태그] */}
          {channel.keywords && channel.keywords.length > 0 && (
            <div className="col-span-3 flex flex-wrap gap-1">
              {channel.keywords.slice(0, isSmallCard ? 2 : 3).map((keyword) => (
                <button
                  key={keyword}
                  onClick={(e) => {
                    e.stopPropagation();
                    onKeywordClick?.(keyword);
                  }}
                  className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors truncate max-w-full"
                  style={{ fontSize: getDynamicFontSize(12) }}
                  title={keyword}
                >
                  {isSmallCard && keyword.length > 8 ? `${keyword.substring(0, 8)}...` : keyword}
                </button>
              ))}
              {channel.keywords.length > (isSmallCard ? 2 : 3) && (
                <span className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded" style={{ fontSize: getDynamicFontSize(12) }}>
                  +{channel.keywords.length - (isSmallCard ? 2 : 3)}
                </span>
              )}
            </div>
          )}
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
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.type === 'success' ? 2000 : undefined}
      />
    </div>
  );
};

export default React.memo(ChannelCard);
