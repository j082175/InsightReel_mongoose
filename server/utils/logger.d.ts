/**
 * ServerLogger 타입 정의 파일
 * JavaScript logger.js의 TypeScript 타입 정의
 */

export class ServerLogger {
    static log(level: string, message: string, data?: any, service?: string): void;
    static info(message: string, data?: any): void;
    static warn(message: string, data?: any): void;
    static error(message: string, data?: any): void;
    static success(message: string, data?: any): void;
    static debug(message: string, data?: any): void;
}