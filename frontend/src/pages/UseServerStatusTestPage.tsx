import React, { useState } from 'react';

const UseServerStatusTestPage: React.FC = () => {
  const [serverStatus, setServerStatus] = useState({
    status: 'online',
    responseTime: 125,
    uptime: '99.9%',
    lastCheck: new Date().toLocaleString()
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🖥️ useServerStatus Hook Test</h1>
        <div className="bg-white p-6 rounded border">
          <h2 className="text-lg font-semibold mb-4">서버 상태</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                serverStatus.status === 'online' ? 'text-green-600' : 'text-red-600'
              }`}>
                {serverStatus.status === 'online' ? '🟢' : '🔴'}
              </div>
              <div className="text-sm text-gray-600">상태</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{serverStatus.responseTime}ms</div>
              <div className="text-sm text-gray-600">응답시간</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{serverStatus.uptime}</div>
              <div className="text-sm text-gray-600">가동률</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-gray-600">{serverStatus.lastCheck}</div>
              <div className="text-sm text-gray-600">마지막 확인</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseServerStatusTestPage;