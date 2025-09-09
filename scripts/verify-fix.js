const mongoose = require('mongoose');
const SheetsManager = require('../server/services/SheetsManager');
const VideoUrl = require('../server/models/VideoUrl');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * 🔍 실제 중복 검사 시뮬레이션
 * 이전에 문제가 되었던 Instagram URL로 검증
 */
async function verifyDuplicateFix() {
  try {
    console.log('🔍 중복 검사 수정사항 검증 시작...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('✅ MongoDB 연결 완료');
    
    const sheetsManager = new SheetsManager();
    
    // 이전 문제가 되었던 URL들
    const problemUrls = [
      'https://www.instagram.com/reels/DOWFdokjhMb/',
      'https://instagram.com/reels/DOWFdokjhMb/',
      'https://www.instagram.com/reels/DOWFdokjhMb',
      'https://instagram.com/reels/DOWFdokjhMb',
      'https://instagram.com/reels/dowfdokjhmb',  // 이미 소문자
    ];
    
    console.log('📋 테스트할 URL들:');
    problemUrls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    
    console.log('\n🔧 정규화 결과:');
    const normalizedResults = problemUrls.map(url => {
      const normalized = sheetsManager.normalizeVideoUrl(url);
      console.log(`  ${url} → ${normalized}`);
      return normalized;
    });
    
    // 모든 정규화 결과가 동일한지 확인
    const uniqueResults = [...new Set(normalizedResults)];
    console.log(`\n📊 고유 정규화 결과: ${uniqueResults.length}개`);
    
    if (uniqueResults.length === 1) {
      console.log(`✅ 모든 URL이 동일하게 정규화됨: ${uniqueResults[0]}`);
    } else {
      console.log(`❌ 서로 다른 정규화 결과:`);
      uniqueResults.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result}`);
      });
      throw new Error('정규화 불일치 발견!');
    }
    
    // 실제 중복 검사 시뮬레이션
    console.log('\n🧪 실제 중복 검사 시뮬레이션...');
    
    const testUrl = problemUrls[0]; // 첫 번째 URL로 테스트
    const normalizedUrl = sheetsManager.normalizeVideoUrl(testUrl);
    
    // 1. 첫 번째 URL 등록 시뮬레이션
    console.log(`\n1️⃣ 첫 번째 URL 등록: ${testUrl}`);
    
    const registerResult = await VideoUrl.registerUrl(
      normalizedUrl,
      testUrl,
      'instagram',
      { sheetName: 'Instagram', column: 'W', row: 100 }
    );
    
    if (registerResult.success) {
      console.log(`✅ 등록 성공: ${normalizedUrl}`);
    } else {
      console.log(`❌ 등록 실패: ${registerResult.error}`);
    }
    
    // 2. 다른 형태의 같은 URL로 중복 검사
    const duplicateTestUrl = problemUrls[1]; // 두 번째 URL (다른 형태)
    console.log(`\n2️⃣ 다른 형태 URL로 중복 검사: ${duplicateTestUrl}`);
    
    const duplicateCheck = await VideoUrl.checkDuplicate(
      sheetsManager.normalizeVideoUrl(duplicateTestUrl)
    );
    
    console.log('중복 검사 결과:', duplicateCheck);
    
    if (duplicateCheck.isDuplicate) {
      console.log('✅ 올바르게 중복 감지됨!');
      console.log(`   - 기존 플랫폼: ${duplicateCheck.existingPlatform}`);
      console.log(`   - 처리 상태: ${duplicateCheck.isProcessing ? 'processing' : 'completed'}`);
    } else {
      console.log('❌ 중복 감지 실패! (같은 URL인데 다르게 인식됨)');
      throw new Error('중복 검사 로직 오류!');
    }
    
    // 3. 정리
    console.log('\n🧹 테스트 데이터 정리...');
    await VideoUrl.deleteOne({ normalizedUrl });
    console.log('✅ 테스트 데이터 삭제 완료');
    
    console.log('\n🎉 검증 완료: 중복 검사 수정사항이 올바르게 작동합니다!');
    
  } catch (error) {
    console.error('\n❌ 검증 실패:', error.message);
    
    // 정리
    try {
      const normalizedUrl = new SheetsManager().normalizeVideoUrl(problemUrls[0]);
      await VideoUrl.deleteOne({ normalizedUrl });
      console.log('🧹 에러 후 테스트 데이터 정리 완료');
    } catch (cleanupError) {
      console.log('⚠️ 정리 중 오류:', cleanupError.message);
    }
    
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

if (require.main === module) {
  verifyDuplicateFix()
    .then(() => {
      console.log('\n✅ 모든 검증 통과!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 검증 실패:', error.message);
      process.exit(1);
    });
}

module.exports = { verifyDuplicateFix };