import React from 'react';
import { X } from 'lucide-react';
import { UniversalGrid } from '../../../widgets/UniversalGrid/UniversalGrid';
import { VideoCard } from '../../../shared/components';
import { Video } from '../../../shared/types';
import { getDocumentId } from '../../../shared/utils';

interface BatchVideoListProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string | null;
  batchName?: string;
  videos: Video[];
  loading: boolean;
  onVideoDelete: (video: Video) => void;
}

const BatchVideoList: React.FC<BatchVideoListProps> = ({
  isOpen,
  onClose,
  batchId,
  batchName,
  videos,
  loading,
  onVideoDelete,
}) => {
  // 디버깅: 받은 비디오 데이터 확인
  React.useEffect(() => {
    if (isOpen && batchId) {
      console.log(`🎯 [BatchVideoList] 배치 ${batchId}의 영상 데이터:`, {
        batchId,
        batchName,
        videosCount: videos.length,
        videos: videos.slice(0, 3), // 처음 3개만 로그
        loading
      });
    }
  }, [isOpen, batchId, videos.length, batchName, loading]);

  if (!isOpen || !batchId) return null;

  // backdrop 클릭 핸들러
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">배치 영상 목록</h2>
            {batchName && (
              <p className="text-sm text-gray-600 mt-1">{batchName}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: 'calc(90vh - 80px)' }}
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">영상 목록을 불러오는 중...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">
                수집된 영상이 없습니다
              </div>
              <div className="text-gray-400">
                이 배치에서 수집된 영상이 없거나 데이터를 찾을 수 없습니다.
              </div>
            </div>
          ) : (
            <UniversalGrid
              data={videos}
              renderCard={(item, cardProps) => {
                const itemId = getDocumentId(item);
                const itemTitle = item?.title || item?.name || 'unknown';

                return (
                  <VideoCard
                    key={`${itemId}-${itemTitle}`}
                    video={item as any}
                    isSelected={cardProps.isSelected}
                    isSelectMode={cardProps.isSelectMode}
                    onSelect={cardProps.onSelect}
                    onDelete={(deletedVideo) => {
                      onVideoDelete(deletedVideo);
                    }}
                  />
                );
              }}
              onDelete={onVideoDelete}
              showStats={true}
              enableSearch={false}
              showVirtualScrolling={true}
              useWindowScroll={false}
              containerHeight={400}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchVideoList;
