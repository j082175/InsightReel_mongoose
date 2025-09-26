/**
 * 서버용 통합 로깅 시스템
 * Extension의 Logger와 호환되는 인터페이스 제공
 */

type LogLevel = 'info' | 'warn' | 'error' | 'success';

export class ServerLogger {
  /**
   * 통합 로깅 메서드
   * @param level - 로그 레벨 (info, warn, error, success)
   * @param message - 로그 메시지
   * @param data - 추가 데이터 (선택적)
   * @param service - 서비스 이름 (선택적)
   */
  static log(level: LogLevel, message: string, data: any = null, service: string = 'SERVER') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}][${service.toUpperCase()}]`;

    // 이모지 맵핑
    const emojiMap: Record<LogLevel, string> = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };

    const emoji = emojiMap[level] || 'ℹ️';
    const fullMessage = `${prefix} ${emoji} ${message}`;

    switch(level) {
      case 'error':
        if (data) {
          console.error(fullMessage, data);
        } else {
          console.error(fullMessage);
        }
        break;

      case 'warn':
        if (data) {
          console.warn(fullMessage, data);
        } else {
          console.warn(fullMessage);
        }
        break;

      case 'success':
      case 'info':
      default:
        if (data) {
          console.log(fullMessage, data);
        } else {
          console.log(fullMessage);
        }
        break;
    }
  }

  /**
   * 정보 로그
   */
  static info(message: string, data: any = null, service: string = 'SERVER') {
    this.log('info', message, data, service);
  }

  /**
   * 경고 로그
   */
  static warn(message: string, data: any = null, service: string = 'SERVER') {
    this.log('warn', message, data, service);
  }

  /**
   * 에러 로그
   */
  static error(message: string, data: any = null, service: string = 'SERVER') {
    this.log('error', message, data, service);
  }

  /**
   * 성공 로그
   */
  static success(message: string, data: any = null, service: string = 'SERVER') {
    this.log('success', message, data, service);
  }

  /**
   * 디버그 로그 (개발용)
   */
  static debug(message: string, data: any = null, service: string = 'SERVER') {
    // 개발 환경에서만 출력
    if (process.env.NODE_ENV !== 'production') {
      this.log('info', `🐛 DEBUG: ${message}`, data, service);
    }
  }

  /**
   * API 요청 로그 (특별 포맷)
   */
  static apiRequest(method: string, path: string, statusCode: number, processingTime: number | null = null) {
    const emoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    const timeInfo = processingTime ? ` (${processingTime}ms)` : '';
    this.log('info', `${emoji} ${method} ${path} → ${statusCode}${timeInfo}`, null, 'API');
  }

  /**
   * 성능 로그 (처리 시간 포함)
   */
  static performance(operation: string, startTime: number, data: any = null, service: string = 'PERF') {
    const endTime = Date.now();
    const duration = endTime - startTime;
    this.log('info', `⚡ ${operation} 완료 (${duration}ms)`, data, service);
  }
}
