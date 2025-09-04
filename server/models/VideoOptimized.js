/**
 * MongoDB 최적화된 플랫폼별 고정 스키마
 * Google Sheets 헤더와 1:1 완벽 매핑
 * 
 * YouTube: 34개 필드 (헤더 33개 + rowNumber)
 * Instagram: 20개 필드 (헤더 19개 + rowNumber)
 */

const mongoose = require('mongoose');

// 공통 필드 타입 정의
const commonFieldOptions = {
  type: String,
  default: ''
};

const numberFieldOptions = {
  type: Number,
  default: 0
};

const dateFieldOptions = {
  type: Date,
  default: Date.now
};

/**
 * YouTube 고정 스키마 (34개 필드)
 * Google Sheets YouTube 헤더와 완벽 1:1 매핑
 */
const youtubeSchema = new mongoose.Schema({
  // 자동 생성 필드
  rowNumber: { ...numberFieldOptions, index: true },
  
  // YouTube 전용 33개 필드 (Google Sheets 헤더 순서대로)
  uploadDate: { ...commonFieldOptions, index: true },      // 업로드날짜
  platform: { ...commonFieldOptions, index: true },        // 플랫폼  
  account: commonFieldOptions,                              // 계정
  youtubeHandle: commonFieldOptions,                        // YouTube핸들명
  channelUrl: commonFieldOptions,                           // 채널URL
  mainCategory: { ...commonFieldOptions, index: true },    // 대카테고리
  middleCategory: commonFieldOptions,                       // 중카테고리
  fullCategoryPath: commonFieldOptions,                     // 전체카테고리경로
  categoryDepth: numberFieldOptions,                        // 카테고리깊이
  keywords: commonFieldOptions,                             // 키워드
  hashtags: commonFieldOptions,                             // 해시태그
  mentions: commonFieldOptions,                             // 멘션
  description: commonFieldOptions,                          // 설명
  analysisContent: commonFieldOptions,                      // 분석내용
  comments: commonFieldOptions,                             // 댓글
  likes: { ...numberFieldOptions, index: true },           // 좋아요
  commentsCount: numberFieldOptions,                        // 댓글수
  views: { ...numberFieldOptions, index: true },           // 조회수
  duration: commonFieldOptions,                             // 영상길이
  subscribers: numberFieldOptions,                          // 구독자수
  channelVideos: numberFieldOptions,                        // 채널동영상수
  monetized: commonFieldOptions,                            // 수익화여부
  youtubeCategory: commonFieldOptions,                      // YouTube카테고리
  license: commonFieldOptions,                              // 라이센스
  quality: commonFieldOptions,                              // 화질
  language: commonFieldOptions,                             // 언어
  url: { ...commonFieldOptions, unique: true }, // URL
  thumbnailUrl: commonFieldOptions,                         // 썸네일URL
  confidence: commonFieldOptions,                           // 신뢰도
  analysisStatus: commonFieldOptions,                       // 분석상태
  categoryMatchRate: commonFieldOptions,                    // 카테고리일치율
  matchType: commonFieldOptions,                            // 일치유형
  matchReason: commonFieldOptions,                          // 일치사유
  collectionTime: dateFieldOptions                          // 수집시간
}, {
  timestamps: true,
  collection: 'videos_youtube'
});

/**
 * Instagram 고정 스키마 (20개 필드)
 * Google Sheets Instagram 헤더와 완벽 1:1 매핑
 */
const instagramSchema = new mongoose.Schema({
  // 자동 생성 필드
  rowNumber: { ...numberFieldOptions, index: true },
  
  // Instagram 전용 19개 필드 (Google Sheets 헤더 순서대로)
  uploadDate: { ...commonFieldOptions, index: true },      // 업로드날짜
  platform: { ...commonFieldOptions, index: true },        // 플랫폼
  account: commonFieldOptions,                              // 계정
  channelUrl: commonFieldOptions,                           // 채널URL
  mainCategory: { ...commonFieldOptions, index: true },    // 대카테고리
  middleCategory: commonFieldOptions,                       // 중카테고리
  fullCategoryPath: commonFieldOptions,                     // 전체카테고리경로
  categoryDepth: numberFieldOptions,                        // 카테고리깊이
  keywords: commonFieldOptions,                             // 키워드
  hashtags: commonFieldOptions,                             // 해시태그
  mentions: commonFieldOptions,                             // 멘션
  description: commonFieldOptions,                          // 설명
  analysisContent: commonFieldOptions,                      // 분석내용
  likes: { ...numberFieldOptions, index: true },           // 좋아요
  commentsCount: numberFieldOptions,                        // 댓글수
  url: { ...commonFieldOptions, unique: true }, // URL
  thumbnailUrl: commonFieldOptions,                         // 썸네일URL
  confidence: commonFieldOptions,                           // 신뢰도
  analysisStatus: commonFieldOptions,                       // 분석상태
  collectionTime: dateFieldOptions                          // 수집시간
}, {
  timestamps: true,
  collection: 'videos_instagram'
});

// 복합 인덱스 생성 (성능 최적화)
youtubeSchema.index({ platform: 1, uploadDate: -1 });
youtubeSchema.index({ mainCategory: 1, views: -1 });
youtubeSchema.index({ account: 1, uploadDate: -1 });
// url 인덱스는 스키마 정의에서 unique: true로 이미 생성됨

instagramSchema.index({ platform: 1, uploadDate: -1 });
instagramSchema.index({ mainCategory: 1, likes: -1 });
instagramSchema.index({ account: 1, uploadDate: -1 });
// url 인덱스는 스키마 정의에서 unique: true로 이미 생성됨

// 스키마 메서드 추가
youtubeSchema.statics.getFieldMapping = function() {
  return {
    // Google Sheets 컬럼 → MongoDB 필드 매핑
    1: 'uploadDate',     // 업로드날짜
    2: 'platform',       // 플랫폼
    3: 'account',        // 계정
    4: 'youtubeHandle',  // YouTube핸들명
    5: 'channelUrl',     // 채널URL
    6: 'mainCategory',   // 대카테고리
    7: 'middleCategory', // 중카테고리
    8: 'fullCategoryPath', // 전체카테고리경로
    9: 'categoryDepth',  // 카테고리깊이
    10: 'keywords',      // 키워드
    11: 'hashtags',      // 해시태그
    12: 'mentions',      // 멘션
    13: 'description',   // 설명
    14: 'analysisContent', // 분석내용
    15: 'comments',      // 댓글
    16: 'likes',         // 좋아요
    17: 'commentsCount', // 댓글수
    18: 'views',         // 조회수
    19: 'duration',      // 영상길이
    20: 'subscribers',   // 구독자수
    21: 'channelVideos', // 채널동영상수
    22: 'monetized',     // 수익화여부
    23: 'youtubeCategory', // YouTube카테고리
    24: 'license',       // 라이센스
    25: 'quality',       // 화질
    26: 'language',      // 언어
    27: 'url',           // URL
    28: 'thumbnailUrl',  // 썸네일URL
    29: 'confidence',    // 신뢰도
    30: 'analysisStatus', // 분석상태
    31: 'categoryMatchRate', // 카테고리일치율
    32: 'matchType',     // 일치유형
    33: 'matchReason',   // 일치사유
    34: 'collectionTime' // 수집시간
  };
};

instagramSchema.statics.getFieldMapping = function() {
  return {
    // Google Sheets 컬럼 → MongoDB 필드 매핑
    1: 'uploadDate',     // 업로드날짜
    2: 'platform',       // 플랫폼
    3: 'account',        // 계정
    4: 'channelUrl',     // 채널URL
    5: 'mainCategory',   // 대카테고리
    6: 'middleCategory', // 중카테고리
    7: 'fullCategoryPath', // 전체카테고리경로
    8: 'categoryDepth',  // 카테고리깊이
    9: 'keywords',       // 키워드
    10: 'hashtags',      // 해시태그
    11: 'mentions',      // 멘션
    12: 'description',   // 설명
    13: 'analysisContent', // 분석내용
    14: 'likes',         // 좋아요
    15: 'commentsCount', // 댓글수
    16: 'url',           // URL
    17: 'thumbnailUrl',  // 썸네일URL
    18: 'confidence',    // 신뢰도
    19: 'analysisStatus', // 분석상태
    20: 'collectionTime' // 수집시간
  };
};

// 모델 생성
const YouTubeVideo = mongoose.model('YouTubeVideo', youtubeSchema);
const InstagramVideo = mongoose.model('InstagramVideo', instagramSchema);

module.exports = {
  YouTubeVideo,
  InstagramVideo,
  
  // 플랫폼별 모델 선택 헬퍼 함수
  getModelByPlatform(platform) {
    const normalizedPlatform = platform.toLowerCase();
    
    switch (normalizedPlatform) {
      case 'youtube':
        return YouTubeVideo;
      case 'instagram':
        return InstagramVideo;
      default:
        throw new Error(`지원되지 않는 플랫폼: ${platform}`);
    }
  },
  
  // 플랫폼별 필드 개수 반환
  getFieldCount(platform) {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 34; // 33개 헤더 + rowNumber
      case 'instagram':
        return 20; // 19개 헤더 + rowNumber
      default:
        throw new Error(`지원되지 않는 플랫폼: ${platform}`);
    }
  }
};