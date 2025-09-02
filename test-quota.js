const axios = require('axios');

// 환경변수 로드
require('dotenv').config();

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * YouTube API quota 테스트
 */
async function testYouTubeQuota() {
  console.log('🧪 YouTube API quota 테스트 시작');
  console.log('📍 API 키 존재:', !!YOUTUBE_API_KEY);
  
  if (!YOUTUBE_API_KEY) {
    console.log('❌ GOOGLE_API_KEY 환경변수가 설정되지 않음');
    return;
  }
  
  // 테스트용 채널들 (유명한 채널들)
  const testChannels = [
    'UC_x5XG1OV2P6uZZ5FSM9Ttw', // Google Developers
    'UCXuqSBlHAE6Xw-yeJA0Tunw', // Linus Tech Tips
    'UCsBjURrPoezykLs9EqgamOA'  // Fireship
  ];
  
  console.log(`📋 테스트 채널: ${testChannels.length}개`);
  
  for (let i = 0; i < testChannels.length; i++) {
    const channelId = testChannels[i];
    console.log(`\n--- ${i+1}/${testChannels.length}: ${channelId} ---`);
    
    try {
      // 1단계: Search API 호출 (100 units)
      console.log('🔍 Search API 호출...');
      const startTime = Date.now();
      
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'id,snippet',
          channelId: channelId,
          publishedAfter: '2024-08-30T00:00:00Z', // 3일 전
          publishedBefore: '2024-09-02T23:59:59Z',
          order: 'date',
          type: 'video',
          maxResults: 10, // 작게 시작
          key: YOUTUBE_API_KEY
        }
      });
      
      const searchTime = Date.now() - startTime;
      const videos = searchResponse.data.items || [];
      console.log(`✅ Search 완료: ${videos.length}개 영상 (${searchTime}ms)`);
      
      if (videos.length === 0) {
        console.log('📄 해당 기간 영상 없음');
        continue;
      }
      
      // 2단계: Videos API 호출 (? units)
      const videoIds = videos.map(v => v.id.videoId).join(',');
      console.log('📊 Videos API 호출...');
      console.log(`📋 조회할 영상 ID: ${videoIds}`);
      
      const videosStartTime = Date.now();
      
      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'statistics,snippet',
          id: videoIds,
          key: YOUTUBE_API_KEY
        }
      });
      
      const videosTime = Date.now() - videosStartTime;
      const videosData = videosResponse.data.items || [];
      console.log(`✅ Videos 완료: ${videosData.length}개 영상 상세 (${videosTime}ms)`);
      
      // 결과 분석
      console.log('📈 조회수 분석:');
      videosData.forEach((video, idx) => {
        const title = video.snippet.title.substring(0, 30);
        const views = parseInt(video.statistics.viewCount || 0);
        console.log(`  ${idx+1}. ${title}... | ${views.toLocaleString()}회`);
      });
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ 총 소요시간: ${totalTime}ms`);
      console.log(`💰 예상 quota 비용:`);
      console.log(`  - Search API: 100 units`);
      console.log(`  - Videos API: ? units (${videos.length}개 영상)`);
      
      // 1초 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ 오류 발생:`, error.response?.data || error.message);
      
      if (error.response?.status === 403) {
        console.log('🚨 403 오류 - quota 초과 또는 권한 문제');
        break;
      }
    }
  }
  
  console.log('\n🏁 테스트 완료');
  console.log('📊 이제 Google Cloud Console에서 quota 사용량을 확인해보세요!');
}

// 테스트 실행
testYouTubeQuota().catch(console.error);