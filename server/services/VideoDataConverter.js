/**
 * 🚀 플랫폼별 데이터 변환 로직 (FieldMapper 완전 자동화)
 * Google Sheets buildRowData 로직을 MongoDB 최적화 스키마로 변환
 * FieldMapper로 모든 필드명이 자동 동기화됩니다!
 */

const path = require('path');
const { ServerLogger } = require('../utils/logger');
const { FieldMapper } = require('../types/field-mapper'); // 🚀 FieldMapper 임포트

class VideoDataConverter {
  /**
   * 플랫폼별 데이터 변환 메인 메서드
   * @param {string} platform - 플랫폼 ('youtube', 'instagram')
   * @param {Object} videoData - 원본 비디오 데이터 
   * @param {number} rowNumber - 행 번호
   * @returns {Object} MongoDB 스키마에 맞게 변환된 데이터
   */
  static convertToSchema(platform, videoData, rowNumber = 1) {
    const normalizedPlatform = platform.toLowerCase();
    
    try {
      switch (normalizedPlatform) {
        case 'youtube':
          return this.convertToYouTubeSchema(videoData, rowNumber);
        case 'instagram':
          return this.convertToInstagramSchema(videoData, rowNumber);
        default:
          throw new Error(`지원되지 않는 플랫폼: ${platform}`);
      }
    } catch (error) {
      ServerLogger.error(`데이터 변환 실패 (${platform})`, error.message, 'DATA_CONVERTER');
      throw error;
    }
  }

  /**
   * YouTube 스키마로 변환 (34개 필드)
   * Google Sheets YouTube buildRowData 로직 기반
   */
  static convertToYouTubeSchema(videoData, rowNumber = 1) {
    const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;
    // ⭐ 표준화: postUrl → url 매핑
    const url = videoData.url || postUrl;
    
    // 업로드 날짜 결정 (기존 buildRowData 로직)
    let uploadDate;
    if (metadata.uploadDate) {
      uploadDate = new Date(metadata.uploadDate).toLocaleString('ko-KR');
    } else {
      uploadDate = new Date(timestamp).toLocaleString('ko-KR');
    }

    // 동적 카테고리 처리 (기존 로직)
    const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
    let fullCategoryPath = '';
    let categoryDepth = 0;
    
    if (isDynamicMode && analysis.fullCategoryPath) {
      fullCategoryPath = analysis.fullCategoryPath;
      categoryDepth = analysis.depth || 0;
    } else {
      const mainCat = analysis.mainCategory || '미분류';
      const middleCat = analysis.middleCategory || '';
      if (middleCat && middleCat !== '미분류') {
        fullCategoryPath = `${mainCat} > ${middleCat}`;
        categoryDepth = 2;
      } else {
        fullCategoryPath = mainCat;
        categoryDepth = 1;
      }
    }

    // YouTube 34개 필드 변환
    // 🚀 FieldMapper 완전 자동화된 데이터 구조
    const result = {
      // 자동 생성 필드
      [FieldMapper.get('ROW_NUMBER')]: rowNumber,
      
      // YouTube 전용 33개 필드 (FieldMapper 자동화)
      [FieldMapper.get('UPLOAD_DATE')]: uploadDate,
      [FieldMapper.get('PLATFORM')]: (platform || 'youtube').toUpperCase(),
      [FieldMapper.get('CHANNEL_NAME')]: metadata[FieldMapper.get('CHANNEL_NAME')] || '',
      [FieldMapper.get('TITLE')]: metadata[FieldMapper.get('TITLE')] || '',
      [FieldMapper.get('YOUTUBE_HANDLE')]: metadata[FieldMapper.get('YOUTUBE_HANDLE')] || '',
      [FieldMapper.get('CHANNEL_URL')]: metadata[FieldMapper.get('CHANNEL_URL')] || '',
      [FieldMapper.get('MAIN_CATEGORY')]: analysis.mainCategory || '미분류',
      [FieldMapper.get('MIDDLE_CATEGORY')]: analysis.middleCategory || '',
      [FieldMapper.get('FULL_CATEGORY_PATH')]: fullCategoryPath,
      [FieldMapper.get('CATEGORY_DEPTH')]: categoryDepth,
      [FieldMapper.get('KEYWORDS')]: analysis.keywords?.join(', ') || '',
      [FieldMapper.get('HASHTAGS')]: analysis.hashtags?.join(' ') || '',
      [FieldMapper.get('MENTIONS')]: analysis.mentions?.join(' ') || '',
      [FieldMapper.get('DESCRIPTION')]: metadata[FieldMapper.get('DESCRIPTION')] || '',
      [FieldMapper.get('ANALYSIS_CONTENT')]: analysis.analysisContent || analysis.summary || analysis.description || analysis.content || '',
      [FieldMapper.get('COMMENTS')]: metadata[FieldMapper.get('COMMENTS')] || '',
      [FieldMapper.get('LIKES')]: this.parseNumber(metadata[FieldMapper.get('LIKES')]),
      [FieldMapper.get('COMMENTS_COUNT')]: this.parseNumber(metadata[FieldMapper.get('COMMENTS_COUNT')]),
      [FieldMapper.get('VIEWS')]: this.parseNumber(metadata[FieldMapper.get('VIEWS')]),
      [FieldMapper.get('DURATION')]: metadata[FieldMapper.get('DURATION')] || '',
      [FieldMapper.get('SUBSCRIBERS')]: this.parseNumber(metadata[FieldMapper.get('SUBSCRIBERS')]),
      [FieldMapper.get('CHANNEL_VIDEOS')]: this.parseNumber(metadata[FieldMapper.get('CHANNEL_VIDEOS')]),
      [FieldMapper.get('MONETIZED')]: metadata[FieldMapper.get('MONETIZED')] || 'N',
      [FieldMapper.get('YOUTUBE_CATEGORY')]: metadata[FieldMapper.get('YOUTUBE_CATEGORY')] || '',
      [FieldMapper.get('LICENSE')]: metadata[FieldMapper.get('LICENSE')] || 'youtube',
      [FieldMapper.get('QUALITY')]: metadata[FieldMapper.get('QUALITY')] || 'sd',
      [FieldMapper.get('LANGUAGE')]: metadata[FieldMapper.get('LANGUAGE')] || null,
      [FieldMapper.get('URL')]: url || '',
      [FieldMapper.get('THUMBNAIL_URL')]: metadata[FieldMapper.get('THUMBNAIL_URL')] || '',
      [FieldMapper.get('CONFIDENCE')]: this.formatConfidence(analysis.confidence),
      [FieldMapper.get('ANALYSIS_STATUS')]: analysis.aiModel || '수동',
      [FieldMapper.get('CATEGORY_MATCH_RATE')]: analysis.categoryMatch ? `${analysis.categoryMatch.matchScore}%` : '',
      [FieldMapper.get('MATCH_TYPE')]: analysis.categoryMatch ? analysis.categoryMatch.matchType : '',
      [FieldMapper.get('MATCH_REASON')]: analysis.categoryMatch ? analysis.categoryMatch.matchReason : '',
      collectionTime: new Date()                                // 수집시간
    };

    return result;
  }

  /**
   * Instagram 스키마로 변환 (20개 필드)
   * Google Sheets Instagram buildRowData 로직 기반
   */
  static convertToInstagramSchema(videoData, rowNumber = 1) {
    const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;
    // ⭐ 표준화: postUrl → url 매핑
    const url = videoData.url || postUrl;
    
    // 업로드 날짜 결정 (Instagram은 날짜만)
    let uploadDate;
    if (metadata.uploadDate) {
      uploadDate = new Date(metadata.uploadDate).toLocaleDateString('ko-KR');
    } else {
      uploadDate = new Date(timestamp).toLocaleString('ko-KR');
    }

    // 동적 카테고리 처리 (기존 로직 동일)
    const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
    let fullCategoryPath = '';
    let categoryDepth = 0;
    
    if (isDynamicMode && analysis.fullCategoryPath) {
      fullCategoryPath = analysis.fullCategoryPath;
      categoryDepth = analysis.depth || 0;
    } else {
      const mainCat = analysis.mainCategory || '미분류';
      const middleCat = analysis.middleCategory || '';
      if (middleCat && middleCat !== '미분류') {
        fullCategoryPath = `${mainCat} > ${middleCat}`;
        categoryDepth = 2;
      } else {
        fullCategoryPath = mainCat;
        categoryDepth = 1;
      }
    }

    // Instagram 20개 필드 변환
    // 🚀 FieldMapper 완전 자동화된 데이터 구조
    return {
      // 자동 생성 필드
      [FieldMapper.get('ROW_NUMBER')]: rowNumber,
      
      // Instagram 전용 19개 필드 (FieldMapper 자동화)
      [FieldMapper.get('UPLOAD_DATE')]: uploadDate,
      [FieldMapper.get('PLATFORM')]: (platform || 'instagram').toUpperCase(),
      [FieldMapper.get('CHANNEL_NAME')]: metadata[FieldMapper.get('CHANNEL_NAME')] || '',
      [FieldMapper.get('CHANNEL_URL')]: metadata[FieldMapper.get('CHANNEL_URL')] || '',
      [FieldMapper.get('MAIN_CATEGORY')]: analysis.mainCategory || '미분류',
      [FieldMapper.get('MIDDLE_CATEGORY')]: analysis.middleCategory || '',
      [FieldMapper.get('FULL_CATEGORY_PATH')]: fullCategoryPath,
      [FieldMapper.get('CATEGORY_DEPTH')]: categoryDepth,
      [FieldMapper.get('KEYWORDS')]: analysis.keywords?.join(', ') || '',
      [FieldMapper.get('HASHTAGS')]: analysis.hashtags?.join(' ') || '',
      [FieldMapper.get('MENTIONS')]: analysis.mentions?.join(' ') || '',
      [FieldMapper.get('DESCRIPTION')]: metadata[FieldMapper.get('DESCRIPTION')] || '',
      [FieldMapper.get('ANALYSIS_CONTENT')]: analysis.summary || '',
      [FieldMapper.get('LIKES')]: this.parseNumber(metadata[FieldMapper.get('LIKES')]),
      [FieldMapper.get('COMMENTS_COUNT')]: this.parseNumber(metadata[FieldMapper.get('COMMENTS_COUNT')]),
      [FieldMapper.get('URL')]: url || '',
      [FieldMapper.get('THUMBNAIL_URL')]: metadata[FieldMapper.get('THUMBNAIL_URL')] || '',
      [FieldMapper.get('CONFIDENCE')]: this.formatConfidence(analysis.confidence),
      [FieldMapper.get('ANALYSIS_STATUS')]: analysis.aiModel || '수동',
      collectionTime: new Date()
    };
  }

  /**
   * 숫자 파싱 헬퍼 함수
   * 문자열 숫자를 정수로 변환, 실패 시 0 반환
   */
  static parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 신뢰도 포맷 헬퍼 함수
   * analysis.confidence를 백분율 문자열로 변환
   */
  static formatConfidence(confidence) {
    if (confidence === null || confidence === undefined) {
      return '0%';
    }
    
    if (typeof confidence === 'number') {
      return (confidence * 100).toFixed(1) + '%';
    }
    
    if (typeof confidence === 'string' && confidence.includes('%')) {
      return confidence;
    }
    
    return '0%';
  }

  /**
   * Google Sheets 행 데이터를 MongoDB 문서로 변환
   * @param {Array} rowData - Google Sheets 행 배열
   * @param {string} platform - 플랫폼
   * @returns {Object} MongoDB 문서 객체
   */
  static convertRowDataToDocument(rowData, platform) {
    const normalizedPlatform = platform.toLowerCase();
    
    try {
      if (normalizedPlatform === 'youtube') {
        return this.convertYouTubeRowToDocument(rowData);
      } else if (normalizedPlatform === 'instagram') {
        return this.convertInstagramRowToDocument(rowData);
      } else {
        throw new Error(`지원되지 않는 플랫폼: ${platform}`);
      }
    } catch (error) {
      ServerLogger.error(`행 데이터 변환 실패 (${platform})`, error.message, 'DATA_CONVERTER');
      throw error;
    }
  }

  /**
   * YouTube Google Sheets 행을 MongoDB 문서로 변환
   * 🚀 FieldMapper 완전 자동화된 데이터 구조
   */
  static convertYouTubeRowToDocument(rowData) {
    return {
      [FieldMapper.get('ROW_NUMBER')]: this.parseNumber(rowData[0]),
      [FieldMapper.get('UPLOAD_DATE')]: rowData[1] || '',
      [FieldMapper.get('PLATFORM')]: rowData[2] || 'YOUTUBE',
      [FieldMapper.get('CHANNEL_NAME')]: rowData[3] || '',
      [FieldMapper.get('YOUTUBE_HANDLE')]: rowData[4] || '',
      [FieldMapper.get('CHANNEL_URL')]: rowData[5] || '',
      [FieldMapper.get('MAIN_CATEGORY')]: rowData[6] || '',
      [FieldMapper.get('MIDDLE_CATEGORY')]: rowData[7] || '',
      [FieldMapper.get('FULL_CATEGORY_PATH')]: rowData[8] || '',
      [FieldMapper.get('CATEGORY_DEPTH')]: this.parseNumber(rowData[9]),
      [FieldMapper.get('KEYWORDS')]: rowData[10] || '',
      [FieldMapper.get('HASHTAGS')]: rowData[11] || '',
      [FieldMapper.get('MENTIONS')]: rowData[12] || '',
      [FieldMapper.get('DESCRIPTION')]: rowData[13] || '',
      [FieldMapper.get('ANALYSIS_CONTENT')]: rowData[14] || '',
      [FieldMapper.get('COMMENTS')]: rowData[15] || '',
      [FieldMapper.get('LIKES')]: this.parseNumber(rowData[16]),
      [FieldMapper.get('COMMENTS_COUNT')]: this.parseNumber(rowData[17]),
      [FieldMapper.get('VIEWS')]: this.parseNumber(rowData[18]),
      [FieldMapper.get('DURATION')]: rowData[19] || '',
      [FieldMapper.get('SUBSCRIBERS')]: this.parseNumber(rowData[20]),
      [FieldMapper.get('CHANNEL_VIDEOS')]: this.parseNumber(rowData[21]),
      [FieldMapper.get('MONETIZED')]: rowData[22] || 'N',
      [FieldMapper.get('YOUTUBE_CATEGORY')]: rowData[23] || '',
      [FieldMapper.get('LICENSE')]: rowData[24] || 'youtube',
      [FieldMapper.get('QUALITY')]: rowData[25] || 'sd',
      [FieldMapper.get('LANGUAGE')]: rowData[26] || '',
      [FieldMapper.get('URL')]: rowData[27] || '',
      [FieldMapper.get('THUMBNAIL_URL')]: rowData[28] || '',
      [FieldMapper.get('CONFIDENCE')]: rowData[29] || '0%',
      [FieldMapper.get('ANALYSIS_STATUS')]: rowData[30] || '수동',
      [FieldMapper.get('CATEGORY_MATCH_RATE')]: rowData[31] || '',
      [FieldMapper.get('MATCH_TYPE')]: rowData[32] || '',
      [FieldMapper.get('MATCH_REASON')]: rowData[33] || '',
      collectionTime: new Date()
    };
  }

  /**
   * Instagram Google Sheets 행을 MongoDB 문서로 변환
   * 🚀 FieldMapper 완전 자동화된 데이터 구조
   */
  static convertInstagramRowToDocument(rowData) {
    return {
      [FieldMapper.get('ROW_NUMBER')]: this.parseNumber(rowData[0]),
      [FieldMapper.get('UPLOAD_DATE')]: rowData[1] || '',
      [FieldMapper.get('PLATFORM')]: rowData[2] || 'INSTAGRAM',
      [FieldMapper.get('CHANNEL_NAME')]: rowData[3] || '',
      [FieldMapper.get('CHANNEL_URL')]: rowData[4] || '',
      [FieldMapper.get('MAIN_CATEGORY')]: rowData[5] || '',
      [FieldMapper.get('MIDDLE_CATEGORY')]: rowData[6] || '',
      [FieldMapper.get('FULL_CATEGORY_PATH')]: rowData[7] || '',
      [FieldMapper.get('CATEGORY_DEPTH')]: this.parseNumber(rowData[8]),
      [FieldMapper.get('KEYWORDS')]: rowData[9] || '',
      [FieldMapper.get('HASHTAGS')]: rowData[10] || '',
      [FieldMapper.get('MENTIONS')]: rowData[11] || '',
      [FieldMapper.get('DESCRIPTION')]: rowData[12] || '',
      [FieldMapper.get('ANALYSIS_CONTENT')]: rowData[13] || '',
      [FieldMapper.get('LIKES')]: this.parseNumber(rowData[14]),
      [FieldMapper.get('COMMENTS_COUNT')]: this.parseNumber(rowData[15]),
      [FieldMapper.get('URL')]: rowData[16] || '',
      [FieldMapper.get('THUMBNAIL_URL')]: rowData[17] || '',
      [FieldMapper.get('CONFIDENCE')]: rowData[18] || '0%',
      [FieldMapper.get('ANALYSIS_STATUS')]: rowData[19] || '수동',
      collectionTime: new Date()
    };
  }

  /**
   * MongoDB 문서를 Google Sheets 행 데이터로 역변환
   * @param {Object} document - MongoDB 문서
   * @param {string} platform - 플랫폼
   * @returns {Array} Google Sheets 행 배열
   */
  static convertDocumentToRowData(document, platform) {
    const normalizedPlatform = platform.toLowerCase();
    
    try {
      if (normalizedPlatform === 'youtube') {
        return this.convertYouTubeDocumentToRow(document);
      } else if (normalizedPlatform === 'instagram') {
        return this.convertInstagramDocumentToRow(document);
      } else {
        throw new Error(`지원되지 않는 플랫폼: ${platform}`);
      }
    } catch (error) {
      ServerLogger.error(`문서 역변환 실패 (${platform})`, error.message, 'DATA_CONVERTER');
      throw error;
    }
  }

  /**
   * YouTube MongoDB 문서를 Google Sheets 행으로 역변환
   * 🚀 FieldMapper 완전 자동화된 데이터 구조
   */
  static convertYouTubeDocumentToRow(document) {
    return [
      document[FieldMapper.get('ROW_NUMBER')] || 0,
      document[FieldMapper.get('UPLOAD_DATE')] || '',
      document[FieldMapper.get('PLATFORM')] || 'YOUTUBE',
      document[FieldMapper.get('CHANNEL_NAME')] || '',
      document[FieldMapper.get('YOUTUBE_HANDLE')] || '',
      document[FieldMapper.get('CHANNEL_URL')] || '',
      document[FieldMapper.get('MAIN_CATEGORY')] || '',
      document[FieldMapper.get('MIDDLE_CATEGORY')] || '',
      document[FieldMapper.get('FULL_CATEGORY_PATH')] || '',
      document[FieldMapper.get('CATEGORY_DEPTH')] || 0,
      document[FieldMapper.get('KEYWORDS')] || '',
      document[FieldMapper.get('HASHTAGS')] || '',
      document[FieldMapper.get('MENTIONS')] || '',
      document[FieldMapper.get('DESCRIPTION')] || '',
      document[FieldMapper.get('ANALYSIS_CONTENT')] || '',
      document[FieldMapper.get('COMMENTS')] || '',
      document[FieldMapper.get('LIKES')] || 0,
      document[FieldMapper.get('COMMENTS_COUNT')] || 0,
      document[FieldMapper.get('VIEWS')] || 0,
      document[FieldMapper.get('DURATION')] || '',
      document[FieldMapper.get('SUBSCRIBERS')] || 0,
      document[FieldMapper.get('CHANNEL_VIDEOS')] || 0,
      document[FieldMapper.get('MONETIZED')] || 'N',
      document[FieldMapper.get('YOUTUBE_CATEGORY')] || '',
      document[FieldMapper.get('LICENSE')] || 'youtube',
      document[FieldMapper.get('QUALITY')] || 'sd',
      document[FieldMapper.get('LANGUAGE')] || '',
      document[FieldMapper.get('URL')] || '',
      document[FieldMapper.get('THUMBNAIL_URL')] || '',
      document[FieldMapper.get('CONFIDENCE')] || '0%',
      document[FieldMapper.get('ANALYSIS_STATUS')] || '수동',
      document[FieldMapper.get('CATEGORY_MATCH_RATE')] || '',
      document[FieldMapper.get('MATCH_TYPE')] || '',
      document[FieldMapper.get('MATCH_REASON')] || ''
    ];
  }

  /**
   * Instagram MongoDB 문서를 Google Sheets 행으로 역변환
   * 🚀 FieldMapper 완전 자동화된 데이터 구조
   */
  static convertInstagramDocumentToRow(document) {
    return [
      document[FieldMapper.get('ROW_NUMBER')] || 0,
      document[FieldMapper.get('UPLOAD_DATE')] || '',
      document[FieldMapper.get('PLATFORM')] || 'INSTAGRAM',
      document[FieldMapper.get('CHANNEL_NAME')] || '',
      document[FieldMapper.get('CHANNEL_URL')] || '',
      document[FieldMapper.get('MAIN_CATEGORY')] || '',
      document[FieldMapper.get('MIDDLE_CATEGORY')] || '',
      document[FieldMapper.get('FULL_CATEGORY_PATH')] || '',
      document[FieldMapper.get('CATEGORY_DEPTH')] || 0,
      document[FieldMapper.get('KEYWORDS')] || '',
      document[FieldMapper.get('HASHTAGS')] || '',
      document[FieldMapper.get('MENTIONS')] || '',
      document[FieldMapper.get('DESCRIPTION')] || '',
      document[FieldMapper.get('ANALYSIS_CONTENT')] || '',
      document[FieldMapper.get('LIKES')] || 0,
      document[FieldMapper.get('COMMENTS_COUNT')] || 0,
      document[FieldMapper.get('URL')] || '',
      document[FieldMapper.get('THUMBNAIL_URL')] || '',
      document[FieldMapper.get('CONFIDENCE')] || '0%',
      document[FieldMapper.get('ANALYSIS_STATUS')] || '수동'
    ];
  }

  /**
   * 플랫폼별 필드 개수 반환
   */
  static getFieldCount(platform) {
    const normalizedPlatform = platform.toLowerCase();
    
    switch (normalizedPlatform) {
      case 'youtube':
        return 34; // 33개 헤더 + rowNumber
      case 'instagram':
        return 20; // 19개 헤더 + rowNumber
      default:
        throw new Error(`지원되지 않는 플랫폼: ${platform}`);
    }
  }

  /**
   * 변환 로그 출력
   */
  static logConversion(platform, originalData, convertedData) {
    ServerLogger.info(
      `데이터 변환 완료: ${platform.toUpperCase()}`,
      {
        url: originalData.url || originalData.postUrl,  // ⭐ 표준화
        channelName: originalData.metadata?.channelName,
        fields: Object.keys(convertedData).length,
        mainCategory: convertedData.mainCategory
      },
      'DATA_CONVERTER'
    );
  }
}

module.exports = VideoDataConverter;