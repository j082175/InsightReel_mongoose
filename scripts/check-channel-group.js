require('dotenv').config();
const mongoose = require('mongoose');
const ChannelGroup = require('../server/models/ChannelGroup');

async function checkChannelGroups() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');
    
    // 모든 채널 그룹 조회
    const groups = await ChannelGroup.find({});
    
    console.log(`\n📋 총 ${groups.length}개 채널 그룹 발견:`);
    
    groups.forEach((group, index) => {
      console.log(`\n${index + 1}. 그룹명: "${group.name}"`);
      console.log(`   설명: ${group.description || 'N/A'}`);
      console.log(`   채널 수: ${group.channels.length}개`);
      
      group.channels.forEach((channel, chIndex) => {
        console.log(`   ${chIndex + 1}) ID: "${channel.id}" | 이름: "${channel.name}"`);
        
        // 채널 ID 형식 체크
        const isValidChannelId = /^UC[a-zA-Z0-9_-]{22}$/.test(channel.id);
        if (!isValidChannelId) {
          console.log(`      ⚠️  잘못된 채널 ID 형식 (UC로 시작하는 24자여야 함)`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 MongoDB 연결 종료');
  }
}

checkChannelGroups();