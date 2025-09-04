/**
 * Google Sheets 인증 디버깅 스크립트
 */

require('dotenv').config();
const { google } = require('googleapis');

async function debugAuthentication() {
  console.log('🔍 Google Sheets 인증 디버깅 시작\n');

  try {
    // 1. 환경 변수 확인
    console.log('1️⃣ 환경 변수 확인...');
    const hasServiceKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasSpreadsheetId = !!process.env.GOOGLE_SPREADSHEET_ID;
    
    console.log(`   - GOOGLE_SERVICE_ACCOUNT_KEY: ${hasServiceKey ? '있음' : '없음'}`);
    console.log(`   - GOOGLE_SPREADSHEET_ID: ${hasSpreadsheetId ? '있음' : '없음'}`);
    
    if (!hasServiceKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 환경 변수가 없습니다.');
    }
    
    if (!hasSpreadsheetId) {
      throw new Error('GOOGLE_SPREADSHEET_ID 환경 변수가 없습니다.');
    }

    // 2. 서비스 계정 키 파싱 테스트
    console.log('\n2️⃣ 서비스 계정 키 파싱 테스트...');
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    console.log(`   - type: ${credentials.type}`);
    console.log(`   - project_id: ${credentials.project_id}`);
    console.log(`   - client_email: ${credentials.client_email}`);
    console.log(`   - private_key 길이: ${credentials.private_key ? credentials.private_key.length : 0}자`);

    // 3. Google Auth 객체 생성 테스트
    console.log('\n3️⃣ Google Auth 객체 생성 테스트...');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    console.log('   ✅ Google Auth 객체 생성 성공');

    // 4. Sheets API 객체 생성 테스트
    console.log('\n4️⃣ Sheets API 객체 생성 테스트...');
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('   ✅ Sheets API 객체 생성 성공');

    // 5. 실제 스프레드시트 접근 테스트
    console.log('\n5️⃣ 실제 스프레드시트 접근 테스트...');
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    
    console.log('   ✅ 스프레드시트 접근 성공!');
    console.log(`   - 제목: ${response.data.properties.title}`);
    console.log(`   - 시트 개수: ${response.data.sheets.length}개`);
    
    // 6. 시트 목록 확인
    console.log('\n6️⃣ 시트 목록 확인...');
    response.data.sheets.forEach((sheet, index) => {
      console.log(`   ${index + 1}. ${sheet.properties.title}`);
    });
    
    console.log('\n🎉 Google Sheets 인증 및 접근 완전 성공!');
    return true;

  } catch (error) {
    console.log('\n❌ Google Sheets 인증 실패:', error.message);
    
    if (error.message.includes('JSON')) {
      console.log('   → GOOGLE_SERVICE_ACCOUNT_KEY 형식 오류일 가능성');
    } else if (error.message.includes('403')) {
      console.log('   → 권한 문제일 가능성');
    } else if (error.message.includes('404')) {
      console.log('   → 스프레드시트 ID 오류일 가능성');
    }
    
    return false;
  }
}

// 직접 실행 시
if (require.main === module) {
  debugAuthentication().then(success => {
    if (success) {
      console.log('\n✅ 인증 문제 없음! SheetsManager 초기화 문제는 다른 원인입니다.');
    } else {
      console.log('\n❌ 인증 문제 발견! 환경 변수 설정을 확인해주세요.');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = debugAuthentication;