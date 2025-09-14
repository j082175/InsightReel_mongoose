import React from 'react';
import { CollectionBatch } from '../../../shared/types';
import { formatDate } from '../../../shared/utils';

interface BatchCardProps {
  batch: CollectionBatch;
  onClick: (batch: CollectionBatch) => void;
  onDelete?: (batchId: string) => void;
}

const BatchCard: React.FC<BatchCardProps> = ({ batch, onClick, onDelete }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '▶️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
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

  const handleCardClick = () => {
    if (batch.status === 'completed') {
      onClick(batch);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(batch._id);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
        batch.status === 'completed' ? 'cursor-pointer' : ''
      }`}
      onClick={handleCardClick}
      title={batch.status === 'completed' ? '클릭하여 수집된 영상 보기' : ''}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon(batch.status)}</span>
          <h3 className="font-medium text-gray-900 truncate">{batch.name}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(batch.status)}`}>
            {getStatusLabel(batch.status)}
          </span>
          {batch.status !== 'running' && onDelete && (
            <button
              onClick={handleDeleteClick}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="삭제"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {batch.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{batch.description}</p>
      )}

      {/* Stats */}
      {batch.status === 'completed' && (
        <div className="grid grid-cols-2 gap-3 mb-3 p-2 bg-gray-50 rounded-md">
          <div className="text-center">
            <div className="text-sm font-medium text-blue-600">
              {(batch.totalVideosSaved || 0).toLocaleString()}개
            </div>
            <div className="text-xs text-gray-500">수집 영상</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-green-600">
              {(() => {
                if (batch.totalVideosFound && batch.totalVideosFound > 0) {
                  return Math.round((batch.totalVideosSaved / batch.totalVideosFound) * 100);
                }
                return batch.totalVideosSaved > 0 ? 100 : 0;
              })()}%
            </div>
            <div className="text-xs text-gray-500">성공률</div>
          </div>
        </div>
      )}

      {/* Target Groups/Channels */}
      <div className="flex flex-wrap gap-1 mb-3">
        {batch.targetGroups?.slice(0, 2).map(group => (
          <span 
            key={group._id} 
            className="px-2 py-1 text-xs rounded-full text-white text-center"
            style={{ backgroundColor: group.color }}
          >
            {group.name}
          </span>
        ))}
        {batch.targetChannels?.slice(0, 2).map((channel, index) => (
          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            {channel}
          </span>
        ))}
        {(batch.targetGroups?.length > 2 || batch.targetChannels?.length > 2) && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
            +{(batch.targetGroups?.length || 0) + (batch.targetChannels?.length || 0) - 2}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>
          {batch.collectionType === 'group' ? '그룹별' : '개별 채널'} 수집
        </span>
        <span>
          {formatDate(batch.createdAt)}
        </span>
      </div>

      {/* Error Message */}
      {batch.status === 'failed' && batch.errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          오류: {batch.errorMessage}
        </div>
      )}
    </div>
  );
};

export default BatchCard;