const mongoose = require('mongoose');
const VideoUrl = require('../server/models/VideoUrl');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkCurrentDuplicateData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('✅ MongoDB 연결 완료');
    
    // video_duplicate_check 컬렉션의 모든 데이터 확인
    const allRecords = await VideoUrl.find({});
    console.log(`\n📊 video_duplicate_check 총 레코드 수: ${allRecords.length}개`);
    
    if (allRecords.length > 0) {
      console.log('\n📋 현재 저장된 중복검사 레코드들:');
      allRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.normalizedUrl}`);
        console.log(`   - 플랫폼: ${record.platform}`);
        console.log(`   - 상태: ${record.status}`);
        console.log(`   - 생성일: ${record.createdAt}`);
        console.log(`   - 원본URL: ${record.originalUrl}`);
        if (record.sheetLocation) {
          console.log(`   - 시트위치: ${record.sheetLocation.sheetName} ${record.sheetLocation.column}${record.sheetLocation.row}`);
        }
        console.log('');
      });
      
      // 상태별 통계
      const statusStats = {};
      allRecords.forEach(record => {
        statusStats[record.status] = (statusStats[record.status] || 0) + 1;
      });
      console.log('📈 상태별 통계:', statusStats);
      
    } else {
      console.log('✅ 중복검사 컬렉션이 완전히 비어있습니다.');
    }
    
    // 정기 정리 작업이 실행되었는지 확인
    console.log('\n🧹 정기 정리 작업 수동 실행...');
    const cleanupResult = await VideoUrl.cleanupStaleProcessing();
    console.log(`정리 결과: ${cleanupResult.deletedCount}개 레코드 삭제`);
    
    // 정리 후 다시 확인
    const afterCleanup = await VideoUrl.countDocuments();
    console.log(`정리 후 남은 레코드: ${afterCleanup}개`);
    
    // 특정 URL 테스트
    const testUrl = 'https://www.instagram.com/reels/DOWFdokjhMb/';
    console.log(`\n🧪 테스트 URL 중복 검사: ${testUrl}`);
    
    const normalizedUrl = testUrl.toLowerCase().replace(/\/$/, '');
    console.log(`정규화된 URL: ${normalizedUrl}`);
    
    const duplicateCheck = await VideoUrl.checkDuplicate(normalizedUrl);
    console.log('중복 검사 결과:', duplicateCheck);
    
  } catch (error) {
    console.error('❌ 확인 실패:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

if (require.main === module) {
  checkCurrentDuplicateData();
}

module.exports = { checkCurrentDuplicateData };