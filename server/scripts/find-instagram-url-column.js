require('dotenv').config();
const SheetsManager = require('../services/SheetsManager');

async function findInstagramUrlColumn() {
  try {
    const sheetsManager = new SheetsManager();
    
    console.log('🔍 Instagram 시트에서 URL 컬럼 찾기:');
    
    const instagramSheet = await sheetsManager.getSheetNameByPlatform('instagram');
    
    // 첫 행(헤더)을 확인해서 URL 컬럼 찾기
    const headerRow = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: `${instagramSheet}!1:1`
    });
    
    const headers = headerRow.data.values[0] || [];
    
    console.log('\n📋 Instagram 시트 헤더 (첫 행):');
    headers.forEach((header, i) => {
      const column = String.fromCharCode(65 + i); // A, B, C...
      console.log(`  ${column}컬럼: "${header}"`);
      
      if (header && header.toLowerCase().includes('url')) {
        console.log(`  🎯 URL 컬럼 발견: ${column}컬럼!`);
      }
    });
    
    // URL이 포함된 것 같은 컬럼들의 샘플 데이터 확인
    const urlLikeColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
    
    console.log('\n🔍 각 컬럼의 샘플 데이터:');
    for (const col of urlLikeColumns.slice(0, 16)) {
      try {
        const colData = await sheetsManager.sheets.spreadsheets.values.get({
          spreadsheetId: sheetsManager.spreadsheetId,
          range: `${instagramSheet}!${col}2:${col}3`
        });
        
        const values = colData.data.values || [];
        if (values.length > 0 && values[0][0]) {
          const sample = values[0][0];
          console.log(`  ${col}컬럼: "${sample}"`);
          
          // URL 같은지 체크
          if (sample.includes('instagram.com') || sample.includes('http')) {
            console.log(`  🎯 실제 URL 발견: ${col}컬럼!`);
          }
        }
      } catch (e) {
        // 빈 컬럼은 건너뛰기
      }
    }
    
  } catch (error) {
    console.error('❌ Instagram URL 컬럼 찾기 실패:', error.message);
  }
}

findInstagramUrlColumn();