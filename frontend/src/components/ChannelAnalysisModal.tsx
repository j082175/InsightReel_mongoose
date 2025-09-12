import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { formatViews } from '../utils/formatters';

interface ChannelData {
  name: string;
  avatar: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  avgViews: number;
  engagement: number;
  growthRate: number;
  topVideos: Array<{
    id: number;
    title: string;
    views: number;
    thumbnail: string;
  }>;
  keywords: string[];
  uploadFrequency: string;
  bestUploadTime: string;
}

interface ChannelAnalysisModalProps {
  channelName: string | null;
  onClose: () => void;
}

const ChannelAnalysisModal: React.FC<ChannelAnalysisModalProps> = ({ 
  channelName, 
  onClose 
}) => {
  const [loading, setLoading] = useState(true);
  const [channelData, setChannelData] = useState<ChannelData | null>(null);

  // Mock 데이터 생성 함수
  const generateMockChannelData = (name: string): ChannelData => ({
    name,
    avatar: `https://placehold.co/100x100/3B82F6/FFFFFF?text=${name.charAt(0)}`,
    subscriberCount: Math.floor(Math.random() * 1000000) + 100000,
    videoCount: Math.floor(Math.random() * 500) + 50,
    totalViews: Math.floor(Math.random() * 50000000) + 1000000,
    avgViews: Math.floor(Math.random() * 100000) + 10000,
    engagement: Math.floor(Math.random() * 10) + 2,
    growthRate: Math.floor(Math.random() * 20) - 5,
    topVideos: [
      {
        id: 1,
        title: `${name}의 최고 인기 영상`,
        views: Math.floor(Math.random() * 1000000) + 100000,
        thumbnail: 'https://placehold.co/200x120/3B82F6/FFFFFF?text=Video1'
      },
      {
        id: 2,
        title: `${name}의 화제작`,
        views: Math.floor(Math.random() * 800000) + 80000,
        thumbnail: 'https://placehold.co/200x120/F43F5E/FFFFFF?text=Video2'
      },
      {
        id: 3,
        title: `${name}의 추천 영상`,
        views: Math.floor(Math.random() * 600000) + 60000,
        thumbnail: 'https://placehold.co/200x120/8B5CF6/FFFFFF?text=Video3'
      }
    ],
    keywords: ['엔터테인먼트', '라이프스타일', '일상', 'VLOG', '리뷰'],
    uploadFrequency: '주 2-3회',
    bestUploadTime: '오후 8-10시'
  });

  useEffect(() => {
    if (channelName) {
      // 실제 API 호출 시뮬레이션
      setLoading(true);
      setTimeout(() => {
        setChannelData(generateMockChannelData(channelName));
        setLoading(false);
      }, 1500);
    }
  }, [channelName]);


  if (!channelName) return null;


  const footer = (
    <>
      <button 
        onClick={onClose}
        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        닫기
      </button>
      {channelData && (
        <button className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors">
          채널 구독 추가
        </button>
      )}
    </>
  );

  return (
    <BaseModal
      isOpen={!!channelName}
      onClose={onClose}
      title="📊 채널 분석"
      size="xl"
      showFooter={true}
      footer={footer}
    >
      <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">채널 데이터를 분석 중입니다...</p>
            </div>
          ) : channelData ? (
            <div className="space-y-6">
              {/* 채널 기본 정보 */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <img 
                  src={channelData.avatar} 
                  alt={channelData.name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{channelData.name}</h3>
                  <p className="text-sm text-gray-600">구독자 {formatViews(channelData.subscriberCount)}명</p>
                </div>
              </div>

              {/* 통계 카드들 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{channelData.videoCount}</p>
                  <p className="text-sm text-gray-600">총 영상 수</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{formatViews(channelData.totalViews)}</p>
                  <p className="text-sm text-gray-600">총 조회수</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{formatViews(channelData.avgViews)}</p>
                  <p className="text-sm text-gray-600">평균 조회수</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{channelData.engagement}%</p>
                  <p className="text-sm text-gray-600">참여율</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 성장 지표 */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">📈 성장 지표</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">성장률 (월간)</span>
                      <span className={`text-sm font-medium ${
                        channelData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {channelData.growthRate >= 0 ? '+' : ''}{channelData.growthRate}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">업로드 빈도</span>
                      <span className="text-sm font-medium text-gray-900">{channelData.uploadFrequency}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">최적 업로드 시간</span>
                      <span className="text-sm font-medium text-gray-900">{channelData.bestUploadTime}</span>
                    </div>
                  </div>
                </div>

                {/* 키워드 분석 */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">🏷️ 주요 키워드</h4>
                  <div className="flex flex-wrap gap-2">
                    {channelData.keywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 인기 영상 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">🔥 인기 영상 TOP 3</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {channelData.topVideos.map((video, index) => (
                    <div key={video.id} className="bg-gray-50 rounded-lg overflow-hidden">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                          {video.title}
                        </h5>
                        <p className="text-xs text-gray-500">
                          {formatViews(video.views)} 조회수
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">😅</p>
              <p className="mt-2">채널 데이터를 불러올 수 없습니다.</p>
            </div>
          )}
      </div>
    </BaseModal>
  );
};

export default ChannelAnalysisModal;