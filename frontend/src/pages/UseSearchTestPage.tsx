import React, { useState } from 'react';

const UseSearchTestPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isRealtime, setIsRealtime] = useState(true);

  const sampleData = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape'];
  const filteredData = sampleData.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term && !searchHistory.includes(term)) {
      setSearchHistory(prev => [term, ...prev.slice(0, 4)]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🔎 useSearch Hook Test</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">검색 기능</h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => isRealtime ? handleSearch(e.target.value) : setSearchTerm(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="w-full px-4 py-2 border rounded mb-4"
            />

            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={isRealtime}
                onChange={(e) => setIsRealtime(e.target.checked)}
                className="mr-2"
              />
              실시간 검색
            </label>

            {!isRealtime && (
              <button
                onClick={() => handleSearch(searchTerm)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                검색
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">검색 결과 ({filteredData.length}개)</h2>
            <div className="space-y-2">
              {filteredData.map((item, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">검색 기록</h2>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(term)}
                  className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseSearchTestPage;