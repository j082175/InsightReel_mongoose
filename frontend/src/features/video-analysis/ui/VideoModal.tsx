import React, { useState, useMemo, useCallback } from 'react';
import { Video } from '../../../shared/types';
import { PLATFORMS } from '../../../shared/types';
import { formatViews, formatDate } from '../../../shared/utils';
import { getThumbnailUrl, getViewCount } from '../../../shared/utils';
import { Modal, EditableField } from '../../../shared/components';
import { useEditMode, useUpdateVideo } from '../../../shared/hooks';
import { Edit2 } from 'lucide-react';

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
  // 편집 기능 훅 - 조건부 렌더링 전에 호출해야 함
  const updateVideoMutation = useUpdateVideo();

  const handleSave = useCallback(async (fieldName: string, value: any) => {
    if (!video) return;
    await updateVideoMutation.mutateAsync({
      id: video._id,
      data: { [fieldName]: value }
    });
  }, [updateVideoMutation, video]);

  const editModeOptions = useMemo(() => ({
    onSave: handleSave
  }), [handleSave]);

  const editMode = useEditMode(editModeOptions);

  // 조건부 렌더링은 모든 hooks 호출 후에
  if (!video) return null;

  // 편집 가능한 필드 설정
  const editableFields = {
    title: { type: 'text' as const, label: '제목', required: true },
    description: { type: 'textarea' as const, label: '설명' },
    views: { type: 'number' as const, label: '조회수', min: 0 },
    likes: { type: 'number' as const, label: '좋아요', min: 0 },
    commentsCount: { type: 'number' as const, label: '댓글수', min: 0 },
    channelName: { type: 'text' as const, label: '채널명', required: true },
    keywords: { type: 'tags' as const, label: '키워드' },
    hashtags: { type: 'tags' as const, label: '해시태그' },
    mainCategory: { type: 'text' as const, label: '주 카테고리' },
    middleCategory: { type: 'text' as const, label: '중 카테고리' }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const videoId = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    );
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : '';
  };

  const title = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-3">
        <img
          src={video?.channelAvatarUrl || video?.channelAvatar || ''}
          alt={video?.channelName || ''}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">
            {video?.title || ''}
          </h2>
          <span className="text-sm text-gray-600">
            {video?.channelName || ''}
          </span>
          <span
            className={`ml-2 px-2 py-1 rounded-full text-xs ${
              video?.platform === PLATFORMS.YOUTUBE
                ? 'bg-red-100 text-red-700'
                : video?.platform === 'TIKTOK'
                  ? 'bg-pink-100 text-pink-700'
                  : 'bg-purple-100 text-purple-700'
            }`}
          >
            {video?.platform}
          </span>
          {video?.isTrending && (
            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
              🔥 인기급상승
            </span>
          )}
        </div>
      </div>

      {/* 편집 모드 토글 버튼 */}
      <button
        onClick={editMode.toggleEditMode}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          editMode.isEditMode
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={editMode.isEditMode ? '편집 모드 끄기' : '편집 모드 켜기'}
      >
        <Edit2 size={16} />
        <span>{editMode.isEditMode ? '편집 완료' : '편집 모드'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={!!video}
      onClose={onClose}
      title={title}
      size="xl"
      className="max-h-[90vh]"
    >
      {/* 콘텐츠 */}
      <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
        {/* 상단 원본 링크 버튼 */}
        <div className="mb-6 text-center">
          <a
            href={video.url || ''}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            원본 링크에서 보기
          </a>
        </div>



        {/* 통합 데이터 영역 */}
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">조회수</div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{formatViews(getViewCount(video))}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">업로드일</div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  {video.uploadDate ? formatDate(video.uploadDate) : video.daysAgo !== undefined ? `${video.daysAgo}일 전` : '날짜 없음'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">수집일</div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  {video.archivedAt ? formatDate(video.archivedAt) : video.collectionTime ? formatDate(video.collectionTime) : video.createdAt ? formatDate(video.createdAt) : '날짜 없음'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">플랫폼</div>
              <div className="flex items-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  video?.platform === PLATFORMS.YOUTUBE
                    ? 'bg-red-100 text-red-700'
                    : video?.platform === 'TIKTOK'
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-purple-100 text-purple-700'
                }`}>
                  {video?.platform}
                </span>
              </div>
            </div>
          </div>

          {/* 상세 데이터 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 영상 세부 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">영상 정보</h4>
              <div className="space-y-2 text-sm">
                {(video.duration !== undefined && video.duration !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">길이</span>
                    <span className="font-medium">{video.duration ? `${video.duration}초` : '데이터 없음'}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">좋아요</span>
                  <EditableField
                    value={video.likes || 0}
                    config={editableFields.likes}
                    isEditing={editMode.isEditing('likes')}
                    onEdit={() => editMode.startEdit('likes')}
                    onSave={(value) => editMode.saveEdit('likes', value)}
                    onCancel={editMode.cancelEdit}
                    disabled={!editMode.isEditMode}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">댓글 수</span>
                  <EditableField
                    value={video.commentsCount || 0}
                    config={editableFields.commentsCount}
                    isEditing={editMode.isEditing('commentsCount')}
                    onEdit={() => editMode.startEdit('commentsCount')}
                    onSave={(value) => editMode.saveEdit('commentsCount', value)}
                    onCancel={editMode.cancelEdit}
                    disabled={!editMode.isEditMode}
                  />
                </div>
                {video.language && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">언어</span>
                    <span className="font-medium">{video.language}</span>
                  </div>
                )}
                {(video.contentType !== undefined && video.contentType !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">콘텐츠 타입</span>
                    <span className="font-medium">{video.contentType || '정보 없음'}</span>
                  </div>
                )}
                {(video.quality !== undefined && video.quality !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">품질</span>
                    <span className="font-medium">{video.quality ? video.quality.toUpperCase() : '정보 없음'}</span>
                  </div>
                )}
                {(video.monetized !== undefined && video.monetized !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">수익화</span>
                    <span className="font-medium">{video.monetized === 'Y' ? '예' : video.monetized === 'N' ? '아니오' : '정보 없음'}</span>
                  </div>
                )}
                {(video.language !== undefined && video.language !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">언어</span>
                    <span className="font-medium">{video.language || '정보 없음'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 채널 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">채널 정보</h4>
              <div className="space-y-2 text-sm">
                {(video.subscribers !== undefined && video.subscribers !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">구독자</span>
                    <span className="font-medium">{formatViews(video.subscribers)}</span>
                  </div>
                )}
                {(video.channelVideos !== undefined && video.channelVideos !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">총 영상 수</span>
                    <span className="font-medium">{formatViews(video.channelVideos)}</span>
                  </div>
                )}
                {(video.channelUrl !== undefined && video.channelUrl !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">채널 URL</span>
                    <a href={video.channelUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-700 truncate">
                      {video.channelUrl || '채널 보기'}
                    </a>
                  </div>
                )}
                {(video.youtubeHandle !== undefined && video.youtubeHandle !== null) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">핸들</span>
                    <span className="font-medium">@{video.youtubeHandle || '핸들 없음'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 키워드 */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">키워드</h4>
            <EditableField
              value={video.keywords || []}
              config={editableFields.keywords}
              isEditing={editMode.isEditing('keywords')}
              onEdit={() => editMode.startEdit('keywords')}
              onSave={(value) => editMode.saveEdit('keywords', value)}
              onCancel={editMode.cancelEdit}
              disabled={!editMode.isEditMode}
            />
          </div>

          {/* 해시태그 */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">해시태그</h4>
            <EditableField
              value={video.hashtags || []}
              config={editableFields.hashtags}
              isEditing={editMode.isEditing('hashtags')}
              onEdit={() => editMode.startEdit('hashtags')}
              onSave={(value) => editMode.saveEdit('hashtags', value)}
              onCancel={editMode.cancelEdit}
              disabled={!editMode.isEditMode}
            />
          </div>

          {/* 기존 태그들 (참고용) */}
          {Array.isArray(video.tags) && video.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">기존 태그 (읽기 전용)</h4>
              <div className="flex flex-wrap gap-2">
                {video.tags.map((tag, index) => (
                  <span key={`tag-${index}`} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI 분석 결과 */}
          {video.analysisResult && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">AI 분석 결과</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">카테고리</div>
                  <div className="text-sm font-medium">{video.analysisResult.category}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">신뢰도</div>
                  <div className="text-sm font-medium">{Math.round(video.analysisResult.confidence * 100)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">감정</div>
                  <div className={`text-sm font-medium ${
                    video.analysisResult.sentiment === 'positive' ? 'text-green-600' :
                    video.analysisResult.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {video.analysisResult.sentiment || '중립'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">처리시간</div>
                  <div className="text-sm font-medium">{video.analysisResult.processingTime}ms</div>
                </div>
              </div>
            </div>
          )}

          {/* 추가 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {video.youtubeCategory && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">YouTube 카테고리</div>
                <div className="text-sm font-medium">{video.youtubeCategory}</div>
              </div>
            )}
            {video.license && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">라이센스</div>
                <div className="text-sm font-medium">{video.license}</div>
              </div>
            )}
            {video.monetized && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">수익화</div>
                <div className="text-sm font-medium">{video.monetized}</div>
              </div>
            )}
          </div>

          {/* AI 분석 정보 */}
          {(video.mainCategory || video.middleCategory || video.fullCategoryPath) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">AI 카테고리 분석</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">주 카테고리</span>
                    <EditableField
                      value={video.mainCategory || ''}
                      config={editableFields.mainCategory}
                      isEditing={editMode.isEditing('mainCategory')}
                      onEdit={() => editMode.startEdit('mainCategory')}
                      onSave={(value) => editMode.saveEdit('mainCategory', value)}
                      onCancel={editMode.cancelEdit}
                      disabled={!editMode.isEditMode}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">중간 카테고리</span>
                    <EditableField
                      value={video.middleCategory || ''}
                      config={editableFields.middleCategory}
                      isEditing={editMode.isEditing('middleCategory')}
                      onEdit={() => editMode.startEdit('middleCategory')}
                      onSave={(value) => editMode.saveEdit('middleCategory', value)}
                      onCancel={editMode.cancelEdit}
                      disabled={!editMode.isEditMode}
                    />
                  </div>
                  {video.fullCategoryPath && (
                    <div>
                      <div className="text-gray-500 text-xs mb-1">전체 경로</div>
                      <div className="font-medium text-xs bg-white p-2 rounded">{video.fullCategoryPath}</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {video.confidence && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">신뢰도</span>
                      <span className="font-medium text-green-600">{video.confidence}</span>
                    </div>
                  )}
                  {(video.analysisStatus !== undefined && video.analysisStatus !== null) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">분석 상태</span>
                      <span className="font-medium">{video.analysisStatus || '정보 없음'}</span>
                    </div>
                  )}
                  {(video.categoryMatchRate !== undefined && video.categoryMatchRate !== null) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">매치율</span>
                      <span className="font-medium">{video.categoryMatchRate || '정보 없음'}</span>
                    </div>
                  )}
                  {(video.matchType !== undefined && video.matchType !== null) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">매치 타입</span>
                      <span className={`font-medium ${video.matchType === 'mismatch' ? 'text-red-600' : 'text-green-600'}`}>
                        {video.matchType || '정보 없음'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {(video.matchReason !== undefined && video.matchReason !== null) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-gray-500 text-xs mb-1">불일치 사유</div>
                  <div className="text-sm bg-white p-2 rounded">{video.matchReason || '사유 없음'}</div>
                </div>
              )}
            </div>
          )}

          {/* 설명 & AI 분석 내용 - 강제 표시 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(video.description !== undefined && video.description !== null) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">영상 설명</h4>
                <EditableField
                  value={video.description || ''}
                  config={editableFields.description}
                  isEditing={editMode.isEditing('description')}
                  onEdit={() => editMode.startEdit('description')}
                  onSave={(value) => editMode.saveEdit('description', value)}
                  onCancel={editMode.cancelEdit}
                  disabled={!editMode.isEditMode}
                  className="text-sm text-gray-700"
                />
              </div>
            )}

            {(video.analysisContent !== undefined && video.analysisContent !== null) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">AI 분석 내용</h4>
                <div className="text-sm text-gray-700 bg-white p-3 rounded max-h-32 overflow-y-auto">
                  {video.analysisContent || '빈 분석 내용'}
                </div>
              </div>
            )}
          </div>

          {/* 인기 댓글 */}
          {(video.topComments !== undefined && video.topComments !== null) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">인기 댓글</h4>
              <div className="text-sm text-gray-700 bg-white p-3 rounded max-h-40 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: (video.topComments || '댓글 없음').replace(/&quot;/g, '"') }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VideoModal;
