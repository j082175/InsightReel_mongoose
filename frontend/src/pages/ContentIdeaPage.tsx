import React, { useState, useEffect } from 'react';
import { formatViews } from '../shared/utils';

interface ContentIdea {
  id: number;
  title: string;
  description: string;
  category: string;
  platform: 'YouTube' | 'TikTok' | 'Instagram' | 'All';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  estimatedViews: number;
  confidence: number;
  createdAt: string;
  status: 'new' | 'saved' | 'used';
  script?: string;
}

const ContentIdeaPage: React.FC = () => {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showIdeaModal, setShowIdeaModal] = useState(false);

  const mockIdeas: ContentIdea[] = [
    {
      id: 1,
      title: '5분 만에 만드는 ChatGPT 자동화 워크플로우',
      description: 'ChatGPT API를 활용해서 반복적인 업무를 자동화하는 실용적인 방법들을 소개합니다.',
      category: '기술/IT',
      platform: 'YouTube',
      difficulty: 'Medium',
      tags: ['ChatGPT', '자동화', '업무효율', 'API'],
      estimatedViews: 45000,
      confidence: 87,
      createdAt: '2024-01-15T10:30:00',
      status: 'new',
      script: '안녕하세요! 오늘은 ChatGPT를 활용해서 업무를 자동화하는 방법에 대해 알아보겠습니다...'
    },
    {
      id: 2,
      title: '홈카페 달인이 되는 원두 고르기 꿀팁',
      description: '집에서도 카페처럼 맛있는 커피를 만들 수 있는 원두 선택부터 추출까지의 모든 과정',
      category: '라이프스타일',
      platform: 'Instagram',
      difficulty: 'Easy',
      tags: ['커피', '원두', '홈카페', '라이프스타일'],
      estimatedViews: 28000,
      confidence: 92,
      createdAt: '2024-01-15T09:15:00',
      status: 'saved'
    },
    {
      id: 3,
      title: '10분 아침 요가로 하루 에너지 충전하기',
      description: '바쁜 일상 속에서도 할 수 있는 간단하지만 효과적인 아침 요가 루틴을 제안합니다.',
      category: '건강/피트니스',
      platform: 'TikTok',
      difficulty: 'Easy',
      tags: ['요가', '아침루틴', '건강', '스트레칭'],
      estimatedViews: 67000,
      confidence: 85,
      createdAt: '2024-01-14T18:00:00',
      status: 'used'
    },
    {
      id: 4,
      title: '초보자를 위한 주식 투자 첫걸음',
      description: '주식 투자를 처음 시작하는 사람들을 위한 기초 개념부터 실전 투자 방법까지',
      category: '재테크',
      platform: 'YouTube',
      difficulty: 'Hard',
      tags: ['주식', '투자', '재테크', '초보자'],
      estimatedViews: 89000,
      confidence: 78,
      createdAt: '2024-01-14T15:20:00',
      status: 'new'
    }
  ];

  useEffect(() => {
    setIdeas(mockIdeas);
  }, []);

  const filteredIdeas = ideas.filter(idea => {
    const matchesPlatform = platformFilter === 'All' || idea.platform === platformFilter;
    const matchesCategory = categoryFilter === 'All' || idea.category === categoryFilter;
    return matchesPlatform && matchesCategory;
  });

  const allCategories = Array.from(new Set(ideas.map(idea => idea.category)));


  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'saved': return 'bg-indigo-100 text-indigo-700';
      case 'used': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return '새로운';
      case 'saved': return '저장됨';
      case 'used': return '사용됨';
      default: return status;
    }
  };

  const generateIdea = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // 실제로는 AI API 호출
    setTimeout(() => {
      const newIdea: ContentIdea = {
        id: ideas.length + 1,
        title: `${prompt}에 관한 콘텐츠 아이디어`,
        description: `${prompt}를 주제로 한 창의적이고 실용적인 콘텐츠 아이디어입니다.`,
        category: '기타',
        platform: 'YouTube',
        difficulty: 'Medium',
        tags: [prompt, '새로운', '아이디어'],
        estimatedViews: Math.floor(Math.random() * 100000) + 10000,
        confidence: Math.floor(Math.random() * 30) + 70,
        createdAt: new Date().toISOString(),
        status: 'new'
      };
      
      setIdeas([newIdea, ...ideas]);
      setPrompt('');
      setIsGenerating(false);
    }, 2000);
  };

  const updateIdeaStatus = (id: number, status: 'saved' | 'used') => {
    setIdeas(ideas.map(idea => 
      idea.id === id ? { ...idea, status } : idea
    ));
  };

  const IdeaDetailModal: React.FC = () => {
    if (!selectedIdea) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">아이디어 상세</h2>
            <button 
              onClick={() => setSelectedIdea(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedIdea.title}
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedIdea.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                  selectedIdea.platform === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                  selectedIdea.platform === 'Instagram' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedIdea.platform}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(selectedIdea.difficulty)}`}>
                  {selectedIdea.difficulty === 'Easy' ? '쉬움' : 
                   selectedIdea.difficulty === 'Medium' ? '보통' : '어려움'}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedIdea.status)}`}>
                  {getStatusText(selectedIdea.status)}
                </span>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                  {selectedIdea.category}
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">설명</h4>
              <p className="text-gray-600">{selectedIdea.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">예상 조회수</h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatViews(selectedIdea.estimatedViews)}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">신뢰도</h4>
                <p className="text-2xl font-bold text-indigo-600">
                  {selectedIdea.confidence}%
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">태그</h4>
              <div className="flex flex-wrap gap-1">
                {selectedIdea.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            
            {selectedIdea.script && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">스크립트 초안</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                  {selectedIdea.script}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button 
              onClick={() => setSelectedIdea(null)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              닫기
            </button>
            {selectedIdea.status === 'new' && (
              <button 
                onClick={() => {
                  updateIdeaStatus(selectedIdea.id, 'saved');
                  setSelectedIdea(null);
                }}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                저장하기
              </button>
            )}
            <button className="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700">
              스크립트 생성
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">💡 콘텐츠 아이디어</h1>
        <p className="text-gray-600">AI를 활용하여 창의적인 콘텐츠 아이디어를 생성하고 관리하세요</p>
      </div>

      {/* 통계 카드들 */}
      <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">총 아이디어</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{ideas.length}</p>
          <p className="mt-1 text-sm text-green-600">+3개 오늘</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">새로운 아이디어</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {ideas.filter(i => i.status === 'new').length}
          </p>
          <p className="mt-1 text-sm text-gray-600">검토 대기</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">저장된 아이디어</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {ideas.filter(i => i.status === 'saved').length}
          </p>
          <p className="mt-1 text-sm text-gray-600">활용 가능</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">평균 신뢰도</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {Math.round(ideas.reduce((sum, i) => sum + i.confidence, 0) / ideas.length)}%
          </p>
          <p className="mt-1 text-sm text-gray-600">AI 분석</p>
        </div>
      </div>

      {/* 아이디어 생성 섹션 */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI 아이디어 생성</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="어떤 주제로 콘텐츠를 만들고 싶나요? (예: 요리, 여행, 기술 등)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              disabled={isGenerating}
            />
            <button
              onClick={generateIdea}
              disabled={isGenerating || !prompt.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? '생성 중...' : '아이디어 생성'}
            </button>
          </div>
        </div>
      </div>

      {/* 아이디어 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">생성된 아이디어</h2>
            <div className="flex gap-4">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="border-gray-300 rounded-md text-sm"
              >
                <option value="All">모든 플랫폼</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram">Instagram</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border-gray-300 rounded-md text-sm"
              >
                <option value="All">모든 카테고리</option>
                {allCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            총 {filteredIdeas.length}개 아이디어
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredIdeas.map((idea) => (
            <div key={idea.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {idea.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      idea.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                      idea.platform === 'TikTok' ? 'bg-pink-100 text-pink-700' :
                      idea.platform === 'Instagram' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {idea.platform}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(idea.difficulty)}`}>
                      {idea.difficulty === 'Easy' ? '쉬움' : 
                       idea.difficulty === 'Medium' ? '보통' : '어려움'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(idea.status)}`}>
                      {getStatusText(idea.status)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{idea.description}</p>
                  
                  <div className="flex items-center gap-6 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-medium">
                        {formatViews(idea.estimatedViews)}
                      </span>
                      <span>예상 조회수</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{idea.confidence}%</span>
                      <span>신뢰도</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {idea.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => setSelectedIdea(idea)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                  >
                    상세 보기
                  </button>
                  {idea.status === 'new' && (
                    <button
                      onClick={() => updateIdeaStatus(idea.id, 'saved')}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      저장하기
                    </button>
                  )}
                  {idea.status === 'saved' && (
                    <button
                      onClick={() => updateIdeaStatus(idea.id, 'used')}
                      className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      사용됨
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredIdeas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">💡</p>
            <p className="mt-2">아직 생성된 아이디어가 없습니다.</p>
            <p className="text-sm">위의 입력창에 주제를 입력해서 아이디어를 생성해보세요!</p>
          </div>
        )}
      </div>

      {/* 로딩 오버레이 */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="text-lg font-medium text-gray-900">AI가 아이디어를 생성 중...</span>
            </div>
          </div>
        </div>
      )}

      {/* 아이디어 상세 모달 */}
      <IdeaDetailModal />
    </main>
  );
};

export default ContentIdeaPage;