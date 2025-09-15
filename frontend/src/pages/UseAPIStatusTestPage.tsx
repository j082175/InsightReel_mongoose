import React, { useState } from 'react';

const UseAPIStatusTestPage: React.FC = () => {
  const [apiStatus, setApiStatus] = useState({
    youtube: { quota: 8500, limit: 10000, status: 'healthy' },
    gemini: { quota: 1200, limit: 1500, status: 'warning' },
    sheets: { quota: 450, limit: 500, status: 'critical' }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🔌 useAPIStatus Hook Test</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(apiStatus).map(([api, status]) => (
            <div key={api} className="bg-white p-6 rounded border">
              <h2 className="text-lg font-semibold mb-4 capitalize">{api} API</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Quota Used:</span>
                  <span>{status.quota}/{status.limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      status.status === 'healthy' ? 'bg-green-500' :
                      status.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(status.quota / status.limit) * 100}%` }}
                  />
                </div>
                <div className={`text-sm font-medium ${
                  status.status === 'healthy' ? 'text-green-600' :
                  status.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {status.status.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UseAPIStatusTestPage;