require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Video = require('../models/Video');

async function fixInvalidRecords() {
  try {
    console.log('🔧 잘못된 레코드 수정 시작...\n');
    
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // 잘못된 레코드들 찾기
    const invalidRecords = await Video.find({
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    }).lean();
    
    console.log(`\n📊 수정할 레코드: ${invalidRecords.length}개`);
    
    let fixedCount = 0;
    let deletedCount = 0;
    
    for (const record of invalidRecords) {
      try {
        const url = record.account || record.comments;
        
        // "별쇼츠"나 다른 잘못된 데이터인 경우
        if (!url || !url.startsWith('http') || url === '별쇼츠') {
          console.log(`🗑️ 잘못된 레코드 삭제: ${record._id} (URL: ${url})`);
          await Video.deleteOne({ _id: record._id });
          deletedCount++;
        } else {
          // 실제 URL이지만 thumbnailUrl이 없는 경우 기본값 설정
          const thumbnailUrl = 'https://via.placeholder.com/300x300/FF0000/white?text=YouTube';
          const title = record.title || 'YouTube 영상';
          
          await Video.updateOne(
            { _id: record._id },
            { 
              $set: { 
                thumbnailUrl: thumbnailUrl,
                title: title
              } 
            }
          );
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ 레코드 처리 실패: ${record._id}`, error.message);
      }
    }
    
    // 최종 확인
    const remainingInvalid = await Video.countDocuments({
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    });
    
    const totalVideos = await Video.countDocuments();
    
    console.log('\n📊 수정 완료:');
    console.log(`   수정된 레코드: ${fixedCount}개`);
    console.log(`   삭제된 레코드: ${deletedCount}개`);
    console.log(`   남은 문제: ${remainingInvalid}개`);
    console.log(`   전체 레코드: ${totalVideos}개`);
    console.log(`   완료율: ${remainingInvalid === 0 ? '100.0' : ((totalVideos - remainingInvalid) / totalVideos * 100).toFixed(1)}%`);
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    console.log('✅ 잘못된 레코드 정리 완료!');
    
  } catch (error) {
    console.error('❌ 수정 실패:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

// 스크립트 실행
fixInvalidRecords();