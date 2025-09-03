const mongoose = require('mongoose');
const Video = require('../models/Video');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function viewData() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!\n');
    
    // 1. 전체 개수
    const total = await Video.countDocuments();
    console.log(`📊 총 비디오: ${total}개\n`);
    
    // 2. 플랫폼별 통계
    const platforms = await Video.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📱 플랫폼별:');
    platforms.forEach(p => {
      console.log(`  ${p._id}: ${p.count}개`);
    });
    
    // 3. 최신 5개 비디오
    console.log('\n🆕 최신 5개:');
    const recent = await Video.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .select('platform account title likes views timestamp');
    
    recent.forEach((v, i) => {
      console.log(`${i+1}. [${v.platform}] ${v.title?.substring(0, 50)}...`);
      console.log(`   👍 ${v.likes} | 👁️ ${v.views} | 📅 ${v.timestamp.toLocaleDateString('ko-KR')}`);
    });
    
    // 4. 인기 Top 3 (좋아요 기준)
    console.log('\n🔥 인기 Top 3:');
    const popular = await Video.find()
      .sort({ likes: -1 })
      .limit(3)
      .select('platform title likes views');
    
    popular.forEach((v, i) => {
      console.log(`${i+1}. ${v.title?.substring(0, 50)}...`);
      console.log(`   👍 ${v.likes.toLocaleString()} 좋아요`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 에러:', error.message);
    process.exit(1);
  }
}

viewData();