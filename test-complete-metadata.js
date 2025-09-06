// 완전한 메타데이터 추출 테스트
require('dotenv').config();
const VideoProcessor = require('./server/services/VideoProcessor');
const { ServerLogger } = require('./server/utils/logger');

async function testCompleteMetadata() {
  console.log('🧪 완전한 YouTube 메타데이터 추출 테스트\n');
  console.log(`📋 현재 설정: USE_YTDL_FIRST = ${process.env.USE_YTDL_FIRST || 'true'}\n`);
  
  const processor = new VideoProcessor();
  
  // 테스트 비디오
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Astley
  
  try {
    console.log('🔍 비디오 정보 추출 중...\n');
    const videoInfo = await processor.getYouTubeVideoInfo(testUrl);
    
    // 필수 필드 체크
    const fields = {
      '기본 정보': {
        '제목': videoInfo.title,
        '설명': videoInfo.description ? `${videoInfo.description.substring(0, 50)}...` : '❌ 없음',
        '채널명': videoInfo.channel,
        '채널ID': videoInfo.channelId,
        '채널URL': videoInfo.channelUrl,
      },
      '통계': {
        '조회수': videoInfo.views,
        '좋아요': videoInfo.likes,
        '댓글수': videoInfo.comments,
        '구독자수': videoInfo.subscribers,
        '채널 비디오수': videoInfo.channelVideos,
      },
      '메타데이터': {
        '길이': `${videoInfo.durationFormatted} (${videoInfo.duration}초)`,
        '업로드일': videoInfo.uploadDate,
        '카테고리': videoInfo.youtubeCategory,
        '카테고리ID': videoInfo.categoryId,
        '콘텐츠타입': videoInfo.contentType,
        '언어': videoInfo.language || '❌ 없음',
      },
      '추가 정보': {
        'YouTube핸들': videoInfo.youtubeHandle || '❌ 없음',
        '해시태그': Array.isArray(videoInfo.hashtags) ? `${videoInfo.hashtags.length}개` : '❌ 없음',
        '멘션': Array.isArray(videoInfo.mentions) ? `${videoInfo.mentions.length}개` : '❌ 없음',
        '상위댓글': videoInfo.topComments ? '✅ 있음' : '❌ 없음',
        '썸네일': videoInfo.thumbnailUrl ? '✅ 있음' : '❌ 없음',
      }
    };
    
    // 결과 출력
    for (const [category, items] of Object.entries(fields)) {
      console.log(`\n📊 ${category}:`);
      for (const [key, value] of Object.entries(items)) {
        const status = value && value !== '❌ 없음' && value !== '0' ? '✅' : '❌';
        console.log(`  ${status} ${key}: ${value}`);
      }
    }
    
    // 점수 계산
    let score = 0;
    let total = 0;
    for (const items of Object.values(fields)) {
      for (const value of Object.values(items)) {
        total++;
        if (value && value !== '❌ 없음' && value !== '0') {
          score++;
        }
      }
    }
    
    const percentage = Math.round((score / total) * 100);
    console.log('\n' + '='.repeat(50));
    console.log(`🎯 완성도: ${score}/${total} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('✅ 완벽한 메타데이터 추출!');
    } else if (percentage >= 70) {
      console.log('⚠️ 대부분의 메타데이터 추출됨');
    } else {
      console.log('❌ 메타데이터 추출 불완전');
    }
    
    // 실제 데이터 구조 확인
    console.log('\n📋 실제 반환된 주요 필드:');
    console.log('- 구독자수:', videoInfo.subscribers);
    console.log('- 채널 비디오수:', videoInfo.channelVideos);
    console.log('- YouTube 핸들:', videoInfo.youtubeHandle);
    console.log('- 해시태그:', videoInfo.hashtags);
    console.log('- 멘션:', videoInfo.mentions);
    console.log('- 상위 댓글 길이:', videoInfo.topComments?.length || 0);
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testCompleteMetadata();