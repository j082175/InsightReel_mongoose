/**
 * 비디오 관련 유틸리티 함수들
 */

import { Video } from '../types';

/**
 * 비디오 ID를 추출합니다.
 * 다양한 ID 필드 중 첫 번째로 유효한 값을 반환합니다.
 */
export const getVideoId = (video: Video): string | number => {
  return video.id || video._id || video.videoId || 0;
};

/**
 * 썸네일 URL을 추출합니다.
 * 다양한 썸네일 필드 중 첫 번째로 유효한 값을 반환합니다.
 */
export const getThumbnailUrl = (video: Video): string => {
  return video.thumbnailUrl || video.thumbnail || '';
};

/**
 * 조회수를 추출합니다.
 * views 또는 viewCount 중 유효한 값을 반환합니다.
 */
export const getViewCount = (video: Video): number => {
  return video.views || video.viewCount || 0;
};