/**
 * 비디오 관련 유틸리티 함수들
 */

import { Video } from '../types';

/**
 * 비디오 ID를 추출합니다.
 * ⚡ _id 표준화: MongoDB _id를 표준으로 사용
 */
export const getVideoId = (video: Video): string => {
  // _id가 필수이므로 fallback 최소화
  return video?._id || video?.id || '';
};

/**
 * 썸네일 URL을 추출합니다.
 * ⚡ 표준화: thumbnailUrl이 필수이므로 간소화
 */
export const getThumbnailUrl = (video: Video): string => {
  // thumbnailUrl이 필수이므로 기본 반환
  return video?.thumbnailUrl || '';
};

/**
 * 조회수를 추출합니다.
 * ⚡ 표준화: views가 필수이므로 간소화
 */
export const getViewCount = (video: Video): number => {
  // views가 필수이므로 기본 반환
  return video?.views || 0;
};
