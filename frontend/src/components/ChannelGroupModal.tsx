import React, { useState, useEffect } from 'react';

interface ChannelGroup {
  _id?: string;
  name: string;
  description: string;
  color: string;
  channels: string[];
  keywords: string[];
  isActive: boolean;
  lastCollectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ChannelGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: ChannelGroup) => void;
  editingGroup?: ChannelGroup | null;
  availableChannels?: string[];
}

const ChannelGroupModal: React.FC<ChannelGroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGroup,
  availableChannels = []
}) => {
  const [formData, setFormData] = useState<ChannelGroup>({
    name: '',
    description: '',
    color: '#3B82F6',
    channels: [],
    keywords: [],
    isActive: true
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  // 편집 모드일 때 폼 데이터 설정
  useEffect(() => {
    if (editingGroup) {
      setFormData(editingGroup);
      setSelectedChannels(new Set(editingGroup.channels));
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        channels: [],
        keywords: [],
        isActive: true
      });
      setSelectedChannels(new Set());
    }
    setKeywordInput('');
  }, [editingGroup, isOpen]);

  const handleInputChange = (field: keyof ChannelGroup, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    
    const keywords = keywordInput.split(',').map(k => k.trim()).filter(k => k);
    const newKeywords = [...formData.keywords, ...keywords.filter(k => !formData.keywords.includes(k))];
    
    setFormData(prev => ({ ...prev, keywords: newKeywords }));
    setKeywordInput('');
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const toggleChannel = (channel: string) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channel)) {
      newSelected.delete(channel);
    } else {
      newSelected.add(channel);
    }
    setSelectedChannels(newSelected);
    setFormData(prev => ({ ...prev, channels: Array.from(newSelected) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('그룹 이름을 입력해주세요.');
      return;
    }

    onSave({
      ...formData,
      channels: Array.from(selectedChannels)
    });
  };

  if (!isOpen) return null;

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {editingGroup ? '🔄 채널 그룹 수정' : '➕ 새 채널 그룹 생성'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  그룹 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="예: 영화 채널 그룹 1"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  그룹 색상
                </label>
                <div className="flex space-x-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="이 그룹에 대한 설명을 입력하세요..."
                rows={3}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* 키워드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                키워드 태그
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="키워드를 쉼표로 구분하여 입력"
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 채널 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                포함할 채널 ({selectedChannels.size}개 선택)
              </label>
              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                {availableChannels.length > 0 ? (
                  <div className="space-y-2">
                    {availableChannels.map((channel, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedChannels.has(channel)}
                          onChange={() => toggleChannel(channel)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{channel}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>선택 가능한 채널이 없습니다.</p>
                    <p className="text-xs mt-1">먼저 채널을 추가해주세요.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 활성화 설정 */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  그룹 활성화 (자동 수집 대상에 포함)
                </span>
              </label>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            {editingGroup ? '수정' : '생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelGroupModal;