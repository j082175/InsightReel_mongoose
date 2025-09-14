/**
 * 비디오 관련 유틸리티 함수들
 */

import { Video } from '../types';

/**
 * 비디오 ID를 추출합니다.
 * ⚡ id 통일: 서버에서 변환된 id 필드 사용 (response-normalizer.js)
 */
export const getVideoId = (video: Video): string => {
  // 서버에서 _id → id 변환됨 - fallback 불필요
  return video.id;
};

/**
 * 썸네일 URL을 추출합니다.
 * ⚡ 단순화됨: 이제 thumbnailUrl 필드만 사용
 */
export const getThumbnailUrl = (video: Video): string => {
  return video.thumbnailUrl || '';
};

/**
 * 조회수를 추출합니다.
 * ⚡ 단순화됨: 이제 views 필드만 사용
 */
export const getViewCount = (video: Video): number => {
  return video.views || 0;
};