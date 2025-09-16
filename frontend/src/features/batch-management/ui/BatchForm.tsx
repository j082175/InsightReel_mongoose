import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, AlertCircle } from 'lucide-react';
import {
  batchFormSchema,
  BatchFormData,
  getDefaultBatchFormData,
} from '../../../shared/schemas/batchSchema';
import { Modal } from '../../../shared/components';

interface BatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BatchFormData) => Promise<void>;
  formData?: Partial<BatchFormData>;
  channelGroups: Array<{ id: string; name: string; color: string }>;
  channels: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

const BatchForm: React.FC<BatchFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData: initialData,
  channelGroups = [],
  channels = [],
  isSubmitting = false,
}) => {
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeKeywordInput, setExcludeKeywordInput] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: getDefaultBatchFormData(),
    mode: 'onChange', // 실시간 유효성 검사
  });

  // 폼 초기화 (모달이 열릴 때)
  useEffect(() => {
    if (isOpen) {
      const defaultData = getDefaultBatchFormData();
      reset(initialData ? { ...defaultData, ...initialData } : defaultData);
    }
  }, [isOpen, initialData, reset]);

  // 컬렉션 타입 감시
  const collectionType = watch('collectionType');
  const keywords = watch('criteria.keywords');
  const excludeKeywords = watch('criteria.excludeKeywords');

  // 키워드 추가 함수
  const addKeyword = () => {
    if (keywordInput.trim()) {
      const currentKeywords = keywords || [];
      setValue('criteria.keywords', [...currentKeywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    const currentKeywords = keywords || [];
    setValue(
      'criteria.keywords',
      currentKeywords.filter((_, i) => i !== index)
    );
  };

  // 제외 키워드 추가 함수
  const addExcludeKeyword = () => {
    if (excludeKeywordInput.trim()) {
      const currentExcludeKeywords = excludeKeywords || [];
      setValue('criteria.excludeKeywords', [
        ...currentExcludeKeywords,
        excludeKeywordInput.trim(),
      ]);
      setExcludeKeywordInput('');
    }
  };

  const removeExcludeKeyword = (index: number) => {
    const currentExcludeKeywords = excludeKeywords || [];
    setValue(
      'criteria.excludeKeywords',
      currentExcludeKeywords.filter((_, i) => i !== index)
    );
  };

  // 폼 제출
  const onFormSubmit = async (data: BatchFormData) => {
    try {
      await onSubmit(data);
      onClose();
      reset();
    } catch (error) {
      console.error('배치 생성 실패:', error);
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
        form="batch-form"
        disabled={!isValid || isSubmitting}
        className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '생성 중...' : '배치 생성'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="새 배치 생성"
      showFooter={true}
      footer={modalFooter}
    >
      <form
        id="batch-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-6"
      >
        {/* 기본 정보 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              배치 이름 *
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
                  placeholder="배치 이름을 입력하세요"
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
                  placeholder="배치에 대한 설명을 입력하세요"
                />
              )}
            />
            <ErrorMessage message={errors.description?.message} />
          </div>
        </div>

        {/* 수집 대상 선택 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수집 대상 *
            </label>
            <Controller
              name="collectionType"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="group"
                      checked={field.value === 'group'}
                      onChange={() => field.onChange('group')}
                      className="mr-2"
                    />
                    채널 그룹으로 수집
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="channels"
                      checked={field.value === 'channels'}
                      onChange={() => field.onChange('channels')}
                      className="mr-2"
                    />
                    개별 채널로 수집
                  </label>
                </div>
              )}
            />
            <ErrorMessage message={errors.collectionType?.message} />
          </div>

          {/* 채널 그룹 선택 */}
          {collectionType === 'group' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                채널 그룹 선택 *
              </label>
              <Controller
                name="selectedGroups"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                    {channelGroups.length === 0 ? (
                      <div className="text-gray-500 text-sm">
                        등록된 채널 그룹이 없습니다
                      </div>
                    ) : (
                      channelGroups.map((group) => (
                        <label key={group.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={field.value.includes(group.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, group.id]);
                              } else {
                                field.onChange(
                                  field.value.filter((id) => id !== group.id)
                                );
                              }
                            }}
                            className="mr-2"
                          />
                          <span
                            className="inline-block w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: group.color }}
                          />
                          {group.name}
                        </label>
                      ))
                    )}
                  </div>
                )}
              />
              <ErrorMessage message={errors.selectedGroups?.message} />
            </div>
          )}

          {/* 개별 채널 선택 */}
          {collectionType === 'channels' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                채널 선택 *
              </label>
              <Controller
                name="selectedChannels"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                    {channels.length === 0 ? (
                      <div className="text-gray-500 text-sm">
                        등록된 채널이 없습니다
                      </div>
                    ) : (
                      channels.map((channel) => (
                        <label key={channel.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={field.value.includes(channel.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, channel.id]);
                              } else {
                                field.onChange(
                                  field.value.filter((id) => id !== channel.id)
                                );
                              }
                            }}
                            className="mr-2"
                          />
                          {channel.name}
                        </label>
                      ))
                    )}
                  </div>
                )}
              />
              <ErrorMessage message={errors.selectedChannels?.message} />
            </div>
          )}
        </div>

        {/* 수집 조건 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">수집 조건</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수집 기간 (일)
              </label>
              <Controller
                name="criteria.daysBack"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min={1}
                    max={365}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 1)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.criteria?.daysBack
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                )}
              />
              <ErrorMessage message={errors.criteria?.daysBack?.message} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 조회수
              </label>
              <Controller
                name="criteria.minViews"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min={0}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.criteria?.minViews
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                )}
              />
              <ErrorMessage message={errors.criteria?.minViews?.message} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              최대 조회수 (0이면 제한 없음)
            </label>
            <Controller
              name="criteria.maxViews"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min={0}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 0)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.criteria?.maxViews
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                />
              )}
            />
            <ErrorMessage message={errors.criteria?.maxViews?.message} />
          </div>

          {/* 영상 길이 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              영상 길이 타입 *
            </label>
            <div className="space-y-2">
              <Controller
                name="criteria.includeShorts"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mr-2"
                    />
                    숏폼 (60초 이하)
                  </label>
                )}
              />
              <Controller
                name="criteria.includeMidform"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mr-2"
                    />
                    미드폼 (61-180초)
                  </label>
                )}
              />
              <Controller
                name="criteria.includeLongForm"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mr-2"
                    />
                    롱폼 (181초 이상)
                  </label>
                )}
              />
            </div>
            <ErrorMessage message={errors.criteria?.includeShorts?.message} />
          </div>

          {/* 포함 키워드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              포함 키워드
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
                placeholder="키워드 입력 후 Enter 또는 추가 버튼"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {keywords && keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={`include-${keyword}-${index}`}
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
          </div>

          {/* 제외 키워드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제외 키워드
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={excludeKeywordInput}
                onChange={(e) => setExcludeKeywordInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addExcludeKeyword())
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="제외할 키워드 입력"
              />
              <button
                type="button"
                onClick={addExcludeKeyword}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {excludeKeywords && excludeKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {excludeKeywords.map((keyword, index) => (
                  <span
                    key={`exclude-${keyword}-${index}`}
                    className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm rounded"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeExcludeKeyword(index)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BatchForm;
