const mongoose = require('mongoose');
const { ServerLogger } = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // MongoDB 사용 여부 체크
      if (!process.env.USE_MONGODB || process.env.USE_MONGODB !== 'true') {
        ServerLogger.info('🔄 MongoDB 사용 안함 - Google Sheets 모드', 'DATABASE');
        return false;
      }

      // 연결 문자열 체크
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다');
      }

      // 연결 옵션 설정 (Mongoose 8.x 호환)
      const options = {
        // 연결 풀 설정
        maxPoolSize: 10,
        minPoolSize: 2,
        
        // 타임아웃 설정 (더 관대하게)
        serverSelectionTimeoutMS: 30000,  // 30초로 증가
        socketTimeoutMS: 60000,           // 60초로 증가
        connectTimeoutMS: 30000,          // 연결 타임아웃 30초
        
        // 기타 옵션
        retryWrites: true,
        w: 'majority'
      };

      ServerLogger.info('🔗 MongoDB Atlas 연결 시도 중...', 'DATABASE');
      
      // Mongoose 연결
      this.connection = await mongoose.connect(process.env.MONGODB_URI, options);
      this.isConnected = true;
      
      ServerLogger.info('✅ MongoDB Atlas 연결 성공!', 'DATABASE');
      
      // 연결 상태 모니터링
      this.setupConnectionMonitoring();
      
      return true;
    } catch (error) {
      ServerLogger.error('❌ MongoDB 연결 실패', error.message, 'DATABASE');
      this.isConnected = false;
      throw error;
    }
  }

  setupConnectionMonitoring() {
    // 연결 끊김 감지
    mongoose.connection.on('disconnected', () => {
      ServerLogger.warn('⚠️ MongoDB 연결이 끊어졌습니다', '', 'DATABASE');
      this.isConnected = false;
    });

    // 연결 복구 감지
    mongoose.connection.on('reconnected', () => {
      ServerLogger.info('🔄 MongoDB 연결이 복구되었습니다', 'DATABASE');
      this.isConnected = true;
    });

    // 에러 감지
    mongoose.connection.on('error', (error) => {
      ServerLogger.error('💥 MongoDB 연결 에러', error.message, 'DATABASE');
      this.isConnected = false;
    });
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        ServerLogger.info('🔌 MongoDB 연결 해제 완료', 'DATABASE');
        this.isConnected = false;
      }
    } catch (error) {
      ServerLogger.error('❌ MongoDB 연결 해제 실패', error.message, 'DATABASE');
    }
  }

  // 헬스 체크
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'MongoDB 연결되지 않음' };
      }

      // 간단한 쿼리로 연결 상태 확인
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.ping();
      
      return { 
        status: 'connected', 
        message: 'MongoDB Atlas 정상 작동',
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message,
        details: null
      };
    }
  }

  // 연결 상태 확인
  isConnectedStatus() {
    return {
      connected: this.isConnected,
      readyState: mongoose.connection.readyState,
      // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
    };
  }
}

module.exports = new DatabaseManager();