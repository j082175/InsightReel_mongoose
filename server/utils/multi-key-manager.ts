import { ServerLogger } from './logger';
import { YOUTUBE_API_LIMITS } from '../config/api-constants';
import { getInstance as getApiKeyManager, ApiKey } from '../services/ApiKeyManager';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import UsageTracker from './usage-tracker';
import * as serviceRegistry from './service-registry';

// .env 파일 로드
dotenv.config();

// Type definitions
interface KeyInfo {
    name: string;
    key: string;
    quota: number;
}

interface TrackerData {
    tracker: any;
    info: KeyInfo;
    index: number;
}

interface AvailableKeyResult {
    key: string;
    tracker: any;
    name: string;
}

interface UsageStatus {
    name: string;
    usage: string;
    percentage: number;
    remaining: number;
    exceeded: boolean;
}

/**
 * 여러 YouTube API 키 관리자 (싱글톤)
 */
class MultiKeyManager {
    private static instance: MultiKeyManager | null = null;
    private keys: KeyInfo[] = [];
    private trackers = new Map<string, TrackerData>();
    private safetyMargin!: number;
    private _initialized = false;

    constructor() {
        // 싱글톤 패턴: 이미 인스턴스가 있으면 반환
        if (MultiKeyManager.instance) {
            return MultiKeyManager.instance;
        }

        this.keys = []; // 초기값으로 빈 배열
        this.trackers = new Map();

        // 안전 마진 설정 (상수 파일에서 로드)
        this.safetyMargin = YOUTUBE_API_LIMITS.SAFETY_MARGIN;

        // 비동기 초기화는 별도 메서드에서 처리
        this._initialized = false;

        // 서비스 레지스트리에 등록
        if (serviceRegistry && typeof (serviceRegistry as any).register === 'function') {
            (serviceRegistry as any).register(this);
        }

        ServerLogger.info('🔑 MultiKeyManager 생성됨 (초기화 필요)', null, 'MULTI-KEY');

        // 싱글톤 인스턴스 저장
        MultiKeyManager.instance = this;
    }

    /**
     * 싱글톤 인스턴스 반환 (비동기 초기화)
     */
    static async getInstance(): Promise<MultiKeyManager> {
        if (!MultiKeyManager.instance) {
            MultiKeyManager.instance = new MultiKeyManager();
            await MultiKeyManager.instance.initialize();
        }
        return MultiKeyManager.instance;
    }

    /**
     * 키 목록 로드 (ApiKeyManager 우선 + 파일 폴백)
     */
    async loadKeys(): Promise<KeyInfo[]> {
        const keys: KeyInfo[] = [];
        const keySet = new Set<string>(); // 중복 제거용
        const safetyMargin = YOUTUBE_API_LIMITS.SAFETY_MARGIN;

        // 1. ApiKeyManager에서 활성 키 로드 (video analysis와 동일한 방식)
        try {
            const apiKeyManager = getApiKeyManager();
            await apiKeyManager.initialize();
            const activeApiKeys: ApiKey[] = await apiKeyManager.getActiveApiKeys();

            const managerKeys = activeApiKeys
                .filter(apiKeyObj => apiKeyObj && apiKeyObj.apiKey && !keySet.has(apiKeyObj.apiKey)) // 중복 제거 + null 체크
                .map((apiKeyObj, index) => {
                    keySet.add(apiKeyObj.apiKey);
                    return {
                        name: `${apiKeyObj.name || `API Key ${index + 1}`} (Manager)`,
                        key: apiKeyObj.apiKey,
                        quota: safetyMargin
                    };
                });

            keys.push(...managerKeys);
            ServerLogger.info(`🔑 ApiKeyManager에서 ${managerKeys.length}개 키 로드 완료`, null, 'MULTI-KEY');

            // ApiKeyManager에서 키를 성공적으로 로드했으면 파일 체크는 스킵
            if (managerKeys.length > 0) {
                ServerLogger.info(`✅ ApiKeyManager에서 충분한 키를 로드했으므로 파일 체크 생략`, null, 'MULTI-KEY');
                return keys;
            }
        } catch (error: any) {
            ServerLogger.warn('⚠️ ApiKeyManager 로드 실패, 파일 직접 로드 시도:', error.message, 'MULTI-KEY');
        }

        // 2. ApiKeyManager 실패 시에만 파일에서 직접 로드
        try {
            const apiKeysPath = path.join(__dirname, '../data/api-keys.json');
            if (fs.existsSync(apiKeysPath)) {
                const rawData = fs.readFileSync(apiKeysPath, 'utf8');
                const apiKeys = JSON.parse(rawData);

                ServerLogger.info(`🔍 파일에서 직접 로드: ${apiKeys.length}개 키 발견`, null, 'MULTI-KEY');

                const activeApiKeys = apiKeys
                    .filter((k: any) => {
                        const isValid = k && k.apiKey && k.status === 'active';
                        if (!isValid) {
                            ServerLogger.warn(`❌ 유효하지 않은 키 건너뛰기:`, {
                                hasKey: !!k,
                                hasApiKey: !!(k && k.apiKey),
                                status: k && k.status,
                                name: k && k.name
                            }, 'MULTI-KEY');
                        }
                        return isValid;
                    })
                    .filter((k: any) => !keySet.has(k.apiKey)) // 중복 제거
                    .map((k: any) => {
                        keySet.add(k.apiKey);
                        return {
                            name: k.name || 'Unknown Key',
                            key: k.apiKey,
                            quota: safetyMargin
                        };
                    });

                keys.push(...activeApiKeys);
                ServerLogger.info(`📁 API 키 파일에서 ${activeApiKeys.length}개 활성화 키 로드됨`, null, 'MULTI-KEY');
            } else {
                ServerLogger.warn('📁 API 키 파일이 존재하지 않음', null, 'MULTI-KEY');
            }
        } catch (error: any) {
            ServerLogger.error('❌ API 키 파일 로드 실패:', error, 'MULTI-KEY');
        }

        // 3. 최소 1개 키는 보장 (환경변수 fallback)
        if (keys.length === 0) {
            const envKey = process.env.YOUTUBE_API_KEY;
            if (envKey) {
                keys.push({
                    name: 'Environment Key (Fallback)',
                    key: envKey,
                    quota: safetyMargin
                });
                ServerLogger.info('🔑 환경변수 키 fallback 사용', null, 'MULTI-KEY');
            } else {
                ServerLogger.error('⚠️ 모든 키 로드 방법 실패! 사용 가능한 API 키가 없습니다!', null, 'MULTI-KEY');
            }
        }

        return keys;
    }

    /**
     * 각 키별 UsageTracker 초기화
     */
    initializeTrackers(): void {
        this.keys.forEach((keyInfo, index) => {
            const tracker = UsageTracker.getInstance(keyInfo.key);
            this.trackers.set(keyInfo.key, {
                tracker,
                info: keyInfo,
                index
            });
        });
    }

    /**
     * 사용 가능한 키 찾기 (안전 마진 적용)
     */
    getAvailableKey(): AvailableKeyResult {
        ServerLogger.info(`🔍 [DEBUG] getAvailableKey 호출됨, 안전마진: ${this.safetyMargin}, 키 개수: ${this.keys.length}`, null, 'MULTI-KEY');

        // 방어적 프로그래밍: 키가 없는 경우 조기 반환
        if (this.keys.length === 0) {
            ServerLogger.error(`🚨 로드된 API 키가 없습니다. MultiKeyManager 초기화 문제일 수 있습니다.`, null, 'MULTI-KEY');
            throw new Error('🚨 사용 가능한 API 키가 없습니다. MultiKeyManager 초기화를 확인하세요.');
        }

        for (const [index, keyInfo] of this.keys.entries()) {
            const keyData = this.trackers.get(keyInfo.key);

            // 방어적 프로그래밍: tracker가 없는 경우 스킵
            if (!keyData) {
                ServerLogger.warn(`⚠️ 키 ${index} (${keyInfo.name}) tracker 없음 - 다음 키로 전환`, null, 'MULTI-KEY');
                continue;
            }

            const usage = keyData.tracker.getYouTubeUsage();

            ServerLogger.info(`🔍 [DEBUG] 키 ${index} (${keyInfo.name}) 검사 중: usage.total=${usage.total}, usage.quota=${usage.quota}, safetyMargin=${this.safetyMargin}`, null, 'MULTI-KEY');

            // 안전 마진 체크 (API 호출 전 사전 차단)
            if (usage.total >= this.safetyMargin) {
                ServerLogger.warn(`⚠️ 키 ${keyInfo.name} 안전 마진 초과: ${usage.total}/${this.safetyMargin} - 다음 키로 전환`, null, 'MULTI-KEY');
                continue; // 다음 키 확인
            }

            // 추가 안전장치: isYouTubeQuotaExceeded 체크
            const isExceeded = keyData.tracker.isYouTubeQuotaExceeded();
            ServerLogger.info(`🔍 [DEBUG] 키 ${keyInfo.name} isYouTubeQuotaExceeded: ${isExceeded}`, null, 'MULTI-KEY');

            if (!isExceeded) {
                ServerLogger.info(`✅ 사용 가능한 키 발견: ${keyInfo.name} (사용량: ${usage.total}/${this.safetyMargin}, 실제할당량: ${usage.quota})`, null, 'MULTI-KEY');
                return {
                    key: keyInfo.key,
                    tracker: keyData.tracker,
                    name: keyInfo.name
                };
            } else {
                ServerLogger.warn(`⚠️ 키 ${keyInfo.name} isYouTubeQuotaExceeded=true - 다음 키로 전환`, null, 'MULTI-KEY');
            }
        }

        // 디버깅을 위한 상세 로그
        ServerLogger.error(`🚨 모든 YouTube API 키의 할당량이 소진됨`, {
            totalKeys: this.keys.length,
            safetyMargin: this.safetyMargin,
            keyNames: this.keys.map(k => k.name),
            trackerCount: this.trackers.size
        }, 'MULTI-KEY');

        throw new Error(`🚨 모든 YouTube API 키의 할당량이 소진되었습니다 (${this.safetyMargin} 안전 마진 적용)`);
    }

    /**
     * API 호출 후 사용량 추적
     */
    trackAPI(apiKey: string, endpoint: string, success = true): void {
        const keyData = this.trackers.get(apiKey);
        if (keyData) {
            keyData.tracker.trackAPI(endpoint, success);
        }
    }

    /**
     * 모든 키의 사용량 현황
     */
    getAllUsageStatus(): UsageStatus[] {
        const status: UsageStatus[] = [];

        ServerLogger.info(`🔍 [DEBUG] getAllUsageStatus 호출됨, 키 개수: ${this.keys.length}`, null, 'MULTI-KEY');

        this.keys.forEach((keyInfo, index) => {
            const keyData = this.trackers.get(keyInfo.key);
            if (!keyData) return;

            const usage = keyData.tracker.getYouTubeUsage();

            ServerLogger.info(`🔍 [DEBUG] 키 ${index}: ${keyInfo.name}, 사용량: ${usage.total}/${usage.quota}`, null, 'MULTI-KEY');

            status.push({
                name: keyInfo.name,
                usage: `${usage.total}/${usage.quota}`,
                percentage: Math.round((usage.total / usage.quota) * 100),
                remaining: usage.remaining,
                exceeded: keyData.tracker.isYouTubeQuotaExceeded()
            });
        });

        return status;
    }

    /**
     * 사용량 현황 로그 (안전 마진 기준)
     */
    logUsageStatus(): void {
        const status = this.getAllUsageStatus();

        ServerLogger.info(`📊 YouTube API 키별 사용량 (${this.safetyMargin} 안전 마진):`, null, 'MULTI-KEY');
        status.forEach(s => {
            const safetyUsage = `${s.usage.split('/')[0]}/${this.safetyMargin}`;
            const safetyPercentage = Math.round((parseInt(s.usage.split('/')[0]) / this.safetyMargin) * 100);
            const icon = safetyPercentage >= 100 ? '🚨' : safetyPercentage > 85 ? '⚠️' : '✅';
            ServerLogger.info(`  ${icon} ${s.name}: ${safetyUsage} (${safetyPercentage}%)`, null, 'MULTI-KEY');
        });
    }

    /**
     * MultiKeyManager 비동기 초기화
     */
    async initialize(): Promise<MultiKeyManager> {
        if (this._initialized) return this;

        try {
            this.keys = await this.loadKeys();
            this.initializeTrackers();
            this._initialized = true;

            ServerLogger.info(`🔑 MultiKeyManager 초기화 완료: ${this.keys.length}개 키 로드`, null, 'MULTI-KEY');
            return this;
        } catch (error) {
            ServerLogger.error('MultiKeyManager 초기화 실패:', error, 'MULTI-KEY');
            throw error;
        }
    }

    /**
     * ApiKeyManager에서 키 목록을 다시 로드하여 동기화
     */
    async initializeFromApiKeyManager(): Promise<void> {
        try {
            // 기존 trackers 정리
            this.trackers.clear();

            // 키 목록 다시 로드
            this.keys = await this.loadKeys();

            // 새로운 trackers 초기화
            this.initializeTrackers();

            ServerLogger.info(`🔄 MultiKeyManager 재초기화 완료: ${this.keys.length}개 키 로드`, null, 'MULTI-KEY');
        } catch (error) {
            ServerLogger.error('MultiKeyManager 재초기화 실패:', error, 'MULTI-KEY');
            throw error;
        }
    }

    /**
     * API 키 캐시 클리어 (파일 변경 시 호출)
     */
    clearApiKeyCache(): void {
        this.keys = [];
        this._initialized = false;
        this.trackers.clear();
        ServerLogger.info('🔄 MultiKeyManager API 키 캐시 클리어', null, 'MULTI-KEY-MANAGER');
    }
}

export default MultiKeyManager;
module.exports = MultiKeyManager;