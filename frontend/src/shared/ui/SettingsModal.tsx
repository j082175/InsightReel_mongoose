import React, { useState } from 'react';
import { useSettings } from '../../app/providers';
import ApiKeyManager from './ApiKeyManager';
import { Modal } from '../components';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const { settings, updateSettings, saveSettings } = useSettings();

  if (!isOpen) return null;

  const updateSetting = (category: keyof typeof settings, key: string, value: unknown) => {
    // 타입별로 안전하게 값을 검증하고 업데이트
    switch (category) {
      case 'general':
        if (key === 'darkMode' && typeof value === 'boolean') {
          updateSettings('general', 'darkMode', value);
        } else if (key === 'notifications' && typeof value === 'boolean') {
          updateSettings('general', 'notifications', value);
        } else if (key === 'dashboardLayout' && (value === 'cards' || value === 'list' || value === 'grid')) {
          updateSettings('general', 'dashboardLayout', value);
        }
        break;
      
      case 'analysis':
        if (key === 'aiModel' && (value === 'flash-lite' || value === 'flash' || value === 'pro')) {
          updateSettings('analysis', 'aiModel', value);
        } else if (key === 'autoAnalysis' && typeof value === 'boolean') {
          updateSettings('analysis', 'autoAnalysis', value);
        } else if (key === 'analysisInterval' && (value === 'realtime' || value === 'hourly' || value === 'daily' || value === 'weekly')) {
          updateSettings('analysis', 'analysisInterval', value);
        } else if (key === 'defaultCategory' && typeof value === 'string') {
          updateSettings('analysis', 'defaultCategory', value);
        }
        break;
      
      case 'data':
        if (key === 'savePath' && typeof value === 'string') {
          updateSettings('data', 'savePath', value);
        } else if (key === 'autoBackup' && typeof value === 'boolean') {
          updateSettings('data', 'autoBackup', value);
        } else if (key === 'backupInterval' && (value === 'daily' || value === 'weekly' || value === 'monthly')) {
          updateSettings('data', 'backupInterval', value);
        } else if (key === 'dataRetention' && typeof value === 'string') {
          updateSettings('data', 'dataRetention', value);
        }
        break;
      
      case 'account':
        if (key === 'username' && typeof value === 'string') {
          updateSettings('account', 'username', value);
        } else if (key === 'email' && typeof value === 'string') {
          updateSettings('account', 'email', value);
        } else if (key === 'apiKeyVisible' && typeof value === 'boolean') {
          updateSettings('account', 'apiKeyVisible', value);
        }
        break;
    }
  };

  const tabs = [
    { id: 'general', name: '일반', icon: '⚙️' },
    { id: 'analysis', name: 'AI 분석', icon: '🤖' },
    { id: 'data', name: '데이터', icon: '📊' },
    { id: 'api', name: 'API 관리', icon: '🔑' },
    { id: 'account', name: '계정', icon: '👤' }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">화면 설정</h3>
        
        <div className="flex items-center justify-between py-3">
          <div>
            <label className="text-sm font-medium text-gray-700">다크 모드</label>
            <p className="text-sm text-gray-500">어두운 테마로 전환</p>
          </div>
          <button
            onClick={() => updateSetting('general', 'darkMode', !settings.general.darkMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.general.darkMode ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.general.darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <label className="text-sm font-medium text-gray-700">알림</label>
            <p className="text-sm text-gray-500">분석 완료 및 오류 알림</p>
          </div>
          <button
            onClick={() => updateSetting('general', 'notifications', !settings.general.notifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.general.notifications ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.general.notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">대시보드 레이아웃</label>
          <select
            value={settings.general.dashboardLayout}
            onChange={(e) => updateSetting('general', 'dashboardLayout', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="cards">카드 형태</option>
            <option value="list">리스트 형태</option>
            <option value="grid">그리드 형태</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAnalysisSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI 분석 설정</h3>
        
        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">AI 모델</label>
          <select
            value={settings.analysis.aiModel}
            onChange={(e) => updateSetting('analysis', 'aiModel', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="flash-lite">Gemini Flash Lite (빠름, 저비용)</option>
            <option value="flash">Gemini Flash (균형)</option>
            <option value="pro">Gemini Pro (정밀, 고비용)</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">분석 품질과 속도의 균형을 선택하세요</p>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <label className="text-sm font-medium text-gray-700">자동 분석</label>
            <p className="text-sm text-gray-500">새로운 콘텐츠 자동 분석</p>
          </div>
          <button
            onClick={() => updateSetting('analysis', 'autoAnalysis', !settings.analysis.autoAnalysis)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.analysis.autoAnalysis ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.analysis.autoAnalysis ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">분석 주기</label>
          <select
            value={settings.analysis.analysisInterval}
            onChange={(e) => updateSetting('analysis', 'analysisInterval', e.target.value)}
            disabled={!settings.analysis.autoAnalysis}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          >
            <option value="realtime">실시간</option>
            <option value="hourly">1시간마다</option>
            <option value="daily">매일</option>
            <option value="weekly">매주</option>
          </select>
        </div>

        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">기본 카테고리</label>
          <select
            value={settings.analysis.defaultCategory}
            onChange={(e) => updateSetting('analysis', 'defaultCategory', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="auto">자동 분류</option>
            <option value="entertainment">엔터테인먼트</option>
            <option value="education">교육</option>
            <option value="technology">기술</option>
            <option value="lifestyle">라이프스타일</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">데이터 관리</h3>
        
        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">저장 경로</label>
          <div className="flex">
            <input
              type="text"
              value={settings.data.savePath}
              onChange={(e) => updateSetting('data', 'savePath', e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200">
              📁
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <label className="text-sm font-medium text-gray-700">자동 백업</label>
            <p className="text-sm text-gray-500">데이터 자동 백업 활성화</p>
          </div>
          <button
            onClick={() => updateSetting('data', 'autoBackup', !settings.data.autoBackup)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.data.autoBackup ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.data.autoBackup ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">백업 주기</label>
          <select
            value={settings.data.backupInterval}
            onChange={(e) => updateSetting('data', 'backupInterval', e.target.value)}
            disabled={!settings.data.autoBackup}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          >
            <option value="daily">매일</option>
            <option value="weekly">매주</option>
            <option value="monthly">매월</option>
          </select>
        </div>

        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">데이터 보존 기간 (일)</label>
          <input
            type="number"
            value={settings.data.dataRetention}
            onChange={(e) => updateSetting('data', 'dataRetention', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            min="1"
            max="365"
          />
          <p className="text-sm text-gray-500 mt-1">설정된 기간이 지난 데이터는 자동 삭제됩니다</p>
        </div>
      </div>
    </div>
  );

  const renderApiSettings = () => (
    <div className="space-y-6">
      <ApiKeyManager isModal={true} />
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">계정 정보</h3>
        
        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">사용자명</label>
          <input
            type="text"
            value={settings.account.username}
            onChange={(e) => updateSetting('account', 'username', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">이메일</label>
          <input
            type="email"
            value={settings.account.email}
            onChange={(e) => updateSetting('account', 'email', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="이메일을 입력하세요"
          />
        </div>

        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">기본 API 키</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <div className="text-sm font-medium text-gray-700">Gemini API 키</div>
                <div className="text-sm text-gray-500">
                  {settings.account.apiKeyVisible ? 'AIza...c1b2' : '••••••••••••'}
                </div>
              </div>
              <button
                onClick={() => updateSetting('account', 'apiKeyVisible', !settings.account.apiKeyVisible)}
                className="text-indigo-600 hover:text-indigo-800 text-sm"
              >
                {settings.account.apiKeyVisible ? '숨기기' : '보기'}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            YouTube API 키는 "API 관리" 탭에서 관리할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'analysis': return renderAnalysisSettings();
      case 'data': return renderDataSettings();
      case 'api': return renderApiSettings();
      case 'account': return renderAccountSettings();
      default: return renderGeneralSettings();
    }
  };

  const handleSave = async () => {
    try {
      await saveSettings();
      onClose();
    } catch (error) {
      console.error('설정 저장 실패:', error);
      // TODO: 에러 알림 표시
    }
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        취소
      </button>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
      >
        저장
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="설정"
      size="xl"
      showFooter={true}
      footer={footer}
      className="max-h-[90vh] overflow-hidden"
    >
      <div className="flex">
        {/* 사이드바 */}
        <div className="w-48 bg-gray-50 border-r border-gray-200">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;