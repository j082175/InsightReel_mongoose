const mongoose = require('mongoose');
const VideoUrl = require('../server/models/VideoUrl');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function clearProcessingRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('✅ MongoDB 연결 완료');
    
    // 현재 상태 확인
    const beforeCount = await VideoUrl.countDocuments();
    console.log(`현재 총 레코드: ${beforeCount}개`);
    
    const processingCount = await VideoUrl.countDocuments({ status: 'processing' });
    console.log(`processing 상태 레코드: ${processingCount}개`);
    
    // processing 상태의 모든 레코드 삭제
    const deleteResult = await VideoUrl.deleteMany({ status: 'processing' });
    console.log(`🗑️ processing 상태 레코드 ${deleteResult.deletedCount}개 삭제`);
    
    // 확인
    const afterCount = await VideoUrl.countDocuments();
    console.log(`삭제 후 남은 레코드: ${afterCount}개`);
    
    console.log('🎉 processing 레코드 정리 완료!');
    
  } catch (error) {
    console.error('❌ 삭제 실패:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

if (require.main === module) {
  clearProcessingRecords();
}

module.exports = { clearProcessingRecords };