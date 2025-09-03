require('dotenv').config();
const SheetsManager = require('../services/SheetsManager');

async function analyzeMigrationDetails() {
  try {
    const sheetsManager = new SheetsManager();
    
    console.log('🔍 Google Sheets에서 실제 데이터 분석:');
    
    // Instagram N컬럼 전체 확인
    console.log('\n📊 Instagram N컬럼 (URL) 전체 분석:');
    const instagramSheet = await sheetsManager.getSheetNameByPlatform('instagram');
    const instagramUrls = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: `${instagramSheet}!N:N`
    });
    
    const instagramValues = instagramUrls.data.values || [];
    let instagramValidUrls = 0;
    let instagramEmptyOrInvalid = 0;
    let instagramDuplicates = [];
    const seenUrls = new Set();
    
    console.log(`총 ${instagramValues.length}행 존재`);
    
    for (let i = 1; i < instagramValues.length; i++) { // 헤더 제외
      const cellValue = instagramValues[i] ? instagramValues[i][0] : null;
      
      if (!cellValue || !cellValue.trim()) {
        instagramEmptyOrInvalid++;
        continue;
      }
      
      const trimmed = cellValue.trim();
      
      // 실제 Instagram URL인지 확인
      if (trimmed.includes('instagram.com')) {
        const normalizedUrl = sheetsManager.normalizeVideoUrl(trimmed);
        
        if (seenUrls.has(normalizedUrl)) {
          instagramDuplicates.push(`${i+1}행: ${trimmed} → ${normalizedUrl}`);
        } else {
          seenUrls.add(normalizedUrl);
          instagramValidUrls++;
        }
      } else {
        instagramEmptyOrInvalid++;
        if (i <= 10) { // 처음 몇 개만 출력
          console.log(`  ${i+1}행 (유효하지 않음): "${trimmed}"`);
        }
      }
    }
    
    console.log(`✅ 유효한 Instagram URL: ${instagramValidUrls}개`);
    console.log(`❌ 빈 값/유효하지 않은 값: ${instagramEmptyOrInvalid}개`);
    console.log(`🔄 중복 URL: ${instagramDuplicates.length}개`);
    
    if (instagramDuplicates.length > 0 && instagramDuplicates.length <= 10) {
      console.log('\n중복 URL 목록:');
      instagramDuplicates.forEach(dup => console.log(`  ${dup}`));
    }
    
    // YouTube W컬럼 전체 확인
    console.log('\n📊 YouTube W컬럼 (URL) 전체 분석:');
    const youtubeSheet = await sheetsManager.getSheetNameByPlatform('youtube');
    const youtubeUrls = await sheetsManager.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsManager.spreadsheetId,
      range: `${youtubeSheet}!W:W`
    });
    
    const youtubeValues = youtubeUrls.data.values || [];
    let youtubeValidUrls = 0;
    let youtubeEmptyOrInvalid = 0;
    let youtubeDuplicates = [];
    const youtubeSeenUrls = new Set();
    
    console.log(`총 ${youtubeValues.length}행 존재`);
    
    for (let i = 1; i < youtubeValues.length; i++) { // 헤더 제외
      const cellValue = youtubeValues[i] ? youtubeValues[i][0] : null;
      
      if (!cellValue || !cellValue.trim()) {
        youtubeEmptyOrInvalid++;
        continue;
      }
      
      const trimmed = cellValue.trim();
      
      // 실제 YouTube URL인지 확인
      if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
        const normalizedUrl = sheetsManager.normalizeVideoUrl(trimmed);
        
        if (youtubeSeenUrls.has(normalizedUrl)) {
          youtubeDuplicates.push(`${i+1}행: ${trimmed} → ${normalizedUrl}`);
        } else {
          youtubeSeenUrls.add(normalizedUrl);
          youtubeValidUrls++;
        }
      } else {
        youtubeEmptyOrInvalid++;
        if (i <= 10) { // 처음 몇 개만 출력
          console.log(`  ${i+1}행 (유효하지 않음): "${trimmed}"`);
        }
      }
    }
    
    console.log(`✅ 유효한 YouTube URL: ${youtubeValidUrls}개`);
    console.log(`❌ 빈 값/유효하지 않은 값: ${youtubeEmptyOrInvalid}개`);
    console.log(`🔄 중복 URL: ${youtubeDuplicates.length}개`);
    
    if (youtubeDuplicates.length > 0) {
      console.log('\n중복 URL 목록:');
      youtubeDuplicates.forEach(dup => console.log(`  ${dup}`));
    }
    
    console.log('\n🎯 최종 분석:');
    const totalValidUrls = instagramValidUrls + youtubeValidUrls;
    const totalDuplicates = instagramDuplicates.length + youtubeDuplicates.length;
    console.log(`총 유효한 고유 URL: ${totalValidUrls}개`);
    console.log(`총 중복 URL: ${totalDuplicates}개`);
    console.log(`MongoDB 저장 예상: ${totalValidUrls}개`);
    console.log(`실제 MongoDB 저장: 69개`);
    console.log(`차이: ${totalValidUrls - 69}개 (아마도 정규화 과정에서 중복 제거)`);
    
  } catch (error) {
    console.error('❌ 분석 실패:', error.message);
  }
}

analyzeMigrationDetails();