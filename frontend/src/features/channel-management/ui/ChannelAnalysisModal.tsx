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

  // 🔍 채널 객체 디버깅
  console.log('🔍 [ChannelAnalysisModal] 받은 channel 객체:', channel);
  console.log('📊 [ChannelAnalysisModal] channel 객체의 모든 키:', Object.keys(channel));
  console.log('🏷️ [ChannelAnalysisModal] keywords:', channel.keywords);
  console.log('🤖 [ChannelAnalysisModal] aiTags:', channel.aiTags);
  console.log('🧠 [ChannelAnalysisModal] deepInsightTags:', channel.deepInsightTags);
  console.log('📊 [ChannelAnalysisModal] clusterIds:', channel.clusterIds);
  console.log('💡 [ChannelAnalysisModal] suggestedClusters:', channel.suggestedClusters);

  // 데이터 없을 때 표시하는 헬퍼 함수
  const renderDataOrEmpty = (data: string[] | undefined, label: string) => {
    console.log(`🔍 [renderDataOrEmpty] ${label} 데이터 확인:`, data, '타입:', typeof data, '길이:', data?.length);

    if (!data || data.length === 0) {
      console.log(`⚠️ [renderDataOrEmpty] ${label} 데이터 없음 - "(없음)" 표시`);
      return <span className="text-gray-500">(없음)</span>;
    }

    console.log(`✅ [renderDataOrEmpty] ${label} 데이터 있음 - 태그 렌더링`);
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
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {channel.name}
            </h3>
            <p className="text-sm text-gray-600">
              구독자 {formatViews(channel.subscribers || 0)}명 · 플랫폼: {channel.platform}
              {channel.country && ` · 국가: ${channel.country}`}
              {channel.defaultLanguage && ` · 언어: ${channel.defaultLanguage}`}
            </p>
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <p>채널 ID: {channel.channelId}</p>
              {channel.customUrl && <p>사용자 URL: {channel.customUrl}</p>}
              {channel.description && (
                <p className="truncate max-w-md">설명: {channel.description}</p>
              )}
            </div>
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

          {/* 추가 통계 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-indigo-600">
                {channel.dailyUploadRate?.toFixed(2) || '0'}
              </p>
              <p className="text-sm text-gray-600">일일 업로드율</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-pink-600">
                {channel.avgDurationFormatted || '정보없음'}
              </p>
              <p className="text-sm text-gray-600">평균 길이</p>
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-cyan-600">
                {channel.shortFormRatio?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-600">숏폼 비율</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-yellow-600">
                {channel.uploadFrequency?.pattern || '분석안됨'}
              </p>
              <p className="text-sm text-gray-600">업로드 패턴</p>
            </div>
          </div>

          {/* 기간별 조회수 */}
          {channel.viewsByPeriod && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="text-md font-semibold text-gray-900 mb-3">📊 기간별 조회수</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {formatViews(channel.viewsByPeriod.last7Days || 0)}
                  </p>
                  <p className="text-gray-600">최근 7일</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    {formatViews(channel.viewsByPeriod.last30Days || 0)}
                  </p>
                  <p className="text-gray-600">최근 30일</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">
                    {formatViews(channel.viewsByPeriod.last90Days || 0)}
                  </p>
                  <p className="text-gray-600">최근 90일</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-600">
                    {formatViews(channel.viewsByPeriod.lastYear || 0)}
                  </p>
                  <p className="text-gray-600">최근 1년</p>
                </div>
              </div>
            </div>
          )}
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
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">업로드 일관성:</span>
              <span className="text-sm font-medium">
                {channel.uploadFrequency?.consistency
                  ? `${(channel.uploadFrequency.consistency * 100).toFixed(1)}%`
                  : '정보 없음'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">평균 길이 (초):</span>
              <span className="text-sm font-medium">
                {channel.avgDurationSeconds ? `${channel.avgDurationSeconds}초` : '정보 없음'}
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
            {/* 카테고리 정보 */}
            {channel.categoryInfo && (
              <div className="p-3 bg-white rounded-lg border border-blue-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📂 카테고리 분류:
                </label>
                <div className="space-y-2">
                  {channel.categoryInfo.majorCategory && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">대분류</span>
                      <span className="text-sm">{channel.categoryInfo.majorCategory}</span>
                    </div>
                  )}
                  {channel.categoryInfo.middleCategory && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">중분류</span>
                      <span className="text-sm">{channel.categoryInfo.middleCategory}</span>
                    </div>
                  )}
                  {channel.categoryInfo.subCategory && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">소분류</span>
                      <span className="text-sm">{channel.categoryInfo.subCategory}</span>
                    </div>
                  )}
                  {channel.categoryInfo.fullCategoryPath && (
                    <div className="text-xs text-gray-600 border-t pt-2">
                      경로: {channel.categoryInfo.fullCategoryPath}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 border-t pt-2">
                    {channel.categoryInfo.categoryDepth && <span>깊이: {channel.categoryInfo.categoryDepth}</span>}
                    {channel.categoryInfo.categoryConfidence && <span>신뢰도: {(channel.categoryInfo.categoryConfidence * 100).toFixed(1)}%</span>}
                    {channel.categoryInfo.consistencyLevel && <span>일관성: {channel.categoryInfo.consistencyLevel}</span>}
                  </div>
                  {channel.categoryInfo.consistencyReason && (
                    <div className="text-xs text-gray-600 italic">
                      사유: {channel.categoryInfo.consistencyReason}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                🏷️ 전체 태그:
              </label>
              <div className="min-h-[2rem]">
                {renderDataOrEmpty(channel.allTags, '전체 태그')}
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

        {/* 🎭 채널 정체성 (새로 추가된 섹션) */}
        <div className="space-y-3 border-2 border-purple-200 rounded-lg p-4 bg-purple-50/30">
          <h4 className="text-lg font-semibold text-gray-900 text-center">
            🎭 채널 정체성
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 타겟 오디언스:
              </label>
              <div className="min-h-[2rem]">
                <span className="text-sm text-gray-900">
                  {channel.targetAudience || <span className="text-gray-500">(없음)</span>}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎨 콘텐츠 스타일:
              </label>
              <div className="min-h-[2rem]">
                <span className="text-sm text-gray-900">
                  {channel.contentStyle || <span className="text-gray-500">(없음)</span>}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⭐ 고유 특징:
              </label>
              <div className="min-h-[2rem]">
                {renderDataOrEmpty(channel.uniqueFeatures, '고유 특징')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 채널 성격:
              </label>
              <div className="min-h-[2rem]">
                <span className="text-sm text-gray-900">
                  {channel.channelPersonality || <span className="text-gray-500">(없음)</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 🕐 메타데이터 (새로 추가된 섹션) */}
        <div className="space-y-3 border-2 border-gray-200 rounded-lg p-4 bg-gray-50/30">
          <h4 className="text-lg font-semibold text-gray-900 text-center">
            🕐 메타데이터
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">최종 분석:</span>
              <p className="text-gray-600">
                {channel.lastAnalyzedAt
                  ? new Date(channel.lastAnalyzedAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '정보 없음'
                }
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">수집일:</span>
              <p className="text-gray-600">
                {channel.collectedAt
                  ? new Date(channel.collectedAt).toLocaleDateString('ko-KR')
                  : '정보 없음'
                }
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">채널 생성일:</span>
              <p className="text-gray-600">
                {channel.publishedAt
                  ? new Date(channel.publishedAt).toLocaleDateString('ko-KR')
                  : '정보 없음'
                }
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">분석 버전:</span>
              <p className="text-gray-600">{channel.analysisVersion || 'v1.0'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">데이터 버전:</span>
              <p className="text-gray-600">{channel.version || '1'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">생성일:</span>
              <p className="text-gray-600">
                {channel.createdAt
                  ? new Date(channel.createdAt).toLocaleDateString('ko-KR')
                  : '정보 없음'
                }
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">최종 업데이트:</span>
              <p className="text-gray-600">
                {channel.updatedAt
                  ? new Date(channel.updatedAt).toLocaleDateString('ko-KR')
                  : '정보 없음'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChannelAnalysisModal;
