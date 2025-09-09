/**
 * 🚀 Google Sheets + MongoDB 통합 저장 서비스 (FieldMapper 자동화)
 * FieldMapper로 완전 자동화된 필드명 관리
 * 필드명 변경 시 이 파일은 자동으로 동기화됩니다!
 */

const SheetsManager = require('./SheetsManager');
const VideoDataConverter = require('./VideoDataConverter');
const Video = require('../models/Video');
const { ServerLogger } = require('../utils/logger');
const { FieldMapper } = require('../types/field-mapper'); // 🚀 FieldMapper 임포트
const mongoose = require('mongoose');

class UnifiedVideoSaver {
  constructor() {
    this.sheetsManager = new SheetsManager();
  }

  /**
   * 단일 비디오 데이터 통합 저장
   * @param {string} platform - 플랫폼 ('youtube', 'instagram')
   * @param {Object} videoData - 비디오 데이터 객체
   * @param {number} rowNumber - Google Sheets 행 번호
   * @returns {Promise<Object>} 저장 결과
   */
  async saveVideoData(platform, videoData, rowNumber = null) {
    const startTime = Date.now();
    let sheetsResult = null;
    let mongoResult = null;
    
    try {
      // 🚀 FieldMapper 자동화된 로깅
      const urlField = FieldMapper.get('URL');
      const channelNameField = FieldMapper.get('CHANNEL_NAME');
      
      ServerLogger.info(`🚀 통합 저장 시작: ${platform.toUpperCase()}`, {
        [urlField]: videoData[urlField] || videoData.url || videoData.postUrl,
        [channelNameField]: videoData[channelNameField] || videoData.channelName || videoData.metadata?.channelName || videoData.metadata?.author
      }, 'UNIFIED_SAVER');

      // 1단계: Google Sheets 저장 비활성화 확인 (먼저 체크)
      let actualRowNumber;
      
      if (process.env.DISABLE_SHEETS_SAVING === 'true') {
        // Sheets 비활성화시 기본 행 번호 사용
        actualRowNumber = rowNumber || 1;
      } else {
        // Sheets 활성화시 실제 다음 행 번호 가져오기
        actualRowNumber = rowNumber || await this.getNextRowNumber(platform);
      }
      
      // 2단계: 플랫폼별 데이터 변환
      const convertedData = VideoDataConverter.convertToSchema(platform, videoData, actualRowNumber);
      VideoDataConverter.logConversion(platform, videoData, convertedData);

      // 3단계: Google Sheets 저장 (기존 로직 사용)
      const sheetsStartTime = Date.now();
      
      if (process.env.DISABLE_SHEETS_SAVING === 'true') {
        ServerLogger.info('⚠️ Google Sheets 저장이 비활성화되어 건너뜁니다', {}, 'UNIFIED_SAVER');
        sheetsResult = {
          success: true,
          message: 'Google Sheets 저장 비활성화됨',
          sheetName: `${platform}_disabled`,
          nextRow: 1,
          spreadsheetUrl: null
        };
      } else {
        sheetsResult = await this.saveToGoogleSheets(platform, videoData);
      }
      const sheetsEndTime = Date.now();
      
      if (!sheetsResult.success) {
        throw new Error(`Google Sheets 저장 실패: ${sheetsResult.error}`);
      }

      // 4단계: MongoDB 저장
      const mongoStartTime = Date.now();
      mongoResult = await this.saveToMongoDB(platform, convertedData);
      const mongoEndTime = Date.now();

      // 5단계: 성능 로그 출력
      const totalTime = Date.now() - startTime;
      const sheetsTime = sheetsEndTime - sheetsStartTime;
      const mongoTime = mongoEndTime - mongoStartTime;

      ServerLogger.info(`✅ 통합 저장 완료: ${platform.toUpperCase()}`, {
        url: videoData.url || videoData.postUrl,
        totalTime: `${totalTime}ms`,
        sheetsTime: `${sheetsTime}ms`,
        mongoTime: `${mongoTime}ms`,
        sheetsUrl: sheetsResult.spreadsheetUrl || 'disabled',
        mongoId: mongoResult._id
      }, 'UNIFIED_SAVER');

      return {
        success: true,
        platform: platform,
        rowNumber: actualRowNumber,
        sheets: sheetsResult,
        mongodb: mongoResult,
        performance: {
          totalTime: totalTime,
          sheetsTime: sheetsTime,
          mongoTime: mongoTime
        }
      };

    } catch (error) {
      ServerLogger.error(`❌ 통합 저장 실패: ${platform.toUpperCase()}`, error.message, 'UNIFIED_SAVER');
      
      // 롤백 처리 (MongoDB만 삭제, Google Sheets는 유지)
      if (mongoResult && mongoResult._id) {
        try {
          await this.rollbackMongoDB(platform, mongoResult._id);
          ServerLogger.info(`🔄 MongoDB 롤백 완료: ${mongoResult._id}`, null, 'UNIFIED_SAVER');
        } catch (rollbackError) {
          ServerLogger.error(`❌ MongoDB 롤백 실패: ${mongoResult._id}`, rollbackError.message, 'UNIFIED_SAVER');
        }
      }

      return {
        success: false,
        platform: platform,
        error: error.message,
        sheets: sheetsResult,
        mongodb: mongoResult
      };
    }
  }

  /**
   * 배치 비디오 데이터 통합 저장
   * @param {string} platform - 플랫폼
   * @param {Array} videoDataArray - 비디오 데이터 배열
   * @returns {Promise<Object>} 저장 결과
   */
  async saveBatchVideoData(platform, videoDataArray) {
    const startTime = Date.now();
    let sheetsResult = null;
    let mongoResults = [];
    let successCount = 0;
    let failedCount = 0;
    
    try {
      ServerLogger.info(`🚀 배치 통합 저장 시작: ${platform.toUpperCase()}`, {
        count: videoDataArray.length
      }, 'UNIFIED_SAVER');

      // 1단계: Google Sheets 배치 저장 (기존 로직 사용)
      const sheetsStartTime = Date.now();
      
      if (process.env.DISABLE_SHEETS_SAVING === 'true') {
        ServerLogger.info('⚠️ Google Sheets 배치 저장이 비활성화되어 건너뜁니다', {}, 'UNIFIED_SAVER');
        sheetsResult = {
          success: true,
          message: 'Google Sheets 배치 저장 비활성화됨',
          savedCount: videoDataArray.length,
          spreadsheetUrl: null
        };
      } else {
        sheetsResult = await this.saveBatchToGoogleSheets(platform, videoDataArray);
      }
      const sheetsEndTime = Date.now();
      
      if (!sheetsResult.success) {
        throw new Error(`Google Sheets 배치 저장 실패: ${sheetsResult.error}`);
      }

      // 2단계: MongoDB 배치 저장
      const mongoStartTime = Date.now();
      const startRow = process.env.DISABLE_SHEETS_SAVING === 'true' ? 1 : await this.getNextRowNumber(platform);
      
      for (let i = 0; i < videoDataArray.length; i++) {
        const videoData = videoDataArray[i];
        const rowNumber = startRow + i;
        
        try {
          const convertedData = VideoDataConverter.convertToSchema(platform, videoData, rowNumber);
          const mongoResult = await this.saveToMongoDB(platform, convertedData);
          
          mongoResults.push({
            success: true,
            data: mongoResult,
            originalIndex: i
          });
          successCount++;
          
        } catch (error) {
          mongoResults.push({
            success: false,
            error: error.message,
            originalIndex: i,
            url: videoData.url || videoData.postUrl
          });
          failedCount++;
          
          ServerLogger.warn(`⚠️ MongoDB 개별 저장 실패 [${i+1}/${videoDataArray.length}]`, {
            url: videoData.url || videoData.postUrl,
            error: error.message
          }, 'UNIFIED_SAVER');
        }
      }
      
      const mongoEndTime = Date.now();

      // 3단계: 성능 로그 출력
      const totalTime = Date.now() - startTime;
      const sheetsTime = sheetsEndTime - sheetsStartTime;
      const mongoTime = mongoEndTime - mongoStartTime;

      ServerLogger.info(`✅ 배치 통합 저장 완료: ${platform.toUpperCase()}`, {
        total: videoDataArray.length,
        sheetsSuccess: sheetsResult.saved,
        mongoSuccess: successCount,
        mongoFailed: failedCount,
        totalTime: `${totalTime}ms`,
        sheetsTime: `${sheetsTime}ms`,
        mongoTime: `${mongoTime}ms`,
        sheetsUrl: sheetsResult.spreadsheetUrl
      }, 'UNIFIED_SAVER');

      return {
        success: true,
        platform: platform,
        total: videoDataArray.length,
        sheets: sheetsResult,
        mongodb: {
          success: successCount,
          failed: failedCount,
          results: mongoResults
        },
        performance: {
          totalTime: totalTime,
          sheetsTime: sheetsTime,
          mongoTime: mongoTime
        }
      };

    } catch (error) {
      ServerLogger.error(`❌ 배치 통합 저장 실패: ${platform.toUpperCase()}`, error.message, 'UNIFIED_SAVER');
      
      // 배치 롤백 처리 (성공한 MongoDB 문서들만 삭제)
      if (mongoResults.length > 0) {
        await this.rollbackBatchMongoDB(platform, mongoResults.filter(r => r.success));
      }

      return {
        success: false,
        platform: platform,
        error: error.message,
        sheets: sheetsResult,
        mongodb: {
          success: successCount,
          failed: failedCount,
          results: mongoResults
        }
      };
    }
  }

  /**
   * Google Sheets 저장 (기존 SheetsManager 사용)
   */
  async saveToGoogleSheets(platform, videoData) {
    try {
      return await this.sheetsManager.saveVideoData(videoData);
    } catch (error) {
      throw new Error(`Google Sheets 저장 실패: ${error.message}`);
    }
  }

  /**
   * Google Sheets 배치 저장 (기존 SheetsManager 사용)
   */
  async saveBatchToGoogleSheets(platform, videoDataArray) {
    try {
      return await this.sheetsManager.saveVideoBatch(videoDataArray);
    } catch (error) {
      throw new Error(`Google Sheets 배치 저장 실패: ${error.message}`);
    }
  }

  /**
   * MongoDB 저장
   */
  async saveToMongoDB(platform, convertedData) {
    try {
      // 통합된 Video 모델 사용
      const Model = Video;
      
      // URL 중복 체크
      const existingDoc = await Model.findOne({ url: convertedData.url });
      if (existingDoc) {
        ServerLogger.warn(`⚠️ MongoDB 중복 URL 감지: ${convertedData.url}`, null, 'UNIFIED_SAVER');
        
        // 기존 문서 업데이트
        const updatedDoc = await Model.findOneAndUpdate(
          { url: convertedData.url },
          convertedData,
          { new: true, upsert: false }
        );
        
        ServerLogger.info(`🔄 MongoDB 기존 문서 업데이트: ${updatedDoc._id}`, null, 'UNIFIED_SAVER');
        return updatedDoc;
      }
      
      // 새 문서 생성
      const newDoc = new Model(convertedData);
      const savedDoc = await newDoc.save();
      
      ServerLogger.info(`✅ MongoDB 새 문서 저장: ${savedDoc._id}`, {
        platform: platform,
        url: convertedData.url,
        channelName: convertedData.channelName
      }, 'UNIFIED_SAVER');
      
      return savedDoc;
      
    } catch (error) {
      if (error.code === 11000) {
        // 중복 키 에러 처리
        ServerLogger.warn(`⚠️ MongoDB 중복 키 에러: ${convertedData.url}`, error.message, 'UNIFIED_SAVER');
        throw new Error(`중복 URL: ${convertedData.url}`);
      }
      throw new Error(`MongoDB 저장 실패: ${error.message}`);
    }
  }

  /**
   * MongoDB 롤백 (단일 문서)
   */
  async rollbackMongoDB(platform, documentId) {
    try {
      const Model = getModelByPlatform(platform);
      const deletedDoc = await Model.findByIdAndDelete(documentId);
      
      if (deletedDoc) {
        ServerLogger.info(`🔄 MongoDB 롤백 성공: ${documentId}`, null, 'UNIFIED_SAVER');
        return true;
      } else {
        ServerLogger.warn(`⚠️ MongoDB 롤백 대상 없음: ${documentId}`, null, 'UNIFIED_SAVER');
        return false;
      }
    } catch (error) {
      ServerLogger.error(`❌ MongoDB 롤백 실패: ${documentId}`, error.message, 'UNIFIED_SAVER');
      throw error;
    }
  }

  /**
   * MongoDB 배치 롤백 (다중 문서)
   */
  async rollbackBatchMongoDB(platform, successResults) {
    try {
      const Model = getModelByPlatform(platform);
      const documentIds = successResults.map(r => r.data._id);
      
      if (documentIds.length === 0) {
        return;
      }
      
      const deleteResult = await Model.deleteMany({
        _id: { $in: documentIds }
      });
      
      ServerLogger.info(`🔄 MongoDB 배치 롤백 완료: ${deleteResult.deletedCount}개 삭제`, null, 'UNIFIED_SAVER');
      
    } catch (error) {
      ServerLogger.error(`❌ MongoDB 배치 롤백 실패`, error.message, 'UNIFIED_SAVER');
      throw error;
    }
  }

  /**
   * Google Sheets 다음 행 번호 가져오기
   */
  async getNextRowNumber(platform) {
    try {
      const sheetName = await this.sheetsManager.getSheetNameByPlatform(platform);
      const response = await this.sheetsManager.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetsManager.spreadsheetId,
        range: `${sheetName}!A:A`
      });
      
      const values = response.data.values || [];
      return values.length + 1; // 헤더 포함하여 다음 행 번호
      
    } catch (error) {
      ServerLogger.warn(`⚠️ 다음 행 번호 조회 실패, 기본값 사용: ${error.message}`, null, 'UNIFIED_SAVER');
      return 2; // 기본값 (헤더 다음 행)
    }
  }

  /**
   * 플랫폼별 저장 통계 조회
   */
  async getSaveStatistics(platform = null) {
    try {
      const stats = {
        sheets: {},
        mongodb: {},
        total: {}
      };

      if (platform) {
        // 특정 플랫폼 통계
        const Model = getModelByPlatform(platform);
        const mongoCount = await Model.countDocuments();
        
        stats.mongodb[platform] = mongoCount;
        stats.total[platform] = mongoCount;
        
      } else {
        // 전체 플랫폼 통계
        const platforms = ['youtube', 'instagram'];
        
        for (const plt of platforms) {
          try {
            const Model = getModelByPlatform(plt);
            const mongoCount = await Model.countDocuments();
            stats.mongodb[plt] = mongoCount;
            stats.total[plt] = mongoCount;
          } catch (error) {
            stats.mongodb[plt] = 0;
            stats.total[plt] = 0;
          }
        }
      }

      return stats;
      
    } catch (error) {
      ServerLogger.error('저장 통계 조회 실패', error.message, 'UNIFIED_SAVER');
      throw error;
    }
  }

  /**
   * 데이터 일관성 검증 (Google Sheets vs MongoDB)
   */
  async validateDataConsistency(platform, limit = 100) {
    try {
      ServerLogger.info(`🔍 데이터 일관성 검증 시작: ${platform.toUpperCase()}`, { limit }, 'UNIFIED_SAVER');
      
      // Google Sheets 데이터 조회
      const sheetName = await this.sheetsManager.getSheetNameByPlatform(platform);
      const response = await this.sheetsManager.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetsManager.spreadsheetId,
        range: `${sheetName}!A2:ZZ${limit + 1}` // 헤더 제외하고 limit 개수만큼
      });
      
      const sheetRows = response.data.values || [];
      
      // MongoDB 데이터 조회
      const Model = getModelByPlatform(platform);
      const mongoDocs = await Model.find({}).limit(limit).sort({ createdAt: -1 });
      
      // 일관성 검증
      const results = {
        platform: platform,
        sheetsCount: sheetRows.length,
        mongoCount: mongoDocs.length,
        mismatches: [],
        duplicateUrls: [],
        consistent: true
      };
      
      // URL 기준으로 매칭 검증
      const sheetUrls = new Set();
      const mongoUrls = new Set();
      
      sheetRows.forEach((row, index) => {
        const url = row[27] || row[16]; // YouTube: 27, Instagram: 16
        if (url) {
          if (sheetUrls.has(url)) {
            results.duplicateUrls.push({ source: 'sheets', url, row: index + 2 });
          }
          sheetUrls.add(url);
        }
      });
      
      mongoDocs.forEach((doc) => {
        if (doc.url) {
          if (mongoUrls.has(doc.url)) {
            results.duplicateUrls.push({ source: 'mongodb', url: doc.url, id: doc._id });
          }
          mongoUrls.add(doc.url);
        }
      });
      
      // 차이점 찾기
      const onlyInSheets = [...sheetUrls].filter(url => !mongoUrls.has(url));
      const onlyInMongo = [...mongoUrls].filter(url => !sheetUrls.has(url));
      
      if (onlyInSheets.length > 0 || onlyInMongo.length > 0) {
        results.consistent = false;
        results.mismatches = {
          onlyInSheets: onlyInSheets.length,
          onlyInMongo: onlyInMongo.length,
          examples: {
            onlyInSheets: onlyInSheets.slice(0, 5),
            onlyInMongo: onlyInMongo.slice(0, 5)
          }
        };
      }
      
      ServerLogger.info(`📊 데이터 일관성 검증 완료: ${platform.toUpperCase()}`, {
        consistent: results.consistent,
        sheetsCount: results.sheetsCount,
        mongoCount: results.mongoCount,
        duplicates: results.duplicateUrls.length,
        mismatches: results.mismatches
      }, 'UNIFIED_SAVER');
      
      return results;
      
    } catch (error) {
      ServerLogger.error(`❌ 데이터 일관성 검증 실패: ${platform.toUpperCase()}`, error.message, 'UNIFIED_SAVER');
      throw error;
    }
  }
}

module.exports = UnifiedVideoSaver;