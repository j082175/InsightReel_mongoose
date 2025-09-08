import React, { useState, useEffect } from 'react';

interface TrendData {
  id: number;
  keyword: string;
  platform: 'YouTube' | 'TikTok' | 'Instagram' | 'All';
  growth: number;
  volume: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  relatedKeywords: string[];
  suggestedTopics: string[];
}

const ContentDiscoveryPage: React.FC = () => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mockTrends: TrendData[] = [
    {
      id: 1,
      keyword: 'AI 그림 생성',
      platform: 'YouTube',
      growth: 234,
      volume: 45000,
      difficulty: 'Medium',
      category: '기술/IT',
      relatedKeywords: ['미드저니', 'Stable Diffusion', 'DALL-E', '인공지능'],
      suggestedTopics: ['AI 그림 툴 비교', '무료 AI 그림 생성 방법', 'AI 아트 창작 과정']
    },
    {
      id: 2,
      keyword: '홈 카페',
      platform: 'Instagram',
      growth: 189,
      volume: 128000,
      difficulty: 'Easy',
      category: '라이프스타일',
      relatedKeywords: ['커피', '원두', '라떼아트', '홈브루잉'],
      suggestedTopics: ['집에서 카페 음료 만들기', '원두 추천', '홈카페 인테리어']
    },
    {
      id: 3,
      keyword: '챗GPT 활용법',
      platform: 'YouTube',
      growth: 412,
      volume: 89000,
      difficulty: 'Medium',
      category: '교육/학습',
      relatedKeywords: ['OpenAI', '프롬프트', '자동화', 'AI 도구'],
      suggestedTopics: ['업무 자동화', '학습 도우미 활용', 'ChatGPT 프롬프트 팁']
    },
    {
      id: 4,
      keyword: '요가 루틴',
      platform: 'TikTok',
      growth: 78,
      volume: 234000,
      difficulty: 'Easy',
      category: '건강/피트니스',
      relatedKeywords: ['명상', '스트레칭', '필라테스', '홈트'],
      suggestedTopics: ['초보자 요가', '아침 요가 루틴', '스트레스 해소 요가']
    },
    {
      id: 5,
      keyword: '투자 공부',
      platform: 'YouTube',
      growth: 156,
      volume: 67000,
      difficulty: 'Hard',
      category: '재테크',
      relatedKeywords: ['주식', '부동산', '펀드', '경제'],
      suggestedTopics: ['초보자 투자 가이드', '분산투자 전략', '경제 지표 읽는 법']
    }
  ];

  useEffect(() => {
    setTrends(mockTrends);
  }, []);

  const filteredTrends = trends.filter(trend => {
    const matchesSearch = trend.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trend.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'All' || trend.platform === platformFilter;
    const matchesDifficulty = difficultyFilter === 'All' || trend.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === 'All' || trend.category === categoryFilter;
    return matchesSearch && matchesPlatform && matchesDifficulty && matchesCategory;
  });

  const allCategories = Array.from(new Set(trends.map(t => t.category)));

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAnalyzeTrend = (keyword: string) => {
    setIsAnalyzing(true);
    // 실제로는 API 호출
    setTimeout(() => {
      setIsAnalyzing(false);
      alert(`"${keyword}" 트렌드 분석 완료! (실제로는 상세 분석 모달이 열립니다)`);
    }, 2000);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🔍 소재 발굴</h1>
        <p className="text-gray-600">실시간 트렌드를 분석하여 새로운 콘텐츠 아이디어를 발견하세요</p>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">발견된 트렌드</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{trends.length}</p>
          <p className="mt-1 text-sm text-green-600">+12개 오늘</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">평균 성장률</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {Math.round(trends.reduce((sum, t) => sum + t.growth, 0) / trends.length)}%
          </p>
          <p className="mt-1 text-sm text-gray-600">지난 주 대비</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">쉬운 난이도</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {trends.filter(t => t.difficulty === 'Easy').length}
          </p>
          <p className="mt-1 text-sm text-green-600">진입 장벽 낮음</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">총 검색량</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(trends.reduce((sum, t) => sum + t.volume, 0))}
          </p>
          <p className="mt-1 text-sm text-gray-600">월간 검색</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white rounded-lg shadow">
        {/* 필터 및 검색 */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="키워드, 카테고리 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md w-64"
            />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="border-gray-300 rounded-md"
            >
              <option value="All">모든 플랫폼</option>
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram">Instagram</option>
            </select>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="border-gray-300 rounded-md"
            >
              <option value="All">모든 난이도</option>
              <option value="Easy">쉬움</option>
              <option value="Medium">보통</option>
              <option value="Hard">어려움</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border-gray-300 rounded-md"
            >
              <option value="All">모든 카테고리</option>
              {allCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setIsAnalyzing(true);
                setTimeout(() => setIsAnalyzing(false), 3000);
              }}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isAnalyzing ? '분석 중...' : '🔄 새로고침'}
            </button>
          </div>
          <div className="text-sm text-gray-500">
            총 {filteredTrends.length}개 트렌드
          </div>
        </div>

        {/* 트렌드 목록 */}
        <div className="divide-y divide-gray-200">
          {filteredTrends.map((trend) => (
            <div key={trend.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {trend.keyword}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      trend.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                      trend.platform === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                      trend.platform === 'Instagram' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {trend.platform}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(trend.difficulty)}`}>
                      {trend.difficulty === 'Easy' ? '쉬움' : 
                       trend.difficulty === 'Medium' ? '보통' : '어려움'}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {trend.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-medium">↗ +{trend.growth}%</span>
                      <span>성장률</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{formatNumber(trend.volume)}</span>
                      <span>월간 검색</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">연관 키워드</h4>
                    <div className="flex flex-wrap gap-1">
                      {trend.relatedKeywords.map((keyword, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">추천 주제</h4>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {trend.suggestedTopics.slice(0, 2).map((topic, index) => (
                        <li key={index}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleAnalyzeTrend(trend.keyword)}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    상세 분석
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                    아이디어 생성
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTrends.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">🔍</p>
            <p className="mt-2">조건에 맞는 트렌드가 없습니다.</p>
          </div>
        )}
      </div>
      
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="text-lg font-medium text-gray-900">트렌드 분석 중...</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ContentDiscoveryPage;