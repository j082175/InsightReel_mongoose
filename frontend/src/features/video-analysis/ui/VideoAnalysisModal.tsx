import React, { useState, useEffect } from 'react';
import { formatViews, formatDate } from '../../../shared/utils';
import { Modal } from '../../../shared/components';

interface AnalysisResult {
  channelName: string;
  platform: string;
  videoCount: number;
  totalViews: number;
  avgViews: number;
  topVideo: {
    title: string;
    views: number;
    publishedAt: string;
  };
  trends: {
    viewGrowth: number;
    engagementRate: number;
    uploadFrequency: string;
  };
  keywords: string[];
  recommendations: string[];
}

interface VideoAnalysisModalProps {
  isOpen: boolean;
  selectedChannels: string[];
  onClose: () => void;
}

const VideoAnalysisModal: React.FC<VideoAnalysisModalProps> = ({
  isOpen,
  selectedChannels,
  onClose
}) => {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen && selectedChannels?.length > 0) {
      runAnalysis();
    }
  }, [isOpen, selectedChannels]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setAnalysisResults([]);

    const mockResults: AnalysisResult[] = [];

    for (let i = 0; i < selectedChannels.length; i++) {
      const channelName = selectedChannels[i];
      setCurrentStep(`${channelName} 분석 중...`);
      setProgress(((i + 1) / selectedChannels.length) * 100);

      // 모의 분석 지연
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 모의 분석 결과 생성
      const mockResult: AnalysisResult = {
        channelName,
        platform: ['YouTube', 'TikTok', 'Instagram'][Math.floor(Math.random() * 3)],
        videoCount: Math.floor(Math.random() * 500) + 50,
        totalViews: Math.floor(Math.random() * 10000000) + 1000000,
        avgViews: Math.floor(Math.random() * 500000) + 50000,
        topVideo: {
          title: `${channelName}의 인기 영상 제목`,
          views: Math.floor(Math.random() * 2000000) + 500000,
          publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        trends: {
          viewGrowth: Math.floor(Math.random() * 50) + 10,
          engagementRate: Math.random() * 10 + 2,
          uploadFrequency: ['매일', '주 2-3회', '주간', '월 2-3회'][Math.floor(Math.random() * 4)]
        },
        keywords: ['트렌드', '인기', '리뷰', '일상', 'VLOG'].sort(() => 0.5 - Math.random()).slice(0, 3),
        recommendations: [
          '업로드 빈도를 높이면 더 많은 노출 기회를 얻을 수 있습니다',
          '시청자 참여도가 높은 콘텐츠 유형을 더 제작해보세요',
          '트렌딩 키워드를 활용한 콘텐츠 기획을 추천합니다'
        ].sort(() => 0.5 - Math.random()).slice(0, 2)
      };

      mockResults.push(mockResult);
      setAnalysisResults([...mockResults]);
    }

    setIsAnalyzing(false);
    setCurrentStep('분석 완료');
  };


  if (!isOpen) return null;

  const title = (
    <div>
      <h2 className="text-xl font-bold text-gray-900">📊 영상 분석 결과</h2>
      <p className="text-sm text-gray-600 mt-1">
        {selectedChannels?.length || 0}개 채널 분석 결과
      </p>
    </div>
  );

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        닫기
      </button>
      {!isAnalyzing && analysisResults.length > 0 && (
        <button className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700">
          결과 내보내기
        </button>
      )}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="full"
      className="max-h-[90vh]"
      showFooter={true}
      footer={footer}
    >

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isAnalyzing && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-lg font-medium text-gray-900 mb-2">{currentStep}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{Math.round(progress)}% 완료</p>
            </div>
          )}

          {!isAnalyzing && analysisResults.length > 0 && (
            <div className="space-y-8">
              {/* 전체 요약 */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 전체 요약</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">
                      {analysisResults.reduce((sum, result) => sum + result.videoCount, 0)}
                    </p>
                    <p className="text-sm text-gray-600">총 영상 수</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {formatViews(analysisResults.reduce((sum, result) => sum + result.totalViews, 0))}
                    </p>
                    <p className="text-sm text-gray-600">총 조회수</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatViews(Math.round(analysisResults.reduce((sum, result) => sum + result.avgViews, 0) / analysisResults.length))}
                    </p>
                    <p className="text-sm text-gray-600">평균 조회수</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.round(analysisResults.reduce((sum, result) => sum + result.trends.engagementRate, 0) / analysisResults.length * 10) / 10}%
                    </p>
                    <p className="text-sm text-gray-600">평균 참여율</p>
                  </div>
                </div>
              </div>

              {/* 개별 채널 결과 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📺 채널별 분석</h3>
                <div className="space-y-6">
                  {analysisResults.map((result) => (
                    <div key={result.channelName} className="bg-white border rounded-lg p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{result.channelName}</h4>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            result.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                            result.platform === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {result.platform}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">조회수 성장률</p>
                          <p className="text-lg font-bold text-green-600">+{result.trends.viewGrowth}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">영상 수</p>
                          <p className="text-xl font-semibold text-gray-900">{result.videoCount}개</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">총 조회수</p>
                          <p className="text-xl font-semibold text-gray-900">{formatViews(result.totalViews)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">평균 조회수</p>
                          <p className="text-xl font-semibold text-gray-900">{formatViews(result.avgViews)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">업로드 빈도</p>
                          <p className="text-xl font-semibold text-gray-900">{result.trends.uploadFrequency}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">🏆 최고 인기 영상</h5>
                        <p className="text-sm text-gray-800 font-medium">{result.topVideo.title}</p>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>{formatViews(result.topVideo.views)} 조회수</span>
                          <span>{formatDate(result.topVideo.publishedAt)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">🏷️ 주요 키워드</h5>
                          <div className="flex flex-wrap gap-2">
                            {result.keywords.map((keyword, kidx) => (
                              <span
                                key={kidx}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">💡 개선 제안</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {result.recommendations.map((rec, ridx) => (
                              <li key={ridx} className="flex items-start">
                                <span className="text-green-500 mr-1">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
};

export default VideoAnalysisModal;