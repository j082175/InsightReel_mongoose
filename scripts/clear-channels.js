// 채널 DB 클리어
require('dotenv').config();
const mongoose = require('mongoose');

async function clearChannels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('📦 MongoDB 연결됨');
    
    // channels 컬렉션 클리어
    const result = await mongoose.connection.db.collection('channels').deleteMany({});
    console.log(`🗑️ 채널 데이터 클리어: ${result.deletedCount}개 삭제됨`);
    
    await mongoose.disconnect();
    console.log('✅ 완료');
  } catch (error) {
    console.error('❌ 에러:', error.message);
    process.exit(1);
  }
}

clearChannels();