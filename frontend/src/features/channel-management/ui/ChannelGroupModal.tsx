import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, AlertCircle } from 'lucide-react';
import {
  channelGroupFormSchema,
  ChannelGroupFormData,
  getDefaultChannelGroupFormData,
  colorPalette,
} from '../../../shared/schemas/channelGroupSchema';
import { Modal } from '../../../shared/components';
import { ChannelGroup } from '../../../shared/types/channel-group';


interface Channel {
  _id?: string;
  channelId: string;
  name: string;
}

interface ChannelGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: ChannelGroup) => Promise<void>;
  editingGroup?: ChannelGroup | null;
  availableChannels?: Channel[];
  isSubmitting?: boolean;
}

const ChannelGroupModal: React.FC<ChannelGroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGroup,
  availableChannels = [],
  isSubmitting = false,
}) => {
  const [keywordInput, setKeywordInput] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(channelGroupFormSchema),
    defaultValues: getDefaultChannelGroupFormData(),
    mode: 'onChange',
  });

  // 폼 초기화 (모달이 열릴 때)
  useEffect(() => {
    if (isOpen) {
      if (editingGroup) {
        console.log('🔍 [ChannelGroupModal] editingGroup 디버그:', {
          editingGroup,
          channels: editingGroup.channels,
          channelsType: typeof editingGroup.channels,
          channelsLength: editingGroup.channels?.length,
        });

        const formData: ChannelGroupFormData = {
          name: editingGroup.name,
          description: editingGroup.description || '',
          color: editingGroup.color,
          selectedChannels: editingGroup.channels?.map(ch => ch.channelId) || [],
          keywords: editingGroup.keywords || [],
          isActive: editingGroup.isActive,
        };

        console.log('🔍 [ChannelGroupModal] formData:', formData);
        reset(formData);
      } else {
        reset(getDefaultChannelGroupFormData());
      }
      setKeywordInput('');
    }
  }, [isOpen, editingGroup, reset]);

  // 현재 값들 감시
  const keywords = watch('keywords');
  const selectedChannels = watch('selectedChannels');
  const currentColor = watch('color');

  // 디버깅: 폼 유효성 상태 감시
  useEffect(() => {
    console.log('🔍 [ChannelGroupModal] Form validation state:', {
      isValid,
      errors,
      selectedChannels,
      selectedChannelsLength: selectedChannels?.length || 0,
    });
  }, [isValid, errors, selectedChannels]);

  // 키워드 추가 함수
  const addKeyword = () => {
    if (keywordInput.trim()) {
      const newKeywords = keywordInput
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k && !keywords.includes(k));

      if (newKeywords.length > 0) {
        setValue('keywords', [...keywords, ...newKeywords]);
        setKeywordInput('');
      }
    }
  };

  const removeKeyword = (index: number) => {
    setValue(
      'keywords',
      keywords.filter((_, i) => i !== index)
    );
  };

  // 폼 제출
  const onFormSubmit = async (data: ChannelGroupFormData) => {
    try {
      // 문자열 배열을 객체 배열로 변환 (서버 스키마에 맞춰)
      const channelObjects = data.selectedChannels.map(channelId => {
        const channel = availableChannels.find(ch => ch._id === channelId || ch.channelId === channelId);
        return {
          channelId: channel?.channelId || channelId,
          name: channel?.name || `Channel ${channelId}`
        };
      });

      const groupData: ChannelGroup = {
        _id: editingGroup?._id,
        name: data.name,
        description: data.description || '',
        color: data.color,
        channels: channelObjects,
        keywords: data.keywords,
        isActive: data.isActive,
      };

      console.log('🔍 ChannelGroupModal - 전송할 데이터:', {
        originalSelectedChannels: data.selectedChannels,
        convertedChannelObjects: channelObjects,
        finalGroupData: groupData
      });

      await onSave(groupData);
      onClose();
      reset();
    } catch (error) {
      console.error('채널 그룹 저장 실패:', error);
    }
  };

  // 에러 메시지 컴포넌트
  const ErrorMessage: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return (
      <div className="flex items-center mt-1 text-sm text-red-600">
        <AlertCircle className="w-4 h-4 mr-1" />
        {message}
      </div>
    );
  };

  const modalFooter = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        disabled={isSubmitting}
      >
        취소
      </button>
      <button
        type="submit"
        form="channel-group-form"
        disabled={!isValid || isSubmitting}
        className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '저장 중...' : editingGroup ? '수정' : '생성'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={editingGroup ? '채널 그룹 수정' : '새 채널 그룹 생성'}
      showFooter={true}
      footer={modalFooter}
    >
      <form
        id="channel-group-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-6"
      >
        {/* 기본 정보 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              그룹명 *
            </label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="채널 그룹명을 입력하세요"
                />
              )}
            />
            <ErrorMessage message={errors.name?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={3}
                  placeholder="그룹에 대한 설명을 입력하세요"
                />
              )}
            />
            <ErrorMessage message={errors.description?.message} />
          </div>

          {/* 색상 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              그룹 색상 *
            </label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <div className="space-y-3">
                  {/* 미리 정의된 색상 팔레트 */}
                  <div className="grid grid-cols-6 gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          field.value === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* 커스텀 색상 입력 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded font-mono"
                      placeholder="#000000"
                    />
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: currentColor }}
                    />
                  </div>
                </div>
              )}
            />
            <ErrorMessage message={errors.color?.message} />
          </div>

          {/* 활성 상태 */}
          <div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">활성 그룹</span>
                </label>
              )}
            />
          </div>
        </div>

        {/* 채널 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            포함할 채널 * ({selectedChannels.length}개 선택됨)
          </label>
          <Controller
            name="selectedChannels"
            control={control}
            render={({ field }) => (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                {availableChannels.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    등록된 채널이 없습니다
                  </div>
                ) : (
                  availableChannels.map((channel) => (
                    <label
                      key={channel.channelId}
                      className="flex items-center"
                    >
                      <input
                        type="checkbox"
                        checked={field.value.includes(channel.channelId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...field.value, channel.channelId]);
                          } else {
                            field.onChange(
                              field.value.filter(
                                (id) => id !== channel.channelId
                              )
                            );
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{channel.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          />
          <ErrorMessage message={errors.selectedChannels?.message} />
        </div>

        {/* 키워드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            키워드 태그
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === 'Enter' && (e.preventDefault(), addKeyword())
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="키워드 입력 후 Enter (쉼표로 여러 개 구분 가능)"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(index)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            키워드는 그룹 검색 및 필터링에 사용됩니다
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ChannelGroupModal;
