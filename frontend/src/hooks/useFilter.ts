import { useState, useMemo } from 'react';
import { Video } from '../types';

export interface FilterState {
  [key: string]: any;
}

export interface UseFilterOptions<T> {
  defaultFilters?: FilterState;
  filterFunctions?: {
    [key: string]: (item: T, value: any) => boolean;
  };
}

export interface FilterResult<T> {
  filters: FilterState;
  setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  filteredData: T[];
  filterCount: number;
  activeFilterCount: number;
}

export function useFilter<T = Video>(
  data: T[] = [], 
  options: UseFilterOptions<T> = {}
): FilterResult<T> {
  const { 
    defaultFilters = {},
    filterFunctions = {}
  } = options;

  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const filteredData = useMemo(() => {
    if (!Object.keys(filters).length) return data;

    return data.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === '' || value === null || value === undefined || value === 'All') {
          return true;
        }

        if (filterFunctions[key]) {
          return filterFunctions[key](item, value);
        }

        const itemValue = (item as any)[key];

        if (typeof value === 'string') {
          return String(itemValue || '').toLowerCase().includes(value.toLowerCase());
        }

        if (typeof value === 'number') {
          return Number(itemValue) >= value;
        }

        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }

        return itemValue === value;
      });
    });
  }, [data, filters, filterFunctions]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([_, value]) => 
      value !== '' && value !== null && value !== undefined && value !== 'All'
    ).length;
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    filteredData,
    filterCount: filteredData.length,
    activeFilterCount
  };
}