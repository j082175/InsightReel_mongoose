/**
 * 🎯 Content Discovery Feature - Model Layer
 *
 * 콘텐츠 발굴 관련 상태 관리 및 비즈니스 로직
 * - 트렌드 데이터 관리
 * - 콘텐츠 아이디어 관리
 * - 분석 결과 캐싱
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TrendData, ContentIdea, CompetitorAnalysis, TrendAnalysisRequest } from '../api/discoveryApi';
import { Platform } from '../../../entities';

// ===== Discovery State Types =====
export interface DiscoveryFilters {
  platform: Platform | 'All';
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard';
  category: string;
  minVolume: number;
  minGrowth: number;
  searchTerm: string;
}

export interface AnalysisResult {
  keyword: string;
  trend: TrendData;
  competitorAnalysis: CompetitorAnalysis;
  contentIdeas: ContentIdea[];
  analyzedAt: Date;
}

// ===== Store Interface =====
interface ContentDiscoveryStore {
  // Data
  trends: TrendData[];
  contentIdeas: ContentIdea[];
  analysisResults: AnalysisResult[];
  bookmarkedTrends: string[];

  // UI State
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  filters: DiscoveryFilters;
  selectedTrendIds: string[];

  // Settings
  refreshInterval: number;
  autoRefresh: boolean;
  lastRefresh?: Date;

  // Actions
  setTrends: (trends: TrendData[]) => void;
  addTrend: (trend: TrendData) => void;
  updateTrend: (trendId: string, updates: Partial<TrendData>) => void;
  removeTrend: (trendId: string) => void;

  setContentIdeas: (ideas: ContentIdea[]) => void;
  addContentIdea: (idea: ContentIdea) => void;
  removeContentIdea: (ideaId: string) => void;

  addAnalysisResult: (result: AnalysisResult) => void;
  getAnalysisResult: (keyword: string) => AnalysisResult | undefined;

  // Bookmarks
  toggleBookmark: (trendId: string) => void;
  clearBookmarks: () => void;

  // Selection
  setSelectedTrendIds: (trendIds: string[]) => void;
  toggleTrendSelection: (trendId: string) => void;
  clearSelection: () => void;

  // Filters
  updateFilters: (filters: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;

  // UI State
  setLoading: (loading: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setError: (error: string | null) => void;

  // Settings
  updateSettings: (settings: { refreshInterval?: number; autoRefresh?: boolean }) => void;

  // Computed
  getFilteredTrends: () => TrendData[];
  getBookmarkedTrends: () => TrendData[];
  getTrendStats: () => {
    totalTrends: number;
    avgGrowth: number;
    avgVolume: number;
    platformBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  };
}

// ===== Default Values =====
const defaultFilters: DiscoveryFilters = {
  platform: 'All',
  difficulty: 'All',
  category: 'All',
  minVolume: 0,
  minGrowth: 0,
  searchTerm: '',
};

// ===== Store Implementation =====
export const useContentDiscoveryStore = create<ContentDiscoveryStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      trends: [],
      contentIdeas: [],
      analysisResults: [],
      bookmarkedTrends: [],
      isLoading: false,
      isAnalyzing: false,
      error: null,
      filters: defaultFilters,
      selectedTrendIds: [],
      refreshInterval: 30, // minutes
      autoRefresh: false,

      // Trend Actions
      setTrends: (trends) =>
        set(
          { trends, lastRefresh: new Date() },
          false,
          'setTrends'
        ),

      addTrend: (trend) =>
        set(
          (state) => ({ trends: [trend, ...state.trends] }),
          false,
          'addTrend'
        ),

      updateTrend: (trendId, updates) =>
        set(
          (state) => ({
            trends: state.trends.map((trend) =>
              trend.id === trendId ? { ...trend, ...updates } : trend
            ),
          }),
          false,
          'updateTrend'
        ),

      removeTrend: (trendId) =>
        set(
          (state) => ({
            trends: state.trends.filter((trend) => trend.id !== trendId),
            bookmarkedTrends: state.bookmarkedTrends.filter((id) => id !== trendId),
            selectedTrendIds: state.selectedTrendIds.filter((id) => id !== trendId),
          }),
          false,
          'removeTrend'
        ),

      // Content Ideas
      setContentIdeas: (ideas) =>
        set({ contentIdeas: ideas }, false, 'setContentIdeas'),

      addContentIdea: (idea) =>
        set(
          (state) => ({ contentIdeas: [idea, ...state.contentIdeas] }),
          false,
          'addContentIdea'
        ),

      removeContentIdea: (ideaId) =>
        set(
          (state) => ({
            contentIdeas: state.contentIdeas.filter((idea) => idea.id !== ideaId),
          }),
          false,
          'removeContentIdea'
        ),

      // Analysis Results
      addAnalysisResult: (result) =>
        set(
          (state) => {
            const filtered = state.analysisResults.filter(
              (r) => r.keyword !== result.keyword
            );
            return { analysisResults: [result, ...filtered].slice(0, 20) }; // Keep last 20
          },
          false,
          'addAnalysisResult'
        ),

      getAnalysisResult: (keyword) => {
        return get().analysisResults.find((result) => result.keyword === keyword);
      },

      // Bookmarks
      toggleBookmark: (trendId) =>
        set(
          (state) => ({
            bookmarkedTrends: state.bookmarkedTrends.includes(trendId)
              ? state.bookmarkedTrends.filter((id) => id !== trendId)
              : [...state.bookmarkedTrends, trendId],
          }),
          false,
          'toggleBookmark'
        ),

      clearBookmarks: () =>
        set({ bookmarkedTrends: [] }, false, 'clearBookmarks'),

      // Selection
      setSelectedTrendIds: (trendIds) =>
        set({ selectedTrendIds: trendIds }, false, 'setSelectedTrendIds'),

      toggleTrendSelection: (trendId) =>
        set(
          (state) => ({
            selectedTrendIds: state.selectedTrendIds.includes(trendId)
              ? state.selectedTrendIds.filter((id) => id !== trendId)
              : [...state.selectedTrendIds, trendId],
          }),
          false,
          'toggleTrendSelection'
        ),

      clearSelection: () =>
        set({ selectedTrendIds: [] }, false, 'clearSelection'),

      // Filters
      updateFilters: (newFilters) =>
        set(
          (state) => ({ filters: { ...state.filters, ...newFilters } }),
          false,
          'updateFilters'
        ),

      resetFilters: () =>
        set({ filters: defaultFilters }, false, 'resetFilters'),

      // UI State
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }, false, 'setAnalyzing'),
      setError: (error) => set({ error }, false, 'setError'),

      // Settings
      updateSettings: (settings) =>
        set(
          (state) => ({
            refreshInterval: settings.refreshInterval ?? state.refreshInterval,
            autoRefresh: settings.autoRefresh ?? state.autoRefresh,
          }),
          false,
          'updateSettings'
        ),

      // Computed
      getFilteredTrends: () => {
        const { trends, filters } = get();

        return trends.filter((trend) => {
          // Platform filter
          if (filters.platform !== 'All' && trend.platform !== filters.platform) {
            return false;
          }

          // Difficulty filter
          if (filters.difficulty !== 'All' && trend.difficulty !== filters.difficulty) {
            return false;
          }

          // Category filter
          if (filters.category !== 'All' && trend.category !== filters.category) {
            return false;
          }

          // Volume filter
          if (trend.volume < filters.minVolume) {
            return false;
          }

          // Growth filter
          if (trend.growth < filters.minGrowth) {
            return false;
          }

          // Search term filter
          if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            return (
              trend.keyword.toLowerCase().includes(searchLower) ||
              trend.category.toLowerCase().includes(searchLower) ||
              trend.relatedKeywords.some((keyword) =>
                keyword.toLowerCase().includes(searchLower)
              )
            );
          }

          return true;
        });
      },

      getBookmarkedTrends: () => {
        const { trends, bookmarkedTrends } = get();
        return trends.filter((trend) => bookmarkedTrends.includes(trend.id));
      },

      getTrendStats: () => {
        const trends = get().trends;

        const platformBreakdown = trends.reduce((acc, trend) => {
          const platform = trend.platform === 'All' ? 'Multi' : trend.platform;
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const categoryBreakdown = trends.reduce((acc, trend) => {
          acc[trend.category] = (acc[trend.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          totalTrends: trends.length,
          avgGrowth: trends.length > 0
            ? Math.round(trends.reduce((sum, t) => sum + t.growth, 0) / trends.length)
            : 0,
          avgVolume: trends.length > 0
            ? Math.round(trends.reduce((sum, t) => sum + t.volume, 0) / trends.length)
            : 0,
          platformBreakdown,
          categoryBreakdown,
        };
      },
    }),
    {
      name: 'content-discovery-store',
    }
  )
);

// ===== Custom Hooks =====

/**
 * 필터링된 트렌드 목록을 반환합니다
 */
export const useFilteredTrends = () => {
  return useContentDiscoveryStore((state) => state.getFilteredTrends());
};

/**
 * 북마크된 트렌드 목록을 반환합니다
 */
export const useBookmarkedTrends = () => {
  return useContentDiscoveryStore((state) => state.getBookmarkedTrends());
};

/**
 * 트렌드 선택 상태와 관련 함수들을 반환합니다
 */
export const useTrendSelection = () => {
  const selectedTrendIds = useContentDiscoveryStore((state) => state.selectedTrendIds);
  const toggleTrendSelection = useContentDiscoveryStore((state) => state.toggleTrendSelection);
  const clearSelection = useContentDiscoveryStore((state) => state.clearSelection);

  return {
    selectedTrendIds,
    toggleTrendSelection,
    clearSelection,
  };
};

/**
 * 발견 필터 상태와 업데이트 함수를 반환합니다
 */
export const useDiscoveryFilters = () => {
  const filters = useContentDiscoveryStore((state) => state.filters);
  const updateFilters = useContentDiscoveryStore((state) => state.updateFilters);
  const resetFilters = useContentDiscoveryStore((state) => state.resetFilters);

  return { filters, updateFilters, resetFilters };
};