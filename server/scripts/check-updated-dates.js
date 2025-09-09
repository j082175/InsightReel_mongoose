require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');

async function checkUpdatedDates() {
  try {
    console.log('🔍 원본 게시일 업데이트 결과 확인...\n');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // 원본 게시일이 있는 레코드들
    const docsWithDate = await VideoUrl.find({ 
      originalPublishDate: { $exists: true, $ne: null } 
    }).lean();
    
    console.log('\n📊 원본 게시일이 있는 레코드들:');
    docsWithDate.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.platform.toUpperCase()}:`);
      console.log(`   원본 URL: ${doc.originalUrl}`);
      console.log(`   원본 게시일: ${doc.originalPublishDate.toLocaleString()}`);
      console.log(`   처리 시간: ${doc.processedAt ? doc.processedAt.toLocaleString() : '미완료'}`);
      console.log(`   생성 시간: ${doc.createdAt.toLocaleString()}`);
      console.log('');
    });
    
    // 통계
    const totalDocs = await VideoUrl.countDocuments();
    const docsWithoutDate = totalDocs - docsWithDate.length;
    
    console.log(`📊 최종 통계:`);
    console.log(`   전체 레코드: ${totalDocs}개`);
    console.log(`   원본 게시일 있음: ${docsWithDate.length}개`);
    console.log(`   원본 게시일 없음: ${docsWithoutDate}개`);
    
    // 플랫폼별 통계
    const platformStats = await VideoUrl.aggregate([
      {
        $group: {
          _id: '$platform',
          total: { $sum: 1 },
          withDate: { 
            $sum: { 
              $cond: [
                { $and: [{ $ne: ['$originalPublishDate', null] }, { $ne: ['$originalPublishDate', undefined] }] },
                1, 
                0
              ]
            }
          }
        }
      }
    ]);
    
    console.log('\n📊 플랫폼별 원본 게시일 현황:');
    platformStats.forEach(stat => {
      const percentage = (stat.withDate / stat.total * 100).toFixed(1);
      console.log(`   ${stat._id.toUpperCase()}: ${stat.withDate}/${stat.total} (${percentage}%)`);
    });
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 확인 실패:', error.message);
  }
}

checkUpdatedDates();