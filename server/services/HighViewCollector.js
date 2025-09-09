const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const UsageTracker = require('../utils/usage-tracker');
const MultiKeyManager = require('../utils/multi-key-manager');
const fs = require('fs').promises;
const path = require('path');

/**
 * YouTube 채널별 고조회수 영상 수집기
 * 최근 2-3일 내의 조회수 높은 영상들만 효율적으로 수집
 */
class HighViewCollector {
  constructor() {
    this.queueFilePath = path.join(__dirname, '../config/trending_channels_queue.json');
    this.statsFilePath = path.join(__dirname, '../config/trending_collection_stats.json');
    
    // 멀티 키 관리자 초기화
    this.multiKeyManager = MultiKeyManager.getInstance();
    
    // 호환성을 위한 UsageTracker (제거 예정)
    this.usageTracker = UsageTracker.getInstance();
    
    // 기본 설정 (사용자가 오버라이드 가능)
    this.defaultConfig = {
      daysBack: 3,           // 기본 3일 (사용자 설정 가능)
      minViews: 30000,       // 기본 3만 조회수 (사용자 설정 가능)
      maxResultsPerSearch: 50,
      batchSize: 50
    };

    ServerLogger.info(`📊 HighViewCollector 초기화 완료 - ${this.multiKeyManager.keys.length}개 API 키 로드됨`);
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
        // 사용 가능한 API 키 확인
        try {
          const availableKey = this.multiKeyManager.getAvailableKey();
          if (!availableKey) {
            throw new Error('모든 API 키 할당량 소진');
          }
        } catch (error) {
          ServerLogger.warn(`⚠️ ${error.message} - 수집 중단`);
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
        results.quotaUsed = channelResult.quotaUsed;

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
    ServerLogger.info(`📊 API quota 사용: ${results.quotaUsed} units`);
    
    // 멀티키 매니저 사용량 현황 로그
    this.multiKeyManager.logUsageStatus();

    // 통계 저장
    await this.saveStats(results, totalTime);

    return results;
  }

  /**
   * 개별 채널에서 고조회수 영상 수집
   */
  async collectChannelTrending(channelId, publishedAfter, publishedBefore, config) {
    let totalQuotaUsed = 0;
    
    // 1단계: 최신 영상 검색
    const { results: searchResults, quotaUsed: searchQuota } = await this.searchChannelVideos(
      channelId, 
      publishedAfter, 
      publishedBefore, 
      config.maxResultsPerSearch
    );
    totalQuotaUsed += searchQuota;

    if (searchResults.length === 0) {
      return { totalVideos: 0, trendingVideos: 0, videos: [] };
    }

    // 2단계: 영상 상세 정보 배치 조회
    const { videos: videosWithStats, quotaUsed: videosQuota } = await this.getVideoStatsBatch(searchResults);
    totalQuotaUsed += videosQuota;
    
    // 3단계: 조회수 필터링
    const trendingVideos = videosWithStats.filter(video => {
      const viewCount = parseInt(video.statistics?.viewCount || 0);
      return viewCount >= config.minViews;
    });

    ServerLogger.info(`📈 ${channelId}: ${trendingVideos.length}/${videosWithStats.length}개 고조회수 (quota: ${totalQuotaUsed})`);

    return {
      channelId,
      totalVideos: videosWithStats.length,
      trendingVideos: trendingVideos.length,
      videos: trendingVideos,
      quotaUsed: totalQuotaUsed
    };
  }

  /**
   * 채널의 최신 영상 검색
   */
  async searchChannelVideos(channelId, publishedAfter, publishedBefore, maxResults) {
    let attempts = 0;
    const maxAttempts = this.multiKeyManager.keys.length;
    
    while (attempts < maxAttempts) {
      try {
        const availableKey = this.multiKeyManager.getAvailableKey();
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'id,snippet',
            channelId: channelId,
            publishedAfter: publishedAfter,
            publishedBefore: publishedBefore,
            order: 'date',
            type: 'video',
            maxResults: maxResults,
            key: availableKey.key
          }
        });

        // 성공시 사용량 추적
        this.multiKeyManager.trackAPI(availableKey.key, 'youtube-search', true);
        ServerLogger.info(`🔍 Search API 호출 성공: ${channelId} (키: ${availableKey.name})`);

        return {
          results: response.data.items || [],
          quotaUsed: 100
        };

      } catch (error) {
        attempts++;
        
        if (error.response?.status === 403) {
          // Quota 초과 - 현재 키를 실패로 마킹하고 다음 키 시도
          const availableKey = this.multiKeyManager.getAvailableKey();
          this.multiKeyManager.trackAPI(availableKey.key, 'youtube-search', false);
          ServerLogger.warn(`⚠️ API Key ${availableKey.name} quota 초과 - 다음 키로 전환 시도 (${attempts}/${maxAttempts})`);
          continue;
        } else {
          // 다른 에러는 즉시 실패
          throw new Error(`Search API 오류: ${error.message}`);
        }
      }
    }
    
    // 모든 키 시도 후 실패
    throw new Error('🚨 모든 YouTube API 키의 할당량이 소진되었습니다');
  }

  /**
   * 영상들의 상세 통계 배치 조회
   */
  async getVideoStatsBatch(videoItems) {
    if (videoItems.length === 0) return { videos: [], quotaUsed: 0 };

    const videoIds = videoItems.map(item => item.id.videoId).join(',');
    let attempts = 0;
    const maxAttempts = this.multiKeyManager.keys.length;
    
    while (attempts < maxAttempts) {
      try {
        const availableKey = this.multiKeyManager.getAvailableKey();
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'statistics,snippet,contentDetails',
            id: videoIds,
            key: availableKey.key
          }
        });

        // 성공시 사용량 추적
        this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', true);
        ServerLogger.info(`📊 Videos API 호출 성공: ${videoItems.length}개 영상 (키: ${availableKey.name})`);

        const videosWithStats = response.data.items || [];
        
        // 조회수 로그 (디버그용)
        videosWithStats.forEach(video => {
          const viewCount = parseInt(video.statistics?.viewCount || 0);
          const title = video.snippet?.title?.substring(0, 30) || 'Untitled';
          ServerLogger.info(`  📹 ${title}... | 조회수: ${viewCount.toLocaleString()}`);
        });

        return {
          videos: videosWithStats,
          quotaUsed: 1
        };

      } catch (error) {
        attempts++;
        
        if (error.response?.status === 403) {
          // Quota 초과 - 현재 키를 실패로 마킹하고 다음 키 시도
          const availableKey = this.multiKeyManager.getAvailableKey();
          this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', false);
          ServerLogger.warn(`⚠️ API Key ${availableKey.name} quota 초과 - 다음 키로 전환 시도 (${attempts}/${maxAttempts})`);
          continue;
        } else {
          // 다른 에러는 즉시 실패
          throw new Error(`Videos API 오류: ${error.message}`);
        }
      }
    }
    
    // 모든 키 시도 후 실패
    throw new Error('🚨 모든 YouTube API 키의 할당량이 소진되었습니다');
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
   * Quota 일일 리셋 (호환성을 위해 유지)
   * 실제 quota 관리는 MultiKeyManager가 담당
   */
  resetQuotaDaily() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    ServerLogger.info(`⏰ Quota는 MultiKeyManager가 관리 중 - 다음 리셋: ${tomorrow.toLocaleString()}`);
  }

  /**
   * 현재 quota 사용 현황 (MultiKeyManager 기반)
   */
  getQuotaStatus() {
    const allStatus = this.multiKeyManager.getAllUsageStatus();
    let totalUsed = 0;
    let totalLimit = 0;
    
    allStatus.forEach(status => {
      const usage = status.usage.split('/');
      totalUsed += parseInt(usage[0]);
      totalLimit += parseInt(usage[1]);
    });
    
    return {
      used: totalUsed,
      limit: totalLimit,
      remaining: totalLimit - totalUsed,
      usagePercent: totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : 0,
      keyCount: allStatus.length,
      allKeys: allStatus
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