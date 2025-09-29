import React from 'react';

export interface SearchBarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
  children?: React.ReactNode;
  // Legacy/compatibility props
  onSearchChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  // Additional UI state props
  loading?: boolean;
  error?: string;
  totalResults?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchTermChange,
  placeholder = '제목, 채널명, 태그로 검색...',
  showFilters = false,
  className = '',
  children,
  // Legacy/compatibility props
  onSearchChange,
  onSearch,
  value,
  onChange,
  onClear,
  // Additional UI state props
  loading,
  error,
  totalResults,
}) => {

  // Use value prop as fallback for searchTerm
  const currentValue = value !== undefined ? value : searchTerm;

  // Handle change events with fallback
  const handleChange = (newValue: string) => {
    onSearchTermChange?.(newValue);
    onSearchChange?.(newValue);
    onChange?.(newValue);
  };
  return (
    <div className={`bg-white rounded-lg shadow p-4 mb-6 ${className}`}>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute right-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {showFilters && <div className="flex flex-wrap gap-3">{children}</div>}
      </div>
    </div>
  );
};

export default SearchBar;
