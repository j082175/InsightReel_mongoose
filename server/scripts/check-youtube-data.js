const mongoose = require('mongoose');
const Video = require('../models/Video');
const { FieldMapper } = require('../types/field-mapper');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkYouTubeData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!\n');
    
    const youtubeVideos = await Video.find({ [FieldMapper.get('PLATFORM')]: 'youtube' })
      .limit(5)
      .select(FieldMapper.buildSelectString(['TITLE', 'COMMENTS', 'CHANNEL_NAME', 'TIMESTAMP', 'CATEGORY', 'ANALYSIS_CONTENT']))
      .lean();
    
    console.log(`🎬 YouTube 비디오 샘플 (${youtubeVideos.length}개):\n`);
    
    youtubeVideos.forEach((video, index) => {
      console.log(`${index + 1}. ID: ${video[FieldMapper.get('ID')]}`);
      console.log(`   제목: "${video[FieldMapper.get('TITLE')] || '없음'}"`);
      console.log(`   URL: "${video[FieldMapper.get('URL')] || '없음'}"`);
      console.log(`   채널이름: "${video[FieldMapper.get('CHANNEL_NAME')] || '없음'}"`);
      console.log(`   설명: "${video[FieldMapper.get('ANALYSIS_CONTENT')] || '없음'}"`);
      console.log(`   카테고리: "${video[FieldMapper.get('CATEGORY')] || '없음'}"`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

checkYouTubeData();