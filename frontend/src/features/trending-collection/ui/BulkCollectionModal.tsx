import React, { useState, useEffect } from 'react';
import { CollectionBatch, Video, PLATFORMS } from '../../../shared/types';
import { Modal } from '../../../shared/components';
import { formatViews } from '../../../shared/utils';
import { FRONTEND_CONSTANTS } from '../../../shared/config';

interface CollectionFilters {
  daysBack: number;
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
  onCollectionComplete?: (batch: CollectionBatch, videos: Video[]) => void;
}

const BulkCollectionModal: React.FC<BulkCollectionModalProps> = ({
  isOpen,
  selectedChannels,
  allVisibleChannels,
  onClose,
  onCollectionComplete,
}) => {
  const [filters, setFilters] = useState<CollectionFilters>({
    daysBack: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.DAYS_BACK,
    minViews: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.MIN_VIEWS,
    maxViews: null,
    minDuration: null,
    maxDuration: null,
    includeShorts: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_SHORTS,
    includeLongForm: FRONTEND_CONSTANTS.DEFAULT_COLLECTION.INCLUDE_LONGFORM,
    keywords: [],
    excludeKeywords: [],
  });

  // 배치 정보 설정
  const [batchInfo, setBatchInfo] = useState({
    name: '',
    color: '#3B82F6',
  });

  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionResults, setCollectionResults] = useState<
    CollectionResult[]
  >([]);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeKeywordInput, setExcludeKeywordInput] = useState('');

  // 🎯 그룹 관련 상태
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [collectionMode, setCollectionMode] = useState<'channels' | 'group'>(
    'channels'
  );

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

  const handleFilterChange = (
    key: keyof CollectionFilters,
    value: CollectionFilters[keyof CollectionFilters]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const addKeyword = (type: 'include' | 'exclude') => {
    const input = type === 'include' ? keywordInput : excludeKeywordInput;
    if (!input.trim()) return;

    const keywords = input
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k);
    const currentKeywords =
      type === 'include' ? filters.keywords : filters.excludeKeywords;
    const newKeywords = [
      ...currentKeywords,
      ...keywords.filter((k) => !currentKeywords.includes(k)),
    ];

    handleFilterChange(
      type === 'include' ? 'keywords' : 'excludeKeywords',
      newKeywords
    );

    if (type === 'include') {
      setKeywordInput('');
    } else {
      setExcludeKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string, type: 'include' | 'exclude') => {
    const currentKeywords =
      type === 'include' ? filters.keywords : filters.excludeKeywords;
    const newKeywords = currentKeywords.filter((k) => k !== keyword);
    handleFilterChange(
      type === 'include' ? 'keywords' : 'excludeKeywords',
      newKeywords
    );
  };

  const startCollection = async () => {
    setIsCollecting(true);
    setProgress(0);
    setCollectionResults([]);

    // 선택된 채널이 있으면 선택된 채널, 없으면 모든 보이는 채널 사용
    const channelsToProcess =
      selectedChannels && selectedChannels.length > 0
        ? selectedChannels
        : allVisibleChannels || [];
    const results: CollectionResult[] = [];

    for (let i = 0; i < channelsToProcess.length; i++) {
      const channelName = channelsToProcess[i];
      setCurrentStep(`${channelName}에서 영상 수집 중...`);
      setProgress(((i + 1) / channelsToProcess.length) * 100);

      // 현재 채널 결과 추가
      const channelResult: CollectionResult = {
        channelName,
        platform: ['YouTube', 'TikTok', 'Instagram'][
          Math.floor(Math.random() * 3)
        ],
        foundVideos: 0,
        collectedVideos: 0,
        status: 'collecting',
      };

      results.push(channelResult);
      setCollectionResults([...results]);

      // 모의 수집 과정
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 검색 단계
      setCurrentStep(`${channelName}에서 조건에 맞는 영상 검색 중...`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const foundVideos = Math.floor(Math.random() * 50) + 10;
      channelResult.foundVideos = foundVideos;
      setCollectionResults([...results]);

      // 수집 단계
      setCurrentStep(`${channelName}에서 ${foundVideos}개 영상 수집 중...`);
      await new Promise((resolve) => setTimeout(resolve, 1200));

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
      channels: channelsToProcess,
    };

    // 수집된 영상들 생성 (mock)
    const collectedVideos = results.flatMap((result, batchIndex) => {
      return Array.from({ length: result.collectedVideos }, (_, videoIndex) => {
        const videoData: Video = {
          id: String(Date.now() + batchIndex * 1000 + videoIndex),
          title: `${result.channelName}의 수집된 영상 ${videoIndex + 1}`,
          url: `https://example.com/video/${Date.now() + batchIndex * 1000 + videoIndex}`,
          uploadDate: new Date(
            Date.now() - Math.random() * filters.daysBack * 24 * 60 * 60 * 1000
          ).toISOString(),
          platform:
            result.platform === PLATFORMS.YOUTUBE ||
            result.platform === 'INSTAGRAM' ||
            result.platform === 'TIKTOK'
              ? result.platform
              : 'YOUTUBE',
          likes: Math.floor(Math.random() * 50000),
          commentsCount: Math.floor(Math.random() * 1000),
          views: filters.minViews + Math.floor(Math.random() * 100000),
          channelName: result.channelName,
          channelUrl: `https://example.com/channel/${result.channelName}`,
          thumbnailUrl: `https://placehold.co/600x400/3B82F6/FFFFFF?text=${result.channelName}`,
          keywords: filters.keywords,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          daysAgo: Math.floor(Math.random() * filters.daysBack),
          aspectRatio: '16:9',
          channelAvatarUrl: `https://placehold.co/100x100/3B82F6/FFFFFF?text=${result.channelName.charAt(0)}`,
          isTrending: Math.random() > 0.7,
          batchIds: [batch.id],
        };

        return videoData;
      });
    });

    // 부모 컴포넌트에 결과 전달
    if (onCollectionComplete) {
      onCollectionComplete(batch, collectedVideos);
    }

    setIsCollecting(false);
    setCurrentStep('수집 완료');
  };

  if (!isOpen) return null;

  // 선택된 채널이 있으면 선택된 채널, 없으면 모든 보이는 채널 사용
  const channelsToProcess =
    selectedChannels && selectedChannels.length > 0
      ? selectedChannels
      : allVisibleChannels || [];
  const isSelectedChannels = selectedChannels && selectedChannels.length > 0;

  const totalFound = collectionResults.reduce(
    (sum, result) => sum + result.foundVideos,
    0
  );
  const totalCollected = collectionResults.reduce(
    (sum, result) => sum + result.collectedVideos,
    0
  );
  const successCount = collectionResults.filter(
    (r) => r.status === 'completed'
  ).length;

  // 디버깅용 로그
  const shouldShowStartButton = !isCollecting && collectionResults.length === 0;
  console.log('버튼 표시 조건:', {
    isCollecting,
    collectionResultsLength: collectionResults.length,
    shouldShowStartButton,
    channelsToProcess: channelsToProcess.length,
  });

  const title = (
    <div>
      <h2 className="text-xl font-bold text-gray-900">
        🎯 {isSelectedChannels ? '선택한 채널' : '일괄'} 영상 수집
      </h2>
      <p className="text-sm text-gray-600 mt-1">
        {channelsToProcess.length}개 채널에서 조건에 맞는 영상 수집
      </p>
    </div>
  );

  const footer = (
    <>
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
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      className="max-h-[98vh]"
      showFooter={true}
      footer={footer}
    >
      <div
        className="p-6 overflow-y-auto"
        style={{ maxHeight: 'calc(98vh - 120px)' }}
      >
        <form
          id="bulk-collection-form"
          onSubmit={handleSubmit(startCollection)}
        >
          {!isCollecting && collectionResults.length === 0 && (
            <div className="space-y-6">
              {/* 수집 모드 선택 */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">
                  🎯 수집 모드
                </h3>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="collectionMode"
                      value="channels"
                      checked={collectionMode === 'channels'}
                      onChange={(e) =>
                        setCollectionMode(
                          e.target.value as 'channels' | 'group'
                        )
                      }
                      className="mr-2"
                    />
                    📺 선택한 채널들에서 수집
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="collectionMode"
                      value="group"
                      checked={collectionMode === 'group'}
                      onChange={(e) =>
                        setCollectionMode(
                          e.target.value as 'channels' | 'group'
                        )
                      }
                      className="mr-2"
                    />
                    🎯 채널 그룹에서 수집
                  </label>
                </div>

                {collectionMode === 'group' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      채널 그룹 선택
                    </label>
                    <select
                      value={selectedGroup || ''}
                      onChange={(e) => setSelectedGroup(e.target.value || null)}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="">그룹을 선택하세요</option>
                      <option value="group1">영화 채널 그룹 1 (예시)</option>
                      <option value="group2">요리 채널 그룹 2 (예시)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 배치 정보 설정 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  📦 수집 배치 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      배치 이름
                    </label>
                    <input
                      type="text"
                      value={batchInfo.name}
                      onChange={(e) =>
                        setBatchInfo({ ...batchInfo, name: e.target.value })
                      }
                      placeholder={`${new Date().toLocaleDateString()} 수집`}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      구분 색상
                    </label>
                    <div className="flex space-x-2">
                      {[
                        '#3B82F6',
                        '#EF4444',
                        '#10B981',
                        '#F59E0B',
                        '#8B5CF6',
                        '#F97316',
                      ].map((color, index) => (
                        <button
                          key={`color-${color}-${index}`}
                          onClick={() => setBatchInfo({ ...batchInfo, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            batchInfo.color === color
                              ? 'border-gray-800'
                              : 'border-gray-300'
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📅 시간 조건
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최근 기간
                      </label>
                      <select
                        value={filters.daysBack}
                        onChange={(e) =>
                          handleFilterChange(
                            'daysBack',
                            parseInt(e.target.value)
                          )
                        }
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    👀 조회수 조건
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최소 조회수
                      </label>
                      <select
                        value={filters.minViews}
                        onChange={(e) =>
                          handleFilterChange(
                            'minViews',
                            parseInt(e.target.value)
                          )
                        }
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
                        onChange={(e) =>
                          handleFilterChange(
                            'maxViews',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    ⏱️ 영상 길이
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeShorts"
                        checked={filters.includeShorts}
                        onChange={(e) =>
                          handleFilterChange('includeShorts', e.target.checked)
                        }
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <label
                        htmlFor="includeShorts"
                        className="text-sm text-gray-700"
                      >
                        숏폼 (60초 이하) 포함
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeLongForm"
                        checked={filters.includeLongForm}
                        onChange={(e) =>
                          handleFilterChange(
                            'includeLongForm',
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <label
                        htmlFor="includeLongForm"
                        className="text-sm text-gray-700"
                      >
                        롱폼 (60초 이상) 포함
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🏷️ 키워드 필터
                  </h3>
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
                          onKeyPress={(e) =>
                            e.key === 'Enter' && addKeyword('include')
                          }
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
                            key={`modal-include-${keyword}-${index}`}
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
                          onChange={(e) =>
                            setExcludeKeywordInput(e.target.value)
                          }
                          placeholder="예: 광고, 협찬"
                          className="flex-1 border-gray-300 rounded-md shadow-sm"
                          onKeyPress={(e) =>
                            e.key === 'Enter' && addKeyword('exclude')
                          }
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
                            key={`modal-exclude-${keyword}-${index}`}
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

              {/* 수집 대상 표시 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {collectionMode === 'group'
                    ? '🎯 수집 대상 그룹'
                    : '📺 수집 대상 채널'}
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto">
                  {collectionMode === 'group' ? (
                    <div className="text-center py-4">
                      {selectedGroup ? (
                        <span className="inline-flex items-center px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-full">
                          🎯{' '}
                          {selectedGroup === 'group1'
                            ? '영화 채널 그룹 1'
                            : '요리 채널 그룹 2'}
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          그룹을 선택해주세요
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {channelsToProcess.map((channel, index) => (
                        <span
                          key={`channel-${channel}-${index}`}
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
                  )}
                </div>
              </div>

              {/* 예상 결과 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">
                  📊 예상 수집 조건
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 최근 {filters.daysBack}일 내 업로드된 영상</li>
                  <li>
                    • {formatViews(filters.minViews)} 조회수 이상
                    {filters.maxViews
                      ? ` ~ ${formatViews(filters.maxViews)} 이하`
                      : ''}
                  </li>
                  <li>
                    • 영상 타입:{' '}
                    {filters.includeShorts && filters.includeLongForm
                      ? '숏폼 + 롱폼'
                      : filters.includeShorts
                        ? '숏폼만'
                        : filters.includeLongForm
                          ? '롱폼만'
                          : '선택된 타입 없음'}
                  </li>
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
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {currentStep}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {Math.round(progress)}% 완료
                </p>
              </div>

              {/* 실시간 결과 */}
              {collectionResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📈 실시간 수집 현황
                  </h3>
                  <div className="space-y-2">
                    {collectionResults.map((result, index) => (
                      <div
                        key={`result-${result.channelName}-${result.platform}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">
                            {result.channelName}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              result.status === 'collecting'
                                ? 'bg-yellow-100 text-yellow-700'
                                : result.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {result.status === 'collecting'
                              ? '수집중'
                              : result.status === 'completed'
                                ? '완료'
                                : '오류'}
                          </span>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          {result.foundVideos > 0 && (
                            <span>
                              발견: {result.foundVideos}개 | 수집:{' '}
                              {result.collectedVideos}개
                            </span>
                          )}
                          {result.errorMessage && (
                            <span className="text-red-600">
                              {result.errorMessage}
                            </span>
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
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  🎉 수집 완료!
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {totalFound}
                    </p>
                    <p className="text-sm text-green-700">총 발견</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {totalCollected}
                    </p>
                    <p className="text-sm text-blue-700">수집 완료</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">
                      {successCount}
                    </p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📊 채널별 수집 결과
                </h3>
                <div className="space-y-3">
                  {collectionResults.map((result, index) => (
                    <div
                      key={`final-result-${result.channelName}-${result.platform}-${index}`}
                      className={`p-4 rounded-lg border-2 ${
                        result.status === 'completed'
                          ? 'border-green-200 bg-green-50'
                          : result.status === 'error'
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {result.channelName}
                          </h4>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              result.platform === 'YouTube'
                                ? 'bg-red-100 text-red-700'
                                : result.platform === 'TikTok'
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-purple-100 text-purple-700'
                            }`}
                          >
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
                        <p className="mt-2 text-sm text-red-600">
                          ❌ {result.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};

export default BulkCollectionModal;
