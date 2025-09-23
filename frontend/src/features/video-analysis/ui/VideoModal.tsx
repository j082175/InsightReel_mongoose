import React, { useState } from 'react';
import { Video } from '../../../shared/types';
import { PLATFORMS } from '../../../shared/types';
import { formatViews, formatDate } from '../../../shared/utils';
import { getThumbnailUrl, getViewCount } from '../../../shared/utils';
import { Modal } from '../../../shared/components';

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
  if (!video) return null;

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const videoId = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    );
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : '';
  };

  const title = (
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

          {/* YouTube 전용 상세 데이터 (유튜브만 전체 데이터 보유) */}
          {video.platform === PLATFORMS.YOUTUBE && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 영상 세부 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">영상 정보</h4>
                <div className="space-y-2 text-sm">
                  {video.duration && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">길이</span>
                      <span className="font-medium">{video.duration}</span>
                    </div>
                  )}
                  {video.likes && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">좋아요</span>
                      <span className="font-medium">{formatViews(video.likes)}</span>
                    </div>
                  )}
                  {video.dislikes && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">싫어요</span>
                      <span className="font-medium">{formatViews(video.dislikes)}</span>
                    </div>
                  )}
                  {video.commentCount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">댓글 수</span>
                      <span className="font-medium">{formatViews(video.commentCount)}</span>
                    </div>
                  )}
                  {video.language && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">언어</span>
                      <span className="font-medium">{video.language}</span>
                    </div>
                  )}
                  {video.defaultAudioLanguage && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">기본 오디오</span>
                      <span className="font-medium">{video.defaultAudioLanguage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 채널 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">채널 정보</h4>
                <div className="space-y-2 text-sm">
                  {video.subscriberCount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">구독자</span>
                      <span className="font-medium">{formatViews(video.subscriberCount)}</span>
                    </div>
                  )}
                  {video.videoCount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">총 영상 수</span>
                      <span className="font-medium">{formatViews(video.videoCount)}</span>
                    </div>
                  )}
                  {video.channelCreatedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">채널 생성일</span>
                      <span className="font-medium">{formatDate(video.channelCreatedAt)}</span>
                    </div>
                  )}
                  {video.country && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">국가</span>
                      <span className="font-medium">{video.country}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 키워드/태그 */}
          {(video.keywords || video.tags) && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">키워드 & 태그</h4>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(video.keywords) ? (
                  video.keywords.map((keyword, index) => (
                    <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                      #{keyword}
                    </span>
                  ))
                ) : video.keywords ? (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                    #{video.keywords}
                  </span>
                ) : null}

                {Array.isArray(video.tags) && video.tags.map((tag, index) => (
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

          {/* 기타 세부 정보 (YouTube 전용) */}
          {video.platform === PLATFORMS.YOUTUBE && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {video.definition && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">해상도</div>
                  <div className="text-sm font-medium">{video.definition}</div>
                </div>
              )}
              {video.dimension && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">차원</div>
                  <div className="text-sm font-medium">{video.dimension}</div>
                </div>
              )}
              {video.licensedContent !== undefined && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">라이센스 콘텐츠</div>
                  <div className="text-sm font-medium">{video.licensedContent ? '예' : '아니오'}</div>
                </div>
              )}
              {video.projection && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">프로젝션</div>
                  <div className="text-sm font-medium">{video.projection}</div>
                </div>
              )}
            </div>
          )}

          {/* 설명 (있는 경우) */}
          {video.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">설명</h4>
              <div className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                {video.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VideoModal;
