import React, { useState } from 'react';

const UseChannelsTestPage: React.FC = () => {
  const [channels, setChannels] = useState([
    { id: 1, name: 'Tech Channel', platform: 'YOUTUBE', subscribers: 100000 },
    { id: 2, name: 'Food Blog', platform: 'INSTAGRAM', subscribers: 50000 },
    { id: 3, name: 'Dance Moves', platform: 'TIKTOK', subscribers: 200000 }
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">📺 useChannels Hook Test</h1>
        <div className="bg-white p-6 rounded border">
          <h2 className="text-lg font-semibold mb-4">채널 목록 ({channels.length}개)</h2>
          <div className="space-y-3">
            {channels.map(channel => (
              <div key={channel.id} className="p-3 bg-gray-50 rounded">
                <div className="font-medium">{channel.name}</div>
                <div className="text-sm text-gray-600">
                  {channel.platform} • {channel.subscribers.toLocaleString()} subscribers
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseChannelsTestPage;