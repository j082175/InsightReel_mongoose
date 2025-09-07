// YouTube 메타데이터 추출 테스트
require('dotenv').config();
const HybridYouTubeExtractor = require('./server/services/HybridYouTubeExtractor');
const HybridDataConverter = require('./server/services/HybridDataConverter');
const { ServerLogger } = require('./server/utils/logger');

async function testYouTubeMetadata() {
  console.log('🧪 YouTube 메타데이터 추출 테스트 시작\n');
  
  const extractor = new HybridYouTubeExtractor();
  
  // 테스트할 YouTube 비디오들 (다양한 유형)
  const testVideos = [
    {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      type: '일반 비디오 (Rick Astley - Never Gonna Give You Up)'
    },
    {
      url: 'https://www.youtube.com/shorts/lWTI-4SMsHc',
      type: 'YouTube Shorts'
    },
    {
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      type: '초기 YouTube 비디오 (Me at the zoo)'
    }
  ];
  
  for (const testVideo of testVideos) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📹 테스트: ${testVideo.type}`);
    console.log(`🔗 URL: ${testVideo.url}`);
    console.log('='.repeat(70));
    
    try {
      // 하이브리드 추출기로 데이터 추출
      const result = await extractor.extractVideoData(testVideo.url);
      
      if (!result.success) {
        console.log(`❌ 추출 실패: ${result.error}`);
        continue;
      }
      
      // 레거시 포맷으로 변환
      const videoId = extractor.extractVideoId(testVideo.url);
      const legacyData = HybridDataConverter.convertToLegacyFormat(result.data, videoId);
      
      // 주요 데이터 출력
      console.log('\n📊 추출된 메타데이터:');
      console.log(`  ✅ 제목: ${legacyData.title || '❌ 없음'}`);
      console.log(`  ✅ 채널: ${legacyData.channel || '❌ 없음'}`);
      console.log(`  ✅ 조회수: ${legacyData.views || '❌ 없음'}`);
      console.log(`  ✅ 좋아요: ${legacyData.likes || '❌ 없음'}`);
      console.log(`  ✅ 댓글수: ${legacyData.comments || '❌ 없음'}`);
      console.log(`  ✅ 길이: ${legacyData.durationFormatted || '❌ 없음'} (${legacyData.duration}초)`);
      console.log(`  ✅ 업로드: ${legacyData.publishedAt || '❌ 없음'}`);
      console.log(`  ✅ 카테고리: ${legacyData.category || '❌ 없음'}`);
      console.log(`  ✅ 콘텐츠 타입: ${legacyData.contentType || '❌ 없음'}`);
      console.log(`  ✅ 썸네일: ${legacyData.thumbnailUrl ? '✅ 있음' : '❌ 없음'}`);
      console.log(`  ✅ 설명: ${legacyData.description ? `${legacyData.description.substring(0, 50)}...` : '❌ 없음'}`);
      console.log(`  ✅ 태그: ${legacyData.tags?.length || 0}개`);
      
      // 데이터 소스 정보
      console.log('\n📡 데이터 소스:');
      console.log(`  - Primary: ${result.data.dataSources?.primary || 'unknown'}`);
      console.log(`  - ytdl-core: ${result.sources.ytdl ? '✅' : '❌'}`);
      console.log(`  - YouTube API: ${result.sources.api ? '✅' : '❌'}`);
      console.log(`  - 추출 시간: ${result.extractionTime}ms`);
      
      // 전체 점수 계산
      let score = 0;
      let maxScore = 11;
      if (legacyData.title && legacyData.title !== '제목 없음') score++;
      if (legacyData.channel) score++;
      if (legacyData.views && legacyData.views !== '0') score++;
      if (legacyData.likes && legacyData.likes !== '0') score++;
      if (legacyData.comments && legacyData.comments !== '0') score++;
      if (legacyData.duration > 0) score++;
      if (legacyData.publishedAt) score++;
      if (legacyData.category && legacyData.category !== '미분류') score++;
      if (legacyData.thumbnailUrl) score++;
      if (legacyData.description) score++;
      if (legacyData.tags?.length > 0) score++;
      
      const percentage = Math.round((score / maxScore) * 100);
      console.log(`\n🎯 완성도: ${score}/${maxScore} (${percentage}%)`);
      
      if (percentage >= 90) {
        console.log('✅ 우수한 메타데이터 추출!');
      } else if (percentage >= 70) {
        console.log('⚠️ 양호한 메타데이터 추출');
      } else {
        console.log('❌ 불완전한 메타데이터 추출');
      }
      
    } catch (error) {
      console.log(`\n❌ 테스트 실패: ${error.message}`);
      console.log(error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🏁 테스트 완료!');
  console.log('='.repeat(70));
  
  // 현재 설정 확인
  console.log('\n📋 현재 설정:');
  console.log(`  - USE_YTDL_FIRST: ${process.env.USE_YTDL_FIRST || 'true'}`);
  console.log(`  - YOUTUBE_API_KEY: ${process.env.YOUTUBE_API_KEY ? '✅ 설정됨' : '❌ 없음'}`);
  
  process.exit(0);
}

// 테스트 실행
testYouTubeMetadata().catch(error => {
  console.error('테스트 중 오류 발생:', error);
  process.exit(1);
});