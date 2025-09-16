import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';

interface ApiKeyInfo {
  id: string;
  name: string;
  maskedKey: string;
  status: 'active' | 'warning' | 'error' | 'disabled';
  usage: {
    videos: { used: number; limit: number };
    channels: { used: number; limit: number };
    search: { used: number; limit: number };
    comments: { used: number; limit: number };
    total: { used: number; limit: number };
  };
  errors: number;
  lastUsed: string;
  resetTime: string;
}

interface ApiKeyManagerProps {
  isModal?: boolean;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ isModal = false }) => {
  const queryClient = useQueryClient();
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  useEffect(() => {
    fetchApiKeyInfo();
  }, []);

  const fetchApiKeyInfo = async () => {
    try {
      setLoading(true);
      // quota-status API로 실제 키 정보 가져오기
      const response = await fetch('http://localhost:3000/api/quota-status');
      const data = await response.json();

      if (data.success && data.data.quota.allKeys) {
        // 실제 키 정보를 ApiKeyInfo 형태로 변환
        const realApiKeys: ApiKeyInfo[] = data.data.quota.allKeys.map(
          (key: any, index: number) => {
            const [used, limit] = key.usage
              .split('/')
              .map((n: string) => parseInt(n));
            // limit는 이미 안전 마진이 적용된 실제 사용 가능한 한도 (9500)

            const finalStatus = (
              key.realStatus === 'inactive'
                ? 'disabled'
                : key.percentage > 90
                  ? 'error'
                  : key.percentage > 80
                    ? 'warning'
                    : 'active'
            ) as 'active' | 'warning' | 'error' | 'disabled';

            return {
              id: key.id || `key-${index}`, // 실제 키 ID 사용
              name: key.name,
              maskedKey: `AIza...${key.name.slice(-4)}`, // 키 이름 기반으로 마스킹
              status: finalStatus,
              usage: {
                videos: {
                  used: Math.floor(used * 0.3),
                  limit: Math.floor(limit * 0.3),
                },
                channels: {
                  used: Math.floor(used * 0.2),
                  limit: Math.floor(limit * 0.2),
                },
                search: {
                  used: Math.floor(used * 0.3),
                  limit: Math.floor(limit * 0.3),
                },
                comments: {
                  used: Math.floor(used * 0.2),
                  limit: Math.floor(limit * 0.2),
                },
                total: { used, limit },
              },
              errors: key.exceeded ? 1 : 0,
              lastUsed: used > 0 ? 'Today' : 'Never',
              resetTime: '매일 오후 4시 (한국 시간)',
            };
          }
        );

        setApiKeys(realApiKeys);
      } else {
        console.error('API quota status 조회 실패');
        setApiKeys([]);
      }
    } catch (error) {
      console.error('API 키 정보 조회 실패:', error);
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'disabled':
        return '⏸️';
      default:
        return '❓';
    }
  };

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleAddKey = async () => {
    if (!newKeyName || !newKeyValue) return;

    try {
      const response = await apiClient.addApiKey(newKeyName, newKeyValue);

      if (response.success) {
        console.log('🔍 성공 응답 상세:', response);
        console.log('🔍 응답 data 내용:', response.data);
        console.log('🔍 isDuplicate 값:', response.data?.isDuplicate);

        // 중복 키인 경우 특별 처리
        if (response.data?.isDuplicate) {
          const existingKeyName =
            response.data.message.match(/'([^']+)'/)?.[1] || '알 수 없음';
          alert(
            `🔄 이미 등록된 API 키입니다!\n\n• 기존 키 이름: ${existingKeyName}\n• 동일한 API 키가 이미 시스템에 등록되어 있습니다.\n• 새로 추가하지 않고 기존 키를 계속 사용합니다.`
          );
        } else {
          alert('✅ API 키가 성공적으로 추가되었습니다!');
        }

        // API 키 목록을 새로고침
        await fetchApiKeyInfo();
        // API 상태 즉시 새로고침
        queryClient.invalidateQueries({ queryKey: ['api-status'] });
        setShowAddKey(false);
        setNewKeyName('');
        setNewKeyValue('');
      } else {
        console.error('❌ API 키 추가 실패:', response.message);
        alert(`API 키 추가 실패: ${response.message}`);
      }
    } catch (error: unknown) {
      console.error('API 키 추가 실패:', error);

      // 서버에서 온 에러 메시지 추출
      let errorMessage = 'API 키 추가 중 오류가 발생했습니다.';

      // axios 에러 객체 처리
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;

        console.log('🔍 에러 응답 상세:', { status, data });

        if (status === 400) {
          if (data?.message && data.message.includes('유효하지 않은')) {
            errorMessage =
              '⚠️ 유효하지 않은 YouTube API 키 형식입니다!\n\n올바른 형식:\n• AIza로 시작하는 정확히 39자리 문자열\n• 영문자, 숫자, 하이픈(-), 언더스코어(_)만 포함\n• 예시: AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n\n입력하신 키가 올바른 YouTube API 키인지 확인해주세요.';
          } else if (data?.message) {
            errorMessage = `⚠️ ${data.message}`;
          } else {
            errorMessage =
              '⚠️ 입력값이 올바르지 않습니다. 키 이름과 API 키를 모두 입력해주세요.';
          }
        } else if (status === 500) {
          errorMessage =
            data?.message || data?.error || '서버에서 오류가 발생했습니다.';
        }
      }

      alert(errorMessage);
    }
  };

  const deleteKey = async (keyId: string) => {
    if (confirm('정말로 이 API 키를 삭제하시겠습니까?')) {
      try {
        const response = await apiClient.deleteApiKey(keyId);

        if (response.success) {
          // API 키 목록을 새로고침
          await fetchApiKeyInfo();
          // API 상태 즉시 새로고침
          queryClient.invalidateQueries({ queryKey: ['api-status'] });
          console.log('✅ API 키가 성공적으로 삭제되었습니다');
        } else {
          console.error('❌ API 키 삭제 실패:', response.message);
          alert(`API 키 삭제 실패: ${response.message}`);
        }
      } catch (error) {
        console.error('API 키 삭제 실패:', error);
        alert('API 키 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">API 키 정보 로딩중...</span>
      </div>
    );
  }

  return (
    <div className={`${isModal ? 'p-0' : 'p-6'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className={`${isModal ? 'text-lg' : 'text-2xl'} font-bold text-gray-900`}
          >
            YouTube API 키 관리
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            총 {apiKeys.length}개의 API 키 • 활성:{' '}
            {apiKeys.filter((k) => k.status === 'active').length}개
          </p>
        </div>
        <button
          onClick={() => setShowAddKey(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <span>➕</span>새 키 추가
        </button>
      </div>

      {/* API 키 목록 */}
      <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
        {apiKeys.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">API 키가 없습니다.</p>
            <p className="text-sm text-gray-400">
              새 키 추가 버튼을 클릭하여 API 키를 추가하세요.
            </p>
          </div>
        )}
        {apiKeys.map((key) => (
          <div
            key={key.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            {/* 헤더 */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getStatusIcon(key.status)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{key.name}</h3>
                  <div
                    className="w-64 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    <p className="text-sm text-gray-500 font-mono whitespace-nowrap pb-1">
                      {key.maskedKey}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(key.status)}`}
                >
                  {key.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteKey(key.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  삭제
                </button>
              </div>
            </div>

            {/* 사용량 정보 */}
            <div className="flex justify-center mb-3">
              <div className="text-center w-48">
                <div className="text-xs text-gray-500 mb-1">Total Usage</div>
                <div className="text-sm font-medium">
                  {key.usage.total.used.toLocaleString()} /{' '}
                  {key.usage.total.limit.toLocaleString()}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className={`h-2 rounded-full ${getUsageColor(key.usage.total.used, key.usage.total.limit)}`}
                    style={{
                      width: `${(key.usage.total.used / key.usage.total.limit) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <span>마지막 사용: {key.lastUsed}</span>
                <span>에러: {key.errors}건</span>
              </div>
              <span>할당량 리셋: {key.resetTime}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 새 키 추가 모달 */}
      {showAddKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 API 키 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  키 이름
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="예: Production API Key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API 키
                </label>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="AIza..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddKey(false);
                  setNewKeyName('');
                  setNewKeyValue('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddKey}
                disabled={!newKeyName || !newKeyValue}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;
