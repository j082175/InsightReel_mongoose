const fs = require('fs').promises;
const path = require('path');
const { ServerLogger } = require('../utils/logger');

class ApiKeyManager {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'data', 'api-keys.json');
    this.apiKeys = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.loadFromFile();
      await this.migrateFromEnv(); // 일회성 마이그레이션
      this.initialized = true;
      ServerLogger.info('🔑 API 키 관리자 초기화 완료');
    } catch (error) {
      ServerLogger.error('❌ API 키 관리자 초기화 실패:', error);
      this.initialized = true; // 실패해도 계속 진행
    }
  }

  async loadFromFile() {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      const data = await fs.readFile(this.configPath, 'utf8');
      const savedKeys = JSON.parse(data);
      
      savedKeys.forEach(key => {
        this.apiKeys.set(key.id, {
          ...key,
          source: 'file'
        });
      });
      
      ServerLogger.info(`📁 파일에서 ${savedKeys.length}개 API 키 로드`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        ServerLogger.warn('⚠️ API 키 파일 로드 실패:', error.message);
      }
    }
  }

  async migrateFromEnv() {
    // 환경변수에서 키들을 추출 (중복 제거)
    const envKeys = [
      process.env.GOOGLE_API_KEY,
      process.env.YOUTUBE_KEY_1,
      process.env.YOUTUBE_KEY_2,  
      process.env.YOUTUBE_KEY_3,
      process.env.YOUTUBE_API_KEY,
      process.env.YOUTUBE_API_KEY_2,
      process.env.YOUTUBE_API_KEY_3,
      process.env.YOUTUBE_API_KEY_4
    ].filter(key => key);

    // 중복 제거
    const uniqueKeys = [...new Set(envKeys)];
    
    let migratedCount = 0;
    
    uniqueKeys.forEach((key, index) => {
      // 이미 파일에 존재하는 키인지 확인
      const existing = Array.from(this.apiKeys.values())
        .find(k => k.apiKey === key);
      
      if (!existing) {
        const keyId = `migrated-key-${Date.now()}-${index}`;
        this.apiKeys.set(keyId, {
          id: keyId,
          name: `API Key ${index + 1}`,
          apiKey: key,
          source: 'file', // 이제 모든 키가 file 소스
          createdAt: new Date().toISOString(),
          status: 'active'
        });
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      await this.saveToFile();
      ServerLogger.info(`✅ 환경변수에서 ${migratedCount}개 키를 파일로 마이그레이션 완료`);
    } else {
      ServerLogger.info(`ℹ️ 마이그레이션할 새로운 환경변수 키 없음`);
    }
  }

  async saveToFile() {
    try {
      // 이제 모든 키가 file 소스이므로 필터링 불필요
      const allKeys = Array.from(this.apiKeys.values());
      
      await fs.writeFile(this.configPath, JSON.stringify(allKeys, null, 2), 'utf8');
      ServerLogger.info(`💾 ${allKeys.length}개 API 키를 파일에 저장`);
    } catch (error) {
      ServerLogger.error('❌ API 키 파일 저장 실패:', error);
      throw error;
    }
  }

  async addApiKey(name, apiKey) {
    await this.initialize();
    
    // 중복 검사
    const existing = Array.from(this.apiKeys.values())
      .find(key => key.apiKey === apiKey);
    
    if (existing) {
      throw new Error('이미 등록된 API 키입니다.');
    }

    // YouTube API 키 형식 검증 (완화된 조건)
    if (!apiKey.startsWith('AIza') && !apiKey.includes('test')) {
      throw new Error('유효하지 않은 YouTube API 키 형식입니다.');
    }

    const keyId = `user-key-${Date.now()}`;
    const newKey = {
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
    return newKey;
  }

  async deleteApiKey(keyId) {
    await this.initialize();
    
    const key = this.apiKeys.get(keyId);
    if (!key) {
      throw new Error('존재하지 않는 API 키입니다.');
    }

    // 이제 모든 키가 삭제 가능
    this.apiKeys.delete(keyId);
    await this.saveToFile();
    
    ServerLogger.info('🗑️ API 키 삭제:', { id: keyId, name: key.name });
    return true;
  }

  async getAllApiKeys() {
    await this.initialize();
    return Array.from(this.apiKeys.values());
  }

  async getActiveApiKeys() {
    await this.initialize();
    return Array.from(this.apiKeys.values())
      .filter(key => key.status !== 'disabled')
      .map(key => key.apiKey);
  }

  async updateKeyStatus(keyId, status) {
    await this.initialize();
    
    const key = this.apiKeys.get(keyId);
    if (!key) {
      throw new Error('존재하지 않는 API 키입니다.');
    }

    key.status = status;
    key.updatedAt = new Date().toISOString();
    
    // 이제 모든 키가 파일에 저장됨
    await this.saveToFile();
    
    ServerLogger.info('🔄 API 키 상태 변경:', { id: keyId, status });
    return key;
  }

  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return '****';
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}

module.exports = new ApiKeyManager();