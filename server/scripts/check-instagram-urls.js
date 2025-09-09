require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Video = require('../models/Video');

async function checkInstagramUrls() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    
    console.log('✅ MongoDB 연결 성공');
    
    // 특정 문제 레코드 찾기
    const problematicRecord = await Video.findOne({
      account: { $regex: /reels\/doqbpd_shxw/ }
    }).lean();
    
    if (problematicRecord) {
      console.log('🔍 문제 레코드 발견:');
      console.log(`platform: ${problematicRecord.platform}`);
      console.log(`account: ${problematicRecord.account}`);
      console.log(`originalUrl: ${problematicRecord.originalUrl}`);
      console.log(`title: ${problematicRecord.title}`);
      console.log('');
    } else {
      console.log('❌ 해당 레코드를 찾을 수 없음\n');
    }
    
    // 모든 Instagram 비디오도 확인
    const instagramVideos = await Video.find({ platform: 'instagram' })
      .select('account originalUrl title')
      .limit(5)
      .lean();
    
    console.log('\n📸 Instagram URL 패턴 샘플:');
    instagramVideos.forEach((video, i) => {
      console.log(`${i+1}. account: ${video.account}`);
      console.log(`   originalUrl: ${video.originalUrl}`);
      
      // URL에서 사용자명 추출 시도
      const url = video.account || video.originalUrl;
      if (url && url.includes('instagram.com/')) {
        const match = url.match(/instagram\.com\/([^\/\?]+)/);
        if (match && match[1] && !['reels', 'reel', 'p'].includes(match[1])) {
          console.log(`   추출된 사용자명: ${match[1]}`);
        } else {
          console.log(`   사용자명 추출 불가`);
        }
      }
      console.log('');
    });
    
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkInstagramUrls();