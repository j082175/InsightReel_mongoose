const SheetsManager = require('../services/SheetsManager');
const { ServerLogger } = require('../utils/logger');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function testDuplicateCheck() {
  try {
    const sheetsManager = new SheetsManager();
    
    console.log('🔍 URL 중복 검사 테스트 시작\n');
    
    // 테스트할 URL들 (실제 스프레드시트에 있는 URL과 새로운 URL)
    const testUrls = [
      // 기존에 있는 YouTube URL (중복 예상)
      'https://www.youtube.com/shorts/Tw6HFU0ffc8',
      'https://youtube.com/watch?v=Tw6HFU0ffc8', // 같은 비디오 다른 형식
      'https://youtu.be/Tw6HFU0ffc8', // 짧은 형식
      
      // 기존에 있을 수 있는 Instagram URL (중복 예상)
      'https://www.instagram.com/reels/DHCszbBN1by/',
      'https://instagram.com/reels/DHCszbBN1by', // www 없는 형식
      
      // 새로운 URL (중복 아님)
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.instagram.com/p/NewPostId123/',
      'https://www.tiktok.com/@user/video/123456789'
    ];
    
    for (const testUrl of testUrls) {
      console.log(`\n🔍 테스트 URL: ${testUrl}`);
      console.log(`정규화된 URL: ${sheetsManager.normalizeVideoUrl(testUrl)}`);
      
      const result = await sheetsManager.checkDuplicateURL(testUrl);
      
      if (result.isDuplicate) {
        console.log(`❌ 중복 발견: ${result.existingPlatform} 시트 ${result.existingColumn}${result.existingRow}행`);
      } else if (result.error) {
        console.log(`⚠️ 검사 에러: ${result.error}`);
      } else {
        console.log(`✅ 중복 없음`);
      }
    }
    
    console.log('\n🎯 URL 정규화 테스트:');
    const normalizationTests = [
      'https://www.youtube.com/watch?v=ABC123&list=xyz',
      'https://youtu.be/ABC123?t=30',
      'https://www.youtube.com/shorts/ABC123',
      'https://www.instagram.com/p/ABC123/?utm_source=ig',
      'https://instagram.com/p/ABC123',
      'https://www.tiktok.com/@user/video/123456?lang=en'
    ];
    
    for (const url of normalizationTests) {
      console.log(`원본: ${url}`);
      console.log(`정규화: ${sheetsManager.normalizeVideoUrl(url)}\n`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

testDuplicateCheck();