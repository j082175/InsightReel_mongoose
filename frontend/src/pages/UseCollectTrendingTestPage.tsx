import React, { useState } from 'react';

const UseCollectTrendingTestPage: React.FC = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ found: 0, collected: 0, errors: 0 });

  const startCollection = () => {
    setIsCollecting(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsCollecting(false);
          setResults({ found: 45, collected: 42, errors: 3 });
        }
        return newProgress;
      });
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🚀 useCollectTrending Hook Test</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">수집 상태</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>진행률:</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button
                onClick={startCollection}
                disabled={isCollecting}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {isCollecting ? '수집 중...' : '트렌딩 수집 시작'}
              </button>
            </div>
          </div>

          {results.found > 0 && (
            <div className="bg-white p-6 rounded border">
              <h2 className="text-lg font-semibold mb-4">수집 결과</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.found}</div>
                  <div className="text-sm text-gray-600">발견</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.collected}</div>
                  <div className="text-sm text-gray-600">수집</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                  <div className="text-sm text-gray-600">오류</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UseCollectTrendingTestPage;