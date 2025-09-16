/**
 * 🎯 Video Analysis Feature - Model Layer
 *
 * 비디오 분석 관련 상태 관리 및 비즈니스 로직
 * - 분석 상태 관리
 * - 결과 캐싱
 * - 분석 설정 관리
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { BatchAnalysisResult, ChannelAnalysisResult } from '../api/analysisApi';

// ===== Analysis State Types =====
export interface AnalysisProgress {
  isAnalyzing: boolean;
  currentStep: string;
  progress: number;
  startTime?: Date;
  estimatedEndTime?: Date;
}

export interface AnalysisSettings {
  includeTrends: boolean;
  includeKeywords: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  autoRefresh: boolean;
  refreshInterval: number; // minutes
}

export interface AnalysisHistory {
  id: string;
  results: BatchAnalysisResult;
  settings: AnalysisSettings;
  createdAt: Date;
}

// ===== Analysis Store Interface =====
interface AnalysisStore {
  // State
  currentAnalysis: BatchAnalysisResult | null;
  analysisProgress: AnalysisProgress;
  settings: AnalysisSettings;
  history: AnalysisHistory[];
  selectedChannels: string[];

  // Actions
  setCurrentAnalysis: (results: BatchAnalysisResult | null) => void;
  updateProgress: (progress: Partial<AnalysisProgress>) => void;
  updateSettings: (settings: Partial<AnalysisSettings>) => void;
  addToHistory: (results: BatchAnalysisResult) => void;
  clearHistory: () => void;
  setSelectedChannels: (channels: string[]) => void;

  // Computed
  getChannelResult: (channelId: string) => ChannelAnalysisResult | undefined;
  getAverageMetrics: () => {
    avgViews: number;
    avgEngagement: number;
    totalChannels: number;
  } | null;
}

// ===== Default Values =====
const defaultProgress: AnalysisProgress = {
  isAnalyzing: false,
  currentStep: '',
  progress: 0,
};

const defaultSettings: AnalysisSettings = {
  includeTrends: true,
  includeKeywords: true,
  autoRefresh: false,
  refreshInterval: 30,
};

// ===== Store Implementation =====
export const useAnalysisStore = create<AnalysisStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      currentAnalysis: null,
      analysisProgress: defaultProgress,
      settings: defaultSettings,
      history: [],
      selectedChannels: [],

      // Actions
      setCurrentAnalysis: (results) =>
        set(
          (state) => ({
            currentAnalysis: results,
            analysisProgress: {
              ...state.analysisProgress,
              isAnalyzing: false,
              currentStep: results ? '분석 완료' : '',
              progress: results ? 100 : 0,
            },
          }),
          false,
          'setCurrentAnalysis'
        ),

      updateProgress: (progress) =>
        set(
          (state) => ({
            analysisProgress: {
              ...state.analysisProgress,
              ...progress,
            },
          }),
          false,
          'updateProgress'
        ),

      updateSettings: (newSettings) =>
        set(
          (state) => ({
            settings: {
              ...state.settings,
              ...newSettings,
            },
          }),
          false,
          'updateSettings'
        ),

      addToHistory: (results) =>
        set(
          (state) => {
            const newHistory: AnalysisHistory = {
              id: `analysis_${Date.now()}`,
              results,
              settings: state.settings,
              createdAt: new Date(),
            };

            return {
              history: [newHistory, ...state.history].slice(0, 10), // Keep last 10
            };
          },
          false,
          'addToHistory'
        ),

      clearHistory: () =>
        set(
          () => ({
            history: [],
          }),
          false,
          'clearHistory'
        ),

      setSelectedChannels: (channels) =>
        set(
          () => ({
            selectedChannels: channels,
          }),
          false,
          'setSelectedChannels'
        ),

      // Computed
      getChannelResult: (channelId: string) => {
        const { currentAnalysis } = get();
        return currentAnalysis?.channels.find(
          (channel) => channel.channelId === channelId
        );
      },

      getAverageMetrics: () => {
        const { currentAnalysis } = get();
        if (!currentAnalysis || currentAnalysis.channels.length === 0) {
          return null;
        }

        const channels = currentAnalysis.channels;
        return {
          avgViews: Math.round(
            channels.reduce((sum, c) => sum + c.avgViews, 0) / channels.length
          ),
          avgEngagement:
            Math.round(
              (channels.reduce((sum, c) => sum + c.trends.engagementRate, 0) /
                channels.length) *
                10
            ) / 10,
          totalChannels: channels.length,
        };
      },
    }),
    {
      name: 'analysis-store',
    }
  )
);

// ===== Custom Hooks =====

/**
 * 현재 분석 결과를 반환합니다
 */
export const useCurrentAnalysis = () => {
  return useAnalysisStore((state) => state.currentAnalysis);
};

/**
 * 분석 진행 상태를 반환합니다
 */
export const useAnalysisProgress = () => {
  return useAnalysisStore((state) => state.analysisProgress);
};

/**
 * 분석 설정을 반환합니다
 */
export const useAnalysisSettings = () => {
  const settings = useAnalysisStore((state) => state.settings);
  const updateSettings = useAnalysisStore((state) => state.updateSettings);

  return { settings, updateSettings };
};

/**
 * 선택된 채널 목록을 반환합니다
 */
export const useSelectedChannelsForAnalysis = () => {
  const selectedChannels = useAnalysisStore((state) => state.selectedChannels);
  const setSelectedChannels = useAnalysisStore(
    (state) => state.setSelectedChannels
  );

  return { selectedChannels, setSelectedChannels };
};
