import React, { memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Play, MoreVertical, Star, Flame, Zap, Crown } from 'lucide-react';
import { formatViews, formatDate, getDurationLabel, getRelativeTime } from '../utils/formatters';
import { getDocumentId } from '../utils/idUtils';
import { getPlatformStyle } from '../utils/platformStyles';
import { getVideoId, getThumbnailUrl, getViewCount } from '../utils/videoUtils';
import { Video } from '../types';
import { DeleteConfirmModal } from '../ui';
import { VideoModal, VideoOnlyModal } from '../../features/video-analysis';
import { PLATFORMS } from '../types/api';
import { OptimizedImage } from './OptimizedImage';
import toast from 'react-hot-toast';

// 🚀 성능 최적화: Animation Variants를 컴포넌트 외부로 이동
const CARD_VARIANTS = {
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
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
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

const THUMBNAIL_VARIANTS = {
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
    },
  },
};

const PLAY_BUTTON_VARIANTS = {
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

interface VideoCardProps {
  video: Video;
  onChannelClick?: (channelName: string) => void;
  onDelete?: (video: Video) => void;
  showArchiveInfo?: boolean;
  // 선택 시스템 (페이지에서 제어)
  isSelected?: boolean;
  isSelectMode?: boolean;
  onSelect?: (videoId: string) => void;
  // 카드 크기 (배지 크기 조절용)
  cardWidth?: number;
}

const VideoCard: React.FC<VideoCardProps> = memo(
  ({
    video,
    onChannelClick,
    onDelete,
    showArchiveInfo,
    isSelected = false,
    isSelectMode = false,
    onSelect,
    cardWidth = 280,
  }) => {
    // 모달 상태 관리 (내장)
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<Video | null>(null);

    // 삭제 상태
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const videoId = getVideoId(video);
    const documentId = getDocumentId(video);
    const thumbnailUrl = getThumbnailUrl(video);
    const viewCount = getViewCount(video);

    // 조회수 구간별 테두리 색상 결정
    const getViewsBorder = (views: number) => {
      if (views >= 3000000) return 'border-2 border-red-500 shadow-lg shadow-red-500/40';        // 300만+ 빨강 테두리
      if (views >= 1000000) return 'border-2 border-yellow-400 shadow-lg shadow-yellow-400/40';  // 100만+ 금색 테두리
      if (views >= 500000) return 'border-2 border-purple-500 shadow-lg shadow-purple-500/40';   // 50만+ 보라 테두리
      if (views >= 50000) return 'border-2 border-green-500 shadow-lg shadow-green-500/40';      // 5만+ 초록 테두리
      return '';                                                                                  // 기본 테두리 없음
    };

    // 조회수 구간별 아이콘 결정
    const getViewsIcon = (views: number) => {
      if (views >= 3000000) return Crown;    // 300만+ 왕관
      if (views >= 1000000) return Zap;     // 100만+ 번개
      if (views >= 500000) return Flame;    // 50만+ 불꽃
      if (views >= 50000) return Star;      // 5만+ 별
      return Eye;                           // 기본 눈
    };

    // 조회수 구간별 아이콘 애니메이션 결정 (호버 시에만)
    const getIconAnimation = (views: number) => {
      if (views >= 1000000) return 'group-hover:animate-spin';     // 100만+ 호버시 회전
      if (views >= 500000) return 'group-hover:scale-110';         // 50만+ 호버시 확대
      return '';                                                   // 기본 애니메이션 없음
    };

    // 업로드 날짜별 그라데이션 색상 결정 (1일, 3일 이내만)
    const getDateGradient = (uploadDate: string) => {
      const now = new Date();
      const uploadTime = new Date(uploadDate);
      const daysDiff = Math.floor((now.getTime() - uploadTime.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 1) return 'from-red-600/50 to-red-400/30';        // 1일 이내 빨강 그라데이션
      if (daysDiff <= 3) return 'from-yellow-600/50 to-yellow-400/30';  // 3일 이내 노랑 그라데이션
      return 'from-blue-600/30 to-purple-600/30';                       // 기본 파랑-보라 그라데이션
    };

    // 카드 크기에 따른 배지 크기 계산 (280px 기준으로 정규화)
    const badgeScale = Math.max(0.8, Math.min(1.2, cardWidth / 280));
    const badgeFontSize = `${0.75 * badgeScale}rem`;

    // 내장 이벤트 핸들러들
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (isSelectMode) {
          e.preventDefault();
          e.stopPropagation();
          if (onSelect) {
            onSelect(getDocumentId(video));
          }
        } else {
          // 재생 로직
          if (video.platform === PLATFORMS.YOUTUBE) {
            setSelectedVideoForPlay(video);
          } else {
            window.open(video.url, '_blank', 'noopener,noreferrer');
          }
        }
      },
      [isSelectMode, onSelect, video]
    );

    const handleSelectToggle = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSelect) {
          onSelect(getDocumentId(video));
        }
      },
      [onSelect, video]
    );

    const handleInfoClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVideo(video);
      },
      [video]
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
        if (onDelete) {
          // 페이지에서 커스텀 삭제 로직 제공된 경우
          await onDelete(video);
        } else {
          // 기본 삭제 로직 (내장)
          const response = await fetch(`/api/videos/${getDocumentId(video)}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            throw new Error('삭제 실패');
          }
          toast.success(`"${video.title}" 삭제 완료`);
        }
        setShowDeleteModal(false);
      } catch (error) {
        console.error('비디오 삭제 실패:', error);
        toast.error('삭제 중 오류가 발생했습니다.');
      } finally {
        setIsDeleting(false);
      }
    }, [onDelete, video]);

    const handleCloseModal = useCallback(() => {
      setShowDeleteModal(false);
    }, []);

    return (
      <>
      <motion.div
        className={`
          relative group bg-white rounded-lg shadow-sm cursor-pointer overflow-hidden will-change-transform
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isSelectMode ? 'hover:ring-2 hover:ring-blue-300' : ''}
        `}
        style={{
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'subpixel-antialiased',
          MozOsxFontSmoothing: 'auto',
          textRendering: 'optimizeLegibility',
          imageRendering: 'pixelated',
          transform: 'translate3d(0,0,0)',
          transformOrigin: 'center center',
          willChange: 'transform',
          filter: 'blur(0px)', // 강제로 새로운 레이어 생성
          contain: 'layout style paint'
        }}
        variants={CARD_VARIANTS}
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
              checked={isSelected}
              onChange={handleSelectToggle}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {/* 썸네일 전체 확장 */}
        <div className="relative aspect-[9/16] bg-gray-200 overflow-hidden">
          <motion.div variants={THUMBNAIL_VARIANTS} className="h-full">
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full"
              style={{
                objectFit: 'cover',
                objectPosition: 'center center'
              }}
            />
          </motion.div>

          {/* 재생 버튼 오버레이 */}
          <motion.div
            className="absolute inset-0 bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.3 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              variants={PLAY_BUTTON_VARIANTS}
              initial="initial"
              whileHover="hover"
            >
              <Play className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </motion.div>
          </motion.div>

          {/* 플랫폼 배지 - 상대적 크기 사용 */}
          <motion.div
            className="absolute top-[3%] left-[3%]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <span
              className={`inline-block px-[0.4em] py-[0.2em] rounded-full font-medium text-white ${getPlatformStyle(video.platform)}`}
              style={{ fontSize: badgeFontSize }}
            >
              {video.platform}
            </span>
          </motion.div>

          {/* 영상 길이 - 상대적 크기 사용 */}
          {video.duration && (
            <div className="absolute top-[3%] right-[3%]">
              <span
                className="inline-block px-[0.4em] py-[0.2em] bg-black bg-opacity-70 text-white rounded"
                style={{ fontSize: badgeFontSize }}
              >
                {getDurationLabel(video.duration)}
              </span>
            </div>
          )}

          {/* 비디오 정보 오버레이 - 하단에 그라데이션 배경 */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 will-change-transform"
            style={{
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div
              className="mb-2 bg-gradient-to-r from-gray-900/70 via-gray-800/60 to-gray-900/70 backdrop-blur-sm -mx-4 px-4 will-change-transform"
              style={{
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'subpixel-antialiased',
                MozOsxFontSmoothing: 'auto',
                textRendering: 'optimizeLegibility',
                transform: 'translateZ(0)'
              }}
            >
              <motion.h3
                className="font-medium text-white text-sm line-clamp-2 pt-2 pb-1"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitFontSmoothing: 'subpixel-antialiased',
                  MozOsxFontSmoothing: 'auto',
                  textRendering: 'optimizeLegibility',
                  transform: 'translateZ(0)'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                {video.title}
              </motion.h3>

              <button
                onClick={handleChannelClick}
                className="text-xs text-white/90 hover:text-white transition-colors truncate block pb-2"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitFontSmoothing: 'subpixel-antialiased',
                  MozOsxFontSmoothing: 'auto',
                  textRendering: 'optimizeLegibility',
                  transform: 'translateZ(0)'
                }}
              >
                {video.channelName}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-white/90">
                <div className={`group flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-black/60 to-black/40 rounded-full transition-all duration-300 hover:scale-105 will-change-transform ${getViewsBorder(viewCount)}`} style={{ backfaceVisibility: 'hidden', perspective: '1000px' }}>
                  {React.createElement(getViewsIcon(viewCount), {
                    className: `w-3 h-3 transition-transform duration-300 ${getIconAnimation(viewCount)}`
                  })}
                  <span>{formatViews(viewCount)}</span>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={handleInfoClick}
                    className="p-1 hover:bg-white/20 rounded"
                    title="상세 정보"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Eye className="w-4 h-4 text-white" />
                  </motion.button>

                  <motion.button
                    onClick={handleDelete}
                    className="p-1 hover:bg-red-500/30 hover:text-red-300 rounded transition-colors"
                    title="삭제"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MoreVertical className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </div>

            <div
              className={`text-xs text-white px-2 py-1 bg-gradient-to-r ${getDateGradient(video.uploadDate)} rounded-full inline-block transition-all duration-300 hover:scale-105 cursor-pointer will-change-transform`}
              style={{ backfaceVisibility: 'hidden', perspective: '1000px' }}
              title={`${getRelativeTime(video.uploadDate)} (${formatDate(video.uploadDate)})`}
            >
              {getRelativeTime(video.uploadDate)}
            </div>

            {showArchiveInfo && video.collectedAt && (
              <div className="mt-2 text-xs text-blue-300">
                수집: {formatDate(video.collectedAt)}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* 모든 모달들 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="비디오 삭제"
        message="이 비디오를 삭제하시겠습니까? 삭제된 비디오는 복구할 수 없습니다."
        isLoading={isDeleting}
      />

      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      <VideoOnlyModal
        video={selectedVideoForPlay}
        onClose={() => setSelectedVideoForPlay(null)}
      />
    </>);
  },
  // 🚀 성능 최적화: 커스텀 비교 함수로 불필요한 리렌더링 방지
  (prevProps, nextProps) => {
    // true를 반환하면 리렌더링 방지, false를 반환하면 리렌더링 수행
    return (
      prevProps.video._id === nextProps.video._id &&
      prevProps.video.views === nextProps.video.views &&
      prevProps.video.title === nextProps.video.title &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isSelectMode === nextProps.isSelectMode &&
      prevProps.showArchiveInfo === nextProps.showArchiveInfo
    );
  }
);

VideoCard.displayName = 'VideoCard';

export default VideoCard;