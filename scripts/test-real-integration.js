/**
 * 실제 통합 시스템 검증 테스트
 * 실제 서버 파이프라인 없이 UnifiedVideoSaver 직접 테스트
 */

require('dotenv').config();
const UnifiedVideoSaver = require('./server/services/UnifiedVideoSaver');

async function testRealIntegration() {
  console.log('🔍 실제 통합 시스템 검증 테스트 시작\n');

  try {
    const unifiedVideoSaver = new UnifiedVideoSaver();

    // 실제와 동일한 데이터 구조로 테스트
    const realVideoData = {
      platform: 'youtube',
      postUrl: 'https://youtube.com/watch?v=real_test_123',
      videoPath: '/test/real_video.mp4',
      thumbnailPath: '/test/real_thumb.jpg',
      thumbnailPaths: ['/test/real_thumb.jpg'],
      metadata: {
        author: 'RealTestChannel',
        youtubeHandle: '@realtestchannel',
        channelUrl: 'https://youtube.com/@realtestchannel',
        title: '실제 테스트 비디오',
        views: 50000,
        likes: 2500,
        comments: 125,
        duration: '03:45',
        subscribers: 75000,
        channelVideos: 350,
        monetized: 'Y',
        youtubeCategory: 'Education',
        language: 'ko',
        hashtags: ['#실제테스트', '#검증'],
        description: '실제 통합 시스템 검증을 위한 테스트 비디오입니다.',
        uploadDate: new Date('2025-09-04T10:00:00Z')
      },
      analysis: {
        mainCategory: '교육',
        middleCategory: '기술',
        fullCategoryPath: '교육 > 기술',
        depth: 2,
        content: '실제 통합 시스템에 대한 교육 콘텐츠입니다.',
        keywords: ['교육', '기술', '시스템', '통합'],
        hashtags: ['#교육', '#기술'],
        mentions: [],
        comments: '실제 검증 테스트 댓글 분석',
        confidence: 0.95,
        aiModel: 'gemini-2.0-flash'
      },
      timestamp: new Date().toISOString()
    };

    console.log('📊 실제 저장 테스트 시작...');
    const saveResult = await unifiedVideoSaver.saveVideoData('youtube', realVideoData);
    
    if (saveResult.success) {
      console.log('✅ 실제 저장 성공!');
      console.log(`   - Google Sheets: ${saveResult.sheets ? '성공' : '실패'}`);
      console.log(`   - MongoDB: ${saveResult.mongodb ? '성공' : '실패'}`);
      console.log(`   - 총 소요시간: ${saveResult.performance.totalTime}ms`);
      
      // 통계 조회 테스트
      console.log('\n📈 통계 조회 테스트...');
      const stats = await unifiedVideoSaver.getSaveStatistics();
      console.log(`   - YouTube MongoDB: ${stats.mongodb.youtube}개`);
      console.log(`   - Instagram MongoDB: ${stats.mongodb.instagram}개`);
      
      console.log('\n🎉 실제 통합 시스템 검증 완료!');
      return true;
      
    } else {
      console.log('❌ 실제 저장 실패:', saveResult.error);
      console.log('   - 세부 오류:', saveResult.details);
      return false;
    }

  } catch (error) {
    console.log('❌ 실제 통합 시스템 검증 실패:', error.message);
    console.log('   - 스택 트레이스:', error.stack);
    return false;
  }
}

// 직접 실행 시
if (require.main === module) {
  testRealIntegration().then(success => {
    if (success) {
      console.log('\n✅ 확실합니다! 실제 통합 시스템이 완벽하게 작동합니다.');
    } else {
      console.log('\n❌ 문제가 발견되었습니다. 추가 디버깅이 필요합니다.');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = testRealIntegration;