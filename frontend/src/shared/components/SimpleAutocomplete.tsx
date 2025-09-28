import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SimpleAutocompleteProps<T> {
  data: T[];
  searchFields: (keyof T)[];
  placeholder?: string;
  onSearchChange?: (searchTerm: string, filteredData: T[]) => void;
  className?: string;
}

const SimpleAutocomplete = <T extends Record<string, any>>({
  data,
  searchFields,
  placeholder = "검색...",
  onSearchChange,
  className = ""
}: SimpleAutocompleteProps<T>) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 데이터를 옵션으로 변환
  useEffect(() => {
    const uniqueValues = new Set<string>();

    // data가 배열인지 확인
    if (!Array.isArray(data)) {
      setOptions([]);
      return;
    }

    data.forEach(item => {
      searchFields.forEach(field => {
        const value = item[field];

        if (value) {
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (typeof v === 'string' && v.trim() && v.length >= 2) {
                uniqueValues.add(v.trim());
              }
            });
          } else if (typeof value === 'string' && value.trim() && value.length >= 2) {
            uniqueValues.add(value.trim());
          }
        }
      });
    });

    const newOptions = Array.from(uniqueValues)
      .sort()
      .map(value => ({
        value,
        label: value
      }));

    setOptions(newOptions);
  }, [data, searchFields]);

  // 검색 수행 함수
  const performSearch = (searchTerm: string) => {
    if (onSearchChange) {
      // data가 배열인지 확인
      if (!Array.isArray(data)) {
        onSearchChange(searchTerm, []);
        return;
      }

      const filteredData = data.filter(item => {
        if (!searchTerm) return true;

        return searchFields.some(field => {
          const value = item[field];

          if (Array.isArray(value)) {
            return value.some(v =>
              typeof v === 'string' &&
              v.toLowerCase().includes(searchTerm.toLowerCase())
            );
          } else if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm.toLowerCase());
          }

          return false;
        });
      });

      onSearchChange(searchTerm, filteredData);
    }
  };

  // 입력 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    setHighlightedIndex(-1);
    performSearch(value);
  };

  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // 옵션 선택 핸들러
  const handleOptionSelect = (option: Option) => {
    setInputValue(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    performSearch(option.value);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 입력창 포커스 시 드롭다운 열기
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // 하이라이트된 옵션 자동 스크롤
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [highlightedIndex]);

  // 검색어에 맞는 옵션 필터링
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Clear 버튼 핸들러
  const handleClear = () => {
    setInputValue('');
    setIsOpen(false);
    performSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 검색 입력창 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
        />

        {/* Clear 버튼 */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* 자동완성 드롭다운 */}
      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              onClick={() => handleOptionSelect(option)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 메시지 */}
      {isOpen && inputValue && filteredOptions.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
        >
          <div className="px-3 py-2 text-gray-500 text-center">
            검색 결과가 없습니다
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleAutocomplete;