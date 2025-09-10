import React, { useState } from 'react';
import { Video } from '../types';
import { FieldMapper } from '../types/field-mapper';

interface VideoListItemProps {
  video: Video;
  onCardClick: (video: Video) => void;
  onDeleteClick: (item: { type: 'single'; data: Video }) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelectToggle: (videoId: number) => void;
}

const VideoListItem: React.FC<VideoListItemProps> = ({
  video,
  onCardClick,
  onDeleteClick,
  isSelectMode,
  isSelected,
  onSelectToggle
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatViews = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    return num.toLocaleString();
  };

  const handleClick = (_e: React.MouseEvent) => {
    if (isSelectMode) {
      onSelectToggle(FieldMapper.getTypedField<number>(video, 'ID') || 0);
    } else {
      onCardClick(video);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick({ type: 'single', data: video });
    setMenuOpen(false);
  };

  return (
    <div 
      className={`bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer relative ${
        isSelectMode && isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex p-4 gap-4">
        {/* 체크박스 (선택 모드일 때) */}
        {isSelectMode && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectToggle(FieldMapper.getTypedField<number>(video, 'ID') || 0)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* 썸네일 */}
        <div className="flex-shrink-0">
          <img 
            src={FieldMapper.getTypedField<string>(video, 'THUMBNAIL_URL') || ''} 
            alt={FieldMapper.getTypedField<string>(video, 'TITLE') || ''}
            className="w-32 h-20 object-cover rounded"
          />
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                {FieldMapper.getTypedField<string>(video, 'TITLE') || ''}
              </h3>
              
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={FieldMapper.getTypedField<string>(video, 'CHANNEL_AVATAR_URL') || ''} 
                  alt={FieldMapper.getTypedField<string>(video, 'CHANNEL_NAME') || ''}
                  className="w-4 h-4 rounded-full"
                />
                <span className="text-xs text-gray-600 truncate">{FieldMapper.getTypedField<string>(video, 'CHANNEL_NAME') || ''}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{formatViews(FieldMapper.getTypedField<number>(video, 'VIEWS') || 0)} 조회수</span>
                <span>{FieldMapper.getTypedField<number>(video, 'DAYS_AGO') === 0 ? '오늘' : `${FieldMapper.getTypedField<number>(video, 'DAYS_AGO')}일 전`}</span>
                <span className={`px-2 py-1 rounded-full ${
                  FieldMapper.getTypedField<string>(video, 'PLATFORM') === 'YouTube' ? 'bg-red-100 text-red-700' :
                  FieldMapper.getTypedField<string>(video, 'PLATFORM') === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {FieldMapper.getTypedField<string>(video, 'PLATFORM')}
                </span>
                {FieldMapper.getTypedField<boolean>(video, 'IS_TRENDING') && (
                  <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                    🔥 인기
                  </span>
                )}
              </div>

              {/* 키워드 */}
              <div className="mt-2 flex flex-wrap gap-1">
                {(FieldMapper.getTypedField<string[]>(video, 'KEYWORDS') || []).slice(0, 3).map((keyword, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    #{keyword}
                  </span>
                ))}
                {(FieldMapper.getTypedField<string[]>(video, 'KEYWORDS') || []).length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{(FieldMapper.getTypedField<string[]>(video, 'KEYWORDS') || []).length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* 액션 메뉴 */}
            {!isSelectMode && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={handleMenuToggle}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardClick(video);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      상세 보기
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(FieldMapper.getTypedField<string>(video, 'URL') || '', '_blank');
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      원본 보기
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                    >
                      아카이브에 저장
                    </button>
                    <div className="border-t">
                      <button 
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 클릭시 외부 영역 닫기 */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default VideoListItem;