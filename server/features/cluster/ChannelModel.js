const fs = require('fs').promises;
const path = require('path');
const { ServerLogger } = require('../../utils/logger');
const YouTubeChannelService = require('../../services/YouTubeChannelService');
const YouTubeChannelAnalyzer = require('../../services/YouTubeChannelAnalyzer');

/**
 * 📊 채널 모델
 * 채널 데이터를 JSON 파일로 관리 (MongoDB 대신 간단한 파일 기반)
 */
class ChannelModel {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data');
    this.channelsFile = path.join(this.dataPath, 'channels.json');
    this.channels = new Map();
    this.youtubeService = new YouTubeChannelService();
    this.youtubeAnalyzer = new YouTubeChannelAnalyzer();
    
    this.initialize();
  }

  /**
   * 🚀 초기화
   */
  async initialize() {
    try {
      // 데이터 폴더 생성
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // 기존 데이터 로드
      await this.loadChannels();
      
      ServerLogger.success('✅ ChannelModel 초기화 완료', {
        channelCount: this.channels.size
      });
    } catch (error) {
      ServerLogger.error('❌ ChannelModel 초기화 실패', error);
      throw error;
    }
  }

  /**
   * 📚 채널 데이터 로드
   */
  async loadChannels() {
    try {
      const data = await fs.readFile(this.channelsFile, 'utf8');
      const channelsArray = JSON.parse(data);
      
      channelsArray.forEach(channel => {
        this.channels.set(channel.id, channel);
      });
      
      ServerLogger.info('📚 채널 데이터 로드 완료', {
        count: this.channels.size
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 파일이 없으면 빈 배열로 시작
        ServerLogger.info('📝 새로운 채널 데이터 파일 생성');
        await this.saveChannels();
      } else {
        throw error;
      }
    }
  }

  /**
   * 💾 채널 데이터 저장
   */
  async saveChannels() {
    try {
      const channelsArray = Array.from(this.channels.values());
      await fs.writeFile(
        this.channelsFile, 
        JSON.stringify(channelsArray, null, 2), 
        'utf8'
      );
      
      ServerLogger.debug('💾 채널 데이터 저장 완료', {
        count: channelsArray.length
      });
    } catch (error) {
      ServerLogger.error('❌ 채널 데이터 저장 실패', error);
      throw error;
    }
  }

  /**
   * 📊 YouTube API에서 채널 상세 분석 후 생성/업데이트
   */
  async createOrUpdateWithAnalysis(channelIdentifier, userKeywords = [], includeAnalysis = true) {
    try {
      ServerLogger.info(`🔍 YouTube 채널 상세 분석: ${channelIdentifier}`);
      
      // 1. 기본 채널 정보 가져오기
      const youtubeData = await this.youtubeService.getChannelInfo(channelIdentifier);
      
      if (!youtubeData) {
        throw new Error(`YouTube에서 채널을 찾을 수 없음: ${channelIdentifier}`);
      }
      
      let analysisData = null;
      
      // 2. 상세 분석 수행 (선택적)
      if (includeAnalysis) {
        try {
          // 향상된 분석 수행 (숏폼 채널의 경우 콘텐츠 분석 포함)
          const analysisResult = await this.youtubeAnalyzer.analyzeChannelEnhanced(
            youtubeData.id, 
            200, 
            true // 콘텐츠 분석 활성화
          );
          analysisData = analysisResult.analysis;
          
          // 향상된 분석 데이터가 있으면 추가
          if (analysisResult.enhancedAnalysis) {
            analysisData.enhancedAnalysis = analysisResult.enhancedAnalysis;
            ServerLogger.success(`🎬 향상된 채널 분석 완료: ${analysisResult.videosCount}개 영상 + AI 콘텐츠 분석`);
          } else {
            ServerLogger.success(`📊 채널 분석 완료: ${analysisResult.videosCount}개 영상 분석`);
          }
        } catch (analysisError) {
          ServerLogger.warn(`⚠️ 채널 분석 실패, 기본 정보만 저장: ${analysisError.message}`);
        }
      }
      
      // 3. 채널 데이터 구성
      const channelData = {
        id: youtubeData.id,
        name: youtubeData.name,
        url: youtubeData.url,
        platform: 'youtube',
        
        // YouTube API 기본 정보
        subscribers: youtubeData.subscribers,
        description: youtubeData.description,
        thumbnailUrl: youtubeData.thumbnailUrl,
        customUrl: youtubeData.customUrl,
        
        // 상세 분석 정보 (요청한 6가지 + α)
        ...(analysisData && {
          // 1. 채널 설명 (이미 description에 포함)
          
          // 2. 일평균 업로드
          dailyUploadRate: analysisData.dailyUploadRate,
          
          // 3. 최근 7일 조회수
          last7DaysViews: analysisData.last7DaysViews,
          
          // 4. 영상 평균시간
          avgDurationSeconds: analysisData.avgDurationSeconds,
          avgDurationFormatted: analysisData.avgDurationFormatted,
          
          // 5. 숏폼 비율
          shortFormRatio: analysisData.shortFormRatio,
          
          // 6. 채널 일별 조회수 (기간별)
          viewsByPeriod: analysisData.viewsByPeriod,
          
          // 추가 통계
          totalVideos: analysisData.totalVideos,
          totalViews: analysisData.totalViews,
          averageViewsPerVideo: analysisData.averageViewsPerVideo,
          uploadFrequency: analysisData.uploadFrequency,
          mostViewedVideo: analysisData.mostViewedVideo,
          
          // 분석 메타데이터
          lastAnalyzedAt: new Date(),
          analysisVersion: '1.0'
        }),
        
        // 사용자 입력 정보
        keywords: Array.isArray(userKeywords) ? userKeywords : [],
        
        // AI 태그 (향상된 분석에서 추출)
        aiTags: analysisData?.enhancedAnalysis?.channelIdentity?.channelTags || [],
        allTags: [
          ...(userKeywords || []),
          ...(analysisData?.enhancedAnalysis?.channelIdentity?.channelTags || [])
        ].filter((tag, index, arr) => arr.indexOf(tag) === index), // 중복 제거
        clusterIds: [],
        suggestedClusters: [],
        contentType: analysisData?.shortFormRatio > 70 ? 'shortform' : 
                     analysisData?.shortFormRatio < 30 ? 'longform' : 'mixed'
      };
      
      // 기존 createOrUpdate 메서드 호출
      return await this.createOrUpdate(channelData);
      
    } catch (error) {
      ServerLogger.error(`❌ YouTube 채널 상세 분석 실패: ${channelIdentifier}`, error);
      throw error;
    }
  }

  /**
   * 🔍 YouTube API에서 채널 정보 가져와서 생성/업데이트 (기본 정보만)
   */
  async createOrUpdateFromYouTube(channelIdentifier, userKeywords = []) {
    try {
      ServerLogger.info(`🔍 YouTube에서 채널 정보 수집: ${channelIdentifier}`);
      
      // YouTube API에서 채널 정보 가져오기
      const youtubeData = await this.youtubeService.getChannelInfo(channelIdentifier);
      
      if (!youtubeData) {
        throw new Error(`YouTube에서 채널을 찾을 수 없음: ${channelIdentifier}`);
      }
      
      // 채널 데이터 구성
      const channelData = {
        id: youtubeData.id,
        name: youtubeData.name,
        url: youtubeData.url,
        platform: 'youtube',
        
        // YouTube API에서 가져온 정보
        subscribers: youtubeData.subscribers,
        description: youtubeData.description,
        thumbnailUrl: youtubeData.thumbnailUrl,
        customUrl: youtubeData.customUrl,
        
        // 사용자 입력 키워드
        keywords: Array.isArray(userKeywords) ? userKeywords : [],
        
        // 기본값들
        aiTags: [],
        allTags: userKeywords || [],
        clusterIds: [],
        suggestedClusters: [],
        contentType: 'mixed'
      };
      
      // 기존 createOrUpdate 메서드 호출
      return await this.createOrUpdate(channelData);
      
    } catch (error) {
      ServerLogger.error(`❌ YouTube 채널 정보 수집 실패: ${channelIdentifier}`, error);
      throw error;
    }
  }

  /**
   * 🆕 채널 생성 또는 업데이트
   */
  async createOrUpdate(channelData) {
    try {
      const channel = {
        id: channelData.id,
        name: channelData.name,
        url: channelData.url,
        platform: channelData.platform || 'youtube',
        
        // 기본 정보
        subscribers: channelData.subscribers || 0,
        description: channelData.description || '',
        thumbnailUrl: channelData.thumbnailUrl || '',
        customUrl: channelData.customUrl || '',
        
        // 콘텐츠 타입 정보
        contentType: channelData.contentType || 'mixed',  // longform, shortform, mixed
        
        // 태그 정보
        keywords: channelData.keywords || [],        // 사용자 입력 키워드
        aiTags: channelData.aiTags || [],           // AI 추출 태그
        allTags: channelData.allTags || [],         // 통합 태그
        
        // 클러스터 정보
        clusterIds: channelData.clusterIds || [],
        suggestedClusters: channelData.suggestedClusters || [],
        
        // 상세 분석 정보 (있는 경우에만 포함)
        ...(channelData.dailyUploadRate !== undefined && {
          // 2. 일평균 업로드
          dailyUploadRate: channelData.dailyUploadRate,
          
          // 3. 최근 7일 조회수
          last7DaysViews: channelData.last7DaysViews,
          
          // 4. 영상 평균시간
          avgDurationSeconds: channelData.avgDurationSeconds,
          avgDurationFormatted: channelData.avgDurationFormatted,
          
          // 5. 숏폼 비율
          shortFormRatio: channelData.shortFormRatio,
          
          // 6. 채널 일별 조회수 (기간별)
          viewsByPeriod: channelData.viewsByPeriod,
          
          // 추가 통계
          totalVideos: channelData.totalVideos,
          totalViews: channelData.totalViews,
          averageViewsPerVideo: channelData.averageViewsPerVideo,
          uploadFrequency: channelData.uploadFrequency,
          mostViewedVideo: channelData.mostViewedVideo,
          
          // 분석 메타데이터
          lastAnalyzedAt: channelData.lastAnalyzedAt,
          analysisVersion: channelData.analysisVersion
        }),
        
        // 향상된 분석 정보 (AI 콘텐츠 분석 결과)
        ...(channelData.enhancedAnalysis && {
          enhancedAnalysis: channelData.enhancedAnalysis
        }),
        
        // 메타데이터
        collectedAt: channelData.collectedAt || new Date(),
        updatedAt: new Date(),
        version: 1
      };

      // 기존 채널 업데이트인지 확인
      if (this.channels.has(channel.id)) {
        const existing = this.channels.get(channel.id);
        channel.version = existing.version + 1;
        channel.collectedAt = existing.collectedAt; // 최초 수집일 유지
        
        ServerLogger.info('🔄 채널 정보 업데이트', { 
          id: channel.id, 
          name: channel.name 
        });
      } else {
        ServerLogger.info('🆕 새 채널 추가', { 
          id: channel.id, 
          name: channel.name 
        });
      }

      this.channels.set(channel.id, channel);
      await this.saveChannels();

      return channel;

    } catch (error) {
      ServerLogger.error('❌ 채널 저장 실패', error);
      throw error;
    }
  }

  /**
   * 🔍 채널 조회
   */
  async findById(channelId) {
    return this.channels.get(channelId) || null;
  }

  /**
   * 🔍 채널 검색 (이름으로)
   */
  async findByName(name) {
    const results = [];
    for (const channel of this.channels.values()) {
      if (channel.name.toLowerCase().includes(name.toLowerCase())) {
        results.push(channel);
      }
    }
    return results;
  }

  /**
   * 🏷️ 태그로 검색
   */
  async findByTag(tag) {
    const results = [];
    for (const channel of this.channels.values()) {
      if (channel.allTags.some(t => t.toLowerCase().includes(tag.toLowerCase()))) {
        results.push(channel);
      }
    }
    return results;
  }

  /**
   * 📊 전체 채널 조회
   */
  async getAll() {
    return Array.from(this.channels.values());
  }

  /**
   * 📈 최근 채널 조회
   */
  async getRecent(limit = 20) {
    const channels = Array.from(this.channels.values());
    return channels
      .sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt))
      .slice(0, limit);
  }

  /**
   * 🔍 클러스터되지 않은 채널 조회
   */
  async getUnclustered() {
    const channels = Array.from(this.channels.values());
    return channels.filter(channel => 
      !channel.clusterIds || channel.clusterIds.length === 0
    );
  }

  /**
   * 📊 전체 채널 수
   */
  async getTotalCount() {
    return this.channels.size;
  }

  /**
   * 📊 클러스터되지 않은 채널 수
   */
  async getUnclusteredCount() {
    const unclustered = await this.getUnclustered();
    return unclustered.length;
  }

  /**
   * 🏷️ 키워드 통계
   */
  async getKeywordStatistics() {
    const keywordFreq = new Map();
    
    for (const channel of this.channels.values()) {
      channel.keywords.forEach(keyword => {
        keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
      });
    }

    return Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // 상위 20개
      .map(([keyword, count]) => ({ keyword, count }));
  }

  /**
   * 🗑️ 채널 삭제
   */
  async delete(channelId) {
    if (this.channels.has(channelId)) {
      const channel = this.channels.get(channelId);
      this.channels.delete(channelId);
      await this.saveChannels();
      
      ServerLogger.info('🗑️ 채널 삭제 완료', { 
        id: channelId, 
        name: channel.name 
      });
      
      return true;
    }
    return false;
  }

  /**
   * 🔄 채널에 클러스터 할당
   */
  async assignToCluster(channelId, clusterId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
    }

    if (!channel.clusterIds.includes(clusterId)) {
      channel.clusterIds.push(clusterId);
      channel.updatedAt = new Date();
      await this.saveChannels();
      
      ServerLogger.info('🔗 채널-클러스터 연결', { 
        channelId, 
        clusterId 
      });
    }

    return channel;
  }

  /**
   * ✂️ 클러스터에서 제거
   */
  async removeFromCluster(channelId, clusterId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
    }

    channel.clusterIds = channel.clusterIds.filter(id => id !== clusterId);
    channel.updatedAt = new Date();
    await this.saveChannels();

    ServerLogger.info('✂️ 채널-클러스터 연결 해제', { 
      channelId, 
      clusterId 
    });

    return channel;
  }

  /**
   * 📊 플랫폼별 통계
   */
  async getPlatformStatistics() {
    const stats = new Map();
    
    for (const channel of this.channels.values()) {
      const platform = channel.platform;
      if (!stats.has(platform)) {
        stats.set(platform, {
          count: 0,
          totalSubscribers: 0,
          avgSubscribers: 0
        });
      }
      
      const platformStats = stats.get(platform);
      platformStats.count++;
      platformStats.totalSubscribers += channel.subscribers;
      platformStats.avgSubscribers = Math.round(
        platformStats.totalSubscribers / platformStats.count
      );
    }

    return Object.fromEntries(stats);
  }

  /**
   * 🔍 고급 검색
   */
  async search(filters = {}) {
    let results = Array.from(this.channels.values());

    // 플랫폼 필터
    if (filters.platform) {
      results = results.filter(ch => ch.platform === filters.platform);
    }

    // 구독자 수 범위 필터
    if (filters.minSubscribers) {
      results = results.filter(ch => ch.subscribers >= filters.minSubscribers);
    }
    if (filters.maxSubscribers) {
      results = results.filter(ch => ch.subscribers <= filters.maxSubscribers);
    }

    // 태그 필터
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(ch => 
        filters.tags.some(tag => 
          ch.allTags.some(chTag => 
            chTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // 클러스터 상태 필터
    if (filters.clustered === true) {
      results = results.filter(ch => ch.clusterIds.length > 0);
    } else if (filters.clustered === false) {
      results = results.filter(ch => ch.clusterIds.length === 0);
    }

    // 정렬
    if (filters.sortBy) {
      results.sort((a, b) => {
        switch (filters.sortBy) {
          case 'subscribers':
            return b.subscribers - a.subscribers;
          case 'name':
            return a.name.localeCompare(b.name);
          case 'collectedAt':
            return new Date(b.collectedAt) - new Date(a.collectedAt);
          default:
            return 0;
        }
      });
    }

    // 제한
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 🔧 빈 정보가 있는 채널들을 YouTube API에서 채우기
   */
  async fillMissingChannelInfo() {
    try {
      ServerLogger.info('🔧 빈 채널 정보 채우기 시작...');
      
      const channelsToUpdate = [];
      
      // 빈 정보가 있는 채널들 찾기
      for (const [id, channel] of this.channels) {
        const needsUpdate = (
          !channel.description || 
          !channel.thumbnailUrl || 
          !channel.subscribers ||
          channel.subscribers === 0
        );
        
        if (needsUpdate && channel.platform === 'youtube') {
          channelsToUpdate.push({
            id,
            name: channel.name,
            keywords: channel.keywords || []
          });
        }
      }
      
      if (channelsToUpdate.length === 0) {
        ServerLogger.info('✅ 모든 채널 정보가 완전합니다.');
        return { updated: 0, failed: 0 };
      }
      
      ServerLogger.info(`🔧 업데이트할 채널: ${channelsToUpdate.length}개`);
      
      let updated = 0;
      let failed = 0;
      
      // 각 채널을 개별적으로 업데이트
      for (const channelInfo of channelsToUpdate) {
        try {
          ServerLogger.info(`🔄 채널 업데이트 중: ${channelInfo.name}`);
          
          // YouTube API에서 정보 가져와서 업데이트
          await this.createOrUpdateFromYouTube(channelInfo.name, channelInfo.keywords);
          updated++;
          
          // API 호출 간격 (Rate Limit 방지)
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          ServerLogger.error(`❌ 채널 업데이트 실패: ${channelInfo.name}`, error);
          failed++;
        }
      }
      
      ServerLogger.success(`✅ 빈 채널 정보 채우기 완료: 성공 ${updated}개, 실패 ${failed}개`);
      
      return { updated, failed };
      
    } catch (error) {
      ServerLogger.error('❌ 빈 채널 정보 채우기 실패', error);
      throw error;
    }
  }

  /**
   * 📊 채널 정보 완성도 확인
   */
  getChannelCompletionStats() {
    const stats = {
      total: this.channels.size,
      complete: 0,
      incomplete: 0,
      missingFields: {
        description: 0,
        thumbnailUrl: 0,
        subscribers: 0,
        customUrl: 0
      }
    };
    
    for (const [id, channel] of this.channels) {
      const missing = [];
      
      if (!channel.description) {
        missing.push('description');
        stats.missingFields.description++;
      }
      if (!channel.thumbnailUrl) {
        missing.push('thumbnailUrl');
        stats.missingFields.thumbnailUrl++;
      }
      if (!channel.subscribers || channel.subscribers === 0) {
        missing.push('subscribers');
        stats.missingFields.subscribers++;
      }
      if (!channel.customUrl) {
        missing.push('customUrl');
        stats.missingFields.customUrl++;
      }
      
      if (missing.length === 0) {
        stats.complete++;
      } else {
        stats.incomplete++;
      }
    }
    
    return stats;
  }
}

// 싱글톤 패턴
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new ChannelModel();
    }
    return instance;
  },
  
  // 정적 메서드들 (편의성)
  createOrUpdate: async (data) => {
    const model = module.exports.getInstance();
    return await model.createOrUpdate(data);
  },
  
  findById: async (id) => {
    const model = module.exports.getInstance();
    return await model.findById(id);
  },
  
  getAll: async () => {
    const model = module.exports.getInstance();
    return await model.getAll();
  },
  
  getRecent: async (limit) => {
    const model = module.exports.getInstance();
    return await model.getRecent(limit);
  },
  
  getUnclustered: async () => {
    const model = module.exports.getInstance();
    return await model.getUnclustered();
  },
  
  getTotalCount: async () => {
    const model = module.exports.getInstance();
    return await model.getTotalCount();
  },
  
  getUnclusteredCount: async () => {
    const model = module.exports.getInstance();
    return await model.getUnclusteredCount();
  },
  
  search: async (filters) => {
    const model = module.exports.getInstance();
    return await model.search(filters);
  },

  // 새로운 메서드들
  createOrUpdateFromYouTube: async (channelIdentifier, userKeywords) => {
    const model = module.exports.getInstance();
    return await model.createOrUpdateFromYouTube(channelIdentifier, userKeywords);
  },

  // 큐를 통한 분석 (비동기)
  queueAnalysis: async (channelIdentifier, userKeywords, options = {}) => {
    const ChannelAnalysisQueueManager = require('../../services/ChannelAnalysisQueue');
    const queue = ChannelAnalysisQueueManager.getInstance();
    return await queue.addJob(channelIdentifier, userKeywords, options);
  },

  fillMissingChannelInfo: async () => {
    const model = module.exports.getInstance();
    return await model.fillMissingChannelInfo();
  },

  getChannelCompletionStats: async () => {
    const model = module.exports.getInstance();
    return await model.getChannelCompletionStats();
  },

  // 새로운 상세 분석 메서드들
  createOrUpdateWithAnalysis: async (channelIdentifier, userKeywords, includeAnalysis) => {
    const model = module.exports.getInstance();
    return await model.createOrUpdateWithAnalysis(channelIdentifier, userKeywords, includeAnalysis);
  }
};