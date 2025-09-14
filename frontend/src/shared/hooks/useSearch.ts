import { useState, useMemo } from 'react';
import { Video } from '../types';

export interface UseSearchOptions<T> {
  searchFields?: (keyof T)[];
  defaultSearchTerm?: string;
}

export interface SearchResult<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredData: T[];
  searchCount: number;
}

export function useSearch<T = Video>(
  data: T[] = [], 
  options: UseSearchOptions<T> = {}
): SearchResult<T> {
  const { 
    searchFields = ['title', 'channelName', 'tags'] as (keyof T)[], 
    defaultSearchTerm = '' 
  } = options;

  const [searchTerm, setSearchTerm] = useState<string>(defaultSearchTerm);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const searchLower = searchTerm.toLowerCase();
    
    return data.filter((item) => {
      return searchFields.some(field => {
        const value = item[field];
        
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchLower);
        }
        
        if (Array.isArray(value)) {
          return value.some((arrayItem: any) => 
            String(arrayItem).toLowerCase().includes(searchLower)
          );
        }
        
        return String(value || '').toLowerCase().includes(searchLower);
      });
    });
  }, [data, searchTerm, searchFields]);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    searchCount: filteredData.length
  };
}