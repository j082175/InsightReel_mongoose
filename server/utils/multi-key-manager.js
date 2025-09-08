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
    
    // 안전 마진 설정 (환경변수 또는 기본값)
    this.safetyMargin = parseInt(process.env.YOUTUBE_API_SAFETY_MARGIN) || 9500;
    
    this.initializeTrackers();
    
    ServerLogger.info(`🔑 YouTube API 키 ${this.keys.length}개 로드됨 (안전 마진: ${this.safetyMargin})`, null, 'MULTI-KEY');
  }
  
  /**
   * 키 목록 로드 (환경변수 + 설정파일)
   */
  loadKeys() {
    const keys = [];
    
    // 1. 기본 환경변수에서 로드
    const safetyMargin = parseInt(process.env.YOUTUBE_API_SAFETY_MARGIN) || 9500;
    const envKeys = [
      { name: '메인 키', key: process.env.GOOGLE_API_KEY, quota: safetyMargin },
      { name: '키 1', key: process.env.YOUTUBE_KEY_1, quota: safetyMargin },
      { name: '키 2', key: process.env.YOUTUBE_KEY_2, quota: safetyMargin },
      { name: '키 3', key: process.env.YOUTUBE_KEY_3, quota: safetyMargin }
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
   * 사용 가능한 키 찾기 (안전 마진 적용)
   */
  getAvailableKey() {
    for (const keyInfo of this.keys) {
      const keyData = this.trackers.get(keyInfo.key);
      const usage = keyData.tracker.getYouTubeUsage();
      
      // 안전 마진 체크 (API 호출 전 사전 차단)
      if (usage.total >= this.safetyMargin) {
        ServerLogger.warn(`⚠️ 키 ${keyInfo.name} 안전 마진 도달: ${usage.total}/${this.safetyMargin}`, null, 'MULTI-KEY');
        continue; // 다음 키 확인
      }
      
      // 기존 quota exceeded 체크도 유지 (이중 안전장치)
      if (!keyData.tracker.isYouTubeQuotaExceeded()) {
        ServerLogger.info(`✅ 사용 가능한 키: ${keyInfo.name} (사용량: ${usage.total}/${this.safetyMargin})`, null, 'MULTI-KEY');
        return {
          key: keyInfo.key,
          tracker: keyData.tracker,
          name: keyInfo.name
        };
      }
    }
    
    throw new Error(`🚨 모든 YouTube API 키의 할당량이 소진되었습니다 (${this.safetyMargin} 안전 마진 적용)`);
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
    
    ServerLogger.info(`🔍 [DEBUG] getAllUsageStatus 호출됨, 키 개수: ${this.keys.length}`, null, 'MULTI-KEY');
    
    this.keys.forEach((keyInfo, index) => {
      const keyData = this.trackers.get(keyInfo.key);
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
  logUsageStatus() {
    const status = this.getAllUsageStatus();
    
    ServerLogger.info(`📊 YouTube API 키별 사용량 (${this.safetyMargin} 안전 마진):`, null, 'MULTI-KEY');
    status.forEach(s => {
      const safetyUsage = `${s.usage.split('/')[0]}/${this.safetyMargin}`;
      const safetyPercentage = Math.round((parseInt(s.usage.split('/')[0]) / this.safetyMargin) * 100);
      const icon = safetyPercentage >= 100 ? '🚨' : safetyPercentage > 85 ? '⚠️' : '✅';
      ServerLogger.info(`  ${icon} ${s.name}: ${safetyUsage} (${safetyPercentage}%)`, null, 'MULTI-KEY');
    });
  }
}

module.exports = MultiKeyManager;