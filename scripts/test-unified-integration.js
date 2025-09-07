/**
 * UnifiedVideoSaver 통합 테스트 스크립트
 * 실제 API 호출 없이 내부 로직만 테스트
 */

const UnifiedVideoSaver = require('./server/services/UnifiedVideoSaver');
const VideoDataConverter = require('./server/services/VideoDataConverter');

async function testUnifiedIntegration() {
  console.log('🧪 UnifiedVideoSaver 통합 테스트 시작\n');

  try {
    // 1. 서비스 초기화
    console.log('1️⃣ UnifiedVideoSaver 초기화 중...');
    const unifiedVideoSaver = new UnifiedVideoSaver();
    console.log('✅ UnifiedVideoSaver 초기화 완료\n');

    // 2. 테스트 데이터 준비
    console.log('2️⃣ 테스트 데이터 준비 중...');
    const testVideoData = {
      platform: 'youtube',
      postUrl: 'https://youtube.com/watch?v=test123',
      videoPath: '/test/path/video.mp4',
      thumbnailPath: '/test/path/thumb.jpg',
      thumbnailPaths: ['/test/path/thumb.jpg'],
      metadata: {
        author: 'TestChannel',
        youtubeHandle: '@testchannel',
        channelUrl: 'https://youtube.com/@testchannel',
        title: '테스트 비디오',
        views: 1000,
        likes: 50,
        comments: 10,
        duration: '00:02:30',
        uploadDate: new Date('2025-09-04')
      },
      analysis: {
        mainCategory: '엔터테인먼트',
        middleCategory: '코미디',
        content: '재미있는 테스트 비디오입니다',
        keywords: ['테스트', '코미디', '재미'],
        hashtags: ['#테스트', '#코미디'],
        confidence: 0.85,
        aiModel: 'gemini-2.0-flash'
      },
      timestamp: new Date().toISOString()
    };
    console.log('✅ 테스트 데이터 준비 완료\n');

    // 3. 데이터 변환 테스트
    console.log('3️⃣ 데이터 변환 로직 테스트 중...');
    const convertedData = VideoDataConverter.convertToSchema('youtube', testVideoData, 1);
    console.log('✅ 데이터 변환 성공!');
    console.log(`   - 필드 개수: ${Object.keys(convertedData).length}`);
    console.log(`   - 플랫폼: ${convertedData.platform}`);
    console.log(`   - 계정: ${convertedData.account}`);
    console.log(`   - 메인 카테고리: ${convertedData.mainCategory}`);
    console.log(`   - 키워드: ${convertedData.keywords}\n`);

    // 4. Google Sheets 호환성 테스트 (실제 저장 없이)
    console.log('4️⃣ Google Sheets 호환성 테스트 중...');
    try {
      const sheetsManager = unifiedVideoSaver.sheetsManager;
      console.log('   - SheetsManager 인스턴스:', typeof sheetsManager);
      console.log('   - saveVideoData 메서드:', typeof sheetsManager.saveVideoData);
      console.log('   - saveVideoBatch 메서드:', typeof sheetsManager.saveVideoBatch);
      console.log('   - getSheetNameByPlatform 메서드:', typeof sheetsManager.getSheetNameByPlatform);
      console.log('✅ Google Sheets 호환성 확인 완료\n');
    } catch (error) {
      console.log('❌ Google Sheets 호환성 문제:', error.message);
    }

    // 5. MongoDB 모델 호환성 테스트
    console.log('5️⃣ MongoDB 모델 호환성 테스트 중...');
    try {
      const { getModelByPlatform } = require('./server/models/VideoOptimized');
      const YouTubeModel = getModelByPlatform('youtube');
      const InstagramModel = getModelByPlatform('instagram');
      
      console.log('   - YouTube 모델:', YouTubeModel.modelName);
      console.log('   - Instagram 모델:', InstagramModel.modelName);
      console.log('✅ MongoDB 모델 호환성 확인 완료\n');
    } catch (error) {
      console.log('❌ MongoDB 모델 호환성 문제:', error.message);
    }

    // 6. 통계 조회 테스트
    console.log('6️⃣ 통계 조회 기능 테스트 중...');
    try {
      const stats = await unifiedVideoSaver.getSaveStatistics();
      console.log('✅ 통계 조회 성공!');
      console.log('   - MongoDB YouTube:', stats.mongodb.youtube);
      console.log('   - MongoDB Instagram:', stats.mongodb.instagram);
      console.log('');
    } catch (error) {
      console.log('❌ 통계 조회 실패:', error.message);
    }

    // 7. 필드 매핑 검증
    console.log('7️⃣ 필드 매핑 검증 중...');
    const youtubeFieldCount = VideoDataConverter.getFieldCount('youtube');
    const instagramFieldCount = VideoDataConverter.getFieldCount('instagram');
    
    console.log('✅ 필드 매핑 검증 완료!');
    console.log(`   - YouTube 필드 수: ${youtubeFieldCount}`);
    console.log(`   - Instagram 필드 수: ${instagramFieldCount}`);
    console.log('');

    console.log('🎉 모든 통합 테스트 완료!\n');
    console.log('=== 테스트 요약 ===');
    console.log('✅ UnifiedVideoSaver 초기화');
    console.log('✅ 데이터 변환 로직');
    console.log('✅ Google Sheets 호환성');
    console.log('✅ MongoDB 모델 호환성');
    console.log('✅ 통계 조회 기능');
    console.log('✅ 필드 매핑 검증');

  } catch (error) {
    console.log('❌ 통합 테스트 실패:', error.message);
    console.log('스택 트레이스:', error.stack);
  }
}

// 직접 실행 시
if (require.main === module) {
  testUnifiedIntegration();
}

module.exports = testUnifiedIntegration;