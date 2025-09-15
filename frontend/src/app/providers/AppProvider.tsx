/**
 * 🎯 App Layer - Application Providers
 *
 * 애플리케이션 레벨 컨텍스트와 프로바이더 설정
 * - 전역 상태 관리
 * - 수집 배치 컨텍스트
 * - 설정 컨텍스트 통합
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CollectionBatchEntity } from '../../entities';
import { VideoEntity } from '../../entities';
import { Toaster } from 'react-hot-toast';

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
  const [currentPage, setCurrentPage] = useState('channels'); // 디버깅을 위해 임시로 다시 변경
  const [collectionBatches, setCollectionBatches] = useState<CollectionBatchEntity[]>([]);
  const [collectedVideos, setCollectedVideos] = useState<VideoEntity[]>([]);

  // 브라우저 히스토리 초기화
  useEffect(() => {
    // 현재 페이지를 브라우저 히스토리에 추가
    window.history.replaceState({ page: currentPage }, '', `#${currentPage}`);

    // 브라우저 뒤로가기/앞으로가기 이벤트 처리
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        setCurrentPage(event.state.page);
      } else {
        // state가 없으면 URL 해시에서 페이지 추출
        const hash = window.location.hash.slice(1);
        if (hash) {
          setCurrentPage(hash);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const addCollectionBatch = (batch: CollectionBatchEntity, videos: VideoEntity[]) => {
    setCollectionBatches(prev => [batch, ...prev]); // 최신순으로 추가
    setCollectedVideos(prev => [...videos, ...prev]); // 최신순으로 추가
  };

  // 페이지 변경 함수 (브라우저 히스토리에 추가)
  const handleSetCurrentPage = (page: string) => {
    if (page !== currentPage) {
      setCurrentPage(page);

      // 브라우저 히스토리에 새 페이지 추가
      window.history.pushState({ page }, '', `#${page}`);
    }
  };

  const contextValue: AppContextType = {
    collectionBatches,
    collectedVideos,
    addCollectionBatch,
    currentPage,
    setCurrentPage: handleSetCurrentPage,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </AppContext.Provider>
  );
};