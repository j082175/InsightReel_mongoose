/**
 * 댓글 정보 저장 시 MongoDB 저장소 영향 분석
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { YouTubeVideo } = require('./server/models/VideoOptimized');

async function analyzeCommentStorage() {
  console.log('📊 댓글 정보 저장 시 MongoDB 영향 분석\n');

  try {
    // 1. 현재 MongoDB Atlas 상태 확인
    console.log('1️⃣ MongoDB Atlas 현재 상태 확인...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const admin = mongoose.connection.db.admin();
    const stats = await admin.command({ dbStats: 1 });
    
    console.log('📈 현재 데이터베이스 상태:');
    console.log(`   - 데이터베이스 크기: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - 인덱스 크기: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - 전체 저장소 크기: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - 문서 개수: ${stats.objects}`);
    console.log(`   - 컬렉션 개수: ${stats.collections}`);

    // 2. 실제 댓글 데이터 크기 분석
    console.log('\n2️⃣ 실제 댓글 데이터 크기 분석...');
    
    // Google Sheets에서 가져온 실제 댓글 데이터 (예시)
    const sampleComments = `1. @mariohello3122: The person who put this song in the movie is a funking genius | 2. @sudhanbalakumar3989: "Tomorrow never comes until it's too late" let that sink in | 3. @dattatreyasathe3526: Whenever I feel low or sad, this song takes me to the top. I forget everything. My salute to the person who made this song. | 4. @NghiaTrong-ch1cn: Tokyo Drift is immortal ! It made me always RESPECT Japan | 5. @XxPeruvianGamersxX: Walking around the streets of Tokyo listening to this song is absolutely priceless`;
    
    console.log('📝 댓글 데이터 크기 분석:');
    console.log(`   - 샘플 댓글 길이: ${sampleComments.length}자`);
    console.log(`   - UTF-8 바이트 크기: ${Buffer.byteLength(sampleComments, 'utf8')} bytes`);
    console.log(`   - 압축 추정 크기: ~${(Buffer.byteLength(sampleComments, 'utf8') * 0.3).toFixed(0)} bytes`);

    // 3. 100개 영상 저장 시 예상 용량 계산
    console.log('\n3️⃣ 100개 영상 저장 시 예상 용량...');
    
    const averageCommentSize = Buffer.byteLength(sampleComments, 'utf8');
    const videosCount = [100, 1000, 10000, 100000];
    
    videosCount.forEach(count => {
      const totalCommentSize = averageCommentSize * count;
      const totalCommentSizeMB = totalCommentSize / 1024 / 1024;
      
      console.log(`   📹 ${count.toLocaleString()}개 영상:`);
      console.log(`      - 댓글만 용량: ${totalCommentSizeMB.toFixed(2)} MB`);
      console.log(`      - 전체 문서 예상 용량: ${(totalCommentSizeMB * 1.5).toFixed(2)} MB (댓글 + 메타데이터)`);
    });

    // 4. MongoDB Atlas 무료 티어 제한 확인
    console.log('\n4️⃣ MongoDB Atlas 무료 티어 제한 분석...');
    
    const freetierLimit = 512; // MB
    const currentUsage = stats.storageSize / 1024 / 1024;
    const remainingSpace = freetierLimit - currentUsage;
    
    console.log(`📊 저장소 한계 분석:`);
    console.log(`   - 무료 티어 한계: ${freetierLimit} MB`);
    console.log(`   - 현재 사용량: ${currentUsage.toFixed(2)} MB`);
    console.log(`   - 남은 용량: ${remainingSpace.toFixed(2)} MB`);
    
    // 댓글 포함 시 저장 가능 영상 수 계산
    const avgVideoSizeWithComments = 0.015; // MB (댓글 포함 예상)
    const avgVideoSizeWithoutComments = 0.002; // MB (댓글 없음)
    
    const maxVideosWithComments = Math.floor(remainingSpace / avgVideoSizeWithComments);
    const maxVideosWithoutComments = Math.floor(remainingSpace / avgVideoSizeWithoutComments);
    
    console.log(`\n📈 저장 가능 영상 수 예상:`);
    console.log(`   - 댓글 포함 시: 약 ${maxVideosWithComments.toLocaleString()}개`);
    console.log(`   - 댓글 없이: 약 ${maxVideosWithoutComments.toLocaleString()}개`);

    // 5. 성능 영향 분석
    console.log('\n5️⃣ 성능 영향 분석...');
    
    console.log('🚀 성능 영향 요소들:');
    console.log('   ✅ 장점:');
    console.log('      - 완전한 데이터 보존');
    console.log('      - 댓글 검색 및 분석 가능');
    console.log('      - 데이터 일관성 향상');
    
    console.log('   ⚠️ 단점:');
    console.log('      - 저장소 사용량 5-10배 증가');
    console.log('      - 쿼리 응답 시간 증가 가능');
    console.log('      - 메모리 사용량 증가');
    console.log('      - 네트워크 전송량 증가');

    // 6. 최적화 방안 제시
    console.log('\n6️⃣ 댓글 저장 최적화 방안...');
    
    console.log('💡 최적화 전략:');
    console.log('   1. 댓글 요약 저장 (상위 10개만)');
    console.log('   2. 댓글 길이 제한 (500자 이하)');
    console.log('   3. 별도 컬렉션 분리 (comments 컬렉션)');
    console.log('   4. 텍스트 압축 적용');
    console.log('   5. 필요시에만 댓글 조회 (lazy loading)');

    // 7. 권장사항
    console.log('\n7️⃣ 권장사항...');
    
    if (remainingSpace > 200) {
      console.log('✅ 댓글 저장 권장:');
      console.log(`   - 충분한 저장 공간 (${remainingSpace.toFixed(2)} MB 남음)`);
      console.log('   - 단, 댓글 요약 저장 방식 적용');
    } else if (remainingSpace > 50) {
      console.log('⚠️ 조건부 댓글 저장:');
      console.log(`   - 제한된 저장 공간 (${remainingSpace.toFixed(2)} MB 남음)`);
      console.log('   - 상위 5개 댓글만 저장 권장');
    } else {
      console.log('❌ 댓글 저장 비권장:');
      console.log(`   - 부족한 저장 공간 (${remainingSpace.toFixed(2)} MB 남음)`);
      console.log('   - 핵심 데이터 우선 저장');
    }

    await mongoose.disconnect();
    console.log('\n✅ 댓글 저장 영향 분석 완료!');
    
    return {
      currentUsage: currentUsage,
      remainingSpace: remainingSpace,
      recommendStore: remainingSpace > 50
    };

  } catch (error) {
    console.log('❌ 분석 실패:', error.message);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    return null;
  }
}

// 직접 실행 시
if (require.main === module) {
  analyzeCommentStorage().then(result => {
    if (result) {
      if (result.recommendStore) {
        console.log('\n💡 결론: 댓글 저장이 가능하지만 최적화 필요합니다.');
      } else {
        console.log('\n⚠️ 결론: 현재 상황에서는 댓글 저장을 권장하지 않습니다.');
      }
    } else {
      console.log('\n❌ 분석에 실패했습니다.');
    }
  });
}

module.exports = analyzeCommentStorage;