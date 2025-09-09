const VideoUrl = require('./VideoUrl');      // 모든 비디오 중복 검사 (통합)
const ChannelUrl = require('./ChannelUrl');  // 채널 중복 검사

/**
 * 🔍 플랫폼별 중복 검사 통합 관리자
 * 각 플랫폼에 최적화된 중복 검사 컬렉션을 자동 선택
 */
class DuplicateCheckManager {
  
  /**
   * 비디오 중복 검사용 모델 (통합)
   * @returns {Object} 비디오 중복 검사 모델
   */
  static getVideoModel() {
    return VideoUrl;  // 모든 플랫폼 통합
  }
  
  /**
   * 비디오 URL 중복 검사 (플랫폼 자동 선택)
   * @param {string} normalizedUrl - 정규화된 URL
   * @param {string} platform - 플랫폼명
   * @returns {Object} 중복 검사 결과
   */
  static async checkVideoDuplicate(normalizedUrl, platform) {
    try {
      const Model = this.getVideoModel();
      const result = await Model.checkDuplicate(normalizedUrl);
      
      // 플랫폼 정보 추가
      if (result.isDuplicate) {
        result.detectedPlatform = platform;
        result.collectionUsed = 'video_duplicate_check';
      }
      
      return result;
    } catch (error) {
      console.error(`비디오 중복 검사 실패 (${platform}):`, error.message);
      return { isDuplicate: false, error: error.message };
    }
  }
  
  /**
   * 비디오 URL 등록 (플랫폼 자동 선택)
   * @param {string} normalizedUrl - 정규화된 URL
   * @param {string} originalUrl - 원본 URL
   * @param {string} platform - 플랫폼명
   * @param {Object} sheetLocation - 시트 위치 정보
   * @param {Date} originalPublishDate - 원본 게시일
   * @param {Object} additionalData - 추가 데이터 (videoId, channelId 등)
   * @returns {Object} 등록 결과
   */
  static async registerVideoUrl(normalizedUrl, originalUrl, platform, sheetLocation, originalPublishDate = null, additionalData = {}) {
    try {
      const Model = this.getVideoModel();
      
      // 통합 등록 (모든 플랫폼)
      return await Model.registerUrl(normalizedUrl, originalUrl, platform, sheetLocation, originalPublishDate);
      
    } catch (error) {
      console.error(`비디오 URL 등록 실패 (${platform}):`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 비디오 URL 상태 업데이트 (플랫폼 자동 선택)
   * @param {string} normalizedUrl - 정규화된 URL
   * @param {string} platform - 플랫폼명
   * @param {string} status - 새로운 상태
   * @param {Object} sheetLocation - 시트 위치 정보
   * @param {Date} originalPublishDate - 원본 게시일
   * @returns {Object} 업데이트 결과
   */
  static async updateVideoStatus(normalizedUrl, platform, status, sheetLocation = null, originalPublishDate = null) {
    try {
      const Model = this.getVideoModel();
      return await Model.updateStatus(normalizedUrl, status, sheetLocation, originalPublishDate);
    } catch (error) {
      console.error(`비디오 상태 업데이트 실패 (${platform}):`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 채널 중복 검사
   * @param {string} normalizedChannelId - 정규화된 채널 ID
   * @returns {Object} 중복 검사 결과
   */
  static async checkChannelDuplicate(normalizedChannelId) {
    try {
      return await ChannelUrl.checkDuplicate(normalizedChannelId);
    } catch (error) {
      console.error('채널 중복 검사 실패:', error.message);
      return { isDuplicate: false, error: error.message };
    }
  }
  
  /**
   * 채널 등록
   * @param {string} normalizedChannelId - 정규화된 채널 ID
   * @param {string} originalChannelIdentifier - 원본 채널 식별자
   * @param {string} platform - 플랫폼명
   * @param {Object} channelInfo - 채널 정보
   * @param {Object} analysisJob - 분석 작업 정보
   * @returns {Object} 등록 결과
   */
  static async registerChannel(normalizedChannelId, originalChannelIdentifier, platform, channelInfo = {}, analysisJob = {}) {
    try {
      return await ChannelUrl.registerChannel(normalizedChannelId, originalChannelIdentifier, platform, channelInfo, analysisJob);
    } catch (error) {
      console.error('채널 등록 실패:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 채널 상태 업데이트
   * @param {string} normalizedChannelId - 정규화된 채널 ID
   * @param {string} status - 새로운 상태
   * @param {Object} channelInfo - 채널 정보
   * @returns {Object} 업데이트 결과
   */
  static async updateChannelStatus(normalizedChannelId, status, channelInfo = null) {
    try {
      return await ChannelUrl.updateStatus(normalizedChannelId, status, channelInfo);
    } catch (error) {
      console.error('채널 상태 업데이트 실패:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 전체 통계 조회 (모든 플랫폼 종합)
   * @returns {Object} 종합 통계
   */
  static async getComprehensiveStats() {
    try {
      const [videoStats, channelStats] = await Promise.all([
        VideoUrl.getStats(),    // 모든 비디오 통합
        ChannelUrl.getStats()   // 채널
      ]);
      
      return {
        videos: videoStats,
        channels: channelStats,
        summary: {
          totalVideos: videoStats.total || 0,
          totalChannels: channelStats.total || 0,
          lastUpdated: new Date()
        }
      };
      
    } catch (error) {
      console.error('종합 통계 조회 실패:', error.message);
      return { error: error.message };
    }
  }
  
  /**
   * 오래된 processing 레코드 정리 (모든 컬렉션)
   * @returns {Object} 정리 결과
   */
  static async cleanupAllStaleProcessing() {
    try {
      const [videoResult, channelResult] = await Promise.all([
        VideoUrl.cleanupStaleProcessing(),
        ChannelUrl.cleanupStaleProcessing()
      ]);
      
      const totalDeleted = (videoResult.deletedCount || 0) + (channelResult.deletedCount || 0);
      
      if (totalDeleted > 0) {
        console.log(`🧹 전체 오래된 processing 레코드 정리: ${totalDeleted}개`);
      }
      
      return {
        success: true,
        videos: videoResult.deletedCount || 0,
        channels: channelResult.deletedCount || 0,
        total: totalDeleted
      };
      
    } catch (error) {
      console.error('전체 processing 레코드 정리 실패:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = DuplicateCheckManager;