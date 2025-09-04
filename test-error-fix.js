/**
 * analysisResult 에러 수정 검증 테스트
 */

require('dotenv').config();
const UnifiedVideoSaver = require('./server/services/UnifiedVideoSaver');

async function testErrorFix() {
  console.log('🔧 analysisResult 에러 수정 검증 테스트\n');

  try {
    const unifiedVideoSaver = new UnifiedVideoSaver();

    const testData = {
      platform: 'youtube',
      postUrl: 'https://youtube.com/watch?v=error_fix_test_123',
      videoPath: '/test/error_fix.mp4',
      thumbnailPath: '/test/error_fix_thumb.jpg',
      metadata: {
        author: 'ErrorFixChannel',
        title: '에러 수정 테스트 비디오',
        views: 12345,
        likes: 678,
        uploadDate: new Date()
      },
      analysis: {
        mainCategory: '교육',
        title: 'AI가 분석한 제목',
        keywords: ['에러', '수정', '테스트'],
        content: '에러 수정을 위한 테스트 콘텐츠입니다',
        confidence: 0.95
      },
      timestamp: new Date().toISOString()
    };

    console.log('📊 에러 수정 후 저장 테스트...');
    const result = await unifiedVideoSaver.saveVideoData('youtube', testData);
    
    if (result.success) {
      console.log('✅ 저장 성공! analysisResult 에러가 해결되었습니다.');
      console.log(`   - Google Sheets: ${result.sheets ? '성공' : '실패'}`);
      console.log(`   - MongoDB: ${result.mongodb ? '성공' : '실패'}`);
      return true;
    } else {
      console.log('❌ 저장 실패:', result.error);
      return false;
    }

  } catch (error) {
    console.log('❌ 테스트 실패:', error.message);
    console.log('   에러 스택:', error.stack);
    return false;
  }
}

if (require.main === module) {
  testErrorFix().then(success => {
    if (success) {
      console.log('\n🎉 analysisResult 에러가 완전히 해결되었습니다!');
    } else {
      console.log('\n❌ 아직 에러가 남아있습니다.');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = testErrorFix;