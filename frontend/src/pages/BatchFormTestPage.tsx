import React, { useState } from 'react';
import BatchForm from '../features/batch-management/ui/BatchForm';

interface BatchFormData {
  name: string;
  description: string;
  collectionType: 'group' | 'channels';
  selectedGroups: string[];
  selectedChannels: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews: number;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords: string[];
    excludeKeywords: string[];
  };
}

/**
 * BatchFormTestPage - BatchForm 컴포넌트 전용 테스트 페이지
 *
 * 🎯 목적: BatchForm의 모든 입력 필드와 기능을 집중적으로 테스트
 *
 * 테스트 항목:
 * 1. 폼 필드 입력 및 검증
 * 2. 수집 조건 설정 (기간, 조회수, 영상 타입)
 * 3. 채널 그룹 및 개별 채널 선택
 * 4. 키워드 포함/제외 설정
 * 5. 폼 제출 및 검증
 * 6. 실시간 미리보기 및 저장/불러오기
 */
const BatchFormTestPage: React.FC = () => {
  // 🎛️ 테스트 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testActions, setTestActions] = useState<string[]>([]);
  const [savedForms, setSavedForms] = useState<BatchFormData[]>([]);

  // BatchForm 데이터 상태
  const [formData, setFormData] = useState<BatchFormData>({
    name: '',
    description: '',
    collectionType: 'group',
    selectedGroups: [],
    selectedChannels: [],
    criteria: {
      daysBack: 7,
      minViews: 10000,
      maxViews: 10000000,
      includeShorts: true,
      includeMidform: true,
      includeLongForm: true,
      keywords: [],
      excludeKeywords: [],
    },
  });

  // 테스트 액션 로그 추가
  const addTestLog = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestActions((prev) => [`[${timestamp}] ${action}`, ...prev.slice(0, 9)]);
  };

  // 테스트용 채널 그룹 데이터
  const testChannelGroups = [
    { _id: 'group1', name: '테크 리뷰어', color: '#EF4444' },
    { _id: 'group2', name: '푸드 크리에이터', color: '#10B981' },
    { _id: 'group3', name: 'K-POP 댄스', color: '#8B5CF6' },
    { _id: 'group4', name: '게임 실황', color: '#F59E0B' },
    { _id: 'group5', name: '교육 콘텐츠', color: '#3B82F6' },
  ];

  // 테스트용 채널 데이터
  const testChannels = [
    { _id: 'ch1', name: '노마드 코더' },
    { _id: 'ch2', name: '백종원의 요리비책' },
    { _id: 'ch3', name: 'BLACKPINK' },
    { _id: 'ch4', name: '우왁굳' },
    { _id: 'ch5', name: 'EBS' },
    { _id: 'ch6', name: '침착맨' },
    { _id: 'ch7', name: '쯔양' },
    { _id: 'ch8', name: 'BTS' },
  ];

  // 테스트용 프리셋 데이터
  const presetForms: BatchFormData[] = [
    {
      name: '숏폼 트렌딩 수집',
      description: '최근 7일간 1만 조회수 이상의 숏폼 콘텐츠만 수집',
      collectionType: 'group',
      selectedGroups: ['group1', 'group3'],
      selectedChannels: [],
      criteria: {
        daysBack: 7,
        minViews: 10000,
        maxViews: 5000000,
        includeShorts: true,
        includeMidform: false,
        includeLongForm: false,
        keywords: ['트렌드', '바이럴', '숏폼'],
        excludeKeywords: ['광고', '협찬'],
      },
    },
    {
      name: '롱폼 교육 콘텐츠 수집',
      description: '최근 30일간 교육용 롱폼 콘텐츠 전문 수집',
      collectionType: 'channels',
      selectedGroups: [],
      selectedChannels: ['ch1', 'ch5'],
      criteria: {
        daysBack: 30,
        minViews: 5000,
        maxViews: 10000000,
        includeShorts: false,
        includeMidform: true,
        includeLongForm: true,
        keywords: ['강의', '교육', '튜토리얼', '설명'],
        excludeKeywords: ['리액션', '브이로그'],
      },
    },
    {
      name: '전체 콘텐츠 대량 수집',
      description: '모든 타입의 콘텐츠를 포괄적으로 수집',
      collectionType: 'group',
      selectedGroups: ['group1', 'group2', 'group3', 'group4'],
      selectedChannels: [],
      criteria: {
        daysBack: 14,
        minViews: 1000,
        maxViews: 50000000,
        includeShorts: true,
        includeMidform: true,
        includeLongForm: true,
        keywords: [],
        excludeKeywords: ['ASMR'],
      },
    },
  ];

  // 이벤트 핸들러
  const handleOpenForm = (preset?: BatchFormData) => {
    if (preset) {
      setFormData(preset);
      addTestLog(`프리셋 로드: ${preset.name}`);
    } else {
      // 기본값으로 리셋
      setFormData({
        name: '',
        description: '',
        collectionType: 'group',
        selectedGroups: [],
        selectedChannels: [],
        criteria: {
          daysBack: 7,
          minViews: 10000,
          maxViews: 10000000,
          includeShorts: true,
          includeMidform: true,
          includeLongForm: true,
          keywords: [],
          excludeKeywords: [],
        },
      });
      addTestLog('새 폼 열기');
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    addTestLog('폼 닫기');
  };

  const handleSubmit = async (data: BatchFormData) => {
    addTestLog(`폼 제출 시작: ${data.name}`);
    setIsSubmitting(true);

    // 제출 시뮬레이션
    setTimeout(() => {
      setSavedForms((prev) => [
        ...prev,
        { ...data, name: data.name || `배치 ${Date.now()}` },
      ]);
      setIsSubmitting(false);
      setIsFormOpen(false);
      addTestLog(`폼 제출 완료: ${data.name || '무제'}`);
    }, 2000);
  };

  const loadPreset = (preset: BatchFormData) => {
    setFormData(preset);
    setIsFormOpen(true);
    addTestLog(`프리셋 적용: ${preset.name}`);
  };

  const clearSavedForms = () => {
    setSavedForms([]);
    addTestLog('저장된 폼 목록 초기화');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 테스트 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            ⚙️ BatchForm Component Test
          </h1>
          <p className="text-gray-600 mt-1">
            BatchForm 컴포넌트의 모든 입력 필드와 기능을 테스트합니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 테스트 컨트롤 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎛️ 테스트 컨트롤
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">폼 열기</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleOpenForm()}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    새 배치 폼 열기
                  </button>
                  <button
                    onClick={() => loadPreset(presetForms[0])}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    숏폼 수집 프리셋
                  </button>
                  <button
                    onClick={() => loadPreset(presetForms[1])}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    교육 콘텐츠 프리셋
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">폼 상태</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">폼 열림:</span>
                    <span
                      className={`font-medium ${isFormOpen ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {isFormOpen ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">제출 중:</span>
                    <span
                      className={`font-medium ${isSubmitting ? 'text-orange-600' : 'text-gray-400'}`}
                    >
                      {isSubmitting ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">저장된 폼:</span>
                    <span className="font-medium text-blue-600">
                      {savedForms.length}개
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">빠른 액션</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addTestLog('폼 검증 테스트')}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    폼 검증 테스트
                  </button>
                  <button
                    onClick={clearSavedForms}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    저장 목록 초기화
                  </button>
                  <button
                    onClick={() => setTestActions([])}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    로그 지우기
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 프리셋 템플릿 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 프리셋 템플릿
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {presetForms.map((preset, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {preset.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {preset.description}
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">기간:</span>
                      <span className="text-gray-700">
                        {preset.criteria.daysBack}일
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">조회수:</span>
                      <span className="text-gray-700">
                        {preset.criteria.minViews.toLocaleString()} ~{' '}
                        {preset.criteria.maxViews.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">타입:</span>
                      <span className="text-gray-700">
                        {[
                          preset.criteria.includeShorts && 'SHORT',
                          preset.criteria.includeMidform && 'MID',
                          preset.criteria.includeLongForm && 'LONG',
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => loadPreset(preset)}
                    className="w-full mt-3 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    적용하기
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 저장된 폼 목록 */}
          {savedForms.length > 0 && (
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                💾 저장된 폼 목록
              </h2>

              <div className="space-y-3">
                {savedForms.map((form, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {form.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {form.description}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          {form.collectionType === 'group'
                            ? `그룹 ${form.selectedGroups.length}개`
                            : `채널 ${form.selectedChannels.length}개`}{' '}
                          | {form.criteria.daysBack}일 |{' '}
                          {form.criteria.minViews.toLocaleString()}+ 조회수
                        </div>
                      </div>
                      <button
                        onClick={() => loadPreset(form)}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      >
                        다시 열기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 테스트 로그 */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 테스트 로그
            </h2>

            <div className="bg-gray-50 p-4 rounded h-64 overflow-y-auto">
              {testActions.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  BatchForm과 상호작용하면 로그가 여기에 표시됩니다.
                </p>
              ) : (
                <div className="space-y-1">
                  {testActions.map((action, index) => (
                    <div
                      key={index}
                      className="text-sm font-mono text-gray-700"
                    >
                      {action}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 사용법 안내 */}
          <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">
              💡 사용법 안내
            </h2>

            <div className="space-y-3 text-sm text-blue-800">
              <p>
                <strong>1. 폼 열기:</strong> "새 배치 폼 열기" 버튼으로 빈 폼을
                열거나 프리셋을 선택하세요.
              </p>
              <p>
                <strong>2. 프리셋 활용:</strong> 미리 정의된 설정 템플릿을
                사용해 빠르게 폼을 구성할 수 있습니다.
              </p>
              <p>
                <strong>3. 입력 테스트:</strong> 폼의 모든 필드(이름, 조건, 채널
                선택 등)를 입력해보세요.
              </p>
              <p>
                <strong>4. 제출 테스트:</strong> 폼 제출 시 2초간 로딩 상태를
                시뮬레이션합니다.
              </p>
              <p>
                <strong>5. 저장/불러오기:</strong> 제출된 폼은 저장되고 나중에
                다시 불러올 수 있습니다.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* BatchForm 컴포넌트 */}
      <BatchForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        channelGroups={testChannelGroups}
        channels={testChannels}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default BatchFormTestPage;
