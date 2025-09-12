/**
 * 🚀 통합 타입 exports (새로운 인터페이스 시스템)
 * server/types/video-types.js, channel-types.js와 동일한 구조
 */

// 새로운 표준 타입들 re-export
export * from './video';
export * from './channel';
export * from './api';

// Import specific types
import type { Video } from './video';

// Hook Return Types
export interface UseVideosResult {
  data: Video[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}