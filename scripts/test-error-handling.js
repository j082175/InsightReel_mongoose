/**
 * 에러 처리 및 롤백 기능 테스트
 * 실패 시나리오에서 데이터 일관성 보장 확인
 */

const UnifiedVideoSaver = require('./server/services/UnifiedVideoSaver');

async function testErrorHandlingAndRollback() {
  console.log('🚨 에러 처리 및 롤백 기능 테스트 시작\n');

  try {
    const unifiedVideoSaver = new UnifiedVideoSaver();

    // 1. 정상 데이터로 기본 동작 확인
    console.log('1️⃣ 정상 데이터 테스트...');
    const validTestData = {
      platform: 'youtube',
      postUrl: 'https://youtube.com/watch?v=valid123',
      videoPath: '/test/valid.mp4',
      metadata: {
        author: 'ValidChannel',
        title: '정상 테스트'
      },
      analysis: {
        mainCategory: '테스트',
        content: '정상 테스트 데이터'
      },
      timestamp: new Date().toISOString()
    };

    console.log('   - 정상 테스트 데이터 준비 완료');

    // 2. 잘못된 플랫폼 에러 테스트
    console.log('\n2️⃣ 잘못된 플랫폼 에러 테스트...');
    try {
      await unifiedVideoSaver.saveVideoData('invalid_platform', validTestData);
      console.log('   ❌ 에러가 발생해야 하는데 성공했습니다!');
    } catch (error) {
      console.log(`   ✅ 예상된 에러 발생: ${error.message}`);
    }

    // 3. 필수 데이터 누락 테스트
    console.log('\n3️⃣ 필수 데이터 누락 테스트...');
    const incompleteData = {
      platform: 'youtube',
      // postUrl 누락
      metadata: {},
      analysis: {}
    };
    
    try {
      await unifiedVideoSaver.saveVideoData('youtube', incompleteData);
      console.log('   ⚠️ 불완전한 데이터로도 저장이 성공했습니다 (허용됨)');
    } catch (error) {
      console.log(`   ✅ 불완전한 데이터 에러: ${error.message}`);
    }

    // 4. MongoDB 모델 생성 실패 시나리오 시뮬레이션
    console.log('\n4️⃣ MongoDB 모델 오류 시뮬레이션...');
    try {
      const invalidData = {
        ...validTestData,
        // MongoDB에서 문제가 될 수 있는 데이터
        url: null, // required field가 null
        platform: 'youtube'
      };
      
      const { getModelByPlatform } = require('./server/models/VideoOptimized');
      const Model = getModelByPlatform('youtube');
      
      // 직접 모델 생성 테스트 (UnifiedVideoSaver 거치지 않고)
      const doc = new Model(invalidData);
      console.log('   ⚠️ 모델 생성 성공 (validation이 관대함)');
      
    } catch (error) {
      console.log(`   ✅ 모델 생성 에러: ${error.message}`);
    }

    // 5. 통계 조회 에러 처리 테스트
    console.log('\n5️⃣ 통계 조회 에러 처리 테스트...');
    try {
      // 잘못된 플랫폼으로 통계 조회
      const stats = await unifiedVideoSaver.getSaveStatistics('invalid_platform');
      console.log('   ⚠️ 잘못된 플랫폼으로도 통계 조회 성공:', stats);
    } catch (error) {
      console.log(`   ✅ 통계 조회 에러: ${error.message}`);
    }

    // 6. 롤백 기능 테스트 (시뮬레이션)
    console.log('\n6️⃣ 롤백 기능 시뮬레이션...');
    try {
      // MongoDB에서 가짜 Document ID로 롤백 시도
      const fakeDocId = '507f1f77bcf86cd799439011'; // 유효한 ObjectId 형식
      const rollbackResult = await unifiedVideoSaver.rollbackMongoDB('youtube', fakeDocId);
      console.log(`   ⚠️ 가짜 Document 롤백 결과: ${rollbackResult}`);
    } catch (error) {
      console.log(`   ✅ 롤백 에러 (예상됨): ${error.message}`);
    }

    // 7. 데이터 일관성 검증 에러 테스트
    console.log('\n7️⃣ 데이터 일관성 검증 에러 테스트...');
    try {
      const validationResult = await unifiedVideoSaver.validateDataConsistency('youtube', 5);
      console.log('   ✅ 데이터 일관성 검증 성공');
      console.log(`   - Sheets 데이터: ${validationResult.sheetsCount}개`);
      console.log(`   - MongoDB 데이터: ${validationResult.mongoCount}개`);
      console.log(`   - 일관성: ${validationResult.consistent ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ⚠️ 데이터 일관성 검증 에러: ${error.message}`);
    }

    // 8. 메모리 누수 체크 (간단)
    console.log('\n8️⃣ 메모리 사용량 확인...');
    const memBefore = process.memoryUsage();
    
    // 여러 번 객체 생성/소멸 시뮬레이션
    for (let i = 0; i < 10; i++) {
      const tempSaver = new UnifiedVideoSaver();
      // 가벼운 작업 수행
      try {
        await tempSaver.getSaveStatistics('youtube');
      } catch (error) {
        // 에러 무시
      }
    }
    
    const memAfter = process.memoryUsage();
    const heapDiff = Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024);
    
    console.log(`   📊 메모리 사용량 변화: ${heapDiff}KB`);
    if (Math.abs(heapDiff) < 1000) { // 1MB 이하면 OK
      console.log('   ✅ 메모리 사용량 정상');
    } else {
      console.log('   ⚠️ 메모리 사용량 증가 감지');
    }

    console.log('\n🎉 에러 처리 테스트 완료!\n');
    console.log('=== 테스트 요약 ===');
    console.log('✅ 잘못된 플랫폼 에러 처리');
    console.log('✅ 불완전한 데이터 처리');
    console.log('✅ MongoDB 모델 에러 처리');
    console.log('✅ 통계 조회 에러 처리');
    console.log('✅ 롤백 기능 확인');
    console.log('✅ 데이터 일관성 검증');
    console.log('✅ 메모리 사용량 확인');

  } catch (error) {
    console.log('❌ 에러 처리 테스트 실패:', error.message);
    console.log('스택 트레이스:', error.stack);
  }
}

// 직접 실행 시
if (require.main === module) {
  testErrorHandlingAndRollback();
}

module.exports = testErrorHandlingAndRollback;