/**
 * 통합 유틸리티 모듈
 * 모든 유틸리티 클래스들을 한 곳에서 관리
 */

export { DOMUtils } from './dom-utils.js';
export { TimeUtils } from './time-utils.js';
export { StringUtils } from './string-utils.js';
export { FileUtils } from './file-utils.js';

/**
 * 레거시 호환성을 위한 통합 Utils 클래스
 * 기존 코드에서 Utils.method() 형태로 호출하던 것들을 지원
 */
export class Utils {
    // DOM 관련
    static safeQuerySelector = DOMUtils.safeQuerySelector;
    static safeQuerySelectorAll = DOMUtils.safeQuerySelectorAll;
    static isElementVisible = DOMUtils.isElementVisible;
    static createElement = DOMUtils.createElement;
    static injectStyles = DOMUtils.injectStyles;
    static safeRemove = DOMUtils.safeRemove;
    static safeClassList = DOMUtils.safeClassList;
    static safeAddEventListener = DOMUtils.safeAddEventListener;
    static safeRemoveEventListener = DOMUtils.safeRemoveEventListener;
    static findParent = DOMUtils.findParent;

    // 시간 관련
    static getCurrentTimestamp = TimeUtils.getCurrentTimestamp;
    static getCurrentUnixTimestamp = TimeUtils.getCurrentUnixTimestamp;
    static formatDate = TimeUtils.formatDate;
    static getRelativeTime = TimeUtils.getRelativeTime;
    static delay = TimeUtils.delay;
    static withTimeout = TimeUtils.withTimeout;
    static pollUntil = TimeUtils.pollUntil;
    static debounce = TimeUtils.debounce;
    static throttle = TimeUtils.throttle;
    static measurePerformance = TimeUtils.measurePerformance;
    static formatVideoTime = TimeUtils.formatVideoTime;

    // 문자열 관련
    static extractHashtags = StringUtils.extractHashtags;
    static extractMentions = StringUtils.extractMentions;
    static extractUrls = StringUtils.extractUrls;
    static sanitizeText = StringUtils.sanitizeText;
    static sanitizeFilename = StringUtils.sanitizeFilename;
    static truncate = StringUtils.truncate;
    static truncateWords = StringUtils.truncateWords;
    static toCamelCase = StringUtils.toCamelCase;
    static toKebabCase = StringUtils.toKebabCase;
    static toSnakeCase = StringUtils.toSnakeCase;
    static capitalize = StringUtils.capitalize;
    static toTitleCase = StringUtils.toTitleCase;
    static formatNumber = StringUtils.formatNumber;
    static parseInstagramNumber = StringUtils.parseInstagramNumber;
    static toBase64 = StringUtils.toBase64;
    static fromBase64 = StringUtils.fromBase64;
    static generateUniqueId = StringUtils.generateUniqueId;
    static isEmpty = StringUtils.isEmpty;
    static isNotEmpty = StringUtils.isNotEmpty;

    // 파일 관련
    static formatFileSize = FileUtils.formatFileSize;
    static getFileExtension = FileUtils.getFileExtension;
    static removeFileExtension = FileUtils.removeFileExtension;
    static getFileTypeFromMime = FileUtils.getFileTypeFromMime;
    static guessMimeType = FileUtils.guessMimeType;
    static blobToFile = FileUtils.blobToFile;
    static base64ToBlob = FileUtils.base64ToBlob;
    static blobToBase64 = FileUtils.blobToBase64;
    static canvasToBlob = FileUtils.canvasToBlob;
    static downloadFile = FileUtils.downloadFile;
    static readFile = FileUtils.readFile;
    static resizeImage = FileUtils.resizeImage;
    static validateFile = FileUtils.validateFile;

    // 플랫폼 감지 (기존 utils.js에서 이전)
    static detectPlatform() {
        const hostname = window.location.hostname;
        if (hostname.includes('instagram.com')) return 'INSTAGRAM';
        if (hostname.includes('tiktok.com')) return 'TIKTOK';
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
            return 'YOUTUBE';
        return null;
    }

    // 로그 출력 (기존 utils.js에서 이전)
    static log(level, message, data = null) {
        if (process.env.NODE_ENV === 'production') return;

        const timestamp = TimeUtils.getCurrentTimestamp();
        const prefix = `[VideoSaver ${timestamp}]`;

        switch (level) {
            case 'info':
                console.log(`${prefix} ℹ️ ${message}`, data || '');
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️ ${message}`, data || '');
                break;
            case 'error':
                console.error(`${prefix} ❌ ${message}`, data || '');
                break;
            case 'success':
                console.log(`${prefix} ✅ ${message}`, data || '');
                break;
            default:
                console.log(`${prefix} ${message}`, data || '');
        }
    }
}
