import React, { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components';
import { formatViews } from '../../../shared/utils';
import { Channel } from '../../../shared/types';

interface ChannelAnalysisModalProps {
  channel: Channel | null;
  onClose: () => void;
}

const ChannelAnalysisModal: React.FC<ChannelAnalysisModalProps> = ({
  channel,
  onClose,
}) => {
  if (!channel) return null;

  // 데이터 없을 때 표시하는 헬퍼 함수
  const renderDataOrEmpty = (data: string[] | undefined, label: string) => {
    if (!data || data.length === 0) {
      return <span className="text-gray-500">(없음)</span>;
    }
    return data.map((item, index) => (
      <span
        key={index}
        className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full mr-2 mb-1"
      >
        {item}
      </span>
    ));
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        닫기
      </button>
      {channel.url && (
        <button
          onClick={() => window.open(channel.url, '_blank')}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          채널 URL 열기
        </button>
      )}
    </>
  );

  return (
    <Modal
      isOpen={!!channel}
      onClose={onClose}
      title={`📊 채널 분석 - ${channel.name}`}
      size="xl"
      showFooter={true}
      footer={footer}
    >
      <div className="p-6 space-y-6">
        {/* 헤더 섹션 */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <img
            src={
              channel.thumbnailUrl ||
              `https://placehold.co/64x64/3B82F6/FFFFFF?text=${channel.name.charAt(0)}`
            }
            alt={channel.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {channel.name}
            </h3>
            <p className="text-sm text-gray-600">
              구독자 {formatViews(channel.subscribers || 0)}명 · 플랫폼: {channel.platform}
            </p>
          </div>
        </div>

        {/* 핵심 성과 지표 */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-gray-900">📈 성과 지표</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">
                {channel.totalVideos || 0}
              </p>
              <p className="text-sm text-gray-600">총 영상수</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatViews(channel.totalViews || 0)}
              </p>
              <p className="text-sm text-gray-600">총 조회수</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatViews(channel.averageViewsPerVideo || 0)}
              </p>
              <p className="text-sm text-gray-600">평균 조회수</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-600">
                {formatViews(channel.last7DaysViews || 0)}
              </p>
              <p className="text-sm text-gray-600">최근7일</p>
            </div>
          </div>
        </div>

        {/* 대표 영상 */}
        {channel.mostViewedVideo && (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">🔥 대표 영상</h4>
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <img
                src={
                  channel.mostViewedVideo.thumbnailUrl ||
                  'https://placehold.co/120x68/gray/white?text=Video'
                }
                alt={channel.mostViewedVideo.title}
                className="w-30 h-17 rounded object-cover"
              />
              <div>
                <h5 className="font-medium text-gray-900 mb-1">
                  {channel.mostViewedVideo.title}
                </h5>
                <p className="text-sm text-gray-600">
                  {formatViews(channel.mostViewedVideo.viewCount || 0)} 조회수 ·{' '}
                  {channel.mostViewedVideo.durationSeconds}초 ·{' '}
                  {channel.mostViewedVideo.publishedAt ?
                    new Date(channel.mostViewedVideo.publishedAt).toLocaleDateString('ko-KR') :
                    '날짜 미상'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 콘텐츠 분석 */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-gray-900">🎯 콘텐츠 분석</h4>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">콘텐츠 타입:</span>
              <span className="text-sm font-medium">{channel.contentType || '미분류'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">평균 영상 길이:</span>
              <span className="text-sm font-medium">{channel.avgDurationFormatted || '정보 없음'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">숏폼 비율:</span>
              <span className="text-sm font-medium">{channel.shortFormRatio || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">업로드 패턴:</span>
              <span className="text-sm font-medium">
                {channel.uploadFrequency?.pattern || '분석 안됨'}
                {channel.uploadFrequency?.avgDaysBetweenUploads &&
                  ` (${channel.uploadFrequency.avgDaysBetweenUploads.toFixed(1)}일 간격)`
                }
              </span>
            </div>
          </div>
        </div>

        {/* 🏷️ 키워드 & 분류 (메인 섹션) */}
        <div className="space-y-3 border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
          <h4 className="text-lg font-semibold text-gray-900 text-center">
            🏷️ 키워드 & 분류
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔑 키워드:
              </label>
              <div className="min-h-[2rem]">
                {renderDataOrEmpty(channel.keywords, '키워드')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🤖 AI 태그:
              </label>
              <div className="min-h-[2rem]">
                {renderDataOrEmpty(channel.aiTags, 'AI 태그')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🧠 심화 분석:
              </label>
              <div className="min-h-[2rem]">
                {renderDataOrEmpty(channel.deepInsightTags, '심화 분석')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 클러스터 ID:
              </label>
              <div className="min-h-[2rem]">
                {renderDataOrEmpty(channel.clusterIds, '클러스터 ID')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💡 추천 클러스터:
              </label>
              <div className="min-h-[2rem]">
                {(!channel.suggestedClusters || channel.suggestedClusters.length === 0) ? (
                  <span className="text-gray-500">(없음)</span>
                ) : (
                  channel.suggestedClusters.map((cluster, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full mr-2 mb-1"
                    >
                      {cluster.name || cluster.id}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChannelAnalysisModal;
