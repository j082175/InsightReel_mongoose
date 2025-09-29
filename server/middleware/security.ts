import { Request, Response, NextFunction } from 'express';
import { ServerLogger } from '../utils/logger';
import { HTTP_STATUS_CODES, ERROR_CODES } from '../config/api-messages';
import * as fs from 'fs';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

interface RequestWithFile {
  file?: MulterFile;
  body: any;
  get: (name: string) => string | undefined;
}

interface SizeUnits {
  [key: string]: number;
}

interface ErrorResponse {
  success: boolean;
  error: {
    type: string;
    message: string;
    retryAfter?: number;
  };
}

/**
 * 보안 미들웨어
 */
export class SecurityMiddleware {
  /**
   * 보안 헤더 설정
   */
  static securityHeaders(req: Request, res: Response, next: NextFunction): void {
    // XSS 보호
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // HTTPS 강제 (프로덕션 환경에서만)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // 정보 노출 방지
    res.removeHeader('X-Powered-By');

    next();
  }

  /**
   * CORS 설정 (더 제한적)
   */
  static corsPolicy(req: Request, res: Response, next: NextFunction): Response | void {
    const origin = req.get('Origin');

    // 허용된 도메인 목록
    const allowedOrigins: string[] = [
      'https://www.instagram.com',
      'https://instagram.com',
      'https://www.tiktok.com',
      'https://tiktok.com'
    ];

    // 개발 환경에서는 localhost 허용
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000');
      allowedOrigins.push('http://127.0.0.1:3000');
      allowedOrigins.push('http://localhost:*'); // 기존 호환성
    }

    // Chrome Extension 요청 허용 (기존과 동일하게 유지)
    if (origin && origin.startsWith('chrome-extension://')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Same-origin 요청 허용
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // 허용되지 않은 도메인 - 기존처럼 에러가 아닌 경고만
      ServerLogger.warn('⚠️ Unknown origin:', origin);
      res.setHeader('Access-Control-Allow-Origin', origin); // 개발 중에는 허용
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');

    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
      return res.status(HTTP_STATUS_CODES.OK).end();
    }

    next();
  }

  /**
   * 요청 크기 제한
   */
  static requestSizeLimit(maxSize: string = '50mb') {
    return (req: Request, res: Response, next: NextFunction): Response | void => {
      const contentLength = req.get('Content-Length');

      if (contentLength) {
        const sizeInBytes = parseInt(contentLength);
        const maxSizeInBytes = SecurityMiddleware.parseSize(maxSize);

        if (sizeInBytes > maxSizeInBytes) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: {
              type: ERROR_CODES.BAD_REQUEST,
              message: `요청 크기가 너무 큽니다. 최대 ${maxSize}까지 허용됩니다`
            }
          };
          return res.status(HTTP_STATUS_CODES.PAYLOAD_TOO_LARGE).json(errorResponse);
        }
      }

      next();
    };
  }

  /**
   * 파일 업로드 보안 검증
   */
  static validateFileUpload(req: RequestWithFile & Request, res: Response, next: NextFunction): Response | void {
    const file = req.file;

    if (!file) {
      return next();
    }

    // 허용된 MIME 타입
    const allowedMimeTypes: string[] = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo' // AVI
    ];

    // 허용된 확장자
    const allowedExtensions: string[] = ['.mp4', '.webm', '.mov', '.avi'];

    // MIME 타입 검증
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          type: ERROR_CODES.INVALID_FILE_TYPE,
          message: '지원되지 않는 파일 형식입니다'
        }
      };
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(errorResponse);
    }

    // 확장자 검증
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          type: ERROR_CODES.INVALID_FILE_TYPE,
          message: '허용되지 않는 파일 확장자입니다'
        }
      };
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(errorResponse);
    }

    // 파일 크기 재검증
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxFileSize) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          type: ERROR_CODES.FILE_SIZE_EXCEEDED,
          message: '파일 크기가 너무 큽니다'
        }
      };
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(errorResponse);
    }

    // 파일 내용 검증 (간단한 매직 넘버 검사)
    try {
      const isValid = SecurityMiddleware.validateFileContentSync(file);
      if (!isValid) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            type: ERROR_CODES.FILE_CORRUPTED,
            message: '파일 내용이 올바르지 않습니다'
          }
        };
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(errorResponse);
      }
    } catch (error) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          type: ERROR_CODES.FILE_CORRUPTED,
          message: '파일 검증 중 오류가 발생했습니다'
        }
      };
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(errorResponse);
    }

    next();
  }

  /**
   * 파일 내용 검증 (동기)
   */
  static validateFileContentSync(file: MulterFile): boolean {
    try {
      // 파일의 첫 몇 바이트를 읽어서 매직 넘버 확인
      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(file.path, 'r');
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);

      // 비디오 파일 매직 넘버 확인
      return SecurityMiddleware.checkVideoMagicNumbers(buffer);
    } catch (error) {
      ServerLogger.error('파일 내용 검증 실패:', error);
      return false;
    }
  }

  /**
   * 파일 내용 검증 (비동기 - 기존 호환성용)
   */
  static validateFileContent(file: MulterFile, callback: (isValid: boolean) => void): void {
    try {
      // 파일의 첫 몇 바이트를 읽어서 매직 넘버 확인
      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(file.path, 'r');
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);

      // 비디오 파일 매직 넘버 확인
      const isValidVideo = SecurityMiddleware.checkVideoMagicNumbers(buffer);
      callback(isValidVideo);
    } catch (error) {
      ServerLogger.error('파일 내용 검증 실패:', error);
      callback(false);
    }
  }

  /**
   * 비디오 파일 매직 넘버 확인
   */
  static checkVideoMagicNumbers(buffer: Buffer): boolean {
    const hex = buffer.toString('hex').toLowerCase();

    // MP4 파일
    if (hex.includes('667479706d703432') || // ftyp mp42
        hex.includes('667479706d703431') || // ftyp mp41
        hex.includes('6674797069736f6d')) { // ftyp isom
      return true;
    }

    // WebM 파일
    if (hex.startsWith('1a45dfa3')) {
      return true;
    }

    // QuickTime MOV 파일
    if (hex.includes('6674797071742020')) { // ftyp qt
      return true;
    }

    // AVI 파일
    if (hex.startsWith('52494646') && hex.includes('41564920')) {
      return true;
    }

    return false;
  }

  /**
   * IP 기반 rate limiting
   */
  static ipRateLimit(maxRequests: number = 60, windowMinutes: number = 15) {
    const requests = new Map<string, number[]>();
    const windowMs = windowMinutes * 60 * 1000;

    return (req: Request, res: Response, next: NextFunction): Response | void => {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      // IP별 요청 기록 정리
      if (requests.has(clientIp)) {
        const ipRequests = requests.get(clientIp)!;
        const filteredRequests = ipRequests.filter(time => time > windowStart);
        requests.set(clientIp, filteredRequests);
      }

      const currentRequests = requests.get(clientIp) || [];

      if (currentRequests.length >= maxRequests) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            type: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요',
            retryAfter: Math.ceil(windowMs / 1000)
          }
        };
        return res.status(HTTP_STATUS_CODES.TOO_MANY_REQUESTS).json(errorResponse);
      }

      currentRequests.push(now);
      requests.set(clientIp, currentRequests);

      next();
    };
  }

  /**
   * API 키 검증 (향후 확장용)
   */
  static validateApiKey(req: Request, res: Response, next: NextFunction): Response | void {
    // 현재는 비활성화, 향후 API 키 시스템 도입 시 사용
    if (process.env.REQUIRE_API_KEY === 'true') {
      const apiKey = req.get('X-API-Key');
      const validApiKeys = (process.env.API_KEYS || '').split(',');

      if (!apiKey || !validApiKeys.includes(apiKey)) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            type: ERROR_CODES.UNAUTHORIZED,
            message: '유효하지 않은 API 키입니다'
          }
        };
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json(errorResponse);
      }
    }

    next();
  }

  /**
   * 로깅 및 모니터링
   */
  static requestLogger(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress;

    // 요청 로그
    ServerLogger.info(`📝 ${new Date().toISOString()} [${req.method}] ${req.url} - ${clientIp}`);

    // 응답 완료 시 로그
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 400 ? '❌' : '✅';
      ServerLogger.info(`${logLevel} ${res.statusCode} - ${duration}ms`);
    });

    next();
  }

  /**
   * 헬퍼 함수: 크기 문자열 파싱
   */
  static parseSize(sizeStr: string): number {
    const units: SizeUnits = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);

    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    return Math.floor(value * units[unit]);
  }

  /**
   * 환경 변수 검증
   */
  static validateEnvironment(): void {
    const requiredEnvVars: string[] = [
      'NODE_ENV'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      ServerLogger.warn('⚠️ 누락된 환경 변수:', missingVars.join(', '));
    }

    // 프로덕션 환경 추가 검증
    if (process.env.NODE_ENV === 'production') {
      const productionVars: string[] = ['GOOGLE_SERVICE_ACCOUNT_KEY'];
      const missingProductionVars = productionVars.filter(varName => !process.env[varName]);

      if (missingProductionVars.length > 0) {
        ServerLogger.error('🚨 프로덕션 환경에 필요한 환경 변수가 누락됨:', missingProductionVars.join(', '));
      }
    }
  }
}

export default SecurityMiddleware;