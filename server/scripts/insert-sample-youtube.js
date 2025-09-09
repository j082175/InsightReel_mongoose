const mongoose = require('mongoose');
const Video = require('../models/Video');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function insertSampleYouTubeData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');
    
    // 샘플 YouTube 데이터
    const sampleVideos = [
      {
        platform: 'youtube',
        timestamp: new Date('2025-09-03T00:00:00Z'),
        channelName: '별쇼츠',
        title: 'YouTube Shorts 테스트 영상 1',
        originalUrl: 'https://www.youtube.com/shorts/Tw6HFU0ffc8',
        likes: 1205,
        views: 15670,
        shares: 45,
        comments_count: 23,
        category: '코미디',
        ai_description: 'YouTube Shorts 테스트용 샘플 영상입니다',
        keywords: ['유튜브', '쇼츠', '테스트'],
        duration: '00:30',
        hashtags: ['#유튜브', '#쇼츠', '#테스트'],
        sheets_row_data: {
          id: '7',
          mainCategory: '코미디',
          middleCategory: '엔터테인먼트',
          fullCategoryPath: '코미디 > 엔터테인먼트',
          categoryDepth: 'YouTube Shorts 테스트용 샘플 영상입니다',
          confidence: '95%',
          source: 'manual_test'
        }
      },
      {
        platform: 'youtube',
        timestamp: new Date('2025-09-03T01:00:00Z'),
        channelName: '테스트채널',
        title: 'YouTube 일반 영상 테스트',
        originalUrl: 'https://www.youtube.com/watch?v=8PX5IQmUgEg',
        likes: 3420,
        views: 125430,
        shares: 234,
        comments_count: 567,
        category: '교육',
        ai_description: 'YouTube 일반 영상 테스트용 샘플입니다',
        keywords: ['유튜브', '교육', '테스트'],
        duration: '10:25',
        hashtags: ['#유튜브', '#교육', '#테스트'],
        sheets_row_data: {
          id: '10',
          mainCategory: '교육',
          middleCategory: '기술',
          fullCategoryPath: '교육 > 기술',
          categoryDepth: 'YouTube 일반 영상 테스트용 샘플입니다',
          confidence: '90%',
          source: 'manual_test'
        }
      },
      {
        platform: 'youtube',
        timestamp: new Date('2025-09-03T02:00:00Z'),
        channelName: '게임채널',
        title: 'YouTube 게임 영상',
        originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        likes: 8750,
        views: 456789,
        shares: 1023,
        comments_count: 2456,
        category: '게임',
        ai_description: 'YouTube 게임 영상 테스트용 샘플입니다',
        keywords: ['유튜브', '게임', '플레이'],
        duration: '25:15',
        hashtags: ['#유튜브', '#게임', '#플레이'],
        sheets_row_data: {
          id: '11',
          mainCategory: '게임',
          middleCategory: '액션게임',
          fullCategoryPath: '게임 > 액션게임',
          categoryDepth: 'YouTube 게임 영상 테스트용 샘플입니다',
          confidence: '98%',
          source: 'manual_test'
        }
      }
    ];
    
    const result = await Video.insertMany(sampleVideos);
    console.log(`✅ ${result.length}개 YouTube 샘플 데이터 삽입 완료!`);
    
    // 삽입된 데이터 확인
    const youtubeCount = await Video.countDocuments({ platform: 'youtube' });
    console.log(`📊 총 YouTube 데이터: ${youtubeCount}개`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

insertSampleYouTubeData();