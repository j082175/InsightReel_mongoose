require('dotenv').config();
const mongoose = require('mongoose');
const ChannelGroup = require('../server/models/ChannelGroup');

// 채널명 → 올바른 채널 ID 매핑
const channelIdMapping = {
  '영화미슐랭': 'UCYOGaLvAJRAo6eGYh1sWZjw'  // 영화미슐랭의 실제 채널 ID
};

async function fixChannelIds() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');
    
    // 모든 채널 그룹 조회
    const groups = await ChannelGroup.find({});
    console.log(`\n🔍 ${groups.length}개 채널 그룹 처리 시작...\n`);
    
    let totalUpdated = 0;
    
    for (const group of groups) {
      console.log(`📋 그룹 "${group.name}" 처리 중...`);
      
      let groupUpdated = false;
      
      // 각 채널 확인
      for (let i = 0; i < group.channels.length; i++) {
        const channel = group.channels[i];
        const oldId = channel.id;
        
        // 매핑에 있는 채널이면 수정
        if (channelIdMapping[oldId]) {
          const newId = channelIdMapping[oldId];
          group.channels[i].id = newId;
          
          console.log(`   🔄 "${oldId}" → "${newId}"`);
          groupUpdated = true;
          totalUpdated++;
        }
        // 이미 올바른 형식인지 확인
        else if (/^UC[a-zA-Z0-9_-]{22}$/.test(oldId)) {
          console.log(`   ✅ "${channel.name}": 이미 올바른 형식 (${oldId})`);
        }
        // 알 수 없는 형식
        else {
          console.log(`   ⚠️  "${oldId}": 수동으로 확인 필요`);
        }
      }
      
      // 변경사항이 있으면 저장
      if (groupUpdated) {
        await group.save();
        console.log(`   💾 그룹 "${group.name}" 업데이트 완료`);
      }
      
      console.log('');
    }
    
    console.log(`🎉 작업 완료! 총 ${totalUpdated}개 채널 ID 수정됨`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔚 MongoDB 연결 종료');
  }
}

fixChannelIds();