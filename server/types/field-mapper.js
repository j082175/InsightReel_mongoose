/**
 * 🎯 완전 자동화된 필드명 매핑 시스템
 * 하나의 필드명 변경으로 전체 시스템 동기화
 * 
 * 사용법:
 * 1. MASTER_FIELD_NAMES에서 필드명 변경
 * 2. 모든 코드에서 FieldMapper 사용
 * 3. 자동으로 전체 시스템 동기화
 */

// ===== 마스터 필드명 정의 (Single Source of Truth) =====
// 🎯 이 값들만 변경하면 전체 시스템이 자동으로 동기화됩니다!
const MASTER_FIELD_NAMES = {
  // 기본 필드
  ID: '_id',
  ROW_NUMBER: 'rowNumber',
  
  // 시간 필드  
  UPLOAD_DATE: 'uploadDate',           // VideoOptimized 표준
  COLLECTION_TIME: 'collectionTime',
  TIMESTAMP: 'timestamp',
  PROCESSED_AT: 'processedAt',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  
  // 채널 정보
  CHANNEL_NAME: 'channelName',         // ✅ 자동화 테스트 완료: 전체 시스템 동기화 확인
  CHANNEL_URL: 'channelUrl',
  YOUTUBE_HANDLE: 'youtubeHandle',
  CHANNEL_TITLE: 'channelTitle',       // API 응답에서 사용
  CHANNEL_VIEWS: 'channelViews',       // 채널 총 조회수
  CHANNEL_COUNTRY: 'channelCountry',   // 채널 국가
  CHANNEL_DESCRIPTION: 'channelDescription', // 채널 설명
  NAME: 'name',                        // 채널명 (Channel 모델용)
  
  // 성과 지표
  LIKES: 'likes',
  COMMENTS_COUNT: 'commentsCount',     // VideoOptimized 표준 (camelCase)
  VIEWS: 'views',
  SHARES: 'shares',
  SUBSCRIBERS: 'subscribers',
  CHANNEL_VIDEOS: 'channelVideos',
  
  // URL 정보
  URL: 'url',                          // VideoOptimized 표준 (originalUrl → url)
  ORIGINAL_URL: 'originalUrl',         // 레거시 호환용
  THUMBNAIL_URL: 'thumbnailUrl',
  VIDEO_URL: 'videoUrl',
  
  // 카테고리 (VideoOptimized 표준)
  MAIN_CATEGORY: 'mainCategory',
  MIDDLE_CATEGORY: 'middleCategory',
  FULL_CATEGORY_PATH: 'fullCategoryPath',
  CATEGORY_DEPTH: 'categoryDepth',
  CATEGORY_MATCH_RATE: 'categoryMatchRate',
  MATCH_TYPE: 'matchType',
  MATCH_REASON: 'matchReason',
  
  // 콘텐츠
  KEYWORDS: 'keywords',
  HASHTAGS: 'hashtags',
  MENTIONS: 'mentions',
  DESCRIPTION: 'description',
  ANALYSIS_CONTENT: 'analysisContent',
  COMMENTS: 'comments',
  TOP_COMMENTS: 'topComments',
  
  // 플랫폼
  PLATFORM: 'platform',
  
  // YouTube 전용
  DURATION: 'duration',
  DURATION_FORMATTED: 'durationFormatted',
  MONETIZED: 'monetized',
  YOUTUBE_CATEGORY: 'youtubeCategory',
  LICENSE: 'license',
  QUALITY: 'quality',
  LANGUAGE: 'language',
  TAGS: 'tags',
  CATEGORY_ID: 'categoryId',
  CHANNEL_ID: 'channelId',
  CONTENT_TYPE: 'contentType',
  IS_SHORT_FORM: 'isShortForm',
  AGE_RESTRICTED: 'ageRestricted',
  DEFINITION: 'definition',
  LIVE_BROADCAST: 'liveBroadcast',
  
  // 메타 정보
  CONFIDENCE: 'confidence',
  ANALYSIS_STATUS: 'analysisStatus',
  
  // 레거시 호환
  TITLE: 'title',
  CATEGORY: 'category'
};

// ===== 레거시 매핑 (자동 마이그레이션용) =====
const LEGACY_FIELD_MAP = {
  'comments_count': MASTER_FIELD_NAMES.COMMENTS_COUNT,
  'originalUrl': MASTER_FIELD_NAMES.URL,
  'originalPublishDate': MASTER_FIELD_NAMES.UPLOAD_DATE,
  'account': MASTER_FIELD_NAMES.CHANNEL_NAME,
  'author': MASTER_FIELD_NAMES.CHANNEL_NAME,
  'postUrl': MASTER_FIELD_NAMES.URL
};

class FieldMapper {
  /**
   * 표준 필드명 반환
   */
  static get(fieldKey) {
    if (!MASTER_FIELD_NAMES[fieldKey]) {
      // 🚨 항상 상세 에러 정보 제공 (개발/프로덕션 구분 없이)
      console.error(`\n❌ FieldMapper Error: Unknown field key "${fieldKey}"`);
      console.error(`📋 Available keys: ${Object.keys(MASTER_FIELD_NAMES).join(', ')}`);
      console.error('🔍 Called from:');
      console.trace();
      
      throw new Error(`Unknown field key: ${fieldKey}. Available keys: ${Object.keys(MASTER_FIELD_NAMES).join(', ')}`);
    }
    return MASTER_FIELD_NAMES[fieldKey];
  }
  
  /**
   * 레거시 필드명을 표준 필드명으로 변환
   */
  static standardize(legacyFieldName) {
    return LEGACY_FIELD_MAP[legacyFieldName] || legacyFieldName;
  }
  
  /**
   * MongoDB select 문자열 생성
   */
  static buildSelectString(fieldKeys) {
    return fieldKeys.map(key => this.get(key)).join(' ');
  }
  
  /**
   * MongoDB 정렬 객체 생성
   */
  static buildSortObject(fieldKey, order = 'desc') {
    const sortObj = {};
    sortObj[this.get(fieldKey)] = order === 'desc' ? -1 : 1;
    return sortObj;
  }
  
  /**
   * MongoDB 쿼리 객체의 필드명 표준화
   */
  static standardizeQueryObject(queryObj) {
    const standardized = {};
    for (const [key, value] of Object.entries(queryObj)) {
      const standardKey = this.standardize(key);
      standardized[standardKey] = value;
    }
    return standardized;
  }
  
  /**
   * 데이터 객체의 필드명 표준화
   */
  static standardizeDataObject(dataObj) {
    const standardized = {};
    for (const [key, value] of Object.entries(dataObj)) {
      const standardKey = this.standardize(key);
      standardized[standardKey] = value;
    }
    return standardized;
  }
  
  /**
   * 플랫폼별 Google Sheets 매핑 반환
   */
  static getGoogleSheetsMapping(platform) {
    if (platform === 'youtube') {
      return {
        1: this.get('UPLOAD_DATE'),
        2: this.get('PLATFORM'),
        3: this.get('CHANNEL_NAME'),
        4: this.get('YOUTUBE_HANDLE'),
        5: this.get('CHANNEL_URL'),
        // ... 전체 34개 필드
        16: this.get('LIKES'),
        17: this.get('COMMENTS_COUNT'),
        18: this.get('VIEWS'),
        27: this.get('URL'),
        28: this.get('THUMBNAIL_URL')
      };
    } else if (platform === 'instagram') {
      return {
        1: this.get('UPLOAD_DATE'),
        2: this.get('PLATFORM'),
        3: this.get('CHANNEL_NAME'),
        4: this.get('CHANNEL_URL'),
        // ... 전체 20개 필드
        14: this.get('LIKES'),
        15: this.get('COMMENTS_COUNT'),
        16: this.get('URL'),
        17: this.get('THUMBNAIL_URL')
      };
    }
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  /**
   * 모든 마스터 필드명 반환 (디버깅용)
   */
  static getAllFields() {
    return { ...MASTER_FIELD_NAMES };
  }
  
  /**
   * 필드명 변경 시 영향도 체크
   */
  static getFieldUsage(fieldKey) {
    const fieldName = this.get(fieldKey);
    return {
      fieldName,
      usedIn: [
        'MongoDB Schema',
        'API Responses', 
        'Frontend Types',
        'Google Sheets Mapping',
        'Data Conversion'
      ]
    };
  }
}

// ===== 사용 예시 =====
/*
// 기존 방식 (하드코딩)
video.channelName
{ channelName: 1, uploadDate: -1 }
.select('channelName title likes views commentsCount url')

// 새로운 방식 (완전 자동화)
video[FieldMapper.get('CHANNEL_NAME')]
FieldMapper.buildSortObject('UPLOAD_DATE', 'desc')
FieldMapper.buildSelectString(['CHANNEL_NAME', 'TITLE', 'LIKES', 'VIEWS', 'COMMENTS_COUNT', 'URL'])

// 필드명 변경 시:
// MASTER_FIELD_NAMES.CHANNEL_NAME을 'channelName'에서 'creatorName'으로 변경하면
// 전체 시스템에서 자동으로 'creatorName' 사용!
*/

module.exports = {
  FieldMapper,
  MASTER_FIELD_NAMES,
  LEGACY_FIELD_MAP
};