/**
 * 이미지 최적화 유틸리티
 * - 이미지 크기 최적화
 * - WebP 포맷 지원 검사
 * - Lazy loading 최적화
 * - CDN URL 변환
 */

// WebP 지원 여부 검사 (브라우저 호환성)
let webpSupported: boolean | null = null;

export const checkWebPSupport = (): Promise<boolean> => {
  if (webpSupported !== null) {
    return Promise.resolve(webpSupported);
  }

  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      webpSupported = webP.height === 2;
      resolve(webpSupported);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// 이미지 크기 최적화 옵션
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'webp' | 'jpg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

// YouTube 썸네일 품질 매핑
const YOUTUBE_QUALITY_MAP = {
  low: 'default',      // 120x90
  medium: 'mqdefault', // 320x180
  high: 'hqdefault',   // 480x360
  max: 'maxresdefault' // 1280x720
};

/**
 * 이미지 URL 최적화
 * @param originalUrl 원본 이미지 URL
 * @param options 최적화 옵션
 * @returns 최적화된 이미지 URL
 */
export const optimizeImageUrl = async (
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): Promise<string> => {
  if (!originalUrl) return '';

  const { width = 280, height = 157, quality = 85, format = 'auto' } = options;

  // YouTube 썸네일 최적화
  if (originalUrl.includes('youtube.com') || originalUrl.includes('ytimg.com')) {
    return optimizeYouTubeThumbnail(originalUrl, { width, height });
  }

  // Instagram 이미지 최적화
  if (originalUrl.includes('instagram.com') || originalUrl.includes('cdninstagram.com')) {
    return optimizeInstagramImage(originalUrl, { width, height });
  }

  // TikTok 썸네일 최적화
  if (originalUrl.includes('tiktok.com') || originalUrl.includes('tiktokcdn.com')) {
    return optimizeTikTokThumbnail(originalUrl, { width, height });
  }

  // 일반 이미지 최적화 (필요시 CDN 서비스 연동)
  return optimizeGenericImage(originalUrl, { width, height, quality, format });
};

/**
 * YouTube 썸네일 최적화
 */
const optimizeYouTubeThumbnail = (url: string, options: { width: number; height: number }): string => {
  const { width } = options;

  // 크기에 따른 품질 선택
  let quality: keyof typeof YOUTUBE_QUALITY_MAP;
  if (width <= 120) quality = 'low';
  else if (width <= 320) quality = 'medium';
  else if (width <= 480) quality = 'high';
  else quality = 'max';

  // YouTube Video ID 추출 (다양한 패턴 지원)
  let videoId = '';

  // 1. YouTube 썸네일 URL에서 직접 추출
  const thumbnailMatch = url.match(/img\.youtube\.com\/vi\/([^\/]+)/);
  if (thumbnailMatch) {
    videoId = thumbnailMatch[1];
  }
  // 2. YouTube 비디오 URL에서 추출
  else {
    const videoUrlMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/);
    if (videoUrlMatch) {
      videoId = videoUrlMatch[1];
    }
  }

  // Video ID가 있으면 최적화된 썸네일 URL 생성
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/${YOUTUBE_QUALITY_MAP[quality]}.jpg`;
  }

  // Video ID를 찾을 수 없으면 원본 URL 반환
  return url;
};

/**
 * Instagram 이미지 최적화
 */
const optimizeInstagramImage = (url: string, options: { width: number; height: number }): string => {
  // Instagram 이미지 크기 파라미터 추가
  const { width } = options;

  if (url.includes('?')) {
    return `${url}&w=${width}`;
  }

  return `${url}?w=${width}`;
};

/**
 * TikTok 썸네일 최적화
 */
const optimizeTikTokThumbnail = (url: string, options: { width: number; height: number }): string => {
  // TikTok 썸네일은 고정 크기로 제공되므로 원본 URL 반환
  return url;
};

/**
 * 일반 이미지 최적화 (CDN 서비스 연동 가능)
 */
const optimizeGenericImage = async (
  url: string,
  options: { width: number; height: number; quality: number; format: string }
): Promise<string> => {
  // 향후 Cloudinary, ImageKit 등의 CDN 서비스 연동 가능
  // 현재는 원본 URL 반환
  return url;
};

/**
 * 이미지 로딩 속성 최적화
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchpriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  srcSet?: string;
}

/**
 * 최적화된 이미지 속성 생성 (async 확인)
 */
export const generateOptimizedImageProps = async (
  originalUrl: string,
  alt: string,
  options: ImageOptimizationOptions & {
    priority?: boolean;
    responsive?: boolean;
  } = {}
): Promise<OptimizedImageProps> => {
  const { priority = false, responsive = true, width = 280, height = 157 } = options;

  // 기본 최적화된 URL
  const optimizedUrl = await optimizeImageUrl(originalUrl, options);

  const props: OptimizedImageProps = {
    src: optimizedUrl,
    alt,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async',
    fetchpriority: priority ? 'high' : 'low'
  };

  // 반응형 이미지 지원
  if (responsive) {
    const sizes = [
      { width: width * 1, suffix: '1x' },
      { width: width * 2, suffix: '2x' }
    ];

    const srcSetPromises = sizes.map(async (size) => {
      const url = await optimizeImageUrl(originalUrl, { ...options, width: size.width });
      return `${url} ${size.suffix}`;
    });

    props.srcSet = (await Promise.all(srcSetPromises)).join(', ');

    props.sizes = `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`;
  }

  return props;
};

/**
 * 이미지 프리로딩 (중요한 이미지용)
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * 이미지 레이지 로딩 교차 관찰자
 */
export const createImageObserver = (callback: (entries: IntersectionObserverEntry[]) => void) => {
  const options = {
    root: null,
    rootMargin: '50px', // 뷰포트 50px 전에 로딩 시작
    threshold: 0.1
  };

  return new IntersectionObserver(callback, options);
};