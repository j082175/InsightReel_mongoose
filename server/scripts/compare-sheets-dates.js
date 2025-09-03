require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');
const { google } = require('googleapis');

/**
 * MongoDB와 Google Sheets 날짜 비교 스크립트
 */
async function compareWithSheets() {
  try {
    console.log('🔍 시트와 MongoDB 날짜 비교 시작...\n');

    // 환경 변수 확인
    console.log('🔧 환경 변수 상태:');
    console.log(`   GOOGLE_SERVICE_ACCOUNT_KEY: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '있음' : '없음'}`);
    console.log(`   GOOGLE_SPREADSHEET_ID: ${process.env.GOOGLE_SPREADSHEET_ID || '없음'}`);

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.log('❌ Google Service Account Key가 없습니다.');
      return;
    }

    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');

    // Google Sheets 설정
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('✅ Google Sheets 연결 성공');

    // MongoDB에서 완료된 데이터 조회
    const completedData = await VideoUrl.find({
      status: 'completed',
      'sheetLocation.row': { $exists: true }
    }).sort({ createdAt: -1 }).limit(5).lean();

    console.log('\n📊 MongoDB 완료 데이터와 시트 비교:');
    
    for (const doc of completedData) {
      const sheetName = doc.sheetLocation.sheetName;
      const row = doc.sheetLocation.row;
      
      try {
        // 해당 행의 전체 데이터 조회
        const range = `${sheetName}!A${row}:Z${row}`;
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
          range: range,
        });
        
        const rowData = response.data.values ? response.data.values[0] : [];
        
        console.log(`\n   📍 ${doc.platform.toUpperCase()} 데이터:`);
        console.log(`      MongoDB 생성일: ${new Date(doc.createdAt).toLocaleString()}`);
        console.log(`      시트 위치: ${sheetName} 행${row}`);
        console.log(`      URL: ${doc.originalUrl.substring(0, 60)}...`);
        
        if (rowData.length > 0) {
          console.log(`      시트 데이터 개수: ${rowData.length}개 컬럼`);
          
          // 날짜 같은 패턴 찾기
          const datePattern = /\d{4}[.-\/]\d{1,2}[.-\/]\d{1,2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|202\d년 \d{1,2}월 \d{1,2}일/;
          const timePattern = /\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}/;
          
          const dateColumns = [];
          rowData.forEach((cell, index) => {
            if (cell && (datePattern.test(cell) || timePattern.test(cell))) {
              dateColumns.push(`컬럼${String.fromCharCode(65 + index)}: ${cell}`);
            }
          });
          
          if (dateColumns.length > 0) {
            console.log(`      시트 날짜/시간 컬럼: ${dateColumns.join(', ')}`);
          } else {
            console.log(`      시트에서 날짜 패턴을 찾을 수 없음`);
          }
          
          // 첫 10개 컬럼 내용 미리보기
          const preview = rowData.slice(0, 10).map((cell, index) => 
            `${String.fromCharCode(65 + index)}:${cell ? cell.substring(0, 20) : '빈값'}`
          ).join(' | ');
          console.log(`      시트 미리보기: ${preview}`);
          
        } else {
          console.log(`      시트에서 데이터를 찾을 수 없음`);
        }
        
      } catch (error) {
        console.log(`      ❌ 시트 조회 실패: ${error.message}`);
      }
      
      // API 호출 제한을 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await mongoose.disconnect();
    console.log('\n🔌 연결 종료');

  } catch (error) {
    console.error('❌ 비교 실패:', error.message);
    console.error(error.stack);
  }
}

// 스크립트 실행
compareWithSheets();