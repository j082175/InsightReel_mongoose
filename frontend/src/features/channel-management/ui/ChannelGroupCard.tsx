import React, { memo, useCallback, useState } from 'react';
import { MoreVertical, PlayCircle, Settings } from 'lucide-react';
import { DeleteConfirmModal, NotificationModal } from '../../../shared/ui';
import { FRONTEND_CONSTANTS } from '../../../shared/config/constants';
import { getDocumentId } from '../../../shared/utils';

interface ChannelGroup {
  _id?: string;
  name: string;
  description: string;
  color: string;
  channels: string[];
  keywords: string[];
  isActive: boolean;
  lastCollectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ChannelGroupCardProps {
  group: ChannelGroup;
  isSelected?: boolean;
  onSelect?: (groupId: string) => void;
  onClick?: (group: ChannelGroup) => void;
  onEdit?: (group: ChannelGroup) => void;
  onDelete: (group: ChannelGroup) => void; // 필수 Props
  onCollect?: (group: ChannelGroup) => void;
  showSelection?: boolean;
}

const ChannelGroupCard: React.FC<ChannelGroupCardProps> = memo(
  ({ group, isSelected = false, onSelect, onClick, onEdit, onDelete, onCollect, showSelection = false }) => {
    const groupId = getDocumentId(group);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
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
    const handleClick = useCallback(() => {
      // 선택 모드일 때는 선택 토글, 아니면 그룹 클릭
      if (showSelection) {
        // MongoDB 문서 ID를 사용 (_id 우선, 그 다음 id)
        const documentId = group._id || groupId;
        if (documentId) {
          onSelect?.(documentId);
        }
      } else {
        onClick?.(group);
      }
    }, [showSelection, group, groupId, onSelect, onClick]);

    const handleEdit = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (onEdit) {
          onEdit(group);
          return;
        }

        // 기본 편집 로직 (필요시 구현)
        console.log('편집:', group.name);
      },
      [onEdit, group]
    );

    const handleDelete = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setShowDeleteModal(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
      setIsDeleting(true);
      try {
        await onDelete(group);
        setShowDeleteModal(false);
        setNotification({
          show: true,
          type: 'success',
          title: '삭제 완료',
          message: '채널 그룹이 성공적으로 삭제되었습니다.',
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
    }, [onDelete, group]);

    const handleCloseModal = useCallback(() => {
      if (!isDeleting) {
        setShowDeleteModal(false);
      }
    }, [isDeleting]);

    const handleCollect = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (onCollect) {
          onCollect(group);
          return;
        }

        // 기본 수집 로직
        setIsCollecting(true);
        try {
          console.log(`🎯 채널 그룹 "${group.name}" 트렌딩 수집 시작`);

          if (!groupId) {
            console.error('❌ 그룹 ID가 없습니다:', group);
            return;
          }

          const response = await fetch(
            `http://localhost:3000/api/channel-groups/${groupId}/collect`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                daysBack: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.DAYS_BACK,
                minViews: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.MIN_VIEWS,
                includeShorts:
                  FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_SHORTS,
                includeMidform:
                  FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_MIDFORM,
                includeLongForm:
                  FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_LONGFORM,
              }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            console.log('✅ 수집 성공:', result);

            setNotification({
              show: true,
              type: 'success',
              title: '수집 완료',
              message: `"${group.name}" 그룹의 트렌딩 영상 수집이 완료되었습니다.`,
            });
          } else {
            const error = await response.json();
            console.error('수집 실패:', error);

            setNotification({
              show: true,
              type: 'error',
              title: '수집 실패',
              message: '트렌딩 영상 수집에 실패했습니다. 다시 시도해주세요.',
            });
          }
        } catch (error) {
          console.error('수집 중 오류:', error);
          setNotification({
            show: true,
            type: 'error',
            title: '오류 발생',
            message: '수집 중 오류가 발생했습니다. 다시 시도해주세요.',
          });
        } finally {
          setIsCollecting(false);
        }
      },
      [onCollect, group]
    );

    return (
      <div className="group cursor-pointer">
        <div
          onClick={handleClick}
          className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-[1.02] relative ${
            isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
          }`}
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
                  const documentId = group._id || groupId;
                  if (documentId) {
                    onSelect?.(documentId);
                  }
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>
          )}

          {/* 상단 헤더 */}
          <div className="p-4 border-b border-gray-100 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: group.color }}
                ></div>
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
              </div>

              {/* 수집/편집/삭제 버튼 */}
              <div className="flex gap-1">
                <button
                  onClick={handleCollect}
                  disabled={isCollecting}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="트렌딩 수집"
                >
                  {isCollecting ? (
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleEdit}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="그룹 편집"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="그룹 삭제"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{group.description}</p>
          </div>

          {/* 하단 정보 */}
          <div className="p-4">
            {/* 수집 진행 상태 표시 */}
            {isCollecting && (
              <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>트렌딩 영상 수집 중...</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {group.channels?.length || 0}개 채널
              </span>
              {group.lastCollectedAt && (
                <span className="text-gray-400">
                  마지막 수집:{' '}
                  {new Date(group.lastCollectedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* 키워드 표시 */}
            {group.keywords && group.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {group.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
                {group.keywords.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{group.keywords.length - 3}
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
          title="채널 그룹 삭제"
          message="이 채널 그룹을 삭제하시겠습니까? 삭제된 그룹은 복구할 수 없습니다."
          itemName={group.name}
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
  }
);

export default ChannelGroupCard;
