import React, { useState, useEffect } from 'react';
import { CollectionBatch } from '../types';

interface CollectionFilters {
  days: number;
  minViews: number;
  maxViews: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  includeShorts: boolean;
  includeLongForm: boolean;
  keywords: string[];
  excludeKeywords: string[];
}

interface CollectionResult {
  channelName: string;
  platform: string;
  foundVideos: number;
  collectedVideos: number;
  status: 'collecting' | 'completed' | 'error';
  errorMessage?: string;
}

interface BulkCollectionModalProps {
  isOpen: boolean;
  selectedChannels: string[];
  allVisibleChannels?: string[];
  onClose: () => void;
  onCollectionComplete?: (batch: CollectionBatch, videos: any[]) => void;
}

const BulkCollectionModal: React.FC<BulkCollectionModalProps> = ({
  isOpen,
  selectedChannels,
  allVisibleChannels,
  onClose,
  onCollectionComplete
}) => {
  const [filters, setFilters] = useState<CollectionFilters>({
    days: 2,
    minViews: 50000,
    maxViews: null,
    minDuration: null,
    maxDuration: null,
    includeShorts: true,
    includeLongForm: true,
    keywords: [],
    excludeKeywords: []
  });

  // 배치 정보 설정
  const [batchInfo, setBatchInfo] = useState({
    name: '',
    color: '#3B82F6'
  });

  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionResults, setCollectionResults] = useState<CollectionResult[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeKeywordInput, setExcludeKeywordInput] = useState('');

  // 모달이 열릴 때마다 상태 초기화
  useEffect(() => {
    if (isOpen) {
      console.log('모달 열림 - 상태 초기화');
      setIsCollecting(false);
      setCollectionResults([]);
      setCurrentStep('');
      setProgress(0);
    }
  }, [isOpen]);

  const handleFilterChange = (key: keyof CollectionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addKeyword = (type: 'include' | 'exclude') => {
    const input = type === 'include' ? keywordInput : excludeKeywordInput;
    if (!input.trim()) return;

    const keywords = input.split(',').map(k => k.trim()).filter(k => k);
    const currentKeywords = type === 'include' ? filters.keywords : filters.excludeKeywords;
    const newKeywords = [...currentKeywords, ...keywords.filter(k => !currentKeywords.includes(k))];

    handleFilterChange(type === 'include' ? 'keywords' : 'excludeKeywords', newKeywords);
    
    if (type === 'include') {
      setKeywordInput('');
    } else {
      setExcludeKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string, type: 'include' | 'exclude') => {
    const currentKeywords = type === 'include' ? filters.keywords : filters.excludeKeywords;
    const newKeywords = currentKeywords.filter(k => k !== keyword);
    handleFilterChange(type === 'include' ? 'keywords' : 'excludeKeywords', newKeywords);
  };

  const startCollection = async () => {
    setIsCollecting(true);
    setProgress(0);
    setCollectionResults([]);

    // 선택된 채널이 있으면 선택된 채널, 없으면 모든 보이는 채널 사용
    const channelsToProcess = selectedChannels.length > 0 ? selectedChannels : (allVisibleChannels || []);
    const results: CollectionResult[] = [];

    for (let i = 0; i < channelsToProcess.length; i++) {
      const channelName = channelsToProcess[i];
      setCurrentStep(`${channelName}에서 영상 수집 중...`);
      setProgress(((i + 1) / channelsToProcess.length) * 100);

      // 현재 채널 결과 추가
      const channelResult: CollectionResult = {
        channelName,
        platform: ['YouTube', 'TikTok', 'Instagram'][Math.floor(Math.random() * 3)],
        foundVideos: 0,
        collectedVideos: 0,
        status: 'collecting'
      };
      
      results.push(channelResult);
      setCollectionResults([...results]);

      // 모의 수집 과정
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 검색 단계
      setCurrentStep(`${channelName}에서 조건에 맞는 영상 검색 중...`);
      await new Promise(resolve => setTimeout(resolve, 800));

      const foundVideos = Math.floor(Math.random() * 50) + 10;
      channelResult.foundVideos = foundVideos;
      setCollectionResults([...results]);

      // 수집 단계
      setCurrentStep(`${channelName}에서 ${foundVideos}개 영상 수집 중...`);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // 성공/실패 결정 (90% 성공률)
      if (Math.random() > 0.1) {
        channelResult.collectedVideos = foundVideos;
        channelResult.status = 'completed';
      } else {
        channelResult.status = 'error';
        channelResult.errorMessage = 'API 할당량 초과 또는 권한 오류';
      }

      setCollectionResults([...results]);
    }

    // 배치 생성 및 콜백 호출
    const batch: CollectionBatch = {
      id: Date.now().toString(),
      name: batchInfo.name || `${new Date().toLocaleDateString()} 수집`,
      keywords: filters.keywords,
      color: batchInfo.color,
      collectedAt: new Date().toISOString(),
      videoCount: totalCollected,
      channels: channelsToProcess
    };

    // 수집된 영상들 생성 (mock)
    const collectedVideos = results.flatMap((result, batchIndex) => {
      return Array.from({ length: result.collectedVideos }, (_, videoIndex) => ({
        id: Date.now() + batchIndex * 1000 + videoIndex,
        platform: result.platform,
        title: `${result.channelName}의 수집된 영상 ${videoIndex + 1}`,
        channelName: result.channelName,
        views: Math.floor(Math.random() * 500000) + filters.minViews,
        daysAgo: Math.floor(Math.random() * filters.days),
        thumbnailUrl: `https://placehold.co/600x400/3B82F6/FFFFFF?text=${result.channelName}`,
        channelAvatarUrl: `https://placehold.co/100x100/3B82F6/FFFFFF?text=${result.channelName.charAt(0)}`,
        isTrending: Math.random() > 0.7,
        originalUrl: `https://example.com/${result.channelName}/${videoIndex}`,
        aspectRatio: '16:9' as const,
        keywords: filters.keywords,
        createdAt: new Date(Date.now() - Math.random() * filters.days * 24 * 60 * 60 * 1000).toISOString(),
        batchIds: [batch.id],
        collectedAt: batch.collectedAt,
        isCollected: true
      }));
    });

    // 부모 컴포넌트에 결과 전달
    if (onCollectionComplete) {
      onCollectionComplete(batch, collectedVideos);
    }

    setIsCollecting(false);
    setCurrentStep('수집 완료');
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + '천';
    return num.toLocaleString();
  };

  if (!isOpen) return null;

  // 선택된 채널이 있으면 선택된 채널, 없으면 모든 보이는 채널 사용
  const channelsToProcess = selectedChannels.length > 0 ? selectedChannels : (allVisibleChannels || []);
  const isSelectedChannels = selectedChannels.length > 0;
  
  const totalFound = collectionResults.reduce((sum, result) => sum + result.foundVideos, 0);
  const totalCollected = collectionResults.reduce((sum, result) => sum + result.collectedVideos, 0);
  const successCount = collectionResults.filter(r => r.status === 'completed').length;

  // 디버깅용 로그
  const shouldShowStartButton = !isCollecting && collectionResults.length === 0;
  console.log('버튼 표시 조건:', {
    isCollecting,
    collectionResultsLength: collectionResults.length,
    shouldShowStartButton,
    channelsToProcess: channelsToProcess.length
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              🎯 {isSelectedChannels ? '선택한 채널' : '일괄'} 영상 수집
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {channelsToProcess.length}개 채널에서 조건에 맞는 영상 수집
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {!isCollecting && collectionResults.length === 0 && (
            <div className="space-y-6">
              {/* 배치 정보 설정 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">📦 수집 배치 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      배치 이름
                    </label>
                    <input
                      type="text"
                      value={batchInfo.name}
                      onChange={(e) => setBatchInfo({...batchInfo, name: e.target.value})}
                      placeholder={`${new Date().toLocaleDateString()} 수집`}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      구분 색상
                    </label>
                    <div className="flex space-x-2">
                      {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'].map(color => (
                        <button
                          key={color}
                          onClick={() => setBatchInfo({...batchInfo, color})}
                          className={`w-8 h-8 rounded-full border-2 ${
                            batchInfo.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 수집 조건 설정 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 시간 조건</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최근 기간
                      </label>
                      <select
                        value={filters.days}
                        onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      >
                        <option value={1}>최근 1일</option>
                        <option value={2}>최근 2일</option>
                        <option value={3}>최근 3일</option>
                        <option value={7}>최근 1주</option>
                        <option value={14}>최근 2주</option>
                        <option value={30}>최근 1개월</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">👀 조회수 조건</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최소 조회수
                      </label>
                      <select
                        value={filters.minViews}
                        onChange={(e) => handleFilterChange('minViews', parseInt(e.target.value))}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      >
                        <option value={10000}>1만 이상</option>
                        <option value={50000}>5만 이상</option>
                        <option value={100000}>10만 이상</option>
                        <option value={500000}>50만 이상</option>
                        <option value={1000000}>100만 이상</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최대 조회수 (선택사항)
                      </label>
                      <select
                        value={filters.maxViews || ''}
                        onChange={(e) => handleFilterChange('maxViews', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      >
                        <option value="">제한 없음</option>
                        <option value={100000}>10만 이하</option>
                        <option value={500000}>50만 이하</option>
                        <option value={1000000}>100만 이하</option>
                        <option value={5000000}>500만 이하</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ 영상 길이</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeShorts"
                        checked={filters.includeShorts}
                        onChange={(e) => handleFilterChange('includeShorts', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <label htmlFor="includeShorts" className="text-sm text-gray-700">
                        숏폼 (60초 이하) 포함
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeLongForm"
                        checked={filters.includeLongForm}
                        onChange={(e) => handleFilterChange('includeLongForm', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <label htmlFor="includeLongForm" className="text-sm text-gray-700">
                        롱폼 (60초 이상) 포함
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏷️ 키워드 필터</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        포함할 키워드 (쉼표로 구분)
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          placeholder="예: 리뷰, 트렌드, VLOG"
                          className="flex-1 border-gray-300 rounded-md shadow-sm"
                          onKeyPress={(e) => e.key === 'Enter' && addKeyword('include')}
                        />
                        <button
                          onClick={() => addKeyword('include')}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          추가
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filters.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {keyword}
                            <button
                              onClick={() => removeKeyword(keyword, 'include')}
                              className="ml-1 text-blue-500 hover:text-blue-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        제외할 키워드 (쉼표로 구분)
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={excludeKeywordInput}
                          onChange={(e) => setExcludeKeywordInput(e.target.value)}
                          placeholder="예: 광고, 협찬"
                          className="flex-1 border-gray-300 rounded-md shadow-sm"
                          onKeyPress={(e) => e.key === 'Enter' && addKeyword('exclude')}
                        />
                        <button
                          onClick={() => addKeyword('exclude')}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          추가
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filters.excludeKeywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                          >
                            {keyword}
                            <button
                              onClick={() => removeKeyword(keyword, 'exclude')}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 수집할 채널 목록 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📺 수집 대상 채널 ({isSelectedChannels ? '선택한 채널' : '모든 표시된 채널'})
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {channelsToProcess.map((channel, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-3 py-1 text-sm rounded-full ${
                          isSelectedChannels 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 예상 결과 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">📊 예상 수집 조건</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 최근 {filters.days}일 내 업로드된 영상</li>
                  <li>• {formatNumber(filters.minViews)} 조회수 이상{filters.maxViews ? ` ~ ${formatNumber(filters.maxViews)} 이하` : ''}</li>
                  <li>• 영상 타입: {
                    filters.includeShorts && filters.includeLongForm ? '숏폼 + 롱폼' :
                    filters.includeShorts ? '숏폼만' :
                    filters.includeLongForm ? '롱폼만' : '선택된 타입 없음'
                  }</li>
                  {filters.keywords.length > 0 && (
                    <li>• 포함 키워드: {filters.keywords.join(', ')}</li>
                  )}
                  {filters.excludeKeywords.length > 0 && (
                    <li>• 제외 키워드: {filters.excludeKeywords.join(', ')}</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* 수집 진행 중 */}
          {isCollecting && (
            <div className="space-y-6">
              <div className="text-center py-8">
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

              {/* 실시간 결과 */}
              {collectionResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 실시간 수집 현황</h3>
                  <div className="space-y-2">
                    {collectionResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{result.channelName}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            result.status === 'collecting' ? 'bg-yellow-100 text-yellow-700' :
                            result.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {result.status === 'collecting' ? '수집중' :
                             result.status === 'completed' ? '완료' : '오류'}
                          </span>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          {result.foundVideos > 0 && (
                            <span>발견: {result.foundVideos}개 | 수집: {result.collectedVideos}개</span>
                          )}
                          {result.errorMessage && (
                            <span className="text-red-600">{result.errorMessage}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 수집 완료 결과 */}
          {!isCollecting && collectionResults.length > 0 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">🎉 수집 완료!</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{totalFound}</p>
                    <p className="text-sm text-green-700">총 발견</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{totalCollected}</p>
                    <p className="text-sm text-blue-700">수집 완료</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{successCount}</p>
                    <p className="text-sm text-indigo-700">성공한 채널</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round((totalCollected / totalFound) * 100) || 0}%
                    </p>
                    <p className="text-sm text-purple-700">수집률</p>
                  </div>
                </div>
              </div>

              {/* 채널별 상세 결과 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 채널별 수집 결과</h3>
                <div className="space-y-3">
                  {collectionResults.map((result, index) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${
                      result.status === 'completed' ? 'border-green-200 bg-green-50' :
                      result.status === 'error' ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{result.channelName}</h4>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            result.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                            result.platform === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {result.platform}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {result.collectedVideos}개 수집
                          </p>
                          <p className="text-sm text-gray-600">
                            {result.foundVideos}개 중
                          </p>
                        </div>
                      </div>
                      {result.errorMessage && (
                        <p className="mt-2 text-sm text-red-600">❌ {result.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button 
            onClick={onClose}
            disabled={isCollecting}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {isCollecting ? '수집 중...' : '닫기'}
          </button>
          {!isCollecting && collectionResults.length === 0 && (
            <button 
              onClick={startCollection}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
            >
              🎯 수집 시작
            </button>
          )}
          {!isCollecting && collectionResults.length > 0 && (
            <>
              <button className="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700">
                대시보드에서 확인
              </button>
              <button className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">
                결과 내보내기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkCollectionModal;