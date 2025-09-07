const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const UsageTracker = require('../utils/usage-tracker');
const AIAnalyzer = require('./AIAnalyzer');

/**
 * YouTube 채널 상세 분석 서비스
 * 채널의 영상 데이터를 분석하여 상세 통계 제공
 */
class YouTubeChannelAnalyzer {
  constructor() {
    this.apiKey = process.env.YOUTUBE_KEY_1 || process.env.GOOGLE_API_KEY;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.usageTracker = new UsageTracker();
    this.aiAnalyzer = new AIAnalyzer();
    
    if (!this.apiKey) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }
    
    ServerLogger.success('🔧 YouTube 채널 분석 서비스 초기화 완료');
  }

  /**
   * 채널의 상세 분석 정보 수집
   */
  async analyzeChannel(channelId, maxVideos = 200) {
    try {
      ServerLogger.info(`📊 채널 상세 분석 시작: ${channelId}`);
      
      // 1. 채널 기본 정보 및 업로드 플레이리스트 ID 가져오기
      const channelInfo = await this.getChannelInfo(channelId);
      if (!channelInfo) {
        throw new Error('채널 정보를 찾을 수 없습니다.');
      }
      
      // 2. 채널의 모든 영상 목록 가져오기
      const videos = await this.getChannelVideos(channelInfo.uploadsPlaylistId, maxVideos);
      
      // 3. 영상들의 상세 정보 가져오기
      const detailedVideos = await this.getVideosDetails(videos);
      
      // 4. 분석 수행
      const analysis = this.performAnalysis(detailedVideos);
      
      ServerLogger.success(`✅ 채널 분석 완료: ${detailedVideos.length}개 영상 분석`);
      
      return {
        channelInfo,
        videosCount: detailedVideos.length,
        analysis,
        videos: detailedVideos
      };
      
    } catch (error) {
      ServerLogger.error(`❌ 채널 분석 실패: ${channelId}`, error);
      throw error;
    }
  }

  /**
   * 채널 기본 정보 및 업로드 플레이리스트 ID 가져오기
   */
  async getChannelInfo(channelId) {
    try {
      const response = await axios.get(`${this.baseURL}/channels`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics,contentDetails',
          id: channelId
        }
      });

      this.usageTracker.increment('youtube-channels', true);

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        return {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
          totalVideos: parseInt(channel.statistics.videoCount) || 0,
          totalViews: parseInt(channel.statistics.viewCount) || 0,
          subscribers: parseInt(channel.statistics.subscriberCount) || 0
        };
      }
      
      return null;
    } catch (error) {
      this.usageTracker.increment('youtube-channels', false);
      throw error;
    }
  }

  /**
   * 채널의 업로드 영상 목록 가져오기 (최대 maxVideos개)
   */
  async getChannelVideos(uploadsPlaylistId, maxVideos = 200) {
    try {
      const videos = [];
      let nextPageToken = null;
      const maxResults = 50; // YouTube API 최대값
      
      while (videos.length < maxVideos) {
        const params = {
          key: this.apiKey,
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(maxResults, maxVideos - videos.length)
        };
        
        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }
        
        const response = await axios.get(`${this.baseURL}/playlistItems`, { params });
        this.usageTracker.increment('youtube-channels', true);
        
        if (response.data.items) {
          response.data.items.forEach(item => {
            videos.push({
              videoId: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              publishedAt: item.snippet.publishedAt,
              thumbnailUrl: item.snippet.thumbnails?.medium?.url || ''
            });
          });
        }
        
        nextPageToken = response.data.nextPageToken;
        if (!nextPageToken) break;
        
        // API 호출 간격
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      ServerLogger.info(`📺 영상 목록 수집 완료: ${videos.length}개`);
      return videos;
      
    } catch (error) {
      this.usageTracker.increment('youtube-channels', false);
      throw error;
    }
  }

  /**
   * 영상들의 상세 정보 가져오기 (조회수, 길이 등)
   */
  async getVideosDetails(videos) {
    try {
      const detailedVideos = [];
      const batchSize = 50; // YouTube API 최대값
      
      for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        const videoIds = batch.map(v => v.videoId).join(',');
        
        const response = await axios.get(`${this.baseURL}/videos`, {
          params: {
            key: this.apiKey,
            part: 'snippet,statistics,contentDetails',
            id: videoIds
          }
        });
        
        this.usageTracker.increment('youtube-channels', true);
        
        if (response.data.items) {
          response.data.items.forEach(video => {
            const originalVideo = batch.find(v => v.videoId === video.id);
            if (originalVideo) {
              detailedVideos.push({
                ...originalVideo,
                viewCount: parseInt(video.statistics.viewCount) || 0,
                likeCount: parseInt(video.statistics.likeCount) || 0,
                commentCount: parseInt(video.statistics.commentCount) || 0,
                duration: video.contentDetails.duration,
                durationSeconds: this.parseDuration(video.contentDetails.duration),
                tags: video.snippet.tags || [],
                categoryId: video.snippet.categoryId
              });
            }
          });
        }
        
        // API 호출 간격
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      ServerLogger.info(`📊 영상 상세정보 수집 완료: ${detailedVideos.length}개`);
      return detailedVideos;
      
    } catch (error) {
      this.usageTracker.increment('youtube-channels', false);
      throw error;
    }
  }

  /**
   * YouTube 시간 형식(PT4M13S)을 초로 변환
   */
  parseDuration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * 영상 데이터 분석 수행
   */
  performAnalysis(videos) {
    if (!videos || videos.length === 0) {
      return this.getEmptyAnalysis();
    }

    const now = new Date();
    const periods = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    };

    // 1. 채널 설명은 이미 기본 정보에서 가져옴

    // 2. 일평균 업로드 (최근 30일 기준)
    const recentVideos = videos.filter(v => new Date(v.publishedAt) > periods.month);
    const dailyUploadRate = recentVideos.length / 30;

    // 3. 최근 7일 조회수
    const last7DaysVideos = videos.filter(v => new Date(v.publishedAt) > periods.week);
    const last7DaysViews = last7DaysVideos.reduce((sum, v) => sum + v.viewCount, 0);

    // 4. 영상 평균시간
    const totalDuration = videos.reduce((sum, v) => sum + v.durationSeconds, 0);
    const avgDurationSeconds = videos.length > 0 ? totalDuration / videos.length : 0;

    // 5. 숏폼 비율 (60초 이하)
    const shortVideos = videos.filter(v => v.durationSeconds <= 60);
    const shortFormRatio = videos.length > 0 ? (shortVideos.length / videos.length) * 100 : 0;

    // 6. 채널 일별 조회수 (기간별)
    const viewsByPeriod = {
      last7Days: this.calculateViewsInPeriod(videos, periods.week),
      last30Days: this.calculateViewsInPeriod(videos, periods.month),
      last90Days: this.calculateViewsInPeriod(videos, periods.quarter),
      lastYear: this.calculateViewsInPeriod(videos, periods.year)
    };

    // 추가 통계
    const additionalStats = {
      totalVideos: videos.length,
      totalViews: videos.reduce((sum, v) => sum + v.viewCount, 0),
      averageViewsPerVideo: videos.length > 0 ? 
        videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length : 0,
      mostViewedVideo: videos.reduce((max, v) => v.viewCount > max.viewCount ? v : max, videos[0] || {}),
      uploadFrequency: this.calculateUploadFrequency(videos)
    };

    return {
      // 요청된 6가지 정보
      dailyUploadRate: Math.round(dailyUploadRate * 100) / 100,
      last7DaysViews,
      avgDurationSeconds: Math.round(avgDurationSeconds),
      avgDurationFormatted: this.formatDuration(avgDurationSeconds),
      shortFormRatio: Math.round(shortFormRatio * 100) / 100,
      viewsByPeriod,
      
      // 추가 통계
      ...additionalStats
    };
  }

  /**
   * 특정 기간 내 영상들의 조회수 합계
   */
  calculateViewsInPeriod(videos, startDate) {
    return videos
      .filter(v => new Date(v.publishedAt) > startDate)
      .reduce((sum, v) => sum + v.viewCount, 0);
  }

  /**
   * 업로드 빈도 분석
   */
  calculateUploadFrequency(videos) {
    if (videos.length < 2) return { pattern: 'insufficient_data' };

    // 업로드 간격 계산
    const sortedVideos = videos
      .map(v => ({ ...v, date: new Date(v.publishedAt) }))
      .sort((a, b) => b.date - a.date);

    const intervals = [];
    for (let i = 0; i < sortedVideos.length - 1; i++) {
      const daysDiff = (sortedVideos[i].date - sortedVideos[i + 1].date) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    let pattern;
    if (avgInterval <= 1) pattern = 'daily';
    else if (avgInterval <= 3) pattern = 'multiple_per_week';
    else if (avgInterval <= 7) pattern = 'weekly';
    else if (avgInterval <= 15) pattern = 'bi_weekly';
    else if (avgInterval <= 31) pattern = 'monthly';
    else pattern = 'irregular';

    return {
      pattern,
      avgDaysBetweenUploads: Math.round(avgInterval * 100) / 100,
      consistency: this.calculateConsistency(intervals)
    };
  }

  /**
   * 업로드 일관성 계산 (0-100점)
   */
  calculateConsistency(intervals) {
    if (intervals.length < 3) return 0;

    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 표준편차가 작을수록 일관성이 높음 (100점 만점)
    const consistencyScore = Math.max(0, 100 - (standardDeviation / mean) * 100);
    return Math.round(consistencyScore);
  }

  /**
   * 초를 "4분 13초" 형식으로 변환
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${secs}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${secs}초`;
    } else {
      return `${secs}초`;
    }
  }

  /**
   * 영상의 댓글 가져오기
   */
  async getVideoComments(videoId, maxComments = 20) {
    try {
      const response = await axios.get(`${this.baseURL}/commentThreads`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          videoId: videoId,
          maxResults: maxComments,
          order: 'relevance'
        }
      });

      this.usageTracker.increment('youtube-comments', true);

      if (response.data.items) {
        return response.data.items.map(item => ({
          text: item.snippet.topLevelComment.snippet.textDisplay,
          author: item.snippet.topLevelComment.snippet.authorDisplayName,
          likeCount: item.snippet.topLevelComment.snippet.likeCount || 0,
          publishedAt: item.snippet.topLevelComment.snippet.publishedAt
        }));
      }

      return [];
    } catch (error) {
      this.usageTracker.increment('youtube-comments', false);
      ServerLogger.warn(`⚠️ 댓글 수집 실패 (${videoId}): ${error.message}`);
      return [];
    }
  }

  /**
   * 개별 영상 콘텐츠 분석 (Flash Lite)
   */
  async analyzeVideoContent(video, comments = []) {
    try {
      const videoData = {
        title: video.title,
        description: video.description || '',
        tags: video.tags || [],
        duration: video.durationSeconds,
        viewCount: video.viewCount,
        comments: comments.slice(0, 10).map(c => c.text) // 상위 10개 댓글만
      };

      const prompt = `다음 YouTube 영상을 분석하여 핵심 콘텐츠 성격을 파악해주세요.

영상 정보:
- 제목: ${videoData.title}
- 설명: ${videoData.description}
- 태그: ${videoData.tags.join(', ')}
- 길이: ${videoData.duration}초
- 조회수: ${videoData.viewCount}회

주요 댓글들:
${videoData.comments.map((comment, i) => `${i+1}. ${comment}`).join('\n')}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:

{
  "contentType": "당구",
  "subCategory": "당구 레슨",
  "keywords": ["당구", "레슨", "기초"],
  "audience": "당구 초보자",
  "tone": "교육적"
}`;

      const analysis = await this.aiAnalyzer.geminiManager.generateContent(
        prompt,
        null, // 이미지 없음 (텍스트만)
        { modelType: 'flash-lite' }
      );

      // UnifiedGeminiManager 응답 처리
      let responseText;
      if (typeof analysis === 'object' && analysis.text) {
        responseText = analysis.text; // UnifiedGeminiManager 응답 형태
      } else if (typeof analysis === 'string') {
        responseText = analysis; // 직접 문자열
      } else {
        throw new Error('Unexpected response format');
      }
      
      // JSON 파싱 처리
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.includes('```json')) {
        cleanedResponse = cleanedResponse.split('```json')[1].split('```')[0].trim();
      } else if (cleanedResponse.includes('```')) {
        cleanedResponse = cleanedResponse.split('```')[1].split('```')[0].trim();
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      ServerLogger.warn(`⚠️ 영상 콘텐츠 분석 실패: ${error.message}`);
      return {
        contentType: '기타',
        subCategory: '분석 실패',
        keywords: [],
        audience: '알 수 없음',
        tone: '알 수 없음'
      };
    }
  }

  /**
   * 채널 종합 분석 (Pro)
   */
  async synthesizeChannelIdentity(videoAnalyses, channelInfo) {
    try {
      const prompt = `다음은 YouTube 채널 "${channelInfo.title}"의 최근 5개 영상 분석 결과입니다.

영상 분석 결과:
${videoAnalyses.map((analysis, i) => `영상 ${i+1}: ${analysis.contentType} - ${analysis.subCategory} (${(analysis.keywords || []).join(', ')})`).join('\n')}

채널 정보:
- 구독자: ${channelInfo.subscribers?.toLocaleString()}명
- 설명: ${channelInfo.description}

반드시 아래 JSON 형식으로만 응답하세요:

{
  "primaryCategory": "당구",
  "secondaryCategories": ["스포츠", "교육"],
  "channelTags": ["당구", "4구", "3쿠션", "당구레슨", "당구기초"],
  "targetAudience": "당구 초보자 및 중급자",
  "contentStyle": "교육적이고 실용적인 레슨 영상",
  "uniqueFeatures": ["실전 상황 분석", "초보자 친화적", "체계적 교육"],
  "channelPersonality": "당구 초보자들의 든든한 멘토"
}`;

      const synthesis = await this.aiAnalyzer.geminiManager.generateContent(
        prompt,
        null, // 이미지 없음 (텍스트만)
        { modelType: 'pro' }
      );

      // UnifiedGeminiManager 응답 처리
      let responseText;
      if (typeof synthesis === 'object' && synthesis.text) {
        responseText = synthesis.text; // UnifiedGeminiManager 응답 형태
      } else if (typeof synthesis === 'string') {
        responseText = synthesis; // 직접 문자열
      } else {
        throw new Error('Unexpected response format');
      }
      
      // JSON 파싱 처리
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.includes('```json')) {
        cleanedResponse = cleanedResponse.split('```json')[1].split('```')[0].trim();
      } else if (cleanedResponse.includes('```')) {
        cleanedResponse = cleanedResponse.split('```')[1].split('```')[0].trim();
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      ServerLogger.error(`❌ 채널 종합 분석 실패: ${error.message}`);
      return {
        primaryCategory: '기타',
        secondaryCategories: [],
        channelTags: [],
        targetAudience: '분석 실패',
        contentStyle: '분석 실패',
        uniqueFeatures: [],
        channelPersonality: '분석 실패'
      };
    }
  }

  /**
   * 향상된 채널 분석 (콘텐츠 + 댓글 분석 포함)
   */
  async analyzeChannelEnhanced(channelId, maxVideos = 200, includeContentAnalysis = false) {
    try {
      ServerLogger.info(`🔍 향상된 채널 분석 시작: ${channelId}`);
      
      // 기본 분석 수행
      const basicAnalysis = await this.analyzeChannel(channelId, maxVideos);
      
      // 콘텐츠 분석이 활성화되고 숏폼 비율이 높은 경우에만 추가 분석
      if (!includeContentAnalysis || basicAnalysis.analysis.shortFormRatio < 50) {
        ServerLogger.info('📊 기본 분석만 수행 (롱폼 채널이거나 콘텐츠 분석 비활성화)');
        return basicAnalysis;
      }

      ServerLogger.info('🎬 숏폼 채널 - 콘텐츠 분석 시작');
      
      // 최신 5개 영상 선택
      const recentVideos = basicAnalysis.videos.slice(0, 5);
      
      // 각 영상의 댓글 수집 및 콘텐츠 분석
      const videoAnalyses = [];
      for (const video of recentVideos) {
        ServerLogger.info(`🔍 영상 분석 중: ${video.title}`);
        
        const comments = await this.getVideoComments(video.videoId, 15);
        const contentAnalysis = await this.analyzeVideoContent(video, comments);
        
        videoAnalyses.push(contentAnalysis);
        
        // API 호출 간격
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 채널 종합 분석
      const channelIdentity = await this.synthesizeChannelIdentity(videoAnalyses, basicAnalysis.channelInfo);
      
      ServerLogger.success(`✅ 향상된 채널 분석 완료: AI 태그 ${channelIdentity.channelTags.length}개 생성`);
      
      return {
        ...basicAnalysis,
        enhancedAnalysis: {
          videoAnalyses,
          channelIdentity,
          analysisMethod: 'content_and_comments',
          analyzedVideos: recentVideos.length
        }
      };
      
    } catch (error) {
      ServerLogger.error(`❌ 향상된 채널 분석 실패: ${channelId}`, error);
      throw error;
    }
  }

  /**
   * 빈 분석 결과 반환
   */
  getEmptyAnalysis() {
    return {
      dailyUploadRate: 0,
      last7DaysViews: 0,
      avgDurationSeconds: 0,
      avgDurationFormatted: '0초',
      shortFormRatio: 0,
      viewsByPeriod: {
        last7Days: 0,
        last30Days: 0,
        last90Days: 0,
        lastYear: 0
      },
      totalVideos: 0,
      totalViews: 0,
      averageViewsPerVideo: 0,
      uploadFrequency: { pattern: 'no_data' }
    };
  }
}

module.exports = YouTubeChannelAnalyzer;