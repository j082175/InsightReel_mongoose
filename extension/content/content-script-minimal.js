/**
 * 최소 기능 Content Script
 * 빌드 문제를 우회하고 기본 기능만 제공
 */

// 기본 유틸리티
class MinimalUtils {
    static detectPlatform() {
        const hostname = window.location.hostname;
        if (hostname.includes('instagram.com')) return 'INSTAGRAM';
        if (hostname.includes('tiktok.com')) return 'TIKTOK';
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
            return 'YOUTUBE';
        return null;
    }

    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
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

// 환경 설정 (빌드 시 주입됨)
const environment = {
    SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || null,
    isDevelopment: process.env.NODE_ENV === 'development',
};

// 기본 API 클라이언트
class MinimalApiClient {
    constructor(serverUrl = environment.SERVER_URL) {
        this.serverUrl = serverUrl;
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                timeout: 5000,
            });
            return response.ok;
        } catch (error) {
            MinimalUtils.log('error', 'Server connection failed', error);
            return false;
        }
    }
}

// 메인 Content Script 클래스
class MinimalContentScript {
    constructor() {
        this.platform = MinimalUtils.detectPlatform();
        this.apiClient = new MinimalApiClient();
        this.init();
    }

    init() {
        MinimalUtils.log('info', 'Minimal Content Script 시작', {
            platform: this.platform,
            url: window.location.href,
            environment: environment.NODE_ENV,
        });

        if (!this.platform) {
            MinimalUtils.log(
                'warn',
                '지원되지 않는 플랫폼',
                window.location.hostname,
            );
            return;
        }

        // 서버 연결 확인
        this.checkServerConnection();

        // Chrome Extension 메시지 리스너
        this.setupMessageListeners();

        // 환경변수 설정 확인
        this.validateEnvironment();
    }

    async checkServerConnection() {
        try {
            const isConnected = await this.apiClient.checkConnection();
            if (isConnected) {
                MinimalUtils.log('success', '서버 연결 확인됨');
            } else {
                MinimalUtils.log('warn', '서버 연결 실패 - 기본 모드로 실행');
            }
        } catch (error) {
            MinimalUtils.log('error', '서버 연결 확인 중 오류', error);
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener(
            (request, sender, sendResponse) => {
                this.handleMessage(request, sender, sendResponse);
                return true;
            },
        );
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'ping':
                    sendResponse({
                        success: true,
                        message: 'Content Script 응답',
                    });
                    break;

                case 'getStatus':
                    sendResponse({
                        success: true,
                        data: {
                            platform: this.platform,
                            serverUrl: environment.SERVER_URL,
                            environment: environment.NODE_ENV,
                        },
                    });
                    break;

                default:
                    sendResponse({ error: '알 수 없는 액션입니다.' });
            }
        } catch (error) {
            MinimalUtils.log('error', '메시지 처리 실패', error.message);
            sendResponse({ error: error.message });
        }
    }

    validateEnvironment() {
        MinimalUtils.log('info', '환경 설정 확인', {
            serverUrl: environment.SERVER_URL,
            nodeEnv: environment.NODE_ENV,
            hasApiKey: !!environment.GOOGLE_API_KEY,
            isDevelopment: environment.isDevelopment,
        });

        if (!environment.GOOGLE_API_KEY) {
            MinimalUtils.log(
                'warn',
                'GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.',
            );
        }
    }
}

// Content Script 실행
try {
    const contentScript = new MinimalContentScript();

    // 디버깅용 글로벌 접근
    if (environment.isDevelopment) {
        window.MinimalContentScript = contentScript;
        window.MinimalUtils = MinimalUtils;
        window.environment = environment;
    }
} catch (error) {
    console.error('❌ Minimal Content Script 실행 오류:', error);
    console.error('오류 위치:', error.stack);
}
