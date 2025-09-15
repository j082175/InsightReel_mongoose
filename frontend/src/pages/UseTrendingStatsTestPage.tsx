import React, { useState } from 'react';

const UseTrendingStatsTestPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalVideos: 1250,
    totalViews: 45600000,
    avgViews: 36480,
    platformBreakdown: { YOUTUBE: 850, INSTAGRAM: 250, TIKTOK: 150 },
    categoryBreakdown: { Tech: 400, Food: 300, Entertainment: 350, Education: 200 }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">📊 useTrendingStats Hook Test</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">전체 통계</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalVideos}</div>
                <div className="text-sm text-gray-600">총 영상</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalViews.toLocaleString()}</div>
                <div className="text-sm text-gray-600">총 조회수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.avgViews.toLocaleString()}</div>
                <div className="text-sm text-gray-600">평균 조회수</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded border">
              <h2 className="text-lg font-semibold mb-4">플랫폼별 분포</h2>
              <div className="space-y-3">
                {Object.entries(stats.platformBreakdown).map(([platform, count]) => (
                  <div key={platform} className="flex justify-between items-center">
                    <span>{platform}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalVideos) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded border">
              <h2 className="text-lg font-semibold mb-4">카테고리별 분포</h2>
              <div className="space-y-3">
                {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span>{category}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalVideos) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseTrendingStatsTestPage;