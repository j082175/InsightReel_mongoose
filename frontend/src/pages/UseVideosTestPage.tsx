import React, { useState, useEffect } from 'react';

const UseVideosTestPage: React.FC = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const mockVideos = Array.from({ length: 10 }, (_, i) => ({
    id: `video-${i + 1}`,
    title: `Test Video ${i + 1}`,
    views: Math.floor(Math.random() * 1000000),
    platform: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'][Math.floor(Math.random() * 3)]
  }));

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);

    // 실제 API 호출 시뮬레이션
    setTimeout(() => {
      setVideos(mockVideos);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    fetchVideos();
  }, [page]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🎬 useVideos Hook Test</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">API 상태</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${loading ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {loading ? 'Loading...' : 'Ready'}
                </div>
                <div className="text-sm text-gray-600">상태</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{videos.length}</div>
                <div className="text-sm text-gray-600">비디오 수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{page}</div>
                <div className="text-sm text-gray-600">페이지</div>
              </div>
            </div>

            <div className="flex gap-4 mt-4">
              <button
                onClick={fetchVideos}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                새로고침
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-green-500 text-white rounded"
              >
                다음 페이지
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">비디오 목록</h2>
            {loading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : (
              <div className="space-y-3">
                {videos.map(video => (
                  <div key={video.id} className="p-3 bg-gray-50 rounded">
                    <div className="font-medium">{video.title}</div>
                    <div className="text-sm text-gray-600">
                      {video.platform} • {video.views.toLocaleString()} views
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseVideosTestPage;