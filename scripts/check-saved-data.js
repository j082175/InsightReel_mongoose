// 저장된 채널 데이터 확인
require('dotenv').config();
const mongoose = require('mongoose');

async function checkSavedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-analyzer');
    console.log('📦 MongoDB 연결됨\n');
    
    const channels = await mongoose.connection.db.collection('channels').find({}).toArray();
    
    if (channels.length === 0) {
      console.log('❌ 저장된 채널 없음');
      return;
    }
    
    const channel = channels[0];
    console.log('✅ 저장된 채널 데이터:');
    console.log('📍 기본 정보:');
    console.log(`  - ID: ${channel.id}`);
    console.log(`  - 이름: ${channel.name}`);
    console.log(`  - 구독자: ${channel.subscribers?.toLocaleString() || 'N/A'}`);
    console.log(`  - 플랫폼: ${channel.platform}`);
    
    console.log('\n📊 통계 정보:');
    console.log(`  - 총 영상수: ${channel.totalVideos || 'N/A'}`);
    console.log(`  - 일평균 업로드: ${channel.dailyUploadRate || 'N/A'}`);
    console.log(`  - 평균 영상 길이: ${channel.avgDurationFormatted || 'N/A'}`);
    console.log(`  - 숏폼 비율: ${channel.shortFormRatio || 'N/A'}%`);
    console.log(`  - 최근 7일 조회수: ${channel.last7DaysViews?.toLocaleString() || 'N/A'}`);
    console.log(`  - 콘텐츠 타입: ${channel.contentType || 'N/A'}`);
    
    console.log('\n🏷️ 태그 정보:');
    console.log(`  - 사용자 키워드: [${channel.keywords?.join(', ') || '없음'}]`);
    console.log(`  - AI 태그: [${channel.aiTags?.join(', ') || '없음'}]`);
    console.log(`  - 전체 태그: [${channel.allTags?.join(', ') || '없음'}]`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ 에러:', error.message);
    process.exit(1);
  }
}

checkSavedData();