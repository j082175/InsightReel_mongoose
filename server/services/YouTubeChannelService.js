const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const UsageTracker = require('../utils/usage-tracker');
const { FieldMapper } = require('../types/field-mapper');

/**
 * YouTube 채널 정보 수집 서비스
 */
class YouTubeChannelService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_KEY_1 || process.env.GOOGLE_API_KEY;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.usageTracker = UsageTracker.getInstance();
    
    if (!this.apiKey) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }
    
    ServerLogger.success('🔧 YouTube 채널 서비스 초기화 완료');
  }

  /**
   * 채널 ID 또는 사용자명으로 채널 정보 가져오기
   */
  async getChannelInfo(channelIdentifier) {
    try {
      ServerLogger.info(`🔍 YouTube 채널 정보 검색: ${channelIdentifier}`);
      
      let channelData = null;
      
      // 1. 채널 ID로 시도 (@로 시작하거나 UC로 시작)
      if (channelIdentifier.startsWith('@') || channelIdentifier.startsWith('UC') || channelIdentifier.length === 24) {
        channelData = await this.getChannelById(channelIdentifier);
      }
      
      // 2. 채널 ID로 실패하면 검색으로 시도
      if (!channelData) {
        channelData = await this.searchChannelByName(channelIdentifier);
      }
      
      if (channelData) {
        ServerLogger.success(`✅ 채널 정보 수집 성공: ${channelData[FieldMapper.get('CHANNEL_NAME')]}`);
        return channelData;
      } else {
        ServerLogger.warn(`⚠️ 채널을 찾을 수 없음: ${channelIdentifier}`);
        return null;
      }
      
    } catch (error) {
      ServerLogger.error(`❌ 채널 정보 수집 실패: ${channelIdentifier}`, error);
      // 사용량 추적 (실패)
      this.usageTracker.increment('youtube-channels', false);
      throw error;
    }
  }

  /**
   * 채널 ID로 직접 정보 가져오기
   */
  async getChannelById(channelId) {
    try {
      // @ 기호 제거
      const cleanId = channelId.replace('@', '');
      
      const response = await axios.get(`${this.baseURL}/channels`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics',
          id: cleanId,
          maxResults: 1
        }
      });

      // 사용량 추적 (성공)
      this.usageTracker.increment('youtube-channels', true);

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        return this.formatChannelData(channel);
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 403) {
        ServerLogger.error('❌ YouTube API 할당량 초과 또는 권한 없음');
      }
      throw error;
    }
  }

  /**
   * 채널명으로 검색해서 정보 가져오기
   */
  async searchChannelByName(channelName) {
    try {
      // 1. 먼저 검색 API로 채널 찾기
      const searchResponse = await axios.get(`${this.baseURL}/search`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          q: channelName,
          type: 'channel',
          maxResults: 1
        }
      });

      // 검색 사용량 추적
      this.usageTracker.increment('youtube-search', true);

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        const searchResult = searchResponse.data.items[0];
        const channelId = searchResult.snippet.channelId;
        
        // 2. 채널 ID로 상세 정보 가져오기
        return await this.getChannelById(channelId);
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 403) {
        ServerLogger.error('❌ YouTube API 할당량 초과 또는 권한 없음');
      }
      throw error;
    }
  }

  /**
   * 채널 데이터를 표준 형식으로 변환
   */
  formatChannelData(channelData) {
    const snippet = channelData.snippet || {};
    const statistics = channelData.statistics || {};
    
    // 🚀 FieldMapper 완전 자동화된 채널 데이터 구조
    return {
      [FieldMapper.get('CHANNEL_ID')]: channelData.id,
      [FieldMapper.get('CHANNEL_NAME')]: snippet.title || '',
      [FieldMapper.get('DESCRIPTION')]: snippet.description || '',
      [FieldMapper.get('CUSTOM_URL')]: snippet.customUrl || '',
      [FieldMapper.get('THUMBNAIL_URL')]: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      [FieldMapper.get('SUBSCRIBERS')]: parseInt(statistics.subscriberCount) || 0,
      [FieldMapper.get('CHANNEL_VIDEOS')]: parseInt(statistics.videoCount) || 0,
      [FieldMapper.get('CHANNEL_VIEWS')]: parseInt(statistics.viewCount) || 0,
      [FieldMapper.get('UPLOAD_DATE')]: snippet.publishedAt || null,
      [FieldMapper.get('PLATFORM')]: 'youtube',
      [FieldMapper.get('CHANNEL_URL')]: `https://youtube.com/channel/${channelData.id}`,
      [FieldMapper.get('YOUTUBE_HANDLE_URL')]: snippet.customUrl ? `https://youtube.com/@${snippet.customUrl.replace('@', '')}` : null
    };
  }

  /**
   * 여러 채널 ID를 한 번에 처리 (배치 처리)
   */
  async getMultipleChannels(channelIds) {
    try {
      if (!Array.isArray(channelIds) || channelIds.length === 0) {
        return [];
      }

      ServerLogger.info(`🔍 여러 채널 정보 수집 시작: ${channelIds.length}개`);
      
      // YouTube API는 한 번에 최대 50개까지 처리 가능
      const batchSize = 50;
      const results = [];
      
      for (let i = 0; i < channelIds.length; i += batchSize) {
        const batch = channelIds.slice(i, i + batchSize);
        const cleanIds = batch.map(id => id.replace('@', ''));
        
        const response = await axios.get(`${this.baseURL}/channels`, {
          params: {
            key: this.apiKey,
            part: 'snippet,statistics',
            id: cleanIds.join(','),
            maxResults: batchSize
          }
        });

        // 배치당 1번의 사용량 추적
        this.usageTracker.increment('youtube-channels', true);
        
        if (response.data.items) {
          response.data.items.forEach(channel => {
            results.push(this.formatChannelData(channel));
          });
        }
        
        // API 호출 간격 (Rate Limit 방지)
        if (i + batchSize < channelIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      ServerLogger.success(`✅ 여러 채널 정보 수집 완료: ${results.length}개`);
      return results;
      
    } catch (error) {
      ServerLogger.error('❌ 여러 채널 정보 수집 실패', error);
      throw error;
    }
  }

  /**
   * 할당량 상태 확인
   */
  getQuotaStatus() {
    return this.usageTracker.getYouTubeUsage();
  }
}

module.exports = YouTubeChannelService;