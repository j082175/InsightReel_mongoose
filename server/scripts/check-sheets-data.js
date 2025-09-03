require('dotenv').config();
const SheetsManager = require('../services/SheetsManager');

async function checkActualSheetData() {
  try {
    const sheetsManager = new SheetsManager();
    
    console.log('📊 Google Sheets 실제 URL 데이터 확인:');
    
    // Instagram 시트의 L컬럼 (URL 컬럼) 확인
    console.log('\n🔍 Instagram 시트 L컬럼 (URL) 샘플:');
    const instagramSheet = await sheetsManager.getSheetNameByPlatform('instagram');
    const instagramUrls = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: `${instagramSheet}!L1:L10`
    });
    
    const instagramValues = instagramUrls.data.values || [];
    instagramValues.forEach((row, i) => {
      if (row[0]) {
        console.log(`  ${i+1}행: ${row[0]}`);
      }
    });
    
    // YouTube 시트의 W컬럼 (URL 컬럼) 확인  
    console.log('\n🔍 YouTube 시트 W컬럼 (URL) 샘플:');
    const youtubeSheet = await sheetsManager.getSheetNameByPlatform('youtube');
    const youtubeUrls = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: `${youtubeSheet}!W1:W10`
    });
    
    const youtubeValues = youtubeUrls.data.values || [];
    youtubeValues.forEach((row, i) => {
      if (row[0]) {
        console.log(`  ${i+1}행: ${row[0]}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 시트 확인 실패:', error.message);
  }
}

checkActualSheetData();