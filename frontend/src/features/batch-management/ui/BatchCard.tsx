import React from 'react';
import {
  Play,
  Pause,
  Trash2,
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { formatDate } from '../../../shared/utils';

interface CollectionBatch {
  _id: string;
  name: string;
  description?: string;
  collectionType: 'group' | 'channels';
  targetGroups?: Array<{_id: string, name: string, color: string}>;
  targetChannels?: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews?: number;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords?: string[];
    excludeKeywords?: string[];
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  totalVideosFound: number;
  totalVideosSaved: number;
  failedChannels?: Array<{channelName: string, error: string}>;
  quotaUsed: number;
  stats?: {
    byPlatform: {
      YOUTUBE: number;
      INSTAGRAM: number;
      TIKTOK: number;
    };
    byDuration: {
      SHORT: number;
      MID: number;
      LONG: number;
    };
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface BatchCardProps {
  batch: CollectionBatch;
  onEdit: (batch: CollectionBatch) => void;
  onDelete: (batchId: string) => void;
  onViewVideos: (batchId: string) => void;
  onToggleStatus: (batchId: string, action: 'start' | 'pause') => void;
}

const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  onEdit,
  onDelete,
  onViewVideos,
  onToggleStatus
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running': return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'running': return '실행중';
      case 'completed': return '완료';
      case 'failed': return '실패';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      case 'running': return 'bg-blue-50 border-blue-200';
      case 'completed': return 'bg-green-50 border-green-200';
      case 'failed': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`bg-white rounded-lg border-2 ${getStatusColor(batch.status)} p-6`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{batch.name}</h3>
          {batch.description && (
            <p className="text-sm text-gray-600 mt-1">{batch.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {getStatusIcon(batch.status)}
          <span className="text-sm font-medium text-gray-700">
            {getStatusLabel(batch.status)}
          </span>
        </div>
      </div>

      {/* 수집 기준 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm font-medium text-gray-700">수집 기간</div>
          <div className="text-sm text-gray-500">최근 {batch.criteria.daysBack}일</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-700">최소 조회수</div>
          <div className="text-sm text-gray-500">{batch.criteria.minViews.toLocaleString()}</div>
        </div>
      </div>

      {/* 영상 길이 필터 */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">영상 길이</div>
        <div className="flex gap-2">
          {batch.criteria.includeShorts && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">숏폼</span>
          )}
          {batch.criteria.includeMidform && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">미드폼</span>
          )}
          {batch.criteria.includeLongForm && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">롱폼</span>
          )}
        </div>
      </div>

      {/* 키워드 정보 */}
      {(batch.criteria.keywords?.length || batch.criteria.excludeKeywords?.length) && (
        <div className="mb-4">
          {batch.criteria.keywords?.length > 0 && (
            <div className="mb-2">
              <div className="text-sm font-medium text-gray-700">포함 키워드</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {batch.criteria.keywords.slice(0, 3).map((keyword, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    {keyword}
                  </span>
                ))}
                {batch.criteria.keywords.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    +{batch.criteria.keywords.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
          {batch.criteria.excludeKeywords?.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700">제외 키워드</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {batch.criteria.excludeKeywords.slice(0, 3).map((keyword, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                    {keyword}
                  </span>
                ))}
                {batch.criteria.excludeKeywords.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    +{batch.criteria.excludeKeywords.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 대상 그룹/채널 표시 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {batch.targetGroups?.map(group => (
          <span
            key={group._id}
            className="px-2 py-1 text-xs rounded-full text-white"
            style={{ backgroundColor: group.color }}
          >
            {group.name}
          </span>
        ))}
        {batch.targetChannels?.slice(0, 3).map((channel, index) => (
          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            {channel}
          </span>
        ))}
        {batch.targetChannels && batch.targetChannels.length > 3 && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            +{batch.targetChannels.length - 3}
          </span>
        )}
      </div>

      {/* 통계 정보 */}
      <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">{batch.totalVideosFound}</div>
          <div className="text-sm text-gray-500">발견</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{batch.totalVideosSaved}</div>
          <div className="text-sm text-gray-500">저장</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{batch.quotaUsed}</div>
          <div className="text-sm text-gray-500">할당량</div>
        </div>
      </div>

      {/* 시간 정보 */}
      <div className="text-xs text-gray-500 mb-4">
        <div className="flex items-center gap-1 mb-1">
          <Calendar className="w-3 h-3" />
          <span>생성: {formatDate(batch.createdAt)}</span>
        </div>
        {batch.startedAt && (
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" />
            <span>시작: {formatDate(batch.startedAt)}</span>
          </div>
        )}
        {batch.completedAt && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>완료: {formatDate(batch.completedAt)}</span>
          </div>
        )}
      </div>

      {/* 에러 정보 */}
      {batch.status === 'failed' && batch.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-red-800 text-sm">
            <strong>오류:</strong> {batch.errorMessage}
          </div>
        </div>
      )}

      {/* 실패한 채널 정보 */}
      {batch.failedChannels && batch.failedChannels.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="text-yellow-800 text-sm">
            <strong>실패한 채널 ({batch.failedChannels.length}개):</strong>
            <div className="mt-1">
              {batch.failedChannels.slice(0, 2).map((failed, index) => (
                <div key={index} className="text-xs">
                  • {failed.channelName}: {failed.error}
                </div>
              ))}
              {batch.failedChannels.length > 2 && (
                <div className="text-xs">
                  • 외 {batch.failedChannels.length - 2}개 더...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {batch.status === 'completed' && batch.totalVideosSaved > 0 && (
            <button
              onClick={() => onViewVideos(batch.id)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Eye className="w-4 h-4" />
              영상 보기
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {(batch.status === 'pending' || batch.status === 'failed') && (
            <button
              onClick={() => onToggleStatus(batch.id, 'start')}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              시작
            </button>
          )}

          {batch.status === 'running' && (
            <button
              onClick={() => onToggleStatus(batch.id, 'pause')}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              <Pause className="w-4 h-4" />
              일시정지
            </button>
          )}

          <button
            onClick={() => onEdit(batch)}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            <Edit className="w-4 h-4" />
            수정
          </button>

          <button
            onClick={() => onDelete(batch.id)}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchCard;