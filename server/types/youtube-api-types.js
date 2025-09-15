/**
 * 🎬 YouTube API v3 응답 구조 타입 정의
 * 타입 안전성 향상 및 개발자 경험 개선을 위한 JSDoc 기반 타입 정의
 */

/**
 * @typedef {Object} YouTubeVideoId
 * @property {string} kind - 리소스 종류 ("youtube#video")
 * @property {string} videoId - YouTube 비디오 ID
 */

/**
 * @typedef {Object} YouTubeThumbnail
 * @property {string} url - 썸네일 URL
 * @property {number} width - 썸네일 너비
 * @property {number} height - 썸네일 높이
 */

/**
 * @typedef {Object} YouTubeThumbnails
 * @property {YouTubeThumbnail} [default] - 기본 썸네일 (120x90)
 * @property {YouTubeThumbnail} [medium] - 중간 썸네일 (320x180)
 * @property {YouTubeThumbnail} [high] - 고화질 썸네일 (480x360)
 * @property {YouTubeThumbnail} [standard] - 표준 썸네일 (640x480)
 * @property {YouTubeThumbnail} [maxres] - 최고화질 썸네일 (1280x720)
 */

/**
 * @typedef {Object} YouTubeVideoSnippet
 * @property {string} publishedAt - 게시 날짜 (ISO 8601 형식)
 * @property {string} channelId - 채널 ID
 * @property {string} title - 비디오 제목
 * @property {string} description - 비디오 설명
 * @property {YouTubeThumbnails} thumbnails - 썸네일 객체
 * @property {string} channelTitle - 채널명
 * @property {string[]} [tags] - 태그 배열
 * @property {string} categoryId - 카테고리 ID
 * @property {string} liveBroadcastContent - 라이브 방송 콘텐츠 ("none", "upcoming", "live")
 * @property {string} [defaultLanguage] - 기본 언어
 * @property {Object} [localized] - 지역화된 정보
 * @property {string} [defaultAudioLanguage] - 기본 오디오 언어
 */

/**
 * @typedef {Object} YouTubeVideoStatistics
 * @property {string} viewCount - 조회수 (문자열)
 * @property {string} [likeCount] - 좋아요 수 (문자열, 비공개일 수 있음)
 * @property {string} [dislikeCount] - 싫어요 수 (문자열, 더 이상 제공되지 않음)
 * @property {string} [favoriteCount] - 즐겨찾기 수 (문자열, 항상 0)
 * @property {string} [commentCount] - 댓글 수 (문자열, 비공개일 수 있음)
 */

/**
 * @typedef {Object} YouTubeVideoContentDetails
 * @property {string} duration - 비디오 길이 (ISO 8601 duration 형식, 예: "PT4M13S")
 * @property {string} [dimension] - 화면 비율 ("2d", "3d")
 * @property {string} [definition] - 화질 ("hd", "sd")
 * @property {string} [caption] - 자막 여부 ("true", "false")
 * @property {boolean} [licensedContent] - 라이선스 콘텐츠 여부
 * @property {Object} [regionRestriction] - 지역 제한 정보
 * @property {string} [projection] - 프로젝션 타입 ("rectangular", "360")
 */

/**
 * @typedef {Object} YouTubeVideoStatus
 * @property {string} uploadStatus - 업로드 상태
 * @property {string} privacyStatus - 공개 상태 ("public", "unlisted", "private")
 * @property {string} [license] - 라이선스 ("youtube", "creativeCommon")
 * @property {boolean} embeddable - 임베드 가능 여부
 * @property {boolean} publicStatsViewable - 공개 통계 보기 가능 여부
 */

/**
 * @typedef {Object} YouTubeVideo
 * @property {string} kind - 리소스 종류 ("youtube#video")
 * @property {string} etag - ETag
 * @property {string|YouTubeVideoId} id - 비디오 ID (Search API: 객체, Videos API: 문자열)
 * @property {YouTubeVideoSnippet} snippet - 기본 정보
 * @property {YouTubeVideoStatistics} [statistics] - 통계 정보 (요청 시에만 포함)
 * @property {YouTubeVideoContentDetails} [contentDetails] - 콘텐츠 세부사항 (요청 시에만 포함)
 * @property {YouTubeVideoStatus} [status] - 상태 정보 (요청 시에만 포함)
 */

/**
 * @typedef {Object} YouTubeSearchResponse
 * @property {string} kind - 응답 종류 ("youtube#searchListResponse")
 * @property {string} etag - ETag
 * @property {string} [nextPageToken] - 다음 페이지 토큰
 * @property {string} [prevPageToken] - 이전 페이지 토큰
 * @property {Object} pageInfo - 페이지 정보
 * @property {number} pageInfo.totalResults - 총 결과 수
 * @property {number} pageInfo.resultsPerPage - 페이지당 결과 수
 * @property {YouTubeVideo[]} items - 비디오 목록
 */

/**
 * @typedef {Object} YouTubeVideosResponse
 * @property {string} kind - 응답 종류 ("youtube#videoListResponse")
 * @property {string} etag - ETag
 * @property {YouTubeVideo[]} items - 비디오 목록
 * @property {Object} pageInfo - 페이지 정보
 * @property {number} pageInfo.totalResults - 총 결과 수
 * @property {number} pageInfo.resultsPerPage - 페이지당 결과 수
 */

/**
 * 타입 안전한 데이터 접근을 위한 유틸리티 함수들
 */
class YouTubeApiTypeUtils {
  /**
   * 비디오 ID를 안전하게 추출
   * @param {YouTubeVideo} video - YouTube 비디오 객체
   * @returns {string|null} 비디오 ID 또는 null
   */
  static extractVideoId(video) {
    if (!video || !video.id) return null;

    // Search API 응답 (객체 형태)
    if (typeof video.id === 'object' && video.id.videoId) {
      return video.id.videoId;
    }

    // Videos API 응답 (문자열 형태)
    if (typeof video.id === 'string') {
      return video.id;
    }

    return null;
  }

  /**
   * 조회수를 안전하게 숫자로 변환
   * @param {YouTubeVideo} video - YouTube 비디오 객체
   * @returns {number} 조회수 (변환 실패 시 0)
   */
  static parseViewCount(video) {
    if (!video?.statistics?.viewCount) return 0;
    const parsed = parseInt(video.statistics.viewCount, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 좋아요 수를 안전하게 숫자로 변환
   * @param {YouTubeVideo} video - YouTube 비디오 객체
   * @returns {number} 좋아요 수 (변환 실패 시 0)
   */
  static parseLikeCount(video) {
    if (!video?.statistics?.likeCount) return 0;
    const parsed = parseInt(video.statistics.likeCount, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 댓글 수를 안전하게 숫자로 변환
   * @param {YouTubeVideo} video - YouTube 비디오 객체
   * @returns {number} 댓글 수 (변환 실패 시 0)
   */
  static parseCommentCount(video) {
    if (!video?.statistics?.commentCount) return 0;
    const parsed = parseInt(video.statistics.commentCount, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 설명을 안전하게 추출하고 길이 제한 적용
   * @param {YouTubeVideo} video - YouTube 비디오 객체
   * @param {number} maxLength - 최대 길이 (기본값: 1000)
   * @returns {string} 설명 텍스트
   */
  static extractDescription(video, maxLength = 1000) {
    const description = video?.snippet?.description || '';
    return description.substring(0, maxLength);
  }

  /**
   * 고화질 썸네일 URL을 안전하게 추출
   * @param {YouTubeVideo} video - YouTube 비디오 객체
   * @returns {string} 썸네일 URL (없으면 빈 문자열)
   */
  static extractThumbnailUrl(video) {
    const thumbnails = video?.snippet?.thumbnails;
    if (!thumbnails) return '';

    // 우선순위: maxres > high > standard > medium > default
    return thumbnails.maxres?.url ||
           thumbnails.high?.url ||
           thumbnails.standard?.url ||
           thumbnails.medium?.url ||
           thumbnails.default?.url ||
           '';
  }

  /**
   * 업로드 날짜를 안전하게 Date 객체로 변환
   * @param {YouTubeVideo} video - YouTube 비디오 객체
   * @returns {Date} 업로드 날짜 (변환 실패 시 현재 시간)
   */
  static parseUploadDate(video) {
    const publishedAt = video?.snippet?.publishedAt;
    if (!publishedAt) return new Date();

    const parsed = new Date(publishedAt);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}

module.exports = {
  YouTubeApiTypeUtils
};