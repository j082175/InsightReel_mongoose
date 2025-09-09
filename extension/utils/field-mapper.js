/**
 * 🚀 Chrome 확장프로그램용 FieldMapper
 * 서버의 field-mapper.js와 완전 동기화
 * 
 * 사용법:
 * import { FieldMapper } from './utils/field-mapper.js';
 * metadata[FieldMapper.get('CHANNEL_NAME')] = channelElement.textContent;
 */

// ===== 마스터 필드명 정의 (서버와 동일) =====
const MASTER_FIELD_NAMES = {
  // 기본 필드
  ID: '_id',
  ROW_NUMBER: 'rowNumber',
  
  // 시간 필드  
  UPLOAD_DATE: 'uploadDate',
  COLLECTION_TIME: 'collectionTime',
  TIMESTAMP: 'timestamp',
  PROCESSED_AT: 'processedAt',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  
  // 채널 정보
  CHANNEL_NAME: 'channelName',         // ✅ 서버와 동기화
  CHANNEL_URL: 'channelUrl',
  YOUTUBE_HANDLE: 'youtubeHandle',
  CHANNEL_TITLE: 'channelTitle',
  CHANNEL_VIEWS: 'channelViews',
  CHANNEL_COUNTRY: 'channelCountry',
  CHANNEL_DESCRIPTION: 'channelDescription',
  NAME: 'name',
  
  // 성과 지표
  LIKES: 'likes',
  COMMENTS_COUNT: 'commentsCount',
  VIEWS: 'views',
  SHARES: 'shares',
  SUBSCRIBERS: 'subscribers',
  CHANNEL_VIDEOS: 'channelVideos',
  
  // URL 정보
  URL: 'url',
  ORIGINAL_URL: 'originalUrl',
  THUMBNAIL_URL: 'thumbnailUrl',
  VIDEO_URL: 'videoUrl',
  
  // 카테고리
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
  MONETIZED: 'monetized',
  YOUTUBE_CATEGORY: 'youtubeCategory',
  LICENSE: 'license',
  QUALITY: 'quality',
  LANGUAGE: 'language',
  
  // 메타 정보
  CONFIDENCE: 'confidence',
  ANALYSIS_STATUS: 'analysisStatus',
  
  // 레거시 호환
  TITLE: 'title',
  CATEGORY: 'category'
};

/**
 * 🎯 Chrome 확장프로그램용 FieldMapper 클래스
 */
export class FieldMapper {
  /**
   * 표준 필드명 반환
   * @param {string} fieldKey - 필드 키 (대문자)
   * @returns {string} 실제 필드명
   */
  static get(fieldKey) {
    if (!MASTER_FIELD_NAMES[fieldKey]) {
      console.error(`[FieldMapper] Unknown field key: ${fieldKey}`);
      console.error(`Available keys: ${Object.keys(MASTER_FIELD_NAMES).join(', ')}`);
      return fieldKey.toLowerCase(); // 폴백
    }
    return MASTER_FIELD_NAMES[fieldKey];
  }
  
  /**
   * 메타데이터 객체 생성 (필드명 자동화)
   * @param {Object} data - 원본 데이터
   * @returns {Object} 표준화된 메타데이터
   */
  static createMetadata(data = {}) {
    const metadata = {};
    
    // 자주 사용되는 필드들만 미리 초기화
    const commonFields = [
      'CHANNEL_NAME', 'TITLE', 'DESCRIPTION', 'VIEWS', 'LIKES', 
      'COMMENTS_COUNT', 'DURATION', 'UPLOAD_DATE', 'THUMBNAIL_URL'
    ];
    
    commonFields.forEach(fieldKey => {
      const fieldName = this.get(fieldKey);
      metadata[fieldName] = data[fieldName] || '';
    });
    
    return metadata;
  }
  
  /**
   * 서버 전송용 데이터 구조 생성
   * @param {string} platform - 플랫폼명
   * @param {string} videoUrl - 비디오 URL
   * @param {Object} metadata - 메타데이터
   * @returns {Object} 서버 전송용 데이터
   */
  static createRequestData(platform, videoUrl, metadata) {
    return {
      [this.get('PLATFORM')]: platform,
      videoUrl: videoUrl,
      postUrl: window.location.href,
      metadata: metadata,
      analysisType: 'quick'
    };
  }
  
  /**
   * 디버깅용 필드 매핑 확인
   */
  static debugMapping() {
    console.log('🔍 [FieldMapper] Current field mappings:');
    Object.entries(MASTER_FIELD_NAMES).forEach(([key, value]) => {
      console.log(`  ${key}: '${value}'`);
    });
  }
}

// CommonJS 호환 (필요시)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldMapper };
}