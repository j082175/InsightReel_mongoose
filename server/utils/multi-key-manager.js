const UsageTracker = require('./usage-tracker');
const { ServerLogger } = require('./logger');
const fs = require('fs');
const path = require('path');

// .env 파일 로드
require('dotenv').config();

/**
 * 여러 YouTube API 키 관리자
 */
class MultiKeyManager {
  constructor() {
    this.keys = this.loadKeys();
    this.trackers = new Map();
    this.initializeTrackers();
    
    ServerLogger.info(`🔑 YouTube API 키 ${this.keys.length}개 로드됨`, null, 'MULTI-KEY');
  }
  
  /**
   * 키 목록 로드 (환경변수 + 설정파일)
   */
  loadKeys() {
    const keys = [];
    
    // 1. 기본 환경변수에서 로드
    const envKeys = [
      { name: '메인 키', key: process.env.GOOGLE_API_KEY, quota: 9500 }, // 안전 마진 적용
      { name: '키 1', key: process.env.YOUTUBE_KEY_1, quota: 9500 }, // 안전 마진 적용
      { name: '키 2', key: process.env.YOUTUBE_KEY_2, quota: 9500 }, // 안전 마진 적용
      { name: '키 3', key: process.env.YOUTUBE_KEY_3, quota: 9500 } // 안전 마진 적용
    ].filter(item => item.key); // 유효한 키만 필터
    
    keys.push(...envKeys);
    
    // 2. 설정 파일에서 추가 로드 (선택사항)
    try {
      const configPath = path.join(__dirname, '../../config/youtube-keys.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        keys.push(...config.keys.filter(k => k.enabled));
      }
    } catch (error) {
      ServerLogger.warn('키 설정 파일 로드 실패', error.message, 'MULTI-KEY');
    }
    
    return keys;
  }
  
  /**
   * 각 키별 UsageTracker 초기화
   */
  initializeTrackers() {
    this.keys.forEach((keyInfo, index) => {
      const tracker = new UsageTracker(keyInfo.key);
      this.trackers.set(keyInfo.key, {
        tracker,
        info: keyInfo,
        index
      });
    });
  }
  
  /**
   * 사용 가능한 키 찾기
   */
  getAvailableKey() {
    for (const keyInfo of this.keys) {
      const keyData = this.trackers.get(keyInfo.key);
      
      if (!keyData.tracker.isYouTubeQuotaExceeded()) {
        ServerLogger.info(`✅ 사용 가능한 키: ${keyInfo.name}`, null, 'MULTI-KEY');
        return {
          key: keyInfo.key,
          tracker: keyData.tracker,
          name: keyInfo.name
        };
      }
    }
    
    throw new Error('🚨 모든 YouTube API 키의 할당량이 소진되었습니다');
  }
  
  /**
   * API 호출 후 사용량 추적
   */
  trackAPI(apiKey, endpoint, success = true) {
    const keyData = this.trackers.get(apiKey);
    if (keyData) {
      keyData.tracker.trackAPI(endpoint, success);
    }
  }
  
  /**
   * 모든 키의 사용량 현황
   */
  getAllUsageStatus() {
    const status = [];
    
    this.keys.forEach(keyInfo => {
      const keyData = this.trackers.get(keyInfo.key);
      const usage = keyData.tracker.getYouTubeUsage();
      
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
   * 사용량 현황 로그
   */
  logUsageStatus() {
    const status = this.getAllUsageStatus();
    
    ServerLogger.info('📊 YouTube API 키별 사용량:', null, 'MULTI-KEY');
    status.forEach(s => {
      const icon = s.exceeded ? '🚨' : s.percentage > 80 ? '⚠️' : '✅';
      ServerLogger.info(`  ${icon} ${s.name}: ${s.usage} (${s.percentage}%)`, null, 'MULTI-KEY');
    });
  }
}

module.exports = MultiKeyManager;