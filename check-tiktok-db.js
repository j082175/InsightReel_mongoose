const mongoose = require('mongoose');
const Video = require('./server/models/VideoModel');

async function checkTikTokData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/InsightReel?retryWrites=true&w=majority&appName=InsightReel');

    const tiktokVideos = await Video.find({ platform: 'TIKTOK' }).limit(3).sort({ _id: -1 });

    console.log('최근 TikTok 비디오들:');
    tiktokVideos.forEach((video, index) => {
      console.log(`${index + 1}. 제목: ${video.title}`);
      console.log(`   thumbnailUrl: '${video.thumbnailUrl || 'EMPTY'}'`);
      console.log(`   language: '${video.language || 'EMPTY'}'`);
      console.log(`   description: '${video.description || 'EMPTY'}'`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTikTokData();