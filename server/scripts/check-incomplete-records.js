require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');

async function checkIncompleteRecords() {
  try {
    console.log('🔍 원본 게시일이 없는 레코드 분석...\n');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // 원본 게시일이 없는 레코드들
    const docsWithoutDate = await VideoUrl.find({ 
      $or: [
        { originalPublishDate: { $exists: false } },
        { originalPublishDate: null }
      ]
    }).lean();
    
    console.log(`\n📊 원본 게시일이 없는 레코드들 (총 ${docsWithoutDate.length}개):`);
    docsWithoutDate.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.platform.toUpperCase()}:`);
      console.log(`   URL: ${doc.originalUrl}`);
      console.log(`   상태: ${doc.status}`);
      console.log(`   생성시간: ${doc.createdAt.toLocaleString()}`);
      console.log(`   시트위치: ${doc.sheetLocation ? `${doc.sheetLocation.sheetName} 행${doc.sheetLocation.row}` : '없음'}`);
      
      // URL 길이나 특이사항 체크
      if (doc.originalUrl.length > 100) {
        console.log(`   ⚠️ 긴 URL (${doc.originalUrl.length}자)`);
      }
      if (!doc.originalUrl.includes('instagram.com') && !doc.originalUrl.includes('youtube.com') && !doc.originalUrl.includes('tiktok.com')) {
        console.log(`   ⚠️ 지원하지 않는 플랫폼 URL`);
      }
      console.log('');
    });
    
    // 플랫폼별 미완료 현황
    const platformIncomplete = await VideoUrl.aggregate([
      {
        $match: {
          $or: [
            { originalPublishDate: { $exists: false } },
            { originalPublishDate: null }
          ]
        }
      },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('📊 플랫폼별 미완료 현황:');
    platformIncomplete.forEach(stat => {
      console.log(`   ${stat._id.toUpperCase()}: ${stat.count}개`);
    });
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 확인 실패:', error.message);
  }
}

checkIncompleteRecords();