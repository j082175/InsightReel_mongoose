import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

export type FieldType = 'text' | 'textarea' | 'number' | 'tags' | 'select';

export interface FieldConfig {
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface EditableFieldProps {
  value: any;
  config: FieldConfig;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
  className?: string;
  disabled?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  config,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  className = '',
  disabled = false,
}) => {
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (config.validation) {
      const validationError = config.validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (config.required && !editValue?.toString().trim()) {
      setError('이 필드는 필수입니다');
      return;
    }

    setError(null);
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    setError(null);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && config.type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderDisplayValue = () => {
    if (!value && value !== 0) {
      return (
        <span className="text-gray-400 italic">
          {config.placeholder || '값을 추가하려면 클릭하세요'}
        </span>
      );
    }

    switch (config.type) {
      case 'tags':
        const tags = Array.isArray(value) ? value : value.toString().split(',').filter(Boolean);
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        );

      case 'textarea':
        return (
          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto">
            {value.toString()}
          </div>
        );

      case 'number':
        return <span>{Number(value).toLocaleString()}</span>;

      case 'select':
        const option = config.options?.find(opt => opt.value === value);
        return <span>{option?.label || value}</span>;

      default:
        return <span>{value.toString()}</span>;
    }
  };

  const renderEditInput = () => {
    const commonProps = {
      ref: inputRef,
      value: editValue || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder: config.placeholder,
      className: `flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        error ? 'border-red-300' : ''
      }`,
      maxLength: config.maxLength,
    };

    switch (config.type) {
      case 'textarea':
        return (
          <textarea
            {...(commonProps as any)}
            rows={3}
            className={`${commonProps.className} resize-none`}
          />
        );

      case 'number':
        return (
          <input
            {...(commonProps as any)}
            type="number"
            min={config.min}
            max={config.max}
            onChange={(e) => setEditValue(Number(e.target.value))}
          />
        );

      case 'select':
        return (
          <select
            {...(commonProps as any)}
            onChange={(e) => setEditValue(e.target.value)}
          >
            <option value="">선택하세요</option>
            {config.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'tags':
        return (
          <input
            {...(commonProps as any)}
            placeholder="쉼표로 구분하여 입력하세요"
            onChange={(e) => setEditValue(e.target.value)}
          />
        );

      default:
        return <input {...(commonProps as any)} type="text" />;
    }
  };

  if (isEditing) {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center gap-2">
          {renderEditInput()}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
              title="저장"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="취소"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
      </div>
    );
  }

  return (
    <div className={`group cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {renderDisplayValue()}
        </div>
        {!disabled && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 rounded transition-opacity"
            title={`${config.label} 편집`}
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default EditableField;