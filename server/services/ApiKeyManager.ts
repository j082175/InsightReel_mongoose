import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerLogger } from '../utils/logger';

// Type definitions for ApiKeyManager
export interface ApiKey {
  id: string;
  name: string;
  apiKey: string;
  source: 'file' | 'env';
  createdAt: string;
  status: 'active' | 'inactive' | 'expired';
}

export interface AddApiKeyResult {
  success: boolean;
  keyId: string;
  message: string;
  isDuplicate: boolean;
}

export interface ApiKeyStats {
  total: number;
  active: number;
  inactive: number;
  fromFile: number;
  fromEnv: number;
}

class ApiKeyManager {
  private configPath: string;
  private apiKeys: Map<string, ApiKey>;
  private initialized: boolean;

  constructor() {
    this.configPath = path.join(__dirname, '..', 'data', 'api-keys.json');
    this.apiKeys = new Map();
    this.initialized = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadFromFile();
      await this.migrateFromEnv(); // 일회성 마이그레이션
      this.initialized = true;
      ServerLogger.info('🔑 API 키 관리자 초기화 완료');
    } catch (error: any) {
      ServerLogger.error('❌ API 키 관리자 초기화 실패:', error);
      this.initialized = true; // 실패해도 계속 진행
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      const data = await fs.readFile(this.configPath, 'utf8');
      const savedKeys: ApiKey[] = JSON.parse(data);

      savedKeys.forEach(key => {
        this.apiKeys.set(key.id, {
          ...key,
          source: 'file'
        });
      });

      ServerLogger.info(`📁 파일에서 ${savedKeys.length}개 API 키 로드`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        ServerLogger.warn('⚠️ API 키 파일 로드 실패:', error.message);
      }
    }
  }

  private async migrateFromEnv(): Promise<void> {
    // 환경변수에서 키들을 추출 (중복 제거)
    const envKeys = new Map<string, string>();

    // YouTube API 키들 검색
    Object.keys(process.env).forEach(key => {
      if (key.includes('YOUTUBE') && key.includes('API')) {
        const value = process.env[key];
        if (value && this.validateApiKeyFormat(value)) {
          envKeys.set(key, value);
        }
      }
    });

    let newKeyCount = 0;
    for (const [envName, apiKey] of Array.from(envKeys.entries())) {
      // 이미 존재하는 키인지 확인
      const existing = Array.from(this.apiKeys.values())
        .find(key => key.apiKey === apiKey);

      if (!existing) {
        const keyId = `env-${envName.toLowerCase()}`;
        this.apiKeys.set(keyId, {
          id: keyId,
          name: `환경변수 키 (${envName})`,
          apiKey,
          source: 'env',
          createdAt: new Date().toISOString(),
          status: 'active'
        });
        newKeyCount++;
      }
    }

    if (newKeyCount > 0) {
      await this.saveToFile();
      ServerLogger.info(`🔄 환경변수에서 ${newKeyCount}개 새 키 마이그레이션 완료`);
    } else {
      ServerLogger.info('ℹ️ 마이그레이션할 새로운 환경변수 키 없음');
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const allKeys = Array.from(this.apiKeys.values());
      await fs.writeFile(this.configPath, JSON.stringify(allKeys, null, 2), 'utf8');
      ServerLogger.info(`💾 ${allKeys.length}개 API 키를 파일에 저장`);
    } catch (error: any) {
      ServerLogger.error('❌ API 키 파일 저장 실패:', error);
      throw error;
    }
  }

  async addApiKey(name: string, apiKey: string): Promise<AddApiKeyResult> {
    await this.initialize();

    // 중복 검사
    const existing = Array.from(this.apiKeys.values())
      .find(key => key.apiKey === apiKey);

    if (existing) {
      // 중복 키의 경우 에러 대신 성공으로 처리하되 메시지로 알림
      ServerLogger.warn(`중복 API 키 추가 시도: ${existing.name} (기존 키 유지)`, 'API_KEY');
      return {
        success: true,
        keyId: existing.id,
        message: `이미 등록된 API 키입니다. 기존 키 '${existing.name}'을 사용합니다.`,
        isDuplicate: true
      };
    }

    // YouTube API 키 형식 검증 (엄격한 조건)
    if (!this.validateApiKeyFormat(apiKey)) {
      throw new Error('유효하지 않은 YouTube API 키 형식입니다. (AIza로 시작하는 39자리 영숫자)');
    }

    const keyId = `user-key-${Date.now()}`;
    const newKey: ApiKey = {
      id: keyId,
      name: name.trim(),
      apiKey,
      source: 'file',
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    this.apiKeys.set(keyId, newKey);
    await this.saveToFile();

    ServerLogger.info('✅ 새 API 키 추가:', { id: keyId, name });
    return {
      success: true,
      keyId: keyId,
      message: `API 키 '${name}'이 성공적으로 추가되었습니다.`,
      isDuplicate: false
    };
  }

  async removeApiKey(keyId: string): Promise<boolean> {
    await this.initialize();

    const key = this.apiKeys.get(keyId);
    if (!key) {
      throw new Error(`API 키를 찾을 수 없습니다: ${keyId}`);
    }

    this.apiKeys.delete(keyId);
    await this.saveToFile();

    ServerLogger.info('🗑️ API 키 삭제:', { id: keyId, name: key.name });
    return true;
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    await this.initialize();
    return Array.from(this.apiKeys.values());
  }

  async getActiveApiKeys(): Promise<ApiKey[]> {
    await this.initialize();
    return Array.from(this.apiKeys.values())
      .filter(key => key.status === 'active');
  }

  async getApiKeyById(keyId: string): Promise<ApiKey | null> {
    await this.initialize();
    return this.apiKeys.get(keyId) || null;
  }

  async updateApiKeyStatus(keyId: string, status: 'active' | 'inactive' | 'expired'): Promise<boolean> {
    await this.initialize();

    const key = this.apiKeys.get(keyId);
    if (!key) {
      throw new Error(`API 키를 찾을 수 없습니다: ${keyId}`);
    }

    key.status = status;
    await this.saveToFile();

    ServerLogger.info('🔄 API 키 상태 변경:', { id: keyId, status });
    return true;
  }

  private validateApiKeyFormat(apiKey: string): boolean {
    // YouTube API 키는 AIza로 시작하고 39자리
    return /^AIza[A-Za-z0-9_-]{35}$/.test(apiKey);
  }

  async getStats(): Promise<ApiKeyStats> {
    await this.initialize();
    const allKeys = Array.from(this.apiKeys.values());

    return {
      total: allKeys.length,
      active: allKeys.filter(key => key.status === 'active').length,
      inactive: allKeys.filter(key => key.status === 'inactive').length,
      fromFile: allKeys.filter(key => key.source === 'file').length,
      fromEnv: allKeys.filter(key => key.source === 'env').length
    };
  }

  async validateAllKeys(): Promise<{
    valid: ApiKey[];
    invalid: ApiKey[];
  }> {
    await this.initialize();
    const allKeys = Array.from(this.apiKeys.values());

    const valid: ApiKey[] = [];
    const invalid: ApiKey[] = [];

    allKeys.forEach(key => {
      if (this.validateApiKeyFormat(key.apiKey)) {
        valid.push(key);
      } else {
        invalid.push(key);
      }
    });

    return { valid, invalid };
  }

  // 백업 기능
  async createBackup(): Promise<string> {
    await this.initialize();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      path.dirname(this.configPath),
      `api-keys-backup-${timestamp}.json`
    );

    const allKeys = Array.from(this.apiKeys.values());
    await fs.writeFile(backupPath, JSON.stringify(allKeys, null, 2), 'utf8');

    ServerLogger.info('📦 API 키 백업 생성:', { path: backupPath });
    return backupPath;
  }

  async restoreFromBackup(backupPath: string): Promise<number> {
    try {
      const data = await fs.readFile(backupPath, 'utf8');
      const backupKeys: ApiKey[] = JSON.parse(data);

      // 기존 키 백업
      await this.createBackup();

      // 새 키로 교체
      this.apiKeys.clear();
      backupKeys.forEach(key => {
        this.apiKeys.set(key.id, key);
      });

      await this.saveToFile();

      ServerLogger.info('🔄 백업에서 API 키 복원 완료:', {
        path: backupPath,
        count: backupKeys.length
      });

      return backupKeys.length;
    } catch (error: any) {
      ServerLogger.error('❌ 백업 복원 실패:', error);
      throw error;
    }
  }

  // 정리 함수
  async cleanup(): Promise<void> {
    this.apiKeys.clear();
    this.initialized = false;
    ServerLogger.info('🧹 ApiKeyManager 정리 완료');
  }
}

// 싱글톤 인스턴스
let instance: ApiKeyManager | null = null;

export function getInstance(): ApiKeyManager {
  if (!instance) {
    instance = new ApiKeyManager();
  }
  return instance;
}

export { ApiKeyManager };
export default ApiKeyManager;