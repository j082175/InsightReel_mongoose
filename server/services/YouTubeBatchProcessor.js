const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const { FieldMapper } = require('../types/field-mapper');
const fs = require('fs').promises;
const path = require('path');

/**
 * YouTube API 배치 처리 시스템
 * 50개씩 모아서 한 번에 API 호출하여 쿼터 97% 절약
 */
class YouTubeBatchProcessor {
  constructor() {
    this.batchQueue = [];
    this.maxBatchSize = 50;           // YouTube API 최대 제한
    this.batchTimeout = 60000;        // 60초 후 자동 처리
    this.isProcessing = false;
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    this.batchFile = path.join(__dirname, '../../data/youtube_batch_queue.json');
    this.timeoutId = null;
    
    // YouTube 카테고리 매핑
    this.YOUTUBE_CATEGORIES = {
      '1': '영화/애니메이션',
      '2': '자동차/교통',
      '10': '음악',
      '15': '애완동물/동물',
      '17': '스포츠',
      '19': '여행/이벤트',
      '20': '게임',
      '22': '인물/블로그',
      '23': '코미디',
      '24': '엔터테인먼트',
      '25': '뉴스/정치',
      '26': '노하우/스타일',
      '27': '교육',
      '28': '과학기술',
      '29': '비영리/사회운동'
    };

    this.stats = {
      totalProcessed: 0,
      totalBatches: 0,
      quotaSaved: 0,
      avgProcessingTime: 0
    };

    // 시작 시 파일에서 복원
    this.restoreFromFile();
    
    ServerLogger.info('📦 YouTube 배치 처리기 초기화됨', {
      maxBatchSize: this.maxBatchSize,
      batchTimeout: this.batchTimeout / 1000 + '초',
      apiKey: !!this.youtubeApiKey
    });
  }

  /**
   * 배치 큐에 YouTube URL 추가
   * @param {string} videoUrl - YouTube 비디오 URL
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 큐 추가 결과
   */
  async addToBatch(videoUrl, options = {}) {
    try {
      ServerLogger.info(`🔍 YouTube URL 검증 중: ${videoUrl}`);
      const videoId = this.extractYouTubeId(videoUrl);
      if (!videoId) {
        ServerLogger.error(`❌ YouTube ID 추출 실패: ${videoUrl}`);
        throw new Error('유효하지 않은 YouTube URL입니다.');
      }
      ServerLogger.info(`✅ YouTube ID 추출 성공: ${videoId}`);

      const batchItem = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        videoUrl,
        videoId,
        addedAt: new Date().toISOString(),
        priority: options.priority || 'normal',
        clientInfo: options.clientInfo || {},
        metadata: options.metadata || {},
        status: 'pending'
      };

      this.batchQueue.push(batchItem);
      await this.saveToFile();

      ServerLogger.info(`📋 배치 큐에 추가: ${videoId}`, {
        queueLength: this.batchQueue.length,
        maxSize: this.maxBatchSize,
        timeUntilProcess: this.batchTimeout / 1000 + '초'
      });

      // 50개 모이면 즉시 처리
      if (this.batchQueue.length >= this.maxBatchSize) {
        ServerLogger.info('🚀 배치 큐 가득참 - 즉시 처리 시작');
        clearTimeout(this.timeoutId);
        return await this.processBatch();
      }

      // 타임아웃 설정 (60초 후 자동 처리)
      if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => {
          if (this.batchQueue.length > 0) {
            ServerLogger.info('⏰ 타임아웃 - 부분 배치 처리 시작');
            this.processBatch();
          }
        }, this.batchTimeout);
      }

      return {
        batchId: batchItem.id,
        status: 'queued',
        queuePosition: this.batchQueue.length,
        estimatedWaitTime: this.getEstimatedWaitTime(),
        message: `큐에 추가됨 (${this.batchQueue.length}/${this.maxBatchSize})`
      };

    } catch (error) {
      ServerLogger.error('배치 큐 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 배치 처리 실행 - 50개씩 YouTube API 호출
   */
  async processBatch() {
    if (this.isProcessing || this.batchQueue.length === 0) {
      return { message: '처리할 항목이 없거나 이미 처리 중입니다.' };
    }

    this.isProcessing = true;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;

    const startTime = Date.now();
    const batchToProcess = [...this.batchQueue];
    this.batchQueue = [];
    await this.saveToFile();

    ServerLogger.info(`🔄 배치 처리 시작: ${batchToProcess.length}개 영상`, {
      expectedQuotaSaving: `${((batchToProcess.length * 8) - 12)} 유닛 절약`
    });

    try {
      // 50개씩 청크로 나누기
      const chunks = [];
      for (let i = 0; i < batchToProcess.length; i += this.maxBatchSize) {
        chunks.push(batchToProcess.slice(i, i + this.maxBatchSize));
      }

      const allResults = [];

      for (const chunk of chunks) {
        const chunkResult = await this.processChunk(chunk);
        allResults.push(...chunkResult);
      }

      // 🆕 배치 시트 저장 - 50개 영상 한 번에 저장
      ServerLogger.info(`📊 배치 시트 저장 시작: ${allResults.length}개 영상`);
      const sheetsStartTime = Date.now();
      
      try {
        const SheetsManager = require('./SheetsManager');
        const sheetsManager = new SheetsManager();
        const sheetResult = await sheetsManager.saveVideoBatch(allResults, 'youtube');
        
        const sheetsProcessingTime = Date.now() - sheetsStartTime;
        ServerLogger.info(`✅ 배치 시트 저장 완료: ${allResults.length}개 영상`, {
          sheetsProcessingTime: `${sheetsProcessingTime}ms`,
          spreadsheetUrl: sheetResult.spreadsheetUrl
        });
        
      } catch (sheetsError) {
        ServerLogger.error('❌ 배치 시트 저장 실패:', sheetsError);
        // 시트 저장 실패해도 YouTube API 결과는 반환
      }

      const processingTime = Date.now() - startTime;
      const quotaSaved = (batchToProcess.length * 8) - (chunks.length * 12);

      // 통계 업데이트
      this.stats.totalProcessed += batchToProcess.length;
      this.stats.totalBatches += chunks.length;
      this.stats.quotaSaved += quotaSaved;
      this.updateAvgProcessingTime(processingTime);

      ServerLogger.info(`✅ 배치 처리 완료: ${allResults.length}개 성공`, {
        processingTime: `${processingTime}ms`,
        quotaSaved: `${quotaSaved} 유닛`,
        efficiency: `${Math.round((quotaSaved / (batchToProcess.length * 8)) * 100)}% 절약`,
        successRate: `${allResults.length}/${batchToProcess.length}`,
        totalStats: this.stats
      });

      return {
        success: true,
        processed: allResults.length,
        total: batchToProcess.length,
        processingTime,
        quotaSaved,
        results: allResults
      };

    } catch (error) {
      ServerLogger.error('배치 처리 실패:', error);
      // 실패한 항목들 다시 큐에 추가
      this.batchQueue.unshift(...batchToProcess);
      await this.saveToFile();
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 청크 단위 처리 (최대 50개)
   */
  async processChunk(chunk) {
    try {
      const videoIds = chunk.map(item => item.videoId).join(',');
      
      // Videos API 배치 호출
      const videoResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`, {
          params: {
            part: 'snippet,statistics,contentDetails',
            id: videoIds,
            key: this.youtubeApiKey
          },
          timeout: 30000
        }
      );

      if (!videoResponse.data.items) {
        throw new Error('YouTube API 응답이 유효하지 않습니다.');
      }

      // 채널 ID들 수집 (중복 제거)
      const channelIds = [...new Set(
        videoResponse.data.items.map(video => video.snippet.channelId)
      )];

      // Channels API 배치 호출
      const channelResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels`, {
          params: {
            part: 'statistics,snippet',
            id: channelIds.join(','),
            key: this.youtubeApiKey
          },
          timeout: 30000
        }
      );

      // 채널 정보를 맵으로 변환
      const channelMap = {};
      channelResponse.data.items.forEach(channel => {
        channelMap[channel.id] = channel;
      });

      // 비디오 정보와 채널 정보 결합
      const results = videoResponse.data.items.map(video => {
        const snippet = video.snippet;
        const statistics = video.statistics;
        const contentDetails = video.contentDetails;
        const channelInfo = channelMap[snippet.channelId];

        // 카테고리 변환
        const categoryName = this.YOUTUBE_CATEGORIES[snippet.categoryId] || '미분류';
        
        // 비디오 길이를 초 단위로 변환
        const duration = this.parseYouTubeDuration(contentDetails.duration);

        // 해시태그와 멘션 추출
        const hashtags = this.extractHashtags(snippet.description);
        const mentions = this.extractMentions(snippet.description);

        // 🚀 FieldMapper 완전 자동화된 데이터 구조
        return {
          videoId: video.id,
          [FieldMapper.get('TITLE')]: snippet.title,
          [FieldMapper.get('DESCRIPTION')]: snippet.description,
          [FieldMapper.get('CHANNEL_NAME')]: snippet.channelTitle,
          [FieldMapper.get('CHANNEL_ID')]: snippet.channelId,
          [FieldMapper.get('UPLOAD_DATE')]: snippet.publishedAt,
          [FieldMapper.get('THUMBNAIL_URL')]: snippet.thumbnails.medium?.url || snippet.thumbnails.default.url,
          [FieldMapper.get('YOUTUBE_CATEGORY')]: categoryName,
          [FieldMapper.get('CATEGORY_ID')]: snippet.categoryId,
          [FieldMapper.get('DURATION')]: duration,
          [FieldMapper.get('IS_SHORT_FORM')]: duration <= 60,
          [FieldMapper.get('TAGS')]: snippet.tags || [],
          [FieldMapper.get('VIEWS')]: statistics.viewCount || '0',
          [FieldMapper.get('LIKES')]: statistics.likeCount || '0',
          [FieldMapper.get('COMMENTS_COUNT')]: statistics.commentCount || '0',
          [FieldMapper.get('SUBSCRIBERS')]: channelInfo?.statistics?.subscriberCount || '0',
          [FieldMapper.get('CHANNEL_VIDEOS')]: channelInfo?.statistics?.videoCount || '0',
          [FieldMapper.get('CHANNEL_VIEWS')]: channelInfo?.statistics?.viewCount || '0',
          [FieldMapper.get('CHANNEL_COUNTRY')]: channelInfo?.snippet?.country || '',
          [FieldMapper.get('CHANNEL_DESCRIPTION')]: channelInfo?.snippet?.description || '',
          [FieldMapper.get('YOUTUBE_HANDLE')]: this.extractYouTubeHandle(channelInfo?.snippet?.customUrl),
          [FieldMapper.get('CHANNEL_URL')]: this.buildChannelUrl(channelInfo?.snippet?.customUrl, snippet.channelId),
          [FieldMapper.get('QUALITY')]: contentDetails?.definition || 'sd',
          [FieldMapper.get('LANGUAGE')]: snippet.defaultLanguage || snippet.defaultAudioLanguage || '',
          [FieldMapper.get('LIVE_BROADCAST')]: snippet.liveBroadcastContent || 'none',
          // 새로운 필드들 (FieldMapper 표준)
          [FieldMapper.get('HASHTAGS')]: hashtags,
          [FieldMapper.get('MENTIONS')]: mentions,
          [FieldMapper.get('TOP_COMMENTS')]: '' // 배치에서는 댓글 수집 제외 (API 할당량 절약)
        };
      });

      ServerLogger.info(`📊 청크 처리 완료: ${results.length}개 비디오 정보 수집`);
      return results;

    } catch (error) {
      ServerLogger.error('청크 처리 실패:', error);
      throw error;
    }
  }

  /**
   * YouTube URL에서 비디오 ID 추출 (VideoProcessor와 동일한 로직)
   */
  extractYouTubeId(url) {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/,
      /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * YouTube duration 파싱 (PT4M13S -> 253초)
   */
  parseYouTubeDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * 파일에 큐 상태 저장
   */
  async saveToFile() {
    try {
      const dataDir = path.dirname(this.batchFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      const data = {
        queue: this.batchQueue,
        stats: this.stats,
        savedAt: new Date().toISOString()
      };
      
      await fs.writeFile(this.batchFile, JSON.stringify(data, null, 2));
    } catch (error) {
      ServerLogger.error('배치 큐 저장 실패:', error);
    }
  }

  /**
   * 파일에서 큐 상태 복원
   */
  async restoreFromFile() {
    try {
      const data = await fs.readFile(this.batchFile, 'utf8');
      const parsed = JSON.parse(data);
      
      this.batchQueue = parsed.queue || [];
      this.stats = { ...this.stats, ...parsed.stats };
      
      if (this.batchQueue.length > 0) {
        ServerLogger.info(`🔄 배치 큐 복원: ${this.batchQueue.length}개 항목`, {
          oldestItem: this.batchQueue[0]?.addedAt,
          stats: this.stats
        });

        // 복원된 항목이 있으면 타임아웃 설정
        if (!this.timeoutId) {
          this.timeoutId = setTimeout(() => {
            this.processBatch();
          }, 5000); // 5초 후 처리
        }
      }
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        ServerLogger.error('배치 큐 복원 실패:', error);
      }
      this.batchQueue = [];
    }
  }

  /**
   * 예상 대기 시간 계산
   */
  getEstimatedWaitTime() {
    if (this.batchQueue.length >= this.maxBatchSize) {
      return 0; // 즉시 처리
    }
    
    const timeToFull = this.batchTimeout;
    const avgProcessingTime = this.stats.avgProcessingTime || 10000;
    
    return Math.max(timeToFull, avgProcessingTime);
  }

  /**
   * 평균 처리 시간 업데이트
   */
  updateAvgProcessingTime(processingTime) {
    if (this.stats.totalBatches === 1) {
      this.stats.avgProcessingTime = processingTime;
    } else {
      const alpha = 0.1;
      this.stats.avgProcessingTime = 
        (1 - alpha) * this.stats.avgProcessingTime + alpha * processingTime;
    }
  }

  /**
   * 현재 큐 상태 조회
   */
  getStatus() {
    return {
      queueLength: this.batchQueue.length,
      maxBatchSize: this.maxBatchSize,
      isProcessing: this.isProcessing,
      nextProcessTime: this.timeoutId ? new Date(Date.now() + this.batchTimeout).toISOString() : null,
      stats: this.stats,
      estimatedQuotaSaving: this.batchQueue.length > 0 ? 
        `${(this.batchQueue.length * 8) - 12} 유닛` : '0 유닛'
    };
  }

  /**
   * 큐 비우기 (긴급 상황)
   */
  async clearQueue() {
    const clearedCount = this.batchQueue.length;
    this.batchQueue = [];
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    await this.saveToFile();
    
    ServerLogger.info(`🧹 배치 큐 비우기 완료: ${clearedCount}개 항목 삭제`);
    return { cleared: clearedCount };
  }

  /**
   * 강제 배치 처리 (큐가 가득 차지 않아도)
   */
  async forceProcess() {
    if (this.batchQueue.length === 0) {
      return { message: '처리할 항목이 없습니다.' };
    }

    ServerLogger.info(`🔥 강제 배치 처리: ${this.batchQueue.length}개 항목`);
    return await this.processBatch();
  }

  /**
   * 설명에서 해시태그 추출
   * @param {string} description - YouTube 설명
   * @returns {Array<string>} 해시태그 배열
   */
  extractHashtags(description) {
    if (!description) return [];
    
    // #으로 시작하는 단어 추출 (한글, 영어, 숫자, 언더스코어 포함)
    const hashtags = description.match(/#[\w가-힣]+/g) || [];
    
    // 중복 제거 (# 기호 유지)
    const uniqueHashtags = [...new Set(hashtags)];
    
    return uniqueHashtags;
  }

  /**
   * 설명에서 멘션(@) 추출
   * @param {string} description - YouTube 설명
   * @returns {Array<string>} 멘션 배열
   */
  extractMentions(description) {
    if (!description) return [];
    
    // @으로 시작하는 채널명 추출
    const mentions = description.match(/@[\w가-힣._]+/g) || [];
    
    // 중복 제거 및 @ 제거
    const uniqueMentions = [...new Set(mentions)].map(mention => mention.substring(1));
    
    return uniqueMentions;
  }

  /**
   * YouTube customUrl에서 핸들명 추출 (VideoProcessor와 동일)
   * @param {string} customUrl - YouTube customUrl
   * @returns {string} 추출된 핸들명
   */
  extractYouTubeHandle(customUrl) {
    if (!customUrl) return '';
    
    try {
      if (customUrl.startsWith('@')) {
        return customUrl.substring(1);
      }
      
      if (customUrl.startsWith('/c/')) {
        return customUrl.substring(3);
      }
      
      if (customUrl.startsWith('/user/')) {
        return customUrl.substring(6);
      }
      
      return customUrl.replace(/^\/+/, '');
      
    } catch (error) {
      ServerLogger.warn('YouTube 핸들명 추출 실패:', error.message);
      return '';
    }
  }

  /**
   * YouTube 채널 URL 생성 (VideoProcessor와 동일)
   * @param {string} customUrl - YouTube customUrl
   * @param {string} channelId - 채널 ID (백업용)
   * @returns {string} 채널 URL
   */
  buildChannelUrl(customUrl, channelId) {
    try {
      if (customUrl) {
        if (customUrl.startsWith('@')) {
          return `https://www.youtube.com/${customUrl}`;
        } else if (customUrl.startsWith('/')) {
          return `https://www.youtube.com${customUrl}`;
        } else {
          return `https://www.youtube.com/@${customUrl}`;
        }
      }
      
      if (channelId) {
        return `https://www.youtube.com/channel/${channelId}`;
      }
      
      return '';
      
    } catch (error) {
      ServerLogger.warn('YouTube 채널 URL 생성 실패:', error.message);
      return channelId ? `https://www.youtube.com/channel/${channelId}` : '';
    }
  }
}

// 싱글톤 인스턴스 생성
const youtubeBatchProcessor = new YouTubeBatchProcessor();

module.exports = youtubeBatchProcessor;