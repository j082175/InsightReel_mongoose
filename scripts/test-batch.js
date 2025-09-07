const axios = require('axios');
require('dotenv').config();

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * 큰 배치 테스트 - videos API 정확한 quota 측정
 */
async function testBigBatch() {
  console.log('🧪 Videos API 배치 quota 측정 테스트');
  
  // 활발한 채널 (더 많은 영상이 있을 것)
  const activeChannels = [
    'UCXuqSBlHAE6Xw-yeJA0Tunw', // Linus Tech Tips
    'UCsBjURrPoezykLs9EqgamOA', // Fireship  
    'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
    'UCJbPGzawDH1njbqV-D5HqKw', // BroCode
    'UCeVMnSShP_Iviwkknt83cww'  // CodeWithHarry
  ];
  
  console.log(`📋 ${activeChannels.length}개 활발한 채널에서 영상 수집`);
  
  let allVideoIds = [];
  
  // 여러 채널에서 영상 ID 수집
  for (const channelId of activeChannels) {
    try {
      console.log(`🔍 ${channelId} 검색 중...`);
      
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'id',
          channelId: channelId,
          publishedAfter: '2024-08-01T00:00:00Z', // 한 달 전 (더 많은 영상)
          order: 'date',
          type: 'video',
          maxResults: 15, // 채널당 15개씩
          key: YOUTUBE_API_KEY
        }
      });
      
      const videoIds = response.data.items?.map(item => item.id.videoId) || [];
      allVideoIds = allVideoIds.concat(videoIds);
      console.log(`  ✅ ${videoIds.length}개 영상 ID 수집`);
      
      await new Promise(resolve => setTimeout(resolve, 200)); // 딜레이
      
    } catch (error) {
      console.log(`  ❌ 오류:`, error.response?.data?.error?.message || error.message);
    }
  }
  
  console.log(`\n📊 총 수집된 영상 ID: ${allVideoIds.length}개`);
  
  if (allVideoIds.length === 0) {
    console.log('❌ 수집된 영상이 없어서 테스트 중단');
    return;
  }
  
  // 최대 50개로 제한 (API 한계)
  const testIds = allVideoIds.slice(0, Math.min(50, allVideoIds.length));
  console.log(`🎯 테스트할 영상: ${testIds.length}개`);
  console.log(`📋 ID들: ${testIds.slice(0, 5).join(', ')}...`);
  
  // 핵심 테스트: Videos API 배치 호출
  console.log(`\n🚀 Videos API 배치 호출 (${testIds.length}개 영상)`);
  console.log('💰 이 호출이 1 unit인지 확인하는 것이 목표!');
  
  try {
    const startTime = Date.now();
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'statistics,snippet',
        id: testIds.join(','),
        key: YOUTUBE_API_KEY
      }
    });
    
    const endTime = Date.now();
    const videos = response.data.items || [];
    
    console.log(`✅ 배치 호출 완료!`);
    console.log(`📊 응답: ${videos.length}개 영상 데이터`);
    console.log(`⏱️ 소요시간: ${endTime - startTime}ms`);
    
    // 조회수 분석
    const highViewVideos = videos.filter(v => parseInt(v.statistics?.viewCount || 0) > 100000);
    console.log(`🔥 10만 조회수 이상: ${highViewVideos.length}개`);
    
    // 상위 5개 영상
    console.log(`\n🏆 상위 조회수 영상들:`);
    videos
      .sort((a, b) => parseInt(b.statistics?.viewCount || 0) - parseInt(a.statistics?.viewCount || 0))
      .slice(0, 5)
      .forEach((video, idx) => {
        const title = video.snippet.title.substring(0, 40);
        const views = parseInt(video.statistics.viewCount || 0);
        console.log(`  ${idx+1}. ${title}... | ${views.toLocaleString()}회`);
      });
    
    console.log(`\n💡 이제 Google Cloud Console에서 quota 사용량을 확인해보세요!`);
    console.log(`📊 예상: Search API ${activeChannels.length * 100} units + Videos API ? units`);
    
  } catch (error) {
    console.log(`❌ Videos API 오류:`, error.response?.data || error.message);
  }
}

testBigBatch().catch(console.error);