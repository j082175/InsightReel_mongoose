import React, { useState, createContext, useContext } from 'react';
import { CollectionBatch, Video } from './types';
import { SettingsProvider } from './contexts/SettingsContext';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ChannelManagementPage from './pages/ChannelManagementPage';
import VideoArchivePage from './pages/VideoArchivePage';
import ContentDiscoveryPage from './pages/ContentDiscoveryPage';
import ContentIdeaPage from './pages/ContentIdeaPage';
import TrendingVideosPage from './pages/TrendingVideosPage';
import BatchManagementPage from './pages/BatchManagementPage';
import TrendingDashboardPage from './pages/TrendingDashboardPage';
import TrendingCollectionPage from './pages/TrendingCollectionPage';

interface AppContextType {
  collectionBatches: CollectionBatch[];
  collectedVideos: Video[];
  addCollectionBatch: (batch: CollectionBatch, videos: Video[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [collectionBatches, setCollectionBatches] = useState<CollectionBatch[]>([]);
  const [collectedVideos, setCollectedVideos] = useState<Video[]>([]);

  const addCollectionBatch = (batch: CollectionBatch, videos: Video[]) => {
    setCollectionBatches(prev => [batch, ...prev]); // 최신순으로 추가
    setCollectedVideos(prev => [...videos, ...prev]); // 최신순으로 추가
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'channels': return <ChannelManagementPage />;
      case 'archive': return <VideoArchivePage />;
      case 'discovery': return <ContentDiscoveryPage />;
      case 'ideas': return <ContentIdeaPage />;
      case 'trending-collection': return <TrendingCollectionPage />;
      case 'trending-videos': return <TrendingVideosPage />;
      case 'trending-batches': return <BatchManagementPage />;
      case 'trending-dashboard': return <TrendingDashboardPage />;
      default: return <DashboardPage />;
    }
  };

  const contextValue: AppContextType = {
    collectionBatches,
    collectedVideos,
    addCollectionBatch,
  };

  return (
    <SettingsProvider>
      <AppContext.Provider value={contextValue}>
        <div className="min-h-screen bg-gray-100">
          <Header currentPage={currentPage} onNavigate={setCurrentPage} />
          {renderPage()}
        </div>
      </AppContext.Provider>
    </SettingsProvider>
  );
}

export default App;