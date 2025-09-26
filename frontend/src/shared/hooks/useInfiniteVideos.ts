import { useInfiniteQuery } from '@tanstack/react-query';
import { videosApi } from '../services/apiClient';
import { Video } from '../types';

/**
 * 무한 스크롤링을 위한 비디오 목록 훅
 */
export const useInfiniteVideos = (batchId?: string, pageSize = 50) => {
  return useInfiniteQuery({
    queryKey: ['videos', 'infinite', { batchId, pageSize }],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('🔄 [useInfiniteVideos] 페이지 로딩 시작:', {
        pageParam,
        pageSize,
        batchId,
        apiCall: `videosApi.getVideos("${batchId}", ${pageSize}, ${pageParam})`
      });
      const result = await videosApi.getVideos(batchId, pageSize, pageParam);
      console.log('✅ [useInfiniteVideos] 페이지 로딩 완료:', {
        pageParam,
        videosCount: result.videos.length,
        pagination: result.pagination,
        hasMore: result.pagination?.hasMore,
        nextOffset: result.pagination?.hasMore ? result.pagination.offset + result.pagination.limit : null,
        실제서버응답구조: Object.keys(result)
      });
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      const { pagination } = lastPage;
      console.log('🔍 [useInfiniteVideos] getNextPageParam 호출:', {
        currentOffset: pagination?.offset,
        limit: pagination?.limit,
        total: pagination?.total,
        hasMore: pagination?.hasMore,
        videosInThisPage: lastPage.videos?.length,
        totalVideosFromAllPages: allPages.reduce((sum, page) => sum + (page.videos?.length || 0), 0),
        allPagesCount: allPages.length,
        lastPageVideos: lastPage.videos?.length,
        nextOffset: pagination?.hasMore ? pagination.offset + pagination.limit : undefined,
        // 상세한 pagination 객체 전체
        fullPagination: JSON.stringify(pagination, null, 2)
      });
      if (pagination?.hasMore) {
        const nextOffset = pagination.offset + pagination.limit;
        console.log('✅ [useInfiniteVideos] 다음 페이지 로드:', nextOffset);
        return nextOffset;
      }
      console.log('❌ [useInfiniteVideos] 더 이상 로드할 페이지 없음');
      return undefined;
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    initialPageParam: 0,
  });
};

/**
 * 모든 페이지의 비디오를 평탄화하여 반환하는 유틸리티 함수
 */
export const flattenInfiniteVideos = (data: any): Video[] => {
  if (!data?.pages) return [];
  return data.pages.flatMap((page: any) => page.videos || []);
};

/**
 * 전체 비디오 개수 계산
 */
export const getTotalVideosCount = (data: any): number => {
  if (!data?.pages || data.pages.length === 0) return 0;
  const firstPage = data.pages[0];
  return firstPage.pagination?.total || 0;
};