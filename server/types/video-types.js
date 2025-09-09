/**
 * 🎯 InsightReel 통합 비디오 타입 정의
 * VideoOptimized.js 스키마를 기준으로 한 전체 시스템 표준
 * 
 * Last Updated: 2025-09-09
 */

// ===== 공통 필드 타입 정의 =====

/**
 * 플랫폼별 공통 기본 필드 (모든 플랫폼 공유)
 */
const COMMON_FIELDS = {
  // 자동 생성 필드
  rowNumber: 'number',
  
  // 기본 메타데이터 (모든 플랫폼 공통)
  uploadDate: 'string',          // 업로드날짜 (ISO 8601)
  platform: 'string',            // 플랫폼 ('youtube' | 'instagram')
  channelName: 'string',          // 채널이름 (통합 필드명)
  channelUrl: 'string',           // 채널URL
  
  // AI 카테고리 분석 결과
  mainCategory: 'string',         // 대카테고리
  middleCategory: 'string',       // 중카테고리
  fullCategoryPath: 'string',     // 전체카테고리경로
  categoryDepth: 'number',        // 카테고리깊이
  
  // 콘텐츠 분석
  keywords: 'string',             // 키워드 (콤마 구분)
  hashtags: 'string',             // 해시태그 (콤마 구분)  
  mentions: 'string',             // 멘션 (콤마 구분)
  description: 'string',          // 설명/캡션
  analysisContent: 'string',      // 분석내용 (AI 생성)
  
  // 성과 지표
  likes: 'number',                // 좋아요수
  commentsCount: 'number',        // 댓글수 (통합 필드명)
  
  // URL 정보
  url: 'string',                  // 원본 영상 URL (고유키)
  thumbnailUrl: 'string',         // 썸네일URL
  
  // 메타 정보
  confidence: 'string',           // AI 분석 신뢰도
  analysisStatus: 'string',       // 분석상태
  collectionTime: 'Date'          // 수집시간
};

/**
 * YouTube 전용 확장 필드
 */
const YOUTUBE_SPECIFIC_FIELDS = {
  youtubeHandle: 'string',        // YouTube핸들명 (@채널명)
  comments: 'string',             // 댓글 내용
  views: 'number',                // 조회수
  duration: 'string',             // 영상길이 (mm:ss)
  subscribers: 'number',          // 구독자수
  channelVideos: 'number',        // 채널동영상수
  monetized: 'string',            // 수익화여부
  youtubeCategory: 'string',      // YouTube 기본카테고리
  license: 'string',              // 라이센스
  quality: 'string',              // 화질
  language: 'string',             // 언어
  categoryMatchRate: 'string',    // 카테고리일치율
  matchType: 'string',            // 일치유형
  matchReason: 'string'           // 일치사유
};

/**
 * Instagram 전용 필드 (현재 YouTube 대비 단순화)
 */
const INSTAGRAM_SPECIFIC_FIELDS = {
  // Instagram은 현재 공통 필드만 사용
  // 향후 Stories, Reels 등 타입별 확장 가능
};

// ===== MongoDB 스키마 매핑 =====

/**
 * YouTube 비디오 완전 스키마 (34개 필드)
 * Google Sheets 헤더와 1:1 매핑
 */
const YOUTUBE_SCHEMA_MAPPING = {
  1: 'uploadDate',         // 업로드날짜
  2: 'platform',           // 플랫폼
  3: 'channelName',        // 채널이름 ⭐ 표준화
  4: 'youtubeHandle',      // YouTube핸들명
  5: 'channelUrl',         // 채널URL
  6: 'mainCategory',       // 대카테고리
  7: 'middleCategory',     // 중카테고리
  8: 'fullCategoryPath',   // 전체카테고리경로
  9: 'categoryDepth',      // 카테고리깊이
  10: 'keywords',          // 키워드
  11: 'hashtags',          // 해시태그
  12: 'mentions',          // 멘션
  13: 'description',       // 설명
  14: 'analysisContent',   // 분석내용
  15: 'comments',          // 댓글
  16: 'likes',             // 좋아요
  17: 'commentsCount',     // 댓글수 ⭐ 표준화
  18: 'views',             // 조회수
  19: 'duration',          // 영상길이
  20: 'subscribers',       // 구독자수
  21: 'channelVideos',     // 채널동영상수
  22: 'monetized',         // 수익화여부
  23: 'youtubeCategory',   // YouTube카테고리
  24: 'license',           // 라이센스
  25: 'quality',           // 화질
  26: 'language',          // 언어
  27: 'url',               // URL
  28: 'thumbnailUrl',      // 썸네일URL
  29: 'confidence',        // 신뢰도
  30: 'analysisStatus',    // 분석상태
  31: 'categoryMatchRate', // 카테고리일치율
  32: 'matchType',         // 일치유형
  33: 'matchReason',       // 일치사유
  34: 'collectionTime'     // 수집시간
};

/**
 * Instagram 비디오 완전 스키마 (20개 필드)
 * Google Sheets 헤더와 1:1 매핑
 */
const INSTAGRAM_SCHEMA_MAPPING = {
  1: 'uploadDate',         // 업로드날짜
  2: 'platform',           // 플랫폼
  3: 'channelName',        // 채널이름 ⭐ 표준화
  4: 'channelUrl',         // 채널URL
  5: 'mainCategory',       // 대카테고리
  6: 'middleCategory',     // 중카테고리
  7: 'fullCategoryPath',   // 전체카테고리경로
  8: 'categoryDepth',      // 카테고리깊이
  9: 'keywords',           // 키워드
  10: 'hashtags',          // 해시태그
  11: 'mentions',          // 멘션
  12: 'description',       // 설명
  13: 'analysisContent',   // 분석내용
  14: 'likes',             // 좋아요
  15: 'commentsCount',     // 댓글수 ⭐ 표준화
  16: 'url',               // URL
  17: 'thumbnailUrl',      // 썸네일URL
  18: 'confidence',        // 신뢰도
  19: 'analysisStatus',    // 분석상태
  20: 'collectionTime'     // 수집시간
};

// ===== 필드명 표준화 매핑 =====

/**
 * 기존 → 표준 필드명 매핑 테이블
 * 마이그레이션 시 참조용
 */
const FIELD_STANDARDIZATION_MAP = {
  // 채널 정보 표준화
  'account': 'channelName',
  'author': 'channelName',
  'channel': 'channelName',
  'creator': 'channelName',
  
  // 댓글 수 표준화  
  'comments_count': 'commentsCount',
  'comment_count': 'commentsCount',
  'total_comments': 'commentsCount',
  
  // 날짜 표준화
  'originalPublishDate': 'uploadDate',
  'publishDate': 'uploadDate',
  'posted_at': 'uploadDate',
  'created_at': 'uploadDate',
  
  // URL 표준화
  'originalUrl': 'url',
  'video_url': 'url',
  'link': 'url'
};

// ===== 유틸리티 함수 =====

/**
 * 플랫폼별 스키마 매핑 반환
 */
function getSchemaMapping(platform) {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return YOUTUBE_SCHEMA_MAPPING;
    case 'instagram':
      return INSTAGRAM_SCHEMA_MAPPING;
    default:
      throw new Error(`지원되지 않는 플랫폼: ${platform}`);
  }
}

/**
 * 플랫폼별 필드 개수 반환
 */
function getFieldCount(platform) {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return 34; // rowNumber 포함
    case 'instagram':
      return 20; // rowNumber 포함
    default:
      throw new Error(`지원되지 않는 플랫폼: ${platform}`);
  }
}

/**
 * 레거시 필드명을 표준 필드명으로 변환
 */
function standardizeFieldName(oldFieldName) {
  return FIELD_STANDARDIZATION_MAP[oldFieldName] || oldFieldName;
}

/**
 * 데이터 객체의 모든 필드명을 표준화
 */
function standardizeDataObject(data) {
  const standardized = {};
  
  for (const [key, value] of Object.entries(data)) {
    const standardKey = standardizeFieldName(key);
    standardized[standardKey] = value;
  }
  
  return standardized;
}

module.exports = {
  // 필드 정의
  COMMON_FIELDS,
  YOUTUBE_SPECIFIC_FIELDS,
  INSTAGRAM_SPECIFIC_FIELDS,
  
  // 스키마 매핑
  YOUTUBE_SCHEMA_MAPPING,
  INSTAGRAM_SCHEMA_MAPPING,
  
  // 표준화 매핑
  FIELD_STANDARDIZATION_MAP,
  
  // 유틸리티 함수
  getSchemaMapping,
  getFieldCount,
  standardizeFieldName,
  standardizeDataObject,
  
  // 표준 필드명 목록 (TypeScript 타입 생성용)
  STANDARD_FIELD_NAMES: {
    youtube: Object.values(YOUTUBE_SCHEMA_MAPPING),
    instagram: Object.values(INSTAGRAM_SCHEMA_MAPPING),
    common: Object.keys(COMMON_FIELDS)
  }
};