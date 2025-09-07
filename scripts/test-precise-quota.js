const axios = require('axios');
require('dotenv').config();

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * 정밀 quota 측정 테스트
 * 한 번에 하나씩만 호출해서 정확히 측정
 */
async function preciseMeasurement() {
  console.log('🎯 정밀 YouTube API quota 측정 시작');
  console.log('📋 각 단계별로 Google Console에서 확인할 수 있도록 천천히 진행');
  console.log('');
  
  if (!YOUTUBE_API_KEY) {
    console.log('❌ API 키가 없습니다');
    return;
  }

  // 간단한 채널 하나만 사용
  const testChannelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers
  
  console.log('📍 단계 1: Search API 1회 호출 측정');
  console.log('🕐 지금 Google Console에서 현재 quota 확인해주세요!');
  console.log('⏳ 10초 대기...');
  await waitWithCountdown(10);
  
  try {
    console.log('🔍 Search API 호출 시작...');
    const searchStart = Date.now();
    
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'id,snippet',
        channelId: testChannelId,
        publishedAfter: '2024-08-30T00:00:00Z',
        order: 'date',
        type: 'video',
        maxResults: 5, // 적은 수로
        key: YOUTUBE_API_KEY
      }
    });
    
    const searchTime = Date.now() - searchStart;
    const videos = searchResponse.data.items || [];
    
    console.log(`✅ Search API 완료: ${videos.length}개 영상 (${searchTime}ms)`);
    console.log('💰 공식적으로 이 호출은 100 units 비용');
    console.log('📊 지금 Google Console에서 quota가 얼마나 증가했는지 확인해주세요!');
    console.log('');
    
    if (videos.length === 0) {
      console.log('📄 영상이 없어서 Videos API 테스트 불가');
      return;
    }
    
    const videoIds = videos.map(v => v.id.videoId);
    console.log(`📋 가져온 영상 ID들: ${videoIds.join(', ')}`);
    
    console.log('⏳ 10초 대기 후 Videos API 호출...');
    await waitWithCountdown(10);
    
    console.log('📍 단계 2: Videos API 1회 호출 측정');
    console.log(`📊 ${videoIds.length}개 영상의 상세 정보 조회`);
    
    const videosStart = Date.now();
    
    const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'statistics,snippet',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY
      }
    });
    
    const videosTime = Date.now() - videosStart;
    const videosData = videosResponse.data.items || [];
    
    console.log(`✅ Videos API 완료: ${videosData.length}개 영상 상세 (${videosTime}ms)`);
    console.log('💰 이 호출의 비용이 궁금한 부분!');
    console.log(`   - 만약 1 unit이면: 지금까지 총 101 units 증가`);
    console.log(`   - 만약 ${videoIds.length} units이면: 지금까지 총 ${100 + videoIds.length} units 증가`);
    console.log('');
    
    // 결과 표시
    console.log('📈 조회수 결과:');
    videosData.forEach((video, idx) => {
      const title = video.snippet.title.substring(0, 40);
      const views = parseInt(video.statistics?.viewCount || 0);
      console.log(`  ${idx + 1}. ${title}... | ${views.toLocaleString()}회`);
    });
    
    console.log('');
    console.log('🎯 최종 확인 요청:');
    console.log('📊 Google Console에서 총 quota 증가량을 확인해주세요!');
    console.log('💡 정확한 수치를 알려주시면 Videos API 비용을 확실히 계산할 수 있습니다!');
    
  } catch (error) {
    console.log(`❌ 오류 발생:`, error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.log('🚨 403 오류 - API 키 문제 또는 quota 초과');
      console.log('📊 Google Console에서 현재 quota 상태를 확인해보세요');
    }
  }
}

// 카운트다운 대기 함수
async function waitWithCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r⏳ ${i}초 남음...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\r✅ 대기 완료!     ');
}

// 실행
preciseMeasurement().catch(console.error);