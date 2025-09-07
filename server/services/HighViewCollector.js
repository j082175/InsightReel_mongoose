const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const UsageTracker = require('../utils/usage-tracker');
const fs = require('fs').promises;
const path = require('path');

/**
 * YouTube 채널별 고조회수 영상 수집기
 * 최근 2-3일 내의 조회수 높은 영상들만 효율적으로 수집
 */
class HighViewCollector {
  constructor() {
    this.youtubeApiKey = process.env.GOOGLE_API_KEY;
    this.queueFilePath = path.join(__dirname, '../config/trending_channels_queue.json');
    this.statsFilePath = path.join(__dirname, '../config/trending_collection_stats.json');
    
    // API quota 모니터링 (UsageTracker로 처리)
    this.usageTracker = new UsageTracker();
    
    // 기존 quota 방식도 유지 (호환성)
    this.quotaUsed = 0;
    this.quotaLimit = 9500; // 안전 마진: YouTube API 경고 방지를 위해 실제 10,000에서 500 차감
    this.resetQuotaDaily();
    
    // 기본 설정 (사용자가 오버라이드 가능)
    this.defaultConfig = {
      daysBack: 3,           // 기본 3일 (사용자 설정 가능)
      minViews: 30000,       // 기본 3만 조회수 (사용자 설정 가능)
      maxResultsPerSearch: 50,
      batchSize: 50
    };

    ServerLogger.info('📊 HighViewCollector 초기화 완료');
  }

  /**
   * 채널 목록에서 트렌딩 영상 수집 시작
   * @param {Array} channelIds - 채널 ID 배열
   * @param {Object} options - 수집 옵션
   * @param {number} options.daysBack - 며칠 전까지 조회할지
   * @param {number} options.minViews - 최소 조회수
   * @param {string} options.startDate - 시작일 (YYYY-MM-DD)
   * @param {string} options.endDate - 종료일 (YYYY-MM-DD)
   */
  async collectFromChannels(channelIds, options = {}) {
    const config = { ...this.defaultConfig, ...options };
    const startTime = Date.now();
    
    ServerLogger.info(`🚀 채널별 고조회수 영상 수집 시작 - ${channelIds.length}개 채널`);
    
    const results = {
      totalChannels: channelIds.length,
      processedChannels: 0,
      totalVideos: 0,
      trendingVideos: 0,
      quotaUsed: 0,
      errors: []
    };

    // 날짜 범위 설정 - 사용자가 직접 지정 가능
    let startDate, endDate;
    
    if (options.startDate && options.endDate) {
      // 사용자가 날짜 직접 지정
      startDate = new Date(options.startDate);
      endDate = new Date(options.endDate);
      ServerLogger.info(`📅 사용자 지정 기간: ${options.startDate} ~ ${options.endDate}`);
    } else if (options.daysBack) {
      // 며칠 전까지로 지정
      endDate = new Date();
      startDate = new Date(endDate - (config.daysBack * 24 * 60 * 60 * 1000));
      ServerLogger.info(`📅 최근 ${config.daysBack}일: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`);
    } else {
      // 기본값 사용
      endDate = new Date();
      startDate = new Date(endDate - (config.daysBack * 24 * 60 * 60 * 1000));
      ServerLogger.info(`📅 기본 설정 ${config.daysBack}일: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`);
    }
    
    const publishedAfter = startDate.toISOString();
    const publishedBefore = endDate.toISOString();
    
    ServerLogger.info(`⚙️ 설정: 최소 조회수 ${config.minViews.toLocaleString()}회 이상`);

    for (const channelId of channelIds) {
      try {
        // quota 확인
        if (this.quotaUsed >= this.quotaLimit - 100) { // 안전 마진 (이미 9500으로 제한되어 있어 작게 설정)
          ServerLogger.warn(`⚠️ API quota 한계 근접 (${this.quotaUsed}/${this.quotaLimit}) - 수집 중단`);
          break;
        }

        const channelResult = await this.collectChannelTrending(
          channelId, 
          publishedAfter, 
          publishedBefore, 
          config
        );
        
        results.processedChannels++;
        results.totalVideos += channelResult.totalVideos;
        results.trendingVideos += channelResult.trendingVideos;
        results.quotaUsed = this.quotaUsed;

        ServerLogger.info(`✅ ${channelId}: ${channelResult.trendingVideos}/${channelResult.totalVideos}개 고조회수`);

      } catch (error) {
        ServerLogger.error(`❌ ${channelId} 수집 실패:`, error.message);
        results.errors.push({ channelId, error: error.message });
      }

      // 요청 간 딜레이 (API 제한 방지)
      await this.delay(100);
    }

    const totalTime = Date.now() - startTime;
    ServerLogger.info(`🏁 고조회수 영상 수집 완료: ${results.trendingVideos}개 영상 (${(totalTime/1000).toFixed(1)}초)`);
    ServerLogger.info(`📊 API quota 사용: ${results.quotaUsed}/${this.quotaLimit} units`);

    // 통계 저장
    await this.saveStats(results, totalTime);

    return results;
  }

  /**
   * 개별 채널에서 고조회수 영상 수집
   */
  async collectChannelTrending(channelId, publishedAfter, publishedBefore, config) {
    const quotaStart = this.quotaUsed;
    
    // 1단계: 최신 영상 검색
    const searchResults = await this.searchChannelVideos(
      channelId, 
      publishedAfter, 
      publishedBefore, 
      config.maxResultsPerSearch
    );

    if (searchResults.length === 0) {
      return { totalVideos: 0, trendingVideos: 0, videos: [] };
    }

    // 2단계: 영상 상세 정보 배치 조회
    const videosWithStats = await this.getVideoStatsBatch(searchResults);
    
    // 3단계: 조회수 필터링
    const trendingVideos = videosWithStats.filter(video => {
      const viewCount = parseInt(video.statistics?.viewCount || 0);
      return viewCount >= config.minViews;
    });

    const quotaUsed = this.quotaUsed - quotaStart;
    
    ServerLogger.info(`📈 ${channelId}: ${trendingVideos.length}/${videosWithStats.length}개 고조회수 (quota: ${quotaUsed})`);

    return {
      channelId,
      totalVideos: videosWithStats.length,
      trendingVideos: trendingVideos.length,
      videos: trendingVideos,
      quotaUsed
    };
  }

  /**
   * 채널의 최신 영상 검색
   */
  async searchChannelVideos(channelId, publishedAfter, publishedBefore, maxResults) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'id,snippet',
          channelId: channelId,
          publishedAfter: publishedAfter,
          publishedBefore: publishedBefore,
          order: 'date',
          type: 'video',
          maxResults: maxResults,
          key: this.youtubeApiKey
        }
      });

      // quota 추가 (기존 방식 + UsageTracker)
      this.quotaUsed += 100;
      this.usageTracker.trackAPI('youtube-search', true); // 설정 기반 추적
      ServerLogger.info(`🔍 Search API 호출: ${channelId} (quota +100, 총 ${this.quotaUsed})`);

      return response.data.items || [];

    } catch (error) {
      if (error.response?.status === 403) {
        ServerLogger.error('❌ YouTube API quota 초과 또는 권한 오류');
      }
      throw new Error(`Search API 오류: ${error.message}`);
    }
  }

  /**
   * 영상들의 상세 통계 배치 조회
   */
  async getVideoStatsBatch(videoItems) {
    if (videoItems.length === 0) return [];

    const videoIds = videoItems.map(item => item.id.videoId).join(',');
    
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'statistics,snippet,contentDetails',
          id: videoIds,
          key: this.youtubeApiKey
        }
      });

      // quota 추가 (기존 방식 + UsageTracker)
      this.quotaUsed += 1;
      this.usageTracker.trackAPI('youtube-videos', true); // 설정 기반 추적
      ServerLogger.info(`📊 Videos API 호출: ${videoItems.length}개 영상 (quota +1, 총 ${this.quotaUsed})`);

      const videosWithStats = response.data.items || [];
      
      // 조회수 로그 (디버그용)
      videosWithStats.forEach(video => {
        const viewCount = parseInt(video.statistics?.viewCount || 0);
        const title = video.snippet?.title?.substring(0, 30) || 'Untitled';
        ServerLogger.info(`  📹 ${title}... | 조회수: ${viewCount.toLocaleString()}`);
      });

      return videosWithStats;

    } catch (error) {
      if (error.response?.status === 403) {
        ServerLogger.error('❌ YouTube API quota 초과 또는 권한 오류');
      }
      throw new Error(`Videos API 오류: ${error.message}`);
    }
  }

  /**
   * 수집 통계 저장
   */
  async saveStats(results, processingTime) {
    const stats = {
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      ...results,
      processingTimeMs: processingTime,
      processingTimeSeconds: (processingTime / 1000).toFixed(1),
      avgTimePerChannel: results.processedChannels > 0 ? (processingTime / results.processedChannels).toFixed(0) : 0,
      trendingRate: results.totalVideos > 0 ? ((results.trendingVideos / results.totalVideos) * 100).toFixed(1) : 0,
      quotaEfficiency: results.quotaUsed > 0 ? (results.trendingVideos / results.quotaUsed).toFixed(2) : 0
    };

    try {
      // 기존 통계 읽기
      let allStats = [];
      try {
        const existingData = await fs.readFile(this.statsFilePath, 'utf8');
        allStats = JSON.parse(existingData);
      } catch (error) {
        // 파일이 없으면 새로 생성
      }

      // 새 통계 추가 (최근 30개만 유지)
      allStats.push(stats);
      if (allStats.length > 30) {
        allStats = allStats.slice(-30);
      }

      await fs.writeFile(this.statsFilePath, JSON.stringify(allStats, null, 2));
      ServerLogger.info(`💾 수집 통계 저장: ${stats.trendingRate}% 고조회수율, quota 효율성: ${stats.quotaEfficiency}`);

    } catch (error) {
      ServerLogger.error('통계 저장 실패:', error);
    }
  }

  /**
   * Quota 일일 리셋
   */
  resetQuotaDaily() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.quotaUsed = 0;
      ServerLogger.info('🔄 YouTube API quota 리셋 (새로운 날)');
      this.resetQuotaDaily(); // 다음날 리셋 예약
    }, msUntilReset);

    ServerLogger.info(`⏰ Quota 리셋 예정: ${tomorrow.toLocaleString()}`);
  }

  /**
   * 현재 quota 사용 현황
   */
  getQuotaStatus() {
    return {
      used: this.quotaUsed,
      limit: this.quotaLimit,
      remaining: this.quotaLimit - this.quotaUsed,
      usagePercent: ((this.quotaUsed / this.quotaLimit) * 100).toFixed(1)
    };
  }

  /**
   * 수집 통계 조회
   */
  async getStats() {
    try {
      const data = await fs.readFile(this.statsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * 딜레이 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = HighViewCollector;