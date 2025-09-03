const mongoose = require('mongoose');
const SheetsManager = require('../services/SheetsManager');
const VideoUrl = require('../models/VideoUrl');
const { ServerLogger } = require('../utils/logger');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

/**
 * 🚀 URL 중복 검사 성능 비교 테스트
 * 
 * MongoDB vs Google Sheets 성능 비교:
 * - 검색 속도 측정
 * - 메모리 사용량 분석
 * - 확장성 평가
 */

class DuplicateCheckPerformanceTest {
  constructor() {
    this.sheetsManager = new SheetsManager();
    this.testResults = {
      mongodb: {
        times: [],
        errors: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      },
      googleSheets: {
        times: [],
        errors: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      }
    };
  }

  // 🔗 MongoDB 연결
  async connectMongoDB() {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
        ServerLogger.info('✅ MongoDB 연결 성공', 'PERFORMANCE_TEST');
      }
      return true;
    } catch (error) {
      ServerLogger.error('❌ MongoDB 연결 실패', error.message, 'PERFORMANCE_TEST');
      return false;
    }
  }

  // 🧪 테스트용 URL 샘플 준비
  async prepareTestUrls() {
    try {
      // MongoDB에서 실제 URL 샘플 가져오기
      const existingUrls = await VideoUrl.find().limit(10).lean();
      
      const testUrls = [
        // 1. 실제 존재하는 URL들 (중복 검사에서 발견되어야 함)
        ...existingUrls.map(url => ({
          url: url.originalUrl,
          expected: 'duplicate',
          normalizedUrl: url.normalizedUrl,
          platform: url.platform
        })),
        
        // 2. 존재하지 않는 URL들 (중복 검사에서 발견되지 않아야 함)
        {
          url: 'https://www.youtube.com/watch?v=NONEXISTENT_VIDEO_ID_12345',
          expected: 'not_duplicate',
          platform: 'youtube'
        },
        {
          url: 'https://www.instagram.com/p/NONEXISTENT_POST_12345/',
          expected: 'not_duplicate', 
          platform: 'instagram'
        },
        {
          url: 'https://www.tiktok.com/@user/video/1234567890123456789',
          expected: 'not_duplicate',
          platform: 'tiktok'
        },
        
        // 3. 다양한 URL 형식 테스트
        {
          url: 'https://youtu.be/NONEXISTENT_SHORT_ID',
          expected: 'not_duplicate',
          platform: 'youtube'
        },
        {
          url: 'https://youtube.com/shorts/NONEXISTENT_SHORTS',
          expected: 'not_duplicate', 
          platform: 'youtube'
        }
      ];
      
      ServerLogger.info(`🎯 테스트 URL 준비 완료: ${testUrls.length}개`, 'PERFORMANCE_TEST');
      return testUrls;
      
    } catch (error) {
      ServerLogger.error('테스트 URL 준비 실패', error.message, 'PERFORMANCE_TEST');
      return [];
    }
  }

  // ⚡ MongoDB 방식 성능 테스트
  async testMongoDBMethod(testUrls) {
    ServerLogger.info('⚡ MongoDB 중복 검사 성능 테스트 시작', 'PERFORMANCE_TEST');
    
    for (let i = 0; i < testUrls.length; i++) {
      const testUrl = testUrls[i];
      
      try {
        const startTime = process.hrtime.bigint();
        
        // MongoDB 기반 중복 검사
        const result = await this.sheetsManager.checkDuplicateURLFast(testUrl.url);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // 나노초를 밀리초로 변환
        
        this.testResults.mongodb.times.push(duration);
        
        // 결과 검증
        const expectedDuplicate = testUrl.expected === 'duplicate';
        const actualDuplicate = result.isDuplicate;
        
        if (expectedDuplicate === actualDuplicate) {
          console.log(`✅ MongoDB 테스트 ${i + 1}: ${duration.toFixed(2)}ms - ${testUrl.url}`);
        } else {
          console.log(`⚠️ MongoDB 테스트 ${i + 1}: ${duration.toFixed(2)}ms - 결과 불일치 (예상: ${expectedDuplicate}, 실제: ${actualDuplicate})`);
        }
        
      } catch (error) {
        this.testResults.mongodb.errors++;
        ServerLogger.error(`❌ MongoDB 테스트 ${i + 1} 실패`, error.message, 'PERFORMANCE_TEST');
      }
    }
  }

  // 🐌 Google Sheets 방식 성능 테스트
  async testGoogleSheetsMethod(testUrls) {
    ServerLogger.info('🐌 Google Sheets 중복 검사 성능 테스트 시작', 'PERFORMANCE_TEST');
    
    for (let i = 0; i < testUrls.length; i++) {
      const testUrl = testUrls[i];
      
      try {
        const startTime = process.hrtime.bigint();
        
        // Google Sheets 방식 중복 검사
        const result = await this.sheetsManager.checkDuplicateURL(testUrl.url);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // 나노초를 밀리초로 변환
        
        this.testResults.googleSheets.times.push(duration);
        
        // 결과 검증
        const expectedDuplicate = testUrl.expected === 'duplicate';
        const actualDuplicate = result.isDuplicate;
        
        if (expectedDuplicate === actualDuplicate) {
          console.log(`✅ Sheets 테스트 ${i + 1}: ${duration.toFixed(2)}ms - ${testUrl.url}`);
        } else {
          console.log(`⚠️ Sheets 테스트 ${i + 1}: ${duration.toFixed(2)}ms - 결과 불일치 (예상: ${expectedDuplicate}, 실제: ${actualDuplicate})`);
        }
        
      } catch (error) {
        this.testResults.googleSheets.errors++;
        ServerLogger.error(`❌ Google Sheets 테스트 ${i + 1} 실패`, error.message, 'PERFORMANCE_TEST');
      }
    }
  }

  // 📊 성능 통계 계산
  calculateStats() {
    // MongoDB 통계
    if (this.testResults.mongodb.times.length > 0) {
      const mongoTimes = this.testResults.mongodb.times;
      this.testResults.mongodb.avgTime = mongoTimes.reduce((a, b) => a + b, 0) / mongoTimes.length;
      this.testResults.mongodb.maxTime = Math.max(...mongoTimes);
      this.testResults.mongodb.minTime = Math.min(...mongoTimes);
    }

    // Google Sheets 통계
    if (this.testResults.googleSheets.times.length > 0) {
      const sheetsTimes = this.testResults.googleSheets.times;
      this.testResults.googleSheets.avgTime = sheetsTimes.reduce((a, b) => a + b, 0) / sheetsTimes.length;
      this.testResults.googleSheets.maxTime = Math.max(...sheetsTimes);
      this.testResults.googleSheets.minTime = Math.min(...sheetsTimes);
    }
  }

  // 🎯 성능 비교 결과 출력
  printPerformanceComparison() {
    this.calculateStats();
    
    console.log('\n🚀 ===== URL 중복 검사 성능 비교 결과 =====\n');
    
    // MongoDB 결과
    console.log('⚡ MongoDB 방식:');
    console.log(`  평균 응답시간: ${this.testResults.mongodb.avgTime.toFixed(2)}ms`);
    console.log(`  최소 응답시간: ${this.testResults.mongodb.minTime.toFixed(2)}ms`);  
    console.log(`  최대 응답시간: ${this.testResults.mongodb.maxTime.toFixed(2)}ms`);
    console.log(`  성공 테스트: ${this.testResults.mongodb.times.length}개`);
    console.log(`  실패 테스트: ${this.testResults.mongodb.errors}개`);
    
    console.log('\n🐌 Google Sheets 방식:');
    console.log(`  평균 응답시간: ${this.testResults.googleSheets.avgTime.toFixed(2)}ms`);
    console.log(`  최소 응답시간: ${this.testResults.googleSheets.minTime.toFixed(2)}ms`);
    console.log(`  최대 응답시간: ${this.testResults.googleSheets.maxTime.toFixed(2)}ms`);
    console.log(`  성공 테스트: ${this.testResults.googleSheets.times.length}개`);
    console.log(`  실패 테스트: ${this.testResults.googleSheets.errors}개`);
    
    // 성능 비교
    if (this.testResults.mongodb.avgTime > 0 && this.testResults.googleSheets.avgTime > 0) {
      const speedImprovement = (this.testResults.googleSheets.avgTime / this.testResults.mongodb.avgTime).toFixed(1);
      const timeSaved = (this.testResults.googleSheets.avgTime - this.testResults.mongodb.avgTime).toFixed(2);
      
      console.log('\n🎯 성능 비교:');
      console.log(`  MongoDB가 ${speedImprovement}배 빠름! ⚡`);
      console.log(`  검색당 ${timeSaved}ms 단축`);
      
      if (speedImprovement >= 10) {
        console.log('  🔥 MongoDB 사용을 강력 권장! (10배 이상 성능 향상)');
      } else if (speedImprovement >= 2) {
        console.log('  ✅ MongoDB 사용 권장 (2배 이상 성능 향상)');
      } else {
        console.log('  📊 성능 차이가 미미함');
      }
      
      // 대량 데이터에서의 예상 성능
      console.log('\n📈 대량 데이터 예상 성능:');
      const dataScales = [100, 1000, 10000];
      
      for (const scale of dataScales) {
        const mongoTime = this.testResults.mongodb.avgTime * Math.log2(scale);
        const sheetsTime = this.testResults.googleSheets.avgTime * scale;
        const improvement = (sheetsTime / mongoTime).toFixed(0);
        
        console.log(`  ${scale}개 데이터: MongoDB ${mongoTime.toFixed(0)}ms vs Sheets ${sheetsTime.toFixed(0)}ms (${improvement}배 차이)`);
      }
    }
    
    console.log('\n🎉 성능 테스트 완료!\n');
  }

  // 🚀 전체 성능 테스트 실행
  async runPerformanceTest() {
    const startTime = Date.now();
    
    try {
      ServerLogger.info('🚀 URL 중복 검사 성능 비교 테스트 시작', 'PERFORMANCE_TEST');
      
      // 1. MongoDB 연결
      const connected = await this.connectMongoDB();
      if (!connected) {
        throw new Error('MongoDB 연결 실패');
      }

      // 2. 테스트 URL 준비
      const testUrls = await this.prepareTestUrls();
      if (testUrls.length === 0) {
        throw new Error('테스트 URL 없음');
      }

      console.log(`\n📊 테스트 대상: ${testUrls.length}개 URL\n`);

      // 3. MongoDB 방식 테스트
      await this.testMongoDBMethod(testUrls);
      
      console.log('\n⏳ Google Sheets 테스트를 위해 2초 대기...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Google Sheets 방식 테스트
      await this.testGoogleSheetsMethod(testUrls);

      // 5. 결과 분석 및 출력
      this.printPerformanceComparison();

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      ServerLogger.info(`🏁 성능 테스트 완료! (총 ${totalTime}초 소요)`, 'PERFORMANCE_TEST');
      
    } catch (error) {
      ServerLogger.error('❌ 성능 테스트 실패', error.message, 'PERFORMANCE_TEST');
      throw error;
    }
  }
}

// 🎯 스크립트 실행
async function runPerformanceTest() {
  const tester = new DuplicateCheckPerformanceTest();
  
  try {
    await tester.runPerformanceTest();
    
  } catch (error) {
    console.error('\n💥 성능 테스트 실패:', error.message);
    process.exit(1);
  } finally {
    // MongoDB 연결 종료
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

// 스크립트 직접 실행시
if (require.main === module) {
  runPerformanceTest();
}

module.exports = DuplicateCheckPerformanceTest;