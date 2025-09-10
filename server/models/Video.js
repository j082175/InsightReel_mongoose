const mongoose = require('mongoose');
const { FieldMapper } = require('../types/field-mapper');

/**
 * 🚀 완전 자동화된 비디오 모델 (FieldMapper 기반)
 * FieldMapper에서 필드명 변경 시 자동으로 전체 시스템 동기화
 * 
 * 사용법: FieldMapper.get('FIELD_KEY')로 모든 필드명 가져오기
 * 예: FieldMapper.get('CHANNEL_NAME') → 'channelName'
 * 
 * 필드명 변경 시: field-mapper.js의 MASTER_FIELD_NAMES만 수정하면 
 * 이 스키마를 포함한 전체 시스템이 자동으로 동기화됩니다!
 */

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

// 🚀 완전 자동화된 비디오 스키마 (FieldMapper 기반)
// FieldMapper에서 필드명 변경 시 자동으로 스키마도 동기화됩니다!

const schemaDefinition = {
  // 자동 생성 필드
  [FieldMapper.get('ROW_NUMBER')]: { ...numberFieldOptions, index: true },
  
  // ===== 플랫폼별 공통 필드 (FieldMapper 자동화) =====
  
  // 기본 메타데이터
  [FieldMapper.get('UPLOAD_DATE')]: { ...commonFieldOptions, index: true },
  [FieldMapper.get('PLATFORM')]: { 
    type: String,
    required: true,
    enum: ['INSTAGRAM', 'YOUTUBE', 'TIKTOK'],
    index: true
  },
  [FieldMapper.get('CHANNEL_NAME')]: { ...commonFieldOptions, index: true },
  [FieldMapper.get('CHANNEL_URL')]: commonFieldOptions,
  
  // AI 카테고리 분석
  [FieldMapper.get('MAIN_CATEGORY')]: { ...commonFieldOptions, index: true },
  [FieldMapper.get('MIDDLE_CATEGORY')]: commonFieldOptions,
  [FieldMapper.get('FULL_CATEGORY_PATH')]: commonFieldOptions,
  [FieldMapper.get('CATEGORY_DEPTH')]: numberFieldOptions,
  
  // 콘텐츠 분석 필드
  [FieldMapper.get('KEYWORDS')]: commonFieldOptions,
  [FieldMapper.get('HASHTAGS')]: commonFieldOptions,
  [FieldMapper.get('MENTIONS')]: commonFieldOptions,
  [FieldMapper.get('DESCRIPTION')]: commonFieldOptions,
  [FieldMapper.get('ANALYSIS_CONTENT')]: commonFieldOptions,
  
  // 성과 지표
  [FieldMapper.get('LIKES')]: { ...numberFieldOptions, index: true },
  [FieldMapper.get('COMMENTS_COUNT')]: numberFieldOptions,
  
  // URL 정보
  [FieldMapper.get('URL')]: { ...commonFieldOptions, unique: true },
  [FieldMapper.get('THUMBNAIL_URL')]: commonFieldOptions,
  
  // 메타 정보
  [FieldMapper.get('CONFIDENCE')]: commonFieldOptions,
  [FieldMapper.get('ANALYSIS_STATUS')]: commonFieldOptions,
  [FieldMapper.get('COLLECTION_TIME')]: dateFieldOptions,
  
  // ===== YouTube 전용 필드 =====
  [FieldMapper.get('YOUTUBE_HANDLE')]: commonFieldOptions,
  [FieldMapper.get('COMMENTS')]: commonFieldOptions,
  [FieldMapper.get('VIEWS')]: { ...numberFieldOptions, index: true },
  [FieldMapper.get('DURATION')]: commonFieldOptions,
  [FieldMapper.get('SUBSCRIBERS')]: numberFieldOptions,
  [FieldMapper.get('CHANNEL_VIDEOS')]: numberFieldOptions,
  [FieldMapper.get('MONETIZED')]: commonFieldOptions,
  [FieldMapper.get('YOUTUBE_CATEGORY')]: commonFieldOptions,
  [FieldMapper.get('LICENSE')]: commonFieldOptions,
  [FieldMapper.get('QUALITY')]: commonFieldOptions,
  [FieldMapper.get('LANGUAGE')]: commonFieldOptions,
  [FieldMapper.get('CATEGORY_MATCH_RATE')]: commonFieldOptions,
  [FieldMapper.get('MATCH_TYPE')]: commonFieldOptions,
  [FieldMapper.get('MATCH_REASON')]: commonFieldOptions,
  
  // ===== 레거시 호환성 필드 =====
  [FieldMapper.get('TITLE')]: commonFieldOptions,
  [FieldMapper.get('SHARES')]: numberFieldOptions,
  [FieldMapper.get('VIDEO_URL')]: commonFieldOptions,
  [FieldMapper.get('TOP_COMMENTS')]: commonFieldOptions,
  
  // 시스템 타임스탬프
  [FieldMapper.get('TIMESTAMP')]: dateFieldOptions,
  [FieldMapper.get('PROCESSED_AT')]: { type: Date, required: false },
  
  // Google Sheets 원본 데이터 (디버깅용)
  [FieldMapper.get('SHEETS_ROW_DATA')]: mongoose.Schema.Types.Mixed
};

const videoSchema = new mongoose.Schema(schemaDefinition, {
  timestamps: true,
  collection: 'videos'
});

// 🚀 복합 인덱스 생성 (FieldMapper 자동화)
// FieldMapper에서 필드명 변경 시 인덱스도 자동으로 동기화됩니다!

const platformField = FieldMapper.get('PLATFORM');
const uploadDateField = FieldMapper.get('UPLOAD_DATE');
const likesField = FieldMapper.get('LIKES');
const mainCategoryField = FieldMapper.get('MAIN_CATEGORY');
const viewsField = FieldMapper.get('VIEWS');
const channelNameField = FieldMapper.get('CHANNEL_NAME');

videoSchema.index({ [platformField]: 1, [uploadDateField]: -1 });    // 플랫폼별 최신순
videoSchema.index({ [platformField]: 1, [likesField]: -1 });         // 플랫폼별 인기순  
videoSchema.index({ [mainCategoryField]: 1, [viewsField]: -1 });     // 카테고리별 조회수순
videoSchema.index({ [channelNameField]: 1, [uploadDateField]: -1 }); // 채널별 최신순
// URL 인덱스는 스키마 정의에서 unique: true로 이미 생성됨

// 📊 정적 메서드 (FieldMapper 자동화)
videoSchema.statics.findByPlatform = function(platform, sortBy = 'UPLOAD_DATE', order = 'desc', limit = 15) {
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortField = FieldMapper.get(sortBy);
  const sortObj = {};
  sortObj[sortField] = sortOrder;
  
  const query = {};
  query[FieldMapper.get('PLATFORM')] = platform;
  
  return this.find(query)
             .sort(sortObj)
             .limit(limit);
};

videoSchema.statics.getRecentVideos = function(limit = 15, sortBy = 'UPLOAD_DATE', order = 'desc') {
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortField = FieldMapper.get(sortBy);
  const sortObj = {};
  sortObj[sortField] = sortOrder;
  
  return this.find({})
             .sort(sortObj)
             .limit(limit);
};

// 📈 인스턴스 메서드 (FieldMapper 자동화)
videoSchema.methods.updateStats = function(likes, views, shares, commentsCount) {
  const likesField = FieldMapper.get('LIKES');
  const viewsField = FieldMapper.get('VIEWS');
  const sharesField = FieldMapper.get('SHARES');
  const commentsCountField = FieldMapper.get('COMMENTS_COUNT');
  
  this[likesField] = likes || this[likesField];
  this[viewsField] = views || this[viewsField];
  this[sharesField] = shares || this[sharesField];
  this[commentsCountField] = commentsCount || this[commentsCountField];
  
  return this.save();
};

// 🆕 VideoOptimized 스타일 필드 매핑 메서드
videoSchema.statics.getFieldMapping = function(platform) {
  // VideoOptimized.js와 동일한 매핑 제공
  const baseMapping = {
    1: 'uploadDate',       // 업로드날짜
    2: 'platform',         // 플랫폼  
    3: 'channelName',      // 채널이름
    4: 'channelUrl',       // 채널URL
    5: 'mainCategory',     // 대카테고리
    6: 'middleCategory',   // 중카테고리
    7: 'fullCategoryPath', // 전체카테고리경로
    8: 'categoryDepth',    // 카테고리깊이
    9: 'keywords',         // 키워드
    10: 'hashtags',        // 해시태그
    11: 'mentions',        // 멘션
    12: 'description',     // 설명
    13: 'analysisContent', // 분석내용
    14: 'likes',           // 좋아요
    15: 'commentsCount',   // 댓글수 ⭐ 표준화
    16: 'url',             // URL ⭐ 표준화
    17: 'thumbnailUrl',    // 썸네일URL
    18: 'confidence',      // 신뢰도
    19: 'analysisStatus',  // 분석상태
    20: 'collectionTime'   // 수집시간
  };
  
  // YouTube 전용 확장 필드
  if (platform === 'youtube') {
    return {
      ...baseMapping,
      4: 'youtubeHandle',      // YouTube핸들명 (4번에 삽입)
      15: 'comments',          // 댓글 내용 (15번에 삽입)
      16: 'likes',             // 좋아요
      17: 'commentsCount',     // 댓글수
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
  }
  
  return baseMapping; // Instagram 등
};

// 🆕 정적 메서드: VideoUrl 데이터와 동기화하여 Video 레코드 생성/업데이트 (표준화 적용)
videoSchema.statics.createOrUpdateFromVideoUrl = async function(videoUrlData, metadata = {}) {
  const { originalUrl, platform, originalPublishDate, processedAt } = videoUrlData;
  
  // Instagram URL에서 사용자명 추출 함수
  const extractInstagramUsername = (url) => {
    if (!url || !url.includes('instagram.com/')) return null;
    
    // 패턴: https://instagram.com/username/ 또는 https://instagram.com/username/reel/xyz/
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1] && !['reels', 'reel', 'p', 'stories'].includes(match[1])) {
      return match[1];
    }
    return null;
  };

  // 플랫폼별 채널명 처리 (표준화된 필드명 사용)
  let channelName = metadata[FieldMapper.get('CHANNEL_NAME')] || metadata[FieldMapper.get('YOUTUBE_HANDLE')] || metadata.account;
  
  // Instagram의 경우 URL에서 사용자명 추출 시도
  if (platform === 'instagram' && !channelName) {
    const extractedUsername = extractInstagramUsername(originalUrl);
    channelName = extractedUsername || 'Instagram 사용자';
  }

  // VideoOptimized 표준에 맞춘 데이터 구조
  const videoData = {
    // 기본 필드 (표준화 적용)
    [FieldMapper.get('PLATFORM')]: platform,
    [FieldMapper.get('CHANNEL_NAME')]: channelName || '알 수 없는 채널',
    [FieldMapper.get('URL')]: originalUrl,                                      // ⭐ 표준화: originalUrl → url
    [FieldMapper.get('UPLOAD_DATE')]: originalPublishDate || new Date(),        // ⭐ 표준화: originalPublishDate → uploadDate
    
    // AI 분석 필드
    [FieldMapper.get('MAIN_CATEGORY')]: metadata[FieldMapper.get('MAIN_CATEGORY')] || metadata.mainCategory || metadata.category || '미분류',
    [FieldMapper.get('MIDDLE_CATEGORY')]: metadata[FieldMapper.get('MIDDLE_CATEGORY')] || metadata.middleCategory || '',
    [FieldMapper.get('FULL_CATEGORY_PATH')]: metadata[FieldMapper.get('FULL_CATEGORY_PATH')] || metadata.fullCategoryPath || '',
    [FieldMapper.get('CATEGORY_DEPTH')]: metadata[FieldMapper.get('CATEGORY_DEPTH')] || metadata.categoryDepth || 0,
    [FieldMapper.get('KEYWORDS')]: Array.isArray(metadata[FieldMapper.get('KEYWORDS')] || metadata.keywords) ? (metadata[FieldMapper.get('KEYWORDS')] || metadata.keywords).join(', ') : (metadata[FieldMapper.get('KEYWORDS')] || metadata.keywords || ''),
    [FieldMapper.get('HASHTAGS')]: Array.isArray(metadata[FieldMapper.get('HASHTAGS')] || metadata.hashtags) ? (metadata[FieldMapper.get('HASHTAGS')] || metadata.hashtags).join(', ') : (metadata[FieldMapper.get('HASHTAGS')] || metadata.hashtags || ''),
    [FieldMapper.get('MENTIONS')]: Array.isArray(metadata[FieldMapper.get('MENTIONS')] || metadata.mentions) ? (metadata[FieldMapper.get('MENTIONS')] || metadata.mentions).join(', ') : (metadata[FieldMapper.get('MENTIONS')] || metadata.mentions || ''),
    [FieldMapper.get('DESCRIPTION')]: metadata[FieldMapper.get('DESCRIPTION')] || metadata.description || '',
    [FieldMapper.get('ANALYSIS_CONTENT')]: metadata[FieldMapper.get('ANALYSIS_CONTENT')] || metadata.analysisContent || metadata.ai_description || '',
    
    // 성과 지표 (FieldMapper 완전 표준화)
    [FieldMapper.get('LIKES')]: metadata[FieldMapper.get('LIKES')] || metadata.likes || 0,
    [FieldMapper.get('COMMENTS_COUNT')]: metadata[FieldMapper.get('COMMENTS_COUNT')] || metadata.commentsCount || metadata.comments_count || metadata.comments || 0,
    [FieldMapper.get('VIEWS')]: metadata[FieldMapper.get('VIEWS')] || metadata.views || 0,
    
    // URL 및 메타데이터
    [FieldMapper.get('THUMBNAIL_URL')]: metadata[FieldMapper.get('THUMBNAIL_URL')] || metadata.thumbnailUrl || metadata.thumbnailPath || '',
    [FieldMapper.get('CHANNEL_URL')]: metadata[FieldMapper.get('CHANNEL_URL')] || metadata.channelUrl || '',
    [FieldMapper.get('CONFIDENCE')]: metadata[FieldMapper.get('CONFIDENCE')] || metadata.confidence || '',
    [FieldMapper.get('ANALYSIS_STATUS')]: metadata[FieldMapper.get('ANALYSIS_STATUS')] || metadata.analysisStatus || 'completed',
    [FieldMapper.get('COLLECTION_TIME')]: new Date(),
    
    // YouTube 전용 필드
    [FieldMapper.get('YOUTUBE_HANDLE')]: metadata[FieldMapper.get('YOUTUBE_HANDLE')] || metadata.youtubeHandle || '',
    [FieldMapper.get('COMMENTS')]: metadata[FieldMapper.get('COMMENTS')] || metadata.commentText || '',
    [FieldMapper.get('DURATION')]: metadata[FieldMapper.get('DURATION')] || metadata.duration || '',
    [FieldMapper.get('SUBSCRIBERS')]: metadata[FieldMapper.get('SUBSCRIBERS')] || metadata.subscribers || 0,
    [FieldMapper.get('CHANNEL_VIDEOS')]: metadata[FieldMapper.get('CHANNEL_VIDEOS')] || metadata.channelVideos || 0,
    [FieldMapper.get('MONETIZED')]: metadata[FieldMapper.get('MONETIZED')] || metadata.monetized || '',
    [FieldMapper.get('YOUTUBE_CATEGORY')]: metadata[FieldMapper.get('YOUTUBE_CATEGORY')] || metadata.youtubeCategory || '',
    [FieldMapper.get('LICENSE')]: metadata[FieldMapper.get('LICENSE')] || metadata.license || '',
    [FieldMapper.get('QUALITY')]: metadata[FieldMapper.get('QUALITY')] || metadata.quality || '',
    [FieldMapper.get('LANGUAGE')]: metadata[FieldMapper.get('LANGUAGE')] || metadata.language || '',
    [FieldMapper.get('CATEGORY_MATCH_RATE')]: metadata[FieldMapper.get('CATEGORY_MATCH_RATE')] || metadata.categoryMatchRate || '',
    [FieldMapper.get('MATCH_TYPE')]: metadata[FieldMapper.get('MATCH_TYPE')] || metadata.matchType || '',
    [FieldMapper.get('MATCH_REASON')]: metadata[FieldMapper.get('MATCH_REASON')] || metadata.matchReason || '',
    
    // 레거시 호환성 필드
    [FieldMapper.get('TITLE')]: metadata[FieldMapper.get('TITLE')] || originalUrl.split('/').pop() || '미분류',
    [FieldMapper.get('SHARES')]: metadata[FieldMapper.get('SHARES')] || metadata.shares || 0,
    [FieldMapper.get('TIMESTAMP')]: originalPublishDate || new Date(),     // 레거시 호환
    [FieldMapper.get('PROCESSED_AT')]: processedAt || new Date(),
    [FieldMapper.get('TOP_COMMENTS')]: metadata[FieldMapper.get('TOP_COMMENTS')] || metadata.topComments || ''
  };
  
  // upsert: 있으면 업데이트, 없으면 생성 (표준화된 url 필드 사용)
  const query = {};
  query[FieldMapper.get('URL')] = originalUrl;
  query[FieldMapper.get('PLATFORM')] = platform;
  
  return this.findOneAndUpdate(
    query,  // ⭐ 표준화: originalUrl → url
    { $set: videoData },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Video', videoSchema);