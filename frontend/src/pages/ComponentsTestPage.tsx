import React from 'react';
import { useNavigation } from '../app/routing';

/**
 * ComponentCard - 개별 컴포넌트 테스트로 이동하는 카드
 */
interface ComponentCardProps {
  name: string;
  icon: string;
  description: string;
  route: string;
  features?: string[];
  status?: 'stable' | 'beta' | 'new';
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  name,
  icon,
  description,
  route,
  features = [],
  status = 'stable'
}) => {
  const { navigateTo } = useNavigation();

  const statusColors = {
    stable: 'bg-green-100 text-green-800',
    beta: 'bg-yellow-100 text-yellow-800',
    new: 'bg-blue-100 text-blue-800'
  };

  return (
    <button
      onClick={() => navigateTo(route)}
      className="group bg-white p-5 rounded-xl shadow-sm hover:shadow-lg border border-gray-100 hover:border-gray-200 transition-all duration-300 text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        {status !== 'stable' && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {status.toUpperCase()}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        {name}
      </h3>

      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
        {description}
      </p>

      {features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {features.slice(0, 3).map((feature, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              {feature}
            </span>
          ))}
          {features.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              +{features.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
};

/**
 * SectionHeader - 카테고리 섹션 헤더
 */
interface SectionHeaderProps {
  icon: string;
  title: string;
  description: string;
  count?: number;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, description, count }) => (
  <div className="border-l-4 border-blue-500 pl-6 mb-6">
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {count && (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {count}개
        </span>
      )}
    </div>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

/**
 * ComponentsTestPage - 모든 컴포넌트 테스트 통합 페이지
 *
 * 🎯 목적: 카테고리별로 구분된 모든 컴포넌트를 한 페이지에서 조망
 *
 * 구조:
 * - Shared Components: 재사용 가능한 기본 컴포넌트들
 * - Features: 비즈니스 로직을 포함한 기능 컴포넌트들
 * - UI Hooks: 사용자 인터페이스 상태 관리 훅들
 * - API Hooks: 서버 통신 관련 훅들
 */
const ComponentsTestPage: React.FC = () => {
  // 📊 컴포넌트 데이터 정의
  const sharedComponents: ComponentCardProps[] = [
    {
      name: 'SearchBar',
      icon: '🔍',
      description: '통합 검색 기능을 제공하는 컴포넌트',
      route: 'test-searchbar',
      features: ['실시간 검색', '자동완성', '검색 기록', '필터 연동'],
      status: 'stable'
    },
    {
      name: 'VideoCard',
      icon: '🎬',
      description: '비디오 정보를 표시하는 카드 컴포넌트',
      route: 'test-videocard',
      features: ['썸네일', '메타데이터', '선택 모드', '플랫폼 구분'],
      status: 'stable'
    },
    {
      name: 'Modal',
      icon: '📝',
      description: '다양한 크기와 용도의 모달 시스템',
      route: 'test-modal',
      features: ['크기 조절', '애니메이션', '중첩 지원', '접근성'],
      status: 'stable'
    },
    {
      name: 'ActionBar',
      icon: '⚡',
      description: '선택된 항목에 대한 일괄 작업 도구',
      route: 'test-actionbar',
      features: ['다중 선택', '일괄 삭제', '상태 표시', '확인 다이얼로그'],
      status: 'stable'
    },
    {
      name: 'Header',
      icon: '🏠',
      description: '애플리케이션 상단 네비게이션',
      route: 'test-header',
      features: ['로고', '네비게이션', '사용자 메뉴', '반응형'],
      status: 'stable'
    },
    {
      name: 'Sidebar',
      icon: '📋',
      description: '사이드 네비게이션 메뉴',
      route: 'test-sidebar',
      features: ['접기/펼치기', '활성 상태', '라우팅 연동', '아이콘'],
      status: 'stable'
    }
  ];

  const featureComponents: ComponentCardProps[] = [
    {
      name: 'ChannelCard',
      icon: '📺',
      description: '채널 정보를 표시하는 카드',
      route: 'test-channelcard',
      features: ['구독자 수', '플랫폼 표시', '분석 버튼', '썸네일'],
      status: 'stable'
    },
    {
      name: 'ChannelGroupCard',
      icon: '📁',
      description: '채널 그룹 관리 카드',
      route: 'test-channelgroupcard',
      features: ['그룹 색상', '채널 수', '편집 모드', '드래그앤드랍'],
      status: 'stable'
    },
    {
      name: 'BatchForm',
      icon: '⚙️',
      description: '배치 수집 설정 폼',
      route: 'test-batchform',
      features: ['조건 설정', '실시간 검증', '미리보기', '저장/불러오기'],
      status: 'stable'
    },
    {
      name: 'BatchCard',
      icon: '📦',
      description: '배치 수집 결과 카드',
      route: 'test-batchcard',
      features: ['진행 상태', '통계 표시', '결과 다운로드', '재실행'],
      status: 'stable'
    },
    {
      name: 'VideoAnalysisModal',
      icon: '🔬',
      description: '비디오 상세 분석 모달',
      route: 'test-videoanalysismodal',
      features: ['AI 분석', 'Sheets 연동', '키워드 추출', '요약'],
      status: 'stable'
    },
    {
      name: 'BulkCollectionModal',
      icon: '📊',
      description: '대량 수집 설정 모달',
      route: 'test-bulkcollectionmodal',
      features: ['채널 선택', '조건 필터', '진행 모니터링', '결과 미리보기'],
      status: 'stable'
    }
  ];

  const uiHooks: ComponentCardProps[] = [
    {
      name: 'useModal',
      icon: '🎨',
      description: '단일 모달 상태 관리',
      route: 'test-usemodal',
      features: ['열기/닫기', '데이터 전달', '콜백 처리', '상태 보존'],
      status: 'stable'
    },
    {
      name: 'useMultiModal',
      icon: '🎪',
      description: '다중 모달 동시 관리',
      route: 'test-usemultimodal',
      features: ['타입 관리', '중첩 지원', '우선순위', '일괄 제어'],
      status: 'stable'
    },
    {
      name: 'useSearch',
      icon: '🔎',
      description: '검색 기능과 상태 관리',
      route: 'test-usesearch',
      features: ['필드 검색', '대소문자', '실시간', '히스토리'],
      status: 'stable'
    },
    {
      name: 'useSelection',
      icon: '☑️',
      description: '다중 선택 상태 관리',
      route: 'test-useselection',
      features: ['전체 선택', '부분 선택', '토글', '개수 추적'],
      status: 'stable'
    },
    {
      name: 'useFilter',
      icon: '🔽',
      description: '필터링 조건과 상태 관리',
      route: 'test-usefilter',
      features: ['조건 추가', '다중 필터', '초기화', '저장'],
      status: 'stable'
    }
  ];

  const apiHooks: ComponentCardProps[] = [
    {
      name: 'useVideos',
      icon: '🎬',
      description: '비디오 목록 조회 및 관리',
      route: 'test-usevideos',
      features: ['페이징', '필터링', '정렬', '캐싱'],
      status: 'stable'
    },
    {
      name: 'useChannels',
      icon: '📺',
      description: '채널 목록 조회 및 관리',
      route: 'test-usechannels',
      features: ['검색', '분류', '통계', '업데이트'],
      status: 'stable'
    },
    {
      name: 'useAPIStatus',
      icon: '🔌',
      description: 'API 상태 및 할당량 모니터링',
      route: 'test-useapistatus',
      features: ['할당량', '상태 확인', '에러 처리', '자동 갱신'],
      status: 'stable'
    },
    {
      name: 'useServerStatus',
      icon: '🖥️',
      description: '서버 헬스 체크 및 상태',
      route: 'test-useserverstatus',
      features: ['응답 시간', '서버 로드', '에러 모니터링', '알림'],
      status: 'stable'
    },
    {
      name: 'useCollectTrending',
      icon: '🚀',
      description: '트렌딩 수집 실행 및 모니터링',
      route: 'test-usecollecttrending',
      features: ['실시간 진행', '에러 처리', '재시도', '결과 저장'],
      status: 'stable'
    },
    {
      name: 'useTrendingStats',
      icon: '📊',
      description: '트렌딩 통계 조회',
      route: 'test-usetrendingstats',
      features: ['기간별', '채널별', '차트', '내보내기'],
      status: 'beta'
    },
    {
      name: 'useQuotaStatus',
      icon: '📈',
      description: 'API 할당량 상세 추적',
      route: 'test-usequotastatus',
      features: ['실시간', '예측', '알림', '최적화'],
      status: 'beta'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧪 Components & Hooks Laboratory
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            모든 컴포넌트와 Hook을 카테고리별로 정리한 통합 테스트 환경입니다.
            각 항목을 클릭하면 전용 테스트 페이지로 이동합니다.
          </p>
        </div>

        {/* 전체 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">{sharedComponents.length}</div>
            <div className="text-gray-600 text-sm">Shared Components</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-purple-600">{featureComponents.length}</div>
            <div className="text-gray-600 text-sm">Feature Components</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-orange-600">{uiHooks.length}</div>
            <div className="text-gray-600 text-sm">UI Hooks</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{apiHooks.length}</div>
            <div className="text-gray-600 text-sm">API Hooks</div>
          </div>
        </div>

        <div className="space-y-16">
          {/* 🧱 Shared Components 섹션 */}
          <section>
            <SectionHeader
              icon="🧱"
              title="Shared Components"
              description="모든 페이지에서 재사용되는 기본 UI 컴포넌트들입니다. 일관된 디자인과 동작을 보장합니다."
              count={sharedComponents.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sharedComponents.map((component) => (
                <ComponentCard key={component.name} {...component} />
              ))}
            </div>
          </section>

          {/* 🎛️ Features 섹션 */}
          <section>
            <SectionHeader
              icon="🎛️"
              title="Feature Components"
              description="비즈니스 로직을 포함한 기능별 컴포넌트들입니다. 각각의 도메인 특화 기능을 담당합니다."
              count={featureComponents.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featureComponents.map((component) => (
                <ComponentCard key={component.name} {...component} />
              ))}
            </div>
          </section>

          {/* 🎨 UI Hooks 섹션 */}
          <section>
            <SectionHeader
              icon="🎨"
              title="UI Hooks"
              description="사용자 인터페이스 상태 관리를 담당하는 커스텀 훅들입니다. 모달, 검색, 선택 등의 UI 상태를 관리합니다."
              count={uiHooks.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {uiHooks.map((hook) => (
                <ComponentCard key={hook.name} {...hook} />
              ))}
            </div>
          </section>

          {/* 🌐 API Hooks 섹션 */}
          <section>
            <SectionHeader
              icon="🌐"
              title="API Hooks"
              description="서버와의 통신과 데이터 관리를 담당하는 커스텀 훅들입니다. 실시간 상태 동기화와 에러 처리를 포함합니다."
              count={apiHooks.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {apiHooks.map((hook) => (
                <ComponentCard key={hook.name} {...hook} />
              ))}
            </div>
          </section>
        </div>

        {/* 푸터 정보 */}
        <div className="mt-16 p-6 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 사용 가이드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">🎯 각 카테고리별 특징</h4>
              <ul className="space-y-1">
                <li>• <strong>Shared</strong>: 범용적이고 재사용 가능한 컴포넌트</li>
                <li>• <strong>Features</strong>: 특정 기능에 특화된 컴포넌트</li>
                <li>• <strong>UI Hooks</strong>: 브라우저 내에서만 동작하는 상태 관리</li>
                <li>• <strong>API Hooks</strong>: 서버 통신이 필요한 데이터 관리</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">🚀 상태 표시</h4>
              <ul className="space-y-1">
                <li>• <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">STABLE</span> 안정적이고 완성된 기능</li>
                <li>• <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">BETA</span> 테스트 중인 실험적 기능</li>
                <li>• <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">NEW</span> 최근 추가된 새로운 기능</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ 이 페이지는 개발 환경에서만 접근 가능합니다. 각 테스트 페이지에서 실제 기능을 확인하고 디버깅할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentsTestPage;