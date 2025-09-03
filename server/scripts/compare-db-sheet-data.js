require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');
const { google } = require('googleapis');

async function compareDbSheetData() {
  try {
    console.log('🔍 데이터베이스와 시트 데이터 비교 분석...\n');
    
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // Google Sheets 설정
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    console.log('✅ Google Sheets 연결 성공');
    
    // 시트에서 모든 데이터 가져오기
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:Z'
    });
    
    const sheetRows = sheetResponse.data.values;
    console.log(`📊 시트에서 ${sheetRows.length}개 행 조회`);
    
    // MongoDB에서 모든 데이터 가져오기
    const dbVideos = await VideoUrl.find({}).lean();
    console.log(`📊 MongoDB에서 ${dbVideos.length}개 레코드 조회`);
    
    console.log('\n🔍 상세 비교 분석...\n');
    
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches = [];
    
    // 한국어 날짜 파싱 함수
    const parseKoreanDate = (dateStr) => {
      if (!dateStr || dateStr.trim() === '') return null;
      
      let normalized = dateStr
        .replace(/\. /g, '/')
        .replace(/\.$/, '')
        .replace(/오전 (\d+):/, ' $1:')
        .replace(/오후 (\d+):/, (match, hour) => ` ${parseInt(hour) + 12}:`)
        .replace(/오전 12:/, ' 0:')
        .replace(/오후 12:/, ' 12:');
      return new Date(normalized);
    };
    
    // 각 DB 레코드에 대해 시트에서 매칭 찾기
    for (const dbVideo of dbVideos) {
      let found = false;
      let sheetDate = null;
      
      // 시트에서 URL 찾기 (D열: 인덱스 3, N열: 인덱스 13, W열: 인덱스 22)
      for (let i = 1; i < sheetRows.length; i++) {
        const row = sheetRows[i];
        const urlD = row[3]; // D열
        const urlN = row[13]; // N열 
        const urlW = row[22]; // W열
        const dateW = row[22]; // W열의 날짜
        
        // URL 매칭 확인
        if (urlD === dbVideo.originalUrl || urlN === dbVideo.originalUrl || urlW === dbVideo.originalUrl) {
          found = true;
          // W열에서 날짜 찾기 (YouTube는 W열에 날짜)
          if (dbVideo.platform === 'youtube' && row[22]) {
            sheetDate = parseKoreanDate(row[22]);
          }
          // Instagram은 보통 다른 열에 있을 수 있음
          else if (dbVideo.platform === 'instagram') {
            // 여러 열에서 날짜 패턴 찾기
            for (let j = 0; j < row.length; j++) {
              if (row[j] && row[j].includes('오전') || row[j] && row[j].includes('오후')) {
                sheetDate = parseKoreanDate(row[j]);
                break;
              }
            }
          }
          break;
        }
      }
      
      if (found) {
        const dbDate = dbVideo.originalPublishDate;
        
        // 날짜 비교 (시간 차이 허용: 1분 이내)
        if (dbDate && sheetDate) {
          const timeDiff = Math.abs(dbDate.getTime() - sheetDate.getTime());
          if (timeDiff < 60000) { // 1분 이내 차이는 같은 것으로 간주
            matchCount++;
            console.log(`✅ 매칭: ${dbVideo.platform.toUpperCase()} ${dbVideo.originalUrl.substring(0, 50)}...`);
          } else {
            mismatchCount++;
            mismatches.push({
              url: dbVideo.originalUrl,
              platform: dbVideo.platform,
              dbDate: dbDate.toLocaleString(),
              sheetDate: sheetDate.toLocaleString(),
              timeDiff: Math.round(timeDiff / 1000) + '초'
            });
            console.log(`❌ 날짜 불일치: ${dbVideo.platform.toUpperCase()}`);
            console.log(`   URL: ${dbVideo.originalUrl.substring(0, 60)}...`);
            console.log(`   DB 날짜: ${dbDate.toLocaleString()}`);
            console.log(`   시트 날짜: ${sheetDate.toLocaleString()}`);
            console.log(`   시간 차이: ${Math.round(timeDiff / 1000)}초\n`);
          }
        } else {
          mismatchCount++;
          mismatches.push({
            url: dbVideo.originalUrl,
            platform: dbVideo.platform,
            dbDate: dbDate ? dbDate.toLocaleString() : 'null',
            sheetDate: sheetDate ? sheetDate.toLocaleString() : 'null',
            issue: '날짜 데이터 누락'
          });
          console.log(`⚠️ 날짜 누락: ${dbVideo.platform.toUpperCase()}`);
          console.log(`   URL: ${dbVideo.originalUrl.substring(0, 60)}...`);
          console.log(`   DB 날짜: ${dbDate ? dbDate.toLocaleString() : '없음'}`);
          console.log(`   시트 날짜: ${sheetDate ? sheetDate.toLocaleString() : '없음'}\n`);
        }
      } else {
        mismatchCount++;
        console.log(`❌ 시트에서 URL 찾을 수 없음: ${dbVideo.originalUrl}\n`);
      }
    }
    
    console.log('\n📊 최종 비교 결과:');
    console.log(`   총 DB 레코드: ${dbVideos.length}개`);
    console.log(`   매칭 성공: ${matchCount}개`);
    console.log(`   불일치: ${mismatchCount}개`);
    console.log(`   일치율: ${(matchCount / dbVideos.length * 100).toFixed(1)}%`);
    
    if (mismatches.length > 0) {
      console.log('\n❌ 불일치 상세 내역:');
      mismatches.forEach((mismatch, index) => {
        console.log(`${index + 1}. ${mismatch.platform.toUpperCase()}:`);
        console.log(`   URL: ${mismatch.url}`);
        console.log(`   DB: ${mismatch.dbDate}`);
        console.log(`   시트: ${mismatch.sheetDate}`);
        if (mismatch.timeDiff) {
          console.log(`   차이: ${mismatch.timeDiff}`);
        }
        if (mismatch.issue) {
          console.log(`   문제: ${mismatch.issue}`);
        }
        console.log('');
      });
    }
    
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 비교 실패:', error.message);
  }
}

compareDbSheetData();