/**
 * 🎯 API 응답 표준화 유틸리티
 * MongoDB 모델들을 프론트엔드 친화적인 형태로 변환
 */

/**
 * 비디오 객체를 표준화된 API 응답 형태로 변환
 * @param {Object} video - MongoDB 비디오 문서
 * @param {Object} options - 변환 옵션
 * @returns {Object} 표준화된 비디오 객체
 */
const normalizeVideoResponse = (video, options = {}) => {
  if (!video) return null;

  // MongoDB _id 필드 제거 및 표준 id 생성
  const { _id, __v, ...cleanVideo } = video;

  return {
    // 표준 ID: MongoDB _id를 문자열로 변환
    id: _id ? _id.toString() : undefined,

    // 기본 필드들 그대로 유지
    ...cleanVideo,

    // 표준 썸네일 URL (fallback 처리)
    thumbnailUrl: cleanVideo.thumbnailUrl || cleanVideo.thumbnail || '',

    // 표준 조회수 (fallback 처리)
    views: cleanVideo.views || cleanVideo.viewCount || 0,

    // API 메타 정보
    source: options.source || 'api',
    isFromTrending: options.isFromTrending || false,

    // 날짜 필드 통일
    collectedAt: cleanVideo.collectionDate || cleanVideo.collectedAt || cleanVideo.createdAt,
  };
};

/**
 * 비디오 배열을 표준화
 * @param {Array} videos - 비디오 객체 배열
 * @param {Object} options - 변환 옵션
 * @returns {Array} 표준화된 비디오 배열
 */
const normalizeVideosResponse = (videos, options = {}) => {
  if (!Array.isArray(videos)) return [];

  return videos.map(video => normalizeVideoResponse(video, options));
};

/**
 * 채널 객체를 표준화 (필요시 확장 가능)
 * @param {Object} channel - MongoDB 채널 문서
 * @returns {Object} 표준화된 채널 객체
 */
const normalizeChannelResponse = (channel) => {
  if (!channel) return null;

  const { _id, __v, ...cleanChannel } = channel;

  return {
    id: _id ? _id.toString() : undefined,
    ...cleanChannel
  };
};

module.exports = {
  normalizeVideoResponse,
  normalizeVideosResponse,
  normalizeChannelResponse
};