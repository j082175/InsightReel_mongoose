/**
 * 🎯 App Layer - Application Providers
 *
 * 애플리케이션 레벨 컨텍스트와 프로바이더 설정
 * - 전역 상태 관리
 * - 수집 배치 컨텍스트
 * - 설정 컨텍스트 통합
 */

import React, { createContext, useContext, useState } from 'react';
import { CollectionBatchEntity } from '../../entities';
import { VideoEntity } from '../../entities';

// ===== App Context Types =====
interface AppContextType {
  collectionBatches: CollectionBatchEntity[];
  collectedVideos: VideoEntity[];
  addCollectionBatch: (batch: CollectionBatchEntity, videos: VideoEntity[]) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

// ===== Context Creation =====
const AppContext = createContext<AppContextType | null>(null);

// ===== Custom Hook =====
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// ===== Provider Component =====
interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [collectionBatches, setCollectionBatches] = useState<CollectionBatchEntity[]>([]);
  const [collectedVideos, setCollectedVideos] = useState<VideoEntity[]>([]);

  const addCollectionBatch = (batch: CollectionBatchEntity, videos: VideoEntity[]) => {
    setCollectionBatches(prev => [batch, ...prev]); // 최신순으로 추가
    setCollectedVideos(prev => [...videos, ...prev]); // 최신순으로 추가
  };

  const contextValue: AppContextType = {
    collectionBatches,
    collectedVideos,
    addCollectionBatch,
    currentPage,
    setCurrentPage,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};