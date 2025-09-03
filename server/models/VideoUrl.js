const mongoose = require('mongoose');

// 🔍 URL 중복 검사 전용 초경량 스키마 (성능 최적화)
const videoUrlSchema = new mongoose.Schema({
  // 정규화된 URL (검색 키)
  normalizedUrl: {
    type: String,
    required: true,
    unique: true,  // 🚨 중복 방지 제약조건
    index: true    // ⚡ 초고속 검색을 위한 인덱스
  },
  
  // 원본 URL (로그용)
  originalUrl: {
    type: String,
    required: true
  },
  
  // 플랫폼 정보 (빠른 분류)
  platform: {
    type: String,
    required: true,
    enum: ['instagram', 'youtube', 'tiktok'],
    index: true  // 플랫폼별 조회 최적화
  },
  
  // Google Sheets 위치 정보 (중복 발견시 안내용)
  sheetLocation: {
    sheetName: String,  // 시트명
    column: String,     // 컬럼 (예: W, L)
    row: Number        // 행 번호
  },
  
  // 생성 시간 (관리용)
  createdAt: {
    type: Date,
    default: Date.now,
    index: true  // 시간순 조회 최적화
  }
}, {
  // 스키마 옵션
  collection: 'video_urls',  // 컬렉션명
  versionKey: false         // __v 필드 제거 (성능 향상)
});

// 🚀 복합 인덱스 생성 (추가 성능 최적화)
videoUrlSchema.index({ platform: 1, createdAt: -1 });  // 플랫폼별 최신순

// 🔍 정적 메서드: URL 중복 검사 (초고속)
videoUrlSchema.statics.checkDuplicate = async function(normalizedUrl) {
  try {
    const existing = await this.findOne({ normalizedUrl }).lean(); // lean()으로 성능 향상
    
    if (existing) {
      return {
        isDuplicate: true,
        existingPlatform: existing.platform,
        existingRow: existing.sheetLocation?.row,
        existingColumn: existing.sheetLocation?.column,
        originalUrl: existing.originalUrl,
        createdAt: existing.createdAt
      };
    }
    
    return { isDuplicate: false };
    
  } catch (error) {
    console.error('MongoDB URL 중복 검사 실패:', error.message);
    return { isDuplicate: false, error: error.message };
  }
};

// 📝 정적 메서드: URL 등록 (새로운 URL 저장)
videoUrlSchema.statics.registerUrl = async function(normalizedUrl, originalUrl, platform, sheetLocation) {
  try {
    const urlDoc = new this({
      normalizedUrl,
      originalUrl,
      platform,
      sheetLocation
    });
    
    await urlDoc.save();
    
    console.log(`✅ URL 등록 완료: ${platform} - ${normalizedUrl}`);
    return { success: true, document: urlDoc };
    
  } catch (error) {
    // 중복 키 에러 (이미 존재하는 URL)
    if (error.code === 11000) {
      console.warn(`⚠️ URL 이미 존재: ${normalizedUrl}`);
      return { success: false, error: 'DUPLICATE_URL', message: 'URL이 이미 존재합니다.' };
    }
    
    console.error('URL 등록 실패:', error.message);
    return { success: false, error: error.message };
  }
};

// 📊 정적 메서드: 통계 조회
videoUrlSchema.statics.getStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          latest: { $max: '$createdAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const total = await this.countDocuments();
    
    return {
      total,
      byPlatform: stats,
      lastUpdated: new Date()
    };
    
  } catch (error) {
    console.error('URL 통계 조회 실패:', error.message);
    return { error: error.message };
  }
};

module.exports = mongoose.model('VideoUrl', videoUrlSchema);