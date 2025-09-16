/**
 * 🔍 개발용 로거 유틸리티
 * 프로덕션에서는 자동으로 비활성화됩니다.
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * 일반 정보 로그
   */
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },

  /**
   * API 요청/응답 로그
   */
  api: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`🌐 ${message}`, ...args);
    }
  },

  /**
   * 성공 메시지
   */
  success: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, ...args);
    }
  },

  /**
   * 디버깅용 로그
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, ...args);
    }
  },

  /**
   * 에러 로그 (프로덕션에서도 유지)
   */
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args);
  },

  /**
   * 경고 로그
   */
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },
};

export default logger;
