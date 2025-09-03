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
  
  // 🔄 처리 상태 (중복 클릭 방지용)
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',  // 기본값: 처리 중
    index: true  // 상태별 조회 최적화
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
videoUrlSchema.index({ status: 1, createdAt: 1 });     // 상태별 처리 순서
videoUrlSchema.index({ normalizedUrl: 1, status: 1 }); // URL + 상태 조합 검색

// 🔍 정적 메서드: URL 중복 검사 (초고속) - 처리 중인 것도 중복으로 처리
videoUrlSchema.statics.checkDuplicate = async function(normalizedUrl) {
  try {
    // processing 또는 completed 상태인 URL 검색 (failed는 제외)
    const existing = await this.findOne({ 
      normalizedUrl,
      status: { $in: ['processing', 'completed'] }
    }).lean(); // lean()으로 성능 향상
    
    if (existing) {
      return {
        isDuplicate: true,
        existingPlatform: existing.platform,
        existingRow: existing.sheetLocation?.row,
        existingColumn: existing.sheetLocation?.column,
        originalUrl: existing.originalUrl,
        status: existing.status,
        createdAt: existing.createdAt,
        isProcessing: existing.status === 'processing'
      };
    }
    
    return { isDuplicate: false };
    
  } catch (error) {
    console.error('MongoDB URL 중복 검사 실패:', error.message);
    return { isDuplicate: false, error: error.message };
  }
};

// 📝 정적 메서드: URL 등록 (새로운 URL 저장) - processing 상태로 시작
videoUrlSchema.statics.registerUrl = async function(normalizedUrl, originalUrl, platform, sheetLocation) {
  try {
    const urlDoc = new this({
      normalizedUrl,
      originalUrl,
      platform,
      sheetLocation,
      status: 'processing'  // 처리 중 상태로 등록
    });
    
    await urlDoc.save();
    
    console.log(`✅ URL 등록 완료 (processing): ${platform} - ${normalizedUrl}`);
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

// 🔄 정적 메서드: 상태 업데이트
videoUrlSchema.statics.updateStatus = async function(normalizedUrl, status, sheetLocation = null) {
  try {
    const updateData = { status };
    
    // sheetLocation이 제공되면 업데이트
    if (sheetLocation) {
      updateData.sheetLocation = sheetLocation;
    }
    
    const result = await this.updateOne(
      { normalizedUrl },
      updateData
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ URL 상태 업데이트: ${normalizedUrl} -> ${status}`);
      return { success: true };
    } else {
      console.warn(`⚠️ URL 상태 업데이트 실패 (찾을 수 없음): ${normalizedUrl}`);
      return { success: false, error: 'URL_NOT_FOUND' };
    }
    
  } catch (error) {
    console.error('URL 상태 업데이트 실패:', error.message);
    return { success: false, error: error.message };
  }
};

// 🧹 정적 메서드: 오래된 processing 상태 정리 (10분 이상)
videoUrlSchema.statics.cleanupStaleProcessing = async function() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await this.deleteMany({
      status: 'processing',
      createdAt: { $lt: tenMinutesAgo }
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 오래된 processing 레코드 정리: ${result.deletedCount}개`);
    }
    
    return { success: true, deletedCount: result.deletedCount };
    
  } catch (error) {
    console.error('오래된 processing 레코드 정리 실패:', error.message);
    return { success: false, error: error.message };
  }
};

// 📊 정적 메서드: 통계 조회 (상태별 포함)
videoUrlSchema.statics.getStats = async function() {
  try {
    const platformStats = await this.aggregate([
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
    
    const statusStats = await this.aggregate([
      {
        $group: {
          _id: '$status',
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
      byPlatform: platformStats,
      byStatus: statusStats,
      lastUpdated: new Date()
    };
    
  } catch (error) {
    console.error('URL 통계 조회 실패:', error.message);
    return { error: error.message };
  }
};

module.exports = mongoose.model('VideoUrl', videoUrlSchema);