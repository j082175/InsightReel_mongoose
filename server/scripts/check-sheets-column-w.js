const SheetsManager = require('../services/SheetsManager');
const { ServerLogger } = require('../utils/logger');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkColumnW() {
  try {
    const sheetsManager = new SheetsManager();
    
    // YouTube 시트 확인
    const sheetName = await sheetsManager.getSheetNameByPlatform('youtube');
    console.log(`📋 시트명: ${sheetName}`);
    
    // 전체 범위 조회 (A1:W20 정도)
    const range = `${sheetName}!A1:W20`;
    
    const response = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: range
    });

    const rows = response.data.values || [];
    console.log(`📊 조회된 행 수: ${rows.length}`);
    
    if (rows.length > 0) {
      // 헤더 행 출력 (첫 번째 행)
      console.log('\n📋 헤더 행 (A~W열):');
      const headers = rows[0] || [];
      headers.forEach((header, index) => {
        const columnLetter = String.fromCharCode(65 + index); // A, B, C...
        console.log(`${columnLetter}열(${index + 1}): "${header || '비어있음'}"`);
      });
      
      // W열이 23번째인지 확인
      if (headers.length >= 23) {
        console.log(`\n🎯 W열 (23번째) 헤더: "${headers[22] || '비어있음'}"`);
      } else {
        console.log(`\n⚠️ W열까지 데이터가 없음. 실제 열 수: ${headers.length}`);
      }
      
      // 데이터 행들 확인 (2~10행)
      console.log('\n📋 데이터 행들 (A, L, W열만):');
      for (let i = 1; i < Math.min(10, rows.length); i++) {
        const row = rows[i] || [];
        const aCol = row[0] || '비어있음';  // A열
        const lCol = row[11] || '비어있음'; // L열 (기존 URL)
        const wCol = row[22] || '비어있음'; // W열 (새로운 URL)
        
        console.log(`행 ${i + 1}: A열="${aCol}" | L열="${lCol}" | W열="${wCol}"`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

checkColumnW();