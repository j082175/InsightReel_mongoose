const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * 🧹 레거시 MongoDB 컬렉션 정리 스크립트
 * 구조 단순화 후 불필요한 컬렉션들 제거
 */
async function cleanupLegacyCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('✅ MongoDB 연결 완료');
    
    const db = mongoose.connection.db;
    
    // 삭제할 레거시 컬렉션들
    const legacyCollections = [
      'videos_youtube',       // VideoOptimized.js가 생성했던 YouTube 전용 컬렉션
      'videos_instagram',     // VideoOptimized.js가 생성했던 Instagram 전용 컬렉션  
      'video_urls',           // 구 중복검사 컬렉션 (video_duplicate_check로 대체됨)
      'instagram_duplicate_check'  // Instagram 전용 중복검사 (video_duplicate_check로 통합됨)
    ];
    
    console.log('\n🧹 레거시 컬렉션 정리 시작...');
    
    let deletedCount = 0;
    
    for (const collectionName of legacyCollections) {
      try {
        // 컬렉션이 존재하는지 확인
        const collections = await db.listCollections({ name: collectionName }).toArray();
        
        if (collections.length > 0) {
          // 데이터 개수 확인 (안전장치)
          const count = await db.collection(collectionName).countDocuments();
          console.log(`🔍 ${collectionName}: ${count}개 문서 확인`);
          
          // 중요한 데이터가 있으면 경고 메시지
          if (count > 0) {
            console.log(`⚠️  ${collectionName}에 ${count}개 데이터가 있습니다. 마이그레이션 확인 후 삭제합니다.`);
          }
          
          // 컬렉션 삭제
          await db.collection(collectionName).drop();
          console.log(`✅ ${collectionName} 컬렉션 삭제 완료`);
          deletedCount++;
        } else {
          console.log(`⚠️ ${collectionName} 컬렉션이 존재하지 않음`);
        }
      } catch (error) {
        if (error.message.includes('ns not found')) {
          console.log(`⚠️ ${collectionName} 컬렉션이 이미 존재하지 않음`);
        } else {
          console.error(`❌ ${collectionName} 삭제 실패: ${error.message}`);
        }
      }
    }
    
    // 정리 후 현재 컬렉션 목록 확인
    console.log('\n📋 정리 후 컬렉션 목록:');
    const remainingCollections = await db.listCollections().toArray();
    remainingCollections.forEach(col => {
      console.log('  -', col.name);
    });
    
    console.log(`\n🎉 레거시 컬렉션 정리 완료! (${deletedCount}개 삭제)`);
    console.log('\n📊 최종 핵심 컬렉션 구조:');
    console.log('  - videos (통합 비디오 저장소)');
    console.log('  - video_duplicate_check (비디오 중복검사)'); 
    console.log('  - channels (채널 정보)');
    if (remainingCollections.find(c => c.name === 'channel_duplicate_check')) {
      console.log('  - channel_duplicate_check (채널 중복검사)');
    }
    
    // 각 컬렉션 문서 개수 확인
    console.log('\n📈 컬렉션별 문서 개수:');
    for (const col of remainingCollections) {
      try {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  - ${col.name}: ${count}개`);
      } catch (error) {
        console.log(`  - ${col.name}: 조회 실패`);
      }
    }
    
  } catch (error) {
    console.error('❌ 레거시 컬렉션 정리 실패:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  cleanupLegacyCollections();
}

module.exports = { cleanupLegacyCollections };