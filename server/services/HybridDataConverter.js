const { ServerLogger } = require('../utils/logger');
const YouTubeDataProcessor = require('../utils/youtube-data-processor');
const { FieldMapper } = require('../types/field-mapper');

/**
 * 🔄 하이브리드 YouTube 데이터를 기존 VideoProcessor 포맷으로 변환
 */
class HybridDataConverter {
  
  /**
   * 하이브리드 데이터를 기존 getYouTubeVideoInfo 포맷으로 변환
   */
  static convertToLegacyFormat(hybridData, videoId) {
    try {
      // 통합된 YouTube 유틸리티 사용

      // 기본 변환
      const converted = {
        videoId: videoId,
        title: hybridData.title || '제목 없음',
        description: hybridData.description || '',
        channel: hybridData[FieldMapper.get('CHANNEL_NAME')] || hybridData[FieldMapper.get('CHANNEL_TITLE')] || '채널 없음',
        channelId: hybridData.channelId || '',
        
        // 날짜 처리
        publishedAt: hybridData.publishedAt || hybridData.uploadDate || new Date().toISOString(),
        
        // 썸네일 처리
        thumbnailUrl: YouTubeDataProcessor.buildThumbnailUrl(videoId),
        
        // 카테고리 처리
        category: this.convertCategory(hybridData),
        categoryId: hybridData.youtubeCategoryId || hybridData.categoryId || '0',
        
        // 길이 및 콘텐츠 타입
        duration: hybridData.duration || 0,
        durationFormatted: YouTubeDataProcessor.formatDuration(hybridData.duration || 0),
        contentType: (hybridData.duration <= 60) ? 'Shorts' : 'Video',
        isShortForm: (hybridData.duration <= 60),
        
        // 메타데이터
        tags: hybridData.tags || hybridData.keywords || [],
        
        // 통계 (하이브리드의 핵심 장점)
        [FieldMapper.get('VIEWS')]: String(hybridData.viewCount || hybridData[FieldMapper.get('VIEWS')] || hybridData.views || '0'),
        [FieldMapper.get('LIKES')]: String(hybridData.likeCount || hybridData[FieldMapper.get('LIKES')] || hybridData.likes || '0'),
        [FieldMapper.get('COMMENTS_COUNT')]: String(hybridData.commentCount || hybridData[FieldMapper.get('COMMENTS_COUNT')] || '0'),
        
        // 채널 정보 (하이브리드 데이터에서 매핑) - FieldMapper 키 우선 사용
        [FieldMapper.get('SUBSCRIBERS')]: String(hybridData[FieldMapper.get('SUBSCRIBERS')] || hybridData.subscriberCount || '0'),
        [FieldMapper.get('CHANNEL_VIDEOS')]: String(hybridData[FieldMapper.get('CHANNEL_VIDEOS')] || hybridData.channelVideoCount || '0'),
        [FieldMapper.get('CHANNEL_VIEWS')]: String(hybridData[FieldMapper.get('CHANNEL_VIEWS')] || hybridData.channelViewCount || '0'),
        [FieldMapper.get('CHANNEL_COUNTRY')]: hybridData.channelCountry || '',
        [FieldMapper.get('CHANNEL_DESCRIPTION')]: hybridData.channelDescription || '',
        
        // 해시태그 및 멘션 (설명에서 추출)
        hashtags: YouTubeDataProcessor.extractHashtags(hybridData[FieldMapper.get('DESCRIPTION')] || hybridData.description || ''),
        mentions: YouTubeDataProcessor.extractMentions(hybridData[FieldMapper.get('DESCRIPTION')] || hybridData.description || ''),
        
        // 댓글 및 추가 채널 정보 - 객체 배열 처리 개선
        [FieldMapper.get('TOP_COMMENTS')]: this.formatComments(hybridData.topComments),
        [FieldMapper.get('YOUTUBE_HANDLE')]: hybridData.youtubeHandle || hybridData.channelCustomUrl || '',
        [FieldMapper.get('CHANNEL_URL')]: hybridData.channelUrl || `https://www.youtube.com/channel/${hybridData.channelId || ''}`,
        
        // 하이브리드 메타데이터
        extractionMethod: 'hybrid',
        dataSources: hybridData.dataSources || { primary: 'unknown' },
        
        // 추가 정보
        youtubeCategory: hybridData.category || '미분류',
        license: 'youtube',
        definition: 'hd', // 기본값
        privacy: 'public', // 기본값
        
        // Live 스트림 정보
        isLiveContent: hybridData.isLiveContent || false,
        isLive: hybridData.isLive || false
      };

      ServerLogger.info('🔄 하이브리드 → 레거시 포맷 변환 완료', {
        title: converted.title.substring(0, 50),
        sources: hybridData.dataSources,
        stats: `${converted[FieldMapper.get('VIEWS')]} views, ${converted[FieldMapper.get('LIKES')]} likes`
      });

      return converted;
      
    } catch (error) {
      ServerLogger.error('하이브리드 데이터 변환 실패:', error.message);
      
      // 최소한의 기본 데이터 반환
      return {
        videoId: videoId,
        title: hybridData?.title || '변환 실패',
        [FieldMapper.get('DESCRIPTION')]: hybridData?.[FieldMapper.get('DESCRIPTION')] || hybridData?.description || '',
        channel: hybridData?.[FieldMapper.get('CHANNEL_NAME')] || '알 수 없음',
        channelId: hybridData?.channelId || '',
        publishedAt: new Date().toISOString(),
        thumbnailUrl: '',
        category: '미분류',
        categoryId: '0',
        duration: 0,
        durationFormatted: '00:00',
        contentType: 'Video',
        isShortForm: false,
        tags: [],
        views: '0',
        likes: '0', 
        [FieldMapper.get('COMMENTS_COUNT')]: '0',
        subscribers: '0',
        extractionMethod: 'hybrid-fallback',
        error: error.message
      };
    }
  }

  /**
   * 댓글 배열을 문자열로 포맷팅
   */
  static formatComments(comments) {
    if (!comments) return '';
    
    // 이미 문자열인 경우
    if (typeof comments === 'string') {
      return comments.replace(/\[object Object\]/g, '');
    }
    
    // 배열인 경우
    if (Array.isArray(comments)) {
      return comments.map(comment => {
        if (typeof comment === 'string') return comment;
        if (comment && typeof comment === 'object') {
          // 댓글 객체에서 텍스트 추출
          return comment.text || comment.snippet?.textOriginal || comment.snippet?.textDisplay || String(comment).replace('[object Object]', '댓글');
        }
        return String(comment);
      }).filter(text => text && text.trim()).join('\n');
    }
    
    // 객체인 경우
    if (typeof comments === 'object') {
      return comments.text || comments.snippet?.textOriginal || comments.snippet?.textDisplay || '';
    }
    
    return String(comments);
  }

  /**
   * 썸네일 URL 추출 (커스텀 로직 유지)
   */
  static extractThumbnailUrl(data, videoId) {
    // ytdl-core 썸네일 배열에서 최고 화질 선택
    if (data.thumbnails && Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
      const best = data.thumbnails[data.thumbnails.length - 1];
      return best.url;
    }
    
    // 단일 썸네일
    if (data.thumbnail && data.thumbnail.url) {
      return data.thumbnail.url;
    }
    
    // YouTubeDataProcessor 사용
    return YouTubeDataProcessor.buildThumbnailUrl(videoId);
  }

  /**
   * 카테고리 변환 (YouTubeDataProcessor 사용)
   */
  static convertCategory(data) {
    // API에서 categoryId가 있는 경우
    if (data.youtubeCategoryId) {
      return YouTubeDataProcessor.getCategoryName(data.youtubeCategoryId);
    }
    
    // ytdl-core의 category 문자열
    if (data.category) {
      return data.category;
    }
    
    return '미분류';
  }

  // 중복 메소드들은 YouTubeDataProcessor로 통합됨
}

module.exports = HybridDataConverter;