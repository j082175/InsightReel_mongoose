import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { generateOptimizedImageProps, createImageObserver, preloadImage } from '../utils/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  responsive?: boolean;
  quality?: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 280,
  height = 157,
  className = '',
  priority = false,
  responsive = true,
  quality = 85,
  placeholder,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [optimizedProps, setOptimizedProps] = useState<any>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 🚀 이미지 최적화 속성 생성
  useEffect(() => {
    const generateProps = async () => {
      try {
        const props = await generateOptimizedImageProps(src, alt, {
          width,
          height,
          quality,
          priority,
          responsive
        });
        setOptimizedProps(props);

        // 중요한 이미지는 프리로드
        if (priority) {
          preloadImage(props.src).catch(() => {
            // 프리로드 실패는 무시
          });
        }
      } catch (error) {
        console.error('이미지 최적화 실패:', error);
        setOptimizedProps({
          src,
          alt,
          loading: priority ? 'eager' : 'lazy',
          decoding: 'async',
          fetchpriority: priority ? 'high' : 'low'
        });
      }
    };

    generateProps();
  }, [src, alt, width, height, quality, priority, responsive]);

  // 🚀 레이지 로딩 관찰자 설정
  useEffect(() => {
    if (!priority && imgRef.current && optimizedProps) {
      observerRef.current = createImageObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            const img = imgRef.current;
            if (optimizedProps.srcSet) {
              img.srcset = optimizedProps.srcSet;
            }
            img.src = optimizedProps.src;
            observerRef.current?.unobserve(img);
          }
        });
      });

      observerRef.current.observe(imgRef.current);

      return () => {
        if (observerRef.current && imgRef.current) {
          observerRef.current.unobserve(imgRef.current);
        }
      };
    }
  }, [priority, optimizedProps]);

  // 정리
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  if (!optimizedProps) {
    return (
      <div
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* 플레이스홀더 */}
      {!isLoaded && !isError && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{
            backgroundImage: placeholder ? `url(${placeholder})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {!placeholder && (
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* 에러 상태 */}
      {isError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-sm">이미지 로드 실패</div>
        </div>
      )}

      {/* 최적화된 이미지 */}
      <motion.img
        ref={imgRef}
        {...optimizedProps}
        className="w-full h-full object-cover"
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
        onLoad={handleLoad}
        onError={handleError}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        // 레이지 로딩이 아닌 경우 즉시 src 설정
        src={priority ? optimizedProps.src : undefined}
        srcSet={priority ? optimizedProps.srcSet : undefined}
      />
    </div>
  );
};

export default OptimizedImage;