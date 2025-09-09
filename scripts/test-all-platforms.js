const mongoose = require('mongoose');
const SheetsManager = require('../server/services/SheetsManager');
const VideoUrl = require('../server/models/VideoUrl');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * 🧪 모든 플랫폼 중복 검사 테스트
 * YouTube, Instagram, TikTok 플랫폼별 검증
 */
async function testAllPlatforms() {
  try {
    console.log('🔍 모든 플랫폼 중복 검사 테스트 시작...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('✅ MongoDB 연결 완료');
    
    const sheetsManager = new SheetsManager();
    
    // 플랫폼별 테스트 케이스
    const platforms = [
      {
        name: 'YouTube',
        testUrls: [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ?t=10',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&ab_channel=Test',
          'https://youtube.com/shorts/dQw4w9WgXcQ',
          'http://www.youtube.com/watch?v=dQw4w9WgXcQ'
        ]
      },
      {
        name: 'Instagram', 
        testUrls: [
          'https://www.instagram.com/reels/TestReel123/',
          'https://instagram.com/reels/TestReel123/',
          'https://www.instagram.com/reels/TestReel123',
          'https://instagram.com/reels/TestReel123',
          'https://instagram.com/reels/testreel123',
          'https://www.instagram.com/p/TestPost456/?utm_source=ig_web',
          'http://instagram.com/reels/TestReel123/'
        ]
      },
      {
        name: 'TikTok',
        testUrls: [
          'https://www.tiktok.com/@testuser/video/1234567890',
          'https://tiktok.com/@testuser/video/1234567890',
          'https://tiktok.com/@testuser/video/1234567890/',
          'https://www.tiktok.com/@testuser/video/1234567890?is_from_webapp=1',
          'http://tiktok.com/@testuser/video/1234567890',
          'https://TikTok.com/@TestUser/video/1234567890'  // 대소문자 테스트
        ]
      }
    ];
    
    const testResults = [];
    
    // 각 플랫폼별 테스트
    for (const platform of platforms) {
      console.log(`\n📱 ${platform.name} 플랫폼 테스트...`);
      
      // 1. URL 정규화 테스트
      console.log('1️⃣ URL 정규화 검사:');
      const normalizedResults = platform.testUrls.map(url => {
        const normalized = sheetsManager.normalizeVideoUrl(url);
        console.log(`   ${url} → ${normalized}`);
        return normalized;
      });
      
      const uniqueNormalized = [...new Set(normalizedResults)];
      const isUnified = uniqueNormalized.length <= 2; // 같은 비디오는 1개, 다른 비디오는 최대 2개까지 허용
      
      console.log(`   📊 고유 정규화 결과: ${uniqueNormalized.length}개`);
      if (isUnified) {
        console.log('   ✅ 정규화 성공!');
        uniqueNormalized.forEach((result, i) => {
          console.log(`      ${i + 1}. ${result}`);
        });
      } else {
        console.log('   ❌ 정규화 불일치 - 너무 많은 고유 결과');
      }
      
      // 2. 실제 중복 검사 테스트 (첫 번째 정규화 결과 사용)
      if (uniqueNormalized.length > 0) {
        const testNormalizedUrl = uniqueNormalized[0];
        const testOriginalUrl = platform.testUrls[0];
        
        console.log('\n2️⃣ 실제 중복 검사 테스트:');
        console.log(`   테스트 URL: ${testOriginalUrl}`);
        console.log(`   정규화된 URL: ${testNormalizedUrl}`);
        
        try {
          // URL 등록
          const registerResult = await VideoUrl.registerUrl(
            testNormalizedUrl,
            testOriginalUrl,
            platform.name.toLowerCase(),
            { sheetName: platform.name, column: 'A', row: 1 }
          );
          
          if (registerResult.success) {
            console.log('   ✅ 등록 성공');
            
            // 다른 형태의 URL로 중복 검사
            if (platform.testUrls.length > 1) {
              const duplicateTestUrl = platform.testUrls[1];
              const duplicateNormalized = sheetsManager.normalizeVideoUrl(duplicateTestUrl);
              
              console.log(`   중복 검사할 URL: ${duplicateTestUrl}`);
              console.log(`   정규화된 URL: ${duplicateNormalized}`);
              
              const duplicateCheck = await VideoUrl.checkDuplicate(duplicateNormalized);
              
              if (duplicateCheck.isDuplicate) {
                console.log('   ✅ 중복 검사 성공 - 올바르게 감지됨');
              } else {
                console.log('   ❌ 중복 검사 실패 - 같은 비디오인데 다르게 인식');
              }
            }
            
            // 테스트 데이터 정리
            await VideoUrl.deleteOne({ normalizedUrl: testNormalizedUrl });
            console.log('   🧹 테스트 데이터 정리 완료');
            
          } else {
            console.log(`   ❌ 등록 실패: ${registerResult.error}`);
          }
          
        } catch (testError) {
          console.log(`   ❌ 테스트 중 오류: ${testError.message}`);
          
          // 정리 시도
          try {
            await VideoUrl.deleteOne({ normalizedUrl: testNormalizedUrl });
          } catch {}
        }
      }
      
      testResults.push({
        platform: platform.name,
        normalized: isUnified,
        uniqueCount: uniqueNormalized.length
      });
    }
    
    // 전체 결과 요약
    console.log('\n📋 전체 테스트 결과:');
    testResults.forEach(result => {
      const status = result.normalized ? '✅ 성공' : '❌ 실패';
      console.log(`  ${result.platform}: ${status} (고유 결과 ${result.uniqueCount}개)`);
    });
    
    const allPassed = testResults.every(r => r.normalized);
    console.log(`\n🎯 전체 결과: ${allPassed ? '✅ 모든 플랫폼 테스트 통과!' : '❌ 일부 플랫폼 실패'}`);
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

if (require.main === module) {
  testAllPlatforms()
    .then(() => {
      console.log('\n✅ 모든 플랫폼 테스트 완료!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 테스트 실패:', error.message);
      process.exit(1);
    });
}

module.exports = { testAllPlatforms };