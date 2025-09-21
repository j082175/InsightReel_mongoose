import React, { memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Play, MoreVertical } from 'lucide-react';
import { formatViews, formatDate, getDurationLabel } from '../utils/formatters';
import { getDocumentId } from '../utils/idUtils';
import { getPlatformStyle } from '../utils/platformStyles';
import { getVideoId, getThumbnailUrl, getViewCount } from '../utils/videoUtils';
import { Video } from '../types';
import { DeleteConfirmModal } from '../ui';

interface VideoCardProps {
  video: Video;
  onClick?: (video: Video) => void;
  onInfoClick?: (video: Video) => void;
  onChannelClick?: (channelName: string) => void;
  onDelete: (video: Video) => void; // 필수 Props
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string | number) => void;
  showArchiveInfo?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = memo(
  ({
    video,
    onClick,
    onInfoClick,
    onChannelClick,
    onDelete,
    isSelectMode,
    isSelected,
    onSelectToggle,
    showArchiveInfo,
  }) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const videoId = getVideoId(video);
    const documentId = getDocumentId(video); // MongoDB Document ID
    const thumbnailUrl = getThumbnailUrl(video);
    const viewCount = getViewCount(video);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (isSelectMode) {
          e.preventDefault();
          e.stopPropagation();
          if (onSelectToggle && documentId) {
            onSelectToggle(documentId);
          }
        } else if (onClick) {
          onClick(video);
        }
      },
      [isSelectMode, onSelectToggle, documentId, onClick, video]
    );

    const handleInfoClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onInfoClick) {
          onInfoClick(video);
        }
      },
      [onInfoClick, video]
    );

    const handleChannelClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onChannelClick && video.channelName) {
          onChannelClick(video.channelName);
        }
      },
      [onChannelClick, video.channelName]
    );

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowDeleteModal(true);
      },
      []
    );

    const handleConfirmDelete = useCallback(async () => {
      setIsDeleting(true);
      try {
        await onDelete(video);
        setShowDeleteModal(false);
      } catch (error) {
        console.error('비디오 삭제 실패:', error);
      } finally {
        setIsDeleting(false);
      }
    }, [onDelete, video]);

    const handleCloseModal = useCallback(() => {
      setShowDeleteModal(false);
    }, []);

    const cardVariants = {
      initial: { opacity: 0, y: 20, scale: 0.95 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1],
        },
      },
      hover: {
        y: -8,
        scale: 1.02,
        transition: {
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        },
      },
      tap: {
        scale: 0.98,
        transition: {
          duration: 0.1,
        },
      },
    };

    const thumbnailVariants = {
      hover: {
        scale: 1.05,
        transition: {
          duration: 0.3,
        },
      },
    };

    const playButtonVariants = {
      initial: { scale: 0, opacity: 0 },
      hover: {
        scale: 1,
        opacity: 1,
        transition: {
          type: 'spring' as const,
          stiffness: 300,
          damping: 25,
        },
      },
    };

    return (
      <>
      <motion.div
        className={`
          relative group bg-white rounded-lg shadow-sm cursor-pointer overflow-hidden
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isSelectMode ? 'hover:ring-2 hover:ring-blue-300' : ''}
        `}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
        onClick={handleClick}
        layout
      >
        {/* 선택 체크박스 */}
        {(isSelectMode || isSelected) && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={() => onSelectToggle && documentId && onSelectToggle(documentId)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* 썸네일 */}
        <div className="relative aspect-video bg-gray-200 overflow-hidden">
          <motion.img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
            variants={thumbnailVariants}
          />

          {/* 재생 버튼 오버레이 */}
          <motion.div
            className="absolute inset-0 bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.3 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              variants={playButtonVariants}
              initial="initial"
              whileHover="hover"
            >
              <Play className="w-12 h-12 text-white" />
            </motion.div>
          </motion.div>

          {/* 플랫폼 배지 */}
          <motion.div
            className="absolute top-3 right-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getPlatformStyle(video.platform)}`}
            >
              {video.platform}
            </span>
          </motion.div>

          {/* 영상 길이 */}
          {video.duration && (
            <div className="absolute bottom-3 right-3">
              <span className="px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
                {getDurationLabel(video.duration)}
              </span>
            </div>
          )}
        </div>

        {/* 비디오 정보 */}
        <motion.div
          className="p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <motion.h3
            className="font-medium text-gray-900 text-sm line-clamp-2 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {video.title}
          </motion.h3>

          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <button
              onClick={handleChannelClick}
              className="hover:text-blue-600 transition-colors truncate"
            >
              {video.channelName}
            </button>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{formatViews(viewCount)}</span>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-1">
                <motion.button
                  onClick={handleInfoClick}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="상세 정보"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Eye className="w-4 h-4" />
                </motion.button>

                <motion.button
                  onClick={handleDelete}
                  className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                  title="삭제"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <MoreVertical className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {formatDate(video.uploadDate)}
          </div>

          {showArchiveInfo && video.collectedAt && (
            <div className="mt-2 text-xs text-blue-600">
              수집: {formatDate(video.collectedAt)}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* 삭제 확인 모달 - motion.div 바깥에 위치 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="비디오 삭제"
        message="이 비디오를 삭제하시겠습니까? 삭제된 비디오는 복구할 수 없습니다."
        isLoading={isDeleting}
      />
    </>);
  }
);

VideoCard.displayName = 'VideoCard';

export default VideoCard;
