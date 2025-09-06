const ytdl = require('ytdl-core');
const axios = require('axios');
const { ServerLogger } = require('../utils/logger');

/**
 * 🚀 하이브리드 YouTube 데이터 추출기
 * ytdl-core (기본 데이터) + YouTube Data API (추가 통계) 조합
 * 
 * 전략:
 * 1. ytdl-core: 제목, 설명, 채널정보, 썸네일, 태그, 업로드날짜 등
 * 2. YouTube Data API: 댓글수, 정확한 좋아요수, 구독자수 등
 */
class HybridYouTubeExtractor {
  constructor() {
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    this.useYtdlFirst = process.env.USE_YTDL_FIRST !== 'false'; // 기본값: true
    this.ytdlTimeout = 10000; // 10초 타임아웃
    
    ServerLogger.info('🔧 하이브리드 YouTube 추출기 초기화', {
      hasApiKey: !!this.youtubeApiKey,
      ytdlFirst: this.useYtdlFirst,
      timeout: this.ytdlTimeout
    });
  }

  /**
   * YouTube URL에서 비디오 ID 추출
   */
  extractVideoId(url) {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /^[a-zA-Z0-9_-]{11}$/ // 직접 비디오 ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1] || match[0];
    }
    
    return null;
  }

  /**
   * 🎯 메인 추출 메서드 - 하이브리드 방식
   */
  async extractVideoData(url) {
    const startTime = Date.now();
    
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('유효하지 않은 YouTube URL');
      }

      ServerLogger.info('🔍 하이브리드 데이터 추출 시작', { videoId });

      // 📊 데이터 수집 전략
      const results = {};
      
      // 1단계: ytdl-core로 기본 데이터 추출 (빠르고 상세함)
      try {
        const ytdlData = await this.extractWithYtdl(url);
        results.ytdl = ytdlData;
        ServerLogger.info('✅ ytdl-core 데이터 추출 완료', { 
          title: ytdlData.title?.substring(0, 50) 
        });
      } catch (error) {
        ServerLogger.warn('⚠️ ytdl-core 추출 실패', error.message);
        results.ytdl = null;
      }

      // 2단계: YouTube Data API로 추가 통계 데이터
      try {
        const apiData = await this.extractWithYouTubeAPI(videoId);
        results.api = apiData;
        ServerLogger.info('✅ YouTube Data API 데이터 추출 완료');
      } catch (error) {
        ServerLogger.warn('⚠️ YouTube Data API 추출 실패', error.message);
        results.api = null;
      }

      // 3단계: 데이터 병합 및 최적화
      const mergedData = this.mergeData(results.ytdl, results.api);
      
      const duration = Date.now() - startTime;
      ServerLogger.info('🎉 하이브리드 추출 완료', {
        duration: `${duration}ms`,
        ytdlSuccess: !!results.ytdl,
        apiSuccess: !!results.api,
        title: mergedData.title?.substring(0, 50)
      });

      return {
        success: true,
        data: mergedData,
        sources: {
          ytdl: !!results.ytdl,
          api: !!results.api
        },
        extractionTime: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      ServerLogger.error('❌ 하이브리드 추출 실패', error.message);
      
      return {
        success: false,
        error: error.message,
        extractionTime: duration
      };
    }
  }

  /**
   * 🔧 ytdl-core를 이용한 데이터 추출
   */
  async extractWithYtdl(url) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ytdl-core 타임아웃'));
      }, this.ytdlTimeout);

      try {
        const info = await ytdl.getInfo(url);
        clearTimeout(timeout);
        
        const details = info.videoDetails;
        
        resolve({
          // 기본 정보 (ytdl-core 강점)
          title: details.title,
          description: details.description,
          duration: parseInt(details.lengthSeconds) || 0,
          uploadDate: details.uploadDate,
          
          // 채널 정보 (ytdl-core 강점)
          channelName: details.author?.name,
          channelId: details.author?.id,
          channelUrl: details.author?.channel_url,
          
          // 메타데이터 (ytdl-core 강점)
          category: details.category,
          keywords: details.keywords || [],
          tags: details.keywords || [], // 별칭
          
          // 썸네일 (ytdl-core 강점)
          thumbnails: details.thumbnails || [],
          thumbnail: this.getBestThumbnail(details.thumbnails),
          
          // 실시간 통계 (ytdl-core 장점)
          viewCount: parseInt(details.viewCount) || 0,
          
          // 스트림 정보
          isLiveContent: details.isLiveContent || false,
          isLive: details.isLive || false,
          
          // 소스 표시
          source: 'ytdl-core'
        });
        
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * 📊 YouTube Data API를 이용한 추가 데이터 추출
   */
  async extractWithYouTubeAPI(videoId) {
    if (!this.youtubeApiKey) {
      throw new Error('YouTube API 키가 없습니다');
    }

    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'statistics,snippet,contentDetails',
          id: videoId,
          key: this.youtubeApiKey
        },
        timeout: 8000
      }
    );

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('비디오를 찾을 수 없습니다');
    }

    const item = response.data.items[0];
    const snippet = item.snippet;
    const statistics = item.statistics;
    
    return {
      // API 전용 통계 (API 강점)
      likeCount: parseInt(statistics.likeCount) || 0,
      commentCount: parseInt(statistics.commentCount) || 0,
      
      // API 메타데이터 (API 강점)
      publishedAt: snippet.publishedAt,
      categoryId: snippet.categoryId,
      
      // 채널 추가 정보 (API 강점) 
      channelTitle: snippet.channelTitle,
      
      // 소스 표시
      source: 'youtube-api'
    };
  }

  /**
   * 🔧 최적 썸네일 선택
   */
  getBestThumbnail(thumbnails) {
    if (!thumbnails || thumbnails.length === 0) return null;
    
    // 가장 큰 해상도 선택
    return thumbnails.reduce((best, current) => {
      if (!best) return current;
      const bestSize = (best.width || 0) * (best.height || 0);
      const currentSize = (current.width || 0) * (current.height || 0);
      return currentSize > bestSize ? current : best;
    });
  }

  /**
   * 🚀 데이터 병합 및 우선순위 적용
   */
  mergeData(ytdlData, apiData) {
    // 기본값: 빈 객체
    const merged = {};
    
    // 1단계: ytdl-core 데이터를 기반으로 (더 상세함)
    if (ytdlData) {
      Object.assign(merged, ytdlData);
    }
    
    // 2단계: API 데이터로 보강/덮어쓰기 (더 정확한 통계)
    if (apiData) {
      // API가 더 정확한 데이터들
      if (apiData.likeCount !== undefined) {
        merged.likeCount = apiData.likeCount;
        merged.likes = apiData.likeCount; // 별칭
      }
      
      if (apiData.commentCount !== undefined) {
        merged.commentCount = apiData.commentCount;
        merged.comments_count = apiData.commentCount; // 별칭
      }
      
      if (apiData.publishedAt) {
        merged.publishedAt = apiData.publishedAt;
        merged.originalPublishDate = new Date(apiData.publishedAt);
      }
      
      if (apiData.categoryId) {
        merged.youtubeCategoryId = apiData.categoryId;
      }
      
      // 채널명 일치 확인
      if (apiData.channelTitle && !merged.channelName) {
        merged.channelName = apiData.channelTitle;
      }
    }
    
    // 3단계: 데이터 소스 추적
    merged.dataSources = {
      primary: ytdlData ? 'ytdl-core' : 'youtube-api',
      ytdl: !!ytdlData,
      api: !!apiData,
      hybrid: !!(ytdlData && apiData)
    };
    
    // 4단계: 필수 필드 보장
    merged.platform = 'youtube';
    merged.url = merged.url || `https://youtube.com/watch?v=${this.extractVideoId(merged.url)}`;
    
    return merged;
  }

  /**
   * 📊 추출기 상태 및 통계
   */
  getStatus() {
    return {
      available: {
        ytdl: true,
        api: !!this.youtubeApiKey
      },
      config: {
        ytdlFirst: this.useYtdlFirst,
        timeout: this.ytdlTimeout
      },
      capabilities: {
        basicInfo: true,
        statistics: !!this.youtubeApiKey,
        realTimeViews: true,
        thumbnails: true,
        batchProcessing: !!this.youtubeApiKey
      }
    };
  }
}

module.exports = HybridYouTubeExtractor;