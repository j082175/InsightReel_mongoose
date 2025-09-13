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
    return {
      success: true,
      keyId: keyId,
      message: `API 키 '${name}'이 성공적으로 추가되었습니다.`,
      isDuplicate: false
    };
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

  validateApiKeyFormat(apiKey) {
    // YouTube API 키 형식 검증
    // 1. AIza로 시작
    // 2. 정확히 39자리
    // 3. 영문자, 숫자, 하이픈, 언더스코어만 허용
    // 4. 테스트 환경에서는 'test'로 시작하는 키도 허용
    
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // 테스트 환경 예외 처리
    if (process.env.NODE_ENV === 'test' && apiKey.startsWith('test')) {
      return true;
    }
    
    // YouTube API 키 형식 검증
    const youtubeApiKeyRegex = /^AIza[A-Za-z0-9_-]{35}$/;
    return youtubeApiKeyRegex.test(apiKey) && apiKey.length === 39;
  }

  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return '****';
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}

module.exports = new ApiKeyManager();