require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');
const { google } = require('googleapis');

async function compareUrlFormats() {
  try {
    console.log('🔍 URL 형식 비교 분석 시작...\n');
    
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');

    // MongoDB의 URL 형식 확인
    console.log('\n📊 MongoDB의 URL 형식 (처음 5개):');
    const mongoDocs = await VideoUrl.find().limit(5).lean();
    mongoDocs.forEach((doc, index) => {
      console.log(`  ${index + 1}. normalizedUrl: ${doc.normalizedUrl}`);
      console.log(`     originalUrl: ${doc.originalUrl}`);
      console.log(`     platform: ${doc.platform}`);
      console.log('');
    });

    // Google Sheets 연결 및 데이터 확인
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets 연결 성공');

    // Instagram 시트에서 URL 형식 확인
    console.log('\n📊 Instagram 시트의 URL 형식 (처음 5개):');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Instagram!A2:E6', // 헤더 제외하고 5행
    });
    
    const rows = response.data.values || [];
    rows.forEach((row, index) => {
      if (row.length >= 4) {
        console.log(`  ${index + 1}. 날짜: ${row[1]}`);
        console.log(`     플랫폼: ${row[2]}`);
        console.log(`     URL: ${row[3]}`);
        console.log('');
      }
    });

    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');

  } catch (error) {
    console.error('❌ 분석 실패:', error.message);
  }
}

compareUrlFormats();