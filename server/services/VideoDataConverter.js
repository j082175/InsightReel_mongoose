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
      [FieldMapper.get('CHANNEL_NAME')]: metadata[FieldMapper.get('CHANNEL_NAME')] || metadata.author || '',
      [FieldMapper.get('TITLE')]: metadata[FieldMapper.get('TITLE')] || metadata.title || '',
      [FieldMapper.get('YOUTUBE_HANDLE')]: metadata.youtubeHandle || metadata[FieldMapper.get('YOUTUBE_HANDLE')] || '',
      [FieldMapper.get('CHANNEL_URL')]: metadata.channelUrl || metadata[FieldMapper.get('CHANNEL_URL')] || '',
      [FieldMapper.get('MAIN_CATEGORY')]: analysis.mainCategory || '미분류',
      [FieldMapper.get('MIDDLE_CATEGORY')]: analysis.middleCategory || '',
      [FieldMapper.get('FULL_CATEGORY_PATH')]: fullCategoryPath,
      [FieldMapper.get('CATEGORY_DEPTH')]: categoryDepth,
      [FieldMapper.get('KEYWORDS')]: analysis.keywords?.join(', ') || '',
      [FieldMapper.get('HASHTAGS')]: analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '',
      [FieldMapper.get('MENTIONS')]: analysis.mentions?.join(' ') || '',
      [FieldMapper.get('DESCRIPTION')]: metadata[FieldMapper.get('DESCRIPTION')] || metadata.description || '',
      [FieldMapper.get('ANALYSIS_CONTENT')]: analysis.analysisContent || analysis.summary || analysis.description || analysis.content || '',
      [FieldMapper.get('COMMENTS')]: metadata.comments || '',
      [FieldMapper.get('LIKES')]: this.parseNumber(metadata[FieldMapper.get('LIKES')] || metadata.likes),
      [FieldMapper.get('COMMENTS_COUNT')]: this.parseNumber(metadata[FieldMapper.get('COMMENTS_COUNT')] || metadata.commentsCount),
      [FieldMapper.get('VIEWS')]: this.parseNumber(metadata[FieldMapper.get('VIEWS')] || metadata.views),
      [FieldMapper.get('DURATION')]: metadata[FieldMapper.get('DURATION')] || metadata.durationFormatted || '',
      [FieldMapper.get('SUBSCRIBERS')]: this.parseNumber(metadata.subscribers) || this.parseNumber(metadata[FieldMapper.get('SUBSCRIBERS')]),
      [FieldMapper.get('CHANNEL_VIDEOS')]: this.parseNumber(metadata.channelVideos) || this.parseNumber(metadata[FieldMapper.get('CHANNEL_VIDEOS')]),
      [FieldMapper.get('MONETIZED')]: metadata.monetized || 'N',
      [FieldMapper.get('YOUTUBE_CATEGORY')]: metadata.youtubeCategory || '',
      [FieldMapper.get('LICENSE')]: metadata.license || 'youtube',
      [FieldMapper.get('QUALITY')]: metadata.definition || 'sd',
      [FieldMapper.get('LANGUAGE')]: (metadata.language && metadata.language.trim() !== '') ? metadata.language :
                                     (metadata.defaultLanguage && metadata.defaultLanguage.trim() !== '') ? metadata.defaultLanguage :
                                     (metadata.defaultAudioLanguage && metadata.defaultAudioLanguage.trim() !== '') ? metadata.defaultAudioLanguage : null,
      [FieldMapper.get('URL')]: url || '',
      [FieldMapper.get('THUMBNAIL_URL')]: metadata[FieldMapper.get('THUMBNAIL_URL')] || metadata.thumbnailUrl || '',
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
    return {
      // 자동 생성 필드
      rowNumber: rowNumber,
      
      // Instagram 전용 19개 필드 (Google Sheets 헤더 순서대로)
      uploadDate: uploadDate,                                 // 업로드날짜
      platform: (platform || 'instagram').toUpperCase(),      // 플랫폼
      channelName: metadata[FieldMapper.get('CHANNEL_NAME')] || '',     // 채널이름
      channelUrl: metadata[FieldMapper.get('CHANNEL_URL')] || '',      // 채널URL
      mainCategory: analysis.mainCategory || '미분류',         // 대카테고리
      middleCategory: analysis.middleCategory || '',           // 중카테고리
      fullCategoryPath: fullCategoryPath,                      // 전체카테고리경로
      categoryDepth: categoryDepth,                            // 카테고리깊이
      keywords: analysis.keywords?.join(', ') || '',           // 키워드
      hashtags: analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 해시태그
      mentions: analysis.mentions?.join(' ') || '',            // 멘션
      description: metadata[FieldMapper.get('DESCRIPTION')] || metadata.description || '', // 설명 (FieldMapper 표준)
      analysisContent: analysis.summary || '',                 // 분석내용
      likes: this.parseNumber(metadata[FieldMapper.get('LIKES')] || metadata.likes), // 좋아요 (FieldMapper 표준)
      commentsCount: this.parseNumber(metadata[FieldMapper.get('COMMENTS_COUNT')] || metadata.commentsCount), // 댓글수 (FieldMapper 표준)
      url: url || '',                                           // ⭐ URL (표준화 완료)
      thumbnailUrl: metadata[FieldMapper.get('THUMBNAIL_URL')] || metadata.thumbnailUrl || '', // 썸네일URL (FieldMapper 표준)
      confidence: this.formatConfidence(analysis.confidence),  // 신뢰도
      analysisStatus: analysis.aiModel || '수동',              // 분석상태
      collectionTime: new Date()                                // 수집시간
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
   */
  static convertYouTubeRowToDocument(rowData) {
    return {
      rowNumber: this.parseNumber(rowData[0]),
      uploadDate: rowData[1] || '',
      platform: rowData[2] || 'YOUTUBE',
      channelName: rowData[3] || '',
      youtubeHandle: rowData[4] || '',
      channelUrl: rowData[5] || '',
      mainCategory: rowData[6] || '',
      middleCategory: rowData[7] || '',
      fullCategoryPath: rowData[8] || '',
      categoryDepth: this.parseNumber(rowData[9]),
      keywords: rowData[10] || '',
      hashtags: rowData[11] || '',
      mentions: rowData[12] || '',
      description: rowData[13] || '',
      analysisContent: rowData[14] || '',
      comments: rowData[15] || '',
      likes: this.parseNumber(rowData[16]),
      commentsCount: this.parseNumber(rowData[17]),
      views: this.parseNumber(rowData[18]),
      duration: rowData[19] || '',
      subscribers: this.parseNumber(rowData[20]),
      channelVideos: this.parseNumber(rowData[21]),
      monetized: rowData[22] || 'N',
      youtubeCategory: rowData[23] || '',
      license: rowData[24] || 'youtube',
      quality: rowData[25] || 'sd',
      language: rowData[26] || '',
      url: rowData[27] || '',
      thumbnailUrl: rowData[28] || '',
      confidence: rowData[29] || '0%',
      analysisStatus: rowData[30] || '수동',
      categoryMatchRate: rowData[31] || '',
      matchType: rowData[32] || '',
      matchReason: rowData[33] || '',
      collectionTime: new Date()
    };
  }

  /**
   * Instagram Google Sheets 행을 MongoDB 문서로 변환
   */
  static convertInstagramRowToDocument(rowData) {
    return {
      rowNumber: this.parseNumber(rowData[0]),
      uploadDate: rowData[1] || '',
      platform: rowData[2] || 'INSTAGRAM',
      channelName: rowData[3] || '',
      channelUrl: rowData[4] || '',
      mainCategory: rowData[5] || '',
      middleCategory: rowData[6] || '',
      fullCategoryPath: rowData[7] || '',
      categoryDepth: this.parseNumber(rowData[8]),
      keywords: rowData[9] || '',
      hashtags: rowData[10] || '',
      mentions: rowData[11] || '',
      description: rowData[12] || '',
      analysisContent: rowData[13] || '',
      likes: this.parseNumber(rowData[14]),
      commentsCount: this.parseNumber(rowData[15]),
      url: rowData[16] || '',
      thumbnailUrl: rowData[17] || '',
      confidence: rowData[18] || '0%',
      analysisStatus: rowData[19] || '수동',
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
   */
  static convertYouTubeDocumentToRow(document) {
    return [
      document.rowNumber || 0,
      document.uploadDate || '',
      document.platform || 'YOUTUBE',
      document.channelName || '',
      document.youtubeHandle || '',
      document.channelUrl || '',
      document.mainCategory || '',
      document.middleCategory || '',
      document.fullCategoryPath || '',
      document.categoryDepth || 0,
      document.keywords || '',
      document.hashtags || '',
      document.mentions || '',
      document.description || '',
      document.analysisContent || '',
      document.comments || '',
      document.likes || 0,
      document.commentsCount || 0,
      document.views || 0,
      document.duration || '',
      document.subscribers || 0,
      document.channelVideos || 0,
      document.monetized || 'N',
      document.youtubeCategory || '',
      document.license || 'youtube',
      document.quality || 'sd',
      document.language || '',
      document.url || '',
      document.thumbnailUrl || '',
      document.confidence || '0%',
      document.analysisStatus || '수동',
      document.categoryMatchRate || '',
      document.matchType || '',
      document.matchReason || ''
    ];
  }

  /**
   * Instagram MongoDB 문서를 Google Sheets 행으로 역변환
   */
  static convertInstagramDocumentToRow(document) {
    return [
      document.rowNumber || 0,
      document.uploadDate || '',
      document.platform || 'INSTAGRAM',
      document.channelName || '',
      document.channelUrl || '',
      document.mainCategory || '',
      document.middleCategory || '',
      document.fullCategoryPath || '',
      document.categoryDepth || 0,
      document.keywords || '',
      document.hashtags || '',
      document.mentions || '',
      document.description || '',
      document.analysisContent || '',
      document.likes || 0,
      document.commentsCount || 0,
      document.url || '',
      document.thumbnailUrl || '',
      document.confidence || '0%',
      document.analysisStatus || '수동'
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