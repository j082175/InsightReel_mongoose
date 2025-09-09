require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');

async function fixMissingYoutube() {
  try {
    console.log('🔧 누락된 YouTube 레코드 수동 수정...\n');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // 수동으로 두 레코드 업데이트
    const updates = [
      {
        url: 'https://www.youtube.com/shorts/Tw6HFU0ffc8',
        date: '2025. 8. 29. 오후 8:17:30'
      },
      {
        url: 'https://www.youtube.com/shorts/RkvmnJfOrww', 
        date: '2022. 9. 7. 오전 11:49:33'
      }
    ];
    
    // 한국어 날짜 파싱 함수
    const parseKoreanDate = (dateStr) => {
      let normalized = dateStr
        .replace(/\. /g, '/')
        .replace(/\.$/, '')
        .replace(/오전 (\d+):/, ' $1:')
        .replace(/오후 (\d+):/, (match, hour) => ` ${parseInt(hour) + 12}:`)
        .replace(/오전 12:/, ' 0:')
        .replace(/오후 12:/, ' 12:');
      return new Date(normalized);
    };
    
    for (const update of updates) {
      const parsedDate = parseKoreanDate(update.date);
      
      console.log(`🔄 업데이트 시도: ${update.url}`);
      console.log(`   원본 날짜: ${update.date}`);
      console.log(`   파싱된 날짜: ${parsedDate.toLocaleString()}`);
      
      const result = await VideoUrl.updateOne(
        { originalUrl: update.url },
        { 
          $set: { 
            originalPublishDate: parsedDate,
            processedAt: new Date()
          }
        }
      );
      
      console.log(`   ✅ 업데이트 결과: ${result.modifiedCount}개 수정됨\n`);
    }
    
    // 최종 확인
    const totalWithDate = await VideoUrl.countDocuments({ 
      originalPublishDate: { $exists: true, $ne: null } 
    });
    const totalRecords = await VideoUrl.countDocuments();
    
    console.log(`📊 최종 결과:`);
    console.log(`   전체 레코드: ${totalRecords}개`);
    console.log(`   원본 게시일 있음: ${totalWithDate}개`);
    console.log(`   완료율: ${(totalWithDate / totalRecords * 100).toFixed(1)}%`);
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 수정 실패:', error.message);
  }
}

fixMissingYoutube();