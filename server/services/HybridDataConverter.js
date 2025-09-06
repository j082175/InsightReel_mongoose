const { ServerLogger } = require('../utils/logger');

/**
 * 🔄 하이브리드 YouTube 데이터를 기존 VideoProcessor 포맷으로 변환
 */
class HybridDataConverter {
  
  /**
   * 하이브리드 데이터를 기존 getYouTubeVideoInfo 포맷으로 변환
   */
  static convertToLegacyFormat(hybridData, videoId) {
    try {
      // YouTube 카테고리 매핑 (VideoProcessor와 동일)
      const YOUTUBE_CATEGORIES = {
        "1": "영화/애니메이션",
        "2": "자동차/교통", 
        "10": "음악",
        "15": "애완동물/동물",
        "17": "스포츠",
        "19": "여행/이벤트", 
        "20": "게임",
        "22": "인물/블로그",
        "23": "코미디",
        "24": "엔터테인먼트",
        "25": "뉴스/정치",
        "26": "노하우/스타일",
        "27": "교육",
        "28": "과학기술",
        "29": "비영리/사회운동"
      };

      // 기본 변환
      const converted = {
        videoId: videoId,
        title: hybridData.title || '제목 없음',
        description: hybridData.description || '',
        channel: hybridData.channelName || hybridData.channelTitle || '채널 없음',
        channelId: hybridData.channelId || '',
        
        // 날짜 처리
        publishedAt: hybridData.publishedAt || hybridData.uploadDate || new Date().toISOString(),
        
        // 썸네일 처리
        thumbnailUrl: this.extractThumbnailUrl(hybridData),
        
        // 카테고리 처리
        category: this.convertCategory(hybridData, YOUTUBE_CATEGORIES),
        categoryId: hybridData.youtubeCategoryId || hybridData.categoryId || '0',
        
        // 길이 및 콘텐츠 타입
        duration: hybridData.duration || 0,
        durationFormatted: this.formatDuration(hybridData.duration || 0),
        contentType: (hybridData.duration <= 60) ? 'Shorts' : 'Video',
        isShortForm: (hybridData.duration <= 60),
        
        // 메타데이터
        tags: hybridData.tags || hybridData.keywords || [],
        
        // 통계 (하이브리드의 핵심 장점)
        views: String(hybridData.viewCount || hybridData.views || '0'),
        likes: String(hybridData.likeCount || hybridData.likes || '0'),
        comments: String(hybridData.commentCount || hybridData.comments_count || '0'),
        
        // 채널 정보 (기본값 제공)
        subscribers: '0', // API 폴백에서 채워질 수 있음
        channelVideos: '0',
        channelViews: '0',
        channelCountry: '',
        channelDescription: '',
        
        // 해시태그 및 멘션 (설명에서 추출)
        hashtags: this.extractHashtags(hybridData.description || ''),
        mentions: this.extractMentions(hybridData.description || ''),
        
        // 댓글 (기본값)
        topComments: '',
        
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
        stats: `${converted.views} views, ${converted.likes} likes`
      });

      return converted;
      
    } catch (error) {
      ServerLogger.error('하이브리드 데이터 변환 실패:', error.message);
      
      // 최소한의 기본 데이터 반환
      return {
        videoId: videoId,
        title: hybridData?.title || '변환 실패',
        description: hybridData?.description || '',
        channel: hybridData?.channelName || '알 수 없음',
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
        comments: '0',
        subscribers: '0',
        extractionMethod: 'hybrid-fallback',
        error: error.message
      };
    }
  }

  /**
   * 썸네일 URL 추출
   */
  static extractThumbnailUrl(data) {
    // ytdl-core 썸네일 배열에서 최고 화질 선택
    if (data.thumbnails && Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
      const best = data.thumbnails[data.thumbnails.length - 1];
      return best.url;
    }
    
    // 단일 썸네일
    if (data.thumbnail && data.thumbnail.url) {
      return data.thumbnail.url;
    }
    
    // 기본 YouTube 썸네일 생성
    const videoId = data.url?.match(/[?&]v=([^&]+)/)?.[1] || '';
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    
    return '';
  }

  /**
   * 카테고리 변환
   */
  static convertCategory(data, categoryMap) {
    // API에서 categoryId가 있는 경우
    if (data.youtubeCategoryId && categoryMap[data.youtubeCategoryId]) {
      return categoryMap[data.youtubeCategoryId];
    }
    
    // ytdl-core의 category 문자열
    if (data.category) {
      return data.category;
    }
    
    return '미분류';
  }

  /**
   * 시간 포맷팅 (초 → MM:SS 또는 HH:MM:SS)
   */
  static formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 해시태그 추출
   */
  static extractHashtags(description) {
    if (!description) return [];
    
    const hashtags = description.match(/#[\w가-힣]+/g) || [];
    return hashtags.slice(0, 10); // 최대 10개
  }

  /**
   * 멘션 추출  
   */
  static extractMentions(description) {
    if (!description) return [];
    
    const mentions = description.match(/@[\w가-힣.]+/g) || [];
    return mentions.slice(0, 5); // 최대 5개
  }
}

module.exports = HybridDataConverter;