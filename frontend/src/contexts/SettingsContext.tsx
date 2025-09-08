import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Settings {
  general: {
    darkMode: boolean;
    notifications: boolean;
    dashboardLayout: 'cards' | 'list' | 'grid';
  };
  analysis: {
    aiModel: 'flash-lite' | 'flash' | 'pro';
    autoAnalysis: boolean;
    analysisInterval: 'realtime' | 'hourly' | 'daily' | 'weekly';
    defaultCategory: string;
  };
  data: {
    savePath: string;
    autoBackup: boolean;
    backupInterval: 'daily' | 'weekly' | 'monthly';
    dataRetention: string;
  };
  account: {
    username: string;
    email: string;
    apiKeyVisible: boolean;
  };
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (category: keyof Settings, key: string, value: any) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  general: {
    darkMode: false,
    notifications: true,
    dashboardLayout: 'cards'
  },
  analysis: {
    aiModel: 'flash-lite',
    autoAnalysis: true,
    analysisInterval: 'hourly',
    defaultCategory: 'auto'
  },
  data: {
    savePath: './downloads',
    autoBackup: true,
    backupInterval: 'daily',
    dataRetention: '30'
  },
  account: {
    username: '사용자',
    email: '',
    apiKeyVisible: false
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // 컴포넌트 마운트 시 로컬 스토리지에서 설정 로드
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('설정 로드 실패:', error);
      }
    }
  }, []);

  // 다크모드 적용
  useEffect(() => {
    if (settings.general.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.general.darkMode]);

  const updateSettings = (category: keyof Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const saveSettings = async (): Promise<void> => {
    try {
      // 로컬 스토리지에 저장
      localStorage.setItem('app-settings', JSON.stringify(settings));
      
      // TODO: 서버에도 저장하기
      // await apiClient.saveSettings(settings);
      
      console.log('설정이 저장되었습니다:', settings);
      
      // 알림 표시 (향후 toast 알림으로 교체)
      if (settings.general.notifications) {
        console.log('✅ 설정이 저장되었습니다');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      throw error;
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('app-settings');
    console.log('설정이 초기화되었습니다');
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    saveSettings,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};