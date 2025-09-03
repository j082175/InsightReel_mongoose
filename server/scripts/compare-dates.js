const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');

/**
 * MongoDB와 Google Sheets 날짜 비교 스크립트
 */
async function compareDates() {
  try {
    console.log('🔍 MongoDB 날짜 분석 시작...\n');

    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공\n');

    // MongoDB에서 최근 완료된 데이터 조회
    const completedData = await VideoUrl.find({
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log('📊 MongoDB 최근 완료된 데이터:');
    if (completedData.length === 0) {
      console.log('   완료된 데이터가 없습니다.');
    } else {
      completedData.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.platform.toUpperCase()}`);
        console.log(`      URL: ${doc.originalUrl.substring(0, 60)}...`);
        console.log(`      생성일: ${new Date(doc.createdAt).toLocaleString()}`);
        console.log(`      시트위치: ${doc.sheetLocation ? `${doc.sheetLocation.sheetName} ${doc.sheetLocation.column}${doc.sheetLocation.row}` : '없음'}`);
        console.log('');
      });
    }

    // 전체 데이터의 날짜 범위 확인
    const dateStats = await VideoUrl.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$createdAt' },
          maxDate: { $max: '$createdAt' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (dateStats.length > 0) {
      const stats = dateStats[0];
      console.log('📅 전체 데이터 날짜 범위:');
      console.log(`   가장 오래된 데이터: ${new Date(stats.minDate).toLocaleString()}`);
      console.log(`   가장 최근 데이터: ${new Date(stats.maxDate).toLocaleString()}`);
      console.log(`   총 레코드 수: ${stats.count}개\n`);
    }

    // 오늘 날짜별 생성 통계
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await VideoUrl.countDocuments({
      createdAt: { $gte: today }
    });
    
    console.log('📊 오늘 생성된 데이터:');
    console.log(`   오늘(${today.toLocaleDateString()}) 생성: ${todayCount}개`);
    
    // Google Sheets 연결 상태 확인
    console.log('\n🔍 Google Sheets 연결 상태 확인:');
    const hasGoogleKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '✅ 있음' : '❌ 없음';
    const hasSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ? '✅ 있음' : '❌ 없음';
    
    console.log(`   Google Service Account Key: ${hasGoogleKey}`);
    console.log(`   Spreadsheet ID: ${hasSpreadsheetId}`);
    
    if (process.env.GOOGLE_SPREADSHEET_ID) {
      console.log(`   스프레드시트 ID: ${process.env.GOOGLE_SPREADSHEET_ID}`);
    }

    console.log('\n✅ MongoDB 날짜 분석 완료');

  } catch (error) {
    console.error('❌ 분석 실패:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
compareDates();