import React from 'react';
import { Plus, X } from 'lucide-react';

interface BatchFormData {
  name: string;
  description: string;
  collectionType: 'group' | 'channels';
  selectedGroups: string[];
  selectedChannels: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews: number;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords: string[];
    excludeKeywords: string[];
  };
}

interface BatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BatchFormData) => void;
  formData: BatchFormData;
  setFormData: React.Dispatch<React.SetStateAction<BatchFormData>>;
  channelGroups: Array<{_id: string, name: string, color: string}>;
  channels: Array<{_id: string, name: string}>;
  isSubmitting?: boolean;
}

const BatchForm: React.FC<BatchFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  channelGroups,
  channels,
  isSubmitting = false
}) => {
  if (!isOpen) return null;

  const addKeyword = (type: 'keywords' | 'excludeKeywords') => {
    const input = prompt(`${type === 'keywords' ? '포함' : '제외'} 키워드를 입력하세요:`);
    if (input && input.trim()) {
      setFormData(prev => ({
        ...prev,
        criteria: {
          ...prev.criteria,
          [type]: [...prev.criteria[type], input.trim()]
        }
      }));
    }
  };

  const removeKeyword = (type: 'keywords' | 'excludeKeywords', index: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [type]: prev.criteria[type].filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">새 배치 생성</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배치 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          {/* 수집 대상 선택 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수집 대상 *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="collectionType"
                    value="group"
                    checked={formData.collectionType === 'group'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      collectionType: e.target.value as 'group' | 'channels'
                    }))}
                    className="mr-2"
                  />
                  채널 그룹으로 수집
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="collectionType"
                    value="channels"
                    checked={formData.collectionType === 'channels'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      collectionType: e.target.value as 'group' | 'channels'
                    }))}
                    className="mr-2"
                  />
                  개별 채널로 수집
                </label>
              </div>
            </div>

            {formData.collectionType === 'group' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  채널 그룹 선택
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {channelGroups.map(group => (
                    <label key={group._id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={formData.selectedGroups.includes(group._id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            selectedGroups: checked
                              ? [...prev.selectedGroups, group._id]
                              : prev.selectedGroups.filter(id => id !== group._id)
                          }));
                        }}
                        className="mr-2"
                      />
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  개별 채널 선택
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {channels.map(channel => (
                    <label key={channel._id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={formData.selectedChannels.includes(channel._id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            selectedChannels: checked
                              ? [...prev.selectedChannels, channel._id]
                              : prev.selectedChannels.filter(id => id !== channel._id)
                          }));
                        }}
                        className="mr-2"
                      />
                      {channel.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 수집 기준 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">수집 기준</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수집 기간 (일)
                </label>
                <input
                  type="number"
                  value={formData.criteria.daysBack}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    criteria: {
                      ...prev.criteria,
                      daysBack: parseInt(e.target.value) || 7
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최소 조회수
                </label>
                <input
                  type="number"
                  value={formData.criteria.minViews}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    criteria: {
                      ...prev.criteria,
                      minViews: parseInt(e.target.value) || 10000
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최대 조회수 (선택사항)
              </label>
              <input
                type="number"
                value={formData.criteria.maxViews || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  criteria: {
                    ...prev.criteria,
                    maxViews: parseInt(e.target.value) || 0
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="제한 없음"
              />
            </div>

            {/* 영상 길이 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                포함할 영상 길이
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.criteria.includeShorts}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      criteria: {
                        ...prev.criteria,
                        includeShorts: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  숏폼 (60초 이하)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.criteria.includeMidform}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      criteria: {
                        ...prev.criteria,
                        includeMidform: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  미드폼 (1-3분)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.criteria.includeLongForm}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      criteria: {
                        ...prev.criteria,
                        includeLongForm: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  롱폼 (3분 이상)
                </label>
              </div>
            </div>

            {/* 키워드 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                포함 키워드 (선택사항)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.criteria.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword('keywords', index)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addKeyword('keywords')}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
              >
                <Plus className="w-4 h-4" />
                키워드 추가
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제외 키워드 (선택사항)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.criteria.excludeKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-sm"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword('excludeKeywords', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addKeyword('excludeKeywords')}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
              >
                <Plus className="w-4 h-4" />
                키워드 추가
              </button>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? '생성 중...' : '배치 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchForm;