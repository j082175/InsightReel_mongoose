/**
 * 🎯 App Layer - Page Router
 *
 * 페이지 라우팅 및 렌더링을 담당
 * - 현재 페이지 상태 관리
 * - 페이지 컴포넌트 매핑
 * - 라우팅 로직
 */

import React from 'react';
import { useAppContext } from '../providers';
import { ROUTES } from './routes';

// Import pages (lazy loading for better performance)
import DashboardPage from '../../pages/DashboardPage';
import ChannelManagementPage from '../../pages/ChannelManagementPage';
import VideoArchivePage from '../../pages/VideoArchivePage';
import ContentDiscoveryPage from '../../pages/ContentDiscoveryPage';
import ContentIdeaPage from '../../pages/ContentIdeaPage';
import TrendingCollectionPage from '../../pages/TrendingCollectionPage';
import TrendingVideosPage from '../../pages/TrendingVideosPage';
import BatchManagementPage from '../../pages/BatchManagementPage';
import TrendingDashboardPage from '../../pages/TrendingDashboardPage';

// Test pages (development only)
import TestMenuPage from '../../pages/TestMenuPage';
import SharedTestPage from '../../pages/SharedTestPage';
import FeaturesTestPage from '../../pages/FeaturesTestPage';
import IntegrationTestPage from '../../pages/IntegrationTestPage';
import HooksTestPage from '../../pages/HooksTestPage';
import UIHooksTestPage from '../../pages/UIHooksTestPage';
import APIHooksTestPage from '../../pages/APIHooksTestPage';
import ComponentsTestPage from '../../pages/ComponentsTestPage';
import SearchBarTestPage from '../../pages/SearchBarTestPage';
import VideoCardTestPage from '../../pages/VideoCardTestPage';
import ModalTestPage from '../../pages/ModalTestPage';
import ActionBarTestPage from '../../pages/ActionBarTestPage';
import HeaderTestPage from '../../pages/HeaderTestPage';
import SidebarTestPage from '../../pages/SidebarTestPage';
import ChannelCardTestPage from '../../pages/ChannelCardTestPage';
import ChannelGroupCardTestPage from '../../pages/ChannelGroupCardTestPage';
import BatchFormTestPage from '../../pages/BatchFormTestPage';
import BatchCardTestPage from '../../pages/BatchCardTestPage';
import VideoAnalysisModalTestPage from '../../pages/VideoAnalysisModalTestPage';
import BulkCollectionModalTestPage from '../../pages/BulkCollectionModalTestPage';
import UseModalTestPage from '../../pages/UseModalTestPage';
import UseMultiModalTestPage from '../../pages/UseMultiModalTestPage';
import UseSearchTestPage from '../../pages/UseSearchTestPage';
import UseSelectionTestPage from '../../pages/UseSelectionTestPage';
import UseFilterTestPage from '../../pages/UseFilterTestPage';
import UseVideosTestPage from '../../pages/UseVideosTestPage';
import UseChannelsTestPage from '../../pages/UseChannelsTestPage';
import UseAPIStatusTestPage from '../../pages/UseAPIStatusTestPage';
import UseServerStatusTestPage from '../../pages/UseServerStatusTestPage';
import UseCollectTrendingTestPage from '../../pages/UseCollectTrendingTestPage';
import UseTrendingStatsTestPage from '../../pages/UseTrendingStatsTestPage';
import UseQuotaStatusTestPage from '../../pages/UseQuotaStatusTestPage';

// ===== Page Component Mapping =====
const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  [ROUTES.DASHBOARD.id]: DashboardPage,
  [ROUTES.CHANNELS.id]: ChannelManagementPage,
  [ROUTES.ARCHIVE.id]: VideoArchivePage,
  [ROUTES.DISCOVERY.id]: ContentDiscoveryPage,
  [ROUTES.IDEAS.id]: ContentIdeaPage,
  [ROUTES.TRENDING_COLLECTION.id]: TrendingCollectionPage,
  [ROUTES.TRENDING_VIDEOS.id]: TrendingVideosPage,
  [ROUTES.TRENDING_BATCHES.id]: BatchManagementPage,
  [ROUTES.TRENDING_DASHBOARD.id]: TrendingDashboardPage,
  // Test pages (development only)
  ...(process.env.NODE_ENV === 'development' && {
    'test': TestMenuPage,
    'test-shared': SharedTestPage,
    'test-features': FeaturesTestPage,
    'test-integration': IntegrationTestPage,
    'test-hooks': HooksTestPage,
    'test-ui-hooks': UIHooksTestPage,
    'test-api-hooks': APIHooksTestPage,
    'test-components': ComponentsTestPage,
    'test-searchbar': SearchBarTestPage,
    'test-videocard': VideoCardTestPage,
    'test-modal': ModalTestPage,
    'test-actionbar': ActionBarTestPage,
    'test-header': HeaderTestPage,
    'test-sidebar': SidebarTestPage,
    'test-channelcard': ChannelCardTestPage,
    'test-channelgroupcard': ChannelGroupCardTestPage,
    'test-batchform': BatchFormTestPage,
    'test-batchcard': BatchCardTestPage,
    'test-videoanalysismodal': VideoAnalysisModalTestPage,
    'test-bulkcollectionmodal': BulkCollectionModalTestPage,
    'test-usemodal': UseModalTestPage,
    'test-usemultimodal': UseMultiModalTestPage,
    'test-usesearch': UseSearchTestPage,
    'test-useselection': UseSelectionTestPage,
    'test-usefilter': UseFilterTestPage,
    'test-usevideos': UseVideosTestPage,
    'test-usechannels': UseChannelsTestPage,
    'test-useapistatus': UseAPIStatusTestPage,
    'test-useserverstatus': UseServerStatusTestPage,
    'test-usecollecttrending': UseCollectTrendingTestPage,
    'test-usetrendingstats': UseTrendingStatsTestPage,
    'test-usequotastatus': UseQuotaStatusTestPage,
  }),
};

// ===== Router Component =====
export const PageRouter: React.FC = () => {
  const { currentPage } = useAppContext();

  // Get the page component
  const PageComponent = PAGE_COMPONENTS[currentPage] || DashboardPage;

  // Render the current page
  return <PageComponent />;
};

// ===== Navigation Hook =====
export const useNavigation = () => {
  const { currentPage, setCurrentPage } = useAppContext();

  const navigateTo = (pageId: string) => {
    if (PAGE_COMPONENTS[pageId]) {
      setCurrentPage(pageId);
    } else {
      console.warn(`Page "${pageId}" not found, redirecting to dashboard`);
      setCurrentPage(ROUTES.DASHBOARD.id);
    }
  };

  const getCurrentRoute = () => {
    return Object.values(ROUTES).find(route => route.id === currentPage);
  };

  return {
    currentPage,
    navigateTo,
    getCurrentRoute,
  };
};