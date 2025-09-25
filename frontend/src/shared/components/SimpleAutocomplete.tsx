import React from 'react';
import Select from 'react-select';

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

  // 데이터를 react-select 옵션 형태로 변환
  const options: Option[] = React.useMemo(() => {
    const uniqueValues = new Set<string>();

    data.forEach(item => {
      searchFields.forEach(field => {
        const value = item[field];

        if (value) {
          if (Array.isArray(value)) {
            // 배열인 경우 (keywords 등)
            value.forEach(v => {
              if (typeof v === 'string' && v.trim() && v.length >= 2) {
                uniqueValues.add(v.trim());
              }
            });
          } else if (typeof value === 'string' && value.trim() && value.length >= 2) {
            // 문자열인 경우 (채널명 등)
            uniqueValues.add(value.trim());
          }
        }
      });
    });

    return Array.from(uniqueValues)
      .sort()
      .map(value => ({
        value,
        label: value
      }));
  }, [data, searchFields]);

  // 검색어 변경 핸들러
  const handleInputChange = (inputValue: string) => {
    performSearch(inputValue);
  };

  // 옵션 선택 핸들러
  const handleOptionSelect = (selectedOption: Option | null) => {
    const searchTerm = selectedOption ? selectedOption.value : '';
    performSearch(searchTerm);
  };

  // 실제 검색 수행 함수
  const performSearch = (searchTerm: string) => {
    if (onSearchChange) {
      // 검색어로 원본 데이터 필터링
      const filteredData = data.filter(item => {
        if (!searchTerm) return true; // 빈 검색어면 모든 데이터 반환

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

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: '#d1d5db',
      '&:hover': {
        borderColor: '#3b82f6'
      },
      '&:focus-within': {
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
      }
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#6b7280'
    })
  };

  return (
    <div className={className}>
      <Select
        options={options}
        placeholder={placeholder}
        isSearchable
        isClearable
        onInputChange={handleInputChange}
        onChange={handleOptionSelect}
        styles={customStyles}
        noOptionsMessage={() => "검색 결과가 없습니다"}
        loadingMessage={() => "로딩 중..."}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    </div>
  );
};

export default SimpleAutocomplete;