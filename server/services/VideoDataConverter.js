/**
 * 플랫폼별 데이터 변환 로직
 * Google Sheets buildRowData 로직을 MongoDB 최적화 스키마로 변환
 */

const path = require('path');
const { ServerLogger } = require('../utils/logger');

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
    
    // 업로드 날짜 결정 (기존 buildRowData 로직)
    let displayDate;
    if (metadata.uploadDate) {
      displayDate = new Date(metadata.uploadDate).toLocaleString('ko-KR');
    } else {
      displayDate = new Date(timestamp).toLocaleString('ko-KR');
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
    return {
      // 자동 생성 필드
      rowNumber: rowNumber,
      
      // YouTube 전용 33개 필드 (Google Sheets 헤더 순서대로)
      uploadDate: displayDate,                                 // 업로드날짜
      platform: (platform || 'youtube').toUpperCase(),        // 플랫폼
      account: metadata.author || '',                          // 계정
      youtubeHandle: metadata.youtubeHandle || '',             // YouTube핸들명
      channelUrl: metadata.channelUrl || '',                   // 채널URL
      mainCategory: analysis.mainCategory || '미분류',         // 대카테고리
      middleCategory: analysis.middleCategory || '',           // 중카테고리
      fullCategoryPath: fullCategoryPath,                      // 전체카테고리경로
      categoryDepth: categoryDepth,                            // 카테고리깊이
      keywords: analysis.keywords?.join(', ') || '',           // 키워드
      hashtags: analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 해시태그
      mentions: analysis.mentions?.join(' ') || '',            // 멘션
      description: metadata.description || '',                 // 설명
      analysisContent: analysis.content || '',                 // 분석내용
      comments: analysis.comments || '',                       // 댓글
      likes: this.parseNumber(metadata.likes),                 // 좋아요
      commentsCount: this.parseNumber(metadata.comments),      // 댓글수
      views: this.parseNumber(metadata.views),                 // 조회수
      duration: metadata.durationFormatted || '',              // 영상길이
      subscribers: this.parseNumber(metadata.subscribers),     // 구독자수
      channelVideos: this.parseNumber(metadata.channelVideos), // 채널동영상수
      monetized: metadata.monetized || 'N',                    // 수익화여부
      youtubeCategory: metadata.youtubeCategory || '',         // YouTube카테고리
      license: metadata.license || 'youtube',                  // 라이센스
      quality: metadata.definition || 'sd',                    // 화질
      language: metadata.language || '',                       // 언어
      url: postUrl || '',                                       // URL
      thumbnailUrl: metadata.thumbnailUrl || '',               // 썸네일URL
      confidence: this.formatConfidence(analysis.confidence),  // 신뢰도
      analysisStatus: analysis.aiModel || '수동',              // 분석상태
      categoryMatchRate: '',                                    // 카테고리일치율 (빈 값)
      matchType: '',                                            // 일치유형 (빈 값)
      matchReason: '',                                          // 일치사유 (빈 값)
      collectionTime: new Date()                                // 수집시간
    };
  }

  /**
   * Instagram 스키마로 변환 (20개 필드)
   * Google Sheets Instagram buildRowData 로직 기반
   */
  static convertToInstagramSchema(videoData, rowNumber = 1) {
    const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;
    
    // 업로드 날짜 결정 (Instagram은 날짜만)
    let displayDate;
    if (metadata.uploadDate) {
      displayDate = new Date(metadata.uploadDate).toLocaleDateString('ko-KR');
    } else {
      displayDate = new Date(timestamp).toLocaleString('ko-KR');
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
      uploadDate: displayDate,                                 // 업로드날짜
      platform: (platform || 'instagram').toUpperCase(),      // 플랫폼
      account: metadata.author || '',                          // 계정
      channelUrl: metadata.channelUrl || '',                   // 채널URL
      mainCategory: analysis.mainCategory || '미분류',         // 대카테고리
      middleCategory: analysis.middleCategory || '',           // 중카테고리
      fullCategoryPath: fullCategoryPath,                      // 전체카테고리경로
      categoryDepth: categoryDepth,                            // 카테고리깊이
      keywords: analysis.keywords?.join(', ') || '',           // 키워드
      hashtags: analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 해시태그
      mentions: analysis.mentions?.join(' ') || '',            // 멘션
      description: metadata.description || '',                 // 설명
      analysisContent: analysis.content || '',                 // 분석내용
      likes: this.parseNumber(metadata.likes),                 // 좋아요
      commentsCount: this.parseNumber(metadata.comments),      // 댓글수
      url: postUrl || '',                                       // URL
      thumbnailUrl: metadata.thumbnailUrl || '',               // 썸네일URL
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
      account: rowData[3] || '',
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
      account: rowData[3] || '',
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
      document.account || '',
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
      document.account || '',
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
        url: originalData.postUrl,
        account: originalData.metadata?.author,
        fields: Object.keys(convertedData).length,
        mainCategory: convertedData.mainCategory
      },
      'DATA_CONVERTER'
    );
  }
}

module.exports = VideoDataConverter;