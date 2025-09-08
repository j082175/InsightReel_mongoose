import React, { useState } from 'react';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ChannelManagementPage from './pages/ChannelManagementPage';
import VideoArchivePage from './pages/VideoArchivePage';
import ContentDiscoveryPage from './pages/ContentDiscoveryPage';
import ContentIdeaPage from './pages/ContentIdeaPage';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'channels': return <ChannelManagementPage />;
      case 'archive': return <VideoArchivePage />;
      case 'discovery': return <ContentDiscoveryPage />;
      case 'ideas': return <ContentIdeaPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
    </div>
  );
}

export default App;