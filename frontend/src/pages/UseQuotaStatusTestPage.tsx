import React, { useState } from 'react';

const UseQuotaStatusTestPage: React.FC = () => {
  const [quotaStatus, setQuotaStatus] = useState({
    youtube: { used: 8500, limit: 10000, resetTime: '23:45:12', prediction: 9200 },
    gemini: { used: 1200, limit: 1500, resetTime: '23:45:12', prediction: 1450 },
    sheets: { used: 450, limit: 500, resetTime: '23:45:12', prediction: 480 }
  });

  const getStatusColor = (used: number, limit: number) => {
    const ratio = used / limit;
    if (ratio < 0.7) return 'text-green-600';
    if (ratio < 0.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBarColor = (used: number, limit: number) => {
    const ratio = used / limit;
    if (ratio < 0.7) return 'bg-green-500';
    if (ratio < 0.9) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">📈 useQuotaStatus Hook Test</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">API 할당량 상태</h2>
            <div className="space-y-6">
              {Object.entries(quotaStatus).map(([api, status]) => (
                <div key={api} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium capitalize">{api} API</h3>
                    <span className={`font-mono text-sm ${getStatusColor(status.used, status.limit)}`}>
                      {((status.used / status.limit) * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>사용량: {status.used.toLocaleString()}</span>
                      <span>한도: {status.limit.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getBarColor(status.used, status.limit)}`}
                        style={{ width: `${(status.used / status.limit) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>예상 사용량: {status.prediction.toLocaleString()}</span>
                      <span>초기화: {status.resetTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">할당량 예측</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(quotaStatus).map(([api, status]) => {
                const remaining = status.limit - status.used;
                const predicted = status.prediction - status.used;
                const willExceed = status.prediction > status.limit;

                return (
                  <div key={api} className="p-4 bg-gray-50 rounded">
                    <h3 className="font-medium capitalize mb-2">{api}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>남은 할당량:</span>
                        <span className="font-mono">{remaining}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>예상 추가 사용:</span>
                        <span className="font-mono">{predicted}</span>
                      </div>
                      <div className={`flex justify-between font-medium ${
                        willExceed ? 'text-red-600' : 'text-green-600'
                      }`}>
                        <span>상태:</span>
                        <span>{willExceed ? '초과 예상' : '안전'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-medium text-yellow-800 mb-2">⚠️ 할당량 알림</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Sheets API: 90% 사용량 초과 (450/500)</li>
              <li>• Gemini API: 80% 사용량 도달 (1200/1500)</li>
              <li>• 일일 초기화까지 남은 시간: 2시간 45분</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseQuotaStatusTestPage;