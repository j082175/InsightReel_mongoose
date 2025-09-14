/**
 * 🎨 플랫폼별 브랜드 스타일링 유틸리티
 * 각 플랫폼의 브랜드 컬러와 그라데이션을 정의
 */

/**
 * 플랫폼별 스타일 클래스를 반환
 * @param platform - 플랫폼 이름 ('YOUTUBE' | 'INSTAGRAM' | 'TIKTOK')
 * @returns Tailwind CSS 클래스 문자열
 */
export const getPlatformStyle = (platform: string): string => {
  switch (platform) {
    case 'YOUTUBE':
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/30';
    case 'INSTAGRAM':
      return 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-purple-500/30';
    case 'TIKTOK':
      return 'bg-gradient-to-r from-black to-gray-800 text-white shadow-black/40';
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-500/30';
  }
};

/**
 * 플랫폼별 아이콘 색상 스타일을 반환
 * @param platform - 플랫폼 이름
 * @returns 아이콘용 색상 클래스
 */
export const getPlatformIconStyle = (platform: string): string => {
  switch (platform) {
    case 'YOUTUBE':
      return 'text-red-500';
    case 'INSTAGRAM':
      return 'text-pink-500';
    case 'TIKTOK':
      return 'text-black';
    default:
      return 'text-gray-500';
  }
};

/**
 * 플랫폼 타입 정의
 */
export type Platform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';

/**
 * 플랫폼 브랜드 컬러 정의
 */
export const PLATFORM_COLORS = {
  YOUTUBE: {
    primary: '#FF0000',
    gradient: ['#EF4444', '#DC2626'], // red-500 to red-600
  },
  INSTAGRAM: {
    primary: '#E4405F',
    gradient: ['#8B5CF6', '#EC4899', '#FB923C'], // purple-500 via pink-500 to orange-400
  },
  TIKTOK: {
    primary: '#000000',
    gradient: ['#000000', '#374151'], // black to gray-800
  },
} as const;