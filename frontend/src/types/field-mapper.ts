/**
 * 🚀 Frontend FieldMapper (백엔드와 동일한 자동화 시스템)
 * 백엔드 field-mapper.js와 동기화
 * 
 * 사용법:
 * 1. 백엔드에서 MASTER_FIELD_NAMES 변경
 * 2. 이 파일도 동일하게 업데이트 (자동 스크립트로 동기화 가능)
 * 3. 전체 Frontend도 자동 동기화
 */

// ===== 마스터 필드명 정의 (백엔드와 동일) =====
export const MASTER_FIELD_NAMES = {
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
  ARCHIVED_AT: 'archivedAt',
  
  // 채널 정보
  CHANNEL_NAME: 'channelName',         // ✅ 서버와 동기화
  CHANNEL_URL: 'channelUrl',
  CHANNEL_AVATAR_URL: 'channelAvatarUrl',
  YOUTUBE_HANDLE: 'youtubeHandle',
  
  // 성과 지표
  LIKES: 'likes',
  COMMENTS_COUNT: 'commentsCount',     // VideoOptimized 표준 (camelCase)
  VIEWS: 'views',
  SHARES: 'shares',
  SUBSCRIBERS: 'subscribers',
  CHANNEL_VIDEOS: 'channelVideos',
  
  // URL 정보
  URL: 'url',                          // VideoOptimized 표준 (originalUrl → url)
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
  TAGS: 'tags',
  
  // 플랫폼
  PLATFORM: 'platform',
  
  // YouTube 전용
  DURATION: 'duration',
  MONETIZED: 'monetized',
  YOUTUBE_CATEGORY: 'youtubeCategory',
  LICENSE: 'license',
  QUALITY: 'quality',
  LANGUAGE: 'language',
  
  // 메타 정보
  CONFIDENCE: 'confidence',
  ANALYSIS_STATUS: 'analysisStatus',
  
  // 레거시 호환 & UI 필드
  TITLE: 'title',
  CATEGORY: 'category',
  IS_TRENDING: 'isTrending',
  DAYS_AGO: 'daysAgo',
  ASPECT_RATIO: 'aspectRatio',
  ANALYSIS_RESULT: 'analysisResult',
  
  // 아카이브 전용 필드
  NOTES: 'notes',
  
  // API 관련 필드
  NAME: 'name',
  API_KEY: 'apiKey',
  
  // Query parameter 필드
  PAGE: 'page',
  LIMIT: 'limit',
  SEARCH: 'search'
} as const;

// ===== TypeScript 타입 추론을 위한 키 타입 =====
export type FieldKey = keyof typeof MASTER_FIELD_NAMES;
export type FieldValue = typeof MASTER_FIELD_NAMES[FieldKey];

// ===== 레거시 매핑 (자동 마이그레이션용) =====
export const LEGACY_FIELD_MAP: Record<string, FieldValue> = {
  'comments_count': MASTER_FIELD_NAMES.COMMENTS_COUNT,
  'originalUrl': MASTER_FIELD_NAMES.URL,
  'originalPublishDate': MASTER_FIELD_NAMES.UPLOAD_DATE,
  'account': MASTER_FIELD_NAMES.CHANNEL_NAME,
  'author': MASTER_FIELD_NAMES.CHANNEL_NAME,
  'postUrl': MASTER_FIELD_NAMES.URL
};

export class FieldMapper {
  /**
   * 표준 필드명 반환
   */
  static get(fieldKey: FieldKey): FieldValue {
    const fieldName = MASTER_FIELD_NAMES[fieldKey];
    if (!fieldName) {
      throw new Error(`Unknown field key: ${fieldKey}. Available keys: ${Object.keys(MASTER_FIELD_NAMES).join(', ')}`);
    }
    return fieldName;
  }
  
  /**
   * 레거시 필드명을 표준 필드명으로 변환
   */
  static standardize(legacyFieldName: string): string {
    return LEGACY_FIELD_MAP[legacyFieldName] || legacyFieldName;
  }
  
  /**
   * 데이터 객체의 필드명 표준화
   */
  static standardizeDataObject<T extends Record<string, any>>(dataObj: T): Record<string, any> {
    const standardized: Record<string, any> = {};
    for (const [key, value] of Object.entries(dataObj)) {
      const standardKey = this.standardize(key);
      standardized[standardKey] = value;
    }
    return standardized;
  }
  
  /**
   * TypeScript 타입 안전한 필드 접근
   */
  static getTypedField<T>(obj: any, fieldKey: FieldKey): T | undefined {
    const fieldName = this.get(fieldKey);
    return obj[fieldName] as T;
  }
  
  /**
   * TypeScript 타입 안전한 필드 설정
   */
  static setTypedField<T>(obj: any, fieldKey: FieldKey, value: T): void {
    const fieldName = this.get(fieldKey);
    obj[fieldName] = value;
  }
  
  /**
   * 모든 마스터 필드명 반환 (디버깅용)
   */
  static getAllFields(): typeof MASTER_FIELD_NAMES {
    return MASTER_FIELD_NAMES;
  }
  
  /**
   * 필드명 변경 시 영향도 체크
   */
  static getFieldUsage(fieldKey: FieldKey): { fieldName: string; usedIn: string[] } {
    const fieldName = this.get(fieldKey);
    return {
      fieldName,
      usedIn: [
        'Video Interface',
        'API Types', 
        'Component Props',
        'State Management',
        'Data Conversion'
      ]
    };
  }
}

// ===== 사용 예시 =====
/*
// 기존 방식 (하드코딩)
video.channelName
video.commentsCount
video.url

// 새로운 방식 (완전 자동화)
video[FieldMapper.get('CHANNEL_NAME')]
video[FieldMapper.get('COMMENTS_COUNT')]
video[FieldMapper.get('URL')]

// TypeScript 타입 안전한 접근
const channelName = FieldMapper.getTypedField<string>(video, 'CHANNEL_NAME');
const commentsCount = FieldMapper.getTypedField<number>(video, 'COMMENTS_COUNT');

// 필드명 변경 시:
// MASTER_FIELD_NAMES.CHANNEL_NAME을 'channelName'에서 'creatorName'으로 변경하면
// 전체 Frontend에서 자동으로 'creatorName' 사용!
*/

export default FieldMapper;