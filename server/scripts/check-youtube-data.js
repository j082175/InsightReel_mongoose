const mongoose = require('mongoose');
const Video = require('../models/Video');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkYouTubeData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!\n');
    
    const youtubeVideos = await Video.find({ platform: 'youtube' })
      .limit(5)
      .select('title comments account timestamp category ai_description')
      .lean();
    
    console.log(`🎬 YouTube 비디오 샘플 (${youtubeVideos.length}개):\n`);
    
    youtubeVideos.forEach((video, index) => {
      console.log(`${index + 1}. ID: ${video._id}`);
      console.log(`   제목: "${video.title || '없음'}"`);
      console.log(`   URL: "${video.comments || '없음'}"`);
      console.log(`   계정: "${video.account || '없음'}"`);
      console.log(`   설명: "${video.ai_description || '없음'}"`);
      console.log(`   카테고리: "${video.category || '없음'}"`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

checkYouTubeData();